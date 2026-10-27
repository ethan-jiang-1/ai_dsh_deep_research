# 00 · 文档地图、组织原则与正本指针

本目录是"DSH Deep Research 插件"项目的文档层。性质：**当前合同 + 设计依据**——实现开始后，
随代码同 diff 维护"现在为真"的部分；单次决策与时间线归 `notes/`。

> **读法（省上下文）**：入口链第 2 步只读本页 §先分流 + §文档地图；术语对照 = [terms.md](./terms.md)、
> D 号台账 = [decisions.md](./decisions.md)、外部材料 = [external-materials.md](./external-materials.md)，按需跳。

## 先分流：用户要"用它"还是"改它"

**先记住这条模型**：本包是 bundle + preset 的集合，**自身没有进程**——"启动它"始终等于"装进
某个 profile + 起该 profile"（本仓 = `research` profile）。带着这个模型读下表：每行只给**一个
首个动作**（会占住前台的已标出；本表覆盖用户对"启动 / 跑 / 装 / 改"的全部常见说法）：

| 用户的说法 | 走哪（该事的唯一 owner） | 首个动作 |
|---|---|---|
| "启动这个 DSH 插件""在单独的 DSH 环境（隔离 home）里跑/启动""跑起来看看""开跑"——**未指定别的 home 时就是本行，直接做、不要停下来问** | [guides/61](./guides/61-run-playbook.md) | `node dev/run-driver.mjs up`（起/复用通道 + 验浏览器面 + 给呈交 URL；**别**直接 `dsh --profile research`——那会绕过漂移检测、静默用旧镜像） |
| "接着上次跑""继续那个研究" | [guides/61 §5](./guides/61-run-playbook.md) | 同一条 `node dev/run-driver.mjs up`；起来后新开 lead 会话说"继续 `<slug>` 这个 run" |
| "装到我的 DSH""部署给别人 / 别的机器" | [pack README §部署](../packages/deep-research-pack/README.md) + [`_dist/安装手册.md`](../_dist/安装手册.md)（出包 = `node scripts/dist/export-dist.mjs`） | `dsh --profile <p> --from-default-profile web --dump-config`（一次性；写的是 `DSH_HOME` 那个 home） |
| "只验证插件还能挂载"（开发证据面，不产生可用实例） | [guides/60 §2](./guides/60-dev-loop.md) | `source dev/env.sh && DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs` |
| "改插件内容"（角色 / skill / 驾驶舱 / 部署面） | [guides/62](./guides/62-plugin-authoring.md) | 该页 §参与阶梯 + §改动影响面 |
| "改本仓开发流程或仓库文档"（门禁 / docs / notes / 入口链 / 各 README；`packages/deep-research-pack/` 内随包分发的文档走上行"改插件内容"） | [guides/60 §1](./guides/60-dev-loop.md) | 按工作类型分支（入口链第 3–4 步在此展开） |

**开跑前置**（只对第 1/2 行）：仓根 `pnpm install` 已跑 + `vendor/dsh` submodule 已 init +
vendor 构建产物在场（`bash dev/vendor-build.sh`；boot 自检会拦）+
`research-workspace` 已注册进 DSH（[61 §1](./guides/61-run-playbook.md)；run-kickoff 幂等补登）+
`runtime/harness-home/.credentials.yaml` 有 `DEEPSEEK_API_KEY`（boot 本身 keyless）。
`bash dev/boot-run.sh` **自己 source `dev/env.sh`**——先 source 不是前置（`AGENTS.md §命令速查`
那条 ⚠ 只约束须先 source 的脚本——清单以 [scripts/README](../scripts/README.md) 档位列为准）。要它在你离开后继续服务 = [61 §0](./guides/61-run-playbook.md)
的无人值守形态（§0.1 两路）。

**歧义裁定**（两条规则谁管谁）：用户**未指定别的 DSH home** → 直接走第 1 行，不停下来发问
（第 1 行的"不要问"只指"别问装哪个 home"；**在飞 run 的接续/新开照下面那条办，该问就问**）；
只有他明说"装到我日用 / 别人的 DSH"、或目标 home 不是 `runtime/harness-home` 时才问一句
"装到哪个 DSH home？"（本仓开发通道 = `runtime/harness-home`，先 `source dev/env.sh`；日用 =
`~/.dsh`，**不要** source——两者装的东西不同）。

**裸动词也指第 1 行**："启动一下""启动一下这个""起一下"这类不点名对象的说法，指称由语境
唯一消解——本仓里能被"启动"的就是插件的 DSH 环境，没有第二物。照第 1 行直接做，**不反问
"启动什么"**；仅当当下对话正围着另一个明确可启动物（某条冒烟 / 探针 / 脚本）时才跟随该物。

**每次"启动"前先扫一眼在飞 run**：根目录下每个未归档 bundle（`archive/` 除外）都要报出来，
接续 / 归档 / 新开问用户、带上 slug + mtime、**都不自己挑**——分类判据与问询全文 =
[61 §0](./guides/61-run-playbook.md)。

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
| [design/10-architecture.md](./design/10-architecture.md) | 设计 | repo 形态与组合层（单包四角色）；通道选型（agent-team 主通道）；工具面；偏离登记 |
| [design/20-roles.md](./design/20-roles.md) | 设计 | 四角色内容：职责 owner 表、persona 要素、skills 面（清单 = 盘上目录）、信噪比策略落点 |
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
| [guides/65-run-forms.md](./guides/65-run-forms.md) | 指南 | **运行形态合同**：M1 安装 / M2 独立开发 / M3 移交；P/H/W 归属；`engines.dsh` + 团队层钉版；种子 `--check/--upgrade`；`DSH_DEV_HOME`/多实例；干净 handoff 与证据矩阵 |

> **编号消歧**：`design/60-intent-carriers.md` 与 `guides/60-dev-loop.md` 同号不同义——design/ 按设计层编号（10 架构 … 60 意图载体），guides/ 按操作手册编号（60 开发环 / 61 run / 62 作者入口 / 63 git 边界 / 64 发布 / 65 运行形态）；引用写全路径。

## 决策台账

D 号正文 = [decisions.md](./decisions.md)（按需查，不在本页通读；新决策只进该页，本页不再复制）。
本页只保留"先去哪读"的地图与术语；决策理由/输掉的方案仍归 `notes/`。

## 术语映射

本项目 ↔ DSH 官方 ↔ vendor 落点的对照表在 [terms.md](./terms.md)（按需查：遇到同名不同义、
或要给新编号词汇定所指时打开）。


## 外部研究材料登记

外部材料、钉版身份与吸收落点 = [external-materials.md](./external-materials.md)（按需查；本页不复制）。
