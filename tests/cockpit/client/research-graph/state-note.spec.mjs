// 负例留证 2026-11-14：BUG-045——失败态与未绑定态曾合流；graphStateNote 把 followError 单独一条。
// 红配方：删掉 followError 分支 → 失败态落到「尚未绑定」→ 本例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { graphStateNote } from '../../../../packages/deep-research-pack/src/client/research-graph/state-note.ts'
import { INITIAL_GRAPH_FEED_STATE, reduceGraphFeed } from '../../../../packages/deep-research-pack/src/client/research-graph/graph-state.ts'

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

// 负例留证 2026-11-22：BUG-355——plan.md 读失败曾被降级成 missing，图谱说「没有 plan.md」。
// 红配方：把 useGraphFeed/reduceGraphFeed 的失败分支改回 missing → 本例如期红。
test('BUG-355：plan.md 读失败 = 独立失败态，不冒充「没有 plan.md」', async () => {
  const errState = reduceGraphFeed(INITIAL_GRAPH_FEED_STATE, { kind: 'plan-error' })
  assert.equal(errState.planState, 'error')
  const failed = graphStateNote({ ...base, planState: 'error', boundSlug: 'drt_x' })
  assert.ok(failed !== null)
  assert.equal(failed.title, '计划读取失败')
  assert.match(failed.body, /这不是「没有 plan\.md」/)
  const missing = graphStateNote({ ...base, planState: 'missing', boundSlug: 'drt_x' })
  assert.ok(missing !== null)
  assert.equal(missing.title, '没有可画的 DAG')
  assert.match(missing.body, /没有 plan\.md/)
  // 源码守卫：读失败分支必须派发 plan-error，不得落 missing（防止只改文案、状态仍合流）。
  const { readFileSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts'), 'utf8')
  assert.match(source, /dispatch\(\{ kind: 'plan-error' \}\)/)
})

// 负例留证 2026-11-28：BUG-478——plan.md 有节点但无依赖边时，旧文案错怪 Team 看板缺 blocked_by 并声称
// 「图谱按 plan deps 画」。红配方：改回旧文案或删去 hasPlan && !hasEdges 映射 → 本例红。
test('BUG-478：plan.md 有节点但无依赖边时中英文如实说明以节点清单展示、不画依赖图', async () => {
  const { en, zh } = await import('../../../../packages/deep-research-pack/src/client/locales.ts')
  const makeT = (table) => (key, params = {}) => String(table[key]).replace(/\{([A-Za-z0-9_]+)\}/g, (all, name) => (name in params ? String(params[name]) : all))
  const zhNote = graphStateNote({ ...base, planState: 'ready', boundSlug: 'x', hasPlan: true, hasEdges: false, hasTopLevel: true }, makeT(zh))
  assert.ok(zhNote !== null)
  assert.match(zhNote.title, /plan\.md/)
  assert.match(zhNote.title, /deps/)
  assert.match(zhNote.body, /节点清单/)
  assert.doesNotMatch(zhNote.title + zhNote.body, /blocked_by|Team/)

  const enNote = graphStateNote({ ...base, planState: 'ready', boundSlug: 'x', hasPlan: true, hasEdges: false, hasTopLevel: true }, makeT(en))
  assert.ok(enNote !== null)
  assert.match(enNote.title, /plan\.md/)
  assert.match(enNote.title, /deps/)
  assert.match(enNote.body, /node list/i)
  assert.doesNotMatch(enNote.title + enNote.body, /blocked_by|[\u4e00-\u9fa5]/)
})
