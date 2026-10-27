#!/usr/bin/env node
// verify.mjs — L0 结构门禁入口（keyless，零依赖）。
//
// 组织（2026-10-27 卫生轮拆分）：本文件只做三件事——配 `--only`、按域顺序调用、汇总报红。
// 门禁本体按域住在 `gates/`：
//   a-docs（md 文档卫生）· b-pack（pack 与驾驶舱）· c-notes（notes 与开发技能）·
//   d-vendor（vendor 对齐）· e-workspace（工作区生成物）· f-repo（仓规环境）。
// 共享助手（tracked 枚举 / gitOnce / fail-note 收集器 / 路径常量 / gates 名单）= `context.mjs`。
// 门禁登记表（正本）= docs/evaluation.md §L0——与 `context.gates` 经门禁 gate-ledger-sync 机械
// 对账（登记与实现漂移即红）；每条门禁的反证记录 = 表末列所指 notes/。
//
// 为什么要拆（维度2 实测）：47 道门禁 1848 行单文件，改一道门禁要读全文件（或盲改），
// 而改门禁的循环本来就是 `--only=<名>` 的窄面。拆后单域 200–450 行，判据与文案逐字未改
// （红绿基线与拆分前一致——gates-smoke 87 案例 + 4 对照同一判）。
//
// 用法：node scripts/verify/verify.mjs [--only=<gate[,gate]>]（可多次传，取并集）

import { gates, configureOnly, activeOnly, failures, notes } from './context.mjs';
import { runA } from './gates/a-docs.mjs';
import { runB } from './gates/b-pack.mjs';
import { runC } from './gates/c-notes.mjs';
import { runD } from './gates/d-vendor.mjs';
import { runE } from './gates/e-workspace.mjs';
import { runF } from './gates/f-repo.mjs';

// `--only=<gate[,gate]>`：只判指定门禁（输出与退出码都只看它们）。其余门禁照常执行
// （读文件、无副作用），只是失败不计入、汇总不打印——省的是噪声与注意力，不是时间。
const onlyNames = process.argv
  .filter((a) => a.startsWith('--only='))
  .flatMap((a) => a.slice('--only='.length).split(','))
  .map((s) => s.trim()).filter(Boolean);
configureOnly(onlyNames);
const only = activeOnly();

if (only !== null) {
  const unknown = [...only].filter((g) => !gates.includes(g));
  if (unknown.length > 0) {
    console.error(`verify: --only 里有未登记的门禁：${unknown.join(', ')}（门禁名单正本 = context.gates + docs/evaluation.md §L0）`);
    process.exit(2);
  }
}

runA();
runB();
runC();
runD();
runE();
runF();

// ── 汇报 ──
// 归因正则钉 [^\]]+（到首个 ] 为止）：贪婪 (.+)\] 会被消息内嵌的 ]（如队列行的 [RFC] 链接）
// 污染，抓到最后一个 ] ——失败详情在场、门禁行却打 PASS（2026-10-07 gates-smoke 实证抓获）。
const failed = new Set(failures.map((f) => f.match(/^\[([^\]]+)\]/)[1]));
for (const g of gates) { if (only === null || only.has(g)) console.log(`${failed.has(g) ? 'FAIL' : 'PASS'}  ${g}`); }
for (const n of notes) console.log(`note  ${n}`);
if (failures.length > 0) {
  console.log(`\n${failures.length} 处失败：`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log(only === null ? '\nverify: 全绿' : `\nverify: 仅判 ${[...only].length} 道（--only）——其余门禁未计；收尾仍须全量跑`);
