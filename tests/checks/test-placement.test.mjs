// tests/ 落点闭集的纯函数负控（BUG-191：全集 − 已知子集 = 空）。
//
// 负例留证 2026-11-16：BUG-191——`tests/cockpit/misc/x.spec.mjs`、`tests/pack/misc/x.spec.mjs`、
// `tests/cockpit/lib/x.spec.mjs`、`tests/checks/nested/x.test.mjs` 等未知形态 → 本 spec 逐条红；
// 合法落点（cockpit/client/<sub>、pack/contract、run/<owner>）→ 绿。还原探针 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CLIENT_SUBS, COCKPIT_LIB_DOMAINS, PACK_SURFACES, RUN_OWNERS,
  isTestFile, placementIssues,
} from '../../checks/lib/repo/test-placement.mjs'

const good = [
  'tests/run/gates/plan-card.spec.mjs',
  'tests/run/shared/frontmatter.spec.mjs',
  'tests/cockpit/lib/run/present-version.spec.mjs',
  'tests/cockpit/client/research-tabs.spec.mjs',
  'tests/cockpit/client/method-library/method-library-views.spec.mjs',
  'tests/cockpit/shared/i18n.spec.mjs',
  'tests/pack/contract/export-shape.spec.mjs',
  'tests/pack/scripts/presets.spec.mjs',
  'tests/contracts/verdict-conformance.spec.mjs',
  'tests/checks/test-lanes.test.mjs',
  'tests/vendor/bundle-composition.vendor.spec.mjs',
  'tests/fixtures/anything/ignored.spec.mjs',
]

test('合法落点全集零问题（BUG-191 负控）', () => {
  assert.ok(good.length >= 10, '防空语料：合法样本过少')
  assert.deepEqual(placementIssues(good), [])
  assert.equal(isTestFile('tests/pack/preset-helpers.mjs'), false)
  assert.equal(isTestFile('checks/lib/tools/x.spec.mjs'), false)
})

test('未知子树/深度/平铺根逐条点名（BUG-191）', () => {
  const cases = [
    ['tests/cockpit/misc/zz-place-probe.spec.mjs', /未知落点.*misc/],
    ['tests/pack/misc/zz-place-probe.spec.mjs', /未知落点.*misc/],
    ['tests/cockpit/lib/zz-place-probe.spec.mjs', /必须再有 domain/],
    ['tests/cockpit/client/misc/zz-place-probe.spec.mjs', /未知 client 子目录 misc/],
    ['tests/cockpit/shared/nested/zz-place-probe.spec.mjs', /只收平铺 spec/],
    ['tests/run/misc/zz-place-probe.spec.mjs', /未知 owner misc/],
    ['tests/checks/nested/zz-place-probe.test.mjs', /只收平铺 \*\.test\.mjs/],
    ['tests/contracts/nested/zz-place-probe.spec.mjs', /只收平铺 \*\.spec\.mjs/],
    ['tests/vendor/nested/zz-place-probe.vendor.spec.mjs', /只收平铺 \*\.vendor\.spec\.mjs/],
    ['tests/pack/contract/nested/zz-place-probe.spec.mjs', /只收平铺 spec/],
    ['tests/run/ops/deep/zz.spec.mjs', /未知深度/],
    ['tests/run/gates/a/b/c/x.spec.mjs', /未知深度/],
    ['tests/cockpit/lib/run/deep/x.spec.mjs', /未知深度/],
    ['tests/cockpit/client/defaults/deep/x.spec.mjs', /未知深度/],
    ['tests/zz-place-probe.spec.mjs', /tests\/ 根不得平铺测试/],
    ['tests/misc/zz-place-probe.spec.mjs', /未知测试域 misc/],
  ]
  for (const [path, pattern] of cases) {
    const issues = placementIssues([path])
    assert.equal(issues.length, 1, `${path} 应恰好命中一条落点规则，实得：${issues.join(' | ')}`)
    assert.match(issues[0], pattern, `${path} 的报因不可判：${issues[0]}`)
  }
})

test('已知闭集本身可判且非空（防空语料）', () => {
  assert.ok(RUN_OWNERS.length >= 6)
  assert.ok(COCKPIT_LIB_DOMAINS.length >= 7)
  assert.ok(CLIENT_SUBS.length >= 6)
  assert.ok(PACK_SURFACES.length >= 6)
})
