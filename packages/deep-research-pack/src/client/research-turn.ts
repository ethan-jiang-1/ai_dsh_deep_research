/**
 * research-turn.ts —— Turn 级研究里程碑投影（uiConversation.events Definition + selector）。
 *
 * 从 journal 回合内识别关键节点事件（protocol.json 定稿、review.md 写盘、deliverables/presented 交付），
 * 在对话流 Turn 尾呈现独立可读的结构化卡片（与 `ui-schedule` schedule-turn.ts 同款机制）。
 */
import type {
  ConversationNodeDefinition, TurnLocation,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { primaryPathOfToolArgs, WRITE_TOOLS } from '../lib/events/journal-wire.ts'
import { finalPathOf } from '../lib/run/final-target.ts'
import { RESEARCH_TURN_DATA_KEY } from './keys.ts'

export type ResearchMilestoneKind = 'protocol' | 'review' | 'delivered'

export interface ResearchMilestone {
  readonly kind: ResearchMilestoneKind
  readonly path: string
  readonly seq: number
}

export interface ResearchTurnData {
  readonly milestones: readonly ResearchMilestone[]
}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ConversationTurnDataMap {
    'deep-research-milestone': ResearchTurnData
  }
}

interface ResearchTurnState {
  readonly turn: number
  readonly milestones: readonly ResearchMilestone[]
}

function addMilestone(list: readonly ResearchMilestone[], next: ResearchMilestone): readonly ResearchMilestone[] {
  if (list.some((item) => item.kind === next.kind && item.path === next.path)) return list
  return [...list, next]
}

const DRT_PROTOCOL_RE = /(?:^|\/)drt_[\w.-]+\/protocol\.json$/
const DRT_REVIEW_RE = /(?:^|\/)drt_[\w.-]+\/review\.md$/

/** 从 Turn 结尾提取里程碑列表（若同回合原生 ui-deliverables 已渲染终稿交付卡，则对 delivered 行去重）。 */
export function selectResearchMilestones(owner: { readonly turn: TurnLocation; readonly seq: number }): readonly ResearchMilestone[] {
  const data = owner.turn.data.get(RESEARCH_TURN_DATA_KEY)
  if (data === undefined) return []
  const cutoff = owner.turn.end?.seq ?? owner.seq
  const nativeDeliverables = owner.turn.data.get('deliverables' as never) as
    | { readonly presented?: readonly { readonly seq?: number; readonly path?: unknown }[] }
    | undefined
  const nativePresentedFinal = (nativeDeliverables?.presented ?? []).some(
    (file) => typeof file.seq === 'number' && file.seq <= cutoff && finalPathOf(file.path) !== null,
  )
  return data.milestones.filter((m) => m.seq <= cutoff && !(nativePresentedFinal && m.kind === 'delivered'))
}

/** Turn 级研究里程碑累积器 Definition。 */
export const researchTurnDefinition: ConversationNodeDefinition<ResearchTurnState> = {
  kind: RESEARCH_TURN_DATA_KEY,
  match: (event) => {
    const rec = event as { type: string; data?: { turn?: number } }
    if (rec.type === 'turn/start' && typeof rec.data?.turn === 'number') {
      return { id: String(rec.data.turn), role: 'start' }
    }
    if ((rec.type === 'tool/call' || rec.type === 'deliverables/presented') && typeof rec.data?.turn === 'number') {
      return { id: String(rec.data.turn), role: 'update' }
    }
    return null
  },
  start: (_context, match) => {
    const rec = match.event as { type: string; data?: { turn?: number } }
    return { turn: rec.data?.turn ?? 0, milestones: [] }
  },
  update: (context, match) => {
    const rec = match.event as {
      type: string
      seq?: number
      data?: { name?: string; arguments?: unknown; files?: readonly { path?: unknown }[] }
    }
    const seq = typeof rec.seq === 'number' ? rec.seq : 0
    if (rec.type === 'tool/call' && typeof rec.data?.name === 'string' && WRITE_TOOLS.has(rec.data.name)) {
      const path = primaryPathOfToolArgs(rec.data.arguments)
      if (path === null) return context.state
      if (DRT_PROTOCOL_RE.test(path)) {
        return { ...context.state, milestones: addMilestone(context.state.milestones, { kind: 'protocol', path, seq }) }
      }
      if (DRT_REVIEW_RE.test(path)) {
        return { ...context.state, milestones: addMilestone(context.state.milestones, { kind: 'review', path, seq }) }
      }
      return context.state
    }
    if (rec.type === 'deliverables/presented' && Array.isArray(rec.data?.files)) {
      const candidates = rec.data.files
        .map((f) => finalPathOf(f?.path))
        .filter((p): p is string => p !== null)
      if (candidates.length === 0) return context.state
      // 单次多文件交付（主审计版 + 读者版）只产出一条 delivered 里程碑，优先读者版（BUG-440）。
      const chosen = candidates.find((p) => /\/readable(?:-v[1-9]\d*)?\.md$/.test(p)) ?? candidates[0]!
      const withoutPrevDelivered = context.state.milestones.filter((m) => m.kind !== 'delivered')
      const next = addMilestone(withoutPrevDelivered, { kind: 'delivered', path: chosen, seq })
      return { ...context.state, milestones: next }
    }
    return context.state
  },
  buildLocationData: (context, scope, previous) => {
    if (scope !== 'turn' || context.state === undefined) return null
    if (previous?.kind === 'turn'
      && previous.turn === context.state.turn
      && previous.key === RESEARCH_TURN_DATA_KEY
      && previous.value.milestones === context.state.milestones) {
      return previous
    }
    return {
      kind: 'turn',
      turn: context.state.turn,
      key: RESEARCH_TURN_DATA_KEY,
      value: { milestones: context.state.milestones },
    }
  },
}
