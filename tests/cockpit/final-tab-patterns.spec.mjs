// final-tab-patterns.spec.mjs — 「终稿」页签认领 glob 的形态合同（2026-11-03 实红回归）。
//
// 事故形态：点状态页 ⑤「读终稿」→ 右栏开出 vendor 文档预览、页签标题 `v1.md`，
// 终稿页签的版本切换/静音条/折叠块/滚动口全缺。根因：vendor `tab-registry` 对**不含 `:`**
// 的 pattern 一律 `picomatch(..., { basename: true })` 编译（拿地址 basename 去匹配），
// 带分隔符的 `**/final/v*.md` / `final/v*.md` 永不命中——终稿页签从不进入候选，
// 地址被 fallback 文档预览认领。
//
// 本测试钉形态：pattern 只许写 basename，不带 `/`；精确性归 `canOpen: isFinalAddress`。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RESEARCH_FINAL_PATTERN,
  RESEARCH_FINAL_PATTERN_LEDGER,
  RESEARCH_FINAL_PATTERN_READER,
} from '../../packages/deep-research-pack/src/client/keys.ts';

test('终稿页签认领 glob：三个 pattern 都是 basename（不含分隔符）', () => {
  const patterns = [RESEARCH_FINAL_PATTERN, RESEARCH_FINAL_PATTERN_LEDGER, RESEARCH_FINAL_PATTERN_READER];
  for (const pattern of patterns) {
    assert.equal(typeof pattern, 'string');
    assert.ok(pattern.length > 0, 'pattern 为空');
    assert.ok(!pattern.includes('/'), `${pattern} 含分隔符——vendor 按 basename 编译，带 / 永不命中`);
    assert.ok(!pattern.includes(':'), `${pattern} 含 scheme 分隔符——那是「整地址匹配」的另一条路，别再混用`);
  }
  assert.deepEqual(patterns, ['final.md', 'v*.md', 'readable*.md'], '三个 pattern 覆盖工作稿 / 版本账 / 读者版');
});
