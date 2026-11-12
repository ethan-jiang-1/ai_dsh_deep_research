/**
 * client/defaults/store — 项目研究默认的按 session 读/写状态（按钮与面板共用同一份）。
 *
 * 读：workspaceFiles 读 `research-defaults.json`（missingOk）+ `method-library.md`；
 * 写：唯一路径 = `remote.commands.execute('/research-defaults …')`；面板不直写。
 * 「自动」= 文件/字段缺席；本 store 不物化默认值：无文件就是 auto，unset 后回 auto。
 *
 * 纯折算住 `src/lib/research-defaults.ts`（keyless 测）；本文件只做状态机与 remote 接线。
 */
import { useEffect, useSyncExternalStore } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { foldLibrary } from '../../lib/library-fold.ts'
import type { MethodLibraryReadResult } from '../../lib/method-library-read.ts'
import {
  DEFAULTS_FILE,
  DEFAULTS_AXES,
  emptyDefaults,
  findDefaultMethod,
  parseCommandOutcome,
  parseDefaults,
  sanitizePatch,
  type DefaultsAxis,
  type DefaultsPatch,
  type DefaultsProblem,
  type DefaultsValue,
} from '../../lib/research-defaults.ts'

/** `remote.workspaceFiles.read` 的 client 闭包（index.ts 的 readText 形态）。 */
export type DefaultsReadText = (
  sessionId: SessionId,
  path: string,
  signal: AbortSignal,
  limit?: number,
  missingOk?: boolean,
) => Promise<string | null>

/** 工作区目录列举（区分「文件缺席」与「文件在但读不回」）。 */
export type DefaultsListDir = (
  sessionId: SessionId,
  path: string,
  signal: AbortSignal,
) => Promise<readonly { readonly type: string; readonly name: string }[] | null>

/** 方法库全文读取（分页拼装归 workspace-files）。 */
export type DefaultsReadLibrary = (
  sessionId: SessionId,
  path: string,
  signal: AbortSignal,
) => Promise<MethodLibraryReadResult>

/** `/research-defaults` 的 Remote 结果最小面。 */
export interface CommandExecutionLike {
  readonly result: {
    readonly kind: 'success' | 'error'
    readonly text?: string
  }
}

export type CommandRemoteResult =
  | { readonly ok: true; readonly value: CommandExecutionLike }
  | { readonly ok: false; readonly error: unknown }

export type DefaultsExecute = (sessionId: SessionId, line: string) => Promise<CommandRemoteResult>

/** 一次写/读的回执。 */
export interface DefaultsOutcome {
  readonly kind: 'ok' | 'error'
  readonly code?: string
  readonly revision?: number
  readonly detail?: string
}

/** 面板/按钮消费的状态快照。 */
export interface DefaultsSnapshot {
  readonly phase: 'loading' | 'ready' | 'unreadable'
  readonly value: DefaultsValue
  readonly problems: readonly DefaultsProblem[]
  readonly warnings: readonly DefaultsProblem[]
  readonly methodDefault: string | null
  readonly methodConflict: boolean
  readonly methodRead: 'ok' | 'absent' | 'error'
  readonly revision: number
  readonly pending: boolean
  readonly outcome: DefaultsOutcome | null
}

/** store 依赖（index.ts 装配；测试可注入）。 */
export interface DefaultsStoreDeps {
  readonly readText: DefaultsReadText
  readonly listDir: DefaultsListDir
  readonly readLibrary: DefaultsReadLibrary
  readonly execute: DefaultsExecute
}

/** 对外接口。 */
export interface DefaultsStore {
  subscribe(listener: () => void): () => void
  getSnapshot(sessionId: SessionId | undefined): DefaultsSnapshot
  refresh(sessionId: SessionId): Promise<void>
  setPatch(sessionId: SessionId, patch: DefaultsPatch): Promise<void>
  unset(sessionId: SessionId, fields: readonly DefaultsAxis[]): Promise<void>
  clear(sessionId: SessionId): Promise<void>
  dispose(): void
}

const initialSnapshot = (): DefaultsSnapshot => ({
  phase: 'loading',
  value: emptyDefaults(),
  problems: [],
  warnings: [],
  methodDefault: null,
  methodConflict: false,
  methodRead: 'absent',
  revision: 0,
  pending: false,
  outcome: null,
})

const EMPTY = initialSnapshot()

const outcomeOf = (result: CommandRemoteResult): DefaultsOutcome => {
  if (!result.ok) return { kind: 'error', code: 'io', detail: String(result.error) }
  const text = result.value.result.text ?? ''
  const parsed = parseCommandOutcome(text)
  if (parsed.ok) {
    return {
      kind: 'ok',
      ...parsed.revision === undefined ? {} : { revision: parsed.revision },
    }
  }
  return {
    kind: 'error',
    code: parsed.code ?? 'error',
    ...parsed.revision === undefined ? {} : { revision: parsed.revision },
    ...text === '' ? {} : { detail: text },
  }
}

/**
 * 创建 store（一个 client 插件实例一份）。
 * @param deps - 读/列/库/命令闭包。
 * @returns store。
 */
export function createDefaultsStore(deps: DefaultsStoreDeps): DefaultsStore {
  const states = new Map<SessionId, DefaultsSnapshot>()
  const snapshots = new Map<SessionId, DefaultsSnapshot>()
  const listeners = new Set<() => void>()
  const controllers = new Map<SessionId, AbortController>()
  const sequences = new Map<SessionId, number>()
  const writeQueues = new Map<SessionId, Promise<void>>()

  const notify = (): void => {
    for (const listener of [...listeners]) {
      try { listener() } catch { /* 订阅者失败不阻断其他订阅者 */ }
    }
  }

  const stateOf = (sessionId: SessionId): DefaultsSnapshot => states.get(sessionId) ?? EMPTY

  const setState = (sessionId: SessionId, next: DefaultsSnapshot): void => {
    states.set(sessionId, next)
    snapshots.set(sessionId, next)
    notify()
  }

  const patchState = (sessionId: SessionId, patch: Partial<DefaultsSnapshot>): void => {
    setState(sessionId, { ...stateOf(sessionId), ...patch })
  }

  const refresh = async (sessionId: SessionId): Promise<void> => {
    const sequence = (sequences.get(sessionId) ?? 0) + 1
    sequences.set(sessionId, sequence)
    controllers.get(sessionId)?.abort()
    const controller = new AbortController()
    controllers.set(sessionId, controller)
    const signal = controller.signal
    const current = stateOf(sessionId)

    const [text, library, entries] = await Promise.all([
      deps.readText(sessionId, DEFAULTS_FILE, signal, 200, true).catch(() => null),
      deps.readLibrary(sessionId, 'method-library.md', signal).catch(() => ({ kind: 'error' as const, detail: 'read failed' })),
      deps.listDir(sessionId, '.', signal).catch(() => null),
    ])
    if (signal.aborted || sequences.get(sessionId) !== sequence) return

    // 列表与读文本双 null = 工作区通道不可达，不能当「文件缺席 = 自动」（BUG-092）。
    const channelDown = entries === null && text === null
    const exists = entries === null
      ? text !== null
      : entries.some((entry) => entry.name === DEFAULTS_FILE && entry.type === 'file')
    const parsed = parseDefaults(text)
    const unreadable = channelDown || (text === null && exists)
    const problems: readonly DefaultsProblem[] = unreadable
      ? [{ field: 'file', code: 'io', detail: channelDown ? 'workspace unreachable' : `${DEFAULTS_FILE} exists but could not be read` }]
      : parsed.problems
    const methodRead: 'ok' | 'absent' | 'error' = library.kind === 'ok' ? 'ok' : library.kind
    const methodEntries = library.kind === 'ok' ? foldLibrary(library.text) : []
    const defaults = methodEntries.filter((entry) => entry.isDefault)
    const methodDefault = library.kind === 'ok' ? findDefaultMethod(library.text) : null
    const phase: DefaultsSnapshot['phase'] = unreadable ? 'unreadable' : 'ready'
    const next: DefaultsSnapshot = {
      phase,
      value: parsed.value,
      problems,
      warnings: parsed.warnings,
      methodDefault,
      methodConflict: defaults.length > 1,
      methodRead,
      revision: parsed.value.revision,
      pending: current.pending,
      outcome: current.outcome,
    }
    setState(sessionId, next)
  }

  /** 同会话写串行化：pending 期间的第二次写排队，不静默丢弃（BUG-107）。 */
  const enqueueWrite = (sessionId: SessionId, task: () => Promise<void>): Promise<void> => {
    const previous = writeQueues.get(sessionId) ?? Promise.resolve()
    const next = previous.catch(() => {}).then(task)
    writeQueues.set(sessionId, next)
    void next.finally(() => { if (writeQueues.get(sessionId) === next) writeQueues.delete(sessionId) })
    return next
  }

  const runWrite = async (sessionId: SessionId, line: string): Promise<void> => {
    patchState(sessionId, { pending: true, outcome: null })
    let result: CommandRemoteResult
    try {
      result = await deps.execute(sessionId, line)
    } catch (error) {
      patchState(sessionId, { pending: false, outcome: { kind: 'error', code: 'io', detail: String(error) } })
      return
    }
    const outcome = outcomeOf(result)
    if (outcome.kind === 'error') console.error('[defaults] write failed', outcome.code ?? 'error', outcome.detail ?? '')
    if (outcome.kind === 'ok' || outcome.code === 'stale') {
      await refresh(sessionId)
    }
    patchState(sessionId, { pending: false, outcome })
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    getSnapshot(sessionId) {
      if (sessionId === undefined) return EMPTY
      return snapshots.get(sessionId) ?? EMPTY
    },
    async refresh(sessionId) {
      await refresh(sessionId)
    },
    async setPatch(sessionId, patch) {
      await enqueueWrite(sessionId, async () => {
        if (stateOf(sessionId).phase === 'loading') return
        const sanitized = sanitizePatch(patch)
        if (sanitized.problems.length > 0) {
          patchState(sessionId, {
            outcome: {
              kind: 'error',
              code: 'invalid',
              detail: sanitized.problems.map((item) => `${item.field}:${item.code}`).join(','),
            },
          })
          return
        }
        const revision = stateOf(sessionId).revision
        await runWrite(sessionId, `/research-defaults set ${JSON.stringify({ expectedRevision: revision, patch: sanitized.patch })}`)
      })
    },
    async unset(sessionId, fields) {
      await enqueueWrite(sessionId, async () => {
        if (stateOf(sessionId).phase === 'loading') return
        const valid = fields.filter((field) => (DEFAULTS_AXES as readonly string[]).includes(field))
        if (valid.length === 0) return
        const revision = stateOf(sessionId).revision
        await runWrite(sessionId, `/research-defaults unset ${valid.join(',')} revision=${revision}`)
      })
    },
    async clear(sessionId) {
      await enqueueWrite(sessionId, async () => {
        if (stateOf(sessionId).phase === 'loading') return
        const revision = stateOf(sessionId).revision
        await runWrite(sessionId, `/research-defaults clear revision=${revision}`)
      })
    },
    dispose() {
      for (const controller of controllers.values()) controller.abort()
      controllers.clear()
      listeners.clear()
    },
  }
}

/**
 * React 订阅：挂载时刷新一次；store 变更时由 useSyncExternalStore 重渲染。
 * @param store - defaults store。
 * @param sessionId - 当前会话。
 * @returns 最新快照。
 */
export function useDefaults(store: DefaultsStore, sessionId: SessionId | undefined): DefaultsSnapshot {
  const getSnapshot = (): DefaultsSnapshot => store.getSnapshot(sessionId)
  const snapshot = useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
  useEffect(() => {
    if (sessionId !== undefined) void store.refresh(sessionId)
  }, [store, sessionId])
  return snapshot
}
