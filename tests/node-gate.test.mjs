import test from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gateBundle, decisionsLines } from '../scripts/node-gate.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const FX = join(HERE, 'fixtures', 'node-gate')
const bundle = (name) => join(FX, 'bundles', name)
const sessions = (name) => join(FX, 'sessions', name)

// 反证先行（writing-a-gate）：先红后绿——本文件是 node-gate 两门的永久反证记录。
// 形态覆盖：门③缺拍板行 / 门②缺 present / 合规双绿 / 操作侧补齐（PASS-RELAY）/
// 未到交付段（双 N/A，显式不静默）/ question.md 失踪（fail-loud）。

test('门③反证：final/ 在场而 §Decisions 无 HITL2 拍板行 → RED（G8 形态）', () => {
  const r = gateBundle(bundle('fixture-hitl2-missing'), sessions('s-hitl2-missing'))
  assert.equal(r.gates.hitl2Row.status, 'RED', '版本记账在场却无拍板行，必须红')
  assert.equal(r.gates.present.status, 'PASS', '隔离性：门②不因门③红而连坐')
  assert.equal(r.red, true)
})

test('门②反证：final + readiness PASS 在场而日志无 present、无操作侧标注 → RED', () => {
  const r = gateBundle(bundle('fixture-present-missing'), sessions('s-present-missing'))
  assert.equal(r.gates.present.status, 'RED', '静默缺席必须红')
  assert.equal(r.gates.hitl2Row.status, 'PASS', '隔离性：门③不因门②红而连坐')
  assert.equal(r.red, true)
})

test('合规形态：拍板行 + present 日志 → 双绿', () => {
  const r = gateBundle(bundle('fixture-complete'), sessions('s-complete'))
  assert.equal(r.gates.hitl2Row.status, 'PASS')
  assert.equal(r.gates.present.status, 'PASS')
  assert.equal(r.red, false)
})

test('通道死恢复路径：操作侧补齐显式记账 → PASS-RELAY 放行带注（显性化不静默）', () => {
  const r = gateBundle(bundle('fixture-relay'), sessions('s-relay'))
  assert.equal(r.gates.present.status, 'PASS-RELAY', '显式记账的操作侧补齐不是违规')
  assert.equal(r.gates.hitl2Row.status, 'PASS')
  assert.equal(r.red, false)
})

test('未到交付段：无 final.md、无 final/ → 双 N/A（无对象显式标注，不静默跳过）', () => {
  const r = gateBundle(bundle('fixture-early'), sessions('s-relay'))
  assert.equal(r.gates.hitl2Row.status, 'N/A')
  assert.equal(r.gates.present.status, 'N/A')
  assert.equal(r.red, false)
})

test('question.md 失踪而 final/ 在场 → fail-loud RED（不静默跳过）', () => {
  const r = gateBundle(bundle('fixture-no-question'), sessions('s-relay'))
  assert.equal(r.gates.hitl2Row.status, 'RED')
  assert.equal(r.red, true)
})

test('decisionsLines：只取 §Decisions 节，遇下一个 ## 停', () => {
  const text = '# Q\n\n## Decisions（append-only，最新在上）\n\n- HITL2 定稿\n- HITL1 定稿\n\n## 背景与动机\n\n- 不该被算进来\n'
  const lines = decisionsLines(text)
  assert.equal(lines.length, 2)
  assert.ok(lines.every((l) => l.includes('HITL')))
})
