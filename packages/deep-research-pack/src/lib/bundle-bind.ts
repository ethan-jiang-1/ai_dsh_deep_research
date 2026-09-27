/**
 * bundle-bind.ts —— 会话 → run bundle 绑定折算（RFC right-pane-ux-debt：状态页签只跟
 * 本会话自己的 run——不显示别家数据）。纯函数，keyless 单测。
 *
 * 信号面：journal 里 `tool/call` 事件的参数路径（write/edit/read/glob/grep 等调用天然携带
 * bundle 内路径 `drt_<slug>/…`；恢复会话"继续 drt_x"的读取同理可绑）。**只认工具调用**，
 * 不扫用户消息文本——问句里顺带提到别的 bundle 不构成绑定（只有真的在 bundle 里动手才算）。
 */

/** journal 事件的最小形状（wire 事件；只取折算要用的字段）。 */
interface BindEventLike {
  readonly type?: unknown
  readonly data?: { readonly name?: unknown; readonly arguments?: unknown } | undefined
}

/** 从调用参数（JSON 字符串或对象）里找 `drt_<slug>/` 路径形态；找不到 → undefined。 */
function slugInArgs(args: unknown): string | undefined {
  let obj: unknown = args
  if (typeof args === 'string') {
    try { obj = JSON.parse(args) } catch { return undefined } // 截断 JSON（流式前缀）——不算
  }
  if (typeof obj !== 'object' || obj === null) return undefined
  const m = /drt_([a-z0-9][a-z0-9-]*)\//.exec(JSON.stringify(obj))
  return m?.[1]
}

/**
 * 折算：journal 事件序列 → 本会话绑定的 run bundle slug。
 * 取**最后**一个命中（运行中另起 bundle / 恢复会话转续别的 run 时，以最新动作为准）。
 * @param events 按 wire 顺序的事件。@returns slug（如 `dsh-release-watch`）；无绑定 → undefined。
 */
export function sessionBundleOf(events: readonly unknown[]): string | undefined {
  let bound: string | undefined
  for (const event of events) {
    if (typeof event !== 'object' || event === null) continue
    const e = event as BindEventLike
    if (e.type !== 'tool/call') continue
    const slug = slugInArgs(e.data?.arguments)
    if (slug !== undefined) bound = slug
  }
  return bound
}
