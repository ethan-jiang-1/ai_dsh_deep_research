// 负例留证 2026-11-13：BUG-140（HITL2 词表双向误判）
// 负例留证 2026-11-13：BUG-144（代理记账行被打哑）
// 负例留证 2026-11-13：BUG-146（英文 HITL2 卡判型）
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
import { hitl2RowGate, isHitl2Mention, presentGate } from '../../scripts/lib/node-gate-session-gates.mjs'
import { deriveAnchors } from '../../packages/deep-research-pack/src/lib/hitl-fold.ts'
import { closingProvenanceRow } from '../../scripts/lib/hitl-provenance.mjs'

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

test('presentGate：整数契约（schema+created，无 contract）同样以下界过滤旧见证', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    writeFileSync(join(b, 'run.md'), '# Run\n\n- schema: 2\n- created: 2026-10-23\n- phase: delivery\n- next: present\n')
    const old = Date.parse('2026-10-01T10:00:00+08:00')
    const sessions = writeSession(dir, [at({ type: 'tool/call', data: { name: 'write', arguments: JSON.stringify({ file_path: 'drt_x/question.md' }) } }, old), present('drt_x/final/v1.md', old)])
    const r = presentGate(b, sessions, [])
    assert.equal(r.status, 'RED')
    assert.match(r.detail, /契约纪元|epoch|旧/)
  } finally { cleanup() }
})

test('presentGate：run.md 契约纪元非法 → RED（不无下界采信见证）', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    writeFileSync(join(b, 'run.md'), '# Run\n\n- schema: 2\n- phase: delivery\n- next: present\n')
    const sessions = writeSession(dir, [at({ type: 'tool/call', data: { name: 'write', arguments: JSON.stringify({ file_path: 'drt_x/question.md' }) } })])
    const r = presentGate(b, sessions, [])
    assert.equal(r.status, 'RED')
    assert.match(r.detail, /契约纪元/)
  } finally { cleanup() }
})

test('hitl2RowGate：整数契约（created 为下界）下答复链 PASS；早于 created 的答复不算', () => {
  const { dir, cleanup } = makeRoot('witness')
  const { dir: dirOld, cleanup: cleanupOld } = makeRoot('witness-old')
  try {
    const b = writeBundle(dir)
    writeFileSync(join(b, 'run.md'), '# Run\n\n- schema: 2\n- created: 2026-10-23\n- phase: delivery\n- next: present\n')
    const okSessions = writeSession(dir, [bind(), ask(), reply()])
    const pass = hitl2RowGate(b, okSessions)
    assert.equal(pass.gate.status, 'PASS', pass.gate.detail)
    const oldSessions = writeSession(dirOld, [bind(), ask(), reply('按现稿定稿（Recommended）', Date.parse('2026-10-01T10:00:00+08:00'))])
    const red = hitl2RowGate(b, oldSessions)
    assert.equal(red.gate.status, 'RED')
    assert.match(red.gate.detail, /HITL2|答复|见证/)
  } finally { cleanup(); cleanupOld() }
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

// 负例留证 2026-11-13：D51——无 run.md 的旧场不再按文本行 PASS：证据缺席 = UNATTESTED（exit 2）。
// 红配方：恢复「无 run.md → 有记录行即 PASS」的旧分支 → 本例第一条断言红。
test('旧场（无 run.md）：文本行不给 PASS，证据缺席 = UNATTESTED', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = join(dir, 'drt_legacy')
    mkdirSync(join(b, 'final'), { recursive: true })
    writeFileSync(join(b, 'question.md'), '# Q\n\n## Decisions\n\n- 2026-10-05 HITL2 拍板\n')
    writeFileSync(join(b, 'final', 'v1.md'), '# v1\n')
    const r = hitl2RowGate(b, join(dir, 'nope'))
    assert.equal(r.gate.status, 'UNATTESTED')
    assert.match(r.gate.detail, /无 run.md|证据/)

    // run.md 在场而纪元非法 = 没有下界：RED（与旧场两条路径分开）
    writeFileSync(join(b, 'run.md'), '# Run\n\n- phase: delivery\n')
    const red = hitl2RowGate(b, join(dir, 'nope'))
    assert.equal(red.gate.status, 'RED')
    assert.match(red.gate.detail, /纪元|下界/)
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

// 负例留证 2026-11-12：BUG-075——旧实现按行文关键词判「拍板/未决」，旧答复即可放行（G8 fail-open）。
// D51 收口：决策只认最新 ask 的 callId 答复；行文措辞不参与（pending 字样不否决真实答复）。
// 红配方：把门③ 的决策退回 isHitl2Row 行判 → 本例的 pending 行会被判 RED，或旧答复被当拍板。
test('BUG-075 HITL2：未决措辞不否决真实答复——最新 ask 已答复 = PASS（事件为准）', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    writeFileSync(join(b, 'question.md'), '# Q\n\n## Decisions（append-only，最新在上）\n\n- 2026-10-23 HITL2（v2）：未拍板（等待用户确认）\n')
    const sessions = writeSession(dir, [bind(), ask(), reply()])
    const r = hitl2RowGate(b, sessions)
    assert.equal(r.gate.status, 'PASS', JSON.stringify(r.gate))
    assert.match(r.gate.detail, /ask1/)
  } finally { cleanup() }
})

test('BUG-075 HITL2：pending 行 + 无答复 → RED', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    writeFileSync(join(b, 'question.md'), '# Q\n\n## Decisions\n\n- 2026-10-23 HITL2：未拍板\n')
    const sessions = writeSession(dir, [bind()])
    const r = hitl2RowGate(b, sessions)
    assert.equal(r.gate.status, 'RED')
  } finally { cleanup() }
})

test('BUG-075 HITL2：最新 ask 未答复时，更早 ask 的答复不得放行', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    const ask2 = at({ type: 'tool/call', data: { turn: 2, callId: 'ask2', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ id: 'hitl2_delivery', header: '交付审阅（HITL2）', question: 'v2 定稿？drt_x' }] }) } }, T + 120_000)
    const sessions = writeSession(dir, [bind(), ask(T), reply('按现稿定稿（Recommended）', T + 60_000), ask2])
    const r = hitl2RowGate(b, sessions)
    assert.equal(r.gate.status, 'RED', JSON.stringify(r.gate))
    assert.match(r.gate.detail, /ask2|最新/)
  } finally { cleanup() }
})

test('BUG-075 HITL2：最新 ask 已答复 → PASS（旧答复不再夺权）', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    const ask2 = at({ type: 'tool/call', data: { turn: 2, callId: 'ask2', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ id: 'hitl2_delivery', header: '交付审阅（HITL2）', question: 'v2 定稿？drt_x' }] }) } }, T + 120_000)
    const reply2 = at({ type: 'agent/inbox/spliced', data: { inserted: [{ source: { kind: 'user-question-reply', callId: 'ask2', outcome: 'answered' }, content: [{ type: 'text', text: JSON.stringify({ answers: [{ id: 'hitl2_delivery', selected: ['按现稿定稿（Recommended）'] }] }) }] }] } }, T + 180_000)
    const sessions = writeSession(dir, [bind(), ask(T), reply('按现稿定稿（Recommended）', T + 60_000), ask2, reply2])
    const r = hitl2RowGate(b, sessions)
    assert.equal(r.gate.status, 'PASS', JSON.stringify(r.gate))
    assert.match(r.gate.detail, /ask2/)
  } finally { cleanup() }
})

// 负例留证 2026-11-13：BUG-134——门侧绑定扫整段 args，content 提到别的 drt_ 就借用见证。
// 还原法 = boundSlugsOf 回到 String(arguments).matchAll(/drt_(...)\//)。
test('BUG-134 门③绑定只看真实路径字段：content 提及别的 bundle 不借见证', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir, 'b')
    const mention = at({ type: 'tool/call', data: { turn: 1, callId: 'w1', name: 'write', arguments: JSON.stringify({ file_path: 'drt_a/notes.md', content: '参考 drt_b/final/v1.md 的写法' }) } })
    const sessions = writeSession(dir, [mention, ask('b'), reply()])
    const red = hitl2RowGate(b, sessions)
    assert.equal(red.gate.status, 'RED', JSON.stringify(red.gate))
    assert.match(red.gate.detail, /绑定|会话|HITL2/)
    // 对照组：真实写 drt_b 路径仍 PASS
    const sessions2 = writeSessionAt(dir, [bind('b'), ask('b'), reply()])
    const green = hitl2RowGate(b, sessions2)
    assert.equal(green.gate.status, 'PASS', JSON.stringify(green.gate))
  } finally { cleanup() }
})

// 负例留证 2026-11-13：BUG-140——HITL2 词表双向误判（pending 当拍板 / 决策同义词误杀）。
// D51 收口：行文只算「记录在场」，决策归门③ 的事件链；两张词表已删除。
// 红配方：恢复 isHitl2Row + HITL2_PENDING/HITL2_DECISION → 本组 pending 行会被判成拍板或误杀。
test('BUG-140 HITL2 记录行：任何措辞都只算记录在场，不算拍板', () => {
  for (const row of ['- 2026-11-23 HITL2 待用户确认（v2）', '- HITL2：用户无异议', '- HITL2: approved', '- HITL2 等回复', '- HITL2 on hold']) {
    assert.equal(isHitl2Mention(row), true, row)
  }
  assert.equal(isHitl2Mention('- 计划确认卡：「交付审阅」按推荐开跑'), false, '没有 HITL2 / 代理记账，不是记录行')
})

test('BUG-144 代理记账行：原话 OK/继续/就按这个吧 仍是 HITL2 记录行', () => {
  for (const text of ['OK', '继续', '就按这个吧']) {
    const row = closingProvenanceRow({ cardKey: 'anchor-2', text, date: '2026-11-13' })
    assert.equal(isHitl2Mention(row), true, `${text} -> ${row}`)
  }
})

test('BUG-146 英文 HITL2 卡：门③认 id/英文选项，UI 判 pending', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    const askEn = at({ type: 'tool/call', data: { turn: 1, callId: 'ask1', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ id: 'hitl2_delivery', header: 'Delivery review (HITL2)', question: 'Finalize?', options: [{ label: 'Finalize (deliver as-is)' }] }] }) } })
    const replyEn = at({ type: 'tool/result', data: { turn: 1, step: 1, message: { role: 'tool', toolCallId: 'ask1', content: [{ type: 'text', text: JSON.stringify({ answers: [{ id: 'hitl2_delivery', selected: ['Finalize (deliver as-is)'] }] }) }] } } }, T + 60_000)
    const sessions = writeSession(dir, [bind(), askEn, replyEn])
    const r = hitl2RowGate(b, sessions)
    assert.equal(r.gate.status, 'PASS', JSON.stringify(r.gate))
    const anchors = deriveAnchors([JSON.parse(askEn)], { question: true, delivered: false })
    assert.equal(anchors.find((a) => a.key === 'anchor-2')?.state, 'pending')
  } finally { cleanup() }
})

// 负例留证 2026-11-13：BUG-149——pending 词表洞导致「等回复/未最终裁决/挂起/推迟/未决/hold」被当拍板。
// 现在决策只认事件链：同样的 pending 行，最新 ask 已答复 → PASS；未答复 → RED。
test('BUG-149 行文措辞不改变决策：pending 与 decision 词同判（事件为准）', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const answered = writeBundle(dir)
    writeFileSync(join(answered, 'question.md'), '# Q\n\n## Decisions\n\n- HITL2 等回复\n- HITL2 on hold\n')
    const sessions = writeSession(dir, [bind(), ask(), reply()])
    assert.equal(hitl2RowGate(answered, sessions).gate.status, 'PASS')

    const unanswered = join(dir, 'drt_y')
    mkdirSync(join(unanswered, 'final'), { recursive: true })
    writeFileSync(join(unanswered, 'run.md'), '# Run\n\n- contract: 2026-10-23\n- phase: delivery\n')
    writeFileSync(join(unanswered, 'question.md'), '# Q\n\n## Decisions\n\n- HITL2 定稿（用户已拍板）\n')
    writeFileSync(join(unanswered, 'final', 'v1.md'), '# v1\n')
    const unansweredSessions = writeSessionAt(dir, [bind('y'), ask('y')], { name: 'session-y.jsonl' })
    const red = hitl2RowGate(unanswered, unansweredSessions)
    assert.equal(red.gate.status, 'RED', JSON.stringify(red.gate))
    assert.match(red.gate.detail, /callId 绑定|答复|G8/)
  } finally { cleanup() }
})

// 负例留证 2026-11-13：BUG-156——最新 v2 在场 + 只 present v1 仍 PASS（版本配对缺失）。
// D51：配对读 present 事件，不读 §Decisions 行里的 vN。
// 红配方：presentGate 只要求「任一在场 vN」而不要求最新版本 → 下方 RED 例变 PASS。
test('BUG-156 版本配对：v2 在场而只 present v1 → RED（门②）', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    writeFileSync(join(b, 'final', 'v2.md'), '# v2\n')
    const sessions = writeSession(dir, [bind(), ask(), reply('按现稿定稿（Recommended）', T + 60_000), present('drt_x/final/v1.md', T + 120_000)])
    const r = presentGate(b, sessions, [])
    assert.equal(r.status, 'RED', JSON.stringify(r))
    assert.match(r.detail, /最新版本|配对/)

    const v2 = writeSessionAt(dir, [bind(), ask(), reply(), present('drt_x/final/v2.md')], { name: 'session-v2.jsonl' })
    assert.equal(presentGate(b, v2, []).status, 'PASS')
  } finally { cleanup() }
})

// 负例留证 2026-11-14：BUG-168——旧场 present 把整段载荷做 slug 子串，别的 bundle 的 present
// 只要 note 提一句就 PASS。红配方：把 presentInLogs 退回 `JSON.stringify(d).includes(slug)` →
// 下方「别的 bundle + note 提及」例变 PASS。
test('presentGate：旧场 present 只认 files[].path——别的 bundle + note 提及不夺权', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir, 'legacy')
    rmSync(join(b, 'run.md'))
    const sessions = writeSession(dir, [at({
      type: 'tool/call',
      data: { turn: 1, callId: 'p1', name: 'present', arguments: JSON.stringify({ files: [{ path: 'drt_other/final/v1.md' }], note: 'supersedes drt_legacy/main' }) },
    })])
    const r = presentGate(b, sessions, [])
    assert.equal(r.status, 'RED', r.detail)
  } finally { cleanup() }
})

test('presentGate：旧场 present 指向本 bundle 的 final/vN → PASS', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir, 'legacy')
    rmSync(join(b, 'run.md'))
    const sessions = writeSession(dir, [at({
      type: 'tool/call',
      data: { name: 'present', arguments: JSON.stringify({ files: [{ path: 'drt_legacy/final/v1.md' }] }) },
    })])
    const r = presentGate(b, sessions, [])
    assert.equal(r.status, 'PASS', r.detail)
    assert.match(r.detail, /指向本 bundle/)
  } finally { cleanup() }
})

test('presentGate：旧场 note 里只有 slug、没有 files 路径 → RED', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir, 'legacy')
    rmSync(join(b, 'run.md'))
    const sessions = writeSession(dir, [at({
      type: 'tool/call',
      data: { name: 'present', arguments: JSON.stringify({ note: 'see drt_legacy/final/v1.md' }) },
    })])
    assert.equal(presentGate(b, sessions, []).status, 'RED')
  } finally { cleanup() }
})
