// evidence-card 回归 — 证据卡地址认领谓词、URL 清洗与正文/Question List 解析。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  evidenceAddressOf, isEvidenceAddress, parseEvidenceAddress, parseEvidenceCard, safeExternalUrl,
} from '../../../../packages/deep-research-pack/src/lib/run/evidence-card.ts'

test('isEvidenceAddress / evidenceAddressOf：三位置合法证据卡认领，drafts/_failed/穿越全拒', () => {
  const a1 = evidenceAddressOf('s1', 'drt_demo', 'evidence/e1.md')
  assert.equal(a1, 'dsh-resource://file/session/s1/drt_demo/evidence/e1.md')
  assert.equal(isEvidenceAddress(a1), true)
  assert.equal(isEvidenceAddress('dsh-resource://file/session/s1/archive/drt_demo/evidence/sub.md'), true)
  assert.equal(isEvidenceAddress('dsh-resource://file/session/s1/_abandoned/drt_demo/evidence/sub.md'), true)
  assert.equal(isEvidenceAddress('dsh-resource://file/session/s1/drt_demo/evidence/_failed.md'), false)
  assert.equal(isEvidenceAddress('dsh-resource://file/session/s1/drafts/drt_demo/evidence/e1.md'), false)
  assert.equal(isEvidenceAddress('dsh-resource://file/session/s1/drt_demo/evidence/../secret.md'), false)
  assert.equal(parseEvidenceAddress(a1)?.cardName, 'e1.md')
  assert.equal(parseEvidenceAddress(`${a1}?view=raw#quote`)?.cardName, 'e1.md')
})

test('parseEvidenceCard + safeExternalUrl：解析 metadata 与 Question List 勾选态', () => {
  const card = parseEvidenceCard('e1.md', `---
source_url: https://example.com/report
retrieved_at: 2026-11-26
quality: A
found_by: scout
supports: T1
lens: official
source_tier: primary
publisher: example.com
---

# 官方声明

## 原文摘录
> 2026 年发布。

## Question List（本 topic）
- [x] 发布时间？
- [ ] 定价细节？
`)
  assert.equal(card.title, '官方声明')
  assert.equal(card.meta?.quality, 'A')
  assert.equal(card.questions.length, 2)
  assert.deepEqual(card.questions[0], { checked: true, text: '发布时间？' })
  assert.deepEqual(card.questions[1], { checked: false, text: '定价细节？' })
  assert.equal(safeExternalUrl('https://example.com/a'), 'https://example.com/a')
  assert.equal(safeExternalUrl('javascript:alert(1)'), null)
})

// 负例留证 2026-11-27：BUG-447——parseEvidenceCard 保留正文里的 `## Question List` 小节，
// 导致 ResearchEvidenceTab 在正文与 .questionsBox 渲染两份重复的勾选列表。
// 红配方：移除 parseEvidenceCard 对 Question List 原节的剥离 → bodyMarkdown 仍含 Question List 红。
test('BUG-447 parseEvidenceCard：提取结构化 questions 后从 bodyMarkdown 裁剪原 Question List 节，保留前后文', () => {
  const card = parseEvidenceCard('e2.md', `---
source_url: https://example.com/doc
retrieved_at: 2026-11-26
quality: A
found_by: scout
supports: T1
lens: official
source_tier: primary
publisher: example.com
---

# 核心发现

## 原文摘录
> 关键数据 123。

## Question List（本 topic）
- [x] 一手出处？
- [ ] 口径边界？

## 局限说明
仅覆盖 2026 年。
`)
  assert.equal(card.questions.length, 2)
  assert.match(card.bodyMarkdown, /关键数据 123/)
  assert.match(card.bodyMarkdown, /仅覆盖 2026 年/)
  assert.doesNotMatch(card.bodyMarkdown, /## Question List/)
  assert.doesNotMatch(card.bodyMarkdown, /一手出处？/)
})
