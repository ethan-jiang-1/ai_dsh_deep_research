/**
 * receipt-fold.ts —— 管理指令的**回执三态**折算（子卡① ①-2；总卡发现 4「回执 ≠ 落地」）。
 *
 * 为什么分三态：发送成功只证明"话传出去了"，不证明 Lead 动了手。仓库自有词汇纪律——强正面
 * 词留给 hard gate，所以「已发送 / Lead 已回话 / 已落盘」逐级收紧，每一态的**信号源**不同：
 *   已发送   = `session/prompt` 返回 ok（index.ts 的发送闭包）
 *   Lead 已回话 = 本面板发出的那条指令之后，follow 流里出现 assistant 事件
 *   已落盘   = 回读 `method-library.md`，与发送前的快照对账出 diff（改了哪一句）
 *
 * 纯函数（keyless 单测）；组件只负责把状态画出来。边界注：只看**自己发的这一条**，不做整面板
 * 实时化（卡已裁定：列表实时化缓做，不在本卡）。
 */
import { SECTION_LABELS, type LibraryEntry } from './library-fold.ts'

/** 回执态（failed 之外的三个正向态逐级收紧）。 */
export type ReceiptState = 'failed' | 'sent' | 'replied' | 'landed'

/** 落盘对账结果。 */
export interface LibraryDiff {
  readonly landed: boolean
  /** 人读的一句话（landed 时非 null）：`把「找来源」从 A 改成 B`。 */
  readonly text: string | null
}

/** 回执全文。 */
export interface Receipt {
  readonly state: ReceiptState
  readonly text: string
}

/** journal 事件里是否有 assistant 回话（发送之后的窗口）。 */
export function assistantReplyAfter(events: readonly unknown[], fromIndex: number): boolean {
  for (let i = Math.max(0, fromIndex); i < events.length; i++) {
    const event = events[i]
    if (typeof event === 'object' && event !== null && (event as { type?: unknown }).type === 'assistant/message') return true
  }
  return false
}

/** 按名取条目（重名如实取首条——与 foldLibrary 的"不去重"契约一致）。 */
function entryByName(entries: readonly LibraryEntry[], name: string): LibraryEntry | undefined {
  return entries.find((e) => e.name === name)
}

/** 摘要值（用于 diff 文案；过长截断）。 */
function brief(value: string | null): string {
  if (value === null || value === '') return '（空）'
  return value.length > 24 ? `${value.slice(0, 24)}…` : value
}

/**
 * 库快照对账：发送前 vs 回读后。
 * @param before - 发送前的条目投影。
 * @param after - 回读后的条目投影。
 * @param target - 指令涉及的目标条目名；新建指令传 null（看条目数增量）。
 * @returns landed + 人读 diff 文案（无变化 → landed=false, text=null）。
 */
export function libraryDiff(
  before: readonly LibraryEntry[],
  after: readonly LibraryEntry[],
  target: string | null,
): LibraryDiff {
  if (target === null) {
    const added = after.filter((e) => entryByName(before, e.name) === undefined)
    const last = added.at(-1)
    if (last === undefined) return { landed: false, text: null }
    return { landed: true, text: `新增「${last.name}」` }
  }
  const was = entryByName(before, target)
  const now = entryByName(after, target)
  if (was === undefined && now !== undefined) return { landed: true, text: `新增「${target}」` }
  if (was !== undefined && now === undefined) return { landed: true, text: `删掉「${target}」` }
  if (was === undefined || now === undefined) return { landed: false, text: null }

  const changed: string[] = []
  for (const { key, label } of SECTION_LABELS) {
    const from = was.sections[key]
    const to = now.sections[key]
    if (from === to) continue
    changed.push(from === null || from === '' ? `补上「${label}」=${brief(to)}` : `把「${label}」从 ${brief(from)} 改成 ${brief(to)}`)
  }
  if (was.isDefault !== now.isDefault) changed.push(now.isDefault ? `把「${target}」设为默认` : `取消「${target}」的默认标注`)
  if (changed.length === 0) return { landed: false, text: null }
  const head = changed[0]
  if (head === undefined) return { landed: false, text: null }
  return { landed: true, text: changed.length === 1 ? head : `${head}（等 ${changed.length} 处）` }
}

/**
 * 回执折算（状态优先级：失败 > 已落盘 > 已回话 > 已发送）。
 * @param input - 发送结果、回话信号、落盘对账。
 * @returns 回执态与文案。
 */
export function receiptOf(input: {
  readonly ok: boolean
  readonly detail: string
  readonly replied: boolean
  readonly diff: LibraryDiff | null
}): Receipt {
  if (!input.ok) return { state: 'failed', text: `发送失败，草稿已保留：${input.detail}` }
  if (input.diff !== null && input.diff.landed && input.diff.text !== null) {
    return { state: 'landed', text: `已落盘：${input.diff.text}` }
  }
  if (input.replied) return { state: 'replied', text: 'Lead 已回话，但库里还没读到这次改动（回话 ≠ 落地）' }
  return { state: 'sent', text: '已发送，等 Lead 回话' }
}
