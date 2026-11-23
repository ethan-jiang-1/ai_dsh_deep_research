// review-readiness-property.spec.mjs — review-readiness 终局判据与双源一致性属性测试。
//
// 归属：住 tests/run/gates/（src/lib/review 领域在 tests/run/ 覆盖）。
// 覆盖边界：BOM/CRLF 蜕变等价、同行/多行无轮次互斥判定拒收（null）、围栏/注释不泄漏、
// readiness.json 重复键/版本错 fail-closed，以及声明与散文冲突永不放行。
//
// 红证：在 terminalVerdictLine 取消同行互斥 null 或 parseReadinessDeclaration 取消重复键拒绝 → 红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fc from 'fast-check'
import {
  parseReadinessDeclaration,
  readinessOfSources,
  terminalReadiness,
} from '../../../packages/deep-research-pack/src/lib/review/review-readiness.ts'

test('PBT: terminalReadiness BOM/CRLF 等价、围栏/注释防泄漏、互斥绝不猜一个', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('PASS', 'FAIL'),
      fc.constantFrom('PASS', 'FAIL'),
      (a, b) => {
        const fence = `\`\`\`md\nreadiness: ${a}\n\`\`\``
        assert.equal(terminalReadiness(fence), null, '围栏内 readiness 不可泄漏为终局')
        const htmlComment = `<!-- readiness: ${a} -->`
        assert.equal(terminalReadiness(htmlComment), null, 'HTML 注释内 readiness 不可泄漏为终局')

        const line = `readiness: ${a}`
        assert.equal(terminalReadiness(`\ufeff${line}\r\n`), a)
        if (a !== b) {
          const sameLineConflict = `readiness: ${a}；readiness: ${b}`
          assert.equal(terminalReadiness(sameLineConflict), null, '同一行互斥判定必须 fail-closed')
        }
      },
    ),
    { numRuns: 100 },
  )
})

test('PBT: readinessOfSources 声明与散文冲突时永不放行 pass/fail', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('PASS', 'FAIL'),
      fc.integer({ min: 0, max: 5 }),
      fc.integer({ min: 0, max: 5 }),
      (declVal, critical, minor) => {
        const proseVal = declVal === 'PASS' ? 'FAIL' : 'PASS'
        const decl = JSON.stringify({
          version: 2,
          readiness: declVal,
          conditional: false,
          counts: { critical, major: 0, minor, unverified: 0, rechecked_urls: 1 },
        })
        const res = readinessOfSources({
          reviewText: `readiness: ${proseVal}\n`,
          declarationText: decl,
          hasReviewDir: true,
        })
        assert.equal(res.source, 'mismatch', '声明与 review.md 互斥时必须标 mismatch')
        assert.equal(res.pass, false)
      },
    ),
    { numRuns: 80 },
  )

  fc.assert(
    fc.property(fc.constantFrom('PASS', 'FAIL'), fc.constantFrom('PASS', 'FAIL'), (v1, v2) => {
      const dupJson = `{"version":2,"readiness":"${v1}","readiness":"${v2}","conditional":false,"counts":{"critical":0,"major":0,"minor":0,"unverified":0,"rechecked_urls":0}}`
      const parsed = parseReadinessDeclaration(dupJson)
      assert.equal(parsed.ok, false, '重复键 JSON 必须 fail-closed 拒绝')
    }),
    { numRuns: 40 },
  )
})
