/**
 * 「研究图谱」页签体（W2 / F3）：依赖形状 + worker 层 + 异常注意力，**不是第二个任务板**。
 *
 * 自上而下：
 *   ① 头部计数（进行 / 待派 / 可能卡住）+ 「让 Lead 调整」全局入口；
 *   ② 「需要你注意」条（attentionOf 的条目，点击展开对应节点）；
 *   ③ 纵向 Wave 分区（最长路径分层；节点卡竖排——side panel 宽度有限，不做横向大画布）；
 *   ④ 节点卡：id / subject / owner / 状态 / deps / plan 的 kind·depth；点击展开 detail
 *      （description、owner、deps、revision、plan 的 acceptance/output）+ 两条动作：
 *      「打开负责人」（注入 openOwner 才出现）与「让 Lead 调整」（预填建议发给 Lead，显示回执）。
 *
 * 数据面（全部既有投影，零新 RPC）：
 *   - 当前会话若是 teammate → `useSession(subagent.address.parentSessionId)` 找 Lead，读 **Lead**
 *     的 `agentTeam` 投影（`useSessions`；vendor `TeamAction` 同款）；
 *   - 队员忙闲 = `useSessionStatus`（整张状态快照；按 member id 取 running）；
 *   - worker chips = 每个队员会话的 `subagentCatalog` 投影（独立子组件按 member id 取，hooks 定数）；
 *   - plan.md = 注入的 `readFile(lead, 'plan.md', signal, 200)`，30s 重读；缺文件合法、不阻塞渲染。
 *
 * 权限边界（有意，不是未完成）：面板**不直接** reassign / complete / delete Team 任务——Team 的
 * 权威在 Lead；这里只发预填建议，Lead 执行并留痕（避免「UI 改了但 journal 没记」的第二条控制路径）。
 * 折算全住 `src/lib/plan-graph.ts`（keyless 单测）；本组件只画。fail-soft：空投影/空任务/缺 plan
 * 都退化为如实空态，不 throw。
 */
import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { UseSessions, UseSessionStatus } from '@deepseek-ai/dsh-client-ui-session/client'
import type { TeamMemberProjection, TeamProjection, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import {
  DEFAULT_ATTENTION_THRESHOLDS,
  attentionOf,
  countsOf,
  planIndex,
  planNodeOf,
  wavesOf,
  workerChipsOf,
  type AttentionItem,
  type MemberStatus,
  type PlanIndex,
  type PlanNode,
  type WorkerChip,
} from '../lib/plan-graph.ts'
import type { ResearchGraphTabProps } from './research-graph/types.ts'
export type { InstructionReceipt, ResearchGraphInjected, ResearchGraphTabProps } from './research-graph/types.ts'

/** plan.md 重读间隔（任务靠投影推送；只有文件需要低频重扫——设计 §7 同款 30s）。 */
const PLAN_REFRESH_MS = 30_000
/** plan.md 只读表头附近（节点表在文首；缺文件合法）。 */
const PLAN_READ_LIMIT = 200
/** 头部「让 Lead 调整」回执的 key（节点回执按 task id 区分）。 */
const HEADER_RECEIPT_KEY = '*'
/** 全局入口的预填建议（设计 §4「重写」话术）。 */
const REWRITE_MESSAGE = '请按当前证据重写 plan.md 并同步 Team 板；说明加了/拆了哪些节点。'

const HEADER_STYLE: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }
const MUTED_STYLE: CSSProperties = { fontSize: 11, opacity: 0.6, lineHeight: 1.5 }
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

/** 一次发送的回执（key = task id 或 {@link HEADER_RECEIPT_KEY}）。 */
interface SendReceipt {
  readonly key: string
  readonly state: 'sending' | 'sent' | 'failed'
  readonly detail: string
}

/** 节点卡的视觉状态（dot 图标 + 文案 + 左侧色条）。 */
interface NodeState {
  readonly text: string
  readonly icon: string
  readonly color: string
}

/** worker chips 子组件的 props（hooks 从父级透传；每个成员实例化一次，hooks 数量恒定）。 */
interface WorkerChipsProps {
  readonly memberId: SessionId
  readonly useSessions: UseSessions
  readonly useSessionStatus: UseSessionStatus
}

/**
 * 节点状态：Team 任务状态 + owner 忙闲 + attention 事实三源合成。
 * 失败只从 attention 的 `owner-failed` 来（Team 任务没有 failed），卡住措辞带「可能」。
 * @param task - Team 任务视图。
 * @param running - owner 会话是否在跑（undefined = 未观测）。
 * @param attention - 该任务的注意力条目（可选）。
 * @returns 节点视觉状态。
 */
function nodeStateOf(task: TeamTaskView, running: boolean | undefined, attention: AttentionItem | undefined): NodeState {
  if (task.status === 'completed') return { text: '完成', icon: '✓', color: '#16a34a' }
  if (task.status === 'deleted') return { text: '已删除', icon: '·', color: '#9ca3af' }
  if (attention?.reason === 'owner-failed') return { text: 'owner 失败', icon: '✕', color: '#dc2626' }
  if (task.status === 'in_progress') {
    if (attention?.reason === 'stalled') return { text: '可能卡住', icon: '⚠', color: '#b45309' }
    return { text: running === true ? '进行中' : '进行中（owner 未知）', icon: '●', color: '#2563eb' }
  }
  if (attention?.reason === 'unassigned') return { text: '待派', icon: '⚠', color: '#b45309' }
  if (attention?.reason === 'blocked-too-long') return { text: '阻塞偏久', icon: '⏳', color: '#b45309' }
  if (task.ready === true) return { text: '就绪', icon: '○', color: '#6b7280' }
  return { text: `等 ${task.blockedBy.join(', ')}`, icon: '○', color: '#6b7280' }
}

/** 注意力条目的严重度图标。 */
function severityIcon(severity: AttentionItem['severity']): string {
  return severity === 'critical' ? '✕' : severity === 'warning' ? '⚠' : '·'
}

/** 预填调整建议（按 attention 原因给结构化一句话；无原因给通用检查句）。 */
function adjustmentMessage(task: TeamTaskView, attention: AttentionItem | undefined): string {
  switch (attention?.reason) {
    case 'unassigned':
      return `${task.id}（${task.subject}）已 ready 但无人领取；请指派 owner，或说明为什么等。`
    case 'stalled':
      return `${task.id}（${task.subject}）的 owner 当前不在运行，可能卡住；请检查是否 interrupt / reassign / reopen，并在 journal 说明原因。`
    case 'owner-failed':
      return `${task.id}（${task.subject}）的 owner 会话失败；请重派或重开该节点，并在 journal 说明原因。`
    case 'blocked-too-long':
      return `${task.id}（${task.subject}）被 ${task.blockedBy.length > 0 ? task.blockedBy.join(', ') : '前置任务'} 阻塞过久；请检查前置是否卡住，或把 ${task.id} 拆小 / 改依赖。`
    default:
      return `${task.id}（${task.subject}）当前状态需要调整；请检查 plan.md 与 Team 板，并给出下一步。`
  }
}

/** 回执行（已发送 / 失败；发送中给进度）。 */
function receiptLine(receipt: SendReceipt): ReactNode {
  if (receipt.state === 'sending') return <div style={MUTED_STYLE}>发送中…</div>
  if (receipt.state === 'sent') {
    return <div style={{ fontSize: 11, color: '#16a34a' }}>✓ 已发送给 Lead{receipt.detail !== '' ? `（${receipt.detail}）` : ''}</div>
  }
  return <div style={{ fontSize: 11, color: '#dc2626' }}>✕ 发送失败：{receipt.detail}</div>
}

/** plan.md 节点在 detail 里的只读摘要（只显示真实读到的列）。 */
function planLines(node: PlanNode): ReactNode {
  return (
    <>
      <div style={{ opacity: 0.8 }}>
        plan：{node.id}
        {node.kind !== undefined ? ` · ${node.kind}` : ''}
        {node.depth !== undefined ? ` · depth ${node.depth}` : ''}
        {node.ownerRole !== undefined ? ` · plan owner ${node.ownerRole}` : ''}
      </div>
      {node.deps.length > 0 && <div style={{ opacity: 0.8 }}>plan deps：{node.deps.join(', ')}</div>}
      {node.output !== undefined && <div style={{ opacity: 0.8 }}>output：{node.output}</div>}
      {node.acceptance !== undefined && <div style={{ opacity: 0.8 }}>acceptance：{node.acceptance}</div>}
    </>
  )
}

/**
 * 一个队员的 worker chips（`subagentCatalog` 投影 → 二层 worker 的 label/mode/忙闲）。
 * 独立子组件：每个成员实例化一次，hooks 数量恒定（不随 roster 变化在父级循环调 hook）。
 * @param props - 成员 id + 透传的两个会话 hooks。
 * @returns chip 行；无 worker 时 null。
 */
function WorkerChips({ memberId, useSessions, useSessionStatus }: WorkerChipsProps): ReactNode {
  const catalog = useSessions((state) => state.projectionsBySession[memberId]?.values.subagentCatalog)
  const statuses = useSessionStatus((state) => state)
  const chips: readonly WorkerChip[] = workerChipsOf(
    { [memberId]: catalog },
    (sessionId) => statuses.get(sessionId as SessionId)?.running,
  )
  if (chips.length === 0) return null
  const shown = chips.slice(0, 3)
  const suffix = chips.length > shown.length ? ` +${String(chips.length - shown.length)}` : ''
  return (
    <span style={{ fontSize: 11, opacity: 0.7 }}>
      worker：{shown.map((chip) => `${chip.label}${chip.status === 'running' ? '●' : chip.status === 'inactive' ? '○' : '·'}`).join(' · ')}{suffix}
    </span>
  )
}

/**
 * 「研究图谱」页签体。
 * @param props - 槽标准 props（sessionId / useSession / useSessions / useSessionStatus）+ 注入面。
 * @returns 竖向 wave 图谱面板。
 */
export function ResearchGraphTab(props: ResearchGraphTabProps): ReactNode {
  // 当前会话若是 teammate，读 Lead 的团队投影（TeamAction 同款；队员自己的投影没有整队视图）。
  const leadSessionId = props.useSession((snapshot) => snapshot.subagent?.address.parentSessionId) ?? props.sessionId
  const team: TeamProjection | undefined = props.useSessions((state) => state.projectionsBySession[leadSessionId]?.values.agentTeam)
  // 整张 UI 状态快照（成员忙闲按 id 取；选择器返回稳定 Map 引用，不在选择器里建对象）。
  const statuses = props.useSessionStatus((state) => state)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<SendReceipt | null>(null)
  const [plan, setPlan] = useState<PlanIndex | null>(null)
  const [planState, setPlanState] = useState<'loading' | 'missing' | 'ready'>('loading')

  // plan.md 可选读：缺文件/读失败都降级 missing（不阻塞图；任务真相仍来自投影）。
  useEffect(() => {
    const controller = new AbortController()
    let stopped = false
    setPlan(null)
    setPlanState('loading')
    const load = async (): Promise<void> => {
      try {
        const text = await props.readFile(leadSessionId, 'plan.md', controller.signal, PLAN_READ_LIMIT)
        if (stopped) return
        if (text === null) {
          setPlan(null)
          setPlanState('missing')
          return
        }
        setPlan(planIndex(text))
        setPlanState('ready')
      } catch (cause) {
        if (stopped) return
        setPlan(null)
        setPlanState('missing')
        console.error('[research-graph] plan.md 读取失败', String(cause))
      }
    }
    void load()
    const timer = setInterval(() => { void load() }, PLAN_REFRESH_MS)
    return () => { stopped = true; controller.abort(); clearInterval(timer) }
  }, [leadSessionId])

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
  const waves = wavesOf(tasks)

  const send = (key: string, text: string): void => {
    const sendInstruction = props.sendInstruction
    if (typeof sendInstruction !== 'function') {
      setReceipt({ key, state: 'failed', detail: '未接上发送通道' })
      return
    }
    setReceipt({ key, state: 'sending', detail: '' })
    void (async () => {
      try {
        const result = await sendInstruction(leadSessionId, text)
        if (result.ok) setReceipt({ key, state: 'sent', detail: result.detail ?? '已发送给 Lead' })
        else setReceipt({ key, state: 'failed', detail: result.detail ?? '发送失败' })
      } catch (cause) {
        setReceipt({ key, state: 'failed', detail: String(cause) })
      }
    })()
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

  const renderNode = (task: TeamTaskView): ReactNode => {
    const owner = task.ownerName
    const member = owner !== undefined ? memberByName.get(owner) : undefined
    const running = member !== undefined ? statuses.get(member.id)?.running : undefined
    const item = attention.find((entry) => entry.taskId === task.id)
    const planNode = planNodeOf(plan, task.id)
    const expanded = expandedId === task.id
    const state = nodeStateOf(task, running, item)
    return (
      <article key={task.id} style={{ ...CARD_STYLE, borderLeft: `3px solid ${state.color}` }}>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => { setExpandedId(expanded ? null : task.id) }}
          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit' }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 13 }}>{task.id}</strong>
            <span style={{ fontSize: 13, flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{task.subject}</span>
            <span style={{ fontSize: 11, color: state.color, whiteSpace: 'nowrap' }}>{state.icon} {state.text}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, opacity: 0.65, marginTop: 2 }}>
            <span>owner：{owner ?? '未指派'}</span>
            {task.blockedBy.length > 0 && <span>deps：{task.blockedBy.join(', ')}</span>}
            {planNode?.depth !== undefined && <span>depth：{planNode.depth}</span>}
            {planNode?.kind !== undefined && <span>{planNode.kind}</span>}
            {member !== undefined && (
              <WorkerChips memberId={member.id} useSessions={props.useSessions} useSessionStatus={props.useSessionStatus} />
            )}
          </div>
        </button>
        {expanded && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #00000010', fontSize: 12, lineHeight: 1.6 }}>
            {task.description !== '' && <div style={{ whiteSpace: 'pre-wrap', opacity: 0.85 }}>{task.description}</div>}
            <div style={{ opacity: 0.8 }}>owner：{owner ?? '未指派'}{member !== undefined ? `（${member.phase}）` : ''}</div>
            {task.blockedBy.length > 0 && <div style={{ opacity: 0.8 }}>依赖：{task.blockedBy.join(', ')}</div>}
            <div style={{ opacity: 0.8 }}>revision：{task.revision}{task.ready ? ' · ready' : ''}</div>
            {planNode !== undefined ? planLines(planNode) : <div style={{ opacity: 0.5 }}>plan.md 未记录本任务（或 task_id 尚未回填）</div>}
            {item !== undefined && <div style={{ color: '#b45309', marginTop: 2 }}>{severityIcon(item.severity)} {item.message}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {props.openOwner !== undefined && member !== undefined && member.id !== leadSessionId
                && member.phase !== 'failed' && member.phase !== 'provisioning' && (
                <button type="button" style={BUTTON_STYLE} onClick={() => { openOwner(member) }}>打开负责人</button>
              )}
              <button
                type="button"
                style={BUTTON_STYLE}
                disabled={receipt?.key === task.id && receipt.state === 'sending'}
                onClick={() => { send(task.id, adjustmentMessage(task, item)) }}
              >让 Lead 调整</button>
            </div>
            {receipt?.key === task.id && receiptLine(receipt)}
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
        {team !== undefined && (
          <span style={MUTED_STYLE}>{counts.running} 进行 · {counts.ready} 待派 · {counts.stalled} 可能卡住</span>
        )}
        <span style={{ flex: 1 }} />
        <button
          type="button"
          style={BUTTON_STYLE}
          disabled={receipt?.key === HEADER_RECEIPT_KEY && receipt.state === 'sending'}
          onClick={() => { send(HEADER_RECEIPT_KEY, REWRITE_MESSAGE) }}
        >让 Lead 调整</button>
      </div>
      {receipt?.key === HEADER_RECEIPT_KEY && receiptLine(receipt)}

      {attention.length > 0 && (
        <div style={{ marginBottom: 10, padding: '6px 10px', borderRadius: 6, background: '#f59e0b14', border: '1px solid #f59e0b40' }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>需要你注意</div>
          {attention.slice(0, 8).map((item) => (
            <button
              key={`${item.taskId}:${item.reason}`}
              type="button"
              style={ATTENTION_ROW_STYLE}
              onClick={() => { setExpandedId(item.taskId) }}
            >{severityIcon(item.severity)} {item.taskId} · {item.message}</button>
          ))}
          {attention.length > 8 && <div style={MUTED_STYLE}>…另有 {attention.length - 8} 条</div>}
        </div>
      )}

      {planState === 'missing' && (
        <div style={MUTED_STYLE}>未发现 plan.md——只显示 Team 任务；kind / depth / acceptance 待 Lead 排计划后出现。</div>
      )}
      {planState === 'ready' && plan !== null && plan.nodes.length === 0 && (
        <div style={MUTED_STYLE}>plan.md 里没有可读的节点表（或表头缺 id 列）——只显示 Team 任务。</div>
      )}

      {team === undefined && (
        <div style={EMPTY_STYLE}>
          还没有团队投影——研究图谱在 Lead 组队后出现（当前是队员会话时，这里会读 Lead 的团队）。
        </div>
      )}
      {team !== undefined && tasks.length === 0 && (
        <div style={EMPTY_STYLE}>
          任务板还没有任务——Lead 排好计划、建 Team 任务后，这里按依赖波次显示节点。
          {plan !== null && plan.nodes.length > 0
            ? `plan.md 已有 ${String(plan.nodes.length)} 个节点（${plan.nodes.map((node) => node.id).join(', ')}）。`
            : ''}
        </div>
      )}

      {waves.map((wave) => (
        <section key={wave.level} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: 0.5, marginBottom: 4 }}>WAVE {wave.level}</div>
          {wave.tasks.map((task) => renderNode(task))}
        </section>
      ))}
    </div>
  )
}
