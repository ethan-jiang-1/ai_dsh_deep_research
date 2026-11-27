// staged-change-pairing 回归 — D52 的暂存区成对判据（纯函数；git 由门禁注入）。
// 反证：删掉任一分支（归档卡↔Note / expected↔lastRewrite / 修复卡↔代码），下方对应用例变绿。
// 负例留证 2026-11-14：BUG-189——旧实现用目录前缀 startsWith 对账改动路径，`checks/lib/` 会命中
//   任意同目录暂存文件；现只收精确文件路径（退回目录前缀 → 目录例变绿）。
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseStagedChanges, stagedChangePairingProblems } from '../../../checks/lib/repo/staged-change-pairing.mjs'

const CARD = '_backlog/_archived/settled_issues/2026-11-13-x.md'
const NOTE = 'notes/implemented/2026-11-13-x.md'
const cardText = `---\nstatus: 已结\nopened: 2026-11-13\n---\n\n# X\n> 状态：已结 ｜ 可关闭：是\n> 去向：implemented — [Note](../../../${NOTE})\n`

const harness = (files) => {
  // 修复卡的 guard 默认住 tests/checks/fix.test.mjs（含对应 BUG-900/BUG-901 守卫声明）。
  const map = new Map([['tests/checks/fix.test.mjs', "test('probe BUG-900 BUG-901', () => {})\n"], ...files])
  return { read: (rel) => (map.has(rel) ? map.get(rel) : null), exists: (rel) => map.has(rel) }
}

const changes = (rows) => rows.map(([status, ...paths]) => ({ status, paths }))

test('解析 name-status：M / A / R（两段路径）', () => {
  const parsed = parseStagedChanges('M\ta.md\nA\tb.md\nR100\told.md\tnew.md\nD\tc.md\n')
  assert.deepEqual(parsed.map((entry) => entry.status), ['M', 'A', 'R100', 'D'])
  assert.deepEqual(parsed[2].paths, ['old.md', 'new.md'])
})

test('归档卡 + 去向 Note 同暂存集 → 绿；只有卡 → 红', () => {
  const files = new Map([[CARD, cardText], [NOTE, '# Note\n']])
  const green = stagedChangePairingProblems({ staged: changes([['R100', 'old/x.md', CARD], ['M', NOTE]]), ...harness(files) })
  assert.deepEqual(green, [])
  const red = stagedChangePairingProblems({ staged: changes([['R100', 'old/x.md', CARD]]), ...harness(files) })
  assert.equal(red.length, 1)
  assert.match(red[0], /同变更/)
})

test('归档卡的去向是 inline code 也认；指向 notes/ 以外的目标不判', () => {
  const codeCard = cardText.replace('[Note](../../../notes/implemented/2026-11-13-x.md)', '`notes/implemented/2026-11-13-x.md`')
  const files = new Map([[CARD, codeCard]])
  const red = stagedChangePairingProblems({ staged: changes([['A', CARD]]), ...harness(files) })
  assert.equal(red.length, 1)
  const other = cardText.replace('notes/implemented/2026-11-13-x.md', 'docs/x.md')
  const files2 = new Map([[CARD.replace('2026-11-13-x', '2026-11-13-y'), other]])
  const green = stagedChangePairingProblems({ staged: changes([['A', CARD.replace('2026-11-13-x', '2026-11-13-y')]]), ...harness(files2) })
  assert.deepEqual(green, [])
})

test('ui.expected 变更：snapshot 未暂存 → 红；why 空 → 红；载体不存在 → 红；齐全 → 绿', () => {
  const expected = 'snapshots/replay/face/ui.expected.md'
  const snapshot = 'snapshots/replay/face/snapshot.json'
  const missing = stagedChangePairingProblems({ staged: changes([['M', expected]]), ...harness(new Map()) })
  assert.match(missing[0], /snapshot\.json/)
  const empty = stagedChangePairingProblems({
    staged: changes([['M', expected], ['M', snapshot]]),
    ...harness(new Map([[snapshot, '{"lastRewrite":{"why":""}}']])),
  })
  assert.match(empty[0], /lastRewrite\.why/)
  const ghost = stagedChangePairingProblems({
    staged: changes([['M', expected], ['M', snapshot]]),
    ...harness(new Map([[snapshot, '{"lastRewrite":{"why":"issues/missing.md"}}']])),
  })
  assert.match(ghost[0], /不存在/)
  const ok = stagedChangePairingProblems({
    staged: changes([['M', expected], ['M', snapshot]]),
    ...harness(new Map([[snapshot, '{"lastRewrite":{"why":"notes/implemented/x.md"}}'], ['notes/implemented/x.md', '# N\n']])),
  })
  assert.deepEqual(ok, [])
})

test('新建场景（A）的 expected 不按重录判', () => {
  const expected = 'snapshots/replay/new-face/ui.expected.md'
  assert.deepEqual(stagedChangePairingProblems({ staged: changes([['A', expected]]), ...harness(new Map()) }), [])
})

test('空暂存 / 无配对对象 → 绿（防空语料由门禁 note 承担）', () => {
  assert.deepEqual(stagedChangePairingProblems({ staged: [], ...harness(new Map()) }), [])
  assert.deepEqual(stagedChangePairingProblems({ staged: changes([['M', 'README.md']]), ...harness(new Map()) }), [])
})

// ── ③ bug 修复卡：结构化 fix-evidence + 同暂存集改动（2026-11-14 假修事故的机械面）──
const FIX_CARD = '_backlog/_archived/fixed_bugs/BUG-900-fix.md'
const fixCardText = (paths = ['checks/lib/fix.mjs'], {
  opened = '2026-11-15', redExit = 1, redCommand = 'node --test tests/fix.test.mjs', greenExit = 0,
  guard = { path: 'tests/checks/fix.test.mjs' },
} = {}) => `---
status: 已修
severity: P2
opened: ${opened}
---

# BUG-900：probe

> 严重级别：P2｜发现：${opened}｜状态：已修

## 修复落地（${opened}）

\`\`\`json fix-evidence
${JSON.stringify({
    changes: paths,
    red: { command: redCommand, exit: redExit, output: 'not ok 1 - old implementation' },
    green: { command: redCommand, exit: greenExit },
    guard,
  }, null, 2)}
\`\`\`

散文只作人读副本，不参与判定。
`

const legacyFixCardText = (paths = ['checks/lib/fix.mjs']) => `---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-901：legacy probe

## 修复落地（2026-11-14）

- **改动**：${paths.map((path) => `\`${path}\``).join('、')}
- **红证**：\`node --test tests/fix.test.mjs\`
  \`\`\`
  not ok 1 - old
  \`\`\`
- **绿证**：\`node --test tests/fix.test.mjs\`
  \`\`\`
  ok 1 - new
  \`\`\`
`

const fixStaged = (extra = []) => changes([
  ['R100', '_backlog/bugs/BUG-900-fix.md', FIX_CARD],
  ...extra,
])

test('修复卡：结构化证据 + 改动在同暂存集 → 绿', () => {
  const files = new Map([[FIX_CARD, fixCardText()], ['checks/lib/fix.mjs', 'export const x = 1\n'], ['tests/fix.test.mjs', 'test()\n']])
  assert.deepEqual(stagedChangePairingProblems({ staged: fixStaged([['M', 'checks/lib/fix.mjs'], ['M', 'tests/fix.test.mjs']]), ...harness(files) }), [])
})

test('假修事故：只翻已修 + 移动卡，repo 无其它变更 → 红', () => {
  const files = new Map([[FIX_CARD, fixCardText()]])
  const red = stagedChangePairingProblems({ staged: fixStaged(), ...harness(files) })
  assert.equal(red.length, 1)
  assert.match(red[0], /同一暂存集|假修/)
})

test('修复卡缺 ## 修复落地 → 红；声明的文件未暂存 → 红', () => {
  const noEvidence = new Map([[FIX_CARD, fixCardText().replace(/## 修复落地[\s\S]*$/, '')]])
  const missing = stagedChangePairingProblems({ staged: fixStaged([['M', 'checks/lib/fix.mjs']]), ...harness(noEvidence) })
  assert.match(missing[0], /不是可复核的修复/)

  const files = new Map([[FIX_CARD, fixCardText(['checks/lib/other.mjs'])], ['checks/lib/fix.mjs', 'x\n']])
  const wrong = stagedChangePairingProblems({ staged: fixStaged([['M', 'checks/lib/fix.mjs']]), ...harness(files) })
  assert.match(wrong[0], /同一暂存集/)
})

test('修复卡声明的精确文件 / 文档变更 → 同暂存集绿（修复不限于代码）', () => {
  const fileFiles = new Map([[FIX_CARD, fixCardText(['checks/lib/fix.mjs'])], ['checks/lib/fix.mjs', 'x\n']])
  assert.deepEqual(stagedChangePairingProblems({ staged: fixStaged([['M', 'checks/lib/fix.mjs']]), ...harness(fileFiles) }), [])
  const docsFiles = new Map([[FIX_CARD, fixCardText(['docs/guide.md'])], ['docs/guide.md', '# G\n']])
  assert.deepEqual(stagedChangePairingProblems({ staged: fixStaged([['M', 'docs/guide.md']]), ...harness(docsFiles) }), [])
})

test('新归档卡即使 opened < 2026-11-15 无结构化块也必须红（禁止借旧 opened 日期绕过）', () => {
  const legacy = '_backlog/_archived/fixed_bugs/BUG-901-legacy.md'
  const files = new Map([[legacy, legacyFixCardText()], ['checks/lib/fix.mjs', 'x\n']])
  const red = stagedChangePairingProblems({ staged: changes([['A', legacy], ['M', 'checks/lib/fix.mjs']]), ...harness(files) })
  assert.ok(red.length > 0 && /fix-evidence/.test(red.join('；')), `新归档旧日期卡必须要求 fix-evidence：${red.join('；')}`)
})

test('活跃 修复落地 卡也拦：只改卡/无代码 → 红；带证据 + 同暂存集 → 绿', () => {
  const active = '_backlog/bugs/BUG-901-active.md'
  const activeCard = fixCardText().replace('status: 已修', 'status: 修复落地')
  const files = new Map([[active, activeCard], ['checks/lib/fix.mjs', 'x\n'], ['tests/fix.test.mjs', 't\n']])
  const onlyCard = stagedChangePairingProblems({
    staged: changes([['M', active]]),
    ...harness(files),
  })
  assert.match(onlyCard[0], /同一暂存集/)
  const green = stagedChangePairingProblems({
    staged: changes([['M', active], ['M', 'checks/lib/fix.mjs'], ['M', 'tests/fix.test.mjs']]),
    ...harness(files),
  })
  assert.deepEqual(green, [])
})

test('红证不可重放且改动无测试/门禁资产 → 红', () => {
  const card = fixCardText(['checks/lib/fix.mjs'], { redCommand: 'node -e "throw 1"' })
  const files = new Map([[FIX_CARD, card], ['checks/lib/fix.mjs', 'x\n']])
  const red = stagedChangePairingProblems({ staged: fixStaged([['M', 'checks/lib/fix.mjs']]), ...harness(files) })
  assert.match(red[0], /不可重放|测试\/门禁资产/)
})

test('改动目录前缀不能命中任意同目录 staged 文件（BUG-189）', () => {
  const card = fixCardText(['checks/lib/'])
  const files = new Map([[FIX_CARD, card], ['checks/lib/unrelated.mjs', 'x\n']])
  const red = stagedChangePairingProblems({
    staged: fixStaged([['M', 'checks/lib/unrelated.mjs']]),
    ...harness(files),
  })
  assert.match(red[0], /不是可复核|文件路径|目录/)
  const exact = fixCardText(['checks/lib/fix.mjs'])
  const files2 = new Map([[FIX_CARD, exact], ['checks/lib/fix.mjs', 'x\n']])
  assert.deepEqual(stagedChangePairingProblems({
    staged: fixStaged([['M', 'checks/lib/fix.mjs']]),
    ...harness(files2),
  }), [])
})

test('修复卡 guard 路径不存在 → 红；挂靠未暂存且不含本 BUG 声明的无关旧测试 → 红', () => {
  const card = fixCardText(['checks/lib/fix.mjs'], { guard: { path: 'tests/checks/missing.test.mjs' } })
  const files = new Map([[FIX_CARD, card], ['checks/lib/fix.mjs', 'x\n']])
  const red = stagedChangePairingProblems({ staged: fixStaged([['M', 'checks/lib/fix.mjs']]), ...harness(files) })
  assert.match(red[0], /guard 路径不存在/)

  const fakeGuardCard = fixCardText(['checks/lib/fix.mjs'], { guard: { path: 'tests/checks/unrelated.test.mjs' } })
  const files2 = new Map([
    [FIX_CARD, fakeGuardCard],
    ['checks/lib/fix.mjs', 'x\n'],
    ['tests/checks/unrelated.test.mjs', "test('unrelated check', () => {})\n"],
  ])
  const fakeRed = stagedChangePairingProblems({ staged: fixStaged([['M', 'checks/lib/fix.mjs']]), ...harness(files2) })
  assert.ok(fakeRed.length > 0 && /未在同一暂存集|BUG-900/.test(fakeRed.join('；')), `挂靠无关旧测试必须红：${fakeRed.join('；')}`)
})

// 负例留证 2026-11-27：修复已随前序 commit 落地（HEAD 中 bug 卡已为 status: 修复落地 且证据齐全），
// 后续单独 git mv 归档为 已修 时不应因代码已在前一次提交而误判假修；HEAD 仍为 等人拍板/排查中 的假归档继续拦截。
test('二段归档：HEAD 已为 修复落地 且实证文件在盘 → R100 单独归档绿；HEAD 未落地或文件缺失 → 仍红', () => {
  const active = '_backlog/bugs/BUG-900-fix.md'
  const archived = '_backlog/_archived/fixed_bugs/BUG-900-fix.md'
  const landedHead = fixCardText(['checks/lib/fix.mjs']).replace('status: 已修', 'status: 修复落地')
  const archivedText = fixCardText(['checks/lib/fix.mjs'])
  const files = new Map([[archived, archivedText], ['checks/lib/fix.mjs', 'x\n']])
  const renameOnly = changes([['R100', active, archived]])

  const ok = stagedChangePairingProblems({
    staged: renameOnly,
    ...harness(files),
    readHead: (rel) => (rel === active ? landedHead : null),
  })
  assert.deepEqual(ok, [])

  const pendingHead = landedHead.replace('status: 修复落地', 'status: 等人拍板')
  const rejectPending = stagedChangePairingProblems({
    staged: renameOnly,
    ...harness(files),
    readHead: (rel) => (rel === active ? pendingHead : null),
  })
  assert.match(rejectPending[0], /同一暂存集/)

  const missingCodeFiles = new Map([[archived, archivedText]])
  const rejectMissingFile = stagedChangePairingProblems({
    staged: renameOnly,
    ...harness(missingCodeFiles),
    readHead: (rel) => (rel === active ? landedHead : null),
  })
  assert.match(rejectMissingFile[0], /同一暂存集/)
})
