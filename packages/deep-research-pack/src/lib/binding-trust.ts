/**
 * binding-trust.ts —— 会话绑定可信性的单一政策（02 / BUG-001 的政策层）。
 *
 * 原始信号归 `bundle-bind.ts`（slug / boundBy / kickoffSeen）；**“这个绑定能不能当本场 run”**
 * 是产品语义，必须一处判：三个页签曾各自写一份（状态页 read+pending/kickoff、图谱页只查
 * kickoff、配置页完全不查），立项预检窗里三者对同一段 journal 给出三种答案。
 *
 * 政策：
 *   - write 命中 → 永远可信（写进 bundle 的动作是强信号）；
 *   - read 命中 + HITL 挂起 → 抑制（挂起期本 run 的 bundle 多半还没实例化，读绑定是预检）；
 *   - read 命中 + 立项信号（ask_user_question / research-brief skill）→ 抑制（立项轨道）；
 *   - read 命中、无挂起无立项 → 可信（恢复会话的只读查询）。
 * 抑制带 reason：状态页用 `kickoff` 显示“这场还没开始”横幅，`pending` 显示挂起期说明。
 *
 * 为什么在这里折 HITL：如果让调用方传 `hitlPending`，配置页/图谱页又可能忘传——这正是
 * 原先分叉的形态。输入只有事件，输出只有一种结论。
 */
import { sessionBindingOf } from './bundle-bind.ts'
import { foldHitlPending } from './hitl-fold.ts'

/** 绑定可信性三态（抑制带原因，供页签说人话）。 */
export type BindingTrust =
  | { readonly kind: 'bound'; readonly slug: string; readonly boundBy: 'write' | 'read' }
  | { readonly kind: 'unbound' }
  | { readonly kind: 'suppressed'; readonly slug: string; readonly reason: 'kickoff' | 'pending' }

/**
 * journal 事件 → 本会话可用于观察面的 run 绑定。
 * @param events - 按 wire 顺序的会话事件。
 * @returns bound / unbound / suppressed。
 */
export function bindingTrust(events: readonly unknown[]): BindingTrust {
  const binding = sessionBindingOf(events)
  if (binding.slug === undefined) return { kind: 'unbound' }
  if (binding.boundBy === 'write') return { kind: 'bound', slug: binding.slug, boundBy: 'write' }
  const hitl = foldHitlPending(events)
  if (hitl.pending) return { kind: 'suppressed', slug: binding.slug, reason: 'pending' }
  if (binding.kickoffSeen) return { kind: 'suppressed', slug: binding.slug, reason: 'kickoff' }
  return { kind: 'bound', slug: binding.slug, boundBy: 'read' }
}

/** 状态页暴露给浏览器探针的机器标记；不是给人看的文案。 */
type StatusFaceMarker = 'bound' | 'unbound' | 'kickoff-hold' | 'pending' | 'error' | 'unknown'

/**
 * 状态页的机器可读数据面标记（cdp-probe 读 `[data-research-face]`）。
 * 顺序 = 页面实际渲染优先级：错误 > 未绑定 > 立项预检 > 绑定 > 挂起抑制 > 未知。
 * `bound` 必须同时有可信绑定与已读出的 face——只有绑定、没有 face 仍是未知，不能冒充“数据面通了”。
 * @param input - 页面状态。
 * @returns 机器标记。
 */
export function statusFaceMarker(input: {
  readonly trust: BindingTrust
  readonly unbound: boolean
  readonly kickoffHold: boolean
  readonly hasError: boolean
  readonly hasFace: boolean
}): StatusFaceMarker {
  if (input.hasError) return 'error'
  if (input.unbound || input.trust.kind === 'unbound') return 'unbound'
  if (input.kickoffHold) return 'kickoff-hold'
  if (input.trust.kind === 'bound' && input.hasFace) return 'bound'
  if (input.trust.kind === 'suppressed') return 'pending'
  return 'unknown'
}
