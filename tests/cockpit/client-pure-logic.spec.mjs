// client 纯逻辑直测（W0-4 / S1）——测试资产围栏研究点名的 6 个无直测/无路径件：
// `lead-prompt`、`research-graph/format`、`method-library/{coach-prompts,operation-prompts}`、
// `research-config/section-labels`、`defaults/labels`。
//
// 为什么需要：这些件要么进模型请求（coach/operation 指令），要么决定用户可见文案/短标签
// （format/section-labels/defaults-labels），要么决定 steer→queue 的发送语义（lead-prompt）。
// 它们此前只被组件或真浏览器慢档间接覆盖；组件一改，判据就漂。这里全部走纯函数直测，
// 不引 DOM、不引 React、不碰慢档。
//
// 边界：不测 React 组件/hook 的渲染与生命周期（归 `client-load` 与后续 hook harness）；
// `defaults/labels` 的表与 `research-defaults` 的枚举数组对账，防「新枚举值没标签」。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLeadPrompt } from '../../packages/deep-research-pack/src/client/lead-prompt.ts'
import { shortLabel, severityIcon } from '../../packages/deep-research-pack/src/client/research-graph/format.ts'
import { coachContextOf, coachStartAction, manualEditPrompt } from '../../packages/deep-research-pack/src/client/method-library/coach-prompts.ts'
import { saveOperationInstruction, removeOperationInstruction, setDefaultOperationInstruction, clearDefaultOperationInstruction } from '../../packages/deep-research-pack/src/client/method-library/operation-prompts.ts'
import { sectionLabelOf } from '../../packages/deep-research-pack/src/client/research-config/section-labels.ts'
import { DEPTH_LABEL, SHAPE_LABEL, FAMILY_LABEL, AUTHORITY_LABEL, RECENCY_LABEL } from '../../packages/deep-research-pack/src/client/defaults/labels.ts'
import { EFFORT_BANDS, OUTPUT_SHAPES, SOURCE_FAMILIES, AUTHORITIES, RECENCIES } from '../../packages/deep-research-pack/src/lib/research-defaults.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function leadHarness(responses) {
  const calls = []
  const remote = {
    async prompt(input) {
      calls.push(input)
      const next = responses.shift()
      if (next instanceof Error) throw next
      return next
    },
  }
  return { calls, ...createLeadPrompt(remote, (key) => `t:${key}`) }
}

test('lead-prompt：steer 成功 → 只发一次 steer，回执 leadSent', async () => {
  const { calls, sendInstruction } = leadHarness([{ ok: true }])
  const result = await sendInstruction('s1', 'hello')
  assert.deepEqual(result, { ok: true, detail: 't:leadSent' })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].mode, 'steer')
  assert.equal(calls[0].sessionId, 's1')
  assert.deepEqual(calls[0].content, [{ type: 'text', text: 'hello' }])
  assert.match(calls[0].requestId, UUID)
})

test('lead-prompt：steer 失败 → 降级 queue；两次失败 → ok:false 带 error', async () => {
  const { calls, sendInstruction } = leadHarness([{ ok: false, error: 'busy' }, { ok: true }])
  assert.deepEqual(await sendInstruction('s1', 'hello'), { ok: true, detail: 't:leadSent' })
  assert.deepEqual(calls.map((c) => c.mode), ['steer', 'queue'])

  const failed = leadHarness([{ ok: false, error: 'one' }, { ok: false, error: 'two' }])
  assert.deepEqual(await failed.sendInstruction('s2', 'x'), { ok: false, detail: 'two' })
})

test('lead-prompt：remote 抛错 → ok:false，不伪装成功', async () => {
  const { sendInstruction } = leadHarness([new Error('boom')])
  assert.deepEqual(await sendInstruction('s1', 'hello'), { ok: false, detail: 'Error: boom' })
})

test('research-graph/format：短标签折叠空白、按 max 截断并加省略号；severity 图标三态', () => {
  assert.equal(shortLabel('  a   b\n c  '), 'a b c')
  assert.equal(shortLabel('x'.repeat(30), 15), `${'x'.repeat(14)}…`)
  assert.equal(shortLabel('short', 15), 'short')
  assert.equal(shortLabel('   ', 15), '')
  assert.equal(severityIcon('critical'), '✕')
  assert.equal(severityIcon('warning'), '⚠')
  assert.equal(severityIcon('info'), '·')
})

test('coach-prompts：上下文带库/草稿/内置/研究来源；来源类型决定首问；手改只带勾选字段', () => {
  const sections = { source: 'a', verify: 'b', report: 'c', limit: 'd' }
  const base = { text: null, draft: null, draftRevision: 0, selectedBuiltinSource: null, selectedRunSource: null }
  const empty = coachContextOf(base)
  assert.match(empty, /当前方法库（method-library\.md）：\n（未加载）/)
  assert.match(empty, /当前草稿（版本 0）：\n（新建：四字段为空）/)
  assert.match(empty, /内置参考/)
  assert.doesNotMatch(empty, /用户选择的/)

  const full = coachContextOf({
    text: '## 方法A\n- 找来源: a',
    draft: { name: '方法A', sections },
    draftRevision: 3,
    selectedBuiltinSource: { name: '内置A', sections },
    selectedRunSource: {
      name: 'RunA',
      finalPath: 'final.md',
      question: { kind: 'ok', eof: true, text: 'Q' },
      deliverable: { kind: 'ok', eof: false, text: 'D' },
    },
  })
  assert.match(full, /当前草稿（版本 3）/)
  assert.match(full, /用户选择的内置参考（只读）：内置A/)
  assert.match(full, /用户选择的已完成研究：RunA/)
  assert.match(full, /研究问题预览（eof=true）：\nQ/)
  assert.match(full, /交付物预览（eof=false）：\nD/)

  assert.match(coachStartAction(null, null), /从零开始/)
  assert.match(coachStartAction(null, { name: '内置A' }), /内置参考“内置A”/)
  assert.match(coachStartAction({ name: 'RunA' }, null), /已完成研究“RunA”/)

  const manual = manualEditPrompt({ name: '方法A', sections }, new Set(['name', 'source']))
  assert.match(manual, /【用户手改，以下值以用户为准，不要覆盖】/)
  assert.match(manual, /名称：方法A/)
  assert.match(manual, /找来源：a/)
  assert.doesNotMatch(manual, /怎么核实/)
})

test('operation-prompts：写库指令逐字含动作/工具/operation 契约；四种指令不混', () => {
  const entry = '## 方法A\n- 找来源: a'
  const create = saveOperationInstruction({ name: '方法A', entryText: entry, setDefault: true, mode: 'new' })
  assert.match(create, /保存方法「方法A」/)
  assert.match(create, /动作：新建/)
  assert.match(create, /defaultAction=set/)
  assert.match(create, /method_library_upsert/)
  assert.match(create, /```method-draft\n## 方法A\n- 找来源: a\n```/)

  const update = saveOperationInstruction({ name: '方法A', entryText: entry, setDefault: false, mode: 'edit' })
  assert.match(update, /动作：更新/)
  assert.match(update, /defaultAction=preserve/)

  assert.match(removeOperationInstruction('方法A'), /method_library_remove/)
  assert.match(setDefaultOperationInstruction('方法A'), /method_library_set_default/)
  assert.match(setDefaultOperationInstruction('方法A'), /action=set/)
  assert.match(clearDefaultOperationInstruction(), /action=clear/)
  assert.match(clearDefaultOperationInstruction(), /不传 name/)
})

test('section-labels：四字段各取一个独立字典键', () => {
  const t = (key) => `t:${key}`
  assert.equal(sectionLabelOf(t, 'source'), 't:sectionSource')
  assert.equal(sectionLabelOf(t, 'verify'), 't:sectionVerify')
  assert.equal(sectionLabelOf(t, 'report'), 't:sectionReport')
  assert.equal(sectionLabelOf(t, 'limit'), 't:sectionLimit')
})

test('defaults/labels：五张标签表与 enum 数组一一覆盖，无缺无多', () => {
  const cases = [
    [DEPTH_LABEL, EFFORT_BANDS],
    [SHAPE_LABEL, OUTPUT_SHAPES],
    [FAMILY_LABEL, SOURCE_FAMILIES],
    [AUTHORITY_LABEL, AUTHORITIES],
    [RECENCY_LABEL, RECENCIES],
  ]
  for (const [table, values] of cases) {
    assert.deepEqual(Object.keys(table).sort(), [...values].sort())
    for (const value of values) assert.equal(typeof table[value], 'string')
  }
})
