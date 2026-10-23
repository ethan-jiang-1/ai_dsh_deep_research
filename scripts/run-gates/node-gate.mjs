#!/usr/bin/env node
// node-gate —— 节点交接契约机检 v2（交付两门 + leads 交接门；RFC 2026-09-28-node-io-schema
// + 2026-09-28-wave0-leads-polish）。
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
// v2 新增门 L（leads 交接门；RFC 2026-09-28-wave0-leads-polish）：
//   触发 = leads.md 在场（缺席 = N/A——在场级归 schema-scan，不越界双判）；
//   quick_factual 编制豁免 = N/A（条件件，与 schema-scan 同语义，依据 = question.md 类型）；
//   L1 字段齐：每个「## 方向:」节状态行在场且值合法（建议挖深｜已排除）；建议挖深 →
//     支持来源（含 A–D 分级）+ 关键线索 + 建议 owner 三行齐；已排除 → 原因非空；
//     0 个方向节 = RED（防空语料——空集显式，不静默）；
//   L2 topic 覆盖：topics.md 的 scope_role ∈ {primary, comparison} 的 T# 须被 ≥1 条建议
//     挖深 lead 指向（标题或 owner 行引用都算——mcp-server 生态场实证两处出现）；
//     synthesis/supporting 免检（窄带防假牙齿，按 run 证据再收紧）；topics.md 缺席 =
//     覆盖未判显式注记（在场级归 schema-scan）；
//   断代（同 schema-scan 成例）：交付日 < LEADS_CONTRACT_DATE（2026-10-03）→ 违约计
//     PRE-CONTRACT 不计红（run bundle 是交付记录，不改历史）；无日期可断 = 从严
//     （可定日期而不定 = 逃逸口）。
//
// 红绿语义：任一门 RED → exit 1；N/A = 无对象（未到该节点段，不是通过也不是失败——防空
// 语料反面：无对象必须显式标注，不静默跳过）；PRE-CONTRACT = 契约前违约如实报告不计红。
// 分层（2026-10-09 layering 二代）：判据核心（全部 gate 函数与契约日常量）住
// scripts/lib/node-gate-core.mjs（keyless 纯逻辑，tests 消费）；本文件 = CLI 驱动壳 +
// zstd 日志 reader（多帧拼接 CLI 可解全帧）注入。tests/ 层禁子进程，keyless 测试走纯
// .jsonl 夹具直调（fixtures/node-gate/，先红后绿的永久反证记录）。
// 用法：node scripts/run-gates/node-gate.mjs <run-bundle-dir> [--sessions <会话根>] [--write]
//       node scripts/run-gates/node-gate.mjs --latest
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gateBundle } from '../lib/node-gate-core.mjs'
import { readZstdText } from '../lib/zstd-read.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** 读一个会话日志文件（.jsonl 直读 / .jsonl.zstd 走 zstd CLI——多帧拼接 CLI 可解全帧）。
 *  解压失败 stderr 报文件名后按空语料继续——语料缺失偏假红方向，但红必须带线索（fail-loud
 *  最低义务）。注入给 gateBundle 的 opts.readLog（lib 默认纯 reader 不解压 .zstd）。 */
function readLog(p) {
  if (p.endsWith('.zstd')) {
    const r = readZstdText(p) // 解压段正本 = lib/zstd-read.mjs（多帧拼接靠 zstd CLI）
    if (!r.ok) {
      // 本壳失败契约：**按空语料继续**（''）——缺失偏假红方向，但红必须带线索（fail-loud 最低义务）
      console.error(`node-gate: 日志解压失败（按空语料继续，判据偏红方向）：${p}`)
      return ''
    }
    return r.text
  }
  return readFileSync(p, 'utf8')
}

// ── CLI ──
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const argv = process.argv.slice(2)
  const latest = argv.includes('--latest')
  const sessionsIdx = argv.indexOf('--sessions')
  // 会话根解析（同 evidence-audit 纪律）：默认锚定本仓 dev home；DSH_HOME 指向别处先自拒。
  const repoHome = join(ROOT, 'runtime', 'harness-home')
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
    console.error('node-gate: 用法 node scripts/run-gates/node-gate.mjs <run-bundle-dir> | --latest（bundle 不存在）')
    process.exit(2)
  }
  const noWrite = !argv.includes('--write') || argv.includes('--no-write')
  const { gates, red, unattested } = gateBundle(bundleDir, sessionsRoot, { readLog })
  // Markdown 报告渲染（2026-10-13 从 node-gate-core.gateBundle 移入——呈现归壳、判据归核；
  // tests 只断言 gates/red，渲染的唯一消费方就是本壳，格式逐字不变）。
  const report = `# Node Gate — ${basename(bundleDir)}（${new Date().toISOString()}）

> scripts/run-gates/node-gate.mjs（keyless；契约正本 = research-workspace/NODES.md 第 3/7/8 行 + 回边版本语义节 + BUG-006 门①）。

| 门 | 状态 | 说明 |
|---|---|---|
| ① HITL 锚点 | ${gates.hitlAsk.status} | ${gates.hitlAsk.detail} |
| ③ §Decisions 拍板行 | ${gates.hitl2Row.status} | ${gates.hitl2Row.detail} |
| ② present 声明 | ${gates.present.status} | ${gates.present.detail} |
| L leads 交接 | ${gates.leads.status} | ${gates.leads.detail} |
| ④ 版本记账 | ${gates.version.status} | ${gates.version.detail} |
| R 标题重复 | ${gates.degeneration.status} | ${gates.degeneration.detail} |
| A 交付完整性 | ${gates.delivery.status} | ${gates.delivery.detail} |
`
  console.log(`node-gate: ${basename(bundleDir)} ｜ 门① HITL 锚点 = ${gates.hitlAsk.status} ｜ 门③ §Decisions 拍板行 = ${gates.hitl2Row.status} ｜ 门② present 声明 = ${gates.present.status} ｜ 门L leads 交接 = ${gates.leads.status} ｜ 门④ 版本记账 = ${gates.version.status} ｜ 门R 标题重复 = ${gates.degeneration.status} ｜ 门A 交付完整性 = ${gates.delivery.status}`)
  console.log(`  ① ${gates.hitlAsk.detail}`)
  console.log(`  ③ ${gates.hitl2Row.detail}`)
  console.log(`  ② ${gates.present.detail}`)
  console.log(`  L ${gates.leads.detail}`)
  console.log(`  ④ ${gates.version.detail}`)
  console.log(`  R ${gates.degeneration.detail}`)
  console.log(`  A ${gates.delivery.detail}`)
  // 报告写入防护：tests/ 夹具区是 tracked 区——写报告=污染 git（2026-09-29 实测 6 个未跟踪文件，
  // 红证记录见 notes/implemented/2026-09-29-quality-evidence-loop.md）。夹具判定走上面的 stdout。
  if (noWrite || resolve(bundleDir).startsWith(join(ROOT, 'tests') + '/')) {
    console.log(`  报告写入跳过（${argv.includes('--write') ? 'tests/ 夹具区——防 tracked 区污染' : '默认只读；--write 才落盘'}；判定如上）`)
  } else {
    writeFileSync(join(bundleDir, 'node-gate.md'), report)
    console.log(`  报告已写 ${join(bundleDir, 'node-gate.md')}`)
  }
  // exit 2 = UNATTESTED（证据缺席，不是通过也不是红）——verdict 契约同 scripts/AGENTS。
  process.exit(red ? 1 : unattested ? 2 : 0)
}
