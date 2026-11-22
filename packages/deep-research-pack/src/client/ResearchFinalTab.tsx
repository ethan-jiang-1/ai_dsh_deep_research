/**
 * 「终稿」页签体（issue 2026-10-19-final-tab-in-sidebar；读者版 = 2026-10-23 reader-final）。
 *
 * 形态 = **认领 `drt_<slug>/` 的终稿地址族**（`final.md` / `final/vN.md` /
 * `final/readable.md` / `final/readable-vN.md`）：交付卡片、结句内联引用、Files 树点到
 * 同一份文件，落的都是这一个页签——同地址幂等，不会出现"文件名预览"与"终稿"两个同名视图。
 *
 * 读面是一张定表（折算 = `final-target 折算件` 的 `finalReadPlan`）：
 *   `final.md`（工作稿）· `final/readable.md`（读者版工作件）· `final/vN.md` + `final/readable-vN.md`
 *   （交付副本与读者版交付件）· `review.md`（审查判定，静音条用）· `final/` 目录（版本账）。
 * 别的任何路径都不读——"中间过程不泄漏"在结构上成立，不是口头承诺。
 *
 * 默认视图：**有读者版先看读者版**（HITL2 前是 `readable.md`，交付后是 `readable-vN.md`），
 * 否则看最高 `final/vN`，再否则看 `final.md`；按钮可在「读者版 / 审计版」之间切换。
 * 静音条只讲盘上事实（`读者版` / `审计版 vN` / `当前工作稿` / `审查未过`；**不写"已交付"**——
 * 版本目录不是交付凭证，交付只由状态页签⑤ 的 `present` 见证说）。
 *
 * 更新语义：文件被改写时，正在看（`tab.visible`）→ 顶部提示条"重新读取"，不换掉你正在读的
 * 字；没在看 → 静默重读。轮询节奏与驾驶舱其余面同款（30s）。
 */
import { rerunTriageRowsOf } from '../lib/run/rerun-triage.ts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  FINAL_LEDGER_DIR, FINAL_NAME, FINAL_REVIEW_NAME, finalReadPlan, finalTargetOf, finalViewOf, sessionFileOf, watchTargetOf,
} from '../lib/run/final-target.ts'
import { readArtifact, type ArtifactState } from '../lib/run/artifact-read.ts'
import { openRun, type RunSource } from '../lib/run/run-context.ts'
import { latestRunVersion } from '../lib/run/run-fold.ts'
import { readinessOfSources, reviewVerdictOf, type ReviewVerdict } from '../lib/review/review-readiness.ts'
import { RESEARCH_STATUS_TAB_KIND } from './keys.ts'

/** 页签体注入面（index.ts 装配，绑定 remote.workspaceFiles）。 */
export interface ResearchFinalTabInjected {
  /** 以当前会话打开的 run bundle 读面（workspaceFiles 适配器；位置/读策略归 lib）。 */
  readonly runSource: (sessionId: SessionId) => RunSource
}

/** 槽标准 props + 注入面。 */
export type ResearchFinalTabProps = PropsRuntime<'sidebar.right.pane.tab'> & PropsLocale<'deepResearchPack'> & ResearchFinalTabInjected

/** 文件改写的巡检节奏（与驾驶舱其余面一致）。 */
const REFRESH_MS = 30_000

/** 三种视图：读者版 / 审计版（vN 或 final.md）/ 当前工作稿（仅无 reader 的旧形态）。 */
type FinalView = 'reader' | 'audit' | 'draft'

/** Markdown 词表（随语言构建；`MarkdownText` 按引用比较，故用 useMemo 钉住同一语言下的引用）。 */
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

const MESSAGE: React.CSSProperties = { padding: '12px', fontSize: 12.5, opacity: 0.6, lineHeight: 1.6 }
const STRIP: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '3px 2px 7px',
  marginBottom: 8, fontSize: 11, opacity: 0.75, borderBottom: '1px solid #00000014',
}
const LINK_BUTTON: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  color: 'inherit', fontSize: 'inherit', textDecoration: 'underline',
}
const BAR: React.CSSProperties = {
  marginBottom: 8, padding: '5px 8px', borderRadius: 6, fontSize: 11.5,
  background: '#b4530914', color: '#b45309', display: 'flex', alignItems: 'center', gap: 8,
}

/**
 * 终稿页签体。
 * @param props 槽 props + 注入面。
 * @returns 终稿正文或与其相称的空/失败态。
 */
export function ResearchFinalTab(props: ResearchFinalTabProps): ReactNode {
  const tab = props.useTabInfo()
  const sessionId = props.sessionId
  const address = tab.tab.navigation.address
  const markdownLabelsMemo = useMemo(() => markdownLabels(props.t), [props.t])
  const file = useMemo(() => sessionFileOf(address), [address])
  const plan = useMemo(() => (file === null ? null : finalReadPlan(file.path)), [file])

  // 注入面按引用可能逐帧变化（槽 props），装进 ref：`load` 的依赖只留字符串身份，
  // 否则 effect 依赖实际值 `props` 会形成重读循环。
  const ioRef = useRef(props)
  ioRef.current = props
  const visibleRef = useRef(false)
  visibleRef.current = tab.tab.visible
  const versionRef = useRef<string | null>(null)
  const aliveRef = useRef(true)

  const [text, setText] = useState<string | null>(null)
  const [readerText, setReaderText] = useState<string | null>(null)
  const [draftText, setDraftText] = useState<string | null>(null)
  // 失败态存字典键（不存译文）：locale 切换后同一失败仍按当前语言渲染。
  const [failure, setFailure] = useState<'finalUnreadable' | 'finalReadFailed' | 'finalEmpty' | null>(null)
  const [bodyState, setBodyState] = useState<ArtifactState>('absent')
  const [readerState, setReaderState] = useState<ArtifactState>('absent')
  const [loading, setLoading] = useState(true)
  const [versions, setVersions] = useState(0)
  /** 当前展示的版本（地址目标优先）；null = 通用地址/当前工作稿。 */
  const [shownVersion, setShownVersion] = useState<number | null>(null)
  /** true = 通用地址（final.md / readable.md），允许最新/工作稿回退；false = 地址点名版本。 */
  const [fallback, setFallback] = useState(false)
  const [readerName, setReaderName] = useState<string | null>(null)
  const [reviewVerdict, setReviewVerdict] = useState<ReviewVerdict>('absent')
  const [reviewDetail, setReviewDetail] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [resolved, setResolved] = useState<string | null>(null)
  const [view, setView] = useState<FinalView>('reader')
  const targetRef = useRef<{ dir: string; name: string } | null>(null)
  const targetNamesRef = useRef<{ audit: string; readerName: string | null }>({ audit: '', readerName: null })

  /** 打开终稿所在 run bundle，按同一套读策略读正文/读者版/工作稿/审查/版本目录。
   *  review.md 必须读到 eof——终局判定在文末，固定行窗会读到中段旧判定（BUG-036 同族）。 */
  const load = useCallback(async (signal: AbortSignal): Promise<void> => {
    if (sessionId === undefined || plan === null) return
    const io = ioRef.current
    setLoading(true)
    setFailure(null)
    const opened = await openRun(io.runSource(sessionId), plan.final, { signal })
    if (signal.aborted || !aliveRef.current) return
    if (!opened.ok) {
      setFailure(opened.reason === 'missing' ? 'finalUnreadable' : 'finalReadFailed')
      setLoading(false)
      return
    }
    const viewIo = opened.value
    const listed = await viewIo.list(FINAL_LEDGER_DIR, { signal })
    if (signal.aborted || !aliveRef.current) return
    const versionNames = listed.ok
      ? listed.value.filter((entry) => entry.type === 'file').map((entry) => entry.name)
      : []
    const latest = latestRunVersion(versionNames)
    const target = finalTargetOf(plan, versionNames)
    if (target === null) {
      setFailure('finalUnreadable')
      setLoading(false)
      return
    }
    const [bodyArt, draftArt, reviewArt, readinessArt, readerArt] = await Promise.all([
      readArtifact(viewIo, target.audit, { signal }),
      readArtifact(viewIo, FINAL_NAME, { signal }),
      readArtifact(viewIo, FINAL_REVIEW_NAME, { signal }),
      readArtifact(viewIo, 'review/readiness.json', { signal }),
      target.reader === null ? Promise.resolve(null) : readArtifact(viewIo, target.reader, { signal }),
    ])
    if (signal.aborted || !aliveRef.current) return
    const initial = finalViewOf({ body: bodyArt.state, reader: readerArt?.state ?? 'absent', requested: 'reader' })
    if (initial.failure !== null) {
      setFailure(initial.failure === 'empty' ? 'finalEmpty' : initial.failure === 'missing' ? 'finalUnreadable' : 'finalReadFailed')
      setLoading(false)
      return
    }
    targetNamesRef.current = { audit: target.audit, readerName: target.reader }
    const primaryName = watchTargetOf({
      view: 'reader', body: bodyArt.state, reader: readerArt?.state ?? 'absent',
      audit: target.audit, readerName: target.reader, draft: FINAL_NAME,
    })
    targetRef.current = { dir: viewIo.dir, name: primaryName }
    setBodyState(bodyArt.state)
    setReaderState(readerArt?.state ?? 'absent')
    setResolved(`${viewIo.dir}${target.audit}`)
    setText(bodyArt.state === 'ok' ? bodyArt.text : null)
    setDraftText(draftArt.state === 'ok' ? draftArt.text : null)
    setReaderText(readerArt?.state === 'ok' ? readerArt.text : null)
    setReaderName(target.reader)
    setShownVersion(target.version)
    setFallback(target.fallback)
    setVersions(latest)
    versionRef.current = null
    const reviewText = reviewArt.state === 'ok' ? reviewArt.text : null
    const declarationText = readinessArt.state === 'ok' ? readinessArt.text : null
    const reading = readinessOfSources({
      reviewText, declarationText, hasReviewDir: viewIo.names.has('review'),
    })
    setReviewVerdict(reviewVerdictOf(reading, { review: reviewArt.state, readiness: readinessArt.state }))
    setReviewDetail(reading.detail ?? null)
    // 初始 baseline：读当前显示件的版本令牌；首轮 watcher 不会把「首读」当变化。
    const token = await io.runSource(sessionId).version(`${viewIo.dir}/${primaryName}`, { signal })
    if (!signal.aborted && token.ok) versionRef.current = token.value
    setLoading(false)
    setStale(false)
  }, [sessionId, plan])

  // 首读 + 地址/会话变化重读
  useEffect(() => {
    aliveRef.current = true
    const controller = new AbortController()
    setText(null)
    setReaderText(null)
    setDraftText(null)
    setReaderName(null)
    setShownVersion(null)
    setFallback(false)
    setBodyState('absent')
    setReaderState('absent')
    setReviewVerdict('absent')
    setReviewDetail(null)
    targetNamesRef.current = { audit: '', readerName: null }
    setStale(false)
    setResolved(null)
    setView('reader')
    targetRef.current = null
    versionRef.current = null
    void load(controller.signal)
    return () => { aliveRef.current = false; controller.abort() }
  }, [load])

  // 视图切换：watcher 改盯当前显示件（reader/audit/draft），并重设 baseline（BUG-371）。
  useEffect(() => {
    const names = targetNamesRef.current
    if (targetRef.current === null || names.audit === '' || sessionId === undefined) return
    const name = watchTargetOf({
      view, body: bodyState, reader: readerState,
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

  // 文件改写：在看 → 提示重读；没在看 → 静默重读
  useEffect(() => {
    if (sessionId === undefined) return
    const controller = new AbortController()
    const timer = setInterval(() => {
      void (async () => {
        const target = targetRef.current
        if (target === null) return
        const token = await ioRef.current.runSource(sessionId).version(`${target.dir}/${target.name}`, { signal: controller.signal })
        if (controller.signal.aborted) return
        if (!token.ok) return
        if (versionRef.current === null) { versionRef.current = token.value; return }
        if (token.value === versionRef.current) return
        versionRef.current = token.value
        if (visibleRef.current) setStale(true)
        else void load(controller.signal)
      })()
    }, REFRESH_MS)
    return () => { clearInterval(timer); controller.abort() }
  }, [sessionId, load])

  if (file === null || plan === null) return <div style={MESSAGE}>{props.t('notFinalFile')}</div>
  if (loading && text === null) return <div style={MESSAGE}>{props.t('finalLoading')}</div>
  if (failure !== null && text === null) {
    return (
      <div style={MESSAGE}>
        {props.t(failure)}
        <div style={{ marginTop: 6 }}>
          <button type="button" style={LINK_BUTTON} onClick={() => { void load(new AbortController().signal) }}>{props.t('retry')}</button>
        </div>
      </div>
    )
  }
  const requested = view === 'draft' ? 'audit' : view
  const decision = finalViewOf({ body: bodyState, reader: readerState, requested })
  const hasReader = readerState === 'ok' && readerText !== null
  const hasAudit = bodyState === 'ok' && text !== null
  const showingDraft = view === 'draft' && draftText !== null
  const showingReader = !showingDraft && decision.view === 'reader' && hasReader
  const displayed = showingDraft ? draftText : showingReader ? readerText : text
  if (displayed === null) return <div style={MESSAGE}>{props.t('finalUnread')}</div>
  const displayedTruncated = false
  const displayedPath = showingReader && readerName !== null
    ? readerName
    : showingDraft ? FINAL_NAME : resolved ?? plan.final
  const noticeKey = decision.notice === 'readerEmpty'
    ? 'finalReaderEmptyFallback'
    : decision.notice === 'readerUnreadable'
      ? 'finalReaderReadFailedFallback'
      : decision.notice === 'auditEmpty'
        ? 'finalBodyEmptyFallback'
        : decision.notice === 'auditUnreadable'
          ? 'finalBodyReadFailedFallback'
          : decision.notice === 'auditMissing' ? 'finalBodyMissingFallback' : null
  const reviewStateCopy = reviewVerdict === 'fail'
    ? props.t('reviewFailed')
    : reviewVerdict === 'conflict'
      ? props.t('reviewConflict')
      : reviewVerdict === 'unconfirmed' ? props.t('reviewUnconfirmed') : null
  const state = reviewStateCopy ?? (showingReader
    ? shownVersion !== null ? props.t('readerEditionVersion', { version: String(shownVersion) }) : `${props.t('readerEdition')}${props.t('notFinalized')}`
    : shownVersion !== null && shownVersion >= 1
      ? (showingDraft ? props.t('workingDraft') : props.t('auditEdition', { version: String(shownVersion) }))
      : props.t('currentVersion'))
  const stateStyle = reviewStateCopy !== null
    ? { color: '#b45309', fontWeight: 600 }
    : undefined
  const reviewNoticeKey = reviewVerdict === 'conflict'
    ? 'finalReviewConflict'
    : reviewVerdict === 'unconfirmed' ? 'finalReviewUnconfirmed' : null
  const toggleLabel = hasReader && hasAudit
    ? view === 'reader'
      ? props.t('auditToggleLabel', { version: shownVersion !== null ? props.t('versionV', { version: String(shownVersion) }) : '' })
      : props.t('viewReader')
    : !hasReader && fallback && versions >= 1 && draftText !== null
      ? view === 'draft' ? props.t('viewVersion', { version: String(shownVersion ?? versions) }) : props.t('viewCurrentDraft')
      : null
  // 滚动义务在页签体自己：vendor 的 `.tabBody` 是定高 flex 列且 `overflow: hidden`，
  // 内容超出即被裁且不可滚（2026-10-20 用户实测报障：终稿页签不滚）。同款约定见
  // ResearchStatusTab 根容器（2026-10-12 同一类 BUG 的修法）——根吃满高度，正文区自滚，
  // 静音条固定不随文滚动。
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {stale && (
        <div style={{ ...BAR, margin: '8px 12px 0', flexShrink: 0 }}>
          <span style={{ flex: 1 }}>{props.t('finalUpdated')}</span>
          <button type="button" style={LINK_BUTTON} onClick={() => { void load(new AbortController().signal) }}>{props.t('finalReload')}</button>
        </div>
      )}
      {noticeKey !== null && (
        <div style={{ ...BAR, margin: '8px 12px 0', flexShrink: 0 }}>
          <span style={{ flex: 1 }}>{props.t(noticeKey)}</span>
          <button type="button" style={LINK_BUTTON} onClick={() => { void load(new AbortController().signal) }}>{props.t('retry')}</button>
        </div>
      )}
      {reviewNoticeKey !== null && (
        <div style={{ ...BAR, margin: '8px 12px 0', flexShrink: 0 }} title={reviewDetail ?? undefined}>
          <span style={{ flex: 1 }}>{props.t(reviewNoticeKey)}</span>
          <button type="button" style={LINK_BUTTON} onClick={() => { void load(new AbortController().signal) }}>{props.t('retry')}</button>
        </div>
      )}
      <div style={{ ...STRIP, padding: '3px 12px 7px', flexShrink: 0 }} title={displayedPath}>
        <span style={stateStyle}>{state}</span>
        <span style={{ flex: 1 }} />
        {toggleLabel !== null && (
          <button
            type="button"
            style={LINK_BUTTON}
            title={hasReader && hasAudit
              ? (view === 'reader' ? props.t('auditCanonicalNote') : props.t('readerNote'))
              : props.t('ledgerNote')}
            onClick={() => {
              setView(hasReader && hasAudit
                ? (view === 'reader' ? 'audit' : 'reader')
                : (view === 'draft' ? 'audit' : 'draft'))
            }}
          >{toggleLabel}</button>
        )}
        <button type="button" style={LINK_BUTTON} onClick={() => { tab.tab.actions.openTab(RESEARCH_STATUS_TAB_KIND) }}>{props.t('finalProcess')}</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '0 12px 40px', fontSize: 13.5, lineHeight: 1.75, overflowWrap: 'anywhere' }}>
        <MarkdownText text={displayed ?? ''} labels={markdownLabelsMemo} />
        {displayedTruncated && (
          <div style={{ marginTop: 12, fontSize: 11.5, opacity: 0.6 }}>
            {props.t('finalTruncated', { count: String((displayed ?? '').split('\n').length) })}
          </div>
        )}
        {failure !== null && <div style={{ marginTop: 12, fontSize: 11.5, color: '#b00' }}>{props.t(failure)}</div>}
        {/* 交付后只读出口（同状态页 ⑤，共用 纯函数层 文案；D18 只读） */}
        <details style={{ marginTop: 18, fontSize: 12, opacity: 0.9 }}>
          <summary style={{ cursor: 'pointer' }}>{props.t('triageTitle')}</summary>
          <div style={{ marginTop: 6, lineHeight: 1.6 }}>
            {rerunTriageRowsOf(props.t).map((row) => (
              <div key={row.label} style={{ marginBottom: 4 }}>
                <strong>{row.label}</strong>{props.t('triageConsequenceSuffix', { consequence: row.consequence })}
                <div style={{ opacity: 0.75 }}>{props.t('triageCopyLine', { copy: row.copy })}</div>
              </div>
            ))}
            <div style={{ opacity: 0.6 }}>{props.t('triageHint')}</div>
          </div>
        </details>
      </div>
    </div>
  )
}
