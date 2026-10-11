#!/usr/bin/env node
// cdp-ask-smoke —— cdp-probe `--ask` 的**真模型档**端到端验收（BUG-021 修复的常驻证据）。
//
// 为什么存在：BUG-021 的生产现场坏在两层——①提交按钮 aria-label 是**状态机**（空闲 Send message／
// 在飞 Queue message／插话 Steer message × 双语），旧探针只找含 "Send" 的字符串 → 在飞时**构造性
// 零命中**；②同一位置在 `running && 草稿为空` 或**有挂起交互**时变成 stop，盲点"composer 区最后
// 一个按钮"会**掐断在飞 turn**。判定本体已抽成 `scripts/lib/probe-send-target.mjs`（keyless 钉住），
// 但"在真 UI 上真的发得出去、且真落盘"只有真模型档能证——本 smoke 即那一条。
//
// 两阶段断言（起一条一次性通道 + 独立 workspace，**绝不打在交付会话上**）：
//   ①空闲态：提交按钮 = `Send message` → sent + **landed**（journal 对账命中本会话日志）
//   ②在飞态（子代理挂着，turn 保持 open 且非挂起）：提交按钮 = `Queue message` → sent
//     —— 这正是生产现场旧探针零命中的形态。**本阶段不硬判落盘**：排队消息由服务端在 turn 取用时
//     才写日志，时机可能远超探针轮询窗；"发出 → 落盘"整条链由阶段①硬证。
// 顺带观测（信息，不作硬判据）：挂起态该位置只有 stop → 探针拒点（keyless 面已钉，这里只记实况）。
//
// 档位：**真模型档**（需凭据——`$DSH_HOME/.credentials.yaml` 配一次即可，永不提交）。
// verdict 契约（scripts/AGENTS §冒烟脚本可靠性纪律）：exit 0 = 全绿 / 1 = 断言红 / 2 = 未跑
// （未 source dev/env.sh、缺凭据、vendor 产物缺失）——**未跑 ≠ 通过**。
// 端口自持有：3115（认领制；用完释放到静默）。
// 用法：source dev/env.sh && node scripts/smoke/cdp-ask-smoke.mjs [--port 3115]
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrubbedEnv } from '../lib/env.mjs';
import { assertVendorArtifacts, ARTIFACT_REMEDY } from '../lib/vendor-artifacts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const PORT = Number(arg('port', '3115'));
const BASE = `http://127.0.0.1:${PORT}`;
const HOME = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (HOME === null) {
  console.error('cdp-ask-smoke: 未 source dev/env.sh（DSH_HOME 缺席）——先 source 再跑（未跑 ≠ 通过）');
  process.exit(2);
}
if (!existsSync(join(HOME, '.credentials.yaml'))) {
  console.error(`cdp-ask-smoke: 缺凭据 ${join(HOME, '.credentials.yaml')}——真模型档前置缺席，未跑 ≠ 通过`);
  process.exit(2);
}
const BIN = join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts');
if (!existsSync(BIN)) {
  console.error(`cdp-ask-smoke: 机制基线源码不在位（${BIN}）`);
  process.exit(2);
}
{
  const va = assertVendorArtifacts(ROOT);
  if (!va.ok) {
    console.error(`boot 前自检红：vendor 构建产物缺失（${va.missing.join('、')}）`);
    console.error(ARTIFACT_REMEDY);
    process.exit(2);
  }
}

const TITLE = 'cdp-ask-smoke 临时会话';
// 每次跑用全新 workspace：侧栏里只有这一个会话，按标题点开不可能落到别的会话上
// （2026-10-11 实测教训：同名会话撞车会让消息进旧会话而对账盯新会话 → 假红）。
const WORKSPACE = join(ROOT, 'runtime', 'smoke-workspace', `cdp-ask-${Date.now()}`);
mkdirSync(WORKSPACE, { recursive: true });
// team 行（镜像 client-load-smoke）：不加载 agent-team host 行则 spawn_teammate 不在场，而
// "running 且非挂起"的长时 turn 正是 Queue 标签的触发条件（挂起态的 primary 是 Stop，不是 send）。
const TEAM_ROW = `
    - id: agent-team
      name: '@deepseek-ai/dsh-experimental-agent-team'
      config:
        maxMembers: 8
        maxTasks: 256
        maxPendingMessagesPerMember: 64
        maxMessageBytes: 65536
        disposalTimeoutMs: 5000
`;
const PATCH = join(ROOT, 'runtime', 'smoke-workspace', 'cdp-ask.overlay.yml');
writeFileSync(PATCH, readFileSync(join(ROOT, 'dev', 'research.overlay.yml'), 'utf8') + TEAM_ROW, 'utf8');

const checks = [];
const check = (name, ok) => checks.push([name, ok === true]);
let child;
try {
  child = spawn(process.execPath, ['--import', 'tsx/esm', BIN, '--profile', 'web', '--patch', PATCH, '--', '--port', String(PORT), '--no-open'], { cwd: ROOT, env: scrubbedEnv({ DSH_HOME: HOME }), stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  const token = await new Promise((res, rej) => {
    const onData = (c) => { out += String(c); const m = new RegExp(`http://127\\.0\\.0\\.1:${PORT}/\\?token=(\\S+)`).exec(out); if (m !== null) res(m[1]); };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => rej(new Error(`通道提前退出 code=${code}\n${out.slice(-600)}`)));
    setTimeout(() => rej(new Error(`等启动横幅超时\n${out.slice(-600)}`)), 90_000);
  });
  console.log(`cdp-ask-smoke: 一次性通道已起（port ${PORT}）`);

  const auth = await fetch(`${BASE}/?token=${token}`, { redirect: 'manual' });
  const cookie = (auth.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  if (cookie === '') throw new Error('token 交换没拿到 cookie');
  let seq = 0;
  const rpc = async (endpoint, args) => {
    const res = await fetch(`${BASE}/api/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ type: 'client-request', rpcId: `cdpask-${++seq}`, method: endpoint, payload: { args } }) });
    const body = await res.json();
    if (body?.result?.ok !== true) throw new Error(`${endpoint} 失败: ${JSON.stringify(body?.result?.error ?? body).slice(0, 200)}`);
    return body.result.value;
  };
  const ws = await rpc('workspace/create', { request: { path: WORKSPACE } });
  const workspaceId = ws?.workspace?.workspaceId ?? ws?.workspaceId;
  const created = await rpc('session/create', { request: { workspaceId, agentPreset: 'lead' } });
  const sessionId = created?.id ?? created?.sessionId;
  await rpc('session/rename', { request: { sessionId, title: TITLE } });
  console.log(`cdp-ask-smoke: 临时会话 ${sessionId}（标题「${TITLE}」）`);

  const sessionsRoot = join(HOME, 'sessions');
  const runProbe = async (ask) => {
    const probe = spawn(process.execPath, [join(ROOT, 'scripts', 'probe', 'cdp-probe.mjs'), `${BASE}/?token=${token}`, '--open-session', TITLE, '--ask', ask, '--sessions', sessionsRoot], { cwd: ROOT, env: scrubbedEnv(), stdio: ['ignore', 'pipe', 'pipe'] });
    let pout = '';
    let perr = '';
    probe.stdout.on('data', (c) => { pout += String(c); });
    probe.stderr.on('data', (c) => { perr += String(c); });
    const code = await new Promise((res) => probe.on('exit', res));
    let verdict = null;
    try { verdict = JSON.parse(pout.slice(pout.indexOf('{'))); } catch { /* 按无 verdict 报 */ }
    return { code, verdict, perr };
  };

  // ── 阶段①：空闲态 → Send message ──
  const A = await runProbe('探针连通性测试：请只回复「探针收到」四个字，不要做任何其他事，不要读写任何文件。');
  console.log('=== 阶段①（空闲态）verdict 节选 ===');
  console.log(JSON.stringify({ sent: A.verdict?.sent, sentBy: A.verdict?.sentBy, landed: A.verdict?.landed, answered: A.verdict?.answered, reconcile: A.verdict?.reconcile, failed: A.verdict?.failed }, null, 1));
  check('① probe 退出码 0', A.code === 0);
  check('① sentBy = Send message（空闲态标签）', A.verdict?.sentBy === 'Send message');
  check('① landed = true（journal 对账命中）', A.verdict?.landed === true);
  check('① 对账打在本会话日志上（自动探测 id 与建会话一致）', A.verdict?.reconcile?.sessionId === sessionId);
  check('① logPath 指向本会话', typeof A.verdict?.reconcile?.logPath === 'string' && A.verdict.reconcile.logPath.includes(sessionId));

  // ── 阶段②：在飞态 → Queue message（生产现场形态）──
  await rpc('session/prompt', { request: { requestId: randomUUID(), sessionId, mode: 'queue', content: [{ type: 'text', text: '请立刻 spawn 一个名为 cdp-ask-holder 的 teammate，让它写一份 600 字以上的中文《文件命名规范》说明（越详细越好），然后你等它返回并汇报要点。不要问我任何问题。' }] } });
  await sleep(12_000); // 等子代理真起来（turn 保持 running 且非挂起 → primary 按钮 = queue/steer）
  const B = await runProbe('第二条（排队注入）：请只回复「探针收到」四个字，不要做任何其他事。');
  console.log('=== 阶段②（在飞态）verdict 节选 ===');
  console.log(JSON.stringify({ sent: B.verdict?.sent, sentBy: B.verdict?.sentBy, landed: B.verdict?.landed, answered: B.verdict?.answered, reconcile: B.verdict?.reconcile, failed: B.verdict?.failed }, null, 1));
  check('② sentBy ∈ 在飞态 send 家族（Queue message / Steer message）——旧探针在此构造性零命中',
    typeof B.verdict?.sentBy === 'string' && ['Queue message', 'Steer message'].includes(B.verdict.sentBy));
  check('② 对账目标 = 本会话（自动探测拿到的是本会话 id）', B.verdict?.reconcile?.sessionId === sessionId);
  // ② 的落盘**不作硬判据**：排队消息由服务端在 turn 取用时才写日志，时机可能远超探针的 18s 轮询窗
  // （实测同代码两次跑一次 landed 一次 not-landed）。"发出并落盘"这条链已由阶段①（空闲态）硬证；
  // 本阶段证的是**在飞态标签被命中**——那正是生产现场旧探针构造性零命中的那一层。
  console.log(`（信息）阶段② landed=${String(B.verdict?.landed)}（reconcile=${B.verdict?.reconcile?.status ?? 'null'}）——排队落盘时机由服务端定，不作为判据。`);
  if (B.verdict?.answered !== true) console.log('（信息）阶段② answered=false 与判据无关：本阶段判"标签是否被命中"，不是等模型回复。');
} catch (error) {
  console.error(`cdp-ask-smoke: 运行期失败——${error.message}`);
  checks.push(['运行期无异常', false]);
} finally {
  if (child !== undefined) {
    child.kill('SIGTERM');
    await new Promise((res) => { child.once('exit', res); setTimeout(res, 8000); });
    if (child.exitCode === null) child.kill('SIGKILL');
    console.log(`cdp-ask-smoke: 通道已拆（exitCode=${child.exitCode}）`);
  }
  await sleep(200);
}

console.log('=== 断言 ===');
let allOk = checks.length > 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) allOk = false;
}
console.log(allOk
  ? 'cdp-ask-smoke: ALL PASS（空闲态 Send message 发出并落盘 + 在飞态 Queue message 标签命中；在飞态落盘时机不作判据）'
  : 'cdp-ask-smoke: FAILURE(S)——见上（真 UI 上发出/落盘未全绿）');
process.exit(allOk ? 0 : 1);
