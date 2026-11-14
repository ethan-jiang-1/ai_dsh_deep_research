// 负例留证 2026-11-14：BUG-079——smoke 死 import（引用的 seed-core 已删）只在真跑时炸。
// 红配方：把任一 smoke 的相对 import 改成不存在的路径 → 本例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIR = join(ROOT, 'scripts', 'smoke')

test('scripts/smoke 的静态相对 import 全部可解析（BUG-079）', () => {
  const files = readdirSync(DIR).filter((file) => file.endsWith('.mjs'))
  assert.ok(files.length >= 10, '防空语料：smoke 入口过少')
  const missing = []
  for (const file of files) {
    const text = readFileSync(join(DIR, file), 'utf8')
    for (const line of text.split('\n')) {
      if (!/^\s*(?:import|export)\b/.test(line)) continue
      for (const match of line.matchAll(/(?:from\s*|import\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
        const target = resolve(DIR, match[1])
        const candidates = [target, `${target}.mjs`, `${target}.ts`, `${target}.json`, join(target, 'index.mjs')]
        if (!candidates.some((candidate) => existsSync(candidate))) missing.push(`${file} -> ${match[1]}`)
      }
    }
  }
  assert.deepEqual(missing, [])
})
