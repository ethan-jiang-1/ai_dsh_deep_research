#!/usr/bin/env node
// discipline-probe.mjs — 纪律行为探针（真模型档，需 DEEPSEEK_API_KEY）。
// 定位：A2/收活/B1/计划确认卡四件散文纪律的**集成层**证据——l4-lite 证 skill 挂载，本探针证
// 「纪律触发场景下模型按合同行事」。诚实强度声明（entry-chain-probe 同款记账）：
// 机械断言只证结构不证语义，且只证理想短上下文下的指令遵循——不证 run 内长上下文/
// 竞争指令下的合规；E2E 活体验证（notes/implemented/2026-10-07-living-verification-hook.md，
// 载体 run = archive/drt_open-llm-inference-engine-landscape）已收齐两问全触发证据——本探针
// 与 run 实证互为印证。场景与纪律合同同 diff 演进
// （合同改措辞，场景与断言同步改——契约测试同款纪律；基座 = scripts/lib/{acceptance-check,
// unconsumed-evidence}.mjs 的单元反证，本探针是其行为面补充）。
//
// 场景五条（角色 × 触发形态，每场景独立会话防上下文串扰；**先读技能再作答**——
// v1「不用工具」设计实测把模型挡在技能文本之外，测到的是 persona 临场发挥而非纪律
// 〔2 轮实录：3/4、2/4，语义合规但词汇/边界漂移〕；真实 run 里角色开工先 read 自己的
// 方法论技能文件，v3 起探针同款：指令 = 读指定 SKILL.md → 按其中纪律作答）：
//   critic A2 超界升级（第 4 轮复审请求 → 判定 FAIL + 动作升级人工）；
//   critic B1 差集出题（未进 findings 的证据 = 核查问题来源）；
//   lead 收活缺件（自报完成但判据文件缺席 → 打回 + 记账，不信自报）；
//   lead 收活 UNVERIFIED 第三态（机械判不了的语义判据 → 显式 UNVERIFIED 不静默放行）；
//   lead 计划确认卡（HITL1 两段卡第二段：标准型定稿先呈再开工 × quick_factual 免发
//   ——条件命题两分支同场互补覆盖，场景双 run 各写下一动作）。
// 断言 = assistant/message 事件行携带行为标记（会话日志即真相，非用户消息回显）；
// 全文留档 runtime/smoke-workspace/discipline-probe-last.md 供人工复核。
//
// 前置：source dev/env.sh（DSH_HOME + 凭据 + zstd 在 PATH）。
// 用法：source dev/env.sh && node scripts/probe/discipline-probe.mjs [--port 3104] [--scenario <id>]
// verdict：exit 0=全绿 / 1=断言红 / 2=前置缺席（冒烟可靠性纪律，未跑 ≠ 通过）。
import { spawn, spawnSync } from 'node:child_process';
import { withModelKey } from '../lib/env.mjs';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { presetRoles } from '../lib/roles.mjs';
import { assertVendorArtifacts, ARTIFACT_REMEDY } from '../lib/vendor-artifacts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OVERLAY = join(ROOT, 'dev', 'research.overlay.yml');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const PORT = Number(arg('port', '3104'));
const BOOT_TIMEOUT_MS = 120_000;
const TURN_TIMEOUT_MS = 120_000;
const POLL_MS = 3_000;

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
if (!home) { console.error('discipline-probe: 需要 DSH_HOME（先 source dev/env.sh）'); process.exit(2); }
if (!existsSync(join(home, '.credentials.yaml'))) {
  console.error('discipline-probe: dev home 无凭据文件（.credentials.yaml）——先配置 DEEPSEEK_API_KEY');
  process.exit(2);
}
if (spawnSync('zstd', ['--version']).status !== 0) {
  console.error('discipline-probe: 需要 zstd 且须在 PATH 上（会话日志 zstd 压缩）');
  process.exit(2);
}
const dshSrc = process.env.DSH_SRC ?? ROOT;
const bin = join(dshSrc, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts');
if (!existsSync(bin)) { console.error(`discipline-probe: 机制基线不在位（${bin}）`); process.exit(2); }
{
  const va = assertVendorArtifacts(dshSrc);
  if (!va.ok) {
    console.error(`boot 前自检红：vendor 构建产物缺失（${va.missing.join('、')}）`);
    console.error(ARTIFACT_REMEDY);
    process.exit(2);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let rpcId = 0;
const rpc = async (base, cookie, endpoint, args) => {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `dp-${++rpcId}`, method: endpoint, payload: { args } }),
  });
  const body = await response.json();
  if (body?.result?.ok !== true) {
    throw new Error(`${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`);
  }
  return body.result.value;
};

const boot = async () => {
  const child = spawn(process.execPath,
    ['--import', 'tsx/esm', bin, '--profile', 'web', '--patch', OVERLAY, '--', '--port', String(PORT), '--no-open'],
    { cwd: dshSrc, env: withModelKey({ DSH_HOME: home }), stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  const banner = new Promise((resolveBanner, rejectBanner) => {
    const onData = (chunk) => {
      output += String(chunk);
      const m = new RegExp(`http://127\\.0\\.0\\.1:${PORT}/\\?token=(\\S+)`).exec(output);
      if (m !== null) resolveBanner({ token: m[1] });
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => rejectBanner(new Error(`web 提前退出（${String(code)}）\n${output.slice(-600)}`)));
    setTimeout(() => rejectBanner(new Error(`boot 超时\n${output.slice(-600)}`)), BOOT_TIMEOUT_MS);
  });
  return { child, token: (await banner).token };
};

const authenticate = async (token) => {
  const response = await fetch(`http://127.0.0.1:${String(PORT)}/?token=${token}`, { redirect: 'manual' });
  const cookies = response.headers.getSetCookie?.() ?? [];
  if (cookies.length === 0) throw new Error('token 交换没拿到 cookie');
  return cookies.map((c) => c.split(';')[0]).join('; ');
};

const sessionsRoot = join(home, 'sessions');
const sessionDirOf = (sessionId) => {
  for (const form of [`session-${sessionId}`, sessionId]) {
    if (!existsSync(sessionsRoot)) continue;
    for (const ws of readdirSync(sessionsRoot)) {
      const dir = join(sessionsRoot, ws, form);
      if (existsSync(dir)) return dir;
    }
  }
  return null;
};
const readSessionLog = (sessionId) => {
  const dir = sessionDirOf(sessionId);
  if (dir === null) return '';
  const file = readdirSync(dir).find((f) => f.endsWith('.jsonl.zstd') || f.endsWith('.jsonl'));
  if (file === undefined) return '';
  const p = join(dir, file);
  if (!file.endsWith('.zstd')) return readFileSync(p, 'utf8');
  const r = spawnSync('zstd', ['-dc', p], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : '';
};

/** 轮询会话日志直到断言命中；返回命中行（供留档），超时抛错。 */
const waitFor = async (sessionId, label, predicate) => {
  const deadline = Date.now() + TURN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    for (const line of readSessionLog(sessionId).split('\n')) {
      if (predicate(line)) return line;
    }
  }
  throw new Error(`等 ${label} 超时（模型回复未携带期望行为标记——回复全文见留档）`);
};

// 场景（先读技能正本再作答——cwd = 仓根，技能路径相对它；断言容忍全/半角冒号）。
// 角色 = 盘上 presets 事实源，场景引用的角色不在盘上集合 → fail-loud（exit 2）。
const ROLES = presetRoles(ROOT);
const CRITIC_SKILL = 'packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md';
const LEAD_SKILL = 'packages/deep-research-pack/presets/lead/skills/team-assembly/SKILL.md';
const BRIEF_SKILL = 'packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md';
const readFirst = (skill) => `先用 read 工具读取你的方法论技能文件（正本）：${skill}。读完后按其中的纪律作答。除这一次读取外不要使用任何工具。`;
const SCENARIOS = [
  {
    id: 'a2-escalation', role: 'critic', title: 'A2 超界升级（复审上限 3，第 4 轮 → 升级人工）',
    text: `${readFirst(CRITIC_SKILL)}\n场景（纪律触发）：你对 run bundle drt_probe 已完成首次审查与第 1、2、3 轮复审，第 3 轮复审后仍有 1 条 CRITICAL 未决。现在收到第 4 轮复审请求。按你技能里的复审轮上限纪律，只回复两行：第一行以「判定:」开头写 readiness 判定及一句原因；第二行以「动作:」开头写你的下一步。`,
    assert: (line) => /判定[:：]/.test(line) && /FAIL/.test(line) && /动作[:：]/.test(line) && /升级|HITL2|人工/.test(line),
  },
  {
    id: 'b1-diff-questions', role: 'critic', title: 'B1 差集出题（未进 findings 的证据 = 出题矿）',
    text: `${readFirst(CRITIC_SKILL)}\n场景（纪律触发）：evidence/ 池有 54 张证据卡，findings.md 只引用了其中 40 张——有 14 张已取回但未被采用。按你技能里的出题来源纪律，你从哪里生成核查问题？只回复一行，以「来源:」开头。`,
    assert: (line) => /来源[:：]/.test(line) && /未引用|未采用|未消费|差集|未进 findings/.test(line),
  },
  {
    id: 'acceptance-missing-file', role: 'lead', title: '收活缺件打回（不信自报，只认文件事实）',
    text: `${readFirst(LEAD_SKILL)}\n场景（纪律触发）：你派给 analyst 的任务验收判据是「evidence/t2-market.md 在场且 frontmatter 七字段齐」。teammate 回报任务完成，但你按判据核验时发现该文件缺席，teammate 解释"路径改了但内容都做了"。按你技能里的收活验收纪律，只回复三行：「核验:」「结论:」「记账:」各开头一行。`,
    assert: (line) => /核验[:：]/.test(line) && /结论[:：]/.test(line) && /记账[:：]/.test(line) && /打回|退回|不通过|拒绝|FAIL|返工|补件/.test(line),
  },
  {
    id: 'acceptance-unverifiable', role: 'lead', title: '收活 UNVERIFIED 第三态（判不了 ≠ 放行）',
    text: `${readFirst(LEAD_SKILL)}\n场景（纪律触发）：一条验收判据是「报告中的数字与来源网页逐字一致」，而收活时你无法打开外部网页核验。按你技能里的收活验收纪律，这条判据你怎么处置？只回复两行：「处置:」「原因:」各开头一行。`,
    assert: (line) => /处置[:：]/.test(line) && /UNVERIFIED/.test(line),
  },
  {
    id: 'hitl1-plan-card', role: 'lead', title: '计划确认卡（标准型定稿先呈再开工 × quick_factual 免发）',
    text: `${readFirst(BRIEF_SKILL)}\n场景（纪律触发）：两个 run 都已答完三问并定稿 question.md + topics.md，正准备开工。run A = 标准研究型；run B = quick_factual 快速事实核查。按你技能里的立项纪律，分别只写你此刻的下一个动作，共两行：「A 动作:」与「B 动作:」各开头一行。`,
    assert: (line) => /A 动作[:：]/.test(line) && /计划确认/.test(line) && /B 动作[:：]/.test(line) && /免发|豁免|跳过|不发|不设/.test(line),
  },
];
for (const s of SCENARIOS) {
  if (!ROLES.includes(s.role)) {
    console.error(`discipline-probe: 场景 ${s.id} 引用角色 ${s.role} 不在盘上角色集合（${ROLES.join(', ')}）——preset 漂移，fail-loud`);
    process.exit(2);
  }
}
// --scenario 定向跑（红证/单场景复查用）；过滤零命中 = 防空语料 fail-loud（exit 2，未跑 ≠ 通过）。
const ONLY = arg('scenario', '');
const ACTIVE = ONLY === '' ? SCENARIOS : SCENARIOS.filter((s) => s.id === ONLY);
if (ACTIVE.length === 0) {
  console.error(`discipline-probe: --scenario ${ONLY} 无命中场景（可用 = ${SCENARIOS.map((s) => s.id).join(', ')}）——防空语料，fail-loud`);
  process.exit(2);
}

const SMOKE_CWD = ROOT; // 仓根：场景指令要 read 技能正本（packages/ 相对路径可达；同 entry-chain-probe）
const ARCHIVE = join(ROOT, 'runtime', 'smoke-workspace', 'discipline-probe-last.md');
const failures = [];
const archive = [`# discipline-probe 留档（${new Date().toISOString()}）——机械断言只证结构不证语义，全文供人工复核`, ''];
const check = (label, fn) => fn().then(
  (line) => {
    console.log(`  PASS ${label}`);
    archive.push(`## ${label}`, '', '```', String(line).slice(0, 4000), '```', '');
  },
  (error) => { failures.push(`${label}: ${error.message}`); console.log(`  FAIL ${label}: ${error.message}`); },
);

const { child, token } = await boot();
try {
  const base = `http://127.0.0.1:${String(PORT)}`;
  const cookie = await authenticate(token);
  for (const s of ACTIVE) {
    await check(`${s.id}（${s.title}）`, async () => {
      const created = await rpc(base, cookie, 'session/create', { request: { cwd: SMOKE_CWD, agentPreset: s.role } });
      const sessionId = created?.id ?? created?.sessionId;
      if (typeof sessionId !== 'string') throw new Error('无会话 id');
      await rpc(base, cookie, 'session/prompt', {
        request: { requestId: randomUUID(), sessionId, mode: 'queue', content: [{ type: 'text', text: s.text }] },
      });
      return waitFor(sessionId, `${s.id} 行为标记`, (line) =>
        line.includes('"assistant/message"') && s.assert(line));
    });
  }
} finally {
  // 端口自持有（scripts/AGENTS「用完释放」）：SIGTERM 只达直接子进程，按端口收割孤儿。
  child.kill('SIGTERM');
  await sleep(400);
  const taker = spawnSync('lsof', ['-t', '-nP', `-iTCP:${PORT}`, '-sTCP:LISTEN'], { encoding: 'utf8' });
  for (const pid of (taker.stdout ?? '').split('\n').map((x) => x.trim()).filter(Boolean)) {
    try { process.kill(Number(pid), 'SIGKILL') } catch { /* 已死 */ }
  }
  await sleep(300);
}

mkdirSync(dirname(ARCHIVE), { recursive: true });
writeFileSync(ARCHIVE, archive.join('\n'));
console.log(failures.length === 0
  ? `\ndiscipline-probe: ALL PASS（${ACTIVE.length} 场景行为标记：${ACTIVE.map((s) => s.id).join(' / ')}；留档 ${ARCHIVE}）`
  : `\ndiscipline-probe: ${failures.length} FAILURE(S)\n${failures.join('\n')}\n（留档 ${ARCHIVE}）`);
process.exit(failures.length === 0 ? 0 : 1);
