// review-contract.mjs — review.md 的结构化判据（BUG-254 / 257；keyless）。
//
// 技能说 review.md 终局块必须有 topic × lens 覆盖表、CRITICAL/MAJOR 清单；
// 此前只有 readiness 被解析，覆盖表与 severity 是散文。本模块把两件事机械化：
//   ① 有 lens 的 run：覆盖表必须在场；每个 lens-bearing topic 必须有行；表内 evidence 引用
//      必须指向真实文件且 `lens` 属于该 topic 的 lenses；`—`/空 格必须同行有 gap/n-a 解释；
//   ② review 的 CRITICAL 清单：readiness PASS 时不得有未解释的 CRITICAL；
//      解释 = 显式 `resolved-critical: C1, C2`（或 all）行——只认结构，不认散文。
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { splitFrontmatter } from '../shared/frontmatter.mjs'
import { parseTopicsOf } from './findings-core.mjs'

const scalarOf = (value) => String(value ?? '').trim().replace(/^['"]|['"]$/g, '')

/** review.md 的 markdown 行（去首尾空白）；文件缺席 = null。 */
function linesOf(bundleDir) {
  const p = join(bundleDir, 'review.md')
  return existsSync(p) ? readFileSync(p, 'utf8').split('\n') : null
}

/** 覆盖表：表头含 topic 与 lens 的 markdown 表；无表返回 null。 */
export function coverageTableOf(text) {
  const lines = String(text ?? '').split('\n')
  // 表头 = 第一列 topic 的 markdown 表；限定在含「覆盖/lens」的标题之后（防误抓别的表）。
  const heading = lines.findIndex((line) => /^#{2,4}\s+/.test(line) && /(覆盖|topic\s*[×x]\s*lens)/i.test(line))
  const from = heading === -1 ? 0 : heading
  const at = lines.findIndex((line, i) => i >= from && /^\s*\|/.test(line) && /^\s*\|\s*topic\s*\|/i.test(line))
  if (at === -1) return null
  const rows = []
  for (let i = at; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i])) break
    const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue
    rows.push(cells)
  }
  return rows.length > 0 ? rows : null
}

/** 覆盖表问题（无 lens 的 run = []；review 缺席 = []，交付门另判）。 */
export function coverageIssues(bundleDir) {
  const topicsPath = join(bundleDir, 'topics.md')
  if (!existsSync(topicsPath)) return []
  const topics = parseTopicsOf(readFileSync(topicsPath, 'utf8'))
  const lensTopics = [...topics.entries()].filter(([, t]) => t.lenses.length > 0)
  if (lensTopics.length === 0) return []
  const lines = linesOf(bundleDir)
  if (lines === null) return ['review.md 缺席——覆盖表无从判（交付门同时判 review 在场）']
  // 实际卡数：topic × lens 的 evidence 计数（BUG-288）；表内写「N 卡」时必须与盘上一致。
  const evidenceDir = join(bundleDir, 'evidence')
  const counts = new Map()
  if (existsSync(evidenceDir)) {
    for (const file of readdirSync(evidenceDir).filter((n) => n.endsWith('.md'))) {
      const { fm } = splitFrontmatter(readFileSync(join(evidenceDir, file), 'utf8'))
      if (fm === null) continue
      const lens = scalarOf(fm.lens)
      for (const m of String(fm.supports ?? '').matchAll(/T\d+/g)) {
        const key = m[0] + '|' + lens
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }
  }
  const rows = coverageTableOf(lines.join('\n'))
  if (rows === null) return ['有 lens 的 run 缺 topic × lens 覆盖表（表头须含 topic 与 lens）']
  const header = rows[0]
  const lensCols = header.map((h, i) => ({ h, i })).filter(({ h }) => !/^topic$/i.test(h)).map(({ i }) => i)
  const issues = []
  for (const [id, topic] of lensTopics) {
    const row = rows.slice(1).find((cells) => cells[0] === id)
    if (row === undefined) { issues.push(`覆盖表缺 topic ${id} 的行`); continue }
    for (const i of lensCols) {
      const cell = scalarOf(row[i])
      if (cell === '' || /^[—-]/.test(cell)) {
        if (!/gap|n\/a|不适用/i.test(row.join(' '))) issues.push(`${id} 的 lens 格为空/— 但没有 gap/n-a 解释`)
        continue
      }
      const declared = /(\d+)\s*卡/.exec(cell)?.[1]
      if (declared === undefined && !/evidence\//.test(cell)) {
        issues.push(`${id}/${scalarOf(header[i])} 的格既无「N 卡」计数也无 evidence 引用（无法核）`)
        continue
      }
      if (declared !== undefined) {
        const actual = counts.get(id + '|' + scalarOf(header[i])) ?? 0
        if (Number(declared) !== actual) issues.push(`${id}/${scalarOf(header[i])} 声明 ${declared} 卡，盘上实际 ${actual} 卡`)
      }
      for (const m of cell.matchAll(/evidence\/[A-Za-z0-9_.-]+\.md/g)) {
        const p = join(bundleDir, m[0])
        if (!existsSync(p)) { issues.push(`${id} 的覆盖表引用不存在：${m[0]}`); continue }
        const { fm } = splitFrontmatter(readFileSync(p, 'utf8'))
        const lens = scalarOf(fm?.lens)
        const columnLens = scalarOf(header[i])
        if (lens === '' || lens !== columnLens) issues.push(`${id} 的覆盖表引用 ${m[0]} 的 lens「${lens}」与该列「${columnLens}」不一致`)
      }
    }
  }
  return issues
}

/** review 的 CRITICAL 清单 vs readiness：PASS 时未解释的 CRITICAL > 0 = 红。 */
export function severityIssues(bundleDir, { readinessPass = false } = {}) {
  const lines = linesOf(bundleDir)
  if (lines === null) return []
  const critical = new Set([...lines.join('\n').matchAll(/^\s*[-*]\s*(?:\*\*)?(C\d+)\b/gm)].map((m) => m[1]))
  if (critical.size === 0 || !readinessPass) return []
  const waiver = new Set()
  for (const m of lines.join('\n').matchAll(/^\s*resolved-critical\s*[:：]\s*(.+)$/gm)) {
    for (const part of m[1].split(/[,，、\s]+/).filter(Boolean)) {
      if (part.toLowerCase() === 'all') return []
      waiver.add(part)
    }
  }
  const unresolved = [...critical].filter((id) => !waiver.has(id))
  return unresolved.length === 0 ? [] : [`review 有未解释的 CRITICAL（${unresolved.join(', ')}）但 readiness=PASS——补 resolved-critical 或改 FAIL`]
}

/** 汇总（交付门消费）。 */
export function reviewContractIssues(bundleDir, { readinessPass = false } = {}) {
  return [...coverageIssues(bundleDir), ...severityIssues(bundleDir, { readinessPass })]
}
