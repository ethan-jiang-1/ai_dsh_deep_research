// lead-prompt.ts — 管理指令发送（D25 期 1）：steer 优先、失败降级 queue，两态如实回执。
//
// 从 client/index.ts 拆出（2026-11-03 审计 P4）。requestId 铸造 = vendor 同款
// （session.ts beginSubmission：randomUUID as SessionRequestId）；remote 句柄在注入回调内取好。
import type { SessionId } from '@deepseek-ai/dsh-session/types'

export interface LeadPromptRemote {
  prompt(input: unknown, signal: AbortSignal): Promise<{ ok: boolean; error?: unknown }>
}

export function createLeadPrompt(remote: LeadPromptRemote) {
  const sendInstruction = async (sessionId: SessionId, text: string): Promise<{ ok: boolean; detail: string }> => {
    const requestId = crypto.randomUUID() as import('@deepseek-ai/dsh-api-remotes/client').SessionRequestId
    const base = { requestId, sessionId, content: [{ type: 'text' as const, text }] }
    try {
      const steer = await remote.prompt({ ...base, mode: 'steer' }, new AbortController().signal)
      if (steer.ok) return { ok: true, detail: '已发送给 Lead' }
      const queued = await remote.prompt({ ...base, mode: 'queue' }, new AbortController().signal)
      return queued.ok ? { ok: true, detail: '已发送给 Lead' } : { ok: false, detail: String(queued.error ?? '未知错误') }
    } catch (cause) {
      return { ok: false, detail: String(cause) }
    }
  }
  return { sendInstruction }
}
