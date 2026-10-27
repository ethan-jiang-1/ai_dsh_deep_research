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

// ── 带缓存的反查（12s → 秒级；2026-10-28 Phase B）────────────────────────────────
//
// 为什么需要缓存：一次全量扫 = 逐个 `zstd -dc` 解压 2,058 个会话日志（实测 12s），而排障时
// 往往要反复问同一个 bundle。缓存粒度选**单日志**（不是整次结果）：键 = 绝对路径，值 =
// `{ mtimeMs, size, facts }`，facts = witnessFactsOfLog 的产物（绑定 slug 集 + presented 路径）。
// 判据仍是同一个 helper——缓存只跳过解压，不另立语义。
//
// 失效：mtime/size 任一变化即重扫该日志；`CACHE_VERSION` 在判据形态变化时手动 +1。
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { witnessFactsOfLog } from './node-gate-session-gates.mjs'

/** 缓存格式版本（facts 的结构或判据形态变化时 +1，旧缓存整体失效）。 */
const CACHE_VERSION = 1

/** 递归列会话日志（`*.jsonl` / `*.jsonl.zstd`）。 */
function walkLogs(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) { walkLogs(p, out); continue }
    if (/\.jsonl(\.zstd)?$/.test(ent.name)) out.push(p)
  }
  return out
}

/**
 * 带缓存的反查。语义与 `sessionsOfBundle` 相同（绑定 + present 计数），只是跳过未变日志的解压。
 * @param {string} sessionsRoot 会话根。
 * @param {string} slug bundle 名（`drt_<slug>` 或裸 slug）。
 * @param {{readLog?:(p:string)=>string, cachePath?:string, useCache?:boolean}} [opts]
 * @returns {{slug:string, logs:number, sessions:Array, cacheHits:number, cacheMisses:number}}
 */
export function sessionsOfBundleCached(sessionsRoot, slug, opts = {}) {
  const { readLog, cachePath, useCache = true, roots } = opts
  if (typeof readLog !== 'function') throw new Error('sessionsOfBundleCached 需要 readLog（解压失败策略归调用方）')
  const bare = String(slug ?? '').replace(/^drt_/, '')
  // roots 可显式限定扫描面（CLI 默认只扫 research-workspace 组——run 会话必落该组，见 --group）；
  // 不传 = 扫整根（语义与 sessionsOfBundle 一致）。
  const logs = (Array.isArray(roots) && roots.length > 0 ? roots : [sessionsRoot]).flatMap((r) => walkLogs(r))
  let cache = { version: CACHE_VERSION, logs: {} }
  if (useCache && cachePath !== undefined && existsSync(cachePath)) {
    try {
      const parsed = JSON.parse(readFileSync(cachePath, 'utf8'))
      if (parsed?.version === CACHE_VERSION && parsed.logs !== null && typeof parsed.logs === 'object') cache = parsed
    } catch { /* 坏缓存按空处理（不阻塞反查） */ }
  }
  const pathRe = new RegExp(`(?:^|/)(?:archive/|_abandoned/)?drt_${bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/final(?:/v\\d+)?\\.md$`)
  const byId = new Map()
  let cacheHits = 0
  let cacheMisses = 0
  let dirty = false
  for (const path of logs) {
    let st
    try { st = statSync(path) } catch { continue }
    const prev = cache.logs[path]
    let facts
    if (useCache && prev !== undefined && prev.mtimeMs === st.mtimeMs && prev.size === st.size) {
      facts = prev.facts
      cacheHits += 1
    } else {
      const text = readLog(path)
      facts = text ? witnessFactsOfLog(text) : null
      cache.logs[path] = { mtimeMs: st.mtimeMs, size: st.size, facts: facts ?? null }
      cacheMisses += 1
      dirty = true
    }
    if (facts === null || facts === undefined) continue
    if (!Array.isArray(facts.slugs) || !facts.slugs.includes(bare)) continue
    const sessionId = basename(dirname(path))
    const group = basename(dirname(dirname(path)))
    const presented = (facts.presented ?? []).filter((p) => pathRe.test(String(p?.path ?? ''))).length
    const cur = byId.get(sessionId) ?? { sessionId, group, presented: 0 }
    cur.presented += presented
    byId.set(sessionId, cur)
  }
  if (useCache && cachePath !== undefined && (dirty || !existsSync(cachePath))) {
    try { writeFileSync(cachePath, JSON.stringify(cache)) } catch { /* 缓存写失败不影响反查 */ }
  }
  const sessions = [...byId.values()].sort((a, b) => (b.presented - a.presented) || a.sessionId.localeCompare(b.sessionId))
  return { slug: bare, logs: logs.length, sessions, cacheHits, cacheMisses }
}
