// Method Library workspace reads are complete only when the final page reaches EOF.
import test from 'node:test'
import assert from 'node:assert/strict'
import { joinMethodLibraryPages } from '../../packages/deep-research-pack/src/lib/method-library-read.ts'
import { methodLibraryEntryHash } from '../../packages/deep-research-pack/src/lib/method-library-hash.ts'
import { isCompletedMethodSourceRun, latestFinalVersion } from '../../packages/deep-research-pack/src/lib/method-library-source.ts'

test('joins paged Workspace reads without losing line separators', () => {
  assert.equal(joinMethodLibraryPages([
    { text: '## 方法一\n- 找来源: 页面一', lines: 2, eof: false },
    { text: '- 怎么核实: 页面二\n- 不承诺: 页面三', lines: 2, eof: true },
  ]), '## 方法一\n- 找来源: 页面一\n- 怎么核实: 页面二\n- 不承诺: 页面三')
})

test('incomplete or malformed pages cannot be mistaken for a full library', () => {
  assert.equal(joinMethodLibraryPages([{ text: 'partial', lines: 1, eof: false }]), null)
  assert.equal(joinMethodLibraryPages([{ text: '', lines: 0, eof: false }]), null)
  assert.equal(joinMethodLibraryPages([{ text: '', lines: 0, eof: true }]), '')
})

test('source version selection uses the highest numeric immutable final', () => {
  assert.equal(latestFinalVersion([{ name: 'v2.md' }, { name: 'v10.md' }, { name: 'final.md' }, { name: 'v0.md' }]), 'v10.md')
  assert.equal(latestFinalVersion([{ name: 'final.md' }]), null)
})

test('completed run source requires a readable question, final version, and accepted receipt', () => {
  const base = {
    hasFinalVersion: true,
    hasDeliverableContent: true,
    runHeader: { kind: 'ok', text: 'phase: accepted', eof: true },
    hasDeliveredRecord: true,
    hasLegacyAcceptance: false,
    question: { kind: 'ok', text: '# Research\nHITL2: approve' },
  }
  assert.equal(isCompletedMethodSourceRun(base), true)
  assert.equal(isCompletedMethodSourceRun({ ...base, hasFinalVersion: false }), false)
  assert.equal(isCompletedMethodSourceRun({ ...base, hasDeliverableContent: false }), false)
  assert.equal(isCompletedMethodSourceRun({ ...base, question: { kind: 'error', detail: 'read failed' } }), false)
  assert.equal(isCompletedMethodSourceRun({ ...base, question: { kind: 'ok', text: '   ' } }), false)
  assert.equal(isCompletedMethodSourceRun({ ...base, hasDeliveredRecord: false }), false)
  assert.equal(isCompletedMethodSourceRun({ ...base, runHeader: { kind: 'absent' }, hasLegacyAcceptance: true }), true)
  assert.equal(isCompletedMethodSourceRun({ ...base, runHeader: { kind: 'absent' }, hasLegacyAcceptance: false }), false)
})

test('entry hashes match the standard SHA-256 digest and change with content', async () => {
  assert.equal(await methodLibraryEntryHash('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  assert.notEqual(await methodLibraryEntryHash('abc'), await methodLibraryEntryHash('abd'))
})
