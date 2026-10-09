import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directAuthorizationBoundaryPasses } from '../scripts/lib/direct-authorization-boundary.mjs';

test('direct authorization probe accepts explicit optional-queue and RFC boundary', () => {
  assert.equal(directAuthorizationBoundaryPasses('用户已授权的局部工作不必先排队，也无需建立 RFC。'), true);
  assert.equal(directAuthorizationBoundaryPasses('已授权的工作不要求先入队，也不需要先建 RFC。'), true);
});

test('direct authorization probe rejects statements that negate the no-queue rule', () => {
  assert.equal(directAuthorizationBoundaryPasses('并非不必排队，必须先排队并建立 RFC。'), false);
  assert.equal(directAuthorizationBoundaryPasses('用户直派不必排队，但必须先建立 RFC。'), false);
  assert.equal(directAuthorizationBoundaryPasses('有授权就可以开始。'), false);
});
