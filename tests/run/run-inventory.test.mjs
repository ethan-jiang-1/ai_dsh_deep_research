// run-inventory 纯函数回归 — 只读保留期视图（数量/大小/最老日期），不做删除。
// 反证 2026-10-27：把 totals.bytes 改成只加第一项 / 把 oldest 取成最新 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatAge, formatBytes, summarizeRuns } from '../../scripts/lib/run-inventory-core.mjs'

const day = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-10-27T00:00:00Z')

test('summarizeRuns：逐 run 计数/字节/最老，合计与最老跨 run 取最小', () => {
  const summary = summarizeRuns({
    now: NOW,
    runs: [
      { slug: 'b', bucket: 'root', files: [{ size: 100, mtimeMs: NOW - 2 * day }, { size: 50, mtimeMs: NOW - day }] },
      { slug: 'a', bucket: 'archive', files: [{ size: 200, mtimeMs: NOW - 10 * day }] },
      { slug: 'c', bucket: 'abandoned', files: [] },
    ],
  })
  assert.deepEqual(summary.totals, { runs: 3, files: 3, bytes: 350 })
  assert.deepEqual(summary.runs.map((r) => r.slug), ['a', 'b', 'c'], '按最老排序（旧的在前）')
  assert.equal(summary.runs[0].oldestMtimeMs, NOW - 10 * day)
  assert.equal(summary.runs[0].ageDays, 10)
  assert.equal(summary.runs[2].files, 0)
})

test('formatBytes：B/KiB/MiB 边界与小数', () => {
  assert.equal(formatBytes(0), '0 B')
  assert.equal(formatBytes(1023), '1023 B')
  assert.equal(formatBytes(1024), '1.0 KiB')
  assert.equal(formatBytes(1024 * 1024 * 2.5), '2.5 MiB')
})

test('formatAge：天/年与未知', () => {
  assert.equal(formatAge(0), '今天')
  assert.equal(formatAge(1), '1 天')
  assert.equal(formatAge(365), '1.0 年')
  assert.equal(formatAge(null), '—')
})
