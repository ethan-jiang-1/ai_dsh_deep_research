/**
 * text-fold.ts —— 文本呈现口径的共享纯函数（2026-10-18 收敛）。
 *
 * 为什么要有它：run bundle 与库文件都是 markdown，而面板要往**纯文本节点**里渲染——
 * 源文件标记（`**` 强调、反引号）不是内容。此前这段剥标记 + 截断的逻辑散在状态页签
 * （ResearchStatusTab 的 G3 注释处）与配置页签（summaryOfEntry）两处各写一遍，措辞相同、
 * 口径可能漂移；本件是唯一正本（同款口径：剥 `**` 与反引号 → 压空白 → 截断补省略号）。
 *
 * 边界（如实投影，不解析）：只剥行内强调与代码标记，不解析链接/表格/列表——调用方喂进来
 * 的应当是单行值，而不是整篇 markdown。
 */

/** 行内 markdown 源标记剥离 + 空白压平（不做结构解析）。 */
export function flattenMarkdownInline(text: string): string {
  return text.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * 截断补省略号（不在字中间装作完整句）。
 * @param text - 已压平的文本。
 * @param maxLength - 上限；超出才截断。
 * @returns 截断后的文本（未超出则原样）。
 */
export function truncateWithEllipsis(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}
