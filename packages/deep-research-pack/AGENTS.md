# AGENTS.md — deep-research-pack（插件内容子树）

本包是**配置为主 + 研究驾驶舱（Research Cockpit——观察面 client 套件，D18 单点例外；
[构成正本](../../docs/design/40-research-cockpit.md)）**：贡献 = `cordis.patch.yml`
的 bundle 行 + `presets/<role>.patch.yml`（一条 `@deepseek-ai/dsh-agent-preset` 行，
config.plugins 内声明 persona/skills/工具行）+ `presets/<role>/skills/` + 驾驶舱
（`src/client/`，构建产物 `lib/client.js`）+ 工作区种子 `workspace/`（手册与模板快照，
`dev/sync-pack-workspace.mjs` 同步，门禁 `pack-workspace-fresh` 防漂移）+ 部署脚本
`scripts/{preflight,scaffold}.mjs`（bin 两条命令）。包级当前合同在 [README.md](README.md)；
本文件只放该子树的**指令**。上游对应物 = DSH `packages/AGENTS.md`。

## 改这个包时

- **三处一致**（pack 源 = 唯一真源）：① `dev/research.overlay.yml` 由
  `node dev/render-overlay.mjs` **从 pack 渲染**（门禁 `overlay-fresh` 对账，勿手改）；
  ② `dev/harness-home/profiles/research/`（run 通道镜像）随 `boot-run.sh` 同步，
  其漂移检测逐文件比对，不符即 fail-loud；③ 改完 pack 跑 `node scripts/verify.mjs`；
- 新增/修改角色走 [`.agents/skills/adding-a-research-role`](../../.agents/skills/adding-a-research-role/SKILL.md)；
- 行引用的 `@deepseek-ai/*` 必须同时出现在 `peerDependencies`（`row-deps` 门禁）；
- 角色清单（roster）的事实源 = 盘上 `presets/`，不要在代码里写第二份角色字面量
  （`role-list-sync` 门禁）。

## 模型可见文本（persona / skill / 手册）

- 它们**进模型请求**，因此属"模型可见"面：改动要跑真模型档证据（`l4-lite-smoke`），
  只跑 keyless 不算验过行为；skills 按角色硬隔离（`preset-structure` + L1 真挂载断言）；
- 运行中的 web 进程缓存 boot 时的文本：改完必须重启 run 通道才生效（实测：spawn 出的成员
  拿到修复前的 persona）。

## 文档义务

- 包 README 拥有配置、行为、**部署前置**、限制与扩展点（当前合同）；行为或发布集改变同 diff 更新；
- 部署面（preflight/scaffold/workspace 种子）改动要跑 `release-smoke`（L2 安装形状）；
- 已知限制与延后工作放固定节 `## 已知限制与延后工作`（上游
  `## Known Limitations and Deferred Work` 同构）。
