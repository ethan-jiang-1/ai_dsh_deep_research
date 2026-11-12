#!/usr/bin/env node
// 探针：defaults-probe
// 状态：常驻
// 一句话：seeded 项目默认进入 HITL1 首推、auto 不冒充默认、三问不变、语言不冒充项目默认
// 何时跑：`research:defaults` context / `research-brief` / HITL1 合同改动；D50 回归
// 档位：真模型（DEEPSEEK_API_KEY；REAL_MODEL 闭集）
// 判据：C1 seeded 卡出现项目默认/库默认标记；C2 auto 卡无项目默认/库默认；C3 两卡各 3 问；C4 seeded 卡含方法/深度/输出/来源默认；C5 语言不写进「项目默认」选项；C6 原文留档
// 不证明：长上下文/其他题型下的稳定遵循；用户最终采纳；数据/UI 写盘（keyless + client-load 证明）
// 为什么存在：默认是否被模型消费只能真模型观察；单测只证 prompt 段在场
// defaults-probe.mjs — 项目研究默认的 HITL1 行为探针（真模型档）。
//
// 1 boot / 2 场景（seeded vs auto），各一次 session/prompt；读 `ask_user_question` 的 tool/call
// arguments（会话日志即真相，不吃模型自述）。seeded 场景的「项目默认」标记与 auto 场景的
// 「无项目默认」标记是两条独立判据；语言不是 `research-defaults.json` 的轴，故 seeded 卡里
// 含「项目默认」的选项不得把「中文」并进去（C5）。
//
// 前置：source dev/env.sh（DSH_HOME + 凭据）；pack 已构建。
// 用法：source dev/env.sh && node probes/behavior/defaults-probe.mjs [--port 3124] [--keep]
// verdict：exit 0=全绿 / 1=断言红 / 2=前置缺席（未跑 ≠ 通过）。
import { requireCredentials, requireDevHome, withModelKey } from '../../scripts/lib/env.mjs';
import { authenticate, bootWeb, makeRpc } from '../../scripts/lib/web-harness.mjs';
import { readSessionTextOf } from '../../scripts/lib/session-log.mjs';
import { assertVendorArtifacts, ARTIFACT_REMEDY } from '../../scripts/lib/vendor-artifacts.mjs';
import { reclaimPort } from '../../scripts/lib/port-reclaim.mjs';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const PORT = Number(arg('port', '3124'));
const KEEP = process.argv.includes('--keep');
const BOOT_TIMEOUT_MS = 180_000;
const TURN_TIMEOUT_MS = 180_000;
const POLL_MS = 2_000;

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
if (!home) { console.error('defaults-probe: 需要 DSH_HOME（先 source dev/env.sh）'); process.exit(2); }
requireDevHome('defaults-probe', { home, root: ROOT });
requireCredentials('defaults-probe', { home });
if (!existsSync(join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts'))) {
  console.error('defaults-probe: 机制基线不在位（vendor/dsh）——git submodule update --init');
  process.exit(2);
}
{
  const va = assertVendorArtifacts(ROOT);
  if (!va.ok) {
    console.error(`defaults-probe: boot 前自检红：vendor 构建产物缺失（${va.missing.join('、')}）`);
    console.error(ARTIFACT_REMEDY);
    process.exit(2);
  }
}

const stale = await reclaimPort(PORT);
if (stale !== null) { console.error(`defaults-probe: 端口 ${PORT} 预收割失败：${stale}`); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const pass = (m) => console.log(`  PASS ${m}`);
const fail = (m) => { failures.push(m); console.log(`  FAIL ${m}`); };

const WS = join(ROOT, 'runtime', 'smoke-workspace', 'defaults-probe-ws');
rmSync(WS, { recursive: true, force: true });
const seededWs = join(WS, 'seeded');
const autoWs = join(WS, 'auto');
mkdirSync(seededWs, { recursive: true });
mkdirSync(autoWs, { recursive: true });
writeFileSync(join(seededWs, 'research-defaults.json'), `${JSON.stringify({
  schema: 1,
  revision: 1,
  effort: 'deep',
  output: { shape: 'full_report', audience: '决策层' },
  source: { families: ['official', 'regulatory'], authority: 'primary', recency: '12m' },
}, null, 2)}\n`);
writeFileSync(join(seededWs, 'method-library.md'), `# method-library\n\n## 事实核查（2026-11-12，源自 对话）〔默认偏好〕\n- 找来源: 官方/原始来源优先\n- 怎么核实: 逐字核对并独立重抓\n- 报告怎么写: 答案 + 口径 + 依据 + 限制\n- 不承诺: 不做领域覆盖\n`);

const PROMPT = '研究问题：截至 2026 年，联合国安理会常任理事国是哪些国家？请按标准立项流程，现在先发 HITL1 问卡（研究类型 / 深度与输出 / 时间与来源范围）。不要直接回答研究问题。';
const rpc = makeRpc({ prefix: 'defaults-probe-', errorOf: (endpoint, body) => `${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}` });

async function askOf(base, cookie, cwd, label) {
  const created = await rpc(base, cookie, 'session/create', { request: { cwd, agentPreset: 'lead' } });
  const sessionId = created?.id ?? created?.sessionId;
  if (typeof sessionId !== 'string') throw new Error(`${label}: 无 sessionId`);
  await rpc(base, cookie, 'session/prompt', { request: { requestId: randomUUID(), sessionId, mode: 'queue', content: [{ type: 'text', text: PROMPT }] } });
  const deadline = Date.now() + TURN_TIMEOUT_MS;
  let last = '';
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    const log = readSessionTextOf(join(home, 'sessions'), sessionId);
    if (log === '') continue;
    const lines = log.split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      let event;
      try { event = JSON.parse(lines[i]); } catch { continue; }
      if (event?.type !== 'tool/call' || event?.data?.name !== 'ask_user_question') continue;
      let args = event.data.arguments;
      try { args = typeof args === 'string' ? JSON.parse(args) : args; } catch { /* 原文保留 */ }
      return { sessionId, args };
    }
    const assistant = lines.filter((line) => line.includes('"assistant/message"')).map((line) => {
      try { return (JSON.parse(line).data?.message?.content ?? []).filter((b) => b?.type === 'text').map((b) => b.text).join('\n'); } catch { return ''; }
    }).filter(Boolean).join('\n');
    if (assistant) last = assistant;
  }
  return { sessionId, args: null, assistant: last };
}

const optionsText = (args) => {
  if (args === null || typeof args !== 'object') return '';
  return (Array.isArray(args.questions) ? args.questions : []).flatMap((q) => [
    String(q?.question ?? ''),
    ...(Array.isArray(q?.options) ? q.options.map((o) => `${String(o?.label ?? '')} ${String(o?.description ?? '')}`) : []),
  ]).join('\n');
};

const questionCount = (args) => (args !== null && typeof args === 'object' && Array.isArray(args.questions) ? args.questions.length : 0);

let booted;
let exitCode = 1;
try {
  booted = await bootWeb({
    bin: join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts'),
    cwd: ROOT,
    profile: 'web',
    patchPath: join(ROOT, 'dev', 'research.overlay.yml'),
    port: PORT,
    env: withModelKey({ DSH_HOME: home }),
    timeoutMs: BOOT_TIMEOUT_MS,
    tailChars: 800,
    detached: false,
  });
  const base = `http://127.0.0.1:${PORT}`;
  const cookie = await authenticate(base, booted.token);
  const seeded = await askOf(base, cookie, seededWs, 'seeded');
  const auto = await askOf(base, cookie, autoWs, 'auto');
  const argsSeeded = seeded.args === null ? '' : JSON.stringify(seeded.args);
  const argsAuto = auto.args === null ? '' : JSON.stringify(auto.args);
  const textSeeded = optionsText(seeded.args);
  const textAuto = optionsText(auto.args);
  const seededMarkers = ['项目默认', '库默认', '事实核查', '完整报告', '决策层', 'official', 'regulatory'];
  const hitSeeded = seededMarkers.filter((m) => textSeeded.includes(m));
  const autoFake = ['项目默认', '库默认'].filter((m) => textAuto.includes(m));
  const qSeeded = questionCount(seeded.args);
  const qAuto = questionCount(auto.args);

  const report = [
    '# defaults-probe',
    '',
    `- port: ${PORT}`,
    `- seeded session: ${seeded.sessionId} ask=${seeded.args !== null} questions=${qSeeded}`,
    `- seeded args: ${argsSeeded.slice(0, 8000)}`,
    `- seeded assistant tail: ${String(seeded.assistant ?? '').slice(0, 1500)}`,
    `- auto session: ${auto.sessionId} ask=${auto.args !== null} questions=${qAuto}`,
    `- auto args: ${argsAuto.slice(0, 8000)}`,
    `- auto assistant tail: ${String(auto.assistant ?? '').slice(0, 1500)}`,
    `- seeded markers: ${hitSeeded.join(', ') || 'NONE'}`,
    `- auto fake-default markers: ${autoFake.join(', ') || 'NONE'}`,
  ].join('\n');
  writeFileSync(join(ROOT, 'runtime', 'smoke-workspace', 'defaults-probe-last.md'), `${report}\n`);

  console.log('defaults-probe: 真模型档（1 boot / 2 场景）');
  if (seeded.args === null) fail('seeded：180s 内未见 ask_user_question');
  else pass(`seeded：HITL1 ask 在场（${seeded.sessionId}）`);
  if (auto.args === null) fail('auto：180s 内未见 ask_user_question');
  else pass(`auto：HITL1 ask 在场（${auto.sessionId}）`);

  if (qSeeded !== 3) fail(`seeded：HITL1 问数 = ${qSeeded}（期望 3，不新增第四问）`);
  else pass('seeded：HITL1 三问（无第四问）');
  if (qAuto !== 3) fail(`auto：HITL1 问数 = ${qAuto}（期望 3，不新增第四问）`);
  else pass('auto：HITL1 三问（无第四问）');

  if (seeded.args !== null && hitSeeded.length >= 4) pass(`seeded：项目默认标记 ${hitSeeded.length}/7（${hitSeeded.join(', ')}）`);
  else fail(`seeded：项目默认标记不足（${hitSeeded.length}/7）——args=${argsSeeded.slice(0, 500)}`);

  if (auto.args !== null && autoFake.length === 0) pass('auto：无「项目默认/库默认」标记（不冒充默认）');
  else fail(`auto：出现冒充默认标记（${autoFake.join(', ')}）`);

  // C5：语言不是项目默认轴。只把「项目默认」与语言写进**同一分句**或**选项 label** 视为过期；
  // 同选项但用分号分开（例如「按项目默认；中文正文…」）是观察，不判红。
  const optionTexts = (seeded.args?.questions ?? []).flatMap((q) =>
    Array.isArray(q?.options) ? q.options.map((o) => `${String(o?.label ?? '')} ${String(o?.description ?? '')}`) : []);
  const sameClause = optionTexts.filter((text) => /项目默认[^。；;]*中文/.test(text));
  const labelOnly = (seeded.args?.questions ?? []).flatMap((q) =>
    Array.isArray(q?.options) ? q.options.map((o) => String(o?.label ?? '')) : [])
    .filter((text) => text.includes('项目默认') && /中文|英文|中英/.test(text));
  if (sameClause.length === 0 && labelOnly.length === 0) pass('seeded：语言未被并入「项目默认」同句/选项名');
  else fail(`seeded：语言被并入「项目默认」同句/选项名（${(sameClause[0] ?? labelOnly[0]).slice(0, 160)}）`);
  const mixed = optionTexts.filter((text) => text.includes('项目默认') && text.includes('中文'));
  if (mixed.length > 0 && sameClause.length === 0 && labelOnly.length === 0) {
    console.log('  NOTE 语言与项目默认同选项但分句出现（观察；不判红）');
  }

  console.log('');
  console.log(failures.length === 0 ? 'defaults-probe: ALL PASS' : `defaults-probe: ${failures.length} 处失败`);
  console.log(`\n—— 证据：runtime/smoke-workspace/defaults-probe-last.md ——`);
  exitCode = failures.length === 0 ? 0 : 1;
} catch (error) {
  console.error('defaults-probe: 异常', error);
  exitCode = 1;
} finally {
  try { await booted?.stop?.(); } catch { /* stop 失败不掩盖判定 */ }
  if (!KEEP) rmSync(WS, { recursive: true, force: true });
}
process.exit(failures.length === 0 && exitCode === 0 ? 0 : 1);
