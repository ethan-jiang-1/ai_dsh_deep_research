#!/usr/bin/env node
// path-hygiene.mjs — run bundle 移交前的本机 home 路径检查（keyless，只读）。
//
// 扫描 final/、acceptance.md、delivered.json、manifest.json、audit.md、node-gate.md、provenance/；
// 默认发现即 exit 1（新 run 的合同）；`--allow-legacy` 对旧 bundle 只报告不计红（D28 epoch 豁免）。
//
// 用法：node scripts/run-gates/path-hygiene.mjs <bundleDir> [--allow-legacy]
// 退出码：0 干净或已显式豁免 / 1 发现路径 / 2 前置缺席（未跑 ≠ 通过）
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { scanHomePaths } from '../lib/path-hygiene.mjs'

const args = process.argv.slice(2)
const bundleArg = args.find((a) => !a.startsWith('--'))
const allowLegacy = args.includes('--allow-legacy')
if (bundleArg === undefined) {
  console.error('path-hygiene: 需要 <bundleDir>（可用 --allow-legacy 豁免旧场）')
  process.exit(2)
}
const root = resolve(bundleArg)
if (!existsSync(root)) {
  console.error(`path-hygiene: bundle 不存在：${root}`)
  process.exit(2)
}

const files = []
const add = (rel) => { if (existsSync(join(root, rel))) files.push(rel) }
for (const rel of ['final.md', 'acceptance.md', 'delivered.json', 'manifest.json', 'audit.md', 'node-gate.md']) add(rel)
if (existsSync(join(root, 'final'))) {
  for (const name of readdirSync(join(root, 'final')).filter((n) => n.endsWith('.md'))) files.push(`final/${name}`)
}
if (existsSync(join(root, 'provenance'))) {
  for (const name of readdirSync(join(root, 'provenance')).filter((n) => n.endsWith('.json'))) files.push(`provenance/${name}`)
}

const entries = files.map((rel) => ({ path: rel, text: readFileSync(join(root, rel), 'utf8') }))
const findings = scanHomePaths(entries)
for (const f of findings) console.log(`${f.path}:${f.line}  ${f.text}`)
if (findings.length === 0) {
  console.log(`path-hygiene: 干净（${files.length} 个文件）`)
  process.exit(0)
}
if (allowLegacy) {
  console.log(`path-hygiene: ${findings.length} 处本机 home 路径（--allow-legacy 豁免，旧 bundle 报告）`)
  process.exit(0)
}
console.error(`path-hygiene: ${findings.length} 处本机 home 路径——移交前改为相对路径或脱敏（旧 bundle 可加 --allow-legacy）`)
process.exit(1)
