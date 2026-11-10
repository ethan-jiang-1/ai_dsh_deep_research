// host-health.mjs — 真浏览器冒烟的主机健康判据（失败归因的纯函数）。
//
// 为什么存在：2026-11-10 复跑 client-load 时，主机 load 12.03 / free 272MB，DSH server 在
// 断言中途死亡；浏览器侧只看到 `chrome-error://chromewebdata/` 与
// `net::ERR_CONNECTION_REFUSED`，脚本按断言红 exit 1。现场 meta 已带主机快照，但退出码仍把
// "环境红"混成"产品红"。本模块把该判断从现场描述提升为可测试的判据，由 client-load 在
// 连接死亡且主机不健康时收口为 NOT-RUN（exit 2）——未跑 ≠ 通过，也不伪造产品红。
//
// 边界：只判主机资源，不判产品；健康主机上出现连接死亡仍按产品红 exit 1。

/** 默认阈值：free < 512MB 或 load1 / CPU > 1.5 视为不健康。 */
export const HOST_HEALTH_THRESHOLDS = Object.freeze({
  minFreeMB: 512,
  maxLoadPerCpu: 1.5,
})

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
  return hasFailures === true
    && hostHealth?.unhealthy === true
    && (connectionDeath === true || pageLost === true)
}
