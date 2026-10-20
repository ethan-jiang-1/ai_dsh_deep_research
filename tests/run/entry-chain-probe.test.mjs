// entry-chain-probe 词面判据回归 — direct-authorization-boundary 的授权边界判定（按授权范围
// 直接执行 / 需请批分界）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directAuthorizationBoundaryPasses, rfcBoundaryPasses } from '../../scripts/lib/direct-authorization-boundary.mjs';

test('direct authorization probe accepts authorized scope without invented prerequisites', () => {
  assert.equal(directAuthorizationBoundaryPasses('用户已授权的局部工作按请求范围执行，无需重复请批。'), true);
  assert.equal(directAuthorizationBoundaryPasses('按用户本轮请求的授权范围直接执行——不需重复请批。'), true);
  assert.equal(directAuthorizationBoundaryPasses('按本轮用户明确授权的范围执行，不需要重复请批。'), true);
  assert.equal(directAuthorizationBoundaryPasses('按本轮请求或仍有效的已有授权范围直接执行（同一授权范围不必重复请批）。'), true);
  assert.equal(directAuthorizationBoundaryPasses('按用户本轮请求的授权范围直接执行，不需重复请批。'), true);
  assert.equal(directAuthorizationBoundaryPasses('按用户本轮请求（或已有明确授权）的范围直接执行——用户直派即当轮授权范围，不需重复请批。'), true);
  assert.equal(directAuthorizationBoundaryPasses('仅在本轮请求或已有明确授权划定的范围内执行，无需重复请批——呈批门只在任务复杂或用户主动要求时使用。'), true);
  // 2026-10-19 真模型实录（entry-chain-probe Q1 原话）：模型用「不用逐次重复请批」表达同一语义，
  // 而否定词清单当时只列 不需/无需/不必/不需要/不要求，独漏「不用」→ 语义正确的回答被判红。
  // 词面层职责是召回语义正确的形态、不是规定措辞，故补词而非收紧模型。
  assert.equal(directAuthorizationBoundaryPasses('按本轮用户明确请求划定的范围直接执行（用户直派就是当轮授权）；在这个范围内不用逐次重复请批，只有超出该范围时才需要再请批。'), true);
  assert.equal(directAuthorizationBoundaryPasses('按本轮请求的授权范围直接执行，不用重复请批。'), true);
  // 2026-10-19 同一探针连续三次真模型实录，每次换个说法都判红——三个词形都要锁住：
  // ①「不用逐次重复请批」（否定词漏「不用」）②「不需要重复请求批准」（动作面只认「请批」）
  // ③「用户本轮请求划定的范围」（授权来源只认「授权」，漏了「用户直派」这个合同核心形态）。
  assert.equal(directAuthorizationBoundaryPasses('应当按用户本轮请求和已有授权划定的范围直接执行（复杂工作用会话内 plan/todo 组织），不需要重复请求批准。'), true);
  assert.equal(directAuthorizationBoundaryPasses('按本轮用户明确请求划定的范围直接执行；在这个范围内不用逐次重复请批。'), true);
});

test('RFC probe recognizes the contract without requiring one phrase order', () => {
  assert.equal(rfcBoundaryPasses('RFC 只在某项持久决定需要显式评审时才于 notes/proposed/ 建立，不是实施工作的普遍前置。'), true);
  assert.equal(rfcBoundaryPasses('只有持久决定需要显式评审时，才为该决定建立 RFC；它不是一般实施工作的普遍前置。'), true);
  // 两条真模型实录正例（2026-10-10 探针双跑，语义正确而被旧词面漏接——放宽依据见
  // notes/implemented/2026-10-10-entry-chain-probe-lexical-recall.md）：
  assert.equal(rfcBoundaryPasses('不是普遍前置：RFC 仅在「持久决定需要显式评审」时按该项建立（D12；根 AGENTS 入口链第 4 步、dev-loop §1.1）。'), true);
  assert.equal(rfcBoundaryPasses('不是——RFC 只在「持久决定需要显式评审（需在实现前持久化被评审、且理由无法由代码/测试/现有文档说明）」时为该项建立（D12、意图载体总图）。'), true);
  assert.equal(rfcBoundaryPasses('所有实施都必须先建 RFC。'), false);
  assert.equal(rfcBoundaryPasses('RFC 不是普遍前置。'), false);
  // 假阳性负例（2026-10-10 对抗自审实测：补丁前「无需显式评审」被 /持久决定.{0,24}显式评审/ 放行）：
  assert.equal(rfcBoundaryPasses('不是——持久决定无需显式评审，仅在任何工作时建立 RFC 即可。'), false);
  assert.equal(rfcBoundaryPasses('持久决定不需要显式评审，随时可以建 RFC，不是普遍前置。'), false);
});

test('direct authorization probe rejects statements that invent approval prerequisites', () => {
  assert.equal(directAuthorizationBoundaryPasses('用户授权后还必须重复请批并建立 RFC。'), false);
  assert.equal(directAuthorizationBoundaryPasses('所有实施都必须先建 RFC。'), false);
  assert.equal(directAuthorizationBoundaryPasses('有授权就可以开始。'), false);
  assert.equal(directAuthorizationBoundaryPasses('按用户本轮请求的授权范围执行。'), false);
});
