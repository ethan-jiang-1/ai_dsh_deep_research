import test from 'node:test'
import assert from 'node:assert/strict'
import {
  activeTocHeadingIndex,
  countRiskClaims,
  createEvidencePreviewCache,
  extractEvidencePreview,
  extractTocHeadings,
  filterClaimRows,
  normalizeHeadingText,
} from '../../../../packages/deep-research-pack/src/lib/run/evidence-preview.ts'

test('extractEvidencePreview：解析 8 字段元数据、安全 URL 与去标记 3 行正文摘录', () => {
  const raw = [
    '---',
    'title: SEC 2026 Annual Filing',
    'source_url: https://sec.gov/edgar/10k-2026',
    'source_tier: primary',
    'quality: A',
    'lens: official',
    'publisher: sec.gov',
    'retrieved_at: 2026-11-20',
    '---',
    '# SEC 2026 Annual Filing',
    '## Key Findings',
    '- **Revenue** reached $12.4B in FY2026 with [10-K note](https://sec.gov/note).',
    '> Free cash flow margin expanded to `28%`.',
    '- Geographic mix: North America 61%.',
    '- Fourth line should be excluded from 3-line excerpt.',
  ].join('\n')
  const preview = extractEvidencePreview('sec-10k.md', raw)
  assert.equal(preview.cardName, 'sec-10k.md')
  assert.equal(preview.title, 'SEC 2026 Annual Filing')
  assert.equal(preview.quality, 'A')
  assert.equal(preview.sourceTier, 'primary')
  assert.equal(preview.sourceUrl, 'https://sec.gov/edgar/10k-2026')
  assert.equal(preview.publisher, 'sec.gov')
  assert.equal(preview.lens, 'official')
  assert.equal(preview.excerptLines.length, 3)
  assert.match(preview.excerptLines[0], /Revenue reached \$12\.4B.*10-K note/)
  assert.match(preview.excerptLines[1], /Free cash flow margin expanded to 28%/)
  assert.match(preview.excerptLines[2], /Geographic mix: North America 61%/)
})

test('extractEvidencePreview：拒绝不安全 javascript: 外链并跳过围栏代码块', () => {
  const raw = [
    '---',
    'source_url: javascript:alert(1)',
    'quality: B',
    '---',
    '# Unsafe Card',
    '```json',
    '{"hidden": true}',
    '```',
    'Safe body excerpt line.',
  ].join('\n')
  const preview = extractEvidencePreview('bad-url.md', raw)
  assert.equal(preview.sourceUrl, null)
  assert.deepEqual(preview.excerptLines, ['Safe body excerpt line.'])
})

test('createEvidencePreviewCache：有界 LRU 淘汰最久未用项并保留显性错误态', () => {
  const cache = createEvidencePreviewCache(2)
  cache.set('a', { state: 'absent' })
  cache.set('b', { state: 'unreadable' })
  assert.equal(cache.size, 2)
  // 访问 a 刷新其 LRU 位置
  assert.deepEqual(cache.get('a'), { state: 'absent' })
  cache.set('c', { state: 'empty' })
  assert.equal(cache.size, 2)
  assert.equal(cache.get('b'), undefined)
  assert.deepEqual(cache.get('a'), { state: 'absent' })
  assert.deepEqual(cache.get('c'), { state: 'empty' })
  cache.delete('a')
  assert.equal(cache.size, 1)
  cache.clear()
  assert.equal(cache.size, 0)
})

test('filterClaimRows / countRiskClaims：精确分离存疑/未核查风险集与已支持集', () => {
  const rows = [
    { claimId: 'C1', text: 'ok', critical: true, topics: [], evidence: [], status: 'supported', quote: null, reason: null, recheckedUrls: [], sourceTierOk: true },
    { claimId: 'C2', text: 'partial', critical: false, topics: [], evidence: [], status: 'partial', quote: null, reason: 'gap', recheckedUrls: [], sourceTierOk: true },
    { claimId: 'C3', text: 'bad', critical: true, topics: [], evidence: [], status: 'unsupported', quote: null, reason: 'contradicted', recheckedUrls: [], sourceTierOk: false },
    { claimId: 'C4', text: 'missing', critical: false, topics: [], evidence: [], status: 'UNVERIFIED', quote: null, reason: null, recheckedUrls: [], sourceTierOk: null },
  ]
  assert.equal(countRiskClaims({ total: 4, supported: 1, partial: 1, unsupported: 1, insufficient: 0, unverified: 1, critical: 2 }), 3)
  assert.deepEqual(filterClaimRows(rows, 'all').map((r) => r.claimId), ['C1', 'C2', 'C3', 'C4'])
  assert.deepEqual(filterClaimRows(rows, 'risk').map((r) => r.claimId), ['C2', 'C3', 'C4'])
  assert.deepEqual(filterClaimRows(rows, 'supported').map((r) => r.claimId), ['C1'])
})

test('extractTocHeadings / activeTocHeadingIndex：跳过围栏代码并精确计算当前滚动章节', () => {
  const md = [
    '# **主标题** [标注](https://example.com)',
    '```md',
    '# Fake heading in fence',
    '```',
    '## 一、背景',
    '### 1.1 细节',
  ].join('\n')
  assert.equal(normalizeHeadingText('**主标题** `code`'), '主标题 code')
  const headings = extractTocHeadings(md)
  assert.deepEqual(headings, [
    { level: 1, text: '主标题 标注' },
    { level: 2, text: '一、背景' },
    { level: 3, text: '1.1 细节' },
  ])
  assert.equal(activeTocHeadingIndex([-200, -20, 120], 48), 1)
  assert.equal(activeTocHeadingIndex([80, 200], 48), 0)
  assert.equal(activeTocHeadingIndex([], 48), 0)
})

// 负例留证 2026-11-28：BUG-473——activeTocHeadingIndex 在遇到未匹配标题的 Infinity 时直接 break，
// 导致其后所有章节高亮卡死在前一节；normalizeHeadingText 未剥离 _斜体_ 与尾 #。
// 红配方：把 !Number.isFinite(off) 的 continue 改回 break → 本例红（返回 0 而非 2）。
test('BUG-473 activeTocHeadingIndex 与 normalizeHeadingText：跳过 Infinity 缺口并剥离下划线斜体与尾 #', () => {
  assert.equal(activeTocHeadingIndex([-200, Number.POSITIVE_INFINITY, -40, 120], 56), 2)
  assert.equal(normalizeHeadingText('一、_核心_指标 ###'), '一、核心指标')
  assert.equal(normalizeHeadingText('__重点__ $x_1$ ##'), '重点 x_1')
})
