// useOperationQueue.ts — 方法库写操作队列：一次只允许一个显式写操作，从发送走到结算或结果未知。
//
// 从 MethodLibraryView.tsx 拆出（2026-11-03 审计 P4 续拆）。同文件两半，调用顺序是硬约束：
// - `useOperationQueueState`：队列自己的 state/refs，必须在 `useDraftState` **之前**调用——
//   草稿 hook 借用 pending/queued 操作 ref 判忙，并借用 `setReceipt`/`setPendingDelete` 落回执；
// - `useOperationQueue`：八个动作，必须在 `useDraftState` **之后**调用——它们要读草稿的
//   mode/draft/refs 与 `releaseCoachIfIdle`。状态面与行为面分开，只为解开这个方向环。
//
// 八个函数体逐字搬自组件，只把 `props.t` / `props.readLibrary` / `props.sendCoach` 换成 deps
// 同名；setState 顺序、timeout 时序与文案 key 未动。`runOperationRef.current = runOperation`
// 仍由组件在 hook 返回后赋值。coach 事件流 effect、`startInterview`、首问上下文与复位 effect
// 仍留组件（时序敏感）。
import { useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { foldLibrary, renderLibraryEntry, type LibraryEntry } from '../../lib/library-fold.ts'
import { methodLibraryCommandText } from '../../lib/method-library-operation.ts'
import { methodLibraryEntryHash } from '../../lib/method-library-hash.ts'
import type { MethodLibraryReadResult } from '../../lib/method-library-read.ts'
import {
  expectedMethodLibrarySnapshot, methodLibraryMatchesSnapshot, methodLibrarySettlement,
  methodLibrarySnapshot, shouldStartFreshDraftContext,
} from '../../lib/method-library-operation-state.ts'
import {
  LIBRARY_PATH, missingSectionKeys, operationMetadataMatches,
  type LoadState, type MethodLibraryOperationRequest, type Mode, type OperationOutcome,
  type PendingMethodOperation, type Receipt,
} from './model.ts'
import type { Draft } from './views.tsx'
import {
  clearDefaultOperationInstruction, removeOperationInstruction, saveOperationInstruction, setDefaultOperationInstruction,
} from './operation-prompts.ts'

/** 四字段标签的字典键（UI 回执按 locale 取词；file-format 标签仍住 library-fold）。 */
const SECTION_LABEL_KEYS = {
  source: 'sectionSource',
  verify: 'sectionVerify',
  report: 'sectionReport',
  limit: 'sectionLimit',
} as const

/** 写操作队列的状态面；`useOperationQueue` 借用同一批 ref/setter（不复制、不重建）。 */
export interface OperationQueueState {
  readonly pendingOperationRef: MutableRefObject<PendingMethodOperation | null>
  readonly queuedOperationRef: MutableRefObject<MethodLibraryOperationRequest | null>
  readonly queuedOperationTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  readonly operationUnknown: boolean
  readonly setOperationUnknown: (unknown: boolean) => void
  readonly operationUnknownRef: MutableRefObject<boolean>
  readonly receipt: Receipt | null
  readonly setReceipt: (receipt: Receipt | null) => void
  readonly sending: boolean
  readonly setSending: (sending: boolean) => void
  readonly pendingDelete: string | null
  readonly setPendingDelete: (name: string | null) => void
}

export function useOperationQueueState(): OperationQueueState {
  const pendingOperationRef = useRef<PendingMethodOperation | null>(null)
  const queuedOperationRef = useRef<MethodLibraryOperationRequest | null>(null)
  const queuedOperationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [operationUnknown, setOperationUnknown] = useState(false)
  const operationUnknownRef = useRef(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [sending, setSending] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  return {
    pendingOperationRef, queuedOperationRef, queuedOperationTimeoutRef,
    operationUnknown, setOperationUnknown, operationUnknownRef,
    receipt, setReceipt, sending, setSending, pendingDelete, setPendingDelete,
  }
}

/** 行为面依赖：队列状态面 + 库读取/草稿/coach 的当前值与动作（组件注入）。 */
export interface OperationQueueDeps {
  readonly sessionId: SessionId | undefined
  readonly t: TranslateNS<'deepResearchPack'>
  readonly sendCoach: (sessionId: SessionId, text: string, requestId?: string) => Promise<{ readonly ok: boolean; readonly detail?: string; readonly uncertain?: boolean }>
  readonly readLibrary: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<MethodLibraryReadResult>
  readonly text: string | null
  readonly loadState: LoadState
  readonly setLoadState: (state: LoadState) => void
  readonly setLoadError: (error: string | null) => void
  readonly applyLibraryRead: (result: MethodLibraryReadResult) => string | null
  readonly load: (signal: AbortSignal) => Promise<MethodLibraryReadResult | null>
  readonly mode: Mode
  readonly draft: Draft | null
  readonly setMode: (mode: Mode) => void
  readonly setDraft: (draft: Draft | null) => void
  readonly setSelectedName: (name: string | null) => void
  readonly modeRef: MutableRefObject<Mode>
  readonly draftRef: MutableRefObject<Draft | null>
  readonly activeDraftKeyRef: MutableRefObject<string | null>
  readonly setActiveDraftKey: (key: string | null) => void
  readonly releaseCoachIfIdle: () => void
  readonly coachIdRef: MutableRefObject<SessionId | null>
  readonly setCoachId: (id: SessionId | null) => void
  readonly coachReadyRef: MutableRefObject<boolean>
  readonly setCoachReady: (ready: boolean) => void
  readonly setCoachVisible: (visible: boolean) => void
  readonly coachRetryRef: MutableRefObject<boolean>
  readonly setCoachEpoch: (update: (epoch: number) => number) => void
  readonly pendingOperationRef: MutableRefObject<PendingMethodOperation | null>
  readonly queuedOperationRef: MutableRefObject<MethodLibraryOperationRequest | null>
  readonly queuedOperationTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  readonly operationUnknownRef: MutableRefObject<boolean>
  readonly setOperationUnknown: (unknown: boolean) => void
  readonly setReceipt: (receipt: Receipt | null) => void
  readonly setSending: (sending: boolean) => void
  readonly setPendingDelete: (name: string | null) => void
}

export function useOperationQueue(deps: OperationQueueDeps) {
  const {
    sessionId, t, sendCoach, readLibrary, text, loadState, setLoadState, setLoadError,
    applyLibraryRead, load, mode, draft, setMode, setDraft, setSelectedName,
    modeRef, draftRef, activeDraftKeyRef, setActiveDraftKey, releaseCoachIfIdle,
    coachIdRef, setCoachId, coachReadyRef, setCoachReady, setCoachVisible,
    coachRetryRef, setCoachEpoch,
    pendingOperationRef, queuedOperationRef, queuedOperationTimeoutRef,
    operationUnknownRef, setOperationUnknown, setReceipt, setSending, setPendingDelete,
  } = deps

  const markOperationUnknown = (operation: PendingMethodOperation): void => {
    if (pendingOperationRef.current !== operation) return
    clearTimeout(operation.timeout)
    operationUnknownRef.current = true
    setOperationUnknown(true)
    setSending(false)
    setReceipt({ ok: false, detail: t('operationUnknown') })
  }

  const settleOperation = async (operation: PendingMethodOperation, outcome: OperationOutcome): Promise<void> => {
    if (pendingOperationRef.current !== operation) return
    let current: MethodLibraryReadResult
    try {
      current = await readLibrary(operation.sourceSessionId, LIBRARY_PATH, new AbortController().signal)
    } catch (cause) {
      markOperationUnknown(operation)
      setLoadError(String(cause))
      return
    }
    if (pendingOperationRef.current !== operation) return
    if (current.kind === 'error') {
      if (sessionId === operation.sourceSessionId) applyLibraryRead(current)
      markOperationUnknown(operation)
      return
    }
    const currentText = current.kind === 'ok' ? current.text : null
    if (sessionId === operation.sourceSessionId) applyLibraryRead(current)
    const reached = methodLibraryMatchesSnapshot(currentText, operation.expected)
    const unchanged = JSON.stringify(methodLibrarySnapshot(currentText)) === JSON.stringify(methodLibrarySnapshot(operation.priorText))
    const metadataMatches = outcome.kind === 'tool-result' && operationMetadataMatches(operation, outcome.result)
    const settlement = methodLibrarySettlement({
      outcome: outcome.kind === 'tool-result' ? outcome.failed ? 'tool-error' : 'tool-success' : outcome.kind,
      targetReached: reached,
      unchanged,
      metadataMatches,
      callIdObserved: operation.callId !== undefined,
    })
    if (settlement === 'unknown') {
      clearTimeout(operation.timeout)
      operationUnknownRef.current = true
      setOperationUnknown(true)
      setSending(false)
      setReceipt({ ok: false, detail: (outcome.kind === 'turn-end' || outcome.kind === 'refresh') && reached
        ? t('operationTargetMatchesUnknown')
        : t('operationUnknown') })
      return
    }
    if (settlement === 'verified') {
      clearTimeout(operation.timeout)
      pendingOperationRef.current = null
      operationUnknownRef.current = false
      if (sessionId !== operation.sourceSessionId) return
      setOperationUnknown(false)
      setSending(false)
      releaseCoachIfIdle()
      if (operation.action === 'remove') {
        setPendingDelete(null)
        setSelectedName(null)
        setMode('read')
        setDraft(null)
        releaseCoachIfIdle()
        setReceipt({ ok: true, detail: t('removed', { name: operation.name ?? '' }) })
      } else if (operation.action === 'save' || operation.action === 'save-and-set-default') {
        setMode('read')
        setSelectedName(operation.name ?? null)
        setDraft(null)
        releaseCoachIfIdle()
        setReceipt({
          ok: true,
          detail: operation.action === 'save-and-set-default'
            ? t('defaultSet', { name: operation.name ?? '' })
            : t('saved', { name: operation.name ?? '' }),
        })
      } else if (operation.action === 'set-default') {
        setReceipt({ ok: true, detail: t('defaultSet', { name: operation.name ?? '' }) })
      } else {
        setReceipt({ ok: true, detail: t('defaultCleared') })
      }
      return
    }
    if (settlement === 'rejected') {
      clearTimeout(operation.timeout)
      pendingOperationRef.current = null
      operationUnknownRef.current = false
      if (sessionId !== operation.sourceSessionId) return
      setOperationUnknown(false)
      setSending(false)
      releaseCoachIfIdle()
      setReceipt({ ok: false, detail: t('noVerifiedChange') })
      return
    }
    markOperationUnknown(operation)
  }

  const runOperation = async (input: MethodLibraryOperationRequest, resume = false): Promise<void> => {
    if (pendingOperationRef.current !== null || operationUnknownRef.current || queuedOperationRef.current !== null) {
      setReceipt({ ok: false, detail: t('operationUnknown') })
      return
    }
    let draftKey = activeDraftKeyRef.current
    if (shouldStartFreshDraftContext({ mode: modeRef.current, draftKey, resume })) {
      draftKey = crypto.randomUUID()
      activeDraftKeyRef.current = draftKey
      setActiveDraftKey(draftKey)
      coachIdRef.current = null
      setCoachId(null)
      coachReadyRef.current = false
      setCoachReady(false)
    }
    const activeCoachId = coachIdRef.current
    if (resume && (activeCoachId === null || !coachReadyRef.current)) {
      setSending(false)
      setReceipt({ ok: false, detail: t('operationUnknown') })
      return
    }
    if (activeCoachId === null || !coachReadyRef.current) {
      queuedOperationRef.current = input
      if (coachRetryRef.current) {
        coachRetryRef.current = false
        setCoachEpoch((epoch) => epoch + 1)
      }
      setCoachVisible(true)
      setSending(true)
      setReceipt({ ok: true, detail: t('operationSent') })
      queuedOperationTimeoutRef.current = setTimeout(() => {
        if (queuedOperationRef.current !== input) return
        queuedOperationRef.current = null
        setSending(false)
        setCoachVisible(false)
        setReceipt({ ok: false, detail: t('editorUnavailable') })
      }, 30000)
      return
    }
    if (sessionId === undefined) return
    let baseline: string | null
    try {
      const read = await readLibrary(sessionId, LIBRARY_PATH, new AbortController().signal)
      if (read.kind === 'error') {
        applyLibraryRead(read)
        setReceipt({ ok: false, detail: t('loadBeforeWrite') })
        return
      }
      baseline = read.kind === 'ok' ? read.text : null
      applyLibraryRead(read)
    } catch {
      setReceipt({ ok: false, detail: t('loadBeforeWrite') })
      return
    }
    const targetMatches = input.name === undefined ? [] : foldLibrary(baseline).filter((entry) => entry.name === input.name)
    if (targetMatches.length > 1) {
      setReceipt({ ok: false, detail: t('duplicateNames') })
      return
    }
    if (input.action === 'save' || input.action === 'save-and-set-default') {
      const currentDraftName = draftRef.current?.currentName
      const renaming = currentDraftName !== undefined && currentDraftName !== input.name
      if (targetMatches.length === 1 && (modeRef.current === 'new' || renaming) && input.confirmOverwrite !== true) {
        setReceipt({ ok: false, detail: t('overwriteNotConfirmed') })
        return
      }
    }
    const expected = expectedMethodLibrarySnapshot({
      before: baseline,
      action: input.action,
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.entryText === undefined ? {} : { entryText: input.entryText }),
    })
    if (expected === null) {
      setReceipt({ ok: false, detail: t('operationTargetChanged') })
      return
    }
    const operationId = crypto.randomUUID()
    const requestId = crypto.randomUUID()
    let payloadHash: string | undefined
    try {
      payloadHash = input.entryText === undefined ? undefined : await methodLibraryEntryHash(input.entryText)
    } catch (cause) {
      setReceipt({ ok: false, detail: t('operationFailed', { detail: String(cause) }) })
      return
    }
    const command = {
      operationId,
      action: input.action,
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(payloadHash === undefined ? {} : { payloadHash }),
    }
    const marker = methodLibraryCommandText(command)
    const envelope = `${marker}\n${input.instruction}`
    const operation = {
      ...command,
      sourceSessionId: sessionId,
      requestId,
      turn: null,
      expected,
      priorText: baseline,
      timeout: setTimeout(() => { markOperationUnknown(operation) }, 120000),
    } satisfies PendingMethodOperation
    pendingOperationRef.current = operation
    operationUnknownRef.current = false
    setOperationUnknown(false)
    setSending(true)
    setReceipt({ ok: true, detail: t('operationSent') })
    const sent = await sendCoach(activeCoachId, envelope, requestId)
    if (sent.ok) return
    if (sent.uncertain === true) {
      markOperationUnknown(operation)
      return
    }
    clearTimeout(operation.timeout)
    pendingOperationRef.current = null
    setSending(false)
    releaseCoachIfIdle()
    setReceipt({ ok: false, detail: t('operationFailed', { detail: sent.detail ?? 'prompt rejected' }) })
  }

  const save = async (setDefault: boolean): Promise<void> => {
    if (draft === null) return
    const name = draft.name.trim()
    if (name === '') {
      setReceipt({ ok: false, detail: t('nameRequired') })
      return
    }
    const missing = missingSectionKeys(draft).map((key) => t(SECTION_LABEL_KEYS[key]))
    if (missing.length > 0) {
      setReceipt({ ok: false, detail: t('missingFields', { fields: missing.join(t('listSeparator')) }) })
      return
    }
    if (loadState !== 'ok' && loadState !== 'absent') {
      setReceipt({ ok: false, detail: t('loadBeforeWrite') })
      return
    }
    if (mode === 'edit' && draft.currentName !== undefined && draft.currentName !== name) {
      setReceipt({ ok: false, detail: t('renameInEdit') })
      return
    }
    const existingEntries = foldLibrary(text).filter((entry) => entry.name === name)
    if (existingEntries.length > 1) {
      setReceipt({ ok: false, detail: t('duplicateNames') })
      return
    }
    if (existingEntries.length === 1 && mode === 'new') {
      const confirmed = typeof window === 'undefined'
        ? true
        : window.confirm(t('overwriteConfirm', { name }))
      if (!confirmed) {
        setReceipt({ ok: false, detail: t('unsavedDuplicate', { name }) })
        return
      }
    }
    const entryText = [
      renderLibraryEntry({ name, sections: draft.sections, provenance: draft.provenance }),
      ...(draft.legacyText !== null && draft.legacyText.trim() !== '' ? [draft.legacyText.trim()] : []),
    ].join('\n')
    const saveAction = setDefault ? 'save-and-set-default' : 'save'
    await runOperation({
      action: saveAction,
      name,
      entryText,
      confirmOverwrite: existingEntries.length === 1 && mode === 'new',
      instruction: saveOperationInstruction({ name, entryText, setDefault, mode }),
    })
  }

  const remove = async (entry: LibraryEntry): Promise<void> => {
    await runOperation({
      action: 'remove',
      name: entry.name,
      instruction: removeOperationInstruction(entry.name),
    })
  }

  const setDefault = async (entry: LibraryEntry): Promise<void> => {
    await runOperation({
      action: 'set-default',
      name: entry.name,
      instruction: setDefaultOperationInstruction(entry.name),
    })
  }

  const clearDefault = async (): Promise<void> => {
    await runOperation({
      action: 'clear-default',
      instruction: clearDefaultOperationInstruction(),
    })
  }

  const refresh = (): void => {
    const controller = new AbortController()
    setLoadState('loading')
    void (async () => {
      const result = await load(controller.signal)
      const operation = pendingOperationRef.current
      if (operation !== null && operationUnknownRef.current && result !== null) {
        await settleOperation(operation, { kind: 'refresh' })
      }
    })()
  }

  return {
    settleOperation, runOperation, save, remove, setDefault, clearDefault, refresh,
  }
}
