// start-lock.mjs — 启动互斥（BUG-309 / 310；keyless 纯 fs）。
//
// `run-driver up` / `boot-run.sh` 都是“先判空闲、再启动”；两个进程可同时看到空闲并竞争同一
// 端口/状态根。本模块提供原子 mkdir 锁 + pid/时间戳 + stale 回收；CLI 用同一文案 fail-loud。
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** 锁目录的默认 stale 上限（10 分钟；启动失败/进程被杀留下时由下一位回收）。 */
export const START_LOCK_STALE_MS = 10 * 60 * 1000

/**
 * 获取启动锁。
 * @returns {{ ok: boolean, reason?: string, release: () => void }}
 */
export function acquireStartLock(lockDir, { now = Date.now(), staleMs = START_LOCK_STALE_MS, pid = process.pid } = {}) {
  const ownerPath = join(lockDir, 'owner.json')
  const tryCreate = () => {
    try {
      mkdirSync(lockDir)
      writeFileSync(ownerPath, JSON.stringify({ pid, at: new Date(now).toISOString() }))
      return { ok: true, release: () => rmSync(lockDir, { recursive: true, force: true }) }
    } catch (error) {
      if (error?.code !== 'EEXIST') return { ok: false, reason: `锁创建失败：${String(error?.message ?? error)}`, release: () => {} }
      return null
    }
  }
  let created = tryCreate()
  if (created !== null) return created
  let stale = false
  try {
    const owner = JSON.parse(readFileSync(ownerPath, 'utf8'))
    const at = Date.parse(owner.at)
    stale = !Number.isFinite(at) || now - at > staleMs
  } catch { stale = true }
  if (stale) {
    rmSync(lockDir, { recursive: true, force: true })
    created = tryCreate()
    if (created !== null) return created
  }
  return { ok: false, reason: `另一实例持锁（${lockDir}）；确认无实例后可删除该目录重试`, release: () => {} }
}
