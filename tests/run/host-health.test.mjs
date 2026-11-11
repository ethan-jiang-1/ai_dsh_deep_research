// host-health — 真浏览器冒烟的主机健康判据（client-load 的 NOT-RUN 归因）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { availableMemoryMBFromMeminfo, availableMemoryMBFromVmStat, classifyHostHealth, HOST_HEALTH_THRESHOLDS, isHostUnhealthyVerdict } from '../../scripts/lib/host-health.mjs'

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

// 负例留证 2026-11-11：BUG-060——修复前 client-load 用 node:os 的 freemem()（只算 free pages），
// macOS 上常态 <512MB → NOT-RUN。还原法 = 采集侧改回 Math.round(freemem()/1048576)。
test('BUG-060 可用内存：macOS vm_stat 计入 inactive/speculative/purgeable', () => {
  const vmStat = [
    'Mach Virtual Memory Statistics: (page size of 16384 bytes)',
    'Pages free:                               10404.',
    'Pages active:                            123456.',
    'Pages inactive:                          430601.',
    'Pages speculative:                         1201.',
    'Pages purgeable:                              0.',
  ].join('\n')
  assert.equal(availableMemoryMBFromVmStat(vmStat), Math.round(((10404 + 430601 + 1201) * 16384) / 1048576))
  assert.equal(availableMemoryMBFromVmStat('garbage'), null, '读不出 → null（fail-loud，不回 free pages）')
})

test('BUG-060 可用内存：Linux 用 MemAvailable，缺失时回退 MemFree+Buffers+Cached', () => {
  const meminfo = [
    'MemTotal:       16384000 kB',
    'MemFree:          1048576 kB',
    'MemAvailable:     8388608 kB',
    'Buffers:           102400 kB',
    'Cached:           2048000 kB',
  ].join('\n')
  assert.equal(availableMemoryMBFromMeminfo(meminfo), 8192)
  const fallback = ['MemFree: 100000 kB', 'Buffers: 20000 kB', 'Cached: 30000 kB'].join('\n')
  assert.equal(availableMemoryMBFromMeminfo(fallback), Math.round((100000 + 20000 + 30000) / 1024))
  assert.equal(availableMemoryMBFromMeminfo('nothing here'), null)
})

test('BUG-060 端到端：vm_stat 的可用量喂 classifyHostHealth → 健康（不再被 free pages 误判）', () => {
  const vmStat = 'Mach Virtual Memory Statistics: (page size of 16384 bytes)\nPages free: 5000.\nPages inactive: 430601.\nPages speculative: 1201.\nPages purgeable: 0.'
  const freeMB = availableMemoryMBFromVmStat(vmStat)
  const health = classifyHostHealth({ freeMB, load1: 0.88 * 10, cpuCount: 10 })
  assert.equal(health.unhealthy, false, JSON.stringify(health))
  assert.equal(health.freeMB, freeMB)
})
