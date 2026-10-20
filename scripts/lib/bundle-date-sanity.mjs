// bundle-date-sanity.mjs — run bundle 的**未来日期**检查（操作侧验收前哨）。
//
// 为什么存在（2026-10-20 审计 P0-2）：r1-license bundle 的 29 处日期写成 2026-11-02（当前
// 2026-10-20），evidence-audit 只查 retrieved_at 在场、不校准日期，critic 判 PASS。完整日期
// 校准不可机械化（页面自带日期、口径），但"未来日期"是硬矛盾，机械可判。
// 范围刻意窄：evidence frontmatter 的 retrieved_at + journal/question 的**行首日期**；
// 不扫 final/正文——研究内容里的未来年份（预测/时间线）是合法内容，不是记账日期。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { splitFrontmatter } from './frontmatter.mjs'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86400 * 1000

function dateMs(date) {
  if (!DATE.test(date)) return null
  const t = Date.parse(`${date}T00:00:00Z`)
  return Number.isFinite(t) ? t : null
}

function walkMd(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) walkMd(p, out)
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(p)
  }
  return out
}

/**
 * @param {string} bundleDir run bundle 根。
 * @param {{now?: number, toleranceDays?: number}} [options] now = epoch ms；容忍天数默认 1
 *   （时区/跨午夜记账误差；13 天这种硬矛盾仍会红）。
 * @returns {Array<{file: string, field: string, date: string, detail: string}>}
 */
export function futureDateFindings(bundleDir, { now = Date.now(), toleranceDays = 1 } = {}) {
  const findings = []
  const limit = now + toleranceDays * DAY_MS
  const add = (file, field, date, detail) => {
    const t = dateMs(date)
    if (t !== null && t > limit) findings.push({ file, field, date, detail })
  }
  const evDir = join(bundleDir, 'evidence')
  for (const p of walkMd(evDir)) {
    let parsed
    try { parsed = splitFrontmatter(readFileSync(p, 'utf8')) } catch { continue }
    const date = parsed?.fm?.retrieved_at
    if (typeof date === 'string') add(relative(bundleDir, p), 'retrieved_at', date.trim(), '抓取日期晚于验收时刻（未来日期）')
  }
  for (const name of ['journal.md', 'question.md']) {
    const p = join(bundleDir, name)
    if (!existsSync(p) || !statSync(p).isFile()) continue
    const lines = readFileSync(p, 'utf8').split('\n')
    lines.forEach((line, i) => {
      const m = /^(?:##\s*|-\s*)(\d{4}-\d{2}-\d{2})\b/.exec(line)
      if (m !== null) add(name, `line ${i + 1}`, m[1], '记账行日期晚于验收时刻（未来日期）')
    })
  }
  return findings
}
