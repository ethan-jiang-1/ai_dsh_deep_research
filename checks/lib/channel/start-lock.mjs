// Startup ownership: atomic mkdir, no age-based or check-then-delete takeover.
// Missing/malformed owner metadata is busy too. Crash remnants require offline recovery.
import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

/**
 * Acquire one resource until release. All participants must use this protocol;
 * externally deleting/replacing an active lock directory is unsupported.
 * A release consumes its unique identity once and never recursively deletes.
 */
export function acquireStartLock(lockDir, { now = Date.now(), pid = process.pid } = {}) {
  const identity = `owner-${randomUUID()}.json`
  const ownerPath = join(lockDir, identity)
  try {
    mkdirSync(lockDir)
  } catch (error) {
    return { ok: false, reason: error?.code === 'EEXIST'
      ? `另一实例持锁或异常残留（${lockDir}）；禁止在线删除，先停相关进程并核实后离线恢复`
      : `锁创建失败（${lockDir}）：${error.message}`, release: () => false }
  }
  let consumed = false
  const release = () => {
    if (consumed) return false
    consumed = true
    try {
      unlinkSync(ownerPath)
      rmdirSync(lockDir)
      return true
    } catch {
      // Never remove a directory after failing to remove our own identity.
      return false
    }
  }
  try {
    writeFileSync(ownerPath, JSON.stringify({ pid, at: new Date(now).toISOString() }), { flag: 'wx' })
    return { ok: true, release }
  } catch (error) {
    // mkdir succeeded, and no conforming contender can enter this directory.
    try { unlinkSync(ownerPath) } catch {}
    try { rmdirSync(lockDir) } catch {}
    consumed = true
    return { ok: false, reason: `锁 owner 写入失败（${lockDir}）：${error.message}`, release: () => false }
  }
}
