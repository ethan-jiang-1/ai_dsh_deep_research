/**
 * defaults/context — 项目研究默认的模型面文本（host-only；client 不 import 本文件）。
 *
 * 为什么不在共享 `src/lib/research-defaults.ts` 里写这段中文：共享件同时进 client bundle，
 * UI 面不得有中文硬编码（cjk-source 门禁）；这段文本只服务 `systemPrompt.context`（模型面），
 * 住 host 侧。`src/lib` 只留 schema/纯折算/ASCII 命令码。
 *
 * 语义（issue 核心）：只列**已设置**字段；未列出的维度 = 自动 = Lead 自主判断，不是系统默认。
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  DEFAULTS_FILE,
  findDefaultMethod,
  type Authority, type DefaultsProblem, type DefaultsValue, type EffortBand,
  type OutputShape, type Recency, type SourceFamily,
  parseDefaults,
} from '../lib/research-defaults.ts'

/** 方法库文件名（与 manual / method-library-tool 同源）。 */
const LIBRARY_FILE = 'method-library.md'

const BAND_LABELS: Readonly<Record<EffortBand, string>> = {
  quick: '快答档', standard: '标准档', deep: '深度档',
}

const SHAPE_LABELS: Readonly<Record<OutputShape, string>> = {
  quick_answer: '快答',
  full_report: '完整报告',
  one_page_memo: '一页备忘',
  comparison_table: '对比表',
  timeline: '时间线',
  landscape_map: '全景地图',
}

const FAMILY_LABELS: Readonly<Record<SourceFamily, string>> = {
  official: '官方', web: '网络', academic: '学术',
  regulatory: '监管', practitioner: '从业', local: '本地',
}

const AUTHORITY_LABELS: Readonly<Record<Authority, string>> = {
  primary: '一手优先', secondary: '权威二手', any: '不限',
}

const RECENCY_LABELS: Readonly<Record<Recency, string>> = {
  '6m': '近 6 个月', '12m': '近 12 个月', '24m': '近 24 个月', 'as-of-capture': '以抓取时点',
}

/** prompt 段输入。 */
export interface DefaultsContextInput {
  readonly value: DefaultsValue
  readonly methodDefault: string | null
  readonly problems?: readonly DefaultsProblem[]
}

/**
 * 把已设置的项目默认渲染成一段短 prompt。无值且无方法默认 → 空串（不改变无配置场景的装配）。
 * @param input - 值 + 方法默认 + 解析问题。
 * @returns prompt 段文本（≤6 行）。
 */
export function defaultsContextText(input: DefaultsContextInput): string {
  const parts: string[] = []
  if (input.methodDefault !== null) parts.push(`方法: 库默认「${input.methodDefault}」`)
  if (input.value.effort !== undefined) parts.push(`深度: ${input.value.effort}（${BAND_LABELS[input.value.effort]}）`)
  if (input.value.output !== undefined) {
    const shape = input.value.output.shape
    const audience = input.value.output.audience
    const shapeText = shape === undefined ? '形态自动' : `${shape}（${SHAPE_LABELS[shape]}）`
    parts.push(`输出: ${shapeText}${audience === undefined ? '' : `；读者：${audience}`}`)
  }
  if (input.value.source !== undefined) {
    const { families, authority, recency } = input.value.source
    const familyText = families === undefined
      ? '家族自动'
      : families.map((family) => `${family}（${FAMILY_LABELS[family]}）`).join(', ')
    const authorityText = authority === undefined ? '自动' : `${authority}（${AUTHORITY_LABELS[authority]}）`
    const recencyText = recency === undefined ? '自动' : `${recency}（${RECENCY_LABELS[recency]}）`
    parts.push(`来源: ${familyText}；权威: ${authorityText}；时效: ${recencyText}`)
  }
  const problems = input.problems ?? []
  if (parts.length === 0 && problems.length === 0) return ''

  const lines = ['## 本项目研究默认（用户设置，非硬约束）']
  if (parts.length > 0) lines.push(`- ${parts.join('；')}`)
  lines.push('- 这是立项起点：HITL1 三问仍照发，推荐项优先用已设置的值；用户本次明确要求优先。')
  lines.push('- 未列出的维度（含语言/界面语言） = 自动：由你（Lead）按题型、判型模式与证据判断，不要当成系统默认。')
  lines.push('- 与题型冲突时按题型推荐并在卡上说明；偏离记 question.md §Decisions，protocol 批准后的偏离才写 protocol.deviations。')
  lines.push('- 项目 AGENTS.md 的指令优先于本默认；已批准 run 以 protocol.json 为准。')
  if (problems.length > 0) lines.push(`- （部分默认无效，已忽略：${problems.map((item) => `${item.field}:${item.code}`).join('、')}）`)
  return lines.join('\n')
}

/** 一段 prompt 段 + 供 host 诊断的解析问题。 */
export interface DefaultsSection {
  readonly text: string
  readonly problems: readonly DefaultsProblem[]
  /** 读文件失败（非缺席）时的人类原因；调用方决定日志。 */
  readonly readError?: string
}

interface CachedSection {
  readonly cwd: string
  readonly fileStamp: string
  readonly libraryStamp: string
  readonly section: DefaultsSection
}

let cache: CachedSection | undefined

function stampOf(path: string): string {
  try {
    const info = statSync(path)
    return `${info.mtimeMs}:${info.size}`
  } catch {
    return 'missing'
  }
}

/**
 * 读 workspace 的两个文件并算出 prompt 段；文件缺席是合法空态。按 mtime/size 缓存，
 * 避免每步 assembly 重复读盘。
 * @param cwd - 会话工作区绝对路径。
 * @returns 段文本 + 问题；文件损坏时 text 为空（不让坏值进 prompt）。
 */
export function defaultsSectionFor(cwd: string): DefaultsSection {
  const file = join(cwd, DEFAULTS_FILE)
  const library = join(cwd, LIBRARY_FILE)
  const fileStamp = stampOf(file)
  const libraryStamp = stampOf(library)
  if (cache !== undefined && cache.cwd === cwd && cache.fileStamp === fileStamp && cache.libraryStamp === libraryStamp) return cache.section

  let section: DefaultsSection
  let fileText: string | null = null
  if (existsSync(file)) {
    try {
      fileText = readFileSync(file, 'utf8')
    } catch (error) {
      section = { text: '', problems: [], readError: `read ${file}: ${(error as Error).message}` }
      cache = { cwd, fileStamp, libraryStamp, section }
      return section
    }
  }
  const parsed = parseDefaults(fileText)
  const fatal = parsed.problems.some((item) => item.code === 'parse' || item.code === 'shape' || item.code === 'schema')
  if (fatal) {
    section = { text: '', problems: parsed.problems, readError: `invalid ${DEFAULTS_FILE}` }
  } else {
    let libraryText: string | null = null
    try {
      libraryText = existsSync(library) ? readFileSync(library, 'utf8') : null
    } catch {
      libraryText = null
    }
    section = {
      text: defaultsContextText({
        value: parsed.value,
        methodDefault: findDefaultMethod(libraryText),
        problems: parsed.problems,
      }),
      problems: parsed.problems,
    }
  }
  cache = { cwd, fileStamp, libraryStamp, section }
  return section
}

/** 测试/命令用：丢弃缓存（不参与运行时语义）。 */
export function resetDefaultsSectionCache(): void {
  cache = undefined
}
