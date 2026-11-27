# 00 · 文档地图、组织原则与正本指针

本目录是「DSH Deep Research 插件」唯一维护**核心思想主干与当前合同**的地方（只写现在为真）。
**单向依赖**：`docs/` 可依赖 `notes/`（决定理由与验证）与源码，不依赖 `_backlog/` 的历史探索卡与具体方法（仅限 `_backlog/triggers.md` 与池入口）。

> **省上下文读法**：改仓入口链第 2 步先看下方「怎么读」选起点；`terms.md` / `decisions.md` / `external-materials.md` 按需跳转。

## 怎么读（先按目标选起点）

| 你的目标 | 从哪读起 | 核心主干顺序 |
|---|---|---|
| **看系统内部技术架构与设计** | [10-architecture](./design/10-architecture.md) | `10 架构` → `20 角色` → `30 方法论映射` → `40 研究驾驶舱` → `50 状态与循环` → `70 内容组织` |
| **安装 / 启动 / 跑一次研究** | 下方「先分流」 | 安装走 [`_dist/安装手册.md`](../_dist/安装手册.md)；本仓开发通道走 [guides/61](./guides/61-run-playbook.md) |
| **改插件、改仓或选验证层** | [guides/62](./guides/62-plugin-authoring.md) · [guides/60](./guides/60-dev-loop.md) | 插件作者看 `62`；仓级开发闭环看 `60`；测试证据选择看 `67`；运行调试定位看 [project-map](./project-map.md) |
| **查为什么这样定、放弃了什么** | [decisions.md](./decisions.md) | D 号纯路由 → `notes/implemented/`（`_backlog/` 是探索池，不作合同源） |

## 先分流：用户要"用它"还是"改它"

**核心运行模型**：本包是 DSH 插件（bundle），运行环境 = 用户自建 **custom profile** `deep-research`（[D41](./decisions.md#d41)）。**当前 0.3.7 用本地 tarball 装包（`file:`）**，npm / Plugins 页 / Discover 为 staged；启动 `dsh --profile deep-research`（无独立 launcher/scaffold，只留只读 doctor）。完整安装合同的 owner = [`tools/release/product-manual.md`](../tools/release/product-manual.md) → 生成物 [`_dist/安装手册.md`](../_dist/安装手册.md)；根 [README](../README.md) 与 [pack README](../packages/deep-research-pack/README.md) 承载安装摘要与首装顺序。

| 用户的说法 | 唯一 owner | 首个动作 |
|---|---|---|
| "用它""装到我的 DSH"（安装用户） | [`_dist/安装手册.md`](../_dist/安装手册.md) + [pack README](../packages/deep-research-pack/README.md) + [guides/65](./guides/65-run-forms.md) | 按安装手册：CLI 建 profile（仅首次）→ `dsh plugin --profile deep-research add file:<tgz>` |
| "在本仓启动/开跑/接着上次跑" | [guides/61](./guides/61-run-playbook.md) | `node tools/channel/run-driver.mjs up`（起/复用通道 + 验浏览器面 + 呈交 URL） |
| "换 profile/home""装进现有 web profile""诊断" | [guides/65](./guides/65-run-forms.md) + [`_dist/安装手册.md`](../_dist/安装手册.md) | 新名字建 profile（**已有 profile 勿重复 `--from-default-profile`**）；诊断 = `dsh-deep-research-doctor` |
| "验证挂载/安装" / "复现单点机制" | [guides/60 §2](./guides/60-dev-loop.md) · [guides/66](./guides/66-probe-playbook.md) | 冒烟 `checks/smoke/*.entry.mjs` / `preset.e2e.mjs`；单点机制先看 [探针索引](../probes/INDEX.generated.md) |
| "改插件" / "改仓流程与文档" / "选测试" | [guides/62](./guides/62-plugin-authoring.md) · [guides/60 §1](./guides/60-dev-loop.md) · [guides/67](./guides/67-test-strategy.md) | 按改动面查影响、入口链与失败类→最低可见层；目录归属判据见 [guides/68](./guides/68-surface-contract.md) |

**开跑前置**：安装用户需满足 `engines.dsh`、`engines.node` 与模型凭据；开发通道需仓根 `pnpm install` + `bash tools/build/vendor-build.sh` + `runtime/harness-home` 凭据 + 端口空闲（缺省 3083）+ `research-workspace` 已注册（run-kickoff 幂等补登），其余命令与前置正本 = [guides/60 §2](./guides/60-dev-loop.md)。
**歧义裁定**：用户未指定 home 时——安装用户默认 `$DSH_HOME`，开发通道默认 `runtime/harness-home`（source `tools/env.sh`）；"启动这个插件""启动一下""起一下"未点名对象时，默认指本仓开发通道（首个动作 = `node tools/channel/run-driver.mjs up`，勿直接 `dsh --profile deep-research` 绕过漂移门）；给外部用户安装走安装行。每次启动前先扫在飞 run（`archive/` 除外）问用户接续/归档/新开，判据见 [guides/61 §0](./guides/61-run-playbook.md)。

## 文档地图

按"性质"分层，不按"时间"分层（时间维度的决策理由与演进史住 `notes/`）。

### 1. 系统与技术设计（插件系统内核：`design/`）

| 文档 | 回答什么 |
|---|---|
| [design/10-architecture.md](./design/10-architecture.md) | repo 形态、`harness(bundle)` 第一性分层、两层组合面、协作通道、工具面与偏离登记 |
| [design/20-roles.md](./design/20-roles.md) | 四研究角色 + Method Editor（[D37](./decisions.md#d37)）+ worker profiles（[D47](./decisions.md#d47)）职责、persona、skills 与信噪比防线 |
| [design/30-methodology-mapping.md](./design/30-methodology-mapping.md) | **方法论映射**：codex Deep Research harness 内核 → DSH 载体与诚实取舍账 |
| [design/40-research-cockpit.md](./design/40-research-cockpit.md) | **研究驾驶舱**：`src/client/` + `src/lib/` 构成、出厂面白名单、数据通道、分层与防御红线 |
| [design/50-agent-loop-and-state.md](./design/50-agent-loop-and-state.md) | **Agent Loop 与状态模型**：运行驱动链总览 + 四类运行状态合同、恢复优先级与交付判定 |
| [design/70-content-organization.md](./design/70-content-organization.md) | **内容组织**：`presets/` 与 `content/` 按寿命分家、四槽三层、T0/generic 缝与生长协议 |

### 2. 基准合同与治理规则

| 文档 | 回答什么 |
|---|---|
| [evaluation.md](./evaluation.md) | **验收合同**：评估五面（L0–L4）、L0 门禁登记表、契约回归索引、判据形状与里程碑矩阵 |
| [discipline-map.md](./discipline-map.md) | **纪律全量枚举**：vendor 逐源三态表（照搬 / 带证据适配 / 不适用+触发）——[AGENTS](../AGENTS.md) §纪律正本 |
| [alignment-ledger.json](./alignment-ledger.json) | **对齐台账（机读）**：vendor/dsh 源面逐项结论，门禁 `align-ledger` 机械对账 |
| [AGENTS.md](./AGENTS.md) | **文档标准**（`docs/` 子树）：层级归属、写作规则、slop 清单与常驻文档预算处置序 |
| [design/60-intent-carriers.md](./design/60-intent-carriers.md) | **仓库工作流治理**：问题、授权工作、RFC/Note、`_backlog` 与 TODO 的意图载体边界与单向依赖律 |

### 3. 操作与工程指南（`guides/`）

| 文档 | 回答什么 |
|---|---|
| [guides/60-dev-loop.md](./guides/60-dev-loop.md) | **开发环**：反馈双门、六步闭环、语义变更准入、全档命令与任务型路由表 |
| [guides/61-run-playbook.md](./guides/61-run-playbook.md) | **开发通道 run 操作**：run-driver/boot-run、Lead 会话、HITL 两点、观察面与中断恢复 |
| [guides/62-plugin-authoring.md](./guides/62-plugin-authoring.md) | **插件作者入口**：DSH 词汇、参与阶梯 S0–S3、自写代码证据阶梯、交付部署与改动影响面 |
| [guides/63-git-boundary.md](./guides/63-git-boundary.md) | **Git 入库边界**：源/合同/证据 vs 生成物/运行态/本机态的三问判据与跨环境纪律 |
| [guides/64-release-versioning.md](./guides/64-release-versioning.md) | **发布顺序**：pack 版本唯一源、root 镜像、annotated tag 与发布前检查 |
| [guides/65-run-forms.md](./guides/65-run-forms.md) | **运行形态合同**：安装/互操作/独立开发/移交四形态、六轴 owner、profile 与首屏工作区 |
| [guides/66-probe-playbook.md](./guides/66-probe-playbook.md) | **探针手册**：真实边界单点实验的定义、何时用、头注协议与覆盖地图 |
| [guides/67-test-strategy.md](./guides/67-test-strategy.md) | **测试策略**：三环/四账/五关、失败类→最低可见层、类级守卫三判据与重资产预算 |
| [guides/68-surface-contract.md](./guides/68-surface-contract.md) | **维护面合同**：`checks/`（judge）、`probes/`（show）、`tools/`（operate）三分与例外清单 |

### 4. 按需字典与仓外导航

| 文档 | 回答什么 |
|---|---|
| [project-map.md](./project-map.md) | **驾驭地图**：运行链路、修改波及面、测试词汇与症状→首个调试/检查入口 |
| [terms.md](./terms.md) | **术语对照**：本项目说法 ↔ DSH 官方载体 ↔ `vendor/dsh` 落点（新编号词汇登记处） |
| [decisions.md](./decisions.md) | **D 号纯路由台账**：≤100 字定性结论 + 活载体链接（理由与输掉的方案归 `notes/`，[D56](./decisions.md#d56)） |
| [external-materials.md](./external-materials.md) | **外部材料**：仓外参考仓钉版与吸收落点 |
| [reference/package-catalog.generated.md](./reference/package-catalog.generated.md) | **包目录（生成）**：exports / patch / roles / skills / slots |
| [reference/cockpit-registry.generated.md](./reference/cockpit-registry.generated.md) | **驾驶舱注册表（生成）**：`src/{client,lib}` 全量模块清单 |
| [reference/gates-ledger.generated.md](./reference/gates-ledger.generated.md) | **门禁台账（生成）**：L0 门禁域归属、摘要与自测覆盖 |
| [reference/commands.md](./reference/commands.md) | **命令字典**：根 `package.json` 全量 `pnpm` 脚本双向核对 |
| [_backlog/](../_backlog/README.md) · [snapshots/](../snapshots/README.md) | **探索池与回放**：`_backlog/` 承接未定探索；`snapshots/` 存回放金样 |

> **编号消歧**：`design/60-intent-carriers.md`（仓库治理）与 `guides/60-dev-loop.md`（开发环）同号不同义，引用写全路径。

## 决策台账

D 号正文 = [decisions.md](./decisions.md)；术语对照 = [terms.md](./terms.md)；外部材料 = [external-materials.md](./external-materials.md)——均为按需跳转，不在本页通读或复制。
