// smoke-registry.test.mjs — 每个 smoke 的 CI 归属必须显式（2026-11-03 第 14 轮审计）。
//
// 反证：新增一个 scripts/smoke/*.mjs 不登记 registry → 本文件红；把 registry 标 ci 的件从
// ci.yml 删掉 → 红；dev-only 不写理由 → 红。这样“新 smoke 永久不跑”不再能静默发生。
// BUG-160/162/172/176：CI 归属只认「可执行 run 行」（注释/echo/if:false/continue-on-error 不算）；
// scripts/smoke 只许顶层普通文件（子目录/symlink 红）。step 解析 = scripts/lib/ci-workflow.mjs。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { executedSmokeFiles } from '../../scripts/lib/ci-workflow.mjs'
import { inspectSmokeDir, smokeSurfaceIssues } from '../../scripts/lib/smoke-assets.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SMOKE = join(ROOT, 'scripts', 'smoke')
const registry = JSON.parse(readFileSync(join(SMOKE, 'registry.json'), 'utf8'))
const ci = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8')
const { files } = inspectSmokeDir(SMOKE)
const surfaceIssues = smokeSurfaceIssues(SMOKE)

test('smoke registry：scripts/smoke 只许顶层普通文件——子目录 / symlink / 其它形态即红', () => {
  assert.deepEqual(surfaceIssues, [],
    `scripts/smoke 只能有顶层普通文件：${surfaceIssues.join('；')}——registry/车道只扫顶层，异常形态会静默不跑`)
  assert.ok(files.length >= 20, `防空语料：scripts/smoke 顶层文件过少（${files.length}）`)
})

test('smoke registry：盘上每个 smoke 都有且只有一条 CI/dev-only 归属', () => {
  assert.deepEqual(Object.keys(registry).sort(), files.filter((name) => name.endsWith('.mjs')).sort(),
    'registry 与 scripts/smoke/*.mjs 集合必须相等')
  const executed = executedSmokeFiles(ci)
  for (const [file, entry] of Object.entries(registry)) {
    const lane = file.endsWith('.e2e.mjs') ? 'e2e' : file.endsWith('.entry.mjs') ? 'entry' : file.endsWith('.support.mjs') ? 'support' : null
    assert.ok(lane !== null, `${file} 后缀不是 .e2e.mjs / .entry.mjs / .support.mjs——命名即车道`)
    assert.equal(entry.lane, lane, `${file} 的 registry lane=${String(entry.lane)} 与后缀 ${lane} 不一致`)
    if (lane === 'support') assert.equal(entry.tier, 'dev-only', `${file} 是支援件，不应进 CI 车道`)
    if (entry.tier === 'ci') {
      assert.ok(executed.has(file), `${file} 标记 ci，但 ci.yml 没有可执行步骤（注释/echo/if:false/continue-on-error 都不算）`)
    } else if (entry.tier === 'dev-only') {
      assert.ok(typeof entry.reason === 'string' && entry.reason.trim().length >= 8, `${file} 标 dev-only 但没有可读理由`)
    } else {
      assert.fail(`${file} 的 tier 非法：${String(entry.tier)}`)
    }
  }
})

test('smoke registry：ci.yml 真正执行的每个 smoke 都在 registry 标记 ci', () => {
  for (const file of executedSmokeFiles(ci)) {
    assert.equal(registry[file]?.tier, 'ci', `${file} 在 ci.yml 被执行，但 registry 没标 ci`)
  }
})
