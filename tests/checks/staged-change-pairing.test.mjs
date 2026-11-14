// staged-change-pairing 回归 — D52 的暂存区成对判据（纯函数；git 由门禁注入）。
// 反证：删掉任一分支（归档卡↔Note / expected↔lastRewrite），下方对应用例变绿。
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseStagedChanges, stagedChangePairingProblems } from '../../scripts/lib/staged-change-pairing.mjs'

const CARD = '_backlog/_archived/settled_issues/2026-11-13-x.md'
const NOTE = 'notes/implemented/2026-11-13-x.md'
const cardText = `---\nstatus: 已结\nopened: 2026-11-13\n---\n\n# X\n> 状态：已结 ｜ 可关闭：是\n> 去向：implemented — [Note](../../../${NOTE})\n`

const harness = (files) => ({
  read: (rel) => (files.has(rel) ? files.get(rel) : null),
  exists: (rel) => files.has(rel),
})

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

// ── ③ bug 修复卡：红→绿证据 + 同暂存集改动（2026-11-14 假修事故的机械面）──
const FIX_CARD = '_backlog/_archived/fixed_bugs/BUG-900-fix.md'
const fixCardText = (paths = ['scripts/lib/fix.mjs']) => `---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-900：probe

> 严重级别：P2｜发现：2026-11-14｜状态：已修

## 修复落地（2026-11-14）

- **改动**：${paths.map((path) => `\`${path}\``).join('、')}
- **红证**：\`node --test tests/fix.test.mjs\`
  \`\`\`
  not ok 1 - old implementation
  \`\`\`
- **绿证**：\`node --test tests/fix.test.mjs\`
  \`\`\`
  ok 1 - new implementation
  \`\`\`
`

const fixStaged = (extra = []) => changes([
  ['R100', '_backlog/bugs/BUG-900-fix.md', FIX_CARD],
  ...extra,
])

test('修复卡：红证/绿证 + 改动在同暂存集 → 绿', () => {
  const files = new Map([[FIX_CARD, fixCardText()], ['scripts/lib/fix.mjs', 'export const x = 1\n'], ['tests/fix.test.mjs', 'test()\n']])
  assert.deepEqual(stagedChangePairingProblems({ staged: fixStaged([['M', 'scripts/lib/fix.mjs'], ['M', 'tests/fix.test.mjs']]), ...harness(files) }), [])
})

test('假修事故：只翻已修 + 移动卡，repo 无其它变更 → 红', () => {
  const files = new Map([[FIX_CARD, fixCardText()]])
  const red = stagedChangePairingProblems({ staged: fixStaged(), ...harness(files) })
  assert.equal(red.length, 1)
  assert.match(red[0], /同一暂存集|假修/)
})

test('修复卡缺 红证/绿证 → 红；声明的文件未暂存 → 红', () => {
  const noEvidence = new Map([[FIX_CARD, fixCardText().replace(/## 修复落地[\s\S]*$/, '')]])
  const missing = stagedChangePairingProblems({ staged: fixStaged([['M', 'scripts/lib/fix.mjs']]), ...harness(noEvidence) })
  assert.match(missing[0], /不是可复核的修复/)

  const files = new Map([[FIX_CARD, fixCardText(['scripts/lib/other.mjs'])], ['scripts/lib/fix.mjs', 'x\n']])
  const wrong = stagedChangePairingProblems({ staged: fixStaged([['M', 'scripts/lib/fix.mjs']]), ...harness(files) })
  assert.match(wrong[0], /同一暂存集/)
})

test('修复卡声明目录前缀 / 文档变更 → 同暂存集绿（修复不限于代码）', () => {
  const dirFiles = new Map([[FIX_CARD, fixCardText(['scripts/lib/'])], ['scripts/lib/fix.mjs', 'x\n']])
  assert.deepEqual(stagedChangePairingProblems({ staged: fixStaged([['M', 'scripts/lib/fix.mjs']]), ...harness(dirFiles) }), [])
  const docsFiles = new Map([[FIX_CARD, fixCardText(['docs/guide.md'])], ['docs/guide.md', '# G\n']])
  assert.deepEqual(stagedChangePairingProblems({ staged: fixStaged([['M', 'docs/guide.md']]), ...harness(docsFiles) }), [])
})

test('活跃 修复落地 卡也拦：只改卡/无代码 → 红；带证据 + 同暂存集 → 绿', () => {
  const active = '_backlog/bugs/BUG-901-active.md'
  const activeCard = fixCardText().replace('status: 已修', 'status: 修复落地')
  const files = new Map([[active, activeCard], ['scripts/lib/fix.mjs', 'x\n'], ['tests/fix.test.mjs', 't\n']])
  const onlyCard = stagedChangePairingProblems({
    staged: changes([['M', active]]),
    ...harness(files),
  })
  assert.match(onlyCard[0], /同一暂存集/)
  const green = stagedChangePairingProblems({
    staged: changes([['M', active], ['M', 'scripts/lib/fix.mjs'], ['M', 'tests/fix.test.mjs']]),
    ...harness(files),
  })
  assert.deepEqual(green, [])
})

test('红证不可重放且改动无测试/门禁资产 → 红', () => {
  const card = fixCardText()
    .replace('`node --test tests/fix.test.mjs`', '`node -e "throw 1"`')
    .replace('not ok 1 - old implementation', 'FAIL: old implementation')
  const files = new Map([[FIX_CARD, card], ['scripts/lib/fix.mjs', 'x\n']])
  const red = stagedChangePairingProblems({ staged: fixStaged([['M', 'scripts/lib/fix.mjs']]), ...harness(files) })
  assert.match(red[0], /不可重放|测试\/门禁资产/)
})
