/**
 * CitationHoverLayer.tsx —— 终稿正文行内 `[来源: evidence/*.md]` 150ms 悬停溯源浮卡。
 *
 * 通过容器委托监听 MarkdownText 渲染出的 `button[title*="evidence/"]` 悬停与焦点，
 * 异步懒加载单张证据卡并走有界 LRU 缓存；严格遵守五态 ArtifactState（absent/empty/invalid/unreadable
 * 显性报错并允许重试，绝不静默伪造质量等级）。
 */
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Button, LinkIconMedium, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { EvidencePreviewEntry } from '../../lib/run/evidence-preview.ts'
import type { CockpitLocaleKey } from '../locales/zh-cockpit.ts'
import css from '../ResearchFinalTab.module.css'

const HOVER_OPEN_DELAY_MS = 150
const HOVER_CLOSE_GRACE_MS = 140
const CARD_WIDTH = 336
const CARD_MARGIN = 12
const EVIDENCE_REL_RE = /(?:^|\/)(evidence\/[^/\s]+\.md)$/

function extractEvidenceRelFromElement(target: EventTarget | null): { readonly button: HTMLButtonElement; readonly relPath: string } | null {
  if (!(target instanceof Element)) return null
  const button = target.closest('button[title]')
  if (!(button instanceof HTMLButtonElement)) return null
  const title = (button.getAttribute('title') ?? '').trim().replace(/^\.\//, '')
  const match = EVIDENCE_REL_RE.exec(title)
  if (match?.[1] === undefined || title.includes('..')) return null
  return { button, relPath: match[1] }
}

interface HoverAnchor {
  readonly relPath: string
  readonly left: number
  readonly top: number
}

function positionCardForRect(rect: DOMRect): { readonly left: number; readonly top: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const left = Math.max(CARD_MARGIN, Math.min(rect.left, vw - CARD_WIDTH - CARD_MARGIN))
  const preferBelow = rect.bottom + 8 + 210 <= vh
  const top = preferBelow ? rect.bottom + 8 : Math.max(CARD_MARGIN, rect.top - 210)
  return { left, top }
}

export interface CitationHoverLayerProps {
  readonly containerRef: RefObject<HTMLDivElement | null>
  readonly loadPreview: (relPath: string, forceRetry?: boolean) => Promise<EvidencePreviewEntry>
  readonly getCached: (relPath: string) => EvidencePreviewEntry | undefined
  readonly onOpenSplit: (relPath: string) => void
  readonly onInspectInStudio?: (relPath: string) => void
  readonly t: TranslateNS<'deepResearchPack'>
}

export function CitationHoverLayer(props: CitationHoverLayerProps): ReactNode {
  const { containerRef, loadPreview, getCached, onOpenSplit, onInspectInStudio, t } = props
  const [anchor, setAnchor] = useState<HoverAnchor | null>(null)
  const [entry, setEntry] = useState<EvidencePreviewEntry | null>(null)
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRelRef = useRef<string | null>(null)

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== null) { clearTimeout(openTimerRef.current); openTimerRef.current = null }
    if (closeTimerRef.current !== null) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
  }, [])

  const scheduleClose = useCallback(() => {
    if (openTimerRef.current !== null) { clearTimeout(openTimerRef.current); openTimerRef.current = null }
    if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      activeRelRef.current = null
      setAnchor(null)
      setEntry(null)
    }, HOVER_CLOSE_GRACE_MS)
  }, [])

  const openForButton = useCallback((button: HTMLButtonElement, relPath: string, immediate = false) => {
    if (closeTimerRef.current !== null) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
    const trigger = () => {
      const pos = positionCardForRect(button.getBoundingClientRect())
      activeRelRef.current = relPath
      setAnchor({ relPath, left: pos.left, top: pos.top })
      const cached = getCached(relPath)
      if (cached !== undefined && cached.state !== 'loading') {
        setEntry(cached)
        return
      }
      setEntry({ state: 'loading' })
      void loadPreview(relPath).then((resolved) => {
        if (activeRelRef.current === relPath) setEntry(resolved)
      })
    }
    if (openTimerRef.current !== null) clearTimeout(openTimerRef.current)
    if (immediate) trigger()
    else openTimerRef.current = setTimeout(trigger, HOVER_OPEN_DELAY_MS)
  }, [getCached, loadPreview])

  useEffect(() => {
    const root = containerRef.current
    if (root === null) return undefined
    const onPointerOver = (event: PointerEvent) => {
      const hit = extractEvidenceRelFromElement(event.target)
      if (hit === null) return
      openForButton(hit.button, hit.relPath, activeRelRef.current !== null)
    }
    const onPointerOut = (event: PointerEvent) => {
      const hit = extractEvidenceRelFromElement(event.target)
      if (hit === null) return
      scheduleClose()
    }
    const onFocusIn = (event: FocusEvent) => {
      const hit = extractEvidenceRelFromElement(event.target)
      if (hit === null) return
      openForButton(hit.button, hit.relPath, false)
    }
    const onFocusOut = (event: FocusEvent) => {
      const hit = extractEvidenceRelFromElement(event.target)
      if (hit === null) return
      scheduleClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeRelRef.current !== null) {
        clearTimers()
        activeRelRef.current = null
        setAnchor(null)
        setEntry(null)
      }
    }
    root.addEventListener('pointerover', onPointerOver)
    root.addEventListener('pointerout', onPointerOut)
    root.addEventListener('focusin', onFocusIn)
    root.addEventListener('focusout', onFocusOut)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimers()
      root.removeEventListener('pointerover', onPointerOver)
      root.removeEventListener('pointerout', onPointerOut)
      root.removeEventListener('focusin', onFocusIn)
      root.removeEventListener('focusout', onFocusOut)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [containerRef, openForButton, scheduleClose, clearTimers])

  if (anchor === null || entry === null || typeof document === 'undefined') return null

  const retryLoad = () => {
    const relPath = anchor.relPath
    setEntry({ state: 'loading' })
    void loadPreview(relPath, true).then((resolved) => {
      if (activeRelRef.current === relPath) setEntry(resolved)
    })
  }

  const card = (
    <div
      className={css.citationHoverCard}
      style={{ left: anchor.left, top: anchor.top }}
      role="dialog"
      aria-label={t('finalCitationHoverAria')}
      data-testid="citation-hover-card"
      data-citation-state={entry.state}
      onPointerEnter={() => {
        if (closeTimerRef.current !== null) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
      }}
      onPointerLeave={scheduleClose}
    >
      {entry.state === 'loading' && (
        <div className={css.hoverCardMessage}>{t('evidenceLoading')}</div>
      )}
      {entry.state !== 'loading' && entry.state !== 'ok' && (
        <div className={css.hoverCardError}>
          <span>
            {t(entry.state === 'absent'
              ? 'evidenceAbsent'
              : entry.state === 'empty'
                ? 'evidenceEmpty'
                : entry.state === 'invalid'
                  ? 'evidenceInvalid'
                  : 'evidenceUnreadable')}
          </span>
          <Button variant="outline" size="sm" onClick={retryLoad}>{t('retry')}</Button>
        </div>
      )}
      {entry.state === 'ok' && (
        <>
          <div className={css.hoverCardHeader}>
            <div className={css.hoverCardTitleRow}>
              <LinkIconMedium
                kind={entry.summary.sourceUrl !== null ? 'url' : 'document'}
                {...(entry.summary.sourceUrl !== null ? { href: entry.summary.sourceUrl } : {})}
                size={15}
              />
              <strong className={css.hoverCardTitle}>{entry.summary.title}</strong>
            </div>
            <div className={css.hoverCardBadges}>
              {entry.summary.quality !== null && (
                <Tag tone={entry.summary.quality === 'A' ? 'success' : entry.summary.quality === 'B' ? 'info' : 'outline'}>
                  {t('evidenceQualityBadge', { grade: entry.summary.quality })}
                </Tag>
              )}
              {entry.summary.sourceTier !== null && (
                <Tag tone="outline">{t(`evidenceTier_${entry.summary.sourceTier}` as CockpitLocaleKey)}</Tag>
              )}
              {entry.summary.publisher !== null && (
                <Tag tone="quiet">{entry.summary.publisher}</Tag>
              )}
            </div>
          </div>
          {entry.summary.excerptLines.length > 0 && (
            <div className={css.hoverCardExcerpt}>
              {entry.summary.excerptLines.map((line, idx) => (
                <p key={idx} className={css.hoverCardExcerptLine}>{line}</p>
              ))}
            </div>
          )}
          <div className={css.hoverCardActions}>
            <Button
              variant="outline"
              size="sm"
              data-testid="citation-hover-open-split"
              onClick={() => {
                onOpenSplit(anchor.relPath)
                if (onInspectInStudio !== undefined) onInspectInStudio(anchor.relPath)
              }}
            >
              {t('finalCitationOpenSplit')}
            </Button>
            {entry.summary.sourceUrl !== null && (
              <a
                href={entry.summary.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={css.hoverCardExternalLink}
              >
                {t('finalCitationOpenSource')}
              </a>
            )}
          </div>
        </>
      )}
    </div>
  )

  return createPortal(card, document.body)
}
