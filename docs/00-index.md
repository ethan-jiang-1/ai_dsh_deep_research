# 00 · 文档地图、组织原则与正本指针

本目录是"DSH Deep Research 插件"项目的文档层。性质：**当前合同 + 设计依据**——实现开始后，
随代码同 diff 维护"现在为真"的部分；单次决策与时间线归 `notes/`。

> **读法（省上下文）**：入口链第 2 步只读本页 §先分流 + §文档地图；术语对照 = [terms.md](./terms.md)、
> D 号台账 = [decisions.md](./decisions.md)、外部材料 = [external-materials.md](./external-materials.md)，按需跳。

## 先分流：用户要"用它"还是"改它"

**先记住这条模型**：本包是 DSH 插件（bundle），产品形态 = 自有 `deep-research` profile（D40）。
安装/启动全走 DSH 原生：`dsh --profile deep-research --from-default-profile web` → `dsh plugin
--profile deep-research add <pack> <team>` → `dsh --profile deep-research`；首屏询问项目目录。
没有 launcher、没有 scaffold、没有自定义安装器；只保留只读 doctor。开发者在本仓走 `research`
profile + `research-workspace/` + run-driver。两条路径的命令与数据根不同，不要互相套用。

| 用户的说法 | 走哪（该事的唯一 owner） | 首个动作 |
|---|---|---|
| "用它""启动这个插件""跑研究""装到我的 DSH"（产品用户） | [pack README](../packages/deep-research-pack/README.md) + [`_dist/安装手册.md`](../_dist/安装手册.md) + [guides/65](./guides/65-run-forms.md) | `dsh --profile deep-research --from-default-profile web` → `dsh plugin --profile deep-research add dsh-deep-research-pack` → `dsh --profile deep-research` |
| "在本仓启动/开跑/接着上次跑"（开发通道，默认 `runtime/harness-home`） | [guides/61](./guides/61-run-playbook.md) | `node dev/run-driver.mjs up`（起/复用通道 + 验浏览器面 + 呈交 URL） |
| "换 profile/home""装进现有 web profile""诊断装得对不对" | [guides/65](./guides/65-run-forms.md) + [`_dist/安装手册.md`](../_dist/安装手册.md) | `dsh --profile <p> --from-default-profile web --dump-config`；诊断 = 安装副本的 `dsh-deep-research-doctor` |
| "只验证插件还能挂载/安装"（证据面，不产生可用实例） | [guides/60 §2](./guides/60-dev-loop.md) | `source dev/env.sh && node scripts/smoke/product-smoke.mjs`（或 preset/release-smoke） |
| "改插件内容"（角色 / skill / 驾驶舱 / 部署面） | [guides/62](./guides/62-plugin-authoring.md) | 该页 §参与阶梯 + §改动影响面 |
| "改本仓开发流程或仓库文档"（门禁 / docs / notes / 入口链 / 各 README） | [guides/60 §1](./guides/60-dev-loop.md) | 按工作类型分支（入口链第 3–4 步在此展开） |

**开跑前置**（产品 / 开发两套）

- **产品**：DSH 满足 `engines.dsh` + Node 满足 `engines.node`；`dsh` 在 PATH；首次团队层需要 pnpm；
  工作区可写；研究 run 需要模型凭据（首启/安装不需要）。
- **开发**：仓根 `pnpm install` + vendor submodule + vendor 构建（`bash dev/vendor-build.sh`）；
  `runtime/harness-home` 凭据；端口空闲（缺省 3083）；`research-workspace` 已注册（run-kickoff 幂等补登）。
  `bash dev/boot-run.sh` 自己 source `dev/env.sh`；命令/前置唯一 owner = [guides/60 §2](./guides/60-dev-loop.md)。

**歧义裁定**：用户未指定 home 时——产品用户默认 `$DSH_HOME`；开发通道默认
`runtime/harness-home`（source env.sh）。"启动这个插件"没有额外上下文时默认指本仓开发通道；
要给外部用户装产品走产品行。**开发通道**别绕过 run-driver 的漂移门（直接 `dsh --profile research`
会用旧镜像）；**产品用户**用 DSH 两步安装 + `dsh --profile deep-research`；首屏问项目目录。

**裸动词也指开发通道**："启动一下""起一下"未点名对象时，默认指本仓 DSH 环境，首个动作 = `node dev/run-driver.mjs up`；仅当对话正围着另一个可启动物（某条冒烟/探针）时才跟随该物。

**每次开发通道"启动"前先扫一眼在飞 run**：根目录下每个未归档 bundle（`archive/` 除外）都要报出来，
接续/归档/新开问用户、带 slug + mtime；分类判据与问询全文 = [61 §0](./guides/61-run-playbook.md)。

## 文档组织原则

**docs/ 按"性质"分层，不按"时间"分层**（沿 ai_dsh_company D10）：时间维度的东西（初始意图、
提案、已废方案）住 `notes/`；按时间分目录必然长出"烂尾层"。

| 层 | 目录 | 性质 | 生命周期 |
|---|---|---|---|
| 导航 | 本文件 | 地图 + 台账 | 活（每决策/每新文档更新） |
| 合同 | [evaluation.md](./evaluation.md) | **验收怎么判**（五面） | 活（变更须 D 号） |
| 设计 | `design/` | **现在怎么组成、为什么**：机制依据、方案取舍 | 稳定；被推翻时归档并记 D 号 |
| 问题与证据 | 根 `_backlog/`（[issues](../_backlog/issues/README.md) + bugs/ + research/ + methods/） | **问题澄清、查证与结论准备**：按需使用，不是实施前置 | 按结论关闭或归档 |
| 指南 | `guides/` | **怎么操作**：开发环 | 活（随操作方式演进） |

## 文档地图

| 文档 | 层 | 回答什么 |
|---|---|---|
| [terms.md](./terms.md) | 导航/合同 | **术语对照**：本项目说法 → DSH 官方载体 → vendor 落点（按需查；新编号词汇先在此登记） |
| [project-map.md](./project-map.md) | 导航 | 人和 Agent 的驾驭地图：运行链、职责划分、测试资产分层与失败定位入口 |
| [decisions.md](./decisions.md) | 导航/合同 | D 号台账正文（按需查；决策理由/输掉的方案归 notes/） |
| [external-materials.md](./external-materials.md) | 导航/合同 | 外部材料钉版身份与吸收落点（按需查） |
| [evaluation.md](./evaluation.md) | 合同 | 评估五面（L0 结构/L1 挂载/L2 安装/L3 领域/L4 交付）与里程碑矩阵——**先于框架定案** |
| [design/10-architecture.md](./design/10-architecture.md) | 设计 | repo 形态与组合层（单包 5 preset：四研究角色 + 方法编辑）；通道选型（agent-team 主通道）；工具面；偏离登记 |
| [design/20-roles.md](./design/20-roles.md) | 设计 | 角色内容：四研究角色 + 方法编辑（D37）的职责 owner 表、persona 要素、skills 面（清单 = 盘上目录）、信噪比策略落点 |
| [design/30-methodology-mapping.md](./design/30-methodology-mapping.md) | 设计 | **方法论映射**：codex Deep Research harness 内核 → DSH 载体（L3 领域面的核心载体） |
| [design/40-research-cockpit.md](./design/40-research-cockpit.md) | 设计 | **研究驾驶舱**：观察面 client 套件的当前事实正本（定位/构成/通道/纪律/验证/边界——agent 一找就到的单一入口） |
| [design/50-agent-loop-and-state.md](./design/50-agent-loop-and-state.md) | 设计 | **Agent Loop 与状态模型**：运行驱动链总览 + 四类运行状态（run bundle / session log / goal·任务板 / 观察面）的 canonical 合同、恢复优先级与交付判定——当前事实正本 |
| [design/60-intent-carriers.md](./design/60-intent-carriers.md) | 设计 | **意图载体总图**：问题、授权工作、结论去向、RFC/Note 与 TODO 的 owner、适用条件和出场方式 |
| [AGENTS.md](./AGENTS.md) | 指令 | **文档标准**（`docs/` 子树）：层级归属（一个事实一个家）/ 写作规则 / slop 清单 / 预算处置序——上游 `docs/AGENTS.md` 同构 |
| [alignment-ledger.json](./alignment-ledger.json) | 合同 | **对齐台账（机读）**：vendor/dsh harness 源面逐项结论（adopted/adapted/na + 落点 + 理由；条数以台账 `sources` 数组为准）；门禁 `align-ledger` 对账（source 在 vendor 存在 / 落点存在 / na 有理由）——人读视图 = discipline-map 全源表 |
| [discipline-map.md](./discipline-map.md) | 合同 | **纪律全量枚举**：vendor 逐源三态表（照搬/带证据适配/不适用+理由）——AGENTS §纪律的正本（随 vendor 换 tag 重校） |
| [_backlog/](../_backlog/README.md)（[问题](../_backlog/issues/README.md)） | 问题与证据 | 问题澄清、查证方法、调研材料、缺陷、结论去向与归档 |
| [snapshots/](../snapshots/README.md) | 问题与证据 | 场景证据层：有持久消费者的整组录制回放资产与场景声明（消费 = snapshot-replay-smoke；证据边界与维护规则见该页） |
| [guides/60-dev-loop.md](./guides/60-dev-loop.md) | 指南 | 开发环：六步闭环、面选择表、双 home、密钥 |
| [guides/61-run-playbook.md](./guides/61-run-playbook.md) | 指南 | **run 操作指南**（研究发起人入口）：run-driver/boot-run、lead 会话、HITL 两点、观察面——run 通道（research profile：本包 + vendor agent-team-profile 层，P1 定案）的使用面 |
| [guides/62-plugin-authoring.md](./guides/62-plugin-authoring.md) | 指南 | **插件作者入口**（改插件内容的人/agent 入口）：DSH 词汇对齐（plugin/bundle/profile/preset）、参与阶梯 S0–S3、新行为归属、范本与证据义务、**交付与部署形态**（bundle/profile 拓扑 + 工作区种子 + 部署 bin）、**改动影响面**（添/换/删要一起动什么）——上游 `docs/user/develop/**` 的本仓投影 |
| [guides/63-git-boundary.md](./guides/63-git-boundary.md) | 指南 | **Git 入库边界与跨环境纪律**：源/合同/种子/证据 vs 生成物/运行态/本机态；三问判据、tracked 生成物条件、跨环境规则与门禁 |
| [guides/64-release-versioning.md](./guides/64-release-versioning.md) | 指南 | **发布版本、tag 与 npm 发布顺序**：pack 版本 = 唯一发布源、root 镜像、annotated tag、发布前 `release-check` 与 `release-version` 门禁 |
| [guides/65-run-forms.md](./guides/65-run-forms.md) | 指南 | **运行形态合同**：M1 DSH 两步安装 / M2 独立开发 / M3 移交；P/H/W 归属；`engines.dsh` + 团队层钉版；产品设置与首屏工作区；`DSH_DEV_HOME`/多实例；干净 handoff 与证据矩阵 |

> **编号消歧**：`design/60-intent-carriers.md` 与 `guides/60-dev-loop.md` 同号不同义——design/ 按设计层编号（10 架构 … 60 意图载体），guides/ 按操作手册编号（60 开发环 / 61 run / 62 作者入口 / 63 git 边界 / 64 发布 / 65 运行形态）；引用写全路径。

## 决策台账

D 号正文 = [decisions.md](./decisions.md)（按需查，不在本页通读；新决策只进该页，本页不再复制）。
本页只保留"先去哪读"的地图与术语；决策理由/输掉的方案仍归 `notes/`。

## 术语映射

本项目 ↔ DSH 官方 ↔ vendor 落点的对照表在 [terms.md](./terms.md)（按需查：遇到同名不同义、
或要给新编号词汇定所指时打开）。


## 外部研究材料登记

外部材料、钉版身份与吸收落点 = [external-materials.md](./external-materials.md)（按需查；本页不复制）。
