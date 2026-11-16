// 测试索引对账（2026-11-15 test-source-mirror Step 0b）：tests/INDEX.generated.md 是生成物，
// 盘上模块/测试一变就必须重生成；本测试重算并逐字节比对（漂移 = 红）。
// 反证：删掉索引里任一行 → 红；把某模块的测试名改掉 → 红；把 importer 扩展名过滤收回 `.ts`
// （BUG-194）→ 下方 `.tsx` 独立抽查红。
// 负例留证 2026-11-16：BUG-194——把 importersUnder 的扩展名集收回 `.ts`（去掉 `.tsx`）→
// 独立抽查点名 method-library/views 等模块显示「—」；还原 → 绿。
// 负例留证 2026-11-16：BUG-208——在 importersUnder 临时跳过 method-library-selection 的 spec
// 并重生成索引 → 索引行少一个 importer，集合对账红（只验非空的旧版会绿）；还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { libModulesOf, packClientModulesOf, packLibModulesOf, renderTestIndex } from '../../scripts/lib/tools/test-index.mjs'
import { localImportPath, parseKeylessImports } from '../../scripts/lib/tools/keyless-imports.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const INDEX = join(ROOT, 'tests/INDEX.generated.md')
const CLIENT = join(ROOT, 'packages', 'deep-research-pack', 'src', 'client')

/** 独立地扫「测试直接 import 了哪些 .tsx client 模块」——不复用生成器的 importer 过滤器，
 *  否则过滤条件再次收窄时生成物与对账会一起自洽（BUG-194 的原始盲区）。 */
function tsxClientImporters() {
  const out = new Map()
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (['fixtures', '_tmp', 'node_modules'].includes(ent.name)) continue
      const p = join(dir, ent.name)
      if (ent.isDirectory()) { walk(p); continue }
      if (!/\.(spec|test)\.mjs$/.test(ent.name)) continue
      const { imports } = parseKeylessImports(readFileSync(p, 'utf8'), p)
      for (const { specifier } of imports) {
        const target = localImportPath(p, specifier)
        if (target === undefined) continue
        const rel = relative(CLIENT, target).split('\\').join('/')
        if (rel.startsWith('..') || !rel.endsWith('.tsx')) continue
        const key = rel.replace(/\.tsx$/, '')
        if (!out.has(key)) out.set(key, new Set())
        out.get(key).add(relative(ROOT, p).split('\\').join('/'))
      }
    }
  }
  walk(join(ROOT, 'tests'))
  return out
}

test('索引与盘上一致（模块数防空 + 逐字节相等）', () => {
  const modules = libModulesOf(ROOT)
  assert.ok(modules.length >= 80, `防空语料：scripts/lib 模块过少（${modules.length}）`)
  const packModules = packLibModulesOf(ROOT)
  assert.ok(packModules.length >= 30, `防空语料：pack src/lib 模块过少（${packModules.length}）`)
  const clientModules = packClientModulesOf(ROOT)
  assert.ok(clientModules.length >= 30, `防空语料：pack src/client 模块过少（${clientModules.length}）`)
  assert.ok(modules.every((m) => m.owner !== 'scripts'), 'lib 根层仍平铺模块——owner 分组未完成')
  const rendered = renderTestIndex(ROOT)
  const current = readFileSync(INDEX, 'utf8')
  assert.equal(current, rendered, 'tests/INDEX.generated.md 漂移——重跑 node dev/render-test-index.mjs')
  assert.ok(current.split('\n').filter((l) => l.startsWith('| ')).length >= 80, '索引行过少（防空语料）')
})

test('`.tsx` client 模块被测试直接 import 时，索引测试列 = 独立扫描集合（BUG-194 / BUG-208）', () => {
  const importers = tsxClientImporters()
  assert.ok(importers.size >= 6, `防空语料：被测试直接 import 的 .tsx client 模块过少（${importers.size}）`)
  const lines = renderTestIndex(ROOT).split('\n')
  const start = lines.indexOf('## pack src/client（观察面）')
  assert.notEqual(start, -1, '索引缺 pack src/client 分节——生成器结构变了，本抽查的前提失效')
  const section = lines.slice(start)
  for (const [module, tests] of importers) {
    const row = section.find((line) => line.startsWith('| ') && line.includes(`\`${module}\` |`))
    assert.ok(row, `索引缺 .tsx client 模块 ${module} 的行（importer：${[...tests].sort().join(', ')}）`)
    const cells = row.split('|').map((cell) => cell.trim())
    const indexed = cells[3] === '—' ? [] : [...cells[3].matchAll(/`([^`]+)`/g)].map((match) => match[1])
    assert.deepEqual(indexed.sort(), [...tests].sort(),
      `索引 ${module} 的测试列与独立扫描不一致：索引=${JSON.stringify(indexed.sort())} 独立=${JSON.stringify([...tests].sort())}——非空不够，集合必须相等（BUG-208）`)
  }
})
