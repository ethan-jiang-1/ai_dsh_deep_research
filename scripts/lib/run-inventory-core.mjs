// run-inventory-core.mjs — 只读保留期视图的纯折算（不读盘、不删除）。
//
// 为什么存在：run bundle 是用户数据，没有自动 GC；用户需要先看见「有多少、多大、最老多久」
// 才能决定删哪些。本模块只算，不做删除——删除始终是用户显式动作。
const DAY = 24 * 60 * 60 * 1000

/**
 * 折算一组 run bundle 的规模与年龄。
 * @param {{now?: number, runs: Array<{slug: string, bucket: string, files: Array<{size: number, mtimeMs: number}>}>}} input
 * @returns {{runs: Array<{slug:string,bucket:string,files:number,bytes:number,oldestMtimeMs:number|null,newestMtimeMs:number|null,ageDays:number|null}>, totals:{runs:number,files:number,bytes:number}, oldestMtimeMs:number|null}}
 */
export function summarizeRuns({ now = Date.now(), runs }) {
  const out = runs.map((run) => {
    const files = Array.isArray(run.files) ? run.files : []
    const bytes = files.reduce((sum, file) => sum + (Number.isFinite(file.size) ? file.size : 0), 0)
    const times = files.map((file) => file.mtimeMs).filter((value) => Number.isFinite(value))
    const oldest = times.length === 0 ? null : Math.min(...times)
    const newest = times.length === 0 ? null : Math.max(...times)
    return {
      slug: run.slug,
      bucket: run.bucket,
      files: files.length,
      bytes,
      oldestMtimeMs: oldest,
      newestMtimeMs: newest,
      ageDays: oldest === null ? null : Math.max(0, Math.floor((now - oldest) / DAY)),
    }
  })
  out.sort((a, b) => (a.oldestMtimeMs ?? Infinity) - (b.oldestMtimeMs ?? Infinity) || a.slug.localeCompare(b.slug))
  const totals = {
    runs: out.length,
    files: out.reduce((sum, run) => sum + run.files, 0),
    bytes: out.reduce((sum, run) => sum + run.bytes, 0),
  }
  const oldestMtimeMs = out.reduce((min, run) => (run.oldestMtimeMs === null ? min : Math.min(min, run.oldestMtimeMs)), Infinity)
  return { runs: out, totals, oldestMtimeMs: Number.isFinite(oldestMtimeMs) ? oldestMtimeMs : null }
}

/** 人类可读字节（1024 进制，一位小数；B 不带小数）。 */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GiB`
}

/** 年龄（天）；null = 未知。 */
export function formatAge(days) {
  if (!Number.isFinite(days)) return '—'
  if (days <= 0) return '今天'
  if (days < 365) return `${String(days)} 天`
  return `${(days / 365).toFixed(1)} 年`
}
