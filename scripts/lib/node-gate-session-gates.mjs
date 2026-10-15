// node-gate-session-gates.mjs — session-bound HITL and present gates (keyless pure logic).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { planCardsOf } from './plan-card.mjs'
import { HITL_CONTRACT_DATE, PRE_CONTRACT_NOTE, decisionsLines, isPreContract, readinessOf } from './node-gate-contracts.mjs'

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
export function hitl2RowGate(bundleDir) {
  const finalDir = join(bundleDir, 'final')
  const versionFiles = existsSync(finalDir) ? readdirSync(finalDir).filter((f) => f.endsWith('.md')) : []
  const qPath = join(bundleDir, 'question.md')
  const qText = existsSync(qPath) ? readFileSync(qPath, 'utf8') : null
  const dec = qText ? decisionsLines(qText) : []
  const hitl2Rows = dec.filter((l) => /HITL2/.test(l))
  let gate
  if (versionFiles.length === 0) {
    gate = { status: 'N/A', detail: 'final/ 版本记账不在场——门③无对象（bundle 未到交付段；显式标注，不静默跳过）' }
  } else if (!qText) {
    gate = { status: 'RED', detail: 'final/ 记账在场但 question.md 缺席——方向契约文件失踪，fail-loud（不静默跳过）' }
  } else if (hitl2Rows.length === 0) {
    gate = { status: 'RED', detail: `final/ 记账在场（${versionFiles.join(', ')}）但 §Decisions 无任何 HITL2 拍板行——版本落盘先于用户裁决（G8 形态）` }
  } else {
    gate = { status: 'PASS', detail: `§Decisions 含 ${hitl2Rows.length} 条 HITL2 拍板行` }
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
  const inLog = presentInLogs(sessionsRoot, slug, readLog)
  const relayRow = hitl2Rows.find((l) => /操作侧/.test(l))
  if (inLog) return { status: 'PASS', detail: '会话日志含指向本 bundle 的 present 声明' }
  if (relayRow) return { status: 'PASS-RELAY', detail: '日志无 present 调用，但 §Decisions 拍板行显式标注操作侧补齐（通道死亡恢复路径，如实记账）——放行带注' }
  return { status: 'RED', detail: 'final.md + readiness PASS 在场，但日志无 present 调用、拍板行也无操作侧补齐标注——静默缺席（G8 形态）' }
}
