/**
 * method-draft 解析（D37 阶段 3）：从方法编辑的 assistant 消息里取**最后一个** ```method-draft
 * 围栏，按库格式折算成一条 `LibraryEntry`。纯函数（keyless）；格式正本 = method-interview skill
 * 的「输出契约」；页面用它回填表单。
 *
 * 边界：只认完整围栏（闭合 ``` 必须出现）；围栏内只取第一条条目（一条草稿 = 一条条目）；
 * 缺字段/坏标题不猜——`foldLibrary` 的容错原样返回（字段 null 由页面显示「待定」）。
 */
import { foldLibrary, type LibraryEntry } from './library-fold.ts'

const FENCE = /```method-draft[ \t]*\r?\n([\s\S]*?)```/g

/**
 * 解析一条 assistant 文本里的方法草稿。
 * @param text - assistant 消息全文（可含多条围栏与围栏外解释）。
 * @returns 最后一条完整围栏折出的条目；没有围栏 → null。
 */
export function parseMethodDraft(text: string): LibraryEntry | null {
  let last: string | undefined
  for (const match of text.matchAll(FENCE)) last = match[1]
  if (last === undefined) return null
  const entry = foldLibrary(last)[0]
  if (entry === undefined) return null
  // 「（待定）」是 skill 的占位符，不是方法内容——回填前归一成空，别让占位符被保存进库。
  const blank = (value: string | null): string | null =>
    value === null || value.trim() === '' || value.trim() === '（待定）' || value.trim() === '(待定)' ? null : value
  return {
    ...entry,
    sections: {
      source: blank(entry.sections.source),
      verify: blank(entry.sections.verify),
      report: blank(entry.sections.report),
      limit: blank(entry.sections.limit),
    },
  }
}
