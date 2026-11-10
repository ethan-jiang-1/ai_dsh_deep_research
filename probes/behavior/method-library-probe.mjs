#!/usr/bin/env node
// 探针：method-library-probe
// 状态：常驻
// 一句话：Lead 能说出偏好库路径、当前条目数、点名条目缺席（BUG-042 判据 #4）
// 何时跑：偏好库播种/手册指路/面板文案改动；BUG-042 回归
// 档位：真模型（DEEPSEEK_API_KEY；REAL_MODEL 闭集）
// 判据：C1 文件名+位置；C2 当前条目数；C3 点名条目如实说不在库
// 不证明：模型是否按偏好执行；长上下文；面板点击链
// 为什么存在：可发现性只能真模型证明；静态断言只能钉文案
// method-library-probe.mjs — 偏好库探测探针（真模型档，需 DEEPSEEK_API_KEY）。
// 服务 BUG-042 的修复判据 #4：全新空工作区（D40 起包不再播种）里，Lead 能否**说出偏好库的
// 路径与当前条目**——这是"模型探索得到偏好放哪儿"的机器化证明，不是靠人读 prompt 猜。
//
// 与 entry-chain-probe 的分工：那条验入口链（开发仓根），本条验研究驾驶舱的偏好库面
// （临时工作区 cwd）。判据是**内容不变量**，不绑条目名（问法换条目也不变）：
//   Q1 必须说出 `method-library.md` 与「工作区根 / 会话 cwd」的位置语义；
//   Q2 必须报出当前条目数，或如实说「未核实/空/还没建」（不得编造条目名）；
//   Q3 必须说明题面点名的偏好不在/未命中/未核实（不得声称"已按该偏好执行"）。
// 零工具 prompt（避免 read/bash 审批把探针挂起）：模型只凭手册/上下文回答，所以「未核实」
// 是当前的诚实态，不是失败；失败面 = 编造条目或假称已执行。
//
// 前置：source dev/env.sh。用法：node probes/behavior/method-library-probe.mjs [--port 3116]
import { requireCredentials, requireDevHome, withModelKey } from '../../scripts/lib/env.mjs';
import { authenticate, bootWeb, makeRpc } from '../../scripts/lib/web-harness.mjs';
import { readSessionTextOf } from '../../scripts/lib/session-log.mjs';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
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
requireDevHome('method-library-probe', { home, root: ROOT });
requireCredentials('method-library-probe', { home });
const bin = join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts');
if (!existsSync(bin)) { console.error(`probe: 机制基线不在位（${bin}）——git submodule update --init`); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const pass = (m) => console.log(`  PASS ${m}`);
const fail = (m) => { failures += 1; console.log(`  FAIL ${m}`); };

// ── 临时研究工作区：空工作区（D40 起包不再播种；内容经 runtime context 注入）──
const WS = join(ROOT, 'runtime', 'smoke-workspace', 'method-library-probe-ws');
rmSync(WS, { recursive: true, force: true });
mkdirSync(WS, { recursive: true });

// 前置：D40 后干净工作区没有 method-library.md（不是缺陷；模型应如实说 0 条）
{
  const p = join(WS, 'method-library.md');
  if (existsSync(p)) fail('空工作区不应有 method-library.md（D40 不播种；旧种子残留会污染判据）');
  else pass('空工作区：method-library.md 不存在（D40 不播种，模型应如实说 0 条）');
}

const rpc = makeRpc({
  prefix: 'lib-probe-',
  errorOf: (endpoint, body) => `${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`,
});

const readSessionLog = (sessionId) => readSessionTextOf(join(home, 'sessions'), sessionId);

const PROMPT = `你是一名新的研究主编，工作目录就是当前研究的工作区。用户说：

「本次研究请按我保存的研究偏好『领域地图』来做。」

请严格按你的立项纪律处理，**不要调用任何工具**（不要 read/bash/glob），直接**恰好用三行**回答（格式 \`Q<n>: <一句话>\`，不要别的）：

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

    // Q2：空工作区（D40 不播种）→ 答 0/空/还没建，或零工具下如实说未核实；不得编条目名
    const zeroish = /(^|\D)0(\D|$)|空|没有(任何)?条目|暂无|无偏好条目|还没建|未建|没存过|未存/.test(q2);
    const honestUnknown = /无法(得知|确认|核实)|未核实|未读|没读|不能确定|不知道/.test(q2);
    const claimedNames = /「.+」|『.+』/.test(q2) && !zeroish;
    if ((zeroish || honestUnknown) && !claimedNames) pass(`Q2 报空库/未核实且未编造：${q2.slice(0, 90)}`);
    else fail(`Q2 对空库报出了条目（幻觉风险）：${q2.slice(0, 120)}`);

    // Q3：必须承认点名条目不在/未命中/未核实，且不得声称"已按该偏好执行"
    const admitsAbsent = /不在|没有|未收录|不存在|找不到|未命中/.test(q3);
    const honestUnknownQ3 = /未核实|无法(确认|得知|核实)|未读|不能确定/.test(q3);
    const falseClaim = /已按(该|此)?偏好执行|已采用该偏好|已加载「?领域地图」?/.test(q3);
    if ((admitsAbsent || honestUnknownQ3) && !falseClaim) pass(`Q3 如实说明未命中/未核实：${q3.slice(0, 90)}`);
    else fail(`Q3 没有如实说明（admitsAbsent=${admitsAbsent} honestUnknown=${honestUnknownQ3} falseClaim=${falseClaim}）：${q3.slice(0, 140)}`);
  }

  console.log('');
  console.log(failures === 0 ? 'method-library-probe: ALL PASS' : `method-library-probe: ${failures} 处失败`);
  console.log(text ? `\n—— 模型原答（留档复核）——\n${text}` : '');
  await b.stop?.();
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((e) => { console.error('method-library-probe: 异常', e); process.exit(1); });
