#!/usr/bin/env node
// unconsumed-evidence —— B1 差集出题的操作侧 CLI（run-ops 层；2026-10-21 卫生轮 B8 补壳）。
//
// 为什么存在：lib/unconsumed-evidence.mjs 头注承诺"供操作侧收尾核验"（critic 差集出题的
// 机械基座），但仓内此前无 CLI 入口——承诺的动作没有工具。判据与差集语义**不在这里**：
// 唯一语义源 = scripts/lib/unconsumed-evidence.mjs（消费方 = 本件与 keyless 契约测试
// tests/run/unconsumed-evidence.test.mjs）；活体验证 E2E = notes/implemented/2026-10-07-living-verification-hook.md。
//
// 用法：node scripts/run-ops/unconsumed-evidence.mjs <bundleDir> [--json]
// 退出码：0 = 正常投影（有无未消费证据是结论不是工具错误）/ 2 = 用法或前置错（bundle 缺席等）
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { unconsumedEvidence } from '../lib/unconsumed-evidence.mjs';

const JSON_OUT = process.argv.includes('--json');
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (positional.length !== 1) {
  console.error('用法：node scripts/run-ops/unconsumed-evidence.mjs <bundleDir> [--json]');
  console.error('  <bundleDir> = run bundle 根（drt_<slug>/，含 evidence/ 与 findings.md）');
  process.exit(2);
}
const bundleDir = resolve(positional[0]);
if (!existsSync(bundleDir) || !statSync(bundleDir).isDirectory()) {
  console.error(`unconsumed-evidence: bundle 目录缺席或非目录：${bundleDir}——收尾核验对象必须在场，fail-loud`);
  process.exit(2);
}
const r = unconsumedEvidence(bundleDir);
if (JSON_OUT) {
  console.log(JSON.stringify({ bundle: bundleDir, ...r }, null, 1));
} else {
  const state = r.findingsPresent
    ? 'findings.md 在场'
    : 'findings.md 缺席（run 中期态：全部证据按未消费投影，差集语义由调用方自判）';
  console.log(`unconsumed-evidence: ${state} · 证据 ${r.total} 张 · 已引用 ${r.cited} · 未消费 ${r.unconsumed.length}`);
  if (r.total === 0) console.log('（evidence/ 缺席或空——空集显式，不静默不炸）');
  for (const c of r.unconsumed) console.log(`  未消费：evidence/${c}`);
  if (r.unconsumed.length > 0) {
    console.log('  → B1（critic 差集出题）：检索到但未被采用的信息是对抗核查的矿（语义正本 = lib 头注）');
  }
}
process.exit(0);
