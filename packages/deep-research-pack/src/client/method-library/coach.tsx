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
import { errorDetailOf } from '../../lib/shared/error-detail.ts'
import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRenderFactories, PropsRenderSlots, PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConversationViewsProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { METHOD_COACH_CHAT } from '../keys.ts'
import css from './library.module.css'

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
  readonly onInterviewStarted?: (started: boolean) => void
  readonly title: string
  readonly startLabel: string
  readonly readyLabel: string
  readonly pendingLabel: string
  readonly startedLabel: string
  /** 当前 UI 翻译器（错误/历史未就绪文案）。 */
  readonly t: TranslateNS<'deepResearchPack'>
}

/**
 * 方法库页访谈区的「方法编辑」面板：开始访谈 + 原生会话（portal 目标格）。
 * @param props - 当前会话、draft key 与 ensure/start 注入。
 */
export function MethodCoachPanel(props: MethodCoachPanelProps): ReactNode {
  const { sessionId, draftKey, ensure, onCoach, onError, onStartInterview, onInterviewStarted, visible, title, startLabel, readyLabel, pendingLabel, startedLabel, t } = props
  const [coach, setCoach] = useState<{ id: SessionId; reference: CoachSessionReference } | null>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [startBusy, setStartBusy] = useState(false)

  // 标准聊天行为：对话区自身滚动、自动贴底跟随最新；用户上翻时暂停，回到底部恢复。
  // Portal 异步插入 [data-conversation-scroll]，通过 host MutationObserver 等待后挂滚底（BUG-481）。
  useEffect(() => {
    if (host === null) return undefined
    let scrollEl: HTMLElement | null = null
    let stuck = true
    let contentObserver: MutationObserver | null = null
    const onScroll = (): void => {
      if (scrollEl === null) return
      stuck = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 48
    }
    const detach = (): void => {
      contentObserver?.disconnect()
      contentObserver = null
      scrollEl?.removeEventListener('scroll', onScroll)
      scrollEl = null
    }
    const attach = (el: HTMLElement): void => {
      if (scrollEl === el) return
      detach()
      scrollEl = el
      stuck = true
      contentObserver = new MutationObserver(() => {
        if (stuck && scrollEl !== null) scrollEl.scrollTop = scrollEl.scrollHeight
      })
      contentObserver.observe(el, { childList: true, subtree: true, characterData: true })
      el.addEventListener('scroll', onScroll, { passive: true })
      el.scrollTop = el.scrollHeight
    }
    const initial = host.querySelector<HTMLElement>('[data-conversation-scroll]')
    if (initial !== null) attach(initial)
    const hostObserver = new MutationObserver(() => {
      const next = host.querySelector<HTMLElement>('[data-conversation-scroll]')
      if (next !== null) attach(next)
      else if (scrollEl !== null) detach()
    })
    hostObserver.observe(host, { childList: true, subtree: true })
    return () => {
      hostObserver.disconnect()
      detach()
    }
  }, [host, coach?.id])

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
        if (openState !== undefined && openState !== 'open') throw new Error(t('coachHistoryNotReady', { state: openState }))
        if (cancelled) return
        setCoach(result)
        // 成功即清错：否则面板会同时说「就绪」与「暂不可用」（BUG-418）。
        setError(null)
        onCoach?.(result.id)
      } catch (cause) {
        if (held !== null) {
          const reference = held
          held = null
          setTimeout(() => { reference.release() }, 0)
        }
        if (!cancelled) {
          setError(errorDetailOf(cause))
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
  }, [sessionId, draftKey, ensure, onCoach, onError, t])

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
      if (result.ok) {
        setStarted(true)
        onInterviewStarted?.(true)
      } else {
        setError(result.detail ?? 'prompt rejected')
      }
    }).catch((cause: unknown) => {
      setError(errorDetailOf(cause))
    }).finally(() => { setStartBusy(false) })
  }

  return (
    <aside
      data-method-coach-panel=""
      className={css.coachPanel}
      style={{ display: visible ? 'flex' : 'none' }}
    >
      <div className={css.coachHeader}>
        <div className={css.coachTitleRow}>
          <strong className={css.coachTitle}>{title}</strong>
          <span className={css.coachReady}>{readyLabel}</span>
        </div>
        <div className={css.coachActions}>
          {coach !== null && <button type="button" data-method-coach-start="" disabled={started || startBusy} onClick={startInterview} className={css.coachStartBtn}>{started ? startedLabel : startBusy ? pendingLabel : startLabel}</button>}
        </div>
      </div>
      {error !== null && (
        <div className={css.coachError}>{t('coachUnavailable', { detail: error ?? '' })}</div>
      )}
      <div
        ref={(element) => { setHost(element) }}
        data-method-coach-host=""
        className={css.coachHost}
        style={{ display: started ? 'flex' : 'none' }}
      />
    </aside>
  )
}
