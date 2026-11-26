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
