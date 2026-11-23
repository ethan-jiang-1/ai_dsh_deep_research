/**
 * markdown-mask.ts —— 全仓唯一的零依赖 CommonMark 结构遮罩纯函数（D55 补强）。
 *
 * 职责：把非正文结构（fenced code / indented code / 块级 HTML 注释）整行替换为空串 `''`，
 * 把段落与标题内的行内 HTML 注释 `<!-- ... -->` 按字符区间剥除（保留换行与原始行数），
 * 同时严格遵守 CommonMark 的四条组合规则：
 *   1. 容器退出自动闭合：blockquote（`>`）或列表项（`-` / `1.`）内的未闭合围栏与块级注释，
 *      在容器前缀退出或同级新列表项开始时立即闭合，绝不泄漏吞噬后续顶层标题/判据；
 *   2. 围栏优先于注释：围栏内的 `<!--` 是代码字面量；行首内联注释后的同行 ``` 不是围栏；
 *   3. 行内代码跨度优先于行内注释：匹配闭合的 `` `...` `` / ```` ``...`` ````（含跨行段落内代码跨度）
 *      与反斜杠转义 `\<!--` 内的 `<!--` 均是字面量，不触发注释剥除；
 *   4. 段落/标题作用域隔离：未闭合的行内 `<!--` 不跨空行或新块吞噬后续标题；闭合行后续多个注释逐段剥除。
 *
 * 消费方：`review-readiness.ts`（pack 双半，零外部依赖）与 L0 文档扫描（门禁/证据块）。
 * 外部真值契约 = Markdown 掩码一致性回归直接对照 `mdast-util-from-markdown`。
 */

const FENCE_RE = /^( {0,3})(`{3,}|~{3,})(.*)$/
const ATX_HEADING_RE = /^ {0,3}#{1,6}(?:\s|$)/
const BLOCK_COMMENT_OPEN_RE = /^ {0,3}<!--/
const LIST_MARKER_RE = /^( {0,3})([-*+]|\d{1,9}[.)])( +|\t|$)/
const ASCII_PUNCT_RE = /[!"#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~]/

interface ListFrame {
  readonly id: number
  readonly quoteDepth: number
  readonly contentIndent: number
}

interface ActiveFence {
  readonly char: string
  readonly length: number
  readonly quoteDepth: number
  readonly listItemId: number | null
}

interface ActiveBlockComment {
  readonly quoteDepth: number
  readonly listItemId: number | null
}

type LineKind = 'masked' | 'heading' | 'paragraph' | 'other'

function leadingSpacesOf(text: string): number {
  let count = 0
  while (count < text.length && text[count] === ' ') count += 1
  return count
}

function isIndentedCodeContent(content: string): boolean {
  return content.startsWith('    ') || content.startsWith('\t')
}

/**
 * 在单个行内作用域（单行标题或连续段落行拼接串）内剥除已闭合的 `<!-- ... -->`，
 * 保护反斜杠转义与匹配长度的反引号代码跨度；保留全部 `\n` 使行数不变。
 */
function stripInlineCommentsInScope(scope: string): string {
  let out = ''
  let i = 0
  while (i < scope.length) {
    const ch = scope[i]
    if (ch === '\\' && i + 1 < scope.length && ASCII_PUNCT_RE.test(scope[i + 1] ?? '')) {
      out += scope.slice(i, i + 2)
      i += 2
      continue
    }
    if (ch === '`') {
      let openEnd = i
      while (openEnd < scope.length && scope[openEnd] === '`') openEnd += 1
      const tickLen = openEnd - i
      let search = openEnd
      let closeEnd = -1
      while (search < scope.length) {
        const idx = scope.indexOf('`', search)
        if (idx === -1) break
        let runEnd = idx
        while (runEnd < scope.length && scope[runEnd] === '`') runEnd += 1
        if (runEnd - idx === tickLen) {
          closeEnd = runEnd
          break
        }
        search = runEnd
      }
      if (closeEnd !== -1) {
        out += scope.slice(i, closeEnd)
        i = closeEnd
      } else {
        out += scope.slice(i, openEnd)
        i = openEnd
      }
      continue
    }
    if (scope.startsWith('<!--', i)) {
      const end = scope.indexOf('-->', i + 4)
      if (end !== -1) {
        for (let k = i; k < end + 3; k += 1) {
          if (scope[k] === '\n') out += '\n'
        }
        i = end + 3
        continue
      }
    }
    out += ch
    i += 1
  }
  return out
}

/**
 * 将 Markdown 文本遮罩为等长行数组：代码块与块级 HTML 注释行置 `''`，行内 HTML 注释剥除。
 */
export function maskMarkdownLines(text: string): string[] {
  const rawLines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n')
  const working = [...rawLines]
  const kinds: LineKind[] = Array.from<LineKind>({ length: rawLines.length }).fill('other')

  const listStack: ListFrame[] = []
  let nextListId = 1
  let fence: ActiveFence | null = null
  let blockComment: ActiveBlockComment | null = null
  let inIndented = false
  let prevParagraph = false

  const hasListFrame = (id: number | null): boolean =>
    id === null || listStack.some((frame) => frame.id === id)

  for (let lineIdx = 0; lineIdx < rawLines.length; lineIdx += 1) {
    const rawLine = rawLines[lineIdx] ?? ''

    // 1. 剥除行首 blockquote 前缀并记录每层剩余文本
    const restAtDepth: string[] = [rawLine]
    let quoteDepth = 0
    let quoteRest = rawLine
    while (true) {
      const m = /^ {0,3}> ?/.exec(quoteRest)
      if (m === null) break
      quoteDepth += 1
      quoteRest = quoteRest.slice(m[0].length)
      restAtDepth.push(quoteRest)
    }

    // 2. 先弹出因 quote 深度下降、未缩进就新开 '>'、或非空行缩进不足而退出的列表项
    while (listStack.length > 0) {
      const top = listStack[listStack.length - 1]
      if (top === undefined) break
      if (top.quoteDepth > quoteDepth) {
        listStack.pop()
        continue
      }
      if (top.quoteDepth < quoteDepth) {
        const atTop = restAtDepth[top.quoteDepth] ?? ''
        if (leadingSpacesOf(atTop) < top.contentIndent) {
          listStack.pop()
          continue
        }
        break
      }
      if (quoteRest.trim() !== '' && leadingSpacesOf(quoteRest) < top.contentIndent) {
        listStack.pop()
        continue
      }
      break
    }

    // 3. 容器退出时自动闭合其内部的未闭合围栏 / 块级注释
    if (fence !== null && (quoteDepth < fence.quoteDepth || !hasListFrame(fence.listItemId))) {
      fence = null
    }
    if (blockComment !== null && (quoteDepth < blockComment.quoteDepth || !hasListFrame(blockComment.listItemId))) {
      blockComment = null
    }

    // 计算当前活跃列表容器剥除缩进后的局部内容（用于围栏闭合与缩进代码判定）
    const activeTop = listStack.length > 0 && listStack[listStack.length - 1]?.quoteDepth === quoteDepth
      ? (listStack[listStack.length - 1] ?? null)
      : null
    let content = activeTop !== null && quoteRest.startsWith(' '.repeat(activeTop.contentIndent))
      ? quoteRest.slice(activeTop.contentIndent)
      : quoteRest

    // 4. 活跃围栏内：只认同层匹配的闭合围栏行，其余一律遮罩（`<!--` 不开注释）
    if (fence !== null) {
      const closeMatch = quoteDepth === fence.quoteDepth ? FENCE_RE.exec(content) : null
      const marker = closeMatch?.[2] ?? ''
      if (
        closeMatch !== null
        && marker.charAt(0) === fence.char
        && marker.length >= fence.length
        && (closeMatch[3] ?? '').trim() === ''
      ) {
        fence = null
      }
      working[lineIdx] = ''
      kinds[lineIdx] = 'masked'
      prevParagraph = false
      continue
    }

    // 5. 活跃块级 HTML 注释内：直到包含 `-->` 的行（整行均属 HTML block type 2）
    if (blockComment !== null) {
      if (quoteRest.includes('-->')) blockComment = null
      working[lineIdx] = ''
      kinds[lineIdx] = 'masked'
      prevParagraph = false
      continue
    }

    // 6. 识别新开的列表项（支持嵌套列表 `- a\n  - b`）
    const baseIndent = activeTop !== null ? activeTop.contentIndent : 0
    if (!isIndentedCodeContent(content) || !prevParagraph) {
      const listMatch = LIST_MARKER_RE.exec(content)
      if (listMatch !== null && !(prevParagraph && content.trim() === listMatch[0].trim() && listMatch[3] === '')) {
        const markerSpaces = (listMatch[1] ?? '').length
        const markerToken = listMatch[2] ?? ''
        const afterMarker = listMatch[3] ?? ''
        const padWidth = afterMarker === '\t' ? 4 : (afterMarker === '' ? 1 : afterMarker.length)
        const itemContentIndent = baseIndent + markerSpaces + markerToken.length + (padWidth > 4 ? 1 : padWidth)
        const id = nextListId
        nextListId += 1
        listStack.push({ id, quoteDepth, contentIndent: itemContentIndent })
        content = afterMarker === '' ? '' : content.slice(markerSpaces + markerToken.length + (padWidth > 4 ? 1 : afterMarker.length))
        inIndented = false
        prevParagraph = false
      }
    }

    const blank = content.trim() === ''
    const currentListId = listStack.length > 0 && listStack[listStack.length - 1]?.quoteDepth === quoteDepth
      ? (listStack[listStack.length - 1]?.id ?? null)
      : null

    // 7. 块级 HTML 注释起始（CommonMark §4.6 type 2：行首 0–3 空格 `<!--`，整行皆 HTML）
    if (BLOCK_COMMENT_OPEN_RE.test(content)) {
      if (!quoteRest.includes('-->')) {
        blockComment = { quoteDepth, listItemId: currentListId }
      }
      working[lineIdx] = ''
      kinds[lineIdx] = 'masked'
      inIndented = false
      prevParagraph = false
      continue
    }

    // 8. Fenced code 起始（原始 content 行首判定；行内注释后的 ``` 不在行首，不触发）
    const openMatch = FENCE_RE.exec(content)
    const openMarker = openMatch?.[2] ?? ''
    if (
      openMatch !== null
      && openMarker !== ''
      && !(openMarker.charAt(0) === '`' && (openMatch[3] ?? '').includes('`'))
    ) {
      fence = {
        char: openMarker.charAt(0),
        length: openMarker.length,
        quoteDepth,
        listItemId: currentListId,
      }
      working[lineIdx] = ''
      kinds[lineIdx] = 'masked'
      inIndented = false
      prevParagraph = false
      continue
    }

    // 9. Indented code（4 空格或 tab，且不能中断活跃段落）
    if (inIndented) {
      if (blank || isIndentedCodeContent(content)) {
        working[lineIdx] = ''
        kinds[lineIdx] = 'masked'
        prevParagraph = false
        continue
      }
      inIndented = false
    } else if (!blank && isIndentedCodeContent(content) && !prevParagraph) {
      inIndented = true
      working[lineIdx] = ''
      kinds[lineIdx] = 'masked'
      prevParagraph = false
      continue
    }

    // 10. 正文行分类：空行 / ATX 标题（单行行内作用域）/ 段落行（连续行共享行内作用域）
    if (blank) {
      kinds[lineIdx] = 'other'
      prevParagraph = false
    } else if (ATX_HEADING_RE.test(content)) {
      kinds[lineIdx] = 'heading'
      prevParagraph = false
    } else {
      kinds[lineIdx] = 'paragraph'
      prevParagraph = true
    }
  }

  // Pass 2：按 ATX 单行或连续段落块剥除行内 HTML 注释（保护反引号代码跨度与反斜杠转义）
  let idx = 0
  while (idx < working.length) {
    const kind = kinds[idx]
    if (kind === 'heading') {
      working[idx] = stripInlineCommentsInScope(working[idx] ?? '')
      idx += 1
      continue
    }
    if (kind === 'paragraph') {
      let endIdx = idx + 1
      while (endIdx < working.length && kinds[endIdx] === 'paragraph') endIdx += 1
      const joined = working.slice(idx, endIdx).join('\n')
      const stripped = stripInlineCommentsInScope(joined).split('\n')
      for (let k = 0; k < endIdx - idx; k += 1) {
        working[idx + k] = stripped[k] ?? ''
      }
      idx = endIdx
      continue
    }
    idx += 1
  }

  return working
}
