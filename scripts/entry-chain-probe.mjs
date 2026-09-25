#!/usr/bin/env node
// entry-chain-probe.mjs — 入口链探针（真模型档，需 DEEPSEEK_API_KEY）。
// RFC：notes/proposed/2026-09-24-entry-chain-probe.md · 语义版已人工两跑（2026-09-24，
// 见 implemented Note），本脚本 = 脚本化 + 制度化（每 feature 条目收尾跑）。
//
// 设计（时不变原则——company 探针已知盲区：问句期望也会过期，问法必须换任何 ▶ 条目都不变）：
//   1. 全新默认 preset 会话（无研究 pack 上下文污染），cwd = 仓根；
//   2. prompt 指令只按根 AGENTS.md §入口链 读五步指定文件，答四个时不变问题；
//   3. 脚本自己从 roadmap.md 抽真值（▶ 条目主题 / 下一条目主题），软断言答案命中
//      （token 重叠），全文留档 dev/smoke-workspace/ 供人工复核——机械断言只证结构
//      不证语义（SDLC reference 01 同款诚实记账）；
//   4. 会话日志即真相：assistant/message 事件里找答案文本（不是用户消息回显）。
//
// 前置：source dev/env.sh（DSH_HOME + 凭据）；DSH_SRC 默认本仓根（vendor/dsh）。
// 用法：source dev/env.sh && node scripts/entry-chain-probe.mjs [--port 3102]
import { spawn, spawnSync } from 'node:child_process';
import { withModelKey } from './lib/env.mjs';
import { randomUUID } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as zlib from 'node:zlib';
import { assertVendorArtifacts, ARTIFACT_REMEDY } from './lib/vendor-artifacts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const PORT = Number(arg('port', '3102'));
const BOOT_TIMEOUT_MS = 120_000;
const TURN_TIMEOUT_MS = 180_000;
const POLL_MS = 3_000;
const OUT = join(ROOT, 'dev', 'smoke-workspace');

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
if (!home) { console.error('probe: 需要 DSH_HOME（先 source dev/env.sh）'); process.exit(2); }
if (!existsSync(join(home, '.credentials.yaml'))) {
  console.error('probe: dev home 无凭据文件——先配置 DEEPREEK/DEEPSEEK_API_KEY（.credentials.yaml）');
  process.exit(2);
}
const dshSrc = process.env.DSH_SRC ?? ROOT; // 本仓根 = 安装锚（vendor/dsh submodule）
const bin = join(dshSrc, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts');
if (!existsSync(bin)) { console.error(`probe: 机制基线不在位（${bin}）——git submodule update --init`); process.exit(2); }

// ── 真值抽取（从 roadmap.md 机械读出，不问模型）──────────────────────────────
function groundTruth() {
  const roadmap = readFileSync(join(ROOT, 'roadmap.md'), 'utf8');
  const lines = roadmap.split('\n');
  const s = lines.findIndex((l) => /^## 队列/.test(l));
  if (s === -1) throw new Error('roadmap §队列 缺席');
  const queue = [];
  for (let i = s + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) break;
    const m = /^(\d+)\.\s+(?:▶\s+)?\*\*(.+?)\*\*/.exec(lines[i]);
    if (m) queue.push({ n: Number(m[1]), theme: m[2] });
  }
  const cur = queue.find((q) => roadmap.split('\n').some((l) => l.includes(`\u25b6 **${q.theme}**`)));
  if (cur === undefined) throw new Error('找不到 ▶ 当前条目');
  const next = queue.find((q) => q.n > cur.n);
  return { cur: cur.theme, next: next?.theme ?? null };
}

// 主题命中（软断言）：主题切成 ≥2 字 token，答案命中 ≥2 个即认——中文无空格，取滑窗 bigram。
const bigrams = (s) => {
  const t = s.replace(/[（(].*?[)）]/g, '').replace(/\s+/g, '');
  const out = new Set();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return [...out];
};
const hitCount = (answer, theme) => {
  const grams = bigrams(theme);
  if (!grams.length) return 0;
  return grams.filter((g) => answer.includes(g)).length;
};

// ── DSH 会话面（照抄 l4-lite 实证骨架）──────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let rpcId = 0;
// RPC 协议照抄 l4-lite 实证：/api/<method> + client-request 包裹 + result.ok/value
const rpc = async (base, cookie, endpoint, args) => {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `probe-${++rpcId}`, method: endpoint, payload: { args } }),
  });
  const body = await response.json();
  if (body?.result?.ok !== true) {
    throw new Error(`${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`);
  }
  return body.result.value;
};

const boot = async () => {
  const child = spawn(process.execPath,
    ['--import', 'tsx/esm', bin, '--profile', 'web', '--', '--port', String(PORT), '--no-open'],
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

// 会话日志读取：zstd 多帧切段解压（node:zlib 单帧 API；DSH 日志 = 逐次 append 帧拼接，
// debug-dashboard-plus 实证 357 帧/639 行）。按 session id 扫描定位，不猜 cwd 编码。
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
const decompressLog = (buf) => {
  const dec = typeof zlib.zstdDecompressSync === 'function' ? zlib.zstdDecompressSync : null;
  if (!dec) return '';
  const idxs = [];
  for (let i = 0; i <= buf.length - 4; i++) {
    if (buf[i] === 0x28 && buf[i + 1] === 0xb5 && buf[i + 2] === 0x2f && buf[i + 3] === 0xfd) idxs.push(i);
  }
  if (!idxs.length || idxs[0] !== 0) return '';
  const parts = [];
  for (let k = 0; k < idxs.length; k++) {
    try { parts.push(dec(buf.subarray(idxs[k], idxs[k + 1] ?? buf.length))); } catch { /* 坏段跳过 */ }
  }
  return Buffer.concat(parts).toString('utf8');
};
const readSessionLog = (sessionId) => {
  const dir = sessionDirOf(sessionId);
  if (dir === null) return '';
  const file = readdirSync(dir).find((f) => f.endsWith('.jsonl.zstd') || f.endsWith('.jsonl'));
  if (file === undefined) return '';
  const p = join(dir, file);
  if (!file.endsWith('.zstd')) return readFileSync(p, 'utf8');
  try { return decompressLog(readFileSync(p)); } catch { return ''; }
};

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
    if ((last.match(/^Q[1-4]:/gm) ?? []).length >= 4) return last;
    // 挂起等待人类（探针会话不该发生）：发现 open ask 即失败
    if (log.split('\n').at(-1)?.includes('"ask_user_question"')) throw new Error('模型反问人类——探针问题必须自足');
  }
  throw new Error(`等答案超时（最后文本片段：${last.slice(-200) || '无'}）`);
};

// ── 主流程 ───────────────────────────────────────────────────────────────────
const PROMPT = `你是入口链探针（一次只读审计）。请严格按本仓根目录 AGENTS.md 文件里「入口链」一节定义的顺序，把五步指定的文件全部读完（除此之外不要读任何其他文件，也不要用搜索工具），然后回答以下四个问题。每问恰好一行，格式必须是「Q<n>: <一句话答案>」：

Q1: 按入口链的指引，现在这个仓库应该做什么工作？引用条目的主题名。
Q2: Q1 的结论来自入口链的第几步、哪个文件？
Q3: roadmap 队列里，排在当前条目之后的下一个条目主题是什么？
Q4: 入口链规定开工与收尾的程序在哪个文件？`;

const gt = groundTruth();
console.log(`probe: 真值（机械抽取）——▶ 当前 = ${gt.cur}${gt.next ? `；下一条目 = ${gt.next}` : '（无）'}`);
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
  const cookie = await authenticate(token);
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
  const q3 = /^Q3:(.+)$/m.exec(answer)?.[1] ?? '';
  const q4 = /^Q4:(.+)$/m.exec(answer)?.[1] ?? '';
  const hits1 = hitCount(q1, gt.cur);
  const grams1 = bigrams(gt.cur).length;
  verdict.push([`Q1 命中当前条目「${gt.cur}」（bigram ${hits1}/${grams1}）`, hits1 >= Math.min(2, grams1)]);
  verdict.push([`Q2 指认入口链步骤/文件（含 roadmap 或队列字样或 AGENTS）`, /roadmap|队列|AGENTS|入口链/i.test(answer)]);
  if (gt.next) {
    const hits3 = hitCount(q3, gt.next);
    const grams3 = bigrams(gt.next).length;
    verdict.push([`Q3 命中下一条目「${gt.next}」（bigram ${hits3}/${grams3}）`, hits3 >= Math.min(2, grams3)]);
  }
  verdict.push([`Q4 指认 guides/60（开发环）`, /60|开发环|guides/i.test(q4)]);
} finally {
  child.kill('SIGTERM');
  await sleep(300);
}

for (const [label, ok] of verdict) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`);
const failed = verdict.filter(([, ok]) => !ok).length;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(join(OUT, `entry-chain-probe-${stamp}.md`),
  `# 入口链探针留档（${stamp}）\n\n真值：▶ ${gt.cur}；下一条目：${gt.next ?? '无'}\n\n## 模型作答原文\n\n${transcript}\n\n## 判定\n\n${verdict.map(([l, ok]) => `- ${ok ? 'PASS' : 'FAIL'} ${l}`).join('\n')}\n`);
console.log(failed === 0
  ? `\nprobe: ALL PASS（答案与入口链一致；留档 dev/smoke-workspace/entry-chain-probe-${stamp}.md 供人工复核）`
  : `\nprobe: ${failed} FAILURE(S)——机械断言只证结构，语义复核看留档`);
process.exit(failed === 0 ? 0 : 1);
