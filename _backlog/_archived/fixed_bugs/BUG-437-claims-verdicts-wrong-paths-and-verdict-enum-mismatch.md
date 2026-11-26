---
status: 已修
severity: P0
opened: 2026-11-27
---

# BUG-437：claims-verdicts 读取路径（根 vs review/）与裁决枚举（partially_supported / unverifiable）双重脱节，核查清单对规范 bundle 永久不可用

> 严重级别：P0 ｜ 发现：2026-11-27 ｜ 状态：已修 — 结论：优先读 review/claims.json 与最高轮 review/verdicts-r<N>.json（保留根回退）、支持四值规范裁决并在 ClaimsAuditView 显示 证据不足；去向：implemented — [2026-11-27-cockpit-ux-ui-audit-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md)

## 症状

在写入规范盘侧路径 `review/claims.json` + `review/verdicts-r1.json` 的真实结构 bundle 上切换终稿「核查清单」Tab：
- Tab 计数恒显示 `核查清单 (0)`；
- 面板展示 `claims.json 未就绪或读取失败，暂无法生成逐条核查表。`

## 根因与边界

1. **路径脱节**：[claims-verdicts.ts](../../../packages/deep-research-pack/src/lib/run/claims-verdicts.ts)（`L181-L185`） 与 [artifact-read.ts](../../../packages/deep-research-pack/src/lib/run/artifact-read.ts)（`L95-L96`） 仅从 bundle 根目录读取 `'claims.json'` 与 `'verdicts.json'`，而仓库规范（[manual.md](../../../packages/deep-research-pack/content/manual.md)（`L36-L38`）、[verdict-audit-core.mjs](../../../checks/lib/gates/verdict-audit-core.mjs)（`L1`））正本路径为 **`review/claims.json`** 与 **`review/verdicts-r<N>.json`**（`r1`/`r2`）。
2. **裁决枚举脱节**：[claims-verdicts.ts](../../../packages/deep-research-pack/src/lib/run/claims-verdicts.ts)（`L89-L95`） `normalizeVerdict` 只认 `'supported' | 'partial' | 'unsupported' | 'insufficient' | 'insufficient_evidence'`，而规范门禁 [verdict-audit-core.mjs](../../../checks/lib/gates/verdict-audit-core.mjs)（`L20`） 强制的四值裁决为 **`'supported' | 'partially_supported' | 'unsupported' | 'unverifiable'`**；`partially_supported` 和 `unverifiable` 会返回 `null` 并导致整份 verdicts 被 `decodeVerdicts` 判 `invalid`。
3. **统计角标遗漏**：[ClaimsAuditView.tsx](../../../packages/deep-research-pack/src/client/research-final/ClaimsAuditView.tsx)（`L49-L54`） 顶部统计标签只渲染 `supported`/`partial`/`unsupported`/`unverified`，漏掉了 `counts.insufficient`（对应 `insufficient`/`unverifiable`）。
- 现场证据：`runtime/smoke-workspace/ux-audit-2026-11-27/screenshots/09-final-claims-canonical-check.png`、`stage234.log`。

## 复现

```sh
# 在 bundle 内按规范落盘 review/claims.json + review/verdicts-r1.json 并打开终稿「核查清单」
# 实测 09-final-claims-canonical-check.png 显示「核查清单 (0)」与「claims.json 未就绪或读取失败」
```

## 修复判据

1. `readClaimsAndVerdicts` 优先读取 `review/claims.json` 与最新轮次 `review/verdicts-r<N>.json`（遵循 `EOF_NAME` 完整读策略，参见 BUG-436）；
2. `normalizeVerdict` 兼容规范四值 `partially_supported` / `unverifiable`，`ClaimsAuditView` 完整展示各态计数标签；
3. 真浏览器场景下规范 `review/claims.json` + `review/verdicts-r1.json` 可见真实主张与 verdict，不再误报不可用。

## 分诊与授权

- 严重级：P0 — 终稿「核查清单」对规范盘侧目录 `review/` 完全盲掉，且四值裁决枚举中两项被整表拒收。
- 表面 / 边界：工件策略 + 裁决解码 + 核查清单视图。
- 授权：已随 UX/UI 全量修复批授权直接落地；批 = `2026-11-27-cockpit-ux-ui-audit-fixes`。

## 根因

`claims-verdicts.ts` 仅读取根 `claims.json`/`verdicts.json` 且 `normalizeVerdict` 遗漏 `partially_supported`/`unverifiable`；`artifact-read.ts` 未登记 `review/claims.json` 与 `review/verdicts-r<N>.json`；`ClaimsAuditView.tsx` 统计标签条遗漏 `counts.insufficient`。

## 修法

在 `artifact-read.ts` 登记 `review/claims.json` 与 `review/verdicts-r<N>.json`；在 `claims-verdicts.ts` 增加 `readLatestVerdicts`（按 `review/` 轮次降序选最新，回退根路径，不可读不静默降级）及四值映射；在 `ClaimsAuditView.tsx` 补 `insufficient` 统计标签。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/artifact-read.ts",
    "packages/deep-research-pack/src/lib/run/claims-verdicts.ts",
    "packages/deep-research-pack/src/client/research-final/ClaimsAuditView.tsx",
    "tests/cockpit/lib/run/claims-verdicts.spec.mjs",
    "tests/cockpit/client/final-evidence.spec.mjs"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=$(pwd -P)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --test tests/cockpit/lib/run/claims-verdicts.spec.mjs",
    "exit": 1,
    "output": "BUG-437 readClaimsAndVerdicts：'absent' !== 'ok'"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/lib/run/claims-verdicts.spec.mjs"
  }
}
```
