// gates.e2e 的数值输入与有界并发判据（BUG-195 类级：非法数值不得制造假失败/无界并发）。
//
// 负例留证 2026-11-16：BUG-195——把 `--jobs=abc` / `--jobs=0` / `--jobs=1e999` 放回旧解析
//（`Math.max(1, Number(raw))`）→ 本 spec 的 invalid 用例红；旧 mapLimit 收到 NaN 会起 0 个
// worker 导致结果 undefined，`boundedMap` 的 limit 用例红。还原 → 绿。
// 负例留证 2026-11-16：BUG-203——把 `--case=` / `--case`（缺值）/ 裸 `--jobs 8` 放回旧解析
//（空值 filter(Boolean) 丢成全量、裸形态被忽略）→ 本 spec 的 flag 形状用例红；还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { boundedMap, parseE2eArgs, parseJobsArg } from '../../../checks/lib/harness/gates-cli.mjs'

test('parseJobsArg 接受正整数，缺省走 fallback（BUG-195 负控）', () => {
  assert.equal(parseJobsArg([], 4), 4)
  assert.equal(parseJobsArg(['--case=x'], 4), 4)
  assert.equal(parseJobsArg(['--jobs=1'], 4), 1)
  assert.equal(parseJobsArg(['--jobs=8', '--case=x'], 4), 8)
  assert.equal(parseJobsArg(['--jobs', '8'], 4), 8)
})

test('parseJobsArg 对 NaN/Infinity/小数/0/负数/非数字 fail-loud 并点名原值（BUG-195）', () => {
  for (const raw of ['abc', '0', '-1', '1.5', '1e999', '', ' 4', '+4', '0x10']) {
    assert.throws(
      () => parseJobsArg([`--jobs=${raw}`], 4),
      (error) => error instanceof Error && error.message.includes(JSON.stringify(raw)),
      `--jobs=${JSON.stringify(raw)} 必须被拒绝并点名原值`,
    )
  }
})

test('parseE2eArgs：--case/--gate/--jobs 两种形状同判，空值/缺值/未知参数/位置参数 fail-loud（BUG-203）', () => {
  assert.deepEqual(parseE2eArgs(['--case=a,b', '--jobs=2'], 4), { cases: ['a', 'b'], gates: [], jobs: 2, help: false })
  assert.deepEqual(parseE2eArgs(['--case', 'a,b', '--jobs', '2'], 4), { cases: ['a', 'b'], gates: [], jobs: 2, help: false })
  assert.deepEqual(parseE2eArgs(['--case=a', '--case=b'], 4), { cases: ['a', 'b'], gates: [], jobs: 4, help: false })
  assert.deepEqual(parseE2eArgs(['--help'], 4), { cases: [], gates: [], jobs: 4, help: true })
  // --gate（2026-11-18 选择面）：形状与 --case 同判；与 --case 并存时两个列表各自独立收
  assert.deepEqual(parseE2eArgs(['--gate=md-links'], 4), { cases: [], gates: ['md-links'], jobs: 4, help: false })
  assert.deepEqual(parseE2eArgs(['--gate', 'a,b', '--jobs', '2'], 4), { cases: [], gates: ['a', 'b'], jobs: 2, help: false })
  assert.deepEqual(parseE2eArgs(['--gate=a', '--gate=b', '--case=x'], 4), { cases: ['x'], gates: ['a', 'b'], jobs: 4, help: false })

  const invalid = [
    ['--case='],
    ['--case'],
    ['--case', '  '],
    ['--case', '--jobs=2'],
    ['--gate='],
    ['--gate'],
    ['--gate', '  '],
    ['--gate', '--jobs=2'],
    ['--gate=a,,b'],
    ['--jobs='],
    ['--jobs'],
    ['--jobs', '--case=x'],
    ['--frobnicate'],
    ['positional'],
  ]
  for (const argv of invalid) {
    assert.throws(() => parseE2eArgs(argv, 4), (error) => error instanceof Error && error.message.length > 0,
      `${JSON.stringify(argv)} 必须 fail-loud`)
  }
  assert.throws(() => parseE2eArgs(['--frobnicate'], 4), /未知参数 --frobnicate/)
  assert.throws(() => parseE2eArgs(['positional'], 4), /位置参数/)
})

test('boundedMap 保持顺序且有界并发（BUG-195 负控）', async () => {
  let active = 0
  let peak = 0
  const out = await boundedMap([1, 2, 3, 4, 5], 2, async (value) => {
    active += 1
    peak = Math.max(peak, active)
    await new Promise((resolve) => setTimeout(resolve, 5))
    active -= 1
    return value * 10
  })
  assert.deepEqual(out, [10, 20, 30, 40, 50])
  assert.ok(peak <= 2, `并发峰值 ${peak} 超过上限 2`)
})

test('boundedMap 对非法 limit 在起 worker 前抛错（BUG-195）', async () => {
  for (const limit of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 1.5, '2']) {
    await assert.rejects(
      () => boundedMap([1], limit, async (value) => value),
      /并发上限必须是正整数/,
      `limit=${String(limit)} 必须 fail-loud`,
    )
  }
})

test('boundedMap 空输入返回空结果（防空转）', async () => {
  assert.deepEqual(await boundedMap([], 3, async (value) => value), [])
})
