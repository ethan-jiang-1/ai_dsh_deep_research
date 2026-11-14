// fix-evidence 契约（2026-11-14 假修事故）——bug 卡的 `## 修复落地` 必须给出
// 改动（仓内路径）/ 红证（实跑失败）/ 绿证（实跑通过）；红证还要可重放或是测试/门禁资产。
// 反证：删掉红证 marker 检查 → 下方 missing-red 例绿；删掉可重放检查 → one-off 例绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fixChangePathsOf, fixEvidenceProblems } from '../../scripts/lib/fix-evidence.mjs'

const card = (body) => `---\nstatus: 已修\nseverity: P2\nopened: 2026-11-14\n---\n\n# BUG-900：probe\n\n${body}`

const GOOD = card(`## 修复落地

- **改动**：\`scripts/lib/fix.mjs\`、\`tests/checks/fix.test.mjs\`
- **红证**：\`node --test tests/checks/fix.test.mjs\`
  \`\`\`
  not ok 1 - old
  \`\`\`
- **绿证**：\`node --test tests/checks/fix.test.mjs\`
  \`\`\`
  ok 1 - new
  \`\`\`
`)

test('fixEvidenceProblems：完整 改动/红证/绿证 → 绿；路径可解析', () => {
  assert.deepEqual(fixEvidenceProblems(GOOD), [])
  assert.deepEqual(fixChangePathsOf(GOOD), ['scripts/lib/fix.mjs', 'tests/checks/fix.test.mjs'])
})

test('fixEvidenceProblems：缺节 / 缺标签 / 缺失败片段 / 缺通过片段 → 红', () => {
  assert.match(fixEvidenceProblems(card('## 决定\nx\n'))[0], /缺 ## 修复落地/)
  assert.match(fixEvidenceProblems(GOOD.replace('## 修复落地', '## 其它'))[0], /缺 ## 修复落地/)
  assert.match(fixEvidenceProblems(GOOD.replace('- **红证**', '- **红色的证**')).join('；'), /缺「红证」/)
  assert.match(fixEvidenceProblems(GOOD.replace('not ok 1 - old', 'nothing')).join('；'), /红证.*缺实跑结果/)
  assert.match(fixEvidenceProblems(GOOD.replace('ok 1 - new', 'nothing')).join('；'), /绿证.*缺实跑结果/)
})

test('fixEvidenceProblems：红证不可重放且无测试/门禁资产 → 红；有测试资产 → 绿', () => {
  const oneOff = GOOD
    .replace('`node --test tests/checks/fix.test.mjs`', '`node -e "throw 1"`')
    .replace(/`scripts\/lib\/fix\.mjs`、`tests\/checks\/fix\.test\.mjs`/, '`scripts/lib/fix.mjs`')
    .replace('not ok 1 - old', 'FAIL: old')
  assert.match(fixEvidenceProblems(oneOff).join('；'), /不可重放|测试\/门禁资产/)
  const withAsset = oneOff.replace('`scripts/lib/fix.mjs`', '`scripts/lib/fix.mjs`、`tests/checks/fix.test.mjs`')
  assert.deepEqual(fixEvidenceProblems(withAsset), [])
})
