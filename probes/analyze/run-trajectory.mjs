#!/usr/bin/env node
// 维护面：show（只读投影/诊断/取证；不判 PASS/FAIL）。规则 = docs/policy.md
// 状态：常驻
// 一句话：多角色研究轨迹一键体检：展开 Lead→子会话树、成本总账、深研域 Smells 与 web.log 留痕关联
// 何时跑：研究 run 跑完复盘或跑中卡顿时，排查技能漏载、抓取异常、协作漂移与计数失真
// 档位：keyless（读本地会话日志或原生 /export 解压目录）
// 判据：不适用（show；不替代 run-accept 裁决）
// 不证明：交付合格与证据实质正确；只投影会话日志、bundle 盘上文件与 web.log 已有事实
// run-trajectory.mjs — 多角色研究轨迹体检 CLI 壳（只读）。
//
// 用法：
//   source tools/env.sh && node probes/analyze/run-trajectory.mjs <bundle|leadSessionId> [--web-log <path>] [--sessions <dir>] [--group <子串>] [--json]
//   node probes/analyze/run-trajectory.mjs --dir <unzipped-export-dir> [--bundle <dir>] [--web-log <path>] [--json]
// 退出码：0 = 输出报告 / 2 = 入参、目标会话或目录不可读（fail-loud）。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sessionsOfBundleCached } from '../../checks/lib/analyze/bundle-sessions.mjs'
import {
  analyzeTrajectory,
  discoverExplicitChildSessionIds,
  discoverReferencedSessionIds,
  formatTrajectoryReport,
  normalizeSessionId,
} from '../../checks/lib/analyze/run-trajectory-core.mjs'
import { findGroup, readSessionEvents, resolveSessionLog, sessionLogsInGroup } from '../../checks/lib/shared/session-log.mjs'
import { defaultGroupSubstring } from '../../checks/lib/shared/workspace-root.mjs'
import { readZstdText } from '../../checks/lib/shared/zstd-read.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const argv = process.argv.slice(2)
const opt = (name, fallback = undefined) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}
const flag = (name) => argv.includes(name)
const VALUE_FLAGS = new Set(['--dir', '--bundle', '--web-log', '--sessions', '--group'])
const positional = argv.find((a, idx) => !a.startsWith('--') && !VALUE_FLAGS.has(argv[idx - 1] ?? ''))

if (flag('--help') || (positional === undefined && opt('--dir') === undefined)) {
  console.error('run-trajectory: 用法 node probes/analyze/run-trajectory.mjs <bundle|leadSessionId> [--web-log <path>] [--sessions <dir>] [--group <子串>] [--json] | --dir <export-dir> [--bundle <dir>] [--json]')
  process.exit(2)
}

/** @param {string} bundleDir */
function readBundleFacts(bundleDir) {
  const evDir = join(bundleDir, 'evidence')
  const evidenceCount = existsSync(evDir)
    ? readdirSync(evDir).filter((f) => f.endsWith('.md')).length
    : null
  const reviewDir = join(bundleDir, 'review')
  let verdictCounts = null
  if (existsSync(reviewDir)) {
    const files = readdirSync(reviewDir)
      .filter((f) => /^verdicts-r\d+\.json$/.test(f))
      .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0))
    if (files.length > 0) {
      const merged = new Map()
      for (const f of files) {
        try {
          const doc = JSON.parse(readFileSync(join(reviewDir, f), 'utf8'))
          for (const v of Array.isArray(doc?.verdicts) ? doc.verdicts : []) {
            if (typeof v?.claim_id === 'string') merged.set(v.claim_id, String(v.verdict ?? ''))
          }
        } catch { /* unreadable verdict file ignored in show mode */ }
      }
      if (merged.size > 0) {
        const counts = { supported: 0, partially_supported: 0, unsupported: 0, unverifiable: 0, total: merged.size }
        for (const v of merged.values()) {
          if (v === 'supported') counts.supported += 1
          else if (v === 'partially_supported') counts.partially_supported += 1
          else if (v === 'unsupported') counts.unsupported += 1
          else counts.unverifiable += 1
        }
        verdictCounts = counts
      }
    }
  }
  return { slug: basename(bundleDir), evidenceCount, verdictCounts }
}

/** 扫描本地目录或原生 `/export` 解压目录内的所有会话日志。 */
function collectLogsInDir(dir) {
  /** @type {Array<{ sessionId: string, logPath: string }>} */
  const out = []
  const walk = (cur, depth) => {
    if (depth > 4 || !existsSync(cur)) return
    const direct = resolveSessionLog(cur)
    if (direct !== null) {
      out.push({ sessionId: basename(cur), logPath: direct })
    }
    for (const ent of readdirSync(cur, { withFileTypes: true })) {
      if (ent.isDirectory()) walk(join(cur, ent.name), depth + 1)
    }
  }
  walk(dir, 0)
  return out
}

let bundleDir = opt('--bundle') ? resolve(opt('--bundle')) : null
let rootSessionId = null
/** @type {Array<{ sessionId: string, logPath: string }>} */
let candidateLogs = []
/** @type {string[]} */
let extraCandidateIds = []
const isDirMode = opt('--dir') !== undefined

if (isDirMode) {
  const exportDir = resolve(opt('--dir'))
  if (!existsSync(exportDir) || !statSync(exportDir).isDirectory()) {
    console.error(`run-trajectory: --dir 不存在或不是目录：${exportDir}`)
    process.exit(2)
  }
  candidateLogs = collectLogsInDir(exportDir)
  if (candidateLogs.length === 0) {
    console.error(`run-trajectory: 目录内未找到可读会话日志（session.v*.jsonl[.zstd]）：${exportDir}`)
    process.exit(2)
  }
} else {
  const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(ROOT, 'runtime', 'harness-home')
  const sessionsRoot = resolve(opt('--sessions', join(home, 'sessions')))
  const groupSub = opt('--group', defaultGroupSubstring() ?? 'research-workspace')
  const group = findGroup(sessionsRoot, groupSub)
  if (group === undefined) {
    console.error(`run-trajectory: --group ${groupSub} 无命中会话组（根 ${sessionsRoot}）`)
    process.exit(2)
  }
  const groupDir = join(sessionsRoot, group)
  candidateLogs = sessionLogsInGroup(groupDir).map((e) => ({ sessionId: e.sessionId, logPath: e.logPath }))
  if (candidateLogs.length === 0) {
    console.error(`run-trajectory: 会话组无可读日志：${groupDir}`)
    process.exit(2)
  }
  const maybeDir = resolve(positional)
  if (existsSync(maybeDir) && statSync(maybeDir).isDirectory() && /^drt_/.test(basename(maybeDir))) {
    bundleDir = maybeDir
    const cachePath = join(
      process.env.DSH_RUN_STATE_DIR ?? join(ROOT, 'runtime', 'smoke-workspace'),
      'bundle-sessions-cache.json',
    )
    const bound = sessionsOfBundleCached(sessionsRoot, basename(maybeDir), {
      roots: [groupDir],
      readLog: (p) => { const r = readZstdText(p); return r.ok ? r.text : '' },
      cachePath,
      useCache: !flag('--no-cache'),
    })
    if (bound.sessions.length === 0) {
      console.error(`run-trajectory: 未找到写过 ${basename(maybeDir)} 的见证会话`)
      process.exit(2)
    }
    extraCandidateIds = bound.sessions.map((s) => normalizeSessionId(s.sessionId))
    const byId = new Map(candidateLogs.map((c) => [normalizeSessionId(c.sessionId), c]))
    // 选无 parentSession 的 Lead 根会话（优先 presented > 0 且 session-* 前缀）
    const ordered = [...bound.sessions].sort((a, b) =>
      (b.presented - a.presented) || (Number(/^session-/.test(b.sessionId)) - Number(/^session-/.test(a.sessionId))))
    for (const s of ordered) {
      const entry = byId.get(normalizeSessionId(s.sessionId))
      if (!entry) continue
      const parsed = readSessionEvents(entry.logPath)
      if (!parsed.readable) continue
      const header = parsed.events.find((e) => e.type === 'session')
      if (!header?.parentSession) {
        rootSessionId = entry.sessionId
        break
      }
    }
    rootSessionId = rootSessionId ?? ordered[0].sessionId
  } else {
    const matched = candidateLogs.find((c) => c.sessionId === positional || normalizeSessionId(c.sessionId) === normalizeSessionId(positional))
    if (matched === undefined) {
      console.error(`run-trajectory: 找不到会话 ${positional}`)
      process.exit(2)
    }
    rootSessionId = matched.sessionId
  }
}

const byNormId = new Map()
for (const entry of candidateLogs) {
  byNormId.set(normalizeSessionId(entry.sessionId), entry)
}

if (rootSessionId === null) {
  // --dir 模式：选无 parentSession 的根会话
  for (const entry of candidateLogs) {
    const parsed = readSessionEvents(entry.logPath)
    if (!parsed.readable) continue
    const header = parsed.events.find((e) => e.type === 'session')
    if (!header?.parentSession) {
      rootSessionId = entry.sessionId
      break
    }
  }
  rootSessionId = rootSessionId ?? candidateLogs[0].sessionId
}

const rootEntry = byNormId.get(normalizeSessionId(rootSessionId))
if (!rootEntry) {
  console.error(`run-trajectory: 根会话日志不存在：${rootSessionId}`)
  process.exit(2)
}
const rootParsed = readSessionEvents(rootEntry.logPath)
if (!rootParsed.readable) {
  console.error(`run-trajectory: 根会话日志不可读：${rootEntry.logPath}`)
  process.exit(2)
}

/** @type {Array<{ sessionId: string, events: any[], missing?: boolean }>} */
const treeSessions = [{ sessionId: rootEntry.sessionId, events: rootParsed.events }]
const visited = new Set([normalizeSessionId(rootEntry.sessionId)])
const queue = [rootParsed.events]
const parsedCache = new Map([[normalizeSessionId(rootEntry.sessionId), rootParsed]])

/** @param {string} normId */
function tryAttachChild(normId) {
  if (visited.has(normId)) return false
  const childEntry = byNormId.get(normId)
  if (!childEntry) return false
  let childParsed = parsedCache.get(normId)
  if (childParsed === undefined) {
    childParsed = readSessionEvents(childEntry.logPath)
    parsedCache.set(normId, childParsed)
  }
  if (!childParsed.readable) {
    visited.add(normId)
    treeSessions.push({ sessionId: childEntry.sessionId, events: [], missing: true })
    return false
  }
  const header = childParsed.events.find((e) => e.type === 'session')
  const pNorm = typeof header?.parentSession === 'string' ? normalizeSessionId(header.parentSession) : null
  if (pNorm === null || !visited.has(pNorm)) return false
  visited.add(normId)
  treeSessions.push({ sessionId: childEntry.sessionId, events: childParsed.events })
  queue.push(childParsed.events)
  return true
}

// 按事件引用的 UUID 精准展开；bundle 见证会话集与 --dir 全量候选做固定点兜底，保证零漏子会话。
const fallbackPool = isDirMode
  ? candidateLogs.map((c) => normalizeSessionId(c.sessionId))
  : extraCandidateIds

while (queue.length > 0) {
  const curEvents = queue.shift()
  for (const childId of discoverExplicitChildSessionIds(curEvents, rootEntry.sessionId)) {
    if (visited.has(childId)) continue
    if (!byNormId.has(childId)) {
      visited.add(childId)
      treeSessions.push({ sessionId: childId, events: [], missing: true })
      continue
    }
    tryAttachChild(childId)
  }
  for (const refId of discoverReferencedSessionIds(curEvents, rootEntry.sessionId)) {
    tryAttachChild(refId)
  }
  let attached = true
  while (attached) {
    attached = false
    for (const candId of fallbackPool) {
      if (tryAttachChild(candId)) attached = true
    }
  }
}

const webLogPath = opt('--web-log')
const webLog = webLogPath === undefined
  ? { status: /** @type {const} */ ('not-requested') }
  : existsSync(resolve(webLogPath))
    ? { status: /** @type {const} */ ('ok'), text: readFileSync(resolve(webLogPath), 'utf8') }
    : { status: /** @type {const} */ ('absent') }

const report = analyzeTrajectory({
  rootSessionId: rootEntry.sessionId,
  sessions: treeSessions,
  bundleFacts: bundleDir ? readBundleFacts(bundleDir) : null,
  webLog,
})

if (flag('--json')) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(formatTrajectoryReport(report))
}
