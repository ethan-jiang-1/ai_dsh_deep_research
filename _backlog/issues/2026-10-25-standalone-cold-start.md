---
status: 推敲中
opened: 2026-10-25
---

# 推敲：独立环境冷启动与多实例

> 立卡：2026-10-25 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 结论倾向：未定 ｜ 可关闭：否

**问题与期望结果：** 本仓的 M2 独立开发通道能跑，但它默认作者的机器状态：仓内固定的 `DSH_HOME`、固定的 `research` profile、仓内的 `research-workspace`、固定的 3083 端口；干净 clone 到可启动之间还缺 submodule、依赖、vendor 构建、凭据与 profile 初始化的串联。期望把“在独立目录/独立环境里从零启动”做成可复跑的一条路径，并用冷启动证据证明它不依赖作者残留。

**当前情况：** `dev/env.sh` 无条件把 `DSH_HOME` 指向 `runtime/harness-home`；`dev/boot-run.sh` 固定 `PROFILE=research`、默认端口 3083，只自检 vendor 构建产物，不检查 `node_modules` 与凭据；`dev/run-driver.mjs` 默认 3083，依赖 `lsof`/`pgrep`；`dev/boot-run.sh` 用 `sed -i ''` 写 profile patch（macOS 形态）。`release-smoke` 的 `DSH_HOME` 必须是仓内 `runtime/harness-home`，CLI 走 vendor 源码，不是干净 home 的冷启动。`packages/deep-research-pack` 的 `lib/` 是 gitignored，`prepack` 依赖根 workspace；按 git 内容单独复制 pack 目录不能直接安装。

**未决问题：** 冷启动的入口是一条 `bootstrap` 还是 `run-driver up --bootstrap`；数据根/端口/profile 名如何参数化；是否承诺 Linux（以及 Windows）；团队层与 MCP 的离线策略；pack 目录是否要作为“目录安装”正式支持（Q1 的 B）；冷启动 smoke 的边界（keyless boot 算不算、是否建会话）；已有 `runtime/` 数据的迁移/兼容。

**下一步：** 等 [运行形态合同](2026-10-25-run-form-contract.md) 定 Q1 后选择 A/B/C。当前推荐 A：bootstrap + 显式数据根/端口/profile + 冷启动 smoke；B 作为“目录也能装”的门槛，不单独做第二套运行时。先确认 Node/凭据前置检查与平台承诺，再写正式验收。

## 范围与依赖

本卡拥有**从零启动的可重复性与多实例**：bootstrap、数据根/端口/profile 参数、平台/离线声明、冷启动证据。它不拥有分发兼容字段（[分发合同](2026-10-25-distribution-contract.md)）与运行态 P/H/W 的完整边界（[运行态数据边界与移交](2026-10-25-runtime-data-boundary.md)）。

依赖：

- D14（preset-smoke 双通道）、D15（release-smoke 形状）、D21（启动意图分流）是现行边界。
- `dev/env.sh`、`dev/boot-run.sh`、`dev/run-driver.mjs`、`scripts/smoke/release-smoke.mjs` 是执行面。
- DSH 原生 profile、home、workspace 模型见 [research](../research/2026-10-25-dsh-plugin-conventions.md)。

## 已知事实

- `dev/env.sh` 的 `DSH_HOME` 是无条件覆盖，不用 `${DSH_HOME:-…}`；这是数据面隔离的设计（避免会话环境自带的 `~/.dsh` 污染），但也让“指向另一个 home”只能改脚本或手工绕开。
- `dev/boot-run.sh` 的 profile 重建链是：web 模板 → `npm pack` → `dsh plugin add file:<tgz>` → `dsh plugin add <team-layer>@<精确版本>`；`profile_ok` 检查 bundles、pack 版本、团队层版本、盘上每个 preset。
- `release-smoke` 使用仓内 `runtime/harness-home` + vendor 源码 CLI；它证明安装形状，不证明干净 home 的冷启动。
- `packages/deep-research-pack/package.json` 的 `prepack` 是 `pnpm build`；`lib/` 被根 `.gitignore` 拒收；目录安装（`dsh plugin add ./checkout`）不会自动构建（`vendor/dsh/docs/user/develop/basic/publish.md` §Install into a profile / §Installing from GitHub）。
- 团队层从 registry 解析；MCP Playwright 通过 `npx -y @playwright/mcp@...` 首次拉取；两者都是冷启动的隐藏网络前置。
- `dev/boot-run.sh` 的 `sed -i ''` 是 BSD/macOS 形态；GNU sed 不按同样语义接受空后缀。

## 方案与取舍

| 路线 | 做法 | 收益 | 成本 / 风险 |
|---|---|---|---|
| **A bootstrap + 参数化 + 冷启动 smoke**（推荐） | 一条 bootstrap 串起 submodule/install/vendor build/凭据检查/profile 初始化；`--data-root`、`--workspace`、`--port`、`--profile` 可覆盖；冷启动 smoke 在 pristine 副本 + 外部 home/workspace 上跑 keyless boot 与会话；pack 目录 + 构建作为可安装门槛 | 不发明新运行时；复用 DSH profile 模型；多实例自然成立；证据直接 | 需要改 env/boot/run-driver；冷启动 smoke 要隔离端口/进程；已有数据迁移要说明 |
| **B pack 目录自启动为主** | 复制 pack 目录即可 `start`，内部建 profile | “目录即产品”，交付直观 | 要自包含构建/`prepare`、profile 初始化、数据根、端口/进程管理；等于在 DSH 外再包安装器；与官方 bundle 形态偏离 |
| **C 维持作者通道 + 文档** | 继续手工准备，文档列前置 | 改动最小 | 别人仍起不来；多实例仍互撞；没有冷启动证据 |

推荐 A：DSH 的独立环境就是 `DSH_HOME` + profile + workspace；把这三样参数化并串成 bootstrap，比让 pack 目录变成 app 更贴合宿主。B 值得保留为“目录安装”的门槛：pack 目录 + 构建后能 `dsh plugin add`，并有一个 smoke；但不把它当主运行形态。

## 候选验收标准

翻「现在做」时，至少覆盖：

- 干净副本（无 `runtime/`、无 `research-workspace/drt_*`、无 `node_modules`、无构建产物）执行 bootstrap，能到达 keyless boot 并打印 URL；缺少 submodule/依赖/vendor 产物/凭据时 fail-loud 且给补救命令。
- `DSH_HOME`、研究工作区、profile 名、端口都可显式指定；两个实例用不同值可同时启动，互不踩端口/目录。
- `preflight` 或 bootstrap 早期检查 Node `engines.node` 与模型凭据；`--install-only` 的语义不被改变。
- 冷启动 smoke：pristine 副本 + 外部 home + 外部 workspace + pack 目录/ tarball 安装 + keyless boot + 至少一条会话/装配断言；失败保留现场，未跑 = 未通过。
- pack 目录 + `pnpm build` 后可直接 `dsh plugin add file:<目录>` 并由 profile 启动；若目录未构建，错误信息说清补救。
- 平台声明：macOS/Linux（以及是否 Windows）明确；`sed -i ''` 改为可移植或按平台分支；`lsof`/`pgrep` 缺失时有明确失败/降级。
- 离线矩阵：团队层、MCP、DSH 本体、registry 各自是否必需；离线时给出预置/跳过路径，不在 boot 深处才报错。

## 关闭条件

bootstrap 入口、参数、平台/离线承诺、冷启动证据与多实例语义有结论并落盘；脚本/冒烟/文档同 diff；至少一条从干净副本到 keyless boot 的证据；结论去向记录。未定期间保持活跃。
