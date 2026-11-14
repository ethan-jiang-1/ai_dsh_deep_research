// note-scan.mjs — notes 门禁的 Markdown 结构扫描（BUG-175/179/183；纯函数，keyless）。
//
// 为什么存在：note-format 的 `statusOf` 用全文行扫描、`VERIFY_SECTION` 用全文正则，note-tree 的
// 点文件豁免又在目录类型判断之前——三者都把「正文/围栏里的文本」当成了结构事实。本模块把
// 「块级剥离」收成一处，供 note-tree / note-format / note-graduation-rewrite 共用。
//
// 块模型（与 readiness 的 mask 由 conformance 测试钉住）：
//   - fenced code（``` / ~~~、语言后缀、未闭合）——含 blockquote / list 容器前缀；
//   - HTML 注释 `<!-- … -->`（可跨行，未闭合按剩余全文注释）；
//   - 4 空格 / tab 的 indented code；
//   - 行锚（状态行/heading）容忍 CommonMark 的 0–3 空格容器缩进。
// 行号保持原样，便于失败文案指到真实行。
const FENCE = /^( {0,3})(`{3,}|~{3,})(.*)$/

/** 去掉 blockquote / list 容器前缀，返回可判 fence 的剩余文本（最多 3 空格缩进留给 FENCE）。 */
const containerRest = (line) => {
  let rest = line.replace(/^(?: {0,3}> ?)+/, '')
  rest = rest.replace(/^ {0,3}(?:[-*+]|\d+[.)])\s+/, '')
  return rest
}

/** HTML 注释先把注释段替换为空（保留同行注释外的文本；未闭合按剩余全文注释）。 */
const maskHtmlComments = (lines) => {
  let inComment = false
  return lines.map((line) => {
    let out = ''
    let index = 0
    while (index < line.length) {
      if (inComment) {
        const end = line.indexOf('-->', index)
        if (end === -1) return out
        inComment = false
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
      if (end === -1) {
        inComment = true
        break
      }
      index = end + 3
    }
    return out
  })
}

const isIndentedCode = (line) => {
  const withoutQuote = line.replace(/^(?: {0,3}> ?)+/, '')
  return /^(?: {4}|\t)/.test(withoutQuote)
}

/** 把非正文行（fence / HTML 注释 / indented code）替换为空行；行数与原文一致。 */
export function maskFencedCode(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n')
  const commented = maskHtmlComments(lines)
  const out = []
  let fence = null
  for (const line of commented) {
    const content = containerRest(line)
    const match = FENCE.exec(content)
    if (fence === null) {
      // 反引号围栏的 info string 不得含反引号（CommonMark）；含则不是围栏，按正文处理。
      if (match !== null && !(match[2][0] === '`' && match[3].includes('`'))) {
        fence = { char: match[2][0], length: match[2].length }
        out.push('')
        continue
      }
      out.push(line)
      continue
    }
    if (match !== null && match[2][0] === fence.char && match[2].length >= fence.length && match[3].trim() === '') {
      fence = null
    }
    out.push('')
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

/** 状态行（`> 状态：`）在非正文行中的出现；容忍 0–3 空格缩进。 */
export function statusLines(text) {
  const masked = maskFencedCode(text)
  const out = []
  for (const [index, line] of masked.entries()) {
    const match = /^ {0,3}> 状态：(.*)$/.exec(line)
    if (match === null) continue
    out.push({ line: index + 1, value: (match[1] ?? '').replaceAll('**', '').trim() })
  }
  return out
}
