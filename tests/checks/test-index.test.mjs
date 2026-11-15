// 测试索引对账（2026-11-15 test-source-mirror Step 0b）：tests/INDEX.generated.md 是生成物，
// 盘上模块/测试一变就必须重生成；本测试重算并逐字节比对（漂移 = 红）。
// 反证：删掉索引里任一行 → 红；把某模块的测试名改掉 → 红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { libModulesOf, packLibModulesOf, renderTestIndex } from '../../scripts/lib/tools/test-index.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const INDEX = join(ROOT, 'tests/INDEX.generated.md')

test('索引与盘上一致（模块数防空 + 逐字节相等）', () => {
  const modules = libModulesOf(ROOT)
  assert.ok(modules.length >= 80, `防空语料：scripts/lib 模块过少（${modules.length}）`)
  const packModules = packLibModulesOf(ROOT)
  assert.ok(packModules.length >= 30, `防空语料：pack src/lib 模块过少（${packModules.length}）`)
  assert.ok(modules.every((m) => m.owner !== 'scripts'), 'lib 根层仍平铺模块——owner 分组未完成')
  const rendered = renderTestIndex(ROOT)
  const current = readFileSync(INDEX, 'utf8')
  assert.equal(current, rendered, 'tests/INDEX.generated.md 漂移——重跑 node dev/render-test-index.mjs')
  assert.ok(current.split('\n').filter((l) => l.startsWith('| ')).length >= 80, '索引行过少（防空语料）')
})
