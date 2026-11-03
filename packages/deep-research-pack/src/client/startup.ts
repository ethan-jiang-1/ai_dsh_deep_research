/**
 * client/startup — 首屏工作区记忆与选择的纯谓词（D40）。
 *
 * 产品设置文件在 `$DSH_HOME`，浏览器拿不到；GUI 侧记住"上次选的产品工作区"只存
 * `localStorage`（设备/源级提示，不是权威）：权威仍是 DSH Workspace registry。
 * 谓词住这里，组件只做副作用。
 */
import { PRODUCT_TITLE_PREFIX } from '../lib/workspace-title.ts'

/** 上次选择的产品工作区 id（浏览器本地提示）。 */
export const PRODUCT_WORKSPACE_KEY = 'dsh.deep-research.workspaceId.v1'

/** DSH 当前会话选择键（vendor 约定；只读它判断是否需要切回产品工作区）。 */
export const CURRENT_SESSION_KEY = 'dsh.sessions.current'

/** Host 登记产品工作区时使用的标题前缀（单一正本 = src/lib/workspace-title.ts）。 */
export { PRODUCT_TITLE_PREFIX } from '../lib/workspace-title.ts'

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
