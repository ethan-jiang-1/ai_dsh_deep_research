/**
 * 方法库写入（阶段 3 保存闭环）：把一条库条目 upsert 进 `method-library.md` 文本。
 *
 * 纯函数（keyless）；文本级替换——保留库头（第一个 `## ` 之前）、其它条目（含旧格式正文）与空行；
 * 同名条目整段覆盖。四字段必须都有内容（「（待定）」占位符由 parser 归一为空，不在此放行）。
 */
import { SECTION_LABELS, renderLibraryEntry, type LibraryEntry } from './library-fold.ts'

/** upsert 结果：动作 + 名称 + 写入后的全文。 */
export interface UpsertMethodEntryResult {
  readonly action: 'created' | 'updated'
  readonly name: string
  readonly text: string
}

/** 转义正则字面量。 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 条目标题匹配（名称后可带 `（provenance）` 与 `〔默认偏好〕`）。 */
export function methodHeadingPattern(name: string): RegExp {
  return new RegExp(`^##\\s+${escapeRegExp(name)}(?:（[^）\\n]*）)?(?:〔[^〕\\n]*〕)?\\s*$`, 'm')
}

/**
 * 写入/覆盖一条方法库条目。
 * @param text - 当前 `method-library.md` 全文（可空）。
 * @param entry - 完整条目（名称 + 四字段；四字段必须都非空）。
 * @returns 动作（新建/更新）与写入后的全文。
 */
export function upsertMethodEntry(text: string, entry: LibraryEntry): UpsertMethodEntryResult {
  const name = entry.name.trim()
  if (name === '') throw new Error('方法条目缺名称')
  const missing = SECTION_LABELS.filter(({ key }) => {
    const value = entry.sections[key]
    return value === null || value.trim() === ''
  })
  if (missing.length > 0) {
    throw new Error(`方法条目「${name}」缺字段：${missing.map(({ label }) => label).join('、')}`)
  }
  const legacy = entry.legacyText !== null && entry.legacyText.trim() !== '' ? entry.legacyText.trim() : null
  const block = [
    renderLibraryEntry({ name, sections: entry.sections, provenance: entry.provenance, isDefault: entry.isDefault }),
    ...(legacy === null ? [] : [legacy]),
  ].join('\n')
  const found = methodHeadingPattern(name).exec(text)
  let next: string
  let action: 'created' | 'updated'
  if (found !== null) {
    const start = found.index
    const afterHeading = start + found[0].length
    const rest = text.slice(afterHeading)
    const nextHeading = rest.search(/^##\s/m)
    const end = nextHeading === -1 ? text.length : afterHeading + nextHeading
    const tail = text.slice(end).replace(/^\n+/, '')
    next = `${text.slice(0, start)}${block}\n\n${tail}`.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
    action = 'updated'
  } else {
    const trimmed = text.trimEnd()
    next = `${trimmed === '' ? '' : `${trimmed}\n\n`}${block}\n`
    action = 'created'
  }
  if (entry.isDefault) {
    const pattern = methodHeadingPattern(name)
    next = next.split('\n').map((line) => {
      if (!line.startsWith('## ')) return line
      return pattern.test(line) ? line : line.replace('〔默认偏好〕', '')
    }).join('\n')
  }
  return { action, name, text: next }
}

/**
 * 从库文本里删除一条同名条目（保留库头与其它条目）。
 * @param text - 当前 `method-library.md` 全文。
 * @param name - 要删除的条目名。
 * @returns 是否命中 + 删除后的全文。
 */
export function removeMethodEntry(text: string, name: string): { removed: boolean; text: string } {
  const pattern = methodHeadingPattern(name.trim())
  const found = pattern.exec(text)
  if (found === null) return { removed: false, text }
  const start = found.index
  const afterHeading = start + found[0].length
  const rest = text.slice(afterHeading)
  const nextHeading = rest.search(/^##\s/m)
  const end = nextHeading === -1 ? text.length : afterHeading + nextHeading
  const next = `${text.slice(0, start)}${text.slice(end).replace(/^\n+/, '')}`
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
  return { removed: true, text: `${next}${next === '' ? '' : '\n'}` }
}
