#!/usr/bin/env node
// protocol-audit —— run bundle 的 Protocol（研究设计）审计（keyless：纯 fs；无会话、无模型）。
//
// 为什么存在：HITL1 卡批的是设计，交付时却只看证据——没有机器判据证明「设计对象在场、字段自洽、
// 投影一致、版本没被静默改」。本工具把 `protocol.json` + `question.md §Protocol` + `plan.md` 头 +
// `topics.md` 的 lens 计数 + `protocol-audit.md` 的版本指纹对成可复算的记录。
//
// 判据正本 = `scripts/lib/protocol-core.mjs`（tests 直调）；本文件 = CLI 壳 + bundle 读取 + 报告渲染。
// 契约 = 核验 §6 + 表达层补篇 §4–§7；epoch = PROTOCOL_CONTRACT_DATE（旧 bundle 不判红）。
//
// 不证明：quote/claim/coverage/output 终稿语义、source_scope 与方法四字段的语义一致（critic / 人）；
// 也不做运行时 veto——事后检测，改盘仍可能发生。
//
// 用法：node scripts/run-gates/protocol-audit.mjs <run-bundle-dir> [--write|--no-write] [--require]
// 退出码：0 = 绿（含 legacy-not-applicable）；1 = 红；2 = 用法/前置（bundle 不在场）。
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { epochDateOf, runType } from '../lib/schema-scan-core.mjs'
import { PROTOCOL_CONTRACT_DATE, designSha256, preContractByDelivery } from '../lib/protocol-core.mjs'
import { evaluateBundle, requiredByProtocolContract } from '../lib/protocol-audit-core.mjs'
import { isMain } from '../lib/cli-entry.mjs'

const readIf = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '')
const versionOf = (protocol) => (typeof protocol?.version === 'number' ? protocol.version : null)

/** 读 protocol.json；缺失 → { protocol: null }；解析失败 → { error }（红，不抛）。 */
function readProtocol(bundle) {
  const path = join(bundle, 'protocol.json')
  if (!existsSync(path)) return { protocol: null }
  try {
    return { protocol: JSON.parse(readFileSync(path, 'utf8')) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

/** delivered.json 的 acceptedAt（交付时事实）；缺席 / 坏 JSON → null（不猜）。 */
function acceptedAtOf(bundle) {
  const text = readIf(join(bundle, 'delivered.json'))
  if (text === '') return null
  try {
    const value = JSON.parse(text)?.acceptedAt
    return typeof value === 'string' && value.trim() !== '' ? value : null
  } catch {
    return null
  }
}

/** 版本指纹行（旧行保留；同版本不同 hash = 红，由 core 判）。
 *  不用正则解析版本号：scripts 的 vN 正则只许来自 pack final-target（final-version 漂移锁）。 */
function versionLinesOf(auditText) {
  const lines = []
  const marker = ' design_sha256='
  for (const line of String(auditText ?? '').split('\n')) {
    const index = line.indexOf(marker)
    if (index < 1 || !line.startsWith('v')) continue
    const version = Number(line.slice(1, index))
    const hash = line.slice(index + marker.length).trim()
    if (!Number.isInteger(version) || !/^[0-9a-f]{64}$/.test(hash)) continue
    lines.push({ version, hash })
  }
  return lines
}

function renderReport({ bundle, epoch, type, required, findings, version, hash }) {
  const slug = basename(bundle)
  const lines = [
    `# Protocol Audit — ${slug}`,
    '',
    '> 由 scripts/run-gates/protocol-audit.mjs 生成（Protocol 审计；不是研究内容）。',
    `> 契约日 ${PROTOCOL_CONTRACT_DATE}；bundle epoch = ${String(epoch)}；研究类型 = ${String(type)}；覆盖强制 = ${required ? '是' : '否（豁免）'}。`,
    '',
    '## 版本指纹',
    '',
  ]
  const old = versionLinesOf(readIf(join(bundle, 'protocol-audit.md')))
    .filter((item) => item.version !== version)
  for (const item of old.sort((a, b) => a.version - b.version)) lines.push(`v${item.version} design_sha256=${item.hash}`)
  if (hash !== null) lines.push(`v${version} design_sha256=${hash}`)
  lines.push('', '## 检查', '', '| code | level | detail |', '|---|---|---|')
  if (findings.length === 0) lines.push('| — | ok | 全部机械判据通过 |')
  for (const item of findings) lines.push(`| \`${item.code}\` | ${item.level} | ${item.message.replace(/\|/g, '\\|')} |`)
  lines.push('', '## 本工具不核（语义审归 critic 与人）', '')
  lines.push('- quote/claim/coverage 的质量；output 终稿是否真兑现（v2 机检）。')
  lines.push('- `source_scope` 与方法四字段的语义一致；`deviations` 是否完整（critic §4b）。')
  lines.push('- hash 不是审批证明；审批证明 = `§Decisions` 行 + `§Protocol` 投影 + `status=approved`。')
  lines.push('')
  return `${lines.join('\n')}\n`
}

// ── CLI ──
if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2)
  const KNOWN = new Set(['--write', '--no-write', '--require'])
  for (const arg of argv) {
    if (arg.startsWith('--') && !KNOWN.has(arg)) {
      console.error(`protocol-audit: 未知参数 ${arg}（支持 --write / --no-write / --require）`)
      process.exit(2)
    }
  }
  const positional = argv.filter((arg) => !arg.startsWith('--'))
  const bundleArg = positional[0]
  if (bundleArg === undefined) {
    console.error('protocol-audit: 用法 node scripts/run-gates/protocol-audit.mjs <run-bundle-dir> [--write|--no-write] [--require]')
    process.exit(2)
  }
  const bundle = resolve(bundleArg)
  if (!existsSync(bundle)) {
    console.error(`protocol-audit: bundle 不在场：${bundle}`)
    process.exit(2)
  }
  const write = argv.includes('--write') && !argv.includes('--no-write')
  const legacy = !existsSync(join(bundle, 'run.md'))
  const epoch = legacy ? null : epochDateOf(bundle)
  const acceptedAt = acceptedAtOf(bundle)
  const type = runType(bundle)
  // 断代：交付回执时刻优先于日粒度 created（同日早场不追溯适用新契约）；无回执 → 日期口径从严。
  const required = requiredByProtocolContract({
    hasRunMd: !legacy,
    epoch,
    acceptedAt,
    forced: argv.includes('--require'),
  })

  if (!required) {
    const reason = !legacy && preContractByDelivery({ acceptedAt }) === true
      ? `交付回执早于契约落地时刻（acceptedAt=${acceptedAt}）`
      : legacy ? '旧 bundle 无 run.md' : `契约日前（epoch=${String(epoch)}）`
    console.log(`protocol-audit: 不适用（${reason}）——Protocol 不判，未写报告`)
    process.exit(0)
  }

  const { protocol, error } = readProtocol(bundle)
  if (error !== undefined) {
    console.log(`protocol-audit: RED（1 项）`)
    console.log(`  [protocol-schema] protocol.json 无法解析：${error}`)
    process.exit(1)
  }
  const version = versionOf(protocol)
  const snapshotPath = version !== null && version > 1 ? join(bundle, 'protocol', `v${version - 1}.json`) : null
  const hasSnapshot = snapshotPath !== null && existsSync(snapshotPath)
  let snapshot = null
  if (hasSnapshot && snapshotPath !== null) {
    try { snapshot = JSON.parse(readIf(snapshotPath)) } catch { snapshot = null }
  }
  const findings = evaluateBundle({
    protocol,
    questionText: readIf(join(bundle, 'question.md')),
    planText: readIf(join(bundle, 'plan.md')),
    topicsText: readIf(join(bundle, 'topics.md')),
    auditText: readIf(join(bundle, 'protocol-audit.md')),
    hasSnapshot,
    snapshot,
    legacy: false,
  })
  const problems = findings.filter((item) => item.level === 'red')
  const warnings = findings.filter((item) => item.level === 'warning')
  for (const warning of warnings) console.log(`  warn [${warning.code}] ${warning.message}`)
  if (problems.length > 0) {
    console.log(`protocol-audit: RED（${problems.length} 项）`)
    for (const problem of problems) console.log(`  [${problem.code}] ${problem.message}`)
    process.exit(1)
  }
  const hash = designSha256(protocol)
  if (write) {
    const out = join(bundle, 'protocol-audit.md')
    writeFileSync(out, renderReport({ bundle, epoch, type, required, findings, version, hash }))
    console.log(`protocol-audit: PASS（v${version} / ${hash.slice(0, 12)}…）→ ${out}`)
  } else {
    console.log(`protocol-audit: PASS（v${version} / ${hash.slice(0, 12)}…）— 报告未写（--write 才落盘）`)
  }
  process.exit(0)
}
