# 65 · 运行形态合同：DSH 两步安装、产品 profile、工作区与移交

> 层：指南（当前合同）。回答"这个插件以什么形态运行、数据归谁、怎么装/升级/移交、用什么证据证明"。
> 用户视角安装步骤 = [`_dist/安装手册.md`](../../_dist/安装手册.md)；包合同 = [pack README](../../packages/deep-research-pack/README.md)；
> 开发操作 = [guides/60](60-dev-loop.md)；入库/跨环境 = [guides/63](63-git-boundary.md)；版本与发布 = [guides/64](64-release-versioning.md)。
>
> **编号消歧**：本文 M1/M2/M3 = 运行形态（安装 / 独立开发 / 移交），不是 [evaluation §3](../evaluation.md) 的里程碑 M1/M2/M3+；跨文档引用写「运行形态 M1」。

## 1. 运行形态

| 形态 | 谁在用 | 入口 | 边界 |
|---|---|---|---|
| **M1-product 产品形态** | 外部用户 | ① `dsh --profile deep-research --from-default-profile web` ② `dsh plugin --profile deep-research add <pack> <team>` ③ `dsh --profile deep-research`；首屏选项目目录 | 用户自己的 `DSH_HOME` + 自选工作区；插件内容在包内，产物在工作区；**没有 launcher / scaffold / 自定义安装器** |
| **M1-coexist 互操作** | 已有 DSH Web 的用户 | 把同一个 bundle 装进现有 `web` profile（应用内 Plugins 页或 CLI） | bundle 自足，首屏照样问工作区；但没有自己的 profile 身份；不是产品形态 |
| **M2 独立开发形态** | 贡献者 / 本地验证 | 本仓 + `bash dev/bootstrap.sh` + `node dev/run-driver.mjs up --bootstrap` | 默认仓内 `runtime/harness-home` + `research-workspace/`；可用 `DSH_DEV_HOME` 指到仓外 |
| **M3 移交形态** | 交给另一人或另一台机器 | `scripts/dist/export-handoff.mjs`（源码）或 `export-dist.mjs`（插件） | 不是复制工作树；运行态/凭据/run 数据不随包 |

**决定：M1-product 为主。** 安装与启动全部是 DSH 命令；产品只多一个 profile 名。首次安装是两步，因为
`dsh plugin` 给未知名 profile 只初始化 `dsh-base`（没有 web-app），DSH 没有"一步建 web-backed custom
profile"的命令——`--from-default-profile web` 就是它给的路径。产品不发明安装器。

## 2. 三块存储

| 存储 | 内容 | owner / 可写方 | 升级与移交 |
|---|---|---|---|
| **P 插件 / 智能体定义** | pack 的 `presets/`、`content/`（手册 + 模板）、`cordis.patch.yml`、`lib/` | 包 = 只读；安装副本不改 | 换包版本；内容随包，不落工作区 |
| **H DSH 状态** | sessions、credentials、profiles、settings；产品 profile + 产品设置 `$DSH_HOME/deep-research/settings.json`；浏览器提示键 | 用户 / 实例；`$DSH_HOME` + 浏览器 | 按 home 隔离；不随源/包移交 |
| **W 研究数据** | `<workspace>` 的 `drt_<slug>/`、`archive/`、`_abandoned/`、`method-library.md` | 用户工作区；角色按手册 owner 表写 | 用户所有；方法库不随插件升级覆盖；run bundle 单独移交 |

**内容不在工作区**：研究手册由 `src/content` 以 runtime context 注入；NODES/判型库是 Lead 的 skills；
模板在包内 `content/templates/run/`。工作区只承载研究产物与用户方法库——没有 seed 账本、没有
`--upgrade` sidecar、没有 `.gitignore` 写入。

`research-workspace/` 是 M2 的仓内工作区实例，不是包的一部分；产品用户的工作区是任意目录。
`dev/` 只住源码驱动，运行态住 `runtime/` 或工作区（门禁 `dev-runtime-clean` 直接看盘）。pack 的
`files` 白名单只发运行所需，发布物不含状态。

**与 DSH 数据平面的映射**（FAQ 24 的切法；P/H/W 是导航粗分，不是排他分区）：

| DSH 平面 | 本仓落点 | 本插件怎么碰 |
|---|---|---|
| D 定义 | `presets/`、`content/`、`cordis.patch.yml` | 只读；包版本绑定 |
| C 代码 | `lib/`、`src/` | 只读；安装副本不改 |
| W workspace | 用户工作区（`drt_*`/`archive/`/`_abandoned/`/`method-library.md`）；dev 实例 = `research-workspace/` | 角色读写；client 只读 |
| U home | `$DSH_HOME/` 与 `~/.agents`；产品设置 `deep-research/settings.json` | 启动行读设置；不手写 DSH 账本 |
| S session | `$DSH_HOME/sessions/`（物理在 home，逻辑独立） | 经会话服务/日志；不新增 event 类型 |
| H host state | `$DSH_HOME/storages/` | 本包不声明 storage domain |
| K cache | `$DSH_HOME/cache/` | 不使用 |
| X credentials | `$DSH_HOME/.credentials.yaml` / 环境变量 | 经凭据服务；不打包、不进日志 |

**可移植性不是平面，是每个事实的第四个问题**：研究事实、`run.md`、交付回执**随 bundle**走；方法库与
工作区数据**随工作区**走；审计快照（`audit.md`/`node-gate.md`）与 `present` 事件**只在本机**。逐行词表 =
pack README §Data 的 `可移植` 列。

## 3. 安装、升级、卸载

**首次安装（M1-product）**

默认入口 = 应用内 **Plugins 页**（`dsh web` 与 Desktop 同一句）：装本包，并在同页打开团队机制层
（它是 DSH 随安装提供、默认关闭的可选 bundle）。下面是 CLI 形态，**仅 `dsh web` 的自动化**用：

```sh
# ① 建产品 profile（仅首次；web 模板；破坏性，只对全新 profile 用）
dsh --profile deep-research --from-default-profile web --dump-default-config

# ② 装 bundle（exact 版本）
dsh plugin --profile deep-research add dsh-deep-research-pack@<版本>

# ③ 开团队机制层（exact 版本 = 运行中的 DSH；别用 @latest，它不是当前版本线）
dsh plugin --profile deep-research add @deepseek-ai/dsh-experimental-agent-team-profile@<与 dsh --version 同版本>

# ④ 启动（重启 profile 才让 bundle membership 生效）
dsh --profile deep-research
```

- 首屏会问「项目目录」；也可以用 `DEEP_RESEARCH_WORKSPACE=<dir>` 或
  `$DSH_HOME/deep-research/settings.json` 预置。
- **更新**：产品内 Plugins 页（跨面，默认）或 `dsh plugin --profile deep-research add <new>`；**重启 profile** 生效；没有命令级回滚，回退 = 重装旧版本。
- **诊断**：安装副本的 `dsh-deep-research-doctor`（只读；profile roster / 版本 / 团队层 / 工作区 / 凭据）。
- **互操作**：把同一个 bundle 装进现有 `web` profile 也能用（首屏照样问工作区），但不是产品形态。
- **不要**手写 profile manifest、不要把 bundle 写进 `desktop` profile、不要起第二个安装器/launcher。

**升级 / 回滚 / 卸载**

- 升级 = 装新版包 + 重启 profile；工作区数据不随包升级，方法库不被覆盖。
- 回滚 = 装回旧版包；DSH 必须满足旧包 `engines.dsh`，否则宿主拒绝加载。工作区不回滚。
- 卸载 = `dsh plugin --profile deep-research remove dsh-deep-research-pack`；团队层不在本包内，不需要时
  显式 remove。工作区产物、方法库、产品设置保留；产品设置目录可由用户显式删除。
- 卸载不清 `$DSH_HOME/sessions`、credentials、Workspace registration；这些是 DSH 的。

## 4. 工作区

**解析顺序**（每次启动）：`DEEP_RESEARCH_WORKSPACE`（本次覆盖）→ 产品设置
`$DSH_HOME/deep-research/settings.json` → 首屏 onboarding 询问。

- 没有 CLI 询问、没有 launcher；询问是产品首启的一部分。
- GUI 记住上次选择用浏览器 localStorage 提示键（设备级）；权威仍是 DSH Workspace registry。
- 选 `<dir>` 就是 `<dir>`；像项目时首屏建议 `<dir>/research`，不静默改写。
- 危险目录（HOME / DSH_HOME / 安装树）拒绝；不写 `.gitignore`（git 仓库缺忽略规则时只提示）。
- 工作区产物：`drt_<slug>/`、`archive/`、`_abandoned/`、`method-library.md`。
- 一 Host 一用户；run bundle 继承工作区权限。一个工作区一条 pack 版本线。

## 5. 独立环境与多实例

```sh
bash dev/bootstrap.sh --check          # 预检（不安装/不构建；仍会确保隔离 home 与 hooks 配置）
bash dev/bootstrap.sh                  # 缺件时执行 submodule/install/vendor 构建（幂等）
node dev/run-driver.mjs up --bootstrap # 准备 + 起通道 + 浏览器面验证
```

多实例用四个变量区分（默认值 = 单实例）：

| 变量 | 默认 | 作用 |
|---|---|---|
| `DSH_DEV_HOME` | `runtime/harness-home` | 隔离 DSH home（可指仓外） |
| `DSH_RUN_PROFILE` | `research` | profile 名 |
| `DSH_RUN_PORT` | `3083` | web 端口 |
| `DSH_RUN_STATE_DIR` | `runtime/smoke-workspace` | web.log/仪表盘/run-pack/npm-cache 的实例状态根 |
| `DSH_RUN_WORKSPACE` | `research-workspace` | 研究会话 cwd（角色手册从这里注入；多实例请各自指定） |

不同 `DSH_RUN_STATE_DIR` 的实例允许并行；同一 workspace 不支持两个实例共用（无跨进程锁）。

## 6. 移交

- **源码移交**：`node scripts/dist/export-handoff.mjs` → `_dist/ai_dsh_deep_research-src-<version>-<head>.tar.gz`；
  只含 tracked 源与 `.gitmodules`，对方 `tar xzf` → `git submodule update --init` → `pnpm install`。
- **插件移交**：`node scripts/dist/export-dist.mjs` → tarball + 安装手册（含 sha256、升级/回滚、离线矩阵）。
- **研究数据移交**：run bundle 单独拷贝/归档；移交前跑 `node scripts/run-gates/path-hygiene.mjs <bundle>`。
- **不做**：`cp -r` 工作树、把 `runtime/` 或 `research-workspace/drt_*` 打进源码包、把凭据/会话随包发送。

## 7. 证据

证据档位、命令与选择规则 = [guides/60 §2](60-dev-loop.md)（唯一 owner，本页不复述）。本合同的增量证据：

- `install-shape-smoke`：原样执行手册三步（profile init → plugin add → 真启动）；断言 roster 三状态、无
  `did not activate`、首屏可达。
- `product-boot-smoke`：纯 `dsh --profile deep-research` + 真 Web + 浏览器；工作区会话、首屏、目录按钮。
- `release-smoke`：tarball → 干净 profile → 真启动。
- `data-smoke`：`$DSH_HOME` 只写产品设置；无 storage domain / 新 session event。
- `content-shape`（L0）：手册/模板随包、包内无种子。
- `snapshot-replay` B 层 + `l4-lite`（真模型）：手册以 runtime context 进请求、Lead 仍按手册工作。

## 8. 已知限制与延后工作

- 浏览器提示键是设备/源级的：换浏览器或清站点数据后需要重选项目目录；权威 Workspace 仍在 DSH registry。
- Host 建会话是 best-effort（webserver 无 readiness gate）；client 用首选 blank / onboarding 兜底。
- `pickDirectory` 只覆盖 native chooser；browse-only 部署的目录浏览入口未做专门 UI（报错可见，不假装成功）。
- 团队机制层是 N2 experimental：上游可能改 API 或撤能力；版本必须与运行中的 DSH 一致。
- 不承诺 Desktop / Windows；正式 npm 发布前 tarball 是主分发形态。
- 共享 `$DSH_HOME` 时 Web UI 会显示该 home 下其他 Workspace/Session；需要干净环境用 `DSH_HOME=<dir>`。

> 决定理由、输掉的方案与实际证据 = [插件即产品 v2 决策卡](../../_backlog/issues/2026-11-01-plugin-as-product-v2.md) 与 [D40](../decisions.md#d40)。
