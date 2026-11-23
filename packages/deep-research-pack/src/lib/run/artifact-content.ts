/**
 * artifact-content.ts —— 「文件非空」之后的内容谓词（G25/G26，keyless 纯函数）。
 *
 * `artifact-read` 只判 Outcome × 空/truncated；本模块回答「有没有实质内容」：
 *   - 标题/空小节/纯 frontmatter 不是正文；
 *   - question 需要至少一条非标题正文行；
 *   - evidence 卡需要正文，且 `_failed.md`/`_` 前缀是失败登记 sentinel，不是证据卡。
 * 非空 ≠ 有正文；消费方不得再用 `hasFile`/`trim() !== ''` 冒充。
 */

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/
const HEADING = /^\s{0,3}#{1,6}\s/
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/

/** 去掉 BOM/CRLF/frontmatter 后的行。 */
function bodyLinesOf(text: string): readonly string[] {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  return normalized.replace(FRONTMATTER, '').split('\n')
}

/** 是否至少有一条非空、非标题、非分隔线的正文行。 */
export function hasBodyText(text: string | null | undefined): boolean {
  if (typeof text !== 'string' || text.trim() === '') return false
  return bodyLinesOf(text).some((line) => line.trim() !== '' && !HEADING.test(line) && !RULE.test(line))
}

/**
 * question.md 的第一条问题正文行（非标题/非空/非分隔线），剥 Markdown 强调符与反引号；
 * 没有正文 → null。标题-only/空小节/纯 frontmatter 都返回 null。
 * @param text - question.md 全文。
 * @returns 正文行或 null。
 */
export function questionBodyLineOf(text: string | null | undefined): string | null {
  if (typeof text !== 'string' || text.trim() === '') return null
  for (const line of bodyLinesOf(text)) {
    const trimmed = line.trim()
    if (trimmed === '' || HEADING.test(trimmed) || RULE.test(trimmed)) continue
    const flat = trimmed.replace(/\*\*/g, '').replace(/`/g, '').trim()
    if (flat !== '') return flat
  }
  return null
}

/** question 是否有问题正文（不是标题/空小节）。 */
export function hasQuestionBody(text: string | null | undefined): boolean {
  return questionBodyLineOf(text) !== null
}

/** plan 是否有可读正文（节点表/表格/列表行；仅标题/空小节不算）。 */
export function hasPlanBody(text: string | null | undefined): boolean {
  return hasBodyText(text)
}

/**
 * 是否是证据卡文件名（`evidence/` 下的卡）：排除 `_failed.md` 与所有 `_` 前缀 sentinel；
 * 只认 `.md`。
 * @param name - evidence/ 下的文件名。
 * @returns 是否可能是证据卡。
 */
export function isEvidenceCardName(name: string): boolean {
  return /^[^_].*\.md$/.test(name)
}

/** 证据卡是否有正文（frontmatter-only/0 字节/纯标题不算）。 */
export function isEvidenceCard(text: string | null | undefined): boolean {
  return hasBodyText(text)
}
