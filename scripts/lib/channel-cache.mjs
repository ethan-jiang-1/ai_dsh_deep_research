// scripts/lib/channel-cache.mjs —— run 通道启动加速的两块缓存判据 + 薄 I/O。
//
// 为什么存在（2026-11-05 实测）：`node dev/run-driver.mjs up` 热复用路径 ~21.5s，其中
//   · 镜像漂移门 5.1s —— 大头是每次重跑 `npm pack --dry-run` 拿发布清单；
//   · 浏览器探针 12.0s —— 起 Chrome + 打开研究状态页签。
// 两者的输入在同一 pack 源 + 同一 runtime 构建下不变，故可缓存：漂移门缓存发布清单（键 = pack 源
// 指纹），run-driver 缓存**最近一次 GREEN**（键 = pack 指纹 + runtime 构建指纹，TTL 30 分钟）；
// 冷启动同样可命中（页面内容由 pack + runtime 决定），命中前仍要求 boot 出横幅 + 一次 HTTP 就绪检查。
//
// 纪律（缓存不改变判据，只省重复计算）：
//   · 只缓存 GREEN——NOT-RUN / 红从不入缓存（未跑 ≠ 通过）；
//   · 键必须含身份：pack 源或 runtime 构建改动一律 miss；`--force-probe` 永久绕过；
//   · `probe` 子命令永远真验。
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { isMain } from './cli-entry.mjs'

/** 目录遍历时跳过的噪声（不属于 pack 源内容）。 */
const SKIP_DIRS = new Set(['node_modules', '.git'])

/** 缺省缓存 TTL：30 分钟（身份 = pack 源 + runtime 构建；超时或身份变化即重验）。 */
export const PROBE_CACHE_TTL_MS = 30 * 60 * 1000

/**
 * pack 源指纹：把 `[{rel,size,mtimeMs}]` 排序后哈希。
 * @param {Array<{rel: string, size: number, mtimeMs: number}>} entries
 * @returns {string} sha256 hex
 */
export function packFingerprint(entries) {
  const lines = [...entries].map((e) => `${e.rel}\0${e.size}\0${Math.trunc(e.mtimeMs)}`).sort()
  return createHash('sha256').update(lines.join('\n')).digest('hex')
}

/**
 * 遍历 pack 源目录，收集参与指纹的文件条目（跳过 node_modules/.git）。
 * @param {string} root
 * @param {string} [rel]
 * @param {Array<{rel: string, size: number, mtimeMs: number}>} [out]
 * @returns {Array<{rel: string, size: number, mtimeMs: number}>}
 */
export function collectPackEntries(root, rel = '', out = []) {
  for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const childRel = rel === '' ? entry.name : `${rel}/${entry.name}`
    if (entry.isDirectory()) collectPackEntries(root, childRel, out)
    else if (entry.isFile()) {
      const stat = statSync(join(root, childRel))
      out.push({ rel: childRel, size: stat.size, mtimeMs: stat.mtimeMs })
    }
  }
  return out
}

/**
 * 读发布清单缓存；键不匹配/损坏即 null（调用方回退到真跑 npm pack）。
 * @param {string} path
 * @param {string} key
 * @returns {string[]|null}
 */
export function readShippedCache(path, key) {
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'))
    if (data?.key !== key || !Array.isArray(data.files)) return null
    return data.files.filter((f) => typeof f === 'string' && f !== '')
  } catch {
    return null
  }
}

/**
 * 写发布清单缓存。
 * @param {string} path
 * @param {string} key
 * @param {string[]} files
 */
export function writeShippedCache(path, key, files) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify({ key, files }, null, 2))
}

/**
 * 探针缓存键 = pack 源指纹 + runtime 构建指纹（可带 web 进程身份）。
 * 冷启动同样要能命中（同 pack + 同 runtime 的页面内容不变），故默认 **不带 pid**；
 * 需要进程内绑定时传 `pids`。
 * @param {{pids?: string[]|number[]|null, packFingerprint: string, runtime?: string}} input
 * @returns {string}
 */
export function probeCacheKey({ pids = null, packFingerprint: fingerprint, runtime = 'unknown' }) {
  const pidPart = pids === null || pids === undefined ? 'any' : [...pids].map(String).sort().join(',')
  return `${pidPart}@${fingerprint}@${runtime}`
}

/**
 * 缓存是否可用：键相等 + 上次是 GREEN + 在 TTL 内且时间戳可解析。
 * @param {{entry: any, key: string, now: number, ttlMs?: number}} input
 * @returns {{hit: boolean, ageMs: number|null}}
 */
export function probeCacheHit({ entry, key, now, ttlMs = PROBE_CACHE_TTL_MS }) {
  if (entry === null || typeof entry !== 'object') return { hit: false, ageMs: null }
  if (entry.key !== key || entry.level !== 'GREEN') return { hit: false, ageMs: null }
  const at = Date.parse(entry.at)
  if (!Number.isFinite(at)) return { hit: false, ageMs: null }
  const ageMs = now - at
  if (ageMs < 0 || ageMs > ttlMs) return { hit: false, ageMs }
  return { hit: true, ageMs }
}

// ── CLI（boot-run.sh 消费）──────────────────────────────────────────────────
//   fingerprint <packDir>                 打印 pack 源指纹
//   read <cachePath> <key>                命中则逐行打印发布清单；miss/损坏 exit 1
//   save <cachePath> <key>                从 stdin 读逐行清单并写缓存
const isCli = isMain(import.meta.url)
if (isCli) {
  const [cmd, ...rest] = process.argv.slice(2)
  if (cmd === 'fingerprint' && rest[0] !== undefined) {
    process.stdout.write(`${packFingerprint(collectPackEntries(rest[0]))}\n`)
  } else if (cmd === 'read' && rest[0] !== undefined && rest[1] !== undefined) {
    const files = readShippedCache(rest[0], rest[1])
    if (files === null) process.exit(1)
    process.stdout.write(`${files.join('\n')}\n`)
  } else if (cmd === 'save' && rest[0] !== undefined && rest[1] !== undefined) {
    const files = readFileSync(0, 'utf8').split('\n').filter((line) => line !== '')
    writeShippedCache(rest[0], rest[1], files)
  } else {
    console.error('usage: channel-cache.mjs fingerprint <packDir> | read <cachePath> <key> | save <cachePath> <key>')
    process.exit(2)
  }
}
