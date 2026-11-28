/**
 * 「终稿」页签体（学术/投研级单栏 & 全屏三栏精读台）。
 *
 * 形态：认领 `drt_<slug>/` 终稿地址族（`final.md` / `final/vN.md` / `final/readable*.md`）。
 * - 常规侧栏态：单条精致工具栏 + 可折叠目录 + 单列正文 + 150ms 行内证据悬停浮卡；
 * - 全屏态（`tab.sidebar.fullscreen === true` 且容器宽 ≥ 960px）：自动展开为
 *   「左常驻高亮章节 Sticky TOC + 中舒适 `72ch` 精读正文 + 右常驻证据/Critic 核查对照栏」。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MarkdownDelegateProvider, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { InputActions } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { extractNextVersionPriorities, rerunTriageRowsOf } from '../lib/run/rerun-triage.ts'
import {
  FINAL_LEDGER_DIR, FINAL_NAME, FINAL_REVIEW_NAME, finalReadPlan, finalTargetOf, finalViewOf, sessionFileOf, watchTargetOf,
} from '../lib/run/final-target.ts'
import { readArtifact, readStateOf, type ArtifactState } from '../lib/run/artifact-read.ts'
import { openRun, type RunSource } from '../lib/run/run-context.ts'
import { latestRunVersion } from '../lib/run/run-fold.ts'
import { parseReadinessDeclaration, readinessOfSources, reviewVerdictOf, type ReviewVerdict } from '../lib/review/review-readiness.ts'
import { joinClaimsVerdicts, readClaimsAndVerdicts, type ClaimsAuditSummary } from '../lib/run/claims-verdicts.ts'
import { evidenceAddressOf, isEvidenceAddress } from '../lib/run/evidence-card.ts'
import type { EvidencePreviewEntry } from '../lib/run/evidence-preview.ts'
import { linkifyEvidenceCitations } from '../lib/run/citation-linkify.ts'
import { CitationHoverLayer } from './research-final/CitationHoverLayer.tsx'
import { ClaimsAuditView } from './research-final/ClaimsAuditView.tsx'
import { FinalFollowupFooter } from './research-final/FinalFollowupFooter.tsx'
import { FinalToc } from './research-final/FinalToc.tsx'
import { FinalToolbar } from './research-final/FinalToolbar.tsx'
import { StudioInspectorPane, type StudioInspectorTab } from './research-final/StudioInspectorPane.tsx'
import { useEvidencePreview } from './research-final/useEvidencePreview.ts'
import { useContainerWidth } from './useContainerWidth.ts'
import { RESEARCH_STATUS_TAB_KIND } from './keys.ts'
import css from './ResearchFinalTab.module.css'

export interface ResearchFinalTabInjected {
  readonly runSource: (sessionId: SessionId) => RunSource
  readonly toggleFullscreen?: () => void
}

export type ResearchFinalTabProps = PropsRuntime<'sidebar.right.pane.tab'> & PropsLocale<'deepResearchPack'> & ResearchFinalTabInjected

const REFRESH_MS = 30_000
type FinalView = 'reader' | 'audit' | 'draft' | 'claims'

const NOTICE_KEY = {
  readerEmpty: 'finalReaderEmptyFallback',
  readerUnreadable: 'finalReaderReadFailedFallback',
  auditEmpty: 'finalBodyEmptyFallback',
  auditUnreadable: 'finalBodyReadFailedFallback',
  auditMissing: 'finalBodyMissingFallback',
} as const

const REVIEW_STATE_KEY: Record<ReviewVerdict, 'reviewFailed' | 'reviewConflict' | 'reviewUnconfirmed' | null> = {
  fail: 'reviewFailed', conflict: 'reviewConflict', unconfirmed: 'reviewUnconfirmed', pass: null, absent: null,
}

const REVIEW_NOTICE_KEY: Record<ReviewVerdict, 'finalReviewConflict' | 'finalReviewUnconfirmed' | null> = {
  conflict: 'finalReviewConflict', unconfirmed: 'finalReviewUnconfirmed', pass: null, fail: null, absent: null,
}

function markdownLabels(t: ResearchFinalTabProps['t']): {
  readonly code: { readonly copyLabel: string; readonly copiedLabel: string; readonly toolbarLabels: { readonly codeLabel: string; readonly wrapLabel: string; readonly unwrapLabel: string } }
  readonly footnotes: string
} {
  return {
    code: {
      copyLabel: t('copy'),
      copiedLabel: t('copied'),
      toolbarLabels: { codeLabel: t('codeLabel'), wrapLabel: t('wrapLabel'), unwrapLabel: t('unwrapLabel') },
    },
    footnotes: t('footnotes'),
  }
}

export function ResearchFinalTab(props: ResearchFinalTabProps): ReactNode {
  const tab = props.useTabInfo()
  const isFullscreen = (tab.sidebar as { readonly fullscreen?: boolean } | undefined)?.fullscreen === true
  const sessionId = props.sessionId
  const address = tab.tab.navigation.address
  const markdownLabelsMemo = useMemo(() => markdownLabels(props.t), [props.t])
  const file = useMemo(() => sessionFileOf(address), [address])
  const plan = useMemo(() => (file === null ? null : finalReadPlan(file.path)), [file])

  const ioRef = useRef(props)
  ioRef.current = props
  const visibleRef = useRef(false)
  visibleRef.current = tab.tab.visible
  const viewRef = useRef<FinalView>('reader')
  const versionRef = useRef<string | null>(null)
  const aliveRef = useRef(true)
  const loadEpochRef = useRef(0)
  const inspectTokenRef = useRef(0)
  const manualControllerRef = useRef<AbortController | null>(null)
  useEffect(() => () => { manualControllerRef.current?.abort() }, [])

  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null)
  const rootWidth = useContainerWidth(rootEl)
  const studioActive = isFullscreen && (rootWidth === null || rootWidth >= 960)
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [readerText, setReaderText] = useState<string | null>(null)
  const [draftText, setDraftText] = useState<string | null>(null)
  const [failure, setFailure] = useState<'finalUnreadable' | 'finalReadFailed' | 'finalEmpty' | 'finalDirUnreadable' | null>(null)
  const [bodyState, setBodyState] = useState<ArtifactState>('absent')
  const [readerState, setReaderState] = useState<ArtifactState>('absent')
  const [loading, setLoading] = useState(true)
  const [versions, setVersions] = useState(0)
  const [shownVersion, setShownVersion] = useState<number | null>(null)
  const [fallback, setFallback] = useState(false)
  const [readerName, setReaderName] = useState<string | null>(null)
  const [reviewVerdict, setReviewVerdict] = useState<ReviewVerdict>('absent')
  const [reviewDetail, setReviewDetail] = useState<string | null>(null)
  const [claimsSummary, setClaimsSummary] = useState<ClaimsAuditSummary | null>(null)
  const [prefilledCopy, setPrefilledCopy] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [resolved, setResolved] = useState<string | null>(null)
  const [view, setView] = useState<FinalView>('reader')
  const [tocOpen, setTocOpen] = useState(false)
  const [studioTab, setStudioTab] = useState<StudioInspectorTab>('claims')
  const [inspectedRel, setInspectedRel] = useState<string | null>(null)
  const [inspectedEntry, setInspectedEntry] = useState<EvidencePreviewEntry | null>(null)
  const targetRef = useRef<{ dir: string; name: string } | null>(null)
  const targetNamesRef = useRef<{ audit: string; readerName: string | null }>({ audit: '', readerName: null })
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const assignBodyEl = useCallback((el: HTMLDivElement | null): void => {
    bodyRef.current = el
    setBodyEl(el)
  }, [])

  const failLoad = useCallback((key: 'finalUnreadable' | 'finalReadFailed' | 'finalEmpty' | 'finalDirUnreadable'): void => {
    setText(null); setReaderText(null); setDraftText(null); setReaderName(null); setShownVersion(null)
    setClaimsSummary(null); setStale(false); setFailure(key); setLoading(false)
  }, [])

  viewRef.current = view

  const load = useCallback(async (signal: AbortSignal): Promise<void> => {
    if (sessionId === undefined || plan === null) return
    const epoch = ++loadEpochRef.current
    const isStale = (): boolean => signal.aborted || !aliveRef.current || loadEpochRef.current !== epoch
    const io = ioRef.current
    setLoading(true)
    setFailure(null)
    const opened = await openRun(io.runSource(sessionId), plan.final, { signal })
    if (isStale()) return
    if (!opened.ok) {
      failLoad(opened.reason === 'missing' ? 'finalUnreadable' : 'finalReadFailed')
      return
    }
    const viewIo = opened.value
    const listed = await viewIo.list(FINAL_LEDGER_DIR, { signal })
    if (isStale()) return
    if (readStateOf(listed) === 'unreadable') {
      failLoad('finalDirUnreadable')
      return
    }
    const versionNames = listed.ok ? listed.value.filter((entry) => entry.type === 'file').map((entry) => entry.name) : []
    const latest = latestRunVersion(versionNames)
    const target = finalTargetOf(plan, versionNames)
    if (target === null) {
      failLoad('finalUnreadable')
      return
    }
    const [bodyArt, draftArt, reviewArt, readinessArt, readerArt, claimsTuple] = await Promise.all([
      readArtifact(viewIo, target.audit, { signal }),
      readArtifact(viewIo, FINAL_NAME, { signal }),
      readArtifact(viewIo, FINAL_REVIEW_NAME, { signal }),
      readArtifact(viewIo, 'review/readiness.json', { signal, decoder: (_raw, rawText) => parseReadinessDeclaration(rawText) }),
      target.reader === null ? Promise.resolve(null) : readArtifact(viewIo, target.reader, { signal }),
      readClaimsAndVerdicts(viewIo, signal),
    ])
    if (isStale()) return
    const initial = finalViewOf({ body: bodyArt.state, reader: readerArt?.state ?? 'absent', requested: 'reader' })
    if (initial.failure !== null) {
      failLoad(initial.failure === 'empty' ? 'finalEmpty' : initial.failure === 'missing' ? 'finalUnreadable' : 'finalReadFailed')
      return
    }
    targetNamesRef.current = { audit: target.audit, readerName: target.reader }
    const effectiveView = viewRef.current === 'claims' ? 'audit' : viewRef.current
    const primaryName = watchTargetOf({
      view: effectiveView, body: bodyArt.state, reader: readerArt?.state ?? 'absent',
      audit: target.audit, readerName: target.reader, draft: FINAL_NAME,
    })
    targetRef.current = { dir: viewIo.dir, name: primaryName }
    setBodyState(bodyArt.state)
    setReaderState(readerArt?.state ?? 'absent')
    setResolved(`${viewIo.dir}${target.audit}`)
    setText(bodyArt.state === 'ok' ? bodyArt.text : null)
    setDraftText(draftArt.state === 'ok' ? draftArt.text : null)
    setReaderText(readerArt?.state === 'ok' ? readerArt.text : null)
    setClaimsSummary(joinClaimsVerdicts(claimsTuple.claims, claimsTuple.verdicts))
    setReaderName(target.reader)
    setShownVersion(target.version)
    setFallback(target.fallback)
    setVersions(latest)
    versionRef.current = null
    const reviewText = reviewArt.state === 'ok' ? reviewArt.text : null
    const declarationText = readinessArt.state === 'ok' ? readinessArt.text : null
    const reading = readinessOfSources({ reviewText, declarationText, hasReviewDir: viewIo.names.has('review') })
    setReviewVerdict(reviewVerdictOf(reading, { review: reviewArt.state, readiness: readinessArt.state }))
    setReviewDetail(reading.detail ?? null)
    const token = await io.runSource(sessionId).version(`${viewIo.dir}/${primaryName}`, { signal })
    if (isStale()) return
    if (token.ok) versionRef.current = token.value
    setLoading(false)
    setStale(false)
  }, [sessionId, plan, failLoad])

  useEffect(() => {
    aliveRef.current = true
    manualControllerRef.current?.abort()
    manualControllerRef.current = null
    loadEpochRef.current += 1
    inspectTokenRef.current += 1
    const controller = new AbortController()
    setText(null); setReaderText(null); setDraftText(null); setReaderName(null); setShownVersion(null)
    setFallback(false); setBodyState('absent'); setReaderState('absent'); setReviewVerdict('absent'); setReviewDetail(null)
    targetNamesRef.current = { audit: '', readerName: null }
    setStale(false); setResolved(null); setView('reader'); setInspectedRel(null); setInspectedEntry(null); setPrefilledCopy(null)
    viewRef.current = 'reader'; targetRef.current = null; versionRef.current = null
    void load(controller.signal)
    return () => {
      aliveRef.current = false
      loadEpochRef.current += 1
      inspectTokenRef.current += 1
      controller.abort()
      manualControllerRef.current?.abort()
      manualControllerRef.current = null
    }
  }, [load])

  useEffect(() => {
    const names = targetNamesRef.current
    if (targetRef.current === null || names.audit === '' || sessionId === undefined) return
    const effectiveView = view === 'claims' ? 'audit' : view
    const name = watchTargetOf({
      view: effectiveView, body: bodyState, reader: readerState,
      audit: names.audit, readerName: names.readerName, draft: FINAL_NAME,
    })
    if (name === targetRef.current.name) return
    targetRef.current = { dir: targetRef.current.dir, name }
    versionRef.current = null
    const controller = new AbortController()
    void (async () => {
      const token = await ioRef.current.runSource(sessionId).version(`${targetRef.current!.dir}/${name}`, { signal: controller.signal })
      if (!controller.signal.aborted && token.ok) versionRef.current = token.value
    })()
    return () => controller.abort()
  }, [view, bodyState, readerState, sessionId])

  useEffect(() => {
    if (sessionId === undefined) return
    const controller = new AbortController()
    const timer = setInterval(() => {
      void (async () => {
        const target = targetRef.current
        if (target === null) return
        const token = await ioRef.current.runSource(sessionId).version(`${target.dir}/${target.name}`, { signal: controller.signal })
        if (controller.signal.aborted || !token.ok) return
        if (versionRef.current === null) { versionRef.current = token.value; return }
        if (token.value === versionRef.current) return
        versionRef.current = token.value
        if (visibleRef.current) setStale(true)
        else void load(controller.signal)
      })()
    }, REFRESH_MS)
    return () => { clearInterval(timer); controller.abort() }
  }, [sessionId, load])

  const reloadManually = useCallback((): void => {
    manualControllerRef.current?.abort()
    const next = new AbortController()
    manualControllerRef.current = next
    void load(next.signal)
  }, [load])

  useEffect(() => {
    const bind = (tab.tab.actions as { bindCommands?: (cmds: { refresh: () => void }) => () => void }).bindCommands
    if (typeof bind !== 'function') return
    return bind({ refresh: reloadManually })
  }, [tab.tab.actions, reloadManually])

  const { getCached: getCachedEvidence, loadPreview: loadEvidencePreview } = useEvidencePreview({
    sessionId,
    getBundleDir: () => targetRef.current?.dir ?? plan?.dir ?? null,
    runSource: props.runSource,
  })

  const inspectInStudio = useCallback((relPath: string, forceRetry = false): void => {
    const token = ++inspectTokenRef.current
    const cleaned = relPath.trim().replace(/^\.\//, '')
    setInspectedRel(cleaned)
    setStudioTab('evidence')
    const cached = forceRetry ? undefined : getCachedEvidence(cleaned)
    if (cached !== undefined && cached.state !== 'loading') {
      setInspectedEntry(cached)
      return
    }
    setInspectedEntry({ state: 'loading' })
    void loadEvidencePreview(cleaned, forceRetry).then((resolvedEntry) => {
      if (inspectTokenRef.current === token) setInspectedEntry(resolvedEntry)
    })
  }, [getCachedEvidence, loadEvidencePreview])

  const openEvidenceSplit = useCallback((rawPath: string): void => {
    if (sessionId === undefined || plan === null) return
    const cleaned = rawPath.trim().replace(/^\.\//, '')
    const bundleDir = targetRef.current?.dir ?? plan.dir
    const targetAddr = isEvidenceAddress(rawPath) ? rawPath : evidenceAddressOf(sessionId, bundleDir, cleaned)
    if (!isEvidenceAddress(targetAddr)) return
    const openResource = (tab.tab.actions as { openResource?: (addr: string, opts?: { preferNewPane?: boolean }) => void }).openResource
    if (typeof openResource === 'function') openResource(targetAddr, { preferNewPane: true })
  }, [sessionId, plan, tab.tab.actions])

  const openEvidence = useCallback((rawPath: string): void => {
    if (sessionId === undefined || plan === null) return
    const cleaned = rawPath.trim().replace(/^\.\//, '')
    if (studioActive && cleaned.startsWith('evidence/')) {
      inspectInStudio(cleaned)
      return
    }
    openEvidenceSplit(rawPath)
  }, [sessionId, plan, studioActive, inspectInStudio, openEvidenceSplit])

  const inputActions = (props as { inputActions?: InputActions }).inputActions
  const prefillDraft = (copyText: string): void => {
    if (inputActions === undefined) return
    if (isFullscreen) props.toggleFullscreen?.()
    if (prefilledCopy !== null) {
      inputActions.setDraft(copyText)
    } else {
      const span = inputActions.captureInsertion()
      if (!inputActions.insertText(copyText, span)) inputActions.setDraft(copyText)
    }
    setPrefilledCopy(copyText)
  }

  const requested = view === 'draft' || view === 'claims' ? 'audit' : view
  const decision = finalViewOf({ body: bodyState, reader: readerState, requested })
  const hasReader = readerState === 'ok' && readerText !== null
  const hasAudit = bodyState === 'ok' && text !== null
  const showingDraft = view === 'draft' && draftText !== null
  const showingReader = view !== 'claims' && !showingDraft && decision.view === 'reader' && hasReader
  const displayed = showingDraft ? draftText : showingReader ? readerText : text
  const linkifiedMarkdown = useMemo(() => linkifyEvidenceCitations(displayed ?? ''), [displayed])
  const triageRows = useMemo(() => rerunTriageRowsOf(props.t), [props.t])
  const nextPriorities = useMemo(() => {
    const primary = extractNextVersionPriorities(displayed)
    return primary.length > 0 ? primary : extractNextVersionPriorities(text)
  }, [displayed, text])

  if (file === null || plan === null) return <div className={css.message}>{props.t('notFinalFile')}</div>
  if (loading && text === null) return <div className={css.message}>{props.t('finalLoading')}</div>
  if (failure !== null && text === null) {
    return (
      <div className={css.message}>
        {props.t(failure)}
        <div className={css.retryBox}>
          <button type="button" className={css.linkButton} onClick={reloadManually}>{props.t('retry')}</button>
        </div>
      </div>
    )
  }
  if (displayed === null && view !== 'claims') return <div className={css.message}>{props.t('finalUnread')}</div>
  const displayedPath = showingReader && readerName !== null
    ? readerName
    : showingDraft ? FINAL_NAME : resolved ?? plan.final
  const noticeKey = decision.notice === null ? null : NOTICE_KEY[decision.notice]
  const reviewStateKey = REVIEW_STATE_KEY[reviewVerdict]
  const reviewStateCopy = reviewStateKey === null ? null : props.t(reviewStateKey)
  const state = reviewStateCopy ?? (showingReader
    ? shownVersion !== null ? props.t('readerEditionVersion', { version: String(shownVersion) }) : `${props.t('readerEdition')}${props.t('notFinalized')}`
    : shownVersion !== null && shownVersion >= 1
      ? (showingDraft ? props.t('workingDraft') : props.t('auditEdition', { version: String(shownVersion) }))
      : props.t('currentVersion'))
  const reviewNoticeKey = REVIEW_NOTICE_KEY[reviewVerdict]
  const draftToggleLabel = !hasReader && fallback && versions >= 1 && draftText !== null
    ? (view === 'draft' ? props.t('viewVersion', { version: String(shownVersion ?? versions) }) : props.t('viewCurrentDraft'))
    : null

  const followupFooter = (
    <FinalFollowupFooter
      priorities={nextPriorities}
      triageRows={triageRows}
      canPrefill={inputActions !== undefined}
      prefilledCopy={prefilledCopy}
      onPrefill={prefillDraft}
      t={props.t}
    />
  )

  const proseContent = (
    <>
      <MarkdownDelegateProvider openFile={(path) => { openEvidence(path) }}>
        {!studioActive && (
          <FinalToc markdown={linkifiedMarkdown} bodyRef={bodyRef} bodyEl={bodyEl} open={tocOpen} onToggleOpen={setTocOpen} t={props.t} />
        )}
        <MarkdownText text={linkifiedMarkdown} labels={markdownLabelsMemo} />
      </MarkdownDelegateProvider>
      {failure !== null && <div className={css.errorNote}>{props.t(failure)}</div>}
      {followupFooter}
    </>
  )

  return (
    <div ref={setRootEl} className={css.root} data-final-layout={studioActive ? 'studio' : 'sidebar'}>
      {stale && (
        <div className={css.bar}>
          <span className={css.barText}>{props.t('finalUpdated')}</span>
          <button type="button" className={css.linkButton} onClick={reloadManually}>{props.t('finalReload')}</button>
        </div>
      )}
      {noticeKey !== null && (
        <div className={css.bar}>
          <span className={css.barText}>{props.t(noticeKey)}</span>
          <button type="button" className={css.linkButton} onClick={reloadManually}>{props.t('retry')}</button>
        </div>
      )}
      {reviewNoticeKey !== null && (
        <div className={css.bar} title={reviewDetail ?? undefined}>
          <span className={css.barText}>{props.t(reviewNoticeKey)}</span>
          <button type="button" className={css.linkButton} onClick={reloadManually}>{props.t('retry')}</button>
        </div>
      )}

      <FinalToolbar
        displayedPath={displayedPath}
        view={view}
        showingReader={showingReader}
        hasReader={hasReader}
        hasAudit={hasAudit}
        claimsCount={claimsSummary?.counts.total ?? 0}
        stateText={state}
        stateWarn={reviewStateCopy !== null}
        draftToggleLabel={draftToggleLabel}
        isFullscreen={isFullscreen}
        showTocToggle={!studioActive && view !== 'claims'}
        onChangeView={setView}
        onToggleDraft={() => { setView(view === 'draft' ? 'audit' : 'draft') }}
        onToggleToc={() => { setTocOpen((prev) => !prev) }}
        onOpenSplitStatus={() => { tab.tab.actions.openTab(RESEARCH_STATUS_TAB_KIND, { preferNewPane: true }) }}
        onOpenProcess={() => { tab.tab.actions.openTab(RESEARCH_STATUS_TAB_KIND) }}
        {...(props.toggleFullscreen !== undefined ? { onToggleFullscreen: props.toggleFullscreen } : {})}
        t={props.t}
      />

      {studioActive && view !== 'claims' ? (
        <div key="studio-shell" className={css.studioShell} data-testid="final-studio-shell">
          <FinalToc markdown={linkifiedMarkdown} bodyRef={bodyRef} bodyEl={bodyEl} mode="sticky" t={props.t} />
          <div ref={assignBodyEl} className={`${css.body} ${css.studioBody}`}>
            <div className={css.studioProse}>{proseContent}</div>
          </div>
          <StudioInspectorPane
            mode={studioTab}
            onChangeMode={setStudioTab}
            claimsSummary={claimsSummary}
            inspectedRelPath={inspectedRel}
            inspectedEntry={inspectedEntry}
            onInspectEvidence={(rel) => { inspectInStudio(rel) }}
            onOpenEvidenceSplit={openEvidenceSplit}
            onRetryEvidence={() => { if (inspectedRel !== null) inspectInStudio(inspectedRel, true) }}
            onRetryClaims={reloadManually}
            t={props.t}
          />
        </div>
      ) : (
        <div key="sidebar-body" ref={assignBodyEl} className={css.body}>
          {view === 'claims' ? (
            <>
              <ClaimsAuditView
                summary={claimsSummary}
                onOpenEvidence={openEvidenceSplit}
                onRetry={reloadManually}
                t={props.t}
              />
              {followupFooter}
            </>
          ) : proseContent}
        </div>
      )}

      {view !== 'claims' && (
        <CitationHoverLayer
          containerEl={bodyEl}
          docKey={displayedPath}
          loadPreview={loadEvidencePreview}
          getCached={getCachedEvidence}
          onOpenSplit={openEvidenceSplit}
          {...(studioActive ? { onInspectInStudio: (rel: string) => { inspectInStudio(rel) } } : {})}
          t={props.t}
        />
      )}
    </div>
  )
}
