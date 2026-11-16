# 维护面合同：judge / show / operate（三仓分类法的本仓落地）

> 状态：implemented
> 关联：[D57](../../docs/decisions.md#d57)；合同 = [guides/68](../../docs/guides/68-surface-contract.md)；
> 根布局 = [AGENTS.md](../../AGENTS.md)；门户 = [probes/README](../../probes/README.md) ·
> [scripts/README](../../scripts/README.md) · [dev/README](../../dev/README.md)；
> 来源 = 2026-11-16 三仓维护面分类法研究（作者本地 `ai_dsh_company` 的
> `_backlog/research/maintenance-surface-taxonomy/2026-11-16-reorg-deep-research.md`；本仓组级分类
> 经独立盲审复核，组内数字按盘上重核）。

## 决定

一个入口的面只由**主要产出**决定，不由目录名决定：

| 目录 | 面 | 落点 |
|---|---|---|
| `probes/` | show | 探针给 PASS/FAIL，但没有 hook/CI/验收吃它的红 |
| `scripts/` | mixed（judge + show + operate） | 组级面表住 `scripts/README.md`；逐件例外住 guides/68 §5 |
| `dev/` | operate（run + act） | `hooks/pre-commit` 是 judge；`env.sh`、预载驱动、构建配置是非面 |
| `tests/` | 不是面（test 层） | 由 `pnpm test` 的 runner 跑，不进面计数 |

- 三面：judge（裁决，被 hook/CI/验收消费）/ show（证据，红了只让人来看）/ operate（持久状态：
  run = 起/复用进程，act = 持久改动）。
- 判定序：生命周期（`状态：已耗` → 非面）→ 管道件（lib / driver / fixture / runner / support →
  非面，跟消费者）→ 主要产出；混合件按终端产物，双模件按主产物，被 judge 调用不改变面；
  仍冲突按「产物 > 失败语义 > 名字」。
- 本轮只做声明层：零搬家、零 exit code 改动、零门禁扫描面改动。面声明落在每轮在场的地方
  （根布局三行、三处目录 README 首屏、`scripts/README.md` 组级面表），逐件例外与延后项住 guides/68。
- `scripts/` 与 `run-ops/` 都不改名——名字与动词相反的事实写进组表与例外清单（`run-ops/` 以 show 为主）。
- 两套「面」的消歧登记在 [terms](../../docs/terms.md)：维护面（judge / show / operate）≠ 评估面 L0–L4。

## 判据形状

- **权威输入**：入口的 exit code 语义、头注（`状态` / `档位` / `判据`）、它的红由谁消费
  （hook / CI / 验收 / 没人）。
- **写入者**：新增或搬动入口的人在 guides/68 §5 登记；面声明不靠门禁生成（`probe-registry`
  仍按目录扫，不看面）。
- **非法 / 互斥**：按名字判面（`run-ops` → operate）非法；同一件两个面非法，必须落到一个；
  归属不明 → 按所属组的面并在例外表登记。
- **反证**：本轮逐件读 exit code 语义——`run-ops/watch-run` 的 exit 1 是超时（「没等到」），
  `unconsumed-evidence` 的 exit 0 是结论（有未消费证据不是工具错误），都不是裁决 → show。
- **冲突裁定**：组表与例外表冲突时以例外表为准（更具体的件级判定），并回改组表。
- **旧形态退场**：无——面归属此前不存在，本轮新立。

## 输掉的方案

| 方案 | 为什么输 |
|---|---|
| `scripts/` 改名 `checks/` | 动全量 tracked 文件的外部引用（含冻结归档区）、`scripts/AGENTS.md` 的目录注入面、`scripts/test-path-redirects.json` 对旧链的解析、`dev/env.sh` 的 `core.hooksPath`；组内面不改则新名仍混装。是独立迁移项目，不是清晰度的前提 |
| 只改名不改组 | `dist/` / `run-ops/` / `smoke/` / `test/` 仍在目录里，新名仍有可观比例不是 judge——名字换了，动词还是混的 |
| 不改名也不声明 | `scripts/run-ops/watch-run` 看起来会动盘，实际只读会话日志出投影；「这个目录会不会动我的世界」必须一眼可判 |
| 按名字判面（`run-ops` = operate） | 名字与行为相反正是要消除的歧义；判据只能是产物 |
| 面声明只写进 guides 一页 | 入口目录自己不指路，读者仍要先查地图；面必须在目录门户与根布局在场 |
| 同一轮把 show 件迁 `probes/`、把 stream tee 摘出探针计数 | 搬家要逐件补六字段头注、改门禁输入与命令字面量；tee 摘出改的是 `probe-registry` 的扫描面（行为改动，需红→绿留证）。本轮只做声明 |
| 把 `scripts/` 写成「judge，两个例外」 | show 与 operate 都以组为单位存在（`run-ops/` 多数、`dist/` 三件）；写成例外会让读者继续误解 |
| 两面（judge / 工具）就够 | show 与 operate 的失败语义不同（证据没人看 vs 世界没到态），合成一面后「要不要 converge」无可判依据 |

## 实际跑过的验证

- 基线（改动前）：`pnpm verify` 全绿；`pnpm test` 214 pass / 0 fail / 0 skip。改动在绿底上开始。
- 改动后：`pnpm verify` 全绿（含 `doc-paths` 反引号与散文路径、`md-links`、`md-anchors`、
  `doc-budgets`、`entry-chain`、`probe-registry`、`staged-change-pairing`）；`pnpm test` 全绿（含
  `docs-consistency`「docs/ 每个 tracked .md 都进 00-index 文档地图」与 `decisions-now` 真台账判据
  ——D57 行长度 / 活载体 / 连续性）。
- 语义自审（D 号 + 文档合同面必审）：跨文档一致性逐处核过——`00-index` 两处入口、根布局三行、三处 README、
  `scripts/README` 组面表、`terms.md` 消歧行、`decisions.md` 的 D57 与 `guides/68` 互指一致；延后项落
  [`_backlog/triggers.md`](../../_backlog/triggers.md) 三条可观察触发器。
- 人工核对：三处 README 首屏可见面声明；guides/68 §5 每条路径在盘上存在；`probes/README.md` 仍
  链接 `INDEX.generated.md`；`scripts/README.md` 组级面表与 §5 一致；`AGENTS.md` 行数未增（140 行预算）。
- 未跑：真模型档（本改动零模型面、零运行行为；`l4-lite` / 探针按需另跑，不记本次 verified）。

## 环境状态

- 未改 `packages/deep-research-pack/`、`probes/` / `scripts/` / `dev/` 的任何可执行件；无文件移动、
  无 exit code 改动、无门禁逻辑改动。
- 仓外材料（`ai_dsh_company` 的研究单）不随本仓；本仓结论以 guides/68 + 本 Note 为家。
