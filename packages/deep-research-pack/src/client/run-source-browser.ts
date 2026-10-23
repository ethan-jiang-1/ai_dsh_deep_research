/**
 * run-source-browser.ts —— `RunSource` 的浏览器适配器（run-context 的 client 半）。
 *
 * 只做三件事：把 `remote.workspaceFiles` 的 wire 结果翻译成 run-context 的 Entry/Page/version；
 * 位置规则、同名优先级、读策略、翻页全在 `src/lib/run-context.ts`，本件不重复。
 *
 * 失败映射：`workspace-file/not-found` → missing；其它错误（通道、权限、非文本、超限）→ unreadable。
 * 空目录/空文件是 `ok` 的空值——目录缺失与目录为空必须分开，否则 openRun 会把「根还没建」误判成
 * 「根存在且为空」。
 *
 * 路径语义：`list` 收工作区相对路径（vendor 限制在工作区内）；`read`/`stat` 同时接受相对与绝对，
 * 但 run-context 只传相对基址拼出的路径。
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { Entry, Outcome, Page, RunSource } from '../lib/run-context.ts'

/** `remote.workspaceFiles` 的结构性子集（只取本适配器用到的三个方法；测试可传裸对象）。 */
export interface WorkspaceFilesLike {
  list(sessionId: SessionId, path: string, signal: AbortSignal): Promise<RemoteResult>
  read(sessionId: SessionId, path: string, options: { readonly offset?: number; readonly limit?: number }, signal: AbortSignal): Promise<RemoteResult>
  stat(sessionId: SessionId, path: string, signal: AbortSignal): Promise<RemoteResult>
}

interface RemoteResult {
  readonly ok: boolean
  readonly value?: unknown
  readonly error?: { readonly code?: unknown }
}

/** 未传 signal 的调用用一个永不 abort 的 signal（RunSource 的 signal 是可选的）。 */
const NEVER_ABORTED = new AbortController().signal

const missing = (): Outcome<never> => ({ ok: false, reason: 'missing' })
const unreadable = (detail: string): Outcome<never> => ({ ok: false, reason: 'unreadable', detail })

function codeOf(result: RemoteResult): string {
  return typeof result.error?.code === 'string' ? result.error.code : ''
}

function failureOf(result: RemoteResult, what: string): Outcome<never> {
  return codeOf(result) === 'workspace-file/not-found' ? missing() : unreadable(`${what}: ${codeOf(result) || 'unknown'}`)
}

function entryOf(raw: unknown): Entry | null {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as { readonly name?: unknown; readonly type?: unknown; readonly mtimeMs?: unknown }
  if (typeof record.name !== 'string') return null
  const type = record.type === 'directory' ? 'directory' : record.type === 'file' ? 'file' : 'other'
  return {
    name: record.name,
    type,
    ...(typeof record.mtimeMs === 'number' ? { mtimeMs: record.mtimeMs } : {}),
  }
}

/**
 * 浏览器 RunSource 工厂。
 * @param files - `scoped.remote.workspaceFiles`（或测试假件）。
 * @param sessionId - 当前会话（workspaceFiles 的授权单位）。
 * @returns `RunSource`（list/read/version）。
 */
export function browserRunSource(files: WorkspaceFilesLike, sessionId: SessionId): RunSource {
  return {
    async list(dir, opts) {
      let result: RemoteResult
      try {
        result = await files.list(sessionId, dir, opts?.signal ?? NEVER_ABORTED)
      } catch (cause) {
        return unreadable(`list ${dir}: ${String(cause)}`)
      }
      if (!result.ok) return failureOf(result, `list ${dir}`)
      const value = result.value
      if (typeof value !== 'object' || value === null) return unreadable(`list ${dir}: malformed value`)
      const rawEntries = (value as { readonly entries?: unknown }).entries
      if (!Array.isArray(rawEntries)) return unreadable(`list ${dir}: missing entries`)
      const entries: Entry[] = []
      for (const raw of rawEntries) {
        const entry = entryOf(raw)
        if (entry !== null) entries.push(entry)
      }
      return { ok: true, value: entries }
    },
    async read(path, opts) {
      let result: RemoteResult
      try {
        result = await files.read(sessionId, path, { offset: opts.offset, limit: opts.limit }, opts.signal ?? NEVER_ABORTED)
      } catch (cause) {
        return unreadable(`read ${path}: ${String(cause)}`)
      }
      if (!result.ok) return failureOf(result, `read ${path}`)
      const value = result.value
      if (typeof value !== 'object' || value === null) return unreadable(`read ${path}: malformed value`)
      const record = value as { readonly text?: unknown; readonly lines?: unknown; readonly eof?: unknown; readonly version?: unknown }
      if (typeof record.text !== 'string' || typeof record.lines !== 'number' || typeof record.eof !== 'boolean') {
        return unreadable(`read ${path}: malformed page`)
      }
      const page: Page = {
        text: record.text,
        lines: record.lines,
        eof: record.eof,
        ...(typeof record.version === 'string' ? { version: record.version } : {}),
      }
      return { ok: true, value: page }
    },
    async version(path, opts) {
      let result: RemoteResult
      try {
        result = await files.stat(sessionId, path, opts?.signal ?? NEVER_ABORTED)
      } catch (cause) {
        return unreadable(`stat ${path}: ${String(cause)}`)
      }
      if (!result.ok) return failureOf(result, `stat ${path}`)
      const value = result.value
      if (typeof value !== 'object' || value === null) return unreadable(`stat ${path}: malformed value`)
      const version = (value as { readonly version?: unknown }).version
      return typeof version === 'string' ? { ok: true, value: version } : unreadable(`stat ${path}: missing version`)
    },
  }
}
