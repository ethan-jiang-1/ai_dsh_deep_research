// claims-verdicts 回归 — claims.json + verdicts.json 解码与 UNVERIFIED 语义（ok/absent/unreadable/empty/invalid）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { joinClaimsVerdicts, readClaimsAndVerdicts } from '../../../../packages/deep-research-pack/src/lib/run/claims-verdicts.ts'

const CLAIMS = {
  version: 2,
  finalRef: 1,
  claims: [
    { id: 'C1', text: '延迟降低 40%', critical: true, topics: ['T1'], evidence: ['evidence/e1.md'], urls: ['https://a.test'] },
    { id: 'C2', text: '未经核实的主张', critical: false, topics: ['T2'], evidence: ['evidence/e2.md'], urls: [] },
  ],
}

const VERDICTS = {
  version: 1,
  round: 1,
  verdicts: [
    { claim_id: 'C1', verdict: 'supported', quote: 'latency -40%', reason: '一致', rechecked_urls: ['https://a.test'], source_tier_ok: true },
  ],
}

test('readClaimsAndVerdicts + joinClaimsVerdicts：精确连接 verdict 并把缺失 verdict 标为 UNVERIFIED', async () => {
  const view = {
    read: async (name) => {
      if (name === 'claims.json') return { ok: true, value: { text: JSON.stringify(CLAIMS) } }
      if (name === 'verdicts.json') return { ok: true, value: { text: JSON.stringify(VERDICTS) } }
      return { ok: false, reason: 'missing' }
    },
  }
  const { claims, verdicts } = await readClaimsAndVerdicts(view)
  assert.equal(claims.state, 'ok')
  assert.equal(verdicts.state, 'ok')
  const summary = joinClaimsVerdicts(claims, verdicts)
  assert.equal(summary.counts.total, 2)
  assert.equal(summary.counts.supported, 1)
  assert.equal(summary.counts.unverified, 1)
  assert.equal(summary.counts.critical, 1)
  assert.equal(summary.rows[0]?.status, 'supported')
  assert.equal(summary.rows[1]?.status, 'UNVERIFIED')
})

test('readClaimsAndVerdicts：五态降级（absent / empty / unreadable / invalid）不伪造', async () => {
  for (const [outcome, expected] of [
    [{ ok: false, reason: 'missing' }, 'absent'],
    [{ ok: false, reason: 'unreadable' }, 'unreadable'],
    [{ ok: true, value: { text: ' ' } }, 'empty'],
    [{ ok: true, value: { text: '{broken' } }, 'invalid'],
    [{ ok: true, value: { text: '{"claims":"not-array"}' } }, 'invalid'],
  ]) {
    const res = await readClaimsAndVerdicts({ read: async () => outcome })
    assert.equal(res.claims.state, expected)
    assert.equal(res.verdicts.state, expected)
    const summary = joinClaimsVerdicts(res.claims, res.verdicts)
    assert.equal(summary.claimsState, expected)
    assert.equal(summary.counts.total, 0)
  }
})
