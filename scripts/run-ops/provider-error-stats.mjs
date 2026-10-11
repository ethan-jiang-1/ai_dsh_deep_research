#!/usr/bin/env node
// provider-error-stats —— 上游流错误（回合被终结）的**跨场分布投影**（只读；run-ops 层）。
//
// 为什么存在：BUG-022 的缺陷在上游（vendor 只读、本仓修不了），本仓能做的三件里两件是"可复跑"——
// ①数它（本件）②恢复它（`dev/run-kickoff.mjs --session`）。没有本件，复发时又得从零写正则猜
// （作者第一版就把 JSON 键序写死 → 全库零命中，白查一轮）。
//
// 判据（"一次事故 = 一个被错误终结的回合"）与抽取**不在这里**：唯一语义源 =
// `scripts/lib/provider-errors.mjs`（消费方 = 本件与 keyless 契约测试）。缺陷记录 = BUG-022。
//
// 用法：source dev/env.sh && node scripts/run-ops/provider-error-stats.mjs [--days 30] [--group <子串>] [--json]
// 退出码：0 = 正常输出（有没有错不是本工具的判据）/ 2 = 用法或前置错
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSessionText, sessionLogsSince } from '../lib/session-log.mjs';
import { turnEndErrorsOf, tallyTurnEndErrors, retryEventsOf } from '../lib/provider-errors.mjs';

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
  console.error('provider-error-stats: 未 source dev/env.sh（DSH_HOME 缺席）——先 source 再跑');
  process.exit(2);
}
const sessionsRoot = join(home, 'sessions');

const perSession = [];
const unreadable = [];
const allRetries = [];
for (const { sessionId, logPath, mtimeMs } of sessionLogsSince(sessionsRoot, { days: DAYS, group: GROUP })) {
  const text = readSessionText(logPath);
  // 不可读 ≠ 无错误：坏帧显式记档（偏"数据缺失"方向，不静默当 0 次）
  if (text === null) { unreadable.push(sessionId); continue; }
  const errors = turnEndErrorsOf(text);
  const when = new Date(mtimeMs).toISOString().slice(0, 16).replace('T', ' ');
  if (errors.length > 0) perSession.push({ sessionId, when, errors });
  // 重试事件 = "缓解是否真在拦截"的直接证据（某码出现在这里 = 它被重试了）
  allRetries.push(...retryEventsOf(text).map((r) => ({ ...r, sessionId, when })));
}
const all = perSession.flatMap((s) => s.errors);
const tally = tallyTurnEndErrors(all);
const retryTally = tallyTurnEndErrors(allRetries);

if (JSON_OUT) {
  console.log(JSON.stringify({ root: sessionsRoot, sessions: perSession.length, total: all.length, tally, retries: { total: allRetries.length, tally: retryTally }, perSession, unreadable }, null, 1));
} else {
  console.log(`provider-error-stats: 近 ${DAYS} 天 · 组含 "${GROUP}" → 命中 ${perSession.length} 个会话 / ${all.length} 次「回合被错误终结」（root=${sessionsRoot}）`);
  for (const s of perSession.sort((a, b) => (a.when < b.when ? 1 : -1))) {
    console.log(`  ${s.when}  ${s.sessionId.slice(0, 26)}  错误 ${s.errors.length} 次  首因=${s.errors[0].code}`);
  }
  if (tally.length > 0) {
    console.log('终局（turn/end error；code: message → 次数）：');
    for (const t of tally) console.log(`  ×${String(t.count).padStart(3)}  ${t.key.slice(0, 110)}`);
  } else {
    console.log('（窗口内无终局命中——防空语料，显式报出而非静默 0）');
  }
  console.log(`请求重试（llm/retry）：共 ${allRetries.length} 次`);
  for (const t of retryTally) console.log(`  ×${String(t.count).padStart(3)}  ${t.key.slice(0, 110)}`);
  // 判读行：把"重试 vs 终局"两者并列，直接回答"缓解有没有在拦截"
  const retriedCodes = new Set(retryTally.map((t) => t.key.split(':')[0]));
  const terminalOnly = tally.map((t) => t.key.split(':')[0]).filter((c) => !retriedCodes.has(c));
  console.log(terminalOnly.length > 0
    ? `判读：**只有终局、从未出现重试**的码 = ${[...new Set(terminalOnly)].join('、')}——不在可重试集（或重试耗尽）`
    : '判读：窗口内每个终局码都出现过重试——没有"一次即死"的码');
  console.log('（某码出现在"请求重试"里 = 它已被拦截；这就是 MALFORMED_RESPONSE 缓解生效的判据）');
  if (unreadable.length > 0) console.log(`⚠ 日志不可读 ${unreadable.length} 份（坏帧/读失败，已排除在统计外）：${unreadable.slice(0, 5).join('、')}`);
  console.log('恢复程序与缺陷记录 = _backlog/_archived/suspended_bugs/BUG-022-provider-stream-malformed-turn-kill.md'
    + '（恢复工具 = dev/run-kickoff.mjs --session，自带送达对账）。');
}
process.exit(0);
