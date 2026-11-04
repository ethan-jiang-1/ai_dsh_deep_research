// runtime-clean-core.mjs — 运行区清理的纯判据（keyless；不做 I/O、不删任何东西）。
//
// 为什么有它：runtime/ 是 gitignored 运行态，没有索引义务也没有自动 GC；smoke/probe 产物
// 长期累积（2026-11-04 盘点 697M）。但“能删”必须窄：活跃 dev home（harness-home）与 run
// bundle（research-workspace）绝不在此列。本模块只回答“哪些白名单条目已过保留期”，
// 删除动作与安全边界归 CLI 壳（scripts/run-ops/runtime-clean.mjs）。
//
// 判据：
// - 容器根 smoke-workspace / scenes：候选 = 其**直接子项**（不删容器本身）；
// - 独立实验根：field-sim* / probe-* / explore-* / spike-* / research-tmp / ab-prompts /
//   gate-out / audit / repair-backup：候选 = 该顶层目录本身；
// - 其余（harness-home、README、未知名）永不候选；
// - symlink 一律不候选（不跟随、不删链接指向）；mtime 不可读 → 不候选；
// - 保留期按**子树最新 mtime**：只有整棵子树都早于 cutoff 才删，防“目录旧但里面刚写了文件”。

const DAY_MS = 86_400_000
const CONTAINER_ROOTS = new Set(['smoke-workspace', 'scenes'])
const STANDALONE_ROOTS = /^(?:field-sim\d*|probe-[a-z0-9][a-z0-9-]*|explore-[a-z0-9][a-z0-9-]*|spike-[a-z0-9][a-z0-9-]*|research-tmp|ab-prompts|gate-out|audit|repair-backup)$/

/**
 * 分类一个 runtime 相对路径；null = 永不候选。
 * @param {string} relPath
 * @returns {'container-child'|'standalone'|null}
 */
export function classifyRuntimePath(relPath) {
  if (typeof relPath !== 'string' || relPath === '') return null
  const normalized = relPath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '')
  if (normalized.startsWith('/') || normalized.includes('\0')) return null
  const parts = normalized.split('/')
  if (parts.some((part) => part === '' || part === '.' || part === '..')) return null
  if (parts.length === 1) return STANDALONE_ROOTS.test(parts[0]) ? 'standalone' : null
  if (parts.length === 2 && CONTAINER_ROOTS.has(parts[0]) && !parts[1].startsWith('.')) return 'container-child'
  return null
}

/**
 * @typedef {{ relPath: string, sizeBytes?: number, newestMtimeMs: number, symlink?: boolean }} RuntimeEntry
 * @typedef {{ relPath: string, sizeBytes: number, newestMtimeMs: number, reason?: string }} PlannedEntry
 */

/**
 * 纯规划：把候选分为 remove / keep；不触盘。
 * @param {readonly RuntimeEntry[]} entries
 * @param {{ now?: number, olderThanDays?: number }} [options]
 * @returns {{ cutoff: number, remove: PlannedEntry[], keep: PlannedEntry[], removeBytes: number }}
 */
export function planRuntimeCleanup(entries, { now = Date.now(), olderThanDays = 14 } = {}) {
  if (!Array.isArray(entries)) throw new Error('runtime-clean: entries 必须是数组')
  if (!Number.isFinite(now)) throw new Error('runtime-clean: now 必须是有限数')
  if (!Number.isFinite(olderThanDays) || olderThanDays < 0) throw new Error('runtime-clean: olderThanDays 必须是非负有限数')
  const cutoff = now - olderThanDays * DAY_MS
  const remove = []
  const keep = []
  for (const entry of entries) {
    if (entry === null || typeof entry !== 'object') throw new Error('runtime-clean: entry 必须是对象')
    const relPath = typeof entry.relPath === 'string' ? entry.relPath : String(entry.relPath ?? '')
    const planned = {
      relPath,
      sizeBytes: Number.isFinite(entry.sizeBytes) && entry.sizeBytes > 0 ? entry.sizeBytes : 0,
      newestMtimeMs: entry.newestMtimeMs,
    }
    if (classifyRuntimePath(relPath) === null) {
      keep.push({ ...planned, reason: 'not-allowlisted' })
      continue
    }
    if (entry.symlink === true) {
      keep.push({ ...planned, reason: 'symlink' })
      continue
    }
    if (!Number.isFinite(entry.newestMtimeMs)) {
      keep.push({ ...planned, reason: 'unknown-mtime' })
      continue
    }
    if (entry.newestMtimeMs >= cutoff) {
      keep.push({ ...planned, reason: 'newer-than-cutoff' })
      continue
    }
    remove.push({ ...planned, reason: 'older-than-cutoff' })
  }
  remove.sort((a, b) => a.relPath.localeCompare(b.relPath))
  keep.sort((a, b) => a.relPath.localeCompare(b.relPath))
  return { cutoff, remove, keep, removeBytes: remove.reduce((sum, entry) => sum + entry.sizeBytes, 0) }
}
