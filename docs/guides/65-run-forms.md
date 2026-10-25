# 65 · 运行形态合同：安装、独立启动与移交

> 层：指南（当前合同）。本页回答“这个插件以什么形态运行、数据归谁、怎么升级/移交、用什么证据证明”。
> 安装步骤与用户视角细节 = [pack README](../../packages/deep-research-pack/README.md)；开发操作 = [guides/60](60-dev-loop.md)；
> 入库/跨环境 = [guides/63](63-git-boundary.md)；版本与发布 = [guides/64](64-release-versioning.md)。

## 1. 三种运行形态

| 形态 | 谁在用 | 入口 | 边界 |
|---|---|---|---|
| **M1 安装形态** | 外部用户 | npm（发布后）/ tarball → `dsh plugin add` → profile | 用户自己的 `DSH_HOME` + 自选研究工作区 |
| **M2 独立开发形态** | 贡献者 / 本地验证 | 本仓 + `bash dev/bootstrap.sh` + `node dev/run-driver.mjs up --bootstrap` | 默认仓内 `runtime/harness-home`；可用 `DSH_DEV_HOME` 指到仓外 |
| **M3 移交形态** | 交给另一人或另一台机器 | `scripts/dist/export-handoff.mjs`（源码）或 `export-dist.mjs`（插件） | 不是复制工作树；运行态/凭据/run 数据不随包 |

**决定：A 为主，B 作为可安装门槛，C 不做。** A = 独立 `DSH_HOME` + profile + workspace；B = pack 目录在
`pnpm build` 后可 `dsh plugin add file:<目录>`（profile 记录绝对路径，移动目录会断链）；C = `cp -r` 整个工作树，
会带走凭据/会话/run 数据，不提供。移交改用 M3。

## 2. 三块存储

| 存储 | 内容 | owner / 可写方 | 升级与移交 |
|---|---|---|---|
| **P 插件 / 智能体定义** | pack 的 `presets/`、`skills/`、`cordis.patch.yml`、`workspace/` 种子、`lib/` | 包 = 只读；安装副本不改 | 换包版本；`workspace/seed.json` 记录种子版本/哈希 |
| **H DSH 状态** | sessions、credentials、profiles、settings | 用户 / 实例；`$DSH_HOME` | 按 home 隔离；不随源/包移交 |
| **W 研究数据** | `drt_<slug>/`、`archive/`、`_abandoned/`、`method-library.md` | 用户工作区；角色按手册 owner 表写 | 用户所有；方法库不随插件升级覆盖；run bundle 单独移交 |

`research-workspace/` 是 M2 的工作区，不是包的一部分；`dev/` 只住源码驱动，运行态住 `runtime/` 或工作区
（门禁 `dev-runtime-clean` 直接看盘）。pack 的 `files` 白名单只发运行所需，发布物不含状态。

## 3. 安装、升级、卸载

- **前置**：DSH 满足包内 `engines.dsh`（当前 `0.2.1-rc.2`）；Node 满足 `engines.node`；团队机制层
  `@deepseek-ai/dsh-experimental-agent-team-profile` 与同一 `engines.dsh` 版本在场（scaffold 自动补）。
- **安装**：`dsh --profile <p> --from-default-profile web --dump-config` → `dsh plugin --profile <p> add <npm|tarball|目录>`；
  `scaffold --workspace <w> --profile <p>` 铺种子 + 补团队层 + preflight。
- **升级**：装新版包 → 重启 profile → `scaffold --check` → `scaffold --upgrade`。升级只覆盖“用户未改过且种子已更新”的文件；
  改过的文件保留原样并写 `<文件>.seed-new`；`method-library.md` 任何模式都不覆盖。
- **回滚**：装回旧版包；工作区种子不回滚（用户数据不随插件降级），`--check` 如实报告版本关系；DSH 必须满足旧包
  `engines.dsh`，否则宿主拒绝加载。
- **卸载**：`dsh plugin --profile <p> remove dsh-deep-research-pack`；工作区保留，数据清理是用户显式动作。

## 4. 独立环境与多实例

```sh
bash dev/bootstrap.sh --check          # 预检（不安装/不构建；仍会确保隔离 home 与 hooks 配置）：Node/pnpm/git/submodule/install/vendor 产物/env/凭据/端口工具
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

不同 `DSH_RUN_STATE_DIR` 的实例允许并行；默认 state 的重复启动检查仍生效，自定义 state 由端口检查兜底（两个实例请用不同端口）。冷启动证据 =
`node scripts/smoke/cold-start-smoke.mjs`（独立 home/profile/端口/state，MCP 关闭，浏览器面 GREEN）。

## 5. 移交

- **源码移交**：`node scripts/dist/export-handoff.mjs` → `_dist/ai_dsh_deep_research-src-<version>-<head>.tar.gz`；
  只含 tracked 源与 `.gitmodules`，对方 `tar xzf` → `git submodule update --init` → `pnpm install`。
- **插件移交**：`node scripts/dist/export-dist.mjs` → tarball + 安装手册（含 sha256、升级/回滚、离线矩阵）。
- **研究数据移交**：run bundle 单独拷贝/归档；新 run 不写本机 home 绝对路径，旧 bundle 的历史路径按 epoch 豁免。
- **不做**：`cp -r` 工作树、把 `runtime/` 或 `research-workspace/drt_*` 打进源码包、把凭据/会话随包发送。

## 6. 证据

| 改动面 | 最小证据 |
|---|---|
| 结构/文档/种子/门禁 | `pnpm verify` + `pnpm test` |
| 安装形状（pack → 干净 profile → plugin add → scaffold/preflight） | `source dev/env.sh && node scripts/smoke/release-smoke.mjs` |
| 独立环境/冷启动 | `source dev/env.sh && node scripts/smoke/cold-start-smoke.mjs` |
| preset / skill 内容 | L1 `preset-smoke`（真挂载） |
| persona / 手册 / 模型可见文本 | `snapshot-replay` B 层 + L4-lite（真模型档） |
| 门禁本身 | 注入回归先红 → 还原 → 绿（`gates-smoke` / 对应契约测试） |

## 7. 非目标与已知边界

- 不把“多人共享一个 checkout / 一个 `DSH_HOME`”作为支持面；协作单位 = 包版本 + 工作区/run bundle 移交。
- 不承诺 Windows；当前实测 macOS，Linux 走 bash/Node 标准路径但未在同轮跑。`sed` 已改为 BSD/GNU 兼容形态。
- 离线不是零前置：tarball 不需要 registry，但团队层需预装/缓存、Playwright MCP 首次需 npx、模型 API 需网络。
- 包目录安装的 profile 依赖是绝对路径；正式分发用 tarball/npm。
- 研究方法论本身不在本页：角色/preset/skill 见 [guides/62](62-plugin-authoring.md) 与 pack 内容；run 操作见 [guides/61](61-run-playbook.md)。

> 决定理由、输掉的方案与实际证据 = [运行形态合同 Note](../../notes/implemented/2026-10-25-run-form-contract.md)。
