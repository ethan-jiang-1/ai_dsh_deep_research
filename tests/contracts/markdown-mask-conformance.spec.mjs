// 负例留证 2026-11-14：BUG-169 / BUG-175 / BUG-178 / BUG-179 / BUG-183 / BUG-185——
// Markdown 结构遮罩必须全仓单一实现并与真实 CommonMark 解析器（mdast-util-from-markdown）一致。
// 红配方：① 把行内反引号跨度扫描删掉 → `a \`<!--\` b\n## Heading` 例红；
// ② 把容器退出自动闭合围栏删掉 → `> \`\`\`\n> x\n## Heading` 与 `- \`\`\`\n  x\n## Heading` 例红；
// ③ 把跨行注释闭合后的同行续扫删掉 → `a <!-- x\ny --> <!-- z --> keep` 例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fromMarkdown } from '../../scripts/lib/tools/workspace-parsers.mjs'
import { maskFencedCode } from '../../scripts/lib/repo/note-scan.mjs'
import { maskMarkdownLines } from '../../packages/deep-research-pack/src/lib/markdown-mask.ts'
import { maskReadinessLines } from '../../packages/deep-research-pack/src/lib/review-readiness.ts'

/**
 * 真实 CommonMark 外部 oracle（直接调用 mdast-util-from-markdown，UTF-16 code-unit 精确对齐）：
 *   - 块级 code（fenced / indented）与块级 HTML 注释（父节点非行内段落/标题）：整行遮罩为 ''；
 *   - 行内 HTML 注释（段落 / 标题内的 `<!-- ... -->`）：按 UTF-16 [start.offset, end.offset) 剥除，保留换行与其余文本。
 */
function mdastMaskedLines(markdown) {
  const src = markdown.replace(/\r\n?/g, '\n')
  const tree = fromMarkdown(src)
  const blockMaskedLines = new Set()
  const inlineCommentRanges = []
  const walk = (node, parentType) => {
    if (node.type === 'code') {
      for (let line = node.position.start.line; line <= node.position.end.line; line += 1) {
        blockMaskedLines.add(line)
      }
    } else if (node.type === 'html' && node.value.trimStart().startsWith('<!--')) {
      if (parentType === 'paragraph' || parentType === 'heading') {
        inlineCommentRanges.push([node.position.start.offset, node.position.end.offset])
      } else {
        for (let line = node.position.start.line; line <= node.position.end.line; line += 1) {
          blockMaskedLines.add(line)
        }
      }
    }
    for (const child of node.children ?? []) walk(child, node.type)
  }
  walk(tree, null)

  const keep = new Uint8Array(src.length).fill(1)
  for (const [start, end] of inlineCommentRanges) {
    for (let i = start; i < end; i += 1) {
      if (src[i] !== '\n') keep[i] = 0
    }
  }
  let stripped = ''
  for (let i = 0; i < src.length; i += 1) {
    if (keep[i]) stripped += src[i]
  }
  const lines = stripped.split('\n')
  for (const line of blockMaskedLines) {
    if (lines[line - 1] !== undefined) lines[line - 1] = ''
  }
  return lines
}

const CORPUS = [
  ['plain', 'a\nb'],
  ['top fence (BUG-169 / BUG-175)', 'a\n```md\nx\n```\nb'],
  ['tilde fence', 'a\n~~~\nx\n~~~\nb'],
  ['blockquote fence (BUG-178)', 'a\n> ```\n> x\n> ```\nb'],
  ['list fence (BUG-178)', 'a\n- ```\n  x\n- ```\nb'],
  ['indented continuation in paragraph', 'a\n    x\nb'],
  ['tab continuation in paragraph', 'a\n\tx\nb'],
  ['html block comment (BUG-179)', 'a\n<!--\nx\n-->\nb'],
  ['inline html comment (BUG-179)', 'a <!-- x --> b'],
  ['fence with unclosed comment marker (BUG-185)', 'a\n```html\n<!--\n```\n\nb'],
  ['fence with closed comment (BUG-185)', 'a\n```html\n<!-- x -->\n```\n\nb'],
  ['inline comment before fence on same line (BUG-185)', 'a\n<!-- c --> ```\nx\n```\n\nb'],
  ['unclosed top fence', 'a\n```\nx\n'],
  ['unclosed block comment', 'a\n<!--\nx\n'],
  ['0-3 spaces heading (BUG-183)', 'a\n   ## x\n  ## y\nb'],
  ['nested blockquote fence', '> > ```\n> > x\n> > ```\nafter'],
  ['list 3-space fence', '- item\n   ```\n   x\n   ```\nafter'],
  ['html block div passthrough', 'a\n<div>\nx\n</div>\nb'],
  ['inline code basic', 'a `x` b'],
  ['two consecutive fences', 'a\n```\nx\n```\nb\n~~~\ny\n~~~\nc'],
  ['comment between fences', 'a\n```\nx\n```\n<!-- c -->\n```\ny\n```\nb'],
  ['crlf normalization', 'a\r\n```\r\nx\r\n```\r\nb'],
  ['indented code after comment', '<!-- x -->\n    y\n'],
  ['indented code after heading (BUG-183)', '# h\n    y\n'],
  ['list continuation 4-space paragraph', '- item\n    y\n'],
  ['indented code after fence', '```\nx\n```\n    y\n'],
  ['indented code after blank line (BUG-183)', 'a\n\n    y\n'],
  ['lazy blockquote paragraph', '> a\nb\n'],
  ['list 2-space continuation', '- a\n  b\n'],
  ['fence in list 4-space', '- item\n    ```\n    x\n    ```\nafter'],
  ['escaped backtick fence', '\\```\nx\n\\```\n'],
  ['inline comment spanning lines', 'a <!-- x\ny --> b\n'],
  ['setext heading', 'a\n---\nb\n'],
  ['fence info with backtick is not fence', '``` a`b\nx\n```\n'],
  ['nested list fence', '- a\n  - b\n    ```\n    x\n    ```\n'],
  // ── D55 补强新增相邻边界用例（首轮手写状态机全部失真的 8 类输入）──
  ['inline code span containing <!--', 'a `<!--` b\n## Real Heading'],
  ['double-backtick code span containing <!--', 'a `` ` <!-- `` b\n## Real Heading'],
  ['unmatched backtick does not shield comment', 'a `unmatched <!-- hidden --> tail'],
  ['backslash escaped comment open', '\\<!-- literal -->\n## Real Heading'],
  ['blockquote unclosed fence exits on container end', '> ```\n> inside\n## Real Heading'],
  ['list unclosed fence exits on container end', '- ```\n  inside\n## Real Heading'],
  ['list fence survives blank line inside list', '- ```\n  x\n\n  y\n  ```\nafter'],
  ['two comments on closing line of multiline comment', 'a <!-- x\ny --> <!-- hidden --> keep'],
  ['astral emoji before inline comment (UTF-16 offset)', '🎯 prefix <!-- hidden --> tail'],
  ['blockquote block comment exits on container end', '> <!--\n> hidden\n## Real Heading'],
  ['unclosed inline comment does not swallow next heading', 'a <!-- unclosed inline\n## Real Heading'],
]

test('CommonMark 具名边界语料与 mdast-util-from-markdown 逐行全等（BUG-169 / BUG-175 / BUG-178 / BUG-179 / BUG-183 / BUG-185）', () => {
  for (const [label, markdown] of CORPUS) {
    const expected = mdastMaskedLines(markdown)
    assert.deepEqual(maskMarkdownLines(markdown), expected, `markdown-mask mismatch on [${label}]`)
    assert.deepEqual(maskFencedCode(markdown), expected, `note-scan mismatch on [${label}]`)
    assert.deepEqual(maskReadinessLines(markdown), expected, `readiness mismatch on [${label}]`)
  }
})

test('结构组合矩阵（容器 × 围栏字符 × 闭合态 × 行内反引号/注释）与 mdast 全等', () => {
  const containers = [
    { name: 'top', prefix: '', cont: '' },
    { name: 'quote', prefix: '> ', cont: '> ' },
    { name: 'list', prefix: '- ', cont: '  ' },
  ]
  const fences = ['```', '````', '~~~']
  const payloads = ['readiness: PASS', '<!-- inner -->', '## Fake Heading']
  let checked = 0
  for (const c of containers) {
    for (const f of fences) {
      for (const closed of [true, false]) {
        for (const p of payloads) {
          const lines = [
            `${c.prefix}intro \`<!--\` text <!-- inline --> ok`,
            `${c.prefix}${f}md`,
            `${c.cont}${p}`,
            ...(closed ? [`${c.cont}${f}`] : []),
            '## Tail Heading',
          ]
          const doc = lines.join('\n')
          const expected = mdastMaskedLines(doc)
          assert.deepEqual(maskFencedCode(doc), expected, `matrix ${c.name}/${f}/closed=${closed}/${p}`)
          assert.deepEqual(maskReadinessLines(doc), expected, `readiness matrix ${c.name}/${f}/closed=${closed}/${p}`)
          checked += 1
        }
      }
    }
  }
  assert.ok(checked >= 54, '防空矩阵')
})
