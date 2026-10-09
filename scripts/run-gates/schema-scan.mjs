#!/usr/bin/env node
// schema-scan —— 节点 I/O 契约的在场级机检（NODES.md 八节点表「输出（写）」列全行断言）。
//
// 为什么存在（RFC 2026-09-29-quality-evidence-loop）：schema 在场而无机械把守，契约形同虚设——
// 首次全量扫描实锤 6/14 归档 bundle 核心违约，全部契约前期交付。散文契约不拦角色（与 G8 同因），
// 在场级需要一条可复跑命令。
//
// 编制条件性（RFC 2026-09-29-schema-debt-clearance）：研究类型 = quick_factual（记于
// question.md）按 team-assembly 矩阵不设侦察/挖掘常设编制（scout 与 analyst 的输出件为
// 条件件）——节点 3 leads.md
// 与节点 6 review.md 为**条件件**：类型在场 → 缺席转"编制豁免"注记（不计违约不静默），
// journal 无补偿把关记账 → WARN；类型不在场而缺席 → 维持违约。豁免依据 = bundle 自带事实
// （question.md 类型 + journal 记账），不硬编码 bundle 名单（名单是腐蚀源）。
//
// 分层定位：验收档命令（同 node-gate / evidence-audit 通道），不进 L0——运行区不进 verify
// （scripts/AGENTS.md 范围纪律：pre-commit 不得被 run 产物拦红）。
// 断代定红：交付日 ≥ 契约日（CONTRACT_DATE = 2026-09-29，3236e22 NODES.md 落地）且核心违约
// → exit 1；契约前期违约 → 如实报告不计红（run bundle 是交付记录，不改历史）；
// 无日期可断 → 按契约期从严（可定日期而不定 = 逃逸口）。
// 日期源 = final.md mtime（回退 final/v1.md → question.md）；journal 未来日期 → INFO 异常旗
// （模型时间感不可信——2026-09-29 实测 7 本 journal 含幻觉未来日期，最远超今 3 周）。
// keyless 纯 fs；核心可导入（tests/ 层注入 dates 覆盖——夹具 mtime 随检出时间漂，不可作断代依据）。
// 用法：node scripts/run-gates/schema-scan.mjs [bundle-dir …]（缺省 = research-workspace/archive/drt_* 全量）
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const CONTRACT_DATE = '2026-09-29'

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null)

/** 本地日期 YYYY-MM-DD（journal/交付日期按本地时区落——UTC 计算在跨午夜窗口会把本地
 * "今天"误判为未来日期，mcp-hosts run 2026-10-06 实录假阳性；UTC 滞后窗口最长 8 小时）。 */
export const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const mtimeDate = (p) => (existsSync(p) ? toDateStr(statSync(p).mtime) : null)

/** 交付日：final.md mtime，回退 final/v1.md → question.md；全缺 = null（从严处理）。 */
export function deliveryDate(bundleDir) {
  return (
    mtimeDate(join(bundleDir, 'final.md')) ??
    mtimeDate(join(bundleDir, 'final', 'v1.md')) ??
    mtimeDate(join(bundleDir, 'question.md'))
  )
}

/** journal 未来日期异常（INFO 级，不计违约——日期契约违例线索，显性化不无视）。 */
export function journalFutureDate(bundleDir, today) {
  const j = read(join(bundleDir, 'journal.md'))
  if (!j) return null
  const dates = [...j.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]).sort()
  const last = dates.at(-1)
  return last && last > today ? last : null
}

/** 研究类型（编制条件性依据）：quick_factual 标记以 question.md 自带事实为准。 */
export function runType(bundleDir) {
  const q = read(join(bundleDir, 'question.md'))
  if (!q) return null
  return /quick_factual|快速事实核查/.test(q) ? 'quick_factual' : 'other'
}

/** journal 补偿把关记账（条件件缺席时谁承担核查——宽松匹配，缺 = WARN 提示人工核）。 */
const COMPENSATION = /无\s*scout|不设\s*scout|不组队|无\s*critic|不配\s*critic|无\s*review|轻量\s*critic/

/** 条件件清单（编制条件性；缺席合法性 = quick_factual 类型 + journal 记账）。 */
const CONDITIONAL = [
  { f: 'leads.md', label: 'leads.md 缺席（节点3）' },
  { f: 'review.md', label: 'review.md 缺席（节点6）' },
]

/**
 * 一个 bundle 的核心 schema 断言（在场级；括号内 = NODES.md 对应节点行）。
 * 返回 { slug, core, exempt, warn, tail }：core = 违约；exempt = 编制豁免注记；warn = 记账缺失提示。
 */
export function scanBundle(bundleDir) {
  const slug = basename(bundleDir)
  const core = []
  const exempt = []
  const warn = []
  const has = (f) => existsSync(join(bundleDir, f))
  const q = read(join(bundleDir, 'question.md'))
  if (q === null) core.push('question.md 缺席（节点1）')
  else if (!/(?:^|\n)#+[^\n]*Decisions/i.test(q) && !q.includes('§Decisions')) core.push('question.md 无 §Decisions 节（节点1）')
  if (!has('topics.md')) core.push('topics.md 缺席（节点1）')
  // 条件件（节点3/6）：类型在场 → 豁免；不在场 → 违约
  const type = runType(bundleDir)
  for (const c of CONDITIONAL) {
    if (has(c.f)) continue
    if (type === 'quick_factual') {
      exempt.push(`${c.label}——quick_factual 编制豁免（类型见 question.md）`)
      const j = read(join(bundleDir, 'journal.md')) ?? ''
      if (!COMPENSATION.test(j)) warn.push(`${c.f} 缺席（quick_factual）但 journal 未见补偿把关记账——人工核对谁承担了核查`)
    } else {
      core.push(c.label)
    }
  }
  if (!has('findings.md')) core.push('findings.md 缺席（节点5）')
  const rv = read(join(bundleDir, 'review.md'))
  if (rv !== null && !/readiness[^\n]{0,40}(PASS|FAIL)/i.test(rv)) core.push('review.md 无 readiness 判定（节点6）')
  if (!has('final.md')) core.push('final.md 缺席于 run 根（节点5 当前版）')
  if (!has('final.md') && has('final/final.md')) core.push('final.md 位置漂移（在 final/ 里——2026-09-26 实测缺陷形态）')
  const evDir = join(bundleDir, 'evidence')
  if (!existsSync(evDir)) core.push('evidence/ 缺席（节点4）')
  else if (!readdirSync(evDir).some((f) => f.endsWith('.md'))) core.push('evidence/ 空（节点4）')
  const tail = ['journal.md', 'final/v1.md', 'audit.md', 'node-gate.md'].filter((f) => !has(f))
  return { slug, core, exempt, warn, tail }
}

/** 全量扫描 + 断代定红。dates 可按 slug 注入交付日（tests 用——夹具 mtime 不可靠）。 */
export function scanAll(bundleDirs, { contractDate = CONTRACT_DATE, today, dates = {} } = {}) {
  const now = today ?? toDateStr(new Date())
  const rows = bundleDirs.map((d) => {
    const b = scanBundle(d)
    const date = dates[b.slug] ?? deliveryDate(d)
    const era = date === null ? 'undated' : date >= contractDate ? 'contract' : 'pre-contract'
    const future = journalFutureDate(d, now)
    return { ...b, date, era, future, red: b.core.length > 0 && era !== 'pre-contract' }
  })
  return { rows, red: rows.some((r) => r.red) }
}

// ── CLI ──
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const archive = join(ROOT, 'research-workspace', 'archive')
  let dirs
  if (args.length > 0) {
    dirs = args.map((a) => resolve(a))
    const missing = dirs.filter((d) => !existsSync(d))
    if (missing.length > 0) {
      console.error(`schema-scan: bundle 不存在：${missing.join(', ')}`)
      process.exit(2)
    }
  } else {
    dirs = readdirSync(archive)
      .filter((d) => /^drt_/.test(d) && statSync(join(archive, d)).isDirectory())
      .map((d) => join(archive, d))
      .sort()
  }
  if (dirs.length === 0) {
    console.error('schema-scan: 无扫描对象（默认扫 research-workspace/archive/drt_*；或点名 bundle 目录）')
    process.exit(2)
  }
  const { rows, red } = scanAll(dirs)
  const w = Math.max(...rows.map((r) => r.slug.length))
  for (const r of rows) {
    const era = { 'pre-contract': `契约前 ${r.date}`, contract: `契约期 ${r.date}`, undated: '无日期（从严=契约期）' }[r.era]
    const verdict =
      r.core.length === 0
        ? r.exempt.length > 0 ? '✓ 核心 schema 全齐（含编制豁免件）' : '✓ 核心 schema 全齐'
        : `${r.red ? '✗ RED' : '✗ 违约（契约前——不改历史，不计红）'}：${r.core.join('；')}`
    console.log(`${r.slug.padEnd(w)}  [${era}]  ${verdict}`)
    for (const e of r.exempt) console.log(`${''.padEnd(w)}    ◦ 豁免：${e}`)
    for (const wn of r.warn) console.log(`${''.padEnd(w)}    ⚠ ${wn}（WARN）`)
    if (r.tail.length > 0) console.log(`${''.padEnd(w)}    尾件缺（分档）：${r.tail.join(', ')}`)
    if (r.future) console.log(`${''.padEnd(w)}    ⚠ journal 未来日期 ${r.future}（模型时间感不可信——日期契约违例线索）`)
  }
  const pre = rows.filter((r) => r.core.length > 0 && r.era === 'pre-contract').length
  const conObj = rows.filter((r) => r.era !== 'pre-contract').length
  const con = rows.filter((r) => r.core.length > 0 && r.era !== 'pre-contract').length
  const ex = rows.reduce((n, r) => n + r.exempt.length, 0)
  const wn = rows.reduce((n, r) => n + r.warn.length, 0)
  const objNote = conObj === 0 ? '（契约期尚无交付对象——「零违约」无对象，不得宣称）' : con === 0 ? '' : '——RED'
  console.log(`\n== 违约地图：契约前 ${pre}/${rows.length}（如实报告不计红）｜契约期 ${con}/${conObj}${objNote}｜编制豁免 ${ex} 件｜WARN ${wn} ==`)
  process.exit(red ? 1 : 0)
}
