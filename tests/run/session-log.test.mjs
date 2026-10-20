// session-log 回归 — 组发现契约（findGroup：组过滤盲区的逃生口）。
// 反证（红先行实录，2026-10-21 卫生轮 维度6 件①）：findGroup 未实现时本文件 import 即红——
// 「函数缺席即红」由 import 直接承担；还原后绿。背景：researchWorkspaceGroup 硬过滤
// 'research-workspace'，dev home 982 场冒烟/自测会话（dev-smoke-workspace / runtime-smoke-workspace /
// lib-selftest 组）对 session-events / watch-run 两工具不可见——症状发生在冒烟会话时
// 「刚才发生了什么」统一入口失效。逃生口 = 组名子串发现（findGroup），缺省语义不变。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findGroup, researchWorkspaceGroup } from '../../scripts/lib/session-log.mjs';

const mkSessionsRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'session-groups-'));
  for (const g of [
    '--tmp--',
    '--x-dev-smoke-workspace--',
    '--x-research-workspace--',
    '--x-runtime-smoke-workspace-lib-selftest--',
  ]) mkdirSync(join(root, g));
  return root;
};

test('findGroup：组名含子串的首个目录（冒烟组可达——盲区逃生口）', () => {
  const root = mkSessionsRoot();
  try {
    assert.equal(findGroup(root, 'dev-smoke-workspace'), '--x-dev-smoke-workspace--');
    assert.equal(findGroup(root, 'lib-selftest'), '--x-runtime-smoke-workspace-lib-selftest--');
    assert.equal(findGroup(root, 'research-workspace'), '--x-research-workspace--');
    assert.equal(findGroup(root, 'smoke-workspace'), '--x-dev-smoke-workspace--', '多组命中取首个（readdir 序）');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('findGroup：无命中 / 根缺席 → undefined（不猜、不静默换组）', () => {
  const root = mkSessionsRoot();
  try {
    assert.equal(findGroup(root, 'no-such-group'), undefined);
  } finally { rmSync(root, { recursive: true, force: true }); }
  assert.equal(findGroup(join(tmpdir(), 'session-groups-absent'), 'research-workspace'), undefined);
});

test('researchWorkspaceGroup：缺省语义不变——仍只在 research-workspace 组里发现（冒烟组在场不劫持）', () => {
  const root = mkSessionsRoot();
  try {
    assert.equal(researchWorkspaceGroup(root), '--x-research-workspace--');
  } finally { rmSync(root, { recursive: true, force: true }); }
  assert.equal(researchWorkspaceGroup(join(tmpdir(), 'session-groups-absent')), undefined);
});
