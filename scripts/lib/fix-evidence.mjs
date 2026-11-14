// fix-evidence.mjs — bug 修复卡的实证合同（2026-11-14 假修事故；纯文本，keyless）。
//
// 为什么存在：卡内只有 `## 修复判据` 不够——状态可以翻、卡可以移，repo 却没有变更。修复 =
// `## 修复落地` 的 改动（仓内路径）+ 红证（命令 + 实跑失败片段）+ 绿证（命令 + 实跑通过片段）；
// 红证还须可重放（测试/门禁命令），或 改动 里至少一个测试/门禁资产。机械消费 =
// staged-change-pairing（同暂存集）与 backlog-liveness（活跃 修复落地）。
const fixSectionOf = (text) => {
  const match = /^##\s*修复落地[^\n]*$/m.exec(String(text ?? ''))
  if (match === null) return null
  const rest = String(text).slice(match.index + match[0].length)
  const next = rest.search(/^##\s+/m)
  return (next === -1 ? rest : rest.slice(0, next)).trim()
}

/** 取 `## 修复落地` 内某个标签（改动/红证/绿证…）的块，直到下一个标签。 */
const labeledBlockOf = (section, label) => {
  const lines = section.split('\n')
  const pattern = new RegExp(`^\\s*[-*]?\\s*(?:\\*\\*)?${label}(?:\\*\\*)?[：:]`)
  const at = lines.findIndex((line) => pattern.test(line))
  if (at === -1) return null
  const out = [lines[at]]
  for (let i = at + 1; i < lines.length; i += 1) {
    if (/^\s*[-*]?\s*(?:\*\*)?(?:改动|红证|绿证|反证|审查|去向)(?:\*\*)?[：:]/.test(lines[i])) break
    out.push(lines[i])
  }
  return out.join('\n')
}

/** 修复卡「改动」里声明的仓内路径（去重，保持顺序）。 */
export function fixChangePathsOf(text) {
  const section = fixSectionOf(text)
  if (section === null) return []
  const block = labeledBlockOf(section, '改动')
  if (block === null) return []
  return [...new Set([...block.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim()).filter(Boolean))]
}

/**
 * 修复卡实证合同：`## 修复落地` + 改动（至少一个 `仓内路径`）+ 红证（实跑失败片段）+
 * 绿证（实跑通过片段）；红证须可重放（测试/门禁命令）或改动含测试/门禁资产。
 */
export function fixEvidenceProblems(text) {
  const section = fixSectionOf(text)
  if (section === null || section === '') return ['缺 ## 修复落地（改动 / 红证 / 绿证）']
  const problems = []
  const change = labeledBlockOf(section, '改动')
  const paths = change === null ? [] : [...change.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim()).filter(Boolean)
  if (change === null) problems.push('缺「改动：`<仓内路径>`」')
  else if (paths.length === 0) problems.push('「改动」缺 `仓内路径`')
  for (const label of ['红证', '绿证']) {
    const block = labeledBlockOf(section, label)
    if (block === null) { problems.push(`缺「${label}」`); continue }
    const body = block.replace(new RegExp(`^.*?${label}(?:\\*\\*)?[：:]`, 's'), '')
    if (!/`[^`]+`|```/.test(body)) problems.push(`「${label}」缺命令（行内代码或围栏）`)
    const marker = label === '红证'
      ? /(FAIL|RED|not ok|AssertionError|exit\s*[1-9]|失败)/i
      : /(PASS|ok\b|exit\s*0|全绿|通过)/i
    if (!marker.test(body)) problems.push(`「${label}」缺实跑结果片段（${label === '红证' ? '失败' : '通过'}）`)
    if (label === '红证') {
      const replayable = /(node\s+--test|pnpm\s+(?:test|verify)|gates\.e2e)/.test(body)
      const testAsset = paths.some((path) =>
        path.startsWith('tests/') || path.startsWith('scripts/smoke/') || path === 'scripts/lib/gates-cases.mjs')
      if (!replayable && !testAsset) {
        problems.push('「红证」不可重放，且「改动」没有测试/门禁资产（tests/…、scripts/smoke/… 或 gates-cases）')
      }
    }
  }
  return problems
}
