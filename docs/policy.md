# 工程治理、意图载体与维护面合同（Policy）

> 本页拥有本仓三条治理合同的现行正本：① **DSH 纪律载体分工与自定纪律**（逐源三态明细表住 [reference/discipline-matrix.md](./reference/discipline-matrix.md)，机读对账住 [reference/alignment-ledger.json](./reference/alignment-ledger.json)）；② **意图载体边界与单向依赖律**；③ **维护面合同（`checks/` = judge、`probes/` = show、`tools/` = operate）**。
>
> **单向依赖律**：`docs/` 是核心思想主干，可依赖 `notes/`（已定/拟定决定）与源码，不依赖 `_backlog/` 的历史探索卡与具体方法（仅允许链接 `_backlog/triggers.md` 与池入口文档）。

---

## 一、DSH 纪律载体分工与自定纪律

源头 = `vendor/dsh` pinned submodule（tag `dsh-v0.2.1-rc.5`，只读铁律）。全部源面逐条三态（照搬 / 带证据适配 / 不适用+触发）与升 pin 重审清单见 [reference/discipline-matrix.md](./reference/discipline-matrix.md)。

### 1.1 载体分工（规则改在哪，不复制）

| 载体 | 擅长回答 | 不能替代 | 本仓实例 |
|---|---|---|---|
| `AGENTS.md` | 每轮必须遵守什么 | 情境化长流程、全档命令表 | 入口链、布局表、最小命令表、红线 |
| `docs/` 合同面 | 系统**现在**是什么、怎么用 | 决策历史 | `architecture`、`testing`、`policy`、`contracts/`、`guides/` |
| Skill（`.agents/skills/`） | 面对某类任务怎样调查、判断、验证 | 确定性 pass/fail | 换 pin / 加角色 / 写门禁 / 跑 run / 改轨道 / 交付自审 / 复现间歇缺陷 |
| 门禁与契约测试 | 一个可机械条件是否满足 | 意图与设计质量 | `checks/verify/verify.mjs` + `tests/` |
| Agent Note（`notes/`） | 为什么这样决定、放弃了什么 | 当前 API 的唯一说明 | `proposed`（拟定）/ `implemented`（现行）/ `archived`（冻结）/ `rejected`（否决） |
| 运行区记录 | 这次实际发生了什么 | 可复现的回归证据 | `drt_*` bundle、会话日志、仪表盘投影 |

组合使用判据：规则改变 → 只改规则 owner；Skill 只**链接** owner 不复制；门禁只判机械条件，语义判断留给交付自审与用户验收。

### 1.2 本仓自定纪律（非 DSH 源；D 号为准）

| 纪律 | 落点 | 机械把守 |
|---|---|---|
| [D53](./decisions.md#d53) 测试文件名 = 证据车道 | [tests/AGENTS](../tests/AGENTS.md) / [checks/AGENTS](../checks/AGENTS.md) / [checks/README](../checks/README.md) | [test-lanes](../tests/checks/shared/test-lanes.test.mjs) / [smoke-registry](../tests/checks/test-infra/smoke-registry.test.mjs) / [smoke-oracle-surface](../tests/checks/test-infra/smoke-oracle-surface.test.mjs) / `layering` ④ |
| [D54](./decisions.md#d54) 三环四账五关 | [testing.md](./testing.md) / [三环四账五关 Note](../notes/implemented/2026-11-13-test-strategy-operating-model.md) | [test-lanes](../tests/checks/shared/test-lanes.test.mjs) / [smoke-registry](../tests/checks/test-infra/smoke-registry.test.mjs) / [smoke-oracle-surface](../tests/checks/test-infra/smoke-oracle-surface.test.mjs) / [ci-jobs](../tests/checks/test-infra/ci-jobs.test.mjs) / `decisions-now` |

---

## 二、意图载体总图（意图从哪进、从哪出）

对照物 = DSH SDLC 参考卷 `09-intake-and-work-items.md`（仓外语料，钉版登记 = [reference/external.md](./reference/external.md)）；本仓按单人文件工作流适配，不承接 GitHub Issue/Project 状态机。

### 2.1 载体清单

| 载体 | owner（规则正文） | 拥有的唯一事实 | 适用条件 | 出场方式 |
|---|---|---|---|---|
| [`_backlog/issues/`](../_backlog/issues/README.md) 问题卡 | [_backlog/README](../_backlog/README.md) | 问题、目标、已知与未决、结论和去向 | 需要跨轮澄清或留存问题判断；不是实施前置 | 按 [_backlog/README](../_backlog/README.md) 结论去向与 [notes/AGENTS](../notes/AGENTS.md) 收件规则选载体后归档 |
| [`_backlog/bugs/`](../_backlog/bugs/README.md) 缺陷卡 | [_backlog/README](../_backlog/README.md) | 已发现但本次不修的缺陷 | 确认暂不修；翻「修复就绪」即自带 P1/P2 修复授权（[D24](./decisions.md#d24)，P0/触面走等人拍板） | 修复或查明未修后归档；修完写 `json fix-evidence` 并与代码/测试同变更 |
| [`_backlog/research/`](../_backlog/research/README.md) 调研 | [_backlog/README](../_backlog/README.md) | 按研究题组织的长篇证据；题名页记消费者与产出的卡 | 需要保留并服务问题判断 | 整个研究题目录在最后一张活跃卡离开时归档 |
| [`_backlog/methods/`](../_backlog/methods/README.md) 探索方法 | [_backlog/README](../_backlog/README.md) | `_backlog/` 推敲期内部按需使用的澄清/查证/去向方法（`docs/` 不直接依赖具体方法） | 仅在 `_backlog/` 内部处理未决问题时按需加载；不是实施授权 | 演进为全仓持久规范后沉淀进 `docs/` 或 `notes/` |
| [`_backlog/triggers.md`](../_backlog/triggers.md) | [_backlog/README](../_backlog/README.md) | 工作中可直接观察到的重议条件 | 仅当遗漏会导致重犯，且触发能在正常工作中遇到 | 条件到场后按新决定重进；否则由 owner 保留结论 |
| [`notes/proposed/`](../notes/proposed/) RFC | [notes/AGENTS](../notes/AGENTS.md) | 需要显式评审的持久决定提案 | 该决定需在实现前持久化并评审；不是所有工作都需要 | 经批准实施后正文改写并迁 `implemented/`；否决则入 `rejected/` |
| [`notes/implemented/`](../notes/implemented/) | [notes/README](../notes/README.md) | 已交付决定理由及验证 | 持久决定理由不能由代码、测试或现有文档说明 | 不再指导未来变更时冻结归档至 `archived/` |
| `notes/rejected/` | [notes/README](../notes/README.md) | 有防复犯价值的否决决定 | 需要保留的否决理由 | 复活通过新 Note 引用旧篇；历史保持不变 |
| 事故复盘（冻结在 `notes/archived/`） | [notes/README §事故复盘](../notes/README.md) | 事故叙事唯一入口：症状 / 为什么没早发现 / 根因 / 修复 / 新增防线 | 达到“bug 到达了不该到达的地方”；已结案 | 防线落 [testing.md](./testing.md) / `triggers.md` 后冻结进 `archived/` |
| 代码 `TODO` / degraded 观察项 | 所属代码文件 | 局部实现缺口 | 具体、局部且不需要跨轮问题分析 | 修复后移除 |
| 用户直派 | 当前请求 | 当轮授权范围 | 用户明确提出工作 | 按授权范围交付；持久决定按 notes 规则记录 |

### 2.2 结论去向流转

```text
用户请求 ── 已授权 ─────────────────────────────→ 按范围直接执行
     │
     └─ 需澄清/查证/比较/留存 ─→ issues/ ←→ research/ methods/ bugs/
                                          │
                                          └─ 结论确定 → 选择去向（_backlog/README + notes/AGENTS）
                                               ├─ 决定本身是交付物 → implemented Note → 卡归档
                                               ├─ 决定绑定实施 → 卡留活跃 → 交付变更 → implemented Note → 卡归档
                                               ├─ 需实施前评审 → proposed RFC → 毕业 → implemented
                                               ├─ 不做 → rejected（有防复犯价值）/ none
                                               └─ 延后 → deferred（triggers.md / owning note / 明确 none）
```

Backlog 不是实施前置门，RFC 不是普遍实施要求；未裁决的推敲留在 backlog。卡的交接门 = `待落地`（准备进开发，不是授权）；`proposed` 卡在 RFC 成立时归档、`implemented` 卡留到交付并与 Note 同变更。结论去向不转移质量责任：业务验收与产品可接受性（P0/触面例外）归用户；严重级分诊与技术证据归 agent。状态机 = [_backlog/AGENTS](../_backlog/AGENTS.md)；收件规则 = [notes/AGENTS](../notes/AGENTS.md)。

### 2.3 与参考卷的适配与分流接口

| 维度 | 参考卷 | 本仓适配 |
|---|---|---|
| Issue 与远端协作 | GitHub Issue / Project / PR 状态 | 单人仓文件卡；不引入远端协作系统 |
| 需求整理 | 问题澄清、查证、综合与结论去向 | `issues/` + 按需 `methods/` + 消费者导向 `research/` |
| 执行顺序 | tracker 状态机 | 会话内 plan/todo，仅组织已授权工作，不设仓库任务队列 |
| 计划与提案 | 会话内计划与仓库决策记录分开 | DSH Plan Mode 仍是会话内呈批；RFC 只用于需要显式评审的持久决定 |
| 验收 | 条件化证据判断 | 复用本仓证据 owner 与命令；见 [guides/dev-loop.md](./guides/dev-loop.md) 与 [testing.md](./testing.md) |

---

## 三、维护面合同：judge / show / operate

> **词汇隔离**：本节的「面」只指维护面——一个入口主要产出什么、会不会动你的世界；不指 [testing.md](./testing.md) 的 L0–L4 评估面。
> 决策路由 = [D57](./decisions.md#d57)（分类法）· [D58](./decisions.md#d58)（根名统一）；目录门户 = [probes/](../probes/README.md) · [checks/](../checks/README.md) · [tools/](../tools/README.md)。

### 3.1 两层与三面

根名即动词：`checks/` = judge、`probes/` = show、`tools/` = operate（三仓同骨架）。判一个入口只问：**它主要产出什么？** 裁决 → judge，证据 → show，持久状态 → operate；名字与产物冲突时以产物为准，并登记进例外表。

| 层 | 判据 | 住哪 |
|---|---|---|
| **oracle 层**（test 层，非面） | 由 `pnpm test` 的 runner 跑（node:test：`test:spec` + `test:checks`，vendor 契约另跑 `test:vendor`） | `tests/` |
| **entry 层** | 要自己起命令、进程或浏览器（`test:e2e`/`test:entry` 由 [`checks/test/run-lane.mjs`](../checks/test/run-lane.mjs) 调度） | `probes/`、`checks/`、`tools/` |

| 面 | 主要产出 | 红了意味着 | 谁消费 |
|---|---|---|---|
| **judge** | 裁决 | 放行被挡：有人据此退回 | hook / CI / 验收 |
| **show** | 证据 | 有人来看看，不挡变更 | 人、诊断者 |
| **operate** | 持久状态（**run** = 起/复用进程；**act** = 持久改动） | 世界没到目标态 | 环境 / 仓库 / 发布物 / 生成物 |

**「会红」不等于 judge**：探针也给 PASS/FAIL，但没有 hook/CI/验收吃它的红，所以是 show。判定顺序（第一条命中即止）：① 生命周期（`状态：已耗` → 非面）→ ② 管道件（lib/driver/fixture/runner/生成器/support → 非面）→ ③ 主要产出 → ④ 混合件按终端产物、双模件按主产物、被 judge 调用不改变面 → ⑤ 仍冲突：**产物 > 失败语义 > 名字**。

### 3.2 本仓落点（三仓同骨架：checks / probes / tools）

| 根 | 面 | 装什么 | 不装什么 |
|---|---|---|---|
| `checks/` | judge | `verify/`、`smoke/`、`run-gates/`（含 run-accept / acceptance-check）、`release/`（release-check） | 只读投影（→ `probes/`）、导出与清理（→ `tools/`） |
| `probes/` | show | `behavior/` `browser/` 探针、`analyze/` 只读取证投影、`stream/` 预载仪器 | 裁决入口（→ `checks/`）、持久改动（→ `tools/`） |
| `tools/` | operate（run + act） | `channel/` run 通道与驱动、`build/` 环境与 vendor 构建、`record/` 录制与生成器、`release/` 导出与手册源、`clean/` 运行区清理、`hooks/`（judge 例外）；`env.sh` 留根 = 配置入口 | 裁决（→ `checks/`）、只读投影（→ `probes/`） |
| `tests/` | oracle（非面） | `pnpm test` runner 的回归与门禁自测；服务三面，不是第四面 | 入口件（三面各自的家） |
| 启动配置 | 非面 | `tools/env.sh`、`tools/record/research.overlay.yml` 等 sourced 环境 / 生成物 | 不是入口，不进面计数 |

非面支撑：`checks/lib/` 是**维护层公共库**（judge/show/operate 共享，按消费者域分组）；`checks/test/` runner、support、配置 JSON 与消费者同根。各根 README 首屏承载同一份定位（受 `surface-claims` 门禁校验）。

### 3.3 例外清单

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
| `tools/channel/run-kickoff.mjs`、`tools/channel/hitl-answer.mjs`、`tools/build/bootstrap.sh`、`tools/build/vendor-build.sh`、`tools/record/record-asset-ledger.mjs`、`tools/record/record-ci-oracle.mjs`、`tools/record/record-role-fixture.mjs`、`tools/record/render-overlay.mjs`、`tools/record/render-test-index.mjs`、`tools/record/render-docs-reference.mjs` | operate（act） | 对活通道或仓库做持久改动：建会话发 kickoff、写 HITL provenance、装环境、产 fixture/索引/overlay/参考文档 |
| `tools/hooks/pre-commit` | judge | git hook 的产物是裁决：红则拦 commit |

## 已知限制与延后工作

- **旧根名与旧 `docs/` 路径只活在 redirect 账本**：冻结层旧链接经 `checks/test-path-redirects.json` 解析（链式，append-only）；老 clone 的 `core.hooksPath` 需重 `source tools/env.sh` 幂等恢复（`hooks-active` 门禁点名未激活态）。
- **合同桶不改名**：`tests/pack/contract/` 与 `tests/contracts/` 的二分规则见 [tests/AGENTS](../tests/AGENTS.md)；延后到下一次 pack 版本变更（[triggers](../_backlog/triggers.md)）。
- **`client-load.entry` 1366 行**：phase-oriented 浏览器 E2E；拆分登记在 `script-file-size` 例外与 [triggers](../_backlog/triggers.md)。
