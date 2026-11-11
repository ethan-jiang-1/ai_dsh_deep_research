// i18n.test.mjs — 折层翻译桥与数据面英文覆盖（BUG-055 残留收口）。
//
// 为什么存在：组件字面量走 `t()` 只解决了 chrome；七步标签、业务摘要、图谱状态词、版本面、
// 回执、rerun 三改法等由 `src/lib` 纯折算生成，英文 locale 下曾整片中文。本文件钉两件：
//   ① `lib/i18n.ts` 的插值/缺省语义（缺参原样留 `{k}`，缺省翻译器 = zh）；
//   ② 每个产文案的折层函数在 `en` 字典下输出零 CJK（组件漏传 t = 字典缺键时函数仍可断言红）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { interpolate, translateZh } from '../../packages/deep-research-pack/src/lib/i18n.ts'
import { en, zh } from '../../packages/deep-research-pack/src/client/locales.ts'
import { deriveSteps } from '../../packages/deep-research-pack/src/lib/run-fold.ts'
import { deriveAnchors } from '../../packages/deep-research-pack/src/lib/hitl-fold.ts'
import { deriveBusinessBrief } from '../../packages/deep-research-pack/src/lib/brief-fold.ts'
import { foldActivityRows } from '../../packages/deep-research-pack/src/lib/activity-fold.ts'
import { foldMemberActivity } from '../../packages/deep-research-pack/src/lib/member-activity.ts'
import { runVersionFaceOf } from '../../packages/deep-research-pack/src/lib/run-version.ts'
import {
  coverageLineOf, coverageOf, coverageWarningOf, nodeStateOf, planMappingOf, planNodeStateOf,
} from '../../packages/deep-research-pack/src/lib/graph-model.ts'
import { planDiffOf } from '../../packages/deep-research-pack/src/lib/plan-diff.ts'
import { planIndex, planIssuesOf } from '../../packages/deep-research-pack/src/lib/plan-index.ts'
import { attentionOf, DEFAULT_ATTENTION_THRESHOLDS } from '../../packages/deep-research-pack/src/lib/plan-graph.ts'
import { graphStateNote } from '../../packages/deep-research-pack/src/client/research-graph/state-note.ts'
import { rerunTriageRowsOf } from '../../packages/deep-research-pack/src/lib/rerun-triage.ts'
import { cardTitleOf } from '../../packages/deep-research-pack/src/lib/tool-card.ts'
import { libraryDiff, receiptOf } from '../../packages/deep-research-pack/src/lib/receipt-fold.ts'
import { fieldExecutionRowsOf, specimenSkeletonsOf } from '../../packages/deep-research-pack/src/client/research-config/config-model.ts'

const CJK = /[\u4e00-\u9fa5]/
/** 与 DSH translate 同形的英文翻译器（缺参原样留 `{k}`）。 */
const tEn = (key, params = {}) => interpolate(String(en[key]), params)

/** 断言一组输出行在英文下零 CJK，并给出命中的行。 */
function assertNoCjk(label, values) {
  const bad = values.filter((value) => value !== null && value !== undefined && CJK.test(String(value)))
  assert.deepEqual(bad, [], `${label} 在英文 locale 下仍含中文：${bad.map(String).join(' | ')}`)
}

test('i18n 插值：缺参原样保留；缺省翻译器 = 中文正本', () => {
  assert.equal(interpolate('a {b} c', { b: 'X' }), 'a X c')
  assert.equal(interpolate('a {b} c'), 'a {b} c')
  assert.equal(interpolate('a {b} c', { c: 'Y' }), 'a {b} c')
  assert.equal(translateZh('stepQuestion'), zh.stepQuestion)
  assert.equal(translateZh('graphCoverageMapped', { count: 2 }), '已映射 2')
})

test('数据面：七步标签 / 锚点 / 业务摘要 / 活动行 / 队员行 / 版本面在英文下零 CJK', () => {
  const steps = deriveSteps({ question: true, team: true, leads: true, evidence: 2, findings: true, review: true, final: true }, tEn)
  assert.deepEqual(steps.map((step) => step.label), ['Kickoff', 'Team', 'Scout', 'Dig', 'Synthesize', 'Review', 'Deliver'])
  assertNoCjk('deriveSteps', steps.map((step) => step.label))

  const anchors = deriveAnchors([], { question: true, delivered: false }, tEn)
  assert.equal(anchors[0].label, 'Kickoff confirmed')
  assertNoCjk('deriveAnchors', anchors.map((anchor) => anchor.label))

  const brief = deriveBusinessBrief({ bundleBound: false }, tEn)
  assertNoCjk('deriveBusinessBrief', [brief.goal, brief.stageLine, brief.knownLine, brief.unknownLine, brief.actionLine])

  const activity = foldActivityRows([
    { type: 'tool/call', data: { name: 'web_search', arguments: JSON.stringify({ queries: ['q1', 'q2'] }) } },
    { type: 'tool/call', data: { name: 'spawn_teammate', arguments: JSON.stringify({ name: 'scout-a', description: 'map the field' }) } },
    { type: 'tool/call', data: { name: 'present', arguments: '{}' } },
    { type: 'tool/call', data: { name: 'wait_agent', arguments: '{}' } },
  ], tEn)
  assertNoCjk('foldActivityRows', activity.map((row) => row.text))

  const member = foldMemberActivity([
    { type: 'tool/call', data: { name: 'web_search', arguments: JSON.stringify({ queries: ['q1'] }) } },
    { type: 'tool/call', data: { name: 'web_fetch', arguments: JSON.stringify({ url: 'https://example.com' }) } },
    { type: 'tool/result', data: { name: 'web_fetch', message: { isError: true, content: [{ type: 'text', text: 'Error: blocked' }] } } },
  ], tEn)
  assertNoCjk('foldMemberActivity', member.rows.map((row) => row.text))

  const version = runVersionFaceOf({ delivered: true, finalFileNames: ['v1.md'], draftPresent: true }, tEn)
  assertNoCjk('runVersionFaceOf', [version.label])
})

test('数据面：图谱状态 / 覆盖率 / 结构差异 / plan 提示 / 注意力 / 降级说明在英文下零 CJK', () => {
  const plan = planIndex('| id | kind | deps | parent | task_id |\n|---|---|---|---|---|\n| W1.1 | broad-scan | | | task-1 |\n| W2.1 | deep-dive | W1.1 | | |\n')
  assert.ok(plan.nodes.length >= 2, '夹具应解析出节点')
  const tasks = [{ id: 'task-1', status: 'completed', blockedBy: [] }]
  const mapping = planMappingOf(plan, tasks)
  const coverage = coverageOf(plan, tasks, mapping)
  assertNoCjk('coverageLineOf', [coverageLineOf(coverage, tEn)])
  assertNoCjk('coverageWarningOf', [coverageWarningOf(coverage, tEn)])
  assertNoCjk('nodeStateOf', [nodeStateOf(tasks[0], true, undefined, tEn).text])
  assertNoCjk('planNodeStateOf', [planNodeStateOf(mapping.mapping.get('W2.1'), undefined, undefined, tEn).text])

  const previous = planIndex('| id | deps |\n|---|---|\n| W1.1 | |\n')
  const next = planIndex('| id | deps |\n|---|---|\n| W1.1 | |\n| W1.2 | W1.1 |\n')
  const diff = planDiffOf(previous, next, tEn)
  assertNoCjk('planDiffOf', [diff.summary])

  const issues = planIssuesOf(planIndex('| id | kind | deps | parent |\n|---|---|---|---|\n| W1.1 | broad-scan | | |\n| W1.1 | deep-dive | W1.1 | |\n| W2.1 | deep-dive | W9.9 | W9 |\n'), tEn)
  assert.ok(issues.length >= 2, '夹具应产生结构提示')
  assertNoCjk('planIssuesOf', issues.map((issue) => issue.message))

  const attention = attentionOf(
    [{ id: 'task-1', status: 'in_progress', ownerName: 'scout-a', since: 0 }],
    new Map([['scout-a', { phase: 'inactive', running: false, since: 0 }]]),
    10 * 60_000,
    DEFAULT_ATTENTION_THRESHOLDS,
    tEn,
  )
  assert.ok(attention.length >= 1, '夹具应产生注意力条目')
  assertNoCjk('attentionOf', attention.map((item) => item.message))

  const note = graphStateNote({ planState: 'missing', boundSlug: null, followError: null, hasPlan: false, hasEdges: false, hasTopLevel: false }, tEn)
  assert.ok(note !== null)
  assertNoCjk('graphStateNote', [note.title, note.body])
})

test('数据面：rerun 三改法 / 工具卡 / 回执 / 配置执行面与标本在英文下零 CJK', () => {
  const rows = rerunTriageRowsOf(tEn)
  assertNoCjk('rerunTriageRowsOf', rows.flatMap((row) => [row.label, row.consequence, row.copy]))
  assert.equal(rows.length, 3)

  assertNoCjk('cardTitleOf', [
    cardTitleOf('spawn_teammate', { name: 'scout-a', description: 'map the field' }, '', tEn),
    cardTitleOf('web_search', { queries: ['q1', 'q2'] }, '', tEn),
  ])

  const entry = { name: 'Fact check', provenance: null, isDefault: false, legacyText: null, sections: { source: 'a', verify: null, report: null, limit: null } }
  const diff = libraryDiff([], [entry], null, tEn)
  assertNoCjk('libraryDiff', [diff.text])
  const receipt = receiptOf({ ok: true, detail: '', replied: false, diff }, tEn)
  assertNoCjk('receiptOf', [receipt.text])

  const execution = fieldExecutionRowsOf(tEn)
  assertNoCjk('fieldExecutionRowsOf', execution.flatMap((row) => [row.who, row.where, row.cannot]))
  const specimens = specimenSkeletonsOf(tEn)
  assertNoCjk('specimenSkeletonsOf', Object.values(specimens).flat())
})
