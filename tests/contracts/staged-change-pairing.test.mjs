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
