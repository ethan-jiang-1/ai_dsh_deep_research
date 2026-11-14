// ci-workflow.mjs — GitHub Actions 工作流的**执行面**子集解析（BUG-172；纯字符串，keyless）。
//
// 为什么存在：smoke-registry 只抽 `run:` 行文本，step 的 `if: false` / `continue-on-error`
// 与 job 的 `needs` 都不在判据里——被跳过的 smoke 仍算 CI 资产。本模块只解析本仓 CI 实际使用的
// 形状（顶层 `on:` / `jobs:`、4 空格 job 字段、6 空格 step、`run: |` 块），不追求通用 YAML：
// 解析不出来 = 没有执行证据 → 调用方判红（fail-closed），不静默补一个「看起来像」的答案。
//
// 语义：一个 smoke 只有同时满足「job 在 all-checks-passed.needs」「job/step 无永假条件 /
// continue-on-error」「run 段里真的以 node 执行该文件」才算 CI 证据。注释、echo、heredoc、
// 字符串里的路径都不算。
const indentOf = (line) => /^\s*/.exec(line)[0].length
const isSkippable = (line) => line.trim() === '' || line.trimStart().startsWith('#')
const unquote = (value) => String(value ?? '').trim().replace(/^["']|["']$/g, '').trim()
const isFalseExpr = (expr) => {
  const value = unquote(String(expr ?? '').replace(/^\$\{\{\s*|\s*\}\}$/g, '')).toLowerCase()
  return value === 'false' || value === '!true' || value === '0'
}
const isTrue = (expr) => unquote(String(expr ?? '')).toLowerCase() === 'true'
const parseList = (raw) => {
  const value = String(raw ?? '').trim()
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map(unquote).filter(Boolean)
  }
  return value === '' ? [] : [unquote(value)]
}

function parseEvents(lines) {
  const index = lines.findIndex((line) => /^on:\s*(.*)$/.test(line))
  if (index === -1) return []
  const value = /^on:\s*(.*)$/.exec(lines[index])[1].trim()
  if (value !== '') return parseList(value)
  const events = []
  for (let i = index + 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (isSkippable(line)) continue
    if (indentOf(line) === 0) break
    const match = /^\s{2}([A-Za-z_][A-Za-z0-9_-]*):\s*(?:#.*)?$/.exec(line)
    if (match !== null) events.push(match[1])
  }
  return events
}

/** 引号敏感的按 shell 运算符切段（`&&` / `||` / `;` / `|`）。 */
function splitCommands(line) {
  const out = []
  let buffer = ''
  let single = false
  let double = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '\\' && !single) {
      buffer += ch
      if (i + 1 < line.length) buffer += line[++i]
      continue
    }
    if (ch === "'" && !double) single = !single
    else if (ch === '"' && !single) double = !double
    if (!single && !double) {
      const pair = line.slice(i, i + 2)
      if (pair === '&&' || pair === '||') {
        out.push(buffer)
        buffer = ''
        i += 1
        continue
      }
      if (ch === ';' || ch === '|') {
        out.push(buffer)
        buffer = ''
        continue
      }
    }
    buffer += ch
  }
  out.push(buffer)
  return out.map((item) => item.trim()).filter(Boolean)
}

/** 去掉 shell 行尾注释（引号内 # 不算）；行首/空白后的 # 才是注释。 */
function stripShellComment(line) {
  let single = false
  let double = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '\\' && !single) {
      i += 1
      continue
    }
    if (ch === "'" && !double) single = !single
    else if (ch === '"' && !single) double = !double
    else if (ch === '#' && !single && !double && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i)
  }
  return line
}

/** 一行 run 文本 → 可执行段（heredoc 内容整体跳过——它是数据，不是命令）。 */
function shellSegments(text) {
  const segments = []
  let heredoc = null
  for (const raw of String(text ?? '').split('\n')) {
    if (heredoc !== null) {
      if (raw.trim() === heredoc) heredoc = null
      continue
    }
    const marker = /<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/.exec(raw)
    if (marker !== null) {
      heredoc = marker[1]
      continue
    }
    const code = stripShellComment(raw)
    if (code.trim() === '') continue
    segments.push(...splitCommands(code))
  }
  return segments
}

const quoteAwareWords = (segment) => {
  const out = []
  let buffer = ''
  let quote = null
  for (const ch of segment) {
    if (quote !== null) {
      if (ch === quote) quote = null
      else buffer += ch
      continue
    }
    if (ch === "'" || ch === '"') { quote = ch; continue }
    if (/\s/.test(ch)) {
      if (buffer !== '') { out.push(buffer); buffer = '' }
      continue
    }
    buffer += ch
  }
  if (buffer !== '') out.push(buffer)
  return out
}

const WRAPPERS = new Set(['env', 'command', 'sudo', 'time', 'exec', 'nohup'])

/** 一个 shell 段里以 node 真实执行的 smoke 文件（去赋值前缀/包装命令；echo/cat 等不算）。 */
function smokeFilesOfSegment(segment) {
  let words = quoteAwareWords(segment)
  while (words.length > 0) {
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0])) { words = words.slice(1); continue }
    if (WRAPPERS.has(words[0])) { words = words.slice(1); continue }
    break
  }
  if (words.length === 0) return []
  if (words[0].split('/').pop() !== 'node') return []
  return words.slice(1)
    .map((word) => word.replace(/^\.\//, ''))
    .filter((word) => /^scripts\/smoke\/[A-Za-z0-9._-]+\.mjs$/.test(word))
    .map((word) => word.slice('scripts/smoke/'.length))
}

function applyStepField(step, head, block, index) {
  const field = /^([A-Za-z-]+):\s*(.*)$/.exec(head)
  if (field === null) return index
  const [, key, raw] = field
  if (key === 'if') step.if = raw
  else if (key === 'continue-on-error') step.continueOnError = isTrue(raw)
  else if (key === 'run') {
    if (/^[|>][+-]?$/.test(raw.trim())) {
      const runLines = []
      let j = index + 1
      for (; j < block.length; j += 1) {
        const line = block[j]
        if (line.trim() === '') { runLines.push(''); continue }
        if (indentOf(line) <= 8) break
        runLines.push(line.trimStart())
      }
      step.run = runLines.join('\n')
      return j - 1
    }
    step.run = raw
  }
  return index
}

function parseSteps(block) {
  const steps = []
  let current = null
  for (let i = 0; i < block.length; i += 1) {
    const line = block[i]
    if (isSkippable(line)) continue
    const indent = indentOf(line)
    if (indent <= 4) break
    if (indent === 6) {
      const head = /^ {6}-\s*(.*)$/.exec(line)
      if (head === null) continue
      if (current !== null) steps.push(current)
      current = { if: '', continueOnError: false, run: null }
      i = applyStepField(current, head[1], block, i)
      continue
    }
    if (current === null || indent < 8) continue
    const rest = line.slice(8)
    i = applyStepField(current, rest, block, i)
  }
  if (current !== null) steps.push(current)
  return steps
}

function parseJob(block, id) {
  const job = { id, needs: [], disabled: false, conditional: false, continueOnError: false, steps: [] }
  for (let i = 0; i < block.length; i += 1) {
    const line = block[i]
    if (isSkippable(line)) continue
    if (indentOf(line) !== 4) continue
    const field = /^ {4}(needs|if|continue-on-error|steps):\s*(.*)$/.exec(line)
    if (field === null) continue
    const [, key, raw] = field
    if (key === 'needs') {
      if (raw.trim() !== '') job.needs = parseList(raw)
      else {
        for (let j = i + 1; j < block.length; j += 1) {
          const item = block[j]
          if (isSkippable(item)) continue
          if (indentOf(item) <= 4) break
          const match = /^\s*-\s*([A-Za-z_][A-Za-z0-9_-]*)\s*$/.exec(item)
          if (match !== null) job.needs.push(match[1])
        }
      }
    } else if (key === 'if') {
      job.disabled = isFalseExpr(raw)
      job.conditional = !job.disabled
    } else if (key === 'continue-on-error') {
      job.continueOnError = isTrue(raw)
    } else if (key === 'steps') {
      job.steps = parseSteps(block.slice(i + 1))
    }
  }
  return job
}

function parseJobs(lines) {
  const start = lines.findIndex((line) => /^jobs:\s*$/.test(line))
  if (start === -1) return []
  const jobs = []
  let i = start + 1
  while (i < lines.length) {
    const line = lines[i]
    if (isSkippable(line)) { i += 1; continue }
    if (indentOf(line) === 0) break
    const jobMatch = /^ {2}([A-Za-z_][A-Za-z0-9_-]*):\s*(?:#.*)?$/.exec(line)
    if (jobMatch === null) { i += 1; continue }
    const end = (() => {
      for (let j = i + 1; j < lines.length; j += 1) {
        const next = lines[j]
        if (isSkippable(next)) continue
        if (indentOf(next) === 0) return j
        if (/^ {2}[A-Za-z_][A-Za-z0-9_-]*:\s*(?:#.*)?$/.test(next)) return j
      }
      return lines.length
    })()
    jobs.push(parseJob(lines.slice(i + 1, end), jobMatch[1]))
    i = end
  }
  return jobs
}

/** 解析 `on:` 事件键与 `jobs:` 的结构化子集（jobs: id / needs / 禁用 / steps.run）。 */
export function parseWorkflow(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n')
  return { events: parseEvents(lines), jobs: parseJobs(lines) }
}

export const jobIds = (workflow) => workflow.jobs.map((job) => job.id)
export const eventKeys = (workflow) => workflow.events

/**
 * 真正会执行的 smoke 文件集合（文件名，不含 `scripts/smoke/` 前缀）。
 * 无 `all-checks-passed` 聚合 job = 空集（fail-closed）；job 不在 needs、job/step 永假或
 * continue-on-error、heredoc/注释/echo 都不计。
 */
export function executedSmokeFiles(text) {
  const workflow = parseWorkflow(text)
  const aggregate = workflow.jobs.find((job) => job.id === 'all-checks-passed')
  if (aggregate === undefined) return new Set()
  const needed = new Set(aggregate.needs)
  const found = new Set()
  for (const job of workflow.jobs) {
    if (job.disabled || job.conditional || job.continueOnError) continue
    if (!needed.has(job.id)) continue
    for (const step of job.steps) {
      if (step.continueOnError) continue
      const condition = step.if.trim()
      // 空 = 默认执行；always()/success() 视为必然执行；false/failure()/其它条件 = 不保证，跳过。
      if (condition !== '' && !/^(?:always\(\)|success\(\))$/i.test(condition)) continue
      if (typeof step.run !== 'string') continue
      for (const segment of shellSegments(step.run)) {
        for (const file of smokeFilesOfSegment(segment)) found.add(file)
      }
    }
  }
  return found
}
