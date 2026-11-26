// runs-catalog.spec.mjs — Research Hub 工作区 run 三位置扫描 + 内置 8 透镜目录测试。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BUILT_IN_LENSES,
  filterLenses,
  filterRunsCatalog,
  scanRunsCatalog,
} from '../../../../packages/deep-research-pack/src/lib/workspace/runs-catalog.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

function makeMemoryRunSource(tree, errors = {}) {
  const nodeAt = (rel) => {
    const norm = rel === '.' || rel === '' ? [] : rel.split('/').filter(Boolean)
    let cur = tree
    for (const seg of norm) {
      if (cur === null || typeof cur !== 'object' || !(seg in cur)) return undefined
      cur = cur[seg]
    }
    return cur
  }
  return {
    async list(dir) {
      const key = dir === '' ? '.' : dir
      if (errors[key] === 'unreadable') return { ok: false, reason: 'unreadable', detail: `fail:${key}` }
      const target = nodeAt(dir)
      if (target === undefined || typeof target === 'string') {
        return { ok: false, reason: 'missing', detail: `missing:${key}` }
      }
      return {
        ok: true,
        value: Object.entries(target).map(([name, val]) => ({
          name,
          type: typeof val === 'string' ? 'file' : 'directory',
        })),
      }
    },
    async read(path, opts = { offset: 1, limit: 500 }) {
      if (errors[path] === 'unreadable') return { ok: false, reason: 'unreadable', detail: `fail:${path}` }
      const val = nodeAt(path)
      if (typeof val !== 'string') return { ok: false, reason: 'missing', detail: `missing:${path}` }
      const lines = val.split('\n')
      const start = Math.max(0, (opts.offset ?? 1) - 1)
      const slice = lines.slice(start, start + (opts.limit ?? 500))
      return {
        ok: true,
        value: {
          text: slice.join('\n'),
          lines: slice.length,
          eof: start + slice.length >= lines.length,
        },
      }
    },
    async version() {
      return { ok: false, reason: 'missing' }
    },
  }
}

test('BUILT_IN_LENSES 与 content/lenses/*.md 一一对应（8 个）', () => {
  const onDisk = readdirSync(join(ROOT, 'packages/deep-research-pack/content/lenses'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .sort()
  const exported = BUILT_IN_LENSES.map((l) => l.id).sort()
  assert.deepEqual(exported, onDisk)
  for (const lens of BUILT_IN_LENSES) {
    assert.ok(lens.pairsWith.length > 0)
  }
})

test('scanRunsCatalog：扫描三位置、提取 question 标题、证据计数与最高版本', async () => {
  const source = makeMemoryRunSource({
    drt_active: {
      'question.md': '# Question\n评估 PostgreSQL vs DuckDB 在本地 OLAP 中的延迟。\n',
      evidence: { 'e1.md': 'ok', 'e2.md': 'ok', '_failed.md': 'skip' },
      final: { 'v1.md': 'draft1', 'v2.md': 'draft2', 'readable-v2.md': 'r2' },
      'final.md': 'main final',
      'delivered.json': '{"ok":true}',
      'review.md': '# Review\nreadiness: PASS\n',
      review: {
        'readiness.json': JSON.stringify({
          version: 2,
          readiness: 'PASS',
          conditional: false,
          counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 },
        }),
      },
    },
    archive: {
      drt_done: {
        'question.md': '# Topic\n归档研究项目\n',
        evidence: { 'a1.md': 'card' },
      },
    },
    _abandoned: {
      drt_old: {
        'question.md': '# Old\n停放研究\n',
      },
    },
  })

  const result = await scanRunsCatalog(source)
  assert.deepEqual(result.dirErrors, [])
  assert.equal(result.runs.length, 3)

  const active = result.runs.find((r) => r.slug === 'active')
  assert.equal(active?.location, 'active')
  assert.equal(active?.status, 'delivered')
  assert.equal(active?.title, '评估 PostgreSQL vs DuckDB 在本地 OLAP 中的延迟。')
  assert.equal(active?.evidenceCount, 2)
  assert.equal(active?.latestFinalVersion, 2)
  assert.equal(active?.latestReaderVersion, 2)
  assert.equal(active?.reviewVerdict, 'pass')
  assert.equal(active?.hasFinalMd, true)

  const done = result.runs.find((r) => r.slug === 'done')
  assert.equal(done?.location, 'archive')
  assert.equal(done?.status, 'archived')

  const old = result.runs.find((r) => r.slug === 'old')
  assert.equal(old?.location, 'abandoned')
  assert.equal(old?.status, 'abandoned')
})

test('scanRunsCatalog：可选桶缺失不报错；目录或关键读失败诚实标记 unreadable', async () => {
  const source = makeMemoryRunSource(
    {
      drt_broken: {
        'question.md': '# Q\n损坏测试\n',
        evidence: { 'e1.md': 'x' },
      },
    },
    {
      archive: 'unreadable',
      'drt_broken/evidence': 'unreadable',
    },
  )

  const result = await scanRunsCatalog(source)
  assert.equal(result.dirErrors.length, 1)
  assert.equal(result.dirErrors[0].location, 'archive')
  assert.equal(result.runs.length, 1)
  assert.equal(result.runs[0].status, 'unreadable')
  assert.equal(result.runs[0].evidenceCount, null)
  assert.match(result.runs[0].error ?? '', /fail:drt_broken\/evidence/)
})

test('filterRunsCatalog 与 filterLenses：按关键词与位置过滤', async () => {
  const source = makeMemoryRunSource({
    drt_alpha: { 'question.md': 'Alpha 研究' },
    archive: { drt_beta: { 'question.md': 'Beta 调研' } },
  })
  const { runs } = await scanRunsCatalog(source)
  assert.equal(filterRunsCatalog(runs, 'alpha').length, 1)
  assert.equal(filterRunsCatalog(runs, '', 'archive').length, 1)
  assert.equal(filterLenses(BUILT_IN_LENSES, 'adversarial').length, 2) // adversarial + quant pairsWith
  assert.equal(filterLenses(BUILT_IN_LENSES, 'regulatory').length, 1)
  assert.equal(filterLenses(BUILT_IN_LENSES, '监管', (l) => (l.id === 'regulatory' ? '监管与合规' : '')).length, 1)
})
