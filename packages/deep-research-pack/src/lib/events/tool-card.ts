/**
 * 工具卡的共享纯逻辑（研究语义工具卡 S2；company lib/tool-card.ts 同款移植——
 * 卡片 = call/result 切片的纯函数，keyless 单测直接断言，不读活状态可回放）。
 */

import { argsObjectOf, normalizeQueries } from './journal-wire.ts'
import { translateZh, type PackTranslate } from '../shared/i18n.ts'

/**
 * vendor 崩溃恢复的合成 `tool/result` 错误码（正本 = DSH session 包的 repair 模块
 * `openTurnClosers`；同值由 `@deepseek-ai/dsh-session` 导出）。
 *
 * 为什么在 pack 里写字面量而不是 import：本件住在 **client 面**（faces.json），把 host 侧
 * session 包的值导入会进浏览器 bundle；wire 值本身是稳定契约，故本地常量 + 单测与 vendor
 * 导出逐值对账（单测守卫）——漂移即红。
 */
export const TOOL_OUTCOME_UNKNOWN = 'TOOL_OUTCOME_UNKNOWN'
export const TOOL_NOT_STARTED = 'TOOL_NOT_STARTED'

/** 卡片生命周期。`stopped` = 工具调用被中断/崩溃截断，**结果未知**（不是失败）。 */
type CardState = 'running' | 'ok' | 'error' | 'stopped'

/** 卡片入参的最小形状（wire 上入参是 JSON 字符串，流式期间可能是截断前缀）。 */
interface ToolCardArgs {
  readonly name?: unknown
  readonly description?: unknown
  readonly prompt?: unknown
  /** web_search 的入参是 queries 数组（vendor tool-web search schema 权威形状——非 query 单串）。 */
  readonly queries?: unknown
  /** web_fetch 的入参是 url 字符串（vendor tool-web fetch schema 权威形状）。 */
  readonly url?: unknown
  /** subagent 可选角色名。 */
  readonly subagent_type?: unknown
}  // 协调类工具（team_task_*/wait_agent/list_agents/send_message）不进对话流——无卡片需求（2026-09-27 实测）

/** 从 call/result 切片推导卡片状态（settled 前 running；interrupted → stopped）。 */
export function cardStateOf(block: object): CardState {
  if (!('kind' in block)) return 'running'
  const b = block as { kind?: unknown; error?: { code?: unknown }; isError?: boolean }
  // vendor 的中断语义走 repair.ts 的两个具体码（+ 历史兼容 'interrupted'）；「未知」不得写成「失败」（BUG-431）。
  if (b.error?.code === TOOL_OUTCOME_UNKNOWN || b.error?.code === TOOL_NOT_STARTED || b.error?.code === 'interrupted') return 'stopped'
  return b.isError ? 'error' : 'ok'
}

/** 解析入参 JSON；截断前缀 → null（调用方回退原文）。
 *  解析核 = journal-wire.argsObjectOf（共享正本）；本件哨兵 = null 且**拒数组**（卡片入参
 *  是对象形态——数组进卡片标题取字段全是 undefined，按原实现拒之）。 */
export function parseArgsObject(argsRaw: string): ToolCardArgs | null {
  const obj = argsObjectOf(argsRaw)
  return obj !== null && !Array.isArray(obj) ? (obj as ToolCardArgs) : null
}

/** 转义后的 JSON 字符串字面量（`\"` / `\\` 等），用于从截断前缀里取字段。 */
const JSON_STRING_BODY = String.raw`((?:[^"\\]|\\.)*)`

/**
 * 从**流式截断前缀**里尽力取一个字符串字段（BUG-411）。
 *
 * `parseArgsObject` 对截断前缀按设计返回 null（调用方回退原文）；但卡片在运行窗口里必须
 * 陈述「正在做什么」，把「读不到」折成某个具体语义就是说谎（例如把 set 显示成 clear）。
 * 本函数只做一件事：若 `"key": "value"` 的字面片段已经到达，就返回解码后的值；否则 null。
 * 值里的转义按 JSON 规则解码；非法转义 → null（宁可说未知，不拼半截）。
 * @param argsRaw - 流式入参原文（可能是任意前缀）。
 * @param key - 字段名（ASCII 键）。
 * @returns 字段字符串（可能为空串）或 null。
 */
export function stringFieldOfArgsRaw(argsRaw: string, key: string): string | null {
  if (typeof argsRaw !== 'string' || argsRaw === '') return null
  const pattern = new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:\\s*"${JSON_STRING_BODY}"`)
  const match = pattern.exec(argsRaw)
  if (match?.[1] === undefined) return null
  try {
    return JSON.parse(`"${match[1]}"`) as string
  } catch {
    return null
  }
}

/** 工具卡标题行（研究语义）：spawn → 成员与职责；web_search → 查询词。 */
export function cardTitleOf(toolName: string, args: ToolCardArgs | null, argsRaw: string, t: PackTranslate = translateZh): string {
  if (args !== null) {
    if (toolName === 'spawn_teammate') {
      const name = typeof args.name === 'string' ? args.name : t('activitySpawnUnnamed')
      const desc = typeof args.description === 'string' ? args.description : typeof args.prompt === 'string' ? args.prompt.slice(0, 40) : ''
      return desc === ''
        ? t('toolCardSpawn', { name })
        : t('toolCardSpawnDetail', { name, detail: desc.slice(0, 50) })
    }
    if (toolName === 'web_search') {
      const q = normalizeQueries(args.queries).join(' · ')
      return q === '' ? t('toolCardSearch') : t('toolCardSearchQueries', { queries: q.slice(0, 60) })
    }
    if (toolName === 'web_fetch') {
      const rawUrl = typeof args.url === 'string' ? args.url.trim() : ''
      if (rawUrl === '') return t('toolCardFetch')
      const compact = rawUrl.replace(/^https?:\/\//i, '').slice(0, 60)
      return t('toolCardFetchUrl', { url: compact })
    }
    if (toolName === 'subagent') {
      const role = typeof args.subagent_type === 'string' && args.subagent_type.trim() !== ''
        ? args.subagent_type.trim()
        : (typeof args.name === 'string' ? args.name.trim() : '')
      const desc = typeof args.description === 'string'
        ? args.description.trim()
        : typeof args.prompt === 'string'
          ? args.prompt.trim().slice(0, 40)
          : ''
      const summary = [role, desc].filter(Boolean).join(' — ')
      return summary === ''
        ? t('toolCardSubagent')
        : t('toolCardSubagentDetail', { detail: summary.slice(0, 60) })
    }

  }
  return `${toolName} ${argsRaw.slice(0, 40)}`
}
