#!/usr/bin/env node
// run-accept.mjs — 操作侧交付验收的单一原子动作：门 A + 证据审计 + 未来日期 sanity → 验收回执/归档。
//
// 为什么存在（2026-10-20 审计 P0-2）：两个 bundle 已过 HITL2/present/final/v1，却因缺 audit.md
// 被门 A 判 RED；观察面/会话侧按"已交付"结束，生命周期里没有"待操作侧验收"这一格。本工具把
// 三件事绑在一起：node-gate（交付两门/门A）+ evidence-audit（溯源 + audit.md）+ 日期 sanity；
// 绿才写 acceptance.md，--archive 才移入 archive/drt_<slug>/。
//
// 用法：source dev/env.sh && node scripts/run-ops/run-accept.mjs <bundle> [--sessions <dir>] [--archive]
//       预检用 --no-write（默认只读）；绿后本工具显式给两个门 --write 落盘，再写 delivered.json/manifest.json/acceptance.md。
// 退出码：0 = 验收绿（已写 acceptance.md）；1 = 验收红；2 = 用法/前置。
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { futureDateFindings } from '../lib/bundle-date-sanity.mjs'
import { presentedInLogs } from '../lib/node-gate-session-gates.mjs'
import { contractEpochOf } from '../lib/schema-scan-core.mjs'
import { buildDelivered, buildManifest, corpusRootLabel, renderAcceptance, shouldWriteReceipts } from '../lib/run-receipt.mjs'
import { readZstdText } from '../lib/zstd-read.mjs'

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

const readLog = (p) => {
  if (!p.endsWith('.zstd')) {
    try { return readFileSync(p, 'utf8') } catch { return '' }
  }
  const r = readZstdText(p)
  return r.ok ? r.text : ''
}

// 预检：门禁/审计都 --no-write；红跑不写 bundle（observation 只读）。
const preGate = run('node-gate 预检（--no-write）', 'scripts/run-gates/node-gate.mjs', [bundle, '--sessions', sessions, '--no-write'])
const preAudit = run('evidence-audit 预检（--no-write）', 'scripts/run-gates/evidence-audit.mjs', [bundle, '--sessions', sessions, '--no-write'])
const dates = futureDateFindings(bundle)
const datesOk = dates.length === 0
if (!datesOk) {
  console.log(`  FAIL 日期 sanity：${dates.length} 处未来日期`)
  for (const f of dates.slice(0, 12)) console.log(`    - ${f.file} ${f.field} = ${f.date}（${f.detail}）`)
  if (dates.length > 12) console.log(`    … 另 ${dates.length - 12} 处`)
} else {
  console.log('  PASS 日期 sanity（evidence retrieved_at + journal/question 行首日期）')
}
const preGreen = preGate.status === 0 && preAudit.status === 0 && datesOk
if (!preGreen) {
  console.error(`run-accept: RED（${slug}）——预检未过；未写 acceptance.md/audit.md/node-gate.md/delivered.json，未归档。先修红项再跑同一条`)
  process.exit(1)
}

// 绿后才落盘：真实门禁/审计 + 回执。
const gate = run('node-gate（门 A/交付两门）', 'scripts/run-gates/node-gate.mjs', [bundle, '--sessions', sessions, '--write'])
const audit = run('evidence-audit（溯源 + audit.md）', 'scripts/run-gates/evidence-audit.mjs', [bundle, '--sessions', sessions, '--write'])
const auditPath = join(bundle, 'audit.md')
const auditText = existsSync(auditPath) ? readFileSync(auditPath, 'utf8') : ''
const critical = /CRITICAL\s+(\d+)/.exec(auditText)?.[1] ?? null
const green = gate.status === 0 && audit.status === 0
if (!green) {
  console.error(`run-accept: RED（${slug}）——预检绿但落盘门禁/审计失败；未写 acceptance.md/delivered.json`)
  process.exit(1)
}

const stamp = new Date().toISOString()
// 回执的语料根写可复算标签（$DSH_HOME 相对形式），绝对路径只留控制台——回执不得自带换机即断的路径，
// 也不得踩 D28 卫生门（acceptance.md 是 ops 生成物，但内容仍要干净）。
const corpusRoot = corpusRootLabel(sessions, { home })
const legacy = !shouldWriteReceipts(bundle)
const finalDir = join(bundle, 'final')
const versions = existsSync(finalDir)
  ? readdirSync(finalDir).filter((f) => /^v\d+\.md$/.test(f)).map((f) => Number(/^v(\d+)/.exec(f)[1])).sort((a, b) => a - b)
  : []
const finalVersion = versions.at(-1) ?? null
const presented = presentedInLogs(sessions, slug, readLog, { contract: contractEpochOf(bundle) || null })
let delivered = null
if (legacy) {
  console.log('  note 旧契约 bundle（无 run.md）：只写 acceptance.md，不补 delivered.json/manifest.json（D28 epoch 豁免）')
} else {
  delivered = buildDelivered({
    slug,
    bundleDir: bundle,
    corpusRoot,
    acceptedAt: stamp,
    presented: presented.status === 'FOUND' ? presented.events : [],
  })
  writeFileSync(join(bundle, 'delivered.json'), JSON.stringify(delivered, null, 2) + '\n')
  console.log(`  PASS delivered.json 已写（final ${delivered.final.version === null ? '—' : `v${delivered.final.version}`} / present ${delivered.present?.path ?? '—'}）：${join(bundle, 'delivered.json')}`)
  const manifest = buildManifest({ slug, bundleDir: bundle, contract: contractEpochOf(bundle) ?? null, generatedAt: stamp })
  writeFileSync(join(bundle, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`  PASS manifest.json 已写（${manifest.files.length} 条文件角色/哈希）：${join(bundle, 'manifest.json')}`)
}

const acceptance = renderAcceptance({
  slug,
  stamp,
  critical,
  finalVersion,
  present: delivered?.present ?? null,
  corpusRoot,
  legacy,
})
writeFileSync(join(bundle, 'acceptance.md'), acceptance)
console.log(`  PASS acceptance.md 已写：${join(bundle, 'acceptance.md')}（语料根标签 ${corpusRoot}；绝对根 ${sessions}）`)
if (presented.status !== 'FOUND') console.log(`  note present 见证未取到：${presented.detail}（回执 present 记 null，不猜）`)

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
