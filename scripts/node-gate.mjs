#!/usr/bin/env node
// node-gate —— 节点交接契约机检 v1（交付两门；RFC 2026-09-28-node-io-schema）。
//
// 为什么存在：八节点 I/O 契约（research-workspace/NODES.md）的判据此前只对人有约束力。
// 2026-09-29 两场 run 实证裸奔代价：HITL2 拍板行缺席两场 + present 从未声明（G8「双缺席」
// 第二实例，会话日志全库取证）——散文判据不拦角色。本脚本把交付两门机械化
// （= rerun-loop-live 候选后续③ + 候选后续② 的审计层形态）：
//
//   门③（§Decisions 拍板行门）：final/ 版本记账在场 → question.md §Decisions 须含
//      ≥1 条匹配 /HITL2/ 的拍板行（版本落盘不得先于用户裁决）。v2+ 逐版本匹配留待
//      按证据收紧，v1 不发明口径。
//   门②（present 声明门）：final.md 当前版在场 + review.md readiness PASS → 会话日志
//      须含指向本 bundle 的 present 工具调用；§Decisions 拍板行显式标注「操作侧」补齐
//      （通道死亡恢复路径，如实记账）→ PASS-RELAY 放行带注——静默缺席才是红。
//
// 红绿语义：任一门 RED → exit 1；N/A = 无对象（未到交付段，不是通过也不是失败——防空语料
// 反面：无对象必须显式标注，不静默跳过）。
// keyless：纯 fs + zstd CLI（同 evidence-audit 通道）；gateBundle() 可导入——tests/ 层禁
// 子进程，keyless 测试走纯 .jsonl 夹具直调（fixtures/node-gate/，先红后绿的永久反证记录）。
// 用法：node scripts/node-gate.mjs <run-bundle-dir> [--sessions <会话根>]
//       node scripts/node-gate.mjs --latest
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 读一个会话日志文件（.jsonl 直读 / .jsonl.zstd 走 zstd CLI——多帧拼接 CLI 可解全帧）。 */
function readLog(p) {
  if (p.endsWith('.zstd')) {
    const r = spawnSync('zstd', ['-dc', p], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    return r.status === 0 ? r.stdout : ''
  }
  return readFileSync(p, 'utf8')
}

/** 扫会话根：本 bundle 的 slug 是否出现在任一 present 工具调用的载荷里。 */
export function presentInLogs(sessionsRoot, slug) {
  if (!sessionsRoot || !existsSync(sessionsRoot) || !slug) return false
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) { if (walk(p)) return true; continue }
      if (!/\.jsonl(\.zstd)?$/.test(ent.name)) continue
      const text = readLog(p)
      for (const line of text.split('\n')) {
        if (!line.includes('"type":"tool/call"') && !line.includes('"type":"tool-call"')) continue
        if (!line.includes('"present"')) continue
        let e
        try { e = JSON.parse(line) } catch { continue }
        const d = e?.data ?? e
        if (d?.name !== 'present') continue
        const payload = JSON.stringify(d ?? {}).replace(/\\\//g, '/')
        if (payload.includes(slug)) return true
      }
    }
    return false
  }
  return walk(sessionsRoot)
}

/** §Decisions 节解析：返回该节全部非空行（到下一个 `## ` 或文件尾）。 */
export function decisionsLines(questionText) {
  const out = []
  let inSec = false
  for (const line of questionText.split('\n')) {
    if (/^##\s/.test(line)) { inSec = /^##\s*Decisions/.test(line); continue }
    if (inSec && line.trim().length > 0) out.push(line)
  }
  return out
}

/**
 * 门一个 bundle（核心逻辑，可导入；keyless）。
 * @returns { gates: { hitl2Row, present }, red, report }
 *   每门：{ status: 'PASS'|'PASS-RELAY'|'RED'|'N/A', detail }
 */
export function gateBundle(bundleDir, sessionsRoot) {
  const slug = basename(bundleDir)
  // 门③：final/ 版本记账在场 → §Decisions 须含 HITL2 拍板行
  const finalDir = join(bundleDir, 'final')
  const versionFiles = existsSync(finalDir) ? readdirSync(finalDir).filter((f) => f.endsWith('.md')) : []
  const qPath = join(bundleDir, 'question.md')
  const qText = existsSync(qPath) ? readFileSync(qPath, 'utf8') : null
  const dec = qText ? decisionsLines(qText) : []
  const hitl2Rows = dec.filter((l) => /HITL2/.test(l))
  let hitl2Row
  if (versionFiles.length === 0) {
    hitl2Row = { status: 'N/A', detail: 'final/ 版本记账不在场——门③无对象（bundle 未到交付段；显式标注，不静默跳过）' }
  } else if (!qText) {
    hitl2Row = { status: 'RED', detail: 'final/ 记账在场但 question.md 缺席——方向契约文件失踪，fail-loud（不静默跳过）' }
  } else if (hitl2Rows.length === 0) {
    hitl2Row = { status: 'RED', detail: `final/ 记账在场（${versionFiles.join(', ')}）但 §Decisions 无任何 HITL2 拍板行——版本落盘先于用户裁决（G8 形态）` }
  } else {
    hitl2Row = { status: 'PASS', detail: `§Decisions 含 ${hitl2Rows.length} 条 HITL2 拍板行` }
  }

  // 门②：final.md 当前版 + review readiness PASS → present 声明在日志（或显式操作侧补齐记账）
  const finalPath = join(bundleDir, 'final.md')
  const reviewPath = join(bundleDir, 'review.md')
  const reviewText = existsSync(reviewPath) ? readFileSync(reviewPath, 'utf8') : ''
  const reviewPass = existsSync(reviewPath) && /readiness[^.\n]{0,40}PASS/i.test(reviewText)
  const triggered = existsSync(finalPath) && reviewPass
  let present
  if (!existsSync(finalPath)) {
    present = { status: 'N/A', detail: 'final.md 当前版不在场——门②无对象' }
  } else if (!reviewPass) {
    present = { status: 'N/A', detail: 'review.md readiness 非 PASS——HITL2 前置未达成，交付门②无对象' }
  } else {
    const inLog = presentInLogs(sessionsRoot, slug)
    const relayRow = hitl2Rows.find((l) => /操作侧/.test(l))
    if (inLog) present = { status: 'PASS', detail: '会话日志含指向本 bundle 的 present 声明' }
    else if (relayRow) present = { status: 'PASS-RELAY', detail: '日志无 present 调用，但 §Decisions 拍板行显式标注操作侧补齐（通道死亡恢复路径，如实记账）——放行带注' }
    else present = { status: 'RED', detail: 'final.md + readiness PASS 在场，但日志无 present 调用、拍板行也无操作侧补齐标注——静默缺席（G8 形态）' }
  }

  const gates = { hitl2Row, present }
  const red = [hitl2Row, present].some((g) => g.status === 'RED')
  const report = `# Node Gate — ${slug}（${new Date().toISOString()}）

> scripts/node-gate.mjs（keyless；契约正本 = research-workspace/NODES.md 第 7/8 行）。

| 门 | 状态 | 说明 |
|---|---|---|
| ③ §Decisions 拍板行 | ${hitl2Row.status} | ${hitl2Row.detail} |
| ② present 声明 | ${present.status} | ${present.detail} |
`
  return { gates, red, report }
}

// ── CLI ──
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const argv = process.argv.slice(2)
  const latest = argv.includes('--latest')
  const sessionsIdx = argv.indexOf('--sessions')
  // 会话根解析（同 evidence-audit 纪律）：默认锚定本仓 dev home；DSH_HOME 指向别处先自拒。
  const repoHome = join(ROOT, 'dev', 'harness-home')
  const envHome = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null
  if (sessionsIdx === -1 && envHome !== null && envHome !== repoHome) {
    console.error(`node-gate: DSH_HOME=${envHome} 不是本仓 dev home（${repoHome}）——先 \`source dev/env.sh\`，或显式 --sessions <dir>`)
    process.exit(2)
  }
  const sessionsRoot = sessionsIdx !== -1 ? resolve(argv[sessionsIdx + 1]) : join(repoHome, 'sessions')
  const bundleArg = argv.find((a) => !a.startsWith('--') && a !== sessionsRoot)
  let bundleDir = null
  if (latest) {
    const ws = join(ROOT, 'research-workspace')
    const cands = []
    const seen = new Set()
    for (const dir of [ws, join(ws, 'archive')]) {
      if (!existsSync(dir)) continue
      for (const d of readdirSync(dir)) {
        if (!/^drt_/.test(d) || seen.has(d)) continue
        let st = null
        try { st = statSync(join(dir, d)) } catch { continue }
        if (!st.isDirectory()) continue
        seen.add(d)
        cands.push({ p: join(dir, d), m: st.mtimeMs })
      }
    }
    cands.sort((a, b) => b.m - a.m)
    bundleDir = cands.length > 0 ? cands[0].p : null
  } else if (bundleArg) bundleDir = resolve(bundleArg)
  if (bundleDir === null || !existsSync(bundleDir)) {
    console.error('node-gate: 用法 node scripts/node-gate.mjs <run-bundle-dir> | --latest（bundle 不存在）')
    process.exit(2)
  }
  const { gates, red, report } = gateBundle(bundleDir, sessionsRoot)
  // 报告写入防护：tests/ 夹具区是 tracked 区——写报告=污染 git（2026-09-29 实测 6 个未跟踪文件，
  // 红证记录见 notes/implemented/2026-09-29-quality-evidence-loop.md）。夹具判定走 stdout 即可。
  if (resolve(bundleDir).startsWith(join(ROOT, 'tests') + '/')) {
    console.log('  报告写入跳过（tests/ 夹具区——防 tracked 区污染；判定如上）')
  } else {
    writeFileSync(join(bundleDir, 'node-gate.md'), report)
    console.log(`  报告已写 ${join(bundleDir, 'node-gate.md')}`)
  }
  process.exit(red ? 1 : 0)
}
