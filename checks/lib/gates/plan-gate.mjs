// plan-gate.mjs — plan 执行图的硬结构/字段门（BUG-267 / 268；keyless）。
//
// `planIssuesOf` 原本只是驾驶舱的“稳定性提示”；本模块把它接到 run 门：
//   硬结构（环/悬空 dep/悬空 parent/重复 id/自依赖/混合族）→ RED；
//   字段（owner_role ∈ 角色集、kind ∈ 闭集、lifecycle 合法、`## 剩余工作` 在场、
//   图版本与 plan/vN 快照对账）→ RED；wave-prefix/legacy 类迁移提示保留为 detail 注记。
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { planIndex, planIssuesOf } from '../../../packages/deep-research-pack/src/lib/plan/plan-index.ts'
import { presetRoles } from '../shared/roles.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const PLAN_KINDS = Object.freeze(['broad-scan', 'deep-dive', 'cross-check', 'synthesis', 'review', 'gate', 'fetch'])
const HARD_ISSUES = new Set(['duplicate-id', 'missing-parent', 'dangling-dep', 'self-dependency', 'cycle', 'mixed-family', 'retired-dep', 'tombstone-without-successor'])
const LIFECYCLE = /^(?:active|retired|merged_into\s*[:：]\s*\S+|superseded_by\s*[:：]\s*\S+|derived_from\s*[:：]\s*\S+)$/i

/** 门 P（plan 结构/字段）。plan.md 缺席 = N/A（在场级归 schema-scan）。 */
export function planGate(bundleDir) {
  const p = join(bundleDir, 'plan.md')
  if (!existsSync(p)) return { status: 'N/A', detail: 'plan.md 不在场——门 P 无对象（在场级归 schema-scan）' }
  const text = readFileSync(p, 'utf8')
  const index = planIndex(text)
  if (index === null) return { status: 'RED', detail: 'plan.md 节点表无法解析' }
  const issues = []
  const soft = []
  for (const issue of planIssuesOf(index)) {
    if (HARD_ISSUES.has(issue.kind)) issues.push(`${issue.kind} ${issue.nodeId}：${issue.message}`)
    else soft.push(issue.kind)
  }
  const roles = new Set(presetRoles(ROOT))
  for (const node of index.nodes) {
    if (node.kind !== undefined && !PLAN_KINDS.includes(node.kind)) issues.push(`${node.id} 的 kind「${node.kind}」不在闭集（${PLAN_KINDS.join('/')}）`)
    if (node.ownerRole !== undefined && !roles.has(node.ownerRole)) issues.push(`${node.id} 的 owner_role「${node.ownerRole}」不在角色集（${[...roles].join('/')}）`)
    if (node.lifecycle !== undefined && !LIFECYCLE.test(node.lifecycle.trim())) issues.push(`${node.id} 的 lifecycle「${node.lifecycle}」非法`)
  }
  if (!/^##\s*剩余工作/m.test(text)) issues.push('plan.md 缺「## 剩余工作」节（nodes-contract 要求在場必有）')
  if (index.version !== undefined) {
    const raw = index.version.trim()
    const n = raw.toLowerCase().startsWith('v') ? Number(raw.slice(1)) : Number.NaN
    if (!Number.isSafeInteger(n) || n < 1) issues.push(`plan.md 图版本「${index.version}」非法（应为 vN）`)
    else if (n > 1) {
      const prev = join(bundleDir, 'plan', `v${n - 1}.md`)
      if (!existsSync(prev)) issues.push(`plan.md 图版本 ${index.version} 但缺前版快照 plan/v${n - 1}.md`)
    }
  }
  if (issues.length > 0) return { status: 'RED', detail: issues.slice(0, 8).join('；') }
  const softNote = soft.length > 0 ? `；迁移提示：${[...new Set(soft)].join('/')}` : ''
  return { status: 'PASS', detail: `节点 ${index.nodes.length}；图无环/无悬空/无重号；字段与剩余工作齐${softNote}` }
}
