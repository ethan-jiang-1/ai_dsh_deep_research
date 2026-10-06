// acceptance-check —— 收活验收判据的机械求值器（oss-dr 借鉴：DeerFlow acceptance_criteria
// 父侧纯函数核查的 keyless 移植，出处 = notes/implemented/2026-10-06-acceptance-criteria.md）。
// 语义三态 = PASS / FAIL / UNVERIFIED：判据落在文件上且机械可判 → PASS|FAIL；判不了（未知
// 判据形态 / 非对象 / 求值异常）→ UNVERIFIED 带原因——**永不静默放行**（收活纪律同款：
// UNVERIFIED 是第三态，不是跳过也不是 PASS）。lead 运行时的文件核验由 team-assembly skill
// 纪律承担（角色无 bash）；本模块供操作侧收尾核验与活体验证挂账把"收活结论"对账成机械事实。
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * @param {string} bundleDir run bundle 根（判据 path/file 相对它解析）。
 * @param {Array<object>} criteria 委派方显式写下的验收判据清单，机械可判叶子三型：
 *   - { type: 'file_exists', path }                文件在场且非空（在场≠达标）
 *   - { type: 'file_contains', path, needle }      文件含指定标记文本
 *   - { type: 'frontmatter_fields', file, fields } frontmatter 字段全在场且非空
 *   其他形态（语义判据如"数字与来源页一致"）= 人/critic 才能判 → UNVERIFIED。
 * @returns {{ verdicts: Array<{criterion, status, detail}>,
 *             summary: { total, pass, fail, unverified, noCriteria } }}
 *   零判据清单 → noCriteria=true（无判据委派是缺陷形态，显式报告不静默全 PASS——防空语料）。
 */
export function acceptanceCheck(bundleDir, criteria) {
  const list = Array.isArray(criteria) ? criteria : []
  const verdicts = list.map((c, i) => {
    const label = `#${i + 1} ${c?.type ?? '(无 type)'}`
    try {
      if (c === null || typeof c !== 'object' || typeof c.type !== 'string') {
        return { criterion: label, status: 'UNVERIFIED', detail: '判据形态不可机械判（非对象/无 type）——需人工或 critic 判，永不静默放行' }
      }
      if (c.type === 'file_exists') {
        if (typeof c.path !== 'string' || c.path.length === 0) {
          return { criterion: label, status: 'UNVERIFIED', detail: '判据缺参（path）——判据本身残缺，需委派方补判据；判不了永不静默放行' }
        }
        const p = join(bundleDir, c.path)
        if (!existsSync(p)) return { criterion: label, status: 'FAIL', detail: `文件缺席：${c.path}` }
        return statSync(p).size > 0
          ? { criterion: label, status: 'PASS', detail: `在场且非空：${c.path}` }
          : { criterion: label, status: 'FAIL', detail: `文件在场但为空：${c.path}` }
      }
      if (c.type === 'file_contains') {
        if (typeof c.path !== 'string' || c.path.length === 0 || typeof c.needle !== 'string' || c.needle.length === 0) {
          return { criterion: label, status: 'UNVERIFIED', detail: '判据缺参（path/needle）——判据本身残缺，需委派方补判据；判不了永不静默放行' }
        }
        const p = join(bundleDir, c.path)
        if (!existsSync(p)) return { criterion: label, status: 'FAIL', detail: `文件缺席：${c.path}` }
        const hit = readFileSync(p, 'utf8').includes(c.needle)
        return hit
          ? { criterion: label, status: 'PASS', detail: `含标记：${c.path} ∋ ${c.needle}` }
          : { criterion: label, status: 'FAIL', detail: `不含标记：${c.path} ∌ ${c.needle}` }
      }
      if (c.type === 'frontmatter_fields') {
        if (typeof c.file !== 'string' || c.file.length === 0 || !Array.isArray(c.fields) || c.fields.length === 0) {
          return { criterion: label, status: 'UNVERIFIED', detail: '判据缺参（file/fields）——判据本身残缺，需委派方补判据；判不了永不静默放行' }
        }
        const p = join(bundleDir, c.file)
        if (!existsSync(p)) return { criterion: label, status: 'FAIL', detail: `文件缺席：${c.file}` }
        const fm = /^---\n([\s\S]*?)\n---/.exec(readFileSync(p, 'utf8'))?.[1] ?? ''
        const missing = c.fields.filter((f) => !new RegExp(`^${f}\\s*:\\s*\\S`, 'm').test(fm))
        return missing.length === 0
          ? { criterion: label, status: 'PASS', detail: `字段齐：${c.file}` }
          : { criterion: label, status: 'FAIL', detail: `缺字段：${c.file} 缺 ${missing.join(', ')}` }
      }
      return { criterion: label, status: 'UNVERIFIED', detail: `未知判据形态 ${c.type}——需人工或 critic 判，永不静默放行` }
    } catch (err) {
      return { criterion: label, status: 'UNVERIFIED', detail: `求值异常（${String(err?.message ?? err)}）——判不了要说明，不静默` }
    }
  })
  const summary = {
    total: verdicts.length,
    pass: verdicts.filter((v) => v.status === 'PASS').length,
    fail: verdicts.filter((v) => v.status === 'FAIL').length,
    unverified: verdicts.filter((v) => v.status === 'UNVERIFIED').length,
    noCriteria: list.length === 0,
  }
  return { verdicts, summary }
}
