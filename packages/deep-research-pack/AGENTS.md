# AGENTS.md — deep-research-pack（插件内容子树）

本包是**配置为主 + 研究驾驶舱（Research Cockpit——观察面 client 套件，D18 有界例外；
另两处 = D31 抓取回退 provider、D40 启动行/内容注入；[构成正本](../../docs/design/40-research-cockpit.md)）**：
贡献 = `cordis.patch.yml` 的 bundle 行 + `presets/<role>.patch.yml`（一条
`@deepseek-ai/dsh-agent-preset` 行，config.plugins 内声明 persona/skills/工具行）+
`presets/<role>/skills/` + 驾驶舱（`src/client/`，构建产物 `lib/client.js`）+
`content/`（研究手册 + run 模板，`src/content` 以 runtime context 注入，**不落工作区**）+
`src/startup/`（Host 工作区登记/会话）+ 只读 `scripts/doctor.mjs`（bin
`dsh-deep-research-doctor`）。交付形态 = bundle + 用户自建 custom profile `deep-research`（D41）；**没有
launcher/scaffold，没有自定义安装器**。包级当前合同在 [README.md](README.md)；
本文件只放该子树的**指令**。上游对应物 = DSH `packages/AGENTS.md`。

## 改这个包时

- **两处一致**（pack 源 = 唯一真源）：① `dev/research.overlay.yml` 由
  `node dev/render-overlay.mjs` **从 pack 渲染**（门禁 `overlay-fresh` 对账，勿手改）；
  ② `runtime/harness-home/profiles/deep-research/`（run 通道镜像）随 `boot-run.sh` 同步，
  其漂移检测逐文件比对，不符即 fail-loud；改完 pack 跑 `node scripts/verify/verify.mjs`；
- 新增/修改角色走 [`.agents/skills/adding-a-research-role`](../../.agents/skills/adding-a-research-role/SKILL.md)；
- 行引用的 `@deepseek-ai/*` 必须同时出现在 `peerDependencies`（`row-deps` 门禁）；
- 角色清单（roster）的事实源 = 盘上 `presets/`，不要在代码里写第二份角色字面量
  （`role-list-sync` 门禁）；
- 手册/模板是**包内容**：改 `content/`（模板路径用 `{{research_pack_root}}`），不往工作区写文件；
  包内不得重新出现 `workspace/` 种子（`content-shape` 门禁）。

## 模型可见文本（persona / skill / 手册）

- 它们**进模型请求** = "模型可见"面：证据阶梯（真模型档 + snapshot B 层）与重启要求 =
  [adding-a-research-role 技能 §3–4](../../.agents/skills/adding-a-research-role/SKILL.md)；
  skills 按角色硬隔离（`preset-structure` + L1 真挂载断言）；手册走
  `ctx.systemPrompt.context()`，改它要重录 snapshot B 层并跑 `l4-lite-smoke`。

## 文档义务

- 包 README 拥有安装/验证/配置/升级/卸载/数据/兼容（当前合同）；行为/架构细节 = design/，发布 = guides/64；README 或发布集改变同 diff 更新；
- 启动/部署面（`src/startup`、`src/content`、`scripts/doctor.mjs`、`$DSH_HOME/deep-research/settings.json`）改动要跑
  `install-shape-smoke` + `product-boot-smoke` + `release-smoke`（L2 安装/首启形状）；
- 已知限制与延后工作放固定节 `## Known Limitations and Deferred Work`（中文名：已知限制与延后工作）。
