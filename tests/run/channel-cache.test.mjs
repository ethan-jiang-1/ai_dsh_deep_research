// tests/run/channel-cache.test.mjs — 启动加速缓存的 keyless 契约
// （scripts/lib/channel-cache.mjs；2026-11-05 实测：漂移门 5.1s + 探针 12s 是热启动的主要开销）。
//
// 立的规矩：缓存只省重复计算，不改变判据——键必须含身份（web pid + pack 指纹），
// 只复用 GREEN，TTL 外/键不符/时间戳坏一律 miss。反证：把 probeCacheHit 的 GREEN 过滤或
// key 比较删掉 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  PROBE_CACHE_TTL_MS,
  collectPackEntries,
  packFingerprint,
  probeCacheHit,
  probeCacheKey,
  readShippedCache,
  writeShippedCache,
} from '../../scripts/lib/channel-cache.mjs'

const entry = (rel, size, mtimeMs) => ({ rel, size, mtimeMs })

test('packFingerprint：与遍历顺序无关，随 rel/size/mtime 变化', () => {
  const a = [entry('a.js', 10, 1000), entry('b/c.md', 20, 2000)]
  const b = [entry('b/c.md', 20, 2000), entry('a.js', 10, 1000)]
  assert.equal(packFingerprint(a), packFingerprint(b))
  assert.notEqual(packFingerprint(a), packFingerprint([entry('a.js', 11, 1000), entry('b/c.md', 20, 2000)]))
  assert.notEqual(packFingerprint(a), packFingerprint([entry('a.js', 10, 1001), entry('b/c.md', 20, 2000)]))
  assert.notEqual(packFingerprint(a), packFingerprint([entry('a.js', 10, 1000), entry('b/d.md', 20, 2000)]))
})

test('collectPackEntries：收集嵌套文件、跳过 node_modules 与 .git', () => {
  const root = mkdtempSync(join(tmpdir(), 'channel-cache-'))
  writeFileSync(join(root, 'package.json'), '{}')
  mkdirSync(join(root, 'presets'))
  writeFileSync(join(root, 'presets', 'lead.yml'), 'x')
  mkdirSync(join(root, 'node_modules'))
  writeFileSync(join(root, 'node_modules', 'ignored.js'), 'x')
  mkdirSync(join(root, '.git'))
  writeFileSync(join(root, '.git', 'ignored'), 'x')
  const rels = collectPackEntries(root).map((e) => e.rel).sort()
  assert.deepEqual(rels, ['package.json', 'presets/lead.yml'])
})

test('发布清单缓存：roundtrip / 键不符 miss / 损坏 miss', () => {
  const dir = mkdtempSync(join(tmpdir(), 'channel-cache-'))
  const path = join(dir, 'pack-shipped.json')
  writeShippedCache(path, 'k1', ['a.js', 'b.md'])
  assert.deepEqual(readShippedCache(path, 'k1'), ['a.js', 'b.md'])
  assert.equal(readShippedCache(path, 'k2'), null)
  writeFileSync(path, '{not json')
  assert.equal(readShippedCache(path, 'k1'), null)
})

test('probeCacheKey：pid 顺序无关，指纹参与身份', () => {
  assert.equal(
    probeCacheKey({ pids: ['12', '11'], packFingerprint: 'f' }),
    probeCacheKey({ pids: ['11', '12'], packFingerprint: 'f' }),
  )
  assert.notEqual(
    probeCacheKey({ pids: ['11'], packFingerprint: 'f' }),
    probeCacheKey({ pids: ['11'], packFingerprint: 'g' }),
  )
})

test('probeCacheHit：只认 GREEN + 键相符 + TTL 内', () => {
  const now = Date.parse('2026-11-05T10:00:00.000Z')
  const fresh = { key: 'k', level: 'GREEN', at: '2026-11-05T09:59:50.000Z' }
  assert.deepEqual(probeCacheHit({ entry: fresh, key: 'k', now }), { hit: true, ageMs: 10_000 })
  assert.equal(probeCacheHit({ entry: fresh, key: 'other', now }).hit, false)
  assert.equal(probeCacheHit({ entry: { ...fresh, level: 'RED' }, key: 'k', now }).hit, false)
  assert.equal(probeCacheHit({ entry: { ...fresh, level: 'NOT-RUN' }, key: 'k', now }).hit, false)
  assert.equal(probeCacheHit({ entry: { ...fresh, at: 'not-a-date' }, key: 'k', now }).hit, false)
  assert.equal(probeCacheHit({ entry: null, key: 'k', now }).hit, false)
})

test('probeCacheHit：TTL 外与未来时间戳都 miss', () => {
  const now = Date.parse('2026-11-05T10:00:00.000Z')
  const old = { key: 'k', level: 'GREEN', at: new Date(now - PROBE_CACHE_TTL_MS - 1).toISOString() }
  assert.equal(probeCacheHit({ entry: old, key: 'k', now }).hit, false)
  const future = { key: 'k', level: 'GREEN', at: new Date(now + 60_000).toISOString() }
  assert.equal(probeCacheHit({ entry: future, key: 'k', now }).hit, false)
  assert.equal(
    probeCacheHit({ entry: { ...old, at: new Date(now - 1000).toISOString() }, key: 'k', now, ttlMs: 500 }).hit,
    false,
  )
})
