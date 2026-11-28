/**
 * rightbar-nav.ts — 右栏跨会话资源/页签导航闭包工厂（BUG-459 / BUG-471 / BUG-479）。
 *
 * 把挂起取消器与 expectedSessionId 等待逻辑收进单一工厂，避免 `client/index.ts` 膨胀。
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { finalAddressOf } from '../lib/run/final-target.ts'
import { evidenceAddressOf } from '../lib/run/evidence-card.ts'
import { RESEARCH_GRAPH_TAB_KIND, RESEARCH_STATUS_TAB_KIND } from './keys.ts'
import {
  buildMemberSessionTarget,
  openResourceWhenMounted,
  openTabWhenMounted,
  type SidebarRightResourceHost,
} from './startup.ts'

export interface WorkspaceNavLike {
  openSession(target: SessionId | {
    readonly parentSessionId: SessionId
    readonly childSessionId: SessionId
    readonly mode: 'continuable'
  }): void
}

export interface RightbarNav {
  readonly openFinal: (sessionId: SessionId, path: string) => void
  readonly openEvidence: (sessionId: SessionId, runDir: string, cardFile: string) => void
  readonly openSession: (sessionId: SessionId) => void
  readonly openMember: (leadSessionId: SessionId, memberId: SessionId) => void
  readonly revealStatusTab: (expectedSessionId?: SessionId) => void
  readonly revealGraphTab: (nodeId?: string) => void
  readonly openSessionFinal: (sessionId: SessionId, path: string) => void
  readonly toggleRightFullscreen: () => void
  readonly dispose: () => void
}

export function createRightbarNav(
  sidebarRight: SidebarRightResourceHost,
  uiWorkspace: WorkspaceNavLike,
  backToChat: () => void,
): RightbarNav {
  let cancelFinal: (() => void) | null = null
  let cancelEvidence: (() => void) | null = null
  let cancelTab: (() => void) | null = null

  const openFinal = (sessionId: SessionId, path: string): void => {
    cancelFinal?.()
    cancelFinal = openResourceWhenMounted(sidebarRight, finalAddressOf(sessionId, path), {
      expectedSessionId: sessionId,
      onError: (cause) => { console.error('[research-final] openResource 失败', String(cause)) },
    })
  }
  const openEvidence = (sessionId: SessionId, runDir: string, cardFile: string): void => {
    cancelEvidence?.()
    cancelEvidence = openResourceWhenMounted(sidebarRight, evidenceAddressOf(sessionId, runDir, cardFile), {
      expectedSessionId: sessionId,
      onError: (cause) => { console.error('[research-evidence] openResource 失败', String(cause)) },
    })
  }
  const openSession = (sessionId: SessionId): void => { uiWorkspace.openSession(sessionId) }
  const openMember = (leadSessionId: SessionId, memberId: SessionId): void => {
    uiWorkspace.openSession(buildMemberSessionTarget(leadSessionId, memberId))
  }
  const revealStatusTab = (expectedSessionId?: SessionId): void => {
    cancelTab?.()
    cancelTab = openTabWhenMounted(sidebarRight, RESEARCH_STATUS_TAB_KIND, {
      ...(expectedSessionId !== undefined ? { expectedSessionId } : {}),
      onError: (cause) => { console.error('[research-status] openTab 失败', String(cause)) },
    })
  }
  const revealGraphTab = (nodeId?: string): void => {
    cancelTab?.()
    cancelTab = openTabWhenMounted(sidebarRight, RESEARCH_GRAPH_TAB_KIND, {
      ...(nodeId !== undefined && nodeId !== '' ? { params: { nodeId } } : {}),
      onError: (cause) => { console.error('[research-graph] openTab 失败', String(cause)) },
    })
  }
  const openSessionFinal = (sessionId: SessionId, path: string): void => {
    openSession(sessionId)
    backToChat()
    openFinal(sessionId, path)
  }
  const toggleRightFullscreen = (): void => {
    const sr = sidebarRight as unknown as {
      commandTarget?: (el: Element | null) => unknown
      toggleFullscreen?: (target: unknown) => void
    }
    const target = sr.commandTarget?.(null)
    if (target !== undefined) sr.toggleFullscreen?.(target)
  }
  const dispose = (): void => {
    cancelFinal?.(); cancelFinal = null
    cancelEvidence?.(); cancelEvidence = null
    cancelTab?.(); cancelTab = null
  }

  return {
    openFinal,
    openEvidence,
    openSession,
    openMember,
    revealStatusTab,
    revealGraphTab,
    openSessionFinal,
    toggleRightFullscreen,
    dispose,
  }
}
