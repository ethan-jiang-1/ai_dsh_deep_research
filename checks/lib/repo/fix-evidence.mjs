// fix-evidence.mjs — bug 修复卡的结构化实证合同（2026-11-14 假修事故；D55 补强；纯函数，keyless）。
//
// 为什么存在：卡内只有 `## 修复判据` 不够——状态可以翻、卡可以移，repo 却没有变更。修复 =
// `## 修复落地` 内一个 `json fix-evidence` 块：changes（仓内文件路径）+ red {command, exit, output?}
// + green {command, exit} + guard（永久守卫路径，或 notMechanizable+trigger）。**exit 是 oracle**，
// 不是散文里的“失败/通过”子串；grandfather 仅对盘上已归档旧卡（allowLegacyProse=true 且 opened < 2026-11-15）
// 生效——活跃 bugs/ 与新归档提交一律要求结构化 `json fix-evidence`，禁止借旧 opened 日期绕过。
// 章节边界复用 `markdown-mask.ts` 剥离围栏与注释，防止围栏内 `## ` 截断；重复键经 JSON.parse 解码词法 token
// 拦截 `\uXXXX` 同键绕过。
import { maskMarkdownLines } from '../../../packages/deep-research-pack/src/lib/shared/markdown-mask.ts'

const CUTOFF = '2026-11-15'
const REPLAYABLE = /(node\s+(?:--import\s+\S+\s+)?--test|pnpm\s+(?:test|verify)|gates\.e2e)/

const fixSectionOf = (text) => {
  const normalized = String(text ?? '').replace(/\r\n?/g, '\n')
  const rawLines = normalized.split('\n')
  const maskedLines = maskMarkdownLines(normalized)
  const startIdx = maskedLines.findIndex((line) => /^ {0,3}##(?!#)\s*修复落地/.test(line))
  if (startIdx === -1) return null
  let endIdx = maskedLines.length
  for (let i = startIdx + 1; i < maskedLines.length; i += 1) {
    if (/^ {0,3}##(?!#)\s+/.test(maskedLines[i])) {
      endIdx = i
      break
    }
  }
  return rawLines.slice(startIdx + 1, endIdx).join('\n').trim()
}

/** 取 `## 修复落地` 内某个标签（改动/红证/绿证…）的块；仅盘上已归档旧卡兼容用。 */
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

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
/** 文件路径（目录/glob/绝对/.. 不是「改动」的可配对对象）。 */
const isFileLike = (path) => typeof path === 'string' && path !== ''
  && !path.endsWith('/') && !/[*?[\]{}]/.test(path) && !path.startsWith('/') && !path.split('/').includes('..')

const openedOf = (text) => /^opened:\s*(\d{4}-\d{2}-\d{2})\s*$/m.exec(String(text ?? ''))?.[1] ?? null

/** 同一对象内的重复键（JSON.parse 会静默取末值）——对字符串字面量做真实 JSON 解码以防 \uXXXX 同键绕过。 */
const duplicateKeyOf = (text) => {
  const stack = []
  let index = 0
  let expectKey = false
  while (index < text.length) {
    const ch = text[index]
    if (ch === '"') {
      let j = index + 1
      let escape = false
      while (j < text.length) {
        const c = text[j]
        if (escape) { escape = false; j += 1; continue }
        if (c === '\\') { escape = true; j += 1; continue }
        if (c === '"') break
        j += 1
      }
      if (j >= text.length) return null
      let decoded = null
      try {
        decoded = JSON.parse(text.slice(index, j + 1))
      } catch {
        return null
      }
      const isKey = expectKey && stack.length > 0 && stack[stack.length - 1] !== null && /^\s*:/.test(text.slice(j + 1))
      if (isKey) {
        const set = stack[stack.length - 1]
        if (set.has(decoded)) return decoded
        set.add(decoded)
        expectKey = false
      } else {
        expectKey = false
      }
      index = j + 1
      continue
    }
    if (ch === '{') { stack.push(new Set()); expectKey = true; index += 1; continue }
    if (ch === '}') { stack.pop(); expectKey = false; index += 1; continue }
    if (ch === '[') { stack.push(null); expectKey = false; index += 1; continue }
    if (ch === ']') { stack.pop(); expectKey = false; index += 1; continue }
    if (ch === ',') { expectKey = true; index += 1; continue }
    index += 1
  }
  return null
}

/** 按 CommonMark 围栏规则提取 `## 修复落地` 内顶层 `json fix-evidence` 代码块。 */
const extractFixEvidenceFences = (section) => {
  const blocks = []
  let fence = null
  let current = []
  for (const line of section.split('\n')) {
    if (fence !== null) {
      const closeRe = new RegExp(`^ {0,3}${fence.ch}{${fence.len},}[ \\t]*$`)
      if (closeRe.test(line)) {
        if (fence.capture) blocks.push(current.join('\n'))
        fence = null
        current = []
      } else if (fence.capture) {
        current.push(line)
      }
      continue
    }
    const open = /^ {0,3}(`{3,}|~{3,})([^\n]*)$/.exec(line)
    if (open !== null && !(open[1][0] === '`' && open[2].includes('`'))) {
      const info = open[2].trim()
      const capture = /^json\s+fix-evidence(?:\s|$)/.test(info)
      fence = { ch: open[1][0], len: open[1].length, capture }
      current = []
    }
  }
  return blocks
}

/** 结构化块：0 / 1 个；多于一个 = 两种证据，拒绝挑一个。 */
const structuredOf = (section) => {
  const blocks = extractFixEvidenceFences(section)
  if (blocks.length === 0) return { blocks: 0, value: null, error: null }
  if (blocks.length > 1) return { blocks: 1, value: null, error: '只能有一个 `json fix-evidence` 块（两个 = 两种证据，拒绝挑一个）' }
  const duplicate = duplicateKeyOf(blocks[0])
  if (duplicate !== null) return { blocks: 1, value: null, error: `\`json fix-evidence\` 重复键 ${duplicate}（拒绝取末值）` }
  try {
    return { blocks: 1, value: JSON.parse(blocks[0]), error: null }
  } catch {
    return { blocks: 1, value: null, error: '`json fix-evidence` 不是合法 JSON' }
  }
}

const validateStructured = (value) => {
  if (!isPlainObject(value)) return ['结构化修复证据必须是 JSON 对象']
  const problems = []
  for (const key of Object.keys(value)) if (!['changes', 'red', 'green', 'guard'].includes(key)) problems.push(`未知字段 ${key}（只收 changes / red / green / guard）`)
  if (!Array.isArray(value.changes) || value.changes.length === 0) {
    problems.push('changes 必须是非空数组（仓内文件路径）')
  } else {
    const seen = new Set()
    for (const path of value.changes) {
      if (!isFileLike(path)) problems.push(`changes 只收仓内文件路径（目录 / glob / 绝对路径 / .. 不收）：${String(path)}`)
      else if (seen.has(path)) problems.push(`changes 重复路径：${path}`)
      else seen.add(path)
    }
  }
  for (const [label, mustFail] of [['red', true], ['green', false]]) {
    const step = value[label]
    if (!isPlainObject(step)) { problems.push(`${label} 必须是对象（command / exit / output?）`); continue }
    if (typeof step.command !== 'string' || step.command.trim() === '') problems.push(`${label}.command 必须是非空字符串`)
    if (!Number.isInteger(step.exit)) problems.push(`${label}.exit 必须是整数（实跑退出码）`)
    else if (mustFail && step.exit === 0) problems.push('red.exit 必须非 0（红证 = 旧实现/注入回归实跑失败）')
    else if (!mustFail && step.exit !== 0) problems.push('green.exit 必须为 0（绿证 = 同一判据修后通过）')
    if (step.output !== undefined && typeof step.output !== 'string') problems.push(`${label}.output 必须是字符串`)
    for (const key of Object.keys(step)) if (!['command', 'exit', 'output'].includes(key)) problems.push(`${label}.${key} 未知字段（只收 command / exit / output）`)
  }
  if (!isPlainObject(value.guard)) {
    problems.push('guard 必须是对象：{ path } 或 { notMechanizable, trigger }（每个修复必须沉淀永久守卫，或显式不可机械化）')
  } else {
    for (const key of Object.keys(value.guard)) if (!['path', 'notMechanizable', 'trigger'].includes(key)) problems.push(`guard.${key} 未知字段`)
    if (typeof value.guard.path === 'string') {
      if (!isFileLike(value.guard.path) || !/^(tests\/|checks\/smoke\/)/.test(value.guard.path)) {
        problems.push('guard.path 必须是 tests/ 或 checks/smoke/ 下的文件路径')
      }
      if (value.guard.notMechanizable !== undefined || value.guard.trigger !== undefined) {
        problems.push('guard 不能同时给 path 与 notMechanizable')
      }
    } else if (typeof value.guard.notMechanizable === 'string' && value.guard.notMechanizable.trim() !== '') {
      if (typeof value.guard.trigger !== 'string' || value.guard.trigger.trim() === '') problems.push('guard.notMechanizable 必须带 trigger')
    } else {
      problems.push('guard 必须给 path 或 notMechanizable + trigger')
    }
  }
  if (isPlainObject(value.red) && typeof value.red.command === 'string' && !REPLAYABLE.test(value.red.command)) {
    const testAsset = Array.isArray(value.changes) && value.changes.some((path) => typeof path === 'string'
      && (path.startsWith('tests/') || path.startsWith('checks/smoke/') || path === 'checks/lib/harness/gates-cases.mjs'))
    if (!testAsset) problems.push('red.command 不可重放，且 changes 没有测试/门禁资产（tests/…、checks/smoke/… 或 gates-cases）')
  }
  return problems
}

/** 修复卡「改动」里声明的仓内路径（结构化优先；仅 allowLegacyProse 时旧卡退回散文）。 */
export function fixChangePathsOf(text, { allowLegacyProse = false } = {}) {
  const section = fixSectionOf(text)
  if (section === null) return []
  const structured = structuredOf(section)
  if (structured.value !== null && Array.isArray(structured.value.changes)) {
    return [...new Set(structured.value.changes.filter((path) => typeof path === 'string' && isFileLike(path)))]
  }
  if (!allowLegacyProse) return []
  const opened = openedOf(text)
  if (opened !== null && opened >= CUTOFF) return []
  const block = labeledBlockOf(section, '改动')
  if (block === null) return []
  return [...new Set([...block.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1].trim())
    .filter((path) => isFileLike(path)))]
}

/** 修复卡声明的 guard（结构化块内）；无块/旧卡返回 null。 */
export function fixGuardOf(text) {
  const section = fixSectionOf(text)
  if (section === null) return null
  const structured = structuredOf(section)
  if (structured.value === null || !isPlainObject(structured.value.guard)) return null
  return structured.value.guard
}

/**
 * 修复卡实证合同：`## 修复落地` + `json fix-evidence` 块（changes / red / green / guard）。
 * 默认（活跃卡与新归档动作）强制要求结构化块；仅在扫描盘上既有归档旧卡（allowLegacyProse=true 且 opened < 2026-11-15）时 grandfather。
 */
export function fixEvidenceProblems(text, { allowLegacyProse = false } = {}) {
  const opened = openedOf(text)
  const isLegacyArchived = allowLegacyProse && opened !== null && opened < CUTOFF
  const section = fixSectionOf(text)
  if (section === null || section === '') {
    return isLegacyArchived ? [] : ['缺 ## 修复落地（结构化 fix-evidence 块）']
  }
  const structured = structuredOf(section)
  if (structured.error !== null) return [structured.error]
  if (structured.blocks === 0) {
    if (isLegacyArchived) return []
    return ['缺 `json fix-evidence` 块——改动 / 红证 / 绿证用字段表达（仅盘上已归档旧卡 grandfather）']
  }
  return validateStructured(structured.value)
}
