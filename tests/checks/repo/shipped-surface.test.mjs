// shipped-surface.test.mjs — 发布面自足判据的 keyless 半边（BUG-219…239 类级）。
//
// 边界：真 tarball 的集合与构建产物文本由 checks/smoke/pack.e2e.mjs 证（真进程档）；
// 本文件扫**随包源码文本**（由 files 允许集派生 + src 注释）+ manifest 不动量 + 类型闭包夹具。
//
// 负例留证 2026-11-17：BUG-219 / BUG-220 / BUG-221 / BUG-222 / BUG-223 / BUG-224 / BUG-225 / BUG-226 /
// BUG-227 / BUG-228 / BUG-229 / BUG-230 / BUG-231 / BUG-232 / BUG-236 / BUG-238 / BUG-239 / BUG-244 / BUG-245
// ——本文件的判据都在当前树先红后绿：把 `./checks/…` / `checks/` 写回随包文本、把 `files` 改回 `lib/**`、
// 删一个闭包类型文件、或把 `content/waves/lens-fanout.js` 写进 dev 引用，各见红；还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  devRefsOf, filesAllowlistIssues, isShippedFile, matchesFilesPattern, readmeUserSectionIssues,
  shippedSourceFilesOf, shippedTextIssues, topLevelIssues, typeClosureOf, typeEntryPathsOf, typeSetIssues,
} from '../../../checks/lib/repo/shipped-surface.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const CLOSURE = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'shipped', 'type-closure.json'), 'utf8'))

function walkAll(dir, base = PACK) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkAll(abs, base))
    else out.push(relative(base, abs).split('\\').join('/'))
  }
  return out
}

/** 随包源码文本 = files 允许集派生（排除 lib/，构建产物归 pack.e2e）+ src 注释（源码即发布文本）。 */
function shippedSources() {
  const all = walkAll(PACK)
  const derived = shippedSourceFilesOf(pkg, all).map((rel) => ({ path: rel, text: readFileSync(join(PACK, rel), 'utf8') }))
  const src = all.filter((rel) => rel.startsWith('src/') && /\.(?:ts|tsx)$/.test(rel))
    .map((rel) => ({ path: rel, text: readFileSync(join(PACK, rel), 'utf8') }))
  return [...derived, ...src]
}

test('随包文本零开发面引用（README / skills / content / scripts / workers / locale / 注释；BUG-220 / BUG-221 / BUG-222 / BUG-223 / BUG-224 / BUG-225 / BUG-226 / BUG-227 / BUG-228）', () => {
  const files = shippedSources()
  assert.ok(files.length >= 60, `防空语料：随包源码文件过少（${files.length}）——扫描面被收窄`)
  assert.deepEqual(shippedTextIssues(files), [],
    '随包文本引用了开发面（tarball 里不存在）：改为行为/契约描述，或指向随包 content/ presets/ lib/')
})

test('源侧扫描集由 files 允许集派生：content/**/*.js 与 locale*/** 不得漏扫（BUG-231）', () => {
  const all = walkAll(PACK)
  const derived = new Set(shippedSourceFilesOf(pkg, all))
  assert.ok(derived.has('content/waves/lens-fanout.js'), 'content 的运行时 .js 必须在源侧扫描集（旧版只收 .md/.json）')
  const localeText = all.filter((rel) => /^locale[^/]*\/.*\.(?:json|md|js)$/.test(rel))
  assert.ok(localeText.length >= 5, `防空语料：locale 文本过少（${localeText.length}）`)
  assert.deepEqual(localeText.filter((rel) => !derived.has(rel)), [], 'locale*/** 的文本必须全部在源侧扫描集')
  assert.equal(isShippedFile('src/index.ts', pkg), false, 'src 不是随包文件（注释由本测试单独扫）')
  assert.equal(isShippedFile('lib/client.js', pkg), true, 'lib/*.js 属发布集，但归 pack.e2e 扫')
})

test('README 用户段零开发命令与开发路径；维护者 <details> 折叠段是显式例外（BUG-220）', () => {
  for (const name of ['README.md', 'README.zh.md']) {
    const text = readFileSync(join(PACK, name), 'utf8')
    assert.deepEqual(readmeUserSectionIssues(text), [], `${name} 的用户段混入开发命令/路径（折叠段之外）`)
  }
})

test('发布清单 = 公开类型面可达闭包的反投影（BUG-239 / BUG-219）', () => {
  assert.deepEqual(typeEntryPathsOf(pkg), CLOSURE.entries, '夹具的入口集必须等于 exports.types')
  assert.ok(CLOSURE.files.length > CLOSURE.entries.length, '闭包必须大于入口集（入口含相对 import）')
  assert.deepEqual(filesAllowlistIssues(pkg, { typeClosure: CLOSURE.files }), [])
})

test('类型闭包解析器矩阵：.ts / .js / 无扩展名 / index.d.ts（BUG-239 / BUG-219 纯函数）', () => {
  const disk = new Map([
    ['lib/types/index.d.ts', 'export type A = 1\n'],
    ['lib/types/client/index.d.ts', "import type { L } from './locales.ts'\nexport type C = L\n"],
    ['lib/types/client/locales.d.ts', "import type { E } from './locales/en.js'\nexport type L = E\n"],
    ['lib/types/client/locales/en.d.ts', 'export type E = 1\n'],
    ['lib/types/plain.d.ts', 'export type P = 1\n'],
    ['lib/types/dir/index.d.ts', 'export type D = 1\n'],
  ])
  const fakePkg = { exports: { '.': { types: './lib/types/index.d.ts' }, './client': { types: './lib/types/client/index.d.ts' }, './p': { types: './lib/types/plain.d.ts' }, './d': { types: './lib/types/dir/index.d.ts' } } }
  const closure = typeClosureOf(fakePkg, { read: (rel) => disk.get(rel) ?? '', exists: (rel) => disk.has(rel) })
  assert.deepEqual(closure.unresolved, [])
  for (const rel of ['lib/types/index.d.ts', 'lib/types/client/index.d.ts', 'lib/types/client/locales.d.ts',
    'lib/types/client/locales/en.d.ts', 'lib/types/plain.d.ts', 'lib/types/dir/index.d.ts']) {
    assert.ok(closure.files.includes(rel), `闭包缺 ${rel}`)
  }
  assert.deepEqual(typeSetIssues(closure.files, closure.files), [])
  assert.ok(typeSetIssues([...closure.files, 'lib/types/extra.d.ts'], closure.files).some((p) => p.includes('多出非公开类型文件')))
  assert.ok(typeSetIssues(closure.files.slice(1), closure.files).some((p) => p.includes('缺公开类型文件')))
})

test('发布清单 / 顶层集合 / 匹配器的纯函数矩阵', () => {
  const minimal = { exports: { '.': { types: './lib/types/index.d.ts' } }, files: ['lib/*.js', 'lib/types/index.d.ts'] }
  assert.deepEqual(filesAllowlistIssues(minimal, { typeClosure: ['lib/types/index.d.ts'] }), [],
    '入口闭包 = 自身（无相对 import 的情形）应绿')
  assert.ok(filesAllowlistIssues({ ...pkg, files: [...pkg.files, 'lib/**'] }, { typeClosure: CLOSURE.files })
    .some((p) => p.includes('广模式')))
  assert.deepEqual(topLevelIssues(['lib/x.js', 'presets/lead.patch.yml', 'README.md']), [])
  assert.ok(topLevelIssues(['src/index.ts']).some((p) => p.includes('未登记条目 src')))
  assert.equal(matchesFilesPattern('content/a/b.js', 'content/**'), true)
  assert.equal(matchesFilesPattern('lib/x.js', 'lib/*.js'), true)
  assert.equal(matchesFilesPattern('lib/deep/x.js', 'lib/*.js'), false)
})

test('dev 引用判据的边界：前缀归一、裸根、反斜杠、开发实例名、源码根、运行期词与 URL（BUG-230 / BUG-244 / BUG-245）', () => {
  const refs = (text) => devRefsOf(text).map((entry) => entry.ref)
  for (const text of ['see ./checks/x.mjs', 'see ../tests/y.spec.mjs', 'see checks/', 'see /checks/x',
    'see checks\\x', 'see ./research-workspace/x', '工作区 = research-workspace/', 'see src/lib/foo.ts',
    'see packages/foo/bar.ts', 'see src/']) {
    assert.ok(refs(text).length > 0, `${JSON.stringify(text)} 应判为 dev 引用（前缀不能绕过）`)
  }
  assert.deepEqual(refs('运行期：content/manual.md、presets/lead.patch.yml、lib/index.js、scripts/doctor.mjs、drt_<slug>/'), [])
  assert.deepEqual(refs('包内相对 import 形态：./chunk.js 与 ../shared/x.ts 不是开发根'), [])
  assert.deepEqual(refs('release notes/registry 与 changelog 不是路径'), [])
  assert.deepEqual(refs('见 https://example.com/docs/contracts/data-model.md 与 https://github.com/x/y/blob/master/_dist/manual.md'), [],
    '绝对 URL 是外部导航，不按包内路径判')
  assert.equal(refs('正本 = docs/contracts/data-model.md')[0], 'docs/contracts/data-model.md')
})

test('README 用户段判据：折叠区外开发命令红，折叠区内维护者语境绿（BUG-220 负控）', () => {
  assert.ok(readmeUserSectionIssues('## Usage\n`pnpm build`\n').some((p) => p.includes('开发命令')))
  assert.ok(readmeUserSectionIssues('see `docs/guides/run-ops.md`\n').some((p) => p.includes('开发面')))
  assert.deepEqual(readmeUserSectionIssues('## Usage\n<details><summary>maintainers</summary>\n`pnpm build`\n</details>\n'), [])
})
