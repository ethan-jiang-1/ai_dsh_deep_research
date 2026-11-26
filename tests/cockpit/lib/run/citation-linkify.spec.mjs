// citation-linkify 回归 — 内存中转写 [来源: evidence/xx.md] 为可点链接且跳过代码块与行内代码。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { linkifyEvidenceCitations } from '../../../../packages/deep-research-pack/src/lib/run/citation-linkify.ts'

test('linkifyEvidenceCitations：正文转换 [来源: evidence/xx.md]，已有链接不重复，代码块与行内代码免疫', () => {
  const md = [
    '# 结论',
    '',
    '实测性能提升 30% [来源: evidence/bench-1.md]。',
    '英文写法 [Source: evidence/en-2.md] 与直接引用 [evidence/e3.md] 及已链接 [来源: evidence/e4.md](evidence/e4.md)。',
    '行内代码 `[来源: evidence/ignored-inline.md]` 不得转换。',
    '',
    '```md',
    '示例代码 [来源: evidence/ignored-fence.md]',
    '```',
  ].join('\n')

  const out = linkifyEvidenceCitations(md)
  assert.match(out, /\[来源: evidence\/bench-1\.md\]\(evidence\/bench-1\.md\)/)
  assert.match(out, /\[Source: evidence\/en-2\.md\]\(evidence\/en-2\.md\)/)
  assert.match(out, /\[evidence\/e3\.md\]\(evidence\/e3\.md\)/)
  assert.match(out, /\[来源: evidence\/e4\.md\]\(evidence\/e4\.md\)(?!\()/)
  assert.match(out, /`\[来源: evidence\/ignored-inline\.md\]`/)
  assert.match(out, /示例代码 \[来源: evidence\/ignored-fence\.md\]\n```/)
})
