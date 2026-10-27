/**
 * plan-diff.ts —— 两张 plan 节点表的结构 diff（keyless 单测；图谱版本轨只画）。
 *
 * 为什么要有它：rerun 的版本面只有快照还不够，用户要回答「v1 哪里不对、v2 改了什么」。
 * 盘上可用的结构事实只有两件：节点 id/lifecycle/deps。本文件只比这三件，不猜内容差异：
 *
 *   added     next 有、previous 没有（且不是某个旧节点的后继）
 *   removed   previous 有、next 没有（或被标墓碑且没有可用后继）
 *   kept      两边都在且 active
 *   alias     previous 节点被墓碑化，lifecycle 的 `superseded_by:` / `merged_into:` 指向
 *             next 的 active 节点 —— 重编号的唯一结构化载体（不解析重写记录散文）
 *   dependencyChanges  kept 节点的 deps 集合变化
 *
 * 边界：只比 active 节点（墓碑不作为图节点）；alias 目标不算 added；没有快照时不调用本文件
 * （调用方如实显示「无旧图快照」）。
 */
import { isActivePlanNode } from './plan-index.ts'
import type { PlanIndex } from './plan-index.ts'

/** 重编号/并号的一条别名。 */
export interface PlanDiffAlias {
  readonly from: string
  readonly to: string
}

/** 保留节点的依赖变化。 */
export interface PlanDiffDependencyChange {
  readonly id: string
  readonly from: readonly string[]
  readonly to: readonly string[]
}

/** 两张 plan 的结构差异。 */
export interface PlanDiff {
  readonly added: readonly string[]
  readonly removed: readonly string[]
  readonly kept: readonly string[]
  readonly aliases: readonly PlanDiffAlias[]
  readonly dependencyChanges: readonly PlanDiffDependencyChange[]
  /** 一行摘要（只列非零项；两侧都空 → 「两侧都没有节点」）。 */
  readonly summary: string
}

/** lifecycle 里的后继指针：`superseded_by:W3.2,W3.3` / `merged_into:W4.1`。 */
function successorsOf(lifecycle: string | undefined): readonly string[] {
  if (typeof lifecycle !== 'string') return []
  const match = /(?:superseded_by|merged_into)\s*[：:]\s*([^;|]+)/i.exec(lifecycle)
  if (match?.[1] === undefined) return []
  return match[1].split(/[,，]/).map((id) => id.trim()).filter((id) => id !== '')
}

/** deps 集合比较（顺序不算变化）。 */
function sameDeps(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const left = [...a].sort()
  const right = [...b].sort()
  return left.every((id, index) => id === right[index])
}

/**
 * 结构 diff。
 * @param previous - 旧图快照的 {@link PlanIndex}（可为 null）。
 * @param next - 当前 plan 的 {@link PlanIndex}（可为 null）。
 * @returns {@link PlanDiff}（永不 throw）。
 */
export function planDiffOf(previous: PlanIndex | null | undefined, next: PlanIndex | null | undefined): PlanDiff {
  const oldNodes = (previous?.nodes ?? []).filter((node) => isActivePlanNode(node))
  const newNodes = (next?.nodes ?? []).filter((node) => isActivePlanNode(node))
  const oldById = new Map(oldNodes.map((node) => [node.id, node]))
  const newById = new Map(newNodes.map((node) => [node.id, node]))
  // next 里的墓碑也看一眼：重编号后旧号会以墓碑形态留在表里。
  const nextTombstones = new Map<string, string | undefined>()
  for (const node of next?.nodes ?? []) {
    if (!isActivePlanNode(node)) nextTombstones.set(node.id, node.lifecycle)
  }
  const oldTombstones = new Map<string, string | undefined>()
  for (const node of previous?.nodes ?? []) {
    if (!isActivePlanNode(node)) oldTombstones.set(node.id, node.lifecycle)
  }

  const added: string[] = []
  const removed: string[] = []
  const kept: string[] = []
  const aliases: PlanDiffAlias[] = []
  const aliasTargets = new Set<string>()

  for (const oldNode of oldNodes) {
    const live = newById.get(oldNode.id)
    if (live !== undefined) {
      kept.push(oldNode.id)
      continue
    }
    // 旧号在 next 里被墓碑化，且墓碑指向的 active 节点在场 → 重编号/并号。
    const tombstoneLifecycle = nextTombstones.get(oldNode.id)
    const successor = successorsOf(tombstoneLifecycle).find((id) => newById.has(id))
    if (successor !== undefined) {
      aliases.push({ from: oldNode.id, to: successor })
      aliasTargets.add(successor)
      continue
    }
    removed.push(oldNode.id)
  }

  for (const newNode of newNodes) {
    if (oldById.has(newNode.id) || aliasTargets.has(newNode.id)) continue
    added.push(newNode.id)
  }

  const dependencyChanges: PlanDiffDependencyChange[] = []
  for (const id of kept) {
    const before = oldById.get(id)
    const after = newById.get(id)
    if (before === undefined || after === undefined) continue
    if (sameDeps(before.deps, after.deps)) continue
    dependencyChanges.push({ id, from: before.deps, to: after.deps })
  }

  // 旧图一侧的墓碑若在 next 里复活，不算 alias（数据异常，交给 planIssues/version 面如实显示）。
  void oldTombstones

  const parts: string[] = []
  if (added.length > 0) parts.push(`+${String(added.length)} 新增`)
  if (kept.length > 0) parts.push(`${String(kept.length)} 保留`)
  if (removed.length > 0) parts.push(`${String(removed.length)} 退役`)
  if (aliases.length > 0) parts.push(`${String(aliases.length)} 重编号`)
  if (dependencyChanges.length > 0) parts.push(`${String(dependencyChanges.length)} 依赖变化`)

  return {
    added,
    removed,
    kept,
    aliases,
    dependencyChanges,
    summary: parts.length > 0 ? parts.join(' / ') : '两侧都没有节点',
  }
}
