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
