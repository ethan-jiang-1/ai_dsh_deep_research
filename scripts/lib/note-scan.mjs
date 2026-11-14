// note-scan.mjs — notes 门禁的 Markdown 结构扫描（BUG-175；纯函数，keyless）。
//
// 为什么存在：note-format 的 `statusOf` 用全文行扫描、`VERIFY_SECTION` 用全文正则，note-tree 的
// 点文件豁免又在目录类型判断之前——三者都把「正文/围栏里的文本」当成了结构事实。BUG-165 只修了
// 头七行与否定节，围栏内的 `> 状态：` / `## 验证` 仍会夺权；BUG-166 只修了隐藏目录，隐藏 `.md`
// 仍绕过文件名合同。本模块把「块级剥离」收成一处，供 note-tree / note-format /
// note-graduation-rewrite 共用。
//
// 判据：fenced code（``` / ~~~，允许语言后缀与最多 3 空格缩进）内的行不是正文；未闭合围栏
// 按剩余全文为围栏处理（fail-closed：宁可把后面当引文，不把示例当状态）。行号保持原样，便于
// 失败文案指到真实行。
const FENCE = /^( {0,3})(`{3,}|~{3,})(.*)$/

/** 把 fenced code 的行（含围栏行）替换为空行；行数与原文一致。 */
export function maskFencedCode(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let fence = null
  for (const line of lines) {
    const match = FENCE.exec(line)
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
  return out
}

/** 非围栏行（保留行号；0-based index 对应原文行）。 */
export function linesOutsideFences(text) {
  return maskFencedCode(text).map((line, index) => ({ index, line })).filter(({ line }) => line !== '')
}

/** h2 标题（`## ` 但非 `###`），围栏内不计；line = 1-based 原文行号。 */
export function h2Titles(text) {
  const masked = maskFencedCode(text)
  const out = []
  for (const [index, line] of masked.entries()) {
    const match = /^##(?!#)\s*(.*)$/.exec(line)
    if (match !== null) out.push({ line: index + 1, title: (match[1] ?? '').trim() })
  }
  return out
}

/** 状态行（`> 状态：`）在非围栏行中的出现；value = 去掉前缀与加粗后的裸值。 */
export function statusLines(text) {
  const masked = maskFencedCode(text)
  const out = []
  for (const [index, line] of masked.entries()) {
    if (!line.startsWith('> 状态：')) continue
    out.push({ line: index + 1, value: line.replace(/^> 状态：/, '').replaceAll('**', '').trim() })
  }
  return out
}
