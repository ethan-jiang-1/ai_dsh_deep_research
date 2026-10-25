# 运行形态合同：A+B、P/H/W 与冷启动

> 状态：implemented

> 来源：[运行形态合同](../../_backlog/_archived/settled_issues/2026-10-25-run-form-contract.md)、[分发合同](../../_backlog/_archived/settled_issues/2026-10-25-distribution-contract.md)、[数据边界](../../_backlog/_archived/settled_issues/2026-10-25-runtime-data-boundary.md)、[冷启动](../../_backlog/_archived/settled_issues/2026-10-25-standalone-cold-start.md)。
> 当前合同 = [guides/65](../../docs/guides/65-run-forms.md)。

## 决定

- **运行形态 = A 为主 + B 作为可安装门槛，C 不做。** A = 独立 `DSH_HOME` + profile + workspace；B = pack 目录在构建后可 `dsh plugin add file:<目录>`（profile 记绝对路径，移动即断链）；C = `cp -r` 工作树，会带凭据/会话/run 数据，改由 M3 移交（源码 `export-handoff` / 插件 `export-dist` / run bundle 单独）。
- **按 per-user 分发 + bundle 移交设计。** 同机多实例用 `DSH_DEV_HOME`、`DSH_RUN_PROFILE`、`DSH_RUN_PORT`、`DSH_RUN_STATE_DIR` 区分；不把共享 checkout/共享 home 作为支持面。
- **P/H/W 三分。** P = pack（只读，发布集白名单）；H = `$DSH_HOME`（会话/凭据/profile，不随源或包移交）；W = 研究工作区（run bundle/方法库/归档，用户所有）。`dev/` 只住源码驱动，运行态住 `runtime/` 或工作区（门禁 `dev-runtime-clean`）。
- **兼容性以宿主字段 `engines.dsh` 为单一权威**；`dsh.compatibility.dshReleases` 只作人读矩阵镜像，由门禁与契约测试对账。团队层版本从同一字段派生，`scaffold` 不再装未钉版最新层；`preflight` 优先读 profile 的 `@deepseek-ai/dsh-app-boot` 运行时，PATH CLI 只作后备。
- **工作区种子版本化。** `workspace/seed.json` 记录版本 + 文件 sha256；`scaffold --check` 只读报告 missing/stale/untracked/modified，`--upgrade` 只覆盖未改文件（改过的写 `.seed-new`），`--force` 覆盖版本化种子但**不覆盖** `method-library.md`；状态写 `.dsh-research-seed.json`。
- **独立启动 = bootstrap + 参数化。** `dev/bootstrap.sh` 串起 submodule/install/vendor 构建/env/凭据检查；`run-driver up --bootstrap` 起通道；`cold-start-smoke` 用独立 home/profile/端口/state 到浏览器面 GREEN。
- **不新增 D 号。** 本决定未改变 D17（harness/run bundle）、D18（驾驶舱例外）、D21（启动分流）的边界；若后续改变这些边界，另立 D。

## 输掉的方案

- **C 整目录复制**：最省事，但把凭据/会话/run 数据一起带走，和分离目标冲突；改为显式 handoff。
- **B 作为主运行形态**：pack 目录自启动要自包含构建、profile 初始化、数据根、端口/进程管理，等于在 DSH 外再包安装器；故 B 只作可安装门槛。
- **多人共享一个 checkout/home**：DSH 的凭据/会话不按用户分区；共享会把状态混在一起，故不支持。
- **只靠 peer 范围、不写 `engines.dsh`**：peer 是安装语义，`^0.2.1-rc.2` 比“只声明 rc.2”宽；宿主字段更直接。
- **种子只做快照、不做版本**：旧工作区永远落后或 `--force` 覆盖用户编辑；采用版本 + 三态升级。
- **全部运行态强制移出源码树**：会打断现有 `source dev/env.sh` 与 run 通道；采用“默认仓内 + 可指仓外 + 干净移交”。
- **不做校验和/离线矩阵**：tarball 与手册会漂移，离线前置靠猜；改为导出时计算 sha256 并写矩阵。

## 实际跑过的验证

- `pnpm verify` 全绿；`pnpm test` 779 pass / 0 fail。
- `node scripts/smoke/gates-smoke.mjs` 全绿（含 `pack-bundle-compat-engines-drift`、`dev-runtime-clean-stray`、`workspace-versioning-seed-gitignore-missing` 注入案例）；`seed-core` 测试做过 branch-swap 红/还原绿的反证。
- `node scripts/smoke/release-smoke.mjs` ALL PASS：安装副本 `engines.dsh`/矩阵、团队层钉版、scaffold/preflight、安装域四角色真挂载。
- `node scripts/smoke/cold-start-smoke.mjs` GREEN：独立 `DSH_DEV_HOME` + `cold-start-smoke` profile + 3129 + 独立 state，浏览器面可呈交；MCP 关闭。
- 两个实例并行：不同 home/profile/port/state（3131/3132）同时出横幅；不同 state 允许并行；默认 state 的重复启动检查仍生效，自定义 state 由端口检查兜底。
- pack 目录安装：`pnpm build` 后 `dsh plugin add file:<pack>` 成功，`--dump-config` 见本包行；profile 记录绝对路径，作为 B 门槛而非分发形态。
- `export-handoff` 实跑：`git archive HEAD` 1102 条目、2.4 MiB，含 `.gitmodules`/`seed.json`，无运行态/凭据/run 数据/依赖/导出包。
- 种子三态实跑：临时工作区装/查/force/upgrade；用户改过的 `AGENTS.md` 不覆盖且写 `.seed-new`，旧 `NODES.md` 被安全升级，`method-library.md` 保留。
- 未跑：Windows；npm publish（未发布）；Linux 独立 CI 冷启动；旧 run bundle 的绝对路径回填（按 epoch 豁免）。

## 残余边界

- 团队层与 Playwright MCP 仍有网络前置（registry/npx 或预置）；手册已写离线矩阵。
- 旧 run bundle（契约前）含本机绝对路径，不追改；新 run 的路径规则由研究手册与移交流程约束。
- `engines.dsh` 当前为精确 `0.2.1-rc.2`；换 pin 时同 diff 改 `dsh.compatibility.dshReleases` 与 `engines.dsh`，门禁会拦漂移。
