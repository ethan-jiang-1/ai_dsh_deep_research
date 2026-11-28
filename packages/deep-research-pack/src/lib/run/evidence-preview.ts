/**
 * evidence-preview.ts —— 终稿精读台纯折算（证据卡悬停摘录、有界缓存、Claim 风险筛选、TOC 标题解析）。
 *
 * 纪律：零 React / 零 DOM / 零 Node built-ins；严格保留五态 `ArtifactState`，绝不把读取失败折成空态。
 */
import type { ArtifactState } from './artifact-read.ts'
import type { ClaimAuditRow, ClaimsAuditSummary } from './claims-verdicts.ts'
import { parseEvidenceCard, safeExternalUrl } from './evidence-card.ts'
import type { EvidenceQuality, EvidenceTier } from './evidence-matrix.ts'

export interface EvidencePreviewSummary {
  readonly cardName: string
  readonly title: string
  readonly quality: EvidenceQuality | null
  readonly sourceTier: EvidenceTier | null
  readonly sourceUrl: string | null
  readonly publisher: string | null
  readonly lens: string | null
  readonly retrievedAt: string | null
  readonly excerptLines: readonly string[]
}

export type EvidencePreviewEntry =
  | { readonly state: 'loading' }
  | { readonly state: 'ok'; readonly summary: EvidencePreviewSummary }
  | { readonly state: Exclude<ArtifactState, 'ok'> }

export type ClaimRiskFilter = 'all' | 'risk' | 'supported'

export interface TocHeading {
  readonly level: number
  readonly text: string
}

const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})/
const HEADING_RE = /^(#{1,3})\s+(.+)$/
const EXCERPT_MAX_LINES = 3
const EXCERPT_MAX_CHARS = 140

function cleanExcerptLine(raw: string): string {
  const cleaned = raw
    .replace(/^#{1,6}\s+/, '')
    .replace(/^>\s*/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*`~_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length > EXCERPT_MAX_CHARS ? `${cleaned.slice(0, EXCERPT_MAX_CHARS - 1)}…` : cleaned
}

/**
 * 从证据卡原文提取悬停卡片摘要：标题、质量等级、信源层级、安全外链与前 3 行正文摘录。
 */
export function extractEvidencePreview(cardName: string, raw: string): EvidencePreviewSummary {
  const parsed = parseEvidenceCard(cardName, raw)
  const meta = parsed.meta
  const excerptLines: string[] = []
  let inFence = false
  let skippedFirstH1 = false
  for (const line of parsed.bodyMarkdown.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (FENCE_RE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence || trimmed === '' || /^[-*_]{3,}$/.test(trimmed)) continue
    if (!skippedFirstH1 && /^#\s+/.test(trimmed)) {
      skippedFirstH1 = true
      continue
    }
    if (/^#{2,6}\s+/.test(trimmed) && excerptLines.length === 0) continue
    const cleaned = cleanExcerptLine(trimmed)
    if (cleaned === '') continue
    excerptLines.push(cleaned)
    if (excerptLines.length >= EXCERPT_MAX_LINES) break
  }
  return {
    cardName,
    title: parsed.title ?? cardName,
    quality: meta?.quality ?? null,
    sourceTier: meta?.sourceTier ?? null,
    sourceUrl: safeExternalUrl(meta?.sourceUrl),
    publisher: meta?.publisher ?? null,
    lens: meta?.lens ?? null,
    retrievedAt: meta?.retrievedAt ?? null,
    excerptLines,
  }
}

export interface EvidencePreviewCache {
  get(key: string): EvidencePreviewEntry | undefined
  set(key: string, entry: EvidencePreviewEntry): void
  delete(key: string): void
  clear(): void
  readonly size: number
}

/** 有界 LRU 证据卡预览缓存（防长报告连续悬停导致无界内存增长）。 */
export function createEvidencePreviewCache(maxEntries = 48): EvidencePreviewCache {
  const cap = Math.max(1, Math.floor(maxEntries))
  const map = new Map<string, EvidencePreviewEntry>()
  return {
    get(key) {
      const value = map.get(key)
      if (value === undefined) return undefined
      map.delete(key)
      map.set(key, value)
      return value
    },
    set(key, entry) {
      if (map.has(key)) map.delete(key)
      map.set(key, entry)
      while (map.size > cap) {
        const oldest = map.keys().next().value
        if (oldest === undefined) break
        map.delete(oldest)
      }
    },
    delete(key) {
      map.delete(key)
    },
    clear() {
      map.clear()
    },
    get size() {
      return map.size
    },
  }
}

/** 判断一条主张是否属于存疑/未核查风险集（partial / unsupported / insufficient / UNVERIFIED）。 */
export function isRiskClaimStatus(status: ClaimAuditRow['status']): boolean {
  return status !== 'supported'
}

/** 统计需要重点关注的存疑/未核查主张条数。 */
export function countRiskClaims(counts: ClaimsAuditSummary['counts']): number {
  return counts.partial + counts.unsupported + counts.insufficient + counts.unverified
}

/** 按筛选态过滤主张核查行（all / risk / supported）。 */
export function filterClaimRows(
  rows: readonly ClaimAuditRow[],
  filter: ClaimRiskFilter,
): readonly ClaimAuditRow[] {
  if (filter === 'all') return rows
  if (filter === 'supported') return rows.filter((row) => row.status === 'supported')
  return rows.filter((row) => isRiskClaimStatus(row.status))
}

function findMatchingBracket(raw: string, openIndex: number): number {
  let depth = 0
  for (let i = openIndex; i < raw.length; i += 1) {
    const ch = raw[i]
    if (ch === '\\') { i += 1; continue }
    if (ch === '[') depth += 1
    else if (ch === ']') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

function findMatchingParen(raw: string, openIndex: number): number {
  let depth = 0
  let inAngle = false
  for (let i = openIndex; i < raw.length; i += 1) {
    const ch = raw[i]
    if (ch === '\\') { i += 1; continue }
    if (ch === '<' && depth === 1) { inAngle = true; continue }
    if (ch === '>' && inAngle) { inAngle = false; continue }
    if (inAngle) continue
    if (ch === '(') depth += 1
    else if (ch === ')') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

function stripMarkdownLinks(raw: string): string {
  let out = ''
  let i = 0
  while (i < raw.length) {
    const isImage = raw[i] === '!' && raw[i + 1] === '['
    const bracketStart = isImage ? i + 1 : raw[i] === '[' ? i : -1
    if (bracketStart !== -1) {
      const bracketEnd = findMatchingBracket(raw, bracketStart)
      if (bracketEnd !== -1 && raw[bracketEnd + 1] === '(') {
        const parenEnd = findMatchingParen(raw, bracketEnd + 1)
        if (parenEnd !== -1) {
          out += stripMarkdownLinks(raw.slice(bracketStart + 1, bracketEnd))
          i = parenEnd + 1
          continue
        }
      }
    }
    out += raw[i]
    i += 1
  }
  return out
}

/** 剥离标题中的行内 Markdown 语法，使 TOC 与渲染后 `h1/h2/h3.textContent` 对齐。 */
export function normalizeHeadingText(raw: string): string {
  return stripMarkdownLinks(raw)
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/\s+#+\s*$/, '')
    .replace(/\$\$([^$]+)\$\$/g, '$1')
    .replace(/\$(?!\s)([^$\n]+?)(?<!\s)\$/g, '$1')
    .replace(/(?<![A-Za-z0-9\\])__(.+?)__(?![A-Za-z0-9])/g, '$1')
    .replace(/(?<![A-Za-z0-9\\])_([^_\n]+)_(?![A-Za-z0-9])/g, '$1')
    .replace(/\\([\\`*_{}[\]()#+\-.!$])/g, '$1')
    .replace(/[*`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 从 Markdown 正文提取 H1–H3 章节骨架（跳过围栏代码块）。 */
export function extractTocHeadings(markdown: string): readonly TocHeading[] {
  const headings: TocHeading[] = []
  let fenceChar: string | null = null
  for (const line of markdown.split(/\r?\n/)) {
    const f = FENCE_RE.exec(line)
    if (f?.[1] !== undefined) {
      fenceChar = fenceChar === null ? (f[1][0] ?? null) : (f[1][0] === fenceChar ? null : fenceChar)
      continue
    }
    if (fenceChar !== null) continue
    const m = HEADING_RE.exec(line.trim())
    if (m?.[1] !== undefined && m[2] !== undefined) {
      const text = normalizeHeadingText(m[2])
      if (text !== '') headings.push({ level: m[1].length, text })
    }
  }
  return headings
}

/** 根据各标题相对滚动容器顶部的偏移量计算当前激活章节索引。 */
export function activeTocHeadingIndex(offsets: readonly number[], thresholdPx = 48): number {
  if (offsets.length === 0) return 0
  let active = 0
  for (let i = 0; i < offsets.length; i += 1) {
    const off = offsets[i]!
    if (!Number.isFinite(off)) continue
    if (off <= thresholdPx) active = i
    else break
  }
  return active
}
