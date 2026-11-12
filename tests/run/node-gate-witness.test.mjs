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
import { hitl2RowGate, isHitl2Row, presentGate } from '../../scripts/lib/node-gate-session-gates.mjs'
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

// 负例留证 2026-11-12：BUG-075——旧实现 isHitl2Row 只做关键词存在判断，pending 行 + 旧答复
// 即可 PASS（G8 fail-open）。还原法 = isHitl2Row 退回 /HITL2/ 单判、门③只取任意一条答复。
test('BUG-075 HITL2：最新行是未决形 + 旧答复 → RED', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    writeFileSync(join(b, 'question.md'), '# Q\n\n## Decisions（append-only，最新在上）\n\n- 2026-10-23 HITL2（v2）：未拍板（等待用户确认）\n')
    const sessions = writeSession(dir, [bind(), ask(), reply()])
    const r = hitl2RowGate(b, sessions)
    assert.equal(r.gate.status, 'RED', JSON.stringify(r.gate))
    assert.match(r.gate.detail, /未决|未拍板|G8/)
  } finally { cleanup() }
})

test('BUG-075 HITL2：未决形 + 无答复 → RED（旧实现已红，保持）', () => {
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

// 负例留证 2026-11-13：BUG-140/144/146——HITL2 词表双向误判、代理行被打哑、英文卡判型。
// 还原法：pending 只枚举待确认 / 代理行要求决策词 / askKind 只认中文文案。
test('BUG-140 HITL2 行：待用户确认不算；无异议/OK/approved/采纳/附未决项算', () => {
  assert.equal(isHitl2Row('- 2026-11-23 HITL2 待用户确认（v2）'), false)
  assert.equal(isHitl2Row('- HITL2：用户无异议'), true)
  assert.equal(isHitl2Row('- HITL2: user replied OK'), true)
  assert.equal(isHitl2Row('- HITL2: approved'), true)
  assert.equal(isHitl2Row('- HITL2：采纳'), true)
  assert.equal(isHitl2Row('- HITL2 定稿（附未决项：补研究 W3）'), true)
  assert.equal(isHitl2Row('- HITL2 通过（待补引用 3 处）'), true)
})

test('BUG-144 代理记账行：原话 OK/继续/就按这个吧 仍算 HITL2 拍板', () => {
  for (const text of ['OK', '继续', '就按这个吧']) {
    const row = closingProvenanceRow({ cardKey: 'anchor-2', text, date: '2026-11-13' })
    assert.equal(isHitl2Row(row), true, `${text} -> ${row}`)
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
test('BUG-149 HITL2 pending 词表洞：无明确决策证据一律未决', () => {
  for (const row of ['HITL2 等回复', 'HITL2 未最终裁决', 'HITL2 挂起', 'HITL2 推迟', 'HITL2 待办：等用户', 'HITL2 未决', 'HITL2 暂不交付', 'HITL2 on hold']) {
    assert.equal(isHitl2Row(`- ${row}`), false, row)
  }
  for (const row of ['HITL2 定稿', 'HITL2 用户无异议', 'HITL2 approved', 'HITL2 采纳']) {
    assert.equal(isHitl2Row(`- ${row}`), true, row)
  }
})

// 负例留证 2026-11-13：BUG-156——最新 v2 pending 行 + 旧 v1 拍板/答复仍 PASS。
// 还原法 = latestMention 取首行（旧 v1）且不做版本配对。
test('BUG-156 最新 HITL2 行/版本仲裁：v2 pending + v1 旧答复 → RED', () => {
  const { dir, cleanup } = makeRoot('witness')
  try {
    const b = writeBundle(dir)
    writeFileSync(join(b, 'question.md'), '# Q\n\n## Decisions\n\n- 2026-11-01 HITL2 定稿（v1）\n- 2026-11-23 HITL2 待用户确认（v2）\n')
    writeFileSync(join(b, 'final', 'v2.md'), '# v2\n')
    const sessions = writeSession(dir, [bind(), ask(), reply()])
    const r = hitl2RowGate(b, sessions)
    assert.equal(r.gate.status, 'RED', JSON.stringify(r.gate))
    assert.match(r.gate.detail, /未决|最新|版本/)
  } finally { cleanup() }
})
