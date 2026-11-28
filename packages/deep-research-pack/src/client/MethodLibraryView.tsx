/**
 * 主界面「方法库」tab（2026-10-21 方法库管理计划 Phase 1/2）。
 *
 * 为什么在这里：方法库管理是 workspace 级用户任务，不是 run 观察、也不该塞在右栏窄页签。
 * DSH 的 `conversation.view` 是 list slot（Chat/Trajectory 同款），第三 tab 全宽、就在对话旁。
 *
 * 交互边界：两列工作台。右侧详情、摘要+访谈、表单检查共享同一活动草稿；新建先选来源。
 * 写操作交给独立 Method Editor Session 的 Host tools，Client 只读 workspace 文件并核对整库结果；
 * 本页签不直写文件、不新增写权限。所有动作显式（保存/设默认/删除二次确认）。
 *
 * 纯折算与写前/写后核对预算住 `纯函数层`；本组件负责读取、会话生命周期与布局。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { MethodLibraryCoachEvent } from '../lib/method-library/method-library-events.ts'
import type { SourcePreview } from '../lib/method-library/method-library-source.ts'
import type { MethodLibraryReadResult } from '../lib/method-library/method-library-read.ts'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import {
  SECTION_LABELS,
  methodNameIssue,
  summaryOfEntry,
  type LibraryEntry,
} from '../lib/method-library/library-fold.ts'
import { BUILTIN_PREFERENCES } from '../lib/shared/config-tables.ts'
import { displayNameOf, displaySummaryOf } from './builtin-display.ts'
import { coachPatchAppliesToDraft, mergeCoachDraft, parseMethodDraft } from '../lib/method-library/method-draft.ts'
import { BuiltinView, EditorView, LibraryRow, MethodSummaryView, ReadMineView, SourceSelectionView } from './method-library/views.tsx'
import { MethodCoachPanel } from './method-library/coach.tsx'
import { coachContextOf, coachStartAction, manualEditPrompt } from './method-library/coach-prompts.ts'
import { ColumnHandle } from './method-library/ColumnHandle.tsx'
import { useLibraryData } from './method-library/useLibraryData.ts'
import { useRunSourcePicker } from './method-library/useRunSourcePicker.ts'
import { useDraftState } from './method-library/useDraftState.ts'
import { useOperationQueue, useOperationQueueState } from './method-library/useOperationQueue.ts'
import {
  LIBRARY_PATH, builtinLibraryEntry, maxLeftPaneWidth,
  type MethodLibraryLeaveStatus, type MethodLibraryOperationRequest, type Mode,
} from './method-library/model.ts'
import { useContainerWidth } from './useContainerWidth.ts'
import css from './method-library/library.module.css'

export interface MethodLibraryInjected {
  readonly readLibrary: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<MethodLibraryReadResult>
  /** 方法编辑会话的建/保留（每个活动草稿独立 root session；页内 portal）。 */
  readonly ensureCoach: (sessionId: SessionId, draftKey: string) => Promise<{
    readonly id: SessionId
    readonly reference: {
      release(): void
      readonly ready?: Promise<unknown>
      readonly binding?: { readonly session: { getSnapshot(): { readonly openState: string } } }
    }
  }>
  /** 给方法编辑发一条 prompt（访谈首问、用户手改与显式写操作）。 */
  readonly sendCoach: (sessionId: SessionId, text: string, requestId?: string) => Promise<{ readonly ok: boolean; readonly detail?: string; readonly uncertain?: boolean }>
  /** 跟随方法编辑会话的 assistant 消息（草稿回填；live only）。 */
  readonly watchCoach: (sessionId: SessionId, signal: AbortSignal, onEvent: (event: MethodLibraryCoachEvent) => void, onReady: () => void) => Promise<void>
  /** 列工作区目录（根用 `.`；空路径被 workspaceFiles 判为 bad request）。 */
  readonly listDir: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<readonly { type: string; name: string }[] | null>
  readonly readPreview: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<SourcePreview>
}

export type MethodLibraryViewProps = PropsRuntime<'conversation.view'> & PropsLocale<'deepResearchPack'> & MethodLibraryInjected & {
  /** 可选宿主离场守卫注册（Hub 切 tab / 返回对话前检查保存锁与未保存草稿；BUG-480）。 */
  readonly registerLeaveGuard?: (guard: (() => MethodLibraryLeaveStatus) | null) => void
}

/**
 * 主界面「方法库」tab。
 * @param props - conversation.view 标准 props + workspace reads and Method Editor session injection.
 */
export function MethodLibraryView(props: MethodLibraryViewProps): ReactNode {
  const { sessionId, t, readLibrary, listDir, readPreview, sendCoach, watchCoach, registerLeaveGuard } = props
  const [mode, setMode] = useState<Mode>('read')
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null)
  const {
    text, loadState, setLoadState, loadError, setLoadError,
    query, setQuery, segment, setSegment, selectedName, setSelectedName,
    entries, filtered, selected, builtin, applyLibraryRead, load, reset: resetLibrary,
  } = useLibraryData({ sessionId, readLibrary, preserveEmptySelection: mode === 'new' })
  const {
    runNames, runState, selectedRunSource, selectedRunLoading,
    loadRunNames, selectRunSource, abort: abortRunRead, cancelRunRead, reset: resetRunPicker,
    setSelectedRunSource, setSelectedRunLoading,
  } = useRunSourcePicker({ sessionId, t, listDir, readPreview, readLibrary })
  // 写操作队列的状态面必须先于 useDraftState 创建：草稿 hook 借用这些 ref/setter 判忙与落回执。
  const {
    pendingOperationRef, queuedOperationRef, queuedOperationTimeoutRef,
    operationUnknown, setOperationUnknown, operationUnknownRef,
    receipt, setReceipt, sending, setSending, pendingDelete, setPendingDelete,
  } = useOperationQueueState()
  const [coachId, setCoachId] = useState<SessionId | null>(null)
  const [selectedBuiltinSource, setSelectedBuiltinSource] = useState<LibraryEntry | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [coachReady, setCoachReady] = useState(false)
  const coachReadyRef = useRef(false)
  const coachIdRef = useRef<SessionId | null>(coachId)
  const activeTurnRef = useRef<number | null>(null)
  const [coachVisible, setCoachVisible] = useState(false)
  const [coachEpoch, setCoachEpoch] = useState(0)
  const coachRetryRef = useRef(false)
  const runOperationRef = useRef<(input: MethodLibraryOperationRequest, resume?: boolean) => Promise<void>>(async () => {})
  const onCoachReady = useCallback((id: SessionId): void => {
    coachIdRef.current = id
    setCoachId(id)
    setCoachVisible(true)
    coachRetryRef.current = false
  }, [])
  const onCoachError = useCallback((cause: unknown): void => {
    coachRetryRef.current = true
    coachIdRef.current = null
    setCoachId(null)
    coachReadyRef.current = false
    setCoachReady(false)
    setInterviewStarted(false)
    if (queuedOperationRef.current === null) return
    if (queuedOperationTimeoutRef.current !== null) clearTimeout(queuedOperationTimeoutRef.current)
    queuedOperationTimeoutRef.current = null
    queuedOperationRef.current = null
    setSending(false)
    setCoachVisible(false)
    setReceipt({ ok: false, detail: t('operationFailed', { detail: String(cause) }) })
  }, [queuedOperationRef, queuedOperationTimeoutRef, setReceipt, setSending, t])
  const [leftWidth, setLeftWidth] = useState(270)
  const {
    modeRef, workbenchStage, setWorkbenchStage,
    draft, setDraft, draftRef, draftRevision, setDraftRevision, draftRevisionRef,
    turnBaseRevisionRef, turnAcceptedRevisionRef, lastAssistantSeqRef,
    activeDraftKey, setActiveDraftKey, activeDraftKeyRef,
    manual, manualRef, coachFields, setCoachFields, coachFieldsRef,
    sourceFields, setSourceFields, activeField, setActiveField, activeRef,
    coachBase, setCoachBase, coachBaseRef, previousRef, dirty,
    bumpDraftRevision, releaseCoachIfIdle, switchSegment, beginNew, beginEdit,
    selectMine, selectBuiltin, restartSource, applyBuiltinReference, startBlank,
    startBuiltinSource, startRunSource, cancel, updateSection, onNameChange, undoCoach,
  } = useDraftState({
    t, mode, setMode, segment, entries, selected, setSegment, setSelectedName,
    selectedBuiltinSource, setSelectedBuiltinSource,
    selectedRunSource, setSelectedRunSource, setSelectedRunLoading,
    abortRunRead, setReceipt, setPendingDelete, setLibraryOpen,
    pendingOperationRef, queuedOperationRef,
    coachIdRef, setCoachId, coachReadyRef, setCoachReady, setCoachVisible, activeTurnRef,
  })
  const {
    settleOperation, runOperation, save, remove, setDefault, clearDefault, refresh,
  } = useOperationQueue({
    sessionId, t, sendCoach, readLibrary,
    text, loadState, setLoadState, setLoadError, applyLibraryRead, load,
    mode, draft, setMode, setDraft, setSelectedName,
    modeRef, draftRef, activeDraftKeyRef, setActiveDraftKey, releaseCoachIfIdle,
    coachIdRef, setCoachId, coachReadyRef, setCoachReady, setCoachVisible,
    coachRetryRef, setCoachEpoch,
    pendingOperationRef, queuedOperationRef, queuedOperationTimeoutRef,
    operationUnknownRef, setOperationUnknown, setReceipt, setSending, setPendingDelete,
  })
  runOperationRef.current = runOperation
  coachIdRef.current = coachId
  coachReadyRef.current = coachReady
  const canSaveDraft = draft !== null
    && draft.name.trim() !== ''
    && methodNameIssue(draft.name) === null
    && SECTION_LABELS.every(({ key }) => (draft.sections[key] ?? '').trim() !== '')

  const rootWidth = useContainerWidth(rootEl)
  const narrowPane = rootWidth !== null && rootWidth < 640
  const maxLeftWidth = maxLeftPaneWidth(rootWidth)
  const effectiveLeftWidth = Math.max(120, Math.min(maxLeftWidth, leftWidth))
  useEffect(() => { if (!narrowPane) setLibraryOpen(false) }, [narrowPane])
  useEffect(() => { setInterviewStarted(false) }, [sessionId, activeDraftKey, coachEpoch])
  useEffect(() => {
    if (mode === 'read' || workbenchStage === 'source' || coachId === null) setInterviewStarted(false)
  }, [mode, workbenchStage, coachId])

  const leaveStatusRef = useRef<() => MethodLibraryLeaveStatus>(() => 'allow')
  leaveStatusRef.current = () => {
    if (sending || pendingOperationRef.current !== null || queuedOperationRef.current !== null) return 'blocked-saving'
    return dirty ? 'confirm-discard' : 'allow'
  }
  useEffect(() => {
    if (registerLeaveGuard === undefined) return undefined
    registerLeaveGuard(() => leaveStatusRef.current())
    return () => { registerLeaveGuard(null) }
  }, [registerLeaveGuard])

  useEffect(() => {
    resetRunPicker(); resetLibrary(); setMode('read'); setDraft(null); setInterviewStarted(false)
    draftRevisionRef.current = 0; setDraftRevision(0)
    turnBaseRevisionRef.current = null; turnAcceptedRevisionRef.current = null; lastAssistantSeqRef.current = -1
    setSourceFields(new Set()); setWorkbenchStage('interview')
    setActiveDraftKey(null); activeDraftKeyRef.current = null
    setPendingDelete(null); setReceipt(null); setSelectedBuiltinSource(null)
    setCoachId(null); coachIdRef.current = null
    setCoachReady(false); coachReadyRef.current = false
    setCoachVisible(false); coachRetryRef.current = false
    queuedOperationRef.current = null
    if (queuedOperationTimeoutRef.current !== null) clearTimeout(queuedOperationTimeoutRef.current)
    queuedOperationTimeoutRef.current = null
    if (pendingOperationRef.current !== null) clearTimeout(pendingOperationRef.current.timeout)
    pendingOperationRef.current = null
    operationUnknownRef.current = false; setOperationUnknown(false); setSending(false)
    const controller = new AbortController()
    void load(controller.signal)
    return () => {
      controller.abort()
      if (queuedOperationTimeoutRef.current !== null) clearTimeout(queuedOperationTimeoutRef.current)
      if (pendingOperationRef.current !== null) clearTimeout(pendingOperationRef.current.timeout)
    }
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- refs/setters from sibling hooks are stable; reset runs strictly on sessionId change
  }, [sessionId])

  // 方法编辑首问的上下文：库快照 + 当前草稿 + 内置参考（只读）。只随第一条消息发一次。
  // 文案住 coach-prompts（模型面，不是 UI）——见 BUG-055 的扫描守卫边界。
  const coachContext = coachContextOf({ text, draft, draftRevision, selectedBuiltinSource, selectedRunSource })

  const startInterview = async (id: SessionId): Promise<{ readonly ok: boolean; readonly detail?: string; readonly uncertain?: boolean }> => {
    const action = coachStartAction(selectedRunSource, selectedBuiltinSource)
    const result = await props.sendCoach(id, `${coachContext}\n\n${action}`, crypto.randomUUID())
    if (result.ok) setInterviewStarted(true)
    return result
  }

  /**
   * 排队等待的收尾（BUG-401）：教练流失败/卸载时必须清掉队列 ref 与 30s 超时器——
   * 只写错误回执会让 `sending` 悬在 true（按钮永久禁用）且 30s 后把明确错误覆写成
   * 「方法编辑不可用」。
   */
  const clearQueuedOperation = (): boolean => {
    const queued = queuedOperationRef.current !== null
    if (queuedOperationTimeoutRef.current !== null) clearTimeout(queuedOperationTimeoutRef.current)
    queuedOperationTimeoutRef.current = null
    queuedOperationRef.current = null
    return queued
  }

  useEffect(() => {
    if (coachId === null) return undefined
    const controller = new AbortController()
    setCoachReady(false)
    coachReadyRef.current = false
    void watchCoach(coachId, controller.signal, (event) => {
      const pending = pendingOperationRef.current
      if (event.kind === 'user-rpc') {
        if (pending !== null && event.requestId === pending.requestId) pending.turn = activeTurnRef.current
        return
      }
      if (event.kind === 'turn-start') {
        activeTurnRef.current = event.turn
        turnBaseRevisionRef.current = draftRevisionRef.current
        turnAcceptedRevisionRef.current = null
        return
      }
      if (event.kind === 'tool-call') {
        if (pending !== null && pending.turn === event.turn && event.args?.['operationId'] === pending.operationId
          && ['method_library_upsert', 'method_library_set_default', 'method_library_remove'].includes(event.name)) {
          pending.callId ??= event.callId
        }
        return
      }
      if (event.kind === 'tool-result') {
        if (pending !== null && pending.callId === event.callId) {
          void settleOperation(pending, { kind: 'tool-result', failed: event.failed, result: event.result })
        }
        return
      }
      if (event.kind === 'turn-end') {
        if (activeTurnRef.current === event.turn) {
          activeTurnRef.current = null
          turnBaseRevisionRef.current = null
          turnAcceptedRevisionRef.current = null
        }
        if (pending !== null && pending.turn === event.turn) void settleOperation(pending, { kind: 'turn-end' })
        return
      }
      if (event.kind !== 'assistant-text' || (modeRef.current !== 'edit' && modeRef.current !== 'new')) return
      if (event.turn !== activeTurnRef.current || event.seq <= lastAssistantSeqRef.current) return
      if (!coachPatchAppliesToDraft({
        currentRevision: draftRevisionRef.current,
        baseRevision: turnBaseRevisionRef.current,
        acceptedRevision: turnAcceptedRevisionRef.current,
      })) return
      const entry = parseMethodDraft(event.text)
      const current = draftRef.current
      if (entry === null || current === null) return
      const merged = mergeCoachDraft(
        { name: current.name, sections: current.sections, manual: manualRef.current, base: coachBaseRef.current },
        entry,
      )
      previousRef.current = {
        draft: current,
        manual: new Set(manualRef.current),
        coachFields: new Set(coachFieldsRef.current),
        active: activeRef.current,
        base: coachBaseRef.current,
      }
      setDraft({
        ...current,
        name: merged.name,
        sections: merged.sections,
        provenance: entry.provenance ?? current.provenance,
        legacyText: entry.legacyText ?? current.legacyText,
      })
      setCoachFields(new Set(merged.coachFields))
      setActiveField(merged.activeField)
      setCoachBase(entry)
      turnAcceptedRevisionRef.current = bumpDraftRevision()
      lastAssistantSeqRef.current = event.seq
    }, () => {
      coachReadyRef.current = true
      setCoachReady(true)
      const queued = queuedOperationRef.current
      if (queued !== null) {
        clearQueuedOperation()
        void runOperationRef.current(queued, true)
      }
    }).catch((cause) => {
      if (controller.signal.aborted) return
      // 建连失败 = 排队操作永远等不到 onReady：清队列 + 释放 sending，再如实报错（BUG-401）。
      const hadQueued = clearQueuedOperation()
      if (hadQueued) setSending(false)
      setReceipt({ ok: false, detail: t('operationFailed', { detail: String(cause) }) })
    })
    return () => controller.abort()
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- sibling-hook refs/setters are stable; watch stream rebinds only when coachId/callbacks change
  }, [coachId, watchCoach, t])

  // 手改 diff 回传：仅访谈已启动且无在途写盘时，停下 900ms 后同步改动字段给方法编辑（BUG-480）。
  useEffect(() => {
    if (!interviewStarted || sending || pendingOperationRef.current !== null || coachId === null || manual.size === 0 || draft === null) return undefined
    const handle = setTimeout(() => {
      if (pendingOperationRef.current !== null) return
      void sendCoach(coachId, manualEditPrompt(draft, manual)).catch(() => { /* @silent-catch: manual edit telemetry is fail-soft */ })
    }, 900)
    return () => clearTimeout(handle)
  }, [interviewStarted, sending, coachId, draft, manual, sendCoach, pendingOperationRef])

  return (
    <div
      ref={setRootEl}
      data-method-library=""
      data-method-draft-revision={draftRevision}
      className={css.root}
    >
      <div className={css.header}>
        <strong className={css.headerTitle}>{props.t('methodLibrary')}</strong>
        <span className={css.muted}>{props.t('librarySharedHint')}</span>
        <span className={css.spacer} />
        {narrowPane && (
          <button
            type="button"
            data-method-library-toggle=""
            aria-expanded={libraryOpen}
            aria-controls="method-library-library-pane"
            className={css.button}
            onClick={() => { setLibraryOpen((open) => !open) }}
          >{libraryOpen ? props.t('workbenchPane') : props.t('libraryPane')}</button>
        )}
        <button type="button" className={css.button} onClick={refresh}>{props.t('refresh')}</button>
        <button type="button" data-method-new="" className={css.primaryButton} disabled={sending || operationUnknown} onClick={beginNew}>{props.t('newAction')}</button>
      </div>
      {receipt !== null && (
        <div role="status" aria-live="polite" className={receipt.ok ? css.receiptOk : css.receiptError}>
          {receipt.ok ? '✓' : '✕'} {receipt.detail}
        </div>
      )}
      <div className={css.body}>
        <aside
          id="method-library-library-pane"
          data-method-library-pane="library"
          className={css.libraryAside}
          style={{
            display: !narrowPane || libraryOpen ? 'block' : 'none',
            flex: narrowPane ? '1 1 auto' : (rootWidth !== null ? `0 0 ${effectiveLeftWidth}px` : `0 0 min(${effectiveLeftWidth}px, 38%)`),
            width: narrowPane ? '100%' : undefined,
            minWidth: narrowPane ? 0 : 120,
            borderRight: narrowPane ? 'none' : '1px solid var(--dsw-alias-border-l1)',
          }}
        >
          <div className={css.segmentBar}>
            <button type="button" className={`${css.button}${segment === 'mine' ? ` ${css.buttonActive}` : ''}`} onClick={() => { switchSegment('mine') }}>{props.t('segmentMine')}</button>
            <button type="button" className={`${css.button}${segment === 'builtin' ? ` ${css.buttonActive}` : ''}`} onClick={() => { switchSegment('builtin') }}>{props.t('segmentBuiltin')}</button>
          </div>
          {segment === 'mine' && (
            <>
              <input className={css.searchInput} aria-label={props.t('searchMethods')} placeholder={props.t('searchMethods')} value={query} onChange={(event) => { setQuery(event.target.value) }} />
              {loadState === 'loading' && <div className={css.muted}>{props.t('reading')}</div>}
              {loadState === 'error' && <div className={css.mutedError}>{props.t('loadError', { path: LIBRARY_PATH, detail: loadError })}</div>}
              {loadState === 'absent' && <div className={css.muted}>{props.t('libraryAbsent', { path: LIBRARY_PATH })}</div>}
              {loadState === 'ok' && filtered.length === 0 && <div className={css.muted}>{entries.length === 0 ? props.t('emptyLibrary') : props.t('noMatchingMethods')}</div>}
              {filtered.map((entry) => (
                <LibraryRow
                  key={entry.name}
                  name={entry.name}
                  summary={summaryOfEntry(entry) ?? props.t('noSummary')}
                  isDefault={entry.isDefault}
                  selected={selectedName === entry.name && segment === 'mine'}
                  t={props.t}
                  onSelect={() => { selectMine(entry) }}
                />
              ))}
            </>
          )}
          {segment === 'builtin' && (
            <>
              {BUILTIN_PREFERENCES.map((entry) => (
                <LibraryRow
                  key={entry.name}
                  name={displayNameOf(entry.name, props.t)}
                  summary={displaySummaryOf(entry.name, props.t)}
                  selected={selectedName === entry.name}
                  t={props.t}
                  onSelect={() => { selectBuiltin(entry.name) }}
                />
              ))}
            </>
          )}
        </aside>
        {!narrowPane && <ColumnHandle onDrag={(delta) => { setLeftWidth((width) => Math.max(120, Math.min(maxLeftWidth, width + delta))) }} value={effectiveLeftWidth} min={120} max={maxLeftWidth} label={props.t('columnResize')} />}
        <main
          id="method-library-workbench-pane"
          data-method-library-pane="workbench"
          className={css.workbenchMain}
          style={{
            display: narrowPane && libraryOpen ? 'none' : 'flex',
            paddingRight: narrowPane ? 0 : 12,
          }}
        >
          {(mode === 'edit' || mode === 'new') && workbenchStage !== 'source' && draft !== null && (
            <MethodSummaryView
              draft={draft}
              mode={mode}
              existingNames={entries.map((entry) => entry.name)}
              stage={workbenchStage}
              manualFields={manual}
              coachFields={coachFields}
              sourceFields={sourceFields}
              onStageChange={setWorkbenchStage}
              onFocusField={(field) => { setActiveField(field); setWorkbenchStage('form-check') }}
              onRestartSource={restartSource}
              onCancel={cancel}
              canSave={canSaveDraft}
              sending={sending || operationUnknown}
              onSave={(asDefault) => { void save(asDefault) }}
              t={props.t}
            />
          )}
          <div className={css.workbenchInner} style={{ overflowY: mode === 'read' || workbenchStage !== 'interview' ? 'auto' : 'hidden' }}>
            {mode === 'read' && segment === 'builtin' && builtin !== null && <BuiltinView entry={builtin} onUse={() => { applyBuiltinReference(builtin) }} useLabel={props.t('useBuiltin')} t={props.t} />}
            {mode === 'read' && segment === 'mine' && selected !== null && <ReadMineView entry={selected} pendingDelete={pendingDelete} sending={sending || operationUnknown} onEdit={beginEdit} onPendingDelete={setPendingDelete} onRemove={(entry) => { void remove(entry) }} onSetDefault={(entry) => { void setDefault(entry) }} onClearDefault={() => { void clearDefault() }} t={props.t} />}
            {mode === 'read' && segment === 'mine' && selected === null && (
              <div className={css.mutedPadTop}>
                {loadState === 'absent'
                  ? props.t('noMethodsHint')
                  : query.trim() !== '' ? props.t('noMatchingMethods') : props.t('pickMethodFromLeft')}
              </div>
            )}
            {mode === 'new' && workbenchStage === 'source' && <SourceSelectionView
              builtinChoices={BUILTIN_PREFERENCES.map((entry) => builtinLibraryEntry(entry, props.t('builtinReadOnly')))}
              runNames={runNames}
              runState={runState}
              selectedRunLoading={selectedRunLoading}
              onCancelRunRead={cancelRunRead}
              selectedBuiltin={selectedBuiltinSource}
              selectedRun={selectedRunSource}
              onSelectBuiltin={setSelectedBuiltinSource}
              onSelectRun={selectRunSource}
              onLoadRuns={loadRunNames}
              onStartBlank={startBlank}
              onStartBuiltin={startBuiltinSource}
              onStartRun={startRunSource}
              onCancel={cancel}
              t={props.t}
            />}
            {(mode === 'edit' || mode === 'new') && workbenchStage === 'form-check' && <EditorView draft={draft} mode={mode} existingNames={entries.map((entry) => entry.name)} sending={sending || operationUnknown} t={props.t} onNameChange={onNameChange} onSectionChange={updateSection} onSave={(asDefault) => { void save(asDefault) }} onCancel={cancel} coachFields={coachFields} manualFields={manual} activeField={activeField} coachUpdated={coachBase !== null} onUndoCoach={undoCoach} />}
            {sessionId !== undefined && (coachVisible || (mode !== 'read' && workbenchStage !== 'source')) && (
              <MethodCoachPanel key={`${sessionId}:${coachEpoch}:${activeDraftKey}`} sessionId={sessionId} draftKey={activeDraftKey ?? 'pending'} visible={(mode === 'edit' || mode === 'new') && workbenchStage === 'interview'} ensure={props.ensureCoach} onCoach={onCoachReady} onError={onCoachError} onStartInterview={startInterview} onInterviewStarted={setInterviewStarted} title={props.t('methodEditorTitle')} startLabel={props.t('startInterview')} readyLabel={props.t('interviewReady')} pendingLabel={props.t('startingInterview')} startedLabel={props.t('interviewStarted')} t={props.t} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
