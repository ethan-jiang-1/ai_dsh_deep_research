// skill-golden.mjs — skill 正文金标准（BUG-258；keyless 纯 fs）。
//
// 快照 B 比的是 skill-catalog（名称/描述/路径），on-demand 加载的 SKILL.md 正文不在初始请求里，
// 因此正文回归不会被任何回放抓到。本模块给每个 SKILL.md 记 sha256：正文一变就红，更新必须显式
// 跑 tools/record/record-skill-golden.mjs（--update）并把 diff 带进评审。
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** presets/<role>/skills/<n>/SKILL.md 的 sha256 清单（按路径排序）。 */
export function skillBodyManifest(root, { read = readFileSync } = {}) {
  const presets = join(root, 'packages', 'deep-research-pack', 'presets')
  const out = []
  for (const role of readdirSync(presets, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()) {
    const skills = join(presets, role, 'skills')
    let names
    try { names = readdirSync(skills, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort() } catch { continue }
    for (const name of names) {
      const rel = `packages/deep-research-pack/presets/${role}/skills/${name}/SKILL.md`
      let text
      try { text = read(join(root, rel), 'utf8') } catch { continue }
      out.push({ path: rel, sha256: createHash('sha256').update(text).digest('hex') })
    }
  }
  return out
}

/** 盘上 manifest vs 金标准：缺文件/多文件/哈希变都点名（空金标准 = 红，防空语料）。 */
export function skillGoldenIssues(actual, golden) {
  if (!Array.isArray(golden) || golden.length === 0) return ['skill 金标准为空——防空语料（先跑 record-skill-golden.mjs --update）']
  const byPath = new Map(actual.map((e) => [e.path, e.sha256]))
  const issues = []
  for (const entry of golden) {
    if (!byPath.has(entry.path)) issues.push(`金标准条目在盘上不存在：${entry.path}`)
    else if (byPath.get(entry.path) !== entry.sha256) issues.push(`skill 正文变更：${entry.path}（重录 = node tools/record/record-skill-golden.mjs --update）`)
    byPath.delete(entry.path)
  }
  for (const path of byPath.keys()) issues.push(`新增 skill 未入金标准：${path}`)
  return issues
}
