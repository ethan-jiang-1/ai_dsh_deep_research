// 测试车道与可见性契约（W0-8 / 命名对齐）——四条「静默不跑」的防线：
//   ① `*.spec.mjs` = 进程内 keyless regression，只住 `run/ cockpit/ pack/ contracts/`；
//      `tests/vendor/*.vendor.spec.mjs` 是 vendor 源契约（独立 test:vendor 车道）。
//   ② `tests/checks/*.test.mjs` = 门禁自身；必须平铺在 checks/，不得嵌子目录。
//   ③ 旧后缀 `*.test.mjs`（checks 外）与 `*.e2e.mjs`/`*.entry.mjs`（tests 内）一律红：
//      它们要么不会被 `pnpm test:spec`/`test:checks` 选中，要么属于 `scripts/smoke` 车道。
//   ④ 默认回归零 skip：`test.skip` / `it.skip` / `describe.skip` / `{ skip: ... }` 一律红；
//      必须 skip 时先登记理由（当前没有，登记表为空）。
//
// 反证：新建 `tests/root-lane.spec.mjs` → ①红；`tests/checks/nested/x.test.mjs` → ②红；
// `tests/foo.test.mjs` 或 `tests/foo.e2e.mjs` → ③红；任一测试加 `test.skip` → ④红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localImportPath, parseKeylessImports } from '../../scripts/lib/keyless-imports.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const TESTS = join(ROOT, 'tests')
const SELF = fileURLToPath(import.meta.url)
const DOMAINS = new Set(['run', 'cockpit', 'pack', 'contracts'])

function walk(dir, filter) {
  const out = []
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '_tmp') continue
      out.push(...walk(p, filter))
    } else if (filter(ent.name)) out.push(p)
  }
  return out
}

const ALL_MJS = walk(TESTS, (name) => name.endsWith('.mjs'))
const SPEC_TESTS = ALL_MJS.filter((f) => f.endsWith('.spec.mjs') && !f.endsWith('.vendor.spec.mjs'))
const VENDOR_TESTS = ALL_MJS.filter((f) => f.endsWith('.vendor.spec.mjs'))
const CHECK_TESTS = ALL_MJS.filter((f) => f.endsWith('.test.mjs') && relative(TESTS, f).startsWith('checks/'))
const LEGACY_TESTS = ALL_MJS.filter((f) => f.endsWith('.test.mjs') && !relative(TESTS, f).startsWith('checks/'))
const WRONG_SUFFIX = ALL_MJS.filter((f) => /\.(e2e|entry)\.mjs$/.test(f))
const TEST_FILES = [...SPEC_TESTS, ...VENDOR_TESTS, ...CHECK_TESTS]

test('① spec/vendor 车道：*.spec.mjs 住 run/cockpit/pack/contracts，vendor 契约住 vendor/', () => {
  assert.ok(SPEC_TESTS.length >= 100, `防空语料：spec 测试过少（${SPEC_TESTS.length}）`)
  assert.ok(VENDOR_TESTS.length >= 3, `防空语料：vendor 契约过少（${VENDOR_TESTS.length}）`)
  const byDomain = new Set()
  for (const file of SPEC_TESTS) {
    const rel = relative(TESTS, file).split('\\').join('/')
    const domain = rel.split('/')[0]
    assert.ok(DOMAINS.has(domain), `${rel} 不在已知 spec 域（${[...DOMAINS].join('/')}）——pnpm test:spec 会选中，但域映射会漏`)
    byDomain.add(domain)
  }
  for (const domain of DOMAINS) assert.ok(byDomain.has(domain), `spec 域 ${domain}/ 为空——域映射失效`)
  for (const file of VENDOR_TESTS) {
    const rel = relative(TESTS, file).split('\\').join('/')
    assert.ok(rel.startsWith('vendor/') && !rel.slice('vendor/'.length).includes('/'),
      `${rel} 必须是 tests/vendor/ 下的扁平 *.vendor.spec.mjs——test:vendor 只收这一层`)
  }
})

test('② checks 车道：tests/checks/*.test.mjs 平铺，且数量非空', () => {
  assert.ok(CHECK_TESTS.length >= 15, `防空语料：checks 测试过少（${CHECK_TESTS.length}）`)
  for (const file of CHECK_TESTS) {
    const rel = relative(TESTS, file).split('\\').join('/')
    assert.ok(rel.startsWith('checks/') && !rel.slice('checks/'.length).includes('/'),
      `${rel} 必须平铺在 tests/checks/——pnpm test:checks 只收这一层`)
  }
})

test('③ 后缀：没有 checks 外的 *.test.mjs，没有 tests 内的 *.e2e.mjs/*.entry.mjs', () => {
  assert.deepEqual(LEGACY_TESTS.map((f) => relative(ROOT, f)), [],
    '旧后缀 *.test.mjs 不在 checks/ 下——它不会被 test:spec/test:checks 选中；进程内改 *.spec.mjs，真实进程改 scripts/smoke/*.e2e.mjs|*.entry.mjs')
  assert.deepEqual(WRONG_SUFFIX.map((f) => relative(ROOT, f)), [],
    'tests/ 内不得出现 *.e2e.mjs/*.entry.mjs——真实进程/入口资产住 scripts/smoke')

  const imported = new Set()
  for (const file of TEST_FILES) {
    const { imports } = parseKeylessImports(readFileSync(file, 'utf8'), file)
    for (const { specifier } of imports) {
      const resolved = localImportPath(file, specifier)
      if (resolved !== undefined) imported.add(resolved)
    }
  }
  const orphans = ALL_MJS
    .filter((file) => !TEST_FILES.includes(file))
    .filter((file) => !relative(TESTS, file).split('\\').join('/').startsWith('fixtures/'))
    .filter((file) => !imported.has(file))
    .map((file) => relative(ROOT, file))
  assert.deepEqual(orphans, [], '孤儿支援件：没有被任何测试 import，也不会被默认 glob 选中——删掉或接上 consumer')
})

test('④ 可见性：默认回归零 skip（skip 是空缺，不是通过）', () => {
  const markers = [/\.skip\s*\(/, /skipIf\s*\(/, /\{\s*skip\s*:/]
  const hits = []
  for (const file of TEST_FILES) {
    if (file === SELF) continue
    const src = readFileSync(file, 'utf8')
    for (const pattern of markers) {
      if (pattern.test(src)) hits.push(`${relative(ROOT, file)} → ${pattern}`)
    }
  }
  assert.deepEqual(hits, [], '默认回归不允许 skip；确需跳过时先在 CLIENT/网关登记理由并让 skip 在汇总里可见')
})
