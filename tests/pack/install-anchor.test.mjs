// install-anchor 解析件 — preflight/scaffold 必须从“实际运行的 DSH 安装”解析 peer/版本，
// 不能从 profile 目录向上走（那会走进用户 home，或测试仓的 node_modules）。
// 反证：漏掉 PATH 推断、把任意包当 DSH、或从 profile 解析 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  findAnchorFromExecutable,
  findDshExecutable,
  inferInstallAnchor,
  readAnchorVersion,
  resolveRowPeers,
} from '../../packages/deep-research-pack/scripts/lib/install-anchor.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-install-anchor-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  return root
}

function writeManifest(dir, manifest) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
}

function fakeAnchor(root, version = '0.2.1-rc.3') {
  const app = join(root, 'node_modules', '@deepseek-ai', 'dsh')
  writeManifest(app, { name: '@deepseek-ai/dsh', version, bin: { dsh: 'lib/bin.js' } })
  mkdirSync(join(app, 'lib'), { recursive: true })
  writeFileSync(join(app, 'lib', 'bin.js'), '#!/usr/bin/env node\n')
  return app
}

test('findAnchorFromExecutable：沿真实路径向上找到 @deepseek-ai/dsh', (t) => {
  const root = fixture(t)
  const app = fakeAnchor(root)
  const bin = join(root, 'bin', 'dsh')
  mkdirSync(join(root, 'bin'), { recursive: true })
  symlinkSync(join(app, 'lib', 'bin.js'), bin)
  assert.equal(findAnchorFromExecutable(bin), realpathSync(join(app, 'package.json')))
})

test('findAnchorFromExecutable：不把别的包误认成 DSH', (t) => {
  const root = fixture(t)
  const other = join(root, 'node_modules', '@deepseek-ai', 'dsh-tool-web')
  writeManifest(other, { name: '@deepseek-ai/dsh-tool-web', version: '0.2.1-rc.3' })
  writeFileSync(join(other, 'index.js'), 'export {}\n')
  assert.equal(findAnchorFromExecutable(join(other, 'index.js')), null)
})

test('findDshExecutable：按 PATH 顺序找可执行 dsh；空 PATH 返回 null', (t) => {
  const root = fixture(t)
  const one = join(root, 'one')
  const two = join(root, 'two')
  mkdirSync(one, { recursive: true })
  mkdirSync(two, { recursive: true })
  writeFileSync(join(two, 'dsh'), '#!/bin/sh\n')
  chmodSync(join(two, 'dsh'), 0o755)
  assert.equal(findDshExecutable({ pathEnv: `${one}:${two}`, platform: 'linux' }), join(two, 'dsh'))
  assert.equal(findDshExecutable({ pathEnv: '', platform: 'linux' }), null)
  assert.equal(findDshExecutable({ pathEnv: one, platform: 'linux' }), null)
})

test('inferInstallAnchor：显式目录 / 文件 / 环境变量优先；不合法时给出可读错误', (t) => {
  const root = fixture(t)
  const app = fakeAnchor(root)
  assert.equal(inferInstallAnchor({ explicit: app }).path, join(app, 'package.json'))
  assert.equal(inferInstallAnchor({ explicit: join(app, 'package.json') }).path, join(app, 'package.json'))
  assert.equal(inferInstallAnchor({ explicit: app, env: {} }).source, 'explicit')
  assert.equal(inferInstallAnchor({ env: { DSH_INSTALL_ANCHOR: app } }).source, 'env')
  assert.throws(
    () => inferInstallAnchor({ explicit: root }),
    /install anchor.*package\.json|@deepseek-ai\/dsh/i,
    '目录里没有 DSH 安装清单时必须 fail-loud，而不是随便取一个 package.json',
  )
})

test('resolveRowPeers：从 anchor 解析行依赖；缺件进 missing', (t) => {
  const root = fixture(t)
  const app = fakeAnchor(root)
  for (const name of ['@deepseek-ai/dsh-tool-web', '@deepseek-ai/dsh-tool-present']) {
    const dir = join(app, 'node_modules', name)
    writeManifest(dir, { name, version: '0.2.1-rc.3' })
    writeFileSync(join(dir, 'index.js'), 'export {}\n')
  }
  const result = resolveRowPeers(join(app, 'package.json'), [
    '@deepseek-ai/dsh-tool-web',
    '@deepseek-ai/dsh-tool-present',
    '@deepseek-ai/dsh-missing',
  ])
  assert.deepEqual(result.missing, ['@deepseek-ai/dsh-missing'])
  assert.ok(result.resolved.includes('@deepseek-ai/dsh-tool-web'))
})

test('readAnchorVersion：读安装清单版本；坏清单返回 null', (t) => {
  const root = fixture(t)
  const app = fakeAnchor(root, '0.2.1-rc.2')
  assert.equal(readAnchorVersion(join(app, 'package.json')), '0.2.1-rc.2')
  const broken = join(root, 'broken', 'package.json')
  mkdirSync(join(root, 'broken'), { recursive: true })
  writeFileSync(broken, '{ not json')
  assert.equal(readAnchorVersion(broken), null)
})
