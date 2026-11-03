// smoke-registry.test.mjs — 每个 smoke 的 CI 归属必须显式（2026-11-03 第 14 轮审计）。
//
// 反证：新增一个 scripts/smoke/*.mjs 不登记 registry → 本文件红；把 registry 标 ci 的件从
// ci.yml 删掉 → 红；dev-only 不写理由 → 红。这样“新 smoke 永久不跑”不再能静默发生。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SMOKE = join(ROOT, 'scripts', 'smoke')
const registry = JSON.parse(readFileSync(join(SMOKE, 'registry.json'), 'utf8'))
const ci = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8')
const files = readdirSync(SMOKE).filter((f) => f.endsWith('.mjs')).sort()

test('smoke registry：盘上每个 smoke 都有且只有一条 CI/dev-only 归属', () => {
  assert.deepEqual(Object.keys(registry).sort(), files, 'registry 与 scripts/smoke/*.mjs 集合必须相等')
  for (const [file, entry] of Object.entries(registry)) {
    if (entry.tier === 'ci') {
      assert.ok(ci.includes(file), `${file} 标记 ci，但 .github/workflows/ci.yml 未引用它`)
    } else if (entry.tier === 'dev-only') {
      assert.ok(typeof entry.reason === 'string' && entry.reason.trim().length >= 8, `${file} 标 dev-only 但没有可读理由`)
    } else {
      assert.fail(`${file} 的 tier 非法：${String(entry.tier)}`)
    }
  }
})

test('smoke registry：ci.yml 引用的每个 smoke 都在 registry 标记 ci', () => {
  const referenced = [...ci.matchAll(/scripts\/smoke\/([a-z0-9-]+\.mjs)/g)].map((m) => m[1])
  for (const file of new Set(referenced)) {
    assert.equal(registry[file]?.tier, 'ci', `${file} 在 ci.yml 被引用，但 registry 没标 ci`)
  }
})
