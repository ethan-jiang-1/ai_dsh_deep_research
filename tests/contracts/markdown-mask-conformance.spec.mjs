// 负例留证 2026-11-14：BUG-178/179/183/185——旧实现只 mask 顶层 fence，blockquote/list/indented/
// HTML 注释都漏；两份 mask 还会各自漂移。红配方：把任一侧退回「先剥注释再判 fence」或
// 「无条件 mask 4 空格行」→ oracle 的 inline-comment-before-fence / indented-code 例红。
// Markdown mask 一致性 + 外部 oracle（BUG-178/179/183/185）：
//   - oracle = tests/fixtures/markdown-oracle/oracle.json，由 dev/record-markdown-oracle.mjs
//     用 cockpit 同源的 mdast-util-from-markdown（真 CommonMark）录制；
//   - 两份实现（notes 的 note-scan / readiness 的 pack src/lib）都必须对 oracle 逐行一致；
//     两份实现互相一致只作附加断言——它们可能共享同一个错误子集。
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { maskFencedCode } from '../../scripts/lib/note-scan.mjs'
import { maskReadinessLines } from '../../packages/deep-research-pack/src/lib/review-readiness.ts'

const ORACLE = JSON.parse(readFileSync(new URL('../fixtures/markdown-oracle/oracle.json', import.meta.url), 'utf8'))

const MATRIX = [
  ['top fence', 'a\n```md\nx\n```\nb'],
  ['tilde fence', 'a\n~~~\nx\n~~~\nb'],
  ['blockquote fence', 'a\n> ```\n> x\n> ```\nb'],
  ['list fence', 'a\n- ```\n  x\n- ```\nb'],
  ['indented code (paragraph continuation)', 'a\n    x\nb'],
  ['tab code (paragraph continuation)', 'a\n\tx\nb'],
  ['indented code (after blank)', 'a\n\n    x\n\nb'],
  ['html comment', 'a\n<!--\nx\n-->\nb'],
  ['inline html comment', 'a <!-- x --> b'],
  ['fence with comment marker', 'a\n```html\n<!--\n```\n\nb'],
  ['fence with closed comment', 'a\n```html\n<!-- x -->\n```\n\nb'],
  ['inline comment before fence', 'a\n<!-- c --> ```\nx\n```\n\nb'],
  ['unclosed fence', 'a\n```\nx\n'],
  ['unclosed comment', 'a\n<!--\nx\n'],
  ['0-3 spaces', 'a\n   ## x\n  ## y\nb'],
]

test('note-scan / readiness mask 对同一 Markdown 容器给出同一正文面', () => {
  for (const [label, text] of MATRIX) {
    assert.deepEqual(maskFencedCode(text), maskReadinessLines(text), label)
  }
})

test('两份 mask 都对真实 CommonMark 录制的 oracle 逐行一致', () => {
  for (const fixture of ORACLE.fixtures) {
    assert.deepEqual(maskFencedCode(fixture.markdown), fixture.masked, `note-scan ${fixture.name}`)
    assert.deepEqual(maskReadinessLines(fixture.markdown), fixture.masked, `readiness ${fixture.name}`)
  }
})

test('边界：段落续行不 mask；空行后的缩进代码 mask', () => {
  assert.deepEqual(maskFencedCode('a\n    x\nb'), ['a', '    x', 'b'])
  assert.deepEqual(maskFencedCode('a\n\n    x\n\nb').filter((line) => line !== ''), ['a', 'b'])
  assert.deepEqual(maskFencedCode('a\n   ## x\nb').filter((line) => line !== ''), ['a', '   ## x', 'b'])
})
