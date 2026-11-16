// pack 镜像契约（2026-11-15 pack-src-test-mirror Step 1）：
//  ① tests/cockpit/lib 根零平铺 spec，每个 spec 住已知 domain；
//  ② spec 的 pack src/lib 依赖 domain ∈ {spec 目录, shared}；无依赖或只依赖 shared 的跨切 spec 只许住 shared；
//  ③ pack src/lib 根零平铺 .ts，faces.json 留根；domain 闭集 = 7；
//  ④ 六个 domain 有直接 spec（review/ 例外：subject 由 tests/run 覆盖，登记理由）。
//  ⑤ tests/cockpit/shared 只收跨 sub 的 client spec（≥2 个 client 子目录）；落点全集 − 已知
//     子集 = 空（BUG-191，与 verify 门禁 test-placement 共用规则）。
// 反证：把 spec 移到错误 domain → ②红；放回根 → ①红；在 src/lib 根放 .ts → ③红；清空一个 domain → ④红；
// 未知子树/单 sub 藏进 shared → ⑤红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localImportPath, parseKeylessImports } from '../../scripts/lib/tools/keyless-imports.mjs'
import { DOMAINS } from '../../scripts/lib/tools/test-index.mjs'
import { placementIssues } from '../../scripts/lib/repo/test-placement.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LIB = join(ROOT, 'packages', 'deep-research-pack', 'src', 'lib')
const SCRIPTS_LIB = join(ROOT, 'scripts', 'lib')
const TESTS = join(ROOT, 'tests', 'cockpit', 'lib')
const RUN_DOMAINS = DOMAINS.filter((d) => d !== 'review')
// 测试支撑 owner 不是运行时 domain 轴：method-presets 这类跨库测试以 test-infra 为家。
const TEST_SUPPORT_OWNERS = new Set(['test-infra'])

function walk(dir, filter, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) walk(p, filter, out)
    else if (filter(ent.name)) out.push(p)
  }
  return out
}

/** symlink 在 Dirent 二分里 isDirectory()/isFile() 都是 false；单独用 isSymbolicLink 枚举（BUG-176/207）。 */
function linkedEntries(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isSymbolicLink()) out.push(p)
    else if (ent.isDirectory()) linkedEntries(p, out)
  }
  return out
}

const specs = walk(TESTS, (n) => n.endsWith('.spec.mjs'))

// 负例留证 2026-11-16：BUG-191 / BUG-200 / BUG-205 / BUG-207——在 tests/cockpit/misc/ 或
// tests/pack/misc/ 放 spec → 「落点全集」红；在 tests/run/ops/deep/ 放深 spec → 同一测试红
// （深度由 placementIssues 判）；把单 owner spec 放进 tests/cockpit/lib/shared/ → 「shared 只收
// 跨切」红；在 tests/ 造 symlink 目录 → 「零符号链接」红。删除探针 → 绿。
test('tests 落点全集 − 已知子集 = 空；深度恰好（BUG-191 / BUG-200；账本重生成不能吸收）', () => {
  const all = walk(join(ROOT, 'tests'), (n) => n.endsWith('.spec.mjs') || n.endsWith('.test.mjs'))
  const paths = all.map((p) => relative(ROOT, p).split('\\').join('/'))
  assert.ok(paths.length >= 100, `防空语料：tests 测试文件过少（${paths.length}）——落点扫描面失效`)
  assert.deepEqual(placementIssues(paths), [], '存在未被位置规则命名的落点/深度——按 tests/AGENTS 归位（账本重生成不是修法）')
})

test('tests 下零符号链接目录/文件（BUG-207；node --test 不跟随 = 永不运行）', () => {
  const links = linkedEntries(join(ROOT, 'tests')).map((p) => relative(ROOT, p).split('\\').join('/'))
  assert.deepEqual(links, [], `tests 下不得有符号链接：${links.join(', ')}——symlink 目录不会被 node --test 选中，位置门禁也不能静默跳过（BUG-176/207）`)
})

test('tests/cockpit/shared：只收跨 sub 的 client spec（≥2 个 client 子目录；BUG-191）', () => {
  const SHARED = join(ROOT, 'tests', 'cockpit', 'shared')
  const CLIENT = join(ROOT, 'packages', 'deep-research-pack', 'src', 'client')
  const sharedSpecs = walk(SHARED, (n) => n.endsWith('.spec.mjs'))
  assert.ok(sharedSpecs.length >= 2, `防空语料：tests/cockpit/shared spec 过少（${sharedSpecs.length}）`)
  for (const p of sharedSpecs) {
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
    assert.ok(subs.size >= 2,
      `${relative(ROOT, p)} 住 client/shared/，但只依赖 ${[...subs].join('/') || '（无子目录）'}——shared 只收跨 sub 的 client spec；单 sub 归 client/<sub>/，无客户端依赖归 lib/ 或 checks/`)
  }
})

test('tests/cockpit/lib 根零平铺 spec，且每个 spec 住已知 domain', () => {
  assert.ok(specs.length >= 18, `防空语料：cockpit lib spec 过少（${specs.length}）`)
  const flat = readdirSync(TESTS).filter((n) => n.endsWith('.spec.mjs'))
  assert.deepEqual(flat, [], `tests/cockpit/lib 根仍平铺 spec：${flat.join(', ')}——按 domain 归位`)
  for (const p of specs) {
    const rel = relative(TESTS, p).split('\\').join('/')
    assert.ok(DOMAINS.includes(rel.split('/')[0]), `${relative(ROOT, p)} 不在已知 domain（${DOMAINS.join('/')}）`)
  }
})

test('spec 的 pack lib 依赖 domain ∈ {spec 目录, shared}；shared 只收跨切（BUG-205）', () => {
  for (const p of specs) {
    const dir = relative(TESTS, p).split('\\').join('/').split('/')[0]
    const { imports } = parseKeylessImports(readFileSync(p, 'utf8'), p)
    const domains = new Set()
    const scriptOwners = new Set()
    for (const { specifier } of imports) {
      const target = localImportPath(p, specifier)
      if (target === undefined) continue
      const rel = relative(LIB, target).split('\\').join('/')
      if (!rel.startsWith('..') && rel.endsWith('.ts')) domains.add(rel.split('/')[0])
      const scriptRel = relative(SCRIPTS_LIB, target).split('\\').join('/')
      if (!scriptRel.startsWith('..') && /\.(mjs|cjs)$/.test(scriptRel)) scriptOwners.add(scriptRel.split('/')[0])
    }
    if (dir === 'shared') {
      const runtimeScriptOwners = [...scriptOwners].filter((owner) => !TEST_SUPPORT_OWNERS.has(owner))
      assert.ok((domains.size === 0 || (domains.size === 1 && domains.has('shared'))) && runtimeScriptOwners.length === 0,
        `${relative(ROOT, p)} 住 cockpit/lib/shared/，但依赖 pack domain=${[...domains].sort().join('/') || '（无）'} scripts owner=${runtimeScriptOwners.sort().join('/') || '（无）'}——shared 只收无依赖/仅 shared 或 test-support 的跨切 spec；单 owner spec 归位到对应 domain/owner`)
      continue
    }
    if (domains.size === 0 || (domains.size === 1 && domains.has('shared'))) continue
    assert.ok(domains.has(dir),
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


test('tests/pack：根层零平铺；surface 目录的 spec 必须 import 同名 surface；contract/ 收无主语合同', () => {
  const PACK = join(ROOT, 'packages', 'deep-research-pack')
  const BASE = join(ROOT, 'tests', 'pack')
  const SRC = join(PACK, 'src')
  const flat = readdirSync(BASE).filter((n) => n.endsWith('.spec.mjs'))
  assert.deepEqual(flat, [], `tests/pack 根仍平铺 spec：${flat.join(', ')}`)
  const surfaces = ['content', 'startup', 'defaults', 'fetch-fallback']
  for (const surface of surfaces) {
    const files = readdirSync(join(BASE, surface)).filter((n) => n.endsWith('.spec.mjs'))
    assert.ok(files.length > 0, `tests/pack/${surface}/ 为空`)
    for (const f of files) {
      const p = join(BASE, surface, f)
      const { imports } = parseKeylessImports(readFileSync(p, 'utf8'), p)
      const areas = new Set()
      for (const { specifier } of imports) {
        const target = localImportPath(p, specifier)
        if (target === undefined) continue
        const rel = relative(SRC, target).split('\\').join('/')
        if (rel.startsWith('..') || !/\.(ts|tsx)$/.test(rel)) continue
        areas.add(rel.split('/')[0])
      }
      assert.ok(areas.has(surface), `${relative(ROOT, p)} 住 ${surface}/，但没 import src/${surface}`)
    }
  }
  assert.ok(readdirSync(join(BASE, 'contract')).filter((n) => n.endsWith('.spec.mjs')).length >= 10, 'contract/ 防空语料')
})

test('六个 domain 有直接 spec（review/ 例外：subject 由 tests/run 覆盖）', () => {
  for (const domain of RUN_DOMAINS) {
    const files = readdirSync(join(TESTS, domain)).filter((n) => n.endsWith('.spec.mjs'))
    assert.ok(files.length > 0, `tests/cockpit/lib/${domain}/ 为空——domain 分组失效`)
  }
  // review/ 不建测试目录：唯一模块 review-readiness 的 subject 由 tests/run 覆盖（跨根例外）。
})
