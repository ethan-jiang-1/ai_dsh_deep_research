// 负例留证 2026-11-14：BUG-184 / BUG-187 / BUG-190——CI 执行面与触发事件对
// dev/record-ci-oracle.mjs 用「真 YAML 解析 + 真 bash -eo pipefail + 失败 stub node」录制的
// 外部 oracle 逐例断言（同时核对 executed 与 events，修复首轮 BUG-190 只测 executed 漏测 events 的假闭环）。
// 红配方：① 把 parseWorkflow 的 events 置空或删 flow mapping → BUG-190 events 断言红；
// ② 把 pipefail 早退或短路过滤删掉 → BUG-187 fixture 红；③ 把表达式归一删掉 → BUG-184 fixture 红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eventKeys, executedSmokeFiles, parseWorkflow } from '../../scripts/lib/ci-workflow.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ORACLE = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/ci-oracle/oracle.json'), 'utf8'))

test('CI 执行面与 on: 事件键对真实 YAML + bash -eo pipefail 录制的 oracle 逐例一致（BUG-184 / BUG-187 / BUG-190）', () => {
  assert.ok(Array.isArray(ORACLE.fixtures) && ORACLE.fixtures.length >= 22, '防空语料：fixture 过少')
  let nonEmptyEvents = 0
  for (const fixture of ORACLE.fixtures) {
    assert.deepEqual([...executedSmokeFiles(fixture.workflow)].sort(), fixture.executed, `executed: ${fixture.name}`)
    assert.ok(Array.isArray(fixture.events), `oracle 缺 events 真值字段：${fixture.name}`)
    if (fixture.events.length > 0) nonEmptyEvents += 1
    assert.deepEqual(eventKeys(parseWorkflow(fixture.workflow)), fixture.events, `events: ${fixture.name}`)
  }
  assert.ok(nonEmptyEvents >= 5, '防空语料：BUG-190 事件真值至少覆盖 5 种 on: 形态')
})
