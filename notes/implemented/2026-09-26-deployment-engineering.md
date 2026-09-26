# 部署工程：pack 自包含 + 部署工具 + 信息架构定案

> 状态：implemented

## 决定

插件"做完"不等于"能装"。本变更把交付面补齐，并把部署知识按三层分家写进各自的 home：

1. **pack 自包含**：研究工作区种子（手册 `AGENTS.md` + `templates/run/`）随包发布——
   手册是**会话 cwd 的内容**（DSH 的 agent-instructions 从 cwd 向上发现 `AGENTS.md` 注入每个
   角色），不在包里 → 部署方装了包也没有研究纪律；
2. **种子是 tracked 生成物**：正本 = 仓库 `research-workspace/`，`dev/sync-pack-workspace.mjs`
   同步进 `packages/deep-research-pack/workspace/`，门禁 `pack-workspace-fresh` 防漂移
   （与 `overlay-fresh` 同形态：生成 + 新鲜度）；
3. **两条部署 bin**（`package.json` 的 `bin`）：`preflight.mjs` 六项机检（DSH 版本 / 平台
   peer 包 / 团队机制层 / 工作区手册+模板 / 构建产物 / 模型密钥），fail-loud 且每项带补救
   命令；`scaffold.mjs` 幂等三件事（铺种子不覆盖 / 补团队层 / 复跑 preflight）；
4. **信息架构三层分家**（用户问"写在哪儿最合适"的定案）：
   | 知识 | home | 读者 |
   |---|---|---|
   | 交付什么、怎么装（前置/三步/验证/限制） | [pack README](../../packages/deep-research-pack/README.md) | 装的人 |
   | 本仓怎么操作 + 添/换/删影响面 | [guides/62](../../docs/guides/62-plugin-authoring.md) §交付与部署形态 + §改动影响面 | 改的人 |
   | 为什么这样决定 | 本 Note + D 台账 | 追溯者 |
5. **团队层不进本包**：`spawn_teammate` / `team_task_*` 归 vendor 的
   `agent-team-profile` 层（组合与实战 config 在该层——RFC m2-p1-run-channel A 定案）；
   `scaffold` 负责确保它在场，`preflight` 负责检查它在场。

## 实施记录

- `dev/sync-pack-workspace.mjs`（`--check` 给门禁）+ 门禁 `pack-workspace-fresh`
  （evaluation.md §L0 登记 + doc-budgets 登记 `packages/deep-research-pack/workspace/AGENTS.md`）；
- `packages/deep-research-pack/scripts/{preflight,scaffold}.mjs` + `package.json`：
  `files` += `workspace/**` `scripts/**`、`bin` 两条命令、`prepack` 构建钩子；
- README 重写（修过时"纯配置、无 client 面"——D18 后已发 client bundle；补内容表/部署三步/
  研究怎么跑/已知限制节）；pack AGENTS.md 同步（配置为主 + 一个 client 面 + 部署义务）；
- guides/62 新增 §交付与部署形态（bundle/profile 拓扑 + 工作区=纪律载体 + 三个生成物与门禁）
  与 §改动影响面（添/换/删九行矩阵）；根 AGENTS 命令表/布局行、00-index 地图行同步；
- 上游权威 = `vendor/dsh/docs/user/develop/basic/publish.md`（bundle 是分发单位、profile 是
  启动环境、二者互斥）——guides/62 词汇表与部署节都指它，不自造同义词。

## 验证

| 面 | 结果 |
|---|---|
| 门禁 | 27 个全绿（含新 `pack-workspace-fresh`） |
| preflight | 全绿 exit 0（真环境：DSH 0.1.7-rc.2 / 14 peer 包 / 团队层 / 手册+模板 / 构建产物 / 凭据文件） |
| scaffold | `--dry-run` 预演正确（7 文件 + 团队层命令，不落盘） |
| L2 | `release-smoke` ALL PASS（新发布集真装一次） |

## 输掉的方案

- **手册做成 skill**：否决——它是跨角色共享纪律，skills 按角色硬隔离（要复制四份，且
  "手册是会话 cwd 内容"这一 DSH 语义被绕过）；
- **依赖 `$DSH_HOME/AGENTS.md` 全局注入**：否决——那是用户全局面（影响所有会话），
  且 pack 无法写它；工作区种子才是"研究纪律只作用于研究会话"的正确载体；
- **不带种子、只写文档让用户自己建工作区**：否决——文档会漂移，且"装了没纪律"是静默失败
  （角色照跑但无契约）；种子 + 门禁把这件事变成机械保证；
- **preflight 自动装 DSH 本体 / 写密钥**：否决——越界（DSH 安装与密钥属部署方安全边界）；
  preflight 只报告 + 给命令，scaffold 只做工作区与 profile 层。
