// note-scan 契约（BUG-175）——notes 门禁的块级 Markdown 扫描：
//   - fenced code（``` / ~~~、长度、语言后缀、未闭合）内的行不是正文；
//   - h2 枚举与状态行提取都走同一 mask；行号保持原文；
//   - 4 空格缩进不是围栏（CommonMark），点文件豁免不属于本模块。
//
// 反证：把 maskFencedCode 的 `~~~` 分支删掉 → 下方 tilde 例红；把未闭合围栏当正文 → 未闭合例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { h2Titles, maskFencedCode, statusLines } from '../../scripts/lib/note-scan.mjs'

const visible = (masked) => masked.filter((line) => line !== '')

test('maskFencedCode：反引号 / 波浪号 / 长围栏 / 未闭合 / 缩进边界', () => {
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
  assert.deepEqual(visible(maskFencedCode('    ```\nx\n')), ['    ```', 'x'], '4 空格缩进不是围栏')
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

test('statusLines：围栏里的引用状态行不算；裸值去加粗与空白', () => {
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
})
