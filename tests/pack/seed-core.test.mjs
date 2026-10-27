// seed-core 纯函数回归 — scaffold（安装方）与 sync-pack-workspace（生成方）共用的种子判据。
// 反证：把 classify 的 modified/untracked 分支对调、或让 serialize 不排序 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SEED_STATE_SCHEMA, classifySeedEntry, nextSeedState, parseSeedState, planSeedCleanup, seedSourceRel, serializeSeedManifest, sha256 } from '../../packages/deep-research-pack/scripts/lib/seed-core.mjs'

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

test('nextSeedState：首装只记录真正落地的种子，untracked 不冒充 baseline', () => {
  const seed = { version: '1.0.0', files: { 'AGENTS.md': 'a', 'NODES.md': 'n', 'templates/run/plan.md': 'p' } }
  const state = nextSeedState({
    seed,
    previousFiles: {},
    classifications: { 'AGENTS.md': 'untracked', 'NODES.md': 'missing', 'templates/run/plan.md': 'current' },
    written: ['NODES.md'],
    force: false,
  })
  assert.deepEqual(state.files, { 'NODES.md': 'n', 'templates/run/plan.md': 'p' })
  assert.deepEqual(state.skipped, ['AGENTS.md'])
})

test('nextSeedState：--upgrade 保留 modified/deleted 的旧基线，写入 stale/missing，untracked 不留假基线', () => {
  const seed = { version: '2.0.0', files: { a: 'a2', b: 'b2', c: 'c2', d: 'd2', e: 'e2' } }
  const state = nextSeedState({
    seed,
    previousFiles: { a: 'a1', b: 'b1', c: 'c1', orphan: 'o1' },
    classifications: { a: 'stale', b: 'modified', c: 'deleted', d: 'untracked', e: 'missing' },
    written: ['a', 'e'],
    force: false,
  })
  assert.deepEqual(state.files, { a: 'a2', b: 'b1', c: 'c1', e: 'e2', orphan: 'o1' })
  assert.deepEqual(state.skipped, ['b', 'c', 'd'])
})

test('nextSeedState：--force 全量写 baseline，并保留 seed 之外的孤儿记录', () => {
  const seed = { version: '2.0.0', files: { a: 'a2', b: 'b2' } }
  const state = nextSeedState({
    seed,
    previousFiles: { a: 'a1', old: 'old' },
    classifications: { a: 'modified', b: 'untracked' },
    written: [],
    force: true,
  })
  assert.deepEqual(state.files, { a: 'a2', b: 'b2', old: 'old' })
  assert.deepEqual(state.skipped, [])
})

test('serializeSeedManifest：版本 + 按路径排序的哈希 + 结尾换行', () => {
  const text = serializeSeedManifest({ version: '1.2.3', files: { 'b.md': 'bb', 'a.md': 'aa' } })
  assert.equal(text, '{\n  "version": "1.2.3",\n  "files": {\n    "a.md": "aa",\n    "b.md": "bb"\n  }\n}\n')
})


test('workspace 种子 .gitignore 拒收 scaffold 本机状态/锁/sidecar', () => {
  const PACK = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages', 'deep-research-pack')
  const text = readFileSync(join(PACK, 'workspace', '.gitignore.example'), 'utf8')
  for (const pattern of ['.dsh-research-seed.json', '.dsh-research-scaffold.lock', '*.seed-new']) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    assert.ok(new RegExp(`^${escaped}\\s*$`, 'm').test(text), `.gitignore 缺 ${pattern}`)
  }
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

test('parseSeedState：缺省→null；旧态（无 schemaVersion）按 0 读并可升级；新态拒绝；坏 JSON fail loud', () => {
  assert.deepEqual(parseSeedState(null), { ok: true, state: null, schemaVersion: 0, upgraded: false })
  const legacy = JSON.stringify({ version: '0.1.1', files: { 'AGENTS.md': 'a' } })
  const old = parseSeedState(legacy)
  assert.equal(old.ok, true)
  assert.equal(old.schemaVersion, 0)
  assert.equal(old.upgraded, true)
  assert.deepEqual(old.state.files, { 'AGENTS.md': 'a' })
  const current = parseSeedState(JSON.stringify({ schemaVersion: SEED_STATE_SCHEMA, version: '1.0.0', files: {} }))
  assert.equal(current.ok, true)
  assert.equal(current.schemaVersion, SEED_STATE_SCHEMA)
  assert.equal(current.upgraded, false)
  const newer = parseSeedState(JSON.stringify({ schemaVersion: SEED_STATE_SCHEMA + 1, version: '9.0.0', files: {} }))
  assert.equal(newer.ok, false)
  assert.equal(newer.reason, 'newer-schema')
  const corrupt = parseSeedState('{oops')
  assert.equal(corrupt.ok, false)
  assert.equal(corrupt.reason, 'corrupt')
})

test('nextSeedState：状态带 schemaVersion（旧态升级后写新口径）', () => {
  const state = nextSeedState({ seed: { version: '1.0.0', files: { a: 'a' } }, classifications: { a: 'missing' }, written: ['a'] })
  assert.equal(state.schemaVersion, SEED_STATE_SCHEMA)
})

test('planSeedCleanup：未改孤儿删除、改过的孤儿保留、缺失记录清账、种子删除不重铺', () => {
  const seed = { version: '2.0.0', files: { 'AGENTS.md': 'a2', 'NODES.md': 'n2' } }
  const state = {
    schemaVersion: SEED_STATE_SCHEMA,
    version: '1.0.0',
    files: { 'AGENTS.md': 'a1', 'NODES.md': 'n1', 'old.md': 'o1', 'user.md': 'u1', 'gone.md': 'g1' },
    skipped: ['AGENTS.md', 'user.md'],
    adopted: ['AGENTS.md', 'gone-adopted.md'],
  }
  const plan = planSeedCleanup({
    seed,
    state,
    entries: {
      'old.md': { exists: true, hash: 'o1' },
      'user.md': { exists: true, hash: 'u2' },
      'gone.md': { exists: false, hash: null },
      'gone-adopted.md': { exists: false, hash: null },
    },
  })
  assert.deepEqual(plan.remove.map((x) => x.rel), ['old.md'])
  assert.deepEqual(plan.keep.map((x) => x.rel), ['user.md'])
  assert.deepEqual(plan.dropFromState.sort(), ['gone-adopted.md', 'gone.md'])
  assert.equal(plan.remove.some((x) => x.rel === 'AGENTS.md' || x.rel === 'NODES.md'), false, '种子文件永不被 clean 删除')
})
