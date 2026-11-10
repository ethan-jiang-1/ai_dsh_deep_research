// host-health — 真浏览器冒烟的主机健康判据（client-load 的 NOT-RUN 归因）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyHostHealth, HOST_HEALTH_THRESHOLDS, isHostUnhealthyVerdict } from '../../scripts/lib/host-health.mjs'

test('健康主机：free 与 load/cpu 都在阈值内', () => {
  const h = classifyHostHealth({ freeMB: 2048, load1: 2, cpuCount: 8 })
  assert.equal(h.unhealthy, false)
  assert.deepEqual(h.reasons, [])
  assert.equal(h.loadPerCpu, 0.25)
})

test('低 free：free 低于 512MB 即不健康', () => {
  const h = classifyHostHealth({ freeMB: 272, load1: 1, cpuCount: 8 })
  assert.equal(h.unhealthy, true)
  assert.match(h.reasons.join(';'), /free 272MB < 512MB/)
})

test('高 load：load/cpu 超过 1.5 即不健康', () => {
  const h = classifyHostHealth({ freeMB: 2048, load1: 16, cpuCount: 8 })
  assert.equal(h.unhealthy, true)
  assert.match(h.reasons.join(';'), /load\/cpu 2\.00 > 1\.5/)
})

test('边界：free = 512 与 load/cpu = 1.5 都算健康（严格小于/大于才红）', () => {
  const h = classifyHostHealth({ freeMB: 512, load1: 12, cpuCount: 8 })
  assert.equal(h.unhealthy, false)
  assert.equal(h.loadPerCpu, 1.5)
})

test('缺失/非法指标：判不健康，不从缺省猜健康', () => {
  for (const metrics of [{}, { freeMB: Number.NaN, load1: 1, cpuCount: 8 }, { freeMB: 2048, load1: Number.NaN, cpuCount: 8 }]) {
    const h = classifyHostHealth(metrics)
    assert.equal(h.unhealthy, true)
    assert.ok(h.reasons.length > 0)
  }
})

test('阈值可覆盖（站点/测试注入）', () => {
  const h = classifyHostHealth({ freeMB: 700, load1: 1, cpuCount: 8 }, { minFreeMB: 1024 })
  assert.equal(h.unhealthy, true)
  assert.equal(HOST_HEALTH_THRESHOLDS.minFreeMB, 512)
})

test('NOT-RUN 只在失败 + 主机不健康 + 连接死亡/页面丢失同时成立', () => {
  const unhealthy = classifyHostHealth({ freeMB: 100, load1: 1, cpuCount: 8 })
  const healthy = classifyHostHealth({ freeMB: 2048, load1: 1, cpuCount: 8 })
  assert.equal(isHostUnhealthyVerdict({ hasFailures: true, hostHealth: unhealthy, connectionDeath: true, pageLost: false }), true)
  assert.equal(isHostUnhealthyVerdict({ hasFailures: true, hostHealth: unhealthy, connectionDeath: false, pageLost: true }), true)
  assert.equal(isHostUnhealthyVerdict({ hasFailures: false, hostHealth: unhealthy, connectionDeath: true, pageLost: true }), false)
  assert.equal(isHostUnhealthyVerdict({ hasFailures: true, hostHealth: healthy, connectionDeath: true, pageLost: true }), false)
  assert.equal(isHostUnhealthyVerdict({ hasFailures: true, hostHealth: unhealthy, connectionDeath: false, pageLost: false }), false)
  assert.equal(isHostUnhealthyVerdict({ hasFailures: true, hostHealth: null, connectionDeath: true, pageLost: true }), false)
})
