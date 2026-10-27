/**
 * plan-index.ts —— `plan.md` 节点表的纯解析与查询面（fail-soft，永不 throw；keyless 单测面）。
 *
 * 从 plan-graph.ts 拆出（2026-10-28 卫生轮）：Team 任务图折算与 plan.md 解析是两件事——
 * 前者消费 agentTeam 投影，后者消费文件文本；混在一个 775 行模块里时，改解析规则要在图
 * 折算的上下文里翻。边界：本件不 import React、不 import plan-graph；图侧按需 import 本件。
 *
 * - `planIndex` / `planNodeOf`：节点查询面（id / parent / kind / depth / acceptance / task_id）；
 *   `topLevel` 只含 parent 缺省的 active 节点（复合子节点 W3.1… 默认不进图；墓碑不进图）。
 * - `planIssuesOf`：重号 / 悬空 parent / 悬空 dep / 自依赖 / wave 前缀 → 只读稳定性提示
 *   （不是 node-gate）。
 */

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
  // 取**最后**一条版本声明，并且先剥掉 HTML 注释（模板里的示例行也写 `图版本：vN`）。
  // 不剥注释/取第一条会把重写后的 plan 读成样板值（受控 E2E 实测：v2 被读成 v1 或 vN）。
  const withoutComments = text.replace(/<!--[\s\S]*?-->/g, '')
  let version: string | undefined
  for (const match of withoutComments.matchAll(/(?:图版本|plan_version)\s*[：:]\s*([A-Za-z0-9._-]+)/g)) {
    if (match[1] !== undefined) version = match[1]
  }
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
