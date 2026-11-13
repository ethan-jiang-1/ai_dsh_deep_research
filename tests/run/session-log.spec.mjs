// session-log 回归 — 组发现契约（findGroup：组过滤盲区的逃生口）。
// 反证（红先行实录，2026-10-21 卫生轮 维度6 件①）：findGroup 未实现时本文件 import 即红——
// 「函数缺席即红」由 import 直接承担；还原后绿。背景：researchWorkspaceGroup 硬过滤
// 'research-workspace'，dev home 982 场冒烟/自测会话（dev-smoke-workspace / runtime-smoke-workspace /
// lib-selftest 组）对 session-events / watch-run 两工具不可见——症状发生在冒烟会话时
// 「刚才发生了什么」统一入口失效。逃生口 = 组名子串发现（findGroup），缺省语义不变。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findGroup, findSessionDir, readSessionTextOf, researchWorkspaceGroup } from '../../scripts/lib/session-log.mjs';

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

// findSessionDir / readSessionTextOf = 2026-11-04 从六个真模型档消费方收进 canonical 的
// 双形态会话目录发现（旧决定“sessionDirOf 保留本地”的重开；语义逐字保留）。
// 反证：函数缺席时本文件 import 即红；实现后绿。
test('findSessionDir：session-<id> 优先于裸 <id>（形态优先不随组序漂移）', () => {
  const root = mkdtempSync(join(tmpdir(), 'session-dir-'));
  try {
    mkdirSync(join(root, 'group-a', 'session-abc'), { recursive: true });
    mkdirSync(join(root, 'group-b', 'abc'), { recursive: true });
    assert.equal(findSessionDir(root, 'abc'), join(root, 'group-a', 'session-abc'));
    assert.equal(findSessionDir(root, 'missing'), null);
  } finally { rmSync(root, { recursive: true, force: true }); }
  assert.equal(findSessionDir(join(tmpdir(), 'session-dir-absent'), 'abc'), null);
});

test('readSessionTextOf：定位后走 canonical 日志读取；缺件返回空串而不是猜', () => {
  const root = mkdtempSync(join(tmpdir(), 'session-read-'));
  try {
    const dir = join(root, 'group-a', 'abc');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'session.v4.jsonl'), '{"type":"session"}\n');
    assert.equal(readSessionTextOf(root, 'abc'), '{"type":"session"}\n');
    assert.equal(readSessionTextOf(root, 'missing'), '');
  } finally { rmSync(root, { recursive: true, force: true }); }
  assert.equal(readSessionTextOf(join(tmpdir(), 'session-read-absent'), 'abc'), '');
});
