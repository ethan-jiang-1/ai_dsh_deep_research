/**
 * 「研究状态」页签体（阶段自适应 3 层驾驶舱）。
 *
 * 三层结构（严格对齐 DSH 克制中性发丝线体系）：
 *   1. 顶层 · 告警置顶 + 当前态势焦点卡（Focus Hero）：按立项(HITL1) / 推进(Running) /
 *      审阅(HITL2) / 已交付(Delivered) 只突出当下唯一焦点与主 CTA；
 *   2. 中层 · 紧凑流程轨道 + 证据摘要 + 可交互 `QualityRadar`（点击命中格直钻证据卡，缺口格悬停盲区提示）；
 *   3. 底层 · 矢量图标化动态流 + 队员折叠区（含一键跳转队员子会话）。
 */
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  Button,
  DisclosureRow,
  IconBrowseOutlineRegular,
  IconGlobeOutlineRegular,
  IconInfoOutlineRegular,
  IconRightUpOutlineRegular,
  IconSearchOutlineRegular,
  IconUsersOutlineRegular,
  IconWarningOutlineRegular,
  StateDot,
  Tag,
  TextShimmer,
  type TagTone,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { deriveSteps } from '../lib/run/run-fold.ts'
import { assertNever } from '../lib/run/artifact-read.ts'
import { foldHitlPending, type HitlState } from '../lib/events/hitl-fold.ts'
import { deriveBusinessBrief, type BriefHitlState, type BriefQuestionState, type BriefReviewState, type BusinessBrief } from '../lib/run/brief-fold.ts'
import { countText } from '../lib/shared/i18n.ts'
import { statusFaceMarker } from '../lib/run/binding-trust.ts'
import { stalledBannerOf } from '../lib/run/health.ts'
import type { ResearchStatusTabProps, ResearchStatusTitleInjected } from './research-status/types.ts'
import { TrackRail } from './research-status/TrackRail.tsx'
import { ProtocolCard } from './research-status/ProtocolCard.tsx'
import { QualityRadar } from './research-status/QualityRadar.tsx'
import { collectStatusNotices, planIssueKeyOf, receiptIssueKeyOf } from './research-status/status-state.ts'
import { useStatusFeed } from './research-status/useStatusFeed.ts'
import css from './research-status/status.module.css'
export type { FollowTarget, JournalFrame, ResearchStatusTabInjected, ResearchStatusTabProps, ResearchStatusTitleInjected } from './research-status/types.ts'

type FocusPhase = 'hitl1' | 'hitl2' | 'hitl_other' | 'delivered' | 'running' | 'idle'

function renderActivityGlyph(rawIcon: string): ReactNode {
  if (rawIcon.includes('🔍')) return <IconSearchOutlineRegular size={13} />
  if (rawIcon.includes('🌐')) return <IconGlobeOutlineRegular size={13} />
  if (rawIcon.includes('👥')) return <IconUsersOutlineRegular size={13} />
  if (rawIcon.includes('⚠')) return <IconWarningOutlineRegular size={13} />
  if (rawIcon.includes('📦') || rawIcon.includes('📄')) return <IconBrowseOutlineRegular size={13} />
  return <IconInfoOutlineRegular size={13} />
}

/**
 * 「研究状态」页签体。
 * @param props 槽 props + 注入面。
 * @returns 研究状态面板。
 */
export function ResearchStatusTab(props: ResearchStatusTabProps): ReactNode {
  const tabInfo = typeof (props as { useTabInfo?: () => { tab?: { actions?: { bindCommands?: (c: { refresh: () => void }) => () => void } } } }).useTabInfo === 'function'
    ? (props as { useTabInfo: () => { tab?: { actions?: { bindCommands?: (c: { refresh: () => void }) => () => void } } } }).useTabInfo()
    : undefined
  const {
    rows, hitl, face, unbound, trust, kickoffHold, error, reads, reviewVerdict, scanSettled, retry,
    memberSummaries, members, delivery, streamFailure, anchors, health, versionFace, receiptDangling,
  } = useStatusFeed(props)
  useEffect(() => {
    const bind = tabInfo?.tab?.actions?.bindCommands
    if (typeof bind !== 'function') return undefined
    return bind({ refresh: retry })
  }, [tabInfo, retry])

  const passedCount = anchors.filter((a) => a.state === 'passed').length
  const pendingAnchor = anchors.find((a) => a.state === 'pending')
  const steps = face !== null
    ? face.steps
    : deriveSteps({ question: 'absent', team: 'absent', leads: 'absent', evidence: 0, findings: 'absent', review: 'absent', final: 'absent' }, props.t)
  const currentStep = face !== null ? steps.find((s) => s.state === 'current') ?? null : null

  const brief: BusinessBrief = useMemo(
    () => {
      const hitlInput: BriefHitlState = hitl.pending
        ? {
            kind: 'pending',
            target: pendingAnchor !== undefined ? (pendingAnchor.key === 'anchor-1' ? 'hitl1' : pendingAnchor.key === 'anchor-2' ? 'hitl2' : 'unknown') : 'unknown',
            questions: pendingAnchor?.questions ?? 0,
          }
        : { kind: 'idle' }
      const questionInput: BriefQuestionState = face?.questionIssue !== undefined && face.questionIssue !== null
        ? { kind: 'issue', reason: face.questionIssue }
        : face?.hasQuestion && face.questionLine !== null
          ? { kind: 'ok', line: face.questionLine }
          : { kind: 'absent' }
      if (kickoffHold) return deriveBusinessBrief({ kind: 'kickoff-hold', hitl: hitlInput, question: questionInput }, props.t)
      if (trust.kind !== 'bound') return deriveBusinessBrief({ kind: 'unbound', hitl: hitlInput, question: questionInput }, props.t)
      if (scanSettled && reads.bundle !== 'ok') {
        return deriveBusinessBrief({
          kind: 'bundle-error',
          failure: reads.bundle === 'unreadable' ? 'unreadable' : 'missing',
          hitl: hitlInput,
          question: questionInput,
        }, props.t)
      }
      const reviewInput: BriefReviewState = (() => {
        switch (reviewVerdict) {
          case 'pass': return { kind: 'pass' }
          case 'fail': return { kind: 'fail' }
          case 'unconfirmed': return { kind: 'unconfirmed' }
          case 'conflict': return { kind: 'conflict' }
          case 'absent': return { kind: 'absent' }
          default: return assertNever(reviewVerdict)
        }
      })()
      return deriveBusinessBrief({
        kind: 'bound',
        hitl: hitlInput,
        question: questionInput,
        review: reviewInput,
        currentStage: currentStep?.label ?? null,
        findingsPresent: face?.steps.find((s) => s.key === 'findings')?.state === 'done',
        delivered: delivery !== null,
        versions: face?.versions ?? 0,
        lastDecisionKind: null,
        openItems: [],
      }, props.t)
    },
    [trust, kickoffHold, hitl.pending, pendingAnchor, face, currentStep, delivery, reads, reviewVerdict, scanSettled, props.t],
  )

  const focusPhase: FocusPhase = (() => {
    if (hitl.pending) {
      if (pendingAnchor?.key === 'anchor-1') return 'hitl1'
      if (pendingAnchor?.key === 'anchor-2') return 'hitl2'
      return 'hitl_other'
    }
    if (delivery !== null) return 'delivered'
    if (trust.kind === 'bound' && face !== null) return 'running'
    return 'idle'
  })()

  const phaseBadge: { readonly label: string; readonly tone: TagTone } = (() => {
    switch (focusPhase) {
      case 'hitl1': return { label: props.t('statusFocusHitl1'), tone: 'warning' }
      case 'hitl2': return { label: props.t('statusFocusHitl2'), tone: 'warning' }
      case 'hitl_other': return { label: props.t('statusFocusHitlOther'), tone: 'warning' }
      case 'delivered': return { label: props.t('statusFocusDelivered'), tone: 'success' }
      case 'running': return { label: currentStep?.label ?? props.t('statusFocusRunning'), tone: 'info' }
      case 'idle': return { label: props.t('statusFocusIdle'), tone: 'neutral' }
    }
  })()

  const receiptIssue = receiptDangling ? 'statusReceiptDangling' : receiptIssueKeyOf(reads.receipt)
  const planIssueKey = planIssueKeyOf(reads.plan)
  const [activityOpen, setActivityOpen] = useState(true)
  const [openMembers, setOpenMembers] = useState<Readonly<Record<string, boolean>>>({})
  const statusNotices = collectStatusNotices({ face, reads, reviewVerdict })
  const stalledBanner = stalledBannerOf(
    { health, bound: trust.kind === 'bound', delivered: delivery !== null, hitlPending: hitl.pending },
    props.t,
  )
  const activeMembers = members.filter((m) => m.phase === 'active')
  const runDir = face?.runDir ?? (trust.kind === 'bound' ? `drt_${trust.slug}` : null)
  const reviewDraftPath = face !== null && face.hasFinal && runDir !== null ? `${runDir}/final.md` : null
  const showReviewFinal = focusPhase === 'hitl2' && reviewDraftPath !== null && props.sessionId !== undefined
  const showOpenFinal = !showReviewFinal && delivery !== null && props.sessionId !== undefined

  return (
    <div
      data-research-face={statusFaceMarker({ trust, unbound, kickoffHold, hasError: error !== null || (scanSettled && trust.kind === 'bound' && reads.bundle !== 'ok'), hasFace: face !== null })}
      className={css.root}
    >
      {/* 最高优先级告警横幅：HITL 挂起 / 流死亡 / 停摆 / 绑定读失败 */}
      {hitl.pending && (
        <div className={css.bannerWarn}>
          {props.t('hitlBanner', {
            label: pendingAnchor?.label ?? props.t('decideLabel'),
            count: pendingAnchor !== undefined && pendingAnchor.questions > 0 ? countText(props.t, pendingAnchor.questions, 'questionCountOne', 'questionCountOther') : '',
          })}
        </div>
      )}
      {streamFailure.dead && !hitl.pending && (
        <div className={css.bannerError}>{props.t('streamFailureBanner')}</div>
      )}
      {stalledBanner !== null && (
        <div className={css.bannerError}>{stalledBanner}</div>
      )}
      {scanSettled && trust.kind === 'bound' && reads.bundle !== 'ok' && (
        <div className={`${css.bannerError} ${css.bannerErrorText}`}>
          {props.t('statusReadFailed')}
          <button type="button" onClick={retry} className={css.retryLink}>{props.t('retry')}</button>
        </div>
      )}

      {/* 第 1 层：阶段自适应态势焦点卡（Focus Hero） */}
      <section
        className={`${css.focusHero}${focusPhase === 'hitl1' || focusPhase === 'hitl2' || focusPhase === 'hitl_other' ? ` ${css.focusHeroWarn}` : focusPhase === 'delivered' ? ` ${css.focusHeroSuccess}` : ''}`}
        data-testid="research-focus-hero"
        data-focus-phase={focusPhase}
      >
        <div className={css.focusTop}>
          <div className={css.focusBadges}>
            <Tag tone={phaseBadge.tone}>{phaseBadge.label}</Tag>
            {focusPhase === 'running' && activeMembers.length > 0 && (
              <span className={css.focusShimmer}>
                <TextShimmer active>{props.t('statusActiveRoleHint', { roles: activeMembers.map((m) => m.name).join(' · ') })}</TextShimmer>
              </span>
            )}
            {versionFace !== null && receiptIssue === null && reads.final !== 'unreadable' && planIssueKey === null && (face?.hasFinal || versionFace.ledgerFinalVersion >= 1) && (
              <Tag tone="outline">{versionFace.label}</Tag>
            )}
          </div>
          <div className={css.focusCta}>
            {showReviewFinal && (
              <Button
                variant="primary"
                size="sm"
                data-testid="status-hero-review-final"
                onClick={() => { props.openFinal(props.sessionId as NonNullable<typeof props.sessionId>, reviewDraftPath) }}
              >
                {props.t('statusReviewFinal')}
              </Button>
            )}
            {showOpenFinal && (
              <Button
                variant="primary"
                size="sm"
                data-testid="status-hero-open-final"
                onClick={() => { props.openFinal(props.sessionId as NonNullable<typeof props.sessionId>, delivery.path) }}
              >
                {props.t('statusOpenFinal')}
              </Button>
            )}
          </div>
        </div>

        <div className={css.briefGoal}>{brief.goal}</div>
        <div className={css.focusMeta}>
          <span>{brief.stageLine}</span>
          <span className={css.briefKnown}>{brief.knownLine}</span>
          {brief.unknownLine !== null && <span className={css.warnText}>{brief.unknownLine}</span>}
          <span className={brief.userActionNeeded ? css.briefActionUrgent : css.briefAction}>{brief.actionLine}</span>
        </div>
        {statusNotices.length > 0 && (
          <div className={css.noticeList}>
            {statusNotices.map((notice) => (
              <div key={notice.id} className={css.warnRow}>
                <IconWarningOutlineRegular size={13} />
                <span className={css.warnText}>{props.t(notice.key)}</span>
                <button type="button" onClick={retry} className={css.retryLink}>{props.t('retry')}</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* HITL1 立项期把契约卡提至焦点正下方 */}
      {focusPhase === 'hitl1' && face?.protocol !== undefined && (
        <ProtocolCard protocol={face.protocol} hitlPending onRetry={retry} t={props.t} />
      )}

      {/* 第 2 层：紧凑流程轨道 + 证据摘要条 + 可交互质量雷达 */}
      <TrackRail anchors={anchors} steps={steps} faceVersions={face?.versions ?? null} hitlPending={hitl.pending} t={props.t} />

      {focusPhase !== 'hitl1' && face?.protocol !== undefined && (
        <ProtocolCard protocol={face.protocol} hitlPending={false} onRetry={retry} t={props.t} />
      )}

      {passedCount > 0 && (
        <div className={css.decisionsLine}>
          {countText(props.t, passedCount, 'statusDecisionStopsOne', 'statusDecisionStopsOther')}
        </div>
      )}

      {face !== null && (
        <div className={css.evidenceBar}>
          {reads.evidence === 'unreadable' ? (
            <span className={css.warnText}>
              {props.t('statusEvidenceReadFailed')}
              <button type="button" onClick={retry} className={css.retryLink}>{props.t('retry')}</button>
            </span>
          ) : (
            <span className={css.evidenceMetric}>{countText(props.t, face.evidenceCount, 'statusEvidenceCountOne', 'statusEvidenceCountOther')}</span>
          )}
          {' '}
          {receiptIssue !== null && (
            <span className={css.warnText}>
              {props.t(receiptIssue)}
              <button type="button" onClick={retry} className={css.retryLink}>{props.t('retry')}</button>
            </span>
          )}
          {delivery !== null && (
            <span className={css.delivered} data-testid="status-delivered-badge">
              <StateDot state="done" size={8} />
              {' '}
              <span>{props.t('statusDelivered')}</span>
            </span>
          )}
          {delivery === null && receiptIssue === null && <span className={css.mutedInline}>{props.t('statusFinalAfterDelivery')}</span>}
          {planIssueKey !== null && (
            <span className={css.planUnknown}>{props.t('statusPlanVersionUnknown')}</span>
          )}
        </div>
      )}

      {face?.evidenceMatrix !== undefined && (
        <QualityRadar
          matrix={face.evidenceMatrix}
          onRetry={retry}
          {...(props.sessionId !== undefined && runDir !== null && props.openEvidence !== undefined
            ? {
                onOpenEvidence: (cardFile: string) => {
                  props.openEvidence?.(props.sessionId as NonNullable<typeof props.sessionId>, runDir, cardFile)
                },
              }
            : {})}
          t={props.t}
        />
      )}

      {unbound && <div className={css.unboundHint}>{props.t('statusUnbound')}</div>}
      {kickoffHold && (
        <div className={css.kickoffHold}>
          {props.t('statusKickoffHold', { slug: trust.kind === 'suppressed' ? trust.slug : '' })}
        </div>
      )}
      {!unbound && !kickoffHold && face === null && trust.kind === 'suppressed' && trust.reason === 'pending' && (
        <div className={css.unboundHint}>{props.t('statusPendingBinding')}</div>
      )}
      {error !== null && <div className={css.errorText}>{error}</div>}

      {/* 第 3 层：矢量图标化聚合动态流 + 队员折叠区与子会话直达 */}
      <div className={css.activityList}>
        {rows.length === 0 && props.sessionId !== undefined && <span className={css.activityEmpty}>{props.t('statusNoActivity')}</span>}
        {rows.length > 0 && (
          <DisclosureRow
            icon={<StateDot state={delivery !== null ? 'done' : hitl.pending ? 'warning' : 'ongoing'} />}
            title={props.t('statusActivityStream', { count: String(rows.length) })}
            open={activityOpen}
            expandable
            running={delivery === null && !hitl.pending && rows.length > 0}
            expandOnRowClick
            onToggle={() => setActivityOpen((current) => !current)}
          >
            <div className={css.activityRows}>
              {rows.map((r, i) => (
                <div key={i} className={css.activityRow} data-activity-row="">
                  <span className={css.activityGlyph} aria-hidden="true">{renderActivityGlyph(r.icon)}</span>
                  <span className={css.activityText}>{r.text}</span>
                </div>
              ))}
            </div>
          </DisclosureRow>
        )}
      </div>

      {members.length > 0 && (
        <div className={css.membersSection}>
          <div className={css.membersTitle}>{props.t('statusMembersTitle')}</div>
          {members.map((m) => {
            const summary = memberSummaries[m.id]
            const isOpen = openMembers[m.id] === true
            const running = m.phase === 'active'
            const dotState = m.phase === 'active' ? 'ongoing' : m.phase === 'failed' ? 'error' : 'idle'
            const searchCount = summary?.searchCount ?? 0
            const fetchCount = summary?.fetchCount ?? 0
            const errorCount = summary?.errorCount ?? 0
            return (
              <div key={m.id} className={css.memberItem}>
                <DisclosureRow
                  icon={<StateDot state={dotState} />}
                  title={m.name}
                  collapsedContent={(
                    <span className={css.memberCounters}>
                      <span className={css.memberCounterGroup}>
                        <span className={css.memberCounter}><IconSearchOutlineRegular size={11} />{searchCount}</span>
                        <span className={css.memberCounter}><IconGlobeOutlineRegular size={11} />{fetchCount}</span>
                        {errorCount > 0 && (
                          <span className={`${css.memberCounter} ${css.memberCounterWarn}`}>
                            <IconWarningOutlineRegular size={11} />{errorCount}
                          </span>
                        )}
                      </span>
                    </span>
                  )}
                  headerAccessory={props.sessionId !== undefined && props.openMember !== undefined ? (
                    <button
                      type="button"
                      className={css.memberJumpBtn}
                      data-testid="status-open-member"
                      title={props.t('statusOpenMemberSession', { name: m.name })}
                      aria-label={props.t('statusOpenMemberSession', { name: m.name })}
                      onClick={() => {
                        props.openMember?.(props.sessionId as NonNullable<typeof props.sessionId>, m.id)
                      }}
                    >
                      <IconRightUpOutlineRegular size={12} />
                    </button>
                  ) : undefined}
                  keepContentWhenOpen
                  open={isOpen}
                  expandable
                  running={running}
                  expandOnRowClick
                  onToggle={() => setOpenMembers((prev) => ({ ...prev, [m.id]: !isOpen }))}
                >
                  <div className={css.memberRows}>
                    {(summary?.rows ?? []).map((r, i) => (
                      <div key={i} className={css.activityRow}>
                        <span className={css.activityGlyph} aria-hidden="true">{renderActivityGlyph(r.icon)}</span>
                        <span className={css.activityText}>{r.text}</span>
                      </div>
                    ))}
                    {(summary?.rows ?? []).length === 0 && <span className={css.activityEmpty}>{props.t('statusNoMemberActivity')}</span>}
                  </div>
                </DisclosureRow>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** 活标题（HITL 挂起时"研究状态 · ⏳ 等你拍板"）——共享 journal 流折算。 */
export function ResearchStatusTitle(
  props: PropsRuntime<'sidebar.right.pane.tab.title'> & Partial<PropsLocale<'deepResearchPack'>> & ResearchStatusTitleInjected,
): ReactNode {
  const [hitl, setHitl] = useState<HitlState>({ pending: false, since: undefined })
  const { sessionId, follow } = props
  useEffect(() => {
    setHitl({ pending: false, since: undefined })
    if (sessionId === undefined) return
    const controller = new AbortController()
    void (async () => {
      try {
        let events: unknown[] = []
        for await (const frame of follow(sessionId, controller.signal)) {
          if (frame.kind === 'history') events = [...frame.events]
          else events = [...events, frame.event]
          setHitl(foldHitlPending(events))
        }
      } catch (err) { /* 活标题 fail-soft；卸载 abort 不算失败 */ if (!controller.signal.aborted) console.error('[ResearchStatusTab] 活标题流失败', err) }
    })()
    return () => { controller.abort() }
  }, [sessionId, follow])
  const idleLabel = props.t !== undefined ? props.t('tabStatus') : (props.labels?.idle ?? '')
  const pendingLabel = props.t !== undefined ? props.t('tabStatusPending') : (props.labels?.pending ?? '')
  return hitl.pending
    ? <span className={css.tabTitlePending}>{pendingLabel}</span>
    : idleLabel
}
