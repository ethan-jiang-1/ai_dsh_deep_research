#!/usr/bin/env node
// schema-scan —— 节点 I/O 契约的在场级机检（NODES.md 八节点表「输出（写）」列全行断言）的
// CLI 壳：判据核住 scripts/lib/schema-scan-core.mjs（2026-10-13 结构重构下沉——判据核可被
// node-gate 与 tests 导入，壳只管参数与报告渲染）。
//
// 分层定位：验收档命令（同 node-gate / evidence-audit 通道），不进 L0——运行区不进 verify
// （scripts/AGENTS.md 范围纪律：pre-commit 不得被 run 产物拦红）。
// keyless 纯 fs。
// 用法：node scripts/run-gates/schema-scan.mjs [bundle-dir …]（缺省 = research-workspace/archive/drt_* 全量）
import { existsSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listRuns } from '../../packages/deep-research-pack/src/lib/run-context.ts'
import { scanAll } from '../lib/schema-scan-core.mjs'
import { nodeRunSource } from '../lib/run-source-node.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

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
    // 缺省只扫 archive（交付件的最终停靠处）；要扫在飞/停放请显式点名。范围是显式参数。
    const ws = join(ROOT, 'research-workspace')
    const runs = await listRuns(nodeRunSource(ws), { buckets: ['archive'] })
    if (!runs.ok) {
      console.error(`schema-scan: 无法枚举 archive run（${runs.reason}${runs.detail === undefined ? '' : `：${runs.detail}`}）`)
      process.exit(2)
    }
    dirs = runs.value.map((run) => join(ws, run.dir)).sort()
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
