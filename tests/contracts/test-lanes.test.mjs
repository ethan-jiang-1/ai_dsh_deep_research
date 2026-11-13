// 测试车道与可见性契约（W0-8）——三条「静默不跑」的防线：
//   ① 每个 `*.test.mjs` 必住在 `run/ cockpit/ pack/ contracts/` 四个域之一；根目录或未
//      知目录 = 红（否则新测试文件可能因为目录/后缀漂移而不被 `pnpm test` 选中）。
//   ② `tests/` 下不得出现 `*.spec.mjs` / `*.e2e.mjs`（默认 glob 只认 `*.test.mjs`；错后缀
//      文件会被静默忽略）。非测试 `.mjs` 必须是 fixtures、vendor 契约，或被某个测试直接 import
//      的支援件；孤儿支援件 = 红。
//   ③ 默认回归零 skip：`test.skip` / `it.skip` / `describe.skip` / `{ skip: ... }` 一律红；
//      必须 skip 时先登记理由（当前没有，登记表为空）。
//
// 为什么需要：`smoke-registry` 管 smoke，`probe-registry` 管探针，但测试文件本身没有「空间
// 穷尽」检查；`node:test` 的 skip 也不会让 `pnpm test` 非零。DSH 的 skipped=failure 在这里
// 缩编成「keyless 回归零 skip + 错后缀/孤儿支援件红」。
//
// 反证：新建 `tests/root-lane.test.mjs` → ①红；新建 `tests/cockpit/x.spec.mjs` → ②红；
// 在任一测试里加 `test.skip(...)` → ③红；各自删除/还原 → 绿。
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

const TEST_FILES = walk(TESTS, (name) => name.endsWith('.test.mjs'))
const ALL_MJS = walk(TESTS, (name) => name.endsWith('.mjs'))

test('① 车道：每个 *.test.mjs 住在 run/cockpit/pack/contracts 之一，且四域都非空', () => {
  assert.ok(TEST_FILES.length >= 100, `防空语料：测试文件过少（${TEST_FILES.length}）`)
  const byDomain = new Set()
  for (const file of TEST_FILES) {
    const rel = relative(TESTS, file).split('\\').join('/')
    const domain = rel.split('/')[0]
    assert.ok(DOMAINS.has(domain), `${rel} 不在已知测试域（${[...DOMAINS].join('/')}）——默认 glob 会选中，但域映射/索引会漏`)
    byDomain.add(domain)
  }
  for (const domain of DOMAINS) assert.ok(byDomain.has(domain), `测试域 ${domain}/ 为空——域映射失效`)
})

test('② 后缀：tests/ 下没有 *.spec.mjs / *.e2e.mjs；非测试 .mjs 是 fixture/vendor/被测试 import 的支援件', () => {
  const wrongSuffix = ALL_MJS.filter((file) => /\.(spec|e2e)\.mjs$/.test(file)).map((file) => relative(ROOT, file))
  assert.deepEqual(wrongSuffix, [], '错后缀文件不会被 pnpm test 选中——改成 *.test.mjs，或移出 tests/')

  const imported = new Set()
  for (const file of TEST_FILES) {
    const { imports } = parseKeylessImports(readFileSync(file, 'utf8'), file)
    for (const { specifier } of imports) {
      const resolved = localImportPath(file, specifier)
      if (resolved !== undefined) imported.add(resolved)
    }
  }
  const orphans = ALL_MJS
    .filter((file) => !file.endsWith('.test.mjs') && !file.endsWith('.vendor.mjs'))
    .filter((file) => !relative(TESTS, file).split('\\').join('/').startsWith('fixtures/'))
    .filter((file) => !imported.has(file))
    .map((file) => relative(ROOT, file))
  assert.deepEqual(orphans, [], '孤儿支援件：没有被任何测试 import，也不会被默认 glob 选中——删掉或接上 consumer')
})

test('③ 可见性：默认回归零 skip（skip 是空缺，不是通过）', () => {
  const markers = [/\.skip\s*\(/, /skipIf\s*\(/, /\{\s*skip\s*:/]
  const hits = []
  for (const file of TEST_FILES) {
    if (file === SELF) continue // 本文件的正则字面量不是 skip
    const src = readFileSync(file, 'utf8')
    for (const pattern of markers) {
      if (pattern.test(src)) hits.push(`${relative(ROOT, file)} → ${pattern}`)
    }
  }
  assert.deepEqual(hits, [], '默认回归不允许 skip；确需跳过时先在 CLIENT/网关登记理由并让 skip 在汇总里可见')
})
