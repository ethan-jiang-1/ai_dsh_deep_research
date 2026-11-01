---
status: 推敲中
opened: 2026-11-01
---

# 推敲：插件即产品 v2——产品 profile、启动期工作区、内容/产物分家

> 状态：推敲中｜结论倾向：现在做｜可关闭：否

**问题与期望结果：** D38/D39 把产品做成了"装进用户已有 `web` profile 的 bundle + 一条前置 scaffold + 一个 env"。用户期望的是：插件有自己的启动 profile；启动时知道或询问用户工作区；插件内容全部留在包内；只有 run bundle 等产物落在用户工作区。完成 = 用 DSH 自身的安装/启动命令进入产品，原生 `dsh --profile deep-research` 即可；空工作区里没有产品内容文件；文档（根 README、pack README、`_dist/安装手册.md`、guides）同一叙事。

**当前情况：**

- 代码里 launcher 已默认 `deep-research`（`scripts/launch.mjs:61`），但文档与分发以 `web` 为主（D39）；同一仓两套主叙事。
- Host 行只在 `DEEP_RESEARCH_WORKSPACE` 存在时注册工作区，env 缺席零行为（`src/workspace-boot/index.ts:28-30`）。
- 62.3 KB 种子 + `seed.json` + scaffold 升级账本 + `pack-workspace-fresh` 门禁，把包内内容复制进工作区。
- 首屏 StartCard 解释的是 setup 仪式；DSH 原生首启没有向导（FAQ 26 更新后确认），产品必须自己回答首屏。
- Host 建会话不能保证早于 Web 服务（`webserver` 在挂载期 listen，无 readiness gate）；会话创建/选中必须走 client（DSH ui-workspace 首次使用同模式）。
- 详细诊断 = [../research/plugin-as-product-v2/2026-11-01-diagnosis.md](../research/plugin-as-product-v2/2026-11-01-diagnosis.md)；为什么上次会歪 = [../research/plugin-as-product-v2/2026-11-01-postmortem-why-crooked.md](../research/plugin-as-product-v2/2026-11-01-postmortem-why-crooked.md)。

## 决定（2026-11-01，用户授权：review 项自行决定；做对最重要；不做兼容；安装必须尊重 DSH）

1. **内容边界 = A**：无种子。手册走 `ctx.systemPrompt.context()`；NODES / 判型库走 Lead skills；模板留包内、手册用 `{{research_pack_root}}` 指路。B（`<workspace>/.deep-research/` 隐藏目录）只在 A 被真模型证据证伪时启用。
2. **项目目录 = 询问 + 推荐**：用户选 `<dir>` 就是 `<dir>`；若像项目，询问时把 `<dir>/research` 作为推荐项，不静默改写。
3. **互操作 = 保留一行**：同一个 bundle 装进现有 `web` profile 也能用（首屏照样问工作区），但不是产品形态。
4. **新产品面 = 接受（S2 落成时收窄）**：Host 启动行（工作区登记 + best-effort 会话）+ client 启动控制器/首屏按钮，作为 D7 第三处有界例外（与 D18 驾驶舱、D31 抓取回退并列）。**不新增 Remote**：Typert 生成物不在本包构建链里；改用 DSH 既有 `workspaces.create` / `sessions.create` / `uiWorkspace.startSession` / `pickDirectory`，GUI 只写一个 localStorage 提示键。
5. **安装 = 只用 DSH**：删除 `dsh-deep-research`（launcher）与 `dsh-deep-research-scaffold`；首次安装 = `dsh --profile deep-research --from-default-profile web` + `dsh plugin --profile deep-research add <pack> <team>`；启动 = `dsh --profile deep-research`；只保留只读 doctor。版本 0.3.0，无兼容、不迁移旧种子。

**下一步：** 按 [实施计划](../research/plugin-as-product-v2/2026-11-01-implementation-plan.md) 从 S0 红基线开始，S0 → S1 → S2 → S3 → S4；每片按 [验收计划](../research/plugin-as-product-v2/2026-11-01-verification-plan.md) 退出。

## 已知与未决

- 已知：产品形态、安装/启动/首启、内容/产物边界、工作区解析、数据归属（见研究题七份材料）。
- 未决（技术，不是方向）：`researchSetup` remote 的 Typert 形状（S2.0 spike）；client 建会话 → `openSession` 的完整链路；18.5 KB 手册注入的体积/行为；`shell.overlay` onboarding 的真浏览器可点性；Desktop / Windows。
- 反歪基线：I1–I4 的不变量测试先在 HEAD 上跑红（见实施计划 §0/§2），再随 S1–S4 转绿。

## 红基线（2026-11-01，HEAD 上实跑）

一次性脚本 `/tmp/product-invariants-red.mjs`（断言将转成 `tests/contracts/product-invariants.test.mjs`）在改动前的树上 **9/9 红**：

```text
RED   I1 README 首动作是产品 profile（不是 --profile web）
RED   I1 package.json 无 launcher/scaffold bin — {"dsh-deep-research-preflight":"./scripts/preflight.mjs","dsh-deep-research-scaffold":"./scripts/scaffold.mjs","dsh-deep-research":"./scripts/launch.mjs"}
RED   I1 bundle patch 有 startup/content 行、无 workspace-boot
RED   I2 src/startup 行存在并读产品设置
RED   I2 文档安装包含 --from-default-profile web
RED   I3 包内无 workspace/seed.json
RED   I3 files 不含 workspace/**、含 content/**
RED   I4 content/manual.md 在场
RED   I4 src/content 注册 systemPrompt.context
```

这条输出就是"当前树违反目标"的可复现证据；S1–S4 把它们转绿，并在 S4 落成常驻测试。

## 方案与取舍

目标形态 = [../research/plugin-as-product-v2/2026-11-01-target-model.md](../research/plugin-as-product-v2/2026-11-01-target-model.md)；可 review 的实施计划 = [../research/plugin-as-product-v2/2026-11-01-implementation-plan.md](../research/plugin-as-product-v2/2026-11-01-implementation-plan.md)；改动面与分片 = [../research/plugin-as-product-v2/2026-11-01-change-surface.md](../research/plugin-as-product-v2/2026-11-01-change-surface.md)；机制依据 = [../research/plugin-as-product-v2/2026-11-01-mechanism-facts.md](../research/plugin-as-product-v2/2026-11-01-mechanism-facts.md)。

- 输掉：继续 D39（产品无身份）；保留 launcher（第二个入口是漂移源）；隐藏目录种子（两份内容）；第二层 app/桌面壳/安装器（非 DSH 启动合同）；手写 profile。
- 保留：D38 的 Host 注册、产品设置思路、optional peers；团队层与版本门不变。

## 验收标准

1. 按手册三步（profile init → `dsh plugin add` → `dsh --profile deep-research`）装成并起产品；roster = base + web-app + pack + team。
2. 不设 env、无 launcher，`dsh --profile deep-research` 在已保存工作区时页面加载后落到该工作区（session `header.cwd` = 工作区、`agentPreset` = `lead`、被选中）；无保存时首屏给出目录选择入口。
3. 空工作区启动后没有产品内容文件；只有 run 产物（`drt_*` / `archive` / `_abandoned`）与方法库。
4. 手册、NODES、判型库、模板全部从包内进入模型上下文；真模型档（`l4-lite-smoke`）证明 Lead 仍按手册产出 HITL1 三问与 run bundle。
5. `pnpm verify` + `pnpm test` 绿；`install-shape-smoke` / `product-boot-smoke` / `release-smoke` / `data-smoke` 绿；真启动 stderr 无 `did not activate`。
6. 根 README、AGENTS、`docs/00-index.md`、`docs/guides/65`、pack README、`_dist/安装手册.md` 同一叙事；`_dist` 由生成器重导出；包内无 launcher/scaffold bin。
7. 卸载后工作区产物保留；插件代码对 `$DSH_HOME` 的写入只剩 `deep-research/settings.json`（无 secret）。
8. 反歪基线：`tests/contracts/product-invariants.test.mjs` 在改动前的 HEAD 上红、在交付树上绿；四条不变量各有一条机械断言。

## 验证进展（2026-11-01）

1. ✅ `install-shape-smoke` ALL PASS：全局 dsh rc.3 上原样执行手册三步；roster 三状态、无旧 row、真启动无 `did not activate`。
2. ✅ `product-boot-smoke` GREEN：用产品设置文件（不带 env）起 `dsh --profile deep-research`；Host 注册工作区、blank Lead Session、`cwd`/`preset` 正确。
3. ✅ 同冒烟断言工作区无产品内容文件（`AGENTS.md`/`NODES.md`/`templates`/`seed.json` 等）。
4. ◐ `snapshot-replay` B 层 ALL PASS（手册以 runtime context 进入；4 角色 fixture 重录）；`l4-lite` 5 角色真模型 PASS；`client-hitl-smoke` 真模型 HITL1 + 挂起显性化 PASS。**完整 L4 真实 run（run bundle 交付）未跑**。
5. ✅ `pnpm verify` + `pnpm test`（963）全绿；`release-smoke` / `data-smoke` / `doctor-smoke` / `pack-smoke` ALL PASS；真启动无 `did not activate`。
6. ✅ README / AGENTS / 00-index / guides / pack README / `_dist` 同一叙事；`_dist` 0.3.0 重导出（131 条目）。
7. ✅ `data-smoke`：卸载后 workspace 用户文件与 session 日志保留；`$DSH_HOME` 只多产品设置。
8. ✅ `product-invariants` I1–I4 常驻测试；红基线（9/9）在卡上留证。

## 关闭条件

验收标准 1–8 有证据在场，且 D40 与 `notes/implemented/` Note 互链；业务验收（真人首启手感）由用户拍板。
