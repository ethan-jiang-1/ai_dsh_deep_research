#!/usr/bin/env node
// acceptance-check —— 收活判据三态求值的操作侧 CLI（run-ops 层；2026-10-21 卫生轮 B8 补壳）。
//
// 为什么存在：lib/acceptance-check.mjs 头注承诺"供操作侧收尾核验"（把"收活结论"对账成
// 机械事实），但仓内此前无 CLI 入口。判据求值与三态语义（PASS/FAIL/UNVERIFIED，判不了的
// 永不静默放行）**不在这里**：唯一语义源 = scripts/lib/acceptance-check.mjs（消费方 = 本件
// 与 keyless 契约测试 tests/run/acceptance-check.test.mjs）；行为面 E2E = scripts/probe/discipline-probe.mjs。
//
// 参数形态（按模块语义定，不猜约定位置）：判据是委派方**显式写下的清单**（模块签名 =
// 数组入参；仓内 run 模板无判据落盘约定）→ 壳参数 = bundle 目录 + 判据 JSON 文件（数组，
// 叶子三型 = file_exists / file_contains / frontmatter_fields）。
//
// 用法：node scripts/run-ops/acceptance-check.mjs <bundleDir> <criteria.json>
// 退出码：0 = 求值完成（PASS/FAIL/UNVERIFIED 是求值结果，不是工具错误）/ 2 = 用法或前置错
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { acceptanceCheck } from '../lib/acceptance-check.mjs';

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (positional.length !== 2) {
  console.error('用法：node scripts/run-ops/acceptance-check.mjs <bundleDir> <criteria.json>');
  console.error('  <bundleDir>     run bundle 根（判据 path/file 相对它解析）');
  console.error('  <criteria.json> 判据 JSON 文件（数组；叶子三型 = file_exists / file_contains / frontmatter_fields）');
  process.exit(2);
}
const bundleDir = resolve(positional[0]);
const criteriaPath = resolve(positional[1]);
if (!existsSync(bundleDir) || !statSync(bundleDir).isDirectory()) {
  console.error(`acceptance-check: bundle 目录缺席或非目录：${bundleDir}——fail-loud`);
  process.exit(2);
}
if (!existsSync(criteriaPath)) {
  console.error(`acceptance-check: 判据文件缺席：${criteriaPath}——判据必须显式给出，fail-loud`);
  process.exit(2);
}
let criteria;
try {
  criteria = JSON.parse(readFileSync(criteriaPath, 'utf8'));
} catch (err) {
  console.error(`acceptance-check: 判据文件不是合法 JSON：${String(err?.message ?? err).slice(0, 120)}——fail-loud`);
  process.exit(2);
}
if (!Array.isArray(criteria)) {
  console.error('acceptance-check: 判据文件顶层不是数组——模块签名 = 判据清单（数组），fail-loud');
  process.exit(2);
}
const { verdicts, summary } = acceptanceCheck(bundleDir, criteria);
console.log(`acceptance-check: 判据 ${summary.total} 条 · PASS ${summary.pass} · FAIL ${summary.fail} · UNVERIFIED ${summary.unverified}${summary.noCriteria ? '（noCriteria：清单为空——无判据委派是缺陷形态，显式报告不静默全 PASS）' : ''}`);
for (const v of verdicts) console.log(`  [${v.status}] ${v.criterion} — ${v.detail}`);
if (summary.fail > 0) console.log('  → 有 FAIL：收活不放行（三态语义与处置 = lib 头注）');
if (summary.unverified > 0) console.log('  → 有 UNVERIFIED：需人工或 critic 判——永不静默放行');
process.exit(0);
