// T0/T8 静态发布契约 — 不构建、不联网，钉住“发出去的是什么/不会执行什么”。
// 反证：给 pack 加 install 脚本、删 files 里的 cordis.patch.yml、把 exports["./client"]
// 指向不存在的路径 → 本文件红。**构建产物断言一律不住这里**（fresh clone 无 lib/）：
// 运行期产物与 client 模块表由 checks/smoke/pack.e2e.mjs 验（它本就要求 lib/ 在位）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { displayMetaTargetsOf, filesAllowlistIssues, packSpecifiersOf } from '../../../checks/lib/repo/shipped-surface.mjs'
import { externalImportsOf } from '../../../checks/lib/repo/pack-deps.mjs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BUNDLE_PATCH, loadPatchRows } from '../preset-helpers.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const CLOSURE = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'shipped', 'type-closure.json'), 'utf8'))

test('T0 files：入口/patch/preset/种子/脚本都在发布白名单；清单 = exports.types 反投影', () => {
  for (const required of ['cordis.patch.yml', 'presets/**', 'lib/*.js', 'content/**', 'scripts/**', 'locale-method-library/**']) {
    assert.ok(pkg.files?.includes(required), `files 缺 ${required}——tarball 会装后坏`)
  }
  // 发布清单不是「目录全带 + 负模式」：每个公开类型入口逐条列出，无 lib 广模式（BUG-219/228）。
  assert.deepEqual(filesAllowlistIssues(pkg, { typeClosure: CLOSURE.files }), [])
  for (const entry of CLOSURE.files) assert.ok(pkg.files?.includes(entry), `files 缺公开类型文件 ${entry}`)
  for (const patch of pkg.dsh?.bundle?.patch ?? []) {
    assert.ok(existsSync(join(PACK, patch)), `dsh.bundle.patch 指向不存在的文件：${patch}`)
  }
})

test('T0 exports：入口与 client 都有声明，且不依赖未发布源码', () => {
  assert.equal(pkg.exports?.['.']?.default, './lib/index.js')
  assert.equal(pkg.exports?.['./client']?.default, './lib/client.js')
  assert.equal(pkg.exports?.['./client']?.types, './lib/types/client/index.d.ts')
  assert.equal(pkg.exports?.['./startup']?.default, './lib/startup.js')
  assert.equal(pkg.exports?.['./startup']?.types, './lib/types/startup/index.d.ts')
  assert.equal(pkg.exports?.['./content']?.default, './lib/content.js')
  assert.equal(pkg.exports?.['./defaults']?.default, './lib/defaults.js')
  assert.equal(pkg.exports?.['./defaults']?.types, './lib/types/defaults/index.d.ts')
  assert.equal(pkg.exports?.['./cordis.patch.yml'], './cordis.patch.yml')
  assert.equal(pkg.exports?.['./presets/*.patch.yml'], './presets/*.patch.yml')
  assert.equal(pkg.exports?.['./workers/*.patch.yml'], './workers/*.patch.yml')
  const patchYamls = (pkg.dsh?.bundle?.patch ?? []).map((rel) => readFileSync(join(PACK, rel), 'utf8'))
  const metaTargets = displayMetaTargetsOf(packSpecifiersOf(patchYamls), pkg)
  assert.equal(metaTargets.length, 6, '本包全部 6 个可独立寻址 specifier 都须覆盖显示面契约')
  for (const { localeDir, localeKey, iconKey } of metaTargets) {
    assert.equal(pkg.exports?.[iconKey], './icon.svg', `exports[${iconKey}] 须指向 ./icon.svg`)
    assert.equal(pkg.exports?.[localeKey], `./${localeDir}/*.json`, `exports[${localeKey}] 须指向 ./${localeDir}/*.json`)
    for (const lang of ['en', 'zh']) {
      assert.ok(existsSync(join(PACK, localeDir, `${lang}.json`)), `subpath 显示元数据缺席：${localeDir}/${lang}.json`)
    }
  }
  assert.equal(pkg.main, undefined, 'main 与 exports 双写会制造第二份入口')
})

test('T0 源码依赖与发布命令合同：src 全部外部 import 镜像进 pack devDependencies（不靠根 node_modules 隐式提升），且 npm publish 只准对 _dist tarball 执行', () => {
  const walkSrc = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    const abs = join(dir, ent.name)
    if (ent.isDirectory()) return walkSrc(abs)
    return /\.(?:ts|tsx)$/.test(ent.name) ? [readFileSync(abs, 'utf8')] : []
  })
  const srcImports = new Set(walkSrc(join(PACK, 'src')).flatMap((text) => externalImportsOf(text).map((x) => x.name)))
  assert.ok(srcImports.size >= 10, `防空语料：src 外部 import 过少（${srcImports.size}）`)
  const missingDev = [...srcImports].filter((name) => !Object.hasOwn(pkg.devDependencies ?? {}, name)).sort()
  assert.deepEqual(missingDev, [], `packages/deep-research-pack/src 引用了未在 pack devDependencies 声明的包（根 node_modules 隐式提升会让独立类型检查失效）：${missingDev.join(', ')}`)
  assert.equal(Object.hasOwn(pkg.devDependencies ?? {}, '@types/react'), false, 'vendor/dsh client 规范禁止在子包写 @types/react')
  assert.equal(Object.hasOwn(pkg.devDependencies ?? {}, '@types/react-dom'), false, 'vendor/dsh client 规范禁止在子包写 @types/react-dom')

  const releaseDoc = readFileSync(join(ROOT, 'docs', 'contracts', 'release.md'), 'utf8')
  const releaseCheck = readFileSync(join(ROOT, 'checks', 'release', 'release-check.mjs'), 'utf8')
  assert.match(releaseDoc, /npm publish "_dist\/dsh-deep-research-pack-<version>\.tgz"/, 'release.md 必须指定发布已剥离 workspace:* 的 _dist tarball')
  assert.match(releaseCheck, /npm publish "_dist\/dsh-deep-research-pack-\$\{version\}\.tgz"/, 'release-check.mjs 提示必须指向 _dist tarball')
})

test('D40 分发：只有只读 doctor；无 launcher/scaffold；startup/content 入口声明在场', () => {
  assert.deepEqual(Object.keys(pkg.bin ?? {}), ['dsh-deep-research-doctor'])
  assert.equal(pkg.bin?.['dsh-deep-research-doctor'], './scripts/doctor.mjs')
  assert.equal(pkg.bin?.['dsh-deep-research'], undefined)
  assert.equal(pkg.bin?.['dsh-deep-research-scaffold'], undefined)
  assert.ok(existsSync(join(PACK, 'scripts', 'doctor.mjs')), 'doctor 脚本缺席')
  assert.equal(existsSync(join(PACK, 'scripts', 'launch.mjs')), false, 'launcher 应已删除')
  assert.equal(existsSync(join(PACK, 'scripts', 'scaffold.mjs')), false, 'scaffold 应已删除')
})

test('D38 分发：所有 peer 都是 optional（全局 launcher 安装不拉 DSH peers）', () => {
  const peers = Object.keys(pkg.peerDependencies ?? {})
  assert.ok(peers.length > 0)
  assert.ok(Object.hasOwn(pkg.peerDependencies ?? {}, '@deepseek-ai/dsh-workspace'), 'workspace-boot 服务依赖未声明')
  for (const name of peers) {
    assert.equal(pkg.peerDependenciesMeta?.[name]?.optional, true, `${name} 必须是 optional peer（否则 npm i -g ERESOLVE）`)
  }
})

test('T8 生命周期：只允许 publish 时 prepack，不允许 install/prepare 在宿主执行', () => {
  assert.match(pkg.scripts?.prepack ?? '', /build/, 'prepack 必须构建发布入口')
  for (const name of ['preinstall', 'install', 'postinstall', 'prepare']) {
    assert.equal(pkg.scripts?.[name], undefined, `${name} 会在安装时以宿主权限执行；本包不支持，必须删`)
  }
  assert.equal(pkg.dependencies, undefined, '发布形状应为 peers-only；dependencies 回潮会拖入嵌套依赖')
  assert.ok(Object.keys(pkg.peerDependencies ?? {}).length > 0, 'peerDependencies 不应为空')
})

test('T8 数据边界：包内不出现凭据/环境文件（模板空种子除外）', () => {
  for (const rel of ['.env', '.credentials' + '.yaml', 'credentials' + '.yaml']) {
    assert.equal(existsSync(join(PACK, rel)), false, `包内出现凭据/环境文件：${rel}`)
  }
  assert.ok(existsSync(join(PACK, 'content', 'manual.md')), '研究手册缺席（content/manual.md）')
  assert.ok(existsSync(join(PACK, 'content', 'templates', 'run', 'run.md')), 'run 模板缺席（content/templates/run/）')
  assert.equal(existsSync(join(PACK, 'workspace')), false, 'workspace/ 种子已退役（D40）')
})

test('T8 行契约：bundle 的 replace 行不得丢掉 base 行的 config 键', () => {
  // 起因（2026-11-25 接手诊断 D3）：Loader 的 replace 行**整块替换** config、不深合并；当前
  // `web` 恰为 base 同两键、`llm-deepseek` base 无 config，所以今天无损——但下个 pin 若 base 给
  // 这些行加键，本包会静默吞掉（行为变化无任何信号）。判据 = 每个无 name 的 replace 行，其
  // config 键必须覆盖**该 profile 模板实际组合的两个 bundle**（`--from-default-profile web`
  // = base + web-app；本包只支持 Web 面，sdk/headless 的同行行不参与对账）在同 id 行上出现过的键。
  const vendorBundles = join(ROOT, 'vendor', 'dsh', 'packages', 'bundle')
  assert.ok(existsSync(vendorBundles), 'vendor bundle 缺席（submodule 未初始化）——override 行无法对账')
  const baseKeys = new Map()
  for (const name of ['base', 'web-app']) {
    const file = join(vendorBundles, name, 'cordis.patch.yml')
    assert.ok(existsSync(file), `vendor bundle 缺席：${name}——web profile 模板无法对账`)
    for (const row of loadPatchRows(file)) {
      if (row.config === undefined || row.config === null || typeof row.config !== 'object') continue
      const keys = baseKeys.get(row.id) ?? new Set()
      for (const key of Object.keys(row.config)) keys.add(key)
      baseKeys.set(row.id, keys)
    }
  }
  const droppedKeys = (config, keys) => [...keys].filter((key) => !Object.hasOwn(config, key))
  // 变异控制：判据必须能咬住一个被吞掉的键（否则本测试只是形状检查）。
  assert.deepEqual(droppedKeys({ searchProvider: 'x' }, new Set(['searchProvider', 'fetchProvider'])), ['fetchProvider'])

  const overrides = loadPatchRows(BUNDLE_PATCH).filter((row) => row.name === undefined)
  assert.ok(overrides.length >= 5, `防空语料：bundle patch 只解析出 ${overrides.length} 个 replace 行`)
  const problems = []
  for (const row of overrides) {
    const keys = baseKeys.get(row.id)
    if (keys === undefined || row.config === undefined) continue
    const missing = droppedKeys(row.config, keys)
    if (missing.length > 0) problems.push(`${row.id}: 未重述 ${missing.join(', ')}`)
  }
  assert.deepEqual(problems, [], `replace 行整块换 config；base 新增键必须同 diff 重述：\n${problems.join('\n')}`)
})
