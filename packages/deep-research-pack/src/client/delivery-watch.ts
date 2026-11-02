// delivery-watch.ts — 交付监听：live present 指向终稿 → 打开终稿页签。
//
// 从 client/index.ts 拆出（2026-11-03 审计 P4）。规则（issue 2026-10-19 §时机）：
//   · 只认 **live 帧**——follow 开场快照是回合窗口，拿回放触发 = 每次重载都弹一次；
//   · 按 callId 去重——同一次交付只开一次，用户关掉后不再弹（ui-plan 同规则）；
//   · 焦点在可编辑元素时不打断——正在写下一条消息的人，眼前的回合尾卡与⑤的门仍在；
//   · 只对**在屏会话**动作——切会话弹右栏是既有裁决否决过的打扰
//     （notes/archived/2026-09-28-right-pane-ux-debt.md §输掉的方案）。
// 这是本包唯一一处"替用户打开东西"：出现时机就是交付本身，别处不再自动弹面。
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { Follow } from './session-follow.ts'
import { draftInProgress, latestFinalDelivery, shouldOpenFinal } from '../lib/final-target.ts'

export interface DeliveryWatchDeps {
  readonly follow: Follow
  readonly openFinal: (sessionId: SessionId, path: string) => void
  /** 右栏当前挂载的会话（sidebarRight.mounted）。 */
  readonly mounted: {
    getSnapshot(): SessionId | undefined
    subscribe(listener: () => void): () => void
  }
  /** 焦点元素（测试注入；缺省 = document.activeElement）。 */
  readonly activeElement?: () => Element | null
  /** 失败日志出口（缺省 console.error）。 */
  readonly onError?: (message: string) => void
}

/** 建监听并启动；返回 disposer（退订 + abort 当前流）。 */
export function watchDelivery({ follow, openFinal, mounted, activeElement, onError }: DeliveryWatchDeps): () => void {
  const opened = new Set<string>()
  let followed: SessionId | undefined
  let controller: AbortController | undefined
  // 让路判据 = "焦点里有真草稿"（不是"焦点在输入框"）：会话打开即聚焦 composer，
  // 空输入框不算在写——见 lib/final-target.draftInProgress 的实测来由。
  const focusedInEditor = () => draftInProgress(activeElement === undefined ? document.activeElement : activeElement())
  const stop = () => { controller?.abort(); controller = undefined; followed = undefined }
  const watch = (sessionId: SessionId) => {
    if (followed === sessionId) return
    stop()
    followed = sessionId
    const next = new AbortController()
    controller = next
    void (async () => {
      try {
        for await (const frame of follow(sessionId, next.signal)) {
          if (frame.kind !== 'event') continue
          const delivery = latestFinalDelivery([frame.event])
          if (delivery === null) continue
          if (!shouldOpenFinal(delivery, opened, sessionId, focusedInEditor())) continue
          opened.add(`${sessionId}:${delivery.callId}`)
          openFinal(sessionId, delivery.path)
        }
      } catch (cause) {
        if (!next.signal.aborted) (onError ?? console.error)('[research-final] 交付监听流失败', String(cause))
      }
    })()
  }
  const sync = () => {
    const sessionId = mounted.getSnapshot()
    if (sessionId === undefined) stop()
    else watch(sessionId)
  }
  const unsubscribe = mounted.subscribe(sync)
  sync()
  return () => { unsubscribe(); stop() }
}
