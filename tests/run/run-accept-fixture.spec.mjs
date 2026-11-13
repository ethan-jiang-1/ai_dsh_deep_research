// run-accept-fixture — claim 夹具与 D51 readiness 判据同源。
//
// 负例留证 2026-11-13：run-accept.e2e ⑦——夹具只写 review.md 不写 review/readiness.json →
// readinessOfSources 判 source:'missing'、run-accept 预检红；补声明件 → declaration/PASS。
import test from 'node:test'
import assert from 'node:assert/strict'
import { claimReviewFixture } from '../../scripts/lib/run-accept-fixture.mjs'
import { readinessOfSources } from '../../packages/deep-research-pack/src/lib/review-readiness.ts'

test('claim 夹具：声称有 review/ 时必须带 review/readiness.json（declaration/PASS）', () => {
  const result = readinessOfSources(claimReviewFixture())
  assert.equal(result.pass, true)
  assert.equal(result.source, 'declaration')
})

test('claim 夹具：缺声明件 = missing/红（反证）', () => {
  const result = readinessOfSources({ ...claimReviewFixture(), declarationText: null })
  assert.equal(result.pass, false)
  assert.equal(result.source, 'missing')
})
