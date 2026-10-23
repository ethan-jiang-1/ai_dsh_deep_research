// research-graph/types.ts — 「研究图谱」client 半的注入面类型（槽标准 props 在入口处合成）。
// 被谁消费：src/client/ResearchGraphTab.tsx 与 src/client/index.ts（注册处按本类型接线）。
// 注入两条闭包（数据面全部复用既有 remote，无新 RPC；**只读观察，不发指令**）：
//   · readFile  = remote.workspaceFiles.read 的会话级闭包（只读 `plan.md` / `plan/vN.md`，缺文件合法）；
//   · listDir   = remote.workspaceFiles.list 的会话级闭包（列 `plan/` 快照；不可达 → null）；
//   · openOwner = 可选：打开队员会话（vendor `ui-agent-team` 的 openTeammate 同款接线；
//                 本页签只在提供时渲染「打开负责人」）。
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { RunSource } from '../../lib/run-context.ts'
// 标准 props 的类型增强（useSession / sessionId / useSessions / useSessionStatus）。
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'

/** journal follow 帧（只用于绑定 run bundle；图本身不折活动流）。 */
export type GraphJournalFrame =
  | { readonly kind: 'history'; readonly events: readonly unknown[] }
  | { readonly kind: 'event'; readonly event: unknown }

/** 「研究图谱」页签的注入面（三条闭包；openOwner 可选）。 */
export interface ResearchGraphInjected {
  /** 以当前会话打开的 run bundle 读面（位置/读策略/翻页归 lib）；plan.md 缺席是合法形态。 */
  readonly runSource: (sessionId: SessionId) => RunSource
  /** 跟本会话 journal，仅用于 `bindingTrust` 找可信的 `drt_<slug>/`（plan 读取需要 bundle 基址）。 */
  readonly follow: (sessionId: SessionId, signal: AbortSignal) => AsyncIterable<GraphJournalFrame>
  /** 打开队员会话的观察面（可选；缺省时不渲染「打开负责人」）。 */
  readonly openOwner?: (sessionId: SessionId, childSessionId: SessionId) => void
}

/** 槽标准 props + 注入面。 */
export type ResearchGraphTabProps = PropsRuntime<'sidebar.right.pane.tab'> & ResearchGraphInjected
