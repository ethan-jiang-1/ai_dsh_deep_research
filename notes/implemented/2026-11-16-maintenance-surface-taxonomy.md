# 维护面三分：judge / show / operate（D57）

> 状态：implemented
> 关联：[D57](../../docs/decisions.md#d57)；合同 = [guides/68](../../docs/guides/68-surface-contract.md)；
> 门户 = [probes/README](../../probes/README.md) · [scripts/README](../../scripts/README.md) ·
> [dev/README](../../dev/README.md)；根布局 = [AGENTS.md](../../AGENTS.md)；
> 来源 = 2026-11-16 三仓维护面分类法研究（作者本地 `ai_dsh_company` 的
> `_backlog/research/maintenance-surface-taxonomy/`；本仓组级分类经独立盲审复核）。

## 决定

一个入口的面只由**主要产出**决定，不由目录名决定；目录与动词一一对应：

| 目录 | 面 | 内容 |
|---|---|---|
| `probes/` | show | `behavior/` `browser/` 探针（给 PASS/FAIL 但不被 hook/CI/验收消费）+ `run/` 只读取证投影 + `stream/` 预载仪器 |
| `scripts/` | judge（+ 非面支撑） | `verify/`、`smoke/`、`run-gates/`（含 run-accept / acceptance-check）、`dist/`（release-check）；非面 = `test/` runner、`lib/`、support、配置 JSON |
| `dev/` | operate（run + act） | run 通道与构建、`release/`（export-dist / market / export-handoff / 手册源）、`runtime-clean`；`hooks/pre-commit` 是 judge |
| `tests/` | test 层（不是面） | 由 `pnpm test` 的 runner 跑，不进面计数 |

- 三面：judge（裁决，被 hook/CI/验收消费）/ show（证据，红了只让人来看）/ operate（持久状态：
  run = 起/复用进程，act = 持久改动）。**「会红」不等于 judge**：探针给判定，但没人据此放行/退回。
- 判定序：生命周期（`状态：已耗` → 非面）→ 管道件（lib / driver / fixture / runner / support →
  非面，跟消费者）→ 主要产出；混合件按终端产物，双模件按主产物，被 judge 调用不改变面；
  仍冲突按「产物 > 失败语义 > 名字」。
- 目录名不改：`scripts/` 与 `dev/` 保留原名（改名是独立迁移，见输掉的方案）。

**本轮的结构执行**（搬家，零行为改动）：

- 11 件 show 从 `scripts/run-ops/` → `probes/run/`（新域；逐件补六字段头注，`判据` 写「不适用（show）」）。
- `run-accept` / `acceptance-check` → `scripts/run-gates/`（judge 归位，`scripts/run-ops/` 目录消失）。
- `export-dist` / `market` / `export-handoff` / `product-manual.md` → `dev/release/`；
  `runtime-clean` → `dev/`（operate 面）。
- 引用全量同步：docs、AGENTS 布局、三处门户 README、`.agents/skills`、`runtime/README`、
  `dev/boot-run.sh` / `run-driver.mjs`、smoke 与 b-pack/e-workspace 门禁、gates-cases 夹具、
  tests 与 CI；冻结层（`notes/`、`_backlog/`）不改写，旧路径靠
  [`scripts/test-path-redirects.json`](../../scripts/test-path-redirects.json) 解析。

## 判据形状

- **权威输入**：入口的 exit code 语义、头注（`状态` / `档位` / `判据`）、它的红由谁消费
  （hook / CI / 验收 / 没人）。
- **写入者**：新增或搬动入口的人在 `docs/guides/68` §5 登记；面声明不靠门禁生成
  （`probe-registry` 按目录扫，不看面）。
- **非法 / 互斥**：按名字判面（`run-ops` → operate）非法；同一件两个面非法；归属不明 → 按所属组的面
  并在例外表登记。
- **反证**：逐件读 exit code 语义——`probes/run/watch-run` 的 exit 1 是超时（「没等到」），
  `unconsumed-evidence` 的 exit 0 是结论（有未消费证据不是工具错误），都不是裁决 → show。
- **冲突裁定**：组表与例外表冲突时以例外表为准（更具体的件级判定），并回改组表。
- **旧形态退场**：本轮把「声明层」（面写在哪）换成「结构层」（件搬到家）；旧的
  `scripts/run-ops/` 与 `scripts/dist/` 生成件不再存在，旧路径只作为 redirects 登记簿的 `from`。

## 输掉的方案

| 方案 | 为什么输 |
|---|---|
| 只做声明、不搬家（上一轮） | 目录名与动词仍相反：`scripts/run-ops/` 里 11 件只读投影被当成运维工具；声明页解决「读得到」，解决不了「看一眼就判对」 |
| 本轮顺手把 `scripts/` 改名 `checks/`、`dev/` 改名 `tools/` | 动全量 tracked 文件的外部引用（含冻结归档区）、`scripts/AGENTS.md` 的目录注入面、旧链重定向与 `dev/env.sh` 的 `core.hooksPath`；面刚拆完，改名应与拆组分开做，否则一次 diff 同时改「家」和「门牌」 |
| 新建 `tools/` 放 operate 件 | 从三面变四个门牌；`dev/` 已经是 operate 面，迁入即归位 |
| 保留 `scripts/run-ops/` 只放 run-accept / acceptance-check | 两个验收件住在一个叫「运维」的目录里，名字与动词仍冲突；并入 `run-gates/` 后 `scripts/` 内每组单一动词 |
| show 件留在 `scripts/`、只更新 README 面表 | 上一轮已证明：读者按目录找件，README 表改变不了目录名 |
| 迁 `probes/run/` 时不补六字段头注 | `probe-registry` 红；且索引会把新域渲染成缺字段的行 |
| 把 `scripts/lib/` 的对应模块随消费者复制一份到 `probes/run/` | 双源：`test-owner-mirror` 的 owner 映射与 lib 消费列会同时失真；lib 是共享支撑，跟仓库不跟单个消费者 |
| 把手册源迁 `docs/` | 它是**产品**安装手册源（随 `_dist/安装手册.md` 发布），与导出器同住才能一处改一处证；`docs/` 是开发/设计文档层 |

## 实际跑过的验证

- **结构门禁首跑红 → 修 → 绿**（本轮真红证）：
  - `doc-paths` 红 2 处：`runtime/README.md` 仍写 `scripts/run-ops/scene-capture.mjs` /
    `scripts/run-ops/runtime-clean.mjs` → 改 `probes/run/` / `dev/` → 绿。
  - `navigability-contract` 红：`git mv` 后空的 `scripts/run-ops/` 目录仍在盘上，索引「未点名
    run-ops/」→ `rmdir` → 绿。
  - `smoke-imports` 红：`scripts/smoke/handoff.e2e.mjs` 的**静态 import** 仍指 `../dist/export-handoff.mjs`
    （只改了 spawn 路径）→ 改 `../../dev/release/export-handoff.mjs` → 绿。
- 搬家后 `pnpm verify` 全绿；`pnpm test` 1365 spec 断言 + 214 checks 全绿（含 `probe-registry`
  19 支、`docs-consistency`、`repo-conventions` 的 dev shell 字面量、`smoke-child-paths` 的
  `join(ROOT,…)` 目标在场、`navigability` 的 scripts/dev 索引全覆盖）。
- **实跑每个搬走的 CLI**（退出码语义不变）：`run-inventory --workspace research-workspace` = 0；
  `watch-run` / `session-events` / `bundle-sessions` / `unconsumed-evidence` / `scene-capture` /
  `session-replay` / `run-accept` / `acceptance-check` 无参 = 2（用法）；
  `stream-diagnostics` / `provider-error-stats --json` / `plan-card-stats --json` = 0；
  `dev/release/market --check` = 0；`dev/runtime-clean`（dry-run）= 0。
- **发布链实跑**：`node dev/release/export-dist.mjs` 全绿且 `_dist/` 无内容 diff（手册源搬家后
  生成物一致）；`node dev/release/export-handoff.mjs --out <tmp>` 出 tar 并打印 HEAD/条目数；
  临时目录已删。
- `node probes/_index.mjs --check` 一致（19 支；新域 `run/` 11 支）。
- 收尾用仓内真 `dev/hooks/pre-commit`（verify + tests）跑绿后提交，未用 `--no-verify`。

## 环境状态

- 未改 `packages/deep-research-pack/` 的任何源、内容或模型可见文本；未改任何 exit code 判定分支。
- 命令路径变化（docs / CI / smoke / dev shell）是本次唯一对外可感变化；冻结层正文未改写，
  旧链接由 redirects 登记簿解析（18 条新增）。
- `_dist/` 生成物无 diff；`runtime/` 只被 dry-run 读过。
