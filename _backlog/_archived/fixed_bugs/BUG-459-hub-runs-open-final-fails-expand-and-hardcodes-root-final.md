---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-459：ResearchHub 点击 Run 档案「打开终稿」返回对话后右栏未展开且硬编码根路径 final.md

> 严重级别：P1 ｜ 发现：2026-11-27 ｜ 状态：已修（修正 `backToChat` 调用序、新增 `preferredFinalPathOf` 与 `openResourceWhenMounted` 重试展开右栏） ｜ 去向：implemented — [2026-11-27-cockpit-ux-ui-round3-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-round3-fixes.md)

## 症状

在 `Orca 研究工作台（Research Hub）` → `Run 档案（RunsView）` 中点击某条研究（尤其是右栏原本收起时，或 `archive/` / `_abandoned/` 下仅有 `final/readable-v1.md` / `final/v1.md` 而根目录下无 `final.md` 的研究档案）卡片底部的「打开终稿」按钮后，页面切换回主对话界面，但右侧栏保持收起状态（看不见打开的终稿页签），且目标归档报告正文并未显示出来。

- 真实浏览器实证：`runtime/smoke-workspace/ux-audit-r3-2026-11-27/batch2.log`（`FAIL S2.2c` 与 Console 报错 `[research-final] openResource 失败 Error: sidebarRight: no session surface is mounted`）与截图 `runtime/smoke-workspace/ux-audit-r3-2026-11-27/screenshots/r3-s2-hub-open-archived-final.png`（Hub 返回对话后右栏未展开，主窗停留原会话消息列表，`ARCHIVED_FINAL_OK` 未加载）。

## 根因与边界

- [ResearchHubPanel.tsx](../../../packages/deep-research-pack/src/client/ResearchHubPanel.tsx) 在渲染 `RunsView` 的 `onOpenFinal` 时写死调用序：
  `openFinal(activeSessionId, `${rootPath}/final.md`); backToChat()`
- 问题有三层叠加：
  1. **调用时机错误导致 `openResource` 必抛异常**：在 `Research Hub`（`main` 全局面板）打开状态下，会话面处于卸载/未挂载态（`sidebarRight: no session surface is mounted`）。先调 `openFinal(...)` 再调 `backToChat()`，每次点击都会在 `index.ts` `openFinal` 的 `try/catch` 里抛 `Error: sidebarRight: no session surface is mounted` 并打 `console.error`，随后才回到对话——终稿打开动作被彻底丢弃；
  2. **硬编码 `${rootPath}/final.md`**：对于仅保留 `final/readable-v1.md` 或 `final/v1.md` 的交付/归档/停放 run（`RunsCatalogEntry` 本身已算出 `latestReaderVersion` / `latestFinalVersion` / `hasFinalMd`），强制拼接 `${rootPath}/final.md` 可能根本不命中在盘终稿路径；
  3. **未展开收起的右栏（[index.ts](../../../packages/deep-research-pack/src/client/index.ts) `openFinal`）**：即使会话面已挂载，`openFinal` 仅调用 `scoped.sidebarRight.openResource(...)`（不同于 `revealStatusTab` 调用 `scoped.sidebarRight.openTab(...)`），右栏原处于收起态时也不会主动展开。

## 复现

```sh
# 1. 启动 DSH Web 并打开任意有 archive/drt_*/final/readable-v1.md（或收起右栏后的 active run）的工作区
# 2. 点击左侧「研究工作台」→「Run 档案」→ 在目标 run 卡片点击「打开终稿」
# 3. 观察返回对话后的页面：右侧栏仍收起，终稿页签与正文未打开呈现
```

## 修复判据

1. `RunsView` / `ResearchHubPanel` 的 `onOpenFinal` 根据 `RunCatalogEntry` 在盘事实选择实际目标路径（`readable-v<N>.md` → `final/v<N>.md` → `final.md`），避免硬编码不存在的 `${rootPath}/final.md`；
2. 点击「打开终稿」不仅调用 `openResource`，还能确保右栏处于展开并聚焦到该终稿页签；
3. 补齐浏览器/组件回归用例（验证右栏原本收起态及 `archive/` 归档 run 点击「打开终稿」均可真实展开并展示终稿正文）。

## 分诊与授权

- 严重级：P1 — 工作台主入口「打开终稿」对归档档案与收起态右栏均静默无响应，核心浏览链路断开。
- 表面 / 边界：`packages/deep-research-pack/src/client/ResearchHubPanel.tsx`、`packages/deep-research-pack/src/client/research-hub/RunsView.tsx`、`packages/deep-research-pack/src/client/index.ts`（`openFinal`）。
- 授权：已授权并在 2026-11-27 批量修复落地。

## 根因

`ResearchHubPanel` 先于 `backToChat()` 调 `openFinal()`（此时全局 Hub 占用 `main`，`sidebarRight` 无会话挂载必抛错），`RunsView` 硬编码 `${rootPath}/final.md` 忽视已算出的 `latestReaderVersion`/`latestFinalVersion`，且 `index.ts` `openFinal` 未在右栏收起时主动展开。

## 修法

- 在 `runs-catalog.ts` 导出 `preferredFinalPathOf`（优先级：`readable-vN` > `final/vN` > `final.md`），`RunsView` 直接透传真实路径；
- `ResearchHubPanel` 改为先调 `backToChat()` 再调 `openFinal(activeSessionId, finalPath)`；
- 在 `startup.ts` 导出 `openResourceWhenMounted` 并接入 `index.ts` `openFinal`（遇 `no session surface is mounted` 短间隔重试并在插件 dispose 时清理定时器，成功后若 `isExpanded() === false` 调用 `toggleExpanded()`）。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/workspace/runs-catalog.ts",
    "packages/deep-research-pack/src/client/research-hub/RunsView.tsx",
    "packages/deep-research-pack/src/client/ResearchHubPanel.tsx",
    "packages/deep-research-pack/src/client/startup.ts",
    "packages/deep-research-pack/src/client/index.ts",
    "tests/cockpit/lib/workspace/runs-catalog.spec.mjs",
    "tests/cockpit/client/product-startup.spec.mjs",
    "tests/cockpit/client/research-hub-panel.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/cockpit/client/research-hub-panel.spec.mjs",
    "exit": 1,
    "output": "index.ts openFinal 必须通过 openResourceWhenMounted 等待挂载并展开右栏"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": { "path": "tests/cockpit/client/research-hub-panel.spec.mjs" }
}
```
