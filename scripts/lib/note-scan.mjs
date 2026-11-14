// note-scan.mjs — notes 门禁的 Markdown 结构扫描（BUG-175/179/183/185/188；纯函数，keyless）。
//
// 块模型（与 readiness 的 mask 由 conformance 测试钉住）：
//   - fenced code（``` / ~~~、语言后缀、未闭合）——含 blockquote / list 容器前缀；围栏内的
//     `<!--` 是代码内容，不得开启注释（fence 优先于 comment，BUG-185）；
//   - HTML 注释 `<!-- … -->`（只对 fence 外生效，可跨行；未闭合按剩余全文注释）；
//   - 4 空格 / tab 的 indented code；
//   - 行锚（状态行/heading）容忍 CommonMark 的 0–3 空格容器缩进；状态标签允许 `**`/`__`/反引号。
// 行号保持原样，便于失败文案指到真实行。
const FENCE = /^( {0,3})(`{3,}|~{3,})(.*)$/

/** 去掉 blockquote / list 容器前缀，返回可判 fence 的剩余文本（最多 3 空格缩进留给 FENCE）。 */
const containerRest = (line) => {
  let rest = line.replace(/^(?: {0,3}> ?)+/, '')
  rest = rest.replace(/^ {0,3}(?:[-*+]|\d+[.)])\s+/, '')
  return rest
}

/** 单行剥 HTML 注释（保留注释外文本；跨行状态由调用方持有）。 */
const stripComments = (line, inComment) => {
  let out = ''
  let comment = inComment
  let index = 0
  while (index < line.length) {
    if (comment) {
      const end = line.indexOf('-->', index)
      if (end === -1) return { text: out, inComment: true }
      comment = false
      index = end + 3
      continue
    }
    const start = line.indexOf('<!--', index)
    if (start === -1) {
      out += line.slice(index)
      break
    }
    out += line.slice(index, start)
    const end = line.indexOf('-->', start + 4)
    if (end === -1) return { text: out, inComment: true }
    index = end + 3
  }
  return { text: out, inComment: comment }
}

const isIndentedCode = (line) => {
  const withoutQuote = line.replace(/^(?: {0,3}> ?)+/, '')
  return /^(?: {4}|\t)/.test(withoutQuote)
}

/** 把非正文行（fence / 注释 / indented code）替换为空行；行数与原文一致。 */
export function maskFencedCode(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let fence = null
  let inComment = false
  for (const line of lines) {
    if (fence !== null) {
      const match = FENCE.exec(containerRest(line))
      if (match !== null && match[2][0] === fence.char && match[2].length >= fence.length && match[3].trim() === '') {
        fence = null
      }
      out.push('')
      continue
    }
    const stripped = stripComments(line, inComment)
    inComment = stripped.inComment
    if (stripped.text === '') {
      out.push('')
      continue
    }
    const match = FENCE.exec(containerRest(stripped.text))
    // 反引号围栏的 info string 不得含反引号（CommonMark）；含则不是围栏，按正文处理。
    if (match !== null && !(match[2][0] === '`' && match[3].includes('`'))) {
      fence = { char: match[2][0], length: match[2].length }
      out.push('')
      continue
    }
    out.push(stripped.text)
  }
  return out.map((line) => (line !== '' && isIndentedCode(line) ? '' : line))
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
