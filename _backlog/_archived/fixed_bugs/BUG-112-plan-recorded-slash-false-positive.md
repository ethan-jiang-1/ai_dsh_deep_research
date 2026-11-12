---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-112：planVersionsOf 的 recorded 斜杠字段无上下文——正文 bullet `- 参考 / v1 /` 被当重写记录，制造 versionConflicted

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — recorded 斜杠分支要求重写/日期上下文，正文 `- 参考 / v1 /` 不报冲突（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/run-version.ts`（`planVersionsOf` 的 recorded
> 正则：`^[ \t]*[-*][^\n]*?(?:图版本\s*v?(\d+)|[/｜|]\s*v(\d+)\s*[/｜|])`）。

## 症状

plan 头部声明 v3，正文备注有一个普通 bullet 含 `/ v1 /`：

```json
{
  "currentPlanVersion": 3,
  "recordedPlanVersion": 1,
  "versionConflicted": true,
  "label": "版本声明不一致（头 v3 / 记录 v1） · 未交付"
}
```

`- 参考 / v1 / 旧方案示例` 被 recorded 正则的第二分支（斜杠字段）当成重写记录；
`versionConflicted` 假报，snapshot anomaly/rerun/delivered 状态也受 recorded 值影响。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/plan-recorded-slash-false-positive.mjs
```

## 影响与触发面

- 任何正文 bullet 里出现 `/ vN /`（版本对照、示例、旧方案引用）都会被当重写记录；
- 头部/记录冲突是版本面最重要的诚实信号；假冲突让用户以为 plan 自相矛盾；
- `effectivePlanVersion = recorded ?? header` → 当前版本可能被拉回旧号；
- 与 BUG-102（正文 `图版本：vN` 覆盖头部）同族：版本解析的范围/上下文过宽。

## 根因（已证）

- recorded 的斜杠分支只要求 `[-*]` 开头 + 任意文本 + `/ vN /`，没有「重写记录」上下文/表头；
- 注释说「模型常写成 日期 / vN / 动作」，但正则无法区分模型记录与正文示例；
- 与 `图版本 vN` 分支共用，冲突判断没有来源可信度。

## 修法候选（未实施）

1. 斜杠分支要求同一 bullet 含重写记录语义（如「重写」「图版本」）或位于固定记录节；
2. 或只认 `图版本 vN` 分支，斜杠字段作为兼容但更高门槛（日期 + 动作）；
3. 把正文示例排除在记录节之外，或让冲突判断只信头部/记录节。

倾向 1/2；本卡不改代码。

## 修复判据

- [ ] 正文 `- 参考 / v1 / 旧方案示例` 不产生 recorded/versionConflicted；
- [ ] 真正的重写记录（日期 / vN / 动作）仍被识别；头部 v3 + 真实记录 v1 仍报冲突；
- [ ] 复现脚本断言按所选修法通过；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 plan 正文示例的分布；不证明头部无 `##`/代码块内的记录形态；
- 不证明 BUG-102 的头部范围修复（另一卡）。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/run-version.test.mjs` BUG-112。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
