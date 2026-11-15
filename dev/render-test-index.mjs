// render-test-index.mjs — 生成 tests/INDEX.generated.md（测试资产 ↔ 源码 owner 索引）。
// 用法：node dev/render-test-index.mjs [--check]
// --check：重算并与盘上逐字节比对；漂移 exit 1，不写盘。
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderTestIndex } from '../scripts/lib/tools/test-index.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'tests/INDEX.generated.md')
const rendered = renderTestIndex(ROOT)

if (process.argv.includes('--check')) {
  const current = readFileSync(OUT, 'utf8')
  if (current !== rendered) {
    console.error('test-index: 漂移——重跑 node dev/render-test-index.mjs')
    process.exit(1)
  }
  console.log('test-index: up to date')
} else {
  writeFileSync(OUT, rendered)
  console.log(`wrote ${OUT}`)
}
