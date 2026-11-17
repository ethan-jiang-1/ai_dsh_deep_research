#!/usr/bin/env node
// record-type-closure.mjs — 记录公开类型面的**可达相对闭包**（BUG-239；前序 BUG-219）。
// 用法：node tools/record/record-type-closure.mjs [--check]
// --check：重算并与 tests/fixtures/shipped/type-closure.json 比对；漂移 exit 1，不写盘。
// 前置：lib/types 已在位（先 pnpm build）——声明图只在构建产物上可读，缺席 exit 2（未跑 ≠ 通过）。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { typeClosureOf } from '../../checks/lib/repo/shipped-surface.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const OUT = join(ROOT, 'tests', 'fixtures', 'shipped', 'type-closure.json')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const exists = (rel) => existsSync(join(PACK, rel))
if (!exists('lib/types/index.d.ts')) {
  console.error('record-type-closure: lib/types 缺席——先 pnpm build；未跑 ≠ 通过')
  process.exit(2)
}
const closure = typeClosureOf(pkg, { read: (rel) => readFileSync(join(PACK, rel), 'utf8'), exists })
if (closure.unresolved.length > 0) {
  console.error('record-type-closure: 存在无法解析的相对 import：', closure.unresolved)
  process.exit(1)
}
const payload = {
  generatedBy: 'tools/record/record-type-closure.mjs',
  note: '公开类型面 = exports.types 的可达相对闭包（入口 + 相对 import 目标）；files 必须逐条列出；漂移 = 红。',
  entries: closure.entries,
  files: closure.files,
}
if (process.argv.includes('--check')) {
  let current = null
  try { current = JSON.parse(readFileSync(OUT, 'utf8')) } catch { /* 缺失按漂移处理 */ }
  if (JSON.stringify(current?.files) !== JSON.stringify(payload.files) || JSON.stringify(current?.entries) !== JSON.stringify(payload.entries)) {
    console.error('record-type-closure: 漂移——重跑 node tools/record/record-type-closure.mjs')
    process.exit(1)
  }
  console.log(`type-closure: up to date（${payload.files.length} 文件）`)
} else {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`wrote ${OUT}（${payload.files.length} 文件：${payload.entries.length} 入口 + ${payload.files.length - payload.entries.length} 依赖）`)
}
