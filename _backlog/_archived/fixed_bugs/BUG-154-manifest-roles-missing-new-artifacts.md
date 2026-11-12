---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-154：manifest 的 FILE_ROLES 未登记新契约件——protocol.json/protocol-audit.md 角色 unknown，review//waves/ 证据完全不入清单

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — manifest 登记 protocol 角色，并将 review//waves//protocol/ 证据带 sha256 入清单（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`scripts/lib/run-receipt.mjs` 的 `FILE_ROLES` 与 `buildManifest`。

## 症状

在真实新契约 bundle 上调用 `buildManifest`：

```js
[['audit.md','audit-snapshot'], ['protocol-audit.md','unknown'], ['protocol.json','unknown'], ['review.md','review']]
unknown roles: [ 'protocol-audit.md', 'protocol.json' ]
review/ 与 waves/ 条目: 0
```

即：

- `protocol.json`（D46 canonical 研究设计）与 `protocol-audit.md`（协议审计报告）在交付清单里角色是
  **`unknown`**；
- `review/claims.json`、`review/verdicts-rN.json`（D44 claim 级复核的**证据本体**）、`review/verdict-audit-rN.md`、
  `waves/*.json`、`protocol/vN.json`（版本历史）**完全没有进入 manifest**（buildManifest 只列顶层文件 +
  `final/`）。

## 复现

```sh
node --import tsx/esm -e "
import { buildManifest } from './scripts/lib/run-receipt.mjs';
const m = buildManifest({ slug: 'drt_llm-inference-cost-routes', bundleDir: 'research-workspace/drt_llm-inference-cost-routes', contract: '2026-11-11', generatedAt: '2026-11-13T00:00:00+08:00' });
console.log(m.files.filter((f) => /protocol|review|waves/.test(f.path)).map((f) => [f.path, f.role]));
console.log('review/ in manifest:', m.files.some((f) => f.path.startsWith('review/')));
"
# 实测：protocol.json/protocol-audit.md → unknown；review/ 与 waves/ → 0 条
```

## 根因（已证）

1. `FILE_ROLES` 是 D28 时期的顶层文件表（run/question/topics/plan/leads/findings/review/final/journal/
   audit/node-gate/acceptance/delivered），D44/D46 新增的 `protocol.json`/`protocol-audit.md` 未登记 →
   命中 `?? 'unknown'`；
2. `buildManifest` 只 `readdir` 顶层**文件** + `final/` 版本，**目录内容**（review/、waves/、protocol/）
   一律不列——claim 裁决与 wave 报告是交付证据，却没有哈希进清单；
3. 交付清单的契约是「文件角色/读序/契约/哈希」（manifest.json 注释）：新证据体不在清单里，接收方无法
   用 manifest 校验它们未被改动。

## 影响面

- 交付清单把**复核证据**（claims/verdicts/wave 报告/协议历史）排除在哈希清单之外——D44/D46 的核心证据
  不在「可校验清单」内；
- `unknown` 角色让清单读者无法判断 `protocol.json` 是什么（ops 说明书失效）；
- 与 [BUG-076](BUG-076-schema-scan-whitelist-missing-protocol-artifacts.md)
  同族（新件未登记），但那条修的是 schema 白名单，**manifest 角色表未同步**。

## 修复判据

1. `FILE_ROLES` 增补：`protocol.json` → `protocol`、`protocol-audit.md` → `protocol-audit`（旧 bundle 不受
   影响——manifest 只在验收时生成）；
2. `buildManifest` 增加**受控目录清单**：`review/`（claims.json / verdicts-rN.json / verdict-audit-rN.md）、
   `waves/*.json`、`protocol/vN.json`——按角色 + sha256 入清单（数量设上限/分节，避免 manifest 暴涨）；
3. 先红后绿：真实新契约 bundle 生成 manifest——当前 protocol 角色 unknown、review/·waves/ 0 条（红）→
   修复后角色正确、证据文件带 sha256；旧契约 bundle 的清单形状不变（回归）；
4. `pnpm test` + `pnpm verify` 绿；`run-accept-smoke` / 真实 run-accept 复跑（manifest 生成路径）。

## 修复关联

[BUG-076](BUG-076-schema-scan-whitelist-missing-protocol-artifacts.md)
（schema 白名单已修）的同族；[BUG-153](BUG-153-protocol-snapshot-presence-only-not-content.md)（协议历史链）
相邻：历史快照既不在审计内容校验里，也不在 manifest 哈希里。发现方式 = 交付清单的角色表对账。

## 已落地（2026-11-13）

- 证据 = `tests/run/run-receipt.test.mjs` BUG-154。
- 全量 `pnpm test` 1364 绿、`pnpm verify` 全绿；run-accept-smoke ALL PASS。
- 去向 = none。
