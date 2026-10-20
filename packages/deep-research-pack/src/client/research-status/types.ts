import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** journal 帧的最小投影（wire 形状 → 领域形状）。 */
export type JournalFrame =
  | { readonly kind: 'history'; readonly events: readonly unknown[] }
  | { readonly kind: 'event'; readonly event: unknown }

/** follow 目标：普通会话 id，或 subagent 会话的持久父地址。队员（teammate）会话 origin =
 *  subagent，纯 id 形态被 host 守卫拒（session/agent-busy "subagent Sessions require their
 *  durable parent address"——2026-10-11 首验实测，三条队员流全灭）；父地址形态 = 官方
 *  ui-session 同款（vendor session.ts sessionAddress()）。mode 'unknown' = 观察者不断言
 *  队员的 one-shot/continuable 形态（host 侧 mode 对账跳过）。结构性子集，wire 类型 =
 *  vendor SessionAddress。 */
export type FollowTarget =
  | SessionId
  | { readonly kind: 'subagent'; readonly parentSessionId: SessionId; readonly childSessionId: SessionId; readonly mode: 'unknown' }

/** 页签体注入面：journal 流 + 文件读取闭包（绑定 remote.workspaceFiles）+ 挂起显性化入口。 */
export interface ResearchStatusTabInjected {
  readonly follow: (target: FollowTarget, signal: AbortSignal) => AsyncGenerator<JournalFrame>
  /** 列工作区目录；不可达 → null。 */
  readonly listDir: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<readonly { type: string; name: string }[] | null>
  /** 读工作区文本文件（首窗）；不可达 → null。 */
  /** limit = 行上限（缺省 40——bundle 渐进面小读取的历史选择；读 review.md / question.md 这类
   *  判据落在全文里的文件时须显式给足，见 BUG-036）。 */
  readonly readFile: (sessionId: SessionId, path: string, signal: AbortSignal, limit?: number) => Promise<string | null>
  /** 挂起显性化：pending 迁移时由页签体调用（openTab——右栏同步骤展开）。 */
  readonly revealStatusTab: () => void
  /** 终稿门：按会话 + 终稿相对路径打开「终稿」页签（文件地址；同地址幂等，已开则聚焦）。 */
  readonly openFinal: (sessionId: SessionId, path: string) => void
}

/** 活标题注入面：只需要 journal 流（挂起谓词）——标题不读文件、不开面。 */
export interface ResearchStatusTitleInjected {
  readonly follow: (target: FollowTarget, signal: AbortSignal) => AsyncGenerator<JournalFrame>
}

/** 槽标准 props + 注入面。 */
export type ResearchStatusTabProps = PropsRuntime<'sidebar.right.pane.tab'> & ResearchStatusTabInjected
