// smoke-registry.spec.mjs — 每个 smoke 的 CI 归属必须显式（2026-11-03 第 14 轮审计）。
//
// 反证：新增一个 scripts/smoke/*.mjs 不登记 registry → 本文件红；把 registry 标 ci 的件从
// ci.yml 删掉 → 红；dev-only 不写理由 → 红。这样“新 smoke 永久不跑”不再能静默发生。
// BUG-160/162：CI 归属只认「可执行 run 行」（注释/echo 不算）；scripts/smoke 必须扁平（嵌套件红）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SMOKE = join(ROOT, 'scripts', 'smoke')
const registry = JSON.parse(readFileSync(join(SMOKE, 'registry.json'), 'utf8'))
const ci = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8')
const entries = readdirSync(SMOKE, { withFileTypes: true })
const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.mjs')).map((entry) => entry.name).sort()
const subdirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()

/** 提取 ci.yml 的 run 块：单行 `run:` 与 `run: |`/`run: >` 缩进块。 */
function runBlocksOf(text) {
  const lines = text.split('\n')
  const blocks = []
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^(\s*)run:\s*(.*)$/.exec(lines[i])
    if (match === null) continue
    const baseIndent = match[1].length
    const rest = match[2].trim()
    if (/^[|>][+-]?$/.test(rest)) {
      const block = []
      let j = i + 1
      for (; j < lines.length; j += 1) {
        const line = lines[j]
        if (line.trim() === '') { block.push(''); continue }
        const indent = /^\s*/.exec(line)[0].length
        if (indent <= baseIndent) break
        block.push(line.trimStart())
      }
      i = j - 1
      blocks.push(block.join('\n'))
    } else if (rest !== '') {
      blocks.push(rest)
    }
  }
  return blocks
}

/** 可执行 run 行里的 smoke 文件：注释、echo/printf/cat 与注释里的文件名都不算（BUG-160）。 */
function executedSmokeFiles(text) {
  const found = new Set()
  for (const block of runBlocksOf(text)) {
    for (const rawLine of block.split('\n')) {
      const code = rawLine.replace(/\s+#.*$/u, '').trim()
      if (code === '' || code.startsWith('#')) continue
      if (/^(?:echo|printf|cat)(?:\s|$)/.test(code)) continue
      for (const match of code.matchAll(/scripts\/smoke\/([A-Za-z0-9._-]+\.mjs)/g)) {
        const before = code.slice(0, match.index)
        if (/(^|[\s;&|])node(?:\s|$)/.test(before)) found.add(match[1])
      }
    }
  }
  return found
}

test('smoke registry：scripts/smoke 必须扁平——子目录即红', () => {
  assert.deepEqual(subdirs, [], `scripts/smoke 下不得有子目录：${subdirs.join(', ')}——registry/车道只扫顶层，嵌套件会静默不跑`)
})

test('smoke registry：CI 归属只认可执行 run 行，注释/echo 不算', () => {
  const synthetic = `
jobs:
  keyless:
    steps:
      - name: commented
        run: echo 'probe: disabled' # node scripts/smoke/commented.e2e.mjs
      - name: real
        run: |
          echo start
          node scripts/smoke/real.e2e.mjs
`
  assert.deepEqual([...executedSmokeFiles(synthetic)].sort(), ['real.e2e.mjs'])
})

test('smoke registry：盘上每个 smoke 都有且只有一条 CI/dev-only 归属', () => {
  assert.deepEqual(Object.keys(registry).sort(), files, 'registry 与 scripts/smoke/*.mjs 集合必须相等')
  const executed = executedSmokeFiles(ci)
  for (const [file, entry] of Object.entries(registry)) {
    const lane = file.endsWith('.e2e.mjs') ? 'e2e' : file.endsWith('.entry.mjs') ? 'entry' : file.endsWith('.support.mjs') ? 'support' : null
    assert.ok(lane !== null, `${file} 后缀不是 .e2e.mjs / .entry.mjs / .support.mjs——命名即车道`)
    assert.equal(entry.lane, lane, `${file} 的 registry lane=${String(entry.lane)} 与后缀 ${lane} 不一致`)
    if (lane === 'support') assert.equal(entry.tier, 'dev-only', `${file} 是支援件，不应进 CI 车道`)
    if (entry.tier === 'ci') {
      assert.ok(executed.has(file), `${file} 标记 ci，但 .github/workflows/ci.yml 没有可执行的 node 调用（注释/echo 不算）`)
    } else if (entry.tier === 'dev-only') {
      assert.ok(typeof entry.reason === 'string' && entry.reason.trim().length >= 8, `${file} 标 dev-only 但没有可读理由`)
    } else {
      assert.fail(`${file} 的 tier 非法：${String(entry.tier)}`)
    }
  }
})

test('smoke registry：ci.yml 引用的每个 smoke 都在 registry 标记 ci', () => {
  const referenced = executedSmokeFiles(ci)
  for (const file of referenced) {
    assert.equal(registry[file]?.tier, 'ci', `${file} 在 ci.yml 被引用，但 registry 没标 ci`)
  }
})
