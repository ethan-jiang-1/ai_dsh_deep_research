/**
 * ResearchSessionRow.tsx —— 左栏会话行的三处原生槽位 occupant，消费 Host `researchRun` 投影。
 *
 *   1. `sidebar.session.row.leading`：在 idle 会话的 16px 前导位显示克制的研究状态标；
 *   2. `sidebar.session.row.hover`：在会话悬停卡中展示绑定的 `drt_<slug>` 与当前研究阶段；
 *   3. `sidebar.workspaces.session.menu.item`：在已交付研究会话的「…」菜单中提供「打开研究终稿」。
 *
 * 零 N+1 follow：三处均直接读 `useSessions` 投影快照；非研究或 idle 会话零渲染不添噪音。
 */
import type { ReactNode } from 'react'
import { IconBrowseOutlineRegular, MenuItemButton, StateDot, type StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  selectSessionResearchProjection,
  type ResearchRunProjection,
  type ResearchSessionsSnapshotLike,
} from '../lib/events/research-projection.ts'
import css from './ResearchSessionRow.module.css'

function dotStateOf(projection: ResearchRunProjection): StateDotState {
  switch (projection.phase) {
    case 'hitl_pending': return 'warning'
    case 'delivered': return 'done'
    case 'intake':
    case 'running':
      return 'ongoing'
    case 'idle':
      return 'idle'
  }
}

function phaseTextOf(
  projection: ResearchRunProjection,
  t: PropsLocale<'deepResearchPack'>['t'],
): string {
  switch (projection.phase) {
    case 'hitl_pending':
      if (projection.hitlKind === 'hitl1') return t('sessionRowPhaseHitl1')
      if (projection.hitlKind === 'hitl2') return t('sessionRowPhaseHitl2')
      return t('sessionRowPhaseHitl')
    case 'delivered': return t('sessionRowPhaseDelivered')
    case 'intake': return t('sessionRowPhaseIntake')
    case 'running': return t('sessionRowPhaseRunning')
    case 'idle': return t('sessionRowPhaseIdle')
  }
}

export type ResearchSessionLeadingProps =
  PropsRuntime<'sidebar.session.row.leading'> & PropsLocale<'deepResearchPack'>

/** 左栏会话行前导研究状态标：非研究会话或 idle 返回 null。 */
export function ResearchSessionLeading({ sessionId, useSessions, t }: ResearchSessionLeadingProps): ReactNode {
  const projection = useSessions((state) =>
    selectSessionResearchProjection(state as unknown as ResearchSessionsSnapshotLike, sessionId),
  )
  if (projection === null || projection.phase === 'idle') return null
  const label = phaseTextOf(projection, t)
  return (
    <span
      className={css.mark}
      data-research-row-phase={projection.phase}
      data-research-row-slug={projection.slug ?? ''}
      onClick={(event) => { event.stopPropagation() }}
    >
      <StateDot state={dotStateOf(projection)} size={8} />
      <span className={css.visuallyHidden}>
        {projection.slug !== null
          ? t('sessionRowMarkAriaWithSlug', { phase: label, slug: `drt_${projection.slug}` })
          : t('sessionRowMarkAria', { phase: label })}
      </span>
    </span>
  )
}

export type ResearchSessionHoverProps =
  PropsRuntime<'sidebar.session.row.hover'> & PropsLocale<'deepResearchPack'>

/** 左栏会话悬停卡中的研究进度摘要。 */
export function ResearchSessionHover({ sessionId, useSessions, t }: ResearchSessionHoverProps): ReactNode {
  const projection = useSessions((state) =>
    selectSessionResearchProjection(state as unknown as ResearchSessionsSnapshotLike, sessionId),
  )
  if (projection === null || (projection.phase === 'idle' && projection.slug === null)) return null
  const label = phaseTextOf(projection, t)
  return (
    <div
      className={css.hoverSection}
      data-research-row-hover={projection.phase}
      data-research-row-slug={projection.slug ?? ''}
    >
      <div className={css.hoverRow}>
        <StateDot state={dotStateOf(projection)} size={8} />
        <span className={css.hoverPhase}>{label}</span>
      </div>
      {projection.slug !== null && (
        <div className={css.hoverSlug}>{`drt_${projection.slug}`}</div>
      )}
    </div>
  )
}

export interface ResearchSessionMenuInjected {
  readonly openSessionFinal: (sessionId: SessionId, path: string) => void
}

export type ResearchSessionMenuProps =
  PropsRuntime<'sidebar.workspaces.session.menu.item'> & PropsLocale<'deepResearchPack'> & ResearchSessionMenuInjected

/** 左栏会话「…」菜单项：仅在已交付研究会话上出现「打开研究终稿」。 */
export function ResearchSessionOpenFinalMenuItem({
  sessionId,
  useSessions,
  useMenuOpenState,
  openSessionFinal,
  t,
}: ResearchSessionMenuProps): ReactNode {
  const [, setMenuOpen] = useMenuOpenState()
  const projection = useSessions((state) =>
    selectSessionResearchProjection(state as unknown as ResearchSessionsSnapshotLike, sessionId),
  )
  if (projection === null || projection.deliveredPath === null) return null
  const deliveredPath = projection.deliveredPath
  return (
    <MenuItemButton
      separatorBefore
      icon={<IconBrowseOutlineRegular size={14} />}
      onSelect={() => {
        setMenuOpen(false)
        openSessionFinal(sessionId, deliveredPath)
      }}
    >
      {t('sessionMenuOpenFinal')}
    </MenuItemButton>
  )
}
