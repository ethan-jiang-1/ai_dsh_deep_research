import { useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { activeTocHeadingIndex, extractTocHeadings, type TocHeading } from '../../lib/run/evidence-preview.ts'
import css from '../ResearchFinalTab.module.css'

function locateHeadingElement(root: HTMLElement, headings: readonly TocHeading[], heading: TocHeading, index: number): HTMLElement | undefined {
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
  return (byIndex !== undefined && byIndex.tagName === `H${heading.level}` && normalize(byIndex.textContent ?? '') === targetText)
    ? byIndex
    : sameLevelAndText[nthSame] ?? nodes.find((el) => normalize(el.textContent ?? '') === targetText)
}

/** 章节目录：常规侧栏呈折叠大纲，全屏精读台呈左侧常驻 Sticky 大纲并同步高亮当前章节。 */
export function FinalToc(props: {
  readonly markdown: string
  readonly bodyRef?: RefObject<HTMLDivElement | null>
  readonly mode?: 'collapsible' | 'sticky'
  readonly open?: boolean
  readonly onToggleOpen?: (next: boolean) => void
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { markdown, bodyRef, mode = 'collapsible', open, onToggleOpen, t } = props
  const headings = useMemo(() => extractTocHeadings(markdown), [markdown])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex(0)
  }, [markdown])

  useEffect(() => {
    if (mode !== 'sticky') return undefined
    const scroller = bodyRef?.current
    if (scroller === null || scroller === undefined || headings.length < 2) return undefined
    const updateActive = () => {
      const containerTop = scroller.getBoundingClientRect().top
      const nodes = [...scroller.querySelectorAll<HTMLElement>('h1, h2, h3')]
      if (nodes.length === 0) return
      const offsets = headings.map((h, idx) => {
        const el = locateHeadingElement(scroller, headings, h, idx)
        return el !== undefined ? el.getBoundingClientRect().top - containerTop : Number.POSITIVE_INFINITY
      })
      setActiveIndex(activeTocHeadingIndex(offsets, 56))
    }
    updateActive()
    scroller.addEventListener('scroll', updateActive, { passive: true })
    return () => { scroller.removeEventListener('scroll', updateActive) }
  }, [mode, bodyRef, headings])

  if (headings.length < 2) return null

  const jumpToHeading = (heading: TocHeading, index: number): void => {
    const root = bodyRef?.current
    if (root === null || root === undefined) return
    const target = locateHeadingElement(root, headings, heading, index)
    setActiveIndex(index)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (mode === 'sticky') {
    return (
      <nav className={css.studioToc} aria-label={t('finalTocTitle', { count: String(headings.length) })} data-testid="final-studio-toc">
        <div className={css.studioTocTitle}>{t('finalTocTitle', { count: String(headings.length) })}</div>
        <div className={css.tocList}>
          {headings.map((h, i) => (
            <button
              type="button"
              key={`${i}:${h.text}`}
              data-toc-active={i === activeIndex ? 'true' : undefined}
              className={`${h.level >= 2 ? css.tocSubItem : css.tocItem}${i === activeIndex ? ` ${css.tocItemActive}` : ''}`}
              onClick={() => { jumpToHeading(h, i) }}
            >
              {h.text}
            </button>
          ))}
        </div>
      </nav>
    )
  }

  return (
    <details
      className={css.tocDetails}
      {...(open !== undefined ? { open } : {})}
      onToggle={(event) => {
        if (onToggleOpen !== undefined) onToggleOpen((event.currentTarget as HTMLDetailsElement).open)
      }}
    >
      <summary className={css.tocSummary}>
        {t('finalTocTitle', { count: String(headings.length) })}
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
