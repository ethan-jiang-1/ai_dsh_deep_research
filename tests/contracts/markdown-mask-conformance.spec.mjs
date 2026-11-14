// 负例留证 2026-11-14：BUG-178/179/183——旧实现只 mask 顶层 fence，blockquote/list/indented/
// HTML 注释都漏；两份 mask 还会各自漂移。红配方：把任一侧退回只看 `^ {0,3}` 顶层 fence →
// 本文件至少一个容器例红；把 note-scan 的行锚退回列 0 → 0–3 空格例红。
// Markdown mask 一致性（BUG-178/179/183）——notes 的 scripts/lib/note-scan 与 readiness 的
// pack src/lib 各有一份实现（跨树不能直接 import），但必须对同一 fixture 给出同一个正文面。
// 本测试是两份实现的契约钉：新增容器形态时两处同改，否则红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { maskFencedCode } from '../../scripts/lib/note-scan.mjs'
import { maskReadinessLines } from '../../packages/deep-research-pack/src/lib/review-readiness.ts'

const MATRIX = [
  ['top fence', 'a\n```md\nx\n```\nb'],
  ['tilde fence', 'a\n~~~\nx\n~~~\nb'],
  ['blockquote fence', 'a\n> ```\n> x\n> ```\nb'],
  ['list fence', 'a\n- ```\n  x\n- ```\nb'],
  ['indented code', 'a\n    x\nb'],
  ['tab code', 'a\n\tx\nb'],
  ['html comment', 'a\n<!--\nx\n-->\nb'],
  ['inline html comment', 'a <!-- x --> b'],
  ['unclosed fence', 'a\n```\nx\n'],
  ['unclosed comment', 'a\n<!--\nx\n'],
  ['0-3 spaces', 'a\n   ## x\n  ## y\nb'],
]

test('note-scan / readiness mask 对同一 Markdown 容器给出同一正文面', () => {
  for (const [label, text] of MATRIX) {
    assert.deepEqual(maskFencedCode(text), maskReadinessLines(text), label)
  }
  // 负例：4 空格是 indented code；0–3 空格 heading 仍是正文。
  assert.deepEqual(maskFencedCode('a\n    x\nb').filter((line) => line !== ''), ['a', 'b'])
  assert.deepEqual(maskFencedCode('a\n   ## x\nb').filter((line) => line !== ''), ['a', '   ## x', 'b'])
})
