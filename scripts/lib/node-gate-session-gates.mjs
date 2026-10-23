// node-gate-session-gates.mjs — session-bound HITL and present gates (keyless pure logic).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { planCardsOf } from './plan-card.mjs'
import { HITL_CONTRACT_DATE, PRE_CONTRACT_NOTE, decisionsLines, isPreContract, readinessOf } from './node-gate-contracts.mjs'
import { contractEpochOf } from './schema-scan-core.mjs'

/** 纯日志 reader：.jsonl 直读；.zstd 报线索后按空语料继续（语料缺失偏假红方向——红必须带线索）。
 *  zstd CLI 解压由驱动壳注入，本模块零子进程。 */
export const plainLogReader = (p) => {
  if (p.endsWith('.zstd')) {
    console.error(`node-gate-core: ${p} 是压缩日志——纯 reader 不解压，按空语料继续（判据偏红方向）；zstd 读取由驱动壳注入（scripts/run-gates/node-gate.mjs）`)
    return ''
  }
  return readFileSync(p, 'utf8')
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

const isLeadLog = (text) => {
  const first = text.split('\n')[0]
  try {
    const h = JSON.parse(first)
    return h?.type === 'session' && (h.delegationDepth ?? 0) === 0 && h.agentPreset === 'lead'
  } catch { return false }
}

const hasLogFiles = (root) => {
  if (!root || !existsSync(root)) return false
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) { if (walk(p)) return true; continue }
      if (/\.jsonl(\.zstd)?$/.test(ent.name)) return true
    }
    return false
  }
  return walk(root)
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 门② 的结构化见证：`deliverables/presented` 事件的 files[].path（D28 新 run 用）。
 * 只读 lead 顶层日志；路径按 `drt_<slug>/final[/vN].md` 精确匹配（前缀 slug 不算）。
 * @returns {{status:'FOUND'|'NONE'|'UNATTESTED', detail:string, events:Array, logs:number}}
 */
export function presentedInLogs(sessionsRoot, slug, readLog = plainLogReader) {
  const out = { status: 'UNATTESTED', detail: '会话语料缺席——present 无证据', events: [], logs: 0 }
  const bare = String(slug ?? '').replace(/^drt_/, '')
  if (!sessionsRoot || !bare || !existsSync(sessionsRoot)) return out
  const re = new RegExp(`(?:^|/)(?:archive/|_abandoned/)?drt_${escapeRe(bare)}/(final(?:/v(\\d+))?\\.md)$`)
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) { walk(p); continue }
      if (!/\.jsonl(\.zstd)?$/.test(ent.name)) continue
      const text = readLog(p)
      if (!text) continue
      out.logs++
      if (!isLeadLog(text)) continue
      for (const line of text.split('\n')) {
        if (!line.includes('"deliverables/presented"')) continue
        let e
        try { e = JSON.parse(line) } catch { continue }
        if (e?.type !== 'deliverables/presented') continue
        for (const f of Array.isArray(e.data?.files) ? e.data.files : []) {
          const path = String(f?.path ?? '').replace(/\\/g, '/')
          const m = re.exec(path)
          if (m) out.events.push({ path, version: m[2] === undefined ? null : Number(m[2]), callId: e.data?.callId, turn: e.data?.turn })
        }
      }
    }
  }
  walk(sessionsRoot)
  if (out.logs === 0) return { ...out, detail: '会话语料无可用日志——present 无证据' }
  if (out.events.length === 0) return { ...out, status: 'NONE', detail: '会话语料在场，但无指向本 bundle 的 deliverables/presented 事件' }
  return { ...out, status: 'FOUND', detail: `deliverables/presented ${out.events.length} 条` }
}

/**
 * 门③ 的结构化见证：`user-question-reply`（callId 绑定 ask 的 §Decisions 拍板行）。
 * 只读 lead 顶层日志；要求 outcome=answered 且选定标签含「定稿」；代理标记随行。
 * @returns {{status:'FOUND'|'NONE'|'UNATTESTED', detail:string, replies:Array, logs:number}}
 */
export function hitl2ReplyInLogs(sessionsRoot, slug, readLog = plainLogReader) {
  const out = { status: 'UNATTESTED', detail: '会话语料缺席——HITL2 答复无证据', replies: [], logs: 0 }
  if (!sessionsRoot || !slug || !existsSync(sessionsRoot)) return out
  const collectLabels = (o, labels) => {
    if (o === null || typeof o !== 'object') return
    if (Array.isArray(o.selected)) labels.push(...o.selected.map(String))
    else if (typeof o.selected === 'string') labels.push(o.selected)
    if (typeof o.custom === 'string' && o.custom.trim() !== '') labels.push(o.custom)
    for (const v of Object.values(o)) if (v !== null && typeof v === 'object') collectLabels(v, labels)
  }
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) { walk(p); continue }
      if (!/\.jsonl(\.zstd)?$/.test(ent.name)) continue
      const text = readLog(p)
      if (!text) continue
      out.logs++
      if (!isLeadLog(text)) continue
      const asks = new Map()
      for (const line of text.split('\n')) {
        if (!line.includes('"tool/call"') || !line.includes('ask_user_question')) continue
        let e
        try { e = JSON.parse(line) } catch { continue }
        if (e?.type !== 'tool/call' || e?.data?.name !== 'ask_user_question') continue
        const args = String(e.data?.arguments ?? '')
        if (/交付审阅|HITL2/.test(args)) asks.set(e.data?.callId, args)
      }
      if (asks.size === 0) continue
      for (const line of text.split('\n')) {
        if (!line.includes('user-question-reply')) continue
        let e
        try { e = JSON.parse(line) } catch { continue }
        const items = Array.isArray(e?.data?.inserted) ? e.data.inserted : (e?.data?.source !== undefined ? [e.data] : [])
        for (const item of items) {
          const src = item?.source
          if (src?.kind !== 'user-question-reply') continue
          if (!asks.has(src.callId)) continue
          if (src.outcome !== undefined && src.outcome !== 'answered') continue
          const content = (Array.isArray(item.content) ? item.content : []).map((c) => c?.text ?? '').join('\n')
          let parsed = null
          try { parsed = JSON.parse(content) } catch { /* text reply */ }
          const labels = []
          collectLabels(parsed, labels)
          if (labels.length === 0 && content.trim() !== '') labels.push(content.trim())
          const label = labels.find((l) => /定稿/.test(l))
          if (label === undefined) continue
          out.replies.push({ callId: src.callId, label, proxy: /代理模拟|hitl-answer|代理代答/.test(content + asks.get(src.callId)) })
        }
      }
    }
  }
  walk(sessionsRoot)
  if (out.logs === 0) return { ...out, detail: '会话语料无可用日志——HITL2 答复无证据' }
  if (out.replies.length === 0) return { ...out, status: 'NONE', detail: '会话语料在场，但无 callId 绑定的 user-question-reply（选定定稿）' }
  return { ...out, status: 'FOUND', detail: `user-question-reply ${out.replies.length} 条` }
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
  if (!hasLogFiles(sessionsRoot)) {
    return { status: 'UNATTESTED', detail: '会话语料缺席——门①无法核对 HITL1 锚点（无证据 ≠ PASS）' }
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
  const pre = isPreContract(bundleDir, hitlDate, HITL_CONTRACT_DATE)
  if (hitl1Signed === 0) {
    return {
      status: pre ? 'PRE-CONTRACT' : 'RED',
      detail: `写过 question.md 的会话 ${writerSessions} 个、ask ${asks} 次，但 HITL1 签名（研究类型问）0 次——两 HITL 锚点之首缺失（BUG-006 形态：快路径自我豁免；persona 契约 = 任何研究请求先 HITL1，零例外）` +
        (pre ? PRE_CONTRACT_NOTE : ''),
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
 * 门③：final/ 版本记账在场 → §Decisions 须含 HITL2 拍板行（从 gateBundle 内联提函数——
 * 与其余各门同构；rows 供门② 的操作侧补齐判定复用，单一来源）。
 * @returns { gate: { status, detail }, rows: HITL2 拍板行列表 }
 */
/**
 * 一行 §Decisions 是否算「HITL2 拍板行」（单一判据；门③ 与门A 共用）。
 * 两条已文档化形态都认：① 字面 `HITL2`；② **代理代答 provenance 行**（`hitl-answer` 驱动，
 * 行内点明「交付审阅」且带「代理模拟」标记——操作侧代驱的显式记账纪律，见 hitl-provenance）。
 * @param line §Decisions 的单行文本。
 * @returns 是否计为 HITL2 拍板行。
 */
export function isHitl2Row(line) {
  if (/HITL2/.test(line)) return true
  return /交付审阅/.test(line) && /代理模拟|hitl-answer/.test(line)
}

export function hitl2RowGate(bundleDir, sessionsRoot, readLog = plainLogReader) {
  const finalDir = join(bundleDir, 'final')
  const versionFiles = existsSync(finalDir) ? readdirSync(finalDir).filter((f) => f.endsWith('.md')) : []
  const qPath = join(bundleDir, 'question.md')
  const qText = existsSync(qPath) ? readFileSync(qPath, 'utf8') : null
  const dec = qText ? decisionsLines(qText) : []
  const hitl2Rows = dec.filter((l) => isHitl2Row(l))
  const proxyRows = hitl2Rows.filter((l) => !/HITL2/.test(l))
  const newContract = contractEpochOf(bundleDir) !== null
  let gate
  if (versionFiles.length === 0) {
    gate = { status: 'N/A', detail: 'final/ 版本记账不在场——门③无对象（bundle 未到交付段；显式标注，不静默跳过）' }
  } else if (!qText) {
    gate = { status: 'RED', detail: 'final/ 记账在场但 question.md 缺席——方向契约文件失踪，fail-loud（不静默跳过）' }
  } else if (hitl2Rows.length === 0) {
    gate = { status: 'RED', detail: `final/ 记账在场（${versionFiles.join(', ')}）但 §Decisions 无任何 HITL2 拍板行——版本落盘先于用户裁决（G8 形态）` }
  } else if (newContract) {
    const reply = hitl2ReplyInLogs(sessionsRoot, basename(bundleDir), readLog)
    if (reply.status === 'UNATTESTED') {
      gate = { status: 'UNATTESTED', detail: `§Decisions 有 ${hitl2Rows.length} 条 HITL2 行，但会话语料缺席——事件链无证据（无证据 ≠ PASS）` }
    } else if (reply.status !== 'FOUND') {
      gate = { status: 'RED', detail: `§Decisions 有 ${hitl2Rows.length} 条 HITL2 行，但会话语料无 callId 绑定的 user-question-reply（选定定稿）——文本行不能自证` }
    } else {
      const r = reply.replies[0]
      gate = { status: 'PASS', detail: `HITL2 事件链在场：callId ${r.callId} 选定「${r.label}」${r.proxy ? '（代理模拟，已显式标记）' : ''}` }
    }
  } else {
    gate = {
      status: 'PASS',
      detail: `§Decisions 含 ${hitl2Rows.length} 条 HITL2 拍板行`
        + (proxyRows.length > 0 ? `（其中 ${proxyRows.length} 条为**代理代答 provenance**——已按显式记账纪律落行；旧场无 run.md，按 epoch 豁免事件链）` : '旧场无 run.md，按 epoch 豁免事件链'),
    }
  }
  return { gate, rows: hitl2Rows }
}

/**
 * 门②：final.md 当前版 + review readiness PASS → present 声明在日志（或显式操作侧补齐记账）。
 * 从 gateBundle 内联提函数（与其余各门同构）；hitl2Rows 由门③ 供给（操作侧补齐行的唯一来源）。
 */
export function presentGate(bundleDir, sessionsRoot, hitl2Rows, readLog) {
  const slug = basename(bundleDir)
  const finalPath = join(bundleDir, 'final.md')
  const reviewPath = join(bundleDir, 'review.md')
  const reviewText = existsSync(reviewPath) ? readFileSync(reviewPath, 'utf8') : ''
  const reviewPass = readinessOf(reviewText).pass
  if (!existsSync(finalPath)) {
    return { status: 'N/A', detail: 'final.md 当前版不在场——门②无对象' }
  }
  if (!reviewPass) {
    return { status: 'N/A', detail: 'review.md readiness 非 PASS——HITL2 前置未达成，交付门②无对象' }
  }
  const newContract = contractEpochOf(bundleDir) !== null
  if (newContract) {
    const found = presentedInLogs(sessionsRoot, slug, readLog)
    if (found.status === 'UNATTESTED') return { status: 'UNATTESTED', detail: found.detail }
    if (found.status !== 'FOUND') return { status: 'RED', detail: found.detail }
    const versioned = found.events.filter((e) => e.version !== null && existsSync(join(bundleDir, 'final', `v${e.version}.md`)))
    if (versioned.length === 0) {
      return { status: 'RED', detail: 'deliverables/presented 在场，但未指向在场的 final/vN（present 指 final.md 或版本账缺席——不可变快照不成立）' }
    }
    const hit = versioned[0]
    return { status: 'PASS', detail: `deliverables/presented 指向 ${hit.path}（callId ${hit.callId ?? '—'}）——不可变快照` }
  }
  const inLog = presentInLogs(sessionsRoot, slug, readLog)
  const relayRow = hitl2Rows.find((l) => /操作侧/.test(l))
  if (inLog) return { status: 'PASS', detail: '会话日志含指向本 bundle 的 present 声明（旧场无 run.md，按 epoch 豁免结构化事件）' }
  if (relayRow) return { status: 'PASS-RELAY', detail: '日志无 present 调用，但 §Decisions 拍板行显式标注操作侧补齐（旧场 epoch 豁免）——放行带注' }
  return { status: 'RED', detail: 'final.md + readiness PASS 在场，但日志无 present 调用、拍板行也无操作侧补齐标注——静默缺席（G8 形态）' }
}
