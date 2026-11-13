// CI 作业清单契约（W3-7）——`.github/workflows/ci.yml` 的必需 job 必须被一个书签式聚合 job 覆盖：
//   - 聚合 job `all-checks-passed` 的 `needs` 恰为其它 job；
//   - 失败条件包含 failure/cancelled/skipped（job 级 if 跳过的 check 会显示 success，是假绿入口）；
//   - snapshot A/B job 必须真的跑 `snapshot-replay.entry`。
// 这是静态清单契约；CI 行为仍需在 GitHub 上跑出一次绿。
//
// 反证：删掉聚合 job 的一个 need → 本文件红；把 skipped 从失败条件删掉 → 红；还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const TEXT = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8')
const jobs = [...TEXT.matchAll(/^  ([a-z][a-z0-9-]*):$/gm)].map((m) => m[1]).filter((name) => !['on', 'jobs', 'permissions', 'concurrency', 'push', 'pull_request', 'workflow_dispatch', 'schedule'].includes(name))
const blockOf = (name) => {
  const start = TEXT.search(new RegExp(`^  ${name}:$`, 'm'))
  assert.ok(start !== -1, `ci.yml 缺 job ${name}`)
  const next = TEXT.slice(start + 1).search(/^  [a-z][a-z0-9-]*:$/m)
  return next === -1 ? TEXT.slice(start) : TEXT.slice(start, start + 1 + next)
}

test('CI 聚合：all-checks-passed 覆盖全部其它 job，且 skipped 判红', () => {
  assert.ok(jobs.includes('all-checks-passed'), '缺书签式聚合 job all-checks-passed')
  const others = jobs.filter((name) => name !== 'all-checks-passed').sort()
  const block = blockOf('all-checks-passed')
  const needs = /needs:\s*\[([^\]]+)\]/.exec(block)?.[1]?.split(',').map((s) => s.trim()).filter(Boolean).sort() ?? []
  assert.deepEqual(needs, others, `聚合 needs 与 job 清单不一致：needs=${needs.join(', ')}；jobs=${others.join(', ')}`)
  assert.match(block, /contains\(needs\.\*\.result, 'skipped'\)/, '聚合失败条件必须含 skipped——job 级 if 跳过的 check 会显示 success')
  assert.match(block, /contains\(needs\.\*\.result, 'failure'\)/, '聚合失败条件必须含 failure')
  assert.match(block, /contains\(needs\.\*\.result, 'cancelled'\)/, '聚合失败条件必须含 cancelled')
})

test('CI snapshot job：真的跑 snapshot-replay.entry 的 A/B（read-only + layers a,b）', () => {
  assert.ok(jobs.includes('snapshot-replay'), '缺 snapshot-replay job')
  const block = blockOf('snapshot-replay')
  assert.match(block, /snapshot-replay\.entry\.mjs/, 'snapshot job 没跑 snapshot-replay.entry.mjs')
  assert.match(block, /--read-only/, 'snapshot job 必须只读')
  assert.match(block, /--layers a,b/, 'snapshot job 必须只跑 A/B（C 不在 CI）')
})
