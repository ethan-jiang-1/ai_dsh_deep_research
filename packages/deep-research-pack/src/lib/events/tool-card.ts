/**
 * 工具卡的共享纯逻辑（研究语义工具卡 S2 + R2.3 富语义结果折算）。
 * 卡片 = call/result 切片的纯函数，keyless 单测直接断言，不读活状态可回放。
 */

import { argsObjectOf, normalizeQueries } from './journal-wire.ts'
import { translateZh, type PackTranslate } from '../shared/i18n.ts'

/**
 * vendor 崩溃恢复的合成 `tool/result` 错误码（正本 = DSH session 包的 repair 模块
 * `openTurnClosers`；同值由 `@deepseek-ai/dsh-session` 导出）。
 */
export const TOOL_OUTCOME_UNKNOWN = 'TOOL_OUTCOME_UNKNOWN'
export const TOOL_NOT_STARTED = 'TOOL_NOT_STARTED'

/** 卡片生命周期。`stopped` = 工具调用被中断/崩溃截断，**结果未知**（不是失败）。 */
type CardState = 'running' | 'ok' | 'error' | 'stopped'

/** 卡片入参的最小形状（wire 上入参是 JSON 字符串，流式期间可能是截断前缀）。 */
export interface ToolCardArgs {
  readonly name?: unknown
  readonly description?: unknown
  readonly prompt?: unknown
  readonly queries?: unknown
  readonly url?: unknown
  readonly subagent_type?: unknown
}

export interface ToolWebSourceItem {
  readonly url: string
  readonly title?: string
  readonly snippet?: string
  readonly publishedAt?: string
}

export type ToolCardRichBody =
  | {
    readonly kind: 'web-search'
    readonly answer?: string
    readonly sources: readonly ToolWebSourceItem[]
    readonly truncated: boolean
    readonly queries: readonly string[]
  }
  | {
    readonly kind: 'web-fetch'
    readonly url: string
    readonly statusCode: number
    readonly truncated: boolean
  }
  | {
    readonly kind: 'delegation'
    readonly mode: 'teammate' | 'worker'
    readonly roleName: string
    readonly waveHint: string | null
    readonly goalSummary: string
  }
  | {
    readonly kind: 'fallback'
    readonly text: string
  }

/** 从 call/result 切片推导卡片状态（settled 前 running；interrupted → stopped）。 */
export function cardStateOf(block: object): CardState {
  if (!('kind' in block)) return 'running'
  const b = block as { kind?: unknown; error?: { code?: unknown }; isError?: boolean }
  if (b.error?.code === TOOL_OUTCOME_UNKNOWN || b.error?.code === TOOL_NOT_STARTED || b.error?.code === 'interrupted') return 'stopped'
  return b.isError ? 'error' : 'ok'
}

/** 解析入参 JSON；截断前缀 → null（调用方回退原文）。 */
export function parseArgsObject(argsRaw: string): ToolCardArgs | null {
  const obj = argsObjectOf(argsRaw)
  return obj !== null && !Array.isArray(obj) ? (obj as ToolCardArgs) : null
}

const JSON_STRING_BODY = String.raw`((?:[^"\\]|\\.)*)`

/** 从流式截断前缀里尽力取一个字符串字段（BUG-411）。 */
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

function parseMetaSources(raw: unknown): readonly ToolWebSourceItem[] | null {
  if (!Array.isArray(raw)) return null
  const out: ToolWebSourceItem[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) continue
    const rec = item as Record<string, unknown>
    if (typeof rec.url !== 'string' || rec.url.trim() === '') continue
    out.push({
      url: rec.url.trim(),
      ...(typeof rec.title === 'string' && rec.title.trim() !== '' ? { title: rec.title.trim() } : {}),
      ...(typeof rec.snippet === 'string' && rec.snippet.trim() !== '' ? { snippet: rec.snippet.trim() } : {}),
      ...(typeof rec.publishedAt === 'string' && rec.publishedAt.trim() !== '' ? { publishedAt: rec.publishedAt.trim() } : {}),
    })
  }
  return out
}

function extractResultText(block: object): string {
  if (!('content' in block)) return ''
  const content = (block as { readonly content?: unknown }).content
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''
  const parts: string[] = []
  for (const part of content) {
    if (typeof part === 'string' && part.trim() !== '') parts.push(part.trim())
    else if (typeof part === 'object' && part !== null && 'text' in part && typeof (part as { text?: unknown }).text === 'string') {
      const txt = ((part as { text: string }).text).trim()
      if (txt !== '') parts.push(txt)
    }
  }
  return parts.join('\n').trim()
}

function parseFallbackWebSources(text: string): readonly ToolWebSourceItem[] {
  if (text === '') return []
  const sources: ToolWebSourceItem[] = []
  const seen = new Set<string>()
  // 支持 `[title](https://...)` 或裸 `https://...` 行提取
  for (const match of text.matchAll(/\[([^\]\n]{1,140})\]\((https?:\/\/[^\s)]+)\)/g)) {
    const title = match[1]?.trim()
    const url = match[2]?.trim()
    if (url !== undefined && !seen.has(url)) {
      seen.add(url)
      sources.push({ url, ...(title !== undefined && title !== '' ? { title } : {}) })
      if (sources.length >= 12) return sources
    }
  }
  if (sources.length > 0) return sources
  for (const match of text.matchAll(/https?:\/\/[^\s<>)"'`]+/g)) {
    const url = match[0].replace(/[.,;:!?]+$/, '')
    if (!seen.has(url)) {
      seen.add(url)
      sources.push({ url })
      if (sources.length >= 12) return sources
    }
  }
  return sources
}

function cleanGoalLines(raw: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '')
    .slice(0, 3)
  const joined = lines.join(' ')
  return joined.length > 260 ? `${joined.slice(0, 259)}…` : joined
}

function detectWaveHint(roleName: string, goalText: string): string | null {
  const combined = `${roleName} ${goalText}`
  if (/research-wave/i.test(combined)) return 'research-wave'
  const wave = /\b(W[1-9]\d*(?:\.[1-9]\d*)*)\b/.exec(combined)
  if (wave?.[1] !== undefined) return wave[1]
  if (/\bcritic\b|核查|审查/i.test(combined)) return 'critic'
  return null
}

/**
 * 推导研究语义工具卡的展开体模型（优先消费 DSH 规范 `block.meta`，缺失或错误时安全降级）。
 */
export function toolResultBodyOf(
  toolName: string,
  block: object,
  args: ToolCardArgs | null,
  argsRaw: string,
): ToolCardRichBody | null {
  const settled = 'kind' in block
  const rec = block as { readonly isError?: boolean; readonly meta?: unknown; readonly error?: { readonly message?: unknown } }
  const meta = typeof rec.meta === 'object' && rec.meta !== null && !Array.isArray(rec.meta)
    ? (rec.meta as Record<string, unknown>)
    : null

  if (settled && rec.isError === true) {
    const errMsg = typeof rec.error?.message === 'string' && rec.error.message.trim() !== ''
      ? rec.error.message.trim()
      : extractResultText(block)
    return errMsg !== '' ? { kind: 'fallback', text: errMsg.slice(0, 400) } : null
  }

  if (toolName === 'web_search') {
    const queries = args !== null ? normalizeQueries(args.queries) : []
    if (settled && meta !== null) {
      const sources = parseMetaSources(meta.sources)
      if (sources !== null) {
        return {
          kind: 'web-search',
          ...(typeof meta.answer === 'string' && meta.answer.trim() !== '' ? { answer: meta.answer.trim() } : {}),
          sources,
          truncated: meta.truncated === true,
          queries,
        }
      }
    }
    if (settled) {
      const text = extractResultText(block)
      const parsed = parseFallbackWebSources(text)
      if (parsed.length > 0) {
        return { kind: 'web-search', sources: parsed, truncated: false, queries }
      }
      if (text !== '') return { kind: 'fallback', text: text.slice(0, 400) }
    }
    if (queries.length > 0) {
      return { kind: 'fallback', text: queries.join(' · ') }
    }
    return null
  }

  if (toolName === 'web_fetch') {
    const argUrl = typeof args?.url === 'string' ? args.url.trim() : ''
    if (settled && meta !== null && typeof meta.url === 'string' && typeof meta.statusCode === 'number') {
      return {
        kind: 'web-fetch',
        url: meta.url,
        statusCode: meta.statusCode,
        truncated: meta.truncated === true,
      }
    }
    if (settled) {
      const text = extractResultText(block)
      if (text !== '') return { kind: 'fallback', text: text.slice(0, 400) }
    }
    if (argUrl !== '') return { kind: 'fallback', text: argUrl }
    return null
  }

  if (toolName === 'spawn_teammate' || toolName === 'subagent') {
    const mode = toolName === 'spawn_teammate' ? 'teammate' : 'worker'
    const roleRaw = toolName === 'spawn_teammate'
      ? (typeof args?.name === 'string' ? args.name.trim() : '')
      : (typeof args?.subagent_type === 'string' && args.subagent_type.trim() !== ''
        ? args.subagent_type.trim()
        : (typeof args?.name === 'string' ? args.name.trim() : ''))
    const goalRaw = typeof args?.description === 'string' && args.description.trim() !== ''
      ? args.description.trim()
      : (typeof args?.prompt === 'string' ? args.prompt.trim() : '')
    if (roleRaw !== '' || goalRaw !== '') {
      const roleName = roleRaw !== '' ? roleRaw : (mode === 'teammate' ? 'teammate' : 'worker')
      return {
        kind: 'delegation',
        mode,
        roleName,
        waveHint: detectWaveHint(roleName, goalRaw),
        goalSummary: cleanGoalLines(goalRaw),
      }
    }
  }

  const fallback = argsRaw.trim()
  return fallback !== '' ? { kind: 'fallback', text: fallback.slice(0, 400) } : null
}
