/**
 * start-card — 意图优先首屏起步卡的纯判据（D38 演进）。
 *
 * 只在空白新会话（无用户消息且 DSH 原生会话/对话态仍处于 blank/hero 期）时展示意图起题卡与
 * 最近研究续接条；工作区已有历史 `drt_*` 不再隐藏首屏（否则回访用户与示范通道只剩留白，且
 * 「继续最近研究」不可达）。一旦会话发出第一条用户消息（含首帧 `promptAttempted` /
 * `pendingSubmissions`、进入 `running`、出现活跃对话目标或 `blank: false`），立刻收起让位给对话流。
 */

/** DSH 原生会话与对话状态快照子集（与 vendor `conversationPhase` / `ConversationMainPanel` 同口径）。 */
export interface StartCardSessionFacts {
  readonly blank: boolean
  readonly promptAttempted: boolean
  readonly running: boolean
  readonly openState?: 'cold' | 'loading' | 'open' | 'error'
  readonly pendingSubmissionCount?: number
  readonly hasActiveConversationTarget?: boolean
  readonly isSubagent?: boolean
  readonly summaryBlank?: boolean
  readonly hasResearchRunActivity?: boolean
}

/** 判据输入：会话是否已有用户消息 + 可选的 DSH 实时会话态与工作区根目录条目。 */
export interface StartCardFacts {
  readonly hasUserMessage: boolean
  readonly entries?: readonly { readonly name: string }[] | undefined
  readonly session?: StartCardSessionFacts | undefined
}

/**
 * 仅依据 DSH 实时会话/对话态判定该会话是否仍处于可展示首屏起步卡的空白期。
 * 口径与 `ConversationMainPanel` 的 `hero` 判据保持一致：首条提交、运行中、非空白、
 * 已有活跃对话目标、子会话、研究投影非 idle 或历史回放未决态（settling）均不显示。
 */
export function isSessionBlankForStartCard(session: StartCardSessionFacts): boolean {
  if (session.isSubagent === true) return false
  if (session.hasResearchRunActivity === true) return false
  if (session.summaryBlank === false) return false
  if (session.promptAttempted) return false
  if ((session.pendingSubmissionCount ?? 0) > 0) return false
  if (session.running) return false
  if (session.hasActiveConversationTarget === true) return false
  if (!session.blank) return false
  if (session.openState !== undefined) {
    return session.openState === 'open' || session.summaryBlank === true
  }
  return true
}

/**
 * 是否显示首屏起步卡。
 * @param facts - 会话与工作区事实。
 * @returns true = 空白新会话显示；false = 已有用户消息或对话已启动即收起。
 */
export function shouldShowStartCard({ hasUserMessage, session }: StartCardFacts): boolean {
  if (hasUserMessage) return false
  if (session !== undefined && !isSessionBlankForStartCard(session)) return false
  return true
}

/** 统计工作区根目录下的活跃 `drt_*` 研究档案数（不把 `drtish.md` 等非前缀项计入）。 */
export function countWorkspaceRuns(entries: readonly { readonly name: string }[]): number {
  return entries.filter((entry) => entry.name.startsWith('drt_')).length
}
