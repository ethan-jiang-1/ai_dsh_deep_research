// note-scan.mjs — notes 门禁的 Markdown 结构扫描（BUG-175/179/183/185/188；纯函数，keyless）。
//
// 块与行内注释遮罩直接复用 pack 唯一实现 `packages/deep-research-pack/src/lib/markdown-mask.ts`
// （零第二份状态机副本；外部 CommonMark 真值由 `tests/contracts/markdown-mask-conformance.spec.mjs`
// 直接对照 `mdast-util-from-markdown` 守卫）。行号保持原样，便于失败文案指到真实行。
import { maskMarkdownLines } from '../../../packages/deep-research-pack/src/lib/markdown-mask.ts'

/** 把非正文行（fence / 块级注释 / indented code）置空并剥除行内 HTML 注释；行数与原文一致。 */
export function maskFencedCode(text) {
  return maskMarkdownLines(String(text ?? ''))
}

/** 非正文行（保留行号；0-based index 对应原文行）。 */
export function linesOutsideFences(text) {
  return maskFencedCode(text).map((line, index) => ({ index, line })).filter(({ line }) => line !== '')
}

/** h2 标题（`## ` 但非 `###`），非正文行不计；容忍 0–3 空格缩进。line = 1-based。 */
export function h2Titles(text) {
  const masked = maskFencedCode(text)
  const out = []
  for (const [index, line] of masked.entries()) {
    const match = /^ {0,3}##(?!#)\s*(.*)$/.exec(line)
    if (match !== null) out.push({ line: index + 1, title: (match[1] ?? '').trim() })
  }
  return out
}

/** 状态行的值面：状态标签本身的 `**`/`__`/反引号也是装饰（BUG-188）。 */
const statusValueOf = (line) => {
  const rest = line.replace(/^ {0,3}> /, '')
  const decorated = /^(\*\*|__|`{1,2})(状态)[：:]\1\s*([\s\S]*)$/.exec(rest)
    ?? /^(\*\*|__|`{1,2})(状态)\1\s*[：:]\s*([\s\S]*)$/.exec(rest)
  if (decorated !== null) return (decorated[3] ?? '').replaceAll('**', '').trim()
  // 裸状态行保持 canonical `：`（历史 `> 状态:…` 是正文/旧形态，别把归档件判成第二条状态）。
  const plain = /^状态：\s*([\s\S]*)$/.exec(rest)
  return plain === null ? null : (plain[1] ?? '').replaceAll('**', '').trim()
}

/** 状态行（`> 状态：`）在非正文行中的出现；容忍 0–3 空格缩进与状态标签装饰。 */
export function statusLines(text) {
  const masked = maskFencedCode(text)
  const out = []
  for (const [index, line] of masked.entries()) {
    const value = statusValueOf(line)
    if (value === null) continue
    out.push({ line: index + 1, value })
  }
  return out
}
