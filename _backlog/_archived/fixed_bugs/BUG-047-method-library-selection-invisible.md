---
status: 已修
severity: P1
opened: 2026-11-11
---

# BUG-047：方法库选中条目没有任何视觉标记——选区样式被浏览器整条丢弃

> 严重级别：P1｜发现：2026-11-11｜状态：已修 — 根因 = `var()` 后拼十六进制 alpha 的声明在计算值阶段整条失效；修复 = `LibraryRow` + `libraryRowStyle`（color-mix 选中态：tint + 边线 + 左侧 accent bar + 名字加重）+ 焦点环分离 + 源码扫描守卫，真机 3084 隔离档 computed 值/截图双证（2026-11-11，去向：none — 机械修复，审查：agent 自审 + 真机证据）

## 症状

方法库左侧条目列表（「我的库」/「内置参考」两段）点另一条后，右侧详情会跟着换，但**列表上看不出哪一条被选中**：所有条目外观完全一致。用户看到的唯一白框来自浏览器焦点环（停在最后点击/聚焦的那一行），会把"焦点"误读成"选中"——截图里右侧详情是「事实核查」，白框却停在「领域地图」。

选中项是写操作的作用对象（删除、设为默认都吃 `selected`），选区不可见 = 用户可能对着 A 按删除、实际删掉 B。

## 复现

1. 起通道，打开任一会话的方法库 tab（或「方法编辑」会话的方法库）；
2. 点「领域地图」，再点「法令清单」（或任意另一条）；
3. 观察：右侧详情换了，左侧无任何高亮/底色/边线变化；只有焦点环跟着最后一次点击走。

## 根因（假设 → 已证）

`MethodLibraryView.tsx` 的选中态用字符串拼接把 alpha 挂在 CSS 变量后面：

```ts
{ background: 'var(--dsw-alias-brand-primary)0f', borderColor: 'var(--dsw-alias-brand-primary)30' }
```

`var()` 替换后是"完整颜色值 + 孤立 `0f` token"，声明在**计算值阶段整条失效**（invalid at computed-value time），React inline style 不做校验、浏览器静默丢弃——结果背景回到 `none`、边框回到初始值，外观与未选中一模一样。

隔离实验（裸 CDP，`runtime/smoke-workspace/css-var-alpha-check.mjs`）：

| 声明 | 计算值 |
|---|---|
| `background: var(--brand)0f; border: 1px solid var(--brand)30` | `background: rgba(0,0,0,0)`、`border-style: none`（整条丢弃） |
| `background: color-mix(in srgb, var(--brand) 6%, transparent)` | `color(srgb .30 .42 .99 / .06)`（生效） |

同一写法在 `views.tsx` 另有 5 处（错误框边线、字段聚焦环、说明框边线、活动字段底色两处），全部静默失效——源码扫描共命中 **9 个声明**。

## 牵出的失败类

**CSS 变量 + 手拼 alpha 的静默失效**：类型系统只认 `CSSProperties` 字符串，浏览器只丢声明不报错，typecheck 与既有测试都不咬。守卫面 = 扫描 pack client 源码里 `var(--…)<hex>` 的拼接（负例先红），并把"半透明"统一走 `color-mix()`。

## 修复判据

- 选中态一眼可辨：底色 tint + 边线 + 左侧 accent bar + 条目名加重，深浅色两套主题都成立；
- 焦点环 ≠ 选中态：焦点只画外圈，不冒充选区；
- pack client 源码里 `var(--…)<hex>` 拼接归零，并有 keyless 契约测试咬住该模式（先见红）；
- 真机截图：同一列表点两条能看出选中切换（通道若因在飞 run 不可重启，改用临时独立核心档截图并注明）。

## 修复关联

- 改动：`src/client/MethodLibraryView.tsx`（两段列表改用 `LibraryRow`）、`src/client/method-library/views.tsx`
  （新增 `LibraryRow`；5 处 alpha 拼接改 `color-mix`）、`src/client/method-library/styles.ts`
  （`libraryRowStyle`：tint/边线/accent bar）、`src/client/styles.ts`（`installMethodLibrarySelectionStyles`：
  hover/焦点环/过渡）、`src/client/index.ts`（注册该 effect）；
- 测试：`tests/cockpit/method-library-selection.test.mjs`（源码扫描 + 纯函数 + 渲染三件；负例留证块在文件头）；
- 证据：隔离实验 `runtime/smoke-workspace/css-var-alpha-check.mjs`（声明被丢弃的 computed 值）、
  `pnpm test` 1181 绿、`pnpm verify` 全绿、`pnpm typecheck` 绿；
- 真机（隔离实例 3084，`DSH_DEV_HOME=runtime/verify-home`，不碰在飞通道）：点「领域地图」后该行
  `aria-current="true"`、`background: color(srgb .48 .67 1 / .12)`、`border-color: …/.45`、
  `box-shadow: inset 3px 0 0`、名字 `font-weight: 600`；原选中行回落到透明/400。截图 =
  `runtime/smoke-workspace/selection-fixed.png`（该实例已收摊；主通道待无在飞 run 时重建镜像才生效）。
