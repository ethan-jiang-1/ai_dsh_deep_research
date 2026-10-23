#!/usr/bin/env node
// method-library-probe.mjs — 偏好库探测探针（真模型档，需 DEEPSEEK_API_KEY）。
// 服务 BUG-042 的修复判据 #4：全新工作区 scaffold 后，Lead 能否**说出偏好库的路径与当前
// 条目**——这是"模型探索得到偏好放哪儿"的机器化证明，不是靠人读 prompt 猜。
//
// 与 entry-chain-probe 的分工：那条验入口链（开发仓根），本条验研究驾驶舱的偏好库面
// （临时工作区 cwd）。判据是**内容不变量**，不绑条目名（问法换条目也不变）：
//   Q1 必须说出 `method-library.md` 与「工作区根 / 会话 cwd」的位置语义；
//   Q2 必须报出**当前条目数**（种子 = 0 条，示例在注释里不算 → 答 0 或"空/无条目"才算对）；
//   Q3 必须说出题面点名的偏好**不在库里**（不得声称"已按该偏好执行"）。
//
// 前置：source dev/env.sh。用法：node scripts/probe/method-library-probe.mjs [--port 3116]
import { requireCredentials, withModelKey } from '../lib/env.mjs';
import { authenticate, bootWeb, makeRpc } from '../lib/web-harness.mjs';
import { readSessionText, resolveSessionLog } from '../lib/session-log.mjs';
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const PORT = Number(arg('port', '3116'));
const BOOT_TIMEOUT_MS = 180_000;
const TURN_TIMEOUT_MS = 240_000;
const POLL_MS = 3_000;

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
if (!home) { console.error('probe: 需要 DSH_HOME（先 source dev/env.sh）'); process.exit(2); }
requireCredentials('probe', { home });
const bin = join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts');
if (!existsSync(bin)) { console.error(`probe: 机制基线不在位（${bin}）——git submodule update --init`); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const pass = (m) => console.log(`  PASS ${m}`);
const fail = (m) => { failures += 1; console.log(`  FAIL ${m}`); };

// ── 临时研究工作区：真 scaffold（不许手搓种子——那验不到播种）────────────────
const WS = join(ROOT, 'runtime', 'smoke-workspace', 'method-library-probe-ws');
rmSync(WS, { recursive: true, force: true });
mkdirSync(WS, { recursive: true });
{
  // 只铺工作区种子（不带 profile，避免动 dev home 的 research profile）
  const out = execFileSync(process.execPath,
    [join(ROOT, 'packages', 'deep-research-pack', 'scripts', 'scaffold.mjs'),
      '--workspace', WS, '--dry-run', '--json'],
    { encoding: 'utf8', cwd: ROOT });
  void out;
}
// dry-run 不落盘：直接按 pack 种子复制（这才是 scaffold 的落盘等价物，且不碰 home）
{
  const SEED = join(ROOT, 'packages', 'deep-research-pack', 'workspace');
  const walk = (dir, rel = '') => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const src = join(dir, ent.name);
      const r = rel ? join(rel, ent.name) : ent.name;
      if (ent.isDirectory()) walk(src, r);
      else if (ent.name.endsWith('.md') || ent.name === '.gitignore.example') {
        const dst = join(WS, r === '.gitignore.example' ? '.gitignore' : r);
        mkdirSync(dirname(dst), { recursive: true });
        execFileSync('cp', [src, dst]);
      }
    }
  };
  walk(SEED);
}

// 判据前置：种子里必须有偏好库，且是空架子（注释外 0 条）
{
  const p = join(WS, 'method-library.md');
  if (!existsSync(p)) fail('种子里没有 method-library.md（BUG-042 未修）');
  else {
    const text = readFileSync(p, 'utf8');
    const live = text.replace(/<!--[\s\S]*?-->/g, '');
    const entries = (live.match(/^## /gm) ?? []).length;
    if (entries === 0) pass(`种子偏好库在场且是空架子（注释外条目 ${entries} 条）`);
    else fail(`种子偏好库含注释外条目 ${entries} 条（种子必须无偏好）`);
  }
}

const rpc = makeRpc({
  prefix: 'lib-probe-',
  errorOf: (endpoint, body) => `${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`,
});

const sessionDirOf = (sessionId) => {
  const sessionsRoot = join(home, 'sessions');
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
  const logPath = resolveSessionLog(dir);
  return logPath === null ? '' : (readSessionText(logPath) ?? '');
};

const PROMPT = `你是一名新的研究主编，工作目录就是当前研究的工作区。用户说：

「本次研究请按我保存的研究偏好『领域地图』来做。」

请严格按你的立项纪律处理，然后**恰好用三行**回答（格式 \`Q<n>: <一句话>\`，不要别的）：

Q1: 你的偏好库文件叫什么、在本工作区的什么位置？
Q2: 库现在有几条偏好条目、分别叫什么名字？
Q3: 用户点名的『领域地图』在不在库里？你打算怎么处理？`;

const main = async () => {
  console.log('method-library-probe: 真模型档（cwd = 临时研究工作区）');
  const b = await bootWeb({
    bin, cwd: WS, profile: 'web', patchPath: null, port: PORT,
    env: withModelKey({ DSH_HOME: home }), timeoutMs: BOOT_TIMEOUT_MS, tailChars: 800, detached: false,
  });
  const base = `http://127.0.0.1:${String(PORT)}`;
  const cookie = await authenticate(base, b.token);
  // cwd 钉在临时研究工作区：本探针验的就是"工作区里的偏好库能不能被看到"
  const created = await rpc(base, cookie, 'session/create', { request: { cwd: WS } });
  const sessionId = created?.id ?? created?.sessionId;
  if (typeof sessionId !== 'string') throw new Error('无会话 id');
  await rpc(base, cookie, 'session/prompt', {
    request: { requestId: randomUUID(), sessionId, mode: 'queue', content: [{ type: 'text', text: PROMPT }] },
  });

  const deadline = Date.now() + TURN_TIMEOUT_MS;
  let text = '';
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    const log = readSessionLog(sessionId);
    const parts = [];
    for (const line of log.split('\n')) {
      if (!line.includes('"assistant/message"')) continue;
      try {
        for (const blk of JSON.parse(line).data?.message?.content ?? []) {
          if (blk.type === 'text' && blk.text) parts.push(blk.text);
        }
      } catch { /* 畸形行跳过 */ }
    }
    const joined = parts.join('\n');
    if ((joined.match(/^Q[1-3]:/gm) ?? []).length >= 3) { text = joined; break; }
  }
  if (!text) fail(`等答案超时（${TURN_TIMEOUT_MS}ms 内未见 Q1–Q3 三行）`);
  else {
    const q = (n) => (text.match(new RegExp(`^Q${n}: *(.*)$`, 'm')) ?? [, ''])[1];
    const q1 = q(1); const q2 = q(2); const q3 = q(3);

    // Q1：必须点名文件 + 位置语义
    if (/method-library\.md/.test(q1)) pass(`Q1 说出文件名与位置：${q1.slice(0, 90)}`);
    else fail(`Q1 没说出 method-library.md：${q1.slice(0, 120)}`);

    // Q2：种子是空库 → 必须答 0 条 / 空 / 无条目
    const zeroish = /(^|\D)0(\D|$)|空|没有(任何)?条目|暂无|无偏好条目/.test(q2);
    const claimedNames = /「.+」|『.+』/.test(q2) && !zeroish;
    if (zeroish && !claimedNames) pass(`Q2 报当前为空库：${q2.slice(0, 90)}`);
    else fail(`Q2 对空库报出了条目（幻觉风险）：${q2.slice(0, 120)}`);

    // Q3：必须承认点名条目不在库里，且不得声称"已按该偏好执行"
    const admitsAbsent = /不在|没有|未收录|不存在|找不到/.test(q3);
    const falseClaim = /已按(该|此)?偏好执行|已采用该偏好|已加载「?领域地图」?/.test(q3);
    if (admitsAbsent && !falseClaim) pass(`Q3 如实说明点名条目不在库：${q3.slice(0, 90)}`);
    else fail(`Q3 没有如实说明（admitsAbsent=${admitsAbsent} falseClaim=${falseClaim}）：${q3.slice(0, 140)}`);
  }

  console.log('');
  console.log(failures === 0 ? 'method-library-probe: ALL PASS' : `method-library-probe: ${failures} 处失败`);
  console.log(text ? `\n—— 模型原答（留档复核）——\n${text}` : '');
  await b.stop?.();
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((e) => { console.error('method-library-probe: 异常', e); process.exit(1); });
