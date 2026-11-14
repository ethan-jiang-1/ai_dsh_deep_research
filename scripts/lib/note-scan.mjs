// note-scan.mjs — notes 门禁的 Markdown 结构扫描（BUG-175/179/183/185/188；纯函数，keyless）。
//
// 块模型（与 readiness 的 mask 由 conformance 测试钉住；外部 oracle = tests/fixtures/markdown-oracle/）：
//   - fenced code（``` / ~~~、语言后缀、未闭合）——含 blockquote / list 容器前缀；围栏内的
//     `<!--` 是代码内容，不得开启注释（fence 优先于 comment，BUG-185）；
//   - HTML 注释 `<!-- … -->`（只对 fence 外生效，可跨行；未闭合按剩余全文注释）；
//   - 4 空格 / tab 的 indented code（不能打断段落——prevParagraph 状态）；
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

/** 这一行是否延续段落（heading/列表项/空行/围栏/注释之后不是段落）。 */
const isParagraphLine = (content) => {
  if (content.trim() === '') return false
  if (/^ {0,3}#{1,6}(?:\s|$)/.test(content)) return false
  if (/^ {0,3}(?:[-*+]|\d+[.)])(?:\s|$)/.test(content)) return true
  return true
}

/** 把非正文行（fence / 注释 / indented code）替换为空行；行数与原文一致。
 *  - fence 必须在**原始行**（去容器前缀后）判定：注释后同一行的 ``` 不是 fence（CommonMark）；
 *  - indented code 不能打断段落：前一非空行不是空行时，4 空格/tab 行按段落续行保留。 */
export function maskFencedCode(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let fence = null
  let inComment = false
  let inIndented = false
  let prevParagraph = false // 文档开头不是段落：indented code 可起始
  for (const line of lines) {
    const blank = line.trim() === ''
    if (fence !== null) {
      const match = FENCE.exec(containerRest(line))
      if (match !== null && match[2][0] === fence.char && match[2].length >= fence.length && match[3].trim() === '') {
        fence = null
      }
      out.push('')
      prevParagraph = false
      continue
    }
    const content = containerRest(line)
    // 行首注释 = CommonMark HTML block（type 2）：整行是 HTML，含 `-->` 后的同行文本。
    if (inComment || /^ {0,3}<!--/.test(content)) {
      const end = line.indexOf('-->')
      if (end !== -1) inComment = false
      else inComment = true
      out.push('')
      prevParagraph = false
      continue
    }
    const stripped = stripComments(line, false)
    if (stripped.inComment) inComment = true
    // fence 只认行首（去容器前缀后的原始行）；注释后的同一行 ``` 不是 fence。
    const fenceMatch = FENCE.exec(content)
    if (fenceMatch !== null && !(fenceMatch[2][0] === '`' && fenceMatch[3].includes('`'))) {
      fence = { char: fenceMatch[2][0], length: fenceMatch[2].length }
      out.push('')
      prevParagraph = false
      continue
    }
    if (inIndented) {
      if (blank || isIndentedCode(content)) {
        out.push('')
        prevParagraph = false
        continue
      }
      inIndented = false
    } else if (!blank && isIndentedCode(content) && !prevParagraph) {
      inIndented = true
      out.push('')
      prevParagraph = false
      continue
    }
    out.push(stripped.text)
    prevParagraph = isParagraphLine(content)
  }
  return out
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
