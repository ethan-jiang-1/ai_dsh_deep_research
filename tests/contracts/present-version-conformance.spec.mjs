// present-version-conformance.spec.mjs — 版本/present 的结构化优先（D51 迁移 II·S3）。
//
// 为什么存在：交付版本曾从正文 `vN` 与 `present` 路径两处推（BUG-101/103/112/116/125/129 的类）。
// 现状：交付版本只认 `deliverables/presented` 事件；plan 的「图版本」是重写计数器，取头部声明并
// 报冲突，不参与交付判定。本文件钉住三条不变量，防止有人把正文解析接回交付路径。
//
// 负例留证 2026-11-13：BUG-116——present 末条不带版本时保留旧 max，交付版本错位。
// 红配方：把 latestPresentedFinalVersion 改成「对 events 里任意文本 match vN」→ 下方 prose 例红。
import test from 'node:test'
import assert from 'node:assert/strict'
import { latestPresentedFinalVersion } from '../../packages/deep-research-pack/src/lib/final-target.ts'
import { runVersionFaceOf } from '../../packages/deep-research-pack/src/lib/run-version.ts'

const presented = (path, time) => ({ type: 'deliverables/presented', time, data: { files: [{ path }] } })

test('不变①：交付版本只认 present 事件路径（vN），正文提及 v9 不算', () => {
  const events = [
    { type: 'assistant/message', time: 1, data: { text: '旧方案 v9' } },
    presented('drt_x/final/v1.md', 2),
    { type: 'user/message', time: 3, data: { text: '按 v9 交付' } },
    presented('drt_x/final/v2.md', 4),
  ]
  assert.equal(latestPresentedFinalVersion(events), 2)
  assert.equal(latestPresentedFinalVersion(events.slice(0, 3)), 1)
  assert.equal(latestPresentedFinalVersion([{ type: 'user/message', data: { text: 'v9' } }]), null)
})

test('不变②：最后一条 present 指 final.md（无版本）→ null，不拿更早的 v1 冒充', () => {
  const events = [presented('drt_x/final/v1.md', 1), presented('drt_x/final.md', 2)]
  assert.equal(latestPresentedFinalVersion(events), null, '最新交付声明无版本 = 版本未记载')
  assert.equal(latestPresentedFinalVersion([presented('drt_x/final/v1.md', 1)]), 1)
})

test('不变③：交付判定与 plan 正文版本解耦——plan 写 v9 也不改 deliveredFinalVersion', () => {
  const base = { delivered: true, deliveredVersion: 2, finalFileNames: ['v1.md', 'v2.md'] }
  const withPlan = runVersionFaceOf({ ...base, planText: '# Plan\n\n图版本：v9\n' })
  const withoutPlan = runVersionFaceOf({ ...base, planText: '' })
  assert.equal(withPlan.deliveredFinalVersion, 2)
  assert.equal(withPlan.deliveredFinalVersion, withoutPlan.deliveredFinalVersion)
  assert.equal(withPlan.currentPlanVersion, 9, 'plan 版本只作显示')
})

test('不变④：plan 头与重写记录冲突 → 报冲突，current 取头部声明（不取 max 冒充）', () => {
  const planText = '# Plan\n\n图版本：v6\n\n## 重写记录\n\n- 2026-10-22 / 图版本 v7 / 动作=加节点\n'
  const face = runVersionFaceOf({ delivered: false, finalFileNames: [], planText })
  assert.equal(face.currentPlanVersion, 6)
  assert.equal(face.recordedPlanVersion, 7)
  assert.equal(face.versionConflicted, true)
})
