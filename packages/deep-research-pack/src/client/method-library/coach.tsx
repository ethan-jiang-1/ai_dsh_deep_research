/**
 * 方法库页「方法编辑」对话面板（阶段 1：页内三栏 + 独立会话 + portal）。
 *
 * UX 边界：用户只看到方法库页右侧的「方法编辑」面板；对话是独立 root session，但 React 树放在
 * 根级 `shell.overlay`（`main` 的兄弟，在外层 `conversation.content` 之外），`createPortal` 把
 * DOM teleport 进页面的聊天格。主会话 transcript/上下文/composer 不被改写；页面激活时主
 * composer 由 `index.ts` 的 CSS 规则隐藏（问卡出现时让位）。
 *
 * 本文件只负责展示与 store；建会话/发 prompt 走注入（`ensure`/`send`），门禁把 slot 注册留在
 * `index.ts`（registrations are effects）。
 */
import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRenderFactories, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConversationViewsProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { METHOD_COACH_CHAT } from '../keys.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** 方法编辑 portal 目标格里的会话子槽。 */
    'method.coach.chat': { kind: 'single'; scope: 'session' }
  }
}

/** 页面 ↔ 根级 portal 的共享绑定。 */
interface CoachChatState {
  readonly visible: boolean
  readonly id: SessionId | null
  readonly reference: { release(): void } | null
  readonly host: HTMLElement | null
}

let chatState: CoachChatState = { visible: false, id: null, reference: null, host: null }
const chatListeners = new Set<() => void>()
const emitChat = (): void => { for (const listener of chatListeners) listener() }

/** 页内聊天格 ↔ 根级会话树的 store。 */
export const coachChat = {
  get: (): CoachChatState => chatState,
  subscribe: (listener: () => void): (() => void) => {
    chatListeners.add(listener)
    return () => { chatListeners.delete(listener) }
  },
  open: (id: SessionId, reference: { release(): void }, host: HTMLElement): void => {
    chatState = { visible: true, id, reference, host }
    emitChat()
  },
  close: (): void => {
    chatState = { visible: false, id: null, reference: null, host: null }
    emitChat()
  },
}

/** 嵌入 occurrence 的固定 Chat 视图。 */
function FixedChat(props: ConversationViewsProps): ReactNode {
  return <>{props.renderSlot('conversation.session', { view: 'chat' })}</>
}

/** 私有子槽：把绑定的 coach session 渲染成原生 conversation.content。 */
export function CoachChat(props: PropsRenderFactories): ReactNode {
  return (
    <>
      {props.renderFactorySlot(
        'conversation.content',
        { variant: 'embedded', phase: 'active', hero: false },
        { slots: { views: FixedChat } },
      )}
    </>
  )
}

/** 根级 portal 宿主的 props。 */
export type MethodCoachPortalProps =
  & PropsRuntime<'shell.overlay'>
  & PropsRenderSlots<typeof METHOD_COACH_CHAT>

/**
 * 根级 portal 宿主：coach 会话树在 main 之外，DOM teleport 进方法库页的聊天格。
 * @param props - shell.overlay 标准面 + 私有子槽的 SessionProvider/renderSlot。
 */
export function MethodCoachPortal(props: MethodCoachPortalProps): ReactNode {
  const { SessionProvider, renderSlot } = props
  const state = useSyncExternalStore(coachChat.subscribe, coachChat.get, coachChat.get)
  if (!state.visible || state.reference === null || state.host === null) return null
  return createPortal(
    <div
      data-method-coach-portal=""
      style={{ display: 'flex', width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}
    >
      <SessionProvider session={state.reference as never}>
        {renderSlot(METHOD_COACH_CHAT, {})}
      </SessionProvider>
    </div>,
    state.host,
  )
}

/** Owned Client reference plus its first-open readiness and snapshot binding. */
interface CoachSessionReference {
  release(): void
  readonly ready?: Promise<unknown>
  readonly binding?: { readonly session: { getSnapshot(): { readonly openState: string } } }
}

/** 方法编辑面板的 props（页面注入建会话/发 prompt）。 */
export interface MethodCoachPanelProps {
  readonly sessionId: SessionId
  readonly draftKey: string
  readonly visible: boolean
  /** 为当前活动草稿建立/保留独立的 Method Editor Session。 */
  readonly ensure: (currentSessionId: SessionId, draftKey: string) => Promise<{
    readonly id: SessionId
    readonly reference: CoachSessionReference
  }>
  /** 会话就绪后回报 id（页面据此跟随草稿流）。 */
  readonly onCoach?: (id: SessionId) => void
  readonly onError?: (cause: unknown) => void
  readonly onStartInterview: (coachId: SessionId) => Promise<{ readonly ok: boolean; readonly detail?: string; readonly uncertain?: boolean }>
  readonly title: string
  readonly startLabel: string
  readonly readyLabel: string
  readonly pendingLabel: string
  readonly startedLabel: string
}

/**
 * 方法库页访谈区的「方法编辑」面板：开始访谈 + 原生会话（portal 目标格）。
 * @param props - 当前会话、draft key 与 ensure/start 注入。
 */
export function MethodCoachPanel(props: MethodCoachPanelProps): ReactNode {
  const { sessionId, draftKey, ensure, onCoach, onError, onStartInterview, visible, title, startLabel, readyLabel, pendingLabel, startedLabel } = props
  const [coach, setCoach] = useState<{ id: SessionId; reference: CoachSessionReference } | null>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [startBusy, setStartBusy] = useState(false)

  // 标准聊天行为：对话区自身滚动、自动贴底跟随最新；用户上翻时暂停，回到底部恢复。
  useEffect(() => {
    if (host === null) return
    const scroll = host.querySelector<HTMLElement>('[data-conversation-scroll]')
    if (scroll === null) return
    let stuck = true
    const onScroll = (): void => {
      stuck = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 48
    }
    const observer = new MutationObserver(() => {
      if (stuck) scroll.scrollTop = scroll.scrollHeight
    })
    observer.observe(scroll, { childList: true, subtree: true, characterData: true })
    scroll.addEventListener('scroll', onScroll, { passive: true })
    scroll.scrollTop = scroll.scrollHeight
    return () => {
      observer.disconnect()
      scroll.removeEventListener('scroll', onScroll)
    }
  }, [host])

  useEffect(() => {
    let cancelled = false
    let held: CoachSessionReference | null = null
    void (async () => {
      try {
        const result = await ensure(sessionId, draftKey)
        if (cancelled) {
          result.reference.release()
          return
        }
        held = result.reference
        await held.ready
        if (cancelled) return
        const openState = held.binding?.session.getSnapshot().openState
        if (openState !== undefined && openState !== 'open') throw new Error(`方法编辑历史未就绪：${openState}`)
        if (cancelled) return
        setCoach(result)
        onCoach?.(result.id)
      } catch (cause) {
        if (held !== null) {
          const reference = held
          held = null
          setTimeout(() => { reference.release() }, 0)
        }
        if (!cancelled) {
          setError(String(cause))
          onError?.(cause)
        }
      }
    })()
    return () => {
      cancelled = true
      if (held !== null) {
        const reference = held
        held = null
        setTimeout(() => { reference.release() }, 0)
      }
    }
  }, [sessionId, draftKey, ensure, onCoach, onError])

  useEffect(() => {
    if (coach === null || host === null) return undefined
    coachChat.open(coach.id, coach.reference, host)
    return () => { coachChat.close() }
  }, [coach, host])

  const startInterview = (): void => {
    if (coach === null || started || startBusy) return
    setStartBusy(true)
    setError(null)
    void onStartInterview(coach.id).then((result) => {
      setStarted(result.ok || result.uncertain === true)
      if (!result.ok) setError(result.detail ?? 'prompt rejected')
    }).catch((cause: unknown) => {
      setStarted(true)
      setError(String(cause))
    }).finally(() => { setStartBusy(false) })
  }

  return (
    <aside
      data-method-coach-panel=""
      style={{
        flex: '1 1 auto', width: '100%', minWidth: 0, minHeight: 0, display: visible ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden',
        borderTop: '1px solid var(--dsw-alias-border-l1)', background: 'var(--dsw-alias-bg-layer-1)',
      }}
    >
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--dsw-alias-bg-layer-2)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <strong style={{ fontSize: 13 }}>{title}</strong>
          <span style={{ fontSize: 11, opacity: 0.6 }}>{readyLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          {coach !== null && <button type="button" disabled={started || startBusy} onClick={startInterview} style={{ border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 4, padding: '5px 10px', background: 'var(--dsw-alias-bg-base)' }}>{started ? startedLabel : startBusy ? pendingLabel : startLabel}</button>}
        </div>
      </div>
      {error !== null && (
        <div style={{ fontSize: 12, color: 'var(--dsw-alias-label-error)', padding: '6px 12px' }}>方法编辑暂不可用：{error}（表单可以继续填，稍后重试）</div>
      )}
      <div
        ref={(element) => { setHost(element) }}
        data-method-coach-host=""
        style={{
          flex: 1, minHeight: 0, display: started ? 'flex' : 'none', overflow: 'hidden', background: 'var(--dsw-alias-bg-base)',
        }}
      />
    </aside>
  )
}
