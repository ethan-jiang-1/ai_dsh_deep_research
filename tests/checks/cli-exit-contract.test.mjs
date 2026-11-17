// cli-exit-contract.test.mjs — 退出码契约的纯函数核（checks/lib/shared/cli-exit.mjs）。
//
// 边界：默认回归禁子进程（layering ①/②），真入口的 exit code 由 checks/smoke/cli-exit.e2e.mjs 证；
// 本文件只钉「三态汇总」与「失败信息带修正入口」两个纯判据——它们回归时先红，且不依赖机器状态。
// 负例留证 2026-11-17：BUG-218——旧 run-lane 只按 FAIL 数退出，全 SKIP 也是 0；红配方 = verdictOf
// 改回 `fail > 0 ? 1 : 0`（全 SKIP 用例红）。BUG-217——旧无匹配消息不含 --all；红配方 = 删模板里的
// `--all` 提示（消息用例红）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EXIT, verdictOf } from '../../checks/lib/shared/cli-exit.mjs'
import { noMatchMessage } from '../../checks/lib/repo/smoke-lane.mjs'

test('verdict 三态：全 SKIP = 2；混合 PASS+SKIP = 0；有 FAIL = 1（BUG-218）', () => {
  assert.deepEqual([EXIT.PASS, EXIT.FAIL, EXIT.NOT_RUN], [0, 1, 2], '契约常量 = 0/1/2')
  assert.equal(verdictOf({ pass: 0, fail: 0, skip: 1 }), EXIT.NOT_RUN, '一条都没跑 = 未跑，不得冒充通过')
  assert.equal(verdictOf({ pass: 0, fail: 0, skip: 7 }), EXIT.NOT_RUN)
  assert.equal(verdictOf({ pass: 3, fail: 0, skip: 2 }), EXIT.PASS, '有 PASS 就是有证据（部分未跑在汇总文字里可见）')
  assert.equal(verdictOf({ pass: 2, fail: 1, skip: 0 }), EXIT.FAIL, '有 FAIL 压过一切')
  assert.equal(verdictOf({ pass: 0, fail: 1, skip: 1 }), EXIT.FAIL)
})

test('无匹配条目的失败信息给出对象 + 规则 + 修正入口（--all / --list；BUG-217）', () => {
  const withOnly = noMatchMessage({ lane: 'entry', only: 'cold-start' })
  assert.match(withOnly, /entry/, '点名车道')
  assert.match(withOnly, /cold-start/, '回显过滤词')
  assert.match(withOnly, /--all/, '修正入口：dev-only 件要 --all')
  assert.match(withOnly, /--list/, '如何看 tier')
  assert.match(noMatchMessage({ lane: 'e2e' }), /--all/, '不过滤时同样要给修正入口')
})
