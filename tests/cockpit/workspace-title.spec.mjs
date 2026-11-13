// workspace-title — 产品工作区标题的单一正本（2026-11-03 审计 D2：两半各写一份字面）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PRODUCT_TITLE_PREFIX, workspaceTitleFor } from '../../packages/deep-research-pack/src/lib/workspace-title.ts'

test('前缀字面 = host 登记与 client 过滤共用的那一份', () => {
  assert.equal(PRODUCT_TITLE_PREFIX, 'Deep Research — ')
})

test('workspaceTitleFor：目录名拼接；空/未定义 = 基名（不留尾破折号）', () => {
  assert.equal(workspaceTitleFor('acme'), 'Deep Research — acme')
  assert.equal(workspaceTitleFor(''), 'Deep Research')
  assert.equal(workspaceTitleFor(undefined), 'Deep Research')
})
