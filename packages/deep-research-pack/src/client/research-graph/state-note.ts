// state-note.ts — 「研究图谱」的**降级说明**（图面上方那条提示的文案与判据）。
//
// 从 ResearchGraphTab.tsx 原样切出（2026-10-28 Phase C）：它是一条纯映射（输入 = 计划态/绑定态/
// 图形态，输出 = { title, body } 或 null），此前以 IIFE 埋在 400+ 行组件里，既难单测也难对照。
// 语义关键：**"读不到" ≠ "没有"**（BUG-045）——绑定读取失败必须与"尚未绑定"分开报。
// 文案走折层字典（zh-fold / en-fold）；组件传 `props.t`，非 UI 面缺省中文。
import { translateZh, type PackTranslate } from '../../lib/shared/i18n.ts'
import { assertNever } from '../../lib/run/artifact-read.ts'
import type { SnapshotState } from './graph-state.ts'

export interface GraphStateNoteInput {
  readonly planState: 'loading' | 'missing' | 'unbound' | 'ready' | 'truncated' | 'error'
  readonly boundSlug: string | null
  readonly followError: string | null
  readonly hasPlan: boolean
  readonly hasEdges: boolean
  readonly hasTopLevel: boolean
}

export interface GraphStateNote {
  readonly title: string
  readonly body: string
}

/** 返回 null = 不显示说明（有图可画且无需提醒）。 */
export function graphStateNote(input: GraphStateNoteInput, t: PackTranslate = translateZh): GraphStateNote | null {
  const { planState, boundSlug, followError, hasPlan, hasEdges, hasTopLevel } = input

  if (planState === 'loading') return null
  if (planState === 'truncated') {
    return { title: t('graphNoteTruncatedTitle'), body: t('graphNoteTruncatedBody') }
  }
  if (boundSlug === null && followError !== null) {
    // 读失败 ≠ 没有 run（BUG-045）：把流故障与"未绑定"分开，否则用户/agent 会把
    // 瞬时的 journal 断连读成"这个会话还没开始研究"。
    return {
      title: t('graphNoteBindFailedTitle'),
      body: t('graphNoteBindFailedBody', { error: followError }),
    }
  }
  if (boundSlug === null) {
    return { title: t('graphNoteUnboundTitle'), body: t('graphNoteUnboundBody') }
  }
  if (planState === 'error') {
    // BUG-355：读失败 ≠ 没有 plan.md；独立失败态，给重试入口，不冒充空态。
    return { title: t('graphNotePlanReadFailedTitle'), body: t('graphNotePlanReadFailedBody') }
  }
  if (hasPlan && !hasTopLevel) {
    return { title: t('graphNoteOnlyChildrenTitle'), body: t('graphNoteOnlyChildrenBody') }
  }
  if (hasPlan && hasEdges) return null
  if (hasPlan && !hasEdges) return { title: t('graphNotePlanNoEdgesTitle'), body: t('graphNotePlanNoEdgesBody') }
  if (!hasPlan && hasEdges) return { title: t('graphNoteNoPlanEdgesTitle'), body: t('graphNoteNoPlanEdgesBody') }
  return {
    title: t('graphNoteNoDagTitle'),
    body: planState === 'missing' ? t('graphNoteNoDagBodyMissingPlan') : t('graphNoteNoDagBodyNoNodes'),
  }
}

/**
 * 差异卡里「旧图快照为何不可用」的文案（BUG-391）：按 SnapshotState 穷举——除 ready 外每个
 * 状态都要有话说，只有 loading/idle 才是「读取中」。
 */
export function snapshotDiffMessage(
  state: SnapshotState,
  t: PackTranslate = translateZh,
  version?: number | null,
): string {
  const versionStr = version !== null && version !== undefined ? String(version) : ''
  switch (state) {
    case 'idle':
    case 'loading':
      return t('oldGraphLoading')
    case 'missing':
      return t('oldGraphUnread')
    case 'empty':
      return t('graphSnapshotEmpty', { version: versionStr })
    case 'invalid':
      return t('graphSnapshotInvalid', { version: versionStr })
    case 'unreadable':
      return t('graphSnapshotUnreadable', { version: versionStr })
    case 'ready':
      return t('oldGraphUnread')
    default:
      return assertNever(state)
  }
}
