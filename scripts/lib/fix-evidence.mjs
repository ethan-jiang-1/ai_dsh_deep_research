// fix-evidence.mjs — bug 修复卡的结构化实证合同（2026-11-14 假修事故；纯函数，keyless）。
//
// 为什么存在：卡内只有 `## 修复判据` 不够——状态可以翻、卡可以移，repo 却没有变更。修复 =
// `## 修复落地` 内一个 `json fix-evidence` 块：changes（仓内文件路径）+ red {command, exit, output?}
// + green {command, exit} + guard（永久守卫路径，或 notMechanizable+trigger）。**exit 是 oracle**，不是散文里的“失败/通过”子串；旧卡（2026-11-15 前）
// 无块时按散文 grandfather，不再参与否定词/引号/目录前缀的启发式判定。
// 机械消费 = staged-change-pairing（同暂存集）与 backlog-liveness（活跃 修复落地）。
const CUTOFF = '2026-11-15'
const REPLAYABLE = /(node\s+--test|pnpm\s+(?:test|verify)|gates\.e2e)/
const STRUCTURED = /```json\s+fix-evidence\s*\n([\s\S]*?)```/g

const fixSectionOf = (text) => {
  const match = /^##\s*修复落地[^\n]*$/m.exec(String(text ?? ''))
  if (match === null) return null
  const rest = String(text).slice(match.index + match[0].length)
  const next = rest.search(/^##\s+/m)
  return (next === -1 ? rest : rest.slice(0, next)).trim()
}

/** 取 `## 修复落地` 内某个标签（改动/红证/绿证…）的块；仅旧卡路径兼容用。 */
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

/** 同一对象内的重复键（JSON.parse 会静默取末值）——与 readiness 的重复键同类，fail-closed。 */
const duplicateKeyOf = (text) => {
  const stack = []
  let index = 0
  let expectKey = false
  while (index < text.length) {
    const ch = text[index]
    if (ch === '"') {
      let j = index + 1
      let value = ''
      let escape = false
      while (j < text.length) {
        const c = text[j]
        if (escape) { value += c; escape = false; j += 1; continue }
        if (c === '\\') { escape = true; j += 1; continue }
        if (c === '"') break
        value += c
        j += 1
      }
      const isKey = expectKey && stack.length > 0 && stack[stack.length - 1] !== null && /^\s*:/.test(text.slice(j + 1))
      if (isKey) {
        const set = stack[stack.length - 1]
        if (set.has(value)) return value
        set.add(value)
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

/** 结构化块：0 / 1 个；多于一个 = 两种证据，拒绝挑一个。 */
const structuredOf = (section) => {
  const blocks = [...section.matchAll(STRUCTURED)].map((match) => match[1])
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
      if (!isFileLike(value.guard.path) || !/^(tests\/|scripts\/smoke\/)/.test(value.guard.path)) {
        problems.push('guard.path 必须是 tests/ 或 scripts/smoke/ 下的文件路径')
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
      && (path.startsWith('tests/') || path.startsWith('scripts/smoke/') || path === 'scripts/lib/gates-cases.mjs'))
    if (!testAsset) problems.push('red.command 不可重放，且 changes 没有测试/门禁资产（tests/…、scripts/smoke/… 或 gates-cases）')
  }
  return problems
}

/** 修复卡「改动」里声明的仓内路径（结构化优先；旧卡退回散文；去重，保持顺序）。 */
export function fixChangePathsOf(text) {
  const section = fixSectionOf(text)
  if (section === null) return []
  const structured = structuredOf(section)
  if (structured.value !== null && Array.isArray(structured.value.changes)) {
    return [...new Set(structured.value.changes.filter((path) => typeof path === 'string' && isFileLike(path)))]
  }
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
 * 修复卡实证合同：`## 修复落地` + `json fix-evidence` 块（changes / red / green）；旧卡（< 2026-11-15）
 * 无块时 grandfather，不参与任何散文启发式。
 */
export function fixEvidenceProblems(text) {
  const section = fixSectionOf(text)
  if (section === null || section === '') return ['缺 ## 修复落地（结构化 fix-evidence 块）']
  const structured = structuredOf(section)
  if (structured.error !== null) return [structured.error]
  if (structured.blocks === 0) {
    const opened = openedOf(text)
    if (opened !== null && opened < CUTOFF) return []
    return ['缺 `json fix-evidence` 块——改动 / 红证 / 绿证用字段表达（旧卡 2026-11-15 前 grandfather）']
  }
  return validateStructured(structured.value)
}
