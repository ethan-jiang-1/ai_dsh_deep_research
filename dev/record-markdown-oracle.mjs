// record-markdown-oracle.mjs — 用真实 CommonMark 解析器（cockpit 同源的 mdast-util-from-markdown）
// 录制 `maskFencedCode` 的外部 oracle：对每个 fixture，产出“代码块/HTML 注释被剥掉后的行”。
//
// 为什么是 dev-only：录制需要解析器（@deepseek-ai/dsh-client-ui-primitives 的 devDependency），
// 但测试与 CI 只读录好的 `tests/fixtures/markdown-oracle/oracle.json`，不引运行时依赖。
// 用法：node dev/record-markdown-oracle.mjs [--check]
//   --check：只比较当前 mask 与 oracle，不写夹具；有分歧 exit 1。
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { maskFencedCode } from '../scripts/lib/note-scan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'tests/fixtures/markdown-oracle/oracle.json')
const CHECK = process.argv.includes('--check')

let fromMarkdown
try {
  const require = createRequire(join(ROOT, 'node_modules/@deepseek-ai/dsh-client-ui-primitives/package.json'))
  const resolved = require.resolve('mdast-util-from-markdown')
  ;({ fromMarkdown } = await import(pathToFileURL(resolved).href))
} catch {
  console.error('record-markdown-oracle: 找不到 mdast-util-from-markdown（cockpit 的 CommonMark 解析器）；先装依赖再录制')
  process.exit(2)
}

const CORPUS = [
  ['plain', 'a\nb'],
  ['top fence', 'a\n```md\nx\n```\nb'],
  ['tilde fence', 'a\n~~~\nx\n~~~\nb'],
  ['blockquote fence', 'a\n> ```\n> x\n> ```\nb'],
  ['list fence', 'a\n- ```\n  x\n- ```\nb'],
  ['indented code', 'a\n    x\nb'],
  ['tab code', 'a\n\tx\nb'],
  ['html comment', 'a\n<!--\nx\n-->\nb'],
  ['inline comment', 'a <!-- x --> b'],
  ['fence with comment marker', 'a\n```html\n<!--\n```\n\nb'],
  ['fence with closed comment', 'a\n```html\n<!-- x -->\n```\n\nb'],
  ['inline comment before fence', 'a\n<!-- c --> ```\nx\n```\n\nb'],
  ['unclosed fence', 'a\n```\nx\n'],
  ['unclosed comment', 'a\n<!--\nx\n'],
  ['0-3 spaces heading', 'a\n   ## x\n  ## y\nb'],
  ['nested blockquote fence', '> > ```\n> > x\n> > ```\nafter'],
  ['list 3-space fence', '- item\n   ```\n   x\n   ```\nafter'],
  ['html block div', 'a\n<div>\nx\n</div>\nb'],
  ['inline code', 'a `x` b'],
  ['two fences', 'a\n```\nx\n```\nb\n~~~\ny\n~~~\nc'],
  ['comment between fences', 'a\n```\nx\n```\n<!-- c -->\n```\ny\n```\nb'],
  ['crlf', 'a\r\n```\r\nx\r\n```\r\nb'],
  ['after comment indented', '<!-- x -->\n    y\n'],
  ['after heading indented', '# h\n    y\n'],
  ['list continuation indented', '- item\n    y\n'],
  ['after fence indented', '```\nx\n```\n    y\n'],
  ['blank then indented', 'a\n\n    y\n'],
]

/** 真实 CommonMark 视角：代码块整行剥掉；HTML 注释按字符区间剥掉（保留换行与行数）。 */
function oracleLines(markdown) {
  const src = markdown.replace(/\r\n?/g, '\n')
  const tree = fromMarkdown(src)
  const codeLines = new Set()
  const commentRanges = []
  const walk = (node) => {
    if (node.type === 'code') {
      for (let line = node.position.start.line; line <= node.position.end.line; line += 1) codeLines.add(line)
    } else if (node.type === 'html' && node.value.startsWith('<!--')) {
      commentRanges.push([node.position.start.offset, node.position.end.offset])
    }
    for (const child of node.children ?? []) walk(child)
  }
  walk(tree)
  const chars = [...src]
  for (const [start, end] of commentRanges) {
    for (let index = start; index < end; index += 1) if (chars[index] !== '\n') chars[index] = ''
  }
  const lines = chars.join('').split('\n')
  for (const line of codeLines) if (lines[line - 1] !== undefined) lines[line - 1] = ''
  return lines
}

const fixtures = CORPUS.map(([name, markdown]) => {
  const masked = oracleLines(markdown)
  const actual = maskFencedCode(markdown)
  return { name, markdown, masked, matches: JSON.stringify(actual) === JSON.stringify(masked) }
})

const mismatches = fixtures.filter((fixture) => !fixture.matches)
for (const fixture of mismatches) {
  console.log(`MISMATCH ${fixture.name}`)
  console.log('  oracle:', JSON.stringify(fixture.masked))
  console.log('  mask  :', JSON.stringify(maskFencedCode(fixture.markdown)))
}
console.log(`record-markdown-oracle: ${fixtures.length} fixtures, ${mismatches.length} mismatches`)

if (CHECK) process.exit(mismatches.length === 0 ? 0 : 1)

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${JSON.stringify({
  generatedBy: 'dev/record-markdown-oracle.mjs',
  oracle: 'mdast-util-from-markdown (CommonMark, cockpit 同源 devDependency)',
  generatedAt: new Date().toISOString().slice(0, 10),
  fixtures: fixtures.map(({ name, markdown, masked }) => ({ name, markdown, masked })),
}, null, 2)}\n`)
console.log(`wrote ${OUT}`)
