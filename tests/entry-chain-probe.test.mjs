import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directAuthorizationBoundaryPasses, rfcBoundaryPasses } from '../scripts/lib/direct-authorization-boundary.mjs';

test('direct authorization probe accepts authorized scope without invented prerequisites', () => {
  assert.equal(directAuthorizationBoundaryPasses('用户已授权的局部工作按请求范围执行，无需重复请批。'), true);
  assert.equal(directAuthorizationBoundaryPasses('按用户本轮请求的授权范围直接执行——不需重复请批。'), true);
  assert.equal(directAuthorizationBoundaryPasses('按本轮用户明确授权的范围执行，不需要重复请批。'), true);
  assert.equal(directAuthorizationBoundaryPasses('按本轮请求或仍有效的已有授权范围直接执行（同一授权范围不必重复请批）。'), true);
  assert.equal(directAuthorizationBoundaryPasses('按用户本轮请求的授权范围直接执行，不需重复请批。'), true);
  assert.equal(directAuthorizationBoundaryPasses('按用户本轮请求（或已有明确授权）的范围直接执行——用户直派即当轮授权范围，不需重复请批。'), true);
  assert.equal(directAuthorizationBoundaryPasses('仅在本轮请求或已有明确授权划定的范围内执行，无需重复请批——呈批门只在任务复杂或用户主动要求时使用。'), true);
});

test('RFC probe recognizes the contract without requiring one phrase order', () => {
  assert.equal(rfcBoundaryPasses('RFC 只在某项持久决定需要显式评审时才于 notes/proposed/ 建立，不是实施工作的普遍前置。'), true);
  assert.equal(rfcBoundaryPasses('只有持久决定需要显式评审时，才为该决定建立 RFC；它不是一般实施工作的普遍前置。'), true);
  assert.equal(rfcBoundaryPasses('所有实施都必须先建 RFC。'), false);
  assert.equal(rfcBoundaryPasses('RFC 不是普遍前置。'), false);
});

test('direct authorization probe rejects statements that invent approval prerequisites', () => {
  assert.equal(directAuthorizationBoundaryPasses('用户授权后还必须重复请批并建立 RFC。'), false);
  assert.equal(directAuthorizationBoundaryPasses('所有实施都必须先建 RFC。'), false);
  assert.equal(directAuthorizationBoundaryPasses('有授权就可以开始。'), false);
  assert.equal(directAuthorizationBoundaryPasses('按用户本轮请求的授权范围执行。'), false);
});
