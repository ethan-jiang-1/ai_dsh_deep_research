# 2026-11-27 · 驾驶舱 UX/UI 第一轮全量核查收口（发现即建卡 → 15 缺陷批量修复）

> 状态：implemented

## 决定

第一轮全量 UX/UI 核查（[核查卡](../../_backlog/_archived/settled_issues/2026-11-27-cockpit-ux-ui-full-verification.md)，Stage 0–6 计划）按「真机真浏览器优先于静态推断、发现即建 BUG 卡、未跑 ≠ 通过、守住 vendor/工作区红线」四条纪律执行完毕：

- 本轮覆盖面 = 主路径首屏展示 + Light/Dark/EN 静态快照 + 基础故障态；核查共定位 **15 项真实缺陷（BUG-436…450）**，全部独立建卡登记 [_backlog/bugs](../../_backlog/bugs/README.md)，未静默放过或顺手掩盖。
- P0/P1 缺陷处置取「先建卡留证、汇总交用户分诊」，不边查边修（核查卡未决问题 #1 的落点；P0/触及入口链须用户拍板是既定纪律）。
- 缺陷修复的根因聚类、输掉方案与逐缺陷永久守卫由 [批修复 Note](2026-11-27-cockpit-ux-ui-audit-fixes.md) 拥有（commit `7191bdb0`）；同期通道漂移 BUG-435 在核查前期已由 `16ddd7c6` 修复，本批未动。
- 经验回流：这批视觉/交互/双语缺陷全部逃过了既有 JSDOM 与静态门禁——真浏览器里的布局挤压、HoverCard 主题表面、英文单复数、选择器漂移只能真机裁决。收口方式 = 15/15 每个缺陷落一条永久回归守卫（映射表见批修复 Note），并立[第二轮深度盲区卡](../../_backlog/_archived/settled_issues/2026-11-27-cockpit-ux-ui-deep-blindspots-verification.md)专攻静态快照够不着的深水区。

## 输掉的方案

- **边查边修 P0 阻断**：会让「核查」与「修复」两个面互相污染、缺陷证据链断裂，且 P0 分诊本属用户职权；改为全部建卡后统一交用户定优先级。
- **先扩富种子夹具再核查**：等待 `tests/fixtures/client-load-home` 覆盖 `protocol.json` / `claims.json` / 8 字段 evidence 会把核查卡在夹具工程上；改为先用既有五条真浏览器入口过全量、逐项追查 `SKIP`，富夹具补证由修复批的逐缺陷守卫承担。

## 实际跑过的验证

- 本轮核查执行产出：15 张缺陷卡（BUG-436…450）全部建卡并登记 bugs 索引；现已随两批修复全部归档 [_archived/fixed_bugs](../../_backlog/_archived/fixed_bugs/README.md)。
- 缺陷修复批验证（证据正本 = [批修复 Note §实际跑过的验证](2026-11-27-cockpit-ux-ui-audit-fixes.md)）：L0 全绿（`pnpm verify && pnpm test`：spec 1670/1670、checks 273/273）；五条 cockpit 真浏览器入口 24/24、31/31、28/28、19/19、3/3 全绿；`run-driver.mjs up --force-probe` GREEN；定向真浏览器故障注入 12/12。
- 诚实边界：`client-load.entry.mjs` 修复当轮因宿主机负载守卫 `NOT-RUN`（第二轮 Stage 0 补跑 ALL PASS）；真模型活流档（Stage 5）因环境无 `DEEPSEEK_API_KEY` 未实机覆盖——该边界在第二、三轮执行记录中保持 NOT-RUN，重议条件登记于 [triggers](../../_backlog/triggers.md)。
- 收口：用户 2026-11-27 确认三轮核查闭环，本卡与载体 Note 同变更归档。
