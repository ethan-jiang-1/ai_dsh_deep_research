import { useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { activeTocHeadingIndex, extractTocHeadings, type TocHeading } from '../../lib/run/evidence-preview.ts'
import css from '../ResearchFinalTab.module.css'

function locateHeadingElement(
  nodes: readonly HTMLElement[],
  headings: readonly TocHeading[],
  heading: TocHeading,
  index: number,
): HTMLElement | undefined {
  const normalize = (s: string): string => s.replace(/\s+/g, ' ').trim()
  const targetText = normalize(heading.text)
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

function tocItemClassOf(level: number): string | undefined {
  if (level >= 3) return css.tocSubItemL3
  if (level === 2) return css.tocSubItem
  return css.tocItem
}

/** 章节目录：常规侧栏呈折叠大纲，全屏精读台呈左侧常驻 Sticky 大纲并同步高亮当前章节。 */
export function FinalToc(props: {
  readonly markdown: string
  readonly bodyRef?: RefObject<HTMLDivElement | null>
  readonly bodyEl?: HTMLDivElement | null
  readonly mode?: 'collapsible' | 'sticky'
  readonly open?: boolean
  readonly onToggleOpen?: (next: boolean) => void
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { markdown, bodyRef, bodyEl, mode = 'collapsible', open, onToggleOpen, t } = props
  const headings = useMemo(() => extractTocHeadings(markdown), [markdown])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex(0)
  }, [markdown])

  useEffect(() => {
    if (mode !== 'sticky') return undefined
    const scroller = bodyEl !== undefined ? bodyEl : (bodyRef?.current ?? null)
    if (scroller === null || headings.length < 2) return undefined
    let rafId: number | null = null
    const updateActive = () => {
      rafId = null
      const containerTop = scroller.getBoundingClientRect().top
      const nodes = [...scroller.querySelectorAll<HTMLElement>('h1, h2, h3')]
      if (nodes.length === 0) return
      const offsets = headings.map((h, idx) => {
        const el = locateHeadingElement(nodes, headings, h, idx)
        return el !== undefined ? el.getBoundingClientRect().top - containerTop : Number.POSITIVE_INFINITY
      })
      const atBottom =
        scroller.scrollHeight > scroller.clientHeight
        && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
      if (atBottom) {
        for (let i = offsets.length - 1; i >= 0; i -= 1) {
          if (Number.isFinite(offsets[i])) {
            setActiveIndex(i)
            return
          }
        }
      }
      setActiveIndex(activeTocHeadingIndex(offsets, 56))
    }
    const scheduleUpdate = () => {
      if (typeof requestAnimationFrame !== 'function') { updateActive(); return }
      if (rafId !== null) return
      rafId = requestAnimationFrame(updateActive)
    }
    updateActive()
    scroller.addEventListener('scroll', scheduleUpdate, { passive: true })
    return () => {
      if (rafId !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId)
      scroller.removeEventListener('scroll', scheduleUpdate)
    }
  }, [mode, bodyEl, bodyRef, headings])

  if (headings.length < 2) return null

  const jumpToHeading = (heading: TocHeading, index: number): void => {
    const root = bodyEl !== undefined ? bodyEl : (bodyRef?.current ?? null)
    if (root === null) return
    const nodes = [...root.querySelectorAll<HTMLElement>('h1, h2, h3')]
    const target = locateHeadingElement(nodes, headings, heading, index)
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
              className={`${tocItemClassOf(h.level) ?? ''}${i === activeIndex ? ` ${css.tocItemActive}` : ''}`}
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
            className={tocItemClassOf(h.level)}
            onClick={() => { jumpToHeading(h, i) }}
          >
            {h.text}
          </button>
        ))}
      </div>
    </details>
  )
}
