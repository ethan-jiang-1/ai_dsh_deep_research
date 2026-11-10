#!/usr/bin/env node
// 探针：entry-chain-probe
// 状态：常驻
// 一句话：入口链三问（授权范围/RFC 条件/开发环路径）真模型可召回
// 何时跑：改根/子树 AGENTS 或入口链；入口链导航合同变更；纯文档卫生轮
// 档位：真模型（DEEPSEEK_API_KEY；REAL_MODEL 闭集）
// 判据：C1 授权范围；C2 RFC 条件；C3 开发环路径；C4 原文留档
// 不证明：入口链之外的文档段；模型执行能力；长上下文抗漂移
// 为什么存在：入口链是 fresh agent 第一跳；词面/语义随模型漂移
// entry-chain-probe.mjs — 入口链探针（真模型档，需 DEEPSEEK_API_KEY）。
// RFC：notes/archived/2026-09-24-entry-chain-probe.md · 语义版已人工两跑（2026-09-24，
// 见 implemented Note），本脚本 = 脚本化 + 制度化（每 feature 条目收尾跑）。
//
// 设计（时不变原则——company 探针已知盲区：问句期望也会过期，问法必须换任何 ▶ 条目都不变）：
//   1. 全新默认 preset 会话（无研究 pack 上下文污染），cwd = 仓根；
//   2. prompt 按根 AGENTS.md 条件式入口读取，核验授权边界与开发环路由；
//   3. 会话日志即真相：assistant/message 事件里找答案文本（不是用户消息回显），全文留档供人工复核。
//
// 前置：source dev/env.sh（DSH_HOME + 凭据）；DSH_SRC 默认本仓根（vendor/dsh）。
// 用法：source dev/env.sh && node probes/behavior/entry-chain-probe.mjs [--port 3114]
import { requireCredentials, withModelKey } from '../../scripts/lib/env.mjs';
import { authenticate, bootWeb, makeRpc } from '../../scripts/lib/web-harness.mjs';
import { readSessionTextOf } from '../../scripts/lib/session-log.mjs';
import { randomUUID } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertVendorArtifacts, ARTIFACT_REMEDY } from '../../scripts/lib/vendor-artifacts.mjs';
import { directAuthorizationBoundaryPasses, rfcBoundaryPasses } from '../../scripts/lib/direct-authorization-boundary.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const PORT = Number(arg('port', '3114'));
const BOOT_TIMEOUT_MS = 120_000;
const TURN_TIMEOUT_MS = 180_000;
const POLL_MS = 3_000;
const OUT = join(ROOT, 'runtime', 'smoke-workspace');

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
if (!home) { console.error('probe: 需要 DSH_HOME（先 source dev/env.sh）'); process.exit(2); }
requireCredentials('entry-chain-probe', { home });
const dshSrc = process.env.DSH_SRC ?? ROOT; // 本仓根 = 安装锚（vendor/dsh submodule）
const bin = join(dshSrc, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts');
if (!existsSync(bin)) { console.error(`probe: 机制基线不在位（${bin}）——git submodule update --init`); process.exit(2); }

// ── DSH 会话面（照抄 l4-lite 实证骨架）──────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// RPC 正本 = lib/web-harness.makeRpc（原值：前缀 `probe-`、无 AbortSignal 预算、
// 失败文案与 200 字符截断逐字保形）
const rpc = makeRpc({
  prefix: 'probe-',
  errorOf: (endpoint, body) => `${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`,
});

// 启停与横幅等待正本 = lib/web-harness.bootWeb（原值：**非组长** detached:false、
// withModelKey({DSH_HOME}) 环境、超时 BOOT_TIMEOUT_MS、失败尾部 600 字符、无 --patch）
const boot = async () => bootWeb({
  bin, cwd: dshSrc, profile: 'web', patchPath: null, port: PORT,
  env: withModelKey({ DSH_HOME: home }), timeoutMs: BOOT_TIMEOUT_MS, tailChars: 600,
  detached: false,
});


// 会话日志读取：目录发现/代际选择/解压全归 canonical session-log（node zlib，无子进程）。
const sessionsRoot = join(home, 'sessions');
const readSessionLog = (sessionId) => readSessionTextOf(sessionsRoot, sessionId);

/** 轮询直到 assistant 完成作答：等会话日志出现 ≥4 行 "Q<n>:" 的 assistant/message 文本。 */
const waitForAnswer = async (sessionId) => {
  const deadline = Date.now() + TURN_TIMEOUT_MS;
  let last = '';
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    const log = readSessionLog(sessionId);
    const texts = [];
    for (const line of log.split('\n')) {
      if (!line.includes('"assistant/message"')) continue;
      try {
        for (const b of JSON.parse(line).data?.message?.content ?? []) {
          if (b.type === 'text' && b.text) texts.push(b.text);
        }
      } catch { /* 畸形行跳过 */ }
    }
    last = texts.join('\n');
    if ((last.match(/^Q[1-3]:/gm) ?? []).length >= 3) return last;
    // 挂起等待人类（探针会话不该发生）：发现 open ask 即失败
    if (log.split('\n').at(-1)?.includes('"ask_user_question"')) throw new Error('模型反问人类——探针问题必须自足');
  }
  throw new Error(`等答案超时（最后文本片段：${last.slice(-200) || '无'}）`);
};

// ── 主流程 ───────────────────────────────────────────────────────────────────
const PROMPT = `你是入口链探针（一次只读审计，不授予实施权限）。先读根 AGENTS.md 与 docs/00-index.md，再按入口链的条件读取必要文件；不要把所有条件步骤当作普遍前置。每问恰好一行，格式为「Q<n>: <一句话答案>」：

Q1: 用户本轮明确授权的局部修改按什么范围执行？是否需要重复请批？
Q2: RFC 是否是一般实施工作的普遍前置？它在哪种持久决定情况下才需要？
Q3: 开工与收尾程序在哪个文件？`;

console.log('probe: 真值——本仓不设仓级 queue 当前项，授权范围与 guides/60 是判断依据');
// boot 前自检（RFC vendor-build-guard）：0.1.7 起启动依赖构建产物，缺失时报错隐晦——
// 提前拦成一行 remedy。exit 2 = 环境前置缺失（与"未 source env"同档）。
{
  const va = assertVendorArtifacts(dshSrc);
  if (!va.ok) {
    console.error(`boot 前自检红：vendor 构建产物缺失（${va.missing.join('、')}）`);
    console.error(ARTIFACT_REMEDY);
    process.exit(2);
  }
}
const { child, token } = await boot();
let verdict = [];
let transcript = '';
try {
  const base = `http://127.0.0.1:${String(PORT)}`;
  const cookie = await authenticate(base, token);
  const created = await rpc(base, cookie, 'session/create', { request: { cwd: ROOT, agentPreset: 'standard' } });
  const sessionId = created?.sessionId ?? created?.id;
  if (typeof sessionId !== 'string') throw new Error('无会话 id');
  await rpc(base, cookie, 'session/prompt', {
    request: { requestId: randomUUID(), sessionId, mode: 'queue', content: [{ type: 'text', text: PROMPT }] },
  });
  console.log(`probe: 会话 ${sessionId} 已提问，等待作答（真模型档，最长 ${TURN_TIMEOUT_MS / 1000}s）…`);
  const answer = await waitForAnswer(sessionId);
  transcript = answer;
  console.log('\n──── 模型作答（原文）────');
  console.log(answer);
  console.log('────────────────────────\n');

  const q1 = /^Q1:(.+)$/m.exec(answer)?.[1] ?? '';
  const q2 = /^Q2:(.+)$/m.exec(answer)?.[1] ?? '';
  const q3 = /^Q3:(.+)$/m.exec(answer)?.[1] ?? '';
  verdict.push(['Q1 明确按用户授权范围执行且无需重复请批', directAuthorizationBoundaryPasses(q1)]);
  verdict.push(['Q2 RFC 仅适用于需显式评审的持久决定，不是实施普遍前置', rfcBoundaryPasses(q2)]);
  verdict.push(['Q3 指认 guides/60（开发环）', /60|开发环|guides/i.test(q3)]);
} finally {
  child.kill('SIGTERM');
  await sleep(300);
}

for (const [label, ok] of verdict) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`);
const failed = verdict.filter(([, ok]) => !ok).length;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(join(OUT, `entry-chain-probe-${stamp}.md`),
  `# 入口链探针留档（${stamp}）\n\n真值：本仓不设仓级 queue 当前项\n\n## 模型作答原文\n\n${transcript}\n\n## 判定\n\n${verdict.map(([l, ok]) => `- ${ok ? 'PASS' : 'FAIL'} ${l}`).join('\n')}\n`);
console.log(failed === 0
  ? `\nprobe: ALL PASS（答案与入口链一致；留档 runtime/smoke-workspace/entry-chain-probe-${stamp}.md 供人工复核）`
  : `\nprobe: ${failed} FAILURE(S)——机械断言只证结构，语义复核看留档`);
process.exit(failed === 0 ? 0 : 1);
