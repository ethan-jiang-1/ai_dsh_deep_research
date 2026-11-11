// run-lock.mjs — 冒烟脚本的进程级运行锁（同 DSH_HOME/工作区的脚本互斥；陈旧锁可接管）。
//
// 原子性（BUG-073）：锁目录必须**自带 owner.json 一次出现**——先在 `<lock>.tmp-<pid>-<rand>` 写好
// owner.json，再 `rename` 成锁目录（POSIX 目录 rename 对非空目标是原子失败）。绝不允许
// 「mkdir 后补写 owner.json」的两步窗口：那会被并发者读成「属主未知 = 陈旧」而接管。
// 目录已存在但 owner.json 缺席 → 先宽限 3×50ms（创建中），仍缺席才按陈旧处理。
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

const GRACE_MS = 50
const GRACE_TRIES = 3

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

/** 同 lockOwnerPid，但对「目录在、owner.json 暂缺」给创建者宽限；仍缺 → null（陈旧）。 */
function ownerPidWithGrace(lockDir) {
  let pid = lockOwnerPid(lockDir)
  if (pid !== null || !existsSync(lockDir)) return pid
  for (let i = 0; i < GRACE_TRIES; i += 1) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, GRACE_MS)
    pid = lockOwnerPid(lockDir)
    if (pid !== null || !existsSync(lockDir)) return pid
  }
  return null
}

/** 释放锁（幂等；只释放自己的锁——属主是别的存活 pid 时不动）。 */
export function releaseRunLock(lockDir) {
  const pid = lockOwnerPid(lockDir)
  if (pid !== null && pid !== process.pid) return false
  rmSync(lockDir, { recursive: true, force: true })
  return true
}

/**
 * 拿锁；失败时调用 onBusy(ownerPid|null) 并返回 false（调用方决定 exit 2）。
 * `onBusy(null)` = 陈旧锁且接管失败（人工删除）；`onBusy(pid)` = 另一实例在跑。
 * @param {{lockDir: string, onBusy: (pid: number|null) => void}} input
 * @returns {boolean}
 */
export function acquireRunLock({ lockDir, onBusy }) {
  const candidate = `${lockDir}.tmp-${process.pid}-${randomUUID()}`
  const cleanupCandidate = () => rmSync(candidate, { recursive: true, force: true })
  try {
    // 1) 候选锁自带 owner.json。
    mkdirSync(candidate, { recursive: true })
    writeFileSync(join(candidate, 'owner.json'), JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), 'utf8')
    // 2) 已存在的锁：存活 → busy；宽限后仍无属主 → 陈旧，移除。
    if (existsSync(lockDir)) {
      const pid = ownerPidWithGrace(lockDir)
      if (pid !== null) { cleanupCandidate(); onBusy(pid); return false }
      rmSync(lockDir, { recursive: true, force: true })
    }
    // 3) 原子出现：rename 对非空目标失败（EEXIST/ENOTEMPTY），不会覆盖别人的 owner.json。
    renameSync(candidate, lockDir)
    const owner = JSON.parse(readFileSync(join(lockDir, 'owner.json'), 'utf8'))
    if (owner?.pid !== process.pid) {
      // 写后复核：不是我的锁 → 不带着别人的锁继续。
      cleanupCandidate()
      onBusy(lockOwnerPid(lockDir))
      return false
    }
    cleanupCandidate()
    return true
  } catch (error) {
    cleanupCandidate()
    if (error?.code === 'EEXIST' || error?.code === 'ENOTEMPTY' || error?.code === 'EISDIR' || error?.code === 'EPERM') {
      onBusy(lockOwnerPid(lockDir))
      return false
    }
    throw error
  }
}
