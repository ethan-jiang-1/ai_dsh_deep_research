// 方法库 upsert 回归（keyless）：保存闭环的写盘纯函数——同名覆盖、库头/其它条目保留、默认唯一。
import test from 'node:test'
import assert from 'node:assert/strict'
import { foldLibrary } from '../../packages/deep-research-pack/src/lib/library-fold.ts'
import { upsertMethodEntry } from '../../packages/deep-research-pack/src/lib/method-library-write.ts'

const entry = (name, overrides = {}) => ({
  name,
  provenance: '2026-10-28，对话',
  isDefault: false,
  sections: {
    source: `${name} 的找来源`,
    verify: `${name} 的怎么核实`,
    report: `${name} 的报告怎么写`,
    limit: `${name} 的不承诺`,
    ...overrides.sections,
  },
  legacyText: overrides.legacyText ?? null,
})

test('空库 → 新建：标题 + 四行 + provenance', () => {
  const result = upsertMethodEntry('', entry('机房选型'))
  assert.equal(result.action, 'created')
  assert.match(result.text, /^## 机房选型（2026-10-28，对话）\n- 找来源: 机房选型 的找来源\n- 怎么核实:/)
  const parsed = foldLibrary(result.text)
  assert.equal(parsed[0]?.sections.limit, '机房选型 的不承诺')
})

test('同名 → 更新整段，其它条目与库头不动', () => {
  const existing = `# 方法库\n\n## 旧条目\n- 找来源: 旧\n- 怎么核实: 旧\n- 报告怎么写: 旧\n- 不承诺: 旧\n\n## 机房选型\n- 找来源: 旧来源\n- 怎么核实: 旧核实\n- 报告怎么写: 旧报告\n- 不承诺: 旧不承诺\n`
  const result = upsertMethodEntry(existing, entry('机房选型'))
  assert.equal(result.action, 'updated')
  assert.match(result.text, /^# 方法库/)
  assert.match(result.text, /## 旧条目\n- 找来源: 旧/)
  assert.match(result.text, /## 机房选型（2026-10-28，对话）\n- 找来源: 机房选型 的找来源/)
  assert.equal((result.text.match(/## 机房选型/g) ?? []).length, 1)
})

test('同名更新保留旧格式正文（legacyText 追加在四行后）', () => {
  const result = upsertMethodEntry('', entry('机房选型', { legacyText: '- 调查要求: 旧正文' }))
  assert.match(result.text, /- 不承诺: 机房选型 的不承诺\n- 调查要求: 旧正文/)
})

test('默认偏好全库唯一：新条目设默认时清掉其它条目的〔默认偏好〕', () => {
  const existing = '## 旧条目（2026-10-27，对话）〔默认偏好〕\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n'
  const result = upsertMethodEntry(existing, entry('新条目'), { defaultAction: 'set' })
  assert.match(result.text, /## 旧条目（2026-10-27，对话）\n/)
  assert.doesNotMatch(result.text, /旧条目[^\n]*〔默认偏好〕/)
  assert.match(result.text, /## 新条目（2026-10-28，对话）〔默认偏好〕/)
})

test('普通内容更新保留目标条目已有的默认标记，忽略 coach 条目携带的默认 flag', () => {
  const existing = '## 机房选型〔默认偏好〕\n- 找来源: 旧来源\n- 怎么核实: 旧核实\n- 报告怎么写: 旧报告\n- 不承诺: 旧不承诺\n'
  const result = upsertMethodEntry(existing, { ...entry('机房选型'), isDefault: false })
  assert.match(result.text, /^## 机房选型（2026-10-28，对话）〔默认偏好〕/m)
  assert.equal((result.text.match(/〔默认偏好〕/g) ?? []).length, 1)
})

test('普通新建忽略 coach 条目携带的默认 flag', () => {
  const result = upsertMethodEntry('', { ...entry('新方法'), isDefault: true })
  assert.doesNotMatch(result.text, /〔默认偏好〕/)
})

test('显式 save-and-set upsert 新建条目并将其设为唯一默认', () => {
  const library = '## 旧条目〔默认偏好〕\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n'
  const result = upsertMethodEntry(library, { ...entry('新条目'), isDefault: false }, { defaultAction: 'set' })
  assert.doesNotMatch(result.text, /## 旧条目〔默认偏好〕/)
  assert.match(result.text, /## 新条目（2026-10-28，对话）〔默认偏好〕/)
  assert.equal((result.text.match(/〔默认偏好〕/g) ?? []).length, 1)
})

test('设默认操作只翻转唯一标记并拒绝重名目标', async () => {
  const { setDefaultMethodEntry } = await import('../../packages/deep-research-pack/src/lib/method-library-write.ts')
  const library = '## 旧条目〔默认偏好〕\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n\n## 目标\n- 找来源: e\n- 怎么核实: f\n- 报告怎么写: g\n- 不承诺: h\n'
  const result = setDefaultMethodEntry(library, '目标')
  assert.match(result.text, /## 旧条目\n/)
  assert.match(result.text, /## 目标〔默认偏好〕\n/)
  assert.equal((result.text.match(/〔默认偏好〕/g) ?? []).length, 1)
  assert.throws(() => setDefaultMethodEntry(`${library}\n## 目标\n- 找来源: x`, '目标'), /重名/)
})

test('普通保存拒绝修补默认标记已重复的库', () => {
  const library = '## 一〔默认偏好〕\n- 找来源: a\n\n## 二〔默认偏好〕\n- 找来源: b\n'
  assert.throws(() => upsertMethodEntry(library, entry('三')), /多个默认偏好/)
})

test('清除默认操作允许库中零个默认标记', async () => {
  const { clearDefaultMethodEntry } = await import('../../packages/deep-research-pack/src/lib/method-library-write.ts')
  const library = '## 一〔默认偏好〕\n- 找来源: a\n\n## 二〔默认偏好〕\n- 找来源: b\n'
  const result = clearDefaultMethodEntry(library)
  assert.doesNotMatch(result.text, /〔默认偏好〕/)
  assert.equal(result.changed, true)
  assert.equal(clearDefaultMethodEntry(result.text).changed, false)
})

test('缺字段 → fail-loud，不写半截条目', () => {
  assert.throws(() => upsertMethodEntry('', { ...entry('残条目'), sections: { source: 'a', verify: null, report: 'c', limit: 'd' } }), /缺字段：怎么核实/)
  assert.throws(() => upsertMethodEntry('', { ...entry(''), sections: entry('x').sections }), /缺名称/)
})

test('追加到有尾部空行/无换行的库也不粘连', () => {
  const result = upsertMethodEntry('## 旧条目\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d', entry('新条目'))
  assert.match(result.text, /- 不承诺: d\n\n## 新条目/)
  assert.equal(foldLibrary(result.text).length, 2)
})

test('remove：重复名称拒绝选择首条', async () => {
  const { removeMethodEntry } = await import('../../packages/deep-research-pack/src/lib/method-library-write.ts')
  const duplicated = '## 重名\n- 找来源: a\n\n## 重名\n- 找来源: b\n'
  assert.throws(() => removeMethodEntry(duplicated, '重名'), /重名/)
})

test('remove：同名整段删除，库头与其它条目保留', async () => {
  const { removeMethodEntry } = await import('../../packages/deep-research-pack/src/lib/method-library-write.ts')
  const library = `# 方法库\n\n## 旧条目\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n\n## 要删的\n- 找来源: 1\n- 怎么核实: 2\n- 报告怎么写: 3\n- 不承诺: 4\n`
  const result = removeMethodEntry(library, '要删的')
  assert.equal(result.removed, true)
  assert.match(result.text, /^# 方法库/)
  assert.match(result.text, /## 旧条目/)
  assert.equal(result.text.includes('要删的'), false)
  assert.equal(removeMethodEntry(result.text, '不存在').removed, false)
})
