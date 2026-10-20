#!/usr/bin/env node
// run-accept.mjs — 操作侧交付验收的单一原子动作：门 A + 证据审计 + 未来日期 sanity → 验收回执/归档。
//
// 为什么存在（2026-10-20 审计 P0-2）：两个 bundle 已过 HITL2/present/final/v1，却因缺 audit.md
// 被门 A 判 RED；观察面/会话侧按"已交付"结束，生命周期里没有"待操作侧验收"这一格。本工具把
// 三件事绑在一起：node-gate（交付两门/门A）+ evidence-audit（溯源 + audit.md）+ 日期 sanity；
// 绿才写 acceptance.md，--archive 才移入 archive/drt_<slug>/。
//
// 用法：source dev/env.sh && node scripts/run-ops/run-accept.mjs <bundle> [--sessions <dir>] [--archive]
// 退出码：0 = 验收绿（已写 acceptance.md）；1 = 验收红；2 = 用法/前置。
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { futureDateFindings } from '../lib/bundle-date-sanity.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const argv = process.argv.slice(2)
const opt = (name, fallback = undefined) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}
const flag = (name) => argv.includes(name)
const positional = argv.filter((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--sessions')
const bundleArg = positional[0]
if (bundleArg === undefined || flag('--help')) {
  console.error('run-accept: 用法 node scripts/run-ops/run-accept.mjs <bundle> [--sessions <dir>] [--archive]')
  process.exit(2)
}
const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null
if (home === null) {
  console.error('run-accept: 未 source dev/env.sh（DSH_HOME 缺席）——先 source 再跑')
  process.exit(2)
}
const bundle = resolve(bundleArg)
if (!existsSync(bundle) || !statSync(bundle).isDirectory()) {
  console.error(`run-accept: bundle 不在场或不是目录：${bundle}`)
  process.exit(2)
}
const slug = basename(bundle)
if (!/^drt_[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error(`run-accept: bundle 目录名必须是 drt_<slug>：${slug}`)
  process.exit(2)
}
const wsRoot = dirname(bundle)
const sessions = opt('--sessions', join(home, 'sessions'))

const run = (label, script, args) => {
  const r = spawnSync(process.execPath, [join(ROOT, script), ...args], { cwd: ROOT, encoding: 'utf8', timeout: 300_000 })
  const tail = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-3).join(' | ')
  console.log(`  ${r.status === 0 ? 'PASS' : 'FAIL'} ${label} exit=${r.status}${tail === '' ? '' : `  ${tail.slice(0, 300)}`}`)
  return { label, status: r.status, output: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}

console.log(`run-accept: ${slug}`)
const gate = run('node-gate（门 A/交付两门）', 'scripts/run-gates/node-gate.mjs', [bundle])
const audit = run('evidence-audit（溯源 + audit.md）', 'scripts/run-gates/evidence-audit.mjs', [bundle, '--sessions', sessions])
const dates = futureDateFindings(bundle)
const auditPath = join(bundle, 'audit.md')
const auditText = existsSync(auditPath) ? readFileSync(auditPath, 'utf8') : ''
const critical = /CRITICAL\s+(\d+)/.exec(auditText)?.[1] ?? null
const datesOk = dates.length === 0
if (!datesOk) {
  console.log(`  FAIL 日期 sanity：${dates.length} 处未来日期`)
  for (const f of dates.slice(0, 12)) console.log(`    - ${f.file} ${f.field} = ${f.date}（${f.detail}）`)
  if (dates.length > 12) console.log(`    … 另 ${dates.length - 12} 处`)
} else {
  console.log('  PASS 日期 sanity（evidence retrieved_at + journal/question 行首日期）')
}
const green = gate.status === 0 && audit.status === 0 && datesOk
if (!green) {
  console.error(`run-accept: RED（${slug}）——未写 acceptance.md/未归档；先修红项再跑同一条`)
  process.exit(1)
}

const stamp = new Date().toISOString()
const acceptance = `# Acceptance — ${slug}（${stamp}）

> 由 scripts/run-ops/run-accept.mjs 生成（操作侧验收回执；不是研究内容）。
> 三件同次通过才写本文件：node-gate（门 A/交付两门）、evidence-audit（audit.md，CRITICAL ${critical ?? '—'}）、
> 日期 sanity（evidence retrieved_at + journal/question 行首；零未来日期）。

| 检查 | 结果 |
|---|---|
| node-gate | PASS（exit 0） |
| evidence-audit | PASS（exit 0；audit.md 在场，CRITICAL ${critical ?? '—'}） |
| 日期 sanity | PASS（零未来日期） |
| 会话语料根 | \`${sessions}\` |
`
writeFileSync(join(bundle, 'acceptance.md'), acceptance)
console.log(`  PASS acceptance.md 已写：${join(bundle, 'acceptance.md')}`)

if (flag('--archive')) {
  const archiveRoot = join(wsRoot, 'archive')
  const target = join(archiveRoot, slug)
  if (!existsSync(archiveRoot)) {
    console.error(`run-accept: archive/ 不在场：${archiveRoot}`)
    process.exit(2)
  }
  if (existsSync(target)) {
    console.error(`run-accept: 归档目标已存在，拒绝覆盖：${target}`)
    process.exit(1)
  }
  renameSync(bundle, target)
  console.log(`  PASS 已归档：${target}`)
} else {
  console.log('  note 未归档（加 --archive 才移入 archive/；先复核 acceptance.md）')
}
process.exit(0)
