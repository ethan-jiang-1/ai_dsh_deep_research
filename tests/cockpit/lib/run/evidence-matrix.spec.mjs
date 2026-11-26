// evidence-matrix 回归 — topics.md × evidence/*.md 解析、矩阵统计与五态降级。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { foldEvidenceMatrix, parseEvidenceMeta, parseTopicsLenses } from '../../../../packages/deep-research-pack/src/lib/run/evidence-matrix.ts'

const SAMPLE_TOPICS = `# Topics — demo

## T1: 核心技术路线
- must_answer:
  - Q1
- scope_role: primary
- lenses: [arch, benchmark]

## T2: 合规与安全
- scope_role: supporting
- lenses: [policy, benchmark]
`

const CARD_A = `---
source_url: https://example.org/spec
retrieved_at: 2026-11-26
quality: A
found_by: scout-1
supports: T1
lens: arch
source_tier: primary   # inline comment stripped
publisher: example.org
---

# 官方架构白皮书

## 原文摘录
> 支持零信任架构
`

const CARD_B = `---
source_url: https://bench.dev/run1
retrieved_at: 2026-11-26
quality: B
found_by: analyst-1
supports: [T1, T2]
lens: benchmark
source_tier: secondary
publisher: bench.dev
---

# 基准测试
`

test('parseTopicsLenses：提取 topic id/标题/role/lenses', () => {
  const topics = parseTopicsLenses(SAMPLE_TOPICS)
  assert.equal(topics.length, 2)
  assert.equal(topics[0]?.id, 'T1')
  assert.equal(topics[0]?.title, '核心技术路线')
  assert.deepEqual(topics[0]?.lenses, ['arch', 'benchmark'])
  assert.deepEqual(topics[1]?.lenses, ['policy', 'benchmark'])
})

test('parseEvidenceMeta：提取 8 字段并剥离行尾注释；无 frontmatter 返回 null', () => {
  const meta = parseEvidenceMeta('e1.md', CARD_A)
  assert.ok(meta !== null)
  assert.equal(meta.quality, 'A')
  assert.equal(meta.sourceTier, 'primary')
  assert.equal(meta.lens, 'arch')
  assert.deepEqual(meta.supports, ['T1'])
  assert.equal(meta.publisher, 'example.org')
  assert.equal(meta.title, '官方架构白皮书')
  assert.equal(parseEvidenceMeta('plain.md', '# No frontmatter\n\nBody\n'), null)
})

test('foldEvidenceMatrix：正常统计覆盖矩阵/质量/信源分布；unreadable/invalid 不折成正常 0', () => {
  const okMatrix = foldEvidenceMatrix({
    topicsState: 'ok',
    topicsText: SAMPLE_TOPICS,
    evidenceState: 'ok',
    cards: [
      { name: 'e1.md', state: 'ok', text: CARD_A },
      { name: 'e2.md', state: 'ok', text: CARD_B },
    ],
  })
  assert.equal(okMatrix.state, 'ok')
  assert.equal(okMatrix.validCards, 2)
  assert.equal(okMatrix.uniquePublishers, 2)
  assert.equal(okMatrix.byQuality.A, 1)
  assert.equal(okMatrix.byQuality.B, 1)
  assert.equal(okMatrix.byTier.primary, 1)
  assert.equal(okMatrix.byTier.secondary, 1)
  assert.equal(okMatrix.cells.T1?.arch, 1)
  assert.equal(okMatrix.cells.T1?.benchmark, 1)
  assert.equal(okMatrix.cells.T2?.benchmark, 1)
  assert.equal(okMatrix.cells.T2?.policy, 0)

  const degraded = foldEvidenceMatrix({
    topicsState: 'absent',
    topicsText: null,
    evidenceState: 'unreadable',
    cards: [{ name: 'bad.md', state: 'unreadable', text: null }],
  })
  assert.equal(degraded.state, 'unreadable')
  assert.equal(degraded.unreadableCards, 1)

  const partial = foldEvidenceMatrix({
    topicsState: 'empty',
    topicsText: null,
    evidenceState: 'ok',
    cards: [
      { name: 'e1.md', state: 'ok', text: CARD_A },
      { name: 'e3.md', state: 'invalid', text: null },
    ],
  })
  assert.equal(partial.state, 'partial')
  assert.equal(partial.invalidCards, 1)
})
