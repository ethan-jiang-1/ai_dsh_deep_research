// 负例留证 2026-11-14：BUG-095——bootWeb 成功路径曾不清 banner timeout；修法 =
// settle 统一 clearTimeout，成功/提前退出/超时三条路径都走它。红配方：删 clearTimeout
// 或任一条 settle 分支 → 本例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const src = readFileSync(join(ROOT, 'scripts/lib/web-harness.mjs'), 'utf8')

test('bootWeb 三条结算路径都经 settle 清 timer（BUG-095）', () => {
  assert.match(src, /const settle = \(fn, value\) => \{[\s\S]{0,160}clearTimeout\(timer\)/)
  assert.match(src, /timer = undefined/)
  assert.match(src, /settle\(resolve, \{ token: m\[1\] \}\)/)
  assert.match(src, /settle\(reject, new Error\(`web 进程提前退出/)
  assert.match(src, /timer = setTimeout\(\(\) => settle\(reject/)
})
