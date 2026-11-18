// findings-core.mjs — findings/topics 结构化字段的解析与契约（BUG-252…266 / 277 / 279；keyless 纯逻辑）。
//
// 模板声明的字段此前只有形状/非空检查；本模块把两族判据收成同一份：
//   findings：gap 四态；lens_gaps 按块（不是全文正则）；支撑证据存在性（与 lens 无关）；
//             重复 F#；lens/lens_gaps 必须是真实 lens id；supports 必须指向存在的 T#。
//   topics：  重复 T#；must_answer 2–5；depends_on 图（未知/自依赖/环）；lenses 真实 id。
// scope_role 的四值闭集（SCOPE_ROLES）也在此，供 node-gate 的覆盖门使用。
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { splitFrontmatter } from '../shared/frontmatter.mjs'

export const GAP_STATES = Object.freeze(['supported', 'needs_search', 'contradicted', 'insufficient'])
export const SCOPE_ROLES = Object.freeze(['primary', 'synthesis', 'comparison', 'supporting'])
/** 真实 lens id（正本 = content/lenses/*.md 的 `id:`；template-contract 对账）。 */
export const LENS_IDS = Object.freeze(['academic', 'adversarial', 'historical', 'official', 'practitioner', 'quant', 'regulatory', 'structural'])
export const MUST_ANSWER_MIN = 2
export const MUST_ANSWER_MAX = 5

const scalarOf = (value) => String(value ?? '').trim().replace(/^['"]|['"]$/g, '')

/** `[a, b]` / `a, b` / `无` / `[]` → 字符串数组（`无` 与空列表都归一为空数组）。 */
export function listOf(raw) {
  const value = scalarOf(raw)
  if (value === '' || value === '无' || value === '[]') return []
  return value.replace(/^\[|\]$/g, '').split(/[,，、]/).map((x) => scalarOf(x)).filter(Boolean)
}

const isTopField = (line) => /^\s*-\s*[A-Za-z_\u4e00-\u9fff]+\s*[:：]/.test(line)

/** topics.md → { topics: Map<T#, {role,lenses,dependsOn,mustAnswer}>, duplicates, issues }。 */
export function parseTopicsReport(text) {
  const topics = new Map()
  const duplicates = []
  let cur = null
  let inMustAnswer = false
  for (const line of String(text ?? '').split('\n')) {
    const h = /^##\s+(T\d+)\b/.exec(line)
    if (h !== null) {
      cur = { id: h[1], role: '', lenses: [], dependsOn: [], mustAnswer: [] }
      if (topics.has(h[1])) duplicates.push(h[1])
      else topics.set(h[1], cur)
      inMustAnswer = false
      continue
    }
    if (/^##\s+/.test(line)) { cur = null; continue }
    if (cur === null) continue
    const must = /^\s*-\s*must_answer\s*[:：]\s*(.*)$/.exec(line)
    if (must !== null) {
      inMustAnswer = true
      cur.mustAnswer = listOf(must[1])
      continue
    }
    if (inMustAnswer && isTopField(line)) inMustAnswer = false
    if (inMustAnswer && /^\s{2,}-\s+(.+)$/.test(line)) {
      cur.mustAnswer.push(scalarOf(line.replace(/^\s{2,}-\s+/, '')))
      continue
    }
    const role = /^\s*-\s*scope_role\s*[:：]\s*(\S+)/m.exec(line)
    if (role !== null) cur.role = scalarOf(role[1])
    const lenses = /^\s*-\s*lenses\s*[:：]\s*(.*)$/m.exec(line)
    if (lenses !== null) cur.lenses = listOf(lenses[1])
    const deps = /^\s*-\s*depends_on\s*[:：]\s*(.*)$/m.exec(line)
    if (deps !== null) cur.dependsOn = listOf(deps[1])
  }
  const issues = []
  for (const dup of duplicates) issues.push(`topics.md 重复 T#：${dup}（后出现的节覆盖了前一个）`)
  const ids = new Set(topics.keys())
  for (const [id, topic] of topics) {
    if (topic.mustAnswer.length < MUST_ANSWER_MIN || topic.mustAnswer.length > MUST_ANSWER_MAX) {
      issues.push(`${id} 的 must_answer 数量 ${topic.mustAnswer.length} ∉ [${MUST_ANSWER_MIN}, ${MUST_ANSWER_MAX}]`)
    }
    for (const lens of topic.lenses) {
      if (!LENS_IDS.includes(lens)) issues.push(`${id} 的 lenses「${lens}」不是真实 lens id（${LENS_IDS.join('/')}）`)
    }
    for (const dep of topic.dependsOn) {
      if (dep === id) issues.push(`${id} 的 depends_on 指向自身`)
      else if (!ids.has(dep)) issues.push(`${id} 的 depends_on「${dep}」不存在`)
    }
  }
  // 环检测（三色 DFS；未知依赖已在上面报，不参与递归）
  const color = new Map()
  const visit = (id, stack) => {
    color.set(id, 1)
    for (const dep of topics.get(id)?.dependsOn ?? []) {
      if (!topics.has(dep)) continue
      if (color.get(dep) === 1) issues.push(`topics depends_on 成环：${[...stack, dep].join(' → ')}`)
      else if (!color.has(dep)) visit(dep, [...stack, dep])
    }
    color.set(id, 2)
  }
  for (const id of ids) if (!color.has(id)) visit(id, [id])
  return { topics, duplicates, issues }
}

/** 兼容包装：topics.md → Map<T#, {role,lenses,dependsOn,mustAnswer}>。 */
export function parseTopicsOf(text) {
  return parseTopicsReport(text).topics
}

/** findings.md → 每个 F# 的块对象（保留 lens_gaps 行是否存在/原文）。 */
export function parseFindingsOf(text) {
  const findings = []
  let cur = null
  for (const line of String(text ?? '').split('\n')) {
    const h = /^##\s*F(\d+)\s*[:：]/.exec(line)
    if (h !== null) {
      cur = { id: `F${h[1]}`, evidence: [], lenses: [], lensGaps: [], lensGapsRaw: '', hasLensGapsLine: false, gap: '' }
      findings.push(cur)
      continue
    }
    if (/^##\s+/.test(line)) { cur = null; continue }
    if (cur === null) continue
    const ev = /^\s*-\s*支撑证据\s*[:：]\s*(.+)$/m.exec(line)
    if (ev !== null) cur.evidence = [...ev[1].matchAll(/evidence\/[A-Za-z0-9_.-]+\.md/g)].map((m) => m[0])
    const lenses = /^\s*-\s*lenses\s*[:：]\s*(.*)$/m.exec(line)
    if (lenses !== null) cur.lenses = listOf(lenses[1])
    const gaps = /^\s*-\s*lens_gaps\s*[:：]\s*(.*)$/m.exec(line)
    if (gaps !== null) { cur.hasLensGapsLine = true; cur.lensGapsRaw = scalarOf(gaps[1]); cur.lensGaps = listOf(gaps[1]) }
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
  const topics = existsSync(topicsPath) ? parseTopicsReport(readFileSync(topicsPath, 'utf8')).topics : new Map()
  const allLenses = new Set([...topics.values()].flatMap((t) => t.lenses))
  const issues = []
  const blocks = parseFindingsOf(text)
  if (blocks.length === 0) issues.push('findings.md 无 F# 块——防空语料（不得静默 0 条）')
  const seen = new Map()
  for (const block of blocks) seen.set(block.id, (seen.get(block.id) ?? 0) + 1)
  for (const [id, count] of seen) if (count > 1) issues.push(`findings.md 重复 F#：${id} × ${count}（引用歧义）`)
  for (const block of blocks) {
    if (!GAP_STATES.includes(block.gap)) {
      issues.push(`${block.id} 的 gap「${block.gap || '（缺）'}」∉ {${GAP_STATES.join('/')}}（未知状态不得静默当 supported）`)
    }
    // 支撑证据存在性：与 lens 无关，所有 findings 都查（BUG-260）
    for (const rel of block.evidence) {
      if (!existsSync(join(bundleDir, rel))) issues.push(`${block.id} 的支撑证据 ${rel} 不存在`)
    }
    if (block.lenses.length > 0 && !block.hasLensGapsLine) {
      issues.push(`${block.id} 有 lenses 但缺 lens_gaps 行（必须显式写差集或「无」）`)
    }
    if (block.hasLensGapsLine && block.lensGapsRaw === '[]') {
      issues.push(`${block.id} 的 lens_gaps 是空列表——无缺口写「无」，有缺口写 id（空列表不可判）`)
    }
    for (const lens of [...block.lenses, ...block.lensGaps]) {
      if (!LENS_IDS.includes(lens)) issues.push(`${block.id} 的 lens「${lens}」不是真实 lens id`)
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
        if (!existsSync(p)) continue
        const { fm } = splitFrontmatter(readFileSync(p, 'utf8'))
        if (fm === null) continue
        for (const m of String(fm.supports ?? '').matchAll(/T\d+/g)) {
          topicIds.add(m[0])
          if (topics.size > 0 && !topics.has(m[0])) issues.push(`${block.id} 的支撑证据 ${rel} supports ${m[0]} 不在 topics.md`)
        }
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

/** topics 结构契约（空数组 = 绿）；topics.md 缺席返回 null。 */
export function topicsContractIssues(bundleDir) {
  const p = join(bundleDir, 'topics.md')
  if (!existsSync(p)) return null
  return parseTopicsReport(readFileSync(p, 'utf8')).issues
}
