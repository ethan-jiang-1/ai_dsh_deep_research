/**
 * StartCard — 意图优先首屏起步卡（D38 / X5）：
 *   - 当会话已绑定有效研究工作区时，不再重复渲染第二套大号工作区路径框（工作区归 DSH Hero 原生选择器）；
 *   - 仅在尚未绑定有效工作区时突出引导目录选择；
 *   - 去除说明书长文与凭据絮叨，聚焦极简副标题 + 6 张带题型标签的起题灵感卡 + 最近活跃/已交付 Run 快捷续接条。
 *
 * 边界：Client 渲染，不进模型请求；点击灵感卡只预填草稿不提交（D18）。
 */
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { Button, StateDot, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { InputActions } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  countWorkspaceRuns,
  isSessionBlankForStartCard,
  shouldShowStartCard,
  type StartCardSessionFacts,
} from '../lib/workspace/start-card.ts'
import { errorDetailOf } from '../lib/shared/error-detail.ts'
import {
  selectSessionResearchProjection,
  type ResearchRunProjection,
  type ResearchSessionsSnapshotLike,
} from '../lib/events/research-projection.ts'
import { RESEARCH_TOOL_KEYS } from './keys.ts'
import css from './StartCard.module.css'

/** `conversation.input.dock` 运行时由 DSH 注入的 SessionSnapshot 子集。 */
interface StartCardSessionSnapshotLike {
  readonly blank: boolean
  readonly promptAttempted: boolean
  readonly running: boolean
  readonly openState?: 'cold' | 'loading' | 'open' | 'error'
  readonly pendingSubmissions?: readonly unknown[]
  readonly subagent?: unknown
}

/** 注入面：会话身份、当前工作区、只读文件列表与一次性消息探测。 */
export interface StartCardInjected {
  sessionId: SessionId
  workspaceTitle: string | null
  workspacePath: string | null
  listDir: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<readonly { name: string }[]>
  hasUserMessage: (sessionId: SessionId) => Promise<boolean>
  chooseWorkspace: () => Promise<void>
  openSession?: (sessionId: SessionId) => void
  openSessionFinal?: (sessionId: SessionId, path: string) => void
  openHub?: () => void
}

/** Dock 组件的完整 props。 */
export type StartCardProps = PropsRuntime<'conversation.input.dock'> & PropsLocale<'deepResearchPack'> & StartCardInjected

const STARTER_TEMPLATES = [
  { id: 'landscape', badgeKey: 'startBadgeLandscape', titleKey: 'startTplLandscapeTitle', promptKey: 'startTplLandscapePrompt' },
  { id: 'compare', badgeKey: 'startBadgeCompare', titleKey: 'startTplCompareTitle', promptKey: 'startTplComparePrompt' },
  { id: 'diligence', badgeKey: 'startBadgeDiligence', titleKey: 'startTplDiligenceTitle', promptKey: 'startTplDiligencePrompt' },
  { id: 'fact-check', badgeKey: 'startBadgeFactCheck', titleKey: 'startTplFactCheckTitle', promptKey: 'startTplFactCheckPrompt' },
  { id: 'tech', badgeKey: 'startBadgeTech', titleKey: 'startTplTechTitle', promptKey: 'startTplTechPrompt' },
  { id: 'timeline', badgeKey: 'startBadgeTimeline', titleKey: 'startTplTimelineTitle', promptKey: 'startTplTimelinePrompt' },
] as const

interface RecentRunItem {
  readonly sessionId: SessionId
  readonly title: string
  readonly projection: ResearchRunProjection
}

function fillComposerDraft(
  actions: InputActions | undefined,
  text: string,
  lastTemplateRef: { current: string | null },
): void {
  if (actions === undefined) return
  if (lastTemplateRef.current !== null) {
    actions.setDraft(text)
    lastTemplateRef.current = text
    return
  }
  const span = actions.captureInsertion()
  if (!actions.insertText(text, span)) actions.setDraft(text)
  lastTemplateRef.current = text
}

function normalizePath(path: string | null | undefined): string | null {
  if (typeof path !== 'string') return null
  const clean = path.trim().replace(/\\/g, '/').replace(/\/+$/, '')
  return clean === '' ? null : clean
}

function phasePriority(phase: ResearchRunProjection['phase']): number {
  if (phase === 'hitl_pending') return 3
  if (phase === 'running' || phase === 'intake') return 2
  if (phase === 'delivered') return 1
  return 0
}

const EMPTY_SESSIONS_SNAPSHOT: ResearchSessionsSnapshotLike = {
  ids: [],
  byId: {},
  projectionsBySession: {},
}

const EMPTY_ACTIVE_TARGETS: ReadonlySet<string> = new Set()

function useEmptySessions<T>(selector: (state: ResearchSessionsSnapshotLike) => T): T {
  return selector(EMPTY_SESSIONS_SNAPSHOT)
}

function useEmptyConversation<T>(selector: (state: { readonly activeTargets: ReadonlySet<string> }) => T): T {
  return selector({ activeTargets: EMPTY_ACTIVE_TARGETS })
}

function useAbsentSession<T>(selector: (state: StartCardSessionSnapshotLike | undefined) => T): T {
  return selector(undefined)
}

interface StartCardProbeState {
  readonly sessionId: SessionId
  readonly status: 'loading' | 'ready'
  readonly hasUserMessage: boolean
  readonly diskRunCount: number
}

/**
 * 意图优先首屏起步卡。
 * @param props - dock props + 注入面。
 */
export function StartCard(props: StartCardProps): ReactElement | null {
  const {
    sessionId, workspacePath, listDir, hasUserMessage, chooseWorkspace,
    openSession, openSessionFinal, openHub, t,
  } = props
  const inputActions = (props as { inputActions?: InputActions }).inputActions
  const propSession = (props as { readonly session?: StartCardSessionSnapshotLike }).session
  const useSessionHook = (props as {
    readonly useSession?: <T>(selector: (state: StartCardSessionSnapshotLike | undefined) => T) => T
  }).useSession ?? useAbsentSession
  const liveSession = useSessionHook((state) => state) ?? propSession
  const useConversationHook = (props as {
    readonly useConversation?: <T>(selector: (state: { readonly activeTargets: ReadonlySet<string> }) => T) => T
  }).useConversation ?? useEmptyConversation
  const hasActiveConversationTarget = useConversationHook((state) => state.activeTargets.size > 0)
  const useSessionsHook = (props as {
    useSessions?: <T>(selector: (state: ResearchSessionsSnapshotLike) => T) => T
  }).useSessions ?? useEmptySessions
  const sessionsSnap = useSessionsHook((state) => state)

  const currentSessionRow = sessionsSnap.byId[sessionId] as { readonly blank?: boolean } | undefined
  const summaryBlank = typeof currentSessionRow?.blank === 'boolean' ? currentSessionRow.blank : undefined
  const currentProjection = selectSessionResearchProjection(sessionsSnap, sessionId)
  const hasResearchRunActivity = currentProjection !== null && currentProjection.phase !== 'idle'

  const sessionFacts: StartCardSessionFacts | undefined = liveSession !== undefined
    ? {
        blank: liveSession.blank,
        promptAttempted: liveSession.promptAttempted,
        running: liveSession.running,
        ...(liveSession.openState === undefined ? {} : { openState: liveSession.openState }),
        pendingSubmissionCount: liveSession.pendingSubmissions?.length ?? 0,
        hasActiveConversationTarget,
        isSubagent: liveSession.subagent !== null && liveSession.subagent !== undefined,
        ...(summaryBlank === undefined ? {} : { summaryBlank }),
        hasResearchRunActivity,
      }
    : (hasActiveConversationTarget || summaryBlank === false || hasResearchRunActivity)
      ? {
          blank: summaryBlank !== false,
          promptAttempted: false,
          running: false,
          hasActiveConversationTarget,
          ...(summaryBlank === undefined ? {} : { summaryBlank }),
          hasResearchRunActivity,
        }
      : undefined

  // DSH 原生会话/对话态已证明非空白（含同会话点击发送的首帧）→ 同步收起，且不再发起无谓探测。
  const liveAllowed = sessionFacts === undefined || isSessionBlankForStartCard(sessionFacts)

  const [probe, setProbe] = useState<StartCardProbeState>({
    sessionId,
    status: 'loading',
    hasUserMessage: false,
    diskRunCount: 0,
  })
  const [choosing, setChoosing] = useState(false)
  const [chooseError, setChooseError] = useState<string | null>(null)
  /** 目录选择请求代次：切会话/重复点击后，旧 promise 的结算不得改写当前 UI（BUG-409）。 */
  const chooseTokenRef = useRef(0)
  const lastTemplateRef = useRef<string | null>(null)
  useEffect(() => {
    chooseTokenRef.current += 1
    lastTemplateRef.current = null
    setChoosing(false)
    setChooseError(null)
  }, [sessionId])
  useEffect(() => {
    if (!liveAllowed) return
    const controller = new AbortController()
    let cancelled = false
    void (async () => {
      try {
        const userMessage = await hasUserMessage(sessionId)
        // workspaceFiles.list 拒绝空路径（gateway/bad-request）；`''` = 工作区根，映射成 `.`。
        const entries = userMessage ? [] : await listDir(sessionId, '.', controller.signal)
        if (cancelled) return
        setProbe({
          sessionId,
          status: 'ready',
          hasUserMessage: userMessage,
          diskRunCount: countWorkspaceRuns(entries),
        })
      } catch {
        /* @silent-catch: workspace/session unreachable is not a start-card blocker */
        if (!cancelled) {
          setProbe({
            sessionId,
            status: 'ready',
            hasUserMessage: false,
            diskRunCount: 0,
          })
        }
      }
    })()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [sessionId, liveAllowed, listDir, hasUserMessage])

  const recentRuns: readonly RecentRunItem[] = useMemo(() => {
    if (sessionsSnap === null) return []
    const targetCwd = normalizePath(workspacePath)
    const items: RecentRunItem[] = []
    for (const id of sessionsSnap.ids) {
      if (id === sessionId) continue
      const row = sessionsSnap.byId[id] as {
        readonly id: SessionId
        readonly origin?: string
        readonly cwd?: string
        readonly displayTitle?: string
        readonly title?: string
      } | undefined
      if (row === undefined || row.origin === RESEARCH_TOOL_KEYS[3]) continue
      const proj = selectSessionResearchProjection(sessionsSnap, id)
      if (proj === null || proj.phase === 'idle' || proj.slug === null) continue
      const rowCwd = normalizePath(row.cwd)
      if (targetCwd !== null && rowCwd !== null && rowCwd !== targetCwd) continue
      items.push({
        sessionId: id,
        title: row.title ?? row.displayTitle ?? `drt_${proj.slug}`,
        projection: proj,
      })
    }
    items.sort((a, b) => {
      const pDiff = phasePriority(b.projection.phase) - phasePriority(a.projection.phase)
      if (pDiff !== 0) return pDiff
      return b.projection.updatedAt - a.projection.updatedAt
    })
    return items.slice(0, 2)
  }, [sessionsSnap, sessionId, workspacePath])

  const currentProbe = probe.sessionId === sessionId ? probe : null
  const isVisible = liveAllowed
    && currentProbe !== null
    && currentProbe.status === 'ready'
    && shouldShowStartCard({
      hasUserMessage: currentProbe.hasUserMessage,
      ...(sessionFacts === undefined ? {} : { session: sessionFacts }),
    })
  if (!isVisible) return null
  const diskRunCount = currentProbe.diskRunCount
  const hasValidWorkspace = normalizePath(workspacePath) !== null

  return (
    <section data-testid="deep-research-start" aria-label={t('startAria')} className={css.root}>
      <div className={css.subtitle}>{t('startSubtitle')}</div>

      {/* 仅在尚未绑定有效工作区时突出引导目录选择；已绑定工作区直接由 DSH Hero 选择器承载 */}
      {!hasValidWorkspace && (
        <div className={css.workspacePrompt} data-testid="deep-research-workspace-prompt">
          <div className={css.workspacePromptText}>{t('startWorkspaceNeeded')}</div>
          <Button
            variant="outline"
            size="sm"
            data-testid="deep-research-choose-workspace"
            disabled={choosing}
            onClick={() => {
              if (choosing) return
              const token = ++chooseTokenRef.current
              setChoosing(true)
              setChooseError(null)
              void chooseWorkspace()
                .catch((error: unknown) => {
                  if (chooseTokenRef.current !== token) return
                  setChooseError(t('startChooseWorkspaceFailed', { detail: errorDetailOf(error) }))
                })
                .finally(() => {
                  if (chooseTokenRef.current === token) setChoosing(false)
                })
            }}
          >
            {choosing ? t('startChoosingWorkspace') : t('startChooseWorkspace')}
          </Button>
        </div>
      )}
      {chooseError === null ? null : <div className={css.error} role="alert">{chooseError}</div>}

      <div className={css.templatesGrid}>
        {STARTER_TEMPLATES.map((tpl) => {
          const promptText = t(tpl.promptKey)
          return (
            <button
              key={tpl.id}
              type="button"
              className={css.intentCard}
              data-testid={`deep-research-start-template-${tpl.id}`}
              disabled={inputActions === undefined}
              onClick={() => fillComposerDraft(inputActions, promptText, lastTemplateRef)}
            >
              <div className={css.intentTop}>
                <span className={css.intentTitle}>{t(tpl.titleKey)}</span>
                <Tag tone="outline">{t(tpl.badgeKey)}</Tag>
              </div>
              <div className={css.intentPreview}>{promptText}</div>
            </button>
          )
        })}
      </div>

      {recentRuns.length > 0 ? (
        <div className={css.recentStrip} data-testid="deep-research-start-recent">
          <span className={css.recentLabel}>{t('startRecentRunsLabel')}</span>
          <div className={css.recentList}>
            {recentRuns.map((item) => {
              const deliveredPath = item.projection.deliveredPath
              const dotState = item.projection.phase === 'hitl_pending'
                ? 'warning'
                : item.projection.phase === 'delivered'
                  ? 'done'
                  : 'ongoing'
              return (
                <button
                  key={item.sessionId}
                  type="button"
                  className={css.recentItem}
                  data-recent-slug={item.projection.slug ?? ''}
                  onClick={() => {
                    if (deliveredPath !== null && openSessionFinal !== undefined) {
                      openSessionFinal(item.sessionId, deliveredPath)
                    } else {
                      openSession?.(item.sessionId)
                    }
                  }}
                >
                  <StateDot state={dotState} size={8} />
                  <span className={css.recentTitle}>{item.title}</span>
                  <span className={css.recentAction}>
                    {deliveredPath !== null ? t('startRecentOpenFinal') : t('startRecentResume')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : diskRunCount > 0 && openHub !== undefined ? (
        <div className={css.recentStrip} data-testid="deep-research-start-workspace-runs">
          <span className={css.recentLabel}>
            {t('startWorkspaceRunsSummary', { count: String(diskRunCount) })}
          </span>
          <button
            type="button"
            className={css.recentHubLink}
            onClick={openHub}
          >
            {t('startOpenHubAction')}
          </button>
        </div>
      ) : null}
    </section>
  )
}
