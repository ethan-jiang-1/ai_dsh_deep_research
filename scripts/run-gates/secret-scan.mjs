#!/usr/bin/env node
// secret-scan.mjs — run bundle **交付物**里的高置信凭据形态（keyless，只读）。
//
// 默认只扫读者会拿到的面（final/、final.md、acceptance.md、delivered.json、manifest.json、
// audit.md、node-gate.md）；`--all` 才加 evidence/ 与研究过程件（证据里引用示例代码会误伤，
// 默认不把研究素材判红）。旧 bundle 可 `--allow-legacy` 只报告。
//
// 退出码：0 干净或显式豁免 / 1 发现高置信凭据 / 2 前置缺席（未跑 ≠ 通过）。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { formatSecretFinding, scanSecrets } from '../lib/secret-scan.mjs'

const args = process.argv.slice(2)
const bundleArg = args.find((a) => !a.startsWith('--'))
const allowLegacy = args.includes('--allow-legacy')
const all = args.includes('--all')
if (bundleArg === undefined) {
  console.error('secret-scan: 需要 <bundleDir> [--allow-legacy] [--all]')
  process.exit(2)
}
const root = resolve(bundleArg)
if (!existsSync(root)) {
  console.error(`secret-scan: bundle 不存在：${root}`)
  process.exit(2)
}

const files = []
const add = (rel) => { if (existsSync(join(root, rel))) files.push(rel) }
for (const rel of ['final.md', 'acceptance.md', 'delivered.json', 'manifest.json', 'audit.md', 'node-gate.md']) add(rel)
if (existsSync(join(root, 'final'))) {
  for (const name of readdirSync(join(root, 'final')).filter((n) => n.endsWith('.md'))) files.push(`final/${name}`)
}
if (all) {
  for (const rel of ['run.md', 'question.md', 'topics.md', 'plan.md', 'leads.md', 'findings.md', 'review.md', 'journal.md']) add(rel)
  for (const sub of ['evidence', 'provenance']) {
    if (!existsSync(join(root, sub))) continue
    for (const name of readdirSync(join(root, sub))) files.push(`${sub}/${name}`)
  }
}

const entries = files.map((rel) => ({ path: rel, text: readFileSync(join(root, rel), 'utf8') }))
const findings = scanSecrets(entries)
for (const finding of findings) console.log(formatSecretFinding(finding))
if (findings.length === 0) {
  console.log(`secret-scan: 干净（${String(entries.length)} 个文件${all ? '，含证据' : '，交付物面'}）`)
  process.exit(0)
}
if (allowLegacy) {
  console.log(`secret-scan: ${String(findings.length)} 处（旧 bundle 显式豁免，只报告）`)
  process.exit(0)
}
console.error(`secret-scan: ${String(findings.length)} 处高置信凭据——交付前删除/换成引用（${all ? '含证据' : '可用 --all 扫证据'}）`)
process.exit(1)
