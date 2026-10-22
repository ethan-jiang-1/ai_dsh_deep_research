/**
 * graph-model.ts —— plan ↔ Team task 的映射与节点状态词表（keyless 单测；组件只画）。
 *
 * 为什么单独成件（BUG-043）：映射曾经内联在 `ResearchGraphTab` 里，节点没有 mapped task 时
 * 直接落回「未执行」——把**数据缺失**说成**执行状态**。观察面允许不知道，但不允许把不知道
 * 说成没跑。本文件把这件事算成纯函数，四态各说各话：
 *
 *   mapped     task_id / 节点 id 命中 Team 任务 → 状态来自任务（完成 / 进行中 / 等依赖…）
 *   unmapped   task_id 为空 → `状态未知（未映射 task_id）`，**绝不显示未执行**
 *   stale      task_id 有值但当前 Team 板没有这个任务（恢复会话 / 重建任务后必现）→
 *              `状态未知（task_id 失效：task-N）`；与 unmapped 分开报，两种缺口修法不同
 *   plan-only  task_id 显式声明无任务（`plan-only` / `no-task` / `无 task`）→ 不是缺口，
 *              也不冒充“未执行”
 *   duplicate  同一 `task_id` 被多个节点声明 → 后声明的节点报“task_id 重复”，不误报成失效
 *
 * 覆盖率口径（卡片 §修复判据）：分母 = **active plan 节点**（含子节点；retired/merged 等墓碑
 * 不进分母），分子 = mapped。Team 侧任务单列「未进 plan 的 Team 任务」——它们是执行镜像多于
 * 计划，和 plan 节点缺映射是两回事。
 *
 * fail-soft：plan 缺席、任务表为空、畸形行都退化为空映射/零覆盖率，不 throw（观察面不许炸）。
 */
import { isActivePlanNode, planNodeOf } from './plan-graph.ts'
import type { PlanIndex } from './plan-graph.ts'

/** 节点视觉状态（组件只消费，不重新判定）。 */
export interface GraphNodeState {
  readonly text: string
  readonly icon: string
  readonly color: string
}

/** Team 任务在映射/状态判定里需要的最小结构面（`TeamTaskView` 结构上兼容）。 */
export interface TaskStateLike {
  readonly id: string
  readonly status: string
  readonly ready?: boolean
  readonly blockedBy: readonly string[]
}

/** attention 的最小结构面（`AttentionItem` 结构上兼容；本文件不判 severity 文案）。 */
export interface AttentionLike {
  readonly reason?: string
}

/** plan 节点相对 Team 板的映射状态。 */
export type PlanMappingState = 'mapped' | 'unmapped' | 'stale' | 'plan-only' | 'duplicate'

/** 一个 active plan 节点的映射结果。 */
export interface PlanMapping<T extends TaskStateLike = TaskStateLike> {
  readonly planId: string
  readonly state: PlanMappingState
  /** `task_id` 列的声明值（空单元格 → 缺省）。 */
  readonly declaredTaskId?: string
  /** 命中的 Team 任务（仅 mapped）。 */
  readonly task?: T
}

/** plan ↔ Team 的整张映射索引。 */
export interface PlanMappingIndex<T extends TaskStateLike = TaskStateLike> {
  /** active plan 节点 id → 映射（墓碑不在此表）。 */
  readonly mapping: ReadonlyMap<string, PlanMapping<T>>
  /** plan 节点 id → Team 任务（组件画图用；同一节点多任务时取最后一个，与旧行为一致）。 */
  readonly taskByPlanId: ReadonlyMap<string, T>
  /** Team 里有、plan 里没有对应节点的任务（执行镜像多于计划）。 */
  readonly tasksOutsidePlan: readonly T[]
}

/** 覆盖率（一行摘要 + 一条警告的输入）。 */
export interface GraphCoverage {
  readonly planNodes: number
  readonly topNodes: number
  readonly mapped: number
  readonly unmapped: number
  readonly stale: number
  readonly planOnly: number
  readonly duplicate: number
  readonly teamTasks: number
  readonly tasksOutsidePlan: number
}

/** plan-only 的显式写法（英文标记或中文短语；`—`/`-` 由 plan 解析器归一成空 = unmapped）。 */
const PLAN_ONLY_WORD = /^(?:plan[-_\s]?only|no[-_\s]?task|none)$/
const PLAN_ONLY_TEXT = /plan[-_\s]?only|无\s*task/i

/**
 * `task_id` 单元格是否是“显式无任务”声明。
 * @param raw - `task_id` 列原值。
 * @returns 是 → true（不再当缺口、也不当未执行）。
 */
export function planOnlyMarkOf(raw: string | undefined): boolean {
  if (typeof raw !== 'string') return false
  const value = raw.trim()
  if (value === '') return false
  return PLAN_ONLY_WORD.test(value.toLowerCase()) || PLAN_ONLY_TEXT.test(value)
}

/**
 * 计算 plan ↔ Team 映射。
 * @param plan - {@link planIndex} 的结果（可为 null）。
 * @param tasks - 当前 Team 任务（结构面即可）。
 * @returns 映射 + 组件画图用的任务索引（永不 throw）。
 */
export function planMappingOf<T extends TaskStateLike>(
  plan: PlanIndex | null | undefined,
  tasks: readonly T[] | null | undefined,
): PlanMappingIndex<T> {
  const list = Array.isArray(tasks) ? tasks.filter((task) => typeof task?.id === 'string' && task.id !== '') : []
  const taskByPlanId = new Map<string, T>()
  const matchedTaskIds = new Set<string>()
  // 先按任务反查 plan 节点：`planNodeOf` = task_id 精确命中优先，其次 plan 节点 id 精确命中
  //（旧写法里 task id 常常就是节点 id）。不按数字后缀猜映射。
  for (const task of list) {
    const planNode = planNodeOf(plan, task.id)
    // 只认 active 节点：`byTaskId` 覆盖全部 staged 行（含墓碑），墓碑上的 task 若也被吞进
    // `taskByPlanId`，它既不上图也不进「未进 plan」——从观察面凭空消失。让它落进后者。
    if (planNode === undefined || !isActivePlanNode(planNode)) continue
    matchedTaskIds.add(task.id)
    taskByPlanId.set(planNode.id, task)
  }
  const tasksOutsidePlan = list.filter((task) => !matchedTaskIds.has(task.id))

  const taskById = new Map<string, T>()
  for (const task of list) if (!taskById.has(task.id)) taskById.set(task.id, task)

  const mapping = new Map<string, PlanMapping<T>>()
  for (const node of plan?.nodes ?? []) {
    if (!isActivePlanNode(node)) continue
    const declared = node.taskId?.trim()
    const declaredField = declared !== undefined && declared !== '' ? { declaredTaskId: declared } : {}
    const task = taskByPlanId.get(node.id)
    if (task !== undefined) {
      mapping.set(node.id, { planId: node.id, state: 'mapped', ...declaredField, task })
      continue
    }
    if (declared === undefined || declared === '') {
      mapping.set(node.id, { planId: node.id, state: 'unmapped' })
      continue
    }
    if (planOnlyMarkOf(declared)) {
      mapping.set(node.id, { planId: node.id, state: 'plan-only', ...declaredField })
      continue
    }
    // task_id 有值但这个节点拿不到任务：任务不存在（stale）与任务被同表另一节点占用
    // （duplicate）是两回事——反查 `planNodeOf` 的 byTaskId 是 first-wins，分不出这两者，
    // 所以这里按“声明的 task 是否真实存在”前向判一次。
    mapping.set(node.id, { planId: node.id, state: taskById.has(declared) ? 'duplicate' : 'stale', ...declaredField })
  }

  return { mapping, taskByPlanId, tasksOutsidePlan }
}

/**
 * 覆盖率汇总；`planNodes` = 四态之和（不变量，测试钉住）。
 * @param plan - plan 索引（只取 topLevel 计顶层数）。
 * @param tasks - Team 任务表（只取长度）。
 * @param index - {@link planMappingOf} 的结果。
 * @returns 覆盖率。
 */
export function coverageOf<T extends TaskStateLike>(
  plan: PlanIndex | null | undefined,
  tasks: readonly T[] | null | undefined,
  index: PlanMappingIndex<T>,
): GraphCoverage {
  const values = [...index.mapping.values()]
  const count = (state: PlanMappingState): number => values.filter((entry) => entry.state === state).length
  const topIds = new Set<string>()
  for (const node of plan?.topLevel ?? []) topIds.add(node.id)
  return {
    planNodes: values.length,
    topNodes: topIds.size,
    mapped: count('mapped'),
    unmapped: count('unmapped'),
    stale: count('stale'),
    planOnly: count('plan-only'),
    duplicate: count('duplicate'),
    teamTasks: Array.isArray(tasks) ? tasks.length : 0,
    tasksOutsidePlan: index.tasksOutsidePlan.length,
  }
}

/**
 * 头部一行摘要：`plan N 节点 · Team M 任务 · 已映射 K · 未映射 N-K`（另有缺口/plan-only/
 * 未进 plan 的任务时才追加）。文案即契约（客户端冒烟按它断言）。
 * @param coverage - {@link coverageOf} 的结果。
 * @returns 单行文本。
 */
export function coverageLineOf(coverage: GraphCoverage): string {
  const parts = [
    `plan ${String(coverage.planNodes)} 节点`,
    `Team ${String(coverage.teamTasks)} 任务`,
    `已映射 ${String(coverage.mapped)}`,
    `未映射 ${String(coverage.unmapped)}`,
  ]
  if (coverage.stale > 0) parts.push(`映射失效 ${String(coverage.stale)}`)
  if (coverage.duplicate > 0) parts.push(`task_id 重复 ${String(coverage.duplicate)}`)
  if (coverage.planOnly > 0) parts.push(`plan-only ${String(coverage.planOnly)}`)
  if (coverage.tasksOutsidePlan > 0) parts.push(`未进 plan 的 Team 任务 ${String(coverage.tasksOutsidePlan)}`)
  return parts.join(' · ')
}

/**
 * 映射缺口警告（黄色横幅）；没有缺口 → null。
 * @param coverage - {@link coverageOf} 的结果。
 * @returns 一句人话（说清“图谱不知道”，而不是“没跑”）。
 */
export function coverageWarningOf(coverage: GraphCoverage): string | null {
  const gap = coverage.unmapped + coverage.stale + coverage.duplicate
  if (gap === 0) return null
  const detail = [
    coverage.unmapped > 0 ? `未映射 ${String(coverage.unmapped)}` : null,
    coverage.stale > 0 ? `映射失效 ${String(coverage.stale)}` : null,
    coverage.duplicate > 0 ? `task_id 重复 ${String(coverage.duplicate)}` : null,
  ].filter((part): part is string => part !== null).join(' · ')
  return `图谱无法判断 ${String(gap)} 个 plan 节点的进度（${detail}）：plan 的 task_id 还没回填、指向的任务已不在当前 Team 板，或被多个节点声明。修正 task_id 或显式标 plan-only 后消失。`
}

/** Team 投影尚未就绪时的节点状态（不把“还没收到数据”说成映射缺口）。 */
export const PROJECTION_PENDING_STATE: GraphNodeState = { text: '等待团队投影', icon: '…', color: '#9ca3af' }

/**
 * Team 任务 → 节点状态（原住组件，2026-10-23 迁入本件以便 keyless 钉住）。
 * 失败只从 attention 的 `owner-failed` 来（Team 任务没有 failed），卡住措辞带「可能」。
 * @param task - Team 任务结构面。
 * @param running - owner 是否正在跑（未知 → undefined）。
 * @param attention - 该任务的 attention 条目（可为 undefined）。
 * @returns 视觉状态。
 */
export function nodeStateOf(
  task: TaskStateLike,
  running: boolean | undefined,
  attention: AttentionLike | undefined,
): GraphNodeState {
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

/**
 * plan 节点 → 节点状态：映射决定“有没有任务状态可看”，任务状态只对 mapped 生效。
 * @param mapping - {@link planMappingOf} 里该节点的映射（缺失 = 调用方传错，仍不 throw）。
 * @param running - owner 忙闲（仅 mapped 用）。
 * @param attention - 该任务的 attention（仅 mapped 用）。
 * @returns 视觉状态；unmapped/stale 一律「状态未知」，plan-only 明说无任务。
 */
export function planNodeStateOf<T extends TaskStateLike>(
  mapping: PlanMapping<T> | null | undefined,
  running?: boolean,
  attention?: AttentionLike,
): GraphNodeState {
  if (mapping === null || mapping === undefined) {
    return { text: '状态未知（plan 未索引）', icon: '?', color: '#b45309' }
  }
  if (mapping.state === 'mapped') {
    return mapping.task !== undefined
      ? nodeStateOf(mapping.task, running, attention)
      : { text: '状态未知（映射缺任务）', icon: '?', color: '#b45309' }
  }
  if (mapping.state === 'stale') {
    return { text: `状态未知（task_id 失效：${mapping.declaredTaskId ?? '?'}）`, icon: '?', color: '#b45309' }
  }
  if (mapping.state === 'duplicate') {
    return { text: `状态未知（task_id 重复：${mapping.declaredTaskId ?? '?'}）`, icon: '?', color: '#b45309' }
  }
  if (mapping.state === 'plan-only') {
    return { text: 'plan-only（无 Team 任务）', icon: '·', color: '#9ca3af' }
  }
  return { text: '状态未知（未映射 task_id）', icon: '?', color: '#b45309' }
}
