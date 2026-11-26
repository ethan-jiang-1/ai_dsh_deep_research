// protocol-fold 回归 — protocol.json 解码与五态读取（ok/absent/unreadable/empty/invalid）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decodeProtocol, readProtocolContract } from '../../../../packages/deep-research-pack/src/lib/run/protocol-fold.ts'

const VALID_PROTOCOL = {
  schema: 1,
  version: 2,
  status: 'approved',
  created: '2026-11-26T00:00:00Z',
  approved_at: '2026-11-26T00:05:00Z',
  method: { id: '方案比较', kind: 'preset', library_name: '方案比较', adjustments: ['增加官方口'] },
  source_scope: { families: ['official', 'academic'], recency: '12m', authority: 'primary', language: ['zh', 'en'] },
  effort: { band: 'deep', nodes_max: 16, cells_max: 12, waves_max: 8 },
  output: { shape: 'full_report', audience: '架构师', sections: ['decision', 'options'], length: { min: 1500, max: 2500, unit: 'words' } },
  gates: { hitl1: 'protocol_projection', hitl2: 'review', evidence_threshold: 'B', critic: 'both', claim_verification: 'on' },
  deviations: [],
}

test('decodeProtocol：合法契约映射全部核心字段；缺少 schema 或 status fail-closed 判 invalid', () => {
  const ok = decodeProtocol(VALID_PROTOCOL)
  assert.equal(ok.ok, true)
  if (ok.ok) {
    assert.equal(ok.value.version, 2)
    assert.equal(ok.value.status, 'approved')
    assert.equal(ok.value.method?.id, '方案比较')
    assert.deepEqual(ok.value.sourceScope?.families, ['official', 'academic'])
    assert.equal(ok.value.effort?.band, 'deep')
    assert.equal(ok.value.output?.audience, '架构师')
    assert.equal(ok.value.gates?.evidenceThreshold, 'B')
  }
  assert.equal(decodeProtocol({ version: 1, status: 'draft' }).ok, false)
  assert.equal(decodeProtocol({ schema: 1 }).ok, false)
  assert.equal(decodeProtocol([]).ok, false)
})

test('readProtocolContract：五态隔离（ok / absent / unreadable / empty / invalid）', async () => {
  const ok = await readProtocolContract({ read: async () => ({ ok: true, value: { text: JSON.stringify(VALID_PROTOCOL) } }) })
  assert.equal(ok.state, 'ok')
  assert.equal(ok.value?.status, 'approved')

  const absent = await readProtocolContract({ read: async () => ({ ok: false, reason: 'missing' }) })
  assert.equal(absent.state, 'absent')
  assert.equal(absent.value, null)

  const unreadable = await readProtocolContract({ read: async () => ({ ok: false, reason: 'unreadable' }) })
  assert.equal(unreadable.state, 'unreadable')
  assert.equal(unreadable.value, null)

  const empty = await readProtocolContract({ read: async () => ({ ok: true, value: { text: '   ' } }) })
  assert.equal(empty.state, 'empty')
  assert.equal(empty.value, null)

  const badJson = await readProtocolContract({ read: async () => ({ ok: true, value: { text: '{broken' } }) })
  assert.equal(badJson.state, 'invalid')
  assert.equal(badJson.value, null)

  const badSchema = await readProtocolContract({ read: async () => ({ ok: true, value: { text: '{"foo":1}' } }) })
  assert.equal(badSchema.state, 'invalid')
  assert.equal(badSchema.value, null)
})
