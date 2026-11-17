# 维护面合同：judge / show / operate

> 层：指南（怎么读目录、怎么判一个入口）。**本文的「面」只指维护面**——一个入口主要产出什么、
> 会不会动你的世界；不指 [evaluation.md](../evaluation.md) 的 L0–L4 评估面（那套「面」判验收等级）。
> 决策路由 = [D57](../decisions.md#d57)（分类法）· [D58](../decisions.md#d58)（根名统一）；目录门户 = [probes/](../../probes/README.md) ·
> [checks/](../../checks/README.md) · [tools/](../../tools/README.md)；逐件例外 = 本文 §5。

## 0. 一句话

根名即动词：`checks/` = judge、`probes/` = show、`tools/` = operate（三仓同骨架）。判一个入口
仍只问一件事：**它主要产出什么？** 裁决 → judge，证据 → show，持久状态 → operate；名字与产物
冲突时以产物为准，并把该件登记进例外表。

## 1. 两层：oracle 层（test 层）与 entry 层

| 层 | 判据 | 住哪 |
|---|---|---|
| **oracle 层**（test 层） | 由 `pnpm test` 的 runner 跑（node:test：`test:spec` + `test:checks`，vendor 契约另跑 `test:vendor`） | `tests/` |
| **entry 层** | 要自己起命令、进程或浏览器 | `probes/`、`checks/`、`tools/`——下面三面 |

oracle 层**不是面**，也不进面计数：判 runner，不判进程数。`test:e2e` / `test:entry` 由
[`checks/test/run-lane.mjs`](../../checks/test/run-lane.mjs) 按登记表选跑，跑到的件在这里仍按
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
| **run** | 起/复用进程 | 没起来，重试即可 | [`tools/channel/run-driver.mjs`](../../tools/channel/run-driver.mjs) |
| **act** | 持久改动 | 可能半途，需要 converge/repair | [`tools/release/export-dist.mjs`](../../tools/release/export-dist.mjs)、[`tools/clean/runtime-clean.mjs`](../../tools/clean/runtime-clean.mjs) `--yes` |

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

## 4. 本仓落点（三仓同骨架：checks / probes / tools）

根名三仓固定；每根只装一个动词；内部子组名本仓自定。定位一眼可判，例外只登记一次（§5）。

| 根 | 面 | 装什么 | 不装什么 |
|---|---|---|---|
| `checks/` | judge | `verify/`、`smoke/`、`run-gates/`（含 run-accept / acceptance-check）、`release/`（release-check） | 只读投影（→ `probes/`）、导出与清理（→ `tools/`） |
| `probes/` | show | `behavior/` `browser/` 探针、`analyze/` 只读取证投影、`stream/` 预载仪器 | 裁决入口（→ `checks/`）、持久改动（→ `tools/`） |
| `tools/` | operate（run + act） | `channel/` run 通道与驱动、`build/` 环境与 vendor 构建、`record/` 录制与生成器、`release/` 导出与手册源、`clean/` 运行区清理、`hooks/`（judge 例外）；`env.sh` 留根 = 配置入口 | 裁决（→ `checks/`）、只读投影（→ `probes/`） |
| `tests/` | oracle（非面） | `pnpm test` runner 的回归与门禁自测；服务三面，不是第四面 | 入口件（三面各自的家） |
| 启动配置 | 非面 | `tools/env.sh`、`tools/record/research.overlay.yml` 等 sourced 环境 / 生成物 | 不是入口，不进面计数 |

非面支撑：`checks/lib/` 是**维护层公共库**（judge/show/operate 的实现都在这，按消费者域分组；不随单件复制）；`checks/test/` runner、support、配置 JSON 与消费者同根（§5）。
各根 README 首屏承载同一份定位；本页是规则与例外的单一 home。
测试层的阅读地图与车道 = [tests/AGENTS.md](../../tests/AGENTS.md)、[guides/67](./67-test-strategy.md)。

## 5. 例外清单

未列出的件按所属组的面。路径是事实源，行动前照它去读。

| 路径 | 面 | 理由 |
|---|---|---|
| `probes/analyze/watch-run.mjs`、`probes/analyze/session-events.mjs`、`probes/analyze/run-dashboard.mjs`、`probes/analyze/stream-diagnostics.mjs`、`probes/analyze/provider-error-stats.mjs`、`probes/analyze/plan-card-stats.mjs`、`probes/analyze/session-replay.mjs`、`probes/analyze/scene-capture.mjs`、`probes/analyze/run-inventory.mjs`、`probes/analyze/unconsumed-evidence.mjs`、`probes/analyze/bundle-sessions.mjs` | show | 只读投影/诊断/回放；exit 1 是超时、标题歧义或零绑定，不是裁决 |
| `checks/run-gates/run-accept.mjs`、`checks/run-gates/acceptance-check.mjs` | judge | 交付验收原子动作 / 收活判据；红 = 不放行 |
| `tools/clean/runtime-clean.mjs` | operate（act） | 清理运行区；默认 dry-run，`--yes` 才删 |
| `tools/release/export-dist.mjs`、`tools/release/market.mjs`、`tools/release/export-handoff.mjs` | operate（act） | 产出 `_dist/` 工件 |
| `checks/release/release-check.mjs` | judge | 发布前版本/tag 一致性裁决 |
| `tools/release/product-manual.md` | 非面（数据） | 手册源，被 `readme-shape` / `dist-manual-fresh` 门禁消费 |
| `checks/verify/context.mjs` | 非面（助手） | 门禁共享助手（路径常量 / `gitOnce` / `trackedFiles`），不作判定 |
| `checks/test/run-lane.mjs` | 非面（runner） | 车道调度 |
| `checks/lib/*` | 非面（实现） | 维护层公共库：judge/show/operate 共享，按消费者域分组 |
| `checks/smoke/*.support.mjs` | 非面（support） | 夹具/支援件 |
| `checks/smoke/registry.json` | 非面（数据） | 车道登记表 |
| `checks/doc-budgets.json`、`checks/archived-note-pointers.json`、`checks/test-path-redirects.json` | 非面（数据） | 门禁消费的配置与登记簿 |
| `probes/_index.mjs` | 非面（生成器） | 索引生成/校验；`probe-registry` 用同一渲染对账 |
| `probes/stream/llm-stream-tee.cjs` | 非面（驱动） | 预载仪器，判据不适用；probe-index / probe-registry 按路径排除（`NON_PROBE_PATHS`） |
| `tools/env.sh`、`tools/record/research.overlay.yml` | 非面（配置 / 生成物） | sourced 环境 / `render-overlay` 的产出 |
| `tools/channel/llm-socket-isolation.cjs` | 非面（驱动） | `NODE_OPTIONS` 预载，socket 隔离 |
| `tools/build/vendor-host-bundle.config.ts`、`tools/build/vendor-typert-emit.mjs` | 非面（管道件） | `vendor-build.sh` 的构建配置与产物生成 |
| `tools/channel/boot-run.sh`、`tools/channel/run-driver.mjs` | operate（run） | 起/复用 run 通道 |
| `tools/channel/run-kickoff.mjs`、`tools/channel/hitl-answer.mjs`、`tools/build/bootstrap.sh`、`tools/build/vendor-build.sh`、`tools/record/record-asset-ledger.mjs`、`tools/record/record-ci-oracle.mjs`、`tools/record/record-role-fixture.mjs`、`tools/record/render-overlay.mjs`、`tools/record/render-test-index.mjs` | operate（act） | 对活通道或仓库做持久改动：建会话发 kickoff、写 HITL provenance、装环境、产 fixture/索引/overlay |
| `tools/hooks/pre-commit` | judge | git hook 的产物是裁决：红则拦 commit |

## 6. 已知限制与延后工作

- **旧根名只活在 redirect 账本**：`scripts/`、`dev/`、`probes/run/` 已退役；冻结层旧链接经
  `checks/test-path-redirects.json` 解析（链式，append-only）。老 clone 的 `core.hooksPath` 需重 source
  `tools/env.sh` 幂等恢复（hooks-active 门禁会点名未激活态）。
- **pack 源码一条注释仍指 `checks/lib/ops/…`**：改它会让已发布 0.3.6 的 tarball 变 sha（同版本不同工件），
  随下一次 pack 版本变更同 diff 修；残余风险 = [维护层对齐 Note](../../notes/implemented/2026-11-17-maintenance-layer-alignment.md)。
- **合同桶不改名**：`tests/pack/contract/` 与 `tests/contracts/` 的二分规则见 [tests/AGENTS](../../tests/AGENTS.md)；
  改名会改包内文档并迫使 repack，延后到下一次 pack 版本变更（[triggers](../../_backlog/triggers.md)）。
- **`client-load.entry` 1366 行**：phase-oriented 浏览器 E2E；拆分登记在 `script-file-size` 例外与
  [triggers](../../_backlog/triggers.md)，有可观察重议条件。
