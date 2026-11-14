// 负例留证 2026-11-14：BUG-059 / BUG-061——chrome 定位器曾中文单语（zh 通过、en 假红）；
// TAB_TEXT / 侧栏 pattern 是 locale-owned 唯一正本。红配方：删掉 TAB_TEXT.status 的英文半 →
// 本例红；给 client-load 加中文单字面量 chrome locator → 本例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SHOW_MORE_SESSIONS_PATTERN, TAB_TEXT } from '../../scripts/lib/web-ui-nav.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const hasCjk = (text) => /[\u4e00-\u9fff]/.test(text)
const hasLatin = (text) => /[A-Za-z]/.test(text)

test('TAB_TEXT / 侧栏 pattern 每项双语且带 alternation（BUG-059 / BUG-061）', () => {
  const entries = [
    ...Object.entries(TAB_TEXT).map(([key, value]) => [key, value.source]),
    ['SHOW_MORE_SESSIONS_PATTERN', SHOW_MORE_SESSIONS_PATTERN],
  ]
  assert.ok(entries.length >= 6, '防空语料：TAB_TEXT 过少')
  for (const [key, text] of entries) {
    assert.ok(hasCjk(text) && hasLatin(text), `${key} 不是双语：${text}`)
    if (TAB_TEXT[key] !== undefined) assert.ok(text.includes('|'), `${key} 缺 alternation：${text}`)
  }
})

test('client-load 的 chrome locator 不得中文单语（内容行 allowlist 除外）', () => {
  const src = read('scripts/smoke/client-load.entry.mjs')
  const CONTENT_ALLOW = new Set(['格局调研']) // 方法库内容行：canonical content，不随 locale
  const bad = [...src.matchAll(/getByRole\([^\n]*?\{\s*name:\s*\/([^/]+)\//g)]
    .map((match) => match[1])
    .filter((text) => hasCjk(text) && !text.includes('|') && !CONTENT_ALLOW.has(text))
  assert.deepEqual(bad, [])
})
