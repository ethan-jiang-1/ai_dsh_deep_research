# AGENTS.md — 仓库入口与常驻指令

DSH Deep Research 插件：唯一自写包 [`packages/deep-research-pack`](packages/deep-research-pack/AGENTS.md) 提供 4 个研究角色 preset（Lead / Scout / Analyst / Critic）+ Method Editor（[D37](docs/decisions.md#d37)），协作主通道 = DSH 原生 Agent Teams。
本包是 DSH bundle 插件（运行环境 = 用户自建 custom profile `deep-research`，[D41](docs/decisions.md#d41)），方法论内核映射自 codex Deep Research harness（[methodology-mapping.md](docs/contracts/methodology-mapping.md)）。

## 入口链（唯一正本——其余文件只指回本节）

> **先分流**（用它 vs 改它）：按 [docs/README.md §先分流](docs/README.md) 选行。安装 / 启动 / 跑研究到这一步即可开工；**改本仓**按下方 3 步最小路径直达（1 跳，不绕路）：

1. **先看总架构与文档规范**：[docs/architecture.md](docs/architecture.md)（系统分层与组合面）· [docs/README.md](docs/README.md)（文档枢纽与 30 秒找入口）· [docs/AGENTS.md](docs/AGENTS.md)（文档写作与字节预算）；首次克隆先跑 [docs/guides/bootstrap.md](docs/guides/bootstrap.md)。
2. **按改动面直达 owner**：
   - 改插件包（`presets/`、`content/`、`src/`）：[packages/deep-research-pack/AGENTS.md](packages/deep-research-pack/AGENTS.md) · [docs/contracts/presets.md](docs/contracts/presets.md) · [docs/contracts/client-ui.md](docs/contracts/client-ui.md) · [docs/contracts/data-model.md](docs/contracts/data-model.md)；
   - 改 run 通道 / 排障：[docs/guides/run-ops.md](docs/guides/run-ops.md)；改发布 / 入库：[docs/contracts/release.md](docs/contracts/release.md) · [docs/contracts/git-boundary.md](docs/contracts/git-boundary.md)；
   - 改流程 / 治理 / 目录归属：[docs/policy.md](docs/policy.md)（需跨轮澄清才走 `_backlog/`，Backlog 不是实施前置门）。
3. **按改动面选验证与收尾**：[docs/testing.md](docs/testing.md)（L0–L4 五面与三环四账五关）· [docs/guides/dev-loop.md](docs/guides/dev-loop.md)（任务型路由表、门禁分层与收尾五件；持久决定需显式评审才在 [notes/proposed/](notes/proposed/) 建立 RFC）。

**工作流速览**：`_backlog` 推敲 → 定性（`待落地` 不是授权；`修复就绪` = P1/P2 修复授权，P0/触面走等人拍板）→ 落地（[dev-loop.md](docs/guides/dev-loop.md)）→ 机械不跳 + 按风险对抗自审（[reviewing-a-delivery](.agents/skills/reviewing-a-delivery/SKILL.md)）→ 归档与载体同变更。
日常 commit 链 = `pnpm verify` + `pnpm test`；改门禁只跑 `gates.e2e --gate=<name>`；bug 翻 `修复落地/已修` 须同变更写 `json fix-evidence`（规则 = [_backlog/AGENTS.md](_backlog/AGENTS.md)）。

## 布局

| 路径 | 职责与直达入口 |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) · `.claude/skills` | 指向 `AGENTS.md` 与 `.agents/skills` 的两条 symlink（只编辑真文件；`claude-symlink` 把守） |
| [`README.md`](README.md) · [`CONTRIBUTING.md`](CONTRIBUTING.md) | 人类门面与开源贡献指南（完整安装合同 = [`_dist/安装手册.md`](_dist/安装手册.md)） |
| [`packages/deep-research-pack/`](packages/deep-research-pack/AGENTS.md) | 唯一自写包：`presets/` + `content/`（随包只读研究手册与 run 模板，[D40](docs/decisions.md#d40)）+ `cordis.patch.yml` + `src/{content,startup,defaults,fetch-fallback,client,lib}/`（驾驶舱正本 = [client-ui.md](docs/contracts/client-ui.md)）+ `scripts/doctor.mjs`（只读） |
| [`docs/`](docs/README.md) | 现行架构与合同（最大 2 层、零数字前缀）：顶层 6 锚点（`README` / `AGENTS` / `architecture` / `decisions` / `testing` / `policy`）+ `contracts/` + `guides/` + `reference/`（含 3 份 `.generated.md` 自动参考） |
| [`notes/`](notes/AGENTS.md) | 开发记忆与决策理由：`proposed/`（需评审 RFC）→ `implemented/`（活决定）→ `archived/`（冻结，含事故复盘）；`rejected/`（否决+重启条件） |
| [`_backlog/`](_backlog/AGENTS.md) | 问题澄清与证据池：`issues/`、`bugs/`、`research/`、`methods/`、[`triggers.md`](_backlog/triggers.md)、`_archived/`（手册 = [_backlog/README.md](_backlog/README.md)） |
| [`.agents/skills/`](.agents/skills/) | 仓级开发技能（换 pin / 加角色 / 写门禁 / 跑 run / 改轨道 / 交付自审 / 用探针 / 复现故障），命中 description 先读 `SKILL.md` 全文 |
| [`checks/`](checks/AGENTS.md) | **judge** 裁决面：`verify/`、`smoke/`（`*.e2e.mjs` / `*.entry.mjs`）、`run-gates/`、`release/`（`release-check`）；非面支撑 = `lib/`、`test/`、配置 JSON（索引 = [checks/README.md](checks/README.md)） |
| [`probes/`](probes/README.md) | **show** 证据面：`behavior/`、`browser/`、`analyze/` 与 `stream/` 预载仪器（索引 = [`probes/INDEX.generated.md`](probes/INDEX.generated.md)，指南 = [probe-playbook.md](docs/guides/probe-playbook.md)） |
| [`tools/`](tools/README.md) | **operate** 运维面：`channel/`、`build/`、`record/`、`release/`、`clean/`、`hooks/`（`pre-commit` = judge 例外）与 `env.sh` |
| [`tests/`](tests/AGENTS.md) | **oracle** 回归层（keyless `node:test`：`*.spec.mjs` + `tests/checks/*/*.test.mjs`；layering 五件套守卫；索引 = [`tests/INDEX.generated.md`](tests/INDEX.generated.md)） |
| [`snapshots/`](snapshots/README.md) | 场景证据层：录制会话与 `snapshot.json`（消费 = `snapshot-replay.entry`） |
| `research-workspace/` | dev 工作区实例（角色会话 cwd；用户工作区 = 任意目录）：`method-library.md`、`drt_<slug>/`、`archive/`、`_abandoned/`、`drafts/` |
| `vendor/dsh/` | pinned submodule（tag `dsh-v0.2.1-rc.5` @ `b830ec950f`，**只读铁律**；机制唯一权威） |
| `runtime/` · `_dist/` | `runtime/`（gitignored 运行态：`harness-home/` + `smoke-workspace/`）；`_dist/`（tracked [`安装手册.md`](_dist/安装手册.md) + gitignored tgz） |

子树 `AGENTS.md` 六份（`docs/` · `checks/` · `notes/` · `packages/deep-research-pack/` · `tests/` · `_backlog/`）只放该子树专属指令。搜索限定 `packages/`、`tests/`、`checks/`、`docs/`，不扫 `vendor/`、`runtime/`、`packages/*/lib/`。

## 最小命令表（fresh clone 详序 = [docs/guides/bootstrap.md](docs/guides/bootstrap.md)；全量字典 = [docs/reference/commands.md](docs/reference/commands.md)）

| 场景 | 命令 | 口径与前置 |
|---|---|---|
| Fresh clone 首跑 | `git submodule update --init vendor/dsh && pnpm install && source tools/env.sh` | 装依赖 + 隔离双 home（`DSH_HOME=runtime/harness-home`）+ 激活 `pre-commit` + 拦截裸 `dsh`（口径 = guides/dev-loop.md §2） |
| 构建 vendor 产物 | `bash tools/build/vendor-build.sh` | L1 / L2 / `pnpm typecheck` / `pnpm dsh` / run 通道前置（L0 不需要；换 pin 加 `--clean`） |
| L0 结构与回归 | `pnpm verify && pnpm test` | keyless，每次收尾必跑（`test` = `test:spec` + `test:checks`；`docs:gen` / `docs:check` 刷新参考生成物） |
| 类型与静态检查 | `pnpm typecheck && pnpm lint && pnpm release:check` | `typecheck` 需 vendor 产物；`lint` 跑 oxlint；`release:check` 验版本/tag 一致性 |
| 启动研究 run 通道 | `node tools/channel/run-driver.mjs up` | 自 `source`；固定次序 profile → `plugin add` → `dsh --profile` → 工作区；勿手起 `dsh`（操作 = [run-ops.md](docs/guides/run-ops.md)） |

## 硬红线（只读、隔离、密钥、Notes 与纪律）

<a id="dsh-源码机制权威在哪"></a>
1. **`vendor/dsh/` 只读铁律**：`vendor/dsh/`（tag `dsh-v0.2.1-rc.5` @ `b830ec950f`）是唯一机制权威，严禁就地改写（`vendor-pin` / `vendor-clean` 把守）；全局 `which dsh` 不作依据；仓外参考仓登记在 [docs/reference/external.md](docs/reference/external.md)。
2. **双 home 隔离与凭据红线**：`source tools/env.sh` 把开发态锁进 `runtime/harness-home/`，不动日用 `~/.dsh`；永不提交凭据。
   **keyless** = 无凭据可跑（含 `preset.e2e` 真挂载与 `release.entry --install-only`）；**真模型档**闭集正本 = [smoke-contract.test.mjs](tests/checks/shared/smoke-contract.test.mjs)（`REAL_MODEL`），凭据配在 `runtime/harness-home/.credentials.yaml`（`DEEPSEEK_API_KEY` 同时服务 chat 与 web 搜索）。
3. **开工先查 `notes/`，按需写 Note**：改代码前按机制名查 `notes/`；只有承载持久决定理由的变更才**同一变更**写 Note（机械与局部编辑豁免）；取代检查、格式与毕业改写见 [notes/AGENTS.md](notes/AGENTS.md)。
4. **DSH 全局纪律与证据匹配**：全量逐源三态正本 = [docs/reference/discipline-matrix.md](docs/reference/discipline-matrix.md)（fail-loud · model-visible ⟺ logged · registrations are effects · plugins not loop changes · verify the world · 新门禁/契约测试先红后绿 · 未跑 ≠ 通过）。
   证据路由 = [dev-loop.md §2](docs/guides/dev-loop.md)，单点机制先看 [probes/](probes/README.md)，**命名即车道**（[D53](docs/decisions.md#d53)），研发宪章 = [CONTRIBUTING §Development charter](CONTRIBUTING.md#development-charter)。
5. **编辑本文件与预算红线**：`CLAUDE.md` 是指向本文件的 symlink；根 `AGENTS.md` 只留每轮常驻指令，常驻文档 **UTF-8 字节上限**由 [checks/doc-budgets.json](checks/doc-budgets.json) 把守（超限处置序：下放 → 压缩 → 同变更登记理由升顶，正本 = [docs/AGENTS.md](docs/AGENTS.md)）。术语速查见 [docs/reference/glossary.md](docs/reference/glossary.md)。
