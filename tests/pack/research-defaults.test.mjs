// research-defaults.test.mjs — 项目研究默认的共享纯函数合同（keyless）。
//
// 判据（issue A1/A2/A3/A5 的地基）：
//   · 缺席 = auto，不是 "auto" sentinel；
//   · parse/merge/unset/serialize 往返不物化默认值；
//   · prompt 段只列已设置字段，并明写「未列出 = 自动，由 Lead 判断」；
//   · 按钮状态区分 auto / 方法默认 / 已设 N 项 / 需检查；
//   · 命令结果 code-like，面板可映射。
//
// 红证：本文件先于实现存在；删掉任一 auto/缺席用例的断言或改回物化默认 → 红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTHORITIES, DEFAULTS_SCHEMA, EFFORT_BANDS, OUTPUT_SHAPES, RECENCIES, SOURCE_FAMILIES,
  countSetAxes, defaultsButtonState, emptyDefaults, findDefaultMethod,
  hasAnyValue, mergeDefaults, parseCommandOutcome, parseDefaults, sanitizePatch,
  serializeDefaults, unsetDefaults,
} from '../../packages/deep-research-pack/src/lib/research-defaults.ts'
import { defaultsContextText } from '../../packages/deep-research-pack/src/defaults/context.ts'
import {
  AUTHORITIES as PROTOCOL_AUTHORITIES,
  OUTPUT_SHAPES as PROTOCOL_OUTPUT_SHAPES,
  SOURCE_FAMILIES as PROTOCOL_SOURCE_FAMILIES,
} from '../../scripts/lib/protocol-core.mjs'

const valid = {
  schema: 1,
  revision: 3,
  updatedAt: '2026-11-12T19:10:00+08:00',
  effort: 'deep',
  output: { shape: 'full_report', audience: '决策层' },
  source: { families: ['official', 'regulatory'], authority: 'primary', recency: '12m' },
}

test('缺席即自动：null / 空串 / {} 都不含值，且 parse 不写 auto sentinel', () => {
  for (const input of [null, undefined, '', '   ', '{}']) {
    const parsed = parseDefaults(input)
    assert.equal(parsed.value.schema, DEFAULTS_SCHEMA)
    assert.equal(parsed.value.revision, 0)
    assert.equal(hasAnyValue(parsed.value), false)
    assert.equal(countSetAxes(parsed.value), 0)
    assert.equal(serializeDefaults(parsed.value).includes('"auto"'), false)
    assert.equal(JSON.stringify(parsed.value).includes('auto'), false)
  }
})

test('serialize(empty) 只写 metadata，不物化任何轴', () => {
  const parsed = JSON.parse(serializeDefaults(emptyDefaults()))
  assert.deepEqual(Object.keys(parsed).sort(), ['revision', 'schema'])
  assert.equal(parsed.schema, 1)
  assert.equal(parsed.revision, 0)
})

test('合法值解析：三轴 + metadata；serialize → parse 往返不增字段', () => {
  const parsed = parseDefaults(JSON.stringify(valid))
  assert.deepEqual(parsed.problems, [])
  assert.equal(parsed.value.effort, 'deep')
  assert.equal(parsed.value.output?.shape, 'full_report')
  assert.equal(parsed.value.output?.audience, '决策层')
  assert.deepEqual(parsed.value.source?.families, ['official', 'regulatory'])
  assert.equal(parsed.value.source?.authority, 'primary')
  assert.equal(parsed.value.source?.recency, '12m')
  assert.equal(hasAnyValue(parsed.value), true)
  assert.equal(countSetAxes(parsed.value), 3)
  const again = parseDefaults(serializeDefaults(parsed.value))
  assert.deepEqual(again.value, parsed.value)
  assert.equal(again.problems.length, 0)
  assert.equal(again.value.revision, 3)
})

test('部分 auto：只有 audience / 只有 authority 也是合法值，不补 shape/families', () => {
  const audienceOnly = parseDefaults(JSON.stringify({ schema: 1, output: { audience: '工程团队' } }))
  assert.deepEqual(audienceOnly.problems, [])
  assert.equal(audienceOnly.value.output?.shape, undefined)
  assert.equal(audienceOnly.value.output?.audience, '工程团队')
  assert.equal(hasAnyValue(audienceOnly.value), true)
  assert.equal(countSetAxes(audienceOnly.value), 1)

  const authorityOnly = parseDefaults(JSON.stringify({ schema: 1, source: { authority: 'any' } }))
  assert.deepEqual(authorityOnly.problems, [])
  assert.equal(authorityOnly.value.source?.families, undefined)
  assert.equal(authorityOnly.value.source?.authority, 'any')
  assert.equal(hasAnyValue(authorityOnly.value), true)
})

test('非法值不静默：effort/shape/family/authority/recency/audience 进 problems 且不入值', () => {
  const parsed = parseDefaults(JSON.stringify({
    schema: 1,
    effort: 'bogus',
    output: { shape: 'novel', audience: 'x'.repeat(201) },
    source: { families: ['official', 'nope', 'official'], authority: 'bogus', recency: 'forever' },
  }))
  const codes = parsed.problems.map((p) => `${p.field}:${p.code}`)
  assert.ok(codes.includes('effort:invalid'))
  assert.ok(codes.includes('output.shape:invalid'))
  assert.ok(codes.includes('output.audience:invalid'))
  assert.ok(codes.includes('source.families:invalid'))
  assert.ok(codes.includes('source.authority:invalid'))
  assert.ok(codes.includes('source.recency:invalid'))
  assert.equal(parsed.value.effort, undefined)
  assert.equal(parsed.value.output, undefined)
  assert.equal(parsed.value.source, undefined)
  assert.equal(hasAnyValue(parsed.value), false)
})

test('禁止字段：method / gates / lens / referenceRoot / language 进 problems（不是偏好）', () => {
  const parsed = parseDefaults(JSON.stringify({
    schema: 1,
    method: 'x',
    gates: {},
    lens: ['official'],
    referenceRoot: '/tmp/kb',
    language: 'zh',
  }))
  const codes = parsed.problems.map((p) => `${p.field}:${p.code}`)
  for (const field of ['method', 'gates', 'lens', 'referenceRoot', 'language']) {
    assert.ok(codes.includes(`${field}:not-allowed`), `缺 ${field}:not-allowed（实际 ${codes.join(',')}）`)
  }
})

test('未知键只 warning；schema 不符 → problem 且不使用其值', () => {
  const unknown = parseDefaults(JSON.stringify({ schema: 1, effort: 'deep', future: true }))
  assert.equal(unknown.problems.length, 0)
  assert.ok(unknown.warnings.some((w) => w.field === 'future'))

  const future = parseDefaults(JSON.stringify({ schema: 2, effort: 'deep' }))
  assert.ok(future.problems.some((p) => p.code === 'schema'))
  assert.equal(future.value.effort, undefined)
  assert.equal(hasAnyValue(future.value), false)
})

test('mergeDefaults：顶层合并；output/source 整体替换；unset 删除键（不写 auto）', () => {
  const base = parseDefaults(JSON.stringify(valid)).value
  const merged = mergeDefaults(base, { effort: 'standard', output: { shape: 'quick_answer' } })
  assert.equal(merged.effort, 'standard')
  assert.equal(merged.output?.shape, 'quick_answer')
  assert.equal(merged.output?.audience, undefined)
  assert.deepEqual(merged.source?.families, ['official', 'regulatory'])

  const noEffort = unsetDefaults(merged, ['effort'])
  assert.equal(noEffort.effort, undefined)
  assert.equal(JSON.stringify(noEffort).includes('auto'), false)
  assert.equal(noEffort.output?.shape, 'quick_answer')
})

test('sanitizePatch：只接受三轴；method/gates/未知键拒绝；audience 去换行并限长', () => {
  const ok = sanitizePatch({ effort: 'deep', output: { shape: 'full_report', audience: ' 决策层\n' }, source: { families: ['official'] } })
  assert.deepEqual(ok.problems, [])
  assert.equal(ok.patch.output?.audience, '决策层')

  for (const patch of [{ method: 'x' }, { gates: {} }, { nope: 1 }, { effort: 'auto' }, { source: { families: [] } }]) {
    const bad = sanitizePatch(patch)
    assert.ok(bad.problems.length > 0, `应拒绝 ${JSON.stringify(patch)}`)
  }
})

test('按钮状态：auto / method / count / invalid', () => {
  assert.equal(defaultsButtonState({ value: emptyDefaults(), methodDefault: null }).kind, 'auto')
  assert.equal(defaultsButtonState({ value: emptyDefaults(), methodDefault: '格局调研' }).kind, 'method')
  const parsed = parseDefaults(JSON.stringify(valid))
  const counted = defaultsButtonState({ value: parsed.value, methodDefault: null })
  assert.equal(counted.kind, 'count')
  assert.equal(counted.count, 3)
  const invalid = defaultsButtonState({ value: parsed.value, methodDefault: null, problems: parsed.problems.concat([{ field: 'effort', code: 'invalid', detail: 'x' }]) })
  assert.equal(invalid.kind, 'invalid')
})

test('prompt 段：无值无方法 → 空串；有方法/值 → 含「未列出 = 自动，由 Lead 判断」；非法 → 忽略行', () => {
  assert.equal(defaultsContextText({ value: emptyDefaults(), methodDefault: null }), '')
  const methodOnly = defaultsContextText({ value: emptyDefaults(), methodDefault: '格局调研' })
  assert.match(methodOnly, /格局调研/)
  assert.match(methodOnly, /未列出的维度.*= 自动/)
  assert.match(methodOnly, /Lead/)

  const withValues = defaultsContextText({ value: parseDefaults(JSON.stringify(valid)).value, methodDefault: null })
  assert.match(withValues, /deep/)
  assert.match(withValues, /full_report/)
  assert.match(withValues, /official/)
  assert.match(withValues, /HITL1 三问仍照发/)

  const withProblems = defaultsContextText({
    value: emptyDefaults(),
    methodDefault: null,
    problems: [{ field: 'effort', code: 'invalid', detail: 'bad' }],
  })
  assert.match(withProblems, /已忽略/)
})

test('findDefaultMethod：从库格式读〔默认偏好〕；无默认 → null；不误读普通条目', () => {
  const lib = [
    '# method-library',
    '## 普通条目（2026-11-01，源自 对话）',
    '- 找来源: a',
    '',
    '## 格局调研（2026-11-02，源自 drt_x）〔默认偏好〕',
    '- 找来源: b',
  ].join('\n')
  assert.equal(findDefaultMethod(lib), '格局调研')
  assert.equal(findDefaultMethod('## 普通条目\n- 找来源: a\n'), null)
  assert.equal(findDefaultMethod(null), null)
})

test('命令结果 code-like：ok/stale/error 可解析；不把 prose 当状态', () => {
  const ok = parseCommandOutcome('ok revision=4 effort=deep')
  assert.equal(ok.ok, true)
  assert.equal(ok.code, undefined)
  assert.equal(ok.revision, 4)
  assert.deepEqual(parseCommandOutcome('error stale revision=5'), { ok: false, code: 'stale', revision: 5 })
  assert.equal(parseCommandOutcome('error invalid field=effort').code, 'invalid')
  assert.equal(parseCommandOutcome('error no-workspace').code, 'no-workspace')
  assert.equal(parseCommandOutcome('weird').ok, false)
})

test('枚举单源：面板六种 = protocol 七种减去 literature_review；families/authorities 对齐', () => {
  assert.deepEqual([...OUTPUT_SHAPES], [...PROTOCOL_OUTPUT_SHAPES].filter((s) => s !== 'literature_review'))
  assert.deepEqual([...SOURCE_FAMILIES], [...PROTOCOL_SOURCE_FAMILIES])
  assert.deepEqual([...AUTHORITIES], [...PROTOCOL_AUTHORITIES])
  assert.deepEqual([...EFFORT_BANDS], ['quick', 'standard', 'deep'])
  assert.deepEqual([...RECENCIES], ['6m', '12m', '24m', 'as-of-capture'])
})

// 负例留证 2026-11-13：BUG-133——output/source 未知子键被静默丢弃，problems 为空。
// 还原法 = normalizeOutput/normalizeSource 的 warnings 传临时 []。
test('BUG-133 sanitizePatch：output/source 未知子键进 problems，不静默丢', () => {
  const output = sanitizePatch({ output: { shape: 'full_report', audiance: 'CFO' } })
  assert.ok(output.problems.some((item) => item.field === 'output.audiance' && item.code === 'unknown'))
  const source = sanitizePatch({ source: { familes: ['official'] } })
  assert.ok(source.problems.some((item) => item.field === 'source.familes' && item.code === 'unknown'))
  assert.deepEqual(sanitizePatch({ output: { shape: 'full_report', audience: 'CFO' } }).problems, [])
})
