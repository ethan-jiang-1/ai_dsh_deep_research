/**
 * 「研究状态」页签体（UI 优先版：把界面弄对——RFC research-status-ui）。
 *
 * 自上而下七区（一眼回答"研究到哪了、谁在干什么、等没等我、我在哪出手"）：
 *   ① HITL 挂起横幅（点名锚点 + 参与指引——hitl-fold.deriveAnchors）；
 *   ② 流程轨道 = ◆立项确认 + 七步 + ◆交付审阅（锚点段从 journal 折算、步骤段从 bundle 文件
 *      在场性折算——两段数据源分开，HITL1 等待时 bundle 未建而锚点仍在场）；
 *   ③ 研究问题行（question.md 首行，剥 markdown 强调符）；
 *   ④ 团队动态 = 人性化活动流（activity-fold：🔍/👥/💬/📦，噪音过滤——**原始事件类型名不出正文**）；
 *   ⑤ 证据概览 + 交付状态（evidence/ 计数 + `deliverables/presented` 见证 → ✅ 已交付 + rerun 三分图例）；
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
 * 分层纪律：折算全住 src/lib 纯函数（keyless 单测）；组件薄渲染。
 */
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { deriveSteps } from '../lib/run-fold.ts'
import { foldHitlPending, type HitlState } from '../lib/hitl-fold.ts'
import { deriveBusinessBrief, type BusinessBrief } from '../lib/brief-fold.ts'
import { RERUN_TRIAGE_HINT, RERUN_TRIAGE_ROWS, RERUN_TRIAGE_TITLE } from '../lib/rerun-triage.ts'
import type { ResearchStatusTabProps, ResearchStatusTitleInjected } from './research-status/types.ts'
import { TrackRail } from './research-status/TrackRail.tsx'
import { useStatusFeed } from './research-status/useStatusFeed.ts'
export type { FollowTarget, JournalFrame, ResearchStatusTabInjected, ResearchStatusTabProps, ResearchStatusTitleInjected } from './research-status/types.ts'



/**
 * 「研究状态」页签体。
 * @param props 槽 props + 注入面。
 * @returns 研究状态面板。
 */

export function ResearchStatusTab(props: ResearchStatusTabProps): ReactNode {
  const {
    rows, hitl, face, unbound, trust, kickoffHold, error,
    memberSummaries, members, delivery, streamFailure, anchors, versionFace,
  } = useStatusFeed(props)

  // 流程轨道件（锚点入轨，RFC cockpit-flow-face）：锚点段从 journal+文件折算（挂起期也在场），
  // 步骤段从文件在场性折算——face 缺席时以占位态渲染（不冒充进度）。
  const passedCount = anchors.filter((a) => a.state === 'passed').length
  const pendingAnchor = anchors.find((a) => a.state === 'pending')
  const steps = face !== null ? face.steps : deriveSteps({ question: false, team: false, leads: false, evidence: 0, findings: false, review: false, final: false })
  // 业务摘要（issue 2026-10-11-executive-research-ux-delivery）：既有事实源 → 五问折算。
  // 计数进不了本层（brief-fold 输入面无计数——类型级禁词，keyless 单测钉）；挂起种类由
  // 锚点 key 折算（anchor-1=hitl1 / anchor-2=hitl2 / 其余=契约外 unknown），不引 hitl-fold
  // 内部函数；§Decisions 末位拍板当前数据面未读——lastDecisionKind 如实 null。
  const brief: BusinessBrief = useMemo(
    () => deriveBusinessBrief({
      bundleBound: trust.kind === 'bound',
      kickoffHold,
      hitlPending: hitl.pending,
      pendingKind: pendingAnchor !== undefined ? (pendingAnchor.key === 'anchor-1' ? 'hitl1' : pendingAnchor.key === 'anchor-2' ? 'hitl2' : 'unknown') : null,
      pendingQuestions: pendingAnchor?.questions ?? 0,
      hasQuestion: face?.hasQuestion ?? false,
      questionLine: face?.questionLine ?? null,
      currentStage: face !== null ? steps.find((s) => s.state === 'current')?.label ?? null : null,
      findingsPresent: (face?.steps.find((s) => s.key === 'findings')?.state === 'done'),
      reviewFail: face?.reviewFail ?? null,
      delivered: delivery !== null,
      versions: face?.versions ?? 0,
      lastDecisionKind: null,
      openItems: [],
    }),
    [unbound, trust, kickoffHold, hitl.pending, pendingAnchor, face, steps, delivery],
  )
  return (
    // 滚动义务在页签体自己（vendor .tabBody = overflow:hidden 的定高 flex 列——BUG 2026-10-12
    // 用户报告：活动流超长即被裁且不可滚）：根容器 flex:1 + minHeight:0 吃满宿主高，
    // 双轴 auto 自滚。
    <div style={{ padding: 12, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto' }}>
      {/* ① HITL 挂起横幅（最醒目位置；点名锚点 + 参与指引——"怎么参与"在需要那一刻说清） */}
      {hitl.pending && (
        <div style={{ fontWeight: 700, padding: '8px 12px', marginBottom: 10, borderRadius: 6, background: '#f59e0b33', border: '1px solid #f59e0b66' }}>
          ⏳ 等你拍板——{pendingAnchor?.label ?? '决定'}{pendingAnchor !== undefined && pendingAnchor.questions > 0 ? `（${pendingAnchor.questions} 问）` : ''}：在会话里的问题卡上点选项即可（推荐项已置首）
        </div>
      )}
      {/* 流畸形死亡恢复指引（BUG-023 修复①）：末位回合死于上游流失败且无新回合接手时，
          给人话恢复路径——不虚构"研究失败"，档案都在 bundle。折算 = stream-failure.ts。 */}
      {streamFailure.dead && !hitl.pending && (
        <div style={{ fontWeight: 600, padding: '8px 12px', marginBottom: 10, borderRadius: 6, background: '#ef444418', border: '1px solid #ef444440' }}>
          ⚠️ 上游模型流连续异常，刚才那回合没跑成——研究档案都在。等一两分钟，在对话里发「继续」即可接着跑。
        </div>
      )}
      {/* ⓪ 业务摘要层（issue 2026-10-11-executive-research-ux-delivery）：五问业务语言——
          研究什么 / 已确认什么 / 未知什么 / 我是否要操作；折算住 brief-fold（计数不进本层），
          组件薄渲染。 */}
      <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 6, background: '#22c55e14', border: '1px solid #22c55e33', fontSize: 13, lineHeight: 1.7 }}>
        <div style={{ fontWeight: 700 }}>🎯 {brief.goal}</div>
        <div>{brief.stageLine}</div>
        <div style={{ opacity: 0.85 }}>{brief.knownLine}</div>
        {brief.unknownLine !== null && <div style={{ color: '#b45309' }}>⚠ {brief.unknownLine}</div>}
        <div style={{ fontWeight: brief.userActionNeeded ? 700 : 400, color: brief.userActionNeeded ? '#b45309' : undefined }}>{brief.actionLine}</div>
      </div>
      {/* ② 流程轨道：◆立项确认 + 主轨 + ◆交付审阅 + 交付；↻ 回边 = 拍板的分支后果画进流程 */}
      <TrackRail anchors={anchors} steps={steps} faceVersions={face?.versions ?? null} hitlPending={hitl.pending} />
      {/* ⑥ 决策诚实线（指路不复制——谁答的家在 question.md §Decisions） */}
      {passedCount > 0 && (
        <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.55 }}>
          停靠点已过 {passedCount} 个 · 每次拍板的记录见 question.md §Decisions
        </div>
      )}
      {/* ③ 研究问题行 */}
      {face?.questionLine !== null && face?.questionLine !== undefined && (
        <div style={{ fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>{face.questionLine}</div>
      )}
      {/* ⑤ 证据概览 + 交付状态 + 版本（final/ 记账 ≥v2 = 发生过证据扩张 rerun）
         交付态 = `present` 见证（门②），不是 `final.md` 在场——后者在综合步就有，是"可审"不是"已交"。
          已交付 → 门（读终稿）；未交付 → 承诺（终稿将在交付后自动出现在右栏，许在用户已经在看的地方）。 */}
      {face !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, fontSize: 13, opacity: 0.85 }}>
          <span>证据 {face.evidenceCount} 份</span>
          {delivery !== null && <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ 已交付</span>}
          {delivery !== null && props.sessionId !== undefined && (
            <button
              type="button"
              onClick={() => { props.openFinal(props.sessionId as NonNullable<typeof props.sessionId>, delivery.path) }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#2563eb', fontSize: 13, textDecoration: 'underline' }}
            >读终稿 →</button>
          )}
          {delivery === null && <span style={{ opacity: 0.6 }}>终稿将在交付后自动出现在右栏</span>}
          {versionFace !== null && (face.hasFinal || versionFace.ledgerFinalVersion >= 1) && (
            <span style={{ fontSize: 12, opacity: 0.8 }} title="版本面只读投影：final/vN 是版本账，final.md 是工作稿">
              {versionFace.label}
            </span>
          )}
        </div>
      )}
      {/* 交付后只读出口（rerun 不满转接：三种改法 + 可复制话术；D18 只读——不按钮化 rerun） */}
      {face !== null && delivery !== null && (
        <details style={{ marginBottom: 10, fontSize: 12, opacity: 0.9 }}>
          <summary style={{ cursor: 'pointer' }}>{RERUN_TRIAGE_TITLE}</summary>
          <div style={{ marginTop: 6, lineHeight: 1.6 }}>
            {RERUN_TRIAGE_ROWS.map((row) => (
              <div key={row.label} style={{ marginBottom: 4 }}>
                <strong>{row.label}</strong>：{row.consequence}
                <div style={{ opacity: 0.75 }}>「{row.copy}」</div>
              </div>
            ))}
            <div style={{ opacity: 0.6 }}>{RERUN_TRIAGE_HINT}</div>
          </div>
        </details>
      )}
      {/* 未绑定 / 绑定待确认提示（RFC right-pane-ux-debt + cockpit-flow-face G4） */}
      {unbound && (
        <div style={{ marginBottom: 10, fontSize: 12, opacity: 0.55 }}>
          （本会话未绑定 run bundle——研究状态只跟本会话自己的 run）
        </div>
      )}
      {kickoffHold && (
        <div style={{ marginBottom: 10, fontSize: 12, padding: '6px 10px', borderRadius: 6, background: '#0000000d' }}>
          🌱 这场研究还没开始——立项对齐中，读到的是上一场 run（drt_{trust.kind === 'suppressed' ? trust.slug : ''}）的上下文；落笔开跑后这里显示本场状态。
        </div>
      )}
      {!unbound && !kickoffHold && face === null && trust.kind === 'suppressed' && trust.reason === 'pending' && (
        <div style={{ marginBottom: 10, fontSize: 12, opacity: 0.55 }}>
          （挂起期间不显示 bundle 渐进面——当前绑定仅由读取推断，落笔后确认）
        </div>
      )}
      {error !== null && <div style={{ color: '#b00', marginBottom: 6, fontSize: 12 }}>{error}</div>}
      {/* ④ 团队动态（人性化活动行——原始事件类型名不出正文） */}
      <div style={{ fontSize: 13, lineHeight: 1.7 }}>
        {rows.length === 0 && props.sessionId !== undefined && <span style={{ opacity: 0.5 }}>（研究中，暂无可见动作）</span>}
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 6 }}>
            <span>{r.icon}</span>
            <span style={{ flex: 1 }}>{r.text}</span>
          </div>
        ))}
      </div>
      {/* ⑦ 队员动态折叠区（每人一节，默认折叠；动作粒度 = 检索/抓取/出错——任务粒度归 ui-agent-team 任务板，不双 home） */}
      {members.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12 }}>
          <div style={{ opacity: 0.55, marginBottom: 4 }}>队员动态（检索 / 抓取 / 出错）</div>
          {members.map((m) => {
            const summary = memberSummaries[m.id]
            return (
              <details key={m.id} style={{ marginBottom: 4 }}>
                <summary style={{ cursor: 'pointer' }}>
                  <span style={{ fontWeight: 600 }}>{m.phase === 'active' ? '● ' : m.phase === 'failed' ? '✕ ' : '○ '}{m.name}</span>
                  <span style={{ opacity: 0.6 }}>　🔍{summary?.searchCount ?? 0} · 🌐{summary?.fetchCount ?? 0}{(summary?.errorCount ?? 0) > 0 ? ` · ⚠️${summary?.errorCount}` : ''}</span>
                </summary>
                <div style={{ paddingLeft: 14, lineHeight: 1.7 }}>
                  {(summary?.rows ?? []).map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6 }}>
                      <span>{r.icon}</span>
                      <span style={{ flex: 1 }}>{r.text}</span>
                    </div>
                  ))}
                  {(summary?.rows ?? []).length === 0 && <span style={{ opacity: 0.5 }}>（暂无可见动作）</span>}
                </div>
              </details>
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
  const sessionId = props.sessionId
  useEffect(() => {
    if (sessionId === undefined) return
    const controller = new AbortController()
    void (async () => {
      try {
        let events: unknown[] = []
        for await (const frame of props.follow(sessionId, controller.signal)) {
          if (frame.kind === 'history') events = [...frame.events]
          else events = [...events, frame.event]
          setHitl(foldHitlPending(events))
        }
      } catch (err) { /* 活标题 fail-soft；卸载 abort 不算失败 */ if (!controller.signal.aborted) console.error('[ResearchStatusTab] 活标题流失败', err) }
    })()
    return () => { controller.abort() }
  }, [sessionId])
  return hitl.pending ? '研究状态 · ⏳ 等你拍板' : '研究状态'
}
