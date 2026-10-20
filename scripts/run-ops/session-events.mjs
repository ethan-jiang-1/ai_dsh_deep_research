#!/usr/bin/env node
// session-events.mjs — 会话日志的 agent 观察入口：按 id/标题选中会话，打印尾部事件摘要。
//
// 为什么存在（2026-10-20 审计 P0-4）：日志数据源（zstd 多帧 + session-log.mjs）很强，但 agent
// 没有"看这个会话刚才发生了什么"的统一入口——watch-run 只打状态 JSON，stream-diagnostics 只看
// 流失败，run-dashboard 是给人看的 HTML；要按 tool/call、turn/end 看只能临时写 node -e。
// 本壳复用唯一解码正本（session-log.mjs）与纯摘要/筛选核（session-events-core.mjs）。
//
// 用法：node --import tsx/esm scripts/run-ops/session-events.mjs <session-id|标题子串>
//         [--tail N] [--type <type 子串>] [--grep <原文子串>] [--json] [--sessions <dir>]
//   --tail 0 = 全部（默认 30）；--json = 原始事件逐行 JSON（不再摘要）。
// 退出码：0 = 打印；1 = 标题歧义（列出候选）；2 = 用法/前置/日志不可读。
import { existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { researchWorkspaceGroup, sessionLogsInGroup, readSessionEvents } from '../lib/session-log.mjs'
import { sessionTitleOf } from '../lib/run-state.mjs'
import { filterEvents, tailEvents, formatEventLine } from '../lib/session-events-core.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const argv = process.argv.slice(2)
const opt = (name, fallback = undefined) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}
const flag = (name) => argv.includes(name)
const target = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--sessions'
  && argv[argv.indexOf(a) - 1] !== '--tail' && argv[argv.indexOf(a) - 1] !== '--type'
  && argv[argv.indexOf(a) - 1] !== '--grep')

if (target === undefined || flag('--help')) {
  console.error('session-events: 用法 node --import tsx/esm scripts/run-ops/session-events.mjs <session-id|标题子串> [--tail N] [--type <子串>] [--grep <子串>] [--json] [--sessions <dir>]')
  process.exit(2)
}
const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(ROOT, 'runtime', 'harness-home')
const sessionsRoot = resolve(opt('--sessions', join(home, 'sessions')))
const group = researchWorkspaceGroup(sessionsRoot)
if (group === undefined) {
  console.error(`session-events: 找不到 research-workspace 会话组（${sessionsRoot}）——先 source dev/env.sh，或 --sessions 指到正确根`)
  process.exit(2)
}
const logs = sessionLogsInGroup(join(sessionsRoot, group))
if (logs.length === 0) {
  console.error('session-events: 会话组里没有可读日志')
  process.exit(2)
}

let selected = logs.find((entry) => entry.sessionId === target)
let matchedTitle = null
if (selected === undefined) {
  const matches = []
  for (const entry of logs) {
    const { readable, events } = readSessionEvents(entry.logPath)
    if (!readable) continue
    const title = sessionTitleOf(events)
    if (title !== null && title.includes(target)) matches.push({ entry, title, events })
  }
  if (matches.length === 0) {
    console.error(`session-events: 找不到会话「${target}」（id 或标题子串）——最近 ${logs.length} 个会话可试：${logs.slice(0, 8).map((e) => e.sessionId.slice(0, 18)).join(' ')}`)
    process.exit(2)
  }
  if (matches.length > 1) {
    console.error(`session-events: 标题「${target}」匹配 ${matches.length} 个会话——请用 session id 或更长的标题：`)
    for (const m of matches) console.error(`  ${m.entry.sessionId}  ${m.title}`)
    process.exit(1)
  }
  selected = matches[0].entry
  matchedTitle = matches[0].title
}

const { readable, events } = readSessionEvents(selected.logPath)
if (!readable) {
  console.error(`session-events: 日志不可读（坏帧/读失败）：${selected.logPath}`)
  process.exit(2)
}
const title = matchedTitle ?? sessionTitleOf(events) ?? '(无标题)'
const type = opt('--type')
const grep = opt('--grep')
const tail = Number(opt('--tail', '30'))
const filtered = tailEvents(filterEvents(events, { type, grep }), tail)
console.log(`session ${selected.sessionId}  「${title}」  events=${events.length}  showing=${filtered.length}${type ? `  type~=${type}` : ''}${grep ? `  grep=${grep}` : ''}`)
if (flag('--json')) {
  for (const event of filtered) console.log(JSON.stringify(event))
} else {
  for (const event of filtered) console.log(formatEventLine(event))
}
process.exit(0)
