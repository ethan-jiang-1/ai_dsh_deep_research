// checks/lib/channel/channel-cache.mjs —— run 通道启动加速的两块缓存判据 + 薄 I/O。
//
// 为什么存在（2026-11-05 实测）：`node tools/channel/run-driver.mjs up` 热复用路径 ~21.5s，其中
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
import { existsSync, mkdirSync, readdirSync, readFileSync, readlinkSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { isMain } from '../shared/cli-entry.mjs'

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
  // 内容哈希优先（BUG-298）；symlink 目标也入键（BUG-318）；旧条目无 sha256 时回退。
  const lines = [...entries].map((e) => `${e.rel}\0${e.link ?? ''}\0${e.sha256 ?? `${e.size}\0${Math.trunc(e.mtimeMs)}`}`).sort()
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
    else if (entry.isSymbolicLink()) {
      const abs = join(root, childRel)
      const link = readlinkSync(abs)
      let sha256 = ''
      try { sha256 = createHash('sha256').update(readFileSync(abs)).digest('hex') } catch { sha256 = '' }
      out.push({ rel: childRel, size: 0, mtimeMs: 0, sha256, link })
    } else if (entry.isFile()) {
      const stat = statSync(join(root, childRel))
      const sha256 = createHash('sha256').update(readFileSync(join(root, childRel))).digest('hex')
      out.push({ rel: childRel, size: stat.size, mtimeMs: stat.mtimeMs, sha256 })
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
  writeJsonAtomic(path, { key, files })
}

/**
 * 探针缓存键 = pack 源指纹 + runtime 构建指纹 + dev 外壳指纹（可带 web 进程身份）。
 * 冷启动同样要能命中（同 pack + 同 runtime 的页面内容不变），故默认 **不带 pid**；
 * 需要进程内绑定时传 `pids`。
 * @param {{pids?: string[]|number[]|null, packFingerprint: string, runtime?: string}} input
 * @returns {string}
 */
export function probeCacheKey({ pids = null, packFingerprint: fingerprint, runtime = 'unknown', extra = '' }) {
  const pidPart = pids === null || pids === undefined ? 'any' : [...pids].map(String).sort().join(',')
  const extraPart = extra === '' || extra === null || extra === undefined ? '' : `@${extra}`
  return `${pidPart}@${fingerprint}@${runtime}${extraPart}`
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

/**
 * 本地 import 闭包哈希（BUG-259）：从入口文件出发，递归跟随相对 import/export-from/动态 import，
 * 把每个文件的相对路径 + 内容纳入 sha256。探针断言/缓存键实现自身变化 → 键变化 → miss。
 * 只跟随**相对** specifier（node:/包名不展开；它们不在本仓探针逻辑里）。
 * @param {{ root: string, entry: string, read: (rel: string) => string, exists: (rel: string) => boolean }} input
 * @returns {string} 16 字符 hex
 */
export function importClosureHash({ root, entry, read, exists }) {
  const seen = new Set()
  const files = []
  const resolveSpec = (fromRel, spec) => {
    const base = join(root, dirname(fromRel), spec)
    const candidates = [base, `${base}.mjs`, `${base}.js`, `${base}.ts`, join(base, 'index.mjs'), join(base, 'index.js'), join(base, 'index.ts')]
    for (const candidate of candidates) {
      const rel = candidate.startsWith(`${root}/`) || candidate === root ? candidate.slice(root.length + 1) : candidate
      if (exists(rel)) return rel.split('\\').join('/')
    }
    return null
  }
  const walk = (rel) => {
    if (seen.has(rel)) return
    seen.add(rel)
    let text
    try { text = read(rel) } catch { return }
    files.push({ rel, text })
    for (const m of text.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g)) {
      const target = resolveSpec(rel, m[1])
      if (target !== null) walk(target)
    }
  }
  walk(entry)
  const hash = createHash('sha256')
  for (const file of [...files].sort((a, b) => a.rel.localeCompare(b.rel))) {
    hash.update(file.rel).update('\0').update(file.text).update('\0')
  }
  return hash.digest('hex').slice(0, 16)
}

/** 盘上入口的 import 闭包哈希（run-driver 用；入口相对库根）。 */
export function probeSourceFingerprint(root, entry = 'tools/channel/run-driver.mjs') {
  return importClosureHash({
    root,
    entry,
    read: (rel) => readFileSync(join(root, rel), 'utf8'),
    exists: (rel) => existsSync(join(root, rel)),
  })
}

/** probe 身份（BUG-296/297/299）：profile/bootstrap/workspace 必须进缓存键。 */
export function probeIdentityOf({ profile, bootstrap = false, workspace = '', mcp = '' }) {
  return [profile ?? '', bootstrap ? '1' : '0', workspace ?? '', mcp ?? ''].join('|')
}

/**
 * probe 缓存键的唯一构造器（BUG-327）：读与写必须用同一个函数。
 * 旧实现两处内联，写侧漏了 mcp——MCP=on 写的 GREEN 被 MCP=off 命中。
 */
export function probeCacheKeyOf({
  packFingerprint,
  runtime,
  devShell,
  probeSource,
  profile,
  bootstrap = false,
  workspace = '',
  mcp = '',
  expectFace = null,
  requireData = false,
}) {
  const identity = probeIdentityOf({ profile, bootstrap, workspace, mcp })
  return `${probeCacheKey({ packFingerprint, runtime, extra: `${devShell}:${probeSource}:${identity}` })}|${expectFace ?? ''}|${requireData ? '1' : '0'}`
}

/** 原子写 JSON（BUG-319）：同目录临时文件 + rename，读方不会看到半文件。 */
export function writeJsonAtomic(path, value) {
  const tmp = path + '.' + process.pid + '.' + Math.random().toString(36).slice(2) + '.tmp'
  writeFileSync(tmp, JSON.stringify(value, null, 2))
  renameSync(tmp, path)
}
