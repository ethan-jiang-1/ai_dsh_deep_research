/**
 * evidence-matrix.ts —— topics.md × evidence/*.md 的 Topic×Lens 覆盖矩阵与质量统计（纯函数）。
 *
 * 正本 Schema = content/templates/run/topics.md 与 content/templates/run/evidence-entry.md（8 字段 frontmatter）。
 * 不把 unreadable/invalid 证据卡静默折成 0：缺失、空与读取/解析失败在矩阵里显性计数。
 */
import type { ArtifactState, SourceRead } from './artifact-read.ts'

export type EvidenceTier = 'primary' | 'secondary' | 'tertiary' | 'weak' | 'unknown'
export type EvidenceQuality = 'A' | 'B' | 'C' | 'D' | 'unknown'

export interface TopicSpec {
  readonly id: string
  readonly title: string
  readonly scopeRole: string | null
  readonly lenses: readonly string[]
}

export interface EvidenceMeta {
  readonly file: string
  readonly title: string | null
  readonly sourceUrl: string | null
  readonly retrievedAt: string | null
  readonly quality: EvidenceQuality
  readonly foundBy: string | null
  readonly supports: readonly string[]
  readonly lens: string | null
  readonly sourceTier: EvidenceTier
  readonly publisher: string | null
}

export interface EvidenceMatrix {
  readonly state: 'ok' | 'partial' | 'unreadable' | 'absent'
  readonly topicsState: ArtifactState
  readonly evidenceState: SourceRead
  readonly topics: readonly TopicSpec[]
  readonly lenses: readonly string[]
  /** matrix[topicId][lensId] = matched valid card count */
  readonly cells: Readonly<Record<string, Readonly<Record<string, number>>>>
  readonly validCards: number
  readonly invalidCards: number
  readonly emptyCards: number
  readonly unreadableCards: number
  readonly byTier: Readonly<Record<EvidenceTier, number>>
  readonly byQuality: Readonly<Record<EvidenceQuality, number>>
  readonly uniquePublishers: number
}

const TOPIC_HEADING_RE = /^##\s+(T[A-Za-z0-9_-]+)\s*[:：]?\s*(.*)$/
const FRONTMATTER_BLOCK_RE = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/

function stripInlineComment(raw: string): string {
  const withoutComment = raw.replace(/\s+#.*$/, '').trim()
  return withoutComment.replace(/^["'](.*)["']$/, '$1').trim()
}

function parseInlineArray(raw: string): readonly string[] {
  const trimmed = raw.trim()
  const inner = trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1) : trimmed
  if (inner.trim() === '') return []
  return inner.split(/[,，]/).map((item) => stripInlineComment(item)).filter(Boolean)
}

function normalizeTier(raw: string | undefined): EvidenceTier {
  const val = raw?.toLowerCase()
  if (val === 'primary' || val === 'secondary' || val === 'tertiary' || val === 'weak') return val
  return 'unknown'
}

function normalizeQuality(raw: string | undefined): EvidenceQuality {
  const val = raw?.toUpperCase()
  if (val === 'A' || val === 'B' || val === 'C' || val === 'D') return val
  return 'unknown'
}

/**
 * 解析 `topics.md` 的 topic 列表与各 topic 分配的 lenses。
 * @param markdown - `topics.md` 全文。
 * @returns topic 规格数组。
 */
export function parseTopicsLenses(markdown: string | null | undefined): readonly TopicSpec[] {
  if (typeof markdown !== 'string' || markdown.trim() === '') return []
  const lines = markdown.replace(/^\uFEFF/, '').split(/\r?\n/)
  const out: TopicSpec[] = []
  let current: { id: string; title: string; scopeRole: string | null; lenses: readonly string[] } | null = null
  const flush = (): void => {
    if (current !== null) out.push(current)
    current = null
  }
  for (const line of lines) {
    const heading = TOPIC_HEADING_RE.exec(line.trim())
    if (heading?.[1] !== undefined) {
      flush()
      current = {
        id: heading[1].trim(),
        title: (heading[2] ?? '').trim(),
        scopeRole: null,
        lenses: [],
      }
      continue
    }
    if (current === null) continue
    const roleMatch = /^-\s*scope_role\s*:\s*(.+)$/.exec(line.trim())
    if (roleMatch?.[1] !== undefined) {
      current = { ...current, scopeRole: stripInlineComment(roleMatch[1]) || null }
      continue
    }
    const lensMatch = /^-\s*lenses\s*:\s*(.+)$/.exec(line.trim())
    if (lensMatch?.[1] !== undefined) {
      current = { ...current, lenses: parseInlineArray(lensMatch[1]) }
    }
  }
  flush()
  return out
}

/**
 * 解析单张 `evidence/*.md` 的 8 字段 YAML frontmatter。无完整 frontmatter 块返回 null。
 * @param filename - 证据文件名。
 * @param raw - Markdown 原文。
 * @returns 元数据或 null。
 */
export function parseEvidenceMeta(filename: string, raw: string | null | undefined): EvidenceMeta | null {
  if (typeof raw !== 'string') return null
  const match = FRONTMATTER_BLOCK_RE.exec(raw)
  if (match?.[1] === undefined) return null
  const fields: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const sep = trimmed.indexOf(':')
    if (sep <= 0) continue
    const key = trimmed.slice(0, sep).trim()
    const val = stripInlineComment(trimmed.slice(sep + 1))
    if (key !== '') fields[key] = val
  }
  const hasKnownKey = ['source_url', 'retrieved_at', 'quality', 'found_by', 'supports', 'lens', 'source_tier', 'publisher']
    .some((key) => Object.hasOwn(fields, key))
  if (!hasKnownKey) return null
  const body = match[2] ?? ''
  const titleMatch = /^\s*#\s+(.+)$/m.exec(body)
  const supportsRaw = fields.supports
  const supports = supportsRaw !== undefined && supportsRaw !== '' ? parseInlineArray(supportsRaw) : []
  const lens = fields.lens !== undefined && fields.lens !== '' ? fields.lens : null
  const publisher = fields.publisher !== undefined && fields.publisher !== '' ? fields.publisher.toLowerCase() : null
  return {
    file: filename,
    title: titleMatch?.[1]?.trim() || null,
    sourceUrl: fields.source_url !== undefined && fields.source_url !== '' ? fields.source_url : null,
    retrievedAt: fields.retrieved_at !== undefined && fields.retrieved_at !== '' ? fields.retrieved_at : null,
    quality: normalizeQuality(fields.quality),
    foundBy: fields.found_by !== undefined && fields.found_by !== '' ? fields.found_by : null,
    supports,
    lens,
    sourceTier: normalizeTier(fields.source_tier),
    publisher,
  }
}

export interface EvidenceCardSample {
  readonly name: string
  readonly state: ArtifactState
  readonly text: string | null
}

function hostOfUrl(url: string | null): string | null {
  if (url === null) return null
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').trim()
    return host === '' ? null : host
  } catch {
    return null
  }
}

/**
 * 汇总 Topic × Lens 覆盖矩阵与信源分层/质量等级分布（诚实降级）。
 */
export function foldEvidenceMatrix(input: {
  readonly topicsState: ArtifactState
  readonly topicsText: string | null
  readonly evidenceState: SourceRead
  readonly cards: readonly EvidenceCardSample[]
}): EvidenceMatrix {
  const topics = input.topicsState === 'ok' ? parseTopicsLenses(input.topicsText) : []
  const byTier: Record<EvidenceTier, number> = { primary: 0, secondary: 0, tertiary: 0, weak: 0, unknown: 0 }
  const byQuality: Record<EvidenceQuality, number> = { A: 0, B: 0, C: 0, D: 0, unknown: 0 }
  const publishers = new Set<string>()
  const lensSet = new Set<string>()
  for (const topic of topics) {
    for (const lens of topic.lenses) lensSet.add(lens)
  }

  let validCards = 0
  let invalidCards = 0
  let emptyCards = 0
  let unreadableCards = 0
  const metas: EvidenceMeta[] = []

  for (const card of input.cards) {
    if (card.state === 'unreadable') {
      unreadableCards += 1
      continue
    }
    if (card.state === 'empty') {
      emptyCards += 1
      continue
    }
    if (card.state === 'invalid') {
      invalidCards += 1
      continue
    }
    if (card.state !== 'ok' || card.text === null) continue
    validCards += 1
    const meta = parseEvidenceMeta(card.name, card.text)
    if (meta === null) {
      byTier.unknown += 1
      byQuality.unknown += 1
      continue
    }
    metas.push(meta)
    byTier[meta.sourceTier] += 1
    byQuality[meta.quality] += 1
    const pub = meta.publisher ?? hostOfUrl(meta.sourceUrl)
    if (pub !== null) publishers.add(pub)
    if (meta.lens !== null) lensSet.add(meta.lens)
  }

  const lenses = [...lensSet].sort()
  const cells: Record<string, Record<string, number>> = {}
  for (const topic of topics) {
    const row: Record<string, number> = {}
    for (const lens of lenses) row[lens] = 0
    cells[topic.id] = row
  }
  for (const meta of metas) {
    if (meta.lens === null) continue
    for (const topicId of meta.supports) {
      const row = cells[topicId]
      if (row !== undefined) row[meta.lens] = (row[meta.lens] ?? 0) + 1
    }
  }

  const state: EvidenceMatrix['state'] =
    input.evidenceState === 'unreadable' || input.topicsState === 'unreadable'
      ? (validCards > 0 || topics.length > 0 ? 'partial' : 'unreadable')
      : unreadableCards > 0 || invalidCards > 0 || input.topicsState === 'invalid'
        ? 'partial'
        : input.evidenceState === 'absent' && input.topicsState === 'absent' && input.cards.length === 0
          ? 'absent'
          : 'ok'

  return {
    state,
    topicsState: input.topicsState,
    evidenceState: input.evidenceState,
    topics,
    lenses,
    cells,
    validCards,
    invalidCards,
    emptyCards,
    unreadableCards,
    byTier,
    byQuality,
    uniquePublishers: publishers.size,
  }
}
