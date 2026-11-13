// run-lock — 原子建锁与陈旧接管（BUG-073）。
// 负例留证 2026-11-12：BUG-073——修复前 mkdir 后补写 owner.json，创建窗口内并发者会接管并
// 被创建者覆盖属主。还原法 = acquireRunLock 改回「mkdirSync(lockDir) + writeFileSync(owner.json)」。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { acquireRunLock, lockOwnerPid, releaseRunLock } from '../../scripts/lib/run-lock.mjs'

const makeRoot = () => mkdtempSync(join(tmpdir(), 'run-lock-'))
const ownerFile = (lock) => JSON.parse(readFileSync(join(lock, 'owner.json'), 'utf8'))

test('BUG-073 建锁原子：锁出现时 owner.json 已在，二次拿锁被拒', () => {
  const root = makeRoot()
  const lock = join(root, 'a.lock')
  const busy = []
  try {
    assert.equal(acquireRunLock({ lockDir: lock, onBusy: (pid) => busy.push(pid) }), true)
    assert.equal(existsSync(join(lock, 'owner.json')), true, '锁目录出现时必须自带 owner.json')
    assert.equal(ownerFile(lock).pid, process.pid)
    assert.equal(acquireRunLock({ lockDir: lock, onBusy: (pid) => busy.push(pid) }), false)
    assert.deepEqual(busy, [process.pid], '第二实例应看到存活属主')
    assert.equal(ownerFile(lock).pid, process.pid, '第二次尝试不得覆盖属主')
    assert.equal(releaseRunLock(lock), true)
    assert.equal(existsSync(lock), false)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('BUG-073 陈旧锁（死 pid）：宽限后接管，属主变成自己', () => {
  const root = makeRoot()
  const lock = join(root, 'stale.lock')
  try {
    mkdirSync(lock)
    writeFileSync(join(lock, 'owner.json'), JSON.stringify({ pid: 999999, at: new Date().toISOString() }))
    assert.equal(lockOwnerPid(lock), null, '假 pid 必须判死')
    assert.equal(acquireRunLock({ lockDir: lock, onBusy: () => {} }), true)
    assert.equal(ownerFile(lock).pid, process.pid)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('BUG-073 创建窗口（目录在、owner.json 暂缺）：宽限后才接管，不抢跑', () => {
  const root = makeRoot()
  const lock = join(root, 'window.lock')
  try {
    mkdirSync(lock)
    const started = Date.now()
    assert.equal(acquireRunLock({ lockDir: lock, onBusy: () => {} }), true)
    assert.ok(Date.now() - started >= 100, '必须给创建者 ≥100ms 宽限（3×50ms）')
    assert.equal(ownerFile(lock).pid, process.pid)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('BUG-073 释放只动自己的锁：别人存活属主在场时不删', () => {
  const root = makeRoot()
  const lock = join(root, 'owned.lock')
  try {
    mkdirSync(lock)
    writeFileSync(join(lock, 'owner.json'), JSON.stringify({ pid: process.ppid, at: new Date().toISOString() }))
    assert.equal(releaseRunLock(lock), false, '属主是别的存活进程 → 不释放')
    assert.equal(existsSync(lock), true)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

// W2-4 状态/交错矩阵补口（2026-11-13）：owner 文件的坏形态、存活的**外部**属主、释放不存在锁。
// 这三类此前只有「死 pid / 创建窗口 / 自己的锁」三条；坏 JSON 与外部存活属主是 BUG-073 的邻接变体。
test('owner 文件非法/空/0/负/非整数：一律不可作存活属主', () => {
  const root = makeRoot()
  const lock = join(root, 'invalid.lock')
  try {
    mkdirSync(lock)
    for (const body of ['', '{', 'null', '{}', '{"pid":0}', '{"pid":-1}', '{"pid":"x"}', '{"pid":1.5}']) {
      writeFileSync(join(lock, 'owner.json'), body)
      assert.equal(lockOwnerPid(lock), null, `坏 owner 形态被当活属主：${JSON.stringify(body)}`)
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('存活外部属主：拿锁被拒、onBusy 给 pid、owner 文件不被覆盖', () => {
  const root = makeRoot()
  const lock = join(root, 'external.lock')
  try {
    mkdirSync(lock)
    const body = JSON.stringify({ pid: process.ppid, at: new Date().toISOString() })
    writeFileSync(join(lock, 'owner.json'), body)
    const busy = []
    assert.equal(acquireRunLock({ lockDir: lock, onBusy: (pid) => busy.push(pid) }), false)
    assert.deepEqual(busy, [process.ppid], '外部存活属主必须原样报给 onBusy')
    assert.equal(readFileSync(join(lock, 'owner.json'), 'utf8'), body, '失败路径不得改写别人的 owner')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('释放不存在的锁 = 幂等成功（不是「未跑」）', () => {
  const root = makeRoot()
  try {
    assert.equal(releaseRunLock(join(root, 'missing.lock')), true)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
