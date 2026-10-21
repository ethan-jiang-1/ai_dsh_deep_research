// research-graph/types.ts — 「研究图谱」client 半的注入面类型（槽标准 props 在入口处合成）。
// 被谁消费：src/client/ResearchGraphTab.tsx 与 src/client/index.ts（注册处按本类型接线）。
// 注入三条闭包（数据面全部复用既有 remote，无新 RPC）：
//   · readFile        = remote.workspaceFiles.read 的会话级闭包（只读 `plan.md`，缺文件合法）；
//   · sendInstruction = remote.session.prompt 的 steer→queue 闭包（同「研究配置」页签）；
//   · openOwner       = 可选：打开队员会话（vendor `ui-agent-team` 的 openTeammate 同款接线；
//                       本页签只在提供时渲染「打开负责人」）。
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// 标准 props 的类型增强（useSession / sessionId / useSessions / useSessionStatus / useProjection）。
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'

/** 指令发送结果（同「研究配置」页签：ok=false 时 detail 给人读原因）。 */
export interface InstructionReceipt {
  readonly ok: boolean
  readonly detail?: string
}

/** 「研究图谱」页签的注入面（三条闭包；openOwner 可选）。 */
export interface ResearchGraphInjected {
  /** 读工作区文本文件；不可达/缺文件 → null（`plan.md` 缺席是合法形态）。 */
  readonly readFile: (sessionId: SessionId, path: string, signal: AbortSignal, limit?: number) => Promise<string | null>
  /** 把预填调整建议交给 Lead（steer 优先、queue 降级由注入方实现）。 */
  readonly sendInstruction: (sessionId: SessionId, text: string) => Promise<InstructionReceipt>
  /** 打开队员会话的观察面（可选；缺省时不渲染「打开负责人」）。 */
  readonly openOwner?: (sessionId: SessionId, childSessionId: SessionId) => void
}

/** 槽标准 props + 注入面。 */
export type ResearchGraphTabProps = PropsRuntime<'sidebar.right.pane.tab'> & ResearchGraphInjected
