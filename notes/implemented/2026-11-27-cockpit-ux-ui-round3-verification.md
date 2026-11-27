# 2026-11-27 · 驾驶舱 UX/UI 第三轮盲区核查收口（BUG-458…462 检出、上游契约记录与批量修复）

> 状态：implemented

## 决定

第三轮 UX/UI 盲区核查（[核查卡](../../_backlog/_archived/settled_issues/2026-11-27-cockpit-ux-ui-round3-verification.md)，Stage 0–6 五批真机矩阵）执行完毕，专攻 `ef5aff1f` 新边界与历史空白：

- **`ef5aff1f` 复验**：清理旧通道冷启 `run-driver.mjs up --force-probe` GREEN，消除首轮交付时因 3083 通道 host chunk 漂移录得的 `NOT-RUN`；`FinalToc` 括号 URL、`DefaultsPanel`「方法库 ›」三宿主、19 条「换一条」720p、同名编辑 vs 撞名新建等新边界逐项对抗复核。
- **本轮检出并建卡 5 项新缺陷（BUG-458…462）**（FinalToc 嵌套括号链接截断、Hub「打开终稿」抛错硬编码、窄分屏 SegmentedControl 裁切、复制路径剪贴板拒绝假绿、DefaultsButton 双浮窗），核查期间零修改 `packages/` / `vendor/` / `research-workspace/`。
- 缺陷修复的根因与输掉方案由 [批修复 Note](2026-11-27-cockpit-ux-ui-round3-fixes.md) 拥有（commit `cc33e11d`）。
- **上游/vendor 契约记录**（非 pack 缺陷，留档防复发误报）：
  - 免刷新热切语言时，`ui-sidebar-right` 已开页签的芯片标题按**创建时语种冻结**（上游行为）；pack 自有面板即时切语种正常；
  - 高速切会话触发上游 `SidebarSessionView.dispose` 的 `Session reference is released`（vendor 只读铁律，不私改；pack 右栏无残影串台）。
- 残余风险：Stage 3.2c 真模型活 SSE 流与 live `agent-team` 投影因无 `DEEPSEEK_API_KEY` NOT-RUN；重议条件登记于 [triggers](../../_backlog/triggers.md)。

## 输掉的方案

- **手写简化 `.jsonl` 会话夹具上真屏**：被 runtime 以格式校验拒载（第二轮由此卡壳）；改为克隆合法 DSH 会话夹具结构并补齐 v4 结算字段后，`MethodLibraryToolCard` / `ResearchToolCard` / `ResearchMilestoneCard` 真机全显。
- **边查边修**：沿用三轮同一纪律——核查轮只建卡上报，修复独立成批走 `修复落地` → `已修` 证据链；保证缺陷证据、修复证据、守卫三者可分别审计。

## 实际跑过的验证

- 沙箱现场 = `runtime/smoke-workspace/ux-audit-r3-2026-11-27/`（日志 `stage0-l0` / `stage0-run-driver` / `batch1–3` / `focused` / `final-edges` / `gaps-r2` + 截图）。
- Stage 0：`pnpm verify && pnpm test`（spec 1680+ / checks 276 全绿）；活通道重建 GREEN。
- Stage 0–5 全矩阵逐项 `PASS / FAIL(BUG-NNN) / NOT-RUN` 落盘（正本 = 核查卡内「第三轮执行记录」表）：FAIL 仅 5 项全部对应建卡；`Dark × 480×800` 全扫 `scrollWidth=480` 且 Console/PageError=0；键盘焦点归位与高速切会话无残影。
- 修复批验证证据 = [批修复 Note §实际跑过的验证](2026-11-27-cockpit-ux-ui-round3-fixes.md)（定向单测 36/36、真浏览器 `verify-458-462` 5/5、`cockpit-truth-residuals` 28/28 + `cockpit-truth-substance` 19/19、`run-driver` GREEN、L0 spec 1687/1687 + checks 276/276）。
- 收口：用户 2026-11-27 确认三轮核查闭环，本卡与载体 Note 同变更归档。
