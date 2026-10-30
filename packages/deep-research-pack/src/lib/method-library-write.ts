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
  return new RegExp(`^##\\s+${escapeRegExp(name)}(?:（[^）\\n]*）)?(?:〔[^〕\\n]*〕)*\\s*$`, 'm')
}

/**
 * 写入/覆盖一条方法库条目。
 * @param text - 当前 `method-library.md` 全文（可空）。
 * @param entry - 完整条目（名称 + 四字段；四字段必须都非空）。
 * @returns 动作（新建/更新）与写入后的全文。
 */
export function upsertMethodEntry(
  text: string,
  entry: LibraryEntry,
  options: { readonly defaultAction?: 'preserve' | 'set' } = {},
): UpsertMethodEntryResult {
  const name = entry.name.trim()
  if (name === '') throw new Error('方法条目缺名称')
  const missing = SECTION_LABELS.filter(({ key }) => {
    const value = entry.sections[key]
    return value === null || value.trim() === ''
  })
  if (missing.length > 0) {
    throw new Error(`方法条目「${name}」缺字段：${missing.map(({ label }) => label).join('、')}`)
  }
  const target = matchingHeadingLines(text, name)
  if (target.length > 1) throw new Error(`库里有重名方法「${name}」，拒绝写入`)
  if (options.defaultAction !== 'set' && defaultCount(text) > 1) throw new Error('库里存在多个默认偏好，拒绝普通保存')
  const makeDefault = options.defaultAction !== 'set' && target[0]?.line.includes('〔默认偏好〕') === true
  const legacy = entry.legacyText !== null && entry.legacyText.trim() !== '' ? entry.legacyText.trim() : null
  const block = [
    renderLibraryEntry({ name, sections: entry.sections, provenance: entry.provenance, isDefault: makeDefault }),
    ...(legacy === null ? [] : [legacy]),
  ].join('\n')
  let next: string
  let action: 'created' | 'updated'
  if (target.length === 1) {
    const start = target[0]?.offset ?? 0
    const afterHeading = start + (target[0]?.line.length ?? 0)
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
  return { action, name, text: options.defaultAction === 'set' ? setDefaultText(next, name) : next }
}

/** Set one unique target as default; duplicate or absent names are rejected. */
export function setDefaultMethodEntry(text: string, name: string): { readonly text: string } {
  const target = name.trim()
  if (target === '') throw new Error('方法条目缺名称')
  const matches = matchingHeadingLines(text, target)
  if (matches.length === 0) throw new Error(`库里没有「${target}」`)
  if (matches.length > 1) throw new Error(`库里有重名方法「${target}」，拒绝设为默认`)
  return { text: setDefaultText(text, target) }
}

/** Clear all default markers; zero-default libraries are valid. */
export function clearDefaultMethodEntry(text: string): { readonly changed: boolean; readonly text: string } {
  const next = text.split('\n').map((line) => line.startsWith('## ') ? line.replace(/〔默认偏好〕/g, '') : line).join('\n')
  return { changed: next !== text, text: next }
}

function defaultCount(text: string): number {
  return text.split('\n').filter((line) => line.startsWith('## ') && line.includes('〔默认偏好〕')).length
}

function setDefaultText(text: string, name: string): string {
  const pattern = methodHeadingPattern(name)
  let targetCount = 0
  const lines = text.split('\n').map((line) => {
    if (!line.startsWith('## ')) return line
    const isTarget = pattern.test(line)
    if (isTarget) targetCount += 1
    const clean = line.replace(/〔默认偏好〕/g, '')
    return isTarget ? `${clean}〔默认偏好〕` : clean
  })
  if (targetCount !== 1) throw new Error(`库里${targetCount === 0 ? '没有' : '有重名方法'}「${name}」，拒绝设为默认`)
  return lines.join('\n')
}

function matchingHeadingLines(text: string, name: string): readonly { readonly line: string; readonly offset: number }[] {
  const pattern = methodHeadingPattern(name)
  const matches: { line: string; offset: number }[] = []
  let offset = 0
  for (const line of text.split('\n')) {
    if (pattern.test(line)) matches.push({ line, offset })
    offset += line.length + 1
  }
  return matches
}

/**
 * 从库文本里删除一条同名条目（保留库头与其它条目）。
 * @param text - 当前 `method-library.md` 全文。
 * @param name - 要删除的条目名。
 * @returns 是否命中 + 删除后的全文。
 */
export function removeMethodEntry(text: string, name: string): { removed: boolean; text: string } {
  const target = name.trim()
  if (target === '') throw new Error('删除方法需要名称')
  const matches = matchingHeadingLines(text, target)
  if (matches.length === 0) return { removed: false, text }
  if (matches.length > 1) throw new Error(`库里有重名方法「${target}」，拒绝删除`)
  const start = matches[0]?.offset ?? 0
  const found = methodHeadingPattern(target).exec(text)
  if (found === null) return { removed: false, text }
  const afterHeading = start + found[0].length
  const rest = text.slice(afterHeading)
  const nextHeading = rest.search(/^##\s/m)
  const end = nextHeading === -1 ? text.length : afterHeading + nextHeading
  const next = `${text.slice(0, start)}${text.slice(end).replace(/^\n+/, '')}`
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
  return { removed: true, text: `${next}${next === '' ? '' : '\n'}` }
}
