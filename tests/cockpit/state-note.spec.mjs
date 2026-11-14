// 负例留证 2026-11-14：BUG-045——失败态与未绑定态曾合流；graphStateNote 把 followError 单独一条。
// 红配方：删掉 followError 分支 → 失败态落到「尚未绑定」→ 本例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { graphStateNote } from '../../packages/deep-research-pack/src/client/research-graph/state-note.ts'

const base = { planState: 'unbound', boundSlug: null, followError: null, hasPlan: false, hasEdges: false, hasTopLevel: false }

test('读失败 ≠ 未绑定：followError 在场时给失败态（BUG-045）', () => {
  const failed = graphStateNote({ ...base, followError: 'Remote stream WebSocket closed' })
  assert.ok(failed !== null)
  assert.equal(failed.title, '绑定状态读取失败')
  assert.match(failed.body, /Remote stream WebSocket closed/)
  assert.match(failed.body, /读不到/)
  const unbound = graphStateNote({ ...base })
  assert.ok(unbound !== null)
  assert.equal(unbound.title, '本会话尚未绑定 run')
  assert.doesNotMatch(unbound.body, /流断开/)
})
