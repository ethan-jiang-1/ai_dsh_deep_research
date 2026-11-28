/**
 * CitationHoverLayer.tsx —— 终稿正文行内 `[来源: evidence/*.md]` 150ms 悬停溯源浮卡。
 *
 * 通过容器委托监听 MarkdownText 渲染出的 `button[title*="evidence/"]` 悬停与焦点，
 * 异步懒加载单张证据卡并走有界 LRU 缓存；严格遵守五态 ArtifactState（absent/empty/invalid/unreadable
 * 显性报错并允许重试，绝不静默伪造质量等级）。
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
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
const CARD_GAP = 8
const FALLBACK_CARD_HEIGHT = 210
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

interface TriggerRect {
  readonly left: number
  readonly top: number
  readonly bottom: number
}

interface HoverAnchor {
  readonly relPath: string
  readonly triggerRect: TriggerRect
  readonly left: number
  readonly top: number
}

function positionCardForRect(rect: TriggerRect, cardHeight: number): { readonly left: number; readonly top: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const effectiveHeight = cardHeight > 0 ? cardHeight : FALLBACK_CARD_HEIGHT
  const left = Math.max(CARD_MARGIN, Math.min(rect.left, vw - CARD_WIDTH - CARD_MARGIN))
  const spaceBelow = vh - rect.bottom - CARD_GAP - CARD_MARGIN
  const spaceAbove = rect.top - CARD_GAP - CARD_MARGIN
  let top: number
  if (effectiveHeight <= spaceBelow) {
    top = rect.bottom + CARD_GAP
  } else if (effectiveHeight <= spaceAbove) {
    top = rect.top - CARD_GAP - effectiveHeight
  } else if (spaceAbove >= spaceBelow) {
    top = Math.max(CARD_MARGIN, rect.top - CARD_GAP - effectiveHeight)
  } else {
    top = Math.max(CARD_MARGIN, Math.min(rect.bottom + CARD_GAP, vh - effectiveHeight - CARD_MARGIN))
  }
  return { left, top }
}

export interface CitationHoverLayerProps {
  readonly containerEl?: HTMLDivElement | null
  readonly containerRef?: RefObject<HTMLDivElement | null>
  readonly docKey?: string
  readonly loadPreview: (relPath: string, forceRetry?: boolean) => Promise<EvidencePreviewEntry>
  readonly getCached: (relPath: string) => EvidencePreviewEntry | undefined
  readonly onOpenSplit: (relPath: string) => void
  readonly onInspectInStudio?: (relPath: string) => void
  readonly t: TranslateNS<'deepResearchPack'>
}

export function CitationHoverLayer(props: CitationHoverLayerProps): ReactNode {
  const { containerEl, containerRef, docKey, loadPreview, getCached, onOpenSplit, onInspectInStudio, t } = props
  const container = containerEl !== undefined ? containerEl : (containerRef?.current ?? null)
  const [anchor, setAnchor] = useState<HoverAnchor | null>(null)
  const [entry, setEntry] = useState<EvidencePreviewEntry | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRelRef = useRef<string | null>(null)

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== null) { clearTimeout(openTimerRef.current); openTimerRef.current = null }
    if (closeTimerRef.current !== null) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
  }, [])

  const closeImmediate = useCallback(() => {
    clearTimers()
    activeRelRef.current = null
    setAnchor(null)
    setEntry(null)
  }, [clearTimers])

  const cancelCloseTimer = useCallback(() => {
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
    cancelCloseTimer()
    const trigger = () => {
      const rect = button.getBoundingClientRect()
      const triggerRect: TriggerRect = { left: rect.left, top: rect.top, bottom: rect.bottom }
      const measuredHeight = cardRef.current?.offsetHeight ?? 0
      const pos = positionCardForRect(triggerRect, measuredHeight)
      activeRelRef.current = relPath
      setAnchor({ relPath, triggerRect, left: pos.left, top: pos.top })
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
  }, [cancelCloseTimer, getCached, loadPreview])

  useEffect(() => {
    closeImmediate()
  }, [docKey, closeImmediate])

  useLayoutEffect(() => {
    if (anchor === null || cardRef.current === null) return
    const measured = cardRef.current.offsetHeight
    if (measured <= 0) return
    const next = positionCardForRect(anchor.triggerRect, measured)
    if (next.left !== anchor.left || next.top !== anchor.top) {
      setAnchor((prev) => (prev === null ? null : { ...prev, left: next.left, top: next.top }))
    }
  }, [anchor, entry])

  useEffect(() => {
    if (container === null) return undefined
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
        closeImmediate()
      }
    }
    const onViewportChange = () => {
      if (activeRelRef.current !== null || openTimerRef.current !== null) {
        closeImmediate()
      }
    }
    container.addEventListener('pointerover', onPointerOver)
    container.addEventListener('pointerout', onPointerOut)
    container.addEventListener('focusin', onFocusIn)
    container.addEventListener('focusout', onFocusOut)
    container.addEventListener('scroll', onViewportChange, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onViewportChange, { passive: true })
    window.addEventListener('resize', onViewportChange)
    return () => {
      closeImmediate()
      container.removeEventListener('pointerover', onPointerOver)
      container.removeEventListener('pointerout', onPointerOut)
      container.removeEventListener('focusin', onFocusIn)
      container.removeEventListener('focusout', onFocusOut)
      container.removeEventListener('scroll', onViewportChange)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onViewportChange)
      window.removeEventListener('resize', onViewportChange)
    }
  }, [container, openForButton, scheduleClose, closeImmediate])

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
      ref={cardRef}
      className={css.citationHoverCard}
      style={{ left: anchor.left, top: anchor.top }}
      role="region"
      aria-label={t('finalCitationHoverAria')}
      data-testid="citation-hover-card"
      data-citation-state={entry.state}
      onPointerEnter={cancelCloseTimer}
      onPointerLeave={scheduleClose}
      onFocus={cancelCloseTimer}
      onBlur={(event) => {
        const next = event.relatedTarget
        if (next instanceof Node && cardRef.current?.contains(next)) return
        scheduleClose()
      }}
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
                  {entry.summary.quality === 'unknown'
                    ? t('evidenceQualityUnknown')
                    : t('evidenceQualityBadge', { grade: entry.summary.quality })}
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
                const relPath = anchor.relPath
                closeImmediate()
                if (onInspectInStudio !== undefined) {
                  onInspectInStudio(relPath)
                } else {
                  onOpenSplit(relPath)
                }
              }}
            >
              {onInspectInStudio !== undefined ? t('finalCitationPinStudio') : t('finalCitationOpenSplit')}
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
