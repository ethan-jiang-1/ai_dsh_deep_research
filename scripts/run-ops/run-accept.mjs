#!/usr/bin/env node
// run-accept.mjs — 操作侧交付验收的单一原子动作：门 A + 证据审计 + 未来日期 sanity → 验收回执/归档。
//
// 为什么存在（2026-10-20 审计 P0-2）：两个 bundle 已过 HITL2/present/final/v1，却因缺 audit.md
// 被门 A 判 RED；观察面/会话侧按"已交付"结束，生命周期里没有"待操作侧验收"这一格。本工具把
// 三件事绑在一起：node-gate（交付两门/门A）+ evidence-audit（溯源 + audit.md）+ 日期 sanity；
// 绿才写 acceptance.md，--archive 才移入 archive/drt_<slug>/。
//
// 用法：source dev/env.sh && node scripts/run-ops/run-accept.mjs <bundle> [--sessions <dir>] [--archive] [--repair]
//       `--no-write` = 只跑预检、不写 bundle（绿也退出 0）；不带它则绿后给两个门 --write 落盘，
//       再写 delivered.json/manifest.json/acceptance.md；`--archive` 才移入 archive/。
// 退出码：0 = 验收绿（或 --no-write 预检绿）；1 = 验收红；2 = 用法/前置/未知参数。
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { futureDateFindings } from '../lib/bundle-date-sanity.mjs'
import { scanHomePaths } from '../lib/path-hygiene.mjs'
import { formatSecretFinding, scanSecrets } from '../lib/secret-scan.mjs'
import { presentedInLogs } from '../lib/node-gate-session-gates.mjs'
import { epochDateOf, runSchemaOf } from '../lib/schema-scan-core.mjs'
import { buildDelivered, buildManifest, corpusRootLabel, renderAcceptance, repairReceiptPaths, sha256Text, shouldWriteReceipts } from '../lib/run-receipt.mjs'
import { readZstdText } from '../lib/zstd-read.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const argv = process.argv.slice(2)
const opt = (name, fallback = undefined) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}
const flag = (name) => argv.includes(name)
// 未知参数必须红（曾静默忽略 --no-write/session 拼错：用户以为只读，实际已写盘）。
const KNOWN_FLAGS = new Set(['--archive', '--repair', '--no-write', '--help'])
const KNOWN_OPTS = new Set(['--sessions'])
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i]
  if (!a.startsWith('--')) continue
  if (KNOWN_FLAGS.has(a)) continue
  if (KNOWN_OPTS.has(a)) { i += 1; continue }
  console.error(`run-accept: 未知参数 ${a}（支持 --sessions <dir> / --archive / --repair / --no-write）`)
  process.exit(2)
}
const positional = argv.filter((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--sessions')
const bundleArg = positional[0]
if (bundleArg === undefined || flag('--help')) {
  console.error('run-accept: 用法 node scripts/run-ops/run-accept.mjs <bundle> [--sessions <dir>] [--archive] [--repair]')
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
const legacy = !shouldWriteReceipts(bundle)
// 历史回执修复（BUG-044）：旧 run-accept 把 present 绝对路径写进了 delivered/acceptance/node-gate。
// 显式 --repair 才动，且只动可再生产物；修完照常走预检，红项仍需操作者修。
if (flag('--repair')) {
  const repaired = repairReceiptPaths(bundle)
  if (!repaired.ok) {
    console.error(`run-accept: repair 失败——${repaired.reason}（未做部分修改）`)
    process.exit(1)
  }
  for (const action of repaired.actions) console.log(`  REPAIR ${action}`)
  if (repaired.actions.length === 0) console.log('  note 回执无需修复（已是可移植形态）')
}

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
// 交付门：新 bundle 的本机 home 路径必须为零；旧契约 bundle 按 D28 epoch 豁免只报告。
const preHygiene = run('path-hygiene 预检（交付门）', 'scripts/run-gates/path-hygiene.mjs', [bundle, ...(legacy ? ['--allow-legacy'] : [])])
const preSecret = run('secret-scan 预检（交付物）', 'scripts/run-gates/secret-scan.mjs', [bundle, ...(legacy ? ['--allow-legacy'] : [])])
const dates = futureDateFindings(bundle)
const datesOk = dates.length === 0
if (!datesOk) {
  console.log(`  FAIL 日期 sanity：${dates.length} 处未来日期`)
  for (const f of dates.slice(0, 12)) console.log(`    - ${f.file} ${f.field} = ${f.date}（${f.detail}）`)
  if (dates.length > 12) console.log(`    … 另 ${dates.length - 12} 处`)
} else {
  console.log('  PASS 日期 sanity（evidence retrieved_at + journal/question 行首日期）')
}
const preGreen = preGate.status === 0 && preAudit.status === 0 && preHygiene.status === 0 && preSecret.status === 0 && datesOk
if (!preGreen) {
  console.error(`run-accept: RED（${slug}）——预检未过；未写 acceptance.md/audit.md/node-gate.md/delivered.json，未归档。先修红项再跑同一条`)
  process.exit(1)
}

// --no-write：预检绿即停，不落任何 bundle 文件（只读模式要有真实语义，不能靠"未知参数被忽略"）。
if (flag('--no-write')) {
  console.log(`run-accept: 预检绿（${slug}）——--no-write：未写 acceptance.md/audit.md/node-gate.md/delivered.json，未归档`)
  process.exit(0)
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
// 落盘后复检：node-gate.md / audit.md 是刚写的派生件，预检看不到它们。红了不写回执，
// 让操作者先修源文件——避免「回执干净、门禁文件带本机路径」的半绿态。
const postHygiene = run('path-hygiene 落盘后复检（门禁/审计生成物）', 'scripts/run-gates/path-hygiene.mjs', [bundle, ...(legacy ? ['--allow-legacy'] : [])])
const postSecret = run('secret-scan 落盘后复检（audit/node-gate）', 'scripts/run-gates/secret-scan.mjs', [bundle, ...(legacy ? ['--allow-legacy'] : [])])
if (postHygiene.status !== 0 || postSecret.status !== 0) {
  console.error(`run-accept: RED（${slug}）——落盘后发现本机绝对路径或高置信凭据；未写 acceptance.md/delivered.json`)
  process.exit(1)
}

const stamp = new Date().toISOString()
// 回执的语料根写可复算标签（$DSH_HOME 相对形式），绝对路径只留控制台——回执不得自带换机即断的路径，
// 也不得踩 D28 卫生门（acceptance.md 是 ops 生成物，但内容仍要干净）。
const corpusRoot = corpusRootLabel(sessions, { home })
const finalDir = join(bundle, 'final')
const versions = existsSync(finalDir)
  ? readdirSync(finalDir).filter((f) => /^v\d+\.md$/.test(f)).map((f) => Number(/^v(\d+)/.exec(f)[1])).sort((a, b) => a - b)
  : []
const finalVersion = versions.at(-1) ?? null
const readerVersion = finalVersion !== null && existsSync(join(finalDir, `readable-v${finalVersion}.md`)) ? finalVersion : null
const presented = presentedInLogs(sessions, slug, readLog, { contract: epochDateOf(bundle) || null })
let delivered = null
let deliveredText = null
let manifestText = null
if (legacy) {
  console.log('  note 旧契约 bundle（无 run.md）：只写 acceptance.md，不补 delivered.json/manifest.json（D28 epoch 豁免）')
} else {
  // 见证会话 = present 事件所在会话（bundle → 语料的反查键；诊断入口要会话 id/标题）。
  const witness = [...new Set((presented.status === 'FOUND' ? presented.events : [])
    .map((e) => e.sessionId).filter((id) => typeof id === 'string' && id.length > 0))]
  delivered = buildDelivered({
    slug,
    bundleDir: bundle,
    corpusRoot,
    acceptedAt: stamp,
    presented: presented.status === 'FOUND' ? presented.events : [],
    witness,
  })
  if (delivered.present?.unportable === true) {
    console.error('run-accept: RED——deliverables/presented 指向 bundle 外，交付副本必须在 bundle 内（先把文件放进 final/ 再 present）；未写回执')
    process.exit(1)
  }
  deliveredText = JSON.stringify(delivered, null, 2) + '\n'
  const manifest = buildManifest({
    slug,
    bundleDir: bundle,
    contract: epochDateOf(bundle) ?? null,
    schema: runSchemaOf(bundle),
    generatedAt: stamp,
    extra: [{ path: 'delivered.json', role: 'delivery-receipt', sha256: sha256Text(deliveredText) }],
  })
  manifestText = JSON.stringify(manifest, null, 2) + '\n'
  console.log(`  PASS 回执已生成（final ${delivered.final.version === null ? '—' : `v${delivered.final.version}`} / reader ${readerVersion === null ? '—' : `v${readerVersion}`} / present ${delivered.present?.path ?? '—'} / manifest ${manifest.files.length} 条）`)
}

const acceptanceText = renderAcceptance({
  slug,
  stamp,
  critical,
  finalVersion,
  readableVersion: readerVersion,
  present: delivered?.present ?? null,
  corpusRoot,
  legacy,
})
// 写盘前校验**待写文本**（不是历史文件）：回执是最容易带进本机路径的地方。
const leaks = scanHomePaths([
  ...(deliveredText === null ? [] : [{ path: 'delivered.json', text: deliveredText }]),
  ...(manifestText === null ? [] : [{ path: 'manifest.json', text: manifestText }]),
  { path: 'acceptance.md', text: acceptanceText },
])
if (leaks.length > 0) {
  for (const leak of leaks) console.error(`  FAIL ${leak.path}:${leak.line}  ${leak.text}`)
  console.error('run-accept: RED——待写回执含本机绝对路径；未写盘（present 需指向 bundle 内文件）')
  process.exit(1)
}
const receiptSecrets = scanSecrets([
  ...(deliveredText === null ? [] : [{ path: 'delivered.json', text: deliveredText }]),
  ...(manifestText === null ? [] : [{ path: 'manifest.json', text: manifestText }]),
  { path: 'acceptance.md', text: acceptanceText },
])
if (receiptSecrets.length > 0) {
  for (const finding of receiptSecrets) console.error(`  FAIL ${formatSecretFinding(finding)}`)
  console.error('run-accept: RED——待写回执含高置信凭据；未写盘（值已隐去）')
  process.exit(1)
}
if (deliveredText !== null) writeFileSync(join(bundle, 'delivered.json'), deliveredText)
if (manifestText !== null) writeFileSync(join(bundle, 'manifest.json'), manifestText)
writeFileSync(join(bundle, 'acceptance.md'), acceptanceText)
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
