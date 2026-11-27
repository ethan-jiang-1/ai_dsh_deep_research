---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-454：1280×720 视口下「研究配置」面板「换一条」下拉菜单向下展开溢出底部视口被裁切

> 严重级别：P2 ｜ 发现：2026-11-27 ｜ 状态：已修（`methodPicker <Menu>` 启用 `portal` 并限制列表最大高度可滚动） ｜ 去向：implemented — [2026-11-27-cockpit-ux-ui-blindspots-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-blindspots-fixes.md)

## 症状

在常见的笔记本视口尺寸（`1280×720`）下打开右栏「研究配置」页签，由于顶部「项目默认」面板占据上方约 550px 高度，「本次研究」卡片的「换一条」按钮位于屏幕偏下位置（约 `y=550`）。点击「换一条」展开 `<Menu>` 时菜单固定向下弹出，直接超出视口底部被截断，下方菜单项（如自定义方法条目）完全不可见且无向上翻转或内滚。

## 根因与边界

- [ResearchConfigTab.tsx](../../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx)（`L354`）使用 `<Menu open={switchOpen} anchor={...} align="end">` 未传视口碰撞翻转 / portal / 最大高度策略（对比 `DefaultsPanel` 内 `SelectMenu` 传了 `portal`）；
- 现场实测（`1280×720`）：菜单边界矩形为 `{ x: 1062.3, y: 580.23, width: 144, height: 212 }`，底边 `792.23px > 720px`，溢出视口达 `72px`。
- 现场证据：`runtime/smoke-workspace/ux-audit-r2-2026-11-27/batch-a.log`（`FAIL S1 研究配置「换一条」菜单打开且完全在 1280×720 视口内`）与截图 `runtime/smoke-workspace/ux-audit-r2-2026-11-27/screenshots/r2-s1-config-switch-menu.png`。

## 复现

```sh
# 在 1280×720 视口下打开有绑定 run 的会话 → 右栏「研究配置」→ 点击「换一条」
# 实测：下拉菜单 bottom = 792px > viewportHeight 720px，第 4 项之后被底部截断
node --import tsx/esm ~/.gemini/antigravity-cli/brain/76cb36c3-4eb9-4406-a90c-f3598216d26f/scratch/r2_batch_a.mjs
```

## 修复判据

1. 为「换一条」`<Menu>` 启用与 `SelectMenu` / vendor `Menu` 对齐的 portal + 视口边缘翻转/限高滚动策略，确保在 `1280×720` 乃至更矮窗口下全部菜单项可完整点击；
2. 在浏览器端到端检查中验证 `menuBox.bottom <= viewportHeight` 与 `menuBox.top >= 0`。

## 分诊与授权

- 严重级：P2 — 标准 720p 笔记本屏幕下半部分菜单项直接不可达。
- 表面 / 边界：`ResearchConfigTab.tsx`（`switchMenu`）。
- 授权：已授权并在 2026-11-27 批量修复落地。

## 根因

`ResearchConfigTab.tsx` 中 `methodPicker` 的 `<Menu>` 未开启 `portal` 也未限定 `listClassName` 最大高度，非 portal 模式禁用视口边缘翻转并在 720p 下溢出底部 72px。

## 修法

在 `config.module.css` 新增 `.switchMenuList { max-height: min(320px, calc(100vh - 32px)); overflow-y: auto; }`，并在 `ResearchConfigTab.tsx` 的 `methodPicker` `<Menu>` 传入 `portal listClassName={css.switchMenuList ?? ''}`。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/ResearchConfigTab.tsx",
    "packages/deep-research-pack/src/client/research-config/config.module.css",
    "tests/cockpit/client/research-config-source.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/cockpit/client/research-config-source.spec.mjs",
    "exit": 1,
    "output": "methodPicker <Menu> 必须启用 portal"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": { "path": "tests/cockpit/client/research-config-source.spec.mjs" }
}
```
