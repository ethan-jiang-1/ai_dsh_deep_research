# 文档枢纽（`docs/`）

唯一维护「DSH Deep Research 插件」**核心架构与当前合同**（只写 now）。**单向依赖**：`docs/` 可依赖 `notes/` 与源码，不依赖 `_backlog/` 探索卡与具体方法（仅限 `_backlog/triggers.md` 与池入口）。

## 先分流：用它还是改它

**运行模型**：DSH bundle 插件 + 用户自建 custom profile `deep-research`（[D41](./decisions.md#d41)）；**0.3.7 用本地 tarball 装包（`file:`）**，npm / Plugins / Discover 为 staged；启动 `dsh --profile deep-research`（无 launcher/scaffold，只留只读 doctor）。安装合同 = [`tools/release/product-manual.md`](../tools/release/product-manual.md) → [`_dist/安装手册.md`](../_dist/安装手册.md)。

| 意图 | owner | 首个动作 |
|---|---|---|
| "用它/装到 DSH"（安装用户） | [`_dist/安装手册.md`](../_dist/安装手册.md) · [pack README](../packages/deep-research-pack/README.md) · [run-forms](./contracts/run-forms.md) | 建 profile（仅首次）→ `dsh plugin --profile deep-research add file:<tgz>` |
| "本仓启动/开跑/续跑" | [run-ops](./guides/run-ops.md) | `node tools/channel/run-driver.mjs up`（起/复用 + 验面 + 交 URL） |
| "换 profile/装现有 web/诊断" | [run-forms](./contracts/run-forms.md) · [`_dist/安装手册.md`](../_dist/安装手册.md) | 新名建 profile（已有勿重复 `--from-default-profile`）；`dsh-deep-research-doctor` |
| "首次克隆跑起来" | [bootstrap](./guides/bootstrap.md) | `git submodule update --init` → `pnpm install` → `source tools/env.sh && pnpm verify && pnpm test` |
| "验挂载/安装/单点机制" | [dev-loop](./guides/dev-loop.md) · [probe-playbook](./guides/probe-playbook.md) | `checks/smoke/*.entry.mjs` / `preset.e2e.mjs`；单点先看 [探针索引](../probes/INDEX.generated.md) |
| "改插件/文档/选测试" | [plugin-authoring](./guides/plugin-authoring.md) · [dev-loop](./guides/dev-loop.md) · [testing](./testing.md) | 查影响面、入口链与最低可见层；目录归属见 [policy](./policy.md) |

**开跑前置**：安装用户需 `engines.dsh`、`engines.node` 与模型凭据；开发通道需 `pnpm install` + `bash tools/build/vendor-build.sh` + `runtime/harness-home` 凭据 + 端口空闲（3083）+ `research-workspace` 已注册（run-kickoff 幂等补登），命令正本 = [guides/dev-loop.md §2](./guides/dev-loop.md)。

**歧义裁定**：未指定 home——安装用户用 `$DSH_HOME`，开发通道用 `runtime/harness-home`（`source tools/env.sh`）；"启动一下""起一下"未点名默认本仓开发通道（首个动作 = `node tools/channel/run-driver.mjs up`，勿直起 `dsh`）。启动前先扫在飞 run（`archive/` 除外）问接续/归档/新开，见 [run-ops §0](./guides/run-ops.md)。

## 30 秒按问题找入口

| 问题 / 目标 | 直达入口 |
|---|---|
| 刚 clone，装依赖 / 构 vendor / 激活 hooks | [guides/bootstrap.md](./guides/bootstrap.md) |
| 看总分层、组合面、Agent Teams 与工具面 | [architecture.md](./architecture.md) |
| 改 `presets/`、`content/` 或角色职责 | [contracts/presets.md](./contracts/presets.md) · [contracts/roles.md](./contracts/roles.md) |
| 改驾驶舱 Web UI、`src/client/` 或 `src/lib/` | [contracts/client-ui.md](./contracts/client-ui.md) · [cockpit-registry](./reference/cockpit-registry.generated.md) |
| 跑研究卡住 / 白屏 / HITL / 漂移 / 查日志 | [guides/run-ops.md](./guides/run-ops.md)（任务矩阵 + 症状→测试） |
| 选验证层 / L0–L4 判据 / 三环四账五关 | [testing.md](./testing.md) · [gates-ledger](./reference/gates-ledger.generated.md) |
| 查 `pnpm` 命令 / 决定理由 / 目录归属 | [commands.md](./reference/commands.md) · [decisions.md](./decisions.md) · [policy.md](./policy.md) |

## 文档地图

最大深度 2 层，零数字前缀（决策史住 `notes/`）。

### 1. 顶层锚点（`docs/`）

| 文档 | 职责 |
|---|---|
| [AGENTS.md](./AGENTS.md) | 文档标准：3 分区、写作规则、UTF-8 字节预算与 slop 清单 |
| [architecture.md](./architecture.md) | 总架构：repo 形态、`harness(bundle)`、组合面、协作通道与工具面 |
| [decisions.md](./decisions.md) | D 号纯路由台账：≤100 字结论 + 活载体路由（[D56](./decisions.md#d56)） |
| [testing.md](./testing.md) | 验证宪法：L0–L4、退出语义、判据形状、三环四账五关、词汇桥与落家序 |
| [policy.md](./policy.md) | 治理合同：DSH 纪律分工、意图载体总图、`checks/`、`probes/`、`tools/` 三分 |

### 2. 系统与领域契约（`contracts/`）

| 文档 | 职责 |
|---|---|
| [contracts/presets.md](./contracts/presets.md) | `presets/` 与 `content/` 按寿命分家、四槽三层 |
| [contracts/client-ui.md](./contracts/client-ui.md) | 驾驶舱架构、白名单、数据通道与红线 |
| [contracts/data-model.md](./contracts/data-model.md) | Agent Loop 驱动链、四类状态、恢复与交付 |
| [contracts/release.md](./contracts/release.md) | 版本唯一源、tag、handoff 锚与发布序 |
| [contracts/roles.md](./contracts/roles.md) | 四研究角色 + Method Editor（[D37](./decisions.md#d37)）+ workers（[D47](./decisions.md#d47)） |
| [contracts/methodology-mapping.md](./contracts/methodology-mapping.md) | codex harness → DSH 映射与取舍账（L3） |
| [contracts/run-forms.md](./contracts/run-forms.md) | M1–M3 形态、六轴 owner 与首屏工作区 |
| [contracts/git-boundary.md](./contracts/git-boundary.md) | Git 入库三问、tracked 生成物与跨环境 |

### 3. 操作手册（`guides/`）

| 文档 | 职责 |
|---|---|
| [guides/bootstrap.md](./guides/bootstrap.md) | fresh-clone 准备、双 home、vendor 构建与端口 |
| [guides/dev-loop.md](./guides/dev-loop.md) | 反馈双门、六步闭环、门禁分层、任务路由与命令 |
| [guides/run-ops.md](./guides/run-ops.md) | 任务矩阵、run-driver、HITL、恢复与排障 |
| [guides/plugin-authoring.md](./guides/plugin-authoring.md) | DSH 词汇、S0–S3 阶梯、证据阶梯与影响面 |
| [guides/probe-playbook.md](./guides/probe-playbook.md) | 真实边界探针定义、何时用与头注协议 |

### 4. 纯查表与自动生成参考（`reference/`）

| 文档 | 职责 |
|---|---|
| [reference/package-catalog.generated.md](./reference/package-catalog.generated.md) | 包目录（生成）：exports / patch / roles / skills / slots |
| [reference/commands.md](./reference/commands.md) | 命令字典：根 `package.json` 全量脚本双向校验 |
| [reference/glossary.md](./reference/glossary.md) | 术语对照：本项目 ↔ DSH 载体 ↔ `vendor/dsh` |
| [reference/cockpit-registry.generated.md](./reference/cockpit-registry.generated.md) | 驾驶舱注册表（生成）：`src/{client,lib}/` 模块清单 |
| [reference/gates-ledger.generated.md](./reference/gates-ledger.generated.md) | 门禁台账（生成）：L0 门禁域归属、摘要与覆盖 |
| [reference/discipline-matrix.md](./reference/discipline-matrix.md) | 纪律全量矩阵：逐源三态表与重审清单 |
| [reference/external.md](./reference/external.md) | 外部材料：仓外参考仓钉版与吸收落点 |
| [reference/alignment-ledger.json](./reference/alignment-ledger.json) | 对齐台账（机读）：`vendor/dsh` 源面逐项对账 |
| [_backlog/](../_backlog/README.md) · [snapshots/](../snapshots/README.md) | 探索池与场景回放金样 |

## 决策台账

按需跳转：[decisions.md](./decisions.md) · [reference/glossary.md](./reference/glossary.md) · [reference/external.md](./reference/external.md)。
