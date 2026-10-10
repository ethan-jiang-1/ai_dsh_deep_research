---
status: 活跃
severity: P2
opened: 2026-10-11
---

# BUG-020：hitl-answer 代答 provenance 误归给无关在飞 bundle

> 严重级别：P2｜发现：2026-10-11｜状态：活跃

## 症状

代理模拟作答**新 run** 的 HITL1 卡时，代答 provenance（"HITL 交互 = 操作侧代理模拟"行）写进了**无关的停滞 bundle** 的 `question.md` §Decisions 与 `journal.md`。2026-10-11 本仓实测两次：MCP 安全面 run（lead 会话 session-c4c60450…）的三问卡与 sibling 预检卡的代答记录，均落进当时工作区根唯一的在飞 bundle `drt_cn-moe-2026`（该 run 的 lead 两天未动，与本次作答毫无关系）。

## 根因（假设）

`dev/hitl-answer.mjs` 落账目标取 `scripts/lib/run-state.mjs` 的 `bundleStateOf().activeBundle`——实现 = `drt_*` 目录名**字典序最后一位**（`bundles.sort().at(-1)`），无"被答会话 ↔ bundle"归属判定。脚本只对**零 bundle** 时窗设了护栏（"HITL1 窗口常态——provenance 延迟，bundle 实例化后由操作侧补记"分支），没防"别的在飞 bundle 在场"的情形：新 run 的 bundle 在三问/sibling 卡阶段尚未实例化，字典序挑中的就是那个无关 bundle。推论：即使新 bundle 已在场，停滞 bundle 名字典序更大时（如 `drt_z…` vs 新 `drt_m…`）依然会误归。

## 复现

1. 研究工作区根留一个在飞 bundle（如停滞的 `drt_cn-moe-2026`）；
2. 新开 lead 会话发研究问题 → lead 挂起 HITL1 三问卡（此阶段新 bundle 未实例化）；
3. `source dev/env.sh && node --import tsx/esm dev/hitl-answer.mjs --port 3083 --token <t>` 实答；
4. 观察：代答记录写进停滞 bundle 的 question.md/journal.md（stdout "代理模拟记录已写盘"路径也指它）。

## 牵出的失败类

operator 工具的**落账目标启发式**类缺陷：`activeBundle` 字典序挑选被多处消费（watch-run / dashboard 是否同源待查——横切排查点）。判据：任何"选中唯一目标"的启发式都应过"多候选在场"的反例。

## 修复关联

建议：落账前做归属判定（被答会话日志提过且盘上在场的 `drt_<slug>`，要求唯一匹配；sibling 预检会提其他 slug——需按 ask 卡同 turn 的提及或唯一性收窄）；无唯一匹配 = 走既有"延迟补记"分支。修复带反证测试（红：无关 bundle 在场 + 新 run 未实例化时，落账目标必须是延迟分支而非字典序选中）。2026-10-11 误记两条已由操作侧手工迁移修复（见 MCP run 的 journal 记账）。
