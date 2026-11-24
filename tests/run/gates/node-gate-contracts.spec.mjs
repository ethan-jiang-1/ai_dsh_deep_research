// node-gate-contracts 回归 — D28 契约纪元：run.md 的 contract 优先于 mtime；旧场才回退交付日。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { contractEpochOf } from '../../../checks/lib/gates/schema-scan-core.mjs'
import { isPreContract } from '../../../checks/lib/shared/node-gate-contracts.mjs'

const make = () => {
  const base = realpathSync(tmpdir())
  const dir = mkdtempSync(join(base, 'dsh-contract-'))
  return { dir, cleanup: () => {
    if (dirname(dir) !== base || !basename(dir).startsWith('dsh-contract-')) throw new Error(`refusing cleanup: ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  } }
}

test('run.md 的 contract 优先于 mtime：新契约不被旧契约日判成 PRE-CONTRACT', () => {
  const { dir, cleanup } = make()
  try {
    writeFileSync(join(dir, 'run.md'), '# Run\n\n- contract: 2026-10-23\n- phase: briefing\n- next: HITL1\n')
    assert.equal(contractEpochOf(dir), '2026-10-23')
    assert.equal(isPreContract(dir, null, '2026-10-01'), false)
    assert.equal(isPreContract(dir, null, '2026-11-01'), true)
  } finally { cleanup() }
})

test('无 run.md：contractEpochOf 返回 null，断代回退交付日（无日期可断 = 从严 false）', () => {
  const { dir, cleanup } = make()
  try {
    assert.equal(contractEpochOf(dir), null)
    assert.equal(isPreContract(dir, null, '2026-10-01'), false)
  } finally { cleanup() }
})

test('run.md 在场但 contract 非法：返回空串，视为新契约交给门禁判红，不静默回退 mtime', () => {
  const { dir, cleanup } = make()
  try {
    writeFileSync(join(dir, 'run.md'), '# Run\n\n- contract: 2026/10/23\n')
    assert.equal(contractEpochOf(dir), '')
    assert.equal(isPreContract(dir, null, '2026-10-01'), false)
  } finally { cleanup() }
})

// 负例留证 2026-11-24：BUG-430——findings / topics / plan 三门没有契约纪元豁免，今天的新规则被
// 追溯适用到全部历史 bundle（同族 leads/version/heading/delivery/reader 都有）。红配方：删掉
// 三门的 isPreContract 分支（回到「一律按现行规则判」）。
test('BUG-430：findings / topics / plan 对契约前交付的 bundle 给 PRE-CONTRACT 而非 RED', async () => {
  const { findingsGate, topicsGate } = await import('../../../checks/lib/gates/node-gate-run-gates.mjs')
  const { planGate } = await import('../../../checks/lib/gates/plan-gate.mjs')
  const { FINDINGS_CONTRACT_DATE, TOPICS_CONTRACT_DATE, PLAN_CONTRACT_DATE } = await import('../../../checks/lib/shared/node-gate-contracts.mjs')
  assert.equal(FINDINGS_CONTRACT_DATE, '2026-11-18')
  assert.equal(TOPICS_CONTRACT_DATE, '2026-11-18')
  assert.equal(PLAN_CONTRACT_DATE, '2026-11-18')
  const dir = mkdtempSync(join(tmpdir(), 'epoch-430-'))
  try {
    // 契约前 bundle：无 schema、run.md epoch 早于契约日；内容按旧形态写（今天的判据会 RED）。
    writeFileSync(join(dir, 'run.md'), '- contract: 2026-10-01\n- phase: accepted\n')
    writeFileSync(join(dir, 'findings.md'), '# Findings\n\n- F1 | 一行式旧形态\n')
    writeFileSync(join(dir, 'topics.md'), '# Topics\n\n## T1: 旧形态\n\n短题面\n')
    writeFileSync(join(dir, 'plan.md'), '# Plan\n\n> 图版本：v1\n\n## 剩余工作\n\n- 无\n')
    for (const [label, gate] of [
      ['findings', () => findingsGate(dir)],
      ['topics', () => topicsGate(dir)],
      ['plan', () => planGate(dir)],
    ]) {
      const result = gate()
      assert.equal(result.status, 'PRE-CONTRACT', `${label} 对契约前 bundle 应 PRE-CONTRACT（实际 ${result.status}：${result.detail}）`)
      assert.match(result.detail, /契约前/)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
