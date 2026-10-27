// WorkerChips.tsx — 一个队员的 worker chips（`subagentCatalog` 投影 → 二层 worker 的 label/mode/忙闲）。
//
// 每个成员实例化一次，hooks 数量恒定（不在父级循环里调 hook）——原注释即这条理由。
// 从 ResearchGraphTab.tsx 原样切出（2026-10-27 卫生轮 维度2）。
import type { ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { UseSessions, UseSessionStatus } from '@deepseek-ai/dsh-client-ui-session/client'
import { workerChipsOf, type WorkerChip } from '../../lib/plan-graph.ts'

/** worker chips 子组件的 props（hooks 从父级透传；每个成员实例化一次，hooks 数量恒定）。 */
interface WorkerChipsProps {
  readonly memberId: SessionId
  readonly useSessions: UseSessions
  readonly useSessionStatus: UseSessionStatus
}

/**
 * 一个队员的 worker chips（`subagentCatalog` 投影 → 二层 worker 的 label/mode/忙闲）。
 * 独立子组件：每个成员实例化一次，hooks 数量恒定（不随 roster 变化在父级循环调 hook）。
 */
export function WorkerChips({ memberId, useSessions, useSessionStatus }: WorkerChipsProps): ReactNode {
  const catalog = useSessions((state) => state.projectionsBySession[memberId]?.values.subagentCatalog)
  const statuses = useSessionStatus((state) => state)
  const chips: readonly WorkerChip[] = workerChipsOf(
    { [memberId]: catalog },
    (sessionId) => statuses.get(sessionId as SessionId)?.running,
  )
  if (chips.length === 0) return null
  const shown = chips.slice(0, 3)
  const suffix = chips.length > shown.length ? ` +${String(chips.length - shown.length)}` : ''
  return (
    <span style={{ fontSize: 11, opacity: 0.7 }}>
      worker：{shown.map((chip) => `${chip.label}${chip.status === 'running' ? '●' : chip.status === 'inactive' ? '○' : '·'}`).join(' · ')}{suffix}
    </span>
  )
}
