import type { ReactNode, RefObject } from 'react'
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

/** 轻量可折叠章节目录：列出终稿 H1–H3 章节骨架，点击滚动定位到对应正文标题（BUG-445）。 */
export function FinalToc(props: {
  readonly markdown: string
  readonly bodyRef?: RefObject<HTMLDivElement | null>
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const headings = extractTocHeadings(props.markdown)
  if (headings.length < 2) return null

  const jumpToHeading = (heading: TocHeading, index: number): void => {
    const root = props.bodyRef?.current
    if (root === null || root === undefined) return
    const normalize = (s: string): string => s.replace(/\s+/g, ' ').trim()
    const targetText = normalize(heading.text)
    const nodes = [...root.querySelectorAll<HTMLElement>('h1, h2, h3')]
    const nthSame = headings
      .slice(0, index + 1)
      .filter((item) => item.level === heading.level && normalize(item.text) === targetText)
      .length - 1
    const byIndex = nodes[index]
    const sameLevelAndText = nodes.filter(
      (el) => el.tagName === `H${heading.level}` && normalize(el.textContent ?? '') === targetText,
    )
    const target = (byIndex !== undefined && byIndex.tagName === `H${heading.level}` && normalize(byIndex.textContent ?? '') === targetText)
      ? byIndex
      : sameLevelAndText[nthSame] ?? nodes.find((el) => normalize(el.textContent ?? '') === targetText)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <details className={css.tocDetails}>
      <summary className={css.tocSummary}>
        {props.t('finalTocTitle', { count: String(headings.length) })}
      </summary>
      <div className={css.tocList}>
        {headings.map((h, i) => (
          <button
            type="button"
            key={`${i}:${h.text}`}
            className={h.level >= 2 ? css.tocSubItem : css.tocItem}
            onClick={() => { jumpToHeading(h, i) }}
          >
            {h.text}
          </button>
        ))}
      </div>
    </details>
  )
}
