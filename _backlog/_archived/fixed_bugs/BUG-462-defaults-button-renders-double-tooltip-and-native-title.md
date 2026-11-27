---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-462：DefaultsButton 同时渲染自定义 Tooltip 与原生 button title 属性导致悬停双重浮窗

> 严重级别：P2 ｜ 发现：2026-11-27 ｜ 状态：已修（移除内部 `<button>` 重复原生 `title` 属性，保留外层 `<Tooltip>` 与 `aria-label`） ｜ 去向：implemented — [2026-11-27-cockpit-ux-ui-round3-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-round3-fixes.md)

## 症状

将鼠标悬停在对话输入框左侧的「研究默认（`[data-testid="deep-research-defaults"]`）」状态按钮上时，组件在渲染 `@deepseek-ai/dsh-client-ui-primitives` 自定义 `<Tooltip label={tooltip}>`（`[role="tooltip"]`）的同时，还在内部的 `<button>` DOM 节点上保留了原生的 `title={tooltip}` 属性。桌面端浏览器停留片刻后会在自定义深色浮窗上方叠出第二层浏览器原生系统 Tooltip；且当 `audience` 或默认方法名包含无空格长串时，tooltip 横向撑宽明显，但两者叠加尤为刺眼。

- 真实浏览器实证：`runtime/smoke-workspace/ux-audit-r3-2026-11-27/batch2.log`（`S2.3a {"text":"研究默认：已设 2 项","hasNativeTitle":true,"nativeTitle":"方法默认：...","roleTooltipCount":1,...}`）与截图 `runtime/smoke-workspace/ux-audit-r3-2026-11-27/screenshots/r3-s2-defaults-btn-hover.png`。

## 根因与边界

- 源码定位：[DefaultsButton.tsx](../../../packages/deep-research-pack/src/client/defaults/DefaultsButton.tsx) 渲染树：
  `<Tooltip label={tooltip} side="top"><button ... aria-label={...} title={tooltip} ...>`
- 无障碍描述已由 `aria-label` 承载、悬浮提示已由 `<Tooltip label={tooltip}>` 承载，但 `<button>` 额外携带 `title={tooltip}`，造成自定义 Tooltip 与浏览器原生 `title` 浮窗双重触发（同组件库里原生按钮带 `<Tooltip>` 时不应再叠原生 `title`）。

## 复现

```sh
# 1. 打开任意研究会话，悬停输入框左下角 `[data-testid="deep-research-defaults"]` 按钮
# 2. 检查 DOM 可见 `<button title="...">` 与 portaled `[role="tooltip"]` 同时生效，桌面停留约 1s 出现双浮窗叠压
```

## 修复判据

1. 移除 `DefaultsButton.tsx` 内 `<button>` 上的重复原生 `title={tooltip}` 属性（保留 `<Tooltip label={tooltip}>` 与 `aria-label`，并确认无超长无空格文本溢出问题）；
2. 在已有 `DefaultsButton` 组件测试里增加断言：渲染后的 button 不含 `title` 属性（防止回归重加）。

## 分诊与授权

- 严重级：P2 — 输入框高频按钮悬停出现双层 Tooltip 叠压，影响桌面交互观感。
- 表面 / 边界：`packages/deep-research-pack/src/client/defaults/DefaultsButton.tsx`。
- 授权：已授权并在 2026-11-27 批量修复落地。

## 根因

`DefaultsButton.tsx` 在使用 DSH 自定义 `<Tooltip label={tooltip}>` 包裹按钮的同时，仍在 `<button>` 元素上多传了原生 `title={tooltip}` 属性，触发浏览器与组件两套浮窗叠压。

## 修法

移除 `DefaultsButton.tsx` 内 `<button>` 的 `title={tooltip}` 属性，完整保留外层 `<Tooltip label={tooltip} side="top">` 与 `aria-label`。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/defaults/DefaultsButton.tsx",
    "tests/cockpit/shared/defaults-ui.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/cockpit/shared/defaults-ui.spec.mjs",
    "exit": 1,
    "output": "DefaultsButton <button> 不得再带重复的原生 title 属性"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": { "path": "tests/cockpit/shared/defaults-ui.spec.mjs" }
}
```
