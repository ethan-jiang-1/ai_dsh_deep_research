// launcher-profile-plan — 产品 profile 的纯读回/判据（无子进程；装配编排由 product-smoke 证明）。
// 反证：删掉 engines 的未知版本 warning / 删掉 bundle 类型过滤 / 删掉 pack 名校验 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  checkEngines, installedPackVersion, packManifest, profileBundles, profileDirectory,
  readProfileManifest, PACK_NAME, WEB_APP_BUNDLE, hasPackInstall,
} from '../../packages/deep-research-pack/scripts/lib/launcher/profile-plan.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const temp = () => mkdtempSync(join(tmpdir(), 'dr-plan-'))
const cleanup = (dir) => rmSync(dir, { recursive: true, force: true })

test('profileDirectory：合法/非法名', () => {
  assert.equal(profileDirectory('/home', 'deep-research'), '/home/profiles/deep-research')
  for (const bad of ['', '.', '..', 'a/b', 'a\\b', 'node_modules']) {
    assert.throws(() => profileDirectory('/home', bad), /profile 名不合法/, bad)
  }
})

test('readProfileManifest/profileBundles：缺失/坏 JSON → null/[]；非字符串项过滤', () => {
  const dir = temp()
  try {
    assert.equal(readProfileManifest(dir), null)
    writeFileSync(join(dir, 'package.json'), '{bad')
    assert.equal(readProfileManifest(dir), null)
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['a', 1, null, 'b'] } } }))
    assert.deepEqual(profileBundles(readProfileManifest(dir)), ['a', 'b'])
    assert.deepEqual(profileBundles(null), [])
  } finally {
    cleanup(dir)
  }
})

test('installedPackVersion/hasPackInstall：读安装副本', () => {
  const dir = temp()
  try {
    assert.equal(installedPackVersion(dir), null)
    assert.equal(hasPackInstall(dir), false)
    mkdirSync(join(dir, 'node_modules', PACK_NAME), { recursive: true })
    writeFileSync(join(dir, 'node_modules', PACK_NAME, 'package.json'), JSON.stringify({ version: '0.2.0' }))
    assert.equal(installedPackVersion(dir), '0.2.0')
    assert.equal(hasPackInstall(dir), true)
  } finally {
    cleanup(dir)
  }
})

test('checkEngines：兼容/不兼容/未知版本 warning', () => {
  assert.deepEqual(checkEngines({ packVersion: '0.1.3', enginesDsh: '>=0.2.1-rc.2 <0.3.0-0', dshVersion: '0.2.1-rc.2' }), { ok: true, warning: null, error: null })
  const bad = checkEngines({ packVersion: '0.1.3', enginesDsh: '>=0.2.2', dshVersion: '0.2.1-rc.2' })
  assert.equal(bad.ok, false)
  assert.match(bad.error, /engines\.dsh/)
  const unknown = checkEngines({ packVersion: '0.1.3', enginesDsh: '>=0.2.1', dshVersion: null })
  assert.equal(unknown.ok, true)
  assert.match(unknown.warning, /无法确认/)
  assert.deepEqual(checkEngines({ packVersion: '0.1.3', enginesDsh: undefined, dshVersion: '0.0.0' }), { ok: true, warning: null, error: null })
})

test('packManifest：真包版本/engines；坏目录抛错', () => {
  const manifest = packManifest(PACK)
  const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
  assert.equal(manifest.version, pkg.version)
  assert.equal(manifest.enginesDsh, pkg.engines.dsh)
  assert.throws(() => packManifest(join(PACK, 'missing')), /pack manifest 不可读/)
})

test('bundle 常量与 Web 模板一致（文档/契约漂移哨兵）', () => {
  assert.equal(PACK_NAME, 'dsh-deep-research-pack')
  assert.equal(WEB_APP_BUNDLE, '@deepseek-ai/dsh-web-app')
})
