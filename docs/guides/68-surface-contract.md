# 维护面合同：judge / show / operate

> 层：指南（怎么读目录、怎么判一个入口）。**本文的「面」只指维护面**——一个入口主要产出什么、
> 会不会动你的世界；不指 [evaluation.md](../evaluation.md) 的 L0–L4 评估面（那套「面」判验收等级）。
> 决策路由 = [D57](../decisions.md#d57)；目录门户 = [probes/](../../probes/README.md) ·
> [scripts/](../../scripts/README.md) · [dev/](../../dev/README.md)；逐件例外 = 本文 §5。

## 0. 一句话

目录名不保证动词。判面只问一件事：**这个入口主要产出什么？** 裁决 → judge，证据 → show，
持久状态 → operate。

## 1. 两层：test 层与 entry 层

| 层 | 判据 | 住哪 |
|---|---|---|
| **test 层** | 由 `pnpm test` 的 runner 跑（node:test：`test:spec` + `test:checks`，vendor 契约另跑 `test:vendor`） | `tests/` |
| **entry 层** | 要自己起命令、进程或浏览器 | `probes/`、`scripts/`、`dev/`——下面三面 |

测试层**不是面**，也不进面计数：判 runner，不判进程数。`test:e2e` / `test:entry` 由
[`scripts/test/run-lane.mjs`](../../scripts/test/run-lane.mjs) 按登记表选跑，跑到的件在这里仍按
entry 层的三面判。

## 2. 三面（只对 entry 层）

| 面 | 主要产出 | 红了意味着 | 谁消费 |
|---|---|---|---|
| **judge** | 裁决 | 放行被挡：有人据此退回 | hook / CI / 验收 |
| **show** | 证据 | 有人来看看，不挡变更 | 人、诊断者 |
| **operate** | 持久状态 | 世界没到目标态 | 环境 / 仓库 / 发布物 / 生成物 |

**「会红」不等于 judge**：探针也给 PASS/FAIL，但没有 hook/CI/验收吃它的红，所以是 show。
判据只有被放行/退回机制消费时才是裁决。

operate 的两种模式：

| 模式 | 做什么 | 失败语义 | 例 |
|---|---|---|---|
| **run** | 起/复用进程 | 没起来，重试即可 | [`dev/run-driver.mjs`](../../dev/run-driver.mjs) |
| **act** | 持久改动 | 可能半途，需要 converge/repair | [`dev/release/export-dist.mjs`](../../dev/release/export-dist.mjs)、[`dev/runtime-clean.mjs`](../../dev/runtime-clean.mjs) `--yes` |

## 3. 判定顺序

按序走，第一条命中即止：

1. **生命周期**：头注 `状态：已耗（YYYY-MM-DD 原因/复跑条件）` → 非面（归档候选），不进面计数。
   字段协议 = [guides/66](./66-probe-playbook.md)。
2. **管道件**：lib / driver / fixture / runner / reporter / 索引生成器 / 纯查询 / support →
   非面，跟消费者住。
3. **主要产出**：裁决 → judge；证据 → show；持久状态 → operate（起进程的标 run）。
4. **混合件**按终端产物；**双模件**（`--write` / `--check`）按主产物；**被 judge 调用不改变面**
   （在消费方头注记依赖）。
5. 仍冲突：**产物 > 失败语义 > 名字**。

为什么产物优先：「失败要重跑」对每个条目都成立，判别力为零；「裁决 / 证据 / 世界状态」三者互斥，
可以判。

## 4. 本仓落点

| 目录 | 面 | 说明 |
|---|---|---|
| `tests/` | test 层（不是面） | 阅读地图与车道 = [tests/AGENTS.md](../../tests/AGENTS.md)、[guides/67](./67-test-strategy.md) |
| `probes/` | show | behavior / browser / run 三域 + stream 仪器；`_index` 是生成器、stream tee 是驱动（§5） |
| `scripts/` | judge（+ 非面支撑） | `verify/`、`smoke/`、`run-gates/`（含 run-accept / acceptance-check）、`dist/`（release-check）；非面 = `test/` runner、`lib/`、support、配置 JSON |
| `dev/` | operate（run + act） | run 通道与构建、发布交付（`release/`）、运行区清理；`hooks/pre-commit` 是 judge；配置/预载驱动/手册源是非面 |

目录与动词一一对应：judge 住 `scripts/`，只读投影住 `probes/run/`，导出与清理住 `dev/`。

## 5. 例外清单

未列出的件按所属组的面。路径是事实源，行动前照它去读。

| 路径 | 面 | 理由 |
|---|---|---|
| `probes/run/watch-run.mjs`、`probes/run/session-events.mjs`、`probes/run/run-dashboard.mjs`、`probes/run/stream-diagnostics.mjs`、`probes/run/provider-error-stats.mjs`、`probes/run/plan-card-stats.mjs`、`probes/run/session-replay.mjs`、`probes/run/scene-capture.mjs`、`probes/run/run-inventory.mjs`、`probes/run/unconsumed-evidence.mjs`、`probes/run/bundle-sessions.mjs` | show | 只读投影/诊断/回放；exit 1 是超时、标题歧义或零绑定，不是裁决 |
| `scripts/run-gates/run-accept.mjs`、`scripts/run-gates/acceptance-check.mjs` | judge | 交付验收原子动作 / 收活判据；红 = 不放行 |
| `dev/runtime-clean.mjs` | operate（act） | 清理运行区；默认 dry-run，`--yes` 才删 |
| `dev/release/export-dist.mjs`、`dev/release/market.mjs`、`dev/release/export-handoff.mjs` | operate（act） | 产出 `_dist/` 工件 |
| `scripts/dist/release-check.mjs` | judge | 发布前版本/tag 一致性裁决 |
| `dev/release/product-manual.md` | 非面（数据） | 手册源，被 `readme-shape` / `dist-manual-fresh` 门禁消费 |
| `scripts/verify/context.mjs` | 非面（助手） | 门禁共享助手（路径常量 / `gitOnce` / `trackedFiles`），不作判定 |
| `scripts/test/run-lane.mjs` | 非面（runner） | 车道调度 |
| `scripts/lib/*` | 非面（实现） | 支撑库，跟消费者 |
| `scripts/smoke/*.support.mjs` | 非面（support） | 夹具/支援件 |
| `scripts/smoke/registry.json` | 非面（数据） | 车道登记表 |
| `scripts/doc-budgets.json`、`scripts/archived-note-pointers.json`、`scripts/test-path-redirects.json` | 非面（数据） | 门禁消费的配置与登记簿 |
| `probes/_index.mjs` | 非面（生成器） | 索引生成/校验；`probe-registry` 用同一渲染对账 |
| `probes/stream/llm-stream-tee.cjs` | 非面（驱动） | 预载仪器，判据不适用；现行 `probe-registry` 仍按探针扫（§6） |
| `dev/env.sh`、`dev/research.overlay.yml` | 非面（配置 / 生成物） | sourced 环境 / `render-overlay` 的产出 |
| `dev/llm-socket-isolation.cjs` | 非面（驱动） | `NODE_OPTIONS` 预载，socket 隔离 |
| `dev/vendor-host-bundle.config.ts`、`dev/vendor-host-typert.config.ts`、`dev/vendor-typert-emit.mjs` | 非面（管道件） | `vendor-build.sh` 的构建配置与产物生成 |
| `dev/boot-run.sh`、`dev/run-driver.mjs` | operate（run） | 起/复用 run 通道 |
| `dev/run-kickoff.mjs`、`dev/hitl-answer.mjs`、`dev/bootstrap.sh`、`dev/vendor-build.sh`、`dev/record-asset-ledger.mjs`、`dev/record-ci-oracle.mjs`、`dev/record-role-fixture.mjs`、`dev/render-overlay.mjs`、`dev/render-test-index.mjs` | operate（act） | 对活通道或仓库做持久改动：建会话发 kickoff、写 HITL provenance、装环境、产 fixture/索引/overlay |
| `dev/hooks/pre-commit` | judge | git hook 的产物是裁决：红则拦 commit |

## 6. 已知限制与延后工作

- **目录名未统一**（目标名 checks / probes / tools）：`scripts/` 改名不只是一次路径替换，会动
  `scripts/AGENTS.md` 的目录注入面、`scripts/test-path-redirects.json` 对冻结层的旧链解析、
  `dev/env.sh` 的 `core.hooksPath`。面已拆开，改名另立迁移。
- **`scripts/dist/` 只剩 `release-check`**：分组名沿用历史（发布前裁决），不改名以免再触发一轮引用迁移。
- **stream tee 口径差**：`probes/stream/llm-stream-tee.cjs` 按本页是非面（驱动），但
  `probe-registry` 现行按探针扫它（必须带六字段头注）。统一 = 改
  `scripts/lib/shared/probe-index.mjs` 的非探针清单，属门禁扫描面的行为改动，需红→绿留证。
