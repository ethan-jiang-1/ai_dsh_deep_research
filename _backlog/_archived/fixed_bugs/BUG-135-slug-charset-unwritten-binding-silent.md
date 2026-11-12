---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-135：slug 字符集未成文，绑定只认 `[a-z0-9-]`——`drt_my_topic/` 静默不绑定（状态页签/归因/见证全失效）

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — 取方案 A：`RUN_SLUG = [A-Za-z0-9][A-Za-z0-9._-]*`，绑定/门侧/CLI 共用；下划线/点号/大写目录可绑定与打开；content 误绑仍由路径字段判据挡住（2026-11-13，去向：none — 绑定判据修复，审查：agent 自审 + 机械门禁）。
> 「成文 kebab 并在创建时 fail-loud」的另一条路，需产品取舍）
>
> 位置：`packages/deep-research-pack/src/lib/bundle-bind.ts:31`（`slugInArgs`）与
> `scripts/lib/node-gate-session-gates.mjs:70`（`BIND_PATH_RE`）——两处都写死 `[a-z0-9][a-z0-9-]*`。

## 症状

所有「会话 ↔ run bundle」的绑定都按 **kebab-only** 提取 slug：

```js
const m = /(?:^|[\\/])drt_([a-z0-9][a-z0-9-]*)[\\/]/.exec(raw.replace(/\\/g, '/'))
```

但**没有任何地方成文 slug 的字符集**：skills/模板/手册只写 `drt_<slug>`，没有「必须 kebab」的规则。
Lead 用下划线命名（如 `drt_llm_inference_cost`，模型生成标识符时的自然选择）会得到：

- `sessionBindingOf` → `{ slug: undefined }`（**静默**，无报错）；
- 状态页签/渐进面**不绑定**本 run（页面显示「尚未绑定研究 run」）；
- `run-kickoff` 的归属记账跳过（“归属未定”）；
- 门②/③的见证扫描同样找不到该会话（`boundSlugsOf` 同字符集）；
- `bundle-sessions` 反查不到会话。

## 复现

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { sessionBindingOf } from './packages/deep-research-pack/src/lib/bundle-bind.ts';
const ev = (file) => ({ type: 'tool/call', data: { name: 'write', arguments: JSON.stringify({ file_path: file }) } });
for (const f of ['drt_llm-inference-cost/final.md', 'drt_llm_inference_cost/final.md', 'drt_v1.2/final.md'])
  console.log(f, '→', JSON.stringify(sessionBindingOf([ev(f)])));
"
# 实测：kebab → slug=llm-inference-cost；下划线/点号 → slug 缺席（无任何警告）
```

## 根因（已证）

1. 绑定/见证/归因三处共用一个**未成文**的 slug 字符集（kebab）；
2. 不匹配时**静默返回 undefined**——既没有「看到 di 目录但 slug 不合法」的告警，也没有创建期的校验；
3. 仓库里真实 bundle 恰好全是 kebab（`ls research-workspace* | grep drt_` 无下划线/点号），所以从未暴露；
4. 两处实现各写一份（pack 与门侧），字符集再漂移也不会互相发现（与 BUG-134 同族的「双份判据」问题）。

## 影响面

- 一场正常交付的 run，仅因 slug 写法（下划线/点号/大写）就**状态页签失联、验收见证失联**；
- 失败是静默的：用户/Lead 只会看到「尚未绑定」，不会知道是字符集问题；
- 若门②/③因此判红，会被误归因为「没写 present/没拍板」，实际是绑定没认；
- 未成文规则 = 不可复核的隐含契约（与仓库「docs = 当前合同」纪律冲突）。

## 修复判据（二选一，推荐 A）

**A. 放宽绑定字符集**（让合法目录名都能绑定）
1. 两处正则改为 `drt_([^\\/\s]+)/`（或明确白名单 `[A-Za-z0-9._-]+`），保持路径段边界；
2. 先红后绿：`drt_llm_inference_cost/final.md` → slug=`llm_inference_cost`；`drt_v1.2/...` →
   `v1.2`；kebab 形态不回归；content 正文误绑仍被 BUG-090/134 的路径字段判据挡住；
3. 门侧与 pack 共享同一提取函数（避免第三份实现）。

**B. 成文 kebab + 创建期 fail-loud**
1. 在 `research-brief`/模板/手册写明 slug 规则（`[a-z0-9][a-z0-9-]*`）；
2. 绑定失败时若**看到** `drt_` 目录但不匹配 → 告警（状态页签显示「目录名不合规」而非「未绑定」）；
3. 增加门禁：run bundle 目录名不符 kebab → schema-scan 红（对 `drt_` 目录名收紧）。

无论哪条：`pnpm test` + `pnpm verify` 绿；状态页签/账本/门见证三处对同一 slug 的判定一致。

## 修复关联

[BUG-090](BUG-090-bundle-bind-content-false-positive.md)（content 误绑）
与 [BUG-134](BUG-134-gate-witness-bound-slugs-scans-content.md)（门侧扫 content）同属「绑定判据」族；
本条是**反面**缺口（该绑的没绑）。发现方式 = 绑定正则与真实目录命名的对角检查。

## 已落地（2026-11-13）

- 证据 = `tests/run/bundle-bind.test.mjs` BUG-135 + `tests/run/run-context.test.mjs` BUG-135。
- `run-context` 导出 `RUN_SLUG`；`bundle-bind`/`run-accept`/`bundle-sessions`/reader-gate 同字符集。
- 全量 `pnpm test` 1343 绿、`pnpm verify` 全绿。
- 去向 = none。
