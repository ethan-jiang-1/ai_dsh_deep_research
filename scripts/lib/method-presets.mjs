// method-presets.mjs —— research-brief skill「方法预设」表的**唯一解析入口**（2026-10-18 立）。
//
// 为什么要有它：「内置打法」这一份事实散在四处（客户端常量 / skill 表 / tests 期望 /
// client-load-smoke 名单，总卡发现 14）——解析逻辑各写一份就是第四份手写副本，改条数时
// 静默漂移。本件把解析收成一份，测试与冒烟共用：contract 变了就一起红（fail-loud）。
//
// 表形状合同（research-brief SKILL.md §方法预设）：表头恰为 METHOD_PRESET_HEADERS，
// 其后一行分隔行，再是数据行（到空行或首个无 `|` 行为止）。解析对形状 **fail-loud**：
// 表头缺席 / 分隔行非法 / 行列数不符 / 解析到 0 行都抛——静默解析成空集等于门禁不存在
// （防空语料纪律，scripts/AGENTS.md）。
//
// 消费方：tests/library-fold.test.mjs（客户端常量 ↔ skill 表 ↔ 期望三方对钉）、
// scripts/smoke/client-load-smoke.mjs（内置名单从表派生，不再手写）。
import { readFileSync } from 'node:fs'

/** canonical 表头（列序即语义：方法｜给用户的一句话｜信息源策略｜检验策略｜综合与呈现｜明确不承诺）。 */
export const METHOD_PRESET_HEADERS = ['方法', '给用户的一句话', '信息源策略', '检验策略', '综合与呈现', '明确不承诺']

/** skill 路径（相对仓根；消费方各自与自己的 ROOT 拼接）。 */
export const METHOD_PRESETS_SKILL_PATH = 'packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md'

/**
 * Markdown 表格行 → 单元格数组（识别转义 `\|` 与代码段内的 `|`）。
 * @param {string} line - 一行文本。
 * @returns {string[]} 去首尾空单元格后的单元格。
 */
export function markdownTableCells(line) {
  const cells = []
  let cell = ''
  let codeTicks = 0
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '`') {
      let count = 1
      while (line[i + count] === '`') count++
      codeTicks = codeTicks === 0 ? count : codeTicks === count ? 0 : codeTicks
      cell += '`'.repeat(count)
      i += count - 1
    } else if (char === '\\' && line[i + 1] === '|') {
      cell += '|'
      i++
    } else if (char === '|' && codeTicks === 0) {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += char
    }
  }
  cells.push(cell.trim())
  if (cells[0] === '') cells.shift()
  if (cells.at(-1) === '') cells.pop()
  return cells
}

/**
 * 从 research-brief skill 全文解析方法预设表。
 * @param {string} text - SKILL.md 全文。
 * @returns {readonly {name: string, summary: string, sections: {source: string, verify: string, report: string, limit: string}}[]} 表行（文件序）。
 */
export function methodPresetsFromSkill(text) {
  const lines = text.split(/\r?\n/)
  const headerIndex = lines.findIndex((line) => {
    const cells = markdownTableCells(line)
    return cells.length === METHOD_PRESET_HEADERS.length && cells.every((cell, i) => cell === METHOD_PRESET_HEADERS[i])
  })
  if (headerIndex === -1) throw new Error('research-brief skill 方法预设表头缺席或发生变化（合同 = scripts/lib/method-presets.mjs）')
  const separator = markdownTableCells(lines[headerIndex + 1] ?? '')
  if (separator.length !== METHOD_PRESET_HEADERS.length || !separator.every((cell) => /^:?-{3,}:?$/.test(cell))) {
    throw new Error('research-brief skill 方法预设表分隔行格式变化')
  }
  const rows = []
  for (const line of lines.slice(headerIndex + 2)) {
    if (line.trim() === '' || !line.includes('|')) break
    const cells = markdownTableCells(line)
    if (cells.length !== METHOD_PRESET_HEADERS.length) throw new Error(`方法预设表行列数变化：${line}`)
    rows.push({
      name: cells[0],
      summary: cells[1],
      sections: { source: cells[2], verify: cells[3], report: cells[4], limit: cells[5] },
    })
  }
  if (rows.length === 0) throw new Error('方法预设表解析到 0 行（表头在场但无数据行——防空语料）')
  return rows
}

/**
 * 读盘解析（消费方便利入口）。
 * @param {string} skillPath - SKILL.md 绝对路径。
 * @returns {ReturnType<typeof methodPresetsFromSkill>} 方法预设行。
 */
export function methodPresetsFromSkillFile(skillPath) {
  return methodPresetsFromSkill(readFileSync(skillPath, 'utf8'))
}

/** 判型 → 打法映射表的表头（skill §方法预设 的第二张表；推荐规则正本，U16 落点）。 */
export const MAPPING_HEADERS = ['判型模式', '推荐打法']

/**
 * 从 skill 全文解析「判型 → 打法映射」表（面板「推荐规则说明位」的投影源）。
 * @param {string} text - SKILL.md 全文。
 * @returns {readonly {patterns: string, method: string}[]} 映射行（文件序）。
 */
export function patternMethodMappingFromSkill(text) {
  const lines = text.split(/\r?\n/)
  const headerIndex = lines.findIndex((line) => {
    const cells = markdownTableCells(line)
    return cells.length === MAPPING_HEADERS.length && cells.every((cell, i) => cell === MAPPING_HEADERS[i])
  })
  if (headerIndex === -1) throw new Error('research-brief skill 判型→打法映射表头缺席或发生变化（合同 = scripts/lib/method-presets.mjs）')
  const rows = []
  for (const line of lines.slice(headerIndex + 2)) {
    if (line.trim() === '' || !line.includes('|')) break
    const cells = markdownTableCells(line)
    if (cells.length !== MAPPING_HEADERS.length) throw new Error(`判型→打法映射表列数变化：${line}`)
    rows.push({ patterns: cells[0], method: cells[1] })
  }
  if (rows.length === 0) throw new Error('判型→打法映射表解析到 0 行（防空语料）')
  return rows
}

/**
 * 从 skill 全文解析「共同底线」六条（任何打法都改不掉的那组）。
 * 形态合同：`共同底线（A、B、C、D、E、F）不因方法降级`。
 * @param {string} text - SKILL.md 全文。
 * @returns {readonly string[]} 底线条目（文件序）。
 */
export function baselineDisciplinesFromSkill(text) {
  const match = /共同底线（([^）]+)）/.exec(text)
  if (match === null) throw new Error('research-brief skill 的「共同底线（…）」句缺席或形态变化')
  const items = match[1].split('、').map((s) => s.trim()).filter((s) => s !== '')
  if (items.length === 0) throw new Error('共同底线解析到 0 条（防空语料）')
  return items
}
