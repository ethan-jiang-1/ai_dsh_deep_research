/**
 * error-detail.ts —— 失败详情的人话化（单一正本）。
 *
 * 为什么存在（BUG-410）：`(error as Error).message` 对**非 Error 拒绝值**（宿主 RPC 的结构化
 * 错误对象、字符串码、数字……）取到 `undefined`，界面于是渲染「失败：undefined」——真实原因
 * 丢失，用户与排查都拿不到信息。本件按类型收窄，只交出可读文本，不猜语义、不吞原因。
 *
 * 口径（按优先级）：
 *   Error            → message（空则 name，再空则 fallback）
 *   string           → 去空白后的原文（空串则 fallback）
 *   { message: string } → message（空则忽略）
 *   { code: string }    → code
 *   其它非 null 值    → String(value)（数字/布尔/数组等仍保留形状）
 *   null / undefined → fallback（调用方给本地化兜底文案时传 params，本件不负责措辞）
 *
 * 边界：纯函数、零依赖；不读全局、不记日志（日志归调用方）。
 */

/** 失败值 → 可读详情文本。 */
export function errorDetailOf(error: unknown, fallback = 'unknown'): string {
  if (error instanceof Error) {
    const message = error.message.trim()
    if (message !== '') return message
    const name = error.name.trim()
    return name !== '' ? name : fallback
  }
  if (typeof error === 'string') {
    const trimmed = error.trim()
    return trimmed !== '' ? trimmed : fallback
  }
  if (typeof error === 'object' && error !== null) {
    const record = error as { readonly message?: unknown; readonly code?: unknown }
    if (typeof record.message === 'string' && record.message.trim() !== '') return record.message.trim()
    if (typeof record.code === 'string' && record.code.trim() !== '') return record.code.trim()
    if (typeof record.code === 'number' && Number.isFinite(record.code)) return String(record.code)
    return fallback
  }
  if (typeof error === 'number' || typeof error === 'boolean' || typeof error === 'bigint') return String(error)
  return fallback
}
