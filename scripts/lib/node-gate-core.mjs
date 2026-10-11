// node-gate-core.mjs — 节点交接契约门的判据核心（keyless 纯逻辑）。
// 从 scripts/run-gates/node-gate.mjs 拆出（2026-10-09 layering 二代：tests/node-gate.test.mjs
// 消费判据函数——驱动壳起子进程（zstd CLI），不得被 tests import；判据正本与门语义的注释
// 住在驱动壳头注，本文件只搬函数与判据内注释）。
// readLog 注入（company keyless-imports 的 injected readers 同型）：默认 pure reader 只读
// .jsonl——.zstd 压缩日志报线索后按空语料继续（判据偏红方向）；zstd CLI reader 由驱动壳
// 注入（scripts/run-gates/node-gate.mjs——多帧拼接日志靠 CLI 解全帧，行为不变）。
// 消费方：scripts/run-gates/node-gate.mjs（驱动壳）+ tests/node-gate.test.mjs（纯 .jsonl 夹具直调）。
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { planCardsOf } from './plan-card.mjs'
import { basename, join } from 'node:path'
import { deliveryDate, runType } from '../run-gates/schema-scan.mjs'

/** 门 L 契约日（2026-10-03 = RFC wave0-leads-polish 落地日；此前交付的 bundle 不追溯）。 */
export const LEADS_CONTRACT_DATE = '2026-10-03'

/** 门④ 契约日（2026-10-03 = RFC wave2-synthesis-polish 落地日；kimi 09-26 契约前形态 = 断代必要性活证）。 */
export const VERSION_CONTRACT_DATE = '2026-10-03'

/** 门① 契约日（2026-10-05 = BUG-006 落地日：快路径自我豁免 HITL1 实证后机械化；此前交付不追溯）。 */
export const HITL_CONTRACT_DATE = '2026-10-05'

/** 门R 契约日（2026-10-06 = oss-dr 借鉴候选 A1 落地日，LDR HeadingRepetitionGuard #6452 形态移植；此前交付不追溯）。 */
export const HEADING_CONTRACT_DATE = '2026-10-06'

/** 门A 契约日（2026-10-08 = RFC delivery-criteria-mechanization 毕业日；此前交付不追溯——
 *  存量缺口由该 RFC 对账步逐 bundle 处置，不机械翻旧账）。 */
export const AUDIT_CONTRACT_DATE = '2026-10-08'

/** 纯日志 reader：.jsonl 直读；.zstd 报线索后按空语料继续（语料缺失偏假红方向——红必须带线索）。
 *  zstd CLI 解压由驱动壳注入，本模块零子进程。 */
export const plainLogReader = (p) => {
  if (p.endsWith('.zstd')) {
    console.error(`node-gate-core: ${p} 是压缩日志——纯 reader 不解压，按空语料继续（判据偏红方向）；zstd 读取由驱动壳注入（scripts/run-gates/node-gate.mjs）`)
    return ''
  }
  return readFileSync(p, 'utf8')
}

/** readiness 判定解析（门②/门A 共用的唯一语义源——防两处各写一版 regex 漂移）。
 *  passLine = 首条匹配行；conditional 认两种实测形态：`PASS（附条件）`（mcp-hosts 143 行）与
 *  `PASS（条件=先修 M1/M2）`（同 162 行）。2026-10-07 审计实证：附条件 PASS 此前被一律读作
 *  无条件 PASS——识别不静默、显性化为 WARN 注记（裁决权威在 HITL2 用户，不机械红）。 */
export function readinessOf(reviewText) {
  const passLine = reviewText.split('\n').find((l) => /readiness[^.\n]{0,40}PASS/i.test(l))
  if (passLine === undefined) return { pass: false, conditional: false }
  return { pass: true, conditional: /附条件|条件\s*[=＝：:]/.test(passLine) }
}

/** 扫会话根：本 bundle 的 slug 是否出现在任一 present 工具调用的载荷里。 */
export function presentInLogs(sessionsRoot, slug, readLog = plainLogReader) {
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
export function hitlAskGate(bundleDir, sessionsRoot, hitlDate, readLog = plainLogReader) {
  const qPath = join(bundleDir, 'question.md')
  if (!existsSync(qPath)) {
    return { status: 'N/A', detail: 'question.md 不在场——门①无对象（方向契约未立，不越界判交互面）' }
  }
  const bindMark = `${basename(bundleDir)}/question.md`
  let asks = 0
  let hitl1Signed = 0
  let writerSessions = 0
  // 计划确认卡正文字数记账（HITL1 第二段，skill §6 纪律 = question 字段全长 ≤200 字）。
  // 识别与口径住 `scripts/lib/plan-card.mjs`（唯一语义源，与跨场投影工具同源——防两版判据漂移）。
  // 严重级 = **WARN**（记账不拦交付）：存量标定 2/2 超限（461 / 246 字），硬门会拦下每一场交付；
  // 升硬门的前置 = 措辞收紧后连续 ≥3 场达标（判据与升格条件 = notes/implemented/2026-10-11-plan-card-length-warn.md）。
  let planCards = 0
  const planCardOver = []
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
        const cards = planCardsOf(text)
        planCards += cards.length
        for (const c of cards) if (c.overLimit) planCardOver.push(c.questionChars)
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
  return { status: 'PASS', detail: `写过 question.md 的会话 ${writerSessions} 个：HITL1 签名 ask ${hitl1Signed} 次（总 ask ${asks} 次）——锚点在场` + planCardNote(planCards, planCardOver) }
}

/** 计划确认卡字数 WARN 注记（判据与升格条件见 ①卡 ①-c 行；口径 = ask 的 question 字段全长）。 */
function planCardNote(planCards, planCardOver) {
  if (planCardOver.length > 0) {
    return `；⚠ WARN 计划确认卡正文超 ≤200 字纪律：${planCardOver.map((n) => `${n} 字`).join(' / ')}`
      + '（口径 = ask 的 question 字段全长；先记账不拦交付——升硬门的前置 = 措辞收紧后遵守率改善）'
  }
  return planCards > 0 ? `；计划确认卡正文合规（${planCards} 张 ≤200 字）` : ''
}

/**
 * 门R（标题重复退化门，可导入；keyless；oss-dr 借鉴候选 A1，出处 = 毕业卡
 * _done/_closed_plans/2026-10-06-oss-dr-lessons.md，下钻与判据出处 =
 * LDR HeadingRepetitionGuard 事故 #6452——模型失 EOS 反复重发同一标题行直到上下文硬截断，
 * 30+ 迭代逐字重复全部落入报告；判据阈值 4 同源："a legitimate subsection does not emit
 * one identical heading four times"，O(1) 计数）。
 * 判据 = run 根 final.md（当前版）中 verbatim 标题行（#{1,6} 前缀、去尾白后整行比对）
 * 同一标题出现 ≥4 次 → RED；×3 = 合法下界之外，PASS。
 * 断代：交付日 < HEADING_CONTRACT_DATE → PRE-CONTRACT 不计红（run bundle 是交付记录）。
 * 本门不防什么（bound on the reported failure，同 LDR docstring 诚实声明）：近似改写标题、
 * 正文循环、代码围栏内的 `#` 行计入比对（final.md 罕见围栏标题，误报面可忽略）、无标题退化。
 * @returns { status: 'PASS'|'RED'|'N/A'|'PRE-CONTRACT', detail }
 */
export function headingGate(bundleDir, headingDate) {
  const finalPath = join(bundleDir, 'final.md')
  if (!existsSync(finalPath)) {
    return { status: 'N/A', detail: 'final.md 当前版不在场——门R 无对象（在场级违约归 schema-scan，不越界双判）' }
  }
  const text = readFileSync(finalPath, 'utf8')
  const counts = new Map()
  let total = 0
  for (const line of text.split('\n')) {
    const m = line.match(/^#{1,6}\s+(.*\S)?\s*$/)
    if (!m) continue
    const title = (m[1] ?? '').trim()
    if (!title) continue
    counts.set(title, (counts.get(title) ?? 0) + 1)
    total++
  }
  const date = headingDate ?? deliveryDate(bundleDir)
  const pre = date !== null && date < HEADING_CONTRACT_DATE
  const bad = [...counts.entries()].filter(([, n]) => n >= 4)
  if (bad.length === 0) {
    return {
      status: 'PASS',
      detail:
        total === 0
          ? 'final.md 无标题行——本门无重复可判（PASS 带注：只守标题重复，不判无标题退化）'
          : `final.md 标题 ${total} 条，无同一标题 ≥4 次重复`,
    }
  }
  const listed = bad.map(([t, n]) => `"${t}" ×${n}`).join('、')
  return {
    status: pre ? 'PRE-CONTRACT' : 'RED',
    detail:
      `同一标题行重复 ≥4 次（LDR #6452 生成退化形态：模型失 EOS 反复重发同一节直到上下文硬截断）——${listed}；` +
      '修正 = lead 收口去重或重跑该节（本门只守 verbatim 标题重复，不防近似改写/正文循环/无标题退化）' +
      (pre ? '（契约前交付——如实报告不计红，run bundle 是交付记录不改历史）' : ''),
  }
}

/**
 * 门A（交付完整性门，可导入；keyless；RFC 2026-10-07-delivery-criteria-mechanization）。
 * 为什么存在：NODES.md 第 8 行承诺交付判据 = 版本记账 + present + **审计 CRITICAL=0**，但
 * audit.md 与 final/v1.md 此前住 schema-scan「尾件缺（分档）」不计红、门④只管 vN≥2——
 * 2026-10-07 全仓审计实锤 7 个契约期交付 bundle 无 audit.md（交付判据在合同、脚本、操作面
 * 三方各是不同子集）。触发 = final.md 在场（综合产出在，交付段可判）：
 *   A1 交叉：final/ 版本记账在场（任何 vN.md）× readiness 非 PASS → RED——交付越过审查
 *      前置（NODES 第 6 行「PASS = HITL2 前置」）；
 *   A2 交付件齐（readiness PASS = 交付前置达成，门②同款触发）：final/v1.md 在场（版本
 *      记账——geometry-coaching 实测缺席形态）+ audit.md 在场（操作侧审计载体，evidence-audit
 *      写盘）→ 缺席 RED；
 *   附条件 PASS：按 PASS 计（附条件是 critic 判断，HITL2 裁决权威在用户——机械红越权），
 *      detail 带 WARN 注记显性化，防"被读作无条件 PASS"的静默误读（mcp-hosts 实测）。
 * 断代：交付日 < AUDIT_CONTRACT_DATE → PRE-CONTRACT 不计红（run bundle 是交付记录；
 * 存量由 RFC 对账步处置）。guides61 §4 时序：evidence-audit 拍板前跑（audit.md 先落盘），
 * v1 记账拍板后落——拍板前 A2 的 v1 缺席 = 预期态（同门②/④），交付后复跑全绿。
 * @returns { status: 'PASS'|'RED'|'N/A'|'PRE-CONTRACT', detail }
 */
export function deliveryGate(bundleDir, auditDate) {
  const finalPath = join(bundleDir, 'final.md')
  if (!existsSync(finalPath)) {
    return { status: 'N/A', detail: 'final.md 不在场——门A 无对象（bundle 未到交付段）' }
  }
  const finalDir = join(bundleDir, 'final')
  const versionFiles = existsSync(finalDir) ? readdirSync(finalDir).filter((f) => /^v\d+\.md$/.test(f)) : []
  const hasReview = existsSync(join(bundleDir, 'review.md'))
  const reviewText = hasReview ? readFileSync(join(bundleDir, 'review.md'), 'utf8') : ''
  const { pass: reviewPass, conditional } = readinessOf(reviewText)
  // quick_factual 编制豁免 review.md（schema-scan CONDITIONAL 同语义同判据源——豁免依据 =
  // question.md 自带类型标记，不硬编码名单）；豁免型缺席不得被 A1 判"越过审查"。
  const quickFactual = runType(bundleDir) === 'quick_factual'
  const delivered = versionFiles.length > 0
  const problems = []
  if (delivered && hasReview && !reviewPass) {
    problems.push(
      `final/ 版本记账在场（${versionFiles.join(', ')}）而 review readiness 非 PASS——交付越过审查前置（NODES 第 6 行：PASS = HITL2 前置；修正 = 补审查轮使 readiness 判 PASS，或按处置流程显式记账）`,
    )
  }
  if (delivered && !hasReview && !quickFactual) {
    problems.push('final/ 版本记账在场而 review.md 缺席（非 quick_factual 豁免形态）——审查前置整缺的交付（修正 = 补 review.md 判 readiness，或按处置流程显式记账）')
  }
  // A2 交付件齐——触发 = reviewPass（审查放行，记账+审计 owed；拍板前 v1 缺席 = 预期态，同门②/④）
  // 或记账在场（豁免型交付的唯一触发——deepseek-api-pricing 形态）。
  if (reviewPass || delivered) {
    if (!existsSync(join(finalDir, 'v1.md'))) {
      problems.push('交付前置达成（readiness PASS）但 final/v1.md 版本记账缺席（geometry-coaching 实测形态；修正 = 交付时按 templates/run/final 落 v1 记账）')
    }
    if (!existsSync(join(bundleDir, 'audit.md'))) {
      problems.push('交付前置达成但 audit.md 缺席——操作侧审计未做（NODES 第 8 行交付判据含审计 CRITICAL=0；修正 = 跑 node scripts/run-gates/evidence-audit.mjs <bundle> 落盘审计报告）')
    }
  }
  const date = auditDate ?? deliveryDate(bundleDir)
  const pre = date !== null && date < AUDIT_CONTRACT_DATE
  if (problems.length === 0) {
    const base = !reviewPass && !delivered
      ? 'final.md 在场而交付段未进入（无版本记账、readiness 非 PASS）——A1/A2 无对象'
      : '交付件齐：final/v1.md 版本记账 + audit.md 操作侧审计在场'
    const exemptNote = !hasReview && quickFactual ? '；quick_factual 编制豁免 review.md（豁免依据 = question.md 类型标记）' : ''
    return { status: 'PASS', detail: base + exemptNote + (conditional ? '；⚠ readiness 为附条件 PASS（条件性显性化——HITL2 拍板前请核条件）' : '') }
  }
  return {
    status: pre ? 'PRE-CONTRACT' : 'RED',
    detail:
      problems.join('；') +
      (conditional ? '；⚠ readiness 为附条件 PASS（条件性显性化）' : '') +
      (pre ? '（契约前交付——如实报告不计红，存量由对账步处置，run bundle 是交付记录不改历史）' : ''),
  }
}

/**
 * 门一个 bundle（核心逻辑，可导入；keyless）。opts.readLog 注入日志 reader（默认纯 reader
 * ——.zstd 走空语料偏红；驱动壳注入 zstd CLI reader 读全帧）。
 * @returns { gates: { hitlAsk, hitl2Row, present, leads, version, degeneration }, red, report }
 *   每门：{ status: 'PASS'|'PASS-RELAY'|'RED'|'N/A'|'PRE-CONTRACT', detail }
 */
export function gateBundle(bundleDir, sessionsRoot, opts = {}) {
  const readLog = opts.readLog ?? plainLogReader
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
  const reviewPass = readinessOf(reviewText).pass
  const triggered = existsSync(finalPath) && reviewPass
  let present
  if (!existsSync(finalPath)) {
    present = { status: 'N/A', detail: 'final.md 当前版不在场——门②无对象' }
  } else if (!reviewPass) {
    present = { status: 'N/A', detail: 'review.md readiness 非 PASS——HITL2 前置未达成，交付门②无对象' }
  } else {
    const inLog = presentInLogs(sessionsRoot, slug, readLog)
    const relayRow = hitl2Rows.find((l) => /操作侧/.test(l))
    if (inLog) present = { status: 'PASS', detail: '会话日志含指向本 bundle 的 present 声明' }
    else if (relayRow) present = { status: 'PASS-RELAY', detail: '日志无 present 调用，但 §Decisions 拍板行显式标注操作侧补齐（通道死亡恢复路径，如实记账）——放行带注' }
    else present = { status: 'RED', detail: 'final.md + readiness PASS 在场，但日志无 present 调用、拍板行也无操作侧补齐标注——静默缺席（G8 形态）' }
  }

  const gates = { hitlAsk: hitlAskGate(bundleDir, sessionsRoot, opts.hitlDate, readLog), hitl2Row, present, leads: leadsGate(bundleDir, opts.leadsDate), version: versionGate(bundleDir, opts.versionDate), degeneration: headingGate(bundleDir, opts.headingDate), delivery: deliveryGate(bundleDir, opts.auditDate) }
  const red = [gates.hitlAsk, hitl2Row, present, gates.leads, gates.version, gates.degeneration, gates.delivery].some((g) => g.status === 'RED')
  const report = `# Node Gate — ${slug}（${new Date().toISOString()}）

> scripts/run-gates/node-gate.mjs（keyless；契约正本 = research-workspace/NODES.md 第 3/7/8 行 + 回边版本语义节 + BUG-006 门①）。

| 门 | 状态 | 说明 |
|---|---|---|
| ① HITL 锚点 | ${gates.hitlAsk.status} | ${gates.hitlAsk.detail} |
| ③ §Decisions 拍板行 | ${hitl2Row.status} | ${hitl2Row.detail} |
| ② present 声明 | ${present.status} | ${present.detail} |
| L leads 交接 | ${gates.leads.status} | ${gates.leads.detail} |
| ④ 版本记账 | ${gates.version.status} | ${gates.version.detail} |
| R 标题重复 | ${gates.degeneration.status} | ${gates.degeneration.detail} |
| A 交付完整性 | ${gates.delivery.status} | ${gates.delivery.detail} |
`
  return { gates, red, report }
}
