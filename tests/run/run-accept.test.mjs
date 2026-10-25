// run-accept 交付门接线 — 静态契约：path-hygiene 必须在预检里，且旧 bundle 走显式豁免。
// 运行期行为由 scripts/run-gates/path-hygiene.mjs 的 fixture 测试与 run-accept 预检共同承担；
// 本文件只防“改了验收流程忘了接入”的静默回退。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const src = readFileSync(join(ROOT, 'scripts', 'run-ops', 'run-accept.mjs'), 'utf8')

test('run-accept：path-hygiene 在预检中，且预检红包含它', () => {
  assert.match(src, /path-hygiene\.mjs/, 'run-accept 未调用 path-hygiene')
  assert.match(src, /preHygiene\s*=\s*run\(/, 'path-hygiene 未纳入 run-accept 预检')
  assert.match(src, /preGreen\s*=\s*[^\n]*preHygiene\.status === 0/, 'path-hygiene 未进入 preGreen——会红而不拦')
})

test('run-accept：旧契约 bundle 才允许 --allow-legacy（D28 epoch 豁免）', () => {
  assert.match(src, /legacy\s*=\s*!shouldWriteReceipts\(bundle\)/, '旧契约判定未前置')
  assert.match(src, /preHygiene[\s\S]{0,120}legacy\s*\?\s*\['--allow-legacy'\]/, '旧 bundle 未走显式 --allow-legacy')
})
