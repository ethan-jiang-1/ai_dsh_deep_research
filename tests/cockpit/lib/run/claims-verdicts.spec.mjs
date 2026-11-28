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

// 负例留证 2026-11-27：BUG-437——readClaimsAndVerdicts 只读根 claims.json/verdicts.json 且 normalizeVerdict
// 不认 partially_supported / unverifiable；规范 bundle（review/claims.json + review/verdicts-r<N>.json）永久不可用。
// 红配方：去掉 review/ 路径或 partially_supported/unverifiable 映射 → 本例红。
test('BUG-437 readClaimsAndVerdicts：优先读规范 review/claims.json + 最新 review/verdicts-r<N>.json，且兼容四值规范裁决', async () => {
  const CANON_CLAIMS = {
    version: 2,
    finalRef: 1,
    claims: [
      { id: 'C1', text: '完全支持', critical: true, topics: ['T1'], evidence: ['evidence/e1.md'], urls: [] },
      { id: 'C2', text: '部分支持', critical: true, topics: ['T1'], evidence: ['evidence/e1.md'], urls: [] },
      { id: 'C3', text: '被反驳', critical: true, topics: ['T1'], evidence: ['evidence/e1.md'], urls: [] },
      { id: 'C4', text: '无法核实', critical: true, topics: ['T1'], evidence: ['evidence/e1.md'], urls: [] },
    ],
  }
  const R1 = {
    version: 1,
    round: 1,
    verdicts: [{ claim_id: 'C1', verdict: 'supported', quote: 'q', reason: 'r', rechecked_urls: [], source_tier_ok: true }],
  }
  const R2 = {
    version: 1,
    round: 2,
    verdicts: [
      { claim_id: 'C1', verdict: 'supported', quote: 'q1', reason: 'r1', rechecked_urls: [], source_tier_ok: true },
      { claim_id: 'C2', verdict: 'partially_supported', quote: 'q2', reason: 'r2', rechecked_urls: [], source_tier_ok: true },
      { claim_id: 'C3', verdict: 'unsupported', quote: 'q3', reason: 'r3', rechecked_urls: [], source_tier_ok: true },
      { claim_id: 'C4', verdict: 'unverifiable', quote: '', reason: '无公开数据', rechecked_urls: [], source_tier_ok: null },
    ],
  }
  const view = {
    list: async (dir) => (dir === 'review'
      ? {
          ok: true,
          value: [
            { name: 'claims.json', type: 'file' },
            { name: 'verdicts-r1.json', type: 'file' },
            { name: 'verdicts-r2.json', type: 'file' },
          ],
        }
      : { ok: false, reason: 'missing' }),
    read: async (name) => {
      if (name === 'review/claims.json') return { ok: true, value: { text: JSON.stringify(CANON_CLAIMS) } }
      if (name === 'review/verdicts-r1.json') return { ok: true, value: { text: JSON.stringify(R1) } }
      if (name === 'review/verdicts-r2.json') return { ok: true, value: { text: JSON.stringify(R2) } }
      return { ok: false, reason: 'missing' }
    },
  }
  const { claims, verdicts } = await readClaimsAndVerdicts(view)
  assert.equal(claims.state, 'ok')
  assert.equal(verdicts.state, 'ok')
  assert.equal(verdicts.value?.round, 2, '多轮裁决必须取最新一轮 verdicts-r2.json')
  const summary = joinClaimsVerdicts(claims, verdicts)
  assert.deepEqual(summary.counts, {
    total: 4,
    supported: 1,
    partial: 1,
    unsupported: 1,
    insufficient: 1,
    unverified: 0,
    critical: 4,
  })

  // 负控1：review/claims.json 损坏时不得静默回退到根 claims.json
  const brokenReviewView = {
    list: async () => ({ ok: false, reason: 'missing' }),
    read: async (name) => {
      if (name === 'review/claims.json') return { ok: true, value: { text: '{broken' } }
      if (name === 'claims.json') return { ok: true, value: { text: JSON.stringify(CLAIMS) } }
      return { ok: false, reason: 'missing' }
    },
  }
  const broken = await readClaimsAndVerdicts(brokenReviewView)
  assert.equal(broken.claims.state, 'invalid', 'review/claims.json 坏掉必须显性判 invalid')

  // 负控2：review/ 目录读取失败时不得静默当 absent
  const unreadableDirView = {
    list: async (dir) => (dir === 'review' ? { ok: false, reason: 'unreadable' } : { ok: false, reason: 'missing' }),
    read: async () => ({ ok: false, reason: 'missing' }),
  }
  const dirErr = await readClaimsAndVerdicts(unreadableDirView)
  assert.equal(dirErr.verdicts.state, 'unreadable')
})

// 负例留证 2026-11-28：BUG-463——readLatestVerdicts 只读最高轮 verdicts-r<N>.json，多批拆文件
// （r1=C1..C5、r2=C6..C10）或增量复审（r2 只覆写部分 claim）时前批裁决被静默丢弃成 UNVERIFIED。
// 红配方：把 readLatestVerdicts 改回只读 rounds[0] → 本例 C1/C2 退回 UNVERIFIED 实红。
test('BUG-463 readClaimsAndVerdicts：按轮次升序合并多个 verdicts-r<N>.json（高轮覆盖同 id，不丢弃前批；坏文件 fail-loud）', async () => {
  const CLAIMS_4 = {
    version: 2,
    finalRef: 1,
    claims: [
      { id: 'C1', text: '主张 1', critical: true, topics: ['T1'], evidence: ['evidence/e1.md'], urls: [] },
      { id: 'C2', text: '主张 2', critical: true, topics: ['T1'], evidence: ['evidence/e1.md'], urls: [] },
      { id: 'C3', text: '主张 3', critical: true, topics: ['T2'], evidence: ['evidence/e2.md'], urls: [] },
      { id: 'C4', text: '主张 4', critical: true, topics: ['T2'], evidence: ['evidence/e2.md'], urls: [] },
    ],
  }
  const R1 = {
    version: 1,
    round: 1,
    verdicts: [
      { claim_id: 'C1', verdict: 'supported', quote: 'q1', reason: 'r1', rechecked_urls: [], source_tier_ok: true },
      { claim_id: 'C2', verdict: 'partially_supported', quote: 'q2-old', reason: 'r2-old', rechecked_urls: [], source_tier_ok: true },
    ],
  }
  const R2 = {
    version: 1,
    round: 2,
    verdicts: [
      { claim_id: 'C2', verdict: 'supported', quote: 'q2-new', reason: 'r2-new', rechecked_urls: [], source_tier_ok: true },
      { claim_id: 'C3', verdict: 'supported', quote: 'q3', reason: 'r3', rechecked_urls: [], source_tier_ok: true },
      { claim_id: 'C4', verdict: 'partially_supported', quote: 'q4', reason: 'r4', rechecked_urls: [], source_tier_ok: true },
    ],
  }
  const view = {
    list: async (dir) => (dir === 'review'
      ? {
          ok: true,
          value: [
            { name: 'claims.json', type: 'file' },
            { name: 'verdicts-r2.json', type: 'file' },
            { name: 'verdicts-r1.json', type: 'file' },
          ],
        }
      : { ok: false, reason: 'missing' }),
    read: async (name) => {
      if (name === 'review/claims.json') return { ok: true, value: { text: JSON.stringify(CLAIMS_4) } }
      if (name === 'review/verdicts-r1.json') return { ok: true, value: { text: JSON.stringify(R1) } }
      if (name === 'review/verdicts-r2.json') return { ok: true, value: { text: JSON.stringify(R2) } }
      return { ok: false, reason: 'missing' }
    },
  }
  const { claims, verdicts } = await readClaimsAndVerdicts(view)
  assert.equal(claims.state, 'ok')
  assert.equal(verdicts.state, 'ok')
  assert.equal(verdicts.value?.round, 2)
  const summary = joinClaimsVerdicts(claims, verdicts)
  assert.deepEqual(
    summary.rows.map((r) => [r.claimId, r.status, r.quote]),
    [
      ['C1', 'supported', 'q1'],
      ['C2', 'supported', 'q2-new'],
      ['C3', 'supported', 'q3'],
      ['C4', 'partial', 'q4'],
    ],
    'r1 独有 C1 保留；r2 重审 C2 覆盖 r1；r2 独有 C3/C4 保留',
  )
  assert.equal(summary.counts.unverified, 0)

  // 邻接变体：无 view.list 时同样按 r1 → r2 合并，不丢前批
  const noListView = { read: view.read }
  const mergedNoList = await readClaimsAndVerdicts(noListView)
  assert.equal(mergedNoList.verdicts.state, 'ok')
  assert.equal(joinClaimsVerdicts(mergedNoList.claims, mergedNoList.verdicts).counts.unverified, 0)

  // 负控：多轮文件中任一份损坏或不可读必须 fail-loud，不得静默忽略
  const brokenEarlierView = {
    list: view.list,
    read: async (name) => {
      if (name === 'review/claims.json') return { ok: true, value: { text: JSON.stringify(CLAIMS_4) } }
      if (name === 'review/verdicts-r1.json') return { ok: true, value: { text: '{broken' } }
      if (name === 'review/verdicts-r2.json') return { ok: true, value: { text: JSON.stringify(R2) } }
      return { ok: false, reason: 'missing' }
    },
  }
  const brokenRes = await readClaimsAndVerdicts(brokenEarlierView)
  assert.equal(brokenRes.verdicts.state, 'invalid', '早期 verdicts 文件损坏必须显性判 invalid')
})
