/**
 * start-card — 产品首屏起步卡的纯判据（D38）。
 *
 * 只在 blank Session、工作区根没有 `drt_*`、且会话没有用户消息时显示。把判据抽成纯函数，
 * 让 keyless 回归钉住"有 run / 有消息就收起"，组件只做数据装配与渲染。
 */

/** 判据输入：会话是否已有用户消息 + 工作区根目录条目。 */
interface StartCardFacts {
  readonly hasUserMessage: boolean
  readonly entries: readonly { readonly name: string }[]
}

/**
 * 是否显示首屏起步卡。
 * @param facts - 会话与工作区事实。
 * @returns true = 显示；false = 收起（已有 run 或已有用户消息）。
 */
export function shouldShowStartCard({ hasUserMessage, entries }: StartCardFacts): boolean {
  if (hasUserMessage) return false
  return !entries.some((entry) => entry.name.startsWith('drt_'))
}
