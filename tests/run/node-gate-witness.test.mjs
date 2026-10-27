// D28 结构化见证回归 — 新 run（有 run.md）的门②/③ 只认**绑定本 bundle 的 lead 会话**里的
// `deliverables/presented` 与 `user-question-reply`；文本行、前缀 slug、非 lead 日志、别的 run 的
// 答复、早于契约纪元的事件都不算。旧场无 run.md 走文本兼容路径。
//
// 夹具形状的来源：真实语料（2026-10-23 清点 1831 条日志）——presented 147 条、user-question-reply
// 20 条；reply 正文是 `{answers:[{id,selected:[…]}]}`（不是顶层 selected），外层是
// `agent/inbox/spliced → inserted[].source.kind`。此处保留真实形状，防实现只认自造简形。
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

const writeBundle = (root, slug = 'x') => {
  const b = join(root, `drt_${slug}`)
  mkdirSync(join(b, 'final'), { recursive: true })
  writeFileSync(join(b, 'run.md'), '# Run\n\n- contract: 2026-10-23\n- phase: delivery\n- next: present\n')
  writeFileSync(join(b, 'question.md'), '# Q\n\n## Decisions（append-only，最新在上）\n\n- 2026-10-23 HITL2 按现稿定稿\n')
  writeFileSync(join(b, 'final.md'), '# Final\n')
  writeFileSync(join(b, 'final', 'v1.md'), '# v1\n')
  writeFileSync(join(b, 'review.md'), 'readiness: PASS\n')
  return b
}

// 事件时间：契约日 2026-10-23 之后，保证 epoch 判据不误伤正常夹具。
const T = Date.parse('2026-10-23T10:00:00+08:00')
const at = (obj, time = T) => JSON.stringify({ ...obj, time })
const head = (preset = 'lead', depth = 0) => at({ type: 'session', version: 4, id: 's', cwd: '/x', delegationDepth: depth, agentPreset: preset })
// 绑定信号：本 run 的 lead 写过 drt_<slug>/（bundle-bind 写强信号；真实 run 必有）
const bind = (slug = 'x') => at({ type: 'tool/call', data: { turn: 1, callId: 'w1', name: 'write', arguments: JSON.stringify({ file_path: `drt_${slug}/question.md`, content: '# Q' }) } })
const ask = (slug = 'x') => at({ type: 'tool/call', data: { turn: 1, callId: 'ask1', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ id: 'hitl2_delivery', header: '交付审阅（HITL2）', question: `按现稿定稿？drt_${slug}` }] }) } })
const reply = (label = '按现稿定稿（Recommended）', time = T + 60_000) => at({
  type: 'agent/inbox/spliced',
  data: { inserted: [{
    source: { kind: 'user-question-reply', callId: 'ask1', outcome: 'answered' },
    content: [{ type: 'text', text: JSON.stringify({ kind: 'answer_to_pending_question', tool: 'ask_user_question', callId: 'ask1', answers: [{ id: 'hitl2_delivery', selected: [label] }] }) }],
  }] },
}, time)
const present = (path = 'drt_x/final/v1.md', time = T + 120_000) => at({ type: 'deliverables/presented', data: { turn: 1, callId: 'p1', files: [{ path }] } }, time)
// timed ask 的真实答复形态：tool/result 的 message.content 是 `{answers:[…]}`，没有 inbox splice。
const askResult = (label = '定稿（按现稿交付）(Recommended)', time = T + 60_000) => at({
  type: 'tool/result',
  data: { turn: 1, step: 1, message: { role: 'tool', source: { kind: 'tool', callId: 'ask1' }, toolCallId: 'ask1', content: [{ type: 'text', text: JSON.stringify({ answers: [{ id: 'hitl2_delivery', selected: [label] }] }) }], isError: false, id: 'r1' } },
}, time)

const writeSession = (root, lines, name = 'session.v4.jsonl') => {
  const dir = join(root, 'sessions', 'sess')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, name), [head(), ...lines].join('\n') + '\n')
  return join(root, 'sessions')
}
const writeSessionAt = (root, lines, { preset = 'lead', depth = 0, name = 'session.v4.jsonl' } = {}) => {
  const dir = join(root, 'sessions', `${name}-dir`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, name), [head(preset, depth), ...lines].join('\n') + '\n')
  return join(root, 'sessions')
}

test('presentedInLogs 只认 lead 日志的 deliverables/presented，路径精确到 drt_<slug>/final/vN', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const sessions = writeSession(dir, [bind(), present()])
    const r = presentedInLogs(sessions, 'x')
    assert.equal(r.status, 'FOUND')
    assert.equal(r.events[0].version, 1)
    assert.equal(r.events[0].callId, 'p1')
  } finally { cleanup() }
})

test('presentedInLogs：前缀 slug 不算（drt_x-v2）', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const sessions = writeSession(dir, [bind(), present('drt_x-v2/final/v1.md')])
    assert.equal(presentedInLogs(sessions, 'x').status, 'NONE')
  } finally { cleanup() }
})

test('presentedInLogs：会话未绑定本 bundle（没写过 drt_x/）→ 不算见证', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const sessions = writeSession(dir, [present()])
    const r = presentedInLogs(sessions, 'x')
    assert.equal(r.status, 'NONE', '没有 bundle-bind 写信号的会话不能为本 run 作证')
  } finally { cleanup() }
})

test('presentedInLogs：别的 run 的会话写了 drt_other/ → 它的 present 不算本 run', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const sessions = writeSession(dir, [bind('other'), present('drt_x/final/v1.md')])
    assert.equal(presentedInLogs(sessions, 'x').status, 'NONE')
  } finally { cleanup() }
})

test('presentedInLogs：非 lead（delegationDepth>0）日志不算', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const sessions = writeSessionAt(dir, [bind(), present()], { depth: 1 })
    assert.equal(presentedInLogs(sessions, 'x').status, 'NONE')
  } finally { cleanup() }
})

test('presentGate：新 run 只在 present 指 final/vN 时 PASS；指 final.md 红', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    const okSessions = writeSession(dir, [bind(), present()])
    assert.equal(presentGate(b, okSessions, []).status, 'PASS')
    const badSessions = writeSession(dir, [bind(), present('drt_x/final.md')])
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

test('presentGate：present 早于 HITL2 答复 → RED（事件链顺序不成立）', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    const sessions = writeSession(dir, [bind(), ask(), present('drt_x/final/v1.md', T + 10_000), reply('按现稿定稿（Recommended）', T + 60_000)])
    const r = presentGate(b, sessions, [])
    assert.equal(r.status, 'RED')
    assert.match(r.detail, /HITL2|顺序|早于/)
  } finally { cleanup() }
})

test('presentGate：present 早于契约纪元（旧 epoch 同名 run）→ RED，不继承旧见证', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    const old = Date.parse('2026-10-01T10:00:00+08:00')
    const sessions = writeSession(dir, [at({ type: 'tool/call', data: { name: 'write', arguments: JSON.stringify({ file_path: 'drt_x/question.md' }) } }, old), present('drt_x/final/v1.md', old)])
    const r = presentGate(b, sessions, [])
    assert.equal(r.status, 'RED')
    assert.match(r.detail, /契约纪元|epoch|旧/)
  } finally { cleanup() }
})

test('hitl2ReplyInLogs：callId 绑定 ask + reply，标签含定稿才算；代理标记随行', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const sessions = writeSession(dir, [bind(), ask(), reply()])
    const r = hitl2ReplyInLogs(sessions, 'x')
    assert.equal(r.status, 'FOUND')
    assert.match(r.replies[0].label, /定稿/)
    assert.equal(r.replies[0].proxy, false)
    const proxy = writeSession(dir, [bind(), ask(), reply('按现稿定稿（代理模拟）')])
    assert.equal(hitl2ReplyInLogs(proxy, 'x').replies[0].proxy, true)
  } finally { cleanup() }
})

test('hitl2ReplyInLogs：别的 run 的 HITL2 答复不算本 run 的证据（跨 run 污染）', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const sessions = writeSession(dir, [bind('other'), ask('other'), reply()])
    const r = hitl2ReplyInLogs(sessions, 'x')
    assert.equal(r.status, 'NONE', '未绑定 drt_x/ 的会话不能为本 run 的批准作证')
  } finally { cleanup() }
})

test('hitl2RowGate：新 run 有行 + 本 run 事件链才 PASS；有行无事件链红；别的 run 答复不算', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    const ok = writeSession(dir, [bind(), ask(), reply()])
    assert.equal(hitl2RowGate(b, ok).gate.status, 'PASS')
    const onlyHead = writeSession(dir, [bind()])
    assert.equal(hitl2RowGate(b, onlyHead).gate.status, 'RED')
    assert.equal(hitl2RowGate(b, join(dir, 'nope')).gate.status, 'UNATTESTED')
    const foreign = writeSession(dir, [bind('other'), ask('other'), reply()])
    assert.equal(hitl2RowGate(b, foreign).gate.status, 'RED')
  } finally { cleanup() }
})

test('旧场（无 run.md）保持文本兼容：有 HITL2 行即 PASS，不要求事件链', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = join(dir, 'drt_legacy')
    mkdirSync(join(b, 'final'), { recursive: true })
    writeFileSync(join(b, 'question.md'), '# Q\n\n## Decisions\n\n- 2026-10-05 HITL2 拍板\n')
    writeFileSync(join(b, 'final', 'v1.md'), '# v1\n')
    const r = hitl2RowGate(b, join(dir, 'nope'))
    assert.equal(r.gate.status, 'PASS')
    assert.match(r.gate.detail, /epoch/)
  } finally { cleanup() }
})

test('hitl2RowGate：timed ask 的 tool/result 答复也算 callId 绑定见证（无 inbox splice 的真实形态）', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    const sessions = writeSession(dir, [bind(), ask(), askResult()])
    const r = hitl2RowGate(b, sessions)
    assert.equal(r.gate.status, 'PASS', r.gate.detail)
    assert.match(r.gate.detail, /ask1/)
  } finally { cleanup() }
})

test('presentGate：present 是 bundle 内绝对路径（vendor 真实语义）→ PASS 且 detail 只含可移植标签', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    const sessions = writeSession(dir, [bind(), present(join(b, 'final', 'v1.md'))])
    const r = presentGate(b, sessions, [])
    assert.equal(r.status, 'PASS')
    assert.ok(r.detail.includes('drt_x/final/v1.md'), `detail 未归一化：${r.detail}`)
    assert.equal(r.detail.includes(dir), false, 'detail 不得回显本机绝对路径')
  } finally { cleanup() }
})

test('presentGate：present 指向 bundle 外 → RED（不可移交），且 detail 不回显绝对路径', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    const sessions = writeSession(dir, [bind(), present(join(dir, 'elsewhere', 'drt_x', 'final', 'v1.md'))])
    const r = presentGate(b, sessions, [])
    assert.equal(r.status, 'RED')
    assert.match(r.detail, /bundle 外/)
    assert.equal(r.detail.includes(dir), false, 'detail 不得回显本机绝对路径')
  } finally { cleanup() }
})
