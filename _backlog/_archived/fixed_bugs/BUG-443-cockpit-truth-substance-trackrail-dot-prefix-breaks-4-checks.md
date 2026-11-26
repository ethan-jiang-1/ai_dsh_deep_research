---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-443：TrackRail 改用 SVG StateDot 后 cockpit-truth-substance S23/S24/S27/S28 四场景因匹配「? 阶段」全部失败

> 严重级别：P1 ｜ 发现：2026-11-27 ｜ 状态：已修 — 结论：cockpit-truth-substance 改读 data-step-key/data-step-state 属性与后缀 ?，恢复 19/19 PASS；去向：implemented — [2026-11-27-cockpit-ux-ui-audit-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md)

## 症状

运行既有真浏览器门禁 `cockpit-truth-substance.entry.mjs`，15/19 通过、4 项失败（退出码 `1`）：
- `FAIL  S23 综合不 done`
- `FAIL  S24 侦察不 done`
- `FAIL  S27 挖掘不 done`
- `FAIL  S28 挖掘不 done`

## 根因与边界

- M3 重构后的 [TrackRail.tsx](../../../packages/deep-research-pack/src/client/research-status/TrackRail.tsx)（`L62-L64`） 用 SVG `<StateDot appearance="step" />` 替换了步骤名前的前缀符号 `✓` / `?`，仅在 `unknown` 时在标签**后面**追加 `' ?'`（DOM `textContent` 形如 `综合 ?`、`侦察 ?`、`挖掘 ?`）；
- [cockpit-truth-substance.entry.mjs](../../../checks/smoke/cockpit-truth-substance.entry.mjs)（`L220-L260`） 的四处断言仍用 `/\?\s*综合/`、`/\?\s*侦察/`、`/\?\s*挖掘/` 要求 `?` 出现在步骤名之前，全部误判为红。
- 现场证据：Stage 1 实跑记录（15/19 PASS，4 FAIL）。

## 复现

```sh
node --import tsx/esm checks/smoke/cockpit-truth-substance.entry.mjs --scenario S23,S24,S27,S28
# 实测 exit 1: FAIL S23 综合不 done / S24 侦察不 done / S27 挖掘不 done / S28 挖掘不 done
```

## 修复判据

1. 为 `TrackRail` 步骤徽章补充语义化 `data-step-id` / `data-step-state`（或同步对齐 `cockpit-truth-substance.entry.mjs` 断言与 M3 DOM 形态），避免仅靠 `✓/?` 字符位置耦合断言；
2. `cockpit-truth-substance.entry.mjs` 全场景 19/19 绿过。

## 分诊与授权

- 严重级：P1 — 既有浏览器回归 `cockpit-truth-substance` 4/19 场景因文本前缀脱节持续红灯。
- 表面 / 边界：`checks/smoke/cockpit-truth-substance.entry.mjs` 与 `TrackRail` 语义属性契约。
- 授权：已随 UX/UI 全量修复批授权直接落地；批 = `2026-11-27-cockpit-ux-ui-audit-fixes`。

## 根因

`TrackRail` 渲染 SVG `StateDot` + 后缀 ` ?`（如 `综合 ?`），而 `cockpit-truth-substance` 仍匹配旧字符前缀 `/\?\s*综合/`。

## 修法

在 `cockpit-truth-substance.entry.mjs` 新增 `stepInfo(page, key)` 直接断言 `[data-step-key][data-step-state="unknown"]` 与后缀 `?`，并在 `protocol-radar.spec.mjs` 锁定该语义契约。真浏览器重跑 `cockpit-truth-substance` 19/19 PASS。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "checks/smoke/cockpit-truth-substance.entry.mjs",
    "tests/cockpit/client/research-status/protocol-radar.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth-substance.entry.mjs --scenario S23,S24,S27,S28",
    "exit": 1,
    "output": "cockpit-truth-substance: 8/12 PASS (FAIL S23/S24/S27/S28)"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/research-status/protocol-radar.spec.mjs"
  }
}
```
