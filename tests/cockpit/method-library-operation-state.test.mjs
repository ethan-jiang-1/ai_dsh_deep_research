// Method Library operation snapshots describe desired effects independently of the Markdown writer.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  expectedMethodLibrarySnapshot,
  methodLibraryMatchesSnapshot,
  methodLibrarySettlement,
  shouldStartFreshDraftContext,
} from '../../packages/deep-research-pack/src/lib/method-library-operation-state.ts'

const existing = '## Old〔默认偏好〕\n- 找来源: old source\n- 怎么核实: old verify\n- 报告怎么写: old report\n- 不承诺: old limit\n'
const entry = '## New\n- 找来源: new source\n- 怎么核实: new verify\n- 报告怎么写: new report\n- 不承诺: new limit'

test('ordinary save-as preserves the old default and leaves the new entry non-default', () => {
  const expected = expectedMethodLibrarySnapshot({ before: existing, action: 'save', name: 'New', entryText: entry })
  assert.ok(expected)
  assert.deepEqual(expected.map(({ name, isDefault }) => ({ name, isDefault })), [
    { name: 'Old', isDefault: true },
    { name: 'New', isDefault: false },
  ])
  assert.equal(methodLibraryMatchesSnapshot(`${existing}\n${entry}\n`, expected), true)
})

test('save-and-set-default selects the new entry and clears every earlier marker', () => {
  const expected = expectedMethodLibrarySnapshot({ before: existing, action: 'save-and-set-default', name: 'New', entryText: entry })
  assert.ok(expected)
  assert.deepEqual(expected.filter(({ isDefault }) => isDefault).map(({ name }) => name), ['New'])
})

test('clear-default and removal can leave a library with no default', () => {
  const cleared = expectedMethodLibrarySnapshot({ before: existing, action: 'clear-default' })
  assert.ok(cleared)
  assert.deepEqual(cleared.filter(({ isDefault }) => isDefault), [])
  const removed = expectedMethodLibrarySnapshot({ before: existing, action: 'remove', name: 'Old' })
  assert.ok(removed)
  assert.deepEqual(removed, [])
})

test('ordinary content edits preserve a default while save-as retains the original entry', () => {
  const sameTarget = expectedMethodLibrarySnapshot({ before: existing, action: 'save', name: 'Old', entryText: entry.replace('New', 'Old') })
  assert.ok(sameTarget)
  assert.equal(sameTarget[0]?.isDefault, true)
  const saveAs = expectedMethodLibrarySnapshot({ before: existing, action: 'save', name: 'New', entryText: entry })
  assert.ok(saveAs)
  assert.equal(saveAs[0]?.name, 'Old')
  assert.equal(saveAs[0]?.isDefault, true)
  assert.equal(saveAs[1]?.name, 'New')
  assert.equal(saveAs[1]?.isDefault, false)
})

test('only a matching successful tool result settles an operation', () => {
  assert.equal(methodLibrarySettlement({ outcome: 'tool-success', targetReached: true, unchanged: false, metadataMatches: true, callIdObserved: true }), 'verified')
  assert.equal(methodLibrarySettlement({ outcome: 'tool-success', targetReached: true, unchanged: false, metadataMatches: false, callIdObserved: true }), 'unknown')
  assert.equal(methodLibrarySettlement({ outcome: 'tool-success', targetReached: false, unchanged: false, metadataMatches: true, callIdObserved: true }), 'unknown')
  assert.equal(methodLibrarySettlement({ outcome: 'tool-success', targetReached: true, unchanged: false, metadataMatches: true, callIdObserved: false }), 'unknown')
})

test('tool errors reject only when the file stayed unchanged', () => {
  assert.equal(methodLibrarySettlement({ outcome: 'tool-error', targetReached: false, unchanged: true, metadataMatches: false, callIdObserved: true }), 'rejected')
  assert.equal(methodLibrarySettlement({ outcome: 'tool-error', targetReached: true, unchanged: false, metadataMatches: false, callIdObserved: true }), 'unknown')
  assert.equal(methodLibrarySettlement({ outcome: 'tool-error', targetReached: false, unchanged: true, metadataMatches: false, callIdObserved: false }), 'unknown')
})

test('turn end rejects only when no tool call was observed and the file is unchanged', () => {
  assert.equal(methodLibrarySettlement({ outcome: 'turn-end', targetReached: false, unchanged: true, metadataMatches: false, callIdObserved: false }), 'rejected')
  assert.equal(methodLibrarySettlement({ outcome: 'turn-end', targetReached: true, unchanged: false, metadataMatches: false, callIdObserved: false }), 'unknown')
  assert.equal(methodLibrarySettlement({ outcome: 'turn-end', targetReached: false, unchanged: true, metadataMatches: false, callIdObserved: true }), 'unknown')
})

test('manual refresh preserves unknown lock regardless of current target state', () => {
  assert.equal(methodLibrarySettlement({ outcome: 'refresh', targetReached: true, unchanged: false, metadataMatches: true, callIdObserved: true }), 'unknown')
  assert.equal(methodLibrarySettlement({ outcome: 'refresh', targetReached: false, unchanged: true, metadataMatches: false, callIdObserved: false }), 'unknown')
})

test('a resumed queued operation reuses its read-mode context', () => {
  assert.equal(shouldStartFreshDraftContext({ mode: 'read', draftKey: null, resume: false }), true)
  assert.equal(shouldStartFreshDraftContext({ mode: 'read', draftKey: 'draft-1', resume: false }), true)
  assert.equal(shouldStartFreshDraftContext({ mode: 'read', draftKey: 'draft-1', resume: true }), false)
  assert.equal(shouldStartFreshDraftContext({ mode: 'edit', draftKey: 'draft-1', resume: false }), false)
  assert.equal(shouldStartFreshDraftContext({ mode: 'new', draftKey: null, resume: false }), true)
})

test('ambiguous targets do not produce an expected success state', () => {
  assert.equal(expectedMethodLibrarySnapshot({
    before: `${existing}\n${existing.replace('Old', 'Old')}`,
    action: 'remove',
    name: 'Old',
  }), null)
})
