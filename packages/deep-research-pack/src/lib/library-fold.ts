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
const SECTION_PREFIXES: Record<keyof LibrarySections, string> = {
  source: '- 找来源:',
  verify: '- 怎么核实:',
  report: '- 报告怎么写:',
  limit: '- 不承诺:',
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
    const heading = /^##\s+(.+)$/.exec(line)
    if (heading !== null) {
      flush()
      const title = (heading[1] ?? '').trim()
      const openParen = title.indexOf('（')
      current = {
        name: (openParen === -1 ? title : title.slice(0, openParen)).replace(/〔[^〕]*〕/g, '').trim(),
        provenance: openParen === -1 ? null : (title.slice(openParen + 1).split('）')[0] ?? null),
        isDefault: title.includes('默认偏好'),
        sections: { source: null, verify: null, report: null, limit: null },
        legacy: [],
      }
      continue
    }
    if (current === null) continue
    let matched = false
    for (const key of SECTION_KEYS) {
      const prefix = SECTION_PREFIXES[key]
      if (line.startsWith(prefix)) {
        current.sections[key] = line.slice(prefix.length).trim() || null
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

/** 一条库条目的 Markdown 预览（编辑器/round-trip；不是写盘路径）。 */
export function renderLibraryEntry(entry: Pick<LibraryEntry, 'name' | 'sections'> & {
  readonly provenance?: string | null
  readonly isDefault?: boolean
}): string {
  const provenance = entry.provenance !== null && entry.provenance !== undefined ? `（${entry.provenance}）` : ''
  const defaultMark = entry.isDefault === true ? '〔默认偏好〕' : ''
  const lines = [`## ${entry.name}${provenance}${defaultMark}`]
  for (const { key, label } of SECTION_LABELS) {
    const value = entry.sections[key]
    if (value !== null && value.trim() !== '') lines.push(`- ${label}: ${value.trim()}`)
  }
  return lines.join('\n')
}

/** 多条库条目的 Markdown 预览（顺序 = 输入序）。 */
export function renderLibrary(entries: readonly LibraryEntry[]): string {
  return entries.map((entry) => renderLibraryEntry(entry)).join('\n\n')
}

/** 期 1 简单动词（面板 ⋯ 菜单其余项）。 */
export type SimpleAction = 'use-now' | 'set-default' | 'remove'

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
export type LibraryReadState = 'ok' | 'absent' | 'unreadable'

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
