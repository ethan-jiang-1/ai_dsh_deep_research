// coach-sessions.ts — 方法编辑（Method Editor）会话的生命周期与发送。
//
// 从 client/index.ts 拆出（2026-11-03 审计 P4）。每个活动草稿一个确定性会话 id
// （`method-coach-<draftKey>`），无浏览器持久化；`retain` 失败才创建（会话缺席 = 首次打开）。
// 服务经 `ctx.get` 读取（Cordis：直接属性访问会触发 inject 守卫）。
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { translateZh, type PackTranslate } from '../lib/i18n.ts'
import { en, zh } from './locales.ts'

/** 会话服务最小面（vendor sessions）。 */
export interface CoachSessionService {
  create(opts: { workspaceId?: string; cwd?: string; sessionId?: SessionId; agentPreset?: string }): Promise<SessionId>
  retain(id: SessionId, opts: { source: string }): {
    release(): void
    ready: Promise<unknown>
    binding: { session: { getSnapshot(): { openState: string } } }
  }
  list: { getSnapshot(): { byId: Record<string, { cwd?: string; title?: string } | undefined> } }
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

/** 方法编辑会话 id 前缀（确定性 id：`method-coach-<draftKey>`）。 */
const COACH_SESSION_PREFIX = 'method-coach-'

/** 方法编辑的**自动**默认标题只有这两个 locale 值（创建时写入；BUG-069）。 */
const KNOWN_METHOD_EDITOR_TITLES: readonly string[] = [zh.methodEditorTitle, en.methodEditorTitle]

/**
 * 历史会话标题迁移判据（纯函数，BUG-069）：
 * 已有标题等于任一已知 `methodEditorTitle`、且不等于当前 locale 标题 → 返回应改成的当前
 * locale 标题；否则 null（用户自定义标题绝不动）。
 * @param existingTitle - 会话当前的持久化标题（缺席 = 尚未投影，不迁移）。
 * @param currentTitle - 当前 locale 的 `methodEditorTitle`。
 * @returns 新标题或 null（不改）。
 */
export function coachTitleMigrationOf(existingTitle: string | undefined, currentTitle: string): string | null {
  if (existingTitle === undefined) return null
  const title = existingTitle.trim()
  if (title === '' || title === currentTitle) return null
  return KNOWN_METHOD_EDITOR_TITLES.includes(title) ? currentTitle : null
}

/**
 * 把**全部**已知方法编辑会话的自动标题迁到当前 locale（BUG-069 的复现步骤 4：会话开着切
 * locale，标题也随当前界面变）。只认 `method-coach-*` id + 已知默认标题——用户改过的标题、
 * 其它会话一律不动；单条 rename 失败不阻塞其余（fail-soft）。
 * @param sessions - 会话服务（读 list 快照里的持久化标题）。
 * @param remote - rename 通道。
 * @param t - 当前 locale 翻译器（调用时读取 active locale）。
 */
export async function migrateCoachTitles(
  sessions: CoachSessionService,
  remote: CoachRemote,
  t: PackTranslate = translateZh,
): Promise<void> {
  const current = t('methodEditorTitle')
  for (const [id, row] of Object.entries(sessions.list.getSnapshot().byId)) {
    if (!id.startsWith(COACH_SESSION_PREFIX)) continue
    const next = coachTitleMigrationOf(row?.title, current)
    if (next === null) continue
    try { await remote.rename({ sessionId: id as SessionId, title: next }) } catch { /* non-fatal */ }
  }
}

export function createCoachSessions(ctx: { get(name: string): unknown }, remote: CoachRemote, t: PackTranslate = translateZh) {
  /** 打开已有会话时把自动标题迁到当前 locale；失败不阻塞访谈（标题只是展示）。 */
  const migrateCoachTitle = async (sessions: CoachSessionService, sessionId: SessionId): Promise<void> => {
    const existing = sessions.list.getSnapshot().byId[sessionId]?.title
    const next = coachTitleMigrationOf(existing, t('methodEditorTitle'))
    if (next === null) return
    try { await remote.rename({ sessionId, title: next }) } catch { /* non-fatal */ }
  }

  /** locale 切换时调用：扫全会话列表里本包的自动标题（见 migrateCoachTitles）。 */
  const migrateKnownCoachTitles = async (): Promise<void> => {
    const sessions = ctx.get('sessions') as CoachSessionService | undefined
    if (sessions === undefined) return
    await migrateCoachTitles(sessions, remote, t)
  }

  const ensureCoachSession = async (currentSessionId: SessionId, draftKey: string): Promise<{ id: SessionId; reference: CoachReference }> => {
    const sessions = ctx.get('sessions') as CoachSessionService | undefined
    if (sessions === undefined) throw new Error(t('sessionsUnavailable'))
    const workspaces = ctx.get('workspaces') as CoachWorkspaceService | undefined
    const workspaceId = workspaces?.list.getSnapshot().items
      .find((item) => item.sessionIds.includes(currentSessionId))?.workspaceId
    const cwd = sessions.list.getSnapshot().byId[currentSessionId]?.cwd
    const deterministicId = `${COACH_SESSION_PREFIX}${draftKey}` as SessionId
    let reference: CoachReference | null = null
    try {
      reference = sessions.retain(deterministicId, { source: 'methodCoach' })
    } catch {
      // A missing Session is created below from the current page's selected workspace.
    }
    if (reference !== null) {
      await migrateCoachTitle(sessions, deterministicId)
      return { id: deterministicId, reference }
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

  return { ensureCoachSession, sendCoach, migrateKnownCoachTitles }
}
