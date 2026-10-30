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
import type { MethodLibraryAction } from '../lib/method-library-operation.ts'
import { methodLibraryCommandText } from '../lib/method-library-operation.ts'
import type { MethodLibraryCoachEvent } from '../lib/method-library-events.ts'
import { methodLibraryEntryHash } from '../lib/method-library-hash.ts'
import { isCompletedMethodSourceRun, latestFinalVersion, type SourcePreview } from '../lib/method-library-source.ts'
import type { MethodLibraryReadResult } from '../lib/method-library-read.ts'
import { expectedMethodLibrarySnapshot, methodLibraryMatchesSnapshot, methodLibrarySettlement, methodLibrarySnapshot } from '../lib/method-library-operation-state.ts'
import type { MethodLibrarySnapshot } from '../lib/method-library-operation-state.ts'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import {
  SECTION_LABELS,
  foldLibrary,
  renderLibraryEntry,
  summaryOfEntry,
  type LibraryEntry,
  type LibrarySections,
} from '../lib/library-fold.ts'
import { BUILTIN_PREFERENCES } from '../lib/config-tables.ts'
import { FIELD_LABELS, FIELD_ORDER, coachPatchAppliesToDraft, mergeCoachDraft, parseMethodDraft, type DraftField } from '../lib/method-draft.ts'
import { BUTTON_STYLE, HEADER_STYLE, INPUT_STYLE, MUTED_STYLE, PRIMARY_STYLE, ROW_STYLE } from './method-library/styles.ts'
import { BuiltinView, EditorView, MethodSummaryView, ReadMineView, SourceSelectionView, type Draft, type RunSourceCandidate, type WorkbenchStage } from './method-library/views.tsx'
import { MethodCoachPanel } from './method-library/coach.tsx'

const LIBRARY_PATH = 'method-library.md'

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

type Mode = 'read' | 'edit' | 'new'
type Segment = 'mine' | 'builtin'
type LoadState = 'loading' | 'ok' | 'absent' | 'error'

interface Receipt {
  readonly ok: boolean
  readonly detail: string
}

interface MethodLibraryOperationRequest {
  readonly action: MethodLibraryAction
  readonly name?: string
  readonly entryText?: string
  readonly confirmOverwrite?: boolean
  readonly instruction: string
}

interface PendingMethodOperation {
  readonly operationId: string
  readonly sourceSessionId: SessionId
  readonly requestId: string
  turn: number | null
  readonly action: MethodLibraryAction
  readonly name?: string
  readonly entryText?: string
  readonly payloadHash?: string
  readonly expected: MethodLibrarySnapshot
  readonly priorText: string | null
  callId?: string
  timeout: ReturnType<typeof setTimeout>
}

type OperationOutcome =
  | { readonly kind: 'tool-result'; readonly failed: boolean; readonly result: unknown }
  | { readonly kind: 'turn-end' | 'refresh' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function expectedDefaults(operation: PendingMethodOperation): string[] {
  return operation.expected.filter((entry) => entry.isDefault).map((entry) => entry.name)
}

function operationMetadataMatches(operation: PendingMethodOperation, value: unknown): boolean {
  if (!isRecord(value) || value['operationId'] !== operation.operationId) return false
  const defaults = expectedDefaults(operation)
  if (!Array.isArray(value['defaults']) || JSON.stringify(value['defaults']) !== JSON.stringify(defaults)) return false
  switch (operation.action) {
    case 'save':
    case 'save-and-set-default':
      return value['name'] === operation.name
        && (value['action'] === 'created' || value['action'] === 'updated')
        && value['isDefault'] === (operation.expected.find((entry) => entry.name === operation.name)?.isDefault === true)
    case 'set-default':
      return value['action'] === 'set' && value['name'] === operation.name
    case 'clear-default':
      return value['action'] === 'clear'
    case 'remove':
      return value['name'] === operation.name && value['removed'] === true
  }
}

/** 空四字段草稿。 */
function emptySections(): LibrarySections {
  return { source: null, verify: null, report: null, limit: null }
}

/** Built-in read-only preference projected as a user-library source. */
function builtinLibraryEntry(entry: (typeof BUILTIN_PREFERENCES)[number]): LibraryEntry {
  return { name: entry.name, provenance: '内置只读', sections: entry.sections, legacyText: null, isDefault: false }
}

/** 草稿是否与源条目一致（粗糙但够用的 dirty 判据：用于离开确认，不用于保存）。 */
function draftOf(entry: LibraryEntry): Draft {
  return {
    name: entry.name,
    sections: entry.sections,
    currentName: entry.name,
    provenance: entry.provenance,
    legacyText: entry.legacyText,
  }
}

/**
 * 主界面「方法库」tab。
 * @param props - conversation.view 标准 props + workspace reads and Method Editor session injection.
 */
function ColumnHandle({ onDrag, value, min, max }: {
  onDrag: (delta: number) => void
  value: number
  min: number
  max: number
}): ReactNode {
  const lastX = useRef<number | null>(null)
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="调整方法库列宽"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') onDrag(-16)
        if (event.key === 'ArrowRight') onDrag(16)
      }}
      style={{ flex: '0 0 5px', cursor: 'col-resize', background: 'transparent', position: 'relative', zIndex: 2, touchAction: 'none' }}
      onPointerDown={(event) => {
        event.preventDefault()
        lastX.current = event.clientX
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (lastX.current === null) return
        const delta = event.clientX - lastX.current
        lastX.current = event.clientX
        onDrag(delta)
      }}
      onPointerUp={() => { lastX.current = null }}
      onPointerCancel={() => { lastX.current = null }}
    >
      <div style={{ position: 'absolute', left: 2, top: 0, bottom: 0, width: 1, background: 'var(--dsw-alias-border-l1)' }} />
    </div>
  )
}

export function MethodLibraryView(props: MethodLibraryViewProps): ReactNode {
  const sessionId = props.sessionId
  const [text, setText] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [segment, setSegment] = useState<Segment>('mine')
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('read')
  const modeRef = useRef<Mode>('read')
  const [workbenchStage, setWorkbenchStage] = useState<WorkbenchStage>('interview')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [draftRevision, setDraftRevision] = useState(0)
  const draftRevisionRef = useRef(0)
  const turnBaseRevisionRef = useRef<number | null>(null)
  const turnAcceptedRevisionRef = useRef<number | null>(null)
  const lastAssistantSeqRef = useRef(-1)
  const [activeDraftKey, setActiveDraftKey] = useState<string | null>(null)
  const activeDraftKeyRef = useRef<string | null>(null)
  const [coachId, setCoachId] = useState<SessionId | null>(null)
  const [manual, setManual] = useState<ReadonlySet<DraftField>>(() => new Set())
  const [coachFields, setCoachFields] = useState<ReadonlySet<DraftField>>(() => new Set())
  const [sourceFields, setSourceFields] = useState<ReadonlySet<DraftField>>(() => new Set())
  const [activeField, setActiveField] = useState<DraftField | null>(null)
  const [coachBase, setCoachBase] = useState<LibraryEntry | null>(null)
  const [runNames, setRunNames] = useState<readonly string[]>([])
  const [runState, setRunState] = useState<'idle' | 'loading' | 'ready' | 'error' | 'cancelled'>('idle')
  const [selectedBuiltinSource, setSelectedBuiltinSource] = useState<LibraryEntry | null>(null)
  const [selectedRunSource, setSelectedRunSource] = useState<RunSourceCandidate | null>(null)
  const [selectedRunLoading, setSelectedRunLoading] = useState(false)
  const sourceReadControllerRef = useRef<AbortController | null>(null)
  const previousRef = useRef<{
    draft: Draft
    manual: ReadonlySet<DraftField>
    coachFields: ReadonlySet<DraftField>
    active: DraftField | null
    base: LibraryEntry | null
  } | null>(null)
  const draftRef = useRef<Draft | null>(null)
  const manualRef = useRef<ReadonlySet<DraftField>>(manual)
  const coachFieldsRef = useRef<ReadonlySet<DraftField>>(coachFields)
  const activeRef = useRef<DraftField | null>(activeField)
  const coachBaseRef = useRef<LibraryEntry | null>(coachBase)
  const pendingOperationRef = useRef<PendingMethodOperation | null>(null)
  const queuedOperationRef = useRef<MethodLibraryOperationRequest | null>(null)
  const queuedOperationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [coachReady, setCoachReady] = useState(false)
  const coachReadyRef = useRef(false)
  const coachIdRef = useRef<SessionId | null>(coachId)
  const activeTurnRef = useRef<number | null>(null)
  const [coachVisible, setCoachVisible] = useState(false)
  const [coachEpoch, setCoachEpoch] = useState(0)
  const coachRetryRef = useRef(false)
  const runOperationRef = useRef<(input: MethodLibraryOperationRequest) => Promise<void>>(async () => {})
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
  const [operationUnknown, setOperationUnknown] = useState(false)
  const operationUnknownRef = useRef(false)
  draftRef.current = draft
  manualRef.current = manual
  coachFieldsRef.current = coachFields
  activeRef.current = activeField
  coachBaseRef.current = coachBase
  modeRef.current = mode
  coachIdRef.current = coachId
  coachReadyRef.current = coachReady
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [sending, setSending] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [leftWidth, setLeftWidth] = useState(270)

  const entries = foldLibrary(text)
  const filtered = entries.filter((entry) => {
    if (query.trim() === '') return true
    const q = query.trim().toLowerCase()
    return entry.name.toLowerCase().includes(q) || (summaryOfEntry(entry) ?? '').toLowerCase().includes(q)
  })
  const selected = (segment === 'mine' && query.trim() !== ''
    ? filtered.find((entry) => entry.name === selectedName)
    : entries.find((entry) => entry.name === selectedName)) ?? null
  const builtin = segment === 'builtin'
    ? BUILTIN_PREFERENCES.find((entry) => entry.name === selectedName) ?? null
    : null
  const canSaveDraft = draft !== null
    && draft.name.trim() !== ''
    && SECTION_LABELS.every(({ key }) => (draft.sections[key] ?? '').trim() !== '')

  const applyLibraryRead = (result: MethodLibraryReadResult): string | null => {
    if (result.kind === 'absent') {
      setText(null)
      setLoadState('absent')
      setLoadError(null)
      return null
    }
    if (result.kind === 'error') {
      setText(null)
      setLoadState('error')
      setLoadError(result.detail)
      return null
    }
    setText(result.text)
    setLoadState('ok')
    setLoadError(null)
    return result.text
  }

  const load = async (signal: AbortSignal): Promise<MethodLibraryReadResult | null> => {
    if (sessionId === undefined) return null
    try {
      const result = await props.readLibrary(sessionId, LIBRARY_PATH, signal)
      if (signal.aborted) return null
      applyLibraryRead(result)
      return result
    } catch (cause) {
      if (signal.aborted) return null
      const result = { kind: 'error' as const, detail: String(cause) }
      applyLibraryRead(result)
      return result
    }
  }

  useEffect(() => {
    sourceReadControllerRef.current?.abort()
    setMode('read')
    setSegment('mine')
    setSelectedName(null)
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
    setLoadError(null)
    setRunNames([])
    setRunState('idle')
    setSelectedBuiltinSource(null)
    setSelectedRunSource(null)
    setSelectedRunLoading(false)
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
    setLoadState('loading')
    void load(controller.signal)
    return () => {
      controller.abort()
      if (queuedOperationTimeoutRef.current !== null) clearTimeout(queuedOperationTimeoutRef.current)
      if (pendingOperationRef.current !== null) clearTimeout(pendingOperationRef.current.timeout)
    }
  }, [sessionId])

  useEffect(() => {
    if (entries.length === 0) {
      setSelectedName(null)
      return
    }
    if (selectedName === null || !entries.some((entry) => entry.name === selectedName)) {
      setSelectedName(entries[0]?.name ?? null)
    }
  }, [text])

  const bumpDraftRevision = (): number => {
    const next = draftRevisionRef.current + 1
    draftRevisionRef.current = next
    setDraftRevision(next)
    return next
  }

  const resetDraftRevision = (): void => {
    draftRevisionRef.current = 0
    setDraftRevision(0)
    turnBaseRevisionRef.current = null
    turnAcceptedRevisionRef.current = null
    lastAssistantSeqRef.current = -1
  }

  const dirty = (() => {
    if (draft === null || mode === 'read') return false
    if (mode === 'new') {
      return selectedBuiltinSource !== null || selectedRunSource !== null
        || draft.name.trim() !== '' || SECTION_LABELS.some(({ key }) => draft.sections[key] !== null)
    }
    if (selected === null) return true
    return draft.name !== selected.name
      || SECTION_LABELS.some(({ key }) => (draft.sections[key] ?? '') !== (selected.sections[key] ?? ''))
  })()
  const confirmDiscard = (): boolean => {
    if (!dirty) return true
    return typeof window === 'undefined' ? true : window.confirm('放弃未保存的修改？')
  }

  const operationLocked = (): boolean => {
    if (pendingOperationRef.current === null && queuedOperationRef.current === null) return false
    setReceipt({ ok: false, detail: props.t('operationInProgress') })
    return true
  }

  const switchSegment = (next: Segment): void => {
    if (segment === next || operationLocked()) return
    if (!confirmDiscard()) return
    setSegment(next)
    setSelectedName(next === 'mine' ? entries[0]?.name ?? null : BUILTIN_PREFERENCES[0]?.name ?? null)
    setMode('read')
    setDraft(null)
    setSelectedBuiltinSource(null)
    setSelectedRunSource(null)
    setPendingDelete(null)
    clearCoachFill()
    releaseCoachIfIdle()
  }

  const releaseCoachIfIdle = (): void => {
    setCoachVisible(false)
    if (pendingOperationRef.current !== null) return
    coachIdRef.current = null
    setCoachId(null)
    coachReadyRef.current = false
    setCoachReady(false)
    activeTurnRef.current = null
  }

  const beginNew = (): void => {
    if (operationLocked() || !confirmDiscard()) return
    releaseCoachIfIdle()
    resetDraftRevision()
    setSegment('mine')
    setSelectedName(null)
    const draftKey = crypto.randomUUID()
    activeDraftKeyRef.current = draftKey
    setActiveDraftKey(draftKey)
    setDraft({ name: '', sections: emptySections(), provenance: null, legacyText: null })
    setSourceFields(new Set())
    setMode('new')
    setWorkbenchStage('source')
    setSelectedBuiltinSource(null)
    setSelectedRunSource(null)
    setSelectedRunLoading(false)
    setReceipt(null)
    setPendingDelete(null)
    clearCoachFill()
  }

  const beginEdit = (entry: LibraryEntry): void => {
    if (operationLocked() || !confirmDiscard()) return
    releaseCoachIfIdle()
    resetDraftRevision()
    setSegment('mine')
    setSelectedName(entry.name)
    const draftKey = crypto.randomUUID()
    activeDraftKeyRef.current = draftKey
    setActiveDraftKey(draftKey)
    setDraft(draftOf(entry))
    setSelectedBuiltinSource(null)
    setSelectedRunSource(null)
    setMode('edit')
    setWorkbenchStage('interview')
    setSourceFields(new Set(SECTION_LABELS.filter(({ key }) => entry.sections[key] !== null).map(({ key }) => key)))
    setReceipt(null)
    setPendingDelete(null)
    clearCoachFill()
  }

  const selectMine = (entry: LibraryEntry): void => {
    if (operationLocked() || !confirmDiscard()) return
    setSegment('mine')
    setSelectedName(entry.name)
    setMode('read')
    setDraft(null)
    setReceipt(null)
    setPendingDelete(null)
    clearCoachFill()
    releaseCoachIfIdle()
  }

  const selectBuiltin = (name: string): void => {
    if (operationLocked() || !confirmDiscard()) return
    setSegment('builtin')
    setSelectedName(name)
    setMode('read')
    setDraft(null)
    setReceipt(null)
    setPendingDelete(null)
    releaseCoachIfIdle()
  }

  const restartSource = (): void => {
    if (operationLocked() || !confirmDiscard()) return
    sourceReadControllerRef.current?.abort()
    resetDraftRevision()
    const draftKey = crypto.randomUUID()
    activeDraftKeyRef.current = draftKey
    setActiveDraftKey(draftKey)
    releaseCoachIfIdle()
    setMode('new')
    setDraft({ name: '', sections: emptySections(), provenance: null, legacyText: null })
    setSourceFields(new Set())
    setSelectedBuiltinSource(null)
    setSelectedRunSource(null)
    setWorkbenchStage('source')
    setReceipt(null)
    clearCoachFill()
  }

  const useBuiltinReference = (source: (typeof BUILTIN_PREFERENCES)[number]): void => {
    if (operationLocked() || !confirmDiscard()) return
    const draftKey = crypto.randomUUID()
    activeDraftKeyRef.current = draftKey
    setActiveDraftKey(draftKey)
    releaseCoachIfIdle()
    sourceReadControllerRef.current?.abort()
    resetDraftRevision()
    setSegment('mine')
    setSelectedName(null)
    setDraft({ name: '', sections: emptySections(), provenance: null, legacyText: null })
    setSourceFields(new Set())
    setMode('new')
    setWorkbenchStage('source')
    setSelectedBuiltinSource(builtinLibraryEntry(source))
    setSelectedRunSource(null)
    setSelectedRunLoading(false)
    setReceipt(null)
    setPendingDelete(null)
    clearCoachFill()
  }

  const startBlank = (): void => {
    setSelectedBuiltinSource(null)
    setSelectedRunSource(null)
    setDraft({ name: '', sections: emptySections(), provenance: null, legacyText: null })
    bumpDraftRevision()
    setWorkbenchStage('interview')
    setSourceFields(new Set())
    clearCoachFill()
  }

  const startBuiltinSource = (entry: LibraryEntry): void => {
    setDraft({
      name: '',
      sections: { ...entry.sections },
      provenance: `参考内置方法：${entry.name}`,
      legacyText: null,
    })
    setSelectedBuiltinSource(entry)
    setSelectedRunSource(null)
    bumpDraftRevision()
    setWorkbenchStage('interview')
    clearCoachFill()
    setSourceFields(new Set(SECTION_LABELS.filter(({ key }) => entry.sections[key] !== null).map(({ key }) => key)))
  }

  const startRunSource = (run: RunSourceCandidate): void => {
    if (!run.eligible || run.question.kind !== 'ok' || run.deliverable.kind !== 'ok') return
    setDraft({ name: '', sections: emptySections(), provenance: `来自研究：${run.name}`, legacyText: null })
    setSelectedRunSource(run)
    setSelectedBuiltinSource(null)
    bumpDraftRevision()
    setWorkbenchStage('interview')
    clearCoachFill()
    setSourceFields(new Set())
  }

  const cancel = (): void => {
    if (operationLocked() || !confirmDiscard()) return
    setMode('read')
    setDraft(null)
    setSourceFields(new Set())
    setPendingDelete(null)
    clearCoachFill()
    sourceReadControllerRef.current?.abort()
    releaseCoachIfIdle()
  }

  const loadRunNames = (): void => {
    if (sessionId === undefined) return
    setRunState('loading')
    setRunNames([])
    setSelectedRunSource(null)
    sourceReadControllerRef.current?.abort()
    const controller = new AbortController()
    sourceReadControllerRef.current = controller
    void (async () => {
      const [root, archive] = await Promise.all([
        props.listDir(sessionId, '.', controller.signal),
        props.listDir(sessionId, 'archive', controller.signal),
      ])
      if (sourceReadControllerRef.current !== controller) return
      if (controller.signal.aborted) {
        setRunState('cancelled')
        return
      }
      if (root === null || archive === null) {
        setRunState('error')
        return
      }
      const names = [
        ...root.filter((entry) => entry.type === 'directory' && entry.name.startsWith('drt_')).map((entry) => entry.name),
        ...archive.filter((entry) => entry.type === 'directory' && entry.name.startsWith('drt_')).map((entry) => `archive/${entry.name}`),
      ].sort((left, right) => left.localeCompare(right))
      setRunNames(names)
      setRunState('ready')
    })().catch(() => {
      if (!controller.signal.aborted) setRunState('error')
    })
  }

  const selectRunSource = (name: string): void => {
    if (sessionId === undefined) return
    sourceReadControllerRef.current?.abort()
    const controller = new AbortController()
    sourceReadControllerRef.current = controller
    setSelectedRunLoading(true)
    setSelectedRunSource(null)
    void (async () => {
      const runFiles = await props.listDir(sessionId, name, controller.signal)
      const finalFiles = await props.listDir(sessionId, `${name}/final`, controller.signal)
      if (sourceReadControllerRef.current !== controller) return
      if (controller.signal.aborted) {
        setSelectedRunSource({
          name,
          finalPath: `${name}/final/v1.md`,
          question: { kind: 'cancelled' },
          deliverable: { kind: 'cancelled' },
          eligible: false,
          status: props.t('sourceCancelled'),
        })
        setSelectedRunLoading(false)
        return
      }
      const version = latestFinalVersion(finalFiles ?? [])
      const finalPath = version === null ? `${name}/final/v1.md` : `${name}/final/${version}`
      const [question, deliverable, header, questionComplete] = await Promise.all([
        props.readPreview(sessionId, `${name}/question.md`, controller.signal),
        props.readPreview(sessionId, finalPath, controller.signal),
        props.readPreview(sessionId, `${name}/run.md`, controller.signal),
        props.readLibrary(sessionId, `${name}/question.md`, controller.signal),
      ])
      if (sourceReadControllerRef.current !== controller) return
      if (controller.signal.aborted) {
        setSelectedRunSource({ name, finalPath, question: { kind: 'cancelled' }, deliverable: { kind: 'cancelled' }, eligible: false, status: props.t('sourceCancelled') })
        setSelectedRunLoading(false)
        return
      }
      const deliveredRecord = runFiles?.some((file) => file.name === 'delivered.json') === true
      const legacyReceipt = runFiles?.some((file) => file.name === 'acceptance.md') === true
      const hasFinal = version !== null
      const eligible = isCompletedMethodSourceRun({
        hasFinalVersion: hasFinal,
        runHeader: header,
        hasDeliveredRecord: deliveredRecord,
        hasLegacyAcceptance: legacyReceipt,
        question: questionComplete,
      })
      const status = questionComplete.kind !== 'ok'
        ? props.t('runNoQuestion')
        : !hasFinal || deliverable.kind !== 'ok'
          ? props.t('runNoFinal')
          : eligible ? props.t('eligibleRun') : props.t('runNotCompleted')
      setSelectedRunSource({ name, finalPath, question, deliverable, eligible, status })
      setSelectedRunLoading(false)
    })().catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        setSelectedRunSource({
          name,
          finalPath: `${name}/final/v1.md`,
          question: { kind: 'error', detail: String(cause) },
          deliverable: { kind: 'error', detail: String(cause) },
          eligible: false,
          status: props.t('sourceReadFailure'),
        })
        setSelectedRunLoading(false)
      }
    })
  }

  const updateSection = (key: keyof LibrarySections, value: string): void => {
    if (draft === null) return
    markManual(key)
    bumpDraftRevision()
    setDraft({ ...draft, sections: { ...draft.sections, [key]: value === '' ? null : value } })
  }

  const markOperationUnknown = (operation: PendingMethodOperation): void => {
    if (pendingOperationRef.current !== operation) return
    clearTimeout(operation.timeout)
    operationUnknownRef.current = true
    setOperationUnknown(true)
    setSending(false)
    setReceipt({ ok: false, detail: props.t('operationUnknown') })
  }

  const settleOperation = async (operation: PendingMethodOperation, outcome: OperationOutcome): Promise<void> => {
    if (pendingOperationRef.current !== operation) return
    let current: MethodLibraryReadResult
    try {
      current = await props.readLibrary(operation.sourceSessionId, LIBRARY_PATH, new AbortController().signal)
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
        ? props.t('operationTargetMatchesUnknown')
        : props.t('operationUnknown') })
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
        setReceipt({ ok: true, detail: props.t('removed', { name: operation.name ?? '' }) })
      } else if (operation.action === 'save' || operation.action === 'save-and-set-default') {
        setMode('read')
        setSelectedName(operation.name ?? null)
        setDraft(null)
        releaseCoachIfIdle()
        setReceipt({
          ok: true,
          detail: operation.action === 'save-and-set-default'
            ? props.t('defaultSet', { name: operation.name ?? '' })
            : props.t('saved', { name: operation.name ?? '' }),
        })
      } else if (operation.action === 'set-default') {
        setReceipt({ ok: true, detail: props.t('defaultSet', { name: operation.name ?? '' }) })
      } else {
        setReceipt({ ok: true, detail: props.t('defaultCleared') })
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
      setReceipt({ ok: false, detail: props.t('noVerifiedChange') })
      return
    }
    markOperationUnknown(operation)
  }

  const runOperation = async (input: MethodLibraryOperationRequest): Promise<void> => {
    if (pendingOperationRef.current !== null || operationUnknownRef.current || queuedOperationRef.current !== null) {
      setReceipt({ ok: false, detail: props.t('operationUnknown') })
      return
    }
    let draftKey = activeDraftKeyRef.current
    if (modeRef.current === 'read' || draftKey === null) {
      draftKey = crypto.randomUUID()
      activeDraftKeyRef.current = draftKey
      setActiveDraftKey(draftKey)
      coachIdRef.current = null
      setCoachId(null)
      coachReadyRef.current = false
      setCoachReady(false)
    }
    const activeCoachId = coachIdRef.current
    if (activeCoachId === null || !coachReadyRef.current) {
      queuedOperationRef.current = input
      if (coachRetryRef.current) {
        coachRetryRef.current = false
        setCoachEpoch((epoch) => epoch + 1)
      }
      setCoachVisible(true)
      setSending(true)
      setReceipt({ ok: true, detail: props.t('operationSent') })
      queuedOperationTimeoutRef.current = setTimeout(() => {
        if (queuedOperationRef.current !== input) return
        queuedOperationRef.current = null
        setSending(false)
        setCoachVisible(false)
        setReceipt({ ok: false, detail: props.t('editorUnavailable') })
      }, 30000)
      return
    }
    if (sessionId === undefined) return
    let baseline: string | null
    try {
      const read = await props.readLibrary(sessionId, LIBRARY_PATH, new AbortController().signal)
      if (read.kind === 'error') {
        applyLibraryRead(read)
        setReceipt({ ok: false, detail: props.t('loadBeforeWrite') })
        return
      }
      baseline = read.kind === 'ok' ? read.text : null
      applyLibraryRead(read)
    } catch {
      setReceipt({ ok: false, detail: props.t('loadBeforeWrite') })
      return
    }
    const targetMatches = input.name === undefined ? [] : foldLibrary(baseline).filter((entry) => entry.name === input.name)
    if (targetMatches.length > 1) {
      setReceipt({ ok: false, detail: props.t('duplicateNames') })
      return
    }
    if (input.action === 'save' || input.action === 'save-and-set-default') {
      const currentDraftName = draftRef.current?.currentName
      const renaming = currentDraftName !== undefined && currentDraftName !== input.name
      if (targetMatches.length === 1 && (modeRef.current === 'new' || renaming) && input.confirmOverwrite !== true) {
        setReceipt({ ok: false, detail: props.t('overwriteNotConfirmed') })
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
      setReceipt({ ok: false, detail: props.t('duplicateNames') })
      return
    }
    const operationId = crypto.randomUUID()
    const requestId = crypto.randomUUID()
    let payloadHash: string | undefined
    try {
      payloadHash = input.entryText === undefined ? undefined : await methodLibraryEntryHash(input.entryText)
    } catch (cause) {
      setReceipt({ ok: false, detail: props.t('operationFailed', { detail: String(cause) }) })
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
    setReceipt({ ok: true, detail: props.t('operationSent') })
    const sent = await props.sendCoach(activeCoachId, envelope, requestId)
    if (sent.ok) return
    if (sent.uncertain === true) {
      markOperationUnknown(operation)
      return
    }
    clearTimeout(operation.timeout)
    pendingOperationRef.current = null
    setSending(false)
    releaseCoachIfIdle()
    setReceipt({ ok: false, detail: props.t('operationFailed', { detail: sent.detail ?? 'prompt rejected' }) })
  }

  runOperationRef.current = runOperation

  const save = async (setDefault: boolean): Promise<void> => {
    if (draft === null) return
    const name = draft.name.trim()
    if (name === '') {
      setReceipt({ ok: false, detail: '名称不能为空' })
      return
    }
    const missing = SECTION_LABELS.filter(({ key }) => {
      const value = draft.sections[key]
      return value === null || value.trim() === ''
    })
    if (missing.length > 0) {
      setReceipt({ ok: false, detail: `还缺字段：${missing.map(({ label }) => label).join('、')}——填完再保存` })
      return
    }
    if (loadState !== 'ok' && loadState !== 'absent') {
      setReceipt({ ok: false, detail: props.t('loadBeforeWrite') })
      return
    }
    const existingEntries = foldLibrary(text).filter((entry) => entry.name === name)
    if (existingEntries.length > 1) {
      setReceipt({ ok: false, detail: props.t('duplicateNames') })
      return
    }
    const renaming = mode === 'edit' && draft.currentName !== undefined && draft.currentName !== name
    if (existingEntries.length === 1 && (mode === 'new' || renaming)) {
      const confirmed = typeof window === 'undefined'
        ? true
        : window.confirm(`库里已有同名方法「${name}」，保存会覆盖它。继续？`)
      if (!confirmed) {
        setReceipt({ ok: false, detail: `未保存：库里已有「${name}」` })
        return
      }
    }
    const entryText = [
      renderLibraryEntry({ name, sections: draft.sections, provenance: draft.provenance }),
      ...(draft.legacyText !== null && draft.legacyText.trim() !== '' ? [draft.legacyText.trim()] : []),
    ].join('\n')
    const saveAction = setDefault ? 'save-and-set-default' : 'save'
    const label = mode === 'new' ? '新建' : `更新（原「${draft.currentName ?? name}」）`
    await runOperation({
      action: saveAction,
      name,
      entryText,
      confirmOverwrite: existingEntries.length === 1 && (mode === 'new' || renaming),
      instruction: `保存方法「${name}」到工作区 method-library.md。动作：${label}。必须把 operationId 和 operationHash 原样传给 method_library_upsert，defaultAction=${setDefault ? 'set' : 'preserve'}。entry 必须与下方 method-draft 文本逐字一致。写后停止，不要继续其它工具。\n\`\`\`method-draft\n${entryText}\n\`\`\``,
    })
  }

  const remove = async (entry: LibraryEntry): Promise<void> => {
    await runOperation({
      action: 'remove',
      name: entry.name,
      instruction: `从工作区 method-library.md 删除方法「${entry.name}」。必须调用 method_library_remove，传入 operationId 与名称；写后停止。`,
    })
  }

  const setDefault = async (entry: LibraryEntry): Promise<void> => {
    await runOperation({
      action: 'set-default',
      name: entry.name,
      instruction: `将「${entry.name}」设为唯一默认偏好。调用 method_library_set_default，action=set，传入 operationId 和名称；写后停止。`,
    })
  }

  const clearDefault = async (): Promise<void> => {
    await runOperation({
      action: 'clear-default',
      instruction: '清除 method-library.md 中所有默认偏好标记。调用 method_library_set_default，action=clear，只传 operationId，不传 name；写后停止。',
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

  // 方法编辑首问的上下文：库快照 + 当前草稿 + 内置参考（只读）。只随第一条消息发一次。
  const librarySnapshot = text === null ? '（未加载）' : text.trim() === '' ? '（空）' : text.trim()
  const draftSnapshot = draft === null
    ? '（新建：四字段为空）'
    : [
        `名称：${draft.name.trim() === '' ? '（未命名）' : draft.name}`,
        ...SECTION_LABELS.map((item) => `${item.label}：${draft.sections[item.key] ?? '（空）'}`),
      ].join('\n')
  const previewForCoach = (label: string, preview: SourcePreview): string => preview.kind === 'ok'
    ? `${label}（eof=${String(preview.eof)}）：\n${preview.text}`
    : `${label}（${preview.kind}）：${preview.kind === 'error' ? preview.detail : '文件缺席'}`
  const coachContext = [
    '【页面自动附带的上下文，不是用户输入】',
    `当前方法库（method-library.md）：\n${librarySnapshot}`,
    `当前草稿（版本 ${draftRevision}）：\n${draftSnapshot}`,
    `内置参考（只读，仅对照，不要照抄）：${BUILTIN_PREFERENCES.map((entry) => `${entry.name}（${entry.summary}）`).join('；')}`,
    ...(selectedBuiltinSource === null ? [] : [`用户选择的内置参考（只读）：${selectedBuiltinSource.name}\n${SECTION_LABELS.map(({ key, label }) => `${label}：${selectedBuiltinSource.sections[key] ?? '（待定）'}`).join('\n')}`]),
    ...(selectedRunSource === null ? [] : [`用户选择的已完成研究：${selectedRunSource.name}\n来源文件：question.md 与 ${selectedRunSource.finalPath}\n${previewForCoach('研究问题预览', selectedRunSource.question)}\n${previewForCoach('交付物预览', selectedRunSource.deliverable)}`]),
  ].join('\n\n')


  const startInterview = async (id: SessionId): Promise<{ readonly ok: boolean; readonly detail?: string; readonly uncertain?: boolean }> => {
    const action = selectedRunSource !== null
      ? `请使用已加载的 method-from-run skill，从所选已完成研究“${selectedRunSource.name}”的有界预览归纳实际采用的方法；只记录可见证据，不补造缺失做法。`
      : selectedBuiltinSource !== null
        ? `以用户选择的内置参考“${selectedBuiltinSource.name}”为起点，先确认希望保留或修改哪些方面，不要照抄成品。`
        : '从零开始，先询问研究场景与交付对象，一次只问一个问题。'
    const requestId = crypto.randomUUID()
    const result = await props.sendCoach(id, `${coachContext}\n\n${action}`, requestId)
    if (result.ok) return result
    setReceipt({ ok: false, detail: result.uncertain === true ? props.t('operationUnknown') : props.t('operationFailed', { detail: result.detail ?? 'prompt rejected' }) })
    return result
  }

  const clearCoachFill = (): void => {
    setManual(new Set())
    setCoachFields(new Set())
    setActiveField(null)
    setCoachBase(null)
    previousRef.current = null
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
        void runOperationRef.current(queued)
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
      const lines = FIELD_ORDER
        .filter((field) => manual.has(field))
        .map((field) => field === 'name'
          ? `名称：${draft.name}`
          : `${FIELD_LABELS[field]}：${draft.sections[field] ?? '（空）'}`)
      void props.sendCoach(coachId, `【用户手改，以下值以用户为准，不要覆盖】\n${lines.join('\n')}`).catch(() => { /* fail-soft */ })
    }, 900)
    return () => clearTimeout(handle)
  }, [coachId, draft, manual, props.sendCoach])

  const markManual = (field: DraftField): void => {
    setManual((current) => current.has(field) ? current : new Set(current).add(field))
  }

  const onNameChange = (name: string): void => {
    markManual('name')
    bumpDraftRevision()
    setDraft((current) => current === null ? null : { ...current, name })
  }

  const undoCoach = (): void => {
    const previous = previousRef.current
    if (previous === null) return
    bumpDraftRevision()
    setDraft(previous.draft)
    setManual(previous.manual)
    setCoachFields(previous.coachFields)
    setActiveField(previous.active)
    setCoachBase(previous.base)
    previousRef.current = null
  }

  return (
    <div
      data-method-library=""
      data-method-library-edit={mode !== 'read' ? '' : undefined}
      data-method-draft-revision={draftRevision}
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}
    >
      <div style={HEADER_STYLE}>
        <strong style={{ fontSize: 15 }}>方法库</strong>
        <span style={MUTED_STYLE}>本工作区共享 · 保存交方法编辑</span>
        <span style={{ flex: 1 }} />
        <button type="button" style={BUTTON_STYLE} onClick={refresh}>刷新</button>
        <button type="button" style={PRIMARY_STYLE} disabled={sending || operationUnknown} onClick={beginNew}>新建</button>
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
        <aside style={{ flex: `0 0 min(${leftWidth}px, 38vw)`, minWidth: 120, borderRight: '1px solid var(--dsw-alias-border-l1)', padding: 10, overflowY: 'auto', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button type="button" style={{ ...BUTTON_STYLE, ...(segment === 'mine' ? { borderColor: 'var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-brand-primary)' } : {}) }} onClick={() => { switchSegment('mine') }}>我的库</button>
            <button type="button" style={{ ...BUTTON_STYLE, ...(segment === 'builtin' ? { borderColor: 'var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-brand-primary)' } : {}) }} onClick={() => { switchSegment('builtin') }}>内置参考</button>
          </div>
          {segment === 'mine' && (
            <>
              <input style={{ ...INPUT_STYLE, marginBottom: 8 }} aria-label={props.t('searchMethods')} placeholder={props.t('searchMethods')} value={query} onChange={(event) => { setQuery(event.target.value) }} />
              {loadState === 'loading' && <div style={MUTED_STYLE}>读取中…</div>}
              {loadState === 'error' && <div style={{ ...MUTED_STYLE, color: 'var(--dsw-alias-label-error)' }}>读不到 {LIBRARY_PATH}：{loadError}</div>}
              {loadState === 'absent' && <div style={MUTED_STYLE}>本工作区还没有 {LIBRARY_PATH}。新建第一条，或让 Lead 在研究里记住一种做法。</div>}
              {loadState === 'ok' && filtered.length === 0 && <div style={MUTED_STYLE}>{entries.length === 0 ? '库还是空的。' : '没有匹配的方法。'}</div>}
              {filtered.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  style={{ ...ROW_STYLE, ...(selectedName === entry.name && segment === 'mine' ? { background: 'var(--dsw-alias-brand-primary)0f', borderColor: 'var(--dsw-alias-brand-primary)30' } : {}) }}
                  onClick={() => { selectMine(entry) }}
                >
                  <div style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'baseline' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
                    {entry.isDefault && <span style={{ fontSize: 10, color: 'var(--dsw-alias-brand-primary)' }}>默认</span>}
                  </div>
                  <div style={{ ...MUTED_STYLE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summaryOfEntry(entry) ?? '（无摘要）'}</div>
                </button>
              ))}
            </>
          )}
          {segment === 'builtin' && (
            <>
              {BUILTIN_PREFERENCES.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  style={{ ...ROW_STYLE, ...(selectedName === entry.name ? { background: 'var(--dsw-alias-brand-primary)0f', borderColor: 'var(--dsw-alias-brand-primary)30' } : {}) }}
                  onClick={() => { selectBuiltin(entry.name) }}
                >
                  <div style={{ fontSize: 13 }}>{entry.name}</div>
                  <div style={{ ...MUTED_STYLE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.summary}</div>
                </button>
              ))}
            </>
          )}
        </aside>
        <ColumnHandle onDrag={(delta) => { setLeftWidth((width) => Math.max(120, Math.min(420, width + delta))) }} value={leftWidth} min={120} max={420} />
        <main style={{ flex: '1 1 420px', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
          {(mode === 'edit' || mode === 'new') && workbenchStage !== 'source' && draft !== null && (
            <MethodSummaryView draft={draft} stage={workbenchStage} manualFields={manual} coachFields={coachFields} sourceFields={sourceFields} onStageChange={setWorkbenchStage} onFocusField={(field) => { setActiveField(field); setWorkbenchStage('form-check') }} onRestartSource={restartSource} canSave={canSaveDraft} sending={sending || operationUnknown} onSave={(setDefault) => { void save(setDefault) }} t={props.t} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, padding: 14, overflowY: mode === 'read' || workbenchStage !== 'interview' ? 'auto' : 'hidden', boxSizing: 'border-box' }}>
            {mode === 'read' && segment === 'builtin' && builtin !== null && <BuiltinView entry={builtin} onUse={() => { useBuiltinReference(builtin) }} useLabel={props.t('useBuiltin')} />}
            {mode === 'read' && segment === 'mine' && selected !== null && <ReadMineView entry={selected} pendingDelete={pendingDelete} sending={sending || operationUnknown} onEdit={beginEdit} onPendingDelete={setPendingDelete} onRemove={(entry) => { void remove(entry) }} onSetDefault={(entry) => { void setDefault(entry) }} onClearDefault={() => { void clearDefault() }} t={props.t} />}
            {mode === 'read' && segment === 'mine' && selected === null && (
              <div style={{ ...MUTED_STYLE, paddingTop: 20 }}>
                {loadState === 'absent'
                  ? '还没有方法。点「新建」写第一条；或让 Lead 从一次 run 里沉淀。'
                  : query.trim() !== '' ? '没有匹配的方法。' : '从左边选一条方法。'}
              </div>
            )}
            {mode === 'new' && workbenchStage === 'source' && <SourceSelectionView
              builtinChoices={BUILTIN_PREFERENCES.map((entry) => ({ ...builtinLibraryEntry(entry), summary: entry.summary }))}
              runNames={runNames}
              runState={runState}
              selectedRunLoading={selectedRunLoading}
              onCancelRunRead={() => { sourceReadControllerRef.current?.abort() }}
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
              <MethodCoachPanel key={`${sessionId}:${coachEpoch}:${activeDraftKey}`} sessionId={sessionId} draftKey={activeDraftKey ?? 'pending'} visible={(mode === 'edit' || mode === 'new') && workbenchStage === 'interview'} ensure={props.ensureCoach} onCoach={onCoachReady} onError={onCoachError} onStartInterview={startInterview} title={props.t('methodEditorTitle')} startLabel={props.t('startInterview')} readyLabel={props.t('interviewReady')} pendingLabel={props.t('startingInterview')} startedLabel={props.t('interviewStarted')} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
