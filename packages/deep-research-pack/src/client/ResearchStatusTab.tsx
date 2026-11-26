/**
 * 「研究状态」页签体（UI 优先版：把界面弄对——RFC research-status-ui）。
 *
 * 自上而下七区（一眼回答"研究到哪了、谁在干什么、等没等我、我在哪出手"）：
 *   ① HITL 挂起横幅（点名锚点 + 参与指引——hitl-fold.deriveAnchors）；
 *   ② 流程轨道 = ◆立项确认 + 七步 + ◆交付审阅（锚点段从 journal 折算、步骤段从 bundle 文件
 *      在场性折算——两段数据源分开，HITL1 等待时 bundle 未建而锚点仍在场）；
 *   ③ 研究问题行（question.md 首行，剥 markdown 强调符）；
 *   ④ 团队动态 = 人性化活动流（activity-fold：🔍/👥/💬/📦，噪音过滤——**原始事件类型名不出正文**）；
 *   ⑤ 证据概览 + 交付状态（evidence/ 计数 + `deliverables/presented` 见证 → {props.t('statusDelivered')} + rerun 三分图例）；
 *   ⑥ 决策诚实线（停靠点已过 → 指路 question.md §Decisions——谁答的不复制进 UI，家在文件）；
 *   ⑦ 队员动态折叠区（member-activity-stream，2026-10-10 定夺：agentTeam 投影取 roster（队员
 *      会话 id 的唯一发现源——spawn 返回不带 id，通道探明实证）→ 多路 follow 队员会话 →
 *      member-activity 折算检索/抓取/出错行，每人一节默认折叠；任务粒度归 ui-agent-team 任务板）。
 *
 * 会话绑定（RFC right-pane-ux-debt，2026-09-28）：渐进面只显示**本会话自己的** run bundle
 * （bundle-bind：journal 工具调用路径识别 `drt_<slug>/`），三个操作桶都认（根 / archive/ /
 * _abandoned/）——位置只用于发现，状态从内容读（D28）；未绑定（journal 已到但无 bundle 动作）
 * 时如实显示提示行，不显示别家数据。
 *
 * 挂起信号显性化（同 RFC）：pending 迁移（false→true）时调用注入的 `revealStatusTab`（=
 * `sidebarRight.openTab('research-status')`——vendor 契约：落定时右栏同步骤展开）；页签体
 * 在右栏折叠时**保持挂载**（dock 不卸载），观察者因此常在——"轮到你"不再依赖用户先知道
 * 要展开右栏。用户仍可随时关页签/收右栏（可加可关）。
 *
 * 数据面：journal 事件 = remote.session.follow；bundle = remote.workspaceFiles
 * （list 本会话绑定的 bundle → 文件在场性/read question.md 首行）——company
 * cultivation 页签同款闭包模式（失败降级 null，面板如实显示）。
 * 分层纪律：折算全住 纯函数层 纯函数（keyless 单测）；组件薄渲染。
 */
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { DisclosureRow, StateDot, TextShimmer } from '@deepseek-ai/dsh-client-ui-primitives'
import { deriveSteps } from '../lib/run/run-fold.ts'
import { assertNever } from '../lib/run/artifact-read.ts'
import { foldHitlPending, type HitlState } from '../lib/events/hitl-fold.ts'
import { deriveBusinessBrief, type BriefHitlState, type BriefQuestionState, type BriefReviewState, type BusinessBrief } from '../lib/run/brief-fold.ts'
import { countText } from '../lib/shared/i18n.ts'
import { rerunTriageRowsOf } from '../lib/run/rerun-triage.ts'
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

  // 流程轨道件（锚点入轨，RFC cockpit-flow-face）：锚点段从 journal+文件折算（挂起期也在场），
  // 步骤段从文件在场性折算——face 缺席时以占位态渲染（不冒充进度）。
  const passedCount = anchors.filter((a) => a.state === 'passed').length
  const pendingAnchor = anchors.find((a) => a.state === 'pending')
  const steps = face !== null
    ? face.steps
    : deriveSteps({ question: 'absent', team: 'absent', leads: 'absent', evidence: 0, findings: 'absent', review: 'absent', final: 'absent' }, props.t)
  // 业务摘要（issue 2026-10-11-executive-research-ux-delivery）：既有事实源 → 判别联合五问折算。
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
        currentStage: face !== null ? steps.find((s) => s.state === 'current')?.label ?? null : null,
        findingsPresent: face?.steps.find((s) => s.key === 'findings')?.state === 'done',
        delivered: delivery !== null,
        versions: face?.versions ?? 0,
        lastDecisionKind: null,
        openItems: [],
      }, props.t)
    },
    [trust, kickoffHold, hitl.pending, pendingAnchor, face, steps, delivery, reads, reviewVerdict, scanSettled, props.t],
  )
  const receiptIssue = receiptDangling ? 'statusReceiptDangling' : receiptIssueKeyOf(reads.receipt)
  const planIssueKey = planIssueKeyOf(reads.plan)
  const [activityOpen, setActivityOpen] = useState(true)
  const [openMembers, setOpenMembers] = useState<Readonly<Record<string, boolean>>>({})
  const statusNotices = collectStatusNotices({ face, reads, reviewVerdict })
  const stalledBanner = stalledBannerOf(
    { health, bound: trust.kind === 'bound', delivered: delivery !== null, hitlPending: hitl.pending },
    props.t,
  )
  return (
    // 滚动义务在页签体自己（vendor .tabBody = overflow:hidden 的定高 flex 列——BUG 2026-10-12
    // 用户报告：活动流超长即被裁且不可滚）：根容器 flex:1 + minHeight:0 吃满宿主高，
    // 双轴 auto 自滚。
    // data-research-face = 机器可读数据面（cdp-probe 读它，不再靠“没写未绑定”反推）。
    <div data-research-face={statusFaceMarker({ trust, unbound, kickoffHold, hasError: error !== null || (scanSettled && trust.kind === 'bound' && reads.bundle !== 'ok'), hasFace: face !== null })} className={css.root}>
      {/* ① HITL 挂起横幅（最醒目位置；点名锚点 + 参与指引——"怎么参与"在需要那一刻说清） */}
      {hitl.pending && (
        <div className={css.bannerWarn}>
          {props.t('hitlBanner', {
            label: pendingAnchor?.label ?? props.t('decideLabel'),
            count: pendingAnchor !== undefined && pendingAnchor.questions > 0 ? countText(props.t, pendingAnchor.questions, 'questionCountOne', 'questionCountOther') : '',
          })}
        </div>
      )}
      {/* 流畸形死亡恢复指引（BUG-023 修复①）：末位回合死于上游流失败且无新回合接手时，
          给人话恢复路径——不虚构"研究失败"，档案都在 bundle。折算 = stream-failure.ts。 */}
      {streamFailure.dead && !hitl.pending && (
        <div className={css.bannerError}>
          {props.t('streamFailureBanner')}
        </div>
      )}
      {/* 停摆横幅（BUG-348/353/354）：静默 ≥30min + 最后回合错误，且**已绑定、未交付、未挂起**才给恢复指引。 */}
      {stalledBanner !== null && (
        <div className={css.bannerError}>
          {stalledBanner}
        </div>
      )}
      {/* 绑定 bundle 读取失败（BUG-358）：读不到不是「研究推进中」；失败态 + 重试，不拿 journal 锚点冒充进度。 */}
      {scanSettled && trust.kind === 'bound' && reads.bundle !== 'ok' && (
        <div className={`${css.bannerError} ${css.bannerErrorText}`}>
          {props.t('statusReadFailed')}
          <button type="button" onClick={retry} className={css.retryLink}>{props.t('retry')}</button>
        </div>
      )}
      {/* ⓪ 业务摘要层（issue 2026-10-11-executive-research-ux-delivery）：五问业务语言——
          研究什么 / 已确认什么 / 未知什么 / 我是否要操作；折算住 brief-fold（计数不进本层），
          组件薄渲染。 */}
      <div className={css.briefCard}>
        <div className={css.briefGoal}>{props.t('statusGoalPrefix', { goal: brief.goal })}</div>
        <div>{brief.stageLine}</div>
        <div className={css.briefKnown}>{brief.knownLine}</div>
        {brief.unknownLine !== null && <div className={css.warnText}>⚠ {brief.unknownLine}</div>}
        <div className={brief.userActionNeeded ? css.briefActionUrgent : css.briefAction}>{brief.actionLine}</div>
        {statusNotices.map((notice) => (
          <div key={notice.id} className={css.warnText}>
            ⚠ {props.t(notice.key)}
            <button type="button" onClick={retry} className={css.retryLink}>{props.t('retry')}</button>
          </div>
        ))}
      </div>
      {/* ② 流程轨道：◆立项确认 + 主轨 + ◆交付审阅 + 交付；↻ 回边 = 拍板的分支后果画进流程 */}
      <TrackRail anchors={anchors} steps={steps} faceVersions={face?.versions ?? null} hitlPending={hitl.pending} t={props.t} />
      {/* HITL1 结构化研究契约卡（protocol.json） */}
      {face?.protocol !== undefined && (
        <ProtocolCard protocol={face.protocol} hitlPending={pendingAnchor?.key === 'anchor-1'} onRetry={retry} t={props.t} />
      )}
      {/* ⑥ 决策诚实线（指路不复制——谁答的家在 question.md §Decisions） */}
      {passedCount > 0 && (
        <div className={css.decisionsLine}>
          {countText(props.t, passedCount, 'statusDecisionStopsOne', 'statusDecisionStopsOther')}
        </div>
      )}
      {/* ⑤ 证据概览 + 交付状态 + 版本（final/ 记账 ≥v2 = 发生过证据扩张 rerun）
         交付态 = `present` 见证（门②），不是 `final.md` 在场——后者在综合步就有，是"可审"不是"已交"。
          已交付 → 门（读终稿）；未交付 → 承诺（终稿将在交付后自动出现在右栏，许在用户已经在看的地方）。 */}
      {face !== null && (
        <div className={css.evidenceBar}>
          {reads.evidence === 'unreadable' ? (
            <span className={css.warnText}>
              {props.t('statusEvidenceReadFailed')}
              <button type="button" onClick={retry} className={css.retryLink}>{props.t('retry')}</button>
            </span>
          ) : (
            <span>{countText(props.t, face.evidenceCount, 'statusEvidenceCountOne', 'statusEvidenceCountOther')}</span>
          )}
          {receiptIssue !== null && (
            <span className={css.warnText}>
              {props.t(receiptIssue)}
              <button type="button" onClick={retry} className={css.retryLink}>{props.t('retry')}</button>
            </span>
          )}
          {delivery !== null && <span className={css.delivered}>{props.t('statusDelivered')}</span>}
          {delivery !== null && props.sessionId !== undefined && (
            <button
              type="button"
              onClick={() => { props.openFinal(props.sessionId as NonNullable<typeof props.sessionId>, delivery.path) }}
              className={css.openFinalLink}
            >{props.t('statusOpenFinal')}</button>
          )}
          {delivery === null && receiptIssue === null && <span className={css.mutedInline}>{props.t('statusFinalAfterDelivery')}</span>}
          {versionFace !== null && receiptIssue === null && reads.final !== 'unreadable' && planIssueKey === null && (face.hasFinal || versionFace.ledgerFinalVersion >= 1) && (
            <span className={css.versionTag} title={props.t('versionReadonlyNote')}>
              {versionFace.label}
            </span>
          )}
          {planIssueKey !== null && (
            <span className={css.planUnknown}>{props.t('statusPlanVersionUnknown')}</span>
          )}
        </div>
      )}
      {/* ⑤b 质量雷达（topics.md × evidence/*.md Topic×Lens 矩阵 + 信源分布） */}
      {face?.evidenceMatrix !== undefined && (
        <QualityRadar matrix={face.evidenceMatrix} onRetry={retry} t={props.t} />
      )}
      {/* 交付后只读出口（rerun 不满转接：三种改法 + 可复制话术；D18 只读——不按钮化 rerun） */}
      {face !== null && delivery !== null && (
        <details className={css.triageDetails}>
          <summary className={css.triageSummary}>{props.t('triageTitle')}</summary>
          <div className={css.triageBody}>
            {rerunTriageRowsOf(props.t).map((row) => (
              <div key={row.label} className={css.triageRow}>
                <strong>{row.label}</strong>{props.t('triageConsequenceSuffix', { consequence: row.consequence })}
                <div className={css.triageCopy}>{props.t('triageCopyLine', { copy: row.copy })}</div>
              </div>
            ))}
            <div className={css.triageHint}>{props.t('triageHint')}</div>
          </div>
        </details>
      )}
      {/* 未绑定 / 绑定待确认提示（RFC right-pane-ux-debt + cockpit-flow-face G4） */}
      {unbound && (
        <div className={css.unboundHint}>
          {props.t('statusUnbound')}
        </div>
      )}
      {kickoffHold && (
        <div className={css.kickoffHold}>
          {props.t('statusKickoffHold', { slug: trust.kind === 'suppressed' ? trust.slug : '' })}
        </div>
      )}
      {!unbound && !kickoffHold && face === null && trust.kind === 'suppressed' && trust.reason === 'pending' && (
        <div className={css.unboundHint}>
          {props.t('statusPendingBinding')}
        </div>
      )}
      {error !== null && <div className={css.errorText}>{error}</div>}
      {/* ④ 团队动态（人性化活动行——原始事件类型名不出正文） */}
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
            {rows.map((r, i) => (
              <div key={i} className={css.activityRow}>
                <span>{r.icon}</span>
                <span className={css.activityText}>{r.text}</span>
              </div>
            ))}
          </DisclosureRow>
        )}
      </div>
      {/* ⑦ 队员动态折叠区（每人一节，默认折叠；动作粒度 = 检索/抓取/出错——任务粒度归 ui-agent-team 任务板，不双 home） */}
      {members.length > 0 && (
        <div className={css.membersSection}>
          <div className={css.membersTitle}>{props.t('statusMembersTitle')}</div>
          {members.map((m) => {
            const summary = memberSummaries[m.id]
            const isOpen = openMembers[m.id] === true
            const running = m.phase === 'active'
            const dotState = m.phase === 'active' ? 'ongoing' : m.phase === 'failed' ? 'error' : 'idle'
            const countSummary = `🔍${summary?.searchCount ?? 0} · 🌐${summary?.fetchCount ?? 0}${(summary?.errorCount ?? 0) > 0 ? ` · ⚠️${summary?.errorCount}` : ''}`
            return (
              <DisclosureRow
                key={m.id}
                icon={<StateDot state={dotState} />}
                title={m.name}
                collapsedContent={<TextShimmer active={running}>{countSummary}</TextShimmer>}
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
                      <span>{r.icon}</span>
                      <span className={css.activityText}>{r.text}</span>
                    </div>
                  ))}
                  {(summary?.rows ?? []).length === 0 && <span className={css.activityEmpty}>{props.t('statusNoMemberActivity')}</span>}
                </div>
              </DisclosureRow>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** 活标题（HITL 挂起时"研究状态 · ⏳ 等你拍板"）——共享 journal 流折算。 */
export function ResearchStatusTitle(props: PropsRuntime<'sidebar.right.pane.tab.title'> & ResearchStatusTitleInjected): ReactNode {
  const [hitl, setHitl] = useState<HitlState>({ pending: false, since: undefined })
  const { sessionId, follow } = props
  useEffect(() => {
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
  return hitl.pending ? props.labels.pending : props.labels.idle
}
