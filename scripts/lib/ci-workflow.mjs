// ci-workflow.mjs — GitHub Actions 工作流结构解析与执行面/写入侧契约（D55 补强；keyless）。
//
// 权威解析层：直接调用本仓锁定的 `yaml@2` 解析标准 YAML 1.2 文档（彻底退役 360 行手写缩进/flow
// 状态机；语法错或重复键一律 fail-closed 返回空执行面并在写入侧门报错）。
//
// 双面防线：
//   1. 读取侧 `executedSmokeFiles`：job 在 `all-checks-passed.needs`、job/step 无跳过或 `continue-on-error`、
//      `run` 在 `bash -eo pipefail` 语义下真实执行且失败能令 step 非零退出；
//   2. 写入侧 `ciWorkflowRunProblems`（S2b 生产者门）：本仓 `.github/workflows/*.yml` 凡提及
//      `scripts/smoke/` 的 `run:` 步骤，每条 smoke 调用行必须符合规范可执行命令白名单（禁 `||` 吞错、
//      禁 `;` 串联、禁 `!` 取反、禁子 shell、禁 `set +e`）。
import { yaml } from './workspace-parsers.mjs'

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/** GitHub Actions 条件表达式归一（YAML 注释与外层引号已由 yaml@2 词法层剥除）。 */
function normalizeExpression(expr) {
  if (expr === undefined || expr === null) return ''
  if (typeof expr === 'boolean' || typeof expr === 'number') return String(expr).toLowerCase()
  if (typeof expr !== 'string') return '__non_scalar__'
  const trimmed = expr.trim()
  const unwrapped = trimmed.replace(/^\$\{\{\s*([\s\S]*?)\s*\}\}$/, '$1').trim()
  return unwrapped.toLowerCase()
}

const isFalseExpr = (expr) => ['false', '!true', '0'].includes(normalizeExpression(expr))
const isTrueExpr = (expr) => normalizeExpression(expr) === 'true'
const isAlwaysExpr = (expr) => ['true', 'always()', 'success()'].includes(normalizeExpression(expr))

function extractEvents(rawOn) {
  if (typeof rawOn === 'string') return rawOn.trim() === '' ? [] : [rawOn.trim()]
  if (Array.isArray(rawOn)) {
    return rawOn.filter((item) => typeof item === 'string' && item.trim() !== '').map((item) => item.trim())
  }
  if (isPlainObject(rawOn)) return Object.keys(rawOn)
  return []
}

function extractNeeds(rawNeeds) {
  if (typeof rawNeeds === 'string') return rawNeeds.trim() === '' ? [] : [rawNeeds.trim()]
  if (Array.isArray(rawNeeds)) {
    return rawNeeds.filter((item) => typeof item === 'string' && item.trim() !== '').map((item) => item.trim())
  }
  return []
}

/** 去掉 shell 行尾注释（引号内 # 不算）；行首或空白后的 # 才是注释。 */
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

/** 引号敏感地按 shell 控制运算符切段；每段记录后随运算符（`&&`/`||`/`;`/`|`/`&`）。 */
function splitCommands(line) {
  const out = []
  let buffer = ''
  let single = false
  let double = false
  const push = (sepAfter) => {
    const command = buffer.trim()
    if (command !== '') out.push({ command, sepAfter })
    buffer = ''
  }
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
        push(pair)
        i += 1
        continue
      }
      if (ch === ';' || ch === '|') {
        push(ch)
        continue
      }
      if (ch === '&' && line[i - 1] !== '>' && line[i + 1] !== '>') {
        push('&')
        continue
      }
    }
    buffer += ch
  }
  push(null)
  return out
}

/** 非注释、非 heredoc 载荷的 shell 逻辑行列表。 */
function activeShellLines(runText) {
  const lines = []
  let heredoc = null
  for (const raw of String(runText ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    if (heredoc !== null) {
      if (raw.trim() === heredoc) heredoc = null
      continue
    }
    const code = stripShellComment(raw)
    const marker = /<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/.exec(code)
    if (marker !== null) {
      heredoc = marker[1]
      lines.push(code.slice(0, marker.index).trim())
      continue
    }
    if (code.trim() !== '') lines.push(code.trim())
  }
  return lines.filter((line) => line !== '')
}

const quoteAwareWords = (segment) => {
  const out = []
  let buffer = ''
  let quote = null
  for (let i = 0; i < segment.length; i += 1) {
    const ch = segment[i]
    if (ch === '\\' && quote !== "'") {
      if (i + 1 < segment.length) buffer += segment[++i]
      continue
    }
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
const isKnownFailure = (cmd) => /^(?:false|!\s*true|exit(?:\s+[1-9]\d*)?)$/.test(cmd.trim())
const isUnconditionalExit = (cmd) => /^(?:exit(?:\s+\d+)?|return(?:\s+\d+)?)$/.test(cmd.trim())

function smokeFilesOfSegment(rawSegment) {
  let trimmed = rawSegment.trim()
  // `! cmd` 会把失败反转为 0，不构成失败传播
  if (/^!(?:\s|$)/.test(trimmed)) return []
  // 复合控制块（如 `if false; then ...`）首段带 `if false` 时整行不计
  let words = quoteAwareWords(trimmed)
  while (words[0] === '(' || words[0] === '{') words = words.slice(1)
  while (words.at(-1) === ')' || words.at(-1) === '}') words = words.slice(0, -1)
  if (words[0]?.startsWith('(')) words[0] = words[0].slice(1)
  if (words.at(-1)?.endsWith(')')) words[words.length - 1] = words.at(-1).slice(0, -1)
  while (words.length > 0) {
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0])) { words = words.slice(1); continue }
    if (WRAPPERS.has(words[0])) { words = words.slice(1); continue }
    break
  }
  if (words.length === 0) return []
  if (words[0].split('/').pop() !== 'node') return []
  return words.slice(1)
    .map((word) => {
      const match = /(?:^|\/)(scripts\/smoke\/[A-Za-z0-9._-]+\.(?:e2e|entry)\.mjs)$/.exec(word.replace(/^\.\//, ''))
      return match === null ? null : match[1].slice('scripts/smoke/'.length)
    })
    .filter((word) => word !== null)
}

/**
 * 解析工作流 YAML（语法错或重复键 → yamlErrors 非空，events/jobs 置空 fail-closed）。
 */
export function parseWorkflow(text) {
  const doc = yaml.parseDocument(String(text ?? ''), { uniqueKeys: true, prettyErrors: false })
  const tagErrors = []
  yaml.visit(doc, {
    Pair(_, pair) {
      if (yaml.isScalar(pair.key) && pair.key.value === 'run' && pair.value?.tag) {
        tagErrors.push(`run 字段携带非标准 YAML tag (${pair.value.tag})——请加引号（如 "! cmd"）或改为规范命令`)
      }
    },
  })
  if (doc.errors.length > 0 || tagErrors.length > 0) {
    return {
      events: [],
      jobs: [],
      yamlErrors: [...doc.errors.map((err) => err.message), ...tagErrors],
    }
  }
  const root = doc.toJS({ maxAliasCount: 50 })
  if (!isPlainObject(root)) return { events: [], jobs: [], yamlErrors: [] }

  // YAML 1.1 历史兼容里裸 `on` 常被当布尔，yaml@2 默认 YAML 1.2 为字符串 `"on"`；防御性兼顾只在其一存在时读取
  const rawOn = Object.prototype.hasOwnProperty.call(root, 'on') ? root.on : undefined
  const events = extractEvents(rawOn)
  const rawJobs = isPlainObject(root.jobs) ? root.jobs : {}
  const jobs = []

  for (const [id, rawJob] of Object.entries(rawJobs)) {
    if (!isPlainObject(rawJob)) continue
    const hasIf = Object.prototype.hasOwnProperty.call(rawJob, 'if') && rawJob.if !== undefined && rawJob.if !== null
    const disabled = hasIf && isFalseExpr(rawJob.if)
    const conditional = hasIf && !disabled && normalizeExpression(rawJob.if) !== '' && !isAlwaysExpr(rawJob.if)
    const continueOnError = isTrueExpr(rawJob['continue-on-error'])
    const rawSteps = Array.isArray(rawJob.steps) ? rawJob.steps : []
    const steps = rawSteps.filter(isPlainObject).map((rawStep) => ({
      name: typeof rawStep.name === 'string' ? rawStep.name : '',
      if: rawStep.if === undefined || rawStep.if === null ? '' : String(rawStep.if),
      rawIf: rawStep.if,
      continueOnError: isTrueExpr(rawStep['continue-on-error']),
      run: typeof rawStep.run === 'string' ? rawStep.run : null,
    }))
    jobs.push({
      id,
      needs: extractNeeds(rawJob.needs),
      disabled,
      conditional,
      continueOnError,
      steps,
    })
  }
  return { events, jobs, yamlErrors: [] }
}

export const jobIds = (workflow) => workflow.jobs.map((job) => job.id)
export const eventKeys = (workflow) => workflow.events

/**
 * 真正会执行且失败会使 required 聚合 job 变红的 smoke 文件名集合。
 */
export function executedSmokeFiles(text) {
  const workflow = parseWorkflow(text)
  if (workflow.yamlErrors.length > 0) return new Set()
  const aggregate = workflow.jobs.find((job) => job.id === 'all-checks-passed')
  if (aggregate === undefined) return new Set()
  const needed = new Set(aggregate.needs)
  const found = new Set()

  for (const job of workflow.jobs) {
    if (job.disabled || job.conditional || job.continueOnError) continue
    if (!needed.has(job.id)) continue
    for (const step of job.steps) {
      if (step.continueOnError) continue
      if (step.rawIf !== undefined && step.rawIf !== null && String(step.rawIf).trim() !== '' && !isAlwaysExpr(step.rawIf)) {
        continue
      }
      if (typeof step.run !== 'string') continue

      let stepAborted = false
      for (const line of activeShellLines(step.run)) {
        if (stepAborted) break
        if (/^(?:if\s+false\b|set\s+\+e\b)/.test(line)) continue
        const segments = splitCommands(line)
        let lineFailed = false
        let skipRestOfAnd = false
        for (let i = 0; i < segments.length; i += 1) {
          const seg = segments[i]
          const sepBefore = i === 0 ? null : segments[i - 1].sepAfter
          if (sepBefore === '&&' && skipRestOfAnd) {
            continue
          }
          if (sepBefore !== '&&') skipRestOfAnd = false
          if (isKnownFailure(seg.command)) {
            if (seg.sepAfter === '&&') {
              skipRestOfAnd = true
              lineFailed = true
              continue
            }
            if (seg.sepAfter !== '||') lineFailed = true
            continue
          }
          if (isUnconditionalExit(seg.command)) {
            stepAborted = true
            break
          }
          if (sepBefore === '&' || seg.sepAfter === '&') continue
          if (sepBefore === '||' || seg.sepAfter === '||') continue
          // 若同一行后续紧跟 `; exit N` 或 `; true`，在 bash -eo pipefail 下当前非末尾 `;` 段失败仍立刻中止退出非 0！
          for (const file of smokeFilesOfSegment(seg.command)) found.add(file)
        }
        if (lineFailed) stepAborted = true
      }
    }
  }
  return found
}

const CANONICAL_SMOKE_RUN_LINE = /^(?:source\s+dev\/env\.sh\s+&&\s+)?(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"\n]*"|'[^'\n]*'|[^\s|;&`()<>!#]+)\s+)*node(?:\s+--import\s+tsx\/esm)?\s+scripts\/smoke\/[A-Za-z0-9._-]+\.(?:e2e|entry)\.mjs(?:\s+[^|;&`()<>!#]+)?$/

/**
 * 写入侧规范门（S2b）：校验工作流 YAML 合法性，且所有提及 `scripts/smoke/` 的活动 shell 行必须
 * 严格遵守单命令规范形态（禁止 `||`、`;`、`!`、子 shell、`set +e` 等会制造解析歧义或吞错的写法）。
 */
export function ciWorkflowRunProblems(text, workflowLabel = 'workflow') {
  const workflow = parseWorkflow(text)
  if (workflow.yamlErrors.length > 0) {
    return workflow.yamlErrors.map((msg) => `${workflowLabel}: YAML 解析失败——${msg}`)
  }
  const problems = []
  for (const job of workflow.jobs) {
    for (const step of job.steps) {
      if (typeof step.run !== 'string') continue
      const lines = activeShellLines(step.run)
      const mentionsSmoke = lines.some((line) => line.includes('scripts/smoke/'))
      if (!mentionsSmoke) continue
      for (const line of lines) {
        if (/^(?:.*\s)?set\s+\+e(?:\s|$)/.test(line)) {
          problems.push(`${workflowLabel} [job=${job.id}${step.name ? ` / ${step.name}` : ''}]: 含 smoke 的步骤禁止 set +e（会关闭 pipefail 失败传播）：${line}`)
          continue
        }
        if (!line.includes('scripts/smoke/')) continue
        if (!CANONICAL_SMOKE_RUN_LINE.test(line)) {
          problems.push(`${workflowLabel} [job=${job.id}${step.name ? ` / ${step.name}` : ''}]: 非规范 smoke 调用行（只许 [source dev/env.sh &&] [ENV=x] node [--import tsx/esm] scripts/smoke/<file> [flags]）：${line}`)
        }
      }
    }
  }
  return problems
}
