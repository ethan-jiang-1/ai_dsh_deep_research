// markdown-mask-diff.spec.mjs — maskMarkdownLines 对照 mdast-util-from-markdown 的差分模糊测试。
//
// 归属：住 tests/cockpit/lib/shared/（依赖 src/lib/shared/markdown-mask 与 checks/lib/test-infra/workspace-parsers）。
// 覆盖边界：行数恒等、AST 顶层 code 块正文行 100% 遮罩为空串、AST 顶层 ATX 标题行不被误伤。
//
// 红证：在 markdown-mask.ts 注释掉 fenced code 或 indented code 的 masked 返回 → 对应差分断言红并打印最小反例文档。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fc from 'fast-check'
import { fromMarkdown } from '../../../../checks/lib/test-infra/workspace-parsers.mjs'
import { maskMarkdownLines } from '../../../../packages/deep-research-pack/src/lib/shared/markdown-mask.ts'

test('PBT + mdast 差分: 行数守恒 · 顶层 code 块全遮罩 · 顶层标题行零误伤', () => {
  const safeWord = fc.stringMatching(/^[a-zA-Z0-9]{2,10}$/)
  const blockArb = fc.oneof(
    safeWord.map((w) => `# Title ${w}`),
    safeWord.map((w) => `## Review ${w}\nreadiness: PASS`),
    safeWord.map((w) => `Paragraph with \`<!-- ${w} -->\` and escaped \\<!-- ${w} -->`),
    safeWord.map((w) => `Paragraph with inline <!-- drop ${w} --> kept-${w}`),
    safeWord.map((w) => `<!--\nreadiness: FAIL ${w}\n-->`),
    safeWord.map((w) => `\`\`\`md\n# Fake ${w}\nreadiness: FAIL\n\`\`\``),
    safeWord.map((w) => `~~~\n<!-- ${w} -->\nreadiness: FAIL\n~~~`),
    safeWord.map((w) => `    indented ${w}\n    readiness: FAIL`),
    safeWord.map((w) => `> \`\`\`\n> fenced inside quote ${w}`),
    safeWord.map((w) => `- \`\`\`\n  unclosed fence in list ${w}`),
  )

  fc.assert(
    fc.property(fc.array(blockArb, { minLength: 1, maxLength: 10 }), (blocks) => {
      const doc = blocks.join('\n\n')
      const rawLines = doc.split('\n')
      const masked = maskMarkdownLines(doc)
      assert.equal(masked.length, rawLines.length, '遮罩必须保持原始行数不变')

      const ast = fromMarkdown(doc)
      for (const node of ast.children) {
        const startLine = node.position?.start?.line
        const endLine = node.position?.end?.line
        if (startLine === undefined || endLine === undefined) continue
        if (node.type === 'code') {
          for (let lineNo = startLine; lineNo <= endLine; lineNo += 1) {
            assert.equal(
              masked[lineNo - 1],
              '',
              `mdast code 节点第 ${lineNo} 行（${JSON.stringify(rawLines[lineNo - 1])}）必须被遮罩为空串`,
            )
          }
        } else if (node.type === 'heading') {
          const line = masked[startLine - 1] ?? ''
          assert.ok(line.trim().length > 0, `mdast 顶层 heading 第 ${startLine} 行不得被误遮罩`)
        }
      }
    }),
    { numRuns: 100 },
  )
})

test('PBT 捕获真缺陷回归：list 内未闭合围栏遇同深度列首 blockquote 后退出列表，后续 4 空格缩进 code 必须被遮罩', () => {
  const sample = [
    '- ```',
    '  unclosed fence in list aa',
    '',
    '> ```',
    '> fenced inside quote a0',
    '',
    '    indented Aa',
    '    readiness: FAIL',
  ].join('\n')
  const masked = maskMarkdownLines(sample)
  assert.equal(masked[6], '', '列表退出后缩进代码块行不得泄漏')
  assert.equal(masked[7], '', '缩进代码块里的 readiness: FAIL 必须被遮罩')
})
