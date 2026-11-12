/**
 * method-library-io.ts — 方法库文件的**安全写入**接缝（host 半）。
 *
 * 三条合同（对应三张缺陷卡）：
 *   · symlink / 目录目标一律拒绝，realpath 必须仍在 cwd 内（BUG-111）；
 *   · 同目录 temp + fsync + rename 原子替换，崩溃不截断用户库（BUG-098）；
 *   · 读-改-写持有跨进程锁 `.method-library.lock`，并发写者明确冲突而非静默覆盖（BUG-097）。
 * 纯折算仍住 method-library-write.ts；本件只管文件边界。
 */
import {
  closeSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs'
import { randomUUID } from 'node:crypto'
import { basename, dirname, join, sep } from 'node:path'

export const LIBRARY_FILE = 'method-library.md'
const LOCK_FILE = '.method-library.lock'
const LOCK_STALE_MS = 30_000

/** 安全目标：拒绝 symlink/非普通文件；realpath 必须在 cwd 内。 */
export function safeMethodLibraryPath(cwd: string): string {
  mkdirSync(cwd, { recursive: true })
  const path = join(cwd, LIBRARY_FILE)
  let st
  try { st = lstatSync(path) } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return path
    throw error
  }
  if (st.isSymbolicLink()) throw new Error(`${LIBRARY_FILE} 是 symlink，拒绝读写（工作区文件必须是普通文件）`)
  if (!st.isFile()) throw new Error(`${LIBRARY_FILE} 不是普通文件，拒绝读写`)
  if (st.nlink > 1) throw new Error(`${LIBRARY_FILE} 是 hardlink（nlink=${st.nlink}），拒绝读写——方法库必须是工作区独立文件`)
  const base = realpathSync(cwd)
  const real = realpathSync(path)
  if (real !== base && !real.startsWith(`${base}${sep}`)) throw new Error(`${LIBRARY_FILE} 解析到工作区外，拒绝读写`)
  return path
}

/** 读库（missing = 空库）；目标不安全时抛错。 */
export function readLibraryFile(cwd: string): string {
  const path = safeMethodLibraryPath(cwd)
  try {
    return readFileSync(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''
    throw error
  }
}

/** 同目录原子写：temp（wx）→ fsync → rename；失败清理 temp，旧文件保持完整。 */
export function writeLibraryFileAtomic(cwd: string, text: string): void {
  const path = safeMethodLibraryPath(cwd)
  const temp = join(dirname(path), `.${basename(path)}.tmp-${process.pid}-${randomUUID()}`)
  let fd
  try {
    fd = openSync(temp, 'wx', 0o600)
    writeFileSync(fd, text, 'utf8')
    fsyncSync(fd)
  } catch (error) {
    if (fd !== undefined) try { closeSync(fd) } catch { /* ignore */ }
    rmSync(temp, { force: true })
    throw error
  }
  closeSync(fd)
  try {
    renameSync(temp, path)
  } catch (error) {
    rmSync(temp, { force: true })
    throw error
  }
}

/** 锁属主存活：ESRCH = 死；EPERM = 活（无权限也视为活，不接管）。 */
function pidAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true } catch (error) { return (error as NodeJS.ErrnoException).code === 'EPERM' }
}

interface LockOwner { readonly pid?: unknown; readonly token?: unknown; readonly at?: unknown }

function lockOwnerOf(lock: string): LockOwner | null {
  try { return JSON.parse(readFileSync(lock, 'utf8')) as LockOwner } catch { return null }
}

/** 跨进程写锁：token 属主 + pid 存活；只有「死 pid 且超龄」或坏锁超龄才接管（BUG-114/126）。 */
export function withMethodLibraryLock<T>(cwd: string, fn: () => T): T {
  mkdirSync(cwd, { recursive: true })
  const lock = join(cwd, LOCK_FILE)
  const token = randomUUID()
  const acquire = (retry: boolean): boolean => {
    try {
      const fd = openSync(lock, 'wx', 0o600)
      writeFileSync(fd, JSON.stringify({ pid: process.pid, token, at: new Date().toISOString() }), 'utf8')
      closeSync(fd)
      return true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      const owner = lockOwnerOf(lock)
      const pid = typeof owner?.pid === 'number' ? owner.pid : null
      const age = (() => { try { return Date.now() - statSync(lock).mtimeMs } catch { return Infinity } })()
      // 活 pid：无论 mtime 多旧都不接管（长写/暂停不是死亡）。
      if (pid !== null && pidAlive(pid)) throw new Error('另一个方法库写入正在进行，请稍后重试（未写入）')
      if (retry && (pid === null ? age > LOCK_STALE_MS : true)) {
        rmSync(lock, { force: true })
        return acquire(false)
      }
      throw new Error('另一个方法库写入正在进行，请稍后重试（未写入）')
    }
  }
  if (!acquire(true)) throw new Error('无法获取方法库写锁')
  try {
    return fn()
  } finally {
    // 只删自己的锁：陈旧接管后旧 owner 的 finally 不得删新 owner 的锁（BUG-114）。
    if (lockOwnerOf(lock)?.token === token) rmSync(lock, { force: true })
  }
}

/** 读-改-写一体：锁内读、改、原子写、回读；next === before 时不写。 */
export function mutateMethodLibrary<T>(cwd: string, mutate: (text: string) => { readonly text: string; readonly value: T }): { readonly before: string; readonly after: string; readonly value: T } {
  return withMethodLibraryLock(cwd, () => {
    const before = readLibraryFile(cwd)
    const { text, value } = mutate(before)
    if (text !== before) writeLibraryFileAtomic(cwd, text)
    return { before, after: text === before ? before : readLibraryFile(cwd), value }
  })
}
