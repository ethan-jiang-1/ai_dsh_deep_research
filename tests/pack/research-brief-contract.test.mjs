// research-brief-contract.test.mjs — HITL1 typed 输入与 Strategy 派生行的 keyless 源面合同。
// 为什么读文件：这些是模型可见文本，组件/门禁不解析它们；用源面断言钉住「三问仍三问、
// source/output 落格、plan 头有派生策略行」，行为证据仍归 L1/L4-lite。
// 反证：删掉任一 typed 落格句或 plan 的策略行 → 本例红。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SKILL = join(ROOT, 'packages', 'deep-research-pack', 'presets', 'lead', 'skills', 'research-brief', 'SKILL.md')
const PLAN = join(ROOT, 'packages', 'deep-research-pack', 'content', 'templates', 'run', 'plan.md')
const LEAD = join(ROOT, 'packages', 'deep-research-pack', 'presets', 'lead.patch.yml')

test('research-brief：三问带 output/source typed 落格，不新增第四问', () => {
  const skill = readFileSync(SKILL, 'utf8')
  assert.match(skill, /输出形态/)
  assert.match(skill, /families = official/)
  assert.match(skill, /protocol\.output\.shape/)
  assert.match(skill, /protocol\.source_scope/)
  assert.match(skill, /不新增\s*第四问/)
})

test('research-brief：项目默认被消费（项目默认 / Lead 判断 / 用户本次三分）', () => {
  const skill = readFileSync(SKILL, 'utf8')
  assert.match(skill, /research:defaults/, '未点名项目默认注入段')
  assert.match(skill, /项目默认/, '未要求标「项目默认」')
  assert.match(skill, /Lead 判断/, '未要求自动维度标「Lead 判断」')
  assert.match(skill, /用户本次/, '未记录用户本次覆盖')
  assert.match(skill, /\{\{默认偏好\}\}|〔默认偏好〕/, '方法默认未进消费链')
  assert.match(skill, /不新增\s*第四问/)
})

test('lead persona：HITL1 三问卡把 output/source 写进选项，quick 也照发', () => {
  const lead = readFileSync(LEAD, 'utf8')
  assert.match(lead, /深度与篇幅 \+ 输出形态/)
  assert.match(lead, /时间口径与语言 \+ 来源范围/)
  assert.match(lead, /quick_factual 也照发/)
})

test('plan 模板：头含派生策略行（通道/worker/门/预算）', () => {
  const plan = readFileSync(PLAN, 'utf8')
  assert.match(plan, /^> - 策略:/m)
  assert.match(plan, /通道=/)
  assert.match(plan, /worker=/)
  assert.match(plan, /预算=/)
})
