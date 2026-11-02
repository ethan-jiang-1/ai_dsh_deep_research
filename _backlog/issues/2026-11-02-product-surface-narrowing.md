---
status: 等人拍板
opened: 2026-11-02
---

# 推敲：产品面收窄——去掉主区 Trajectory 与右栏 New Terminal

> 立卡：2026-11-02 ｜ 状态：等人拍板（技术面已落地，待你目视确认） ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否

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

**下一步：** 你目视确认两个入口确实消失；确认后本卡按流程归档。

## 已知与未决

**已知（证据在场）**

- `dsh --profile deep-research --dump-config`：`ui-trajectory` 与 `ui-sidebar-terminal` 均为
  `disabled: true`（2026-11-02 实跑）。
- 真 Web（本机 dev 通道，`locale=zh-CN`）：打开既有研究会话后主区 tabs = `["对话","方法库"]`；
  全页文本不含「轨迹」/「终端」/`Trajectory`/`Terminal`（2026-11-02 实测）。
- `_dist/dsh-deep-research-pack-0.3.0.tgz` 内的 `package/cordis.patch.yml` 含两条关闭行（tar 复核）。
- 回归：`tests/contracts/product-invariants.test.mjs` 新增 I5「产品面收窄」，删除关闭行即红
  （已跑红→绿）。

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
4. 回归：`product-invariants` 的 I5 在场，删掉任一关闭行即红（红录已跑）；`pnpm verify` / `pnpm test` 绿。
5. 用户目视确认两处入口消失。

## 关闭条件

验收标准 1–4 有证据在场，5 由用户拍板；结论去向按 `_backlog/methods/issue-to-note.md` 选
（本改动属局部 UI 呈现，预计 `none`，卡本身即记录）。
