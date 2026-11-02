---
status: 已结
opened: 2026-11-02
---

# 推敲：产品面收窄——去掉主区 Trajectory 与右栏 New Terminal

> 立卡：2026-11-02 ｜ 状态：已结 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：是
> 去向：none — 载体 = [design/40 §2.0 出厂面契约](../../../docs/design/40-research-cockpit.md#cockpit-surface) + [bundle-composition](../../../tests/contracts/bundle-composition.test.mjs)；业务验收：用户（2026-11-03 指示按推荐落地）。

**问题与期望结果：** 2026-11-02 用户在实际打开产品后反馈：主区 tab 的 **Trajectory** 不需要，右栏的
**New Terminal** 也不需要——产品用不到这两处 DSH 出厂能力。期望：产品界面只留研究需要的面
（主区 = 对话 / 方法库，右栏 = 研究状态 / 研究配置 / 研究图谱 / 终稿），两个出厂入口在
`deep-research` profile 里不出现；移除必须是**真移除**（行不挂载），不是 CSS 隐藏或改名。

**当前情况：**

- 两处都是 DSH `web-app` bundle 的出厂行（`vendor/dsh/packages/bundle/web-app/cordis.patch.yml`）：
  `ui-trajectory`（`@deepseek-ai/dsh-client-ui-trajectory`，主区 Trajectory 页签）与
  `ui-sidebar-terminal`（`@deepseek-ai/dsh-client-ui-sidebar-terminal`，右栏 New Terminal）。
- 本包是后置 bundle patch 层，可用 Loader 方言按 id 关闭（`- id: X` + `disabled: true`），
  不需要改 vendor（vendor 只读铁律），也不需要第二套 UI。
- 落地（2026-11-02，commit `72499e7`）：在 `packages/deep-research-pack/cordis.patch.yml` 增加两条
  `disabled: true`；`_dist` 已重导出，tarball 内的同文件含这两条；dev profile 重建后真 Web 复核。

**未决问题：** 无（产品取舍已由用户拍板）。

**下一步：** 已结。载体与判据见状态行 `去向`：面契约住 design/40 §2.0，机器判据住
`bundle-composition`（组合层），本卡留问题与取舍记录。

## 已知与未决

**已知（证据在场）**

- `dsh --profile deep-research --dump-config`：`ui-trajectory` 与 `ui-sidebar-terminal` 均为
  `disabled: true`（2026-11-02 实跑）。
- 真 Web（本机 dev 通道，`locale=zh-CN`）：打开既有研究会话后主区 tabs = `["对话","方法库"]`；
  全页文本不含「轨迹」/「终端」/`Trajectory`/`Terminal`（2026-11-02 实测）。
- `_dist/dsh-deep-research-pack-0.3.0.tgz` 内的 `package/cordis.patch.yml` 含两条关闭行（tar 复核）。
- 回归（2026-11-03 换判据）：原 I5 读我们自己的 YAML —— 只能证明我们写了、证明不了 DSH 认
  （Loader 对落空的 patch 是警告后跳过）。已换成组合层断言
  [bundle-composition](../../../tests/contracts/bundle-composition.test.mjs)：用 Loader 自己的
  `applyEntryPatches`/`entryListSchema` 按 profile 层序组合 base → web-app → pack（含 presets），
  断言 ① 零跳过 ② 该藏的 disabled、该留的未 disabled。
  - 绿：组合树 192 行、0 条跳过，两行 `disabled: true`（2026-11-03）。
  - 红：把 vendor 里 `ui-trajectory` 的 id 改名后重跑 → `patch: entry %C not found ui-trajectory`，
    ① ② 同时红，还原即绿（2026-11-03 实录，配方 = 文件头注）。
  - 边界：树层证明挂载状态；像素面由真 Web 证据承担，两者不合一。
- `dsh --profile deep-research --dump-config`（2026-11-03 复跑）：两行均
  `# == @deepseek-ai/dsh-web-app, patched by dsh-deep-research-pack` 且 `disabled: true`。
- `pnpm verify` 全绿 / `pnpm test` 970 → 971 全绿（新增组合层两条断言，2026-11-03）。

**未决（技术，不是方向）**

- Plugins 页/市场条目的像素层未截（本卡不涉及显示元数据，仅入口是否挂载）。

## 方案与取舍

**采用：bundle patch 按 id 关闭。** 这是 DSH 现成载体（后置层覆盖出厂行），随包分发，安装后即生效；
与产品其他 patch 行（`llm-deepseek` / `web` / `session-query-sqlite`）同一机制。

- **输掉：改 vendor 删行**——vendor 是 pinned 只读基线（verify 的 vendor-pin/vendor-clean 把守），
  产品不得 fork 宿主；
- **输掉：CSS 隐藏 / 改名**——行仍在挂载，快捷键、菜单与后续版本仍可能暴露，属假移除；
- **输掉：只在 dev 覆盖层关闭**——那只改开发通道，产品用户仍会看到（本反馈针对产品面）；
- **输掉：给两行加产品专用 config**——两插件没有可用的「关闭」配置项，`disabled` 才是 Loader 的
  第一类语义。

## 验收标准

1. `dsh --profile deep-research --dump-config` 里 `ui-trajectory` 与 `ui-sidebar-terminal` 都是
   `disabled: true`，且真启动无 `did not activate` / `patch: entry … not found`。
2. 真 Web 会话语义：主区 tabs = 对话 / 方法库（无 Trajectory），右栏无 New Terminal 入口；
   证据 = 浏览器断言或 `run-driver up` 的浏览器面绿。
3. `_dist/dsh-deep-research-pack-0.3.0.tgz` 内的 `cordis.patch.yml` 与源码同源（含两条关闭行）。
4. 回归：组合层断言在场（`bundle-composition` 的零跳过 + 白名单两侧），上游改名或删关闭行即红
   （红录已跑）；`pnpm verify` / `pnpm test` 绿。
5. 业务验收：用户 2026-11-03 指示按推荐落地（不单列目视步骤；像素证据见上）。

## 关闭条件

验收标准 1–5 有证据在场（4 的判据已由组合层断言取代，理由与红录见 §已知）；去向 = `none`
（局部 UI 呈现，理由住 design/40 §2.0 与组合层断言，本卡留问题与取舍记录）。
