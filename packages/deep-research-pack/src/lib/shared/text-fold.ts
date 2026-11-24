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

/** UTF-8 BOM（U+FEFF）剥离：RFC 8259 §8.1 允许 JSON 消费者忽略它；文本工件同理。
 *  BOM 不是内容，带不带必须同判——否则「同一份文件换个编辑器」就换结论（BUG-414/415 类）。 */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/**
 * 契约文本 → 行数组（**唯一正本**）：先剥 BOM，再按 `\r\n` / `\r` / `\n` 切，行内不留 `\r`。
 *
 * 为什么必须有它（BUG-412/413/414/417/420）：各解析器曾各自 `split('\n')`——CRLF 文件的每行
 * 尾部留一个 `\r`，任何以 `$` 收尾的逐行正则（`^>\s*(.+)$`、`^\s{2,}-\s+(.+)$` 等）都不再匹配，
 * 于是「同一份内容换个换行符」就让门禁换结论；首行的 BOM 还会让 `^##`/`^---` 整条失配。
 * 新解析器一律用它，不要再写第三份切行逻辑。
 * @param text - 原文（可为 null/undefined）。
 * @returns 行数组；空/非字符串 → `[]`。
 */
export function linesOf(text: string | null | undefined): string[] {
  if (typeof text !== 'string' || text === '') return []
  return stripBom(text).split(/\r\n|\r|\n/)
}
