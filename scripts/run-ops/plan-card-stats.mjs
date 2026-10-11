#!/usr/bin/env node
// plan-card-stats —— HITL1「计划确认卡」字数的**跨场分布投影**（只读；run-ops 层）。
//
// 为什么存在：node-gate 门① 只判**单场**（该 bundle 的计划卡超限 → WARN 记账）。而 ①-c 的
// **升硬门前置**是「措辞收紧后连续 ≥3 场 ≤200 字达标」——判定这个条件必须**跨场聚合**：一场一场
// 看 node-gate 的输出数不出"连续几场"。本工具即那件可复跑的仪器（原先只有一次性运行态脚本，
// 结果记在卡上而仪器不留，等于条件不可判定）。
//
// 口径与识别**不在这里**：`scripts/lib/plan-card.mjs` 是唯一语义源（与门① 同源消费）——本件只做
// 扫描、聚合与呈现。判据语义（严重级 = WARN、升格条件）= notes/implemented/2026-10-11-plan-card-length-warn.md。
//
// 用法：source dev/env.sh && node scripts/run-ops/plan-card-stats.mjs [--days 30] [--group <子串>] [--json]
// 退出码：0 = 正常输出（超限与否不是本工具的判据）/ 2 = 用法或前置错（未 source dev/env.sh）
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSessionText, resolveSessionLog } from '../lib/session-log.mjs';
import { planCardsOf, PLAN_CARD_LIMIT } from '../lib/plan-card.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const DAYS = Number(arg('days', '30'));
const GROUP = arg('group', 'research-workspace');
const JSON_OUT = process.argv.includes('--json');

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
if (home === null) {
  console.error('plan-card-stats: 未 source dev/env.sh（DSH_HOME 缺席）——先 source 再跑');
  process.exit(2);
}
const sessionsRoot = join(home, 'sessions');
const cutoff = Date.now() - DAYS * 86400 * 1000;

const rows = [];
const unreadable = [];
let scanned = 0;
for (const group of readdirSync(sessionsRoot)) {
  if (!group.includes(GROUP)) continue;
  for (const sid of readdirSync(join(sessionsRoot, group))) {
    const dir = join(sessionsRoot, group, sid);
    const log = resolveSessionLog(dir);
    if (log === null) continue;
    const mtime = statSync(log).mtimeMs;
    if (mtime < cutoff) continue;
    scanned++;
    const text = readSessionText(log);
    // 不可读 ≠ 空语料：坏帧显式记档（偏"数据缺失"方向，不静默当 0 张卡）
    if (text === null) { unreadable.push(sid); continue; }
    for (const card of planCardsOf(text)) {
      rows.push({ ...card, session: sid, when: new Date(mtime).toISOString().slice(0, 10) });
    }
  }
}
rows.sort((a, b) => b.questionChars - a.questionChars);
const over = rows.filter((r) => r.overLimit);
const compliant = rows.length - over.length;
const lens = rows.map((r) => r.questionChars).sort((a, b) => a - b);
const median = lens.length === 0 ? null : lens[Math.floor(lens.length / 2)];

if (JSON_OUT) {
  console.log(JSON.stringify({ root: sessionsRoot, scanned, unreadable, limit: PLAN_CARD_LIMIT, cards: rows, median }, null, 1));
} else {
  console.log(`plan-card-stats: 扫描 ${scanned} 场会话（root=${sessionsRoot}，近 ${DAYS} 天，组含 "${GROUP}"）→ 计划确认卡 ${rows.length} 张`);
  for (const r of rows) {
    console.log(`  ${String(r.questionChars).padStart(5)} 字  ${r.overLimit ? '⚠ 超限' : '  合规'}  ${r.when}  ${r.session.slice(0, 24)}  [${r.header}]`);
  }
  if (rows.length > 0) {
    console.log(`分布：min ${lens[0]} / 中位 ${median} / max ${lens[lens.length - 1]}；阈值 ≤${PLAN_CARD_LIMIT} 字 → 合规 ${compliant} / 超限 ${over.length}`);
  } else {
    console.log('（未命中计划卡：窗口内无 HITL1 第二段卡，或该组无相关会话——防空语料，显式报出而非静默 0）');
  }
  if (unreadable.length > 0) console.log(`⚠ 日志不可读 ${unreadable.length} 份（坏帧/读失败，已排除在统计外）：${unreadable.slice(0, 5).join('、')}`);
  console.log('判据语义：超限 = WARN（不拦交付）；升硬门前置 = 措辞收紧后**连续 ≥3 场** ≤200 字达标'
    + '——本表按场次顺序复核该前置（口径与识别 = scripts/lib/plan-card.mjs，与 node-gate 门① 同源）。');
}
process.exit(0);
