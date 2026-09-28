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

/** 变更类工具（强绑定信号）：写/编辑进 bundle 的调用直接定绑。 */
const WRITE_TOOLS = new Set(['write', 'edit', 'multiedit'])

/** 会话 → run bundle 绑定（含绑定强度——RFC cockpit-flow-face G4：read 弱绑定防错绑）。 */
export interface SessionBinding {
  readonly slug: string | undefined
  /** write = 有写命中（可信）；read = 仅有读命中（立项预检等读取也会命中，挂起期不可作渐进面依据）。 */
  readonly boundBy: 'write' | 'read' | undefined
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
 * 折算：journal 事件序列 → 本会话绑定的 run bundle（含绑定强度）。
 * **写强读弱**：任一 write/edit 命中 → 取最新写命中（boundBy: write）；否则取最新读命中
 * （boundBy: read）。实测根因（2026-09-28 首跑）：立项预检 read 旧 bundle 也会命中路径——
 * 读绑定在挂起期不可作渐进面依据（消费方据此抑制），写命中后自然纠正。
 * @param events 按 wire 顺序的事件。@returns 绑定（slug 如 `selfhosted-ai-gateway`；无绑定 → undefined）。
 */
export function sessionBindingOf(events: readonly unknown[]): SessionBinding {
  let writeSlug: string | undefined
  let readSlug: string | undefined
  for (const event of events) {
    if (typeof event !== 'object' || event === null) continue
    const e = event as BindEventLike
    if (e.type !== 'tool/call') continue
    const slug = slugInArgs(e.data?.arguments)
    if (slug === undefined) continue
    const name = typeof e.data?.name === 'string' ? e.data.name : ''
    if (WRITE_TOOLS.has(name)) writeSlug = slug
    else readSlug = slug
  }
  if (writeSlug !== undefined) return { slug: writeSlug, boundBy: 'write' }
  if (readSlug !== undefined) return { slug: readSlug, boundBy: 'read' }
  return { slug: undefined, boundBy: undefined }
}

/**
 * 折算：journal 事件序列 → 本会话绑定的 run bundle slug（兼容壳 = sessionBindingOf().slug）。
 * @param events 按 wire 顺序的事件。@returns slug（如 `dsh-release-watch`）；无绑定 → undefined。
 */
export function sessionBundleOf(events: readonly unknown[]): string | undefined {
  return sessionBindingOf(events).slug
}
