/**
 * ResearchHeaderPill — 会话顶栏研究状态胶囊（conversation.session.header.actions）。
 * 共享 SessionStreamStore 单条 journal 流；仅在会话有研究活动/绑定时渲染，普通闲聊零干扰。
 */
import { useEffect, useState, type ReactNode } from 'react'
import { HoverCard, StateDot, TextShimmer, type StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { foldHitlPending } from '../lib/events/hitl-fold.ts'
import { bindingTrust } from '../lib/run/binding-trust.ts'
import { decodeDeliveredReceipt, deliveryFromReceipt, latestFinalDelivery } from '../lib/run/final-target.ts'
import { openRun, type RunSource } from '../lib/run/run-context.ts'
import { readArtifact } from '../lib/run/artifact-read.ts'
import { streamFailureOf } from '../lib/events/stream-failure.ts'
import type { Follow } from './session-follow.ts'
import css from './ResearchHeaderPill.module.css'

export interface ResearchHeaderPillInjected {
  readonly follow: Follow
  readonly openStatus: () => void
  readonly openFinal: (sessionId: SessionId, path: string) => void
  readonly runSource?: (sessionId: SessionId) => RunSource
}

export type ResearchHeaderPillProps = PropsRuntime<'conversation.session.header.actions'>
  & PropsLocale<'deepResearchPack'>
  & ResearchHeaderPillInjected

function hasOpenTurn(events: readonly unknown[]): boolean {
  let open = false
  for (const raw of events) {
    const type = (raw as { readonly type?: unknown } | null)?.type
    if (type === 'turn/start') open = true
    else if (type === 'turn/end') open = false
  }
  return open
}

export function ResearchHeaderPill(props: ResearchHeaderPillProps): ReactNode {
  const { sessionId, follow, openStatus, openFinal, runSource, t } = props
  const [events, setEvents] = useState<readonly unknown[]>([])
  const [diskDelivered, setDiskDelivered] = useState<string | null>(null)
  const sessionRunning = (props as {
    readonly useSession?: (selector: (s: { readonly running?: boolean } | undefined) => boolean) => boolean
  }).useSession?.((s) => s?.running === true) ?? false

  useEffect(() => {
    setEvents([])
    setDiskDelivered(null)
    if (sessionId === undefined) return
    const controller = new AbortController()
    let active = true
    void (async () => {
      try {
        let current: unknown[] = []
        for await (const frame of follow(sessionId, controller.signal)) {
          if (!active || controller.signal.aborted) break
          if (frame.kind === 'history') current = [...frame.events]
          else current = [...current, frame.event]
          setEvents(current)
        }
      } catch {
        /* @silent-catch: header pill follow fails soft when session stream closes */
      }
    })()
    return () => { active = false; controller.abort() }
  }, [sessionId, follow])

  const trust = bindingTrust(events)
  const hitl = foldHitlPending(events)
  const cwd = sessionId === undefined ? undefined : runSource?.(sessionId).root
  const delivery = latestFinalDelivery(events, cwd)
  const failure = streamFailureOf(events)
  const slug = trust.kind === 'bound' || trust.kind === 'suppressed' ? trust.slug : null

  useEffect(() => {
    setDiskDelivered(null)
    if (sessionId === undefined || slug === null || delivery !== null || runSource === undefined) return undefined
    const controller = new AbortController()
    void (async () => {
      try {
        const opened = await openRun(runSource(sessionId), slug, { signal: controller.signal })
        if (controller.signal.aborted || !opened.ok) return
        const hasReceipt = opened.value.entries.some((e) => e.name === 'delivered.json' && e.type === 'file')
        if (!hasReceipt) return
        const fallbackPath = `${opened.value.dir}/final.md`
        const art = await readArtifact(opened.value, 'delivered.json', { signal: controller.signal, decoder: decodeDeliveredReceipt })
        if (controller.signal.aborted) return
        if (art.state === 'ok') {
          const fromReceipt = deliveryFromReceipt(art.value, slug)
          if (fromReceipt !== null) {
            setDiskDelivered(fromReceipt.path)
            return
          }
        }
        setDiskDelivered(fallbackPath)
      } catch {
        /* @silent-catch: disk receipt check for pill badge fails soft */
      }
    })()
    return () => { controller.abort() }
  }, [sessionId, slug, delivery, runSource])

  if (trust.kind === 'unbound' && !hitl.pending && delivery === null && diskDelivered === null && !failure.dead) {
    return null
  }

  const deliveredPath = delivery?.path ?? diskDelivered
  const isOngoing = !hitl.pending && deliveredPath === null && !failure.dead && (sessionRunning || hasOpenTurn(events))

  const dotState: StateDotState = failure.dead || hitl.pending
    ? 'warning'
    : deliveredPath !== null
      ? 'done'
      : isOngoing
        ? 'ongoing'
        : 'idle'
  const label = hitl.pending
    ? t('pillHitlPending')
    : deliveredPath !== null
      ? t('pillDelivered')
      : failure.dead
        ? t('pillStreamIssue')
        : isOngoing
          ? t('pillResearching')
          : t('pillSettled')
  const hint = hitl.pending
    ? t('pillHoverHitl')
    : deliveredPath !== null
      ? t('pillHoverDelivered')
      : isOngoing
        ? t('pillHoverActive')
        : t('pillHoverSettled')
  const pillClass = `${css.trigger}${dotState === 'warning' ? ` ${css.triggerWarn}` : dotState === 'done' ? ` ${css.triggerDone}` : ''}`

  return (
    <HoverCard
      inline
      openDelayMs={300}
      anchor={(
        <button
          type="button"
          data-testid="research-header-pill"
          className={pillClass}
          onClick={() => {
            if (deliveredPath !== null && sessionId !== undefined) openFinal(sessionId, deliveredPath)
            else openStatus()
          }}
        >
          <StateDot state={dotState} size={9} />
          <TextShimmer active={isOngoing}>{label}</TextShimmer>
        </button>
      )}
      content={(
        <div className={css.hoverCardBody}>
          <strong>{label}</strong>
          {slug !== null && <div className={css.hoverMeta}>{t('pillHoverBundle', { slug })}</div>}
          <div className={css.hoverMeta}>{hint}</div>
        </div>
      )}
    />
  )
}
