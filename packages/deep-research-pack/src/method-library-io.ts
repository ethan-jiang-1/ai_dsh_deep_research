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

/** 跨进程写锁：wx 创建；陈旧锁（>30s）移除一次后重试；活锁 → 明确冲突。 */
export function withMethodLibraryLock<T>(cwd: string, fn: () => T): T {
  mkdirSync(cwd, { recursive: true })
  const lock = join(cwd, LOCK_FILE)
  const acquire = (retry: boolean): number | null => {
    try {
      const fd = openSync(lock, 'wx', 0o600)
      writeFileSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), 'utf8')
      return fd
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      let age = 0
      try { age = Date.now() - statSync(lock).mtimeMs } catch { age = 0 }
      if (retry && age > LOCK_STALE_MS) { rmSync(lock, { force: true }); return acquire(false) }
      throw new Error('另一个方法库写入正在进行，请稍后重试（未写入）')
    }
  }
  const fd = acquire(true)
  if (fd === null) throw new Error('无法获取方法库写锁')
  closeSync(fd)
  try {
    return fn()
  } finally {
    rmSync(lock, { force: true })
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
