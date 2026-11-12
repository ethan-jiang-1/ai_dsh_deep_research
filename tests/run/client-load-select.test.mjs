// client-load 绑定会话选择：只选 lead 根（BUG-142）。
// 负例留证 2026-11-13：BUG-142——富 method-editor 会话被选为 run 会话 → 状态页假红。
// 还原法 = selectBoundSession 去掉 agentPreset==='lead' 过滤。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectBoundSession } from '../../scripts/lib/client-load-select.mjs'

const candidate = (id, preset, count, title = id) => ({ sessionId: id, agentPreset: preset, eventCount: count, title })

test('BUG-142 只选 lead 根；富 coach 会话被排除', () => {
  const titles = new Map([['lead-1', 1], ['coach-1', 1]])
  const picked = selectBoundSession([candidate('coach-1', 'method-editor', 500), candidate('lead-1', 'lead', 80)], titles, 60)
  assert.equal(picked?.sessionId, 'lead-1')
  assert.equal(selectBoundSession([candidate('coach-1', 'method-editor', 500)], titles, 60), null)
  assert.equal(selectBoundSession([candidate('lead-1', 'lead', 10)], titles, 60)?.sessionId, 'lead-1')
})
