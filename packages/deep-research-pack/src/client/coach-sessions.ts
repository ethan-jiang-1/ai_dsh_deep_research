// coach-sessions.ts — 方法编辑（Method Editor）会话的生命周期与发送。
//
// 从 client/index.ts 拆出（2026-11-03 审计 P4）。每个活动草稿一个确定性会话 id
// （`method-coach-<draftKey>`），无浏览器持久化；`retain` 失败才创建（会话缺席 = 首次打开）。
// 服务经 `ctx.get` 读取（Cordis：直接属性访问会触发 inject 守卫）。
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { translateZh, type PackTranslate } from '../lib/i18n.ts'

/** 会话服务最小面（vendor sessions）。 */
export interface CoachSessionService {
  create(opts: { workspaceId?: string; cwd?: string; sessionId?: SessionId; agentPreset?: string }): Promise<SessionId>
  retain(id: SessionId, opts: { source: string }): {
    release(): void
    ready: Promise<unknown>
    binding: { session: { getSnapshot(): { openState: string } } }
  }
  list: { getSnapshot(): { byId: Record<string, { cwd?: string } | undefined> } }
}

/** 工作区服务最小面（找当前会话所属 workspace）。 */
export interface CoachWorkspaceService {
  list: { getSnapshot(): { items: readonly { workspaceId: string; sessionIds: readonly SessionId[] }[] } }
}

/** `remote.session` 的最小面（bind 在注入回调内取好，避免渲染 fiber 的 inject 守卫）。 */
export interface CoachRemote {
  rename(input: { sessionId: SessionId; title: string }): Promise<unknown>
  prompt(input: unknown, signal: AbortSignal): Promise<{ ok: boolean; error?: unknown }>
}

export interface CoachReference {
  release(): void
  ready: Promise<unknown>
  binding: { session: { getSnapshot(): { openState: string } } }
}

export function createCoachSessions(ctx: { get(name: string): unknown }, remote: CoachRemote, t: PackTranslate = translateZh) {
  const ensureCoachSession = async (currentSessionId: SessionId, draftKey: string): Promise<{ id: SessionId; reference: CoachReference }> => {
    const sessions = ctx.get('sessions') as CoachSessionService | undefined
    if (sessions === undefined) throw new Error(t('sessionsUnavailable'))
    const workspaces = ctx.get('workspaces') as CoachWorkspaceService | undefined
    const workspaceId = workspaces?.list.getSnapshot().items
      .find((item) => item.sessionIds.includes(currentSessionId))?.workspaceId
    const cwd = sessions.list.getSnapshot().byId[currentSessionId]?.cwd
    const deterministicId = `method-coach-${draftKey}` as SessionId
    try {
      return { id: deterministicId, reference: sessions.retain(deterministicId, { source: 'methodCoach' }) }
    } catch {
      // A missing Session is created below from the current page's selected workspace.
    }
    const created = await sessions.create({
      sessionId: deterministicId,
      ...(workspaceId === undefined ? {} : { workspaceId }),
      ...(workspaceId === undefined && cwd !== undefined ? { cwd } : {}),
      agentPreset: 'method-editor',
    })
    try { await remote.rename({ sessionId: created, title: t('methodEditorTitle') }) } catch { /* non-fatal */ }
    return { id: created, reference: sessions.retain(created, { source: 'methodCoach' }) }
  }

  const sendCoach = async (
    sessionId: SessionId,
    text: string,
    requestId: string = crypto.randomUUID(),
  ): Promise<{ readonly ok: boolean; readonly detail?: string; readonly uncertain?: boolean }> => {
    const typedRequestId = requestId as import('@deepseek-ai/dsh-api-remotes/client').SessionRequestId
    try {
      const result = await remote.prompt(
        { requestId: typedRequestId, sessionId, mode: 'queue', content: [{ type: 'text' as const, text }] },
        new AbortController().signal,
      )
      return result.ok ? { ok: true } : { ok: false, detail: String(result.error ?? 'prompt rejected') }
    } catch (cause) {
      return { ok: false, detail: String(cause), uncertain: true }
    }
  }

  return { ensureCoachSession, sendCoach }
}
