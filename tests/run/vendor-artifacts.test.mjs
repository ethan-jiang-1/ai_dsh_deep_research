// vendor-artifacts 自检回归 — 与 boot 面护栏同源判据（keyless，纯 fs 静态夹具，不依赖真实
// 构建状态：新 clone/CI 未构建 vendor 时本测试仍绿——真实树的自检归 boot 时刻，不归 L0）。
// 夹具放置规则（tests/AGENTS.md）：构造样本住 tests/fixtures/，两形态 = ok（代表产物齐全）
// 与 missing-client（缺 client 面 bundle）；"vendor 整个缺席"的边界形态用夹具根目录本身
// （它没有 vendor/ 子树——不为此造假目录）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertVendorArtifacts, ARTIFACT_REMEDY, REPRESENTATIVE_ARTIFACTS } from '../../scripts/lib/vendor-artifacts.mjs';

const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'vendor-artifacts');

test('代表产物齐全（夹具 ok/）→ 绿，不误报', () => {
  const r = assertVendorArtifacts(join(FIX, 'ok'));
  assert.equal(r.ok, true);
  assert.deepEqual(r.missing, []);
});

test('缺 client 面 bundle（夹具 missing-client/）→ 红，missing 报对缺的那件（红证形态）', () => {
  const r = assertVendorArtifacts(join(FIX, 'missing-client'));
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ['packages/client/ui-sidebar-right/lib/client.js']);
});

test('缺 typert 面 → 红（另一种失败面：构造只含 client bundle 的根）', () => {
  // missing-client 夹具反过来用不行（它缺的是 client）；typert 缺席形态 = 夹具根（两件都缺）
  // 单独验证 typert 那件确实在代表清单里被点名：
  const r = assertVendorArtifacts(FIX); // 夹具根无 vendor/ 子树 → 两件全缺
  assert.equal(r.ok, false);
  assert.ok(r.missing.includes('packages/goal/goal/lib/typert.host.js'));
  assert.ok(r.missing.includes('packages/client/ui-sidebar-right/lib/client.js'));
});

test('vendor 树整个缺席（未构建的新 clone 边界形态）→ 红不崩，全量代表产物报缺', () => {
  const r = assertVendorArtifacts(FIX);
  assert.equal(r.ok, false);
  assert.equal(r.missing.length, REPRESENTATIVE_ARTIFACTS.length);
});

test('remedy 一行在场（boot 面失败消息的修正入口）', () => {
  assert.ok(ARTIFACT_REMEDY.includes('vendor-build.sh'), 'remedy 必须指向 vendor-build.sh');
});
