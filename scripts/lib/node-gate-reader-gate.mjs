// node-gate-reader-gate.mjs — 门C：读者版合同（keyless 纯逻辑）。
//
// 为什么存在：终稿有两面——canonical（final.md / final/vN，审计与 critic 用）与读者版
// （final/readable-vN，用户读）。读者版不是第二份事实：它与 vN 同版、只压缩 canonical、
// 不带 [来源:]/evidence/ 路径。门C 只判机械可查的事实：同版、六节、长度、来源面；
// 「不新增事实」的语义判断归 Lead 自检 + HITL2 用户 + critic 的 canonical 审查。
//
// 断代：新契约（有 run.md）在 READABLE_CONTRACT_DATE 之后才要求读者版；旧 bundle 无
// run.md 按 epoch 豁免；quick_factual 编制豁免（与 node-gate 其余门同语义）。
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { contractEpochOf, runType } from './schema-scan-core.mjs'
import { READABLE_CONTRACT_DATE, PRE_CONTRACT_NOTE, isPreContract } from './node-gate-contracts.mjs'

/** 读者版六节（顺序即阅读顺序；机械判据只认这六个二级标题）。 */
export const READER_SECTIONS = ['结论', '为什么', '这对你意味着什么', '什么会改变这个结论', '目前不能判断', '依据与延伸']

/** 读者版硬顶：1–3 页目标下的机械上限（中文字符 + 行）。 */
export const READER_CHAR_CAP = 4500
export const READER_LINE_CAP = 180

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** final/ 下最高 vN；没有 = null。 */
export function highestFinalVersion(bundleDir) {
  const dir = join(bundleDir, 'final')
  if (!existsSync(dir)) return null
  const versions = readdirSync(dir)
    .map((f) => /^v(\d+)\.md$/.exec(f)?.[1])
    .filter((v) => v !== undefined)
    .map(Number)
    .filter((n) => Number.isSafeInteger(n) && n >= 1)
    .sort((a, b) => a - b)
  return versions.length === 0 ? null : versions[versions.length - 1]
}

/** 数字 token（≥2 位、排除年份）——只用于 WARN，不用于红。 */
function numericTokens(text) {
  return new Set((text.match(/\d+(?:[.,]\d+)?/g) ?? []).filter((t) => t.length >= 2 && !/^(?:19|20)\d{2}$/.test(t)))
}

/**
 * 门C（读者版合同，可导入；keyless）。
 * @param {string} bundleDir - run bundle 目录。
 * @param {{ asOf?: string }} [opts] - 断代注入（tests 用；缺省取 run.md contract 或交付日）。
 * @returns {{ status: 'PASS'|'RED'|'N/A'|'PRE-CONTRACT', detail: string }}
 */
export function readerGate(bundleDir, opts = {}) {
  const epoch = contractEpochOf(bundleDir)
  if (epoch === null) {
    return { status: 'N/A', detail: '旧契约 bundle（无 run.md）——读者版按 epoch 豁免，页签回退 canonical' }
  }
  if (isPreContract(bundleDir, opts.asOf, READABLE_CONTRACT_DATE)) {
    return { status: 'PRE-CONTRACT', detail: `读者版合同契约日 ${READABLE_CONTRACT_DATE} 之前的交付——如实报告不计红${PRE_CONTRACT_NOTE}` }
  }
  if (runType(bundleDir) === 'quick_factual') {
    return { status: 'N/A', detail: 'quick_factual 编制豁免——final.md 通常已是短答案，读者版可跳过' }
  }
  const version = highestFinalVersion(bundleDir)
  if (version === null) {
    return { status: 'N/A', detail: 'final/vN 不在场——门C 无对象（未到交付段；拍板前 N/A 是预期态）' }
  }
  const readerPath = join(bundleDir, 'final', `readable-v${version}.md`)
  if (!existsSync(readerPath)) {
    return {
      status: 'RED',
      detail: `final/v${version}.md 在场但 final/readable-v${version}.md 缺席——交付须有同版读者版（修正 = 按 reader-final skill 派生并复制为 readable-v${version}.md）`,
    }
  }
  const text = readFileSync(readerPath, 'utf8')
  const problems = []
  const rel = `final/readable-v${version}.md`
  // 同版 canonical 指针 + 「以 canonical 为准」
  const canonicalRe = new RegExp(`对应\\s*canonical\\s*[:：]\\s*final/v${version}\\.md`)
  if (!canonicalRe.test(text)) problems.push(`${rel} 缺「对应 canonical: final/v${version}.md」头`)
  if (!text.includes('以 canonical 为准')) problems.push(`${rel} 缺「以 canonical 为准」声明`)
  // 六节
  for (const section of READER_SECTIONS) {
    if (!new RegExp(`^##\\s*${escapeRe(section)}\\s*$`, 'm').test(text)) problems.push(`${rel} 缺节「## ${section}」`)
  }
  // 长度（去空白字符 + 行数）
  const compact = text.replace(/\s/g, '')
  if (compact.length > READER_CHAR_CAP) problems.push(`${rel} 超长：${compact.length} 字 > ${READER_CHAR_CAP}（读者版目标 1–3 页）`)
  if (text.split('\n').length > READER_LINE_CAP) problems.push(`${rel} 超长：${text.split('\n').length} 行 > ${READER_LINE_CAP}`)
  // 来源面：读者版不带行内来源标记 / evidence 路径 / bundle 路径
  if (text.includes('[来源:')) problems.push(`${rel} 含行内 [来源:]——依据应链回 canonical，不复制来源链`)
  if (/evidence\//.test(text)) problems.push(`${rel} 含 evidence/ 路径——依据应链回 canonical`)
  if (/drt_[a-z0-9][a-z0-9-]*\//.test(text)) problems.push(`${rel} 含 drt_ bundle 路径——对读者只链 canonical`)
  // 相对链接按 reader 所在 final/ 解析：v1.md / ../final.md / ../findings.md 等必须真实在场。
  // 2026-10-23 真实 run 抓到 reader 写 `final/v1.md`、`final.md`（会解析成 final/final/...）——契约
  // 要求「canonical 链接可解析」，所以这是红，不是观感问题。
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = match[1]
    if (/^(?:https?:|mailto:|#)/.test(target)) continue
    const clean = target.split('#')[0].split('?')[0]
    if (clean === '') continue
    if (!existsSync(join(bundleDir, 'final', clean))) {
      problems.push(`${rel} 链接不可解析：${target}（相对 reader 所在 final/ 解析）`)
    }
  }
  if (problems.length > 0) return { status: 'RED', detail: problems.join('；') }
  // 数字子集只 WARN：中文排版/区间写法会产生假红；语义归人工
  const canonicalText = readFileSync(join(bundleDir, 'final', `v${version}.md`), 'utf8')
  const canonicalNumbers = numericTokens(canonicalText)
  const extra = [...numericTokens(text)].filter((n) => !canonicalNumbers.has(n))
  const warn = extra.length === 0 ? '' : `；⚠ 读者版含 canonical 未出现的数字：${extra.slice(0, 8).join('、')}（人工核对是否新增）`
  return {
    status: 'PASS',
    detail: `${rel} 与 final/v${version}.md 同版；六节齐；${compact.length} 字 / ${text.split('\n').length} 行${warn}`,
  }
}
