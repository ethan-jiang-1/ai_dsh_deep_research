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

/** 草稿的字段键（四分区 + 名称）。 */
export type DraftField = 'source' | 'verify' | 'report' | 'limit' | 'name'

/** 字段呈现顺序 = method-interview 的访谈顺序（名称最后定）。 */
export const FIELD_ORDER: readonly DraftField[] = ['source', 'verify', 'report', 'limit', 'name']

/** 字段用户语言名（与 library-fold SECTION_LABELS 同词 + 名称）。 */
export const FIELD_LABELS: Record<DraftField, string> = {
  source: '找来源',
  verify: '怎么核实',
  report: '报告怎么写',
  limit: '不承诺',
  name: '名称',
}

/** 合并前的页面态：当前草稿、手改集合、上一轮 coach 草稿。 */
export interface CoachDraftState {
  readonly name: string
  readonly sections: import('./library-fold.ts').LibrarySections
  readonly manual: ReadonlySet<DraftField>
  readonly base: LibraryEntry | null
}

/** 合并结果：coach 提供的字段、刚变化的活动字段、合并后草稿。 */
export interface CoachDraftMerge {
  readonly name: string
  readonly sections: import('./library-fold.ts').LibrarySections
  readonly coachFields: ReadonlySet<DraftField>
  readonly activeField: DraftField | null
}

/**
 * 把一条 coach 草稿合进当前表单：**手改字段永远以用户为准**，其余字段取 coach 的新值；
 * 与上一轮 coach 草稿相比发生变化的字段 = 刚填的那一格（页面据此高亮/滚动）。
 * @param state - 当前草稿 + 手改集合 + 上一轮 coach 草稿。
 * @param entry - 本轮解析出的完整条目。
 * @returns 合并后的名称/四字段 + coachFields + activeField。
 */
export function mergeCoachDraft(state: CoachDraftState, entry: LibraryEntry): CoachDraftMerge {
  const coachFields = new Set<DraftField>()
  if (entry.name.trim() !== '') coachFields.add('name')
  for (const key of ['source', 'verify', 'report', 'limit'] as const) {
    if (entry.sections[key] !== null) coachFields.add(key)
  }
  const activeField = FIELD_ORDER.find((field) => {
    if (field === 'name') return entry.name.trim() !== '' && entry.name !== (state.base?.name ?? '')
    return entry.sections[field] !== null && entry.sections[field] !== (state.base?.sections[field] ?? null)
  }) ?? null
  const pick = (key: 'source' | 'verify' | 'report' | 'limit'): string | null =>
    state.manual.has(key) ? state.sections[key] : entry.sections[key]
  return {
    name: state.manual.has('name') ? state.name : entry.name,
    sections: { source: pick('source'), verify: pick('verify'), report: pick('report'), limit: pick('limit') },
    coachFields,
    activeField,
  }
}
