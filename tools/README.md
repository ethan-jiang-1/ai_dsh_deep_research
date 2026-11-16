# tools/ · operate 面入口索引

> 维护面：**operate**（run = 起/复用进程；act = 持久改动，失败可能半途、需 converge/repair）。
> 装：`channel/` run 通道与驱动、`build/` 环境冷启动与 vendor 构建、`record/` 录制与生成器、
> `release/` 分发与移交、`clean/` 运行区清理。不装：裁决（→ `checks/`）、只读投影（→ `probes/`）。
> 例外：`hooks/pre-commit` 是 judge；`env.sh`、预载驱动、vendor 构建配置、手册源是非面。
> 规则 = [surface-contract](../docs/guides/68-surface-contract.md)。
>
> 命令与前置正本 = [guides/60 §2](../docs/guides/60-dev-loop.md)（含 `source tools/env.sh` 前置说明）；run 通道用法 = [Run 指南](../docs/guides/61-run-playbook.md)。本页 = tools/ 每个盘上入口的职责与状态（逐件一行，子组/件 全路径点名）。

## 子组一览

| 子组 | 模式 | 装什么 |
|---|---|---|
| `channel/` | run（+ 会话驱动 act） | 起/复用 run 通道、验面呈交、建会话发 kickoff、HITL 代答、socket 隔离预载 |
| `build/` | act | 独立环境冷启动、vendor 树构建与其配置/产物生成 |
| `record/` | act | fixture/oracle/资产账录制，overlay 与测试索引生成 |
| `release/` | act | tarball/手册/市场索引导出、源码移交包 |
| `clean/` | act | 运行区保留期清理（默认 dry-run） |
| `hooks/` | judge（例外） | pre-commit 红灯拦 commit |
| 根级 | 非面 | `env.sh` 配置入口（sourced） |

## channel/（run 通道与驱动）

| 件 | 职责 |
|---|---|
| channel/run-driver.mjs | **驱动入口（启动/验证/呈交一条命令）**：`up` 起通道（经 boot-run，不绕漂移门）或复用已在飞的（复用先跑 `boot-run --drift-only` 验镜像；漂移/未取证 = NOT-RUN）→ 用 cdp-probe 验浏览器面 + 截图 → 打印呈交块；**验证缓存**：同一 pack 源 + 同一 runtime 构建 + 30 分钟内的 GREEN 直接复用（冷启动也命中，命中前做 HTTP 就绪检查；`--force-probe` 强制重验；缓存只存 GREEN）；`--bootstrap` 先跑冷启动前置，`--profile`/`DSH_RUN_STATE_DIR` 支持多实例；`probe` 只验面（同样先验镜像、永远真验）、`url` 打印 URL。verdict = exit 0 可呈交 / 1 红 / 2 未跑。通道事实唯一来源 = 本次 state 的 `web.log` 最后一条横幅 |
| channel/boot-run.sh | run 通道正式启动面：自检 → 组合检查/补装 → 漂移门 → boot web（默认 3083；runtime 默认 vendor 构建产物 `lib/bin.js`，`DSH_RUN_RUNTIME=source` 退回 tsx 源码）→ 后台仪表盘；`DSH_RUN_PROFILE`/`DSH_RUN_PORT`/`DSH_RUN_STATE_DIR`/`DSH_RUN_WORKSPACE` 支持多实例（自 source env.sh） |
| channel/run-kickoff.mjs | run 会话驱动：建 lead 会话 + 发 kickoff（GUI 的 RPC 替代入口） |
| channel/hitl-answer.mjs | HITL 代答（代理模拟；answerer 在浏览器客户端，先盘侧谓词自拒） |
| channel/llm-socket-isolation.cjs | api.deepseek.com socket 隔离预载（NODE_OPTIONS，非面驱动）：LLM 流与 web_search 两类请求均每请求一次性连接、永不复用；上游边缘对长命复用连接有相位性故障（[postmortem](../notes/archived/2026-10-13-llm-stream-malformed-storm.md)），移除 = 摘 boot-run 一行 |

## build/（环境冷启动与 vendor 构建）

| 件 | 职责 |
|---|---|
| build/bootstrap.sh | 独立环境冷启动前置（幂等）：Node/pnpm/git → submodule → install → vendor 构建 → env → 凭据/端口工具；`--check` 预检（不安装/不构建，仍会确保隔离 home 与 hooks 配置） |
| build/vendor-build.sh | vendor 树构建：tsc host/client + typert 产物 + client bundle + host 半补建 + 前端壳 |
| build/vendor-host-bundle.config.ts | host 半补建配置（逐包 tsdown，给缺 lib/index.js 的包补产物；非面管道件） |
| build/vendor-typert-emit.mjs | typert 产物生成器（非面管道件） |

## record/（录制与生成器）

| 件 | 职责 |
|---|---|
| record/record-role-fixture.mjs | 角色组装面 fixture 录制（真模型档一次性；录制品人审入库 + 在场景声明登记 source 身份，此后 keyless 永久回放） |
| record/record-ci-oracle.mjs | CI 执行面与事件键的外部 oracle 录制（dev-only：真 `yaml@2` + 真 `bash -eo pipefail` + 按目标失败 stub `node`；测试只读 `tests/fixtures/ci-oracle/oracle.json`；`--check` 只比对） |
| record/record-asset-ledger.mjs | 测试资产组合账生成（spec/check 的 lane/class/cost/uniqueClaim/oracleType/sunset；AST 自动推导 oracleType，测试重算对账，漂移 = 红） |
| record/render-overlay.mjs | 生成器：从 pack 渲染 `tools/record/research.overlay.yml`（改 pack 后必跑，先于 L1） |
| record/render-test-index.mjs | 测试 ↔ 源码 owner 索引生成（模块 → owner → 测试；生成物 = tests/INDEX.generated.md；`--check` 只比对） |
| record/research.overlay.yml | **生成物**（render-overlay 产出，勿手改）——源码域 overlay |

## release/（分发与移交）

| 件 | 职责 |
|---|---|
| release/export-dist.mjs | pack → `_dist/` 安装包、安装手册与 staged 市场索引（tarball/手册同版本；market 为 0 条目） |
| release/market.mjs | 生成 `_dist/market.json`（DSH 插件市场 format 1），先过 `parseMarketIndex` 再落盘；`--check` 只校验 |
| release/export-handoff.mjs | HEAD 的 tracked 源 → `_dist/` 干净移交包（不含运行态/凭据/run 数据/依赖）；submodule 需对方 init |
| release/product-manual.md | 安装手册源（数据，非面；`export-dist` 消费，正文由 `dist-manual-fresh` 对账） |

## clean/（运行区清理）

| 件 | 职责 |
|---|---|
| clean/runtime-clean.mjs | 运行区清理：默认 dry-run，`--yes` 才删；白名单容器/实验根 + 子树最新 mtime 保留期（缺省 14 天）；symlink / harness-home / research-workspace / scenes 永不候选（scenes = 证据，人工处理；判据 = checks/lib/channel/runtime-clean-core.mjs） |

## hooks/（judge 例外）

| 件 | 职责 |
|---|---|
| hooks/pre-commit | 提交门禁：whitespace + verify + keyless tests 红灯拦 commit（fail-loud）；`tools/env.sh` 幂等挂载 `core.hooksPath tools/hooks` |

## 根级配置（非面）

| 件 | 职责 |
|---|---|
| env.sh | 双 home（默认 DSH_HOME=runtime/harness-home；`DSH_DEV_HOME` 可指仓外）+ 裸 dsh 拦截 + pre-commit 挂载——L1/L2 脚本的前置；sourced 配置入口，不是 operate 入口 |

## 与用户安装路径的 parity（dev 不是另一条载入路）

判据 = **同机制 + 有界差异**：用户安装会经过的机制点，dev 也真走；差异只允许落在调试必需项，且必须
登记在这里。**表外新增差异 = L0 门禁 `dev-parity` 红**；用户路径将来多一个机制，dev 同 diff 跟上。

| 机制点 | 用户安装路径 | dev 通道 | 判定 |
|---|---|---|---|
| profile 名 | `deep-research` | `deep-research`（`DSH_RUN_PROFILE` 可覆写；多实例靠 `DSH_RUN_STATE_DIR`，不改名） | 同形 |
| profile 初始化 | `--from-default-profile web` | 同一条命令 | 同形 |
| 安装源 | registry / tarball | `npm pack` 出的 tarball（`dsh plugin --profile <p> add file:`） | 同形 |
| roster 写入者 | `dsh plugin --profile <p> add/remove` | 同一个命令（脚本不手写 `dsh.profile.bundles`） | 同形 |
| 团队层版本 | 与 `dsh --version` 同 exact 版本 | 同（`LAYER_VER` 从**实际启动的 runtime** 派生） | 同形 |
| profile 用户层 | 用户/设置页写 `cordis.patch.yml` | dev 不写；dev-only 行走 `--patch` 覆盖层 | 同形 |
| 启动命令 | `dsh --profile deep-research` | 同一条（run-driver 只是驱动：漂移门 + probe + 呈交） | 同形 |
| runtime | npm 全局 `dsh` | vendor **构建产物** `lib/bin.js`（同 pin 源码编译，≈3s；`DSH_RUN_RUNTIME=source` 退回 tsx 源码 ≈13s；`tools/env.sh` 拦截裸 dsh） | 允许差异（调试必需；同一 `--profile` 启动面） |
| 工作区 | 用户自选目录 | `research-workspace/`（`DSH_RUN_WORKSPACE` 可覆写） | 允许差异（调试必需） |
| 凭据 | 用户 home | `runtime/harness-home/.credentials.yaml` | 允许差异（隔离） |
| 重建 | `plugin add/remove` 增量 + 重启 | 缺件时 `rm -rf` 重建（幂等加速） | 允许差异（可重复） |
| 观测 | 无 | probe / 仪表盘 / 日志 / LLM socket 隔离预载 | 允许差异（调试必需） |
| dev-only 工具行 | 无 | MCP Playwright（`--patch` 覆盖层，`MCP_PLAYWRIGHT=0` 可拆） | 允许差异（dev 工具） |

`tools/record/research.overlay.yml` 是**源码域冒烟 harness**（`--profile web --patch`，preset.e2e 用），
不是用户载入路径，也不进上面的同形列——它不经过 bundle/tarball，判据只对 L1 挂载面有效。

## 运行区（已外移根级 runtime/）

harness-home/（开发 DSH home）与 smoke-workspace/（冒烟/boot 运行产物）的职责与状态 = [runtime/README.md](../runtime/README.md)——tools/ 只住源码驱动。

## 工作树清理

`git worktree list` 列出 fresh-clone 实验副本。删除前先 `git -C <dir> status --short --ignore-submodules=all`：**有未提交改动 = 等决定，不 `--force`**。再确认 head 无独有工作（`git merge-base --is-ancestor <head> master`），才 `git worktree remove <dir>`；无独有 commit 的干净副本可回收，有未提交改动的保留。
