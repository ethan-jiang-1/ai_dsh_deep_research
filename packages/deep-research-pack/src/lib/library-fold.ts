/**
 * 方法库折算（D25 期 1 + detail-ux 期 1.5）：`method-library.md` 文本 → 偏好条目 + 管理指令文本。
 * 纯函数（keyless 单测）；库格式正本 = lead 的 research-brief skill「用户方法库」节——
 * 条目 = `## <名>（日期，来源）〔默认偏好?〕` 二级标题，正文四字段（找来源/怎么核实/报告怎么写/不承诺）；
 * 旧格式（`调查要求`/`适用说明`）兼容读入 legacyText。解析容错：空/无条目 → 空数组。
 */
import { flattenMarkdownInline, truncateWithEllipsis } from './text-fold.ts'

/** 偏好四分区（用户语言键；skill 格式正本同名）。 */
export interface LibrarySections {
  readonly source: string | null
  readonly verify: string | null
  readonly report: string | null
  readonly limit: string | null
}

/** 偏好库条目的最小投影。 */
export interface LibraryEntry {
  /** 条目名（标题行剥括号与〔〕标注）。 */
  readonly name: string
  /** 标题行括号内来源注记（日期/源自），原样保留。 */
  readonly provenance: string | null
  /** 是否标注「默认偏好」。 */
  readonly isDefault: boolean
  /** 四分区内容（新格式；缺席为 null）。 */
  readonly sections: LibrarySections
  /** 旧格式整段文本（调查要求/适用说明），仅旧条目非 null。 */
  readonly legacyText: string | null
}

const SECTION_KEYS: readonly (keyof LibrarySections)[] = ['source', 'verify', 'report', 'limit']
/** 四字段行：Markdown bullet 变体（`-`/`*`/`+`/缩进）+ 半/全角冒号（BUG-093）。 */
const SECTION_LINE: Record<keyof LibrarySections, RegExp> = {
  source: /^\s*[-*+]\s*找来源\s*[:：]\s*(.*)$/,
  verify: /^\s*[-*+]\s*怎么核实\s*[:：]\s*(.*)$/,
  report: /^\s*[-*+]\s*报告怎么写\s*[:：]\s*(.*)$/,
  limit: /^\s*[-*+]\s*不承诺\s*[:：]\s*(.*)$/,
}

/** 标题解析结果：`wellFormed=false` = 名称后还有无法归类的尾缀（写路径拒写，BUG-138）。 */
export interface ParsedMethodHeading {
  readonly name: string
  readonly provenance: string | null
  readonly isDefault: boolean
  readonly wellFormed: boolean
}

const HEADING_LINE = /^##\s+(.+)$/
/** 标题段：`（…）` / `(…)` 来源注记，或 `〔…〕` 标注。 */
const HEADING_SEGMENT = /^(?:[（(][^）)]*[）)]|〔[^〕]*〕)/
const DEFAULT_MARK = '〔默认偏好〕'
/** Unicode 格式字符（Cf：零宽空格/软连字符/LRM 等）——不可见，不能进 name 身份（BUG-167）。 */
const FORMAT_CHARS = /\p{Cf}/gu
const FORMAT_CHAR = /\p{Cf}/u
const stripFormatChars = (value: string): string => value.replace(FORMAT_CHARS, '')

/**
 * 方法库 heading 的**单一 codec**（D51，BUG-083/085/123/124/127/128/138/167 的类）：
 * `## <名>[（provenance）][〔默认偏好〕]`——段间允许空白（含 U+3000），段序不限；
 * 名称 = 首个段之前的文本。`wellFormed` = 名称之后只剩「一个 provenance + 最多一个默认标记」；
 * 第二个 `（…）`、未知 `〔…〕`、第二个 `〔默认偏好〕` 与尾缀（如 `）备注`）都判非法（BUG-180）。
 *
 * 名称身份先剥 Unicode 格式字符（Cf）再比较：同一视觉标题不能因不可见字符变成两个条目。
 * fold 与写路径共用本函数：两侧对同一行必须得到同一个 name/provenance/isDefault。
 */
export function parseMethodHeading(line: string): ParsedMethodHeading | null {
  const match = HEADING_LINE.exec(line.trimEnd())
  if (match === null) return null
  const title = stripFormatChars((match[1] ?? '').trim())
  if (title === '') return null
  const firstSegment = title.search(/[（(〔]/)
  const name = stripFormatChars((firstSegment === -1 ? title : title.slice(0, firstSegment)).trim())
  if (name === '') return null
  let rest = firstSegment === -1 ? '' : title.slice(firstSegment)
  let provenance: string | null = null
  let isDefault = false
  let wellFormed = true
  let provenanceSeen = false
  let defaultSeen = false
  while (rest !== '') {
    const ws = /^\s+/.exec(rest)
    if (ws !== null) { rest = rest.slice(ws[0].length); continue }
    const segment = HEADING_SEGMENT.exec(rest)
    if (segment === null) { wellFormed = false; break }
    const raw = segment[0]
    if (raw.startsWith('（') || raw.startsWith('(')) {
      // 第二个 provenance 是「已识别形态但不应存在」——不能静默消费（BUG-180）。
      if (provenanceSeen) { wellFormed = false; break }
      provenance = stripFormatChars(raw.slice(1, -1))
      provenanceSeen = true
    } else if (raw === DEFAULT_MARK) {
      if (defaultSeen) { wellFormed = false; break }
      isDefault = true
      defaultSeen = true
    } else {
      // 任何非默认的 〔…〕 都是未知段；写路径不得把它当可改写标题（BUG-180）。
      wellFormed = false
      break
    }
    rest = rest.slice(raw.length)
  }
  return { name, provenance, isDefault, wellFormed }
}

/** 渲染规范 heading（写路径的 default 操作使用；段序 = name → provenance → 默认标记）。 */
export function renderMethodHeading(heading: Pick<ParsedMethodHeading, 'name' | 'provenance' | 'isDefault'>): string {
  const name = stripFormatChars(heading.name)
  const provenance = heading.provenance === null ? '' : `（${stripFormatChars(heading.provenance)}）`
  return `## ${name}${provenance}${heading.isDefault ? DEFAULT_MARK : ''}`
}

/** 库条目标题行（`## ` 与 `##\t` 同判——读/写共用，BUG-083）。 */
export const isLibraryHeadingLine = (line: string): boolean => parseMethodHeading(line) !== null

/** 名称里不许出现的标注字符：`（…）`/`(…)` 是 provenance 语法、`〔…〕` 是默认标记语法；
 *  含这些字符的名称会让 fold 与写路径名字不对称（BUG-081）。不可见格式字符同理（BUG-167）：
 *  解析会剥离它们，写入路径必须 fail-loud，不能静默新建一条视觉同名的条目。 */
export function methodNameIssue(name: string): string | null {
  if (/[（）()〔〕]/.test(name)) return '名称不能包含全角括号「（）」、半角括号「()」或「〔〕」——它们是来源注记/默认标记的语法'
  if (FORMAT_CHAR.test(name)) return '名称不能包含不可见的 Unicode 格式字符（零宽空格/软连字符/LRM 等）——它们会让同名条目看起来一样'
  return null
}

/** 从库文本折算条目清单（顺序 = 文件顺序；重名不去重——如实投影，去重归 Lead）。 */
export function foldLibrary(text: string | null): readonly LibraryEntry[] {
  if (text === null || text.trim() === '') return []
  const entries: LibraryEntry[] = []
  let current: { name: string; provenance: string | null; isDefault: boolean; sections: { source: string | null; verify: string | null; report: string | null; limit: string | null }; legacy: string[] } | null = null
  const flush = () => {
    if (current === null) return
    const legacyText = current.legacy.length > 0 ? current.legacy.join('\n').trim() : null
    entries.push({ name: current.name, provenance: current.provenance, isDefault: current.isDefault, sections: current.sections, legacyText })
    current = null
  }
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd()
    const heading = parseMethodHeading(line)
    if (heading !== null) {
      flush()
      current = {
        name: heading.name,
        provenance: heading.provenance,
        isDefault: heading.isDefault,
        sections: { source: null, verify: null, report: null, limit: null },
        legacy: [],
      }
      continue
    }
    if (current === null) continue
    let matched = false
    for (const key of SECTION_KEYS) {
      const match = SECTION_LINE[key].exec(line)
      if (match !== null) {
        current.sections[key] = (match[1] ?? '').trim() || null
        matched = true
        break
      }
    }
    if (matched) continue
    if (line.startsWith('- 调查要求:') || line.startsWith('- 适用说明:') || line.startsWith('- 默认偏好:')) {
      current.legacy.push(line.trim())
      continue
    }
    if (current.legacy.length > 0 && line.trim() !== '' && !line.startsWith('#')) current.legacy.push(line.trim())
  }
  flush()
  return entries
}

/** 分区键的用户语言名（指令拼装序 = 呈现序）。**显示标签正本**——客户端 `SECTIONS` 是它的
 *  呈现副本（同一序、同一逐字标签；由 tests/library-fold 的"显示名一致性"断言对钉，2026-10-18
 *  修发现 13：面板曾显示「找什么资料／明确不承诺」而指令写「找来源／不承诺」）。 */
export const SECTION_LABELS: readonly { key: keyof LibrarySections; label: string }[] = [
  { key: 'source', label: '找来源' },
  { key: 'verify', label: '怎么核实' },
  { key: 'report', label: '报告怎么写' },
  { key: 'limit', label: '不承诺' },
]

/** 旧格式条目的指令载荷（调查要求/适用说明整段）。 */
function legacyPayloadOf(entry: LibraryEntry): string | null {
  if (entry.legacyText === null) return null
  const parts = entry.legacyText.split('\n').map((l) => l.replace(/^- (调查要求|适用说明|默认偏好):\s*/, '').trim()).filter((l) => l !== '')
  return parts.length > 0 ? parts.join('；') : null
}

/** 编辑指令（整条重发；新格式四字段，旧格式整段）。 */
export function editInstruction(entry: LibraryEntry): string {
  const legacy = legacyPayloadOf(entry)
  if (legacy !== null && SECTION_KEYS.every((k) => entry.sections[k] === null)) {
    return `把研究偏好「${entry.name}」改为：${legacy}`
  }
  const payload = SECTION_LABELS
    .map(({ key, label }) => ({ label, value: entry.sections[key] }))
    .filter(({ value }) => value !== null)
    .map(({ label, value }) => `${label}=${value}`)
    .join('；')
  return `把研究偏好「${entry.name}」改为：${payload}`
}

/** 基于内置新建指令（名称 + 四字段 + 来源标注）。 */
export function createInstruction(name: string, sections: LibrarySections, sourceName: string): string {
  const payload = SECTION_LABELS
    .map(({ key, label }) => ({ label, value: sections[key] }))
    .filter(({ value }) => value !== null)
    .map(({ label, value }) => `${label}：${value}`)
    .join('；')
  return `新建研究偏好「${name}」——${payload}（基于内置「${sourceName}」调整）`
}

/** 新建/更新一条库条目的 W1 指令（面板不直写文件；Lead 执行后回执）。 */
export function saveInstruction(name: string, sections: LibrarySections, currentName?: string): string {
  const payload = SECTION_LABELS
    .map(({ key, label }) => ({ label, value: sections[key] }))
    .filter(({ value }) => value !== null && value.trim() !== '')
    .map(({ label, value }) => `${label}：${value}`)
    .join('；')
  const action = currentName === undefined ? '新建' : '更新'
  const target = currentName !== undefined && currentName !== name ? `（原「${currentName}」）` : ''
  return `${action}研究偏好「${name}」${target}——${payload}`
}

/** 库格式一行一字段；多行输入压成单行，内容不丢（换行当空格）。 */
export function flattenSectionValue(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(/\s*\n\s*/g, ' ').replace(/[ \t]{2,}/g, ' ').trim()
}

/** 预览词表（UI 层按语言注入；缺省中文 = 旧行为）。 */
export interface LibraryPreviewLabels {
  readonly sections?: Partial<Record<keyof LibrarySections, string>>
  readonly provenance?: (value: string) => string
  readonly defaultMark?: string
}

/** 一条库条目的 Markdown 预览（编辑器/round-trip；不是写盘路径）。 */
export function renderLibraryEntry(entry: Pick<LibraryEntry, 'name' | 'sections'> & {
  readonly provenance?: string | null
  readonly isDefault?: boolean
}, labels?: LibraryPreviewLabels): string {
  const provenance = entry.provenance !== null && entry.provenance !== undefined
    ? (labels?.provenance?.(entry.provenance) ?? `（${entry.provenance}）`)
    : ''
  const defaultMark = entry.isDefault === true ? (labels?.defaultMark ?? '〔默认偏好〕') : ''
  const lines = [`## ${entry.name}${provenance}${defaultMark}`]
  for (const { key, label } of SECTION_LABELS) {
    const value = entry.sections[key]
    if (value !== null && value.trim() !== '') lines.push(`- ${labels?.sections?.[key] ?? label}: ${flattenSectionValue(value)}`)
  }
  return lines.join('\n')
}

/** 期 1 简单动词（面板 ⋯ 菜单其余项）。 */
type SimpleAction = 'use-now' | 'set-default' | 'remove'

/** 卡片摘要的显示口径（发现 11 修复，2026-10-18）：库文本是 markdown，摘要要进纯文本 div——
 *  源文件标记（`**` 强调、反引号）不是内容，先剥再截断；截断补省略号，不在字中间装作完整句。
 *  与状态页签的研究问题行同款口径（ResearchStatusTab G3，同 72 字）。 */
export const SUMMARY_MAX_LENGTH = 72

/**
 * 条目卡面摘要：分区在场优先（source → verify → report），纯旧格式条目退回旧文首行。
 * @param entry - 库条目投影。
 * @param maxLength - 截断长度（默认 SUMMARY_MAX_LENGTH）。
 * @returns 可直接渲染进纯文本节点的摘要；无内容 → null（不编造）。
 */
export function summaryOfEntry(entry: LibraryEntry, maxLength: number = SUMMARY_MAX_LENGTH): string | null {
  const section = entry.sections.source ?? entry.sections.verify ?? entry.sections.report
  const raw = section ?? (entry.legacyText === null ? null : legacyLinesOf(entry.legacyText)[0] ?? null)
  if (raw === null) return null
  const flat = flattenMarkdownInline(raw)
  if (flat === '') return null
  return truncateWithEllipsis(flat, maxLength)
}

/** 旧格式正文逐行剥前缀（摘要、详情读态与编辑态预填共用口径；剥完为空的行丢弃）。 */
export function legacyLinesOf(legacyText: string): readonly string[] {
  return legacyText.split('\n').map((l) => l.replace(/^- (调查要求|适用说明|默认偏好):\s*/, '').trim()).filter((l) => l !== '')
}

/** 期 1 简单指令（逐字正本 = skill 管理动词）。 */
export function instructionOf(action: SimpleAction, name: string): string {
  switch (action) {
    case 'use-now':
      return `本次研究请按我保存的研究偏好「${name}」来做`
    case 'set-default':
      return `把研究偏好「${name}」设为以后的默认`
    case 'remove':
      return `删掉研究偏好「${name}」`
  }
}

/** 库读状态（component 只画；判定住此处以便 keyless 钉）。 */
type LibraryReadState = 'ok' | 'absent' | 'unreadable'

/**
 * 折算「偏好库读没读回来」——**「无结果」≠「失败」**（外部状态文案准则：No result is different
 * from failure）：目录列举拿不到 = unreadable；文件不在 = absent（新工作区的正常空态）；文件在而
 * 文本读不回 = unreadable；其余 = ok。
 * @param text - `readFile` 结果（null = 没读回来）。
 * @param files - `listDir` 结果（null = 目录面不可达）。
 * @param path - 库文件相对路径。
 * @returns 三态之一（loading 归组件首读态，不进本函数）。
 */
export function libraryReadStateOf(
  text: string | null,
  files: readonly { readonly type: string; readonly name: string }[] | null,
  path: string,
): LibraryReadState {
  if (files === null) return 'unreadable'
  const present = files.some((f) => f.type === 'file' && f.name === path)
  if (!present) return 'absent'
  return text === null ? 'unreadable' : 'ok'
}
