// operation-prompts.ts — 发给「方法编辑」模型的写库指令面（不是 UI，保持中文原文）。
//
// 从 useOperationQueue.ts 拆出（BUG-055 数据面收口）：这些字符串进模型请求；与 UI 的 `t()`
// 面分开后，client 组件的 CJK 扫描守卫才能把「组件写死中文」当红。
import type { Mode } from './model.ts'

/** 保存/更新一条方法的工具指令（逐字保留；模型按它调 method_library_upsert）。 */
export function saveOperationInstruction(input: {
  readonly name: string
  readonly entryText: string
  readonly setDefault: boolean
  readonly mode: Mode
}): string {
  const { name, entryText, setDefault, mode } = input
  const label = mode === 'new' ? '新建' : '更新'
  return `保存方法「${name}」到工作区 method-library.md。动作：${label}。必须把 operationId 和 operationHash 原样传给 method_library_upsert，defaultAction=${setDefault ? 'set' : 'preserve'}。entry 必须与下方 method-draft 文本逐字一致。写后停止，不要继续其它工具。\n\`\`\`method-draft\n${entryText}\n\`\`\``
}

/** 删除一条方法的工具指令。 */
export function removeOperationInstruction(name: string): string {
  return `从工作区 method-library.md 删除方法「${name}」。必须调用 method_library_remove，传入 operationId 与名称；写后停止。`
}

/** 设为唯一默认的工具指令。 */
export function setDefaultOperationInstruction(name: string): string {
  return `将「${name}」设为唯一默认偏好。调用 method_library_set_default，action=set，传入 operationId 和名称；写后停止。`
}

/** 清除全部默认标记的工具指令。 */
export function clearDefaultOperationInstruction(): string {
  return '清除 method-library.md 中所有默认偏好标记。调用 method_library_set_default，action=clear，只传 operationId，不传 name；写后停止。'
}
