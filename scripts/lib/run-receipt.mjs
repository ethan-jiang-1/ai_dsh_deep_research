// run-receipt.mjs — 交付回执（delivered / manifest / acceptance）的纯生成与校验（C-lite，D28）。
//
// 为什么存在：回执是 ops 生成物，过去直接写在 run-accept 壳里——无测试、无消费者、还把绝对语料根
// 写进 bundle（自己踩卫生门）。本模块把三件回执的**形状与判据**收成 keyless 纯函数：
//   · 生成：delivered.json / manifest.json / acceptance.md（no absolute paths）；
//   · 选择：present 指针取**最新版本化**事件（rerun 不记旧版本）；
//   · 校验：receiptProblems 复算 final/audit 哈希——门禁消费，回执不再只写不读。
// 权威边界：回执不是指令、不自证批准；它只把「验收时的事实」固定成可复算的记录。
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'

/** Agent 读序（与手册 §状态头、读序与恢复 / RFC §11.2 逐字一致的单点）。 */
export const READ_ORDER = [
  'run.md', 'question.md', 'topics.md', 'plan.md', 'journal.md（顶部 3–5 条）',
  'findings.md', 'final.md', 'review.md', 'evidence/ + provenance/（按需）', 'delivered.json', 'manifest.json',
]

/** 按意图读（与手册「按意图读」表逐项一致；test 锁，不是第二套指令）。 */
export const READ_INTENTS = [
  { label: '继续', files: ['run.md', 'question.md', 'journal.md', 'plan.md'], stop: '五问答齐', avoid: ['全部 evidence'] },
  { label: '交付', files: ['run.md', 'final/', 'final.md', 'question.md', 'review.md', 'delivered.json', 'acceptance.md'], stop: '版本副本 + 拍板 + readiness + 回执齐', avoid: ['研究过程', 'evidence'] },
  { label: '查证', files: ['final.md', 'findings.md', 'evidence/<id>.md', 'provenance/<id>.json'], stop: '来源与口径', avoid: ['question', 'plan', 'journal'] },
  { label: '旧场', files: ['旧表', 'question.md', 'journal.md', 'final.md', 'review.md', 'acceptance.md'], stop: '五问答齐 + 回执', avoid: ['run.md', 'evidence'] },
]

/** 顶层文件角色（manifest 用；未知文件记 unknown，不猜）。 */
export const FILE_ROLES = {
  'run.md': 'state-head',
  'question.md': 'direction-contract',
  'topics.md': 'topics',
  'plan.md': 'execution-graph',
  'leads.md': 'leads-index',
  'findings.md': 'findings',
  'review.md': 'review',
  'final.md': 'current-final',
  'journal.md': 'journal',
  'audit.md': 'audit-snapshot',
  'node-gate.md': 'gate-snapshot',
  'acceptance.md': 'acceptance-receipt',
  'delivered.json': 'delivery-receipt',
}

/** 文件 sha256（缺席/不可读 → null，不抛）。 */
export function sha256Of(path) {
  try { return createHash('sha256').update(readFileSync(path)).digest('hex') } catch { return null }
}

/**
 * 语料根的**可复算标签**：`$DSH_HOME` 下写成 `$DSH_HOME/<rel>`；其它根只留 basename（不写裸绝对路径，
 * 回执不得自带换机即断的绝对路径）。绝对路径只出现在控制台输出里。
 * @param sessions 语料根（调用方传入，可能为绝对路径）。@param home DSH_HOME（可空）。
 * @returns 非绝对路径标签。
 */
export function corpusRootLabel(sessions, { home = null } = {}) {
  const raw = String(sessions ?? '')
  if (raw === '') return '—'
  const norm = resolve(raw)
  if (home) {
    const h = resolve(home)
    if (norm === h) return '$DSH_HOME'
    if (norm.startsWith(h + sep)) return `$DSH_HOME/${norm.slice(h.length + 1).split(sep).join('/')}`
  }
  return basename(norm)
}

/**
 * 回执里的 present 指针：优先**最新版本化** present（`final/vN.md`），没有版本化才退回最新任意一条。
 * @param events presentedInLogs 的 events（可能跨会话、乱序）。@returns {{path,callId,version,time}|null}
 */
export function pickPresented(events) {
  if (!Array.isArray(events) || events.length === 0) return null
  const versioned = events.filter((e) => e && e.version !== null && e.version !== undefined)
  const pool = versioned.length > 0 ? versioned : events
  const key = (e) => [typeof e?.time === 'number' ? e.time : -Infinity, typeof e?.version === 'number' ? e.version : -1]
  const latest = pool.reduce((a, b) => {
    const [at, av] = key(a)
    const [bt, bv] = key(b)
    return bt > at || (bt === at && bv > av) ? b : a
  })
  return {
    path: latest.path,
    callId: latest.callId ?? null,
    version: latest.version ?? null,
    time: typeof latest.time === 'number' ? latest.time : null,
  }
}

/** 只有新契约 run（有 run.md）才写新回执；旧 bundle 只留 acceptance（不补新契约文件）。 */
export const shouldWriteReceipts = (bundleDir) => existsSync(join(bundleDir, 'run.md'))

/**
 * 回执校验（门禁消费）：`delivered.json` 可解析、final/audit 哈希与盘上一致。
 * 缺回执 = 无问题（不因未验收拦旧场）；坏 JSON / 哈希不符 = 问题（交付后被改）。
 * @returns {{problems:string[], receipt:object|null}}
 */
export function receiptProblems(bundleDir) {
  const path = join(bundleDir, 'delivered.json')
  if (!existsSync(path)) return { problems: [], receipt: null }
  let receipt
  try { receipt = JSON.parse(readFileSync(path, 'utf8')) } catch {
    return { problems: ['delivered.json 不可解析（JSON）——回执损坏，不能作为交付见证'], receipt: null }
  }
  const problems = []
  const finalVersion = receipt?.final?.version
  if (Number.isSafeInteger(finalVersion) && finalVersion > 0) {
    const finalPath = join(bundleDir, 'final', `v${finalVersion}.md`)
    if (!existsSync(finalPath)) {
      problems.push(`delivered.json 指向 final/v${finalVersion}.md，但该版本账不在场（回执与盘上不符）`)
    } else if (typeof receipt.final.sha256 === 'string' && sha256Of(finalPath) !== receipt.final.sha256) {
      problems.push(`final/v${finalVersion}.md 的 sha256 与回执不符——present 后当前版被改（回执哈希不匹配）`)
    }
  }
  if (typeof receipt?.audit?.sha256 === 'string') {
    const auditPath = join(bundleDir, 'audit.md')
    if (!existsSync(auditPath)) {
      problems.push('delivered.json 记录 audit 哈希，但 audit.md 不在场')
    } else if (sha256Of(auditPath) !== receipt.audit.sha256) {
      problems.push('audit.md 的 sha256 与回执不符——验收后审计快照被改（回执哈希不匹配）')
    }
  }
  return { problems, receipt }
}

/** 生成 delivered.json 的主体（调用方负责写盘；值域与 RFC §11.1 一致）。 */
export function buildDelivered({ slug, bundleDir, corpusRoot, acceptedAt, presented }) {
  const finalDir = join(bundleDir, 'final')
  const versions = existsSync(finalDir)
    ? readdirSync(finalDir).filter((f) => /^v\d+\.md$/.test(f)).map((f) => Number(/^v(\d+)/.exec(f)[1])).sort((a, b) => a - b)
    : []
  const finalVersion = versions.at(-1) ?? null
  const finalPath = finalVersion === null ? null : join(finalDir, `v${finalVersion}.md`)
  const auditPath = join(bundleDir, 'audit.md')
  const auditText = existsSync(auditPath) ? readFileSync(auditPath, 'utf8') : ''
  const critical = /CRITICAL\s+(\d+)/.exec(auditText)?.[1] ?? null
  const present = pickPresented(presented)
  return {
    version: 1,
    slug,
    acceptedAt,
    sessions: corpusRoot,
    gate: { status: 'PASS', exit: 0 },
    audit: { critical: critical === null ? null : Number(critical), sha256: sha256Of(auditPath) },
    final: { version: finalVersion, sha256: finalPath === null ? null : sha256Of(finalPath) },
    present: present === null ? null : { path: present.path, callId: present.callId, version: present.version },
  }
}

/** 生成 manifest.json 的主体（目录说明书，不是指令；不自我引用、不含后写的 acceptance）。 */
export function buildManifest({ slug, bundleDir, contract, generatedAt }) {
  const files = []
  for (const ent of readdirSync(bundleDir, { withFileTypes: true })) {
    if (!ent.isFile() || ent.name === 'manifest.json' || ent.name === 'acceptance.md') continue
    files.push({ path: ent.name, role: FILE_ROLES[ent.name] ?? 'unknown', sha256: sha256Of(join(bundleDir, ent.name)) })
  }
  const finalDir = join(bundleDir, 'final')
  if (existsSync(finalDir)) {
    for (const f of readdirSync(finalDir).filter((x) => /^v\d+\.md$/.test(x)).sort()) {
      files.push({ path: `final/${f}`, role: 'version-ledger', sha256: sha256Of(join(finalDir, f)) })
    }
  }
  return {
    version: 1,
    slug,
    contract: contract ?? null,
    generatedAt,
    readOrder: READ_ORDER,
    files,
    counts: {
      evidence: existsSync(join(bundleDir, 'evidence')) ? readdirSync(join(bundleDir, 'evidence')).filter((f) => f.endsWith('.md')).length : 0,
      provenance: existsSync(join(bundleDir, 'provenance')) ? readdirSync(join(bundleDir, 'provenance')).filter((f) => f.endsWith('.json')).length : 0,
    },
  }
}

/** 渲染 acceptance.md（ops 回执；语料根只写可复算标签，不写绝对路径）。 */
export function renderAcceptance({ slug, stamp, critical, finalVersion, present, corpusRoot, legacy = false }) {
  const presentLabel = present === null || present === undefined ? '—' : present.path
  return `# Acceptance — ${slug}（${stamp}）

> 由 scripts/run-ops/run-accept.mjs 生成（操作侧验收回执；不是研究内容）。
> 预检（--no-write）先过，才落盘 node-gate/audit${legacy ? '' : ' 并写 delivered.json/manifest.json'}；红跑不写 bundle。
${legacy ? '> 旧契约 bundle（无 run.md）：只留本回执，不补新契约回执（D28 epoch 豁免）。\n' : ''}
| 检查 | 结果 |
|---|---|
| node-gate | PASS（exit 0） |
| evidence-audit | PASS（exit 0；audit.md 在场，CRITICAL ${critical ?? '—'}） |
| 日期 sanity | PASS（零未来日期） |
${legacy ? '' : `| 回执 | delivered.json（final ${finalVersion === null ? '—' : `v${finalVersion}`} / present ${presentLabel}） |\n| 清单 | manifest.json（文件角色/读序/契约/哈希） |\n`}| 会话语料根 | \`${corpusRoot}\`（$DSH_HOME 相对形式；绝对根只在控制台） |
`
}
