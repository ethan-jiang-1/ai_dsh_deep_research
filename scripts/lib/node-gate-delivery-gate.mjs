// node-gate-delivery-gate.mjs — Gate A delivery completeness (keyless pure logic).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { runType } from './schema-scan-core.mjs'
import { AUDIT_CONTRACT_DATE, isPreContract, readinessOf, auditCriticalCount } from './node-gate-contracts.mjs'

/**
 * 门A（交付完整性门，可导入；keyless；RFC 2026-10-07-delivery-criteria-mechanization）。
 * 为什么存在：NODES.md 第 8 行承诺交付判据 = 版本记账 + present + **审计 CRITICAL=0**，但
 * audit.md 与 final/v1.md 此前住 schema-scan「尾件缺（分档）」不计红、门④只管 vN≥2——
 * 2026-10-07 全仓审计实锤 7 个契约期交付 bundle 无 audit.md（交付判据在合同、脚本、操作面
 * 三方各是不同子集）。触发 = final.md 在场（综合产出在，交付段可判）：
 *   A1 交叉：final/ 版本记账在场（任何 vN.md）× readiness 非 PASS → RED——交付越过审查
 *      前置（NODES 第 6 行「PASS = HITL2 前置」）；
 *   A2 交付件齐（readiness PASS = 交付前置达成，门②同款触发）：final/v1.md 在场（版本
 *      记账——geometry-coaching 实测缺席形态）+ audit.md 在场且摘要/CRITICAL 节可解析、计数为 0
 *      （操作侧审计载体，evidence-audit 写盘）→ 缺席或无效/非零 RED；
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
    const auditPath = join(bundleDir, 'audit.md')
    if (!existsSync(auditPath)) {
      problems.push('交付前置达成但 audit.md 缺席——操作侧审计未做（NODES 第 8 行交付判据含审计 CRITICAL=0；修正 = 跑 node scripts/run-gates/evidence-audit.mjs <bundle> 落盘审计报告）')
    } else {
      let auditText
      try {
        auditText = readFileSync(auditPath, 'utf8')
      } catch (error) {
        problems.push(`audit.md 无法读取，不能核实 CRITICAL=0（${error.message}）`)
      }
      if (auditText !== undefined) {
        const audit = auditCriticalCount(auditText, basename(bundleDir))
        if (!audit.valid) {
          problems.push(`audit.md 报告格式无效，不能核实 CRITICAL=0（${audit.reason}）`)
        } else if (audit.count !== 0) {
          problems.push(`audit.md 报告发现 CRITICAL ${audit.count}，交付要求必须为 0（先修复发现后重跑 evidence-audit）`)
        }
      }
    }
  }
  const pre = isPreContract(bundleDir, auditDate, AUDIT_CONTRACT_DATE)
  if (problems.length === 0) {
    const base = !reviewPass && !delivered
      ? 'final.md 在场而交付段未进入（无版本记账、readiness 非 PASS）——A1/A2 无对象'
      : '交付件齐：final/v1.md 版本记账 + bundle 身份匹配的 audit.md（可解析、CRITICAL=0）'
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
