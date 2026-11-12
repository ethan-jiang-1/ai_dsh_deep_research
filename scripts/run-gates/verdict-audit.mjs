#!/usr/bin/env node
// verdict-audit —— run bundle 的 claim 级裁决审计（keyless：纯 fs + 会话日志；claim 覆盖 / 原文一致 /
// child 身份与只读纪律）。契约正本 = `_backlog/_archived/research/quality-loop/2026-11-10-verdict-contract.md` §5。
//
// 为什么存在：`review.md` 的 `readiness: PASS` 是报告级 prose——机器读不出「每条关键结论被谁核过、
// 核成什么、裁决有没有被改」。本工具把 `review/claims.json` + `review/verdicts-r<N>.json` 对成
// 可复算的记录：覆盖（critical 全有结论性裁决）、值域、原文重解析、与 child 会话逐字比对、验证者没写盘。
//
// 不证明：quote 是否真支持 claim、claim 表是否漏了关键句、source tier 配不配、readiness 整篇判断
// （语义审归 critic 与人）；也不做运行时 veto——事后检测，改盘仍可能发生。
// 豁免：旧 bundle（无 run.md）与 quick_factual 编制、以及 claim 契约日前的 bundle 不判红（epoch）；
//       quick_factual 与「无 claims/verdicts」的旧场只打 legacy-not-applicable 注记，exit 0。
//
// 分层同 evidence-audit：判据核住 `scripts/lib/verdict-audit-core.mjs`（tests 直调），本文件 = CLI 壳 +
// 会话日志 reader 注入 + 报告渲染。
// 用法：node scripts/run-gates/verdict-audit.mjs <run-bundle-dir> [--sessions <会话根>] [--write|--no-write] [--require]
//       缺省 sessions = $DSH_HOME/sessions；默认只读，--write 才落 review/verdict-audit-r<N>.md。
// 退出码：0 = 绿（含豁免/不适用）；1 = 红；2 = 用法/前置（未 source、bundle 不在场、日志根不存在）。
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { finalVersionsIn } from '../lib/final-version.mjs'
import { epochDateOf, runType } from '../lib/schema-scan-core.mjs'
import { findSessionDir, resolveSessionLog } from '../lib/session-log.mjs'
import { auditClaimVerdicts, CLAIMS_CONTRACT_DATE, parseClaims, parseSessionFacts, parseVerdicts } from '../lib/verdict-audit-core.mjs'
import { readZstdText } from '../lib/zstd-read.mjs'
import { isMain } from '../lib/cli-entry.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** 读一个会话日志文件（.jsonl 直读 / .jsonl.zstd 走 zstd CLI）。失败返回 null（调用方按日志不可读处理）。 */
function readLog(path) {
  if (!path.endsWith('.zstd')) {
    try { return readFileSync(path, 'utf8') } catch { return null }
  }
  const r = readZstdText(path)
  if (!r.ok) {
    console.error(`verdict-audit: 日志解压失败（跳过该会话，原文一致性未核）：${path}`)
    return null
  }
  return r.text
}

/** 会话事实：定位 + 解压（fs/zstd 归壳），解析归 lib（tests 用真实日志夹具直测）。 */
function sessionFacts(sessionsRoot, sessionId) {
  const dir = findSessionDir(sessionsRoot, sessionId)
  if (dir === null) return undefined
  const logPath = resolveSessionLog(dir)
  if (logPath === null) return undefined
  const text = readLog(logPath)
  if (text === null) return undefined
  return parseSessionFacts(text)
}

/** `review/verdicts-r<N>.json` 枚举（按 N 升序）；无名/不合规的文件不管（它们不是本契约工件）。 */
function verdictRounds(bundleDir) {
  const dir = join(bundleDir, 'review')
  if (!existsSync(dir)) return []
  const rounds = []
  for (const name of readdirSync(dir)) {
    const m = /^verdicts-r(\d+)\.json$/.exec(name)
    if (m === null) continue
    rounds.push({ round: Number(m[1]), path: join(dir, name) })
  }
  return rounds.sort((a, b) => a.round - b.round)
}

const readIf = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null)

/** 报告渲染（--write 时落 review/verdict-audit-r<N>.md）。 */
function renderReport({ bundle, rounds, required, epoch, type, stats, problems, warnings }) {
  const lines = []
  lines.push(`# Verdict Audit — ${bundle.split('/').at(-1)}`)
  lines.push('')
  lines.push(`> 由 scripts/run-gates/verdict-audit.mjs 生成（claim 级裁决审计；不是研究内容）。`)
  lines.push(`> 契约日 ${CLAIMS_CONTRACT_DATE}；bundle epoch = ${String(epoch)}；研究类型 = ${String(type)}；覆盖强制 = ${required ? '是' : '否（豁免）'}。`)
  lines.push('')
  lines.push('| 检查 | 结果 |')
  lines.push('|---|---|')
  lines.push(`| 覆盖 | claims ${stats.claims} · critical ${stats.critical} · 有结论性裁决 ${stats.covered} · UNVERIFIED ${stats.unverified} · unsupported ${stats.unsupported} |`)
  lines.push(`| 轮次 | ${rounds.length === 0 ? '—' : `r${rounds.join('、r')}`} |`)
  lines.push(`| 裁决条目 | ${stats.verdicts} |`)
  lines.push(`| claims.json sha256 | ${stats.claimsSha256 ?? '—'} |`)
  for (const item of stats.verdictsSha256) lines.push(`| verdicts-r${item.round}.json sha256 | ${item.sha256} |`)
  lines.push('')
  lines.push('## 发现（红）')
  lines.push('')
  if (problems.length === 0) lines.push('（无）')
  else for (const problem of problems) lines.push(`- \`${problem.code}\` ${problem.detail}`)
  lines.push('')
  lines.push('## 提醒（黄）')
  lines.push('')
  if (warnings.length === 0) lines.push('（无）')
  else for (const warning of warnings) lines.push(`- \`${warning.code}\` ${warning.detail}`)
  lines.push('')
  lines.push('## 本工具不核（语义审归 critic 与人）')
  lines.push('')
  lines.push('- quote 是否真的支持 claim；claim 表是否漏了关键句；source tier 配不配；readiness 的整篇判断。')
  lines.push('- 会话日志不可读时只核文件自洽（`session-missing`），不假装核过原文。')
  lines.push('')
  return `${lines.join('\n')}\n`
}

// ── CLI ──
if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2)
  const noWrite = !argv.includes('--write') || argv.includes('--no-write')
  const sessionsIdx = argv.indexOf('--sessions')
  const KNOWN = new Set(['--sessions', '--write', '--no-write', '--require'])
  for (const a of argv) if (a.startsWith('--') && !KNOWN.has(a)) {
    console.error(`verdict-audit: 未知参数 ${a}（支持 --sessions <dir> / --write / --no-write / --require）`)
    process.exit(2)
  }
  const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--sessions')
  const bundleArg = positional[0]
  if (bundleArg === undefined) {
    console.error('verdict-audit: 用法 node scripts/run-gates/verdict-audit.mjs <run-bundle-dir> [--sessions <dir>] [--write]')
    process.exit(2)
  }

  const repoHome = join(ROOT, 'runtime', 'harness-home')
  const envHome = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null
  if (sessionsIdx === -1 && envHome === null) {
    console.error('verdict-audit: 未 source dev/env.sh（DSH_HOME 缺席）——先 source，或显式 --sessions <dir>')
    process.exit(2)
  }
  if (sessionsIdx === -1 && envHome !== null && envHome !== repoHome) {
    console.error(`verdict-audit: DSH_HOME=${envHome} 不是本仓 dev home（${repoHome}）——先 \`source dev/env.sh\`，或显式 --sessions <dir>`)
    process.exit(2)
  }
  const sessionsRoot = sessionsIdx !== -1
    ? resolve(argv[sessionsIdx + 1] ?? '')
    : join(repoHome, 'sessions')
  if (sessionsRoot === '' || !existsSync(sessionsRoot)) {
    console.error(`verdict-audit: 会话根不在场：${sessionsRoot}（原文一致性无法核；先跑过 run 或显式 --sessions）`)
    process.exit(2)
  }

  const bundle = resolve(bundleArg)
  if (!existsSync(bundle)) {
    console.error(`verdict-audit: bundle 不在场：${bundle}`)
    process.exit(2)
  }

  const legacy = !existsSync(join(bundle, 'run.md'))
  const epoch = legacy ? null : epochDateOf(bundle)
  const type = runType(bundle)
  // --require = 操作侧强制把本 bundle 当新契约 run 审（不靠 epoch；试跑/回溯审计用）。
  const required = argv.includes('--require')
    || (!legacy && type !== 'quick_factual' && typeof epoch === 'string' && epoch !== '' && epoch >= CLAIMS_CONTRACT_DATE)

  const claimsPath = join(bundle, 'review', 'claims.json')
  const claimsText = readIf(claimsPath)
  const rounds = verdictRounds(bundle)
  const roundTexts = rounds.map((r) => ({ round: r.round, text: readFileSync(r.path, 'utf8') }))

  // final 文本取 claims.finalRef 指向的那一版（stale 由 core 判）；finalVersion 给最高版做对账。
  const claimsParsed = claimsText === null ? null : parseClaims(claimsText)
  const finalRef = claimsParsed?.value?.finalRef ?? null
  const finalText = finalRef === null ? null : readIf(join(bundle, 'final', `v${finalRef}.md`))
  const finalDir = join(bundle, 'final')
  const finalVersion = existsSync(finalDir) ? (finalVersionsIn(finalDir).at(-1) ?? null) : null

  // 会话事实：只读——按 batches 里点名的 session 取，不扫全量目录。
  const sessions = {}
  for (const item of roundTexts) {
    const parsed = parseVerdicts(item.text)
    for (const batch of parsed.value?.batches ?? []) {
      if (sessions[batch.session] !== undefined) continue
      const facts = sessionFacts(sessionsRoot, batch.session)
      if (facts !== undefined) sessions[batch.session] = facts
    }
  }

  const { problems, warnings, stats } = auditClaimVerdicts({
    required,
    claimsText,
    rounds: roundTexts,
    finalVersion,
    finalText,
    reviewText: readIf(join(bundle, 'review.md')),
    topicsText: readIf(join(bundle, 'topics.md')),
    bundleFiles: existsSync(join(bundle, 'evidence'))
      ? readdirSync(join(bundle, 'evidence')).filter((name) => name.endsWith('.md')).map((name) => `evidence/${name}`)
      : [],
    sessions,
  })

  if (problems.length === 0) {
    if (!stats.applicable) {
      console.log('verdict-audit: 不适用（旧 bundle / quick_factual / 契约日前）——claim 覆盖不判，未写报告')
    } else if (noWrite) {
      console.log(`verdict-audit: PASS（claim ${stats.claims} / critical ${stats.critical} / covered ${stats.covered}）— 报告未写（--write 才落盘）`)
    } else {
      const round = roundTexts.length === 0 ? 1 : Math.max(...roundTexts.map((r) => r.round))
      const out = join(bundle, 'review', `verdict-audit-r${round}.md`)
      writeFileSync(out, renderReport({
        bundle, rounds: roundTexts.map((r) => r.round), required, epoch, type, stats, problems, warnings,
      }))
      console.log(`verdict-audit: PASS（claim ${stats.claims} / critical ${stats.critical} / covered ${stats.covered}）→ ${out}`)
    }
  } else {
    console.log(`verdict-audit: RED（${problems.length} 项）`)
    for (const problem of problems) console.log(`  [${problem.code}] ${problem.detail}`)
  }
  for (const warning of warnings) console.log(`  warn [${warning.code}] ${warning.detail}`)
  process.exit(problems.length === 0 ? 0 : 1)
}
