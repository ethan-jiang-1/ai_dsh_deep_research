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
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { InputActions } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { countText } from '../lib/shared/i18n.ts'
import type { TeamMemberProjection, TeamProjection, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import { formatPlanNodeMention, parseResearchRefToken } from '../lib/events/research-references.ts'
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
import { useContainerWidth } from './useContainerWidth.ts'
import { useGraphFeed } from './research-graph/useGraphFeed.ts'
import type { GraphNodeView, ResearchGraphTabProps } from './research-graph/types.ts'
import { formatClock, shortLabel } from './research-graph/format.ts'
import { graphStateNote, snapshotDiffMessage } from './research-graph/state-note.ts'
import { NodeCard } from './research-graph/NodeCard.tsx'
import { GraphVersionRail } from './research-graph/GraphVersionRail.tsx'
import { GraphNotices } from './research-graph/GraphNotices.tsx'
import { DagMap } from './research-graph/DagMap.tsx'
import styles from './research-graph/graph.module.css'
export type { ResearchGraphInjected, ResearchGraphTabProps } from './research-graph/types.ts'

interface GraphTabInfo {
  readonly sidebar?: { readonly fullscreen?: boolean }
  readonly tab?: {
    readonly navigation?: { readonly revision?: number; readonly params?: { readonly nodeId?: unknown } | undefined }
    readonly actions?: { readonly bindCommands?: (c: { refresh: () => void }) => () => void }
  }
}

/**
 * 「研究图谱」页签体（只读观察）。
 * @param props - 槽标准 props + 注入面（readFile / openOwner）。
 */
export function ResearchGraphTab(props: ResearchGraphTabProps): ReactNode {
  const tabInfoHost = props as unknown as { readonly useTabInfo?: () => GraphTabInfo }
  const tabInfo = typeof tabInfoHost.useTabInfo === 'function' ? tabInfoHost.useTabInfo() : undefined
  const isFullscreen = tabInfo?.sidebar?.fullscreen === true
  const navNodeId = typeof tabInfo?.tab?.navigation?.params?.nodeId === 'string'
    ? tabInfo.tab.navigation.params.nodeId
    : null
  const navRevision = tabInfo?.tab?.navigation?.revision ?? 0
  // 当前会话若是 teammate，读 Lead 的团队投影（TeamAction 同款；队员自己的投影没有整队视图）。
  const leadSessionId = props.useSession((snapshot) => snapshot.subagent?.address.parentSessionId) ?? props.sessionId
  const team: TeamProjection | undefined = props.useSessions((state) => state.projectionsBySession[leadSessionId]?.values.agentTeam)
  const statuses = props.useSessionStatus((state) => state)
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null)
  const rootWidth = useContainerWidth(rootEl)
  const dagWide = isFullscreen && (rootWidth === null || rootWidth >= 768)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [insertedId, setInsertedId] = useState<string | null>(null)
  const [scrollRequest, setScrollRequest] = useState<{ readonly id: string; readonly seq: number } | null>(null)
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map())
  const {
    boundSlug, plan, planText, planState, planVersion, snapshots, latestSnapshot, graphView, setGraphView, retry,
    snapshotPlan, snapshotState, showSnapshotPlan, setShowSnapshotPlan, planLoadedAt, followError,
    snapshotsState,
  } = useGraphFeed(props, leadSessionId)
  const prevScopeRef = useRef<{ readonly lead: string; readonly slug: string | null }>({ lead: leadSessionId, slug: boundSlug })
  useEffect(() => {
    const prev = prevScopeRef.current
    if (prev.lead === leadSessionId && prev.slug === boundSlug) return
    const preserveNavBind = prev.lead === leadSessionId && prev.slug === null && boundSlug !== null && navNodeId !== null && navNodeId !== ''
    prevScopeRef.current = { lead: leadSessionId, slug: boundSlug }
    if (!preserveNavBind) setExpandedId(null)
    setCopiedId(null)
    setInsertedId(null)
    setScrollRequest(null)
  }, [leadSessionId, boundSlug, navNodeId])
  useEffect(() => {
    const bind = tabInfo?.tab?.actions?.bindCommands
    if (typeof bind !== 'function') return undefined
    return bind({ refresh: retry })
  }, [tabInfo, retry])
  useEffect(() => {
    if (navNodeId !== null && navNodeId !== '') {
      setGraphView('current')
      setExpandedId(navNodeId)
    }
  }, [navNodeId, navRevision, setGraphView])
  useEffect(() => {
    if (scrollRequest === null || graphView !== 'current') return
    const target = cardRefs.current.get(`selected:${scrollRequest.id}`)
      ?? cardRefs.current.get(`list:${scrollRequest.id}`)
    if (target === undefined) return
    target.scrollIntoView?.({ block: 'nearest' })
    setScrollRequest(null)
  }, [scrollRequest, graphView, expandedId])
  const registerCardRef = useCallback((key: string, el: HTMLElement | null): void => {
    if (el === null) cardRefs.current.delete(key)
    else cardRefs.current.set(key, el)
  }, [])
  const inputActions = (props as { inputActions?: InputActions }).inputActions

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
  const planNodeById = new Map(planNodes.map((node) => [node.id, node]))
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
  const resolveExec = (task: TeamTaskView | undefined, fallbackOwner?: string) => {
    const owner = task?.ownerName ?? fallbackOwner
    const member = owner !== undefined ? memberByName.get(owner) : undefined
    const running = member !== undefined ? statuses.get(member.id)?.running : undefined
    const attentionItem = task !== undefined ? attention.find((entry) => entry.taskId === task.id) : undefined
    return { owner, member, running, attentionItem }
  }

  // 顶层图只画 parent 缺省的 active 节点；W3.1… 默认收在 W3 详情里（复合节点折叠；墓碑不进图）。
  const graphNodes: readonly GraphNodeView[] = planNodes.length > 0
    ? topPlanNodes.map((planNode) => {
      const task = taskByPlanId.get(planNode.id)
      const { owner, member, running, attentionItem } = resolveExec(task, planNode.ownerRole)
      // 状态词表归 graph-model：未映射 / 失效 / plan-only 都显示“状态未知/无任务”，
      // 绝不在没有映射时落回“未执行”；投影未就绪时不给映射结论。
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
      const { owner, member, running, attentionItem } = resolveExec(task)
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
  const selectedNode = expandedId !== null ? graphNodes.find((n) => n.id === expandedId) ?? null : null
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
    if (node.planNode !== undefined) {
      for (const child of childrenByParent.get(node.planNode.id) ?? []) {
        const childTask = taskByPlanId.get(child.id)
        if (childTask !== undefined && !nodeByTaskId.has(childTask.id)) nodeByTaskId.set(childTask.id, node)
      }
    }
  }

  const focusNode = (nodeId: string): void => {
    setGraphView('current')
    setExpandedId(nodeId)
    setScrollRequest((prev) => ({ id: nodeId, seq: (prev?.seq ?? 0) + 1 }))
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

  const canInsertReference = (nodeId: string): boolean => (
    inputActions !== undefined
    && boundSlug !== null
    && parseResearchRefToken(formatPlanNodeMention(boundSlug, nodeId)) !== null
  )

  // 一键填入 `@drt_<slug>/W#.#` 到对话草稿，不自动发送（D18 只读边界；insertText 失败绝不 setDraft 清空用户草稿，BUG-479）。
  const insertReference = (node: GraphNodeView): void => {
    if (inputActions === undefined || boundSlug === null) return
    const text = formatPlanNodeMention(boundSlug, node.id)
    if (parseResearchRefToken(text) === null) return
    const payload = `${text} `
    const span = inputActions.captureInsertion()
    if (!inputActions.insertText(payload, span)) return
    if (isFullscreen) props.toggleFullscreen?.()
    setInsertedId(node.id)
    setTimeout(() => { setInsertedId((current) => current === node.id ? null : current) }, 1800)
  }

  const childStateOf = (childId: string) => {
    if (!teamReady) return projectionPendingState(props.t)
    const { running, attentionItem } = resolveExec(taskByPlanId.get(childId), planNodeById.get(childId)?.ownerRole)
    return planNodeStateOf(mappingIndex.mapping.get(childId), running, attentionItem, props.t)
  }

  // 有边/无边两条渲染分支共用同一张卡；此前两处逐字重复，改一处忘另一处会分叉。
  const renderNodeCard = (node: GraphNodeView, slot: 'selected' | 'list') => (
    <NodeCard
      key={node.id}
      node={node}
      expanded={expandedId === node.id}
      onToggle={() => { setExpandedId(expandedId === node.id ? null : node.id) }}
      copied={copiedId === node.id}
      onCopy={() => { copyReference(node) }}
      inserted={insertedId === node.id}
      {...(canInsertReference(node.id) ? { onInsertRef: () => { insertReference(node) } } : {})}
      {...(node.member !== undefined ? { onOpenOwner: () => { openOwner(node.member as TeamMemberProjection) } } : {})}
      cardRef={(el) => { registerCardRef(`${slot}:${node.id}`, el) }}
      children={node.planNode !== undefined ? childrenByParent.get(node.planNode.id) ?? [] : []}
      childStateOf={childStateOf}
      leadSessionId={leadSessionId}
      useSessions={props.useSessions}
      useSessionStatus={props.useSessionStatus}
      boundSlug={boundSlug}
      t={props.t}
    />
  )

  return (
    // 滚动义务在页签体自己（vendor .tabBody = overflow:hidden 的定高 flex 列——同状态页/终稿页）。
    <div ref={setRootEl} className={styles.tabRoot}>
      <div className={styles.tabHeader}>
        <strong className={styles.tabTitle}>{props.t('graphHeader')}</strong>
        <span className={styles.readonlyBadge}>{props.t('graphReadonly')}</span>
        {boundSlug !== null && <span className={styles.mutedSlug}>{props.t('graphRunSlug', { slug: shortLabel(boundSlug, 32) })}</span>}
        <span className={styles.mutedLine}>
          {hasPlan ? `${props.t('graphPlanLoaded', { version: '' }).trim()} ${countText(props.t, topPlanNodes.length, 'graphTopLevelOne', 'graphTopLevelOther')}${planNodes.length !== topPlanNodes.length ? ` / ${countText(props.t, planNodes.length, 'graphPlanNodesTotalOne', 'graphPlanNodesTotalOther')}` : ''} · ` : ''}{countText(props.t, counts.total, 'graphTeamTasksOne', 'graphTeamTasksOther', { done: String(counts.done) })}
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
      {graphView === 'diff' && latestSnapshot !== null && (
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

      {hasEdges && graphView === 'current' && (
        <>
          <DagMap
            nodes={graphNodes}
            selectedId={selectedNode?.id ?? null}
            childCounts={childCounts}
            wide={dagWide}
            onSelect={(id) => { setExpandedId((current) => (current === id ? null : id)) }}
            t={props.t}
          />
          <div className={styles.edgesHint}>
            {props.t('graphEdgesHint')}
          </div>
          {selectedNode !== null && (
            <section className={styles.selectedNodeSection} data-testid="graph-selected-node">
              <div className={styles.sectionEyebrow}>{props.t('graphSelectedNode')}</div>
              {renderNodeCard(selectedNode, 'selected')}
            </section>
          )}
        </>
      )}

      {graphView === 'current' && (hasEdges ? (
        <details className={styles.allNodesDetails} data-testid="graph-all-nodes">
          <summary className={styles.allNodesSummary}>
            {props.t('graphAllNodesToggle', { count: String(graphNodes.length) })}
          </summary>
          <div className={styles.allNodesBody}>
            {waves.map((wave) => (
              <section key={wave.level} className={styles.selectedNodeSection}>
                <div className={styles.waveTitle}>
                  {props.t('graphWaveTitle', { index: String(wave.level + 1) })}{wave.tasks.length > 1 ? props.t('parallelCount', { count: String(wave.tasks.length) }) : ''}
                </div>
                {wave.tasks.map((node) => renderNodeCard(node, 'list'))}
              </section>
            ))}
          </div>
        </details>
      ) : graphNodes.length > 0 && (
        <section className={styles.selectedNodeSection}>
          <div className={styles.waveTitle}>{props.t('graphNoEdges')}</div>
          {graphNodes.map((node) => renderNodeCard(node, 'list'))}
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
