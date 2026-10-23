#!/usr/bin/env node
// rerun-triage-probe.mjs — 不满转接的**模型行为**探针（真模型档，需 DEEPSEEK_API_KEY）。
// 服务设计卡 2026-10-23-rerun-dissatisfaction-triage §8 第 6 行：给一句「太浅」，Lead 必须
// （a）复述不满；（b）≤2 个手段；（c）说清代价与版本后果；（d）未确认前不动手；（e）指出范围
// 来自报告末节。五条全中才 PASS。
//
// 为什么是探针不是单测：词表是模型侧程序（skill），机械面只能钉文本同源与出口文案；模型是否
// 真按它回话，只能真跑一次。探针不证明长尾说法不误判——那是人读（卡 §8 第 6 行人判）。
//
// 前置：source dev/env.sh（DSH_HOME + 凭据 + vendor 树）。用法：
//   node scripts/probe/rerun-triage-probe.mjs [--port 3118]
// 退出码：0 = 五条全中；1 = 有断言未中；2 = 前置缺席（未跑 ≠ 通过）。
import { requireCredentials, withModelKey } from '../lib/env.mjs';
import { authenticate, bootWeb, makeRpc } from '../lib/web-harness.mjs';
import { readSessionText, resolveSessionLog } from '../lib/session-log.mjs';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const PORT = Number(arg('port', '3118'));
const BOOT_TIMEOUT_MS = 180_000;
const TURN_TIMEOUT_MS = 240_000;
const POLL_MS = 3_000;

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
if (!home) { console.error('probe: 需要 DSH_HOME（先 source dev/env.sh）'); process.exit(2); }
requireCredentials('rerun-triage-probe', { home });
const bin = join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts');
const overlay = join(ROOT, 'dev', 'research.overlay.yml');
if (!existsSync(bin)) { console.error(`probe: 机制基线不在位（${bin}）——git submodule update --init`); process.exit(2); }
if (!existsSync(overlay)) { console.error(`probe: overlay 不在位（${overlay}）——node dev/render-overlay.mjs`); process.exit(2); }

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms) });
let failures = 0;
const pass = (m) => console.log(`  PASS ${m}`);
const fail = (m) => { failures += 1; console.log(`  FAIL ${m}`); };

// ── 临时研究工作区：pack 种子 + 一份已交付的 probe bundle ─────────────────────
const WS = join(ROOT, 'runtime', 'smoke-workspace', 'rerun-triage-probe-ws');
rmSync(WS, { recursive: true, force: true });
mkdirSync(WS, { recursive: true });
{
  const SEED = join(ROOT, 'packages', 'deep-research-pack', 'workspace');
  const walk = (dir, rel = '') => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const src = join(dir, ent.name);
      const r = rel === '' ? ent.name : join(rel, ent.name);
      if (ent.isDirectory()) { walk(src, r); continue; }
      if (!ent.name.endsWith('.md')) continue;
      const dst = join(WS, r);
      mkdirSync(dirname(dst), { recursive: true });
      writeFileSync(dst, readFileSync(src));
    }
  };
  walk(SEED);
}
const B = join(WS, 'drt_probe');
mkdirSync(join(B, 'final'), { recursive: true });
mkdirSync(join(B, 'evidence'), { recursive: true });
writeFileSync(join(B, 'run.md'), '# Run — drt_probe\n\n- contract: 2026-10-23\n- phase: accepted\n- next: none\n- delivered: v1 @ 2026-10-23T10:00:00Z · by lead · present p1\n- parked: none\n');
writeFileSync(join(B, 'question.md'), '# 问题\n\nAI 训练芯片的国产替代进度如何？\n\n## Decisions\n\n- 2026-10-23 HITL2 按现稿定稿\n');
writeFileSync(join(B, 'topics.md'), '# Topics\n\n- T1 国产训练芯片（primary）\n');
writeFileSync(join(B, 'findings.md'), '# Findings\n\n- F1 国产训练芯片在 2026 年已进入规模出货（supported）\n');
writeFileSync(join(B, 'review.md'), '# Review\n\n## readiness（终局）: PASS\n');
writeFileSync(join(B, 'journal.md'), '# Journal\n\n- 2026-10-23 交付 v1。\n');
writeFileSync(join(B, 'evidence', 'ev-1.md'), '---\nsource_url: https://example.com/a\nretrieved_at: 2026-10-20\nquality: A\nfound_by: analyst\nsupports: T1\nsource_tier: primary\npublisher: example.com\n---\n\n## 原文摘录\n\n> 国产训练芯片 2026 年出货量较去年增长 40%。\n\n## 解读\n\n规模出货成立。\n');
writeFileSync(join(B, 'final.md'), [
  '# 国产训练芯片进度', '', '## 决策摘要', '',
  '国产训练芯片在 2026 年已进入规模出货，但关键第三方口径只覆盖头部两家。', '',
  '## 下一版优先项', '',
  '1. 补 IDC 口径的原始页（当前只有二手转引，关键数字缺一手来源）',
  '2. 补二线厂商的出货量', '',
  '## 什么会改变建议', '',
  '若头部两家的官方出货指引下修 ≥20%，规模出货的判断不成立。', '',
].join('\n'));
writeFileSync(join(B, 'final', 'v1.md'), readFileSync(join(B, 'final.md')));

const PROMPT = `用户看完你交付的 drt_probe 报告后，只说了一句：

「这份太浅了，关键数字都没有。」

请按你的 rerun 纪律回应（**不要写任何文件、不要派工、不要 rerun**）。要求：
1. 先用一句话复述你听到的不满；
2. 给出不超过两个可选手段，并写清各自的代价与版本后果；
3. 说明补研究该补哪块、范围从哪里来。`;

const main = async () => {
  console.log('rerun-triage-probe: 真模型档（cwd = 临时研究工作区，preset = lead）');
  const b = await bootWeb({
    bin, cwd: WS, profile: 'web', patchPath: overlay, port: PORT,
    env: withModelKey({ DSH_HOME: home }), timeoutMs: BOOT_TIMEOUT_MS, tailChars: 800, detached: false,
  });
  const base = `http://127.0.0.1:${String(PORT)}`;
  const cookie = await authenticate(base, b.token);
  const rpc = makeRpc({
    prefix: 'rt-',
    errorOf: (endpoint, body) => `${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`,
  });
  const created = await rpc(base, cookie, 'session/create', { request: { cwd: WS, agentPreset: 'lead' } });
  const sessionId = created?.id ?? created?.sessionId;
  if (typeof sessionId !== 'string') throw new Error(`无会话 id：${JSON.stringify(created).slice(0, 200)}`);
  await rpc(base, cookie, 'session/prompt', {
    request: { requestId: randomUUID(), sessionId, mode: 'queue', content: [{ type: 'text', text: PROMPT }] },
  });

  // 会话目录/日志在 create 之后异步落盘：按两种目录形态有界等待（不猜固定 sleep 时长）。
  const sessionDirOf = (id) => {
    const root = join(home, 'sessions');
    for (const form of [`session-${id}`, id]) {
      for (const ws of readdirSync(root)) {
        const dir = join(root, ws, form);
        if (existsSync(dir)) return dir;
      }
    }
    return null;
  };
  const deadline = Date.now() + TURN_TIMEOUT_MS;
  let logPath = null;
  while (Date.now() < deadline && logPath === null) {
    const dir = sessionDirOf(sessionId);
    if (dir !== null) logPath = resolveSessionLog(dir);
    if (logPath === null) await sleep(500);
  }
  if (logPath === null) throw new Error('会话日志不在场（超时）');
  let log = '';
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    log = readSessionText(logPath) ?? '';
    if (log.includes('"turn/end"') && log.includes('"assistant/message"')) break;
  }
  const texts = [];
  const forbidden = [];
  const FORBIDDEN = new Set(['write', 'edit', 'multiedit', 'spawn_teammate', 'team_task_create', 'team_task_update', 'subagent']);
  for (const line of log.split('\n')) {
    if (line.includes('"tool/call"')) {
      try {
        const e = JSON.parse(line);
        if (FORBIDDEN.has(e?.data?.name)) forbidden.push(e.data.name);
      } catch { /* 畸形行跳过 */ }
    }
    if (!line.includes('"assistant/message"')) continue;
    try {
      for (const blk of JSON.parse(line).data?.message?.content ?? []) {
        if (blk.type === 'text' && typeof blk.text === 'string') texts.push(blk.text);
      }
    } catch { /* 畸形行跳过 */ }
  }
  const text = texts.join('\n');
  if (text.trim() === '') fail(`等答案超时（${TURN_TIMEOUT_MS}ms 内无 assistant 文本）`);
  else {
    // (a) 复述不满：必须点名"太浅/深度/证据不够"这一侧，而不是复述成"方向不对"
    // 复述允许同义转写（实测一轮："证据不足，不是方向错误"）——判"是否落在深度/证据侧"，
    // 不要求逐字复述用户原话。
    const restated = /太浅|深度不够|不够深|证据不足|证据不够|数字.{0,8}不够|口径.{0,8}不够/.test(text);
    if (restated) pass('(a) 复述了用户的不满（深度/证据侧）');
    else fail(`(a) 没有复述用户不满：${text.slice(0, 140)}`);

    // (b) ≤2 个手段（补研究 / 改说法 / 另起 / 结构性 steer 记作不同手段）
    // 手段按语义组计（技术别名算同一手段：改说法 = 表述修订/修订表述；另起 = 结构性重跑）。
    const methodGroups = [
      [/补研究|证据扩张/, '补研究'],
      [/改说法|表述修订|修订表述/, '改说法'],
      [/另起|结构性/, '另起'],
      [/steer/i, 'steer'],
    ];
    const methods = methodGroups.filter(([re]) => re.test(text)).map(([, name]) => name);
    if (methods.length <= 2 && methods.length >= 1) pass(`(b) 手段数 ${methods.length}（≤2）：${methods.join('、')}`);
    else fail(`(b) 手段数 ${methods.length}（应 1–2）：${methods.join('、')}`);

    // (c) 代价与版本后果
    const consequence = /版本|vN\+?1|出新版本|新 run|成本/.test(text);
    if (consequence) pass('(c) 说清了代价/版本后果');
    else fail(`(c) 没说代价与版本后果：${text.slice(0, 140)}`);

    // (d) 未确认前不动手（除读/skill/ask 之外的写类调用 = 违约）
    if (forbidden.length === 0) pass('(d) 未在用户确认前动手（无写/派工/rerun 调用）');
    else fail(`(d) 确认前动手：${[...new Set(forbidden)].join(',')}`);

    // (e) 范围来自报告末节
    const scoped = /末节|下一版优先项|第\s*1\s*条|IDC|一手来源/.test(text);
    if (scoped) pass('(e) 补研究范围指到报告末节/具体项');
    else fail(`(e) 没指出范围来源：${text.slice(0, 160)}`);
  }

  console.log('');
  console.log(failures === 0 ? 'rerun-triage-probe: ALL PASS' : `rerun-triage-probe: ${failures} 处失败`);
  console.log(text ? `\n—— 模型原答（留档复核）——\n${text}` : '');
  await b.stop?.();
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((e) => { console.error('rerun-triage-probe: 异常', e); process.exit(1); });
