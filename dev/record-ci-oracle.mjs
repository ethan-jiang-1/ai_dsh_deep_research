// record-ci-oracle.mjs — CI 执行面的外部 oracle 录制（S2b）。
//
// 真值来源（两层外部 + 一层明写的政策）：
//   1. YAML 结构 = 真 YAML 解析器（workspace 传递依赖 yaml@2，dev-only；测试不 import）；
//   2. shell 语义 = 真 bash 执行 `run:`，配一个“失败 stub node”——stub 只记录被调用的 smoke 并
//      exit 1，于是“失败是否传播到 step”由 bash 自己回答：step 退出非 0 = 该 smoke 的失败会
//      让 CI 红（证据）；step 退出 0 = 失败被 `|| true` / 后台 / `continue-on-error` 吞掉（不算）。
//   3. 政策（明写、可审）：只认 `all-checks-passed.needs` 里的 job；job/step `if` 只认
//      true/always()/success()/空；`continue-on-error: true` 不计。
//
// 用法：node dev/record-ci-oracle.mjs [--check]
//   --check：只比较 `executedSmokeFiles` 与 oracle，不写夹具；有分歧 exit 1。
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { executedSmokeFiles } from '../scripts/lib/ci-workflow.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'tests/fixtures/ci-oracle/oracle.json')
const CHECK = process.argv.includes('--check')
const WORK = join(ROOT, 'runtime', 'smoke-workspace')

let yaml
try {
  const store = join(ROOT, 'node_modules', '.pnpm')
  const dir = readdirSync(store).find((name) => /^yaml@2\./.test(name))
  if (dir === undefined) throw new Error('yaml@2 not installed')
  yaml = await import(pathToFileURL(join(store, dir, 'node_modules', 'yaml', 'dist', 'index.js')).href)
} catch (error) {
  console.error(`record-ci-oracle: 找不到真 YAML 解析器（${error.message}）；先安装工作区依赖再录制`)
  process.exit(2)
}

const truthy = (expr) => {
  if (expr === undefined || expr === null) return true
  if (typeof expr === 'boolean') return expr
  if (typeof expr !== 'string') return false
  let value = expr.trim().replace(/^\$\{\{\s*|\s*\}\}$/g, '').trim().toLowerCase()
  if (value === '') return true
  if (['true', 'always()', 'success()'].includes(value)) return true
  if (['false', '!true', '0'].includes(value) || value.includes('false')) return false
  return false // 未知表达式 = 不保证执行（fail-closed）
}

/** 真 bash 执行一步；stub node 记录被调用的 smoke 并 exit 1。 */
function runStep(script) {
  const dir = mkdtempSync(join(WORK, 'ci-oracle-'))
  const log = join(dir, 'calls.log')
  const stub = join(dir, 'node')
  writeFileSync(stub, `#!/bin/sh\necho "$@" >> "${log}"\nexit 1\n`)
  chmodSync(stub, 0o755)
  const result = spawnSync('bash', ['-c', script], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, CI_ORACLE_LOG: log },
    timeout: 10_000,
  })
  const calls = (() => {
    try { return readFileSync(log, 'utf8').split('\n') } catch { return [] }
  })()
  rmSync(dir, { recursive: true, force: true })
  const files = [...new Set(calls
    .map((line) => /scripts\/smoke\/([\w.-]+\.(?:e2e|entry)\.mjs)/.exec(line)?.[1])
    .filter(Boolean))]
  return { status: result.status ?? 1, files }
}

function executedOf(workflow) {
  const doc = yaml.parse(workflow)
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
      const { status, files } = runStep(step.run)
      if (status !== 0) for (const file of files) executed.add(file)
    }
  }
  return [...executed].sort()
}

const simple = (run, { stepIf, stepCoe = false, jobIf, jobCoe = false, needs = ['keyless'] } = {}) => {
  const step = { run: `${run}\n` }
  if (stepIf !== undefined) step.if = stepIf
  if (stepCoe) step['continue-on-error'] = true
  const job = { steps: [step] }
  if (jobIf !== undefined) job.if = jobIf
  if (jobCoe) job['continue-on-error'] = true
  return yaml.stringify({
    on: { workflow_dispatch: {} },
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
  ['comment', simple('node scripts/smoke/a.e2e.mjs # run it')],
  ['exit 2 after', simple('node scripts/smoke/a.e2e.mjs; exit 2')],
  ['step if false', simple('node scripts/smoke/a.e2e.mjs', { stepIf: false })],
  ['step continue-on-error', simple('node scripts/smoke/a.e2e.mjs', { stepCoe: true })],
  ['job if false', simple('node scripts/smoke/a.e2e.mjs', { jobIf: false })],
  ['job not in needs', simple('node scripts/smoke/a.e2e.mjs', { needs: ['other'] })],
  ['entry file', simple('node scripts/smoke/a.entry.mjs')],
  ['heredoc', simple("cat <<'EOF'\nnode scripts/smoke/a.e2e.mjs\nEOF")],
  ['on flow mapping', RAW_JOBS('on: { workflow_dispatch: {} }')],
  ['on block comment', RAW_JOBS('on:\n  # comment\n  workflow_dispatch:')],
  ['quoted expression', simple('node scripts/smoke/a.e2e.mjs', { stepIf: '${{ true }}' })],
  ['expression comment', RAW_JOBS('on:\n  workflow_dispatch: # c')],
  ['on flow sequence', RAW_JOBS('on: [workflow_dispatch]')],
  ['needs string', simple('node scripts/smoke/a.e2e.mjs', { needs: 'keyless' })],
  ['continue-on-error expression', simple('node scripts/smoke/a.e2e.mjs', { stepCoe: true })],
  ['redirection', simple('node scripts/smoke/a.e2e.mjs > /dev/null 2>&1')],
  ['absolute path', simple('node "$PWD/scripts/smoke/a.e2e.mjs"')],
  ['env assignment before node', simple('PATH="$PATH" node scripts/smoke/a.e2e.mjs')],
]

const fixtures = CORPUS.map(([name, workflow]) => {
  const executed = executedOf(workflow)
  const actual = [...executedSmokeFiles(workflow)].sort()
  return { name, workflow, executed, actual, matches: JSON.stringify(actual) === JSON.stringify(executed) }
})

const mismatches = fixtures.filter((fixture) => !fixture.matches)
for (const fixture of mismatches) {
  console.log(`MISMATCH ${fixture.name}`)
  console.log('  oracle:', JSON.stringify(fixture.executed))
  console.log('  parser:', JSON.stringify(fixture.actual))
}
console.log(`record-ci-oracle: ${fixtures.length} fixtures, ${mismatches.length} mismatches`)

if (CHECK) process.exit(mismatches.length === 0 ? 0 : 1)

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${JSON.stringify({
  generatedBy: 'dev/record-ci-oracle.mjs',
  oracle: 'yaml@2 (real YAML) + bash (real shell) + failing stub node (failure propagation)',
  generatedAt: new Date().toISOString().slice(0, 10),
  fixtures: fixtures.map(({ name, workflow, executed }) => ({ name, workflow, executed })),
}, null, 2)}\n`)
console.log(`wrote ${OUT}`)
