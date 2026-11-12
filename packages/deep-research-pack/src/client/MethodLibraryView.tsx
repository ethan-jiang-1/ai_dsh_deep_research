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
 * 纯折算与写前/写后核对预算住 `src/lib/`；本组件负责读取、会话生命周期与布局。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { MethodLibraryCoachEvent } from '../lib/method-library-events.ts'
import type { SourcePreview } from '../lib/method-library-source.ts'
import type { MethodLibraryReadResult } from '../lib/method-library-read.ts'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import {
  SECTION_LABELS,
  methodNameIssue,
  summaryOfEntry,
  type LibraryEntry,
} from '../lib/library-fold.ts'
import { BUILTIN_PREFERENCES } from '../lib/config-tables.ts'
import { displayNameOf, displaySummaryOf } from './builtin-display.ts'
import { coachPatchAppliesToDraft, mergeCoachDraft, parseMethodDraft } from '../lib/method-draft.ts'
import { BUTTON_STYLE, HEADER_STYLE, INPUT_STYLE, MUTED_STYLE, PRIMARY_STYLE } from './method-library/styles.ts'
import { BuiltinView, EditorView, LibraryRow, MethodSummaryView, ReadMineView, SourceSelectionView } from './method-library/views.tsx'
import { MethodCoachPanel } from './method-library/coach.tsx'
import { coachContextOf, coachStartAction, manualEditPrompt } from './method-library/coach-prompts.ts'
import { ColumnHandle } from './method-library/ColumnHandle.tsx'
import { useLibraryData } from './method-library/useLibraryData.ts'
import { useRunSourcePicker } from './method-library/useRunSourcePicker.ts'
import { useDraftState } from './method-library/useDraftState.ts'
import { useOperationQueue, useOperationQueueState } from './method-library/useOperationQueue.ts'
import {
  LIBRARY_PATH, builtinLibraryEntry,
  type MethodLibraryOperationRequest,
} from './method-library/model.ts'

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

export type MethodLibraryViewProps = PropsRuntime<'conversation.view'> & PropsLocale<'deepResearchPack'> & MethodLibraryInjected

/**
 * 主界面「方法库」tab。
 * @param props - conversation.view 标准 props + workspace reads and Method Editor session injection.
 */
export function MethodLibraryView(props: MethodLibraryViewProps): ReactNode {
  const sessionId = props.sessionId
  const {
    text, loadState, setLoadState, loadError, setLoadError,
    query, setQuery, segment, setSegment, selectedName, setSelectedName,
    entries, filtered, selected, builtin, applyLibraryRead, load, reset: resetLibrary,
  } = useLibraryData({ sessionId, readLibrary: props.readLibrary })
  const {
    runNames, runState, selectedRunSource, selectedRunLoading,
    loadRunNames, selectRunSource, abort: abortRunRead, reset: resetRunPicker,
    setSelectedRunSource, setSelectedRunLoading,
  } = useRunSourcePicker({
    sessionId, t: props.t, listDir: props.listDir, readPreview: props.readPreview, readLibrary: props.readLibrary,
  })
  // 写操作队列的状态面必须先于 useDraftState 创建：草稿 hook 借用这些 ref/setter 判忙与落回执。
  const {
    pendingOperationRef, queuedOperationRef, queuedOperationTimeoutRef,
    operationUnknown, setOperationUnknown, operationUnknownRef,
    receipt, setReceipt, sending, setSending, pendingDelete, setPendingDelete,
  } = useOperationQueueState()
  const [coachId, setCoachId] = useState<SessionId | null>(null)
  const [selectedBuiltinSource, setSelectedBuiltinSource] = useState<LibraryEntry | null>(null)
  const [narrowPane, setNarrowPane] = useState(false)
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
    if (queuedOperationRef.current === null) return
    if (queuedOperationTimeoutRef.current !== null) clearTimeout(queuedOperationTimeoutRef.current)
    queuedOperationTimeoutRef.current = null
    queuedOperationRef.current = null
    setSending(false)
    setCoachVisible(false)
    setReceipt({ ok: false, detail: props.t('operationFailed', { detail: String(cause) }) })
  }, [props.t])
  const [leftWidth, setLeftWidth] = useState(270)
  const {
    mode, setMode, modeRef, workbenchStage, setWorkbenchStage,
    draft, setDraft, draftRef, draftRevision, setDraftRevision, draftRevisionRef,
    turnBaseRevisionRef, turnAcceptedRevisionRef, lastAssistantSeqRef,
    activeDraftKey, setActiveDraftKey, activeDraftKeyRef,
    manual, manualRef, coachFields, setCoachFields, coachFieldsRef,
    sourceFields, setSourceFields, activeField, setActiveField, activeRef,
    coachBase, setCoachBase, coachBaseRef, previousRef,
    bumpDraftRevision, releaseCoachIfIdle, switchSegment, beginNew, beginEdit,
    selectMine, selectBuiltin, restartSource, useBuiltinReference, startBlank,
    startBuiltinSource, startRunSource, cancel, updateSection, onNameChange, undoCoach,
  } = useDraftState({
    t: props.t,
    segment, entries, selected, setSegment, setSelectedName,
    selectedBuiltinSource, setSelectedBuiltinSource,
    selectedRunSource, setSelectedRunSource, setSelectedRunLoading,
    abortRunRead, setReceipt, setPendingDelete, setLibraryOpen,
    pendingOperationRef, queuedOperationRef,
    coachIdRef, setCoachId, coachReadyRef, setCoachReady, setCoachVisible, activeTurnRef,
  })
  const {
    settleOperation, runOperation, save, remove, setDefault, clearDefault, refresh,
  } = useOperationQueue({
    sessionId, t: props.t, sendCoach: props.sendCoach, readLibrary: props.readLibrary,
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

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia('(max-width: 640px)')
    const sync = (): void => {
      setNarrowPane(query.matches)
      if (!query.matches) setLibraryOpen(false)
    }
    sync()
    query.addEventListener('change', sync)
    return () => { query.removeEventListener('change', sync) }
  }, [])

  useEffect(() => {
    resetRunPicker()
    resetLibrary()
    setMode('read')
    setDraft(null)
    draftRevisionRef.current = 0
    setDraftRevision(0)
    turnBaseRevisionRef.current = null
    turnAcceptedRevisionRef.current = null
    lastAssistantSeqRef.current = -1
    setSourceFields(new Set())
    setWorkbenchStage('interview')
    setActiveDraftKey(null)
    activeDraftKeyRef.current = null
    setPendingDelete(null)
    setReceipt(null)
    setSelectedBuiltinSource(null)
    setCoachId(null)
    coachIdRef.current = null
    setCoachReady(false)
    coachReadyRef.current = false
    setCoachVisible(false)
    coachRetryRef.current = false
    queuedOperationRef.current = null
    if (queuedOperationTimeoutRef.current !== null) clearTimeout(queuedOperationTimeoutRef.current)
    queuedOperationTimeoutRef.current = null
    if (pendingOperationRef.current !== null) clearTimeout(pendingOperationRef.current.timeout)
    pendingOperationRef.current = null
    operationUnknownRef.current = false
    setOperationUnknown(false)
    setSending(false)
    const controller = new AbortController()
    void load(controller.signal)
    return () => {
      controller.abort()
      if (queuedOperationTimeoutRef.current !== null) clearTimeout(queuedOperationTimeoutRef.current)
      if (pendingOperationRef.current !== null) clearTimeout(pendingOperationRef.current.timeout)
    }
  }, [sessionId])

  // 方法编辑首问的上下文：库快照 + 当前草稿 + 内置参考（只读）。只随第一条消息发一次。
  // 文案住 coach-prompts（模型面，不是 UI）——见 BUG-055 的扫描守卫边界。
  const coachContext = coachContextOf({ text, draft, draftRevision, selectedBuiltinSource, selectedRunSource })


  const startInterview = async (id: SessionId): Promise<{ readonly ok: boolean; readonly detail?: string; readonly uncertain?: boolean }> => {
    const action = coachStartAction(selectedRunSource, selectedBuiltinSource)
    const requestId = crypto.randomUUID()
    const result = await props.sendCoach(id, `${coachContext}\n\n${action}`, requestId)
    if (result.ok) return result
    setReceipt({ ok: false, detail: result.uncertain === true ? props.t('operationUnknown') : props.t('operationFailed', { detail: result.detail ?? 'prompt rejected' }) })
    return result
  }

  useEffect(() => {
    if (coachId === null) return undefined
    const controller = new AbortController()
    setCoachReady(false)
    coachReadyRef.current = false
    void props.watchCoach(coachId, controller.signal, (event) => {
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
        if (queuedOperationTimeoutRef.current !== null) clearTimeout(queuedOperationTimeoutRef.current)
        queuedOperationTimeoutRef.current = null
        queuedOperationRef.current = null
        void runOperationRef.current(queued, true)
      }
    }).catch((cause) => {
      if (!controller.signal.aborted) setReceipt({ ok: false, detail: props.t('operationFailed', { detail: String(cause) }) })
    })
    return () => controller.abort()
  }, [coachId, props.watchCoach, props.t])

  // 手改 diff 回传：用户停下 900ms 后，把改动字段作为一条「以用户为准」的消息发给方法编辑。
  useEffect(() => {
    if (coachId === null || manual.size === 0 || draft === null) return undefined
    const handle = setTimeout(() => {
      void props.sendCoach(coachId, manualEditPrompt(draft, manual)).catch(() => { /* fail-soft */ })
    }, 900)
    return () => clearTimeout(handle)
  }, [coachId, draft, manual, props.sendCoach])

  return (
    <div
      data-method-library=""
      data-method-library-edit={mode !== 'read' ? '' : undefined}
      data-method-draft-revision={draftRevision}
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}
    >
      <div style={HEADER_STYLE}>
        <strong style={{ fontSize: 15 }}>{props.t('methodLibrary')}</strong>
        <span style={MUTED_STYLE}>{props.t('librarySharedHint')}</span>
        <span style={{ flex: 1 }} />
        {narrowPane && (
          <button
            type="button"
            data-method-library-toggle=""
            aria-expanded={libraryOpen}
            aria-controls="method-library-library-pane"
            style={BUTTON_STYLE}
            onClick={() => { setLibraryOpen((open) => !open) }}
          >{libraryOpen ? props.t('workbenchPane') : props.t('libraryPane')}</button>
        )}
        <button type="button" style={BUTTON_STYLE} onClick={refresh}>{props.t('refresh')}</button>
        <button type="button" data-method-new="" style={PRIMARY_STYLE} disabled={sending || operationUnknown} onClick={beginNew}>{props.t('newAction')}</button>
      </div>
      {receipt !== null && (
        <div role="status" aria-live="polite" style={{
          padding: '6px 14px', fontSize: 12,
          background: receipt.ok ? 'color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)' : 'color-mix(in srgb, var(--dsw-alias-label-error) 10%, transparent)',
          borderBottom: `1px solid ${receipt.ok ? 'var(--dsw-alias-border-l2)' : 'var(--dsw-alias-label-error)'}`,
          color: receipt.ok ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-label-error)',
        }}>{receipt.ok ? '✓' : '✕'} {receipt.detail}</div>
      )}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
        <aside
          id="method-library-library-pane"
          data-method-library-pane="library"
          style={{
            display: !narrowPane || libraryOpen ? 'block' : 'none',
            flex: narrowPane ? '1 1 auto' : `0 0 min(${leftWidth}px, 38vw)`,
            width: narrowPane ? '100%' : undefined,
            minWidth: narrowPane ? 0 : 120,
            borderRight: narrowPane ? 'none' : '1px solid var(--dsw-alias-border-l1)',
            padding: 10, overflowY: 'auto', boxSizing: 'border-box', position: 'relative', zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button type="button" style={{ ...BUTTON_STYLE, ...(segment === 'mine' ? { borderColor: 'var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-brand-primary)' } : {}) }} onClick={() => { switchSegment('mine') }}>{props.t('segmentMine')}</button>
            <button type="button" style={{ ...BUTTON_STYLE, ...(segment === 'builtin' ? { borderColor: 'var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-brand-primary)' } : {}) }} onClick={() => { switchSegment('builtin') }}>{props.t('segmentBuiltin')}</button>
          </div>
          {segment === 'mine' && (
            <>
              <input style={{ ...INPUT_STYLE, marginBottom: 8 }} aria-label={props.t('searchMethods')} placeholder={props.t('searchMethods')} value={query} onChange={(event) => { setQuery(event.target.value) }} />
              {loadState === 'loading' && <div style={MUTED_STYLE}>{props.t('reading')}</div>}
              {loadState === 'error' && <div style={{ ...MUTED_STYLE, color: 'var(--dsw-alias-label-error)' }}>{props.t('loadError', { path: LIBRARY_PATH, detail: loadError })}</div>}
              {loadState === 'absent' && <div style={MUTED_STYLE}>{props.t('libraryAbsent', { path: LIBRARY_PATH })}</div>}
              {loadState === 'ok' && filtered.length === 0 && <div style={MUTED_STYLE}>{entries.length === 0 ? props.t('emptyLibrary') : props.t('noMatchingMethods')}</div>}
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
        {!narrowPane && <ColumnHandle onDrag={(delta) => { setLeftWidth((width) => Math.max(120, Math.min(420, width + delta))) }} value={leftWidth} min={120} max={420} label={props.t('columnResize')} />}
        <main
          id="method-library-workbench-pane"
          data-method-library-pane="workbench"
          style={{
            flex: '1 1 420px', minWidth: 0, minHeight: 0, display: narrowPane && libraryOpen ? 'none' : 'flex',
            flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box',
            paddingRight: narrowPane ? 0 : 12,
          }}
        >
          {(mode === 'edit' || mode === 'new') && workbenchStage !== 'source' && draft !== null && (
            <MethodSummaryView draft={draft} stage={workbenchStage} manualFields={manual} coachFields={coachFields} sourceFields={sourceFields} onStageChange={setWorkbenchStage} onFocusField={(field) => { setActiveField(field); setWorkbenchStage('form-check') }} onRestartSource={restartSource} canSave={canSaveDraft} sending={sending || operationUnknown} onSave={(setDefault) => { void save(setDefault) }} t={props.t} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, padding: 14, overflowY: mode === 'read' || workbenchStage !== 'interview' ? 'auto' : 'hidden', boxSizing: 'border-box' }}>
            {mode === 'read' && segment === 'builtin' && builtin !== null && <BuiltinView entry={builtin} onUse={() => { useBuiltinReference(builtin) }} useLabel={props.t('useBuiltin')} t={props.t} />}
            {mode === 'read' && segment === 'mine' && selected !== null && <ReadMineView entry={selected} pendingDelete={pendingDelete} sending={sending || operationUnknown} onEdit={beginEdit} onPendingDelete={setPendingDelete} onRemove={(entry) => { void remove(entry) }} onSetDefault={(entry) => { void setDefault(entry) }} onClearDefault={() => { void clearDefault() }} t={props.t} />}
            {mode === 'read' && segment === 'mine' && selected === null && (
              <div style={{ ...MUTED_STYLE, paddingTop: 20 }}>
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
              onCancelRunRead={abortRunRead}
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
            {(mode === 'edit' || mode === 'new') && workbenchStage === 'form-check' && <EditorView draft={draft} mode={mode} sending={sending || operationUnknown} t={props.t} onNameChange={onNameChange} onSectionChange={updateSection} onSave={(setDefault) => { void save(setDefault) }} onCancel={cancel} coachFields={coachFields} manualFields={manual} activeField={activeField} coachUpdated={coachBase !== null} onUndoCoach={undoCoach} />}
            {sessionId !== undefined && (coachVisible || (mode !== 'read' && workbenchStage !== 'source')) && (
              <MethodCoachPanel key={`${sessionId}:${coachEpoch}:${activeDraftKey}`} sessionId={sessionId} draftKey={activeDraftKey ?? 'pending'} visible={(mode === 'edit' || mode === 'new') && workbenchStage === 'interview'} ensure={props.ensureCoach} onCoach={onCoachReady} onError={onCoachError} onStartInterview={startInterview} title={props.t('methodEditorTitle')} startLabel={props.t('startInterview')} readyLabel={props.t('interviewReady')} pendingLabel={props.t('startingInterview')} startedLabel={props.t('interviewStarted')} t={props.t} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
