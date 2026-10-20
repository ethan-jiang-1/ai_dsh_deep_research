# AGENTS.md — 本仓库的入口链

DSH Deep Research 插件：一个包（`packages/deep-research-pack`）提供四个研究角色 preset
（`Deep Research Lead / Scout / Analyst / Critic`）；协作主通道 = DSH 现成 Agent Teams。
方法论内核移植自 codex Deep Research harness（映射表 docs/design/30-methodology-mapping.md）。

## 入口链（唯一正本——其他文件一律指回本节，不再各自复述）

> **先分流**：先按 [00-index §先分流](docs/00-index.md) 选行，再读该行指向的文档；下面这条
> 1–4 步链**只在"改本仓"时适用**（用户说启动 / 跑研究 / 装插件 = "用它"，先看那节）。

按序读，不跳：

1. **本文件**——布局 + 命令速查 + 纪律 + `notes/` 地位 + 本链的定义；
2. **[docs/00-index.md](docs/00-index.md)**——文档地图 + 术语映射（D 号台账 = [decisions.md](docs/decisions.md)，按需跳）；
3. 按本轮授权进入工作：用户直派按请求范围执行；需澄清、查证或记录的问题按 [意图载体总图](docs/design/60-intent-carriers.md) 路由到 `_backlog/issues/`、`bugs/`、`research/`、`methods/` 或 `triggers.md`（可观察重议条件）。Backlog 不是实施前置门；
4. **[docs/guides/60-dev-loop.md](docs/guides/60-dev-loop.md)**——按改动面选择验收与收尾。仅当持久决定需要显式评审时，才为该项建立 [notes/proposed/](notes/proposed/) RFC。

开工就绪最小集 = 上列 1–3，后续按任务需要读取。仓库全局如何运行、调试、交互和分层验收 → [docs/project-map.md](docs/project-map.md)；验收怎么判 → [docs/evaluation.md](docs/evaluation.md)；意图载体边界 → [docs/design/60-intent-carriers.md](docs/design/60-intent-carriers.md)；run 怎么操作 → [guides/61](docs/guides/61-run-playbook.md)。

## 布局

```
CLAUDE.md→AGENTS.md、.claude/skills→.agents/skills    两条 symlink（编辑真文件；后者让 Claude 系
                         harness 发现同一批开发技能——verify 门禁 claude-symlink 校验）
子树 AGENTS.md            docs/ · scripts/ · notes/ · packages/deep-research-pack/ · tests/ · _backlog 各一份——只放该
                         子树的指令（根只放每轮常驻指令；vendor 树内多份同构，份数以盘上为准；本仓另有研究手册与 pack 种子副本两份 AGENTS.md，见各自行）
README.md                 人类门面（Start Here 链接 + 稳定原则摘要；命令正本 = guides/60 §2，不复制）
_backlog/                 问题澄清与证据区：issues/、bugs/、research/、methods/、triggers.md、_archived/（另有
                          _done/ 改名兼容指针，见 _backlog/README 载体导航）；
                          手册 = _backlog/README.md、子树门牌 = _backlog/AGENTS.md（修复授权/状态生命周期速览）
package.json / pnpm-workspace.yaml / pnpm-lock.yaml   根 workspace（scripts: verify/test；pnpm 只挂本仓包，vendor 入 workspace 按实际构建需求——见 pnpm-workspace.yaml 头注）
packages/deep-research-pack/   唯一自写包（配置为主 + 研究驾驶舱[Research Cockpit，观察面 client 套件，D18，构成正本 = docs/design/40-research-cockpit.md]）：presets/<role>.patch.yml（单行形态=一条 @deepseek-ai/dsh-agent-preset 行，DSH 0.1.7 起同形态，config.plugins 内声明 persona/skills/工具行）+ presets/<role>/skills/<n>/SKILL.md、cordis.patch.yml（bundle 行）、workspace/（工作区种子：手册+NODES+判型库+偏好库+模板，生成物）、scripts/{preflight,scaffold}.mjs（部署 bin）、src/client/ 与 src/lib/（驾驶舱 client 半与折算纯函数，构建产物 lib/）；交付与部署形态 = guides/62，合同 = 包 README
vendor/dsh/               pinned submodule（只读铁律——verify vendor-pin/vendor-clean 把守；机制权威正本，tag/commit 见 §DSH 源码表）
research-workspace/      运行场（角色会话 cwd）：AGENTS.md 研究手册、NODES.md（节点 I/O 契约
                         全表）、question-patterns.md（判型模式库）、method-library.md（用户研究
                         偏好库）、drt_<slug>/（run bundle）、archive/（已交付归档）、_abandoned/
                         （停放位）、drafts/（开发侧草稿，非 run 产物）、templates/run/
docs/                    00-index（地图+术语映射；D 号台账 = decisions.md）→ design/10-60 → discipline-map（纪律全量枚举）→ guides/60（开发环）+ guides/61（run 操作）+ guides/62（插件作者入口）+ evaluation.md（验收合同）
notes/                   **开发记忆与证据链**（核心流程数据，不是历史附件——见下节）；目录名自带时态，
                         总图 = notes/README.md（将来 proposed/ · 过去 implemented/archived/rejected/
                         postmortem/；立项来历 = 该页 §立项来历——用户定调只进 decisions.md D 号依据列）：
                         proposed/（需显式评审的持久决定 RFC）→ implemented/（活的决定记忆；不再指导
                         未来者迁 archived/ 冻结）；
                         rejected/（否决——"决定不做"，带重启条件；非搁置池）；postmortem/（事故复盘）
.agents/skills/          开发技能（DSH 约定路径：project-agents 发现根）：任务匹配即加载的程序化工作记忆
                         （换 pin / 加角色 / 写门禁 / 跑 run / 改轨道 / 交付自审 / 复现间歇缺陷）；与产品内 runtime skills（presets/*/skills/）分家
scripts/                 职责分组六目录 + lib/ 支撑库：verify/（L0 门禁聚合）、smoke/（分级冒烟，keyless/真模型档逐件申报）、probe/（交互与行为探针）、run-gates/（run bundle 机械门与审计）、run-ops/（run 观察与运维投影）、dist/（出包→_dist/）、lib/（冒烟/门禁支撑模块）——逐件职责与档位 = scripts/README.md
tests/                   keyless 回归（node:test，无测试框架；layering 守卫五件套：提及级禁物+解析级调用+import 闭包图+test 命令钉+有家句——规则见 tests/AGENTS.md）
snapshots/               场景证据层：整组录制资产 + 场景声明 snapshot.json（消费 = snapshot-replay-smoke
                         经 scripts/lib/replay-scene.mjs）；分类与证据边界 = snapshots/README.md
dev/                     源码驱动与 run 通道：env.sh（双 home + 裸 dsh 拦截 + pre-commit 挂载）、vendor-build.sh（vendor 树构建）、render-overlay / sync-pack-workspace（tracked 生成物生成器：overlay 与 pack 工作区种子）、boot-run.sh（run 通道开跑，自 source env.sh）/ run-driver.mjs（通道驱动与呈交，内部调 boot-run）、run-kickoff / hitl-answer（会话驱动与 HITL 代答）、record-role-fixture（fixture 录制）、research.overlay.yml（**生成物**，勿手改）、hooks/（pre-commit 红灯拦 commit）——逐件职责 = dev/README.md
runtime/                 运行态区（gitignored）：harness-home/（开发 DSH home：会话/凭据/插件安装）+
                         smoke-workspace/（冒烟与 boot 运行产物）——dev/ 只住源码驱动，跑出来的东西住这里
_dist/                   对外交付件：安装手册.md（tracked 生成物，生成器 = scripts/dist/export-dist.mjs）
                         + 打包 tgz（gitignore）
（布局 = 骨架图，非全量清单——scripts/dev 全档工具与逐命令说明 = guides/60 §2；
  _backlog 细构[问题、方法、调研与归档] = _backlog/README.md）
```

本轮工作以用户请求和已有授权为准；开工/收尾程序 = 第 4 步。

## `notes/`：开发记忆（常设指令）

**开工先查 notes，再改代码**：按条目名/机制名检索（只读命中的，不通读全树）；**只有承载持久决定
理由的变更**（代码/测试/现有文档说不清的"为什么选它、放弃了什么"）才需**同一变更**新增或更新
Note——机械与局部编辑（含本地 UI 呈现与交互改动）豁免。细则是子树指令，不在这里复述：

- **时态总图 = [notes/README.md](notes/README.md)**（`proposed/` = 需显式评审的持久决定提案；
  `implemented/` `archived/`（冻结） `rejected/`（防复犯的否决理由） `postmortem/` = 决定与证据记忆）；
- **写入触发 / 取代检查 / 格式与毕业 = [notes/AGENTS.md](notes/AGENTS.md)**；
- **任务流程**（换 pin / 加角色 / 写门禁 / 跑 run / 改轨道 / 交付自审 / 复现间歇缺陷）= `.agents/skills/` 开发技能，按
  description 触发加载，不占常驻上下文。

原生定义（vendor 树内，本仓不复制）：`vendor/dsh/.agents/notes/README.md`（生命周期/分类/
格式骨架）、`vendor/dsh/.agents/notes/AGENTS.md`（取代检查常设指令）、
`vendor/dsh/.agents/notes/implemented/AGENTS.md`（维护规则）。本仓落地与差异见
[notes/README.md](notes/README.md)。

## 命令速查（全档正本 = [guides/60 §2](docs/guides/60-dev-loop.md)）

```sh
source dev/env.sh    # ⚠ 前置：双 home + 裸 dsh 拦截（DSH_HOME=runtime/harness-home）；L1/L2 与须先 source 的脚本必须先 source（清单正本 = scripts/README 档位列），未 source 自拒 exit 2（run 通道 dev/boot-run.sh 自 source，勿重复）
pnpm verify          # L0 结构门禁（keyless，收尾必跑）
pnpm test            # L0 keyless 回归（唯一登记的测试命令）
```

其余全档（L1 挂载 / L2 安装 / L4-lite / run 通道 / 观察面 / 部署 bin）与逐命令说明 = [guides/60 §2](docs/guides/60-dev-loop.md)；档位与密钥 = 下节。

## 密钥

档位词汇：**keyless** = 无凭据可跑；preset-smoke 真挂载档无模型调用、不需要 key。
release-smoke 无模型调用，安装验收使用 `--install-only` 跳过模型就绪检查；默认 preflight 仍检查凭据在场；
**真模型档** = 需凭据并调用模型；`scripts/` 入口 closed set 正本 = [smoke-contract](tests/contracts/smoke-contract.test.mjs)（成员清单 = 该测试的 REAL_MODEL；本行不复制名单）。`dev/record-role-fixture` 是单独录制工具，完整研究 run 属 L4，均不在该脚本闭集中；档位与验收面见[项目地图](docs/project-map.md)。CDP `--ask` 按当前会话档处理（模式表 = [项目地图](docs/project-map.md)）。

L4-lite 真模型冒烟需要 `DEEPSEEK_API_KEY`：开发 home（`runtime/harness-home/.credentials.yaml`）配一次
即可，永不提交密钥；web 搜索无需独立 key——base 的 `web-search-deepseek` 行 `apiKeyEnv: DEEPSEEK_API_KEY`，与 chat 同一把钥匙（实证：vendor `packages/bundle/base/cordis.patch.yml` 的 web-search-deepseek 行）。

## DSH 源码：机制权威在哪

| 实体 | 位置 | 角色 |
|---|---|---|
| ① 开发基线（唯一权威） | `vendor/dsh/`（本仓 pinned submodule，tag `dsh-v0.2.1-rc.2` @ `687f282e86`，只读铁律——verify vendor-pin/vendor-clean 把守） | 机制核对与验证会话一律走它（dev/env.sh 的 dsh 函数与 `pnpm dsh` 从此处源码起） |
| ② 日用全局安装 | npm 全局（`which dsh`） | 与本 repo 开发无关；版本随全局漂移，行为不作机制依据 |
| ③ 参考仓 | `/Users/bowhead/ai_dsh_company/`（插件工程范式）、`/Users/bowhead/ai_tool_deepresearch/`（方法论源头） | 只读参考；吸收落点登记在 docs/external-materials.md |

DSH 全局不变量（fail-loud / model-visible ⟺ logged / registrations are effects / plugins
not loop changes）= vendor 树根 AGENTS.md Conventions 节。

## 纪律（全量正本 = [discipline-map.md](docs/discipline-map.md)——vendor 逐源三态枚举）

> 全表 = [discipline-map](docs/discipline-map.md)（每行 = DSH 做法 → 本仓落点 → 照搬/带证据适配/
> 不适用+理由；随 vendor 换 tag 重校）——纪律的权威正本。速查关键词：fail-loud · model-visible ⟺ logged ·
> 完成定义 = 真检查 · no-key 证管道 / with-key 证 agent · verify the world · 真入口路径 ·
> 新门禁带反证 · docs = 当前合同 · 同 diff 带 Note · 窄证据切片 · 卫生铁律 · 工具态重定向。
>
> **证据匹配面**：改动的面 → 证据类型，执行正本 = [guides/60 §2 任务型路由表](docs/guides/60-dev-loop.md)；新契约测试与门禁同 diff 带反证（先看红再交付绿）。
>
> **研发宪章**（2026-09-27 用户定调）= [README §研发宪章](README.md)：循 DSH 而不发明 · 自主优先
> 并借鉴成熟 DSH 插件（采纳度为信号）· **审阅分层**——机械门禁/审计/判据探针/对抗自审自主做，
> 只在阶段边界请人（REVIEW 是最后手段，不是例行步骤）。

## 编辑这些指令

`CLAUDE.md` symlink `AGENTS.md`（编辑真文件）。根 AGENTS.md 只放**每轮都要在场的常驻指令**
（每条 1–3 行 + 链到 home）；子树专属指令放该子树的 `AGENTS.md`（`docs/` · `scripts/` ·
`notes/` · `packages/deep-research-pack/` · `tests/` · `_backlog`）。入口链成员与行数上限分别由 `entry-chain` 与
`doc-budgets` 门禁把守；上限在 [scripts/doc-budgets.json](scripts/doc-budgets.json)，
超限处置序 = 下放 > 压缩 > 升顶（升顶须同变更登记理由——上限过低是预算 bug）。

## 术语速查

概念 → 官方载体 → 源码路径 = [00-index §术语映射](docs/00-index.md)；探索路由（vendor 树）=
`vendor/dsh/docs/architecture.md` → `vendor/dsh/docs/capability-seams.md` → 具体 package README。
