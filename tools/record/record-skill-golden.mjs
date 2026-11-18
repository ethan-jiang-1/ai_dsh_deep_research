#!/usr/bin/env node
// record-skill-golden.mjs — 记录 skill 正文 sha256 金标准（BUG-258）。
// 用法：node tools/record/record-skill-golden.mjs [--check|--update]
// 默认 --update（写入 tests/fixtures/skill-golden/manifest.json）；--check 只比对，漂移 exit 1。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { skillBodyManifest, skillGoldenIssues } from '../../checks/lib/shared/skill-golden.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = join(ROOT, 'tests', 'fixtures', 'skill-golden', 'manifest.json')
const actual = skillBodyManifest(ROOT)
if (process.argv.includes('--check')) {
  let golden = null
  try { golden = JSON.parse(readFileSync(OUT, 'utf8')).skills } catch { /* 缺失按漂移处理 */ }
  const issues = skillGoldenIssues(actual, golden)
  if (issues.length > 0) {
    console.error(`record-skill-golden: 漂移（${issues.length}）——${issues.slice(0, 6).join('；')}`)
    process.exit(1)
  }
  console.log(`skill-golden: up to date（${actual.length} 份 SKILL.md）`)
} else {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, `${JSON.stringify({ generatedBy: 'tools/record/record-skill-golden.mjs', skills: actual }, null, 2)}\n`)
  console.log(`wrote ${OUT}（${actual.length} 份）`)
}
