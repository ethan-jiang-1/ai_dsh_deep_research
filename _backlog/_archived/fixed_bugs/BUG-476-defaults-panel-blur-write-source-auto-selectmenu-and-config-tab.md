---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-476：`DefaultsPanel` 与 `ResearchConfigTab` 写盘/状态缺陷：失焦误写并跨会话漏草稿、信源「自动」误清权威与时效、`SelectMenu` 裁切及配置页吞读错

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

1. **受众输入框失焦触发无效写盘并跨会话泄漏草稿**：在 `DefaultsPanel` 聚焦「面向谁」输入框后不做任何改动直接失焦（或按 `Tab` 经过），即发出真实 `/research-defaults` 写盘 RPC、递增 `revision` 并弹出「已保存 · vN」；若在会话 A 输入草稿未失焦直接切到会话 B，会话 A 的未保存文字保留在会话 B 输入框中并在失焦后写入会话 B；
2. **信源行内「自动」按钮静默清空权威与时效**：用户设置了「权威 = 一手优先」「时效 = 近 12 个月」，再点击信源类型药丸旁的「自动」按钮想重置信源类型时，权威与时效被一并静默清空；
3. **`SelectMenu` flex 尺寸类挂错节点导致窄栏裁切**：在 320–380px 右栏或紧凑双列模式下，时效/权威下拉菜单与受众输入框向右溢出被裁切；
4. **`ResearchConfigTab` 静默吞读错与失步**：`method-library.md` 读取失败（`libraryRead === 'unreadable'`）时「换一条」菜单静默隐藏全部工作区方法且零报错；发送 `use-now` 期间（2.5s）未禁用菜单致重复点击被静默吞掉；点击页签「刷新」不刷新项目默认与当前研究采用状态；切换方法后「本场研究」卡片不重读 `question.md`。

## 分诊与授权

- 严重级：P1 — 直接造成误写磁盘配置、跨会话配置污染、用户已设项被静默清空及读错静默隐藏。
- 表面 / 边界：`packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx`、`packages/deep-research-pack/src/client/defaults/SelectMenu.tsx`、`packages/deep-research-pack/src/client/defaults/defaults.module.css`、`packages/deep-research-pack/src/client/ResearchConfigTab.tsx`、`packages/deep-research-pack/src/client/research-config/useConfigFeed.ts` / client
- DSH 不变量：fail-loud · Identity, initial state & disposal
- 触及面：pack 公共行为 — 项目默认配置与研究配置页签核心行为
- 授权：等人拍板（触及 pack 公共行为）
- 批：2026-11-28-cockpit-wire-contracts-and-ux

## 复现

复现状态：稳定 — 源码确定性复现
边界：client (`DefaultsPanel` / `SelectMenu` / `ResearchConfigTab` / `useConfigFeed`)

1. [DefaultsPanel.tsx](../../../packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx)（`L66-L70,L93-L101`）：`commitAudience` 未比较 `next === (state.value.output?.audience ?? '')`；`useEffect` 依赖 `[state.value.output?.audience]` 而未包含 `sessionId`；
2. [DefaultsPanel.tsx](../../../packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx)（`L238-L246`）：信源类型药丸旁的 `defaults-source-auto` 调用 `unset(['source'])` 整轴删除而非仅清空 `families`；
3. [SelectMenu.tsx](../../../packages/deep-research-pack/src/client/defaults/SelectMenu.tsx)（`L38,L47-L50`）：将调用方传入的 `className`（`controlGrow`/`controlFixed`/`controlAuthority`）挂在内层 `<button>` 而非 `<Menu className={...}>` 外层 flex item，且 `.subRow`/`.subRowCompact` 无 `flex-wrap: wrap`；
4. [ResearchConfigTab.tsx](../../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx)（`L30-L56,L74-L108`） 忽略了 `useConfigFeed` 返回的 `libraryRead` 与 `sending`，页签 `refresh` 只调 `reload(sessionId)`，且 [useConfigFeed.ts](../../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts)（`L158-L175`） 缺少 `try/catch`。

## 根因（假设 → 已证）

1. `commitAudience` 缺少脏值判定（dirty check），草稿状态重置漏掉 `sessionId` 维度；
2. `defaults-source-auto` 放在 `families` 药丸行内却执行整轴 `unset(['source'])`，视觉范围与实际破坏范围不匹配；
3. `SelectMenu` 把外层布局类传给内层 `<button>` 导致外层 `<span class="Menu_root">` 失去 `flex`/`min-width: 0`；
4. `ResearchConfigTab` 在瘦身重构时丢掉了 `libraryRead` / `sending` 消费及 `defaults`/`adoption` 联动刷新。
- 根因证据：逐行核对上述 5 个源文件与 vendor `Menu.tsx:564`。
- DSH 不变量：fail-loud（吞 `libraryRead === 'unreadable'` 与 `sending` 期间点击）；Identity（`audience` 草稿跨会话残留）。

## 牵出的失败类

- 同机制第 1 次（表单草稿未按 `sessionId` 复位 & 失焦无 dirty check）｜处置：类修

## 修法

1. `DefaultsPanel`：`commitAudience` 先比较 `next === (state.value.output?.audience ?? '')`，相等直接返回；`useEffect` 依赖补充 `sessionId`；`defaults-source-auto` 改为仅清除 `families`（保留 `authority` / `recency`，仅当三者皆空时 `unset(['source'])`）；
2. `SelectMenu`：将布局 `className` 传给 `<Menu className={className}>` 并让内层 `<button>` `width: 100%`，`.subRow`/`.subRowCompact` 允许 `flex-wrap: wrap`；
3. `ResearchConfigTab` & `useConfigFeed`：显性渲染 `libraryRead === 'unreadable'` 告警与重试；`sending` 时禁用「换一条」按钮；页签 `refresh` 同步刷新 `reload`、`props.defaults.refresh` 与 `retryAdoption`；`use-now` 完成后刷新 `adoption`；`useConfigFeed` 异步读加 `try/catch`；`sessionId === undefined` 不渲染无响应的 `methodPicker`。

## 修复判据

1. 单测：`DefaultsPanel` 未修改 `audience` 时 blur 不调用 `execute`；会话 A 键入未提交草稿切到会话 B 后输入框清空；
2. 单测：已设 `authority='primary_first'` + `families=['official']` 时点 `defaults-source-auto`，写盘保留 `authority` 仅移除 `families`；
3. 单测：`ResearchConfigTab` 在 `libraryRead === 'unreadable'` 时显性展示错误提示，`sending === true` 时禁用切换菜单，页签 `refresh` 触发三路刷新；
4. 窄栏（320px）与紧凑双列（930px）下无水平溢出或裁切。

## 修复关联

去向：implemented — [2026-11-28-cockpit-wire-contracts-and-ux-fixes](../../../notes/implemented/2026-11-28-cockpit-wire-contracts-and-ux-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx",
    "packages/deep-research-pack/src/client/defaults/SelectMenu.tsx",
    "packages/deep-research-pack/src/client/defaults/defaults.module.css",
    "packages/deep-research-pack/src/client/ResearchConfigTab.tsx",
    "packages/deep-research-pack/src/client/research-config/useConfigFeed.ts",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs",
    "tests/cockpit/client/research-config/config-feed-behavior.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs tests/cockpit/client/research-config/config-feed-behavior.spec.mjs",
    "exit": 1,
    "output": "BUG-476: unmodified audience blur emitted unset output; source-auto wiped authority/recency; ResearchConfigTab hid unreadable library error"
  },
  "green": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs tests/cockpit/client/research-config/config-feed-behavior.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs"
  }
}
```
