// workspace-files.ts — workspaceFiles 读面闭包（bundle 渐进面数据通道）。
//
// 从 client/index.ts 拆出（2026-11-03 审计 P4）。失败降级语义是**合同**，不是实现细节：
//   · `workspace-file/not-found` = 目录/文件尚未产出（run 早期）→ 合法空态；
//   · 其他错误码/通道异常 → 打 console（冒烟可抓）+ 返回 null，不静默吞。
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { joinMethodLibraryPages, type MethodLibraryReadResult } from '../lib/method-library-read.ts'

type ReadPage = { readonly text: string; readonly lines: number; readonly eof: boolean }

/** `remote.workspaceFiles` 的最小结构面（vendor 返回 RemoteResult）。 */
export interface WorkspaceFilesRemote {
  list(sessionId: SessionId, path: string, signal: AbortSignal): Promise<
    | { readonly ok: true; readonly value: { readonly entries: readonly { readonly type: string; readonly name: string }[] } }
    | { readonly ok: false; readonly error: unknown }
  >
  read(sessionId: SessionId, path: string, options: { readonly offset: number; readonly limit: number }, signal: AbortSignal): Promise<
    | { readonly ok: true; readonly value: ReadPage }
    | { readonly ok: false; readonly error: unknown }
  >
}

const codeOf = (error: unknown): string | undefined => (error as { code?: string } | undefined)?.code

/** 建三个读闭包：listDir（渐进面）/ readLibrary（方法库全文，分页拼）/ readPreview（有界预览）。 */
export function createWorkspaceFiles(remote: WorkspaceFilesRemote) {
  const listDir = async (sessionId: SessionId, path: string, signal: AbortSignal) => {
    try {
      const result = await remote.list(sessionId, path, signal)
      if (!result.ok) {
        // 例外：`workspace-file/not-found` = 目录尚未产出，是合法空态而非故障（2026-10-19 实测：
        // drt_* 无 evidence/ 目录，页签把正常空态当故障报红）。真故障仍 fail-loud。
        if (codeOf(result.error) === 'workspace-file/not-found') return []
        console.error('[research-status] workspaceFiles.list 失败', JSON.stringify({ path, error: result.error }))
        return null
      }
      return result.value.entries as readonly { type: string; name: string }[]
    } catch (cause) {
      console.error('[research-status] workspaceFiles.list 抛错', String(cause))
      return null
    }
  }

  // limit 参数化（BUG-026）：默认 40 行 = 渐进面小读取的历史选择；库读传大限（多条目库 >40 行，
  // 写死会静默截断——vendor 契约 limit 上限 = 配置 maxLines，默认 5000）。
  const readLibrary = async (sessionId: SessionId, path: string, signal: AbortSignal): Promise<MethodLibraryReadResult> => {
    const pages: { text: string; lines: number; eof: boolean }[] = []
    let offset = 1
    for (let pageIndex = 0; pageIndex < 20; pageIndex += 1) {
      try {
        const result = await remote.read(sessionId, path, { offset, limit: 1000 }, signal)
        if (!result.ok) {
          if (codeOf(result.error) === 'workspace-file/not-found') return { kind: 'absent' }
          return { kind: 'error', detail: String(result.error ?? 'workspace read failed') }
        }
        const page = result.value
        pages.push({ text: page.text, lines: page.lines, eof: page.eof })
        const text = joinMethodLibraryPages(pages)
        if (text !== null) return { kind: 'ok', text }
        if (page.lines === 0) return { kind: 'error', detail: 'workspace read returned an empty non-final page' }
        offset += page.lines
      } catch (cause) {
        if (signal.aborted) return { kind: 'error', detail: 'read cancelled' }
        return { kind: 'error', detail: String(cause) }
      }
    }
    return { kind: 'error', detail: 'method-library.md exceeds 20000 lines' }
  }

  const readPreview = async (sessionId: SessionId, path: string, signal: AbortSignal, limit = 80) => {
    try {
      const result = await remote.read(sessionId, path, { offset: 1, limit }, signal)
      if (!result.ok) {
        return codeOf(result.error) === 'workspace-file/not-found'
          ? { kind: 'absent' as const }
          : { kind: 'error' as const, detail: String(result.error ?? 'workspace read failed') }
      }
      const { text, eof } = result.value
      if (typeof text !== 'string' || typeof eof !== 'boolean') return { kind: 'error' as const, detail: 'workspace preview response was malformed' }
      return { kind: 'ok' as const, text, eof }
    } catch (cause) {
      return signal.aborted
        ? { kind: 'cancelled' as const }
        : { kind: 'error' as const, detail: String(cause) }
    }
  }

  /**
   * 单文件读（渐进面 / 配置页签共用）：缺省 40 行；`missingOk` 区分合法空态与真故障。
   * 失败打 console（冒烟可抓）+ 返回 null，不抛——页面降级为空而不是砖。
   */
  const readText = async (
    sessionId: SessionId,
    path: string,
    signal: AbortSignal,
    limit = 40,
    missingOk = false,
  ): Promise<string | null> => {
    try {
      const result = await remote.read(sessionId, path, { offset: 1, limit }, signal)
      if (!result.ok) {
        if (missingOk && codeOf(result.error) === 'workspace-file/not-found') return null
        console.error('[research-status] workspaceFiles.read 失败', JSON.stringify({ path, error: result.error }))
        return null
      }
      const text = (result.value as { text?: unknown }).text
      return typeof text === 'string' ? text : null
    } catch (cause) {
      console.error('[research-status] workspaceFiles.read 抛错', String(cause))
      return null
    }
  }

  return { listDir, readLibrary, readPreview, readText }
}
