// node-gate-run-gates.mjs — bundle artifact and research-history gates (keyless pure logic).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { contractEpochOf, deliveryDate, runType } from './schema-scan-core.mjs'
import { HEADING_CONTRACT_DATE, LEADS_CONTRACT_DATE, PRE_CONTRACT_NOTE, VERSION_CONTRACT_DATE, decisionsLines, isPreContract } from './node-gate-contracts.mjs'

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
    const preEmpty = isPreContract(bundleDir, leadsDate, LEADS_CONTRACT_DATE)
    return {
      status: preEmpty ? 'PRE-CONTRACT' : 'RED',
      detail:
        'leads.md 在场但 0 个字段齐的方向单元（任意层级/任意组织轴的节，含「- 状态:」或「- 建议 owner:」行即算）——防空语料（空集显式；修正 = 按 templates/run/leads.md：每个可派发方向/实体一节，四字段行齐）' +
        (preEmpty ? PRE_CONTRACT_NOTE : ''),
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
      // 分级判据（BUG-038，2026-10-18 端到端实测）：模型会**加粗**分级（`（本轮 200，**A**，primary）`），
      // 旧判据要求分级紧跟括号 → 对已正确分级的条目假红。判据改为：剥 markdown 强调后，行内任一
      // 括号/逗号/顿号后出现独立的 A–D 令牌即算（`（A）`（…，A，…）`都认；`A` 后不得接字母数字防撞 URL）。
      const srcFlat = srcM === null ? '' : srcM[0].replace(/\*\*|__|`/g, '')
      if (!srcM || !/[(（,，、]\s*[ABCD](?![A-Za-z0-9])/.test(srcFlat)) {
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
  const preContract = isPreContract(bundleDir, leadsDate, LEADS_CONTRACT_DATE)
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
    detail = problems.join('；') + coverageNote + (preContract ? PRE_CONTRACT_NOTE : '')
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
  const newContract = contractEpochOf(bundleDir) !== null
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
  // D28：新 run 的 v{N} 是**不可变交付副本**——跨版本登记写进 v1 等于交付后改交付物。跨版本事实
  // 住 question.md §Decisions（下面的 vN 行判据）；「v1 当活索引」只对旧 epoch 保留。
  const idxText = newContract ? null : (existsSync(idxPath) ? readFileSync(idxPath, 'utf8') : null)
  const problems = []
  if (!qText) {
    problems.push('question.md 缺席——版本记账无法核对（方向契约文件失踪，fail-loud）')
  }
  if (idxText === null && !newContract) {
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
  const preContract = isPreContract(bundleDir, versionDate, VERSION_CONTRACT_DATE)
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
      (preContract ? PRE_CONTRACT_NOTE : ''),
  }
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
  const pre = isPreContract(bundleDir, headingDate, HEADING_CONTRACT_DATE)
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
      (pre ? PRE_CONTRACT_NOTE : ''),
  }
}
