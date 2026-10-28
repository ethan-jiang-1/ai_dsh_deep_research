// node-gate-contracts.mjs — cross-gate contract dates and report parsers (keyless pure logic).
import { SCHEMA_VERSION, contractEpochOf, deliveryDate, runSchemaOf } from './schema-scan-core.mjs'
import { terminalVerdictLine } from '../../packages/deep-research-pack/src/lib/review-readiness.ts'

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

/** 门C 契约日（2026-10-23 = 可读终稿层落地日；新契约 run 非 quick_factual 才要求读者版，
 *  旧场按无 run.md 豁免，quick_factual 编制豁免——与其余门同语义）。 */
export const READABLE_CONTRACT_DATE = '2026-10-23'

/** 断代判定（各门共用形状）：整数契约（run.md 的 `schema:`）优先——schema ≥ 当前版本 = 现行契约，
 *  与日期无关；更小的整数契约 = 旧形态。无 schema 的旧 bundle 才回退日期：asOf 注入优先，其次
 *  run.md 的 contract epoch（D28），旧场无 run.md 才回退交付日（deliveryDate = final.md mtime 族）。
 *  无日期可断 = 从严（false——可定日期而不定 = 逃逸口，schema-scan 成例）。 */
export function isPreContract(bundleDir, asOf, contractDate) {
  const schema = runSchemaOf(bundleDir)
  if (schema !== null) return !(schema >= SCHEMA_VERSION)
  const epoch = contractEpochOf(bundleDir)
  const date = asOf ?? (epoch === null ? deliveryDate(bundleDir) : epoch === '' ? '9999-12-31' : epoch)
  return date !== null && date < contractDate
}

/** PRE-CONTRACT 详情后缀（五门共用；门A 另有带「存量由对账步处置」的长形态）。 */
export const PRE_CONTRACT_NOTE = '（契约前交付——如实报告不计红，run bundle 是交付记录不改历史）'

/** 装饰前缀的形状上限（与 pack `review-readiness.ts` 同值同义，本地镜像勿单独调）：
 *  短标签至多 1 枚、标题文字至多 1 段——判定词之前不许堆散文。 */
const VERDICT_PREFIX_MAX_LABELS = 1
const VERDICT_PREFIX_MAX_HEADING_CHUNKS = 1
/** 剥去行首装饰，返回以 `readiness` 开头的剩余文本；未到判定词返回 null。
 *  装饰 = 块引用/空白 · 列表符 · 箭头 · 标题标记与短标题文字 · 加粗/反引号 · 短标签（≤10 字 + 冒号）。 */

/** readiness 终局判定：仅认行首 verdict row（装饰变体见 stripVerdictDecor），最后一条有效判定生效；
 * 正文历史引用不夺权。与 pack terminalReadiness 保持兼容（装饰容忍 = 2026-10-16 窄放宽 (A)，
 * 两侧同 diff 同步；keyless .mjs 不导入 TS 源）。条件 PASS 只对终局判定标注。 */
export function readinessOf(reviewText) {
  // 判据单一正本（BUG-040）：**哪一行是终局**由 pack 的 `terminalVerdictLine` 说了算
  // （轮次仲裁修在它那里，见 BUG-036/notes 2026-10-18）；本函数只保留门独有的**附条件**语义。
  const terminal = terminalVerdictLine(reviewText)
  if (terminal === null || terminal.value !== 'PASS') return { pass: false, conditional: false }
  return { pass: true, conditional: /附条件|条件\s*[=＝：:]/.test(terminal.line) }
}

/** audit.md 的 CRITICAL 计数解析。结构化报告须有唯一概要摘要、唯一 CRITICAL 节、匹配当前 bundle 的标题，
 *  并且节内条目数与摘要一致；缺少生产报告结构的文本一律无效。 */
export function auditCriticalCount(text, expectedBundleName) {
  const lines = text.split(/\r?\n/)
  const titleIndexes = lines.flatMap((line, index) => /^#\s*Evidence Audit\b/i.test(line) ? [index] : [])
  const overviewIndexes = lines.flatMap((line, index) => /^##\s*概要\s*$/u.test(line) ? [index] : [])
  const summaryRows = lines.flatMap((line, index) => /^\s*\|\s*发现\s*\|/u.test(line) ? [{ line, index }] : [])
  const criticalHeadings = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^##\s+CRITICAL(?:\s|[（(]|$)/iu.test(line))
  const structured = titleIndexes.length > 0 || overviewIndexes.length > 0 || summaryRows.length > 0 || criticalHeadings.length > 0

  if (structured) {
    if (titleIndexes.length !== 1 || overviewIndexes.length !== 1) {
      return { valid: false, reason: 'audit.md 必须恰有一个 Evidence Audit 标题和概要章节' }
    }
    const title = /^#\s*Evidence Audit\s*[—-]\s*([a-z0-9][a-z0-9_-]*)\s*(?:（[^）]*）)?\s*$/iu.exec(lines[titleIndexes[0]])
    if (title?.[1] !== expectedBundleName) {
      return { valid: false, reason: `audit.md 报告 bundle 标识与目录不符（标题 ${title?.[1] ?? '缺失'}；目录 ${expectedBundleName}）` }
    }
    if (summaryRows.length !== 1) return { valid: false, reason: 'audit.md 概要必须恰有一条“发现”计数行' }
    const overviewStart = overviewIndexes[0]
    const overviewEnd = lines.findIndex((line, index) => index > overviewStart && /^#{1,6}\s/.test(line))
    const summary = summaryRows[0]
    if (summary.index <= overviewStart || (overviewEnd !== -1 && summary.index >= overviewEnd)) {
      return { valid: false, reason: 'audit.md “发现”计数行必须位于概要章节内' }
    }
    if (!lines.slice(overviewStart + 1, summary.index).some((line) => /^\s*\|\s*检查\s*\|\s*结果\s*\|\s*$/u.test(line))) {
      return { valid: false, reason: 'audit.md 概要缺少“检查 / 结果”表头' }
    }
    const match = /^\s*\|\s*发现\s*\|\s*CRITICAL\s*(?:=|＝|:|：)?\s*(\d+)\s*·\s*MAJOR\s*(?:=|＝|:|：)?\s*\d+\s*·\s*INFO\s*(?:=|＝|:|：)?\s*\d+\s*\|\s*$/iu.exec(summary.line)
    if (match === null) return { valid: false, reason: 'audit.md “发现”计数行格式错误或缺少 CRITICAL / MAJOR / INFO 显式计数' }
    if (criticalHeadings.length !== 1) return { valid: false, reason: 'audit.md 必须恰有一个 CRITICAL 章节' }

    const section = criticalHeadings[0]
    if (section.index <= summary.index) return { valid: false, reason: 'audit.md CRITICAL 章节必须位于概要计数之后' }
    const body = []
    for (let i = section.index + 1; i < lines.length && !/^#{1,6}\s/.test(lines[i]); i++) {
      if (lines[i].trim() !== '') body.push(lines[i].trim())
    }
    const count = Number(match[1])
    if (!Number.isSafeInteger(count)) return { valid: false, reason: 'audit.md CRITICAL 计数超出安全整数范围' }
    if (count === 0 && (body.length !== 1 || !/^(?:（无）|\(无\))$/u.test(body[0]))) {
      return { valid: false, reason: 'audit.md CRITICAL 计数为 0 时，章节必须仅含“（无）”' }
    }
    if (count > 0) {
      const entries = body.filter((line) => /^-\s+/.test(line)).length
      if (body.length !== count || entries !== count) {
        return { valid: false, reason: `audit.md CRITICAL 计数为 ${count}，但 CRITICAL 章节有 ${entries} 个完整条目` }
      }
    }
    return { valid: true, count }
  }

  return { valid: false, reason: 'audit.md 不是可识别的结构化 Evidence Audit 报告' }
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
