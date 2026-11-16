// note-scan 契约（BUG-165 / BUG-175 / BUG-185 / BUG-188）——notes 门禁的块级 Markdown 扫描：
//   - fenced code（``` / ~~~、长度、语言后缀、未闭合）内的行不是正文；
//   - h2 枚举与状态行提取都走同一 mask，并与 `mdast-util-from-markdown` AST 对账；
//   - 4 空格缩进不是围栏（CommonMark），点文件豁免不属于本模块。
//
// 负例留证 2026-11-14：BUG-165 / BUG-175——若不剥离围栏，围栏内 `> 状态：` 与 `## 围栏里的假证据` 会夺权；
//   红配方 = 删掉 statusLines/h2Titles 的 maskFencedCode 前置 → 围栏引用例与 mdast 对账例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { h2Titles, maskFencedCode, statusLines } from '../../checks/lib/repo/note-scan.mjs'
import { fromMarkdown } from '../../checks/lib/test-infra/workspace-parsers.mjs'

const visible = (masked) => masked.filter((line) => line !== '')

const flattenMdastText = (node) => {
  if (typeof node.value === 'string') return node.value
  if (Array.isArray(node.children)) return node.children.map(flattenMdastText).join('')
  return ''
}

const mdastH2Titles = (text) => {
  const tree = fromMarkdown(text)
  return tree.children
    .filter((node) => node.type === 'heading' && node.depth === 2)
    .map((node) => ({ line: node.position.start.line, title: flattenMdastText(node).trim() }))
}

const mdastStatusLines = (text) => {
  const tree = fromMarkdown(text)
  const out = []
  for (const node of tree.children) {
    if (node.type !== 'blockquote') continue
    for (const child of node.children ?? []) {
      if (child.type !== 'paragraph') continue
      const flat = flattenMdastText(child).trim()
      const match = /^状态[：:]\s*(.+)$/.exec(flat)
      if (match) out.push({ line: child.position.start.line, value: match[1].trim() })
    }
  }
  return out
}

test('maskFencedCode：反引号 / 波浪号 / 长围栏 / 未闭合 / 缩进边界（BUG-175）', () => {
  const text = [
    'a',
    '```md',
    'x',
    '```',
    'b',
    '~~~',
    'y',
    '~~~',
    'c',
    '````',
    'z',
    '```',
    'still-fenced',
    '````',
    'd',
  ].join('\n')
  const masked = maskFencedCode(text)
  assert.equal(masked.length, text.split('\n').length, '行数必须保持——失败文案用原文行号')
  assert.deepEqual(visible(masked), ['a', 'b', 'c', 'd'])

  assert.deepEqual(visible(maskFencedCode('a\n```\nb\n')), ['a'], '未闭合围栏按剩余全文围栏（fail-closed）')
  assert.deepEqual(visible(maskFencedCode('    ```\nx\n')), ['x'], '4 空格是 indented code（不是围栏，也不是正文）')
  assert.deepEqual(visible(maskFencedCode('a\r\n```\r\nx\r\n```\r\nb')), ['a', 'b'], 'CRLF 同判')
})

test('h2Titles：只认围栏外的真 h2（排除 ### 与围栏里的示例）', () => {
  const text = [
    '> 状态：implemented',
    '',
    '## 验证',
    '```markdown',
    '## 围栏里的假证据',
    '```',
    '### 三级不算',
    '## 未验证的猜测',
  ].join('\n')
  assert.deepEqual(h2Titles(text), [
    { line: 3, title: '验证' },
    { line: 8, title: '未验证的猜测' },
  ])
})

test('statusLines：围栏里的引用状态行不算；裸值去加粗与空白（BUG-165）', () => {
  const text = [
    '> 状态：implemented',
    '```',
    '> 状态：proposed',
    '```',
    '> 状态：**approved**  ',
  ].join('\n')
  assert.deepEqual(statusLines(text), [
    { line: 1, value: 'implemented' },
    { line: 5, value: 'approved' },
  ])
  assert.deepEqual(statusLines(text), mdastStatusLines(text))
})

test('块模型：blockquote/list fence、HTML 注释、indented code 都不算正文', () => {
  const text = [
    '> ```',
    '> ## 引用里的示例',
    '> ```',
    '<!--',
    '## 注释里的示例',
    '-->',
    '    ## 缩进代码里的示例',
    '- ```',
    '  ## 列表围栏里的示例',
    '- ```',
    '## 真证据',
  ].join('\n')
  const masked = maskFencedCode(text)
  assert.deepEqual(masked.filter((line) => line !== ''), ['## 真证据'])
  assert.deepEqual(h2Titles(text).map((item) => item.title), ['真证据'])
})

test('行锚：0–3 空格的状态行/heading 算；4 空格是 indented code 不算', () => {
  for (const spaces of [0, 1, 2, 3]) {
    const pad = ' '.repeat(spaces)
    assert.deepEqual(statusLines(`${pad}> 状态：implemented\n`), [{ line: 1, value: 'implemented' }])
    assert.deepEqual(h2Titles(`${pad}## 验证\n`), [{ line: 1, title: '验证' }])
  }
  assert.deepEqual(statusLines('    > 状态：implemented\n'), [])
  assert.deepEqual(h2Titles('    ## 验证\n'), [])
})

// 负例留证 2026-11-14：BUG-185——mask 若 comment-first，围栏里的 `<!--` 会开注释并吞掉
// closing fence 与后续 h2；红配方 = 退回 maskHtmlComments 前置 → 本例红。
// 负例留证 2026-11-14：BUG-188——statusLines 若不剥标签装饰，`> **状态**：` 返回 []；
// 红配方 = 删 statusValueOf 的 decorated 分支 → 装饰矩阵红。
test('块顺序：围栏里的 <!-- 不开注释，后面的真实 h2 仍可见（BUG-185）', () => {
  const text = ['```html', '<!--', '```', '', '## 实际跑过的验证'].join('\n')
  assert.deepEqual(h2Titles(text).map((item) => item.title), ['实际跑过的验证'])
  const closed = ['```html', '<!-- x -->', '```', '', '## 验证'].join('\n')
  assert.deepEqual(h2Titles(closed).map((item) => item.title), ['验证'])
})

test('状态标签装饰：**状态** / __状态__ / 反引号 / 整体加粗都认且与 mdast AST 全等（BUG-188）', () => {
  for (const line of [
    '> **状态**：implemented',
    '> __状态__：implemented',
    '> `状态`：implemented',
    '> **状态：** implemented',
  ]) {
    assert.deepEqual(statusLines(`${line}\n`), [{ line: 1, value: 'implemented' }], line)
    assert.deepEqual(statusLines(`${line}\n`), mdastStatusLines(`${line}\n`), `${line} ↔ mdast`)
  }
  assert.deepEqual(statusLines('> 状态：PASS | FAIL\n'), [{ line: 1, value: 'PASS | FAIL' }])
  const composite = ['## 决定', '```', '## 假标题', '> 状态：proposed', '```', '', '> **状态**：implemented', '', '## 验证'].join('\n')
  assert.deepEqual(h2Titles(composite), mdastH2Titles(composite))
  assert.deepEqual(statusLines(composite), mdastStatusLines(composite))
})
