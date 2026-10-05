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
// v2 新增门 L（leads 交接门；RFC 2026-09-28-wave0-leads-polish，实证 = 样本 3
// CRITICAL-2：leads.md 计数错且内部不一致未回改——计数对账归 skill 自检 + critic 狩猎，
// 机械门只守字段与覆盖两个可机械判定的面，不发明数值打分）：
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
// keyless：纯 fs + zstd CLI（同 evidence-audit 通道）；gateBundle() 可导入——tests/ 层禁
// 子进程，keyless 测试走纯 .jsonl 夹具直调（fixtures/node-gate/，先红后绿的永久反证记录）。
// 用法：node scripts/node-gate.mjs <run-bundle-dir> [--sessions <会话根>]
//       node scripts/node-gate.mjs --latest
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deliveryDate } from './schema-scan.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 门 L 契约日（2026-10-03 = RFC wave0-leads-polish 落地日；此前交付的 bundle 不追溯）。 */
export const LEADS_CONTRACT_DATE = '2026-10-03'

/** 门④ 契约日（2026-10-03 = RFC wave2-synthesis-polish 落地日；kimi 09-26 契约前形态 = 断代必要性活证）。 */
export const VERSION_CONTRACT_DATE = '2026-10-03'

/** 门① 契约日（2026-10-05 = BUG-006 落地日：快路径自我豁免 HITL1 实证后机械化；此前交付不追溯）。 */
export const HITL_CONTRACT_DATE = '2026-10-05'

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
 * 门 L（leads 交接门，可导入；keyless）。断代日期可注入（tests——夹具 mtime 不可靠）。
 * @returns { status: 'PASS'|'RED'|'N/A'|'PRE-CONTRACT', detail }
 */
export function leadsGate(bundleDir, leadsDate) {
  const leadsPath = join(bundleDir, 'leads.md')
  if (!existsSync(leadsPath)) {
    return { status: 'N/A', detail: 'leads.md 不在场——门 L 无对象（在场级违约归 schema-scan，不越界双判）' }
  }
  const qText = existsSync(join(bundleDir, 'question.md'))
    ? readFileSync(join(bundleDir, 'question.md'), 'utf8')
    : ''
  if (/quick_factual|快速事实核查/.test(qText)) {
    return { status: 'N/A', detail: 'quick_factual 编制豁免——不设侦察编制，门 L 无对象（条件件，与 schema-scan 同语义）' }
  }
  const text = readFileSync(leadsPath, 'utf8')
  // 解析方向单元（不变量口径，2026-10-04 门L 升格；判据来源 = leads-topic-shape 推敲卡毕业
  // 判断）：任意层级 #{2,4} 的节都是单元——组织轴自由（方向轴/实体轴/前提校验段皆合法，
  // 门不判轴，按题型分形是 scout 的专业判断）；门守不变量 = 可派发的字段齐单元。
  // 「lead 尝试」= 含状态行或 owner 行的单元；字段齐检查只施加于 lead 尝试。
  const sections = []
  let cur = null
  for (const line of text.split('\n')) {
    if (/^#{2,4}\s+/.test(line)) {
      if (cur) sections.push(cur)
      cur = { heading: line.replace(/^#{2,4}\s+/, ''), body: [] }
    } else if (cur) cur.body.push(line)
  }
  if (cur) sections.push(cur)
  const isLeadAttempt = (u) =>
    /^\s*-\s*建议\s*owner[:：]/mi.test(u.body.join('\n')) || /^\s*-\s*状态[:：]/mi.test(u.body.join('\n'))
  const dirs = sections.filter(isLeadAttempt)
  if (dirs.length === 0) {
    // 防空语料（空集显式）——断代在先：契约前 0 单元 = PRE-CONTRACT 如实报告不计红
    // （selfhosted/siliconflow 自由体 leads.md 实测抓出早退跳断代的缺陷）。
    const dateEmpty = leadsDate ?? deliveryDate(bundleDir)
    const preEmpty = dateEmpty !== null && dateEmpty < LEADS_CONTRACT_DATE
    return {
      status: preEmpty ? 'PRE-CONTRACT' : 'RED',
      detail:
        'leads.md 在场但 0 个字段齐的方向单元（任意层级/任意组织轴的节，含「- 状态:」或「- 建议 owner:」行即算）——防空语料（空集显式；修正 = 按 templates/run/leads.md：每个可派发方向/实体一节，四字段行齐）' +
        (preEmpty ? '（契约前交付——如实报告不计红，run bundle 是交付记录不改历史）' : ''),
    }
  }
  const problems = []
  const covered = new Set()
  let dig = 0
  let excluded = 0
  for (const s of dirs) {
    const title = s.heading.slice(0, 40)
    const body = s.body.join('\n')
    const ownerM = body.match(/^\s*-\s*建议\s*owner[:：].*$/mi)
    const statusM = body.match(/^\s*-\s*状态[:：]\s*(.+)$/m)
    // 状态值语义识别：markdown 强调符（**…**）是合法排版噪音——browser 第六场实物实证
    // （`- 状态: **建议挖深**（T2 主…）`），字面匹配会把语义正确的状态判非法并连带
    // 覆盖计数清零。剥强调后再匹配，不要求重写交付记录。
    const sv = statusM === null ? null : statusM[1].trim().replace(/\*\*/g, '')
    // topic 引用：标题 + owner 行都算（mcp-server 生态场实证两处出现）
    if (ownerM && /^\s*-\s*建议\s*owner/i.test(ownerM[0])) {
      const digProbe = sv !== null && /^建议挖深/.test(sv)
      if (digProbe) for (const m of (s.heading + ' ' + ownerM[0]).matchAll(/T\d+/g)) covered.add(m[0])
    }
    if (!statusM) {
      problems.push(`「${title}」缺「- 状态:」行（修正 = 按 templates/run/leads.md 补状态行）`)
      continue
    }
    if (/^建议挖深/.test(sv)) {
      dig++
      const srcM = body.match(/^\s*-\s*支持来源[:：].*$/m)
      if (!srcM || !/[(（]\s*[ABCD]\b/.test(srcM[0])) {
        problems.push(`「${title}」建议挖深但支持来源缺席或无 A–D 分级（收集而不分级反模式；修正 = 补支持来源行并带分级）`)
      }
      if (!/^\s*-\s*关键线索/m.test(body)) {
        problems.push(`「${title}」建议挖深但缺「- 关键线索:」行（修正 = 补来自哪个来源的哪句话）`)
      }
      if (!ownerM) {
        problems.push(`「${title}」建议挖深但缺「- 建议 owner:」行（修正 = 补 owner 与对应 topic）`)
      }
    } else if (/^已排除/.test(sv)) {
      excluded++
      const reason = sv.replace(/^已排除/, '').replace(/^\s*[：:（(]\s*/, '').trim()
      if (reason.length === 0) {
        problems.push(`「${title}」已排除但无原因（静默放弃反模式；修正 = 已排除（<一句话原因>））`)
      }
    } else {
      problems.push(`「${title}」状态值非法："${sv.slice(0, 20)}"（合法 = 建议挖深｜已排除；修正 = 改状态行）`)
    }
  }
  // L2 覆盖（窄带：primary/comparison 免检 synthesis/supporting——防假牙齿，按 run 证据再收紧）
  const topicsPath = join(bundleDir, 'topics.md')
  let coverageNote = ''
  const gaps = []
  let requiredCount = 0
  if (!existsSync(topicsPath)) {
    coverageNote = '（覆盖未判：topics.md 不在场——在场级归 schema-scan）'
  } else {
    const tText = readFileSync(topicsPath, 'utf8')
    const tSections = []
    let tcur = null
    for (const line of tText.split('\n')) {
      if (/^##\s+/.test(line)) {
        if (tcur) tSections.push(tcur)
        tcur = { heading: line.replace(/^##\s+/, ''), body: [] }
      } else if (tcur) tcur.body.push(line)
    }
    if (tcur) tSections.push(tcur)
    for (const s of tSections) {
      const idM = s.heading.match(/^(T\d+)\b/)
      if (!idM) continue
      const roleM = s.body.join('\n').match(/^\s*-\s*scope_role[:：]\s*(\S+)/m)
      const role = roleM ? roleM[1].toLowerCase() : ''
      if (role === 'primary' || role === 'comparison') {
        requiredCount++
        if (!covered.has(idM[1])) gaps.push(idM[1])
      }
    }
    if (gaps.length > 0) {
      problems.push(`覆盖缺口：${gaps.join('、')}（primary/comparison topic 无任何建议挖深 lead 指向——侦察缺口；修正 = 补 lead 或在 lead 的标题/owner 行补对应 topic）`)
    }
  }
  // 断代（同 schema-scan 成例）：无日期可断 = 从严；pre-contract = 如实报告不计红
  const date = leadsDate ?? deliveryDate(bundleDir)
  const preContract = date !== null && date < LEADS_CONTRACT_DATE
  let status
  let detail
  if (problems.length === 0) {
    status = 'PASS'
    const cov = existsSync(topicsPath)
      ? `覆盖 ${requiredCount - gaps.length}/${requiredCount}（primary/comparison 全指向）`
      : '覆盖未判'
    detail = `字段齐方向单元 ${dirs.length}（挖深 ${dig}/排除 ${excluded}）；${cov}${coverageNote}`
  } else {
    status = preContract ? 'PRE-CONTRACT' : 'RED'
    detail = problems.join('；') + coverageNote + (preContract ? '（契约前交付——如实报告不计红，run bundle 是交付记录不改历史）' : '')
  }
  return { status, detail }
}

/**
 * 门④（版本记账门，可导入；keyless；RFC 2026-09-28-wave2-synthesis-polish）。
 * final/ 存在 vN（n≥2）→ ①§Decisions 须含提及 vN 的行（版本落盘须有对应拍板/立项/追认
 * 记账——selfhosted-ai-gateway/siliconflow-financials 实证形态）；②final/v1.md 须登记该
 * 版本（跨版本索引——手册 final/ 节契约；三场 v2 run 实证形态：kimi「已被 v2 取代」/
 * selfhosted 索引表/siliconflow「当前交付版 v2」）；v1.md 缺席 = RED（fail-loud）。
 * 断代：交付日 < VERSION_CONTRACT_DATE → PRE-CONTRACT 不计红（kimi 09-26 §Decisions 零
 * v2 记账 = 真实契约前形态，不追溯红）。
 * @returns { status: 'PASS'|'RED'|'N/A'|'PRE-CONTRACT', detail }
 */
export function versionGate(bundleDir, versionDate) {
  const finalDir = join(bundleDir, 'final')
  if (!existsSync(finalDir)) {
    return { status: 'N/A', detail: 'final/ 不在场——门④ 无对象（bundle 未到版本记账段）' }
  }
  const versions = readdirSync(finalDir)
    .map((f) => {
      const m = f.match(/^v(\d+)\.md$/)
      return m ? Number(m[1]) : 0
    })
    .filter((n) => n >= 2)
    .sort((a, b) => a - b)
  if (versions.length === 0) {
    return { status: 'N/A', detail: 'final/ 仅 v1 记账（无扩张 rerun）——门④ 无对象（显式标注，不静默跳过）' }
  }
  const qPath = join(bundleDir, 'question.md')
  const qText = existsSync(qPath) ? readFileSync(qPath, 'utf8') : null
  const dec = qText ? decisionsLines(qText) : []
  const idxPath = join(finalDir, 'v1.md')
  const idxText = existsSync(idxPath) ? readFileSync(idxPath, 'utf8') : null
  const problems = []
  if (!qText) {
    problems.push('question.md 缺席——版本记账无法核对（方向契约文件失踪，fail-loud）')
  }
  if (idxText === null) {
    problems.push('final/v1.md 版本索引缺席而扩张版本在场（修正 = 按 templates/run/final 补版本索引，手册 final/ 节契约）')
  }
  for (const n of versions) {
    const tag = `v${n}`
    if (qText && !dec.some((l) => l.includes(tag))) {
      problems.push(`final/${tag}.md 在场但 §Decisions 无提及 ${tag} 的行（版本落盘先于记账——selfhosted 流程偏差同形态；修正 = §Decisions 追加 ${tag} 拍板/立项/追认行）`)
    }
    if (idxText !== null) {
      // 登记判定跳过 `>` 引用行——模板脚注（rerun 语义规则文本）本身含 "vN"，朴素 includes
      // 永远误绿（红绿纪律实测抓出）；真实登记形态 = 内容行（列表/表格/粗体，三场 v2 run 实证）。
      const idxHit = idxText
        .split('\n')
        .filter((l) => !/^\s*>/.test(l))
        .some((l) => l.includes(tag))
      if (!idxHit) {
        problems.push(`final/${tag}.md 在场但 final/v1.md 索引未登记 ${tag}（跨版本索引契约——手册 final/ 节；修正 = 在 v1.md 登记该版本）`)
      }
    }
  }
  const date = versionDate ?? deliveryDate(bundleDir)
  const preContract = date !== null && date < VERSION_CONTRACT_DATE
  if (problems.length === 0) {
    return {
      status: 'PASS',
      detail: `扩张版本 ${versions.map((n) => `v${n}`).join('、')}记账齐（§Decisions 行 + v1.md 索引登记）`,
    }
  }
  return {
    status: preContract ? 'PRE-CONTRACT' : 'RED',
    detail:
      problems.join('；') +
      (preContract ? '（契约前交付——如实报告不计红，run bundle 是交付记录不改历史）' : ''),
  }
}

/**
 * 门①（HITL 锚点门，可导入；keyless；BUG-006 实证反证）。
 * 判据 = **写过本 bundle 方向契约文件**（会话日志含指向 `drt_<slug>/question.md` 的
 * write 调用）的会话里，带 **HITL1 签名**（问卡含「研究类型」——persona 三问之首，问卡
 * id 可变故认 header/题面词）的 ask_user_question 调用 ≥ 1。绑定语义 = HITL1 与立项
 * 同场的合同本身；两轮真 bundle 实拍否定更宽的绑定（sibling 预检的提及/读取都会把
 * 邻场与历史场次的 ask 串进来——时间锚也漏历史场次）。
 * 零例外合同（persona「ask 调用硬约束」同日落地）——无豁免形态。
 * 断代：交付日 < HITL_CONTRACT_DATE → PRE-CONTRACT 不计红（run bundle 是交付记录）。
 * @returns { status: 'PASS'|'RED'|'N/A'|'PRE-CONTRACT', detail }
 */
export function hitlAskGate(bundleDir, sessionsRoot, hitlDate) {
  const qPath = join(bundleDir, 'question.md')
  if (!existsSync(qPath)) {
    return { status: 'N/A', detail: 'question.md 不在场——门①无对象（方向契约未立，不越界判交互面）' }
  }
  const bindMark = `${basename(bundleDir)}/question.md`
  let asks = 0
  let hitl1Signed = 0
  let writerSessions = 0
  if (sessionsRoot && existsSync(sessionsRoot)) {
    const scan = (dir) => {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, ent.name)
        if (ent.isDirectory()) { scan(p); continue }
        if (!/\.jsonl(\.zstd)?$/.test(ent.name)) continue
        const text = readLog(p)
        if (!text.includes('ask_user_question') && !text.includes(bindMark.split('/')[0])) continue
        let sessionWrites = false
        let sessionAsks = 0
        let sessionSigned = 0
        for (const line of text.split('\n')) {
          if (!line.includes('"tool/call"')) continue
          let e
          try { e = JSON.parse(line) } catch { continue }
          const d = e?.data ?? e
          if (d?.name !== 'write' && d?.name !== 'ask_user_question') continue
          const args = String(d?.arguments ?? '').replace(/\\\//g, '/')
          if (d?.name === 'write' && args.includes(bindMark)) sessionWrites = true
          if (d?.name === 'ask_user_question') {
            sessionAsks++
            if (/研究类型/.test(args)) sessionSigned++
          }
        }
        if (!sessionWrites) continue
        writerSessions++
        asks += sessionAsks
        hitl1Signed += sessionSigned
      }
    }
    scan(sessionsRoot)
  }
  const date = hitlDate ?? deliveryDate(bundleDir)
  const pre = date !== null && date < HITL_CONTRACT_DATE
  if (hitl1Signed === 0) {
    return {
      status: pre ? 'PRE-CONTRACT' : 'RED',
      detail: `写过 question.md 的会话 ${writerSessions} 个、ask ${asks} 次，但 HITL1 签名（研究类型问）0 次——两 HITL 锚点之首缺失（BUG-006 形态：快路径自我豁免；persona 契约 = 任何研究请求先 HITL1，零例外）` +
        (pre ? '（契约前交付——如实报告不计红，run bundle 是交付记录不改历史）' : ''),
    }
  }
  return { status: 'PASS', detail: `写过 question.md 的会话 ${writerSessions} 个：HITL1 签名 ask ${hitl1Signed} 次（总 ask ${asks} 次）——锚点在场` }
}

/**
 * 门一个 bundle（核心逻辑，可导入；keyless）。
 * @returns { gates: { hitlAsk, hitl2Row, present, leads, version }, red, report }
 *   每门：{ status: 'PASS'|'PASS-RELAY'|'RED'|'N/A'|'PRE-CONTRACT', detail }
 */
export function gateBundle(bundleDir, sessionsRoot, opts = {}) {
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

  const gates = { hitlAsk: hitlAskGate(bundleDir, sessionsRoot, opts.hitlDate), hitl2Row, present, leads: leadsGate(bundleDir, opts.leadsDate), version: versionGate(bundleDir, opts.versionDate) }
  const red = [gates.hitlAsk, hitl2Row, present, gates.leads, gates.version].some((g) => g.status === 'RED')
  const report = `# Node Gate — ${slug}（${new Date().toISOString()}）

> scripts/node-gate.mjs（keyless；契约正本 = research-workspace/NODES.md 第 3/7/8 行 + 回边版本语义节 + BUG-006 门①）。

| 门 | 状态 | 说明 |
|---|---|---|
| ① HITL 锚点 | ${gates.hitlAsk.status} | ${gates.hitlAsk.detail} |
| ③ §Decisions 拍板行 | ${hitl2Row.status} | ${hitl2Row.detail} |
| ② present 声明 | ${present.status} | ${present.detail} |
| L leads 交接 | ${gates.leads.status} | ${gates.leads.detail} |
| ④ 版本记账 | ${gates.version.status} | ${gates.version.detail} |
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
  console.log(`node-gate: ${basename(bundleDir)} ｜ 门① HITL 锚点 = ${gates.hitlAsk.status} ｜ 门③ §Decisions 拍板行 = ${gates.hitl2Row.status} ｜ 门② present 声明 = ${gates.present.status} ｜ 门L leads 交接 = ${gates.leads.status} ｜ 门④ 版本记账 = ${gates.version.status}`)
  console.log(`  ① ${gates.hitlAsk.detail}`)
  console.log(`  ③ ${gates.hitl2Row.detail}`)
  console.log(`  ② ${gates.present.detail}`)
  console.log(`  L ${gates.leads.detail}`)
  console.log(`  ④ ${gates.version.detail}`)
  // 报告写入防护：tests/ 夹具区是 tracked 区——写报告=污染 git（2026-09-29 实测 6 个未跟踪文件，
  // 红证记录见 notes/implemented/2026-09-29-quality-evidence-loop.md）。夹具判定走上面的 stdout。
  if (resolve(bundleDir).startsWith(join(ROOT, 'tests') + '/')) {
    console.log('  报告写入跳过（tests/ 夹具区——防 tracked 区污染；判定如上）')
  } else {
    writeFileSync(join(bundleDir, 'node-gate.md'), report)
    console.log(`  报告已写 ${join(bundleDir, 'node-gate.md')}`)
  }
  process.exit(red ? 1 : 0)
}
