// bundle-sessions.mjs —— run bundle → 见证会话反查（keyless 纯函数面）。
//
// 为什么存在（2026-10-27 卫生轮 维度6）：诊断入口（session-events / stream-diagnostics /
// watch-run / session-replay）全部以会话 id 或标题起手，而 run bundle 侧**从不记录会话 id**
// ——旧回执只有 `sessions: "$DSH_HOME/sessions"` 一个根。于是"哪场 run 坏了"→"该点哪个会话"
// 这一步没有入口，agent 只能按 mtime 猜（多 run 并存时串场），或自己写 node -e 解 zstd 再
// 文本匹配。本模块把那条谓词（绑定 = 会话日志里出现指向 `drt_<slug>/` 的路径）暴露成可复算
// 的纯函数；CLI 壳 = scripts/run-ops/bundle-sessions.mjs。
//
// 判据正本 = node-gate-session-gates 的 scanWitnessLogs（门①②共用的同一条绑定谓词），
// 本模块只做聚合，不另立第二套绑定语义（两套判据会漂移）。
import { scanWitnessLogs } from './node-gate-session-gates.mjs'

/**
 * 扫会话语料，找出绑定某 bundle 的会话。
 * @param {string} sessionsRoot 会话根（`$DSH_HOME/sessions`）。
 * @param {string} slug bundle 名（`drt_<slug>` 或裸 slug 都收）。
 * @param {object} [opts] 透传 scanWitnessLogs（readLog / contract）。
 * @returns {{slug:string, logs:number, sessions:Array<{sessionId:string, group:string|null, presented:number}>}}
 *          sessions 按 present 条数降序；presented=0 表示只是写过/读过该 bundle（非交付见证）。
 */
export function sessionsOfBundle(sessionsRoot, slug, opts = {}) {
  const scan = scanWitnessLogs(sessionsRoot, slug, opts)
  const byId = new Map()
  for (const entry of scan.boundSessions ?? []) {
    if (typeof entry?.sessionId !== 'string') continue
    if (!byId.has(entry.sessionId)) byId.set(entry.sessionId, { sessionId: entry.sessionId, group: entry.group ?? null, presented: 0 })
  }
  for (const event of scan.presented ?? []) {
    if (typeof event?.sessionId !== 'string') continue
    const cur = byId.get(event.sessionId) ?? { sessionId: event.sessionId, group: null, presented: 0 }
    cur.presented += 1
    byId.set(event.sessionId, cur)
  }
  const sessions = [...byId.values()]
    .sort((a, b) => (b.presented - a.presented) || a.sessionId.localeCompare(b.sessionId))
  return { slug: String(slug ?? '').replace(/^drt_/, ''), logs: scan.logs, sessions }
}
