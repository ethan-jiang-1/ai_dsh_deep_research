/**
 * useEvidencePreview.ts —— 终稿行内悬停与全屏右栏对照共用的证据卡懒加载与 LRU 缓存 hook。
 * 严格透传 readArtifact 五态 ArtifactState，绝不静默吞错或把读失败折成空态。
 */
import { useCallback, useEffect, useRef } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { readArtifact } from '../../lib/run/artifact-read.ts'
import { openRun, type RunSource } from '../../lib/run/run-context.ts'
import {
  createEvidencePreviewCache,
  extractEvidencePreview,
  type EvidencePreviewEntry,
} from '../../lib/run/evidence-preview.ts'

export function useEvidencePreview(args: {
  readonly sessionId: SessionId | undefined
  readonly getBundleDir: () => string | null
  readonly runSource: (sessionId: SessionId) => RunSource
}): {
  readonly getCached: (relPath: string) => EvidencePreviewEntry | undefined
  readonly loadPreview: (relPath: string, forceRetry?: boolean) => Promise<EvidencePreviewEntry>
} {
  const { sessionId, getBundleDir, runSource } = args
  const cacheRef = useRef(createEvidencePreviewCache(48))
  const inflightRef = useRef(new Map<string, Promise<EvidencePreviewEntry>>())
  const sessionEpochRef = useRef(0)
  const runSourceRef = useRef(runSource)
  runSourceRef.current = runSource
  const bundleDirRef = useRef(getBundleDir)
  bundleDirRef.current = getBundleDir

  useEffect(() => {
    sessionEpochRef.current += 1
    cacheRef.current.clear()
    inflightRef.current.clear()
  }, [sessionId])

  const keyOf = (relPath: string): string => {
    const dir = bundleDirRef.current() ?? ''
    const clean = relPath.trim().replace(/^\.\//, '')
    return `${dir}::${clean}`
  }

  const getCached = useCallback((relPath: string): EvidencePreviewEntry | undefined => {
    return cacheRef.current.get(keyOf(relPath))
  }, [])

  const loadPreview = useCallback((relPath: string, forceRetry = false): Promise<EvidencePreviewEntry> => {
    const clean = relPath.trim().replace(/^\.\//, '')
    const dir = bundleDirRef.current()
    if (sessionId === undefined || dir === null || clean.includes('..') || !clean.startsWith('evidence/')) {
      return Promise.resolve({ state: 'invalid' })
    }
    const key = `${dir}::${clean}`
    if (forceRetry) {
      cacheRef.current.delete(key)
      inflightRef.current.delete(key)
    } else {
      const hit = cacheRef.current.get(key)
      if (hit !== undefined && hit.state !== 'loading') return Promise.resolve(hit)
      const pending = inflightRef.current.get(key)
      if (pending !== undefined) return pending
    }

    const epoch = sessionEpochRef.current
    let work: Promise<EvidencePreviewEntry> | null = null
    work = (async (): Promise<EvidencePreviewEntry> => {
      try {
        const opened = await openRun(runSourceRef.current(sessionId), dir)
        if (!opened.ok) {
          const failed: EvidencePreviewEntry = { state: opened.reason === 'missing' ? 'absent' : 'unreadable' }
          if (sessionEpochRef.current === epoch) cacheRef.current.set(key, failed)
          return failed
        }
        const art = await readArtifact(opened.value, clean)
        if (art.state !== 'ok' || art.text === null) {
          const failed: EvidencePreviewEntry = { state: art.state === 'ok' ? 'invalid' : art.state }
          if (sessionEpochRef.current === epoch) cacheRef.current.set(key, failed)
          return failed
        }
        const cardName = clean.slice('evidence/'.length)
        const resolved: EvidencePreviewEntry = { state: 'ok', summary: extractEvidencePreview(cardName, art.text) }
        if (sessionEpochRef.current === epoch) cacheRef.current.set(key, resolved)
        return resolved
      } catch {
        /* @silent-catch: evidence hover preview surfaces explicit unreadable state */
        const failed: EvidencePreviewEntry = { state: 'unreadable' }
        if (sessionEpochRef.current === epoch) cacheRef.current.set(key, failed)
        return failed
      } finally {
        if (sessionEpochRef.current === epoch && work !== null && inflightRef.current.get(key) === work) {
          inflightRef.current.delete(key)
        }
      }
    })()

    inflightRef.current.set(key, work)
    return work
  }, [sessionId])

  return { getCached, loadPreview }
}
