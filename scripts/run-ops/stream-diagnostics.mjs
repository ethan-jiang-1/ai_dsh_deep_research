#!/usr/bin/env node
// stream-diagnostics —— 流失败归因诊断（"把诊断埋进去"的落点；run-ops 观察工具）。
//
// 一条命令回答三个问题：①模型尝试时间线（成功/失败/码/间隔）；②失败密度与分布；
// ③重试策略与 provider 实名（策略串来自 llm/retry 事件）。
//
// 用法：
//   node scripts/run-ops/stream-diagnostics.mjs --session <id|标题子串>
//   node scripts/run-ops/stream-diagnostics.mjs --recent 3        # 最近 3 个有模型活动的会话
//   追加 --json 输出机器可读结果。
import { readSessionEvents, resolveSessionLog } from '../lib/session-log.mjs';
import { analyzeModelAttempts, selectRecentActiveSessions } from '../lib/stream-diagnostics-core.mjs';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const flag = (n, fb) => { const i = process.argv.indexOf(n); return i === -1 ? fb : process.argv[i + 1] };
const HOME = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(ROOT, 'runtime', 'harness-home');
const JSON_OUT = process.argv.includes('--json');

const sessionsOf = () => {
  const out = [];
  const root = join(HOME, 'sessions');
  if (!existsSync(root)) return out;
  for (const g of readdirSync(root)) {
    const gd = join(root, g);
    let dirs; try { dirs = readdirSync(gd) } catch { continue }
    for (const d of dirs) {
      let lp = null; try { lp = resolveSessionLog(join(gd, d)) } catch { /* 跳过 */ }
      if (lp === null) continue;
      let m = 0; try { m = statSync(lp).mtimeMs } catch { continue }
      out.push({ id: d, logPath: lp, mtime: m });
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
};

const analyze = (entry) => {
  let events;
  if (Array.isArray(entry.events)) events = entry.events;
  else {
    try { const r = readSessionEvents(entry.logPath); if (!r.readable) return null; events = r.events } catch { return null }
  }
  const title = (events.filter((e) => e?.type === 'session/title').at(-1)?.data?.title ?? entry.id).slice(0, 40);
  const { attempts, fails, firstFail, lastFail, spanMin, ratePerMin, gaps, endState } = analyzeModelAttempts(events);
  let policyKey = null; let provider = null; const retryDelays = [];
  let lastRetryAt = null;
  for (const e of events) {
    if (e?.type === 'llm/retry') {
      provider = e?.data?.provider ?? provider;
      policyKey = e?.data?.policyKey ?? policyKey;
      if (lastRetryAt !== null && e.time !== undefined) retryDelays.push(e.time - lastRetryAt);
      lastRetryAt = e.time ?? null;
    }
  }
  // 搜索过程视角：工具调用计数 + 检索查询/抓取 URL（"这个话题到底搜了什么"）
  const toolCalls = {}; const queries = []; const urls = []
  for (const e of events) {
    if (e?.type !== 'tool/call') continue
    const name = e?.data?.name ?? 'unknown'
    toolCalls[name] = (toolCalls[name] ?? 0) + 1
    let args = null; try { args = JSON.parse(e?.data?.arguments ?? '{}') } catch { /* 参数非 JSON */ }
    if (name === 'web_search' && args !== null) {
      const qs = Array.isArray(args.queries) ? args.queries : (typeof args.query === 'string' ? [args.query] : [])
      for (const q of qs) queries.push(String(q).slice(0, 60))
    }
    if (name === 'web_fetch' && args !== null && typeof (args.url ?? args.urls) !== 'undefined') {
      const u = args.url ?? args.urls
      for (const one of (Array.isArray(u) ? u : [u])) urls.push(String(one).slice(0, 70))
    }
  }
  return { id: entry.id, title, attempts, fails, firstFail, lastFail, spanMin, ratePerMin, gaps, provider, policyKey, toolCalls, queries: queries.slice(-6), urls: urls.slice(-4), endState };
};

const wanted = flag('--session', null);
const recent = Number(flag('--recent', '0'));
let targets;
if (wanted !== null) {
  const all = sessionsOf();
  targets = all.filter(({ id, logPath }) => {
    if (id.includes(wanted)) return true;
    try { const { readable, events } = readSessionEvents(logPath); if (!readable) return false; return (events.filter((e) => e?.type === 'session/title').at(-1)?.data?.title ?? '').includes(wanted) } catch { return false }
  }).slice(0, 3);
} else {
  const candidates = selectRecentActiveSessions(sessionsOf(), Math.max(1, recent), (path) => readSessionEvents(path));
  targets = candidates;
}
const reports = targets.map(analyze).filter((r) => r !== null);
if (JSON_OUT) { console.log(JSON.stringify({ reports }, null, 1)); process.exit(0) }
console.log('# 流失败诊断\n');
for (const r of reports) {
  console.log(`## ${r.title}（${r.id.slice(0, 18)}…）`);
  console.log(`- 模型尝试 ${r.attempts.length} 次，失败 ${r.fails} 次；终态 = ${r.endState}`);
  console.log(`- provider=${r.provider ?? '未知'} ｜ 重试策略=${r.policyKey === null ? '未知' : r.policyKey}`);
  console.log(`- 失败窗口：${r.firstFail === null ? '无' : `${new Date(r.firstFail.time).toISOString().slice(11, 19)} → ${new Date(r.lastFail.time).toISOString().slice(11, 19)}（${r.spanMin} 分钟，密度 ${r.ratePerMin ?? '—'}/分）`}`);
  console.log(`- 尝试间隔（秒，末 8 个）：${r.gaps.join(', ') || '—'}`);
  for (const attempt of r.attempts) {
    const time = attempt.time === null ? '时间未知' : new Date(attempt.time).toISOString().slice(11, 19);
    console.log(`  - ${time} ${attempt.status === 'success' ? '成功' : `失败${attempt.code === null ? '' : ` (${attempt.code})`}`} (turn ${attempt.turn ?? '未知'}, step ${attempt.step ?? '未知'})`);
  }
  const tc = Object.entries(r.toolCalls).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(' ')
  console.log(`- 工具调用：${tc === '' ? '无' : tc}`)
  if (r.queries.length > 0) console.log(`- 检索查询（末 ${r.queries.length} 条）：${r.queries.map((q) => `「${q}」`).join(' ')}`)
  if (r.urls.length > 0) console.log(`- 抓取 URL（末 ${r.urls.length} 条）：${r.urls.join(' ')}`)
  console.log(`- 判定：${r.ratePerMin !== null && r.ratePerMin >= 5 ? '高密度持续失败 = 链路/上游态（非瞬时抖动）' : r.fails > 0 ? '存在失败但密度不高 = 间歇性' : '无失败'}\n`);
}
