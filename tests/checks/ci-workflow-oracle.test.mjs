// 负例留证 2026-11-14：BUG-184/187/190——CI 执行面此前靠手写 SYNTHETIC 断言；本测试对
// dev/record-ci-oracle.mjs 用「真 YAML 解析 + 真 bash + 失败 stub node」录制的 oracle 断言。
// 红配方：把 parseEvents / normalizeExpression / splitCommands 任一处退回旧形态 → 对应 fixture 红；
// 把子 shell 的括号剥离删掉 → subshell 例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { executedSmokeFiles } from '../../scripts/lib/ci-workflow.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ORACLE = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/ci-oracle/oracle.json'), 'utf8'))

test('CI 执行面对真实 YAML + bash 录制的 oracle 逐例一致（BUG-184 / BUG-187 / BUG-190）', () => {
  assert.ok(Array.isArray(ORACLE.fixtures) && ORACLE.fixtures.length >= 20, '防空语料：fixture 过少')
  for (const fixture of ORACLE.fixtures) {
    assert.deepEqual([...executedSmokeFiles(fixture.workflow)].sort(), fixture.executed, fixture.name)
  }
})
