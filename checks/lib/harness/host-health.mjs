// host-health.mjs — 真浏览器冒烟的主机健康判据（失败归因的纯函数）。
//
// 为什么存在：2026-11-10 复跑 client-load 时，主机 load 12.03 / free 272MB，DSH server 在
// 断言中途死亡；浏览器侧只看到 `chrome-error://chromewebdata/` 与
// `net::ERR_CONNECTION_REFUSED`，脚本按断言红 exit 1。现场 meta 已带主机快照，但退出码仍把
// "环境红"混成"产品红"。本模块把该判断从现场描述提升为可测试的判据，由 client-load 在
// 连接死亡且主机不健康时收口为 NOT-RUN（exit 2）——未跑 ≠ 通过，也不伪造产品红。
//
// 边界：只判主机资源，不判产品；健康主机上出现连接死亡仍按产品红 exit 1。

/** 默认阈值：**可用内存** < 512MB 或 load1 / CPU > 1.5 视为不健康。
 *  `freeMB` 字段名保留（调用方与测试契约），语义 = 平台可回收的可用内存：
 *  macOS = vm_stat 的 free + inactive + speculative + purgeable；Linux = /proc/meminfo 的
 *  MemAvailable（回退 MemFree+Buffers+Cached）。直接拿 `os.freemem()` 会只算 free pages，
 *  在 macOS 上系统性偏严（BUG-060）。 */
export const HOST_HEALTH_THRESHOLDS = Object.freeze({
  minFreeMB: 512,
  maxLoadPerCpu: 1.5,
})

/** `vm_stat` 文本 → 可用内存 MB（free + inactive + speculative + purgeable）；读不出 → null。 */
export function availableMemoryMBFromVmStat(text) {
  const pageSize = Number(/page size of (\d+) bytes/.exec(String(text))?.[1] ?? 4096)
  let pages = 0
  for (const match of String(text).matchAll(/^Pages (?:free|inactive|speculative|purgeable):\s+(\d+)\./gm)) {
    pages += Number(match[1])
  }
  if (!Number.isFinite(pages) || pages <= 0) return null
  return Math.round((pages * pageSize) / 1048576)
}

/** `/proc/meminfo` 文本 → 可用内存 MB（MemAvailable，回退 MemFree+Buffers+Cached）；读不出 → null。 */
export function availableMemoryMBFromMeminfo(text) {
  const kb = (name) => {
    const value = new RegExp(`^${name}:\\s+(\\d+)\\s*kB`, 'm').exec(String(text))?.[1]
    return value === undefined ? Number.NaN : Number(value)
  }
  const available = kb('MemAvailable')
  const fallback = (Number.isFinite(kb('MemFree')) ? kb('MemFree') : 0)
    + (Number.isFinite(kb('Buffers')) ? kb('Buffers') : 0)
    + (Number.isFinite(kb('Cached')) ? kb('Cached') : 0)
  const total = Number.isFinite(available) ? available : fallback
  if (!Number.isFinite(total) || total <= 0) return null
  return Math.round(total / 1024)
}

/**
 * 判主机是否健康。
 * @param {{ freeMB?: number, load1?: number, cpuCount?: number }} metrics - 现场快照。
 * @param {Partial<typeof HOST_HEALTH_THRESHOLDS>} [thresholds] - 覆盖默认阈值（测试/站点用）。
 * @returns {{ unhealthy: boolean, reasons: string[], freeMB: number|null, loadPerCpu: number|null, cpuCount: number }}
 */
export function classifyHostHealth(metrics, thresholds = {}) {
  const limits = { ...HOST_HEALTH_THRESHOLDS, ...thresholds }
  const freeMB = Number(metrics?.freeMB)
  const load1 = Number(metrics?.load1)
  const cpuCount = Math.max(1, Math.floor(Number(metrics?.cpuCount) || 1))
  const reasons = []
  if (!Number.isFinite(freeMB) || freeMB < limits.minFreeMB) {
    reasons.push(`free ${Number.isFinite(freeMB) ? `${Math.round(freeMB)}MB` : 'unknown'} < ${limits.minFreeMB}MB`)
  }
  const loadPerCpu = Number.isFinite(load1) ? load1 / cpuCount : Number.NaN
  if (!Number.isFinite(loadPerCpu) || loadPerCpu > limits.maxLoadPerCpu) {
    reasons.push(`load/cpu ${Number.isFinite(loadPerCpu) ? loadPerCpu.toFixed(2) : 'unknown'} > ${limits.maxLoadPerCpu}`)
  }
  return {
    unhealthy: reasons.length > 0,
    reasons,
    freeMB: Number.isFinite(freeMB) ? Math.round(freeMB) : null,
    loadPerCpu: Number.isFinite(loadPerCpu) ? Number(loadPerCpu.toFixed(2)) : null,
    cpuCount,
  }
}

/**
 * 冒烟收口判据：只有“有失败 + 主机不健康 + 连接死亡/页面丢失”同时成立才判 NOT-RUN；
 * 健康主机上的连接死亡仍是产品红（exit 1）。
 * @param {{ hasFailures: boolean, hostHealth: { unhealthy?: boolean } | null, connectionDeath: boolean, pageLost: boolean }} input
 * @returns {boolean}
 */
export function isHostUnhealthyVerdict({ hasFailures, hostHealth, connectionDeath, pageLost }) {
  // 主机不健康 + 断言失败即判 NOT-RUN（不再要求连接死亡）；健康主机的断言红仍是产品红（BUG-152）。
  return hasFailures === true && hostHealth?.unhealthy === true
}

/** NOT-RUN 时的可执行清理提示：先辨 stale repo dev web，再动 load；保留当前 GUI。 */
export const HOST_HEALTH_HINT = [
  '清理 stale repo dev web（保留当前 GUI，默认 52887）：',
  '  pgrep -fl "vendor/dsh/apps/cli/src/bin.ts"',
  '  lsof -nP -iTCP -sTCP:LISTEN | grep node',
  '只 kill pid/port 指向本仓 dev server 的进程；不要 kill 当前 GUI。',
  '非 repo 负载：top -l 1 -o cpu -n 10（macOS）/ ps -Ao pid,pcpu,comm -r | head -10（Linux）',
].join('\n')
