// T0/T8 静态发布契约 — 不构建、不联网，钉住“发出去的是什么/不会执行什么”。
// 反证：给 pack 加 install 脚本、删 files 里的 cordis.patch.yml、把 exports["./client"]
// 指向不存在的路径 → 本文件红。运行期产物由 scripts/smoke/pack-smoke.mjs 验。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))

test('T0 files：入口/patch/preset/种子/脚本都在发布白名单', () => {
  for (const required of ['cordis.patch.yml', 'presets/**', 'lib/**', 'workspace/**', 'scripts/**']) {
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
  assert.equal(pkg.main, undefined, 'main 与 exports 双写会制造第二份入口')
})

test('client 模块表：构建产物里的 @deepseek-ai require 都在 dsh.client.inject 声明', () => {
  const client = readFileSync(join(PACK, 'lib/client.js'), 'utf8')
  const required = [...new Set([...client.matchAll(/require\("(@deepseek-ai\/[^"]+)"\)/g)].map((match) => match[1]))]
  const inject = new Set(pkg.dsh?.client?.inject ?? [])
  assert.ok(required.length > 0, '构建产物没有可检查的 @deepseek-ai require（检查 lib/client.js 是否已构建）')
  for (const name of required) {
    assert.ok(inject.has(name), `client 运行时 require ${name} 未进 dsh.client.inject——模块表可能先于它注册`)
    assert.ok(Object.hasOwn(pkg.peerDependencies ?? {}, name), `client inject ${name} 未进 peerDependencies`)
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
  const workspaceRel = 'workspace/seed.json'
  assert.ok(existsSync(join(PACK, workspaceRel)), '工作区种子清单缺席')
  const seed = JSON.parse(readFileSync(join(PACK, workspaceRel), 'utf8'))
  assert.ok(!Object.keys(seed.files ?? {}).some((rel) => /credential|secret|\.env/i.test(rel)),
    '种子清单不得包含凭据/密钥文件')
})
