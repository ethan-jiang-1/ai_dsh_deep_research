// client-file-size.spec.mjs — 驾驶舱 client 单文件行数上限（2026-11-03 审计 D2 的机械守卫）。
//
// 为什么需要：本仓的 client 是"一个功能一个组件"的写法，历史上 `MethodLibraryView` 长到
// 1336 行、`client/index.ts` 612 行，改动一次要跨 30+ state。拆分后必须有守卫，否则回涨。
// 上限 500 行（含注释；空行计入）——超过就把职责抽成 hook/子组件/module，不要抬上限。
// 反证：给任一文件追加 ≥30 行注释 → 本测试点名该文件（红），删掉恢复绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CLIENT = join(ROOT, 'packages', 'deep-research-pack', 'src', 'client')
const MAX_LINES = 500

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = join(dir, entry.name)
  if (entry.isDirectory()) return walk(full)
  return /\.tsx?$/.test(entry.name) ? [full] : []
})

test(`client 单文件 ≤ ${MAX_LINES} 行（超过 = 抽 hook/子组件，不抬上限）`, () => {
  const files = walk(CLIENT)
  assert.ok(files.length >= 20, `防空语料：只找到 ${files.length} 个 client 文件`)
  const sizes = files.map((file) => {
    const text = readFileSync(file, 'utf8')
    const lines = text.endsWith('\n') ? text.split('\n').length - 1 : text.split('\n').length
    return { file: relative(ROOT, file), lines }
  }).sort((a, b) => b.lines - a.lines)
  const offenders = sizes.filter(({ lines }) => lines > MAX_LINES)
  assert.deepEqual(offenders, [], `超限文件（先抽职责再抬上限）：${offenders.map((o) => `${o.file}=${o.lines}`).join(', ')}`)
})
