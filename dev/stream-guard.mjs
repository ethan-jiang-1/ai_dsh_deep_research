#!/usr/bin/env node
// stream-guard —— 上游流畸形窗口的自动恢复守卫（BUG-023 候选③的 ops 落地）。
//
// 背景：上游 DeepSeek 流畸形（event precedes message_start）呈持续窗口（实测 ≥2h、48 次/时），
// 有界重试（5 连）打不穿 → 回合死亡。D17 语义下 lead 只凭 bundle 即可恢复——死亡后等一段
// 时间再发「继续」，lead 从档案接着跑，直到窗口过去。本守卫自动做这件事：
//
//   watch:   读目标会话日志 → streamFailureOf 折算（pack lib 同源）；
//   resume:  死亡且冷却期满 → session/prompt 注入「继续」（queue 模式，复用 run-kickoff 语义）；
//   上限：   --max 次恢复后放弃（防无限风暴烧 token），退出码 1 = 未恢复放弃，0 = 已恢复/无需恢复。
//
// 用法：
//   node dev/stream-guard.mjs --token <t> --session <会话标题子串或 id> [--port 3083]
//                             [--interval 300] [--max 6] [--once]
// --once = 单次检查（不给 --token 则只打印判定，供冒烟/巡检）。
import { readSessionEvents, resolveSessionLog } from '../scripts/lib/session-log.mjs';
import { streamFailureOf } from '../packages/deep-research-pack/src/lib/stream-failure.ts';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const flag = (name, fb) => { const i = process.argv.indexOf(name); return i === -1 ? fb : process.argv[i + 1]; };
const has = (name) => process.argv.includes(name);
const PORT = flag('--port', '3083');
const SESSION = flag('--session', null);
const INTERVAL = Number(flag('--interval', '300')) * 1000;
const MAX = Number(flag('--max', '6'));
const ONCE = has('--once');
const TOKEN = flag('--token', null);
if (SESSION === null) { console.error('stream-guard: --session 必填（标题子串或 session id）'); process.exit(2); }

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(ROOT, 'runtime/harness-home');
const sessionsRoot = join(home, 'sessions');
const findSessionDir = () => {
  for (const g of readdirSync(sessionsRoot)) {
    const gd = join(sessionsRoot, g);
    let dirs; try { dirs = readdirSync(gd) } catch { continue }
    for (const d of dirs) {
      if (!d.includes(SESSION) && SESSION.length < 8) continue;
      const lp = (() => { try { return resolveSessionLog(join(gd, d)) } catch { return null } })();
      if (!lp) continue;
      try {
        const { readable, events } = readSessionEvents(lp);
        if (!readable) continue;
        const title = events.filter((e) => e?.type === 'session/title').at(-1)?.data?.title ?? '';
        if (d.includes(SESSION) || title.includes(SESSION)) return { dir: join(gd, d), logPath: lp, title };
      } catch { /* 缺席日志跳过 */ }
    }
  }
  return null;
};
const readDead = (logPath) => {
  const { readable, events } = readSessionEvents(logPath);
  if (!readable) return { dead: false, readable: false };
  return { ...streamFailureOf(events), readable: true, events };
};

const cookieOf = async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/?token=${TOKEN}`, { redirect: 'manual' });
  return res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
};
const steer = async (cookie, sessionId, text) => {
  const res = await fetch(`http://127.0.0.1:${PORT}/api/session/prompt`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `guard-${randomUUID()}`, method: 'session/prompt', payload: { args: { request: { requestId: randomUUID(), sessionId, mode: 'queue', content: [{ type: 'text', text }] } } } }),
  });
  const body = await res.json();
  return body?.result?.ok === true;
};

let recovered = false;
for (let round = 0; round <= MAX; round++) {
  const found = findSessionDir();
  if (found === null) { console.log(`stream-guard: 找不到会话 ${SESSION}`); process.exit(2); }
  const state = readDead(found.logPath);
  if (!state.dead) {
    console.log(`stream-guard: 会话「${found.title}」${state.readable ? '已恢复/存活' : '日志不可读'}——${round > 0 ? `经 ${round} 次自动恢复` : '无需恢复'}`);
    recovered = round > 0;
    break;
  }
  if (round === MAX) { console.log(`stream-guard: ${MAX} 次恢复后仍死亡——放弃（上游窗口过长），横幅指引仍在`); process.exit(1); }
  console.log(`stream-guard: 检测到流畸形死亡（seq 尾窗）——${Math.round(INTERVAL / 1000)}s 后第 ${round + 1}/${MAX} 次注入「继续」`);
  if (!ONCE) {
    await new Promise((r) => setTimeout(r, INTERVAL));
    if (TOKEN !== null) {
      const cookie = await cookieOf();
      const sid = found.dir.split('/').at(-1);
      const ok = await steer(cookie, sid, '继续');
      console.log(`stream-guard: 注入${ok ? '成功' : '失败'}（session/${sid.slice(8, 16)}）`);
    }
  }
  if (ONCE) { console.log('stream-guard: --once 单次检查完毕'); process.exit(state.dead ? 1 : 0); }
}
process.exit(recovered || !recovered ? 0 : 0);
