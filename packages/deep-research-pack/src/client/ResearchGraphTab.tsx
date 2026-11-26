/**
 * 「研究图谱」页签体（2026-10-21 UX 重做）：**只读观察面**，不是任务板、也不是操作台。
 *
 * 布局：
 *   ① 头部：plan/task 计数 + 「只读观察」标记；
 *   ② 真正的 DAG 小图（SVG：**顶层** plan 节点或 Team 任务，边 = plan deps / blocked_by；
 *      按最长路径分层，同层并行节点横排；复合节点标 `+N`，状态用颜色/圆点，点节点选中）；
 *   ③ 诚实降级：plan 缺席 / Team 板无 blocked_by 时**不画假图**，明确说「没有依赖边可画」，
 *      只给任务快照；旧 run 因此不会被伪装成 Wave 0；
 *   ④ 顶层节点列表 + 选中详情（description 高度上限；复合子节点 W3.1… 在父节点详情展开；
 *      `复制引用` 只复制 `drt_<slug>/W3.1`，不发送）；
 *   ⑤ plan.md 原文（只读折叠）+ plan↔task 映射计数 + 未进 plan 的 Team 任务；
 *      重号/悬空 parent/deps 显示只读结构提示。
 *
 * 交互边界（用户 2026-10-21 定调）：**这里只观察**。不提供「让 Lead 调整」这类动作——
 * 用户要调整时应回到对话/rerun，而不是在一个观察面里发一条不知道调整什么的指令。
 * 唯一动作是「打开负责人」（跳转观察队员会话）与「复制引用」，都不修改 Team 板。
 *
 * 数据面（全部既有投影，零新 RPC）：
 *   - 当前会话若是 teammate → `useSession(subagent.address.parentSessionId)` 找 Lead，读 **Lead**
 *     的 `agentTeam` 投影（`useSessions`；vendor `TeamAction` 同款）；
 *   - 队员忙闲 = `useSessionStatus`；worker chips = 每个队员会话的 `subagentCatalog`；
 *   - plan.md = 先 follow journal 做 `bindingTrust` 找可信的 `drt_<slug>/`，再按根/archive/_abandoned
 *     三位置读 `plan.md`，30s 重读；缺文件合法；不按 workspace 根读。
 *
 * 折算住 `plan-graph 折算件`（Team 图）与 `plan-index 折算件`（plan.md 解析）；本组件只画。fail-soft：空投影/空任务/缺 plan
 * 都退化为如实空态，不 throw。
 */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { countText } from '../lib/shared/i18n.ts'
import type { TeamMemberProjection, TeamProjection, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import {
  DEFAULT_ATTENTION_THRESHOLDS,
  attentionOf,
  countsOf,
  wavesOf,
  type MemberStatus,
} from '../lib/plan/plan-graph.ts'
import { planIssuesOf, type PlanNode } from '../lib/plan/plan-index.ts'
import { planDiffOf, type PlanDiff } from '../lib/plan/plan-diff.ts'
import {
  coverageLineOf,
  coverageOf,
  coverageWarningOf,
  planMappingOf,
  planNodeStateOf,
  nodeStateOf,
  projectionPendingState,
  type GraphCoverage,
} from '../lib/plan/graph-model.ts'
import { assertNever } from '../lib/run/artifact-read.ts'
import type { SnapshotState } from './research-graph/graph-state.ts'
import { useGraphFeed } from './research-graph/useGraphFeed.ts'
import type { GraphNodeView, ResearchGraphTabProps } from './research-graph/types.ts'
import { shortLabel } from './research-graph/format.ts'
import { graphStateNote } from './research-graph/state-note.ts'
import { NodeCard } from './research-graph/NodeCard.tsx'
import { GraphVersionRail } from './research-graph/GraphVersionRail.tsx'
import { GraphNotices } from './research-graph/GraphNotices.tsx'
import { DagMap } from './research-graph/DagMap.tsx'
import styles from './research-graph/graph.module.css'
export type { ResearchGraphInjected, ResearchGraphTabProps } from './research-graph/types.ts'

/** plan.md 只读表头附近（节点表在文首；缺文件合法）。 */






/**
 * 差异卡里「旧图快照为何不可用」的文案（BUG-391）：按 SnapshotState 穷举——除 ready 外每个
 * 状态都要有话说，只有 loading/idle 才是「读取中」。旧实现把 missing 之外的全部折成加载中，
 * 于是 unreadable/empty/invalid 永远显示「旧图快照读取中…」。
 */
function snapshotDiffMessage(state: SnapshotState, t: ResearchGraphTabProps['t']): string {
  switch (state) {
    case 'idle':
    case 'loading':
      return t('oldGraphLoading')
    case 'missing':
      return t('oldGraphUnread')
    case 'empty':
      return t('graphSnapshotEmpty', { version: '' })
    case 'invalid':
      return t('graphSnapshotInvalid', { version: '' })
    case 'unreadable':
      return t('graphSnapshotUnreadable', { version: '' })
    case 'ready':
      return t('oldGraphUnread')
    default:
      return assertNever(state)
  }
}

/** 本地时钟 `HH:MM:SS`（“最后刷新”用；不引入日期库）。 */
function formatClock(ms: number): string {
  const date = new Date(ms)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}




/**
 * 「研究图谱」页签体（只读观察）。
 * @param props - 槽标准 props + 注入面（readFile / openOwner）。
 */
export function ResearchGraphTab(props: ResearchGraphTabProps): ReactNode {
  const tabInfo = typeof (props as { useTabInfo?: () => { tab?: { actions?: { bindCommands?: (c: { refresh: () => void }) => () => void } } } }).useTabInfo === 'function'
    ? (props as { useTabInfo: () => { tab?: { actions?: { bindCommands?: (c: { refresh: () => void }) => () => void } } } }).useTabInfo()
    : undefined
  // 当前会话若是 teammate，读 Lead 的团队投影（TeamAction 同款；队员自己的投影没有整队视图）。
  const leadSessionId = props.useSession((snapshot) => snapshot.subagent?.address.parentSessionId) ?? props.sessionId
  const team: TeamProjection | undefined = props.useSessions((state) => state.projectionsBySession[leadSessionId]?.values.agentTeam)
  const statuses = props.useSessionStatus((state) => state)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const {
    boundSlug, plan, planText, planState, planVersion, snapshots, latestSnapshot, graphView, setGraphView, retry,
    snapshotPlan, snapshotState, showSnapshotPlan, setShowSnapshotPlan, planLoadedAt, followError,
    snapshotsState,
  } = useGraphFeed(props, leadSessionId)
  useEffect(() => {
    const bind = tabInfo?.tab?.actions?.bindCommands
    if (typeof bind !== 'function') return undefined
    return bind({ refresh: retry })
  }, [tabInfo, retry])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // journal → 本会话可信绑定的 run bundle（只用于 plan 基址；不折活动流）。
  // read 弱绑定在立项/挂起期不可信（binding-trust 单一政策）；write 命中后才显示 plan。
  const teamReady = team !== undefined
  const tasks: readonly TeamTaskView[] = team?.tasks ?? []
  const members: readonly TeamMemberProjection[] = team?.members ?? []
  const memberByName = new Map<string, TeamMemberProjection>()
  const memberStatus = new Map<string, MemberStatus>()
  for (const member of members) {
    const running = statuses.get(member.id)?.running
    const status: MemberStatus = { phase: member.phase, running }
    memberStatus.set(member.name, status)
    memberStatus.set(member.id, status)
    memberByName.set(member.name, member)
  }
  const attention = attentionOf(tasks, memberStatus, Date.now(), DEFAULT_ATTENTION_THRESHOLDS, props.t)
  const counts = countsOf(tasks, memberStatus)
  const planNodes: readonly PlanNode[] = plan?.nodes ?? []
  const topPlanNodes: readonly PlanNode[] = (plan?.topLevel ?? planNodes)
    .filter((node, index, all) => all.findIndex((candidate) => candidate.id === node.id) === index)
  const childrenByParent = plan?.childrenByParent ?? new Map<string, readonly PlanNode[]>()
  const planIssues = planIssuesOf(plan, props.t)
  const childCounts = new Map<string, number>()
  for (const [parentId, children] of childrenByParent) childCounts.set(parentId, children.length)

  // plan ↔ Team 任务映射（task_id / id 精确；不按数字后缀猜）。折算住 `graph-model 折算件`：
  // 没有映射的节点是**状态未知**，不是“未执行”（BUG-043）。
  const mappingIndex = planMappingOf(plan, tasks)
  const taskByPlanId = mappingIndex.taskByPlanId
  const coverage: GraphCoverage = coverageOf(plan, tasks, mappingIndex)
  const coverageWarning = coverageWarningOf(coverage, props.t)
  const unmappedTasks = planNodes.length > 0 ? mappingIndex.tasksOutsidePlan : []

  // 顶层图只画 parent 缺省的 active 节点；W3.1… 默认收在 W3 详情里（复合节点折叠；墓碑不进图）。
  const graphNodes: readonly GraphNodeView[] = planNodes.length > 0
    ? topPlanNodes.map((planNode) => {
      const task = taskByPlanId.get(planNode.id)
      const owner = task?.ownerName ?? planNode.ownerRole
      const member = owner !== undefined ? memberByName.get(owner) : undefined
      const running = member !== undefined ? statuses.get(member.id)?.running : undefined
      const attentionItem = task !== undefined ? attention.find((entry) => entry.taskId === task.id) : undefined
      // 状态词表归 graph-model：未映射 / 失效 / plan-only 都显示“状态未知/无任务”，
      // 绝不在没有映射时落回“未执行”。
      // 投影未就绪时不给映射结论：这是“还没收到数据”，不是“映射缺口”。
      const state = teamReady
        ? planNodeStateOf(mappingIndex.mapping.get(planNode.id), running, attentionItem, props.t)
        : projectionPendingState(props.t)
      return {
        id: planNode.id,
        label: planNode.kind ?? planNode.id,
        subject: planNode.question ?? planNode.output ?? '',
        ...(owner !== undefined ? { ownerName: owner } : {}),
        status: task?.status ?? 'unplanned',
        blockedBy: planNode.deps,
        ...(task !== undefined ? { task } : {}),
        planNode,
        ...(member !== undefined ? { member } : {}),
        ...(running !== undefined ? { running } : {}),
        ...(attentionItem !== undefined ? { attention: attentionItem } : {}),
        state,
      }
    })
    : tasks.map((task) => {
      const owner = task.ownerName
      const member = owner !== undefined ? memberByName.get(owner) : undefined
      const running = member !== undefined ? statuses.get(member.id)?.running : undefined
      const attentionItem = attention.find((entry) => entry.taskId === task.id)
      return {
        id: task.id,
        label: task.subject ?? task.id,
        subject: task.subject ?? '',
        ...(owner !== undefined ? { ownerName: owner } : {}),
        status: task.status,
        blockedBy: task.blockedBy,
        task,
        ...(member !== undefined ? { member } : {}),
        ...(running !== undefined ? { running } : {}),
        ...(attentionItem !== undefined ? { attention: attentionItem } : {}),
        state: nodeStateOf(task, running, attentionItem, props.t),
      }
    })

  const planDiff: PlanDiff | null = snapshotPlan !== null && plan !== null ? planDiffOf(snapshotPlan, plan, props.t) : null

  const knownIds = new Set(graphNodes.map((node) => node.id))
  const hasEdges = graphNodes.some((node) => node.blockedBy.some((dep) => dep !== node.id && knownIds.has(dep)))
  const hasPlan = planNodes.length > 0
  const hasTopLevel = topPlanNodes.length > 0

  // 降级说明（纯映射，住 research-graph/state-note.ts）
  const stateNote = graphStateNote({ planState, boundSlug, followError, hasPlan, hasEdges, hasTopLevel }, props.t)
  const waves = wavesOf(graphNodes)
  const nodeByTaskId = new Map<string, GraphNodeView>()
  for (const node of graphNodes) {
    if (node.task !== undefined) nodeByTaskId.set(node.task.id, node)
  }

  const focusNode = (nodeId: string): void => {
    setExpandedId(nodeId)
    if (typeof document === 'undefined') return
    document.getElementById(`research-graph-${nodeId}`)?.scrollIntoView({ block: 'nearest' })
  }
  const focusTask = (taskId: string): void => {
    const node = nodeByTaskId.get(taskId)
    focusNode(node?.id ?? taskId)
  }
  const openOwner = (member: TeamMemberProjection): void => {
    const opener = props.openOwner
    if (typeof opener !== 'function') return
    try {
      opener(leadSessionId, member.id)
    } catch (cause) {
      /* @silent-catch: opener telemetry is fail-soft in read-only graph pane */
      console.error('[research-graph] 打开负责人失败', String(cause))
    }
  }

  // 只复制引用，不发任何指令；用户把 `drt_<slug>/W3.1` 贴回对话即可。
  const copyReference = (node: GraphNodeView): void => {
    const text = boundSlug !== null ? `drt_${boundSlug}/${node.id}` : node.id
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard
    if (clipboard === undefined) return
    void clipboard.writeText(text).then(() => {
      setCopiedId(node.id)
      setTimeout(() => { setCopiedId((current) => current === node.id ? null : current) }, 1800)
    }).catch((cause: unknown) => {
      /* @silent-catch: clipboard write failure is non-fatal in browser pane */
      console.error('[research-graph] 复制引用失败', String(cause))
    })
  }

  // 有边/无边两条渲染分支共用同一张卡；此前两处逐字重复，改一处忘另一处会分叉。
  const renderNodeCard = (node: GraphNodeView) => (
    <NodeCard
      key={node.id}
      node={node}
      expanded={expandedId === node.id}
      onToggle={() => { setExpandedId(expandedId === node.id ? null : node.id) }}
      copied={copiedId === node.id}
      onCopy={() => { copyReference(node) }}
      {...(node.member !== undefined ? { onOpenOwner: () => { openOwner(node.member as TeamMemberProjection) } } : {})}
      children={node.planNode !== undefined ? childrenByParent.get(node.planNode.id) ?? [] : []}
      childStateOf={(childId) => (teamReady ? planNodeStateOf(mappingIndex.mapping.get(childId), undefined, undefined, props.t) : projectionPendingState(props.t))}
      leadSessionId={leadSessionId}
      useSessions={props.useSessions}
      useSessionStatus={props.useSessionStatus}
      boundSlug={boundSlug}
      t={props.t}
    />
  )


  return (
    // 滚动义务在页签体自己（vendor .tabBody = overflow:hidden 的定高 flex 列——同状态页/终稿页）。
    <div className={styles.tabRoot}>
      <div className={styles.tabHeader}>
        <strong className={styles.tabTitle}>{props.t('graphHeader')}</strong>
        <span className={styles.readonlyBadge}>{props.t('graphReadonly')}</span>
        {boundSlug !== null && <span className={styles.mutedSlug}>run drt_{shortLabel(boundSlug, 32)}</span>}
        <span className={styles.mutedLine}>
          {hasPlan ? `${props.t('graphPlanLoaded', { version: '' })} ${String(topPlanNodes.length)} ${topPlanNodes.length === 1 ? 'top-level' : 'top-level'}${planNodes.length !== topPlanNodes.length ? ` / ${String(planNodes.length)} nodes` : ''} · ` : ''}{countText(props.t, counts.total, 'graphTeamTasksOne', 'graphTeamTasksOther', { done: String(counts.done) })}
        </span>
        {counts.running > 0 && <span className={`${styles.runningText} ${styles.mutedLine}`}>● {props.t('graphRunning', { count: String(counts.running) })}</span>}
        {counts.ready > 0 && <span className={`${styles.warnText} ${styles.mutedLine}`}>○ {props.t('graphReady', { count: String(counts.ready) })}</span>}
        {counts.stalled > 0 && <span className={`${styles.warnText} ${styles.mutedLine}`}>⚠ {props.t('graphStalled', { count: String(counts.stalled) })}</span>}
      </div>

      <GraphVersionRail
        hasPlan={hasPlan}
        planVersion={planVersion}
        snapshots={snapshots}
        latestSnapshot={latestSnapshot}
        showSnapshotPlan={showSnapshotPlan}
        setShowSnapshotPlan={setShowSnapshotPlan}
        graphView={graphView}
        setGraphView={setGraphView}
        snapshotState={snapshotState}
        snapshotPlan={snapshotPlan}
        snapshotsState={snapshotsState}
        t={props.t}
      />

      {/* 结构差异：只比 id/lifecycle/deps（重编号靠 superseded_by，不解析散文）。 */}
      {graphView === 'diff' && (
        <div className={styles.cardBox}>
          <div className={styles.diffHeading}>{props.t('graphStructDiff', { from: String(latestSnapshot) })}</div>
          {planDiff === null ? (
            <>
              <div className={styles.mutedLine}>{snapshotDiffMessage(snapshotState, props.t)}</div>
              {(snapshotState === 'missing' || snapshotState === 'empty' || snapshotState === 'invalid' || snapshotState === 'unreadable') && (
                <button type="button" onClick={retry} className={styles.retryBtn}>{props.t('graphRetryRead')}</button>
              )}
            </>
          ) : (
            <>
              <div className={styles.diffSummary}>{planDiff.summary}</div>
              {planDiff.added.length > 0 && <div className={`${styles.addedText} ${styles.diffDetail}`}>{props.t('planAdded', { items: planDiff.added.join(', ') })}</div>}
              {planDiff.removed.length > 0 && <div className={`${styles.warnText} ${styles.diffDetail}`}>{props.t('planRemoved', { items: planDiff.removed.join(', ') })}</div>}
              {planDiff.aliases.length > 0 && <div className={`${styles.aliasText} ${styles.diffDetail}`}>{props.t('planRenumbered', { items: planDiff.aliases.map((alias) => `${alias.from} → ${alias.to}`).join('、') })}</div>}
              {planDiff.dependencyChanges.length > 0 && <div className={`${styles.warnText} ${styles.diffDetail}`}>{props.t('planDepsChanged', { items: planDiff.dependencyChanges.map((change) => `${change.id}（${change.from.join(',') || '—'} → ${change.to.join(',') || '—'}）`).join('；') })}</div>}
              {planDiff.kept.length > 0 && <div className={styles.mutedLine}>{countText(props.t, planDiff.kept.length, 'graphKeptOne', 'graphKeptOther')}</div>}
            </>
          )}
        </div>
      )}

      {(hasPlan && teamReady && coverageWarning !== null || stateNote !== null) && (
        <div className={styles.banner}>
          {hasPlan && teamReady && coverageWarning !== null && (
            <div className={stateNote !== null ? styles.bannerGroupGap : undefined}>
              <div className={`${styles.bannerTitle} ${styles.bannerTitleWarn}`}>{props.t('graphMappingGap')}</div>
              <div className={styles.mutedLine}>{coverageWarning}</div>
            </div>
          )}
          {stateNote !== null && (
            <div>
              <div className={styles.bannerTitle}>{stateNote.title}</div>
              <div className={styles.mutedLine}>{stateNote.body}</div>
              {planState === 'error' && (
                <button type="button" onClick={retry} className={styles.retryBtn}>{props.t('graphRetryRead')}</button>
              )}
            </div>
          )}
        </div>
      )}

      {hasPlan && (
        <div className={styles.planLoadedRow}>
          {props.t('graphPlanLoaded', { version: plan?.version !== undefined ? ` ${String(plan.version)}` : '' })} · {countText(props.t, coverage.planNodes, 'graphCoverageOne', 'graphCoverageOther', { top: String(coverage.topNodes) })} · {teamReady ? coverageLineOf(coverage, props.t) : props.t('graphWaitingTeam')}
          {planLoadedAt !== null ? props.t('refreshAt', { clock: formatClock(planLoadedAt) }) : ''}
        </div>
      )}

      <GraphNotices planIssues={planIssues} attention={attention} onFocusTask={focusTask} t={props.t} />

      {team === undefined && (
        <div className={styles.emptyBlock}>
          {props.t('graphNoTeam')}
        </div>
      )}
      {team !== undefined && tasks.length === 0 && planNodes.length === 0 && (
        <div className={styles.emptyBlock}>
          {props.t('graphNoTasks')}
        </div>
      )}

      {hasEdges && graphView === 'current' && (() => {
        const selectedNode = expandedId !== null ? graphNodes.find((n) => n.id === expandedId) ?? null : null
        return (
          <>
            <DagMap nodes={graphNodes} selectedId={expandedId} childCounts={childCounts} onSelect={setExpandedId} t={props.t} />
            <div className={styles.edgesHint}>
              {props.t('graphEdgesHint')}
            </div>
            {selectedNode !== null && (
              <section className={styles.selectedNodeSection} data-testid="graph-selected-node">
                <div className={styles.sectionEyebrow}>{props.t('graphSelectedNode')}</div>
                {renderNodeCard(selectedNode)}
              </section>
            )}
          </>
        )
      })()}

      {graphView === 'current' && (hasEdges ? (
        <details className={styles.allNodesDetails} data-testid="graph-all-nodes">
          <summary className={styles.allNodesSummary}>
            {props.t('graphAllNodesToggle', { count: String(graphNodes.length) })}
          </summary>
          <div className={styles.allNodesBody}>
            {waves.map((wave) => (
              <section key={wave.level} className={styles.selectedNodeSection}>
                <div className={styles.waveTitle}>
                  WAVE {wave.level + 1}{wave.tasks.length > 1 ? props.t('parallelCount', { count: String(wave.tasks.length) }) : ''}
                </div>
                {wave.tasks.map((node) => renderNodeCard(node))}
              </section>
            ))}
          </div>
        </details>
      ) : graphNodes.length > 0 && (
        <section className={styles.selectedNodeSection}>
          <div className={styles.waveTitle}>{props.t('graphNoEdges')}</div>
          {graphNodes.map((node) => renderNodeCard(node))}
        </section>
      ))}

      {unmappedTasks.length > 0 && (
        <section className={styles.selectedNodeSection}>
          <div className={styles.waveTitle}>{props.t('graphUnplannedTasks')}</div>
          {unmappedTasks.map((task) => (
            <div key={task.id} className={`${styles.cardBox} ${styles.diffSummary}`}>
              <strong>{task.id}</strong> · {shortLabel(task.subject ?? task.id, 60)} · {props.t('graphOwner', { name: task.ownerName ?? props.t('unassigned') })} · {task.status}
            </div>
          ))}
        </section>
      )}

      {planState === 'ready' && planText !== null && (
        <details className={styles.planDetails}>
          <summary className={styles.detailsSummary}>{props.t('graphPlanSource')}</summary>
          <pre className={styles.planSourcePre}>{planText}</pre>
        </details>
      )}
    </div>
  )
}
