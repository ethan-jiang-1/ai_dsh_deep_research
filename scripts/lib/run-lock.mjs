// run-lock.mjs — 冒烟脚本的进程级运行锁（同 DSH_HOME/工作区的脚本互斥；陈旧锁可接管）。
//
// 为什么单独成模块：snapshot-replay 与 client-load 共享同一 dev home 与端口族，两实例并发会
// 互杀 web / 争用检索 API；锁语义（存活拒跑、死锁接管、释放）必须一份，不能各抄一份。
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** 锁属主 pid；锁不在/坏 JSON/pid 非法 → null；EPERM 视为仍然存活（多用户机器不接管）。 */
export function lockOwnerPid(lockDir) {
  try {
    const pid = Number(JSON.parse(readFileSync(join(lockDir, 'owner.json'), 'utf8'))?.pid)
    if (!Number.isInteger(pid) || pid <= 0) return null
    try { process.kill(pid, 0) } catch (error) { if (error.code !== 'EPERM') return null }
    return pid
  } catch {
    return null
  }
}

/** 释放锁（幂等）。 */
export function releaseRunLock(lockDir) {
  rmSync(lockDir, { recursive: true, force: true })
}

/**
 * 拿锁；失败时调用 onBusy(ownerPid|null) 并返回 false（调用方决定 exit 2）。
 * `onBusy(null)` = 陈旧锁且接管失败（人工删除）；`onBusy(pid)` = 另一实例在跑。
 * @param {{lockDir: string, onBusy: (pid: number|null) => void}} input
 * @returns {boolean}
 */
export function acquireRunLock({ lockDir, onBusy }) {
  const attempt = (retry) => {
    try {
      mkdirSync(lockDir)
      writeFileSync(join(lockDir, 'owner.json'), JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), 'utf8')
      return true
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      const pid = lockOwnerPid(lockDir)
      if (pid !== null) { onBusy(pid); return false }
      if (!retry) { onBusy(null); return false }
      rmSync(lockDir, { recursive: true, force: true })
      return attempt(false)
    }
  }
  return attempt(true)
}
