# 2026-11-27 · 驾驶舱 UX/UI 第二轮深度盲区核查收口（BUG-451…457 检出与批量修复）

> 状态：implemented

## 决定

第二轮 UX/UI 深度盲区核查（[核查卡](../../_backlog/_archived/settled_issues/2026-11-27-cockpit-ux-ui-deep-blindspots-verification.md)，Stage 0–6）按「只攻首轮未覆盖深水区与修复后真实回归、纯上报零修码」执行完毕：

- **上轮遗留补齐**：首轮因宿主机负载 `NOT-RUN` 的 `client-load.entry.mjs --seed tests/fixtures/client-load-home` 本轮实跑 ALL PASS；`cockpit-truth-residuals` 28/28（含 30s `staleWatcher` S17 与 `DefaultsPanel` S21）、`cockpit-truth-substance` 19/19，确认 BUG-442/443 修复真实全绿。
- **本轮检出并建卡 7 项新缺陷（BUG-451…457）**（Hub 透镜发研丢提示词、DefaultsPanel 伪链接、FinalToc 裸链接不滚、720p 菜单裁切、纯文本槽裸星号、方法摘要空后缀、TrackRail 回边箭头偏移），全部独立建卡 `status: 等人拍板`，核查期间未改产品源码。
- 缺陷修复的根因与输掉方案由 [批修复 Note](2026-11-27-cockpit-ux-ui-blindspots-fixes.md) 拥有（commit `ef5aff1f`，同批补齐「先修复落地、后归档」的二阶段门禁支持并干净归档 BUG-435）。
- 残余风险：无 API key 下，真实 LLM 活流推入 `deliverables/presented` 的焦点保护与完整 `MethodCoach` 多轮问答未实证（纯函数 `shouldOpenFinal` / `draftInProgress` 已由 L0 单测覆盖）；重议条件登记于 [triggers](../../_backlog/triggers.md)。

## 输掉的方案

- **写死单一大种子沙箱**：方法库写操作、30s `staleWatcher` 文件热改、20×8 超大矩阵压测互有状态污染风险，一个种子会互相踩；改为隔离多沙箱 / 分场景清理写回。
- **全靠真实 LLM 等待自然撞全故障态**：`TOOL_OUTCOME_UNKNOWN`、流式半截 JSON 参数、四轴停摆门、30 节点 DAG 等极难由一次真模型自然撞全，等待不可调度；改为对照 `vendor/dsh` 线协议精确回放/增量推流验 UI 真实反应，真模型通道只聚焦活流 HITL。

## 实际跑过的验证

- 沙箱现场 = `runtime/smoke-workspace/ux-audit-r2-2026-11-27/`（日志 `stage0-l0` / `stage0-entries` / `batch-a` / `batch-b` / `delta` / `deep-hunt` / `final-verify` + 截图 20+ 张）。
- Stage 0 基线全绿：`zsh -c 'source tools/env.sh && pnpm verify'` PASS（确认 BUG-450）；`pnpm test` spec 1670/1670 + checks 273/273；`run-driver.mjs up --force-probe` GREEN（确认 BUG-441）。
- Stage 0.4–5 盲区实跑产出 7 张缺陷卡（正本 = 核查卡内「第二轮执行记录」节）；修复批验证证据 = [批修复 Note §实际跑过的验证](2026-11-27-cockpit-ux-ui-blindspots-fixes.md)。
- 收口：用户 2026-11-27 确认三轮核查闭环，本卡与载体 Note 同变更归档。
