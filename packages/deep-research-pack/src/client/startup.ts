/**
 * client/startup — 首屏工作区记忆与选择的纯谓词（D40）。
 *
 * 产品设置文件在 `$DSH_HOME`，浏览器拿不到；GUI 侧记住"上次选的产品工作区"只存
 * `localStorage`（设备/源级提示，不是权威）：权威仍是 DSH Workspace registry。
 * 谓词住这里，组件只做副作用。
 */
import { PRODUCT_TITLE_PREFIX } from '../lib/workspace/workspace-title.ts'

/** 上次选择的产品工作区 id（浏览器本地提示）。 */
export const PRODUCT_WORKSPACE_KEY = 'dsh.deep-research.workspaceId.v1'

/** DSH 当前会话选择键（vendor 约定；只读它判断是否需要切回产品工作区）。 */
export const CURRENT_SESSION_KEY = 'dsh.sessions.current'

/** Host 登记产品工作区时使用的标题前缀（单一正本 = workspace-title 折算件）。 */
export { PRODUCT_TITLE_PREFIX } from '../lib/workspace/workspace-title.ts'

/** 只读选择所需的字段。 */
export interface WorkspaceRowLike {
  readonly workspaceId: string
  readonly title: string
  readonly path: string
}

/**
 * 从 `dsh.sessions.current` 的原始值里取会话 id。
 * @param raw - localStorage 原始字符串（可能是 `{sessionId}` 或裸 id）。
 * @returns 会话 id 或 null。
 */
export function readCurrentSessionId(raw: string | null): string | null {
  if (raw === null || raw === '') return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'string') return parsed === '' ? null : parsed
    if (parsed !== null && typeof parsed === 'object') {
      const id = (parsed as { sessionId?: unknown }).sessionId
      return typeof id === 'string' && id !== '' ? id : null
    }
    return null
  } catch {
    return null
  }
}

/**
 * 选出产品工作区：保存的 id 优先；否则唯一标题匹配。
 * @param items - Workspace 列表快照。
 * @param savedId - localStorage 里的 id。
 * @returns 命中的工作区或 null。
 */
export function pickProductWorkspace<T extends WorkspaceRowLike>(
  items: readonly T[],
  savedId: string | null,
): T | null {
  if (savedId !== null) {
    const saved = items.find((item) => item.workspaceId === savedId)
    if (saved !== undefined) return saved
  }
  const titled = items.filter((item) => item.title.startsWith(PRODUCT_TITLE_PREFIX))
  return titled.length === 1 ? (titled[0] ?? null) : null
}

/**
 * 当前会话是否已经在该工作区。
 * @param currentCwd - 当前会话的 cwd（未知 = undefined）。
 * @param productPath - 产品工作区路径。
 * @returns true = 需要切到产品会话。
 */
export function needsProductSwitch(currentCwd: string | undefined, productPath: string): boolean {
  return currentCwd === undefined || currentCwd !== productPath
}

/**
 * 选出「新研究」目标工作区：优先当前会话所属工作区，避免切走后被旧 localStorage 强拉回（BUG-479）。
 */
export function pickStartWorkspaceId<T extends WorkspaceRowLike>(
  items: readonly T[],
  currentWorkspaceId: string | undefined,
  savedId: string | null,
): string | undefined {
  if (currentWorkspaceId !== undefined && items.some((item) => item.workspaceId === currentWorkspaceId)) {
    return currentWorkspaceId
  }
  return pickProductWorkspace(items, savedId)?.workspaceId
}

/** 构造 `uiWorkspace.openSession` 的队员会话地址：显式携带 `parentSessionId`，避免依赖未预热的 subagentCatalog（BUG-471）。 */
export function buildMemberSessionTarget<S extends string>(
  leadSessionId: S,
  memberId: S,
): S | { readonly parentSessionId: S; readonly childSessionId: S; readonly mode: 'continuable' } {
  if (memberId === leadSessionId) return leadSessionId
  return { parentSessionId: leadSessionId, childSessionId: memberId, mode: 'continuable' }
}

/**
 * 构造 `uiWorkspace.startSession` 的草稿初始化参数（BUG-451 / BUG-479）：
 * 使用 vendor `DraftInitializationOptions.prompt` 与 `whenDraftExists: 'append'`，不静默丢弃透镜 prompt。
 */
export function buildStartResearchOptions(prompt?: string): {
  readonly prompt: string
  readonly whenDraftExists: 'append'
} | undefined {
  if (prompt === undefined || prompt.trim() === '') return undefined
  return { prompt, whenDraftExists: 'append' }
}

export interface SidebarRightResourceHost {
  openResource(address: string): void
  openTab?: (kind: never, options?: never) => void
  mounted?: {
    readonly getSnapshot: () => string | undefined
    readonly subscribe?: (listener: () => void) => () => void
  }
  isExpanded?: () => boolean
  toggleExpanded?: () => void
}

export interface SidebarRightMountWaitOptions {
  readonly expectedSessionId?: string
  readonly intervalMs?: number
  readonly maxAttempts?: number
  readonly onError?: (cause: unknown) => void
}

function whenSessionMounted(
  sidebarRight: SidebarRightResourceHost,
  runAction: () => void,
  opts?: SidebarRightMountWaitOptions,
): () => void {
  const intervalMs = opts?.intervalMs ?? 25
  const maxAttempts = opts?.maxAttempts ?? 24
  const expected = opts?.expectedSessionId
  let cancelled = false
  let done = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let unsubscribe: (() => void) | null = null
  let attempts = 0

  const cleanup = (): void => {
    if (timer !== null) { clearTimeout(timer); timer = null }
    if (unsubscribe !== null) { unsubscribe(); unsubscribe = null }
  }

  const tryOpen = (): void => {
    if (cancelled || done) return
    attempts += 1
    if (expected !== undefined && sidebarRight.mounted !== undefined) {
      const current = sidebarRight.mounted.getSnapshot()
      if (current !== expected) {
        if (attempts < maxAttempts) {
          timer = setTimeout(tryOpen, intervalMs)
          return
        }
        done = true
        cleanup()
        opts?.onError?.(new Error(`sidebarRight: expected session "${expected}" did not mount`))
        return
      }
    }
    try {
      runAction()
      if (sidebarRight.isExpanded?.() === false) sidebarRight.toggleExpanded?.()
      done = true
      cleanup()
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      if (/no session surface is mounted/i.test(msg) && attempts < maxAttempts) {
        timer = setTimeout(tryOpen, intervalMs)
        return
      }
      done = true
      cleanup()
      opts?.onError?.(cause)
    }
  }

  if (expected !== undefined && typeof sidebarRight.mounted?.subscribe === 'function') {
    unsubscribe = sidebarRight.mounted.subscribe(() => {
      if (cancelled || done) return
      if (sidebarRight.mounted?.getSnapshot() === expected) {
        if (timer !== null) { clearTimeout(timer); timer = null }
        tryOpen()
      }
    })
  }

  tryOpen()
  return () => {
    cancelled = true
    cleanup()
  }
}

/**
 * 等待 `ui-sidebar-right` 挂载到目标会话后打开资源并展开收起的右栏（BUG-459 / BUG-471）。
 */
export function openResourceWhenMounted(
  sidebarRight: SidebarRightResourceHost,
  address: string,
  opts?: SidebarRightMountWaitOptions,
): () => void {
  return whenSessionMounted(sidebarRight, () => { sidebarRight.openResource(address) }, opts)
}

/**
 * 等待 `ui-sidebar-right` 挂载到目标会话后打开指定页签并展开收起的右栏（BUG-471 / BUG-479）。
 */
export function openTabWhenMounted(
  sidebarRight: SidebarRightResourceHost,
  kind: string,
  opts?: SidebarRightMountWaitOptions & { readonly params?: Record<string, unknown> },
): () => void {
  const openOpts = opts?.params !== undefined ? { params: opts.params } : undefined
  return whenSessionMounted(sidebarRight, () => {
    const openTab = sidebarRight.openTab as ((k: string, o?: { readonly params?: Record<string, unknown> }) => void) | undefined
    openTab?.(kind, openOpts)
  }, opts)
}
