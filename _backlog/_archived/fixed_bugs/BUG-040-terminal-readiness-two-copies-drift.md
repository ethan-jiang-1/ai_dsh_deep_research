---
status: 已修
severity: P2
opened: 2026-10-18
---

# BUG-040：终局 readiness 判据两版实现漂移——pack 已加轮次仲裁，门的 `readinessOf` 未跟随

> 状态：**已修**（2026-10-18：判据收归单一正本 + 门侧委托，跨实现一致有契约测试钉住）——从
> [BUG-036](BUG-036-cockpit-brief-layer-pending-review-line-missing.md) 闭环时带出。

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

## 闭环（2026-10-18）

- **修法（判据单一正本）**：pack 抽出并导出 `terminalVerdictLine(text) → {value, line} | null`
  （"哪一行是终局"的唯一正本，含 BUG-036 的轮次路径与仲裁），`terminalReadiness` 退化为它的薄壳；
  门的 `readinessOf` **委托**它，只保留门独有的**附条件**语义（`/附条件|条件[=＝：:]/` 打在返回的
  终局行上）；门侧自带的 `stripVerdictDecor`/`VERDICT_LINE`/`EMPTY_TEMPLATE` 三份副本**已删**
  （导入先例 = `scripts/lib/hitl-provenance.mjs` 早已 import pack 的 TS lib）。
- **先看红**：新增跨实现一致契约测试两例（含"第 2 轮标题行 PASS + 附录第 1 轮 FAIL""附条件 PASS"
  "无判定行"等六种文本）——修前**如实报红**（一致例红：pack PASS × 门 false）；委托后 **528/528 绿**。
- **真数据同判**（三场）：`drt_anthropic-claude-release-line-timeline` pack=FAIL × 门 false ✓、
  `drt_cambricon-commercial-sustainability` pack=PASS × 门 true ✓、`drt_ai-coding-sec-practices`（用户的在飞 run）
  pack=PASS × 门 true ✓。
- **判据传导（预期后果，非回归）**：同场复跑 node-gate——cambricon 那场 readiness 由（旧副本的）
  FAIL 变 PASS，于是**唤醒**了此前记 N/A 的门②（present 声明）与门③（HITL2 拍板行），并因该 run
  的交付记账形态而判红：这是**该 run 自身的真实缺口**（代理代答后未落 present 声明），不是本修法引入的红。
  e2e 那场门A 维持红（无升级记账，判得对）。
- **残留**：无（同判由契约测试长期钉住；本卡的"两版实现"从此只剩一份）。
