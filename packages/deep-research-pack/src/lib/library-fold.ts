/**
 * 方法库折算（D25 期 1 + detail-ux 期 1.5）：`method-library.md` 文本 → 偏好条目 + 管理指令文本。
 * 纯函数（keyless 单测）；库格式正本 = lead 的 research-brief skill「用户方法库」节——
 * 条目 = `## <名>（日期，来源）〔默认偏好?〕` 二级标题，正文四字段（找来源/怎么核实/报告怎么写/不承诺）；
 * 旧格式（`调查要求`/`适用说明`）兼容读入 legacyText。解析容错：空/无条目 → 空数组。
 */

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

/** 分区键的用户语言名（指令拼装序 = 呈现序）。 */
const SECTION_LABELS: readonly { key: keyof LibrarySections; label: string }[] = [
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

/** 期 1 简单动词（面板 ⋯ 菜单其余项）。 */
export type SimpleAction = 'use-now' | 'set-default' | 'remove'

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
