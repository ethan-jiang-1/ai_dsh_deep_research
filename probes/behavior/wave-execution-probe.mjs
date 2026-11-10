#!/usr/bin/env node
// 探针：wave-execution-probe
// 状态：常驻
// 一句话：analyst 执行器在真模型下按固定 lens-fanout 配方跑通一个 cell，留下八字段证据卡 + waves 报告
// 何时跑：wave-execution skill / content/waves/lens-fanout.js / analyst workflow 挂载 / plan Wave 契约改动；snapshot 重录后
// 档位：真模型（DEEPSEEK_API_KEY；REAL_MODEL 闭集）
// 判据：C1 analyst request header 含 workflow 工具；C2 会话有 tool-workflow run-start/agent-start/run-end(completed)；C3 waves/W2.json requested=1、counts.ok=1、stop_reason=completed；C4 evidence 卡八字段齐；C5 child 未递归调 workflow；C6 executor 未调 subagent
// 不证明：Lead 派发/HITL1/HITL2/槽位容量/完整 run 质量；也不证明用户验收（完整 run 另属 L4/P4）
// 为什么存在：wave 链跨 preset + engine + child + 报告四层，单测只证配方、L1 只证挂载；完整 4-cell run 约 70M total tokens，本探针约 1 个 analyst + 1 个 child，成本低一个量级
//
// wave-execution-probe.mjs — wave 执行链的真模型单点探针。
//
// 设计：源域 `web` profile + `dev/research.overlay.yml`（与 L1 同一组合），但创建 **analyst**
// 会话而不是 run 通道，所以不碰 research-workspace/run 会话、不需要 HITL。临时 bundle 只含
// 1 个 cell；workflow 的 PTC 在嵌套沙箱里需要 full-access（与 P4 试点同因），本探针在 boot
// env 里显式给 DSH_PERMISSION_MODE=danger-full-access。
//
// 负例：`--role scout`（scout preset 没有 workflow 行）→ C1/C2/C3 红；默认 analyst 绿。
// 先红证据：2026-11-10 本探针用 --role scout 跑出 C1 红（analyst 行才绿）。
//
// 前置：source dev/env.sh；DEV home；zstd 在 PATH。端口 3120 自持有。
// 用法：source dev/env.sh && node probes/behavior/wave-execution-probe.mjs [--port 3120] [--role analyst] [--keep]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { requireCredentials, requireDevHome, withModelKey } from '../../scripts/lib/env.mjs';
import { authenticate, bootWeb, makeRpc } from '../../scripts/lib/web-harness.mjs';
import { readSessionTextOf } from '../../scripts/lib/session-log.mjs';
import { assertVendorArtifacts, ARTIFACT_REMEDY } from '../../scripts/lib/vendor-artifacts.mjs';
import { reclaimPort } from '../../scripts/lib/port-reclaim.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OVERLAY = join(ROOT, 'dev', 'research.overlay.yml');
const PACK = join(ROOT, 'packages', 'deep-research-pack');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const PORT = Number(arg('port', '3120'));
const ROLE = arg('role', 'analyst');
const KEEP = process.argv.includes('--keep');
const BOOT_TIMEOUT_MS = 180_000;
const TURN_TIMEOUT_MS = 300_000;
const POLL_MS = 3_000;
const ARCHIVE = join(ROOT, 'runtime', 'smoke-workspace', 'wave-execution-probe-last');

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
if (!home) { console.error('wave-execution-probe: 需要 DSH_HOME（先 source dev/env.sh）'); process.exit(2); }
requireDevHome('wave-execution-probe', { home, root: ROOT });
requireCredentials('wave-execution-probe', { home });
if (spawnSync('zstd', ['--version']).status !== 0) {
  console.error('wave-execution-probe: 需要 zstd 且在 PATH 上（会话日志 zstd 压缩）');
  process.exit(2);
}
const dshSrc = process.env.DSH_SRC ?? ROOT;
const bin = join(dshSrc, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts');
if (!existsSync(bin)) { console.error(`wave-execution-probe: 机制基线不在位（${bin}）`); process.exit(2); }
{
  const va = assertVendorArtifacts(dshSrc);
  if (!va.ok) {
    console.error(`boot 前自检红：vendor 构建产物缺失（${va.missing.join('、')}）`);
    console.error(ARTIFACT_REMEDY);
    process.exit(2);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let booted = null;
const failures = [];
const pass = (m) => { console.log(`  PASS ${m}`); };
const fail = (m) => { failures.push(m); console.log(`  FAIL ${m}`); };

// ── 临时 bundle（单 cell；不碰 research-workspace）──
const WS = join(ROOT, 'runtime', 'smoke-workspace', 'wave-execution-probe-ws');
const BUNDLE = join(WS, 'drt_wave-probe');
rmSync(WS, { recursive: true, force: true });
mkdirSync(join(BUNDLE, 'evidence'), { recursive: true });
mkdirSync(join(BUNDLE, 'waves'), { recursive: true });
writeFileSync(join(BUNDLE, 'run.md'), [
  '---', 'schema: 2', 'created: 2026-11-10', 'phase: research', 'next: wave probe',
  'delivered: none', 'parked: none', '---', '', '# drt_wave-probe', '',
  '探针临时 bundle：一个 analyst executor + 一个 workflow child。',
].join('\n'));
writeFileSync(join(BUNDLE, 'question.md'), '# Wave probe\n\n验证固定配方 lens-fanout 的单 cell 执行。\n');
writeFileSync(join(BUNDLE, 'topics.md'), '# Topics\n\n## T1\n\n- must_answer: DSH workflow 工具暴露哪些脚本 hook？\n- scope_role: primary\n- lenses: official\n');
writeFileSync(join(BUNDLE, 'plan.md'), [
  '# Plan — drt_wave-probe', '', '图版本：v1', '', '## 节点表', '',
  '| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|',
  '| W2.1 | — | active | deep-dive | workflow hooks | analyst | — | waves/W2.json + evidence/t1-official.md | 八字段 + 报告 | N=1 | L1 | plan-only |',
  '', '## Wave 执行', '',
  '- W2：`lens-fanout` ×1；executor = analyst（spawn，depth 1）；cells = T1×official；报告 = waves/W2.json', '',
].join('\n'));

const EVIDENCE = join(BUNDLE, 'evidence', 't1-official.md');
const REPORT = join(BUNDLE, 'waves', 'W2.json');
const LENS = join(PACK, 'content', 'lenses', 'official.md');
const RECIPE = join(PACK, 'content', 'waves', 'lens-fanout.js');
const PROMPT = `这是一次 wave 执行探针，不是完整研究 run：只跑一个 cell，不组队、不综合、不交付、不问用户。
你是 analyst 执行器的候选角色；请按 wave-execution skill 执行。

- run bundle = ${BUNDLE}
- plan_version = v1
- wave = W2
- 授权句 = 探针授权「W2 脚本扇出 ×1」
- pack root = ${PACK}

第一动作：加载 wave-execution skill。然后 read \`${RECIPE}\`，按该 skill 组 args、调 workflow（前台，不要后台），对账后写 \`${REPORT}\`。

唯一 cell：
- id: T1-official
- topic: T1
- question: DSH workflow 工具暴露哪些脚本 hook？
- lens: official
- lens_path: ${LENS}
- output_path: ${EVIDENCE}
- budget: 最多 2 次搜索、3 次抓取
- boundaries: 只按 official 证据面取证；不综合、不下 verdict

完成后只回一行：WAVE_PROBE_RESULT requested=<n> ok=<n> failed=<n> missing=<n>。不要问问题。`;

const rpc = makeRpc({
  prefix: 'wvp-',
  errorOf: (endpoint, body) => `${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`,
});
const sessionsRoot = join(home, 'sessions');
const readSessionLog = (id) => readSessionTextOf(sessionsRoot, id);
const logLines = (id) => readSessionLog(id).split('\n').filter(Boolean);
const parse = (line) => { try { return JSON.parse(line); } catch { return null; } };

const waitFor = async (id, label, predicate) => {
  const deadline = Date.now() + TURN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    for (const line of logLines(id)) {
      if (predicate(line)) return line;
    }
  }
  throw new Error(`等 ${label} 超时（${TURN_TIMEOUT_MS}ms）`);
};

const main = async () => {
  console.log(`wave-execution-probe: 真模型档（role=${ROLE}；单 cell；port=${PORT}）`);
  booted = await bootWeb({
    bin, cwd: ROOT, profile: 'web', patchPath: OVERLAY, port: PORT,
    env: { ...withModelKey({ DSH_HOME: home }), DSH_PERMISSION_MODE: 'danger-full-access' },
    timeoutMs: BOOT_TIMEOUT_MS, tailChars: 800, detached: false,
  });
  const base = `http://127.0.0.1:${String(PORT)}`;
  const cookie = await authenticate(base, booted.token);
  const created = await rpc(base, cookie, 'session/create', { request: { cwd: BUNDLE, agentPreset: ROLE } });
  const sessionId = created?.id ?? created?.sessionId;
  if (typeof sessionId !== 'string') throw new Error('无会话 id');
  console.log(`  session=${sessionId}`);
  await rpc(base, cookie, 'session/prompt', {
    request: { requestId: randomUUID(), sessionId, mode: 'queue', content: [{ type: 'text', text: PROMPT }] },
  });

  // wait for the assistant marker, then the turn to end (file writes happen before the final text)
  try {
    await waitFor(sessionId, 'WAVE_PROBE_RESULT', (line) => line.includes('"type":"assistant/message"') && line.includes('WAVE_PROBE_RESULT'));
  } catch (error) {
    fail(error.message);
  }
  await sleep(1000);
  const log = logLines(sessionId);
  const logText = log.join('\n');

  // C1: analyst request header has the workflow tool
  let headerTools = [];
  for (const line of log) {
    if (!line.includes('"type":"request/header"')) continue;
    const e = parse(line);
    const tools = e?.data?.header?.tools;
    if (Array.isArray(tools)) { headerTools = tools.map((t) => t?.name).filter(Boolean); break; }
  }
  if (headerTools.includes('workflow')) pass('C1 analyst request header 含 workflow 工具');
  else fail(`C1 analyst request header 无 workflow（tools=${headerTools.slice(0, 12).join(',')}）`);

  // C2: workflow lifecycle events in the executor session
  const hasRunStart = logText.includes('"type":"tool-workflow/run-start"');
  const hasAgentStart = logText.includes('"type":"tool-workflow/agent-start"');
  const hasRunEnd = /"type":"tool-workflow\/run-end"[^\n]*"stopReason":"completed"/.test(logText)
    || /"stopReason":"completed"[^\n]*"type":"tool-workflow\/run-end"/.test(logText);
  if (hasRunStart && hasAgentStart && hasRunEnd) pass('C2 tool-workflow start/agent-start/run-end(completed) 在场');
  else fail(`C2 workflow 生命周期不全（start=${hasRunStart} agent=${hasAgentStart} endCompleted=${hasRunEnd}）`);

  // C3: report
  if (!existsSync(REPORT)) fail(`C3 waves 报告缺席：${REPORT}`);
  else {
    let report = null;
    try { report = JSON.parse(readFileSync(REPORT, 'utf8')); } catch { /* handled below */ }
    const c = report?.counts ?? {};
    if (report?.requested === 1 && c?.ok === 1 && report?.stop_reason === 'completed') {
      pass(`C3 waves/W2.json requested=1 ok=1 stop_reason=completed（run_id=${String(report.run_id)}）`);
    } else {
      fail(`C3 waves 报告不一致：requested=${report?.requested} counts=${JSON.stringify(c)} stop_reason=${report?.stop_reason}`);
    }
  }

  // C4: evidence card and eight frontmatter fields
  if (!existsSync(EVIDENCE)) fail(`C4 证据卡缺席：${EVIDENCE}`);
  else {
    const text = readFileSync(EVIDENCE, 'utf8');
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? '';
    const fields = ['source_url', 'retrieved_at', 'quality', 'found_by', 'supports', 'source_tier', 'publisher', 'lens'];
    const missing = fields.filter((f) => !new RegExp(`^${f}:`, 'm').test(fm));
    if (missing.length === 0) pass(`C4 证据卡八字段齐（${text.length} 字符）`);
    else fail(`C4 证据卡缺字段：${missing.join(',')}`);
  }

  // C5: child must not recursively call workflow; read child session from agent-start childId
  let childId = null;
  for (const line of log) {
    if (!line.includes('"type":"tool-workflow/agent-start"')) continue;
    const e = parse(line);
    childId = e?.data?.childId ?? null;
    if (childId !== null) break;
  }
  if (childId === null) fail('C5 找不到 tool-workflow/agent-start 的 childId');
  else {
    const childText = readSessionLog(childId);
    const recursive = childText.split('\n').some((line) => line.includes('"type":"tool/call"') && line.includes('"name":"workflow"'));
    if (recursive) fail(`C5 child ${String(childId).slice(0, 8)} 递归调了 workflow`);
    else pass(`C5 child ${String(childId).slice(0, 8)} 未递归调 workflow`);
  }

  // C6: executor did not use subagent
  const subagentCall = log.some((line) => line.includes('"type":"tool/call"') && line.includes('"name":"subagent"'));
  if (subagentCall) fail('C6 executor 在 wave 中调了 subagent');
  else pass('C6 executor 未调 subagent');

  // archive evidence
  rmSync(ARCHIVE, { recursive: true, force: true });
  mkdirSync(ARCHIVE, { recursive: true });
  const lines = [
    '# wave-execution-probe 留档',
    '',
    `- 时间：${new Date().toISOString()}`,
    `- role：${ROLE}`,
    `- session：${sessionId}`,
    `- child：${childId ?? 'n/a'}`,
    `- verdict：${failures.length === 0 ? 'PASS' : 'FAIL'}`,
    `- bundle：${BUNDLE}`,
    '',
    '## 判据',
    ...failures.map((m) => `- FAIL ${m}`),
    '',
  ];
  writeFileSync(join(ARCHIVE, 'verdict.md'), lines.join('\n'));
  for (const [src, dst] of [[REPORT, 'W2.json'], [EVIDENCE, 't1-official.md']]) {
    if (existsSync(src)) copyFileSync(src, join(ARCHIVE, dst));
  }
  console.log(`  留档：${ARCHIVE}`);
  if (!KEEP) rmSync(WS, { recursive: true, force: true });
};

try {
  await main();
} catch (error) {
  console.error(`wave-execution-probe: ${error?.message ?? error}`);
  failures.push(String(error?.message ?? error));
} finally {
  await booted?.stop?.();
  const leak = await reclaimPort(PORT);
  if (leak !== null) console.error(`wave-execution-probe: 端口 ${PORT} 未释放：${leak}`);
}
console.log('');
console.log(failures.length === 0 ? 'wave-execution-probe: ALL PASS' : `wave-execution-probe: ${failures.length} 处失败`);
process.exit(failures.length === 0 ? 0 : 1);
