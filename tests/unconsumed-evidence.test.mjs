// unconsumed-evidence 回归 — B1 差集投影（evidence/ 未进 findings.md 的差集，critic 出题的
// 操作侧对账基座）；夹具 = tests/fixtures/review-aids。
import test from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unconsumedEvidence } from '../scripts/lib/unconsumed-evidence.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const bundle = (name) => join(HERE, 'fixtures', 'review-aids', name)

// B1（critic 差集出题）机械基座的单元反证：模块缺席时本文件导入即红（先红后绿实录，
// 2026-10-06）；形态覆盖 = 差集 / 全引用边界 / findings 缺席 / 空集如实报告。

test('差集：3 卡 findings 引 2 → unconsumed = [c.md]，cited=2', () => {
  const r = unconsumedEvidence(bundle('bundle-diff'))
  assert.deepEqual(r.unconsumed, ['c.md'], '未进 findings 的卡 = critic 差集出题的矿')
  assert.equal(r.total, 3)
  assert.equal(r.cited, 2)
  assert.equal(r.findingsPresent, true)
})

test('边界：全部引用 → unconsumed = []（空差集是合法态，如实报告不报错）', () => {
  const r = unconsumedEvidence(bundle('bundle-all-cited'))
  assert.deepEqual(r.unconsumed, [])
  assert.equal(r.cited, 1)
})

test('findings 缺席（中期态）→ findingsPresent=false、unconsumed = 全部（调用方自判语义）', () => {
  const r = unconsumedEvidence(bundle('bundle-no-findings'))
  assert.equal(r.findingsPresent, false)
  assert.deepEqual(r.unconsumed, ['a.md', 'b.md'])
})

test('防空语料：evidence/ 缺席 → total=0、unconsumed=[]（空集显式，不静默不炸）', () => {
  const r = unconsumedEvidence(bundle('bundle-no-evidence'))
  assert.equal(r.findingsPresent, true)
  assert.equal(r.total, 0)
  assert.deepEqual(r.unconsumed, [])
})
