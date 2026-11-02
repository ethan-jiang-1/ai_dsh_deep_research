// useDraftState.ts — 方法库工作台的草稿与导航状态（工作台「当前草稿」这一面）。
//
// 从 MethodLibraryView.tsx 拆出（2026-11-03 审计 P4 第六刀）。只负责：模式/工作台阶段、
// 草稿与修订号、活动草稿 key、手改/对话/来源三个字段标记、当前聚焦字段、对话回填基线，
// 以及围绕这些状态的新建/编辑/选中/换来源/取消/改字段/撤销对话回填。
// 方法编辑会话、写操作（settle/run/save/remove/…）与回执/发送态仍归组件：这里只通过 deps
// 借用它们的 ref/setter（`operationLocked`/`releaseCoachIfIdle` 必须看见 pending/queued 操作
// 与会话句柄）。函数体逐字搬自组件，只把 `props.*` 换成 deps。
import { useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { SECTION_LABELS, type LibraryEntry, type LibrarySections } from '../../lib/library-fold.ts'
import { BUILTIN_PREFERENCES } from '../../lib/config-tables.ts'
import type { DraftField } from '../../lib/method-draft.ts'
import {
  builtinLibraryEntry, draftDirty, draftOf, emptySections,
  type MethodLibraryOperationRequest, type Mode, type PendingMethodOperation,
  type Receipt, type Segment,
} from './model.ts'
import type { Draft, RunSourceCandidate, WorkbenchStage } from './views.tsx'

/** 依赖面：库读取/来源选择的当前值与 setter、回执/抽屉 setter、方法编辑会话与写操作的 ref/setter。 */
export interface DraftStateDeps {
  /** 与 `SourceSelectionView` 同一座位：只接受本包字典的 key（`props.t` 原样传入）。 */
  readonly t: TranslateNS<'deepResearchPack'>
  /** 库读取面（useLibraryData）的当前值：切换分段要读条目，dirty 要对照当前选中。 */
  readonly segment: Segment
  readonly entries: readonly LibraryEntry[]
  readonly selected: LibraryEntry | null
  readonly setSegment: (next: Segment) => void
  readonly setSelectedName: (name: string | null) => void
  /** 内置参考的选择留组件状态；run 来源归 useRunSourcePicker（只读值 + setter 都从这里过）。 */
  readonly selectedBuiltinSource: LibraryEntry | null
  readonly setSelectedBuiltinSource: (entry: LibraryEntry | null) => void
  readonly selectedRunSource: RunSourceCandidate | null
  readonly setSelectedRunSource: (run: RunSourceCandidate | null) => void
  readonly setSelectedRunLoading: (loading: boolean) => void
  readonly abortRunRead: () => void
  /** 回执、删除二次确认与窄屏抽屉（组件状态，本 hook 只写不读）。 */
  readonly setReceipt: (receipt: Receipt | null) => void
  readonly setPendingDelete: (name: string | null) => void
  readonly setLibraryOpen: (open: boolean) => void
  /** 方法编辑会话与写操作的生命周期仍归组件：这里只借用 ref/setter（时序与内联版一致）。 */
  readonly pendingOperationRef: MutableRefObject<PendingMethodOperation | null>
  readonly queuedOperationRef: MutableRefObject<MethodLibraryOperationRequest | null>
  readonly coachIdRef: MutableRefObject<SessionId | null>
  readonly setCoachId: (id: SessionId | null) => void
  readonly coachReadyRef: MutableRefObject<boolean>
  readonly setCoachReady: (ready: boolean) => void
  readonly setCoachVisible: (visible: boolean) => void
  readonly activeTurnRef: MutableRefObject<number | null>
}

export function useDraftState(deps: DraftStateDeps) {
  const {
    t, segment, entries, selected, setSegment, setSelectedName,
    selectedBuiltinSource, setSelectedBuiltinSource, selectedRunSource, setSelectedRunSource, setSelectedRunLoading,
    abortRunRead, setReceipt, setPendingDelete, setLibraryOpen,
    pendingOperationRef, queuedOperationRef, coachIdRef, setCoachId, coachReadyRef, setCoachReady,
    setCoachVisible, activeTurnRef,
  } = deps
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
  const [manual, setManual] = useState<ReadonlySet<DraftField>>(() => new Set())
  const [coachFields, setCoachFields] = useState<ReadonlySet<DraftField>>(() => new Set())
  const [sourceFields, setSourceFields] = useState<ReadonlySet<DraftField>>(() => new Set())
  const [activeField, setActiveField] = useState<DraftField | null>(null)
  const [coachBase, setCoachBase] = useState<LibraryEntry | null>(null)
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
  draftRef.current = draft
  manualRef.current = manual
  coachFieldsRef.current = coachFields
  activeRef.current = activeField
  coachBaseRef.current = coachBase
  modeRef.current = mode

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

  const dirty = draftDirty({ draft, mode, selected, selectedBuiltinSource, selectedRunSource })
  const confirmDiscard = (): boolean => {
    if (!dirty) return true
    return typeof window === 'undefined' ? true : window.confirm('放弃未保存的修改？')
  }

  const operationLocked = (): boolean => {
    if (pendingOperationRef.current === null && queuedOperationRef.current === null) return false
    setReceipt({ ok: false, detail: t('operationInProgress') })
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
    setLibraryOpen(false)
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
    setLibraryOpen(false)
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
    setLibraryOpen(false)
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
    setLibraryOpen(false)
  }

  const restartSource = (): void => {
    if (operationLocked() || !confirmDiscard()) return
    abortRunRead()
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
    setLibraryOpen(false)
  }

  const useBuiltinReference = (source: (typeof BUILTIN_PREFERENCES)[number]): void => {
    if (operationLocked() || !confirmDiscard()) return
    const draftKey = crypto.randomUUID()
    activeDraftKeyRef.current = draftKey
    setActiveDraftKey(draftKey)
    releaseCoachIfIdle()
    abortRunRead()
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
    setLibraryOpen(false)
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
    if (!run.eligible || run.question.kind !== 'ok' || run.question.text.trim() === ''
      || run.deliverable.kind !== 'ok' || run.deliverable.text.trim() === '') return
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
    abortRunRead()
    releaseCoachIfIdle()
  }

  const updateSection = (key: keyof LibrarySections, value: string): void => {
    if (draft === null) return
    markManual(key)
    bumpDraftRevision()
    setDraft({ ...draft, sections: { ...draft.sections, [key]: value === '' ? null : value } })
  }

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

  const clearCoachFill = (): void => {
    setManual(new Set())
    setCoachFields(new Set())
    setActiveField(null)
    setCoachBase(null)
    previousRef.current = null
  }

  return {
    mode, setMode, modeRef,
    workbenchStage, setWorkbenchStage,
    draft, setDraft, draftRef,
    draftRevision, setDraftRevision, draftRevisionRef,
    turnBaseRevisionRef, turnAcceptedRevisionRef, lastAssistantSeqRef,
    activeDraftKey, setActiveDraftKey, activeDraftKeyRef,
    manual, setManual, manualRef,
    coachFields, setCoachFields, coachFieldsRef,
    sourceFields, setSourceFields,
    activeField, setActiveField, activeRef,
    coachBase, setCoachBase, coachBaseRef,
    previousRef,
    bumpDraftRevision, resetDraftRevision, dirty, confirmDiscard, operationLocked,
    switchSegment, releaseCoachIfIdle, beginNew, beginEdit, selectMine, selectBuiltin,
    restartSource, useBuiltinReference, startBlank, startBuiltinSource, startRunSource,
    cancel, updateSection, markManual, onNameChange, undoCoach,
  }
}
