// ci-workflow 契约（BUG-172）——GitHub Actions 的**执行面**子集：
//   - `jobs:` 键用完整 job id 字符集（下划线/大写可见）；
//   - step 的 `if: false` / `continue-on-error: true` 不算执行；
//   - job 不在 `all-checks-passed.needs` 不算 CI 证据；
//   - 注释 / echo / heredoc 里的路径不算；`run: |` 块里的 node 才算。
//
// 反证：把 `executedSmokeFiles` 的 step 条件判断删掉 → if:false 例红；把 needs 过滤删掉 →
// not-in-needs 例红；把 heredoc 跳过删掉 → heredoc 例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eventKeys, executedSmokeFiles, jobIds, parseWorkflow } from '../../scripts/lib/ci-workflow.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const SYNTHETIC = `
on:
  workflow_dispatch:
  pull_request_target:

jobs:
  keyless:
    steps:
      - name: commented
        run: echo 'probe: disabled' # node scripts/smoke/commented.e2e.mjs
      - name: skipped
        if: false
        run: node scripts/smoke/skipped.e2e.mjs
      - name: continued
        continue-on-error: true
        run: node scripts/smoke/continued.e2e.mjs
      - name: real
        run: |
          echo start
          node --import tsx/esm scripts/smoke/real.e2e.mjs
      - name: heredoc
        run: |
          cat > /tmp/probe <<EOF
          node scripts/smoke/heredoc.e2e.mjs
          EOF
  deploy:
    steps:
      - run: source dev/env.sh && DSH_SMOKE_REAL=1 node scripts/smoke/second.e2e.mjs
  orphan:
    steps:
      - run: node scripts/smoke/orphan.e2e.mjs
  all-checks-passed:
    if: always()
    needs: [keyless, deploy]
    steps:
      - run: echo done
`

test('parseWorkflow：jobs 键含下划线/大写，needs 与 on: 键集合可见', () => {
  const workflow = parseWorkflow(SYNTHETIC)
  assert.deepEqual(jobIds(workflow), ['keyless', 'deploy', 'orphan', 'all-checks-passed'])
  assert.deepEqual(eventKeys(workflow), ['workflow_dispatch', 'pull_request_target'])
  const aggregate = workflow.jobs.find((job) => job.id === 'all-checks-passed')
  assert.deepEqual(aggregate.needs, ['keyless', 'deploy'])
  assert.deepEqual(eventKeys(parseWorkflow('on: [push, workflow_dispatch]\n')), ['push', 'workflow_dispatch'])
  assert.deepEqual(eventKeys(parseWorkflow('on: workflow_dispatch\n')), ['workflow_dispatch'])
})

test('executedSmokeFiles：只计 needs 内、无跳过条件、run 里真实 node 执行的文件', () => {
  assert.deepEqual([...executedSmokeFiles(SYNTHETIC)].sort(), ['real.e2e.mjs', 'second.e2e.mjs'])
  assert.deepEqual([...executedSmokeFiles('jobs:\n  keyless:\n    steps:\n      - run: node scripts/smoke/x.e2e.mjs\n')], [],
    '无 all-checks-passed = 没有 CI 证据（fail-closed）')
  assert.deepEqual([...executedSmokeFiles('nonsense')], [], '解析不出 jobs = 空集，不猜')
})

test('真实 ci.yml：9 条 tier-ci smoke 都在执行面；注释/字符串不冒充', () => {
  const ci = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8')
  const executed = executedSmokeFiles(ci)
  assert.ok(executed.size >= 8, `防空语料：ci.yml 执行面过少（${executed.size}）`)
  for (const file of ['run-accept.e2e.mjs', 'client-load.entry.mjs', 'snapshot-replay.entry.mjs', 'lifecycle.entry.mjs']) {
    assert.ok(executed.has(file), `ci.yml 真实执行面应含 ${file}`)
  }
  assert.ok(!executed.has('l4-lite.e2e.mjs'), '真模型档不在 keyless CI 执行面')
})
