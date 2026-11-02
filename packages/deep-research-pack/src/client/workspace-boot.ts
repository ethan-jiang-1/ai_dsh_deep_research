// workspace-boot.ts — 启动期工作区选择/恢复（首屏 onboarding + 记忆恢复）。
//
// 从 client/index.ts 拆出（2026-11-03 审计 P4）。服务面以结构类型注入，localStorage 可注入，
// 纯逻辑（pickProductWorkspace / needsProductSwitch）仍住 startup.ts。
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  CURRENT_SESSION_KEY, PRODUCT_WORKSPACE_KEY, needsProductSwitch, pickProductWorkspace, readCurrentSessionId,
} from './startup.ts'

/** vendor uiWorkspace 的导航面（本包不新增 peer）。 */
export interface UiWorkspaceLike {
  openSession(target: SessionId): void
  startSession(workspaceId: string, options?: { agentPreset?: string }): void
  pickDirectory(): Promise<string | null>
}

export interface WorkspaceSummary {
  readonly workspaceId: string
  readonly title: string
  readonly path: string
  readonly sessionIds: readonly SessionId[]
}

export interface WorkspacesLike {
  readonly list: { getSnapshot(): { readonly phase: 'pending' | 'ready'; readonly items: readonly WorkspaceSummary[] } }
  create(input: { readonly path: string }): Promise<{ readonly workspaceId: string }>
}

export interface SessionsLike {
  readonly list: { getSnapshot(): { readonly phase: 'pending' | 'ready'; readonly byId: Record<string, { readonly cwd?: string } | undefined> } }
}

/** 注入位：storage 缺省 = localStorage（测试传内存实现）。 */
export interface WorkspaceBootDeps {
  readonly workspaces: WorkspacesLike
  readonly sessions: SessionsLike
  readonly uiWorkspace: UiWorkspaceLike
  readonly storage?: Pick<Storage, 'getItem' | 'setItem'>
}

/** 等列表就绪（pending → ready）；超时返回当前快照（不抛——调用方用快照继续）。 */
export async function waitReady<T extends { readonly phase: 'pending' | 'ready' }>(
  list: { getSnapshot(): T }, timeoutMs = 2500,
): Promise<T> {
  const deadline = Date.now() + timeoutMs
  let snapshot = list.getSnapshot()
  while (snapshot.phase === 'pending' && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    snapshot = list.getSnapshot()
  }
  return snapshot
}

/** 建启动期动作：chooseWorkspace（首屏选目录）/ ensureProductWorkspace（恢复记忆）/ workspaceOf（卡片路径）。 */
export function createWorkspaceBoot({ workspaces, sessions, uiWorkspace, storage = localStorage }: WorkspaceBootDeps) {
  /** 首屏 onboarding：选目录 → 登记 Workspace → 记住 id → 开 Lead 会话。 */
  const chooseWorkspace = async (): Promise<void> => {
    const path = await uiWorkspace.pickDirectory()
    if (path === null) return
    const workspace = await workspaces.create({ path })
    storage.setItem(PRODUCT_WORKSPACE_KEY, workspace.workspaceId)
    uiWorkspace.startSession(workspace.workspaceId, { agentPreset: 'lead' })
  }

  /** 启动时把选择恢复到产品工作区；失败只记日志，不阻断 composer。 */
  const ensureProductWorkspace = async (): Promise<void> => {
    try {
      const list = await waitReady(workspaces.list)
      await waitReady(sessions.list)
      const saved = storage.getItem(PRODUCT_WORKSPACE_KEY)
      const workspace = pickProductWorkspace(list.items, saved)
      if (workspace === null) return
      if (saved !== workspace.workspaceId) storage.setItem(PRODUCT_WORKSPACE_KEY, workspace.workspaceId)
      const current = readCurrentSessionId(storage.getItem(CURRENT_SESSION_KEY))
      const rows = sessions.list.getSnapshot()
      const row = current === null ? undefined : rows.byId[current as SessionId]
      if (!needsProductSwitch(row?.cwd, workspace.path)) return
      uiWorkspace.startSession(workspace.workspaceId, { agentPreset: 'lead' })
    } catch (error) {
      console.error('[research-startup] 工作区记忆恢复失败', String(error))
    }
  }

  /** 当前 Session 所属 Workspace 的显示信息（vendor picker 已显示标题；卡片再给路径）。 */
  const workspaceOf = (sessionId: SessionId): { title: string; path: string } | null => {
    try {
      const snapshot = workspaces.list.getSnapshot()
      const item = snapshot.items.find((workspace) => workspace.sessionIds.includes(sessionId))
      return item === undefined ? null : { title: item.title, path: item.path }
    } catch {
      return null
    }
  }

  return { chooseWorkspace, ensureProductWorkspace, workspaceOf }
}
