/**
 * 工具卡的共享纯逻辑（研究语义工具卡 S2；company lib/tool-card.ts 同款移植——
 * 卡片 = call/result 切片的纯函数，keyless 单测直接断言，不读活状态可回放）。
 */

import { argsObjectOf, normalizeQueries } from './journal-wire.ts'

/** 卡片生命周期。 */
export type CardState = 'running' | 'ok' | 'error' | 'stopped'

/** 卡片入参的最小形状（wire 上入参是 JSON 字符串，流式期间可能是截断前缀）。 */
export interface ToolCardArgs {
  readonly name?: unknown
  readonly description?: unknown
  readonly prompt?: unknown
  /** web_search 的入参是 queries 数组（vendor tool-web search schema 权威形状——非 query 单串）。 */
  readonly queries?: unknown
}  // 协调类工具（team_task_*/wait_agent/list_agents/send_message）不进对话流——无卡片需求（2026-09-27 实测）

/** 从 call/result 切片推导卡片状态（settled 前 running；interrupted → stopped）。 */
export function cardStateOf(block: object): CardState {
  if (!('kind' in block)) return 'running'
  const b = block as { kind?: unknown; error?: { code?: unknown }; isError?: boolean }
  if (b.error?.code === 'interrupted') return 'stopped'
  return b.isError ? 'error' : 'ok'
}

/** 解析入参 JSON；截断前缀 → null（调用方回退原文）。
 *  解析核 = journal-wire.argsObjectOf（共享正本）；本件哨兵 = null 且**拒数组**（卡片入参
 *  是对象形态——数组进卡片标题取字段全是 undefined，按原实现拒之）。 */
export function parseArgsObject(argsRaw: string): ToolCardArgs | null {
  const obj = argsObjectOf(argsRaw)
  return obj !== null && !Array.isArray(obj) ? (obj as ToolCardArgs) : null
}

/** 工具卡标题行（研究语义）：spawn → 成员与职责；web_search → 查询词。 */
export function cardTitleOf(toolName: string, args: ToolCardArgs | null, argsRaw: string): string {
  if (args !== null) {
    if (toolName === 'spawn_teammate') {
      const name = typeof args.name === 'string' ? args.name : '(未具名)'
      const desc = typeof args.description === 'string' ? args.description : typeof args.prompt === 'string' ? args.prompt.slice(0, 40) : ''
      return `组队：${name}${desc === '' ? '' : ` — ${desc.slice(0, 50)}`}`
    }
    if (toolName === 'web_search') {
      const q = normalizeQueries(args.queries).join(' · ')
      return q === '' ? '检索' : `检索：${q.slice(0, 60)}`
    }

  }
  return `${toolName} ${argsRaw.slice(0, 40)}`
}
