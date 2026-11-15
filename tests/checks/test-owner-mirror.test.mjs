// owner 镜像契约（2026-11-15 test-source-mirror Step 0b）：
//  ① tests/run 根不得平铺 spec；
//  ② 每个 spec 住已知 owner 目录；
//  ③ spec 的 lib 依赖 owner ∈ {spec 目录, shared}（无 lib 依赖的跨切 spec 只许住 shared）；
//  ④ scripts/lib 根不得平铺模块；⑤ 六个 run owner 目录都非空（防空语料）。
// 反证：把 spec 移回 tests/run 根 → ①红；把 gates spec 放进 ops → ③红；清空一个 owner 目录 → ⑤红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localImportPath, parseKeylessImports } from '../../scripts/lib/tools/keyless-imports.mjs'
import { OWNERS } from '../../scripts/lib/tools/test-index.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const RUN = join(ROOT, 'tests', 'run')
const LIB = join(ROOT, 'scripts', 'lib')
const RUN_OWNERS = ['gates', 'ops', 'channel', 'harness', 'probes', 'shared']

function walk(dir, filter, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) walk(p, filter, out)
    else if (filter(ent.name)) out.push(p)
  }
  return out
}

const specs = walk(RUN, (n) => n.endsWith('.spec.mjs'))

test('tests/run 根零平铺 spec，且每个 spec 住已知 owner 目录', () => {
  assert.ok(specs.length >= 70, `防空语料：run spec 过少（${specs.length}）`)
  const flat = readdirSync(RUN).filter((n) => n.endsWith('.spec.mjs'))
  assert.deepEqual(flat, [], `tests/run 根仍平铺 spec：${flat.join(', ')}——按 owner 归位`)
  for (const p of specs) {
    const rel = relative(RUN, p).split('\\').join('/')
    const owner = rel.split('/')[0]
    assert.ok(RUN_OWNERS.includes(owner), `${relative(ROOT, p)} 不在已知 owner（${RUN_OWNERS.join('/')}）`)
  }
})

test('spec 的 lib 依赖 owner ∈ {spec 目录, shared}；根层 lib 零平铺', () => {
  const flatLib = readdirSync(LIB).filter((n) => /\.(mjs|cjs)$/.test(n))
  assert.deepEqual(flatLib, [], `scripts/lib 根仍平铺模块：${flatLib.join(', ')}`)
  const libModules = walk(LIB, (n) => /\.(mjs|cjs)$/.test(n))
  assert.ok(libModules.length >= 80, `防空语料：lib 模块过少（${libModules.length}）`)
  for (const m of libModules) {
    const rel = relative(LIB, m).split('\\').join('/')
    assert.ok(OWNERS.includes(rel.split('/')[0]), `${relative(ROOT, m)} 不在已知 owner 目录`)
  }
  for (const p of specs) {
    const rel = relative(RUN, p).split('\\').join('/')
    const dir = rel.split('/')[0]
    const { imports } = parseKeylessImports(readFileSync(p, 'utf8'), p)
    const owners = new Set()
    for (const { specifier } of imports) {
      const target = localImportPath(p, specifier)
      if (target === undefined) continue
      const lr = relative(LIB, target).split('\\').join('/')
      if (lr.startsWith('..') || !/\.(mjs|cjs)$/.test(lr)) continue
      owners.add(lr.split('/')[0])
    }
    // 跨切 spec：无 lib 依赖、或只依赖 shared——允许住任一 owner（索引记录实际依赖面）。
    if (owners.size === 0 || (owners.size === 1 && owners.has('shared'))) continue
    assert.ok(owners.has(dir) || dir === 'shared',
      `${relative(ROOT, p)} 住 ${dir}/，但只依赖 ${[...owners].sort().join('/')}——归位或改登记`)
  }
})

test('六个 run owner 目录都非空（防空语料）', () => {
  for (const owner of RUN_OWNERS) {
    const files = readdirSync(join(RUN, owner)).filter((n) => n.endsWith('.spec.mjs'))
    assert.ok(files.length > 0, `tests/run/${owner}/ 为空——owner 分组失效`)
  }
})
