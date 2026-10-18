---
status: 排查中
severity: P2
opened: 2026-10-18
---

# BUG-036：驾驶舱摘要层缺「审查未决项已按上限升级到本次审阅」一行（BUG-033 同族，自然复现 1 次）

> 状态：**排查中** — 自然复现 1 次；**不作为 BUG-033 重开**（已修卡不重开，复发 = 引用旧卡的新卡）。

## 症状

`client-load-smoke` 的「业务摘要层 = 盘侧 brief-fold 真值（五问逐行对账）」红：

```
FAIL 业务摘要层 = 盘侧 brief-fold 真值（五问逐行对账）（缺行：审查未决项已按上限升级到本次审阅）
```

现场：本轮 bound session = `drt_cambricon-commercial-sustainability`（P6-a A/B run，标准深度，review 有未决项
按上限升级的记账）；同跑其余摘要层断言与状态面断言（证据计数、交付状态、停靠点诚实线、问题行）均 PASS。

## 与 BUG-033 的关系

- BUG-033（[已修](../_archived/fixed_bugs/BUG-033-cockpit-brief-layer-intermittent-missing-delivered-lines.md)）
  的症状 = 缺"已交付态"三行，机制 = **读点部分水化**，闭环用**合成确定性红**取得；
- 本卡症状 = 缺**另一条**分支文案（`delivered === false` + 审查未决项升级态），同族但不同分支；
  BUG-033 的合成红没覆盖到这条分支 → 本次是它的自然复现补集。

## 复现率（实测）

**确定性红**：改 BUG-035 的搜索兜底之后、不传 `--session` 连跑 3 次 `client-load-smoke`，**3/3 都红在这一行**
（同跑其余摘要层断言与状态面断言全绿）。→ 不是 BUG-033 那种水化间歇，**按需求即复现**，可当确定性缺陷定位。

## 下一步（定位手段）

1. ~~复现率测量~~ → **已测：确定性红（3/3，见上）**；
2. 对照 BUG-033 的读点水化结论：在冒烟里同时打印 UI 侧 `deriveBusinessBrief` 的输入事实
   （`delivered`/review 未决项计数）与盘侧折算结果，一次分清"输入不齐" vs "渲染丢行"；
3. 未定位前不动 `brief-fold`（避免用重试掩盖——`scripts/AGENTS.md` §retry 白名单）。
