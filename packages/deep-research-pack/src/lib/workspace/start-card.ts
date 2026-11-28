/**
 * start-card — 意图优先首屏起步卡的纯判据（D38 演进）。
 *
 * 只在空白新会话（无用户消息）时展示意图起题卡与最近研究续接条；工作区已有历史 `drt_*`
 * 不再隐藏首屏（否则回访用户与示范通道只剩留白，且「继续最近研究」不可达）。一旦会话发出
 * 第一条用户消息，立刻收起让位给对话流。
 */

/** 判据输入：会话是否已有用户消息 + 可选的工作区根目录条目。 */
interface StartCardFacts {
  readonly hasUserMessage: boolean
  readonly entries?: readonly { readonly name: string }[]
}

/**
 * 是否显示首屏起步卡。
 * @param facts - 会话与工作区事实。
 * @returns true = 空白新会话显示；false = 已有用户消息即收起。
 */
export function shouldShowStartCard({ hasUserMessage }: StartCardFacts): boolean {
  return !hasUserMessage
}

/** 统计工作区根目录下的活跃 `drt_*` 研究档案数（不把 `drtish.md` 等非前缀项计入）。 */
export function countWorkspaceRuns(entries: readonly { readonly name: string }[]): number {
  return entries.filter((entry) => entry.name.startsWith('drt_')).length
}
