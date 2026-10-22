// tests/cockpit/run-version.test.mjs —— rerun 版本面的 keyless 契约。
// 家 = packages/deep-research-pack/src/lib/run-version.ts；夹具 = tests/fixtures/run-rerun/。
// 钉住：① 版本只从盘上事实推（plan 头 `图版本：vN`、重写记录、plan/vN、final/vN、present 见证），
// 不从散文猜；② 头/记录不一致要报，不 picking 一个装作没冲突；③ 无声明版本说「未声明」；
// ④ 交付版本按版本账推定要标「推定」（present 不携带版本号）；⑤ 快照编号 >= 当前版本 = 异常。
//
// 夹具留证 2026-10-23：BUG-043 同族（观察面把数据缺失说成状态）——run-rerun 夹具把
// 「v1 已交付 / v2 在飞 / final.md 工作稿」三件同时摆在盘上；若版本面退回「final.md 在场 =
// 已交付」，本文件与 client-load 的交付断言一起变红。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runVersionFaceOf } from '../../packages/deep-research-pack/src/lib/run-version.ts'

const fixture = (name) => readFileSync(new URL(`../fixtures/run-rerun/${name}`, import.meta.url), 'utf8')

const baseFacts = () => ({
  planText: fixture('plan.md'),
  planSnapshotNames: ['v1.md'],
  finalFileNames: ['v1.md'],
  questionText: fixture('question.md'),
  delivered: true,
  hitlPending: true,
  draftPresent: true,
})

test('v1 已交付 + v2 证据扩张 rerun 在飞 → 三态一行说清，不把工作稿说成已交付', () => {
  const face = runVersionFaceOf(baseFacts())
  assert.equal(face.currentPlanVersion, 2)
  assert.equal(face.recordedPlanVersion, 2)
  assert.equal(face.versionConflicted, false)
  assert.deepEqual(face.planSnapshots, [1])
  assert.deepEqual(face.snapshotAnomaly, [])
  assert.equal(face.deliveredFinalVersion, 1)
  assert.equal(face.deliveryVersionAmbiguous, false)
  assert.equal(face.rerun?.version, 2)
  assert.equal(face.rerun?.kind, 'evidence-expansion')
  assert.equal(face.state, 'pending-hitl2')
  assert.equal(face.label, 'v1 已交付 · v2 证据扩张 rerun · 当前工作稿 · HITL2 待审')
});

test('已交付且无 rerun、无工作稿 → 只说 v1 已交付', () => {
  const face = runVersionFaceOf({ ...baseFacts(), questionText: '# Q\n', draftPresent: false, hitlPending: false })
  assert.equal(face.rerun, null)
  assert.equal(face.state, 'delivered')
  assert.equal(face.label, 'v1 已交付')
});

test('声明了 rerun 但还没交付 → 未交付 + rerun 在飞，不出现“已交付”', () => {
  const face = runVersionFaceOf({ ...baseFacts(), finalFileNames: [], delivered: false, hitlPending: false })
  assert.equal(face.deliveredFinalVersion, null)
  assert.equal(face.state, 'rerun-in-progress')
  assert.equal(face.label, '未交付 · v2 证据扩张 rerun · 当前工作稿')
  assert.doesNotMatch(face.label, /已交付/)
});

test('HITL2 待审优先级最高：rerun 未交付也先说等你拍板', () => {
  const face = runVersionFaceOf({ ...baseFacts(), finalFileNames: [], delivered: false })
  assert.equal(face.state, 'pending-hitl2')
  assert.match(face.label, /HITL2 待审$/)
});

test('plan 头与重写记录版本不一致 → 两个都报，不静默取一个', () => {
  const planText = '# Plan\n\n> 图版本：v6（旧）\n\n## 重写记录\n\n- 2026-10-22 / 图版本 v7 / 动作=加节点\n'
  const face = runVersionFaceOf({ ...baseFacts(), planText, planSnapshotNames: [] })
  assert.equal(face.currentPlanVersion, 6)
  assert.equal(face.recordedPlanVersion, 7)
  assert.equal(face.versionConflicted, true)
  assert.match(face.label, /版本声明不一致（头 v6 \/ 记录 v7）/)
});

test('模板样板里的 `图版本：v1` 不夺权：头部取真正的声明（最后一条），记录接收斜杠形态', () => {
  const planText = [
    '# Plan',
    '',
    '> 供 byId 解析但不画图；图版本：v1（每次重写递增）——重写前先落快照。',
    '',
    '**图版本：v2**（2026-10-23 重写）',
    '',
    '## 重写记录',
    '',
    '- 2026-10-23 / v2 / 加 W2.1 / 原因=补证',
    '- 2026-10-22 / v1 / 立项建图 / 无重写',
  ].join('\n')
  const face = runVersionFaceOf({ ...baseFacts(), planText, questionText: '# Q\n', planSnapshotNames: ['v1.md'] })
  assert.equal(face.currentPlanVersion, 2)
  assert.equal(face.recordedPlanVersion, 2)
  assert.equal(face.versionConflicted, false)
  assert.deepEqual(face.planSnapshots, [1])
});

test('没有机器可读版本行 → 说未声明，不从标题或快照反推', () => {
  const planText = '# Plan — 只有 H1 的 plan v2\n\n| id | deps |\n|---|---|\n| W1.1 | — |\n'
  const face = runVersionFaceOf({ ...baseFacts(), planText, questionText: '# Q\n', planSnapshotNames: [] })
  assert.equal(face.currentPlanVersion, null)
  assert.equal(face.recordedPlanVersion, null)
  assert.match(face.label, /plan 版本未声明/)
  // H1 里的 "plan v2" 不得被当成版本。
  assert.doesNotMatch(face.label, /v2 证据扩张/)
});

test('快照编号 ≥ 当前版本 → 异常，不当旧图用', () => {
  const face = runVersionFaceOf({ ...baseFacts(), planSnapshotNames: ['v1.md', 'v3.md'] })
  assert.deepEqual(face.planSnapshots, [1, 3])
  assert.deepEqual(face.snapshotAnomaly, [3])
  assert.match(face.label, /plan\/v3 快照编号异常/)
});

test('版本账 v2 但 present 只点名 final.md → 交付的是哪版未记载，不拿版本账冒充', () => {
  const face = runVersionFaceOf({ ...baseFacts(), finalFileNames: ['v1.md', 'v2.md'], questionText: '# Q\n', hitlPending: false })
  assert.equal(face.deliveredFinalVersion, null)
  assert.equal(face.deliveryVersionAmbiguous, true)
  assert.equal(face.label, '已交付（版本未记载；版本账 v2） · 当前工作稿')
  assert.doesNotMatch(face.label, /v2 已交付/)
});

test('present 点名 final/v3.md → 交付版本说准（不需要推定）', () => {
  const face = runVersionFaceOf({
    ...baseFacts(),
    finalFileNames: ['v1.md', 'v2.md', 'v3.md'],
    deliveredVersion: 3,
    questionText: '# Q\n',
    hitlPending: false,
  })
  assert.equal(face.deliveredFinalVersion, 3)
  assert.equal(face.deliveryVersionAmbiguous, false)
  assert.equal(face.label, 'v3 已交付 · 当前工作稿')
});

test('表述修订声明：版本号不冒充证据扩张', () => {
  const face = runVersionFaceOf({
    ...baseFacts(),
    questionText: '# Q\n\n> rerun: v2 · polish · 2026-10-22 · 触发：措辞修订\n',
    finalFileNames: [],
    delivered: false,
    hitlPending: false,
    draftPresent: false,
  })
  assert.equal(face.rerun?.kind, 'polish')
  assert.match(face.label, /表述修订 rerun/)
});

test('版本账在但 present 不在 journal 窗口 → 说“交付未见证”，不说未交付', () => {
  const face = runVersionFaceOf({ ...baseFacts(), questionText: '# Q\n', delivered: false, hitlPending: false, draftPresent: false })
  assert.equal(face.ledgerFinalVersion, 1)
  assert.equal(face.deliveredFinalVersion, null)
  assert.equal(face.label, 'v1 版本账 · 交付未见证')
  assert.doesNotMatch(face.label, /已交付|未交付/)
});

test('模板里的 rerun 示例行不是声明：无真实日期/带占位符一律不算', () => {
  const template = '# Q\n\n<!-- 示例：\n> rerun: v2 · evidence-expansion · YYYY-MM-DD · 触发：<一句话>\n-->\n'
  assert.equal(runVersionFaceOf({ ...baseFacts(), questionText: template, finalFileNames: [] }).rerun, null)
  const placeholder = '# Q\n\n> rerun: v2 · evidence-expansion · 2026-10-23 · 触发：<一句话>\n'
  assert.equal(runVersionFaceOf({ ...baseFacts(), questionText: placeholder }).rerun, null)
  const real = '# Q\n\n> rerun: v2 · evidence-expansion · 2026-10-23 · 触发：补证\n'
  assert.equal(runVersionFaceOf({ ...baseFacts(), questionText: real }).rerun?.version, 2)
});

test('fail-soft：全空输入不 throw，如实未交付且无版本', () => {
  const face = runVersionFaceOf({})
  assert.equal(face.currentPlanVersion, null)
  assert.equal(face.planSnapshots.length, 0)
  assert.equal(face.ledgerFinalVersion, 0)
  assert.equal(face.deliveredFinalVersion, null)
  assert.equal(face.rerun, null)
  assert.equal(face.state, 'none')
  assert.equal(face.label, '未交付')
});
