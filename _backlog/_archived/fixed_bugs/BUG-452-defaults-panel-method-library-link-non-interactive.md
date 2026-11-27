---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-452：DefaultsPanel「方法库 ›」伪链接Styled为可点导航链接却无点击响应与键盘可达性

> 严重级别：P1 ｜ 发现：2026-11-27 ｜ 状态：已修（改为可聚焦 `<button>` 并打通右栏配置与工作台跳转至方法库链路） ｜ 去向：implemented — [2026-11-27-cockpit-ux-ui-blindspots-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-blindspots-fixes.md)

## 症状

右栏「研究配置」页签与 Research Hub「研究透镜」页签底部的「项目默认」面板第一行（「方法」行）右侧展示蓝色带右箭头文案「方法库 ›」。该元素外观与交互链接完全一致，但实际鼠标点击无任何反应，也无法通过 `Tab` 键聚焦或触发跳转。

## 根因与边界

- [DefaultsPanel.tsx](../../../packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx)（`L133`）将其写死为无事件处理的静态 `<span>`：
  `<span className={css.methodLink} title={t('defaultsMethodHint')}>{t('defaultsMethodLibraryLink')}</span>`；
- [defaults.module.css](../../../packages/deep-research-pack/src/client/defaults/defaults.module.css)（`L219-L224`）为其配置了链接语义色 `color: var(--dsw-alias-link)`；
- 现场证据：`runtime/smoke-workspace/ux-audit-r2-2026-11-27/deep-hunt.log`（`FAIL H1 ... nav=false dom={"tag":"SPAN","role":null,"cursor":"auto","color":"rgb(65, 118, 230)","tabIndex":-1}`）与截图 `runtime/smoke-workspace/ux-audit-r2-2026-11-27/screenshots/r2-delta-defaults-warnings.png`。

## 复现

```sh
# 打开任一会话右栏「研究配置」（或 Hub「研究透镜」底部工作区项目默认），点击「方法库 ›」
# 实测：DOM 为 <span>，无 cursor: pointer / tabIndex / onClick，页面无任何导航动作
node --import tsx/esm ~/.gemini/antigravity-cli/brain/76cb36c3-4eb9-4406-a90c-f3598216d26f/scratch/r2_deep_hunt.mjs
```

## 修复判据

1. 将「方法库 ›」改为语义化 `<button type="button">` 并注入真实跳转回调（会话内打开顶部「方法库」view 或切换至 Hub「方法库」tab；若当前场景无法切换则不应使用链接蓝+`›`伪装可点击）；
2. 补单测或浏览器验证点击后真实打开方法库视图且键盘可聚焦。

## 分诊与授权

- 严重级：P1 — 用户明确误认为可点击导航入口却完全死链（且出现在右栏与工作台两处）。
- 表面 / 边界：`DefaultsPanel.tsx` + `ResearchConfigTab` / `ResearchHubPanel` 导航注入。
- 授权：已授权并在 2026-11-27 批量修复落地。

## 根因

`DefaultsPanel.tsx` 将「方法库 ›」渲染为无事件监听的静态 `<span>` 并套用链接语义色，既无 `onClick` 也不在 Tab 焦点顺序中。

## 修法

- `DefaultsPanel` 新增可选 `onOpenMethodLibrary` 回调，有回调时渲染 `<button type="button" data-testid="defaults-method-library-link">`（含 `:focus-visible` 焦点环），无回调时不伪装链接；
- 在 `ResearchHubPanel` 透镜页内切 `setTab('methods')`；在 `ResearchConfigTab` 通过 `index.ts` 桥接 `openHubTab('methods')` 直达工作台「方法库」页签。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx",
    "packages/deep-research-pack/src/client/defaults/defaults.module.css",
    "packages/deep-research-pack/src/client/research-config/useConfigFeed.ts",
    "packages/deep-research-pack/src/client/ResearchConfigTab.tsx",
    "packages/deep-research-pack/src/client/ResearchHubPanel.tsx",
    "packages/deep-research-pack/src/client/index.ts",
    "tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs",
    "tests/cockpit/client/research-hub-panel.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs",
    "exit": 1,
    "output": "false == true（DefaultsPanel 未渲染 data-testid=\"defaults-method-library-link\" 的可点击 button）"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": { "path": "tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs" }
}
```
