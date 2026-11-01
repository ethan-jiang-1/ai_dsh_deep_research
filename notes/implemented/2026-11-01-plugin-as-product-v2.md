# 插件即产品 v2：DSH 原生安装、启动期工作区、内容进包

> 状态：implemented

> 来源：[插件即产品 v2 决策卡](../../_backlog/issues/2026-11-01-plugin-as-product-v2.md)（D40）、[实施计划](../../_backlog/research/plugin-as-product-v2/2026-11-01-implementation-plan.md)、[复盘](../../_backlog/research/plugin-as-product-v2/2026-11-01-postmortem-why-crooked.md)。
> 当前合同 = [pack README](../../packages/deep-research-pack/README.md)、[guides/65](../../docs/guides/65-run-forms.md)、[README](../../README.md)。

## 决定

- **产品 = 一个 bundle + 自有 `deep-research` profile**。安装/启动全走 DSH：`dsh --profile deep-research --from-default-profile web` → `dsh plugin --profile deep-research add <pack> <team>` → `dsh --profile deep-research`。删除 launcher 与 scaffold，只保留只读 `dsh-deep-research-doctor`。版本 0.3.0，无兼容、不迁移旧种子。
- **工作区在启动时解决**：`DEEP_RESEARCH_WORKSPACE` → `$DSH_HOME/deep-research/settings.json` → 首屏「选择项目目录」。Host 启动行登记 Workspace + best-effort 建 Lead 会话；client 用 `dsh.sessions.current` 与 `localStorage['dsh.deep-research.workspaceId.v1']` 恢复。没有 CLI 询问、没有 launcher。
- **内容全部在包内**：手册 `content/manual.md` 经 `ctx.systemPrompt.context()` 注入（`research_pack_root` 变量供模板路径）；NODES/判型库 = Lead skills；模板 `content/templates/run/`。删除 `workspace/` 种子、`seed.json`、scaffold 升级账本、`.gitignore` 写入、`pack-workspace-fresh`。工作区只剩 `drt_*`/`archive/`/`_abandoned/`/`method-library.md`。
- **新产品面 = 启动行 + client 启动控制器**（D7 第三处有界例外；不新增 Remote——用 DSH 既有 `workspaces`/`sessions`/`uiWorkspace`/`pickDirectory`）。
- **安装尊重 DSH**：不手写 profile、不发布 profile、不起第二个安装器；应用内 Plugins 页是更新路径；`web` profile 只作互操作。

## 输掉的方案

- **D39 的 web-profile 主路径**：产品无身份、工作区靠 env、内容复制；诊断见复盘。
- **保留 launcher**：第二个入口是漂移源（D38↔D39 两套叙事）；安装两步没有 DSH 之外的机制。
- **保留种子 / 隐藏目录种子**：两份内容 + 升级账本；隐藏目录只作 A 被真模型证伪时的降级，未启用。
- **新增 `researchSetup` remote**：Typert 生成物不在本包构建链；用 DSH 既有客户端服务 + 一个浏览器提示键。
- **`shell.overlay` onboarding**：最小可用路径优先，首屏用 `conversation.input.dock` 的 StartCard 按钮；避免新槽位与浏览态分叉。
- **手写 profile / 第二层 app / 桌面壳 / 自定义安装器**：非 DSH 启动合同。

## 实际跑过的验证

- `pnpm verify` 全绿；`pnpm test` **963 pass / 0 fail**（含 `tests/contracts/product-invariants.test.mjs` 的 I1–I4）。
- `install-shape-smoke`：全局 dsh 0.2.1-rc.3 上原样执行手册三步；roster 三状态、dump 有 `research-content`/`research-startup`、无旧 `research-workspace-boot`、真启动无 `did not activate` —— **ALL PASS**。
- `product-boot-smoke`：真 Web + 浏览器；**用产品设置文件（不带 env）** 起 `dsh --profile deep-research`；Host 注册工作区、blank Lead Session、`cwd` = 工作区、`preset=lead`、首屏元素与「选择项目目录」、工作区无产品内容文件 —— **GREEN**。
- `release-smoke`：tarball → 干净 profile → plugin add pack + 团队层 → 安装副本 client/peers/矩阵 → doctor → 安装域 preset-smoke 5 角色全绿 → remove → 团队层保留 → 端口释放 —— **ALL PASS**。
- `data-smoke`：包目录零写入、假 token 不泄漏、卸载后 workspace 用户文件与 session 日志保留 —— **ALL PASS**。
- `doctor-smoke`：齐全绿 / 缺 pack 红 / engines 不匹配红 / 坏设置 warn / 不写 profile —— **ALL PASS**。
- `pack-smoke`：131 条目、content/doctor/startup/content 产物在场、无安装脚本/凭据、两次 pack 同 sha —— **ALL PASS**。
- `snapshot-replay-smoke`：4 角色 fixture 重录（真模型）+ C 金标准刷新；A 回放通路 + B 组装请求 diff（手册以 runtime context 进入；agent-instructions 两侧缺席时跳过）+ 渲染金标准 —— **ALL PASS**。
- `l4-lite-smoke`：5 角色真模型响应 + scout `web_search` 工具调用 —— **ALL PASS**。

## 残余边界

- 完整 L4 真实 run（HITL1 → 组队 → 证据 → review → HITL2 → final）本轮未跑；`l4-lite` 与 snapshot B 已证手册注入和角色行为，交付链仍是下一轮证据。
- 浏览器提示键是设备/源级；browse-only 部署没有专门目录浏览 UI（报错可见）。
- Desktop / Windows / 正式 npm 发布未验证。
- 团队层 N2 experimental：上游可能改 API 或撤能力。
