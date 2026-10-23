// node-gate-contracts 回归 — D28 契约纪元：run.md 的 contract 优先于 mtime；旧场才回退交付日。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { contractEpochOf } from '../../scripts/lib/schema-scan-core.mjs'
import { isPreContract } from '../../scripts/lib/node-gate-contracts.mjs'

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
