// start-card — 产品首屏起步卡纯判据：有用户消息 / 有 drt_* 就收起，否则显示。
// 反证：删掉 userMessage 短路 / 删掉 drt_ 前缀判断 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldShowStartCard } from '../../packages/deep-research-pack/src/lib/start-card.ts'

test('blank 工作区 + 无用户消息 → 显示', () => {
  assert.equal(shouldShowStartCard({ hasUserMessage: false, entries: [] }), true)
  assert.equal(shouldShowStartCard({ hasUserMessage: false, entries: [{ name: 'AGENTS.md' }, { name: 'templates' }] }), true)
})

test('有 drt_* → 收起', () => {
  assert.equal(shouldShowStartCard({ hasUserMessage: false, entries: [{ name: 'drt_probe' }] }), false)
  assert.equal(shouldShowStartCard({ hasUserMessage: false, entries: [{ name: 'AGENTS.md' }, { name: 'drt_x' }] }), false)
})

test('有用户消息 → 收起（即使还没有 run）', () => {
  assert.equal(shouldShowStartCard({ hasUserMessage: true, entries: [] }), false)
  assert.equal(shouldShowStartCard({ hasUserMessage: true, entries: [{ name: 'drt_x' }] }), false)
})

test('非 drt_ 前缀不误伤（draft/ 不是 run bundle）', () => {
  assert.equal(shouldShowStartCard({ hasUserMessage: false, entries: [{ name: 'drafts' }, { name: 'drtish.md' }] }), true)
})
