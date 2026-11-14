// fix-evidence 契约（2026-11-14）——bug 卡的 `## 修复落地` 以 `json fix-evidence` 块为权威：
// changes（仓内文件路径）+ red {command, exit, output?} + green {command, exit}；exit 是 oracle，
// 不再从散文里找“失败/通过”子串。旧卡（opened < 2026-11-15）无块时 grandfather。
// 反证：删掉 red.exit 非零检查 → 对应用例绿；删掉 isFileLike → 目录/glob 例绿；删掉重复块检查 → 双块例绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fixChangePathsOf, fixEvidenceProblems } from '../../scripts/lib/fix-evidence.mjs'

const card = (body, opened = '2026-11-15') => `---\nstatus: 已修\nseverity: P2\nopened: ${opened}\n---\n\n# BUG-900：probe\n\n${body}`

const LEGACY = card(`## 修复落地

- **改动**：\`scripts/lib/fix.mjs\`、\`tests/checks/fix.test.mjs\`
- **红证**：\`node --test tests/checks/fix.test.mjs\` 未失败（否定句，旧启发式会误判）
- **绿证**：\`pnpm test\` 未通过（否定句）
`, '2026-11-14')

const good = {
  changes: ['scripts/lib/fix.mjs', 'tests/checks/fix.test.mjs'],
  red: { command: 'node --test tests/checks/fix.test.mjs', exit: 1, output: 'not ok 1 - old' },
  green: { command: 'node --test tests/checks/fix.test.mjs', exit: 0 },
  guard: { path: 'tests/checks/fix.test.mjs' },
}
const structured = (value = good, opened = '2026-11-15') => card(`## 修复落地

\`\`\`json fix-evidence
${JSON.stringify(value, null, 2)}
\`\`\`

散文只作人读副本，不参与判定。
`, opened)

test('旧卡（< 2026-11-15）无结构化块 → grandfather；路径仍可从散文读', () => {
  assert.deepEqual(fixEvidenceProblems(LEGACY), [])
  assert.deepEqual(fixChangePathsOf(LEGACY), ['scripts/lib/fix.mjs', 'tests/checks/fix.test.mjs'])
})

test('新卡无结构化块 → 红；缺 ## 修复落地 → 红', () => {
  assert.match(fixEvidenceProblems(card('## 修复落地\n\n散文\n')).join('；'), /fix-evidence/)
  assert.match(fixEvidenceProblems(card('## 决定\nx\n')).join('；'), /缺 ## 修复落地/)
})

test('合法结构化块 → 绿；changes 按 JSON 读，不读散文', () => {
  assert.deepEqual(fixEvidenceProblems(structured()), [])
  assert.deepEqual(fixChangePathsOf(structured()), good.changes)
  const proseOnly = structured().replace('```json fix-evidence', '```text')
  assert.match(fixEvidenceProblems(proseOnly).join('；'), /fix-evidence/)
})

test('red.exit 必须非 0；green.exit 必须为 0；exit 必须是整数', () => {
  assert.match(fixEvidenceProblems(structured({ ...good, red: { ...good.red, exit: 0 } })).join('；'), /red\.exit/)
  assert.match(fixEvidenceProblems(structured({ ...good, green: { ...good.green, exit: 1 } })).join('；'), /green\.exit/)
  assert.match(fixEvidenceProblems(structured({ ...good, red: { ...good.red, exit: '1' } })).join('；'), /整数/)
})

test('changes 只收文件路径：目录 / glob / 绝对 / .. → 红；重复 → 红', () => {
  for (const path of ['scripts/lib/', 'tests/checks/*.test.mjs', '/tmp/x.mjs', '../x.mjs']) {
    assert.match(fixEvidenceProblems(structured({ ...good, changes: [path] })).join('；'), /changes|文件路径/)
  }
  assert.match(fixEvidenceProblems(structured({ ...good, changes: ['scripts/lib/fix.mjs', 'scripts/lib/fix.mjs'] })).join('；'), /重复/)
})

test('未知字段 / 空命令 / 非法 JSON / 双块 → 红', () => {
  assert.match(fixEvidenceProblems(structured({ ...good, extra: 1 })).join('；'), /未知字段 extra/)
  assert.match(fixEvidenceProblems(structured({ ...good, red: { ...good.red, foo: 1 } })).join('；'), /red\.foo/)
  assert.match(fixEvidenceProblems(structured({ ...good, red: { command: ' ', exit: 1 } })).join('；'), /red\.command/)
  const badJson = card('## 修复落地\n\n```json fix-evidence\n{ nope\n```\n')
  assert.match(fixEvidenceProblems(badJson).join('；'), /不是合法 JSON/)
  const two = structured().replace('散文只作人读副本，不参与判定。', '```json fix-evidence\n{}\n```')
  assert.match(fixEvidenceProblems(two).join('；'), /只能有一个/)
})

test('红证不可重放且 changes 无测试资产 → 红；有测试资产 → 绿', () => {
  const oneOff = { changes: ['scripts/lib/fix.mjs'], red: { command: 'node -e "throw 1"', exit: 1 }, green: { command: 'node -e ""', exit: 0 }, guard: good.guard }
  assert.match(fixEvidenceProblems(structured(oneOff)).join('；'), /不可重放|测试\/门禁资产/)
  const withAsset = { ...oneOff, changes: ['scripts/lib/fix.mjs', 'tests/checks/fix.test.mjs'] }
  assert.deepEqual(fixEvidenceProblems(structured(withAsset)), [])
})

test('负例留证：exit 是 oracle——output 里写“通过/失败”不改变判定', () => {
  // 红配方：把 red.exit 改成 0（或 fallback 回散文 marker）→ 本例变绿。
  const lyingOutput = {
    ...good,
    red: { command: 'node --test tests/checks/fix.test.mjs', exit: 1, output: '看起来通过（passed）' },
    green: { command: 'node --test tests/checks/fix.test.mjs', exit: 0, output: '其实失败（not ok）' },
  }
  assert.deepEqual(fixEvidenceProblems(structured(lyingOutput)), [])
  const wrongExit = { ...good, red: { ...good.red, exit: 0 } }
  assert.match(fixEvidenceProblems(structured(wrongExit)).join('；'), /red\.exit/)
})

test('每个修复必须沉淀 guard：path 或 notMechanizable+trigger', () => {
  const withoutGuard = { ...good }
  delete withoutGuard.guard
  assert.match(fixEvidenceProblems(structured(withoutGuard)).join('；'), /guard/)
  assert.match(fixEvidenceProblems(structured({ ...good, guard: { path: 'src/x.mjs' } })).join('；'), /tests\/|scripts\/smoke/)
  assert.deepEqual(fixEvidenceProblems(structured({ ...good, guard: { notMechanizable: '浏览器相位', trigger: '再次出现假红时' } })), [])
  assert.match(fixEvidenceProblems(structured({ ...good, guard: { path: 'tests/checks/fix.test.mjs', notMechanizable: 'x', trigger: 'y' } })).join('；'), /不能同时/)
})

test('负例留证：结构化块重复键 → 红（JSON.parse 取末值是假绿）', () => {
  // 红配方：删掉 duplicateKeyOf 检查 → 本例变绿（末值胜出）。
  const raw = '{"changes":["tests/checks/fix.test.mjs"],"changes":["scripts/lib/x.mjs"],"red":{"command":"node --test tests/checks/fix.test.mjs","exit":1},"green":{"command":"node --test tests/checks/fix.test.mjs","exit":0},"guard":{"path":"tests/checks/fix.test.mjs"}}'
  const withDup = card(`## 修复落地\n\n\`\`\`json fix-evidence\n${raw}\n\`\`\`\n`)
  assert.match(fixEvidenceProblems(withDup).join('；'), /重复键 changes/)
  const clean = raw.replace(',"changes":["scripts/lib/x.mjs"]', '')
  const nested = clean.replace('"exit":1', '"exit":1,"exit":0')
  const withNested = card(`## 修复落地\n\n\`\`\`json fix-evidence\n${nested}\n\`\`\`\n`)
  assert.match(fixEvidenceProblems(withNested).join('；'), /重复键 exit/)
})
