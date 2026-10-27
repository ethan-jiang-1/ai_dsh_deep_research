// types.ts — research-status client 半的领域类型（journal 帧投影、follow 目标、页签注入面）。
// 被谁消费：本目录 useMemberActivity.ts 与 src/client/ResearchStatusTab.tsx 两消费方。
// 怎么不改坏：FollowTarget 的 subagent 父地址形态是 host 守卫要求（纯 id 被拒——2026-10-11
// 实测），改形状须连 follow 调用方与 vendor sessionAddress() 语义一起重校。
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { RunSource } from '../../lib/run-context.ts'
import type { RunStep } from '../../lib/run-fold.ts'

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
  /** 以当前会话打开的 run bundle 读面（位置/在场/读策略/翻页归 lib）。 */
  readonly runSource: (sessionId: SessionId) => RunSource
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

/** bundle 渐进面模型（问题行 + 步骤 + 证据 + 交付）。 */
export interface BundleFace {
  readonly questionLine: string | null
  /** question.md 在场（锚点 passed 态的文件事实——与 questionLine 区分：首行可能缺席）。 */
  readonly hasQuestion: boolean
  readonly steps: readonly RunStep[]
  readonly evidenceCount: number
  readonly delivered: boolean
  /** final/ 中最高 vN.md 编号——≥2 即有证据扩张 rerun 记账。 */
  readonly versions: number
  /** review.md 终局 readiness（多轮取末位：true=FAIL / false=PASS / null=未观测）。 */
  readonly reviewFail: boolean | null
  /** 版本面事实（rerun 版本轨的输入；交付见证由 journal 单独折）。 */
  readonly planText: string | null
  readonly planSnapshotNames: readonly string[]
  readonly questionText: string | null
  readonly finalFileNames: readonly string[]
  readonly hasFinal: boolean
}
