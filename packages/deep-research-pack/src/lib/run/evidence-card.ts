/**
 * evidence-card.ts —— 单张证据卡解析 + 右栏扩展地址认领谓词（纯函数）。
 *
 * 复用 `parseEvidenceMeta`（evidence-matrix.ts）提取 8 字段，并解析正文摘录、解读与
 * Question List 勾选态；认领 `drt_<slug>/evidence/*.md`（三位置：根 / archive / _abandoned），
 * 拒绝 `drafts/` 与穿越段。
 */
import { parseEvidenceMeta, type EvidenceMeta } from './evidence-matrix.ts'
import { isEvidenceCardName } from './artifact-content.ts'

export interface EvidenceQuestionItem {
  readonly checked: boolean
  readonly text: string
}

export interface EvidenceCardView {
  readonly file: string
  readonly meta: EvidenceMeta | null
  readonly title: string | null
  readonly bodyMarkdown: string
  readonly questions: readonly EvidenceQuestionItem[]
}

export interface EvidenceTarget {
  readonly sessionId: string
  readonly runDir: string
  readonly cardName: string
  readonly relPath: string
}

const SESSION_ADDRESS_PREFIX = 'dsh-resource://file/session/'
const EVIDENCE_REL_RE = /^((?:archive\/|_abandoned\/)?drt_[\w.-]+)\/evidence\/([^/]+\.md)$/
const FRONTMATTER_STRIP_RE = /^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/
const QUESTION_ITEM_RE = /^-\s+\[([xX\s])\]\s+(.+)$/
const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})/
const QUESTION_HEADING_RE = /^(#{2,3})\s+Question\s+List\b/i
const ANY_HEADING_RE = /^(#{1,6})\s+/

const encodeSegment = (segment: string): string => encodeURIComponent(segment).replace(/%3A/gi, ':')

/**
 * 将 `dsh-resource://file/session/<sid>/<rel>` 解码为 `{ sessionId, runDir, cardName, relPath }`；
 * 非证据卡地址（包含 `_failed.md`、`drafts/`、`..`、非 `.md`）返回 null。
 */
export function parseEvidenceAddress(address: string): EvidenceTarget | null {
  if (typeof address !== 'string' || !address.startsWith(SESSION_ADDRESS_PREFIX)) return null
  const rest = address.slice(SESSION_ADDRESS_PREFIX.length)
  const slash = rest.indexOf('/')
  if (slash <= 0) return null
  let sessionId: string
  let relPath: string
  try {
    sessionId = decodeURIComponent(rest.slice(0, slash))
    relPath = rest
      .slice(slash + 1)
      .split('/')
      .map((seg) => decodeURIComponent(seg))
      .join('/')
  } catch {
    return null
  }
  if (sessionId.trim() === '' || relPath.includes('..')) return null
  const match = EVIDENCE_REL_RE.exec(relPath)
  if (match?.[1] === undefined || match[2] === undefined) return null
  if (!isEvidenceCardName(match[2])) return null
  return { sessionId, runDir: match[1], cardName: match[2], relPath }
}

/** `sidebarRightTabs.register({ canOpen: isEvidenceAddress })` 谓词。 */
export function isEvidenceAddress(address: string): boolean {
  return parseEvidenceAddress(address) !== null
}

/** 构造证据卡的 `dsh-resource://file/session/<sid>/<runDir>/evidence/<card>` 地址。 */
export function evidenceAddressOf(sessionId: string, runDir: string, evidenceRelPath: string): string {
  const cleanDir = runDir.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  const cleanFile = evidenceRelPath.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '').replace(/^\/+/, '')
  const normalizedRel = cleanFile.startsWith('evidence/') ? cleanFile : `evidence/${cleanFile}`
  const segments = [sessionId, ...cleanDir.split('/'), ...normalizedRel.split('/')].filter(Boolean).map(encodeSegment)
  return `${SESSION_ADDRESS_PREFIX}${segments.join('/')}`
}

/** 只放行安全 `http:` / `https:` 外部 URL；`javascript:` / 空值等返回 null。 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (/^https?:\/\/\S+$/i.test(trimmed)) return trimmed
  return null
}

/** 解析单张证据卡文本为头部 8 字段 + 去 frontmatter 正文 + Question List 勾选表（去重裁剪已提取的 Question List 小节，BUG-447）。 */
export function parseEvidenceCard(filename: string, raw: string): EvidenceCardView {
  const meta = parseEvidenceMeta(filename, raw)
  const rawBody = raw.replace(FRONTMATTER_STRIP_RE, '').trim()
  const titleMatch = /^\s*#\s+(.+)$/m.exec(rawBody)
  const questions: EvidenceQuestionItem[] = []
  const lines = rawBody.split(/\r?\n/)
  const dropLine = new Set<number>()
  let fenceChar: string | null = null
  let qSectionLevel: number | null = null
  let qSectionLines: number[] = []
  let qSectionHasItems = false

  const flushQuestionSection = (): void => {
    if (qSectionLevel !== null && qSectionHasItems) {
      for (const idx of qSectionLines) dropLine.add(idx)
    }
    qSectionLevel = null
    qSectionLines = []
    qSectionHasItems = false
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!
    const trimmed = line.trim()
    const fence = FENCE_RE.exec(line)
    if (fence?.[1] !== undefined) {
      const ch = fence[1][0] ?? null
      fenceChar = fenceChar === null ? ch : (ch === fenceChar ? null : fenceChar)
      if (qSectionLevel !== null) qSectionLines.push(i)
      continue
    }
    if (fenceChar !== null) {
      if (qSectionLevel !== null) qSectionLines.push(i)
      continue
    }
    const qHead = QUESTION_HEADING_RE.exec(trimmed)
    if (qHead?.[1] !== undefined) {
      flushQuestionSection()
      qSectionLevel = qHead[1].length
      qSectionLines = [i]
      continue
    }
    if (qSectionLevel !== null) {
      const nextHead = ANY_HEADING_RE.exec(trimmed)
      if (nextHead?.[1] !== undefined && nextHead[1].length <= qSectionLevel) {
        flushQuestionSection()
      } else {
        qSectionLines.push(i)
      }
    }
    const m = QUESTION_ITEM_RE.exec(trimmed)
    if (m?.[1] !== undefined && m[2] !== undefined) {
      questions.push({ checked: m[1].toLowerCase() === 'x', text: m[2].trim() })
      if (qSectionLevel !== null) qSectionHasItems = true
    }
  }
  flushQuestionSection()

  const bodyMarkdown = dropLine.size === 0
    ? rawBody
    : lines.filter((_l, idx) => !dropLine.has(idx)).join('\n').replace(/\n{3,}/g, '\n\n').trim()

  return {
    file: filename,
    meta,
    title: meta?.title ?? titleMatch?.[1]?.trim() ?? null,
    bodyMarkdown,
    questions,
  }
}
