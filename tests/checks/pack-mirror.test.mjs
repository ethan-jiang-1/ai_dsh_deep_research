// pack 镜像契约（2026-11-15 pack-src-test-mirror Step 1）：
//  ① tests/cockpit/lib 根零平铺 spec，每个 spec 住已知 domain；
//  ② spec 的 pack src/lib 依赖 domain ∈ {spec 目录, shared}；无依赖或只依赖 shared 的跨切 spec 只许住 shared；
//  ③ pack src/lib 根零平铺 .ts，faces.json 留根；domain 闭集 = 7；
//  ④ 六个 domain 有直接 spec（review/ 例外：subject 由 tests/run 覆盖，登记理由）。
// 反证：把 spec 移到错误 domain → ②红；放回根 → ①红；在 src/lib 根放 .ts → ③红；清空一个 domain → ④红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localImportPath, parseKeylessImports } from '../../scripts/lib/tools/keyless-imports.mjs'
import { DOMAINS } from '../../scripts/lib/tools/test-index.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LIB = join(ROOT, 'packages', 'deep-research-pack', 'src', 'lib')
const TESTS = join(ROOT, 'tests', 'cockpit', 'lib')
const RUN_DOMAINS = DOMAINS.filter((d) => d !== 'review')

function walk(dir, filter, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) walk(p, filter, out)
    else if (filter(ent.name)) out.push(p)
  }
  return out
}

const specs = walk(TESTS, (n) => n.endsWith('.spec.mjs'))

test('tests/cockpit/lib 根零平铺 spec，且每个 spec 住已知 domain', () => {
  assert.ok(specs.length >= 18, `防空语料：cockpit lib spec 过少（${specs.length}）`)
  const flat = readdirSync(TESTS).filter((n) => n.endsWith('.spec.mjs'))
  assert.deepEqual(flat, [], `tests/cockpit/lib 根仍平铺 spec：${flat.join(', ')}——按 domain 归位`)
  for (const p of specs) {
    const rel = relative(TESTS, p).split('\\').join('/')
    assert.ok(DOMAINS.includes(rel.split('/')[0]), `${relative(ROOT, p)} 不在已知 domain（${DOMAINS.join('/')}）`)
  }
})

test('spec 的 pack lib 依赖 domain ∈ {spec 目录, shared}', () => {
  for (const p of specs) {
    const dir = relative(TESTS, p).split('\\').join('/').split('/')[0]
    const { imports } = parseKeylessImports(readFileSync(p, 'utf8'), p)
    const domains = new Set()
    for (const { specifier } of imports) {
      const target = localImportPath(p, specifier)
      if (target === undefined) continue
      const rel = relative(LIB, target).split('\\').join('/')
      if (rel.startsWith('..') || !rel.endsWith('.ts')) continue
      domains.add(rel.split('/')[0])
    }
    if (domains.size === 0 || (domains.size === 1 && domains.has('shared'))) continue
    assert.ok(domains.has(dir) || dir === 'shared',
      `${relative(ROOT, p)} 住 ${dir}/，但只依赖 ${[...domains].sort().join('/')}——归位或改登记`)
  }
})

test('src/lib 根零平铺 .ts，faces.json 留根，domain 闭集 = 7', () => {
  const rootTs = readdirSync(LIB).filter((n) => n.endsWith('.ts'))
  assert.deepEqual(rootTs, [], `src/lib 根仍平铺模块：${rootTs.join(', ')}`)
  assert.ok(existsSync(join(LIB, 'faces.json')), 'faces.json 必须留 src/lib 根（三面清单是横切属性）')
  const dirs = readdirSync(LIB, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
  assert.deepEqual(dirs, [...DOMAINS].sort(), `src/lib domain 目录 = ${DOMAINS.join('/')}`)
  const modules = walk(LIB, (n) => n.endsWith('.ts'))
  assert.ok(modules.length >= 30, `防空语料：src/lib 模块过少（${modules.length}）`)
})


test('tests/cockpit/client：根 spec 只依赖 src/client 根文件；<sub> spec 只依赖该 sub（跨 sub → shared）', () => {
  const CLIENT = join(ROOT, 'packages', 'deep-research-pack', 'src', 'client')
  const BASE = join(ROOT, 'tests', 'cockpit', 'client')
  const clientSpecs = walk(BASE, (n) => n.endsWith('.spec.mjs'))
  assert.ok(clientSpecs.length >= 8, `防空语料：cockpit client spec 过少（${clientSpecs.length}）`)
  for (const p of clientSpecs) {
    const rel = relative(BASE, p).split('\\').join('/')
    const dir = rel.includes('/') ? rel.split('/')[0] : '(root)'
    const { imports } = parseKeylessImports(readFileSync(p, 'utf8'), p)
    const subs = new Set()
    for (const { specifier } of imports) {
      const target = localImportPath(p, specifier)
      if (target === undefined) continue
      const lr = relative(CLIENT, target).split('\\').join('/')
      if (lr.startsWith('..') || !/\.(ts|tsx)$/.test(lr)) continue
      const seg = lr.split('/')
      if (seg.length > 1) subs.add(seg[0])
    }
    if (dir === '(root)') {
      assert.equal(subs.size, 0, `${relative(ROOT, p)} 是 client 根 spec，却依赖子目录 ${[...subs].join('/')}——归位或住 shared/`)
    } else {
      assert.ok(subs.size <= 1 && (subs.size === 0 || subs.has(dir)),
        `${relative(ROOT, p)} 住 client/${dir}/，却依赖 ${[...subs].join('/') || '（无子目录）'}——跨 sub 的 spec 住 tests/cockpit/shared/`)
    }
  }
})

test('六个 domain 有直接 spec（review/ 例外：subject 由 tests/run 覆盖）', () => {
  for (const domain of RUN_DOMAINS) {
    const files = readdirSync(join(TESTS, domain)).filter((n) => n.endsWith('.spec.mjs'))
    assert.ok(files.length > 0, `tests/cockpit/lib/${domain}/ 为空——domain 分组失效`)
  }
  // review/ 不建测试目录：唯一模块 review-readiness 的 subject 由 tests/run 覆盖（跨根例外）。
})
