// scan-sessions.mjs — 研究证据生成器（只读 runtime 会话日志；产物住 _backlog/）。
// 用法：node _backlog/research/orchestration-alignment/scan-sessions.mjs [sessionsRoot]
// 默认 sessionsRoot = <repo>/runtime/harness-home/sessions。
import { readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { readZstdText } from '../../../scripts/lib/zstd-read.mjs'

const root = process.argv[2] ?? resolve(process.cwd(), 'runtime/harness-home/sessions')
const group = readdirSync(root).find((d) => d.includes('research-workspace'))
if (!group) throw new Error('no research-workspace group')
const groupDir = join(root, group)
const dirs = readdirSync(groupDir).filter((d) => statSync(join(groupDir, d)).isDirectory())

const sessions = new Map()
const calls = []
for (const dir of dirs) {
  const logPath = join(groupDir, dir, 'session.v4.jsonl.zstd')
  let text
  try { text = readZstdText(logPath).text } catch { continue }
  if (!text) continue
  const lines = text.split('\n').filter(Boolean)
  let header = null
  const userSources = {}
  const toolCounts = {}
  const toolCalls = []
  let turns = 0
  let firstTime = null
  let lastTime = null
  let firstUser = null
  let hasTeamIdentity = false
  for (const line of lines) {
    let ev
    try { ev = JSON.parse(line) } catch { continue }
    if (ev.type === 'session') { header = ev; continue }
    if (ev.time != null) { if (firstTime == null) firstTime = ev.time; lastTime = ev.time }
    if (ev.type === 'turn/end') turns++
    if (ev.type === 'user/message') {
      const src = ev.data?.source?.kind ?? ev.data?.source ?? '?'
      userSources[src] = (userSources[src] ?? 0) + 1
      const text = (ev.data?.content ?? []).map((b) => b?.text ?? '').join('')
      if (firstUser == null && text) firstUser = text.slice(0, 600)
      if (text.includes('You are teammate')) hasTeamIdentity = true
    }
    if (ev.type === 'tool/call') {
      const name = ev.data?.name
      toolCounts[name] = (toolCounts[name] ?? 0) + 1
      toolCalls.push({ name, args: ev.data?.arguments, seq: ev.seq })
    }
  }
  if (!header) continue
  const id = header.id ?? dir.replace(/^session-/, '')
  sessions.set(id, {
    id, dir, cwd: header.cwd, createdAt: header.createdAt, parentSession: header.parentSession ?? null,
    depth: header.delegationDepth ?? 0, preset: header.agentPreset ?? null,
    turns, firstTime, lastTime, firstUser, hasTeamIdentity,
    userSources, toolCounts, toolCalls,
  })
  for (const c of toolCalls) calls.push({ session: id, ...c })
}

// Roots + children
const roots = [...sessions.values()].filter((s) => !s.parentSession)
const children = [...sessions.values()].filter((s) => s.parentSession)
const byParent = new Map()
for (const c of children) {
  const arr = byParent.get(c.parentSession) ?? []
  arr.push(c)
  byParent.set(c.parentSession, arr)
}
const rootOf = (s) => {
  let cur = s
  const seen = new Set()
  while (cur?.parentSession && !seen.has(cur.id)) {
    seen.add(cur.id)
    cur = sessions.get(cur.parentSession)
  }
  return cur
}
const intervals = (arr) => arr.map((s) => [s.firstTime, s.lastTime]).filter(([a, b]) => a != null && b != null)
const peakOverlap = (arr) => {
  const iv = intervals(arr).sort((a, b) => a[0] - b[0])
  let best = 0
  for (let i = 0; i < iv.length; i++) {
    const t = iv[i][0]
    let n = 0
    for (const [a, b] of iv) if (a <= t && t <= b) n++
    best = Math.max(best, n)
  }
  return best
}
const perRoot = roots.map((r) => {
  const kids = children.filter((c) => rootOf(c)?.id === r.id)
  const presets = {}
  for (const c of kids) presets[c.preset ?? 'none'] = (presets[c.preset ?? 'none'] ?? 0) + 1
  const depths = {}
  for (const c of kids) depths[c.depth] = (depths[c.depth] ?? 0) + 1
  return {
    id: r.id, createdAt: r.createdAt, preset: r.preset, cwd: r.cwd,
    childCount: kids.length, presets, depths, peakChildOverlap: peakOverlap(kids),
    childIds: kids.map((c) => c.id),
  }
})

const leadTeammates = children.filter((c) => c.preset === 'lead')
const roleChildren = children.filter((c) => c.preset === 'analyst' || c.preset === 'critic' || c.preset === 'scout')
const boundaryNames = ['ask_user_question', 'create_goal', 'get_goal', 'update_goal', 'present', 'spawn_teammate', 'subagent']
const boundaryCalls = leadTeammates.map((c) => ({
  id: c.id,
  calls: boundaryNames.filter((n) => c.toolCounts[n]).map((n) => `${n}:${c.toolCounts[n]}`),
}))
const workflowSessions = [...sessions.values()].filter((s) => s.toolCounts.workflow)
const subagentCalls = calls.filter((c) => c.name === 'subagent')
const parseArgs = (a) => { try { return JSON.parse(a) } catch { return a } }
const subagentArgs = subagentCalls.map((c) => ({ session: c.session, args: parseArgs(c.args) }))

const out = {
  sessionCount: sessions.size,
  rootCount: roots.length,
  childCount: children.length,
  headerPresets: children.reduce((m, c) => { m[c.preset ?? 'none'] = (m[c.preset ?? 'none'] ?? 0) + 1; return m }, {}),
  leadTeammates: leadTeammates.map((c) => ({ id: c.id, turns: c.turns, preset: c.preset, hasTeamIdentity: c.hasTeamIdentity, firstUser: c.firstUser, toolCounts: c.toolCounts })),
  leadTeammateCount: leadTeammates.length,
  roleChildren: roleChildren.map((c) => ({ id: c.id, preset: c.preset, depth: c.depth, turns: c.turns, parent: c.parentSession, firstUser: c.firstUser, toolCounts: c.toolCounts })),
  boundaryCalls,
  workflowSessions: workflowSessions.map((s) => ({ id: s.id, preset: s.preset, depth: s.depth, parent: s.parentSession, firstUser: s.firstUser?.slice(0, 900), toolCounts: s.toolCounts })),
  subagentArgs,
  perRoot,
}
console.log(JSON.stringify(out, null, 2))
