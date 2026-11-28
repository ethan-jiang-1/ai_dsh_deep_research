/**
 * ResearchEvidenceTab — 证据卡专属阅读页签（认领 `drt_<slug>/evidence/*.md`）。
 * 支持元数据胶囊条、安全外部信源链接、Markdown 原文与摘录渲染、Question List 核对清单。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, MarkdownDelegateProvider, MarkdownText, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InputActions } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { readArtifact, type ArtifactState } from '../lib/run/artifact-read.ts'
import { openRun, type RunSource } from '../lib/run/run-context.ts'
import {
  evidenceAddressOf,
  isEvidenceAddress,
  parseEvidenceAddress,
  parseEvidenceCard,
  safeExternalUrl,
  type EvidenceCardView,
} from '../lib/run/evidence-card.ts'
import { formatEvidenceMention } from '../lib/events/research-references.ts'
import type { CockpitLocaleKey } from './locales/zh-cockpit.ts'
import css from './ResearchEvidenceTab.module.css'

const BUILTIN_LENS_IDS = new Set([
  'official', 'academic', 'adversarial', 'quant', 'practitioner', 'historical', 'structural', 'regulatory',
])

export interface ResearchEvidenceTabInjected {
  readonly runSource: (sessionId: SessionId) => RunSource
}

export type ResearchEvidenceTabProps = PropsRuntime<'sidebar.right.pane.tab'>
  & PropsLocale<'deepResearchPack'>
  & ResearchEvidenceTabInjected

export function ResearchEvidenceTab(props: ResearchEvidenceTabProps): ReactNode {
  const tab = props.useTabInfo()
  const address = tab.tab.navigation.address
  const parsedAddr = useMemo(() => parseEvidenceAddress(address), [address])
  const ioRef = useRef(props)
  ioRef.current = props
  const [state, setState] = useState<'loading' | ArtifactState>('loading')
  const [card, setCard] = useState<EvidenceCardView | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [inserted, setInserted] = useState(false)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputActions = (props as { inputActions?: InputActions }).inputActions

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) clearTimeout(feedbackTimerRef.current)
  }, [])
  useEffect(() => {
    setCopyState('idle')
    setInserted(false)
  }, [address])

  const reload = useCallback(() => {
    setReloadNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    const bind = (tab.tab.actions as { bindCommands?: (cmds: { refresh: () => void }) => () => void }).bindCommands
    if (typeof bind !== 'function') return
    return bind({ refresh: reload })
  }, [tab.tab.actions, reload])

  useEffect(() => {
    if (parsedAddr === null) return
    const controller = new AbortController()
    let active = true
    setState('loading')
    void (async () => {
      try {
        const opened = await openRun(ioRef.current.runSource(parsedAddr.sessionId as SessionId), parsedAddr.runDir, { signal: controller.signal })
        if (!active || controller.signal.aborted) return
        if (!opened.ok) {
          setState(opened.reason === 'missing' ? 'absent' : 'unreadable')
          setCard(null)
          return
        }
        const art = await readArtifact(opened.value, `evidence/${parsedAddr.cardName}`, { signal: controller.signal })
        if (!active || controller.signal.aborted) return
        setState(art.state)
        setCard(art.state === 'ok' && art.text !== null ? parseEvidenceCard(parsedAddr.cardName, art.text) : null)
      } catch {
        /* @silent-catch: evidence card load degrades to unreadable UI state */
        if (active && !controller.signal.aborted) {
          setState('unreadable')
          setCard(null)
        }
      }
    })()
    return () => { active = false; controller.abort() }
  }, [parsedAddr, reloadNonce])

  const { t } = props
  const markdownLabelsMemo = useMemo(() => ({
    code: {
      copyLabel: t('copy'),
      copiedLabel: t('copied'),
      toolbarLabels: { codeLabel: t('codeLabel'), wrapLabel: t('wrapLabel'), unwrapLabel: t('unwrapLabel') },
    },
    footnotes: t('footnotes'),
  }), [t])

  if (parsedAddr === null) return <div className={css.message} data-evidence-state="invalid">{props.t('evidenceInvalidAddress')}</div>
  if (state === 'loading') return <div className={css.message} data-evidence-state="loading">{props.t('evidenceLoading')}</div>
  if (state !== 'ok' || card === null) {
    const effectiveState = state === 'ok' ? 'invalid' : state
    const msgKey = effectiveState === 'absent'
      ? 'evidenceAbsent'
      : effectiveState === 'empty'
        ? 'evidenceEmpty'
        : effectiveState === 'invalid'
          ? 'evidenceInvalid'
          : 'evidenceUnreadable'
    return (
      <div className={css.message} data-evidence-state={effectiveState}>
        <div>{props.t(msgKey)}</div>
        <div><Button variant="outline" size="sm" onClick={reload}>{props.t('retry')}</Button></div>
      </div>
    )
  }

  const meta = card.meta
  const externalUrl = safeExternalUrl(meta?.sourceUrl)
  const qualityTone = meta?.quality === 'A' ? 'success' : meta?.quality === 'B' ? 'info' : 'outline'
  const lensKey = meta?.lens?.toLowerCase() ?? null
  const slugMatch = /(?:^|\/)drt_([\w.-]+)$/.exec(parsedAddr.runDir)
  const mentionText = slugMatch?.[1] !== undefined
    ? formatEvidenceMention(slugMatch[1], parsedAddr.cardName)
    : `${parsedAddr.runDir}/evidence/${parsedAddr.cardName}`
  const copyRef = (): void => {
    if (typeof navigator === 'undefined' || navigator.clipboard === undefined) {
      setCopyState('failed')
      return
    }
    void navigator.clipboard.writeText(parsedAddr.relPath).then(
      () => {
        setCopyState('copied')
        if (feedbackTimerRef.current !== null) clearTimeout(feedbackTimerRef.current)
        feedbackTimerRef.current = setTimeout(() => setCopyState('idle'), 1600)
      },
      () => {
        setCopyState('failed')
      },
    )
  }
  const insertRef = (): void => {
    if (inputActions === undefined) return
    const span = inputActions.captureInsertion()
    if (!inputActions.insertText(`${mentionText} `, span)) return
    setInserted(true)
    if (feedbackTimerRef.current !== null) clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = setTimeout(() => setInserted(false), 1600)
  }
  const openLinkedEvidence = (rawPath: string): void => {
    const targetAddr = isEvidenceAddress(rawPath)
      ? rawPath
      : evidenceAddressOf(parsedAddr.sessionId, parsedAddr.runDir, rawPath)
    if (!isEvidenceAddress(targetAddr)) return
    const openResource = (tab.tab.actions as { openResource?: (addr: string, opts?: { preferNewPane?: boolean }) => void }).openResource
    if (typeof openResource === 'function') openResource(targetAddr)
  }
  return (
    <div className={css.root} data-testid="research-evidence-tab" data-evidence-state="ok">
      <div className={css.header}>
        <div className={css.titleRow}>
          <strong className={css.title}>{card.title ?? card.file}</strong>
          <div className={css.headerActions}>
            <Button variant="ghost" size="sm" data-testid="evidence-copy-ref" onClick={copyRef}>
              {copyState === 'copied' ? props.t('hubCopied') : copyState === 'failed' ? props.t('hubCopyFailed') : props.t('hubCopyPath')}
            </Button>
            {inputActions !== undefined && (
              <Button variant="ghost" size="sm" data-testid="evidence-insert-ref" onClick={insertRef}>
                {inserted ? props.t('graphInsertedRef') : props.t('graphInsertRef')}
              </Button>
            )}
            {externalUrl !== null && (
              <a className={css.sourceLink} href={externalUrl} target="_blank" rel="noopener noreferrer">
                {props.t('evidenceOpenSource')}
              </a>
            )}
          </div>
        </div>
        {meta !== null && (
          <div className={css.metaRow}>
            <Tag tone={qualityTone}>
              {meta.quality === 'unknown'
                ? props.t('evidenceQualityUnknown')
                : props.t('evidenceQualityBadge', { grade: meta.quality })}
            </Tag>
            <Tag tone="outline">{props.t(`evidenceTier_${meta.sourceTier}` as CockpitLocaleKey)}</Tag>
            {meta.lens !== null && (
              <Tag tone="neutral">
                {lensKey !== null && BUILTIN_LENS_IDS.has(lensKey)
                  ? props.t(`lens_${lensKey}_name` as CockpitLocaleKey)
                  : meta.lens}
              </Tag>
            )}
            {meta.publisher !== null && <Tag tone="quiet">{meta.publisher}</Tag>}
            {meta.retrievedAt !== null && <Tag tone="quiet">{meta.retrievedAt}</Tag>}
          </div>
        )}
      </div>
      <div className={css.body}>
        <MarkdownDelegateProvider openFile={openLinkedEvidence}>
          <MarkdownText text={card.bodyMarkdown} labels={markdownLabelsMemo} />
        </MarkdownDelegateProvider>
        {card.questions.length > 0 && (
          <div className={css.questionsBox}>
            <div className={css.questionsTitle}>{props.t('evidenceQuestionsTitle')}</div>
            {card.questions.map((item, idx) => (
              <div key={idx} className={css.questionItem}>
                <span>{item.checked ? '☑' : '☐'}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
