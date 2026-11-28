// graph-state.spec.mjs — reduceGraphFeed 无浏览器单测。
// 红证：把 plan-error 误改回 missing 或 plan-unbound 漏清 snapshotState → 下方断言立即转红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { INITIAL_GRAPH_FEED_STATE, reduceGraphFeed } from '../../../../packages/deep-research-pack/src/client/research-graph/graph-state.ts'

test('reduceGraphFeed：绑定重试 / plan 失败与未绑定复位 / 快照五态转移完备', () => {
  let state = reduceGraphFeed(INITIAL_GRAPH_FEED_STATE, { kind: 'bind-slug', slug: 'alpha' })
  assert.equal(state.boundSlug, 'alpha')

  state = reduceGraphFeed(state, { kind: 'follow-error', message: 'ws closed' })
  assert.equal(state.followError, 'ws closed')
  state = reduceGraphFeed(state, { kind: 'follow-retry' })
  assert.equal(state.followAttempt, 1)

  state = reduceGraphFeed(state, { kind: 'plan-truncated', loadedAt: 123 })
  assert.equal(state.planState, 'truncated')
  assert.equal(state.planLoadedAt, 123)

  state = reduceGraphFeed(state, { kind: 'plan-error' })
  assert.equal(state.planState, 'error')
  assert.equal(state.plan, null)

  state = reduceGraphFeed(state, { kind: 'set-graph-view', value: 'diff' })
  state = reduceGraphFeed(state, { kind: 'set-show-snapshot', value: (prev) => !prev })
  assert.equal(state.graphView, 'diff')
  assert.equal(state.showSnapshotPlan, true)

  state = reduceGraphFeed(state, { kind: 'snapshot-failed', state: 'unreadable' })
  assert.equal(state.snapshotState, 'unreadable')

  state = reduceGraphFeed(state, { kind: 'plan-unbound' })
  assert.equal(state.planState, 'unbound')
  assert.equal(state.graphView, 'current')
  assert.equal(state.snapshotState, 'idle')
  assert.equal(state.showSnapshotPlan, false)

  const retried = reduceGraphFeed(state, { kind: 'plan-retry' })
  assert.equal(retried.retryTick, state.retryTick + 1)
})

// 负例留证 2026-11-28：BUG-478——plan-missing / plan-truncated / plan-error 未收口 graphView 与
// showSnapshotPlan 导致界面陷入 vnull 死锁，且缺 reset-session 导致切会话沿用耗尽的 followAttempt。
// 红配方：去掉这三个分支对 graphView/showSnapshotPlan 的清零或删除 reset-session → 本例红。
test('BUG-478：plan 异常分支自动复位 diff/旧图视图，reset-session 清零 followAttempt', () => {
  let base = reduceGraphFeed(INITIAL_GRAPH_FEED_STATE, { kind: 'bind-slug', slug: 'alpha' })
  base = reduceGraphFeed(base, { kind: 'follow-retry' })
  base = reduceGraphFeed(base, { kind: 'follow-retry' })
  base = reduceGraphFeed(base, { kind: 'follow-retry' })
  base = reduceGraphFeed(base, { kind: 'set-graph-view', value: 'diff' })
  base = reduceGraphFeed(base, { kind: 'set-show-snapshot', value: true })
  base = reduceGraphFeed(base, { kind: 'snapshot-loading' })
  assert.equal(base.followAttempt, 3)

  for (const action of [
    { kind: 'plan-missing' },
    { kind: 'plan-truncated', loadedAt: 456 },
    { kind: 'plan-error' },
  ]) {
    const next = reduceGraphFeed(base, action)
    assert.equal(next.graphView, 'current', `${action.kind} 必须退回 current 视图防 vnull 死锁`)
    assert.equal(next.showSnapshotPlan, false, `${action.kind} 必须关闭旧图快照面板`)
    assert.equal(next.snapshotState, 'idle', `${action.kind} 必须重置 snapshotState`)
    assert.equal(next.snapshotPlan, null)
  }

  const reset = reduceGraphFeed(base, { kind: 'reset-session' })
  assert.equal(reset.followAttempt, 0, 'reset-session 必须清零 followAttempt')
  assert.equal(reset.graphView, 'current')
  assert.equal(reset.showSnapshotPlan, false)
  assert.equal(reset.boundSlug, null)
})
