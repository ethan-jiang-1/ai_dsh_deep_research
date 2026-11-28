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
import { maskMarkdownLines } from '../../../packages/deep-research-pack/src/lib/shared/markdown-mask.ts'

const scalarOf = (value) => String(value ?? '').trim().replace(/^['"]|['"]$/g, '')
const stripDecor = (value) => String(value ?? '').replace(/\*\*|__|`/g, '').trim()
const topicIdOf = (cell) => /^(T\d+)\b/.exec(stripDecor(scalarOf(cell)))?.[1] ?? null

/**
 * 多轮 review.md 时定位当前生效的最高轮终局块（H1 优先，不足两块再看 H2）；
 * 单轮 review.md 返回全文。避免历史轮（如文末 `# 第 1 轮终局块`）的覆盖表或 CRITICAL 串入终局判据。
 */
function activeReviewScope(text) {
  const raw = String(text ?? '')
  const lines = raw.split('\n')
  const masked = maskMarkdownLines(raw)
  for (const level of [1, 2]) {
    const hashes = '#'.repeat(level)
    const roundRe = new RegExp(`^${hashes}\\s+(?!#).*(?:第\\s*(\\d+)\\s*轮|round\\s*(\\d+))`, 'i')
    const boundaryRe = new RegExp(`^#{1,${level}}\\s+`)
    const blocks = []
    for (let i = 0; i < masked.length; i += 1) {
      // 文件首行 `# Review — ...` 可能是含轮次注记的文档总标题，不作分轮切片头
      if (level === 1 && i === 0 && /^#\s+Review\b/i.test(masked[i])) continue
      const m = roundRe.exec(masked[i])
      if (m === null) continue
      const round = Number(m[1] ?? m[2])
      let end = masked.length
      for (let j = i + 1; j < masked.length; j += 1) {
        if (boundaryRe.test(masked[j])) { end = j; break }
      }
      blocks.push({ round, text: lines.slice(i, end).join('\n') })
    }
    if (blocks.length >= 2) {
      blocks.sort((a, b) => b.round - a.round)
      return blocks[0].text
    }
  }
  return raw
}

/** review.md 的 markdown 行（去首尾空白）；文件缺席 = null。 */
function linesOf(bundleDir) {
  const p = join(bundleDir, 'review.md')
  return existsSync(p) ? readFileSync(p, 'utf8').split('\n') : null
}

function extractCoverageTable(text) {
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

/** 覆盖表：优先取当前生效终局块内的覆盖表，缺席再回退全文（防旧轮复审省略重写表时误红）；无表返回 null。 */
export function coverageTableOf(text) {
  const active = activeReviewScope(text)
  return extractCoverageTable(active) ?? extractCoverageTable(text)
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
  // 实际卡数：topic × lens 的 evidence 计数（BUG-288 / BUG-487）：同时维护全量计数（跨 topic 卡复计）与
  // 单 topic 计数（跨 topic 对账卡单独归集，若 review 脚注显式按文件名声明跨行不落格则两口径皆认）。
  const evidenceDir = join(bundleDir, 'evidence')
  const counts = new Map()
  const exclusiveCounts = new Map()
  const crossByKey = new Map()
  const bump = (map, key, quality) => {
    const bucket = map.get(key) ?? { total: 0, A: 0, B: 0 }
    bucket.total += 1
    if (quality === 'A' || quality === 'B') bucket[quality] += 1
    map.set(key, bucket)
  }
  if (existsSync(evidenceDir)) {
    for (const file of readdirSync(evidenceDir).filter((n) => n.endsWith('.md'))) {
      const { fm } = splitFrontmatter(readFileSync(join(evidenceDir, file), 'utf8'))
      if (fm === null) continue
      const lens = scalarOf(fm.lens)
      const quality = scalarOf(fm.quality)
      const supported = [...new Set([...String(fm.supports ?? '').matchAll(/T\d+/g)].map((m) => m[0]))]
      const isCross = supported.length >= 2
      const stem = file.replace(/\.md$/, '')
      for (const tid of supported) {
        const key = `${tid}|${lens}`
        bump(counts, key, quality)
        if (isCross) {
          const list = crossByKey.get(key) ?? []
          list.push(stem)
          crossByKey.set(key, list)
        } else {
          bump(exclusiveCounts, key, quality)
        }
      }
    }
  }
  const activeText = activeReviewScope(lines.join('\n'))
  const footnoteAccountsFor = (stems) => stems.length > 0 && stems.every((stem) => {
    const shortId = /^([a-z]+-\d+)\b/i.exec(stem)?.[1] ?? null
    const idRe = shortId === null ? null : new RegExp(`(?<![A-Za-z0-9-])${shortId}(?![A-Za-z0-9-])`, 'i')
    return activeText.split('\n').some((l) => (l.includes(stem) || (idRe !== null && idRe.test(l)))
      && /(?:跨行|不落格|跨\s*topic|脚注|注\s*\d)/i.test(l))
  })
  const rows = coverageTableOf(lines.join('\n'))
  if (rows === null) return ['有 lens 的 run 缺 topic × lens 覆盖表（表头须含 topic 与 lens）']
  const header = rows[0]
  const lensCols = header.map((h, i) => ({ h, i })).filter(({ h }) => !/^topic$/i.test(h)).map(({ i }) => i)
  const issues = []
  for (const [id, topic] of lensTopics) {
    const row = rows.slice(1).find((cells) => topicIdOf(cells[0]) === id)
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
        const key = `${id}|${scalarOf(header[i])}`
        const allBucket = counts.get(key) ?? { total: 0, A: 0, B: 0 }
        const crossStems = crossByKey.get(key) ?? []
        const exclBucket = exclusiveCounts.get(key) ?? { total: 0, A: 0, B: 0 }
        const q = /A(\d+)\s*\/\s*B(\d+)/i.exec(cell)
        const matches = (b) => Number(declared) === b.total && (q === null || (Number(q[1]) === b.A && Number(q[2]) === b.B))
        const bucket = !matches(allBucket) && footnoteAccountsFor(crossStems) && matches(exclBucket) ? exclBucket : allBucket
        if (Number(declared) !== bucket.total) issues.push(`${id}/${scalarOf(header[i])} 声明 ${declared} 卡，盘上实际 ${bucket.total} 卡`)
        if (q !== null && (Number(q[1]) !== bucket.A || Number(q[2]) !== bucket.B)) {
          issues.push(`${id}/${scalarOf(header[i])} 声明 A${q[1]}/B${q[2]}，盘上实际 A${bucket.A}/B${bucket.B}`)
        }
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

/** 仅从当前终局块的 CRITICAL 节内提取 `- C#` 清单（不跨 MAJOR/MINOR/历史轮）。 */
function criticalSectionLines(activeText) {
  const masked = maskMarkdownLines(activeText)
  const out = []
  let activeLevel = 0
  for (const line of masked) {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading !== null) {
      const level = heading[1].length
      const title = stripDecor(heading[2])
      if (level >= 2 && level <= 4 && /^(?:\d+\.\s*)?CRITICAL\b/i.test(title)) {
        activeLevel = level
        continue
      }
      if (activeLevel > 0 && level <= activeLevel) activeLevel = 0
      continue
    }
    if (activeLevel > 0) out.push(line)
  }
  return out
}

/** review 的 CRITICAL 清单 vs readiness：PASS 时未解释的 CRITICAL > 0 = 红。 */
export function severityIssues(bundleDir, { readinessPass = false } = {}) {
  const lines = linesOf(bundleDir)
  if (lines === null) return []
  const active = activeReviewScope(lines.join('\n'))
  const critLines = criticalSectionLines(active)
  const critical = new Set([...critLines.join('\n').matchAll(/^\s*[-*]\s*(?:\*\*)?(C\d+)\b/gm)].map((m) => m[1]))
  if (critical.size === 0 || !readinessPass) return []
  const waiver = new Set()
  for (const line of maskMarkdownLines(active)) {
    const flat = line.replace(/\*\*|__|`/g, '')
    const m = /resolved-critical\s*[:：]\s*(.+)$/i.exec(flat)
    if (m === null) continue
    const cleaned = m[1].replace(/（[^）]*）|\([^)]*\)/g, ' ').replace(/[。.;；]+$/g, '')
    for (const part of cleaned.split(/[,，、\s]+/).filter(Boolean)) {
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
