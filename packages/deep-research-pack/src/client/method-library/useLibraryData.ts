// useLibraryData.ts — 方法库文本的加载/筛选/选中（无 UI 的读取状态）。
//
// 从 MethodLibraryView.tsx 拆出（2026-11-03 审计 P4）。只负责"库文本 → 条目/筛选/当前选中"；
// 草稿、写操作与会话生命周期另属其他 hook。读失败不抛：absent/error 都落成状态。
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { BUILTIN_PREFERENCES } from '../../lib/config-tables.ts'
import { foldLibrary } from '../../lib/library-fold.ts'
import { filterLibraryEntries } from './model.ts'
import type { MethodLibraryReadResult } from '../../lib/method-library-read.ts'
import { LIBRARY_PATH, type LoadState, type Segment } from './model.ts'

export interface LibraryDataDeps {
  readonly sessionId: SessionId | undefined
  readonly readLibrary: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<MethodLibraryReadResult>
}

export function useLibraryData({ sessionId, readLibrary }: LibraryDataDeps) {
  const [text, setText] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [segment, setSegment] = useState<Segment>('mine')
  const [selectedName, setSelectedName] = useState<string | null>(null)

  const entries = useMemo(() => foldLibrary(text), [text])
  const filtered = useMemo(() => filterLibraryEntries(entries, query), [entries, query])
  const selected = (segment === 'mine' && query.trim() !== ''
    ? filtered.find((entry) => entry.name === selectedName)
    : entries.find((entry) => entry.name === selectedName)) ?? null
  const builtin = segment === 'builtin'
    ? BUILTIN_PREFERENCES.find((entry) => entry.name === selectedName) ?? null
    : null

  const applyLibraryRead = useCallback((result: MethodLibraryReadResult): string | null => {
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
  }, [])

  const load = useCallback(async (signal: AbortSignal): Promise<MethodLibraryReadResult | null> => {
    if (sessionId === undefined) return null
    try {
      const result = await readLibrary(sessionId, LIBRARY_PATH, signal)
      if (signal.aborted) return null
      applyLibraryRead(result)
      return result
    } catch (cause) {
      if (signal.aborted) return null
      const result = { kind: 'error' as const, detail: String(cause) }
      applyLibraryRead(result)
      return result
    }
  }, [sessionId, readLibrary, applyLibraryRead])

  /** 会话切换时把读取面复位（其余状态的复位归组件）。 */
  const reset = useCallback((): void => {
    setText(null)
    setLoadState('loading')
    setLoadError(null)
    setQuery('')
    setSegment('mine')
    setSelectedName(null)
  }, [])

  // 文本到位后保证有一个合法选中（条目消失时重新落到第一条）。
  useEffect(() => {
    if (entries.length === 0) {
      setSelectedName(null)
      return
    }
    if (selectedName === null || !entries.some((entry) => entry.name === selectedName)) {
      setSelectedName(entries[0]?.name ?? null)
    }
  }, [text])

  return {
    text, setText, loadState, setLoadState, loadError, setLoadError,
    query, setQuery, segment, setSegment, selectedName, setSelectedName,
    entries, filtered, selected, builtin, applyLibraryRead, load, reset,
  }
}
