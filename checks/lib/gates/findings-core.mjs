// findings-core.mjs — findings 结构化字段的解析与契约（BUG-252 / 256；keyless 纯逻辑）。
//
// 模板/技能声明的 findings 字段此前只有 `gap: \S+` 的“非空”检查；gap 四态、lenses/lens_gaps
// 都没有消费者。本模块把三件事收成同一份判据：
//   ① gap ∈ GAP_STATES（未知状态不得静默当 supported）；
//   ② 有 lenses 的 finding 必须显式写 lens_gaps（`无` 或差集 id；空列表 = 红）；
//   ③ lens_gaps 与 topics.lenses − 支撑证据的 lens 的差集一致（有 topics/evidence 时）。
// scope_role 的四值闭集住在同一处（SCOPE_ROLES），供 node-gate 的覆盖门使用。
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { splitFrontmatter } from '../shared/frontmatter.mjs'

export const GAP_STATES = Object.freeze(['supported', 'needs_search', 'contradicted', 'insufficient'])
export const SCOPE_ROLES = Object.freeze(['primary', 'synthesis', 'comparison', 'supporting'])

const scalarOf = (value) => String(value ?? '').trim().replace(/^['"]|['"]$/g, '')

/** `[a, b]` / `a, b` / `无` / `[]` → 字符串数组（`无` 与空列表都归一为空数组）。 */
export function listOf(raw) {
  const value = scalarOf(raw)
  if (value === '' || value === '无' || value === '[]') return []
  return value.replace(/^\[|\]$/g, '').split(/[,，、]/).map((x) => scalarOf(x)).filter(Boolean)
}

/** topics.md → Map<T#, { role, lenses }>（只认 `## T#` 节内的 scope_role/lenses 行）。 */
export function parseTopicsOf(text) {
  const topics = new Map()
  let cur = null
  for (const line of String(text ?? '').split('\n')) {
    const h = /^##\s+(T\d+)\b/.exec(line)
    if (h !== null) { cur = { role: '', lenses: [] }; topics.set(h[1], cur); continue }
    if (/^##\s+/.test(line)) { cur = null; continue }
    if (cur === null) continue
    const role = /^\s*-\s*scope_role\s*[:：]\s*(\S+)/m.exec(line)
    if (role !== null) cur.role = scalarOf(role[1])
    const lenses = /^\s*-\s*lenses\s*[:：]\s*(.*)$/m.exec(line)
    if (lenses !== null) cur.lenses = listOf(lenses[1])
  }
  return topics
}

/** findings.md → 每个 F# 的 { id, evidence, lenses, lensGaps, gap }。 */
export function parseFindingsOf(text) {
  const findings = []
  let cur = null
  for (const line of String(text ?? '').split('\n')) {
    const h = /^##\s*F(\d+)\s*[:：]/.exec(line)
    if (h !== null) { cur = { id: `F${h[1]}`, evidence: [], lenses: [], lensGaps: [], gap: '' }; findings.push(cur); continue }
    if (/^##\s+/.test(line)) { cur = null; continue }
    if (cur === null) continue
    const ev = /^\s*-\s*支撑证据\s*[:：]\s*(.+)$/m.exec(line)
    if (ev !== null) cur.evidence = [...ev[1].matchAll(/evidence\/[A-Za-z0-9_.-]+\.md/g)].map((m) => m[0])
    const lenses = /^\s*-\s*lenses\s*[:：]\s*(.*)$/m.exec(line)
    if (lenses !== null) cur.lenses = listOf(lenses[1])
    const gaps = /^\s*-\s*lens_gaps\s*[:：]\s*(.*)$/m.exec(line)
    if (gaps !== null) cur.lensGaps = listOf(gaps[1])
    const gap = /^\s*-\s*gap\s*[:：]\s*(\S+)/m.exec(line)
    if (gap !== null) cur.gap = scalarOf(gap[1])
  }
  return findings
}

const setOf = (arr) => new Set(arr)
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x))

/**
 * findings 契约问题（空数组 = 绿）；findings.md 缺席返回 null（N/A，由调用方标注）。
 * @returns {string[]|null}
 */
export function findingsContractIssues(bundleDir) {
  const findingsPath = join(bundleDir, 'findings.md')
  if (!existsSync(findingsPath)) return null
  const text = readFileSync(findingsPath, 'utf8')
  const topicsPath = join(bundleDir, 'topics.md')
  const topics = existsSync(topicsPath) ? parseTopicsOf(readFileSync(topicsPath, 'utf8')) : new Map()
  const allLenses = new Set([...topics.values()].flatMap((t) => t.lenses))
  const issues = []
  const blocks = parseFindingsOf(text)
  if (blocks.length === 0) issues.push('findings.md 无 F# 块——防空语料（不得静默 0 条）')
  for (const block of blocks) {
    if (!GAP_STATES.includes(block.gap)) {
      issues.push(`${block.id} 的 gap「${block.gap || '（缺）'}」∉ {${GAP_STATES.join('/')}}（未知状态不得静默当 supported）`)
    }
    if (block.lenses.length > 0 && !/^\s*-\s*lens_gaps\s*[:：]/m.test(text)) {
      issues.push(`${block.id} 有 lenses 但缺 lens_gaps 行（必须显式写差集或「无」）`)
    }
    if (block.lensGaps.length === 0 && /^\s*-\s*lens_gaps\s*[:：]\s*\[\s*\]\s*$/m.test(text)) {
      issues.push(`${block.id} 的 lens_gaps 是空列表——无缺口写「无」，有缺口写 id（空列表不可判）`)
    }
    for (const lens of block.lensGaps) {
      if (allLenses.size > 0 && !allLenses.has(lens)) issues.push(`${block.id} 的 lens_gaps「${lens}」不在 topics.lenses 集合`)
    }
    // 差集对账：topics.lenses − 支撑证据的 lens（有 topics/evidence 才判）
    if (allLenses.size > 0 && block.evidence.length > 0) {
      const topicIds = new Set()
      const evidenceLenses = new Set()
      for (const rel of block.evidence) {
        const p = join(bundleDir, rel)
        if (!existsSync(p)) { issues.push(`${block.id} 的支撑证据 ${rel} 不存在`); continue }
        const { fm } = splitFrontmatter(readFileSync(p, 'utf8'))
        if (fm === null) continue
        for (const m of String(fm.supports ?? '').matchAll(/T\d+/g)) topicIds.add(m[0])
        const lens = scalarOf(fm.lens)
        if (lens !== '') evidenceLenses.add(lens)
      }
      const topicLenses = new Set([...topicIds].flatMap((id) => topics.get(id)?.lenses ?? []))
      if (topicLenses.size > 0) {
        const expected = new Set([...topicLenses].filter((lens) => !evidenceLenses.has(lens)))
        if (!sameSet(expected, setOf(block.lensGaps))) {
          issues.push(`${block.id} 的 lens_gaps 与 topics−evidence 差集不一致（期望 {${[...expected].sort().join('/') || '无'}}，实写 {${[...block.lensGaps].sort().join('/') || '无'}}）`)
        }
      }
    }
  }
  return issues
}
