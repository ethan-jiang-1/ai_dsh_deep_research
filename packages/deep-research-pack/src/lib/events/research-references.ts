/**
 * research-references.ts —— Composer `/` 命令参数模型与 `@` 研究引用编解码/匹配纯函数。
 *
 * 纪律：零 React / 零 DOM / 零 Node built-ins；拒绝 `..` 穿越与 `_failed.md`。
 */
import { isEvidenceCardName } from '../run/artifact-content.ts'
import type { PackTranslate } from '../shared/i18n.ts'
import { parseCommandOutcome } from '../workspace/research-defaults.ts'

export type ResearchRefTarget =
  | { readonly kind: 'evidence'; readonly slug: string; readonly cardName: string; readonly relPath: string; readonly raw: string }
  | { readonly kind: 'plan_node'; readonly slug: string; readonly nodeId: string; readonly raw: string }

export interface ResearchRefMatch {
  readonly start: number
  readonly end: number
  readonly target: ResearchRefTarget
}

export interface DefaultsCommandOptionSpec {
  readonly id: string
  readonly group: 'depth' | 'output' | 'source' | 'reset'
  readonly labelKey: string
  readonly detailKey: string
  readonly activeField?: { readonly field: 'effort' | 'outputShape' | 'sourceAuthority'; readonly value: string | null }
}

const EVIDENCE_TOKEN_RE = /^@?(?:archive\/|_abandoned\/)?drt_([\w.-]+)\/evidence\/([^/\s]+\.md)$/
const PLAN_NODE_TOKEN_RE = /^@?(?:archive\/|_abandoned\/)?drt_([\w.-]+)\/(W[1-9]\d*(?:\.[1-9]\d*)*)$/
const INLINE_REF_RE = /@?(?:archive\/|_abandoned\/)?drt_([\w.-]+)\/(?:evidence\/([^/\s.,;:!?()[\]{}"'`]+?\.md)|(W[1-9]\d*(?:\.[1-9]\d*)*))/g

/**
 * 解析单条研究引用（支持 `@drt_<slug>/evidence/<card>.md` 与 `@drt_<slug>/W<n>[.<m>]`，可省略 `@`）。
 * 拒绝路径穿越与 `_failed.md`。
 */
export function parseResearchRefToken(raw: string): ResearchRefTarget | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed.includes('..')) return null
  const ev = EVIDENCE_TOKEN_RE.exec(trimmed)
  if (ev?.[1] !== undefined && ev[2] !== undefined) {
    if (!isEvidenceCardName(ev[2])) return null
    return {
      kind: 'evidence',
      slug: ev[1],
      cardName: ev[2],
      relPath: `evidence/${ev[2]}`,
      raw: trimmed,
    }
  }
  const node = PLAN_NODE_TOKEN_RE.exec(trimmed)
  if (node?.[1] !== undefined && node[2] !== undefined) {
    return {
      kind: 'plan_node',
      slug: node[1],
      nodeId: node[2],
      raw: trimmed,
    }
  }
  return null
}

/**
 * 在用户消息正文里查找从 `from` 起最近的一条合法研究引用（用于 `uiConversation.userText` 规则）。
 */
export function findNextResearchRef(text: string, from: number): ResearchRefMatch | undefined {
  if (typeof text !== 'string' || from < 0 || from >= text.length) return undefined
  INLINE_REF_RE.lastIndex = from
  for (let match = INLINE_REF_RE.exec(text); match !== null; match = INLINE_REF_RE.exec(text)) {
    const raw = match[0]
    const start = match.index
    // 若前面紧贴单词字符（非空白/标点/中文边界），跳过误命中。
    if (start > 0 && /[A-Za-z0-9_/\\-]/.test(text[start - 1]!)) continue
    const target = parseResearchRefToken(raw)
    if (target !== null) {
      return { start, end: start + raw.length, target }
    }
  }
  return undefined
}

/** 构造 `@` 证据卡引用插入文本（保留确定性路径，便于模型与阅读器双向识别）。 */
export function formatEvidenceMention(slug: string, cardName: string): string {
  return `@drt_${slug}/evidence/${cardName}`
}

/** 构造 `@` 计划节点引用插入文本。 */
export function formatPlanNodeMention(slug: string, nodeId: string): string {
  return `@drt_${slug}/${nodeId}`
}

function setDefaultsCommandLine(patch: Record<string, unknown>, revision: number | null): string {
  const payload = revision !== null && Number.isInteger(revision) && revision >= 0
    ? { patch, expectedRevision: revision }
    : { patch }
  return `/research-defaults set ${JSON.stringify(payload)}`
}

/** 将 `/research-defaults` popupSelect 选项 id 翻译为 Host `/research-defaults` 命令行。 */
export function defaultsCommandLineForOption(optionId: string, revision: number | null): string | null {
  const revSuffix = revision !== null && Number.isInteger(revision) && revision >= 0
    ? ` revision=${String(revision)}`
    : ''
  switch (optionId) {
    case 'depth:quick': return setDefaultsCommandLine({ effort: 'quick' }, revision)
    case 'depth:standard': return setDefaultsCommandLine({ effort: 'standard' }, revision)
    case 'depth:deep': return setDefaultsCommandLine({ effort: 'deep' }, revision)
    case 'depth:auto': return `/research-defaults unset effort${revSuffix}`
    case 'output:full_report': return setDefaultsCommandLine({ output: { shape: 'full_report' } }, revision)
    case 'output:one_page_memo': return setDefaultsCommandLine({ output: { shape: 'one_page_memo' } }, revision)
    case 'output:comparison_table': return setDefaultsCommandLine({ output: { shape: 'comparison_table' } }, revision)
    case 'output:landscape_map': return setDefaultsCommandLine({ output: { shape: 'landscape_map' } }, revision)
    case 'output:timeline': return setDefaultsCommandLine({ output: { shape: 'timeline' } }, revision)
    case 'output:quick_answer': return setDefaultsCommandLine({ output: { shape: 'quick_answer' } }, revision)
    case 'output:auto': return `/research-defaults unset output${revSuffix}`
    case 'source:primary': return setDefaultsCommandLine({ source: { authority: 'primary' } }, revision)
    case 'source:secondary': return setDefaultsCommandLine({ source: { authority: 'secondary' } }, revision)
    case 'source:any': return setDefaultsCommandLine({ source: { authority: 'any' } }, revision)
    case 'reset:clear': return `/research-defaults clear${revSuffix}`
    default: return null
  }
}

/** 解释 `remote.commands.execute('/research-defaults …')` 返回值：RPC 与命令层任一失败均显性返回 `{ ok: false, error }`（BUG-470）。 */
export function interpretDefaultsCommandResult(result: {
  readonly ok: boolean
  readonly value?: { readonly result?: { readonly kind?: string; readonly text?: string } | undefined; readonly kind?: string; readonly text?: string } | undefined
  readonly error?: { readonly message?: string } | unknown
}): { readonly ok: boolean; readonly error?: string } {
  if (!result.ok) {
    const err = result.error as { readonly message?: string } | undefined
    return { ok: false, error: err?.message ?? 'command failed' }
  }
  const inner = result.value?.result ?? result.value
  const text = typeof inner?.text === 'string' ? inner.text : ''
  if (inner?.kind === 'error') {
    return { ok: false, error: text || 'research-defaults error' }
  }
  const parsed = parseCommandOutcome(text)
  if (!parsed.ok) {
    return { ok: false, error: text || parsed.code || 'research-defaults error' }
  }
  return { ok: true }
}

/** 构造 `/lens` 选中后插入 Composer 的结构化透镜要求（仅填入草稿，不自动发送，遵守 D18）。 */
export function buildLensDraftInstruction(lensId: string, lensName: string, t: PackTranslate): string {
  return t('cmdLensDraftTemplate', { name: lensName, id: lensId })
}

/** 构造 `/method` 选中后插入 Composer 的方法选用指令（仅填入草稿，不自动发送，遵守 D18）。 */
export function buildMethodDraftInstruction(methodName: string, t: PackTranslate): string {
  return t('cmdMethodDraftTemplate', { name: methodName })
}
