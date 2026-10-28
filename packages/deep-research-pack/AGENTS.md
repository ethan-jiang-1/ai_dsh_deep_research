# AGENTS.md — deep-research-pack（插件内容子树）

本包是**配置为主 + 研究驾驶舱（Research Cockpit——观察面 client 套件，D18 单点例外；
[构成正本](../../docs/design/40-research-cockpit.md)）**：贡献 = `cordis.patch.yml`
的 bundle 行 + `presets/<role>.patch.yml`（一条 `@deepseek-ai/dsh-agent-preset` 行，
config.plugins 内声明 persona/skills/工具行）+ `presets/<role>/skills/` + 驾驶舱
（`src/client/`，构建产物 `lib/client.js`）+ 工作区种子 `workspace/`（手册与模板快照 +
`seed.json` 版本/哈希/所有权（policy）清单，`dev/sync-pack-workspace.mjs` 同步，门禁 `pack-workspace-fresh` 防漂移；
`scaffold --check/--upgrade` 分类升级（missing/current/stale/modified/untracked/deleted），方法库不覆盖）+ 部署脚本
`scripts/{preflight,scaffold}.mjs`（bin 两条命令）。包级当前合同在 [README.md](README.md)；
本文件只放该子树的**指令**。上游对应物 = DSH `packages/AGENTS.md`。

## 改这个包时

- **三处一致**（pack 源 = 唯一真源）：① `dev/research.overlay.yml` 由
  `node dev/render-overlay.mjs` **从 pack 渲染**（门禁 `overlay-fresh` 对账，勿手改）；
  ② `runtime/harness-home/profiles/research/`（run 通道镜像）随 `boot-run.sh` 同步，
  其漂移检测逐文件比对，不符即 fail-loud；③ 改完 pack 跑 `node scripts/verify/verify.mjs`；
- 新增/修改角色走 [`.agents/skills/adding-a-research-role`](../../.agents/skills/adding-a-research-role/SKILL.md)；
- 行引用的 `@deepseek-ai/*` 必须同时出现在 `peerDependencies`（`row-deps` 门禁）；
- 角色清单（roster）的事实源 = 盘上 `presets/`，不要在代码里写第二份角色字面量
  （`role-list-sync` 门禁）。

## 模型可见文本（persona / skill / 手册）

- 它们**进模型请求** = "模型可见"面：证据阶梯（真模型档 + snapshot B 层）与重启要求 =
  [adding-a-research-role 技能 §3–4](../../.agents/skills/adding-a-research-role/SKILL.md)；
  skills 按角色硬隔离（`preset-structure` + L1 真挂载断言）。

## 文档义务

- 包 README 拥有配置、行为、**部署前置**、限制与扩展点（当前合同）；行为或发布集改变同 diff 更新；
- 部署面（preflight/scaffold/workspace 种子）改动要跑 `release-smoke`（L2 安装形状）；
- 已知限制与延后工作放固定节 `## 已知限制与延后工作`（上游 Known Limitations 节同构）。
