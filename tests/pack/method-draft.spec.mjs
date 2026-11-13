// method-draft 解析回归（keyless）：方法编辑输出契约 → 页面回填的唯一入口。
// 判据：只取最后一个完整围栏；标题/四标签/来源/默认标记都按 library-fold 折；坏块不猜。
import test from 'node:test'
import assert from 'node:assert/strict'
import { coachPatchAppliesToDraft, mergeCoachDraft, parseMethodDraft } from '../../packages/deep-research-pack/src/lib/method-draft.ts'

const ENTRY = `## 机房选型尽调（2026-10-28，对话）
- 找来源: 官方定价页与公告优先，厂商自述标“自述”
- 怎么核实: 冲突回原表复算；复算不了并列两个口径
- 报告怎么写: 第一屏给拍板人：结论 + 三个取舍 + 风险
- 不承诺: 不做价格预测；不给厂商排名`

test('完整围栏 → 四字段 + 名称 + 来源', () => {
  const entry = parseMethodDraft(`先问一句。\n\n\`\`\`method-draft\n${ENTRY}\n\`\`\`\n\n请确认。`)
  assert.ok(entry !== null)
  assert.equal(entry.name, '机房选型尽调')
  assert.equal(entry.provenance, '2026-10-28，对话')
  assert.equal(entry.isDefault, false)
  assert.equal(entry.sections.source, '官方定价页与公告优先，厂商自述标“自述”')
  assert.equal(entry.sections.limit, '不做价格预测；不给厂商排名')
})

test('多个围栏只取最后一个（页面回填最新草稿）', () => {
  const first = ENTRY.replace('机房选型尽调', '旧草稿')
  const entry = parseMethodDraft(`\`\`\`method-draft\n${first}\n\`\`\`\n中间\n\`\`\`method-draft\n${ENTRY}\n\`\`\``)
  assert.equal(entry?.name, '机房选型尽调')
})

test('无围栏 / 未闭合围栏 → null（不猜半截内容）', () => {
  assert.equal(parseMethodDraft('没有草稿，只是聊天。'), null)
  assert.equal(parseMethodDraft(`\`\`\`method-draft\n${ENTRY}`), null)
})

test('〔默认偏好〕与空字段按库格式折出', () => {
  const entry = parseMethodDraft(`\`\`\`method-draft\n## 事实核查（2026-10-28，对话）〔默认偏好〕\n- 找来源: 官方源\n- 怎么核实: （待定）\n- 报告怎么写: （待定）\n- 不承诺: 不承诺覆盖非公开信息\n\`\`\``)
  assert.equal(entry?.isDefault, true)
  assert.equal(entry?.sections.verify, null)
  assert.equal(entry?.sections.source, '官方源')
})

test('围栏外解释不污染字段（只折围栏内）', () => {
  const entry = parseMethodDraft(`- 找来源: 这是围栏外的句子\n\`\`\`method-draft\n${ENTRY}\n\`\`\`\ntrailing`)
  assert.equal(entry?.sections.source, '官方定价页与公告优先，厂商自述标“自述”')
})


test('merge：手改字段永远以用户为准，其余取 coach 新值', () => {
  const base = parseMethodDraft(`\`\`\`method-draft\n${ENTRY}\n\`\`\``)
  const state = {
    name: '用户改过的名字',
    sections: { source: '用户手改的来源', verify: null, report: null, limit: null },
    manual: new Set(['name', 'source']),
    base,
  }
  const next = parseMethodDraft(`\`\`\`method-draft\n${ENTRY.replace('官方定价页与公告优先，厂商自述标“自述”', '官方定价页、公告、更新日志优先').replace('机房选型尽调', '机房选型尽调 v2')}\n\`\`\``)
  const merged = mergeCoachDraft(state, next)
  assert.equal(merged.name, '用户改过的名字')
  assert.equal(merged.sections.source, '用户手改的来源')
  assert.equal(merged.sections.verify, '冲突回原表复算；复算不了并列两个口径')
  assert.ok(merged.coachFields.has('verify'))
  assert.ok(merged.coachFields.has('name'))
})

test('merge：activeField = 相对上一轮 coach 草稿刚变化的第一格', () => {
  const base = parseMethodDraft(`\`\`\`method-draft\n${ENTRY}\n\`\`\``)
  const next = parseMethodDraft(`\`\`\`method-draft\n${ENTRY.replace('不做价格预测；不给厂商排名', '不做价格预测；不给厂商排名；不覆盖非公开信息')}\n\`\`\``)
  const merged = mergeCoachDraft({ name: '', sections: { source: null, verify: null, report: null, limit: null }, manual: new Set(), base }, next)
  assert.equal(merged.activeField, 'limit')
})

test('merge：base 为 null 时 activeField = 第一格非空字段（首轮定位）', () => {
  const next = parseMethodDraft(`\`\`\`method-draft\n${ENTRY}\n\`\`\``)
  const merged = mergeCoachDraft({ name: '', sections: { source: null, verify: null, report: null, limit: null }, manual: new Set(), base: null }, next)
  assert.equal(merged.activeField, 'source')
})

test('coach patch applies only to its turn base or the last accepted patch revision', () => {
  assert.equal(coachPatchAppliesToDraft({ currentRevision: 0, baseRevision: 0, acceptedRevision: null }), true)
  assert.equal(coachPatchAppliesToDraft({ currentRevision: 2, baseRevision: 0, acceptedRevision: null }), false)
  assert.equal(coachPatchAppliesToDraft({ currentRevision: 2, baseRevision: 0, acceptedRevision: 2 }), true)
  assert.equal(coachPatchAppliesToDraft({ currentRevision: 3, baseRevision: 0, acceptedRevision: 2 }), false)
  assert.equal(coachPatchAppliesToDraft({ currentRevision: 0, baseRevision: null, acceptedRevision: null }), false)
  assert.equal(coachPatchAppliesToDraft({ currentRevision: 0, baseRevision: 0, acceptedRevision: 0 }), true)
})
