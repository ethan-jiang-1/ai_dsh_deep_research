// D28 结构化见证回归 — 新 run（有 run.md）的门②/③ 只认 deliverables/presented 与
// user-question-reply；文本行、前缀 slug、非 lead 日志都不算。旧场无 run.md 走兼容路径。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { hitl2ReplyInLogs, presentedInLogs } from '../../scripts/lib/node-gate-session-gates.mjs'
import { hitl2RowGate, presentGate } from '../../scripts/lib/node-gate-session-gates.mjs'

const makeRoot = (tag) => {
  const base = realpathSync(tmpdir())
  const dir = mkdtempSync(join(base, `dsh-${tag}-`))
  return { base, dir, cleanup: () => {
    if (dirname(dir) !== base || !basename(dir).startsWith(`dsh-${tag}-`)) throw new Error(`refusing cleanup: ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  } }
}

const writeBundle = (root) => {
  const b = join(root, 'drt_x')
  mkdirSync(join(b, 'final'), { recursive: true })
  writeFileSync(join(b, 'run.md'), '# Run\n\n- contract: 2026-10-23\n- phase: delivery\n- next: present\n')
  writeFileSync(join(b, 'question.md'), '# Q\n\n## Decisions（append-only，最新在上）\n\n- 2026-10-23 HITL2 按现稿定稿\n')
  writeFileSync(join(b, 'final.md'), '# Final\n')
  writeFileSync(join(b, 'final', 'v1.md'), '# v1\n')
  writeFileSync(join(b, 'review.md'), 'readiness: PASS\n')
  return b
}

const head = JSON.stringify({ type: 'session', version: 4, id: 's', cwd: '/x', delegationDepth: 0, agentPreset: 'lead' })
const ask = JSON.stringify({ type: 'tool/call', data: { turn: 1, callId: 'ask1', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ id: 'delivery', header: '交付审阅（HITL2）', question: '按现稿定稿？' }] }) } })
const reply = (label = '按现稿定稿（Recommended）') => JSON.stringify({ type: 'agent/inbox/spliced', data: { inserted: [{ source: { kind: 'user-question-reply', callId: 'ask1', outcome: 'answered' }, content: [{ type: 'text', text: JSON.stringify({ kind: 'answer_to_pending_question', tool: 'ask_user_question', callId: 'ask1', selected: [label] }) }] }] } })
const present = (path = 'drt_x/final/v1.md') => JSON.stringify({ type: 'deliverables/presented', data: { turn: 1, callId: 'p1', files: [{ path }] } })

const writeSession = (root, lines, name = 'session.v4.jsonl') => {
  const dir = join(root, 'sessions', 'sess')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, name), [head, ...lines].join('\n') + '\n')
  return join(root, 'sessions')
}

test('presentedInLogs 只认 lead 日志的 deliverables/presented，路径精确到 drt_<slug>/final/vN', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const sessions = writeSession(dir, [present()])
    const r = presentedInLogs(sessions, 'x')
    assert.equal(r.status, 'FOUND')
    assert.equal(r.events[0].version, 1)
    assert.equal(r.events[0].callId, 'p1')
  } finally { cleanup() }
})

test('presentedInLogs：前缀 slug 不算（drt_x-v2）', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const sessions = writeSession(dir, [present('drt_x-v2/final/v1.md')])
    assert.equal(presentedInLogs(sessions, 'x').status, 'NONE')
  } finally { cleanup() }
})

test('presentGate：新 run 只在 present 指 final/vN 时 PASS；指 final.md 红', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    const okSessions = writeSession(dir, [present()])
    assert.equal(presentGate(b, okSessions, []).status, 'PASS')
    const badSessions = writeSession(dir, [present('drt_x/final.md')])
    assert.equal(presentGate(b, badSessions, []).status, 'RED')
  } finally { cleanup() }
})

test('presentGate：会话语料缺席 → UNATTESTED（不是红也不是绿）', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    const r = presentGate(b, join(dir, 'nope'), [])
    assert.equal(r.status, 'UNATTESTED')
  } finally { cleanup() }
})

test('hitl2ReplyInLogs：callId 绑定 ask + reply，标签含定稿才算；代理标记随行', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const sessions = writeSession(dir, [ask, reply()])
    const r = hitl2ReplyInLogs(sessions, 'x')
    assert.equal(r.status, 'FOUND')
    assert.match(r.replies[0].label, /定稿/)
    assert.equal(r.replies[0].proxy, false)
    const proxy = writeSession(dir, [ask, reply('按现稿定稿（代理模拟）')])
    assert.equal(hitl2ReplyInLogs(proxy, 'x').replies[0].proxy, true)
  } finally { cleanup() }
})

test('hitl2RowGate：新 run 有行 + 事件链才 PASS；有行无事件链红；无语料 UNATTESTED', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    const ok = writeSession(dir, [ask, reply()])
    assert.equal(hitl2RowGate(b, ok).gate.status, 'PASS')
    const onlyHead = writeSession(dir, [])
    assert.equal(hitl2RowGate(b, onlyHead).gate.status, 'RED')
    assert.equal(hitl2RowGate(b, join(dir, 'nope')).gate.status, 'UNATTESTED')
  } finally { cleanup() }
})
