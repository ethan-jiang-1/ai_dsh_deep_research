// useRunSourcePicker.ts — 「从已完成研究沉淀」的来源选择（run 列表 + 候选预览读取）。
//
// 从 MethodLibraryView.tsx 拆出（2026-11-03 审计 P4 第五刀）。只负责 run 来源面：
// 列工作区根/`archive/` 的 `drt_` run、按选中的 run 读 question.md / final/vN / run.md
// 并判定 eligible；草稿、写操作与会话生命周期另属其他 hook。
// 读失败不抛：error/cancelled 都落成候选状态（与组件内联版本逐字一致）。
//
// 竞态判据 = `sourceReadControllerRef.current !== controller`：只有最近一次读取能写状态；
// 旧 controller 在每次新读取/复位前 abort，被 abort 的那次只允许写取消态。
import { useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { isCompletedMethodSourceRun, latestFinalVersion, type SourcePreview } from '../../lib/method-library-source.ts'
import type { MethodLibraryReadResult } from '../../lib/method-library-read.ts'
import type { RunSourceCandidate } from './views.tsx'

/** run 列表的读取态（与 `SourceSelectionView` 的 runState 同一组值）。 */
export type RunListState = 'idle' | 'loading' | 'ready' | 'error' | 'cancelled'

export interface RunSourcePickerDeps {
  readonly sessionId: SessionId | undefined
  /** 与 `SourceSelectionView` 同一座位：只接受本包字典的 key（`props.t` 原样传入）。 */
  readonly t: TranslateNS<'deepResearchPack'>
  readonly listDir: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<readonly { type: string; name: string }[] | null>
  readonly readPreview: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<SourcePreview>
  readonly readLibrary: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<MethodLibraryReadResult>
}

export function useRunSourcePicker(deps: RunSourcePickerDeps) {
  const { sessionId, t, listDir, readPreview, readLibrary } = deps
  const [runNames, setRunNames] = useState<readonly string[]>([])
  const [runState, setRunState] = useState<RunListState>('idle')
  const [selectedRunSource, setSelectedRunSource] = useState<RunSourceCandidate | null>(null)
  const [selectedRunLoading, setSelectedRunLoading] = useState(false)
  const sourceReadControllerRef = useRef<AbortController | null>(null)

  /** 取消当前 run 读取（不改变已落地的选择）。 */
  const abortRunRead = (): void => {
    sourceReadControllerRef.current?.abort()
  }

  /** 会话切换复位：取消读取并清空 run 列表/选择。 */
  const resetRunPicker = (): void => {
    abortRunRead()
    setRunNames([])
    setRunState('idle')
    setSelectedRunSource(null)
    setSelectedRunLoading(false)
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
        listDir(sessionId, '.', controller.signal),
        listDir(sessionId, 'archive', controller.signal),
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
      const runFiles = await listDir(sessionId, name, controller.signal)
      const finalFiles = await listDir(sessionId, `${name}/final`, controller.signal)
      if (sourceReadControllerRef.current !== controller) return
      if (controller.signal.aborted) {
        setSelectedRunSource({
          name,
          finalPath: `${name}/final/v1.md`,
          question: { kind: 'cancelled' },
          deliverable: { kind: 'cancelled' },
          eligible: false,
          status: t('sourceCancelled'),
        })
        setSelectedRunLoading(false)
        return
      }
      if (finalFiles === null || runFiles === null) {
        setSelectedRunSource({
          name,
          finalPath: `${name}/final/v1.md`,
          question: { kind: 'error', detail: 'run listing failed' },
          deliverable: { kind: 'error', detail: 'run listing failed' },
          eligible: false,
          status: t('sourceReadFailure'),
        })
        setSelectedRunLoading(false)
        return
      }
      const version = latestFinalVersion(finalFiles)
      const finalPath = version === null ? `${name}/final/v1.md` : `${name}/final/${version}`
      const [question, deliverable, header, questionComplete] = await Promise.all([
        readPreview(sessionId, `${name}/question.md`, controller.signal),
        readPreview(sessionId, finalPath, controller.signal),
        readPreview(sessionId, `${name}/run.md`, controller.signal),
        readLibrary(sessionId, `${name}/question.md`, controller.signal),
      ])
      if (sourceReadControllerRef.current !== controller) return
      if (controller.signal.aborted) {
        setSelectedRunSource({ name, finalPath, question: { kind: 'cancelled' }, deliverable: { kind: 'cancelled' }, eligible: false, status: t('sourceCancelled') })
        setSelectedRunLoading(false)
        return
      }
      const deliveredRecord = runFiles.some((file) => file.type === 'file' && file.name === 'delivered.json')
      const legacyReceipt = runFiles.some((file) => file.type === 'file' && file.name === 'acceptance.md')
      const hasFinal = version !== null
      const hasDeliverableContent = deliverable.kind === 'ok' && deliverable.text.trim() !== ''
      const eligible = isCompletedMethodSourceRun({
        hasFinalVersion: hasFinal,
        hasDeliverableContent,
        runHeader: header,
        hasDeliveredRecord: deliveredRecord,
        hasLegacyAcceptance: legacyReceipt,
        question: questionComplete,
      })
      const status = questionComplete.kind !== 'ok'
        ? t('runNoQuestion')
        : !hasFinal || !hasDeliverableContent
          ? t('runNoFinal')
          : eligible ? t('eligibleRun') : t('runNotCompleted')
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
          status: t('sourceReadFailure'),
        })
        setSelectedRunLoading(false)
      }
    })
  }

  return {
    runNames, runState, selectedRunSource, selectedRunLoading,
    loadRunNames, selectRunSource, abort: abortRunRead, reset: resetRunPicker,
    // 组件里非读取路径的选择/清空（`startRunSource` 选中候选；新建、切换、重选来源清空）。
    // 读取路径仍只走 `selectRunSource`，这里暴露 setter 是为了让这些调用点逐字不动。
    setSelectedRunSource, setSelectedRunLoading,
  }
}
