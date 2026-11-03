// T0/T8 静态发布契约 — 不构建、不联网，钉住“发出去的是什么/不会执行什么”。
// 反证：给 pack 加 install 脚本、删 files 里的 cordis.patch.yml、把 exports["./client"]
// 指向不存在的路径 → 本文件红。**构建产物断言一律不住这里**（fresh clone 无 lib/）：
// 运行期产物与 client 模块表由 scripts/smoke/pack-smoke.mjs 验（它本就要求 lib/ 在位）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))

test('T0 files：入口/patch/preset/种子/脚本都在发布白名单', () => {
  for (const required of ['cordis.patch.yml', 'presets/**', 'lib/**', 'content/**', 'scripts/**']) {
    assert.ok(pkg.files?.includes(required), `files 缺 ${required}——tarball 会装后坏`)
  }
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
  assert.equal(pkg.main, undefined, 'main 与 exports 双写会制造第二份入口')
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
