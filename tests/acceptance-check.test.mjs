import test from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { acceptanceCheck } from '../scripts/lib/acceptance-check.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const bundle = (name) => join(HERE, 'fixtures', 'review-aids', name)
const B = bundle('bundle-acceptance')

// 收活验收判据机械求值器（DeerFlow acceptance_criteria keyless 移植）的单元反证：
// 模块缺席时本文件导入即红（先红后绿实录，2026-10-06）。三态语义钉 = PASS/FAIL/UNVERIFIED，
// 核心纪律 = 判不了的永不静默放行（notes/implemented/2026-10-06-acceptance-criteria.md）。

test('file_exists：在场且非空 → PASS；缺席 → FAIL（缺席可判，不是 UNVERIFIED）', () => {
  const r = acceptanceCheck(B, [
    { type: 'file_exists', path: 'evidence/full-card.md' },
    { type: 'file_exists', path: 'evidence/absent.md' },
  ])
  assert.equal(r.verdicts[0].status, 'PASS')
  assert.equal(r.verdicts[1].status, 'FAIL', '文件缺席是机械可判的失败——收活不许放行')
  assert.match(r.verdicts[1].detail, /缺席/)
})

test('file_exists：空文件 → FAIL（在场≠达标，非空是判据一部分；夹具用 .txt——0 字节 .md 会撞 md-utf8-newline 门）', () => {
  const r = acceptanceCheck(B, [{ type: 'file_exists', path: 'empty-artifact.txt' }])
  assert.equal(r.verdicts[0].status, 'FAIL')
  assert.match(r.verdicts[0].detail, /为空/)
})

test('file_contains：标记命中/不命中 → PASS/FAIL', () => {
  const r = acceptanceCheck(B, [
    { type: 'file_contains', path: 'marker.md', needle: 'TASK-SOMETHING-DONE' },
    { type: 'file_contains', path: 'marker.md', needle: 'NEVER-WRITTEN' },
  ])
  assert.equal(r.verdicts[0].status, 'PASS')
  assert.equal(r.verdicts[1].status, 'FAIL')
})

test('frontmatter_fields：七字段齐 → PASS；缺字段 → FAIL 带缺失清单', () => {
  const SEVEN = ['source_url', 'retrieved_at', 'quality', 'found_by', 'supports', 'source_tier', 'publisher']
  const r = acceptanceCheck(B, [
    { type: 'frontmatter_fields', file: 'evidence/full-card.md', fields: SEVEN },
    { type: 'frontmatter_fields', file: 'evidence/thin-card.md', fields: SEVEN },
  ])
  assert.equal(r.verdicts[0].status, 'PASS')
  assert.equal(r.verdicts[1].status, 'FAIL')
  assert.match(r.verdicts[1].detail, /supports/, '缺失字段点名到判据详情')
})

test('UNVERIFIED 钉：未知判据形态 / 非对象 / 判据缺参 → UNVERIFIED 带原因，永不静默放行', () => {
  const r = acceptanceCheck(B, [
    { type: 'numbers_match_source_page', file: 'evidence/full-card.md' },
    '不是对象',
    { type: 'file_exists' },
  ])
  assert.equal(r.verdicts[0].status, 'UNVERIFIED', '语义类判据机械判不了 = 第三态，不是跳过')
  assert.match(r.verdicts[0].detail, /永不静默放行/)
  assert.equal(r.verdicts[1].status, 'UNVERIFIED')
  assert.equal(r.verdicts[2].status, 'UNVERIFIED', '判据缺参（path）= 判据残缺非交付物失败——第三态，不是 FAIL 也不是静默')
  assert.match(r.verdicts[2].detail, /缺参/)
})

test('防空语料：零判据清单 → noCriteria=true 显式报告（无判据委派是缺陷形态，不静默全 PASS）', () => {
  const r = acceptanceCheck(B, [])
  assert.equal(r.summary.noCriteria, true)
  assert.equal(r.summary.total, 0)
})

test('summary 计数对账：三态计数 = 判据总数', () => {
  const r = acceptanceCheck(B, [
    { type: 'file_exists', path: 'evidence/full-card.md' },
    { type: 'file_exists', path: 'evidence/absent.md' },
    { type: 'whatever_custom', x: 1 },
  ])
  assert.equal(r.summary.pass, 1)
  assert.equal(r.summary.fail, 1)
  assert.equal(r.summary.unverified, 1)
  assert.equal(r.summary.total, 3)
})
