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

/** 起手式：不让人面对空聊天框。 */
const STARTERS = [
  { label: '从零聊', prompt: '从零开始，先帮我从研究场景问起。' },
  { label: '照内置改', prompt: '我想照一条内置打法改，先问我想改哪一块。' },
  { label: '从这次研究沉淀', prompt: '把这次研究实际采用的做法沉淀成一条方法。' },
] as const

/** 方法编辑面板的 props（页面注入建会话/发 prompt）。 */
export interface MethodCoachPanelProps {
  readonly sessionId: SessionId
  /** 页面附带的库/草稿/内置快照；只随第一条消息发一次，后续原生 composer 直发。 */
  readonly context: string
  readonly ensure: (currentSessionId: SessionId) => Promise<{
    readonly id: SessionId
    readonly reference: { release(): void }
  }>
  readonly send: (sessionId: SessionId, text: string) => Promise<void>
  /** 会话就绪后回报 id（页面据此跟随草稿流）。 */
  readonly onCoach?: (id: SessionId) => void
}

/**
 * 方法库页右栏的「方法编辑」面板：起手式 + 原生会话（portal 目标格）。
 * @param props - 当前会话 + ensure/send 注入。
 */
export function MethodCoachPanel(props: MethodCoachPanelProps): ReactNode {
  const { sessionId, context, ensure, send, onCoach } = props
  const [coach, setCoach] = useState<{ id: SessionId; reference: { release(): void } } | null>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [started, setStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let held: { release(): void } | null = null
    void (async () => {
      try {
        const result = await ensure(sessionId)
        if (cancelled) {
          result.reference.release()
          return
        }
        held = result.reference
        setCoach(result)
        onCoach?.(result.id)
      } catch (cause) {
        if (!cancelled) setError(String(cause))
      }
    })()
    return () => {
      cancelled = true
      if (held !== null) {
        const reference = held
        setTimeout(() => { reference.release() }, 0)
      }
    }
  }, [sessionId, ensure, onCoach])

  useEffect(() => {
    if (coach === null || host === null) return undefined
    coachChat.open(coach.id, coach.reference, host)
    return () => { coachChat.close() }
  }, [coach, host])

  const start = (prompt: string): void => {
    if (coach === null) return
    const first = !started
    setStarted(true)
    setError(null)
    void send(coach.id, first ? `${context}\n\n用户：${prompt}` : prompt)
      .catch((cause: unknown) => { setError(String(cause)) })
  }

  return (
    <aside
      data-method-coach-panel=""
      style={{
        flex: '0 0 380px', minWidth: 320, display: 'flex', flexDirection: 'column', minHeight: 0,
        borderLeft: '1px solid #00000012', background: '#fafafa',
      }}
    >
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #00000010' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <strong style={{ fontSize: 13 }}>方法编辑</strong>
          <span style={{ fontSize: 11, opacity: 0.6 }}>把这条方法聊清楚</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {STARTERS.map((starter) => (
            <button
              key={starter.label}
              data-method-coach-start=""
              type="button"
              disabled={coach === null}
              onClick={() => { start(starter.prompt) }}
              style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 999,
                border: '1px solid #00000020', background: '#fff',
                cursor: coach === null ? 'default' : 'pointer',
                opacity: coach === null ? 0.5 : 1,
              }}
            >
              {starter.label}
            </button>
          ))}
          {!started && (
            <span style={{ fontSize: 11, opacity: 0.4, alignSelf: 'center' }}>
              点一个开始
            </span>
          )}
        </div>
      </div>
      {error !== null && (
        <div style={{ fontSize: 12, color: '#b91c1c', padding: '6px 12px' }}>方法编辑暂不可用：{error}（表单可以继续填，稍后重试）</div>
      )}
      <div
        ref={(element) => { setHost(element) }}
        data-method-coach-host=""
        style={{
          flex: 1, minHeight: 0, display: started ? 'flex' : 'none', background: '#fff',
        }}
      />
    </aside>
  )
}
