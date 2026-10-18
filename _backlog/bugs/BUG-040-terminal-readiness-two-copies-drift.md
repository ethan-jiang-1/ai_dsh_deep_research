---
status: 排查中
severity: P2
opened: 2026-10-18
---

# BUG-040：终局 readiness 判据两版实现漂移——pack 已加轮次仲裁，门的 `readinessOf` 未跟随

> 状态：**排查中**（根因与影响面已实测，修法未定/未实施）——从
> [BUG-036](../_archived/fixed_bugs/BUG-036-cockpit-brief-layer-pending-review-line-missing.md) 闭环时带出。

## 症状（同一 bundle，两处判不同）

| 判据 | 实现 | `drt_cambricon-commercial-sustainability` | `drt_anthropic-claude-release-line-timeline` |
|---|---|---|---|
| UI / 面板 / 代答闸 | pack `review-readiness.terminalReadiness`（BUG-036 加了轮次路径 + 仲裁） | **PASS** | FAIL |
| 门的 `readinessOf` | `scripts/lib/node-gate-contracts.mjs`（自带一份） | **FAIL** | FAIL |

两条命令可复现（keyless）：用 `terminalReadiness(readFileSync(<bundle>/review.md))` 与
`readinessOf(...)` 分别读同一文件——前者 PASS、后者 FAIL。该 bundle 的 review.md 是"第 2 轮标题行
PASS + 文末附录第 1 轮 FAIL"形态，正是 BUG-036 修的那种；门侧那份没跟随，仍按"最后一条"取到附录 FAIL。

## 影响

- 门A / 门③ 与代答闸对**同一交付**给出不同前置判断（本仓最忌的"同一事实两处判"）；
- 本卡发现路径：写代答闸时先按门侧判据取 readiness → 对一场**已 PASS 的已交付 run**误判 FAIL
  （若照此实现，闸会误挡合法交付）。

## 下一步（定位手段）

1. 定"谁为正本"：`node-gate-contracts.readinessOf` 的 `{pass, conditional}` 里 **conditional（附条件 PASS）**
   是门独有语义，不能简单删——正解候选 = `readinessOf` 的三态部分**委托** pack 的 `terminalReadiness`，
   只保留 conditional 检测；
2. 委托前先跑 `tests/node-gate.test.mjs` / `tests/review-readiness.test.mjs` 两套夹具看红，
   确认没有第二处语义差异（尤其"附条件 PASS 不算 PASS"的既有判据）；
3. 收口标准 = 同一 bundle 两个入口同判（加一条**跨实现一致**的契约测试钉住）。
