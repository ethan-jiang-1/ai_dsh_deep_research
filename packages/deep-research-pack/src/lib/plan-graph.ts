/**
 * plan-graph.ts —— 「研究图谱」页签的纯折算（fail-soft，永不 throw；keyless 单测面）。
 *
 * 数据面全部是既有 DSH 投影的**结构性子集**（不 import React、不 import vendor 类型）：
 * - `levelsOf` / `wavesOf`：Team 任务板（`agentTeam` 投影）→ 最长路径分层 + 波次；
 * - `attentionOf` / `countsOf`：任务 + 队员状态（roster phase + `useSessionStatus.running`）→
 *   「需要你注意」条与头部计数；
 * - `workerChipsOf`：队员会话的 `subagentCatalog` 投影 → 二层 worker chip；
 * - `planIndex` / `planNodeOf`：`plan.md` 节点表（id / parent / kind / depth / acceptance /
 *   task_id）→ 查询面；`topLevel` 只含 parent 缺省的 active 节点（复合子节点 W3.1… 默认不进图；墓碑不进图）。
 * - `planIssuesOf`：重号 / 悬空 parent / 悬空 dep / 自依赖 → 只读稳定性提示（不是 node-gate）。
 *
 * 诚实纪律（页签定位 = 依赖形状 + worker 层 + 异常注意力，不是第二个任务板）：
 * - Team 任务状态只有 `pending | in_progress | completed | deleted`——**没有 failed**。本模块
 *   从不发明 failed：失败只以「owner 会话 failed」（roster phase）的事实出现；
 * - 卡住是**启发式**（in_progress + owner 当前不在运行）：文案必须写「可能卡住」，不是事实；
 * - 不猜年龄：没有 `since` 时间戳就不编造「已经 N 分钟」，只如实说状态；
 * - 缺 blocker 忽略、成环钳在节点数 - 1（company `dag.ts` 同款），畸形输入退化为空结果。
 */

/** 图谱任务的最小结构（`agentTeam` 的 `TeamTaskView` 可直接传入）。 */
export interface GraphTask {
  readonly id: string
  readonly subject?: string
  readonly description?: string
  /** Team 任务状态：`pending` / `in_progress` / `completed` / `deleted`（没有 failed）。 */
  readonly status?: string
  readonly blockedBy?: readonly string[]
  readonly ownerName?: string
  /** 可选的 owner 会话 id（`TeamTaskView` 只有 ownerName；留作更强 join 的接入位）。 */
  readonly ownerId?: string
  readonly ready?: boolean
  readonly revision?: number
  /** 当前状态被首次观察到的时刻（epoch ms）；缺失时不猜年龄。 */
  readonly since?: number
}

/** 一层波次（level = 最长路径深度，根 = 0）。 */
export interface Wave<T extends GraphTask = GraphTask> {
  readonly level: number
  readonly tasks: readonly T[]
}

/** 头部计数（running / ready / stalled 三数是页签标题行的事实源）。 */
export interface GraphCounts {
  readonly total: number
  readonly running: number
  readonly ready: number
  readonly stalled: number
  readonly done: number
}

/** 注意力条目的原因（结构性判据；不含「任务失败」——Team 没有这个状态）。 */
export type AttentionReason = 'unassigned' | 'stalled' | 'owner-failed' | 'blocked-too-long'

/** 注意力条目的严重度：critical = owner 会话失败；warning = 待派/可能卡住；info = 阻塞偏久。 */
export type AttentionSeverity = 'critical' | 'warning' | 'info'

/** 一条「需要你注意」（task id + 原因 + 严重度 + 人话说明；不冒充事实）。 */
export interface AttentionItem {
  readonly taskId: string
  readonly reason: AttentionReason
  readonly severity: AttentionSeverity
  readonly message: string
  readonly ownerName?: string
  /** 观察到的持续时长（仅当 `since` 已知）。 */
  readonly ageMs?: number
  /** 年龄已知且超过对应阈值。 */
  readonly overdue: boolean
}

/** 注意力阈值（毫秒）；只用于「超时」标注与 blocked 的入场门。 */
export interface AttentionThresholds {
  readonly unassignedMs?: number
  readonly stalledMs?: number
  readonly blockedMs?: number
}

/** 默认阈值：待派 5 分钟、可能卡住 5 分钟、阻塞 15 分钟（设计 = 只提示不裁判）。 */
export const DEFAULT_ATTENTION_THRESHOLDS: AttentionThresholds = {
  unassignedMs: 5 * 60_000,
  stalledMs: 5 * 60_000,
  blockedMs: 15 * 60_000,
}

/** 一个队员的观察状态（roster phase + 会话 running + 可选观察起点）。 */
export interface MemberStatus {
  /** roster phase：`active` / `inactive` / `provisioning` / `failed`。 */
  readonly phase?: string | undefined
  /** `useSessionStatus.get(id)?.running`；`undefined` = 尚未观测到基线。 */
  readonly running?: boolean | undefined
  /** 当前状态被首次观察到的时刻（epoch ms）；缺失时不猜年龄。 */
  readonly since?: number | undefined
}

/** 队员状态查询面：按 owner 名（或 ownerId）索引的记录或 Map。 */
export type MemberStatusLookup =
  | Readonly<Record<string, MemberStatus | undefined>>
  | ReadonlyMap<string, MemberStatus>

/** 一层 worker 目录条目（`subagentCatalog` 投影的结构性子集）。 */
export interface WorkerCatalogEntry {
  readonly id: string
  readonly mode?: string
  readonly label?: string
  readonly createdAt?: number
}

/** worker 生命周期模式（未知值归一为 `unknown`）。 */
export type WorkerMode = 'one-shot' | 'external' | 'continuable' | 'unknown'

/** worker 忙闲（会话状态投影；`unknown` = 尚未观测）。 */
export type WorkerRunStatus = 'running' | 'inactive' | 'unknown'

/** 一个 worker chip。 */
export interface WorkerChip {
  readonly memberId: string
  readonly id: string
  readonly mode: WorkerMode
  readonly label: string
  /** label 是否真实存在（为空时 label = `worker`，不编造名字）。 */
  readonly named: boolean
  readonly status: WorkerRunStatus
  readonly createdAt?: number
}

/** 研究流程 stage（由根 W 的 kind 派生；不是独立列）。 */
export type PlanStage = 'scan' | 'dive' | 'check' | 'synthesis' | 'review' | 'gate' | 'unknown'

/** `plan.md` 节点表的一行：W<wave>.<index> 节点（W2 是 Wave 2，W2.1 是其节点）。 */
export interface PlanNode {
  readonly id: string
  /** 内部拆解父节点 id；Wave 内的顶层节点 parent 缺省。`W2.1.1` 的 parent = `W2.1`。 */
  readonly parent?: string
  /** 生命周期：active（默认）/ retired / merged_into:… / superseded_by:…；墓碑留在表里供 byId。 */
  readonly lifecycle?: string
  /** 由根 W 的 kind 派生的流程标签（不落表）。 */
  readonly stage?: PlanStage
  /** `task_id` 列：Team 任务与会话映射（缺省时只有 `byId` 精确命中）。 */
  readonly taskId?: string
  readonly kind?: string
  readonly question?: string
  readonly ownerRole?: string
  readonly deps: readonly string[]
  readonly output?: string
  readonly acceptance?: string
  readonly depth?: string
}

const STAGE_BY_KIND: Readonly<Record<string, PlanStage>> = {
  'broad-scan': 'scan',
  'deep-dive': 'dive',
  'cross-check': 'check',
  synthesis: 'synthesis',
  review: 'review',
  gate: 'gate',
}

/** 根 W 的 kind → stage；未知回落 unknown。子 W 继承父 stage（见 planIndex）。 */
export function stageOfKind(kind: string | undefined): PlanStage {
  return kind !== undefined ? STAGE_BY_KIND[kind] ?? 'unknown' : 'unknown'
}

/** 节点是否 active（缺省 = active）；墓碑不画图但保留 byId。 */
export function isActivePlanNode(node: PlanNode): boolean {
  const lifecycle = (node.lifecycle ?? 'active').trim().toLowerCase()
  return lifecycle === '' || lifecycle === 'active'
}

/** `plan.md` 的查询面（节点表缺席时为空索引，不是错误）。 */
export interface PlanIndex {
  readonly nodes: readonly PlanNode[]
  readonly byId: ReadonlyMap<string, PlanNode>
  readonly byTaskId: ReadonlyMap<string, PlanNode>
  /** 图版本（`图版本：v1` / `plan_version: v1`）；缺省 undefined。 */
  readonly version?: string
  /** 顶层 active 节点（parent 缺省）；Wave 由 deps 计算，节点 id 的 Wave 前缀须与之一致。 */
  readonly topLevel: readonly PlanNode[]
  /** parent id → 直接 active 子节点；父节点不存在时仍按 parent 字符串归组（供稳定性提示）。 */
  readonly childrenByParent: ReadonlyMap<string, readonly PlanNode[]>
}

/** plan 结构稳定性问题（只读提示；不阻断 run，不是 node-gate）。 */
export type PlanIssueKind =
  | 'duplicate-id'
  | 'missing-parent'
  | 'dangling-dep'
  | 'self-dependency'
  | 'mixed-family'
  | 'child-prefix'
  | 'too-deep'
  | 'cross-group-child-dep'
  | 'retired-dep'
  | 'tombstone-without-successor'
  | 'wave-prefix'
  | 'legacy-flat-w'

export interface PlanIssue {
  readonly kind: PlanIssueKind
  readonly nodeId: string
  readonly message: string
}

const SEVERITY_RANK: Record<AttentionSeverity, number> = { critical: 0, warning: 1, info: 2 }
const KNOWN_MODES = new Set<string>(['one-shot', 'external', 'continuable', 'unknown'])

/** 列表护栏：非数组/畸形条目退化为空，保证纯函数不 throw。 */
function asTasks(tasks: readonly GraphTask[] | null | undefined): readonly GraphTask[] {
  if (!Array.isArray(tasks)) return []
  const out: GraphTask[] = []
  for (const task of tasks) {
    if (task === null || typeof task !== 'object') continue
    if (typeof task.id !== 'string' || task.id === '') continue
    out.push(task)
  }
  return out
}

/** task id 的数字尾巴（`task-12` → 12、`N3` → 3）；没有则 undefined。 */
function numericSuffix(id: string): number | undefined {
  const match = /(\d+)\s*$/.exec(id)
  const digits = match?.[1]
  if (digits === undefined) return undefined
  const value = Number(digits)
  return Number.isSafeInteger(value) ? value : undefined
}

/**
 * 最长路径分层：`level(n) = max(level(blocker) + 1)`，根 = 0。
 * 缺失的 blocker 忽略（悬空依赖不是本模块能裁的事）；自环忽略；成环不挂——层级钳在
 * `节点数 - 1`，松弛轮数上限 = 节点数（company `dag.ts` 同款，画布/波次数因此有界）。
 * @param tasks - 任务行（`agentTeam` 的 `TeamTaskView` 可直接传入）。
 * @returns 任务 id → 层级。
 */
export function levelsOf(tasks: readonly GraphTask[] | null | undefined): Map<string, number> {
  const list = asTasks(tasks)
  const levels = new Map<string, number>()
  for (const task of list) levels.set(task.id, 0)
  const ceiling = Math.max(0, levels.size - 1)
  for (let round = 0; round < Math.max(1, levels.size); round += 1) {
    let changed = false
    for (const task of list) {
      const own = levels.get(task.id) ?? 0
      for (const blocker of task.blockedBy ?? []) {
        if (blocker === task.id || !levels.has(blocker)) continue
        const candidate = Math.min((levels.get(blocker) ?? 0) + 1, ceiling)
        if (candidate > own) {
          levels.set(task.id, candidate)
          changed = true
        }
      }
    }
    if (!changed) break
  }
  return levels
}

/**
 * 按层级分组为波次：level 升序；组内稳定序 = 数字 id 升序，数字 id 排在非数字 id 前，
 * 同键回落到输入序（Team 板顺序）。
 * @param tasks - 任务行。
 * @returns 波次列表（空输入 → 空数组）。
 */
export function wavesOf<T extends GraphTask>(tasks: readonly T[] | null | undefined): readonly Wave<T>[] {
  const list: readonly T[] = Array.isArray(tasks)
    ? tasks.filter((task): task is T => task !== null && typeof task === 'object' && typeof task.id === 'string' && task.id !== '')
    : []
  const levels = levelsOf(list)
  const buckets = new Map<number, { task: T; index: number }[]>()
  list.forEach((task, index) => {
    const level = levels.get(task.id) ?? 0
    const bucket = buckets.get(level)
    if (bucket === undefined) buckets.set(level, [{ task, index }])
    else bucket.push({ task, index })
  })
  return [...buckets.entries()]
    .sort(([left], [right]) => left - right)
    .map(([level, entries]) => {
      entries.sort((left, right) => {
        const leftNumber = numericSuffix(left.task.id)
        const rightNumber = numericSuffix(right.task.id)
        if (leftNumber !== undefined && rightNumber !== undefined && leftNumber !== rightNumber) return leftNumber - rightNumber
        if (leftNumber !== undefined && rightNumber === undefined) return -1
        if (leftNumber === undefined && rightNumber !== undefined) return 1
        return left.index - right.index
      })
      return { level, tasks: entries.map((entry) => entry.task) }
    })
}

/** 队员状态查询（记录或 Map；owner 名优先，ownerId 兜底）。 */
function lookupMember(
  memberStatus: MemberStatusLookup | null | undefined,
  ownerName: string | undefined,
  ownerId: string | undefined,
): MemberStatus | undefined {
  if (memberStatus === null || memberStatus === undefined) return undefined
  const keys = [ownerName, ownerId].filter((key): key is string => key !== undefined && key !== '')
  if (keys.length === 0) return undefined
  if (memberStatus instanceof Map) {
    for (const key of keys) {
      const status = memberStatus.get(key)
      if (status !== undefined) return status
    }
    return undefined
  }
  // `ReadonlyMap` 不会被 `instanceof Map` 收窄掉（只读接口不保证运行时是 Map），
  // 故非 Map 分支显式按记录表取键——这里的 else 由构造保证就是记录形态。
  const table = memberStatus as Readonly<Record<string, MemberStatus | undefined>>
  for (const key of keys) {
    const status = table[key]
    if (status !== undefined) return status
  }
  return undefined
}

/** owner 是否「当前不在运行」（failed 单独处理，不算 inactive）。 */
function isInactiveOwner(member: MemberStatus | undefined): boolean {
  if (member === undefined) return false
  if (member.phase === 'failed') return false
  if (member.running === true) return false
  if (member.running === false) return true
  return member.phase === 'inactive'
}

/** 时长（毫秒）；`since`/`now` 不可用或负值 → undefined（不猜）。 */
function ageOf(since: number | undefined, now: number): number | undefined {
  if (since === undefined || !Number.isFinite(since) || !Number.isFinite(now)) return undefined
  const age = now - since
  return age >= 0 ? age : undefined
}

/** 分钟的圆整文案（至少 1 分钟；只在年龄已知时使用）。 */
function minutesOf(ageMs: number): number {
  return Math.max(1, Math.round(ageMs / 60_000))
}

/**
 * 「需要你注意」折算：只读事实 + 启发式，不发明任务状态。
 * 判据：
 * - `owner-failed`：owner 的 roster phase = failed（critical）；
 * - `stalled`：`in_progress` 且 owner 当前不在运行（warning，文案写「可能卡住」）；
 * - `unassigned`：`pending + ready` 且无人领取（warning）；
 * - `blocked-too-long`：`pending + !ready` 且有 blocker，**年龄已知**且超过 blockedMs（info；
 *   不知道年龄就不报「超久」）。
 * 阈值只负责 `overdue` 标注与 blocked 的入场门——不知道年龄时如实不标超时。
 * @param tasks - 任务行。
 * @param memberStatus - 按 owner 名/indexed 的队员状态（记录或 Map）。
 * @param now - 当前时刻（epoch ms；不可用时不猜年龄）。
 * @param thresholds - 阈值覆盖（缺省 = {@link DEFAULT_ATTENTION_THRESHOLDS}）。
 * @returns 按严重度排序的注意力条目（同级保持任务输入序）。
 */
export function attentionOf(
  tasks: readonly GraphTask[] | null | undefined,
  memberStatus: MemberStatusLookup | null | undefined,
  now: number,
  thresholds: AttentionThresholds = DEFAULT_ATTENTION_THRESHOLDS,
): readonly AttentionItem[] {
  const list = asTasks(tasks)
  const unassignedMs = thresholds.unassignedMs ?? DEFAULT_ATTENTION_THRESHOLDS.unassignedMs ?? 0
  const stalledMs = thresholds.stalledMs ?? DEFAULT_ATTENTION_THRESHOLDS.stalledMs ?? 0
  const blockedMs = thresholds.blockedMs ?? DEFAULT_ATTENTION_THRESHOLDS.blockedMs ?? 0
  const items: AttentionItem[] = []

  for (const task of list) {
    const status = task.status ?? 'pending'
    if (status === 'completed' || status === 'deleted') continue
    const owner = task.ownerName !== undefined && task.ownerName.trim() !== '' ? task.ownerName.trim() : undefined
    const member = lookupMember(memberStatus, owner, task.ownerId)
    const taskAge = ageOf(task.since, now)

    if (member?.phase === 'failed') {
      items.push({
        taskId: task.id,
        reason: 'owner-failed',
        severity: 'critical',
        message: owner !== undefined ? `owner「${owner}」会话失败` : '负责人会话失败',
        ...(owner !== undefined ? { ownerName: owner } : {}),
        overdue: false,
      })
      continue
    }

    if (status === 'in_progress' && isInactiveOwner(member)) {
      const age = ageOf(member?.since, now) ?? taskAge
      items.push({
        taskId: task.id,
        reason: 'stalled',
        severity: 'warning',
        message: owner !== undefined
          ? `owner「${owner}」当前不在运行——可能卡住${age !== undefined ? `（约 ${String(minutesOf(age))} 分钟）` : ''}`
          : `负责人当前不在运行——可能卡住${age !== undefined ? `（约 ${String(minutesOf(age))} 分钟）` : ''}`,
        ...(owner !== undefined ? { ownerName: owner } : {}),
        ...(age !== undefined ? { ageMs: age } : {}),
        overdue: age !== undefined && age >= stalledMs,
      })
      continue
    }

    if (status === 'pending') {
      const blockedBy = task.blockedBy ?? []
      if (task.ready === true && owner === undefined) {
        items.push({
          taskId: task.id,
          reason: 'unassigned',
          severity: 'warning',
          message: taskAge !== undefined
            ? `已就绪 ${String(minutesOf(taskAge))} 分钟仍无人领取`
            : '已就绪但无人领取',
          ...(taskAge !== undefined ? { ageMs: taskAge } : {}),
          overdue: taskAge !== undefined && taskAge >= unassignedMs,
        })
        continue
      }
      if (task.ready !== true && blockedBy.length > 0 && taskAge !== undefined && blockedMs > 0 && taskAge >= blockedMs) {
        items.push({
          taskId: task.id,
          reason: 'blocked-too-long',
          severity: 'info',
          message: `被 ${blockedBy.join(', ')} 阻塞约 ${String(minutesOf(taskAge))} 分钟`,
          ageMs: taskAge,
          overdue: true,
        })
      }
    }
  }

  items.sort((left, right) => SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity])
  return items
}

/**
 * 头部计数：running = `in_progress` 且 owner 会话在跑；ready = `pending + ready`；
 * stalled = `in_progress` 且 owner 当前不在运行（与 attention 的 stalled 同判据）；
 * done = completed；total = 非 deleted 的任务数。
 * @param tasks - 任务行。
 * @param memberStatus - 队员状态查询面。
 * @returns 计数。
 */
export function countsOf(
  tasks: readonly GraphTask[] | null | undefined,
  memberStatus: MemberStatusLookup | null | undefined,
): GraphCounts {
  let running = 0
  let ready = 0
  let stalled = 0
  let done = 0
  let total = 0
  for (const task of asTasks(tasks)) {
    const status = task.status ?? 'pending'
    if (status === 'deleted') continue
    total += 1
    const owner = task.ownerName !== undefined && task.ownerName.trim() !== '' ? task.ownerName : undefined
    const member = lookupMember(memberStatus, owner, task.ownerId)
    if (status === 'completed') done += 1
    else if (status === 'pending' && task.ready === true) ready += 1
    else if (status === 'in_progress') {
      if (member?.running === true) running += 1
      else if (isInactiveOwner(member)) stalled += 1
    }
  }
  return { total, running, ready, stalled, done }
}

/** 一个 worker 条目的落定观察（phases 归一 + 忙闲查询，查询抛错按 unknown 降级）。 */
function chipOf(
  memberId: string,
  entry: WorkerCatalogEntry,
  statusOf: ((sessionId: string) => boolean | undefined) | undefined,
): WorkerChip | undefined {
  if (typeof entry.id !== 'string' || entry.id === '') return undefined
  const rawLabel = typeof entry.label === 'string' ? entry.label.trim() : ''
  const named = rawLabel !== ''
  const mode = typeof entry.mode === 'string' && KNOWN_MODES.has(entry.mode) ? (entry.mode as WorkerMode) : 'unknown'
  let status: WorkerRunStatus = 'unknown'
  if (typeof statusOf === 'function') {
    try {
      const running = statusOf(entry.id)
      if (running === true) status = 'running'
      else if (running === false) status = 'inactive'
    } catch { status = 'unknown' }
  }
  return {
    memberId,
    id: entry.id,
    mode,
    label: named ? rawLabel : 'worker',
    named,
    status,
    ...(typeof entry.createdAt === 'number' ? { createdAt: entry.createdAt } : {}),
  }
}

/**
 * worker chip 摊平：每个队员会话的 `subagentCatalog`（其直接子会话）→ chip。
 * 缺失/空目录、畸形条目、状态查询抛错全部降级（空数组 / unknown），永不 throw；
 * label 为空时显示 `worker` 且 `named: false`——不编造名字（one-shot 常态）。
 * @param catalogs - 队员 id → 子会话目录（`subagentCatalog` 投影）。
 * @param statusOf - worker 会话 id → running（`useSessionStatus` 的查询闭包）。
 * @returns 按输入顺序摊平的 chip 列表。
 */
export function workerChipsOf(
  catalogs: Readonly<Record<string, readonly WorkerCatalogEntry[] | null | undefined>> | null | undefined,
  statusOf: ((sessionId: string) => boolean | undefined) | undefined,
): readonly WorkerChip[] {
  if (catalogs === null || catalogs === undefined || typeof catalogs !== 'object') return []
  const chips: WorkerChip[] = []
  for (const [memberId, entries] of Object.entries(catalogs)) {
    if (!Array.isArray(entries)) continue
    for (const entry of entries) {
      if (entry === null || typeof entry !== 'object') continue
      const chip = chipOf(memberId, entry, statusOf)
      if (chip !== undefined) chips.push(chip)
    }
  }
  return chips
}

/** 空 plan 索引（节点表缺席的合法形态）。 */
function emptyPlanIndex(version?: string): PlanIndex {
  return {
    nodes: [],
    byId: new Map(),
    byTaskId: new Map(),
    ...(version !== undefined ? { version } : {}),
    topLevel: [],
    childrenByParent: new Map(),
  }
}

/** 一行 markdown 表格 → 单元格（非表格行 → 空数组）。 */
function splitRow(line: string): readonly string[] {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|')) return []
  const body = trimmed.replace(/^\|/, '').replace(/\|$/, '')
  return body.split('|').map((cell) => cell.trim())
}

/** 表头归一：去 markdown 标记、小写、去空白/下划线/连字符（`task_id` → `taskid`）。 */
function normalizeHeader(cell: string): string {
  return cell.replace(/`/g, '').replace(/\*\*/g, '').trim().toLowerCase().replace(/[\s_-]+/g, '')
}

/** 单元格值归一：剥 markdown 标记；空/占位符 → undefined。 */
function cellValue(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined
  const value = raw.replace(/`/g, '').replace(/\*\*/g, '').trim()
  if (value === '' || value === '-' || value === '—' || value === '–') return undefined
  return value
}

/** 分隔行（`|---|---|` / `:---:`）。 */
function isSeparator(cells: readonly string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
}

/**
 * 解析 `plan.md` 的节点表（id / parent / kind / question / owner_role / deps / output /
 * acceptance / depth / task_id）。表头缺失、表格畸形、文本缺席 → 空索引（合法退化，不是错误）。
 * `task_id` 列是 Team 任务 ↔ W/N 节点的唯一权威映射（F8）；不按数字后缀猜映射。
 * `parent` 是复合节点的层级；顶层图只取 parent 缺省的节点。
 * @param text - `plan.md` 文本（可为 null/undefined）。
 * @returns 节点查询面。
 */
export function planIndex(text: string | null | undefined): PlanIndex {
  if (typeof text !== 'string' || text.trim() === '') return emptyPlanIndex()
  const version = /(?:图版本|plan_version)\s*[：:]\s*([A-Za-z0-9._-]+)/.exec(text)?.[1]
  const lines = text.split(/\r?\n/)
  const nodes: PlanNode[] = []
  let columns: Map<string, number> | undefined
  let started = false

  for (const line of lines) {
    const cells = splitRow(line)
    if (!started) {
      if (cells.length < 2) continue
      const normalized = cells.map(normalizeHeader)
      if (!normalized.includes('id')) continue
      const map = new Map<string, number>()
      normalized.forEach((cell, index) => { if (!map.has(cell)) map.set(cell, index) })
      columns = map
      started = true
      continue
    }
    if (cells.length === 0) break
    if (isSeparator(cells)) continue
    const read = (name: string): string | undefined => {
      const index = columns?.get(name)
      return index === undefined ? undefined : cellValue(cells[index])
    }
    const id = read('id')
    if (id === undefined) continue
    const deps = (read('deps') ?? '').split(/[,，;；]/).map((dep) => dep.trim()).filter((dep) => dep !== '')
    const parent = read('parent')
    const lifecycle = read('lifecycle')
    const taskId = read('taskid')
    const kind = read('kind')
    const question = read('question')
    const ownerRole = read('ownerrole')
    const output = read('output')
    const acceptance = read('acceptance')
    const depth = read('depth')
    const node: PlanNode = {
      id,
      deps,
      ...(parent !== undefined ? { parent } : {}),
      ...(lifecycle !== undefined ? { lifecycle } : {}),
      ...(taskId !== undefined ? { taskId } : {}),
      ...(kind !== undefined ? { kind } : {}),
      ...(question !== undefined ? { question } : {}),
      ...(ownerRole !== undefined ? { ownerRole } : {}),
      ...(output !== undefined ? { output } : {}),
      ...(acceptance !== undefined ? { acceptance } : {}),
      ...(depth !== undefined ? { depth } : {}),
    }
    nodes.push(node)
  }

  if (nodes.length === 0) return emptyPlanIndex(version)
  const rawById = new Map<string, PlanNode>()
  for (const node of nodes) if (!rawById.has(node.id)) rawById.set(node.id, node)
  const rootOf = (node: PlanNode): PlanNode => {
    let current = node
    const seen = new Set<string>()
    while (current.parent !== undefined && rawById.has(current.parent) && !seen.has(current.parent)) {
      seen.add(current.parent)
      current = rawById.get(current.parent)!
    }
    return current
  }
  const staged: PlanNode[] = nodes.map((node) => ({
    ...node,
    stage: stageOfKind(rootOf(node).kind),
  }))
  const byId = new Map<string, PlanNode>()
  const byTaskId = new Map<string, PlanNode>()
  for (const node of staged) {
    if (!byId.has(node.id)) byId.set(node.id, node)
    if (node.taskId !== undefined && !byTaskId.has(node.taskId)) byTaskId.set(node.taskId, node)
  }
  const topLevel = staged.filter((node) => node.parent === undefined && isActivePlanNode(node))
  const childrenByParent = new Map<string, PlanNode[]>()
  for (const node of staged) {
    if (node.parent === undefined || !isActivePlanNode(node)) continue
    const bucket = childrenByParent.get(node.parent)
    if (bucket === undefined) childrenByParent.set(node.parent, [node])
    else bucket.push(node)
  }
  return {
    nodes: staged,
    byId,
    byTaskId,
    ...(version !== undefined ? { version } : {}),
    topLevel,
    childrenByParent,
  }
}

/**
 * plan 结构稳定性提示（只读；不是 node-gate、不阻断 run）：
 * - `duplicate-id`：同一 id 出现多次（编号纪律 = 只分配一次）；
 * - `missing-parent`：子节点的 parent 不在表里（复合节点必须挂在真实父节点）；
 * - `dangling-dep` / `self-dependency`：deps 指向不存在的节点 / 自己。
 * 这些提示让用户看到“计划重排/编号复用”的迹象，而不是静默画错图。
 * @param index - {@link planIndex} 的结果（可为 null）。
 * @returns 稳定性问题列表（空 = 未发现）。
 */
export function planIssuesOf(index: PlanIndex | null | undefined): readonly PlanIssue[] {
  if (index === null || index === undefined) return []
  const issues: PlanIssue[] = []
  const seen = new Set<string>()
  const duplicated = new Set<string>()
  for (const node of index.nodes) {
    if (seen.has(node.id)) duplicated.add(node.id)
    else seen.add(node.id)
  }
  for (const id of duplicated) {
    issues.push({ kind: 'duplicate-id', nodeId: id, message: `${id} 出现了多次——编号只能分配一次` })
  }
  const hasW = index.nodes.some((node) => /^W(?:[0-9]|$)/.test(node.id))
  const hasN = index.nodes.some((node) => /^N(?:[0-9]|$)/.test(node.id))
  if (hasW && hasN) {
    issues.push({ kind: 'mixed-family', nodeId: '*', message: '同一 plan 混用 W/N 家族——新 plan 用 W，旧 N 只读兼容' })
  }
  const rootOf = (node: PlanNode): PlanNode => {
    let current = node
    const visited = new Set<string>()
    while (current.parent !== undefined && index.byId.has(current.parent) && !visited.has(current.parent)) {
      visited.add(current.parent)
      current = index.byId.get(current.parent)!
    }
    return current
  }
  // Wave 身份：顶层 W 节点 id 必须是 W<wave>.<index>；wave = deps 最长路径 + 1。
  // 旧 flat W（W1/W2，无 .index）是 2026-10-22 之前的 working-package 形态，只读兼容并显式提示。
  const flatW = index.topLevel.filter((node) => /^W\d+$/.test(node.id))
  if (flatW.length > 0) {
    issues.push({ kind: 'legacy-flat-w', nodeId: flatW[0]!.id, message: '旧 flat W（W1/W2…）只读；新 plan 用 W<wave>.<index>（如 W2.1）' })
  }
  const waveLevel = new Map<string, number>()
  const waveOf = (node: PlanNode, visiting = new Set<string>()): number => {
    const known = waveLevel.get(node.id)
    if (known !== undefined) return known
    if (visiting.has(node.id)) return 1
    visiting.add(node.id)
    let max = 0
    for (const dep of node.deps) {
      const depNode = index.byId.get(dep)
      if (depNode !== undefined && depNode.parent === undefined && isActivePlanNode(depNode)) {
        max = Math.max(max, waveOf(depNode, visiting))
      }
    }
    const level = max + 1
    waveLevel.set(node.id, level)
    return level
  }
  for (const node of index.topLevel) {
    if (!/^W\d+\./.test(node.id)) continue
    const prefix = Number(/^W(\d+)\./.exec(node.id)?.[1])
    const expected = waveOf(node)
    if (Number.isFinite(prefix) && prefix !== expected) {
      issues.push({ kind: 'wave-prefix', nodeId: node.id, message: `${node.id} 实际在 Wave ${expected}——按 deps 重编号并写旧号别名` })
    }
  }
  for (const node of index.nodes) {
    if (node.parent !== undefined && !index.byId.has(node.parent)) {
      issues.push({ kind: 'missing-parent', nodeId: node.id, message: `${node.id} 的 parent ${node.parent} 不在节点表里` })
    }
    if (node.parent !== undefined && !node.id.startsWith(`${node.parent}.`)) {
      issues.push({ kind: 'child-prefix', nodeId: node.id, message: `${node.id} 的 id 必须以父号 ${node.parent}. 开头` })
    }
    if (node.id.split('.').length > 3) {
      issues.push({ kind: 'too-deep', nodeId: node.id, message: `${node.id} 超过 3 层——更深请折叠/摘要` })
    }
    if (!isActivePlanNode(node) && !/(?:merged_into|superseded_by|derived_from)/i.test(node.lifecycle ?? '')) {
      issues.push({ kind: 'tombstone-without-successor', nodeId: node.id, message: `${node.id} 是墓碑但没有 merged_into/superseded_by` })
    }
    for (const dep of node.deps) {
      if (dep === node.id) {
        issues.push({ kind: 'self-dependency', nodeId: node.id, message: `${node.id} 依赖自己` })
        continue
      }
      const depNode = index.byId.get(dep)
      if (depNode === undefined) {
        issues.push({ kind: 'dangling-dep', nodeId: node.id, message: `${node.id} 的 dep ${dep} 不在节点表里` })
        continue
      }
      if (isActivePlanNode(node) && !isActivePlanNode(depNode)) {
        issues.push({ kind: 'retired-dep', nodeId: node.id, message: `${node.id} 依赖了已退役的 ${dep}；改指 successor 或提升到父级` })
      }
      if (node.parent !== undefined && rootOf(node).id !== rootOf(depNode).id) {
        issues.push({ kind: 'cross-group-child-dep', nodeId: node.id, message: `${node.id} 跨组依赖 ${dep}——提升到父 W 依赖` })
      }
    }
  }
  return issues
}

/**
 * 任务 → plan 节点：`task_id` 精确命中优先，其次按 plan id 精确命中；不按数字后缀猜映射
 * （F8：`task_id` 才是会话映射，旧 `task-N` 不是持久身份）。
 * @param index - {@link planIndex} 的结果（可为 null）。
 * @param taskId - Team 任务 id。
 * @returns plan 节点；未记录/未回填 `task_id` → undefined。
 */
export function planNodeOf(index: PlanIndex | null | undefined, taskId: string): PlanNode | undefined {
  if (index === null || index === undefined || typeof taskId !== 'string' || taskId === '') return undefined
  return index.byTaskId.get(taskId) ?? index.byId.get(taskId)
}
