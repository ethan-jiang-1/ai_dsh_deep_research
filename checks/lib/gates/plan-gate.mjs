// plan-gate.mjs — plan 执行图的硬结构/字段门（BUG-267 / 268 / 280–285；keyless）。
//
// `planIssuesOf` 原本只是驾驶舱的“稳定性提示”；本模块把它接到 run 门：
//   硬结构（环/悬空 dep/悬空 parent/重复 id/自依赖/混合族）→ RED；
//   字段（owner_role ∈ 角色集、kind ∈ 闭集、lifecycle 合法、question/output/acceptance/
//   budget/depth 必填或合法、`## 剩余工作` 内容、图版本与 plan/vN 快照内容、Wave 执行/task_id）
//   → RED；wave-prefix/legacy 类迁移提示保留为 detail 注记。
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isActivePlanNode, planIndex, planIssuesOf } from '../../../packages/deep-research-pack/src/lib/plan/plan-index.ts'
import { presetRoles } from '../shared/roles.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const PLAN_KINDS = Object.freeze(['broad-scan', 'deep-dive', 'cross-check', 'synthesis', 'review', 'gate', 'fetch'])
const HARD_ISSUES = new Set(['duplicate-id', 'missing-parent', 'dangling-dep', 'self-dependency', 'cycle', 'mixed-family', 'retired-dep', 'tombstone-without-successor'])
const LIFECYCLE = /^(?:active|retired|merged_into\s*[:：]\s*\S+|superseded_by\s*[:：]\s*\S+|derived_from\s*[:：]\s*\S+)$/i
const DEPTHS = ['L0', 'L1', 'L2', 'L3']

const sectionOf = (text, heading) => {
  const lines = String(text ?? '').split('\n')
  const at = lines.findIndex((line) => new RegExp('^##\\s*' + heading).test(line))
  if (at === -1) return null
  const out = []
  for (let i = at + 1; i < lines.length; i += 1) { if (/^##\s/.test(lines[i])) break; out.push(lines[i]) }
  return out.join('\n')
}

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
  if (index.nodes.length === 0) issues.push('plan.md 节点表为空/畸形——执行图正本不能 0 节点（BUG-280）')
  const taskIds = new Set()
  for (const node of index.nodes) {
    if (node.taskId !== undefined && node.taskId !== '') {
      if (taskIds.has(node.taskId)) issues.push(`task_id 重复：${node.taskId}（BUG-283）`)
      taskIds.add(node.taskId)
    }
  }
  const roles = new Set(presetRoles(ROOT))
  for (const node of index.nodes) {
    if (node.kind !== undefined && !PLAN_KINDS.includes(node.kind)) issues.push(`${node.id} 的 kind「${node.kind}」不在闭集（${PLAN_KINDS.join('/')}）`)
    if (node.ownerRole !== undefined && !roles.has(node.ownerRole)) issues.push(`${node.id} 的 owner_role「${node.ownerRole}」不在角色集（${[...roles].join('/')}）`)
    if (node.lifecycle !== undefined && !LIFECYCLE.test(node.lifecycle.trim())) issues.push(`${node.id} 的 lifecycle「${node.lifecycle}」非法`)
  }
  // plan-index 不解析 budget；从原始表按表头取（单列判据，不复制整张表）。
  const tableLines = text.split('\n').filter((line) => /^\s*\|/.test(line))
  const headerLine = tableLines.find((line) => /\|\s*id\s*\|/i.test(line)) ?? ''
  const headerCells = headerLine.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim().toLowerCase())
  const budgetAt = headerCells.indexOf('budget')
  const budgetOf = (id) => {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const line = tableLines.find((row) => new RegExp('^\\s*\\|\\s*' + escaped + '\\s*\\|').test(row))
    if (line === undefined || budgetAt === -1) return undefined
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')[budgetAt]?.trim()
  }
  // 列必填/值域（BUG-282）：只对 active 节点要求，墓碑可省。
  for (const node of index.nodes.filter(isActivePlanNode)) {
    for (const [field, value] of [['question', node.question], ['output', node.output], ['acceptance', node.acceptance]]) {
      if (value === undefined || String(value).trim() === '' || /^<.*>$/.test(String(value).trim())) issues.push(`${node.id} 缺 ${field}（active 节点必填）`)
    }
    const budget = budgetOf(node.id)
    if (budget === undefined || budget === '') issues.push(`${node.id} 缺 budget（无预算写 —）`)
    const depth = String(node.depth ?? '').trim().toUpperCase()
    if (!DEPTHS.includes(depth)) issues.push(`${node.id} 的 depth「${node.depth ?? ''}」非法（L0–L3）`)
  }
  // 图版本（BUG-281）+ 快照内容（BUG-285）
  if (index.version === undefined) {
    issues.push('plan.md 缺图版本（图版本：vN）——重写无法追溯（BUG-281）')
  } else {
    const raw = index.version.trim()
    const n = raw.toLowerCase().startsWith('v') ? Number(raw.slice(1)) : Number.NaN
    if (!Number.isSafeInteger(n) || n < 1) issues.push(`plan.md 图版本「${index.version}」非法（应为 vN）`)
    else if (n > 1) {
      const prev = join(bundleDir, 'plan', `v${n - 1}.md`)
      if (!existsSync(prev)) issues.push(`plan.md 图版本 ${index.version} 但缺前版快照 plan/v${n - 1}.md`)
      else {
        const snap = planIndex(readFileSync(prev, 'utf8'))
        if (snap === null || snap.nodes.length === 0) issues.push(`plan/v${n - 1}.md 快照为空/无节点表（BUG-285）`)
        if (snap?.version !== undefined && snap.version !== `v${n - 1}`) issues.push(`plan/v${n - 1}.md 快照图版本为 ${snap.version}，与链不符`)
      }
    }
  }
  // 剩余工作内容（BUG-284）
  const remaining = sectionOf(text, '剩余工作')
  if (remaining === null) issues.push('plan.md 缺「## 剩余工作」节（nodes-contract 要求在場必有）')
  else {
    const bullets = remaining.split('\n').map((line) => line.trim()).filter((line) => /^-\s+/.test(line))
    if (bullets.length === 0) issues.push('「## 剩余工作」为空——全部完成写 `- 无`')
    else if (!bullets.some((line) => /^-\s*无\s*$/.test(line))) {
      for (const line of bullets) {
        if (!/(owner|负责人)/i.test(line) || !/(next|下一步)/i.test(line)) issues.push(`剩余工作条目缺 owner/next：${line.slice(0, 60)}`)
      }
    }
  }
  // Wave 执行 / task_id（BUG-283）
  const waveText = sectionOf(text, 'Wave 执行')
  if (waveText !== null) {
    const header = waveText.split('\n').find((line) => /^\s*\|/.test(line)) ?? ''
    if (/\b(engine|channel)\b/i.test(header)) issues.push('「## Wave 执行」表头不得有 engine/channel 列（plan-index 不解析）')
    const waves = [...waveText.matchAll(/^-\s*W(\d+)\s*[:：]/gm)].map((m) => m[1])
    if (waves.length === 0) issues.push('「## Wave 执行」在场但没有 `- W<n>:` 条目')
    for (const node of index.nodes.filter(isActivePlanNode)) {
      const wave = /^W(\d+)\./.exec(node.id)?.[1]
      if (wave !== undefined && waves.includes(wave) && node.taskId !== 'plan-only') issues.push(`${node.id} 在 Wave 执行层但 task_id 不是 plan-only`)
    }
  }
  if (issues.length > 0) return { status: 'RED', detail: issues.slice(0, 8).join('；') }
  const softNote = soft.length > 0 ? `；迁移提示：${[...new Set(soft)].join('/')}` : ''
  return { status: 'PASS', detail: `节点 ${index.nodes.length}；图无环/无悬空/无重号；字段/剩余工作/版本链齐${softNote}` }
}
