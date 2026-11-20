/**
 * plan-index.ts —— `plan.md` 节点表的纯解析与查询面（fail-soft，永不 throw；keyless 单测面）。
 *
 * 从 plan-graph.ts 拆出（2026-10-28 卫生轮）：Team 任务图折算与 plan.md 解析是两件事——
 * 前者消费 agentTeam 投影，后者消费文件文本；混在一个 775 行模块里时，改解析规则要在图
 * 折算的上下文里翻。边界：本件不 import React、不 import plan-graph；图侧按需 import 本件。
 *
 * - `planIndex` / `planNodeOf`：节点查询面（id / parent / kind / depth / acceptance / task_id）；
 *   `topLevel` 只含 parent 缺省的 active 节点（复合子节点 W3.1… 默认不进图；墓碑不进图）。
 *   解析事实（`table`：源码缺席 / 在场坏表 / decoded，字段存在性、显式占位与位置诊断）与
 *   查询面同源；缺文件 = absent，在场坏表 = invalid + diagnostics，不再静默退化成“合法空图”。
 * - `planIssuesOf`：重号 / 悬空 parent / 悬空 dep / 自依赖 / 环 / wave 前缀 → 只读稳定性提示
 *   （不是 node-gate）。
 */
import { translateZh, type PackTranslate } from '../shared/i18n.ts'
import { maskMarkdownLines } from '../shared/markdown-mask.ts'

/** 研究流程 stage（由根 W 的 kind 派生；不是独立列）。 */
type PlanStage = 'scan' | 'dive' | 'check' | 'synthesis' | 'review' | 'gate' | 'unknown'

const PLAN_COLUMNS = ['id', 'parent', 'lifecycle', 'kind', 'question', 'ownerrole', 'deps', 'output', 'acceptance', 'budget', 'depth', 'taskid'] as const
type PlanColumn = typeof PLAN_COLUMNS[number]

/** 单元格的存在性与显式无值不折叠；位置为源行号 + 表内列序号（从 1 开始）。 */
export interface PlanCell {
  readonly state: 'missing-column' | 'missing-cell' | 'empty' | 'explicit-placeholder' | 'value'
  readonly raw?: string
  readonly value?: string
  readonly line: number
  readonly column?: number
}

type PlanTableProblem = 'empty-source' | 'table-missing' | 'empty-table' | 'duplicate-column' | 'ambiguous-table' | 'row-arity' | 'unsupported-escaped-pipe' | 'missing-id'
export interface PlanTableDiagnostic {
  readonly code: PlanTableProblem
  readonly line: number
  readonly column?: number
}

/** 解析事实不是 gate verdict；invalid 保留行事实供诊断，但不投影权威节点。 */
export interface PlanTable {
  readonly source: 'absent' | 'present'
  readonly status: 'absent' | 'invalid' | 'decoded'
  readonly rows: readonly Readonly<Record<PlanColumn, PlanCell>>[]
  readonly diagnostics: readonly PlanTableDiagnostic[]
}

/** `plan.md` 节点表的一行：W<wave>.<index> 节点（W2 是 Wave 2，W2.1 是其节点）。 */
export interface PlanNode {
  readonly id: string
  /** 与 table.rows 同源的字段事实；硬门不再重新扫描文本。 */
  readonly cells: Readonly<Record<PlanColumn, PlanCell>>
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
  readonly table: PlanTable
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
type PlanIssueKind =
  | 'duplicate-id'
  | 'missing-parent'
  | 'dangling-dep'
  | 'self-dependency'
  | 'cycle'
  | 'mixed-family'
  | 'child-prefix'
  | 'too-deep'
  | 'cross-group-child-dep'
  | 'retired-dep'
  | 'tombstone-without-successor'
  | 'wave-prefix'
  | 'legacy-flat-w'
  | 'table-invalid'

export interface PlanIssue {
  readonly kind: PlanIssueKind
  readonly nodeId: string
  readonly message: string
}

/** 空 plan 索引（节点表缺席的合法形态）。 */
function emptyPlanIndex(table: PlanTable, version?: string): PlanIndex {
  return {
    table,
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

/** 分隔行（`|---|---|` / `:---:`）。 */
function isSeparator(cells: readonly string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
}

/** 节点表只认正文；语义列重复、多表和错位不选择一个“最可能”的读法。 */
function tableOf(text: string | null | undefined): PlanTable {
  if (text === null || text === undefined) return { source: 'absent', status: 'absent', rows: [], diagnostics: [] }
  const diagnostics: PlanTableDiagnostic[] = []
  const rows: Readonly<Record<PlanColumn, PlanCell>>[] = []
  if (text.trim() === '') return { source: 'present', status: 'invalid', rows, diagnostics: [{ code: 'empty-source', line: 1 }] }
  const lines = maskMarkdownLines(text.replace(/^\uFEFF/, ''))
  // 表从第一个含 id 列的行开始，到第一个非表格行为止；之后若再出现含 id 列的候选表 → 多表。
  let start = -1
  for (let at = 0; at < lines.length; at += 1) {
    if (splitRow(lines[at]!).map(normalizeHeader).includes('id')) { start = at; break }
  }
  if (start === -1) return { source: 'present', status: 'invalid', rows, diagnostics: [{ code: 'table-missing', line: 1 }] }
  let end = start + 1
  for (; end < lines.length; end += 1) if (splitRow(lines[end]!).length === 0) break
  for (let at = end + 1; at < lines.length; at += 1) {
    if (splitRow(lines[at]!).map(normalizeHeader).includes('id')) {
      return { source: 'present', status: 'invalid', rows, diagnostics: [{ code: 'ambiguous-table', line: start + 1 }, { code: 'ambiguous-table', line: at + 1 }] }
    }
  }
  const header = { at: start, cells: splitRow(lines[start]!) }
  const columns = new Map<string, number>()
  header.cells.forEach((cell, at) => {
    const name = normalizeHeader(cell)
    if (!(PLAN_COLUMNS as readonly string[]).includes(name)) return
    if (columns.has(name)) diagnostics.push({ code: 'duplicate-column', line: header.at + 1, column: at + 1 })
    else columns.set(name, at)
  })
  if (lines[header.at]?.includes('\\|')) diagnostics.push({ code: 'unsupported-escaped-pipe', line: header.at + 1 })
  for (let at = header.at + 1; at < end; at += 1) {
    const line = lines[at]!
    const cells = splitRow(line)
    if (isSeparator(cells)) continue
    if (line.includes('\\|')) diagnostics.push({ code: 'unsupported-escaped-pipe', line: at + 1 })
    if (cells.length !== header.cells.length) diagnostics.push({ code: 'row-arity', line: at + 1 })
    const facts = Object.fromEntries(PLAN_COLUMNS.map((name) => {
      const column = columns.get(name)
      const raw = column === undefined ? undefined : cells[column]
      const normalized = raw?.replace(/`/g, '').replace(/\*\*/g, '').trim()
      const state: PlanCell['state'] = column === undefined ? 'missing-column'
        : raw === undefined ? 'missing-cell'
          : normalized === '' ? 'empty'
            : normalized === '-' || normalized === '—' || normalized === '–' ? 'explicit-placeholder' : 'value'
      return [name, { state, ...(raw !== undefined ? { raw } : {}), ...(normalized !== undefined ? { value: normalized } : {}), line: at + 1, ...(column !== undefined ? { column: column + 1 } : {}) }]
    })) as unknown as Readonly<Record<PlanColumn, PlanCell>>
    rows.push(facts)
    if (facts.id.state !== 'value') diagnostics.push({ code: 'missing-id', line: at + 1, column: (columns.get('id') ?? 0) + 1 })
    // 两张表之间没有空行时，第二张表的表头会被当成数据行；识别“id 值就是 id + 多个语义列名”。
    const recognized = cells.map(normalizeHeader).filter((name) => (PLAN_COLUMNS as readonly string[]).includes(name))
    if (facts.id.value === 'id' && recognized.length >= 2) diagnostics.push({ code: 'ambiguous-table', line: at + 1 })
  }
  if (rows.length === 0) diagnostics.push({ code: 'empty-table', line: header.at + 1 })
  return { source: 'present', status: diagnostics.length === 0 ? 'decoded' : 'invalid', rows, diagnostics }
}

/**
 * 解析 `plan.md` 的节点表（id / parent / kind / question / owner_role / deps / output /
 * acceptance / depth / task_id）。文本缺席 → absent；在场无表/空表/畸形 → invalid 并给出
 * 行定位诊断，节点查询面为空；只有 decodable 的唯一节点表才投影节点。
 * `task_id` 列是 Team 任务 ↔ W/N 节点的唯一权威映射（F8）；不按数字后缀猜映射。
 * `parent` 是复合节点的层级；顶层图只取 parent 缺省的节点。
 * @param text - `plan.md` 文本（可为 null/undefined）。
 * @returns 节点查询面。
 */
export function planIndex(text: string | null | undefined): PlanIndex {
  const table = tableOf(text)
  if (typeof text !== 'string' || text.trim() === '') return emptyPlanIndex(table)
  // 取**最后**一条版本声明，并且先剥掉 HTML 注释（模板里的示例行也写 `图版本：vN`）。
  // 不剥注释/取第一条会把重写后的 plan 读成样板值（受控 E2E 实测：v2 被读成 v1 或 vN）。
  const withoutComments = text.replace(/<!--[\s\S]*?-->/g, '')
  // 只认首个 `##` 之前的头部（正文旧版引用不夺权，BUG-102）；无 `##` 退化为全文首个。
  const hasHeading = /^##\s/m.test(withoutComments)
  const headerBlock = hasHeading
    ? (withoutComments.split(/^##\s/m)[0] ?? '')
    : withoutComments.split('\n').filter((line) => !/^\s*>/.test(line)).join('\n')
  const headerMatches = [...headerBlock.matchAll(/(?:图版本|plan_version)\s*[：:]\s*([A-Za-z0-9._-]+)/g)]
  // 有分节：头部最后一个；无分节：全文首个（BUG-125）。
  const version = headerMatches.length === 0
    ? undefined
    : (hasHeading ? headerMatches.at(-1)?.[1] : headerMatches[0]?.[1])
  if (table.status !== 'decoded') return emptyPlanIndex(table, version)
  const nodes: PlanNode[] = []
  for (const cells of table.rows) {
    const read = (name: PlanColumn): string | undefined => cells[name].state === 'value' ? cells[name].value : undefined
    const id = read('id')!

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
      cells,
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

  if (nodes.length === 0) return emptyPlanIndex(table, version)
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
    table,
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
 * @param t - UI 翻译器（缺省 = 中文；组件必须传 `props.t`）。
 * @returns 稳定性问题列表（空 = 未发现）。
 */
export function planIssuesOf(index: PlanIndex | null | undefined, t: PackTranslate = translateZh): readonly PlanIssue[] {
  if (index === null || index === undefined) return []
  const issues: PlanIssue[] = []
  if (index.table.status === 'invalid') {
    const detail = index.table.diagnostics.map((item) => `${item.code}@${item.line}`).join(', ')
    issues.push({ kind: 'table-invalid', nodeId: '*', message: t('planIssueTableInvalid', { detail }) })
  }
  const seen = new Set<string>()
  const duplicated = new Set<string>()
  for (const node of index.nodes) {
    if (seen.has(node.id)) duplicated.add(node.id)
    else seen.add(node.id)
  }
  for (const id of duplicated) {
    issues.push({ kind: 'duplicate-id', nodeId: id, message: t('planIssueDuplicateId', { id }) })
  }
  const hasW = index.nodes.some((node) => /^W(?:[0-9]|$)/.test(node.id))
  const hasN = index.nodes.some((node) => /^N(?:[0-9]|$)/.test(node.id))
  if (hasW && hasN) {
    issues.push({ kind: 'mixed-family', nodeId: '*', message: t('planIssueMixedFamily') })
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
  // 环检测：有环的图不可执行，且 wave-prefix 的重编号提示会把读者带偏（重编号不能解环）。
  // 只沿 active 节点与 active dep 走，与 waveCountOf 的检测面一致。
  const activeById = new Map(index.nodes.filter(isActivePlanNode).map((node) => [node.id, node]))
  const cycle = (() => {
    const state = new Map<string, 1 | 2>()
    const stack: string[] = []
    const visit = (id: string): readonly string[] | null => {
      const mark = state.get(id)
      if (mark === 1) return [...stack.slice(stack.indexOf(id)), id]
      if (mark === 2) return null
      const node = activeById.get(id)
      if (node === undefined) return null
      state.set(id, 1)
      stack.push(id)
      for (const dep of node.deps) {
        if (dep === id) continue // 自依赖单列，不冒充环
        const found = visit(dep)
        if (found !== null) return found
      }
      stack.pop()
      state.set(id, 2)
      return null
    }
    for (const node of activeById.values()) {
      const found = visit(node.id)
      if (found !== null) return found
    }
    return null
  })()
  if (cycle !== null) {
    issues.push({
      kind: 'cycle',
      nodeId: cycle[0]!,
      message: t('planIssueCycle', { cycle: cycle.join(' → ') }),
    })
  }
  // Wave 身份：顶层 W 节点 id 必须是 W<wave>.<index>；wave = deps 最长路径 + 1。
  // 旧 flat W（W1/W2，无 .index）是 2026-10-22 之前的 working-package 形态，只读兼容并显式提示。
  const flatW = index.topLevel.filter((node) => /^W\d+$/.test(node.id))
  if (flatW.length > 0) {
    issues.push({ kind: 'legacy-flat-w', nodeId: flatW[0]!.id, message: t('planIssueLegacyFlatW') })
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
  if (cycle === null) {
    for (const node of index.topLevel) {
      if (!/^W\d+\./.test(node.id)) continue
      const prefix = Number(/^W(\d+)\./.exec(node.id)?.[1])
      const expected = waveOf(node)
      if (Number.isFinite(prefix) && prefix !== expected) {
        issues.push({ kind: 'wave-prefix', nodeId: node.id, message: t('planIssueWavePrefix', { id: node.id, wave: String(expected) }) })
      }
    }
  }
  for (const node of index.nodes) {
    if (node.parent !== undefined && !index.byId.has(node.parent)) {
      issues.push({ kind: 'missing-parent', nodeId: node.id, message: t('planIssueMissingParent', { id: node.id, parent: node.parent }) })
    }
    if (node.parent !== undefined && !node.id.startsWith(`${node.parent}.`)) {
      issues.push({ kind: 'child-prefix', nodeId: node.id, message: t('planIssueChildPrefix', { id: node.id, parent: node.parent }) })
    }
    if (node.id.split('.').length > 3) {
      issues.push({ kind: 'too-deep', nodeId: node.id, message: t('planIssueTooDeep', { id: node.id }) })
    }
    if (!isActivePlanNode(node) && !/(?:merged_into|superseded_by|derived_from)/i.test(node.lifecycle ?? '')) {
      issues.push({ kind: 'tombstone-without-successor', nodeId: node.id, message: t('planIssueTombstone', { id: node.id }) })
    }
    for (const dep of node.deps) {
      if (dep === node.id) {
        issues.push({ kind: 'self-dependency', nodeId: node.id, message: t('planIssueSelfDependency', { id: node.id }) })
        continue
      }
      const depNode = index.byId.get(dep)
      if (depNode === undefined) {
        issues.push({ kind: 'dangling-dep', nodeId: node.id, message: t('planIssueDanglingDep', { id: node.id, dep }) })
        continue
      }
      if (isActivePlanNode(node) && !isActivePlanNode(depNode)) {
        issues.push({ kind: 'retired-dep', nodeId: node.id, message: t('planIssueRetiredDep', { id: node.id, dep }) })
      }
      if (node.parent !== undefined && rootOf(node).id !== rootOf(depNode).id) {
        issues.push({ kind: 'cross-group-child-dep', nodeId: node.id, message: t('planIssueCrossGroup', { id: node.id, dep }) })
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
