// record-ci-oracle.mjs — CI 执行面与触发事件的外部 oracle 录制与对账（D55 S2b 补强）。
//
// 真值来源（两层外部执行真值 + 明写聚合政策）：
//   1. YAML 结构 = 本仓锁定的标准 `yaml@2` 解析器（覆盖 on: 标量/序列/流式映射/块映射与 jobs/steps）；
//   2. shell 语义 = 真实 `bash -eo pipefail`（对齐 GitHub Actions 默认 `bash -eo pipefail`）逐候选
//      smoke 注入失败（仅当目标 smoke 被 node 调用时 exit 1，其余调用 exit 0）——只有「目标 smoke 被实际
//      调用 **且** 其 exit 1 导致整步非零退出」才计入 executed；
//   3. 政策：只认 `all-checks-passed.needs` 里的无条件非容错 job 与无跳过/非容错 step。
//
// 用法：node dev/record-ci-oracle.mjs [--check]
//   --check：只比对当前 `ci-workflow.mjs` 与真实外部运行结果及 `oracle.json` 新鲜度，不写文件。
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { yaml } from '../scripts/lib/tools/workspace-parsers.mjs'
import { eventKeys, executedSmokeFiles, parseWorkflow } from '../scripts/lib/tools/ci-workflow.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'tests/fixtures/ci-oracle/oracle.json')
const CHECK = process.argv.includes('--check')
const WORK = join(ROOT, 'runtime', 'smoke-workspace')

const truthy = (expr) => {
  if (expr === undefined || expr === null) return true
  if (typeof expr === 'boolean') return expr
  if (typeof expr !== 'string') return false
  const value = expr.trim().replace(/^\$\{\{\s*([\s\S]*?)\s*\}\}$/, '$1').trim().toLowerCase()
  if (value === '') return true
  if (['true', 'always()', 'success()'].includes(value)) return true
  return false
}

function candidateSmokesInScript(script) {
  const matches = String(script).matchAll(/scripts\/smoke\/([A-Za-z0-9._-]+\.(?:e2e|entry)\.mjs)/g)
  return [...new Set([...matches].map((m) => m[1]))].sort()
}

/**
 * 真实 `bash -eo pipefail` 执行单个 step：仅当目标 `targetSmoke` 被 `node` 调用时退出 1，
 * 其它 `node` 调用退出 0；只有「目标被调用且整步退出非 0」才算真实受保护的 CI 证据。
 */
function enforcedSmokesOfStep(script) {
  const candidates = candidateSmokesInScript(script)
  if (candidates.length === 0) return []
  mkdirSync(WORK, { recursive: true })
  const enforced = []
  for (const target of candidates) {
    const dir = mkdtempSync(join(WORK, 'ci-oracle-'))
    const log = join(dir, 'calls.log')
    const stub = join(dir, 'node')
    writeFileSync(
      stub,
      `#!/bin/sh\necho "$@" >> "${log}"\nfor arg in "$@"; do\n  case "$arg" in\n    *"scripts/smoke/${target}") exit 1 ;;\n  esac\ndone\nexit 0\n`,
    )
    chmodSync(stub, 0o755)
    const result = spawnSync('bash', ['-eo', 'pipefail', '-c', script], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
      timeout: 10_000,
    })
    const calls = (() => {
      try { return readFileSync(log, 'utf8').split('\n') } catch { return [] }
    })()
    rmSync(dir, { recursive: true, force: true })
    const hitTarget = calls.some((line) => line.includes(`scripts/smoke/${target}`))
    if (hitTarget && (result.status ?? 1) !== 0) enforced.push(target)
  }
  return enforced
}

function oracleOf(workflowText) {
  const doc = yaml.parse(workflowText)
  const rawOn = doc && typeof doc === 'object' && Object.prototype.hasOwnProperty.call(doc, 'on') ? doc.on : undefined
  const events = typeof rawOn === 'string'
    ? [rawOn]
    : Array.isArray(rawOn)
      ? rawOn.map(String)
      : (rawOn && typeof rawOn === 'object' ? Object.keys(rawOn) : [])

  const jobs = doc?.jobs ?? {}
  const all = jobs['all-checks-passed'] ?? {}
  const needs = Array.isArray(all.needs) ? all.needs : all.needs === undefined ? [] : [all.needs]
  const executed = new Set()
  for (const jobId of needs) {
    const job = jobs[jobId]
    if (!job || job['continue-on-error'] === true) continue
    if (!truthy(job.if)) continue
    for (const step of Array.isArray(job.steps) ? job.steps : []) {
      if (step['continue-on-error'] === true) continue
      if (!truthy(step.if)) continue
      if (typeof step.run !== 'string') continue
      for (const file of enforcedSmokesOfStep(step.run)) executed.add(file)
    }
  }
  return { events, executed: [...executed].sort() }
}

const simple = (run, { stepIf, stepCoe = false, jobIf, jobCoe = false, needs = ['keyless'], on = { workflow_dispatch: {} } } = {}) => {
  const step = { run: `${run}\n` }
  if (stepIf !== undefined) step.if = stepIf
  if (stepCoe) step['continue-on-error'] = true
  const job = { steps: [step] }
  if (jobIf !== undefined) job.if = jobIf
  if (jobCoe) job['continue-on-error'] = true
  return yaml.stringify({
    on,
    jobs: {
      keyless: job,
      'all-checks-passed': { needs, steps: [{ run: 'echo ok\n' }] },
    },
  })
}

const RAW_JOBS = (prefix) => `${prefix}\njobs:\n  keyless:\n    steps:\n      - run: |\n          node scripts/smoke/a.e2e.mjs\n  all-checks-passed:\n    needs: [keyless]\n    steps:\n      - run: echo ok\n`

const CORPUS = [
  ['plain', simple('node scripts/smoke/a.e2e.mjs')],
  ['quoted echo', simple('echo "node scripts/smoke/a.e2e.mjs"')],
  ['single-quoted echo', simple("echo 'node scripts/smoke/a.e2e.mjs'")],
  ['if false block', simple('if false; then node scripts/smoke/a.e2e.mjs; fi')],
  ['or true', simple('node scripts/smoke/a.e2e.mjs || true')],
  ['and echo', simple('node scripts/smoke/a.e2e.mjs && echo done')],
  ['subshell', simple('(node scripts/smoke/a.e2e.mjs)')],
  ['env prefix', simple('CI=1 node scripts/smoke/a.e2e.mjs')],
  ['two smokes', simple('node scripts/smoke/a.e2e.mjs; node scripts/smoke/b.e2e.mjs')],
  ['background', simple('node scripts/smoke/a.e2e.mjs &')],
  ['false and node', simple('false && node scripts/smoke/a.e2e.mjs')],
  ['exit 10 and node', simple('exit 10 && node scripts/smoke/a.e2e.mjs')],
  ['negated node', simple('! node scripts/smoke/a.e2e.mjs')],
  ['multiline pipefail stop', simple('false\nnode scripts/smoke/a.e2e.mjs')],
  ['semicolon followed by echo under set -e', simple('node scripts/smoke/a.e2e.mjs; echo after')],
  ['comment', simple('node scripts/smoke/a.e2e.mjs # run it')],
  ['exit 2 after', simple('node scripts/smoke/a.e2e.mjs; exit 2')],
  ['step if false', simple('node scripts/smoke/a.e2e.mjs', { stepIf: false })],
  ['step continue-on-error', simple('node scripts/smoke/a.e2e.mjs', { stepCoe: true })],
  ['job if false', simple('node scripts/smoke/a.e2e.mjs', { jobIf: false })],
  ['job not in needs', simple('node scripts/smoke/a.e2e.mjs', { needs: ['other'] })],
  ['entry file', simple('node scripts/smoke/a.entry.mjs')],
  ['heredoc', simple("cat <<'EOF'\nnode scripts/smoke/a.e2e.mjs\nEOF")],
  ['on flow mapping single', RAW_JOBS('on: { workflow_dispatch: {} }')],
  ['on flow mapping multi', RAW_JOBS('on: { workflow_dispatch: {}, pull_request_target: { types: [opened] } }')],
  ['on block comment', RAW_JOBS('on:\n  # comment\n  workflow_dispatch:\n  push:')],
  ['on scalar string', RAW_JOBS('on: push')],
  ['quoted expression', simple('node scripts/smoke/a.e2e.mjs', { stepIf: '${{ true }}' })],
  ['expression comment', RAW_JOBS('on:\n  workflow_dispatch: # c')],
  ['on flow sequence', RAW_JOBS('on: [workflow_dispatch, pull_request]')],
  ['needs string', simple('node scripts/smoke/a.e2e.mjs', { needs: 'keyless' })],
  ['continue-on-error expression', simple('node scripts/smoke/a.e2e.mjs', { stepCoe: true })],
  ['redirection', simple('node scripts/smoke/a.e2e.mjs > /dev/null 2>&1')],
  ['absolute path', simple('node "$PWD/scripts/smoke/a.e2e.mjs"')],
  ['env assignment before node', simple('PATH="$PATH" node scripts/smoke/a.e2e.mjs')],
]

const fixtures = CORPUS.map(([name, workflow]) => {
  const { events, executed } = oracleOf(workflow)
  const parsed = parseWorkflow(workflow)
  const actualExecuted = [...executedSmokeFiles(workflow)].sort()
  const actualEvents = eventKeys(parsed)
  const matches = JSON.stringify(actualExecuted) === JSON.stringify(executed)
    && JSON.stringify(actualEvents) === JSON.stringify(events)
  return { name, workflow, events, executed, actualExecuted, actualEvents, matches }
})

const mismatches = fixtures.filter((fixture) => !fixture.matches)
for (const fixture of mismatches) {
  console.log(`MISMATCH ${fixture.name}`)
  console.log('  oracle executed:', JSON.stringify(fixture.executed), 'events:', JSON.stringify(fixture.events))
  console.log('  parser executed:', JSON.stringify(fixture.actualExecuted), 'events:', JSON.stringify(fixture.actualEvents))
}
console.log(`record-ci-oracle: ${fixtures.length} fixtures, ${mismatches.length} mismatches`)

const payload = {
  generatedBy: 'dev/record-ci-oracle.mjs',
  oracle: 'yaml@2 (real YAML 1.2) + bash -eo pipefail (GitHub Actions default shell) + per-target failing stub node',
  fixtures: fixtures.map(({ name, workflow, events, executed }) => ({ name, workflow, events, executed })),
}

if (CHECK) {
  if (mismatches.length > 0) process.exit(1)
  if (!existsSync(OUT)) {
    console.error(`record-ci-oracle --check: 缺少 ${OUT}`)
    process.exit(1)
  }
  const current = JSON.parse(readFileSync(OUT, 'utf8'))
  if (JSON.stringify(current.fixtures) !== JSON.stringify(payload.fixtures)) {
    console.error('record-ci-oracle --check: oracle.json 与当前 CORPUS / bash -eo pipefail 输出失步——请重跑 node dev/record-ci-oracle.mjs')
    process.exit(1)
  }
  process.exit(0)
}

if (mismatches.length > 0) process.exit(1)

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`)
console.log(`wrote ${OUT}`)
