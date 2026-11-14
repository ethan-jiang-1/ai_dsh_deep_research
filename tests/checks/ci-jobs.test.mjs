// CI 作业清单契约（W3-7）——`.github/workflows/ci.yml` 的必需 job 必须被一个书签式聚合 job 覆盖：
//   - 聚合 job `all-checks-passed` 的 `needs` 恰为其它 job；
//   - 失败条件包含 failure/cancelled/skipped（job 级 if 跳过的 check 会显示 success，是假绿入口）；
//   - snapshot A/B job 必须真的跑 `snapshot-replay.entry`。
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
import { parseWorkflow } from '../../scripts/lib/ci-workflow.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const TEXT = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8')
const WORKFLOW = parseWorkflow(TEXT)
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

test('CI snapshot job：真的跑 snapshot-replay.entry 的 A/B（read-only + layers a,b）', () => {
  assert.ok(JOB_BY_ID.has('snapshot-replay'), '缺 snapshot-replay job')
  const snapshotJob = JOB_BY_ID.get('snapshot-replay')
  const runs = snapshotJob.steps.map((step) => step.run ?? '').join('\n')
  assert.match(runs, /snapshot-replay\.entry\.mjs/, 'snapshot job 没跑 snapshot-replay.entry.mjs')
  assert.match(runs, /--read-only/, 'snapshot job 必须只读')
  assert.match(runs, /--layers a,b/, 'snapshot job 必须只跑 A/B（C 不在 CI）')
})
