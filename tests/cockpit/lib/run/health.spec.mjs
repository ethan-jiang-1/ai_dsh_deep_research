// health.spec.mjs — run 停摆派生判据（BUG-348）：静默 + 最后回合错误才告警。
// 负例留证 2026-11-22：BUG-353 / BUG-354——停摆横幅四轴门：已交付/未绑定都应抑制；
// 负例留证 2026-11-21：BUG-348——stalled 只看 quietMs（去掉最后一回合错误）→ 「静默但无错误」例红；
// 删掉 capabilityNote 式的横幅接线 → stalledBannerLine 例红。还原 → 绿。
// 反证：把 stalled 改成只看 quietMs → 「长回合无错误」例红；只看 lastTurnError → 「错误后仍有活动」例红。
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
import assert from 'node:assert/strict'
import { runHealthOf, stalledBannerOf, DEFAULT_STALL_MS } from '../../../../packages/deep-research-pack/src/lib/run/health.ts'

const T = 1_800_000_000_000
const event = (type, time, data = {}) => ({ type, time, data })

test('无事件：不告警，未知保持 null', () => {
  const health = runHealthOf([], { now: T })
  assert.equal(health.lastActivityAt, null)
  assert.equal(health.quietMs, null)
  assert.equal(health.lastTurnError, null)
  assert.equal(health.stalled, false)
})

test('静默超阈值 + 最后回合错误 → stalled', () => {
  const events = [event('turn/start', T - DEFAULT_STALL_MS - 60_000), event('llm/retry', T - DEFAULT_STALL_MS - 30_000, { failure: { message: 'DeepSeek Messages stream idle timeout', code: 'TIMEOUT' } })]
  const health = runHealthOf(events, { now: T })
  assert.equal(health.lastTurnError, 'DeepSeek Messages stream idle timeout')
  assert.equal(health.quietMs, DEFAULT_STALL_MS + 30_000)
  assert.equal(health.stalled, true)
})

test('静默超阈值但没有错误 → 不告警（正常长回合）', () => {
  const health = runHealthOf([event('turn/start', T - DEFAULT_STALL_MS - 60_000)], { now: T })
  assert.equal(health.stalled, false)
})

test('错误之后又有活动 → 不告警（已恢复）', () => {
  const events = [event('llm/retry', T - DEFAULT_STALL_MS - 60_000, { failure: { message: 'TRANSPORT' } }), event('assistant/message', T - 1000)]
  const health = runHealthOf(events, { now: T })
  assert.equal(health.lastTurnError, 'TRANSPORT')
  assert.equal(health.stalled, false)
})

test('上一回合的错误不翻旧账：新回合开始后清空', () => {
  const events = [event('llm/retry', T - DEFAULT_STALL_MS - 60_000, { failure: { message: 'OLD' } }), event('turn/start', T - DEFAULT_STALL_MS - 30_000)]
  const health = runHealthOf(events, { now: T })
  assert.equal(health.lastTurnError, null)
  assert.equal(health.stalled, false)
})

test('错误在阈值内 → 不告警', () => {
  const health = runHealthOf([event('llm/retry', T - 60_000, { failure: { message: 'TIMEOUT' } })], { now: T })
  assert.equal(health.stalled, false)
})

test('BUG-348 / BUG-353 / BUG-354：停摆横幅四轴门（stalled × bound × delivered × hitl）', () => {
  const t = (key, params = {}) => `${key}:${params.minutes ?? ''}:${params.error ?? ''}`
  const stalled = { stalled: true, quietMs: 3_600_000, lastTurnError: 'TIMEOUT', lastActivityAt: null }
  assert.equal(stalledBannerOf({ health: stalled, bound: true, delivered: false }, t), 'runStalledBanner:60:TIMEOUT')
  // 353：已交付 → 不再给「恢复」指引
  assert.equal(stalledBannerOf({ health: stalled, bound: true, delivered: true }, t), null)
  // 354：未绑定（或立项抑制）→ 没有 run 可恢复
  assert.equal(stalledBannerOf({ health: stalled, bound: false, delivered: false }, t), null)
  // HITL 挂起 / 未停摆 / 无健康输入 → 不显示
  assert.equal(stalledBannerOf({ health: stalled, bound: true, delivered: false, hitlPending: true }, t), null)
  assert.equal(stalledBannerOf({ health: { ...stalled, stalled: false }, bound: true, delivered: false }, t), null)
  assert.equal(stalledBannerOf({ health: null, bound: true, delivered: false }, t), null)
})

// 负例留证 2026-11-22：BUG-351——打开会话注入的生命周期事件（时间戳=打开时刻）不算活动；
// 否则 durable log 与 follow 快照对同一会话给出不同 stalled。反证：把活动谓词改回「任意事件」→ 本例红。
test('BUG-351：生命周期事件不推进最后活动时间（两个输入集同判）', () => {
  const durable = [
    event('turn/end', T - DEFAULT_STALL_MS - 60_000),
    event('llm/retry', T - DEFAULT_STALL_MS - 30_000, { failure: { message: 'TRANSPORT' } }),
  ]
  const snapshot = [
    ...durable,
    event('session/end-seed', T - 60_000),
    event('permission/preset', T - 60_000),
    event('sandbox/mode', T - 60_000),
    event('approval/policy', T - 60_000),
  ]
  const fromLog = runHealthOf(durable, { now: T })
  const fromSnapshot = runHealthOf(snapshot, { now: T })
  assert.equal(fromLog.stalled, true)
  assert.equal(fromSnapshot.stalled, true, '打开会话注入的事件不得把静默窗口清零')
  assert.equal(fromSnapshot.quietMs, fromLog.quietMs)
})

test('BUG-351：时间推进面在位（hook 以 tick 驱动 now，不冻结在 memo）', () => {
  const source = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/research-status/useStatusFeed.ts'), 'utf8')
  assert.match(source, /setInterval\(\(\) => setNowTick\(Date\.now\(\)\)/, '缺 30s tick')
  assert.match(source, /runHealthOf\(journalEvents, \{ now: nowTick \}\)/, 'health 仍用一次性 now')
  assert.match(source, /\[journalEvents, nowTick\]/, 'health memo 未依赖 tick')
})
