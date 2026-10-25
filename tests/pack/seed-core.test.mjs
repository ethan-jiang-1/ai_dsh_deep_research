// seed-core 纯函数回归 — scaffold（安装方）与 sync-pack-workspace（生成方）共用的种子判据。
// 反证：把 classify 的 modified/untracked 分支对调、或让 serialize 不排序 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifySeedEntry, seedSourceRel, serializeSeedManifest, sha256 } from '../../packages/deep-research-pack/scripts/lib/seed-core.mjs'

test('sha256：内容哈希稳定且区分换行', () => {
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  assert.notEqual(sha256('a\n'), sha256('a'))
})

test('classifySeedEntry：missing/deleted/current/stale/modified/untracked 各态', () => {
  const seed = 's'
  assert.equal(classifySeedEntry({ destExists: false, destHash: null, stateHash: null, seedHash: seed }), 'missing')
  assert.equal(classifySeedEntry({ destExists: false, destHash: null, stateHash: 'old', seedHash: seed }), 'deleted')
  assert.equal(classifySeedEntry({ destExists: true, destHash: seed, stateHash: 'old', seedHash: seed }), 'current')
  assert.equal(classifySeedEntry({ destExists: true, destHash: 'old', stateHash: 'old', seedHash: seed }), 'stale')
  assert.equal(classifySeedEntry({ destExists: true, destHash: 'user', stateHash: 'old', seedHash: seed }), 'modified')
  assert.equal(classifySeedEntry({ destExists: true, destHash: 'user', stateHash: null, seedHash: seed }), 'untracked')
})

test('classifySeedEntry：无状态但目标恰等于种子时算 current（旧工作区可自愈）', () => {
  assert.equal(classifySeedEntry({ destExists: true, destHash: 'same', stateHash: null, seedHash: 'same' }), 'current')
})

test('seedSourceRel：.gitignore 从 .gitignore.example 落地，其余同名', () => {
  assert.equal(seedSourceRel('.gitignore'), '.gitignore.example')
  assert.equal(seedSourceRel('AGENTS.md'), 'AGENTS.md')
  assert.equal(seedSourceRel('templates/run/final.md'), 'templates/run/final.md')
})

test('serializeSeedManifest：版本 + 按路径排序的哈希 + 结尾换行', () => {
  const text = serializeSeedManifest({ version: '1.2.3', files: { 'b.md': 'bb', 'a.md': 'aa' } })
  assert.equal(text, '{\n  "version": "1.2.3",\n  "files": {\n    "a.md": "aa",\n    "b.md": "bb"\n  }\n}\n')
})


test('pack workspace/seed.json：版本 = pack 版本，哈希与盘上种子逐字一致', () => {
  const PACK = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages', 'deep-research-pack')
  const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
  const seed = JSON.parse(readFileSync(join(PACK, 'workspace', 'seed.json'), 'utf8'))
  assert.equal(seed.version, pkg.version, 'seed.json 版本未随 pack 版本更新——重跑 dev/sync-pack-workspace.mjs')
  for (const [rel, hash] of Object.entries(seed.files)) {
    const src = seedSourceRel(rel)
    assert.equal(sha256(readFileSync(join(PACK, 'workspace', src), 'utf8')), hash, `${rel} 的种子哈希与盘上文件不一致`)
  }
})
