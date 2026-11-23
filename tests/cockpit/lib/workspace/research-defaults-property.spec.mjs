// research-defaults-property.spec.mjs — research-defaults parseDefaults 的 fast-check 属性测试。
//
// 归属：住 tests/cockpit/lib/workspace/，只依赖 src/lib/workspace/research-defaults 与 fast-check。
// 覆盖边界：任意畸形文本不 throw、合法字段往返无 problems、非法枚举 fail-loud 出 problem、未知键保留 warnings。
//
// 红证：在 research-defaults 放行未知 effort 枚举而不写 problem → 属性红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fc from 'fast-check'
import { parseDefaults } from '../../../../packages/deep-research-pack/src/lib/workspace/research-defaults.ts'

test('PBT: parseDefaults 合法组合零 problem，非法枚举必报 problem，未知键必进 warnings', () => {
  const validConfigArb = fc.record({
    schema: fc.constant(1),
    revision: fc.integer({ min: 0, max: 100 }),
    effort: fc.option(fc.constantFrom('quick', 'standard', 'deep'), { nil: undefined }),
    output: fc.option(
      fc.record({
        shape: fc.option(
          fc.constantFrom('quick_answer', 'full_report', 'one_page_memo', 'comparison_table', 'timeline', 'landscape_map'),
          { nil: undefined },
        ),
        audience: fc.option(fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5]{1,12}$/), { nil: undefined }),
      }),
      { nil: undefined },
    ),
    source: fc.option(
      fc.record({
        families: fc.option(fc.uniqueArray(fc.constantFrom('official', 'web', 'academic', 'regulatory', 'practitioner', 'local'), { minLength: 1, maxLength: 4 }), { nil: undefined }),
        authority: fc.option(fc.constantFrom('primary', 'secondary', 'any'), { nil: undefined }),
        recency: fc.option(fc.constantFrom('6m', '12m', '24m', 'as-of-capture'), { nil: undefined }),
      }),
      { nil: undefined },
    ),
  })

  fc.assert(
    fc.property(validConfigArb, (cfg) => {
      const clean = JSON.parse(JSON.stringify(cfg))
      const res = parseDefaults(JSON.stringify(clean))
      assert.deepEqual(res.problems, [])
      assert.equal(res.value.revision, cfg.revision)
      if (cfg.effort !== undefined) assert.equal(res.value.effort, cfg.effort)
    }),
    { numRuns: 100 },
  )

  fc.assert(
    fc.property(
      fc.stringMatching(/^[a-z]{3,10}$/).filter((s) => !['quick', 'standard', 'deep'].includes(s)),
      fc.stringMatching(/^extra_[a-z]{2,8}$/),
      (badEffort, unknownKey) => {
        const res = parseDefaults(JSON.stringify({ schema: 1, effort: badEffort, [unknownKey]: true }))
        assert.ok(res.problems.some((p) => p.field === 'effort'), `非法 effort=${badEffort} 必须报错`)
        assert.ok(res.warnings.some((w) => w.field === unknownKey && w.code === 'unknown'), `未知键 ${unknownKey} 必须显性进 warnings`)
      },
    ),
    { numRuns: 100 },
  )

  fc.assert(
    fc.property(fc.string({ maxLength: 160 }), (arbitraryText) => {
      const res = parseDefaults(arbitraryText)
      assert.ok(Array.isArray(res.problems))
      assert.ok(Array.isArray(res.warnings))
    }),
    { numRuns: 100 },
  )
})
