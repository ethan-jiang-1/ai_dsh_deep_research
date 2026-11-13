// rerun-triage 文案回归 — 「还不满意？三种改法」的单一正本（keyless 纯常量）。
// 两处折叠块（状态页 ⑤ / 终稿页脚）共用本模块；这里钉三行的用户语言、代价与可复制话术，
// 以及"只读出口"的边界（模块内不得出现动作 API）。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  RERUN_TRIAGE_HINT, RERUN_TRIAGE_ROWS, RERUN_TRIAGE_TITLE, triageFoldLines,
} from '../../packages/deep-research-pack/src/lib/rerun-triage.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LIB = 'packages/deep-research-pack/src/lib/rerun-triage.ts'

test('三种改法：用户语言 + 版本后果 + 可复制一句话', () => {
  assert.equal(RERUN_TRIAGE_ROWS.length, 3)
  assert.deepEqual(RERUN_TRIAGE_ROWS.map((r) => r.label), ['补研究', '改说法', '另起一个 bundle'])
  for (const row of RERUN_TRIAGE_ROWS) {
    assert.ok(row.consequence.length > 0, `${row.label} 缺后果`)
    assert.match(row.copy, /这份|方向/, `${row.label} 的话术必须是一句可直接发的话`)
  }
  assert.match(RERUN_TRIAGE_ROWS[0].consequence, /vN\+1|新版本/, '补研究必须说清出新版本')
  assert.match(RERUN_TRIAGE_ROWS[1].consequence, /版本不变/, '改说法必须说清版本不变')
  assert.match(RERUN_TRIAGE_ROWS[2].consequence, /旧报告/, '另起必须说清旧报告保留')
})

test('折叠块纯文本 = 标题 + 三行 + 脚注（client-load 与测试共用同一拼法）', () => {
  const lines = triageFoldLines()
  assert.equal(lines[0], RERUN_TRIAGE_TITLE)
  assert.equal(lines.at(-1), RERUN_TRIAGE_HINT)
  assert.equal(lines.length, 5)
  for (const row of RERUN_TRIAGE_ROWS) {
    assert.ok(lines.some((l) => l.includes(row.label) && l.includes(row.copy)), `折叠块缺 ${row.label} 的完整行`)
  }
})

test('只读出口：文案模块不含任何动作面（不按钮化 rerun）', () => {
  const text = readFileSync(join(ROOT, LIB), 'utf8')
  for (const forbidden of ['spawn_teammate', 'send_message', 'team_task_', 'run-accept', 'onClick']) {
    assert.equal(text.includes(forbidden), false, `只读文案不得含动作面：${forbidden}`)
  }
  assert.equal(/<button/i.test(text), false, '只读文案不得含按钮')
})
