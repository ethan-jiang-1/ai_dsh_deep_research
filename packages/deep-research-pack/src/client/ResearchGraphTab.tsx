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
 * 折算仍住 `src/lib/plan-graph.ts`（keyless 单测）；本组件只画。fail-soft：空投影/空任务/缺 plan
 * 都退化为如实空态，不 throw。
 */
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { TeamMemberProjection, TeamProjection, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import {
  DEFAULT_ATTENTION_THRESHOLDS,
  attentionOf,
  countsOf,
  planIssuesOf,
  wavesOf,
  type AttentionItem,
  type MemberStatus,
  type PlanNode,
} from '../lib/plan-graph.ts'
import { planDiffOf, type PlanDiff } from '../lib/plan-diff.ts'
import {
  coverageLineOf,
  coverageOf,
  coverageWarningOf,
  planMappingOf,
  planNodeStateOf,
  nodeStateOf,
  PROJECTION_PENDING_STATE,
  type GraphCoverage,
} from '../lib/graph-model.ts'
import { useGraphFeed } from './research-graph/useGraphFeed.ts'
import type { GraphNodeView, ResearchGraphTabProps } from './research-graph/types.ts'
import { shortLabel } from './research-graph/format.ts'
import { DagMap } from './research-graph/DagMap.tsx'
import { WorkerChips } from './research-graph/WorkerChips.tsx'
export type { ResearchGraphInjected, ResearchGraphTabProps } from './research-graph/types.ts'

/** plan.md 只读表头附近（节点表在文首；缺文件合法）。 */


const HEADER_STYLE: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }
const MUTED_STYLE: CSSProperties = { fontSize: 11, opacity: 0.62, lineHeight: 1.5 }
const BADGE_STYLE: CSSProperties = {
  fontSize: 10, padding: '1px 6px', borderRadius: 999, background: '#00000008',
  border: '1px solid #00000014', opacity: 0.8,
}
const BUTTON_STYLE: CSSProperties = {
  fontSize: 12, padding: '2px 8px', borderRadius: 4, border: '1px solid #00000026',
  background: '#00000008', cursor: 'pointer', color: 'inherit',
}
const ATTENTION_ROW_STYLE: CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
  padding: 0, cursor: 'pointer', color: 'inherit', fontSize: 12, lineHeight: 1.5,
}
const EMPTY_STYLE: CSSProperties = { fontSize: 12, opacity: 0.6, lineHeight: 1.6, padding: '6px 0' }
const CARD_STYLE: CSSProperties = {
  border: '1px solid #00000014', borderRadius: 6, padding: '6px 8px', marginBottom: 6, background: '#00000005',
}
const BANNER_STYLE: CSSProperties = {
  marginBottom: 8, padding: '6px 10px', borderRadius: 6,
  background: '#f59e0b12', border: '1px solid #f59e0b38',
}




/** 注意力条目的严重度图标。 */
function severityIcon(severity: AttentionItem['severity']): string {
  return severity === 'critical' ? '✕' : severity === 'warning' ? '⚠' : '·'
}

/** plan.md 节点在 detail 里的只读摘要（只显示真实读到的列）。 */
function planLines(node: PlanNode): ReactNode {
  return (
    <>
      <div style={{ opacity: 0.8 }}>
        plan：{node.id}
        {node.kind !== undefined ? ` · ${node.kind}` : ''}
        {node.stage !== undefined ? ` · stage ${node.stage}` : ''}
        {node.depth !== undefined ? ` · depth ${node.depth}` : ''}
        {node.ownerRole !== undefined ? ` · plan owner ${node.ownerRole}` : ''}
      </div>
      {node.question !== undefined && <div style={{ opacity: 0.8 }}>question：{node.question}</div>}
      {node.deps.length > 0 && <div style={{ opacity: 0.8 }}>plan deps：{node.deps.join(', ')}</div>}
      {node.output !== undefined && <div style={{ opacity: 0.8 }}>output：{node.output}</div>}
      {node.acceptance !== undefined && <div style={{ opacity: 0.8 }}>acceptance：{node.acceptance}</div>}
    </>
  )
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
  // 当前会话若是 teammate，读 Lead 的团队投影（TeamAction 同款；队员自己的投影没有整队视图）。
  const leadSessionId = props.useSession((snapshot) => snapshot.subagent?.address.parentSessionId) ?? props.sessionId
  const team: TeamProjection | undefined = props.useSessions((state) => state.projectionsBySession[leadSessionId]?.values.agentTeam)
  const statuses = props.useSessionStatus((state) => state)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const {
    boundSlug, plan, planText, planState, planVersion, snapshots, latestSnapshot, graphView, setGraphView,
    snapshotPlan, snapshotState, showSnapshotPlan, setShowSnapshotPlan, planLoadedAt, followError,
  } = useGraphFeed(props, leadSessionId)
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
  const attention = attentionOf(tasks, memberStatus, Date.now(), DEFAULT_ATTENTION_THRESHOLDS)
  const counts = countsOf(tasks, memberStatus)
  const planNodes: readonly PlanNode[] = plan?.nodes ?? []
  const topPlanNodes: readonly PlanNode[] = (plan?.topLevel ?? planNodes)
    .filter((node, index, all) => all.findIndex((candidate) => candidate.id === node.id) === index)
  const childrenByParent = plan?.childrenByParent ?? new Map<string, readonly PlanNode[]>()
  const planIssues = planIssuesOf(plan)
  const childCounts = new Map<string, number>()
  for (const [parentId, children] of childrenByParent) childCounts.set(parentId, children.length)

  // plan ↔ Team 任务映射（task_id / id 精确；不按数字后缀猜）。折算住 `src/lib/graph-model.ts`：
  // 没有映射的节点是**状态未知**，不是“未执行”（BUG-043）。
  const mappingIndex = planMappingOf(plan, tasks)
  const taskByPlanId = mappingIndex.taskByPlanId
  const coverage: GraphCoverage = coverageOf(plan, tasks, mappingIndex)
  const coverageWarning = coverageWarningOf(coverage)
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
        ? planNodeStateOf(mappingIndex.mapping.get(planNode.id), running, attentionItem)
        : PROJECTION_PENDING_STATE
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
        state: nodeStateOf(task, running, attentionItem),
      }
    })

  const planDiff: PlanDiff | null = snapshotPlan !== null && plan !== null ? planDiffOf(snapshotPlan, plan) : null

  const knownIds = new Set(graphNodes.map((node) => node.id))
  const hasEdges = graphNodes.some((node) => node.blockedBy.some((dep) => dep !== node.id && knownIds.has(dep)))
  const hasPlan = planNodes.length > 0
  const hasTopLevel = topPlanNodes.length > 0
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
      console.error('[research-graph] 复制引用失败', String(cause))
    })
  }

  const stateNote = (() => {
    if (planState === 'loading') return null
    if (planState === 'truncated') {
      return {
        title: 'plan.md 过长，已截断',
        body: '只读了前 800 行；图谱可能不完整。修正 = 拆分 plan 或提高读策略（run-context 的 plan 上限）。',
      }
    }
    if (boundSlug === null && followError !== null) {
      // 读失败 ≠ 没有 run（BUG-045）：把流故障与"未绑定"分开，否则用户/agent 会把
      // 瞬时的 journal 断连读成"这个会话还没开始研究"。
      return {
        title: '绑定状态读取失败',
        body: `journal 流断开（${followError}）——"读不到"不等于"本会话没有 run"；已自动重试，连接恢复后这里会自动补上。`,
      }
    }
    if (boundSlug === null) {
      return {
        title: '本会话尚未绑定 run',
        body: 'journal 里还没有可信的 `drt_<slug>/` 写入（立项/预检读旧 bundle 不算）。Team 任务仍显示；Lead 写 plan.md 后这里会自动出现 DAG。',
      }
    }
    if (hasPlan && !hasTopLevel) {
      return {
        title: 'plan 只有子节点，顶层图为空',
        body: '子节点必须挂在真实父节点上；看下方「plan 结构提示」修正 parent，或补回顶层节点。',
      }
    }
    if (hasPlan && hasEdges) return null
    if (hasPlan && !hasEdges) return { title: 'plan 有节点，但 Team 板没有 blocked_by', body: '图按 plan deps 画；执行镜像没有记录依赖边。' }
    if (!hasPlan && hasEdges) return { title: 'plan.md 缺席；图来自 Team blocked_by', body: '旧 run 常见。图是任务板的依赖，不是 plan.md 的执行图。' }
    return {
      title: '没有可画的 DAG',
      body: planState === 'missing'
        ? '此 run 没有 plan.md（旧 run / 未落盘），Team 板也没有 blocked_by。下面是任务快照，不是 DAG；rerun 会按 plan.md 生成执行图。'
        : 'plan.md 没有可读节点表，Team 板也没有 blocked_by。下面是任务快照，不是 DAG。',
    }
  })()

  const renderNode = (node: GraphNodeView): ReactNode => {
    const task = node.task
    const planNode = node.planNode
    const member = node.member
    const expanded = expandedId === node.id
    const childNodes = planNode !== undefined ? childrenByParent.get(planNode.id) ?? [] : []
    return (
      <article key={node.id} id={`research-graph-${node.id}`} style={{ ...CARD_STYLE, borderLeft: `3px solid ${node.state.color}` }}>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => { setExpandedId(expanded ? null : node.id) }}
          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit' }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 13 }}>{node.id}</strong>
            {planNode?.kind !== undefined && <span style={{ fontSize: 11, opacity: 0.65 }}>{planNode.kind}</span>}
            {planNode?.stage !== undefined && <span style={{ fontSize: 10, opacity: 0.55 }}>stage {planNode.stage}</span>}
            {childNodes.length > 0 && <span style={{ fontSize: 10, color: '#6366f1' }}>内部 {String(childNodes.length)}</span>}
            <span style={{ fontSize: 12, flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{shortLabel(node.subject, 72)}</span>
            <span style={{ fontSize: 11, color: node.state.color, whiteSpace: 'nowrap' }}>{node.state.icon} {node.state.text}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, opacity: 0.65, marginTop: 2 }}>
            <span>owner：{node.ownerName ?? '未指派'}</span>
            {node.blockedBy.length > 0 && <span>deps：{node.blockedBy.join(', ')}</span>}
            {planNode?.depth !== undefined && <span>depth：{planNode.depth}</span>}
            {task !== undefined && <span>task：{task.id}</span>}
            {member !== undefined && (
              <WorkerChips memberId={member.id} useSessions={props.useSessions} useSessionStatus={props.useSessionStatus} />
            )}
          </div>
        </button>
        {expanded && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #00000010', fontSize: 12, lineHeight: 1.6 }}>
            {task?.description !== undefined && task.description !== '' && (
              <div style={{ whiteSpace: 'pre-wrap', opacity: 0.85, maxHeight: 120, overflowY: 'auto', paddingRight: 4 }}>{task.description}</div>
            )}
            <div style={{ opacity: 0.8 }}>owner：{node.ownerName ?? '未指派'}{member !== undefined ? `（${member.phase}）` : ''}</div>
            {node.blockedBy.length > 0 && <div style={{ opacity: 0.8 }}>依赖：{node.blockedBy.join(', ')}</div>}
            {task !== undefined && <div style={{ opacity: 0.8 }}>revision：{task.revision}{task.ready ? ' · ready' : ''}</div>}
            {planNode !== undefined
              ? planLines(planNode)
              : <div style={{ opacity: 0.5 }}>plan.md 未记录此节点（旧 run；rerun 时会生成 plan）</div>}
            {childNodes.length > 0 && (
              <div style={{ marginTop: 4, padding: '4px 6px', border: '1px solid #6366f126', borderRadius: 4, background: '#6366f108' }}>
                <div style={{ fontSize: 11, color: '#6366f1', marginBottom: 2 }}>内部节点（复合展开，只读）</div>
                {childNodes.map((child) => {
                  // 子节点同样走四态词表：没有映射 = 状态未知，不是未执行。
                  const childState = teamReady
                    ? planNodeStateOf(mappingIndex.mapping.get(child.id))
                    : PROJECTION_PENDING_STATE
                  return (
                    <div key={child.id} style={{ fontSize: 11, opacity: 0.85 }}>
                      <strong>{child.id}</strong>
                      {child.kind !== undefined ? ` · ${child.kind}` : ''}
                      {` · ${childState.icon} ${childState.text}`}
                      {child.ownerRole !== undefined ? ` · ${child.ownerRole}` : ''}
                      {child.deps.length > 0 ? ` · deps ${child.deps.join(', ')}` : ''}
                    </div>
                  )
                })}
              </div>
            )}
            {node.attention !== undefined && <div style={{ color: '#b45309', marginTop: 2 }}>{severityIcon(node.attention.severity)} {node.attention.message}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {props.openOwner !== undefined && member !== undefined && member.id !== leadSessionId
                && member.phase !== 'failed' && member.phase !== 'provisioning' && (
                <button type="button" style={BUTTON_STYLE} onClick={() => { openOwner(member) }}>打开负责人</button>
              )}
              <button
                type="button"
                style={BUTTON_STYLE}
                title={boundSlug !== null ? `复制 drt_${boundSlug}/${node.id}，粘贴到对话引用这个节点` : `复制 ${node.id}`}
                onClick={() => { copyReference(node) }}
              >{copiedId === node.id ? '已复制' : '复制引用'}</button>
              <span style={MUTED_STYLE}>只读观察；调整请在对话里进行或 rerun。</span>
            </div>
          </div>
        )}
      </article>
    )
  }

  return (
    // 滚动义务在页签体自己（vendor .tabBody = overflow:hidden 的定高 flex 列——同状态页/终稿页）。
    <div style={{ padding: 12, flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div style={HEADER_STYLE}>
        <strong style={{ fontSize: 14 }}>研究图谱</strong>
        <span style={BADGE_STYLE}>只读观察</span>
        {boundSlug !== null && <span style={{ ...MUTED_STYLE, opacity: 0.5 }}>run drt_{shortLabel(boundSlug, 32)}</span>}
        <span style={MUTED_STYLE}>
          {hasPlan ? `plan ${String(topPlanNodes.length)} 顶层${planNodes.length !== topPlanNodes.length ? ` / ${String(planNodes.length)} 节点` : ''} · ` : ''}Team {String(counts.total)} 任务 · 完成 {String(counts.done)}
        </span>
        {counts.running > 0 && <span style={{ ...MUTED_STYLE, color: '#2563eb' }}>● {String(counts.running)} 进行</span>}
        {counts.ready > 0 && <span style={{ ...MUTED_STYLE, color: '#b45309' }}>○ {String(counts.ready)} 待派</span>}
        {counts.stalled > 0 && <span style={{ ...MUTED_STYLE, color: '#b45309' }}>⚠ {String(counts.stalled)} 可能卡住</span>}
      </div>

      {/* 版本轨（rerun 版本面，只读）：只切观察，不改图/不派工。 */}
      {hasPlan && (
        <div style={{ ...MUTED_STYLE, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
          <span>版本轨（只读）：当前 plan {planVersion !== null ? `v${String(planVersion)}` : '版本未声明'}</span>
          {snapshots.length > 0 ? (
            <>
              <button type="button" style={BUTTON_STYLE} onClick={() => { setGraphView('current'); setShowSnapshotPlan(false) }}>当前图</button>
              <button type="button" style={BUTTON_STYLE} onClick={() => { setShowSnapshotPlan((current) => !current) }}>
                {showSnapshotPlan ? '收起旧图' : `看 v${String(latestSnapshot)} 旧图`}
              </button>
              <button type="button" style={BUTTON_STYLE} onClick={() => { setGraphView((current) => current === 'diff' ? 'current' : 'diff') }}>
                {graphView === 'diff' ? '收起差异' : '看差异'}
              </button>
            </>
          ) : (
            <span>· 无旧图快照，不能 diff</span>
          )}
        </div>
      )}

      {/* 旧图快照：只列节点结构（id/kind/deps），不与当前 Team 板对板。 */}
      {showSnapshotPlan && (
        <div style={BANNER_STYLE}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>旧图快照 v{String(latestSnapshot)}（只读）</div>
          {snapshotState === 'missing' && <div style={MUTED_STYLE}>读不到 plan/v{String(latestSnapshot)}.md——快照可能已移走</div>}
          {snapshotState === 'loading' && <div style={MUTED_STYLE}>读取中…</div>}
          {snapshotPlan !== null && snapshotPlan.topLevel.map((node) => (
            <div key={node.id} style={{ fontSize: 11, opacity: 0.85 }}>
              <strong>{node.id}</strong>{node.kind !== undefined ? ` · ${node.kind}` : ''}{node.deps.length > 0 ? ` · deps ${node.deps.join(', ')}` : ''}
            </div>
          ))}
        </div>
      )}

      {/* 结构差异：只比 id/lifecycle/deps（重编号靠 superseded_by，不解析散文）。 */}
      {graphView === 'diff' && (
        <div style={CARD_STYLE}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>结构差异（v{String(latestSnapshot)} → 当前）</div>
          {planDiff === null ? (
            <div style={MUTED_STYLE}>{snapshotState === 'missing' ? '旧图快照读不到，不能 diff' : '旧图快照读取中…'}</div>
          ) : (
            <>
              <div style={{ fontSize: 12, marginBottom: 2 }}>{planDiff.summary}</div>
              {planDiff.added.length > 0 && <div style={{ fontSize: 11, color: '#16a34a' }}>+ 新增：{planDiff.added.join(', ')}</div>}
              {planDiff.removed.length > 0 && <div style={{ fontSize: 11, color: '#b45309' }}>− 退役：{planDiff.removed.join(', ')}</div>}
              {planDiff.aliases.length > 0 && <div style={{ fontSize: 11, color: '#6366f1' }}>↔ 重编号：{planDiff.aliases.map((alias) => `${alias.from} → ${alias.to}`).join('、')}</div>}
              {planDiff.dependencyChanges.length > 0 && <div style={{ fontSize: 11, color: '#b45309' }}>~ 依赖变化：{planDiff.dependencyChanges.map((change) => `${change.id}（${change.from.join(',') || '—'} → ${change.to.join(',') || '—'}）`).join('；')}</div>}
              {planDiff.kept.length > 0 && <div style={MUTED_STYLE}>保留 {String(planDiff.kept.length)} 个节点</div>}
            </>
          )}
        </div>
      )}

      {/* 映射缺口：说“图谱无法判断”，不说“未执行”——这是 BUG-043 的产品层修复点。 */}
      {hasPlan && teamReady && coverageWarning !== null && (
        <div style={{ ...BANNER_STYLE, background: '#f59e0b12', borderColor: '#f59e0b48' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, color: '#b45309' }}>映射缺口（只读）</div>
          <div style={MUTED_STYLE}>{coverageWarning}</div>
        </div>
      )}

      {stateNote !== null && (
        <div style={BANNER_STYLE}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{stateNote.title}</div>
          <div style={MUTED_STYLE}>{stateNote.body}</div>
        </div>
      )}

      {planIssues.length > 0 && (
        <div style={{ ...BANNER_STYLE, background: '#dc262610', borderColor: '#dc262640' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, color: '#b91c1c' }}>plan 结构提示（只读）</div>
          {planIssues.slice(0, 6).map((issue) => (
            <div key={`${issue.kind}:${issue.nodeId}:${issue.message}`} style={{ ...MUTED_STYLE, color: '#b91c1c' }}>{issue.message}</div>
          ))}
          {planIssues.length > 6 && <div style={MUTED_STYLE}>…另有 {String(planIssues.length - 6)} 条</div>}
        </div>
      )}

      {hasPlan && (
        <div style={{ ...MUTED_STYLE, marginBottom: 6 }}>
          plan{plan?.version !== undefined ? ` ${plan.version}` : ''} · {String(coverage.topNodes)} 顶层 / {String(coverage.planNodes)} 节点 · {teamReady ? coverageLineOf(coverage) : '等待团队投影'}
          {planLoadedAt !== null ? ` · 刷新 ${formatClock(planLoadedAt)}` : ''}
        </div>
      )}

      {attention.length > 0 && (
        <div style={{ marginBottom: 10, padding: '6px 10px', borderRadius: 6, background: '#f59e0b14', border: '1px solid #f59e0b40' }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>需要你注意（只读）</div>
          {attention.slice(0, 8).map((item) => (
            <button
              key={`${item.taskId}:${item.reason}`}
              type="button"
              style={ATTENTION_ROW_STYLE}
              onClick={() => { focusTask(item.taskId) }}
            >{severityIcon(item.severity)} {item.taskId} · {item.message}</button>
          ))}
          {attention.length > 8 && <div style={MUTED_STYLE}>…另有 {String(attention.length - 8)} 条</div>}
        </div>
      )}

      {team === undefined && (
        <div style={EMPTY_STYLE}>
          还没有团队投影——研究图谱在 Lead 组队后出现（当前是队员会话时，这里会读 Lead 的团队）。
        </div>
      )}
      {team !== undefined && tasks.length === 0 && planNodes.length === 0 && (
        <div style={EMPTY_STYLE}>
          任务板还没有任务——Lead 排好计划、建 Team 任务后，这里画出依赖图。
        </div>
      )}

      {hasEdges && graphView === 'current' && (
        <>
          <DagMap nodes={graphNodes} selectedId={expandedId} childCounts={childCounts} onSelect={setExpandedId} />
          <div style={{ ...MUTED_STYLE, marginBottom: 8 }}>
            → 依赖边（plan deps / Team blocked_by） · 点节点选中详情 · 圆点 = 状态
          </div>
        </>
      )}

      {graphView === 'current' && (hasEdges
        ? waves.map((wave) => (
          <section key={wave.level} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: 0.5, marginBottom: 4 }}>
              WAVE {wave.level + 1}{wave.tasks.length > 1 ? ` · ${String(wave.tasks.length)} 个并行` : ''}
            </div>
            {wave.tasks.map((node) => renderNode(node))}
          </section>
        ))
        : graphNodes.length > 0 && (
          <section style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: 0.5, marginBottom: 4 }}>任务快照（无依赖边）</div>
            {graphNodes.map((node) => renderNode(node))}
          </section>
        ))}

      {unmappedTasks.length > 0 && (
        <section style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: 0.5, marginBottom: 4 }}>未进 plan 的 Team 任务</div>
          {unmappedTasks.map((task) => (
            <div key={task.id} style={{ ...CARD_STYLE, fontSize: 12 }}>
              <strong>{task.id}</strong> · {shortLabel(task.subject ?? task.id, 60)} · owner {task.ownerName ?? '未指派'} · {task.status}
            </div>
          ))}
        </section>
      )}

      {planState === 'ready' && planText !== null && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ ...MUTED_STYLE, cursor: 'pointer' }}>查看 plan.md 原文（只读，含重写记录）</summary>
          <pre style={{
            maxHeight: 180, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 11, lineHeight: 1.5,
            background: '#00000005', padding: 6, borderRadius: 4, marginTop: 4,
          }}>{planText}</pre>
        </details>
      )}
    </div>
  )
}
