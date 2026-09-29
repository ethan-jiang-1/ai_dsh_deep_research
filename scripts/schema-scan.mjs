#!/usr/bin/env node
// schema-scan —— 节点 I/O 契约的在场级机检（NODES.md 八节点表「输出（写）」列全行断言）。
//
// 为什么存在（RFC 2026-09-29-quality-evidence-loop）：schema 在场而无机械把守，角色照漂——
// 首次全量扫描实锤 6/14 归档 bundle 核心违约（leads×4 / findings×1 / final.md 位置漂移×1），
// 全部契约前期交付。散文契约不拦角色（与 G8 同因），在场级需要一条可复跑命令。
//
// 分层定位：验收档命令（同 node-gate / evidence-audit 通道），不进 L0——运行区不进 verify
// （scripts/AGENTS.md 范围纪律：pre-commit 不得被 run 产物拦红）。
// 断代定红：交付日 ≥ 契约日（CONTRACT_DATE = 2026-09-29，3236e22 NODES.md 落地）且核心违约
// → exit 1；契约前期违约 → 如实报告不计红（run bundle 是交付记录，不改历史）；
// 无日期可断 → 按契约期从严（可定日期而不定 = 逃逸口）。
// 日期源 = final.md mtime（回退 final/v1.md → question.md）；journal 未来日期 → INFO 异常旗
// （模型时间感不可信——2026-09-29 实测 7 本 journal 含幻觉未来日期，最远超今 3 周）。
// keyless 纯 fs；核心可导入（tests/ 层注入 dates 覆盖——夹具 mtime 随检出时间漂，不可作断代依据）。
// 用法：node scripts/schema-scan.mjs [bundle-dir …]（缺省 = research-workspace/archive/drt_* 全量）
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const CONTRACT_DATE = '2026-09-29'

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null)
const mtimeDate = (p) => (existsSync(p) ? statSync(p).mtime.toISOString().slice(0, 10) : null)

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

/** 一个 bundle 的核心 schema 断言（在场级；括号内 = NODES.md 对应节点行）。 */
export function scanBundle(bundleDir) {
  const slug = basename(bundleDir)
  const core = []
  const has = (f) => existsSync(join(bundleDir, f))
  const q = read(join(bundleDir, 'question.md'))
  if (q === null) core.push('question.md 缺席（节点1）')
  else if (!/(?:^|\n)#+[^\n]*Decisions/i.test(q) && !q.includes('§Decisions')) core.push('question.md 无 §Decisions 节（节点1）')
  if (!has('topics.md')) core.push('topics.md 缺席（节点1）')
  if (!has('leads.md')) core.push('leads.md 缺席（节点3）')
  if (!has('findings.md')) core.push('findings.md 缺席（节点5）')
  const rv = read(join(bundleDir, 'review.md'))
  if (rv === null) core.push('review.md 缺席（节点6）')
  else if (!/readiness[^\n]{0,40}(PASS|FAIL)/i.test(rv)) core.push('review.md 无 readiness 判定（节点6）')
  if (!has('final.md')) core.push('final.md 缺席于 run 根（节点5 当前版）')
  if (!has('final.md') && has('final/final.md')) core.push('final.md 位置漂移（在 final/ 里——2026-09-26 实测缺陷形态）')
  const evDir = join(bundleDir, 'evidence')
  if (!existsSync(evDir)) core.push('evidence/ 缺席（节点4）')
  else if (!readdirSync(evDir).some((f) => f.endsWith('.md'))) core.push('evidence/ 空（节点4）')
  const tail = ['journal.md', 'final/v1.md', 'audit.md', 'node-gate.md'].filter((f) => !has(f))
  return { slug, core, tail }
}

/** 全量扫描 + 断代定红。dates 可按 slug 注入交付日（tests 用——夹具 mtime 不可靠）。 */
export function scanAll(bundleDirs, { contractDate = CONTRACT_DATE, today, dates = {} } = {}) {
  const now = today ?? new Date().toISOString().slice(0, 10)
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
        ? '✓ 核心 schema 全齐'
        : `${r.red ? '✗ RED' : '✗ 违约（契约前——不改历史，不计红）'}：${r.core.join('；')}`
    console.log(`${r.slug.padEnd(w)}  [${era}]  ${verdict}`)
    if (r.tail.length > 0) console.log(`${''.padEnd(w)}    尾件缺（分档）：${r.tail.join(', ')}`)
    if (r.future) console.log(`${''.padEnd(w)}    ⚠ journal 未来日期 ${r.future}（模型时间感不可信——日期契约违例线索）`)
  }
  const pre = rows.filter((r) => r.core.length > 0 && r.era === 'pre-contract').length
  const conObj = rows.filter((r) => r.era !== 'pre-contract').length
  const con = rows.filter((r) => r.core.length > 0 && r.era !== 'pre-contract').length
  const objNote = conObj === 0 ? '（契约期尚无交付对象——「零违约」无对象，不得宣称）' : '——RED'
  console.log(`\n== 违约地图：契约前 ${pre}/${rows.length}（如实报告不计红）｜契约期 ${con}/${conObj}${objNote} ==`)
  process.exit(red ? 1 : 0)
}
