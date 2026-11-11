// coach-prompts.ts — 发给「方法编辑」模型的内部指令面（不是 UI，保持中文原文）。
//
// 从 MethodLibraryView.tsx 拆出（BUG-055 数据面收口）：这些字符串进模型请求、不进用户界面；
// 与 UI 的 `t()` 面分开后，client 组件的 CJK 扫描守卫才能把「组件写死中文」当红。
import type { LibraryEntry, LibrarySections } from '../../lib/library-fold.ts'
import { BUILTIN_PREFERENCES } from '../../lib/config-tables.ts'
import { FIELD_LABELS, FIELD_ORDER, type DraftField } from '../../lib/method-draft.ts'
import { SECTION_LABELS } from '../../lib/library-fold.ts'
import type { SourcePreview } from '../../lib/method-library-source.ts'
import type { Draft } from './views.tsx'
import type { RunSourceCandidate } from './views.tsx'

/** 方法编辑首问的页面上下文（库快照 + 草稿 + 参考来源）。 */
export function coachContextOf(input: {
  readonly text: string | null
  readonly draft: Draft | null
  readonly draftRevision: number
  readonly selectedBuiltinSource: LibraryEntry | null
  readonly selectedRunSource: RunSourceCandidate | null
}): string {
  const { text, draft, draftRevision, selectedBuiltinSource, selectedRunSource } = input
  const librarySnapshot = text === null ? '（未加载）' : text.trim() === '' ? '（空）' : text.trim()
  const draftSnapshot = draft === null
    ? '（新建：四字段为空）'
    : [
        `名称：${draft.name.trim() === '' ? '（未命名）' : draft.name}`,
        ...SECTION_LABELS.map((item) => `${item.label}：${draft.sections[item.key] ?? '（空）'}`),
      ].join('\n')
  const previewForCoach = (label: string, preview: SourcePreview): string => preview.kind === 'ok'
    ? `${label}（eof=${String(preview.eof)}）：\n${preview.text}`
    : `${label}（${preview.kind}）：${preview.kind === 'error' ? preview.detail : '文件缺席'}`
  return [
    '【页面自动附带的上下文，不是用户输入】',
    `当前方法库（method-library.md）：\n${librarySnapshot}`,
    `当前草稿（版本 ${draftRevision}）：\n${draftSnapshot}`,
    `内置参考（只读，仅对照，不要照抄）：${BUILTIN_PREFERENCES.map((entry) => `${entry.name}（${entry.summary}）`).join('；')}`,
    ...(selectedBuiltinSource === null ? [] : [`用户选择的内置参考（只读）：${selectedBuiltinSource.name}\n${SECTION_LABELS.map(({ key, label }) => `${label}：${selectedBuiltinSource.sections[key] ?? '（待定）'}`).join('\n')}`]),
    ...(selectedRunSource === null ? [] : [`用户选择的已完成研究：${selectedRunSource.name}\n来源文件：question.md 与 ${selectedRunSource.finalPath}\n${previewForCoach('研究问题预览', selectedRunSource.question)}\n${previewForCoach('交付物预览', selectedRunSource.deliverable)}`]),
  ].join('\n\n')
}

/** 首问的动作句（随来源类型变）。 */
export function coachStartAction(
  selectedRunSource: RunSourceCandidate | null,
  selectedBuiltinSource: LibraryEntry | null,
): string {
  if (selectedRunSource !== null) {
    return `请使用已加载的 method-from-run skill，从所选已完成研究“${selectedRunSource.name}”的有界预览归纳实际采用的方法；只记录可见证据，不补造缺失做法。`
  }
  if (selectedBuiltinSource !== null) {
    return `以用户选择的内置参考“${selectedBuiltinSource.name}”为起点，先确认希望保留或修改哪些方面，不要照抄成品。`
  }
  return '从零开始，先询问研究场景与交付对象，一次只问一个问题。'
}

/** 手改回传（以用户为准；字段名用文件格式的正本标签）。 */
export function manualEditPrompt(draft: Draft, manual: ReadonlySet<DraftField>): string {
  const lines = FIELD_ORDER
    .filter((field) => manual.has(field))
    .map((field) => field === 'name'
      ? `名称：${draft.name}`
      : `${FIELD_LABELS[field]}：${draft.sections[field as keyof LibrarySections] ?? '（空）'}`)
  return `【用户手改，以下值以用户为准，不要覆盖】\n${lines.join('\n')}`
}
