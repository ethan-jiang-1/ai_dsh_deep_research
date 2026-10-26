// dsh-home 解析件 — pack 的 scaffold/preflight 与 DSH 本体必须把同一个 DSH_HOME 解析到同一目录。
// 反证：把空白/空串当普通相对路径、或漏掉 ~ 展开 → 本文件红。
//
// 判据来源（独立事实源，不是抄实现）：vendor/dsh/packages/util/home-paths/src/index.ts 的
// resolveDshHome / expandHomePath：全空白视为未设置，~ / ~/ / ~\ 展开，其余原样 resolve。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { expandHomePath, resolveDshHome } from '../../packages/deep-research-pack/scripts/lib/dsh-home.mjs'

const HOME = '/tmp/dsh-home-fixture' // 纯字符串锚；不依赖测试机真实 home

test('expandHomePath：~ / ~/ / ~\\ 展开，其他原样', () => {
  assert.equal(expandHomePath('~', HOME), HOME)
  assert.equal(expandHomePath('~/research', HOME), `${HOME}/research`)
  assert.equal(expandHomePath('~\\research', HOME), `${HOME}/research`)
  assert.equal(expandHomePath('~other', HOME), '~other', '只有 ~ 或 ~/、~\\ 前缀才展开')
  assert.equal(expandHomePath('/absolute/path', HOME), '/absolute/path')
  assert.equal(expandHomePath('relative/path', HOME), 'relative/path')
})

test('resolveDshHome：未设置、空串、全空白都回落到 <home>/.dsh', () => {
  assert.equal(resolveDshHome({}, HOME), resolve(HOME, '.dsh'))
  assert.equal(resolveDshHome({ DSH_HOME: '' }, HOME), resolve(HOME, '.dsh'))
  assert.equal(resolveDshHome({ DSH_HOME: '   ' }, HOME), resolve(HOME, '.dsh'))
})

test('resolveDshHome：~ 展开与绝对路径', () => {
  assert.equal(resolveDshHome({ DSH_HOME: '~/custom home' }, HOME), resolve(HOME, 'custom home'))
  assert.equal(resolveDshHome({ DSH_HOME: '~' }, HOME), resolve(HOME))
  assert.equal(resolveDshHome({ DSH_HOME: '/var/dsh-home' }, HOME), '/var/dsh-home')
})

test('resolveDshHome：相对路径按 cwd 解析（与 DSH 的 resolve 一致）', () => {
  assert.equal(resolveDshHome({ DSH_HOME: 'relative-home' }, HOME), resolve(process.cwd(), 'relative-home'))
})

test('resolveDshHome：只有全空白才视为未设置；首尾空格不裁剪（与 DSH 一致）', () => {
  // DSH 的判据是 env.DSH_HOME.trim().length > 0；非空值原样交给 expandHomePath/resolve。
  assert.equal(resolveDshHome({ DSH_HOME: ' ~/custom' }, HOME), resolve(process.cwd(), ' ~/custom'))
})
