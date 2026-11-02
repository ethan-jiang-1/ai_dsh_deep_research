// method-library-model.test.mjs — 方法库纯模型的判据（2026-11-03 P4 拆分）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  builtinLibraryEntry, draftOf, emptySections, expectedDefaults, filterLibraryEntries, operationMetadataMatches,
} from '../../packages/deep-research-pack/src/client/method-library/model.ts';

const snapshot = (entries) => entries;
const op = (over = {}) => ({
  operationId: 'op-1',
  sourceSessionId: 's1',
  requestId: 'r1',
  turn: null,
  action: 'save',
  name: '找来源',
  expected: snapshot([{ name: '找来源', isDefault: false }, { name: '核实', isDefault: true }]),
  priorText: null,
  timeout: 0,
  ...over,
});

test('expectedDefaults：只收 isDefault 的名字', () => {
  assert.deepEqual(expectedDefaults(op()), ['核实']);
});

test('operationMetadataMatches：正常 save 通过；operationId/默认集合/字段不符即假', () => {
  const meta = { operationId: 'op-1', defaults: ['核实'], name: '找来源', action: 'updated', isDefault: false };
  assert.equal(operationMetadataMatches(op(), meta), true);
  assert.equal(operationMetadataMatches(op(), { ...meta, operationId: 'other' }), false);
  assert.equal(operationMetadataMatches(op(), { ...meta, defaults: [] }), false);
  assert.equal(operationMetadataMatches(op(), { ...meta, name: '别的' }), false);
  assert.equal(operationMetadataMatches(op(), { ...meta, action: 'removed' }), false);
  assert.equal(operationMetadataMatches(op(), null), false);
});

test('operationMetadataMatches：remove / clear-default / set-default 的专属形状', () => {
  const removed = op({ action: 'remove' });
  assert.equal(operationMetadataMatches(removed, { operationId: 'op-1', defaults: ['核实'], name: '找来源', removed: true }), true);
  assert.equal(operationMetadataMatches(removed, { operationId: 'op-1', defaults: ['核实'], name: '找来源', removed: 'yes' }), false);

  const cleared = op({ action: 'clear-default', name: undefined, expected: snapshot([{ name: '找来源', isDefault: false }, { name: '核实', isDefault: false }]) });
  assert.equal(operationMetadataMatches(cleared, { operationId: 'op-1', defaults: [], action: 'clear' }), true);

  const set = op({ action: 'set-default', name: '核实' });
  assert.equal(operationMetadataMatches(set, { operationId: 'op-1', defaults: ['核实'], action: 'set', name: '核实' }), true);
});

test('draftOf / builtinLibraryEntry / emptySections：形状投影', () => {
  const entry = { name: '找来源', provenance: '我的库', sections: { source: 'a', verify: null, report: null, limit: null }, legacyText: null, isDefault: true };
  const draft = draftOf(entry);
  assert.equal(draft.name, entry.name);
  assert.equal(draft.currentName, entry.name);
  assert.equal(draft.provenance, '我的库');
  assert.equal(draft.legacyText, null);

  const builtin = builtinLibraryEntry({ name: '内置', sections: { source: 's', verify: null, report: null, limit: null } });
  assert.equal(builtin.provenance, '内置只读');
  assert.equal(builtin.isDefault, false);

  assert.deepEqual(emptySections(), { source: null, verify: null, report: null, limit: null });
});

test('filterLibraryEntries：空查询全量；名字与摘要大小写不敏感', () => {
  const entries = [
    { name: '找来源', sections: { source: '官方文档优先', verify: null, report: null, limit: null } },
    { name: 'Fact Check', sections: { source: 'Primary sources', verify: null, report: null, limit: null } },
  ];
  assert.equal(filterLibraryEntries(entries, '').length, 2);
  assert.equal(filterLibraryEntries(entries, '来源')[0].name, '找来源');
  assert.equal(filterLibraryEntries(entries, 'fact')[0].name, 'Fact Check');
  assert.equal(filterLibraryEntries(entries, 'primary')[0].name, 'Fact Check');
  assert.deepEqual(filterLibraryEntries(entries, 'missing'), []);
});
