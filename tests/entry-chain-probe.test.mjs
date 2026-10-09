import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directAuthorizationBoundaryPasses } from '../scripts/lib/direct-authorization-boundary.mjs';

test('direct authorization probe accepts authorized scope without invented prerequisites', () => {
  assert.equal(directAuthorizationBoundaryPasses('用户已授权的局部工作按请求范围执行，无需重复请批。'), true);
  assert.equal(directAuthorizationBoundaryPasses('已授权工作可以开始，无需额外授权。'), true);
});

test('direct authorization probe rejects statements that invent approval prerequisites', () => {
  assert.equal(directAuthorizationBoundaryPasses('用户授权后还必须重复请批并建立 RFC。'), false);
  assert.equal(directAuthorizationBoundaryPasses('所有实施都必须先建 RFC。'), false);
  assert.equal(directAuthorizationBoundaryPasses('有授权就可以开始。'), false);
});
