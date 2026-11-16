// CI 作业清单契约（W3-7）——`.github/workflows/ci.yml` 的必需 job 必须被一个书签式聚合 job 覆盖：
//   - 聚合 job `all-checks-passed` 的 `needs` 恰为其它 job；
//   - 失败条件包含 failure/cancelled/skipped（job 级 if 跳过的 check 会显示 success，是假绿入口）；
//   - 分钟级重冒烟分层：在 ci.yml 按正确参数跑，或 registry 标 dev-only 且写明理由（2026-11-16）。
// 这是静态清单契约；CI 行为仍需在 GitHub 上跑出一次绿。
//
// 负例留证 2026-11-14：BUG-161——旧实现用窄字符集缩进正则抓 job id 且只认行内 `[a, b]` needs，
//   遇到下划线/大写/行尾注释或块序列 needs 即漏检；现统一走 `yaml@2` `parseWorkflow` AST。
//   红配方：删掉聚合 job 的一个 need 或注入未纳入 needs 的 `zz_probe_job` → 本文件红；还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseWorkflow, executedSmokeFiles } from '../../checks/lib/tools/ci-workflow.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const TEXT = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8')
const WORKFLOW = parseWorkflow(TEXT)
const NIGHTLY_TEXT = readFileSync(join(ROOT, '.github', 'workflows', 'nightly.yml'), 'utf8')
const NIGHTLY_JOB_BY_ID = new Map(parseWorkflow(NIGHTLY_TEXT).jobs.map((job) => [job.id, job]))
const JOB_BY_ID = new Map(WORKFLOW.jobs.map((job) => [job.id, job]))
const JOB_IDS = WORKFLOW.jobs.map((job) => job.id)

test('CI 作业清单：yaml AST 解析 job id（含下划线/大写/注释）与块序列 needs（BUG-161）', () => {
  const synthetic = `on: push
jobs:
  keyless:
    runs-on: ubuntu-latest
  zz_Probe_Job: # comment after job key
    runs-on: ubuntu-latest
  all-checks-passed:
    needs:
      - keyless
      - zz_Probe_Job
`
  const parsed = parseWorkflow(synthetic)
  assert.deepEqual(parsed.jobs.map((job) => job.id), ['keyless', 'zz_Probe_Job', 'all-checks-passed'])
  const agg = parsed.jobs.find((job) => job.id === 'all-checks-passed')
  assert.deepEqual(agg?.needs, ['keyless', 'zz_Probe_Job'])
})

test('CI 聚合：all-checks-passed 覆盖全部其它 job，且 skipped 判红', () => {
  assert.ok(JOB_BY_ID.has('all-checks-passed'), '缺书签式聚合 job all-checks-passed')
  const others = JOB_IDS.filter((name) => name !== 'all-checks-passed').sort()
  const aggregate = JOB_BY_ID.get('all-checks-passed')
  const needs = [...aggregate.needs].sort()
  assert.deepEqual(needs, others, `聚合 needs 与 job 清单不一致：needs=${needs.join(', ')}；jobs=${others.join(', ')}`)
  const checkTexts = [aggregate.if ?? '', ...aggregate.steps.map((step) => `${step.if ?? ''}\n${step.run ?? ''}`)].join('\n')
  assert.match(checkTexts, /contains\(needs\.\*\.result,\s*'skipped'\)/, '聚合失败条件必须含 skipped——job 级 if 跳过的 check 会显示 success')
  assert.match(checkTexts, /contains\(needs\.\*\.result,\s*'failure'\)/, '聚合失败条件必须含 failure')
  assert.match(checkTexts, /contains\(needs\.\*\.result,\s*'cancelled'\)/, '聚合失败条件必须含 cancelled')
})

test('重冒烟：在 ci.yml 或 nightly.yml 里按正确参数执行（snapshot = read-only A/B）', () => {
  // 2026-11-16 频率分层：慢证据进 nightly；但两条重冒烟必须至少在一个 CI 工作流里执行。
  const executed = new Set([...executedSmokeFiles(TEXT), ...executedSmokeFiles(NIGHTLY_TEXT)])
  const jobs = new Map([...JOB_BY_ID, ...NIGHTLY_JOB_BY_ID])
  for (const file of ['client-load.entry.mjs', 'snapshot-replay.entry.mjs']) {
    assert.ok(executed.has(file), `${file} 必须至少在一个 CI 工作流里执行（不许无声消失）`)
    const jobId = file === 'snapshot-replay.entry.mjs' ? 'snapshot-replay' : 'client-load'
    const job = jobs.get(jobId)
    assert.ok(job, `执行 ${file} 但没有 ${jobId} job`)
    const runs = job.steps.map((step) => step.run ?? '').join('\n')
    assert.ok(runs.includes(file), `${jobId} job 没跑 ${file}`)
    if (file === 'snapshot-replay.entry.mjs') {
      assert.match(runs, /--read-only/, 'snapshot 在 CI 时必须只读')
      assert.match(runs, /--layers a,b/, 'snapshot 在 CI 时必须只跑 A/B（C 不在 CI）')
    }
  }
})
