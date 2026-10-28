// schema-scan-core.mjs —— 节点 I/O 契约在场级断言的判据核（从 scripts/run-gates/schema-scan.mjs
// 下沉——2026-10-13 结构重构：lib 不得反向依赖入口层，判据核住 lib、CLI 壳住 run-gates，
// 同 node-gate-core / evidence-audit-core 形态）。
//
// 为什么存在（RFC 2026-09-29-quality-evidence-loop）：schema 在场而无机械把守，契约形同虚设——
// 首次全量扫描实锤 6/14 归档 bundle 核心违约，全部契约前期交付。散文契约不拦角色（与 G8 同因），
// 在场级需要一条可复跑命令。
//
// 编制条件性（RFC 2026-09-29-schema-debt-clearance）：研究类型 = quick_factual（记于
// question.md）按 team-assembly 矩阵不设侦察/挖掘常设编制（scout 与 analyst 的输出件为
// 条件件）——节点 3 leads.md 与节点 6 review.md 为**条件件**：类型在场 → 缺席转"编制豁免"注记
// （不计违约不静默），journal 无补偿把关记账 → WARN；类型不在场而缺席 → 维持违约。豁免依据 =
// bundle 自带事实（question.md 类型 + journal 记账），不硬编码 bundle 名单（名单是腐蚀源）。
//
// 断代定红：交付日 ≥ 契约日（CONTRACT_DATE = 2026-09-29，3236e22 NODES.md 落地）且核心违约
// → 红；契约前期违约 → 如实报告不计红（run bundle 是交付记录，不改历史）；
// 无日期可断 → 按契约期从严（可定日期而不定 = 逃逸口）。
// 日期源 = final.md mtime（回退 final/v1.md → question.md）；journal 未来日期 → INFO 异常旗
// （模型时间感不可信——2026-09-29 实测 7 本 journal 含幻觉未来日期，最远超今 3 周）。
// keyless 纯 fs；dates 可注入（tests/ 层覆盖——夹具 mtime 随检出时间漂，不可作断代依据）。
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

export const CONTRACT_DATE = '2026-09-29'
/** 当前 run bundle 契约版本（run.md 的 `schema:`，整数；模板写、门禁按整数分档）。
 *  读兼容：无 schema 的旧形态仍按 `contract:` 日期断代——日期断代只服务历史，不承接新 run。 */
export const SCHEMA_VERSION = 2
/** run.md 的 phase 闭集（D28；模板/手册/门禁同源，防三处各写一份）。 */
export const RUN_PHASES = ['briefing', 'research', 'synthesis', 'review', 'delivery', 'accepted', 'parked']

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

/** 契约纪元（run.md 的 `contract:`，D28）：无 run.md → null（旧场走 mtime）；run.md 在场但
 *  无合法日期 → ''（视为新契约、交给门禁判红，不静默回退 mtime）。 */
export function contractEpochOf(bundleDir) {
  const p = join(bundleDir, 'run.md')
  if (!existsSync(p)) return null
  const m = /^\s*[-*]?\s*contract\s*[:：]\s*(\d{4}-\d{2}-\d{2})\b/m.exec(readFileSync(p, 'utf8'))
  return m?.[1] ?? ''
}

/** 契约版本（run.md 的 `schema:`）：无 run.md 或无本行 → null（旧形态，走日期断代）；
 *  非整数 → NaN（交 schemaIssueOf 判红）；整数 → 版本号。 */
export function runSchemaOf(bundleDir) {
  const p = join(bundleDir, 'run.md')
  if (!existsSync(p)) return null
  const m = /^\s*[-*]?\s*schema\s*[:：]\s*(\S+)(?:\s*#.*)?\s*$/m.exec(readFileSync(p, 'utf8'))
  if (m === null) return null
  return /^\d+$/.test(m[1]) ? Number(m[1]) : Number.NaN
}

/** run.md 契约版本问题（null = 无问题）：非法 / 比本工具新 / 既无 schema 也无合法 contract。
 *  未来版本不猜语义——按现行从严判，同时核心违约，逼升门禁工具。 */
export function schemaIssueOf(bundleDir) {
  const p = join(bundleDir, 'run.md')
  if (!existsSync(p)) return null
  const schema = runSchemaOf(bundleDir)
  if (Number.isNaN(schema)) return 'run.md 的 schema 非法（应为整数契约版本）'
  if (schema !== null) {
    if (schema > SCHEMA_VERSION) return `run.md schema=${schema} 比本工具（${SCHEMA_VERSION}）新——先升门禁工具，不猜`
    // 低版本不是"旧形态"：旧形态**直接省略 schema**（按 contract 日期断代）。写一个更小的数
    // = 用版本字段给自己开豁免口——这正是把日期换成整数要消灭的那类逃逸，不能留。
    if (schema < SCHEMA_VERSION) return `run.md schema=${schema} 低于本工具（${SCHEMA_VERSION}）——旧形态请直接省略 schema，不写更小值`
    // 整数契约形态下 created 是 bundle 里唯一的"人读时间"；缺了它，移交后无法回答"何时开始"。
    return createdDateOf(bundleDir) === null ? 'run.md schema 形态缺 created（人读立项日）' : null
  }
  return contractEpochOf(bundleDir) === '' ? 'run.md 既无 schema 也无合法 contract（D28）' : null
}

/** 立项日（run.md 的 `created:`，人读；schema 模式下替代 contract 承担日期展示）。 */
export function createdDateOf(bundleDir) {
  const p = join(bundleDir, 'run.md')
  if (!existsSync(p)) return null
  const m = /^\s*[-*]?\s*created\s*[:：]\s*(\d{4}-\d{2}-\d{2})\b/m.exec(readFileSync(p, 'utf8'))
  return m?.[1] ?? null
}

/** 契约纪元日期（人读 / 见证扫描下界）：旧形态取 `contract:`；新形态（有 schema 无 contract）
 *  取 `created:`——否则 schema run 的回执与见证扫描会丢掉时间下界。无 run.md → null；
 *  run.md 在场但两者都非法 → ''（交门禁判红，不静默回退）。 */
export function epochDateOf(bundleDir) {
  const contract = contractEpochOf(bundleDir)
  if (contract === null) return null
  if (contract !== '') return contract
  return createdDateOf(bundleDir) ?? ''
}

/** journal 未来日期异常（INFO 级，不计违约——日期契约违例线索，显性化不无视）。 */
export function journalFutureDate(bundleDir, today) {
  const j = read(join(bundleDir, 'journal.md'))
  if (!j) return null
  const dates = [...j.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]).sort()
  const last = dates.at(-1)
  return last && last > today ? last : null
}

/** 研究类型（编制条件性依据）：quick_factual 标记以 question.md 自带事实为准。
 *  优先读 HITL1 Snapshot 的 `- 研究类型:` 字段或 `## 研究类型` 节；都缺才回退全文子串，
 *  且回退时排除「不是/非快速事实核查」这类否定引用——真实 run 的用户原话可能整句引用题面，
 *  全文子串会把 prompt 里的「不是快速事实核查」误判成 quick_factual 豁免（2026-10-23
 *  真实 run 实测：drt_cn-open-vs-us-closed-agentic 被门C 误豁免）。 */
export function runType(bundleDir) {
  const q = read(join(bundleDir, 'question.md'))
  if (!q) return null
  const quickValue = (value) => /^(?:quick_factual|快速事实核查)/.test(
    value.replace(/\*\*|__|`/g, '').trim(),
  )
  const lines = q.split('\n')
  for (const line of lines) {
    const field = /^\s*[-*]?\s*研究类型\s*[:：]\s*(.+)$/.exec(line)
    if (field !== null) return quickValue(field[1]) ? 'quick_factual' : 'other'
  }
  for (let i = 0; i < lines.length; i++) {
    if (!/^#{1,6}\s*研究类型\s*$/.test(lines[i])) continue
    for (let j = i + 1; j < lines.length; j++) {
      const value = lines[j].trim()
      if (value === '' || value.startsWith('#')) break
      return quickValue(value) ? 'quick_factual' : 'other'
    }
  }
  return /quick_factual|快速事实核查/.test(q.replace(/不是\s*快速事实核查|非\s*快速事实核查/g, ''))
    ? 'quick_factual'
    : 'other'
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
/** ops 生成物：记录环境事实（语料根等），不参与研究内容卫生扫描（D28 分层：回执 ≠ 研究状态）。 */
const OPS_ARTIFACTS = new Set(['audit.md', 'node-gate.md', 'acceptance.md', 'delivered.json', 'manifest.json'])
/** bundle 内禁止的指令文件（RFC §7：数据区不开第二指令通道）。 */
const INSTRUCTION_FILES = new Set(['AGENTS.md', 'CLAUDE.md', 'AGENTS.local.md', 'CLAUDE.local.md'])
/** 可执行脚本后缀（RFC §7：bundle 是数据区，不放程序）。 */
const SCRIPT_FILE_RE = /\.(?:sh|bash|zsh|py|rb|pl|mjs|cjs|js|ts)(?:~)?$/i
/** 绝对路径族（不只 /Users/：换机/换 home 即断源）。 */
const ABS_PATH_RE = /(?:^|[\s(`"'\[])(?:\/(?:Users|home|tmp|private|var|Volumes|opt|mnt|media|root)\/|[A-Za-z]:\\|~\/)/
/** D28 顶层白名单（RFC §11；新 run 只许这些条目，未登记 = 核心违约）。 */
const TOP_LEVEL_ALLOWED = new Set([
  'run.md', 'question.md', 'topics.md', 'plan.md', 'leads.md', 'findings.md', 'review.md', 'final.md', 'journal.md',
  'audit.md', 'node-gate.md', 'acceptance.md', 'delivered.json', 'manifest.json',
  'plan', 'leads', 'evidence', 'provenance', 'final', 'journal', 'drafts',
])

/**
 * D28 新 run 的 bundle 卫生（RFC §7/§11）：绝对路径 / `../drt_` / 跨 bundle `[来源:]` /
 * 指令文件 / 可执行脚本 / symlink / 未登记顶层条目 / leads 分片未登记 → 核心违约。
 * ops 生成物不扫内容（它们记录语料根等环境事实，由 run-accept 写可复算形式）。
 * 旧场（无 run.md）不扫——历史只读、不追改。
 */
export function hygieneOf(bundleDir) {
  const core = []
  if (!existsSync(join(bundleDir, 'run.md'))) return core
  const top = readdirSync(bundleDir, { withFileTypes: true })
  const leadsText = existsSync(join(bundleDir, 'leads.md')) ? readFileSync(join(bundleDir, 'leads.md'), 'utf8') : ''
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === '.git' || ent.name === 'node_modules') continue
      const p = join(dir, ent.name)
      const rel = p.slice(bundleDir.length + 1)
      if (ent.isSymbolicLink()) { core.push(`${rel} 是 symlink（D28 新 run 禁：bundle 是可搬运数据）`); continue }
      if (ent.isDirectory()) { walk(p); continue }
      if (INSTRUCTION_FILES.has(ent.name)) { core.push(`${rel} 是指令文件（D28 新 run 禁：数据区不开第二指令通道）`); continue }
      if (SCRIPT_FILE_RE.test(ent.name)) { core.push(`${rel} 是脚本（D28 新 run 禁：bundle 只放研究数据）`); continue }
      if (!ent.name.endsWith('.md') || OPS_ARTIFACTS.has(ent.name)) continue
      const text = readFileSync(p, 'utf8')
      if (ABS_PATH_RE.test(text)) core.push(`${rel} 含绝对路径（D28 新 run 禁）`)
      if (text.includes('../drt_')) core.push(`${rel} 含跨 bundle 路径 ../drt_（D28 新 run 禁）`)
      const cross = text.split('\n').find((l) => /\[来源:[^\]]*drt_/.test(l))
      if (cross !== undefined) core.push(`${rel} 含跨 bundle [来源:]（D28 新 run 禁）`)
    }
  }
  walk(bundleDir)
  for (const ent of top) {
    if (!TOP_LEVEL_ALLOWED.has(ent.name)) core.push(`未登记顶层条目 ${ent.name}（D28 顶层白名单，RFC §11）`)
  }
  const leadsDir = join(bundleDir, 'leads')
  if (existsSync(leadsDir)) {
    for (const f of readdirSync(leadsDir).filter((x) => x.endsWith('.md'))) {
      if (!leadsText.includes(`leads/${f}`) && !leadsText.includes(f)) core.push(`leads/${f} 未登记分片（RFC §11：分片必须在 leads.md 登记）`)
    }
  }
  return core
}

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
  const run = read(join(bundleDir, 'run.md'))
  if (run !== null) {
    core.push(...hygieneOf(bundleDir))
    const schemaIssue = schemaIssueOf(bundleDir)
    if (schemaIssue !== null) core.push(schemaIssue)
    const phaseMatch = /^\s*[-*]?\s*phase\s*[:：]\s*([a-z][a-z-]*)\b/m.exec(run)
    if (phaseMatch === null || !RUN_PHASES.includes(phaseMatch[1])) core.push('run.md 的 phase 缺失或不在闭集（D28）')
    if (!/^\s*[-*]?\s*next\s*[:：]\s*\S/m.test(run)) core.push('run.md 缺 next（D28）')
    // 交付段一致性（卡 §10 B1）：phase 声明交付/已验收 ⇒ 事实侧必须齐（版本账 + 终局块）。
    const phase = phaseMatch?.[1]
    if (phase === 'delivery' || phase === 'accepted') {
      const finalDirNow = join(bundleDir, 'final')
      const hasVersion = existsSync(finalDirNow) && readdirSync(finalDirNow).some((f) => /^v\d+\.md$/.test(f))
      if (!hasVersion) core.push(`run.md phase=${phase} 但 final/vN 版本账缺席（D28 交付段）`)
      if (rv === null || !/readiness[^\n]{0,40}(PASS|FAIL)/i.test(rv)) core.push(`run.md phase=${phase} 但 review.md 终局 readiness 不可解析（D28 交付段）`)
      const deliveredValue = /^\s*[-*]?\s*delivered\s*[:：]\s*(.+)$/m.exec(run)?.[1]?.trim() ?? ''
      if (phase === 'accepted' && (deliveredValue === '' || /^none$/i.test(deliveredValue))) core.push('run.md phase=accepted 但 delivered 仍为 none（D28）')
    }
  }
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
    const schema = runSchemaOf(d)
    const epoch = contractEpochOf(d)
    // 整数契约（新 run）：与日期无关；旧形态（无 schema）才按 contract 日期断代。
    const date = dates[b.slug] ?? (schema !== null
      ? (createdDateOf(d) ?? deliveryDate(d))
      : (epoch === null ? deliveryDate(d) : epoch === '' ? '9999-12-31' : epoch))
    // 写了 schema 就按现行从严（非法/低版本由 schemaIssueOf 判红，不给"旧形态"豁免）。
    const era = schema !== null
      ? 'contract'
      : (date === null ? 'undated' : date >= contractDate ? 'contract' : 'pre-contract')
    const future = journalFutureDate(d, now)
    return { ...b, date, era, future, red: b.core.length > 0 && era !== 'pre-contract' }
  })
  return { rows, red: rows.some((r) => r.red) }
}
