# dev/ · 入口说明（环境/构建/同步 × run 通道 × 驱动）

> 命令与前置正本 = [guides/60 §2](../docs/guides/60-dev-loop.md)（含 `source dev/env.sh` 前置说明）；run 通道用法 = [Run 指南](../docs/guides/61-run-playbook.md)。本页 = dev/ 每个盘上入口的职责与状态。

## 环境与构建/同步

| 件 | 职责 |
|---|---|
| bootstrap.sh | 独立环境冷启动前置（幂等）：Node/pnpm/git → submodule → install → vendor 构建 → env → 凭据/端口工具；`--check` 预检（不安装/不构建，仍会确保隔离 home 与 hooks 配置） |
| env.sh | 双 home（默认 DSH_HOME=runtime/harness-home；`DSH_DEV_HOME` 可指仓外）+ 裸 dsh 拦截 + pre-commit 挂载——L1/L2 脚本的前置 |
| vendor-build.sh | vendor 树构建：tsc host/client + typert 产物 + client bundle + host 半补建 + 前端壳 |
| vendor-host-bundle.config.ts | host 半补建配置（逐包 tsdown，给缺 lib/index.js 的包补产物） |
| vendor-host-typert.config.ts | host 半补建备选配置（留档） |
| vendor-typert-emit.mjs | typert 产物生成器 |
| render-overlay.mjs | 生成器：从 pack 渲染 `dev/research.overlay.yml`（改 pack 后必跑，先于 L1） |
| research.overlay.yml | **生成物**（render-overlay 产出，勿手改）——源码域 overlay |

## run 通道

| 件 | 职责 |
|---|---|
| run-driver.mjs | **驱动入口（启动/验证/呈交一条命令）**：`up` 起通道（经 boot-run，不绕漂移门）或复用已在飞的（复用先跑 `boot-run --drift-only` 验镜像；漂移/未取证 = NOT-RUN）→ 用 cdp-probe 验浏览器面 + 截图 → 打印呈交块；`--bootstrap` 先跑冷启动前置，`--profile`/`DSH_RUN_STATE_DIR` 支持多实例；`probe` 只验面（同样先验镜像）、`url` 打印 URL。verdict = exit 0 可呈交 / 1 红 / 2 未跑。通道事实唯一来源 = 本次 state 的 `web.log` 最后一条横幅 |
| boot-run.sh | run 通道正式启动面：自检 → 组合检查/补装 → 漂移门 → boot web（默认 3083）→ 后台仪表盘；`DSH_RUN_PROFILE`/`DSH_RUN_PORT`/`DSH_RUN_STATE_DIR`/`DSH_RUN_WORKSPACE` 支持多实例（自 source env.sh） |
| llm-socket-isolation.cjs | api.deepseek.com socket 隔离预载（NODE_OPTIONS）：LLM 流与 web_search 两类请求均每请求一次性连接、永不复用；上游边缘对长命复用连接有相位性故障（[postmortem](../notes/archived/2026-10-13-llm-stream-malformed-storm.md)），移除 = 摘 boot-run 一行 |
| run-kickoff.mjs | run 会话驱动：建 lead 会话 + 发 kickoff（GUI 的 RPC 替代入口） |

## 与产品路径的 parity（dev 不是另一条载入路）

判据 = **同机制 + 有界差异**：用户安装会经过的机制点，dev 也真走；差异只允许落在调试必需项，且必须
登记在这里。**表外新增差异 = L0 门禁 `dev-parity` 红**；用户路径将来多一个机制，dev 同 diff 跟上。

| 机制点 | 产品路径 | dev 通道 | 判定 |
|---|---|---|---|
| profile 名 | `deep-research` | `deep-research`（`DSH_RUN_PROFILE` 可覆写；多实例靠 `DSH_RUN_STATE_DIR`，不改名） | 同形 |
| profile 初始化 | `--from-default-profile web` | 同一条命令 | 同形 |
| 安装源 | registry / tarball | `npm pack` 出的 tarball（`dsh plugin add file:`） | 同形 |
| roster 写入者 | `dsh plugin add/remove` | 同一个命令（脚本不手写 `dsh.profile.bundles`） | 同形 |
| 团队层版本 | 与 `dsh --version` 同 exact 版本 | 同（`LAYER_VER` 从运行中 dsh 派生） | 同形 |
| profile 用户层 | 用户/设置页写 `cordis.patch.yml` | dev 不写；dev-only 行走 `--patch` 覆盖层 | 同形 |
| 启动命令 | `dsh --profile deep-research` | 同一条（run-driver 只是驱动：漂移门 + probe + 呈交） | 同形 |
| runtime | npm 全局 `dsh` | vendor 源码（`dev/env.sh` 拦截裸 dsh） | 允许差异（调试必需） |
| 工作区 | 用户自选目录 | `research-workspace/`（`DSH_RUN_WORKSPACE` 可覆写） | 允许差异（调试必需） |
| 凭据 | 用户 home | `runtime/harness-home/.credentials.yaml` | 允许差异（隔离） |
| 重建 | `plugin add/remove` 增量 + 重启 | 缺件时 `rm -rf` 重建（幂等加速） | 允许差异（可重复） |
| 观测 | 无 | probe / 仪表盘 / 日志 / LLM socket 隔离预载 | 允许差异（调试必需） |
| dev-only 工具行 | 无 | MCP Playwright（`--patch` 覆盖层，`MCP_PLAYWRIGHT=0` 可拆） | 允许差异（dev 工具） |

`dev/research.overlay.yml` 是**源码域冒烟 harness**（`--profile web --patch`，preset-smoke 用），
不是产品载入路径，也不进上面的同形列——它不经过 bundle/tarball，判据只对 L1 挂载面有效。

## 开发驱动

| 件 | 职责 |
|---|---|
| hitl-answer.mjs | HITL 代答（代理模拟；answerer 在浏览器客户端，先盘侧谓词自拒） |
| record-role-fixture.mjs | 角色组装面 fixture 录制（真模型档一次性；录制品人审入库 + 在场景声明登记 source 身份，此后 keyless 永久回放） |
| hooks/ | pre-commit 钩子（verify+tests 红灯拦 commit；env.sh 幂等挂载 core.hooksPath） |

## 运行区（已外移根级 runtime/）

harness-home/（开发 DSH home）与 smoke-workspace/（冒烟/boot 运行产物）的职责与状态 = [runtime/README.md](../runtime/README.md)——dev/ 只住源码驱动。
