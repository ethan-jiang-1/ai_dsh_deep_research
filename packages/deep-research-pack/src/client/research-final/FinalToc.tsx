import type { ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import css from '../ResearchFinalTab.module.css'

interface TocHeading {
  readonly level: number
  readonly text: string
}

const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})/
const HEADING_RE = /^(#{1,3})\s+(.+)$/

function extractTocHeadings(markdown: string): readonly TocHeading[] {
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
      headings.push({ level: m[1].length, text: m[2].replace(/[*`]/g, '').trim() })
    }
  }
  return headings
}

/** 轻量可折叠章节目录：列出终稿 H1–H3 章节骨架。 */
export function FinalToc(props: {
  readonly markdown: string
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const headings = extractTocHeadings(props.markdown)
  if (headings.length < 2) return null
  return (
    <details className={css.tocDetails}>
      <summary className={css.tocSummary}>
        {props.t('finalTocTitle', { count: String(headings.length) })}
      </summary>
      <div className={css.tocList}>
        {headings.map((h, i) => (
          <div key={`${i}:${h.text}`} className={h.level >= 2 ? css.tocSubItem : css.tocItem}>
            {h.text}
          </div>
        ))}
      </div>
    </details>
  )
}
