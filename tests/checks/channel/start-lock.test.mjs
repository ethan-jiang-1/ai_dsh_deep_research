// start-lock.test.mjs — 启动互斥（BUG-309 / 310；keyless）。
//
// 负例留证：2026-11-20 旧实现活 owner 超龄接管红（exit 1）；
// 同一旧 release 在下一代 acquire 后再次执行会删除新锁。恢复 TTL 或 recursive rm 均须红。
import { test, mock } from 'node:test'
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { acquireStartLock } from '../../../checks/lib/channel/start-lock.mjs'

// 负例留证 2026-11-20：BUG-309——用 runtime/smoke-workspace/preventive-quality/start-lock.baseline.mjs 跑本性质组 exit 1（超龄活 owner 被接管）。
// 负例留证 2026-11-20：BUG-310——checks/smoke/channel-start.e2e.mjs 的 bypass-wrapper 真实变异 exit 1；helper 单测不证明公开入口参与。

test('启动锁：互斥、正常 release，活 owner 超龄仍不失权（BUG-309 / BUG-310）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'start-lock-'))
  const lock = join(dir, 'lock')
  try {
    const a = acquireStartLock(lock, { now: 1000 })
    assert.equal(a.ok, true)
    const b = acquireStartLock(lock, { now: 1000 })
    assert.equal(b.ok, false)
    assert.match(b.reason, /另一实例持锁/)
    a.release()
    const c = acquireStartLock(lock, { now: 1000 })
    assert.equal(c.ok, true)
    c.release()
    const stale = acquireStartLock(lock, { now: 1000 })
    assert.equal(stale.ok, true)
    const reclaimed = acquireStartLock(lock, { now: 1000 + 11 * 60 * 1000 })
    assert.equal(reclaimed.ok, false, '存活 owner 不因年龄失去启动权')
    stale.release()
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

const withLock = (check) => {
  const dir = mkdtempSync(join(tmpdir(), 'start-owner-'))
  try { check(join(dir, 'lock')) } finally { rmSync(dir, { recursive: true, force: true }) }
}

test('旧 release 重复调用不触碰后来取得者', () => withLock((lock) => {
  const first = acquireStartLock(lock)
  assert.equal(first.ok, true)
  assert.equal(first.release(), true)
  const second = acquireStartLock(lock)
  assert.equal(second.ok, true)
  const files = readdirSync(lock)
  const owner = readFileSync(join(lock, files[0]), 'utf8')
  assert.equal(first.release(), false)
  assert.deepEqual(readdirSync(lock), files)
  assert.equal(readFileSync(join(lock, files[0]), 'utf8'), owner)
  assert.equal(acquireStartLock(lock).ok, false)
  assert.equal(second.release(), true)
}))

test('缺失、损坏或死亡 owner 的残留一律拒绝在线接管', () => withLock((lock) => {
  mkdirSync(lock)
  assert.equal(acquireStartLock(lock).ok, false)
  writeFileSync(join(lock, 'owner.json'), '{broken')
  assert.equal(acquireStartLock(lock).ok, false)
  writeFileSync(join(lock, 'owner.json'), JSON.stringify({ pid: 2147483647, at: '1970-01-01' }))
  assert.equal(acquireStartLock(lock, { now: Date.now() + 1e12 }).ok, false)
  assert.equal(existsSync(lock), true)
}))

test('owner 写入失败不报成功；回滚只删除自己的空目录', () => withLock((lock) => {
  const write = mock.method(fs, 'writeFileSync', () => {
    const error = new Error('injected owner write failure')
    error.code = 'EIO'
    throw error
  })
  syncBuiltinESMExports()
  let failed
  try { failed = acquireStartLock(lock) } finally {
    write.mock.restore()
    syncBuiltinESMExports()
  }
  assert.equal(failed.ok, false)
  assert.match(failed.reason, /owner 写入失败/)
  assert.equal(existsSync(lock), false)
  const valid = acquireStartLock(lock)
  assert.equal(valid.ok, true)
  assert.equal(valid.release(), true)
}))

test('未知目录内容阻止清理；release 不递归删除其他状态', () => withLock((lock) => {
  const owned = acquireStartLock(lock)
  assert.equal(owned.ok, true)
  writeFileSync(join(lock, 'external-evidence'), 'retain')
  assert.equal(owned.release(), false)
  assert.equal(readFileSync(join(lock, 'external-evidence'), 'utf8'), 'retain')
  assert.equal(acquireStartLock(lock).ok, false)
}))
