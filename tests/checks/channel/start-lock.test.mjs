// start-lock.test.mjs — 启动互斥（BUG-309 / 310；keyless）。
//
// 负例留证 2026-11-19：BUG-309 / BUG-310——第二个 acquire 必须失败；release 后可再取；stale 锁可回收。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { acquireStartLock } from '../../../checks/lib/channel/start-lock.mjs'

test('启动锁：互斥、release、stale 回收（BUG-309 / BUG-310）', () => {
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
    assert.equal(reclaimed.ok, true)
    reclaimed.release()
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
