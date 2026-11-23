// run-property.spec.mjs — src/lib/run 核心折算纯函数的 fast-check 属性与蜕变测试。
//
// 归属：住 tests/cockpit/lib/run/，只依赖 src/lib/run/* 与 fast-check（遵守 pack-mirror）。
// 覆盖边界：
//   ① deriveSteps：七步定序、unknown 严格不回填不变量（任意后续步在场也不抹成 done/current）、最多一个 current；
//   ② deriveBusinessBrief：全输入 fail-soft、HITL pending 必然 userActionNeeded、目标未确认绝不伪造 goalKnown；
//   ③ finalViewOf / sessionFileOf：至少一方 ok 绝不报错且必选 ok 面、任意路径串不 throw；
//   ④ hasBodyText / questionBodyLineOf：BOM 与 CRLF 蜕变等价性 + 仅标题输入永不算有正文。
//
// 红证：在 deriveSteps 删掉 unknown 优先判断，或在 hasBodyText 去掉 BOM 剥离 → 对应属性即红并给出最小反例。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fc from 'fast-check'
import { deriveSteps } from '../../../../packages/deep-research-pack/src/lib/run/run-fold.ts'
import { deriveBusinessBrief } from '../../../../packages/deep-research-pack/src/lib/run/brief-fold.ts'
import { finalViewOf, sessionFileOf } from '../../../../packages/deep-research-pack/src/lib/run/final-target.ts'
import { hasBodyText, questionBodyLineOf } from '../../../../packages/deep-research-pack/src/lib/run/artifact-content.ts'

const STEP_KEYS = ['question', 'team', 'leads', 'evidence', 'findings', 'review', 'final']
const ARTIFACT_STATES = ['ok', 'absent', 'unreadable', 'empty', 'invalid']

test('PBT: deriveSteps 七步定序、最多一个 current、unknown 严格不回填（无论后续步是否在场）', () => {
  fc.assert(
    fc.property(
      fc.record({
        question: fc.boolean(),
        team: fc.boolean(),
        leads: fc.boolean(),
        evidence: fc.oneof(fc.integer({ min: -5, max: 50 }), fc.constant(NaN), fc.constant(0)),
        findings: fc.boolean(),
        review: fc.boolean(),
        final: fc.boolean(),
        unknown: fc.subarray(STEP_KEYS),
      }),
      (inputs) => {
        const steps = deriveSteps(inputs)
        assert.deepEqual(steps.map((s) => s.key), STEP_KEYS)
        const unknownSet = new Set(inputs.unknown)
        for (const step of steps) {
          if (unknownSet.has(step.key)) {
            assert.equal(step.state, 'unknown', `${step.key} 在 unknown 中，绝不能被后续步抹成 ${step.state}`)
          } else {
            assert.notEqual(step.state, 'unknown')
          }
        }
        const currentIndices = steps.flatMap((s, idx) => (s.state === 'current' ? [idx] : []))
        assert.ok(currentIndices.length <= 1, '至多只有一个 current 步')
        if (currentIndices.length === 1) {
          const cur = currentIndices[0]
          for (let i = 0; i < steps.length; i += 1) {
            if (unknownSet.has(steps[i].key)) continue
            if (i < cur) assert.equal(steps[i].state, 'done')
            else if (i === cur) assert.equal(steps[i].state, 'current')
            else assert.equal(steps[i].state, 'pending')
          }
        }
      },
    ),
    { numRuns: 100 },
  )
})

test('PBT: deriveBusinessBrief fail-soft 永不 throw、无反证目标不伪造、HITL pending 必拉起 userActionNeeded', () => {
  fc.assert(
    fc.property(
      fc.record({
        bundleBound: fc.option(fc.boolean(), { nil: undefined }),
        bundleReadFailure: fc.option(fc.constantFrom('missing', 'unreadable', null), { nil: undefined }),
        questionIssue: fc.option(fc.constantFrom('empty', 'unreadable', 'body-empty', null), { nil: undefined }),
        reviewUnconfirmed: fc.option(fc.boolean(), { nil: undefined }),
        reviewConflict: fc.option(fc.boolean(), { nil: undefined }),
        kickoffHold: fc.option(fc.boolean(), { nil: undefined }),
        hitlPending: fc.option(fc.boolean(), { nil: undefined }),
        pendingKind: fc.option(fc.constantFrom('hitl1', 'hitl2', 'unknown', null), { nil: undefined }),
        pendingQuestions: fc.option(fc.integer({ min: -2, max: 10 }), { nil: undefined }),
        hasQuestion: fc.option(fc.boolean(), { nil: undefined }),
        questionLine: fc.option(fc.string({ maxLength: 80 }), { nil: undefined }),
        currentStage: fc.option(fc.string({ maxLength: 40 }), { nil: undefined }),
        findingsPresent: fc.option(fc.boolean(), { nil: undefined }),
        reviewFail: fc.option(fc.oneof(fc.boolean(), fc.constant(null)), { nil: undefined }),
        delivered: fc.option(fc.boolean(), { nil: undefined }),
        versions: fc.option(fc.integer({ min: -1, max: 10 }), { nil: undefined }),
      }),
      (inputs) => {
        const brief = deriveBusinessBrief(inputs)
        assert.ok(typeof brief.goal === 'string' && brief.goal.length > 0)
        assert.ok(typeof brief.stageLine === 'string' && brief.stageLine.length > 0)
        assert.ok(typeof brief.actionLine === 'string' && brief.actionLine.length > 0)
        if (inputs.hitlPending === true) {
          assert.equal(brief.userActionNeeded, true, 'HITL 挂起时 userActionNeeded 必须为 true')
        }
        const trimmedLine = typeof inputs.questionLine === 'string' ? inputs.questionLine.trim() : ''
        if (inputs.hitlPending !== true && (inputs.bundleBound !== true || inputs.hasQuestion !== true || inputs.questionIssue != null || trimmedLine === '')) {
          assert.equal(brief.goalKnown, false, '非挂起且未绑定/无有效 question 时绝不可伪造 goalKnown')
        }
      },
    ),
    { numRuns: 100 },
  )
})

test('PBT: finalViewOf 只要任一面 ok 绝不报错且选 ok 面 + sessionFileOf 任意串永不 throw', () => {
  fc.assert(
    fc.property(
      fc.constantFrom(...ARTIFACT_STATES),
      fc.constantFrom(...ARTIFACT_STATES),
      fc.constantFrom('reader', 'audit'),
      (body, reader, requested) => {
        const decision = finalViewOf({ body, reader, requested })
        if (body === 'ok' || reader === 'ok') {
          assert.equal(decision.failure, null)
          assert.equal(decision.view === 'reader' ? reader : body, 'ok', 'selected view 必须是 ok')
        } else {
          assert.notEqual(decision.failure, null)
        }
      },
    ),
    { numRuns: 100 },
  )

  fc.assert(
    fc.property(fc.string({ maxLength: 120 }), (address) => {
      const parsed = sessionFileOf(address)
      assert.ok(parsed === null || (typeof parsed.sessionId === 'string' && typeof parsed.path === 'string'))
    }),
    { numRuns: 100 },
  )
})

test('PBT: hasBodyText / questionBodyLineOf 对 BOM 与 CRLF/LF 保持蜕变等价，且纯标题永不算正文', () => {
  const lineArb = fc.oneof(
    fc.constant(''),
    fc.constant('   '),
    fc.stringMatching(/^#{1,4} [a-zA-Z0-9 ]{1,12}$/),
    fc.stringMatching(/^- \s*$/),
    fc.stringMatching(/^[a-zA-Z0-9 ]{3,24}$/),
  )
  fc.assert(
    fc.property(fc.array(lineArb, { minLength: 1, maxLength: 8 }), (lines) => {
      const lf = lines.join('\n')
      const crlf = lines.join('\r\n')
      const bomLf = `\ufeff${lf}`
      assert.equal(hasBodyText(crlf), hasBodyText(lf), 'CRLF 不得改变 hasBodyText 结论')
      assert.equal(hasBodyText(bomLf), hasBodyText(lf), 'UTF-8 BOM 不得改变 hasBodyText 结论')
      assert.equal(questionBodyLineOf(crlf), questionBodyLineOf(lf), 'CRLF 不得改变首行提取')
      assert.equal(questionBodyLineOf(bomLf), questionBodyLineOf(lf), 'UTF-8 BOM 不得改变首行提取')
    }),
    { numRuns: 100 },
  )

  const headingsOnlyArb = fc.array(
    fc.oneof(fc.stringMatching(/^#{1,6} [a-zA-Z0-9 ]{1,12}$/), fc.constant(''), fc.constant('---')),
    { minLength: 1, maxLength: 8 },
  )
  fc.assert(
    fc.property(headingsOnlyArb, (lines) => {
      assert.equal(hasBodyText(lines.join('\n')), false, '纯标题与分隔线不得判定为有正文')
    }),
    { numRuns: 100 },
  )
})
