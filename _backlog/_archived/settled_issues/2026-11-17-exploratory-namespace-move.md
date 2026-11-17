---
status: 已结
opened: 2026-11-17
---

# 推敲：命名空间搬家后的残差探索（2026-11-17 轮）

> 立卡：2026-11-17 ｜ 状态：已结（2026-11-17 第一轮已跑；10 张卡 209–218） ｜ 类型：Task ｜ 结论：N1–N9 全部有判定；10 张卡 209–218 全部修复归档；去向 = 批 Note；审查：agent — 红证回放 + 全量 verify/test ｜ 可关闭：是（2026-11-17）
>
> **一句话**：这两晚不是「文件换个目录」，而是**三个维护根换了名字、加了兼容账本、把重证据移出 push 门**；
> 回归仍绿，但绿的含义变了。本卡把探索靶子从「旧路径有没有更新」移到「**旧名还被谁消费、新名是否真被用、
> 证据是否还在门里**」，并给出可证伪的 charter。
>
> 前身 = [2026-11-11-exploratory-test-strategy](2026-11-11-exploratory-test-strategy.md)
> （第 0–11 轮账本 + 覆盖地图；已归档，只作「已探面」参考，不再续写）。

**问题与期望结果：** 2026-11-16 22:34–11-17 11:06 的 29 个 commit 里发生 257 次 rename：
`scripts/ → checks/`、`dev/ → tools/`、`scripts/run-ops/ → probes/analyze/`，外加 lib/tools 子组重切、
`checks/dist → checks/release`、兼容账本链式化、CI 快慢分层、一批新守卫。回归（`pnpm verify` + `pnpm test`）
全绿，但回归只能回答「旧行为有没有被改坏」，回答不了：

- 账本让旧名继续可解析时，哪条「当前步骤」已经指向空处；
- 新守卫的扫描面比它的承诺窄在哪；
- 被搬入口的文档化调用是否还能跑；
- 11 条 smoke 只在 nightly 跑之后，「绿」还剩多少信息量。

期望结果 = 每条假设被杀或留档；真缺陷进 bug 卡并落类级守卫或显式不可机械化；不把「没找到」写成「没有 bug」。

**当前情况：**

- **结构事实**：三根（`checks/` judge、`probes/` show、`tools/` operate）+ 子组；`scripts/`、`dev/`、
  `probes/run/` 只作为退役名活在 `checks/test-path-redirects.json`；测试镜像保留、合同桶不改名、结构冻结
  （[维护层对齐 Note](../../../notes/implemented/2026-11-17-maintenance-layer-alignment.md)）。
- **兼容层**：账本 append-only + 链式解析（预扫时 575 条，本次归档 +1；57 条两跳；`md-links` 实跑
  307 条链接经账本解析）；活文档不得依赖账本，账本只服务冻结层（[guides/68 §6](../../../docs/guides/68-surface-contract.md)）。
- **证据频率**：push 门 = `keyless`（verify + test，0 条 smoke）；nightly = 11 条 `tier: ci` smoke
  （client-load / snapshot-replay / deploy 的 9 条）；registry 与 `ci ∪ nightly` 双向对账已绿。
- **基线（2026-11-17 13:4x 实跑）**：`pnpm verify` 全绿；`pnpm test` spec **1366** / checks **220**（0 fail / 0 skip）；
  `pnpm build` / `pnpm typecheck` / `pnpm test:vendor` 绿。
- **预扫（E1）**：6 格闭合；第一轮发现 10 张卡（209–218），见 §执行记录。

**未决问题：**

- 预扫候选 P-1（asset-ledger 的分类表仍指旧 helper 名）的严重度与守卫落点；执行时先开卡再修。
- N8（频率账）若发现 [guides/67 §8](../../../docs/guides/67-test-strategy.md) 的「required」声明与实际（nightly）
  不一致：属契约歧义 → 用户/D54，不擅自改边。
- N3（冻结层作为指令面）若发现 load-bearing 命令，策略收口方式（只查活跃卡？按「是否被 live 文档引用为
  当前步骤」判？）留给执行时的发现决定。
- 老卡的遗留观察（`tests/tests` 空目录、`run-lane` SKIP exit 0、Y9、安装默认语言、hook/DOM、world-tree、
  真 GitHub CI）不属本轮靶子，随本卡 §覆盖地图 移交。

**下一步：** 第一轮已跑完（N1–N6 + N8/N9；N7 以既有红证关闭）；10 张卡见 §执行记录。本轮不改产品代码；
`等人拍板` 的卡等用户决定，`修复就绪` 的卡等修复 agent；覆盖地图已回填。

## 为什么换卡：场景变了

| 维度 | 第 10–11 轮（11-15 / 11-16） | 本轮（11-16 / 11-17） |
|---|---|---|
| 搬的单位 | 文件在**稳定命名空间内**换子目录 | **根名本身**换（三根重命名 + 子组 + 退役根） |
| 回归能否看见 | 引用图 / 路径字面量 / 落点门禁 | **账本把旧名变成可解析**：链接检查对冻结层天然绿 |
| 证据在哪跑 | 多数在 verify / push | **11 条 smoke 全部只在 nightly**；push 门 0 条 |
| 新守卫 | 批 E/F 的守卫已被第十一轮探索 | 又一批**未探索的新守卫**（call-surface、surface-claims、retired-root、链式 md-links、generated-artifacts、非测试模块落点） |
| 靶子 | 旧路径是否更新 | **旧名被谁消费、新名是否真被用、证据是否还在门里** |

三个后果（本轮的判据来源）：

1. **「引用可解析」不再是「行为不变」的证据。** 兼容层按目录把「冻结/活」分开，冻结层的旧名永远可解析；
   探索对象变成**兼容层本身**（数据完整性、语义身份、覆盖、策略边界），而不是把账本当安全网。
2. **「搬家不改行为」要换成「搬家不改调用」。** agent 照文档敲命令、CI 照 `run:` 跑、hook 照 shell 执行；
   这些字符串不在 import 图。新门禁只覆盖其中几种形态，要按**语法形态矩阵**证伪。
3. **「证据仍在」≠「证据仍在门里」。** 频率分层后，很多搬家件的唯一执行面是 nightly/manual；
   「未跑 ≠ 通过」要扩展到「跑了，但不在挡 commit 的门里」。

## 判据：不变量 6–8 与失败类 M9–M11

前五条搬家不变量（引用面同构 / 非引用变更仅路径 / 落点由规则决定 / 派生账重算 / 路径即合同）
仍是底座，正本与 M1–M8 见[老卡 §搬家合同](2026-11-11-exploratory-test-strategy.md)（冻结）。
本轮只加「命名空间搬家」多出来的三条：

6. **兼容只服务冻结面**：账本可解析旧名，但活面（docs/根/checks/tools/probes/tests/CI）必须直指现行路径；
   判据 = `md-links` 活面依赖账本即红 + `doc-paths` 退役根即红。
7. **调用面可执行**：命令串（围栏 / 探针头注 / CI `run:` / 表格 / 缩进块）里的路径必须存在，且按文档调用能跑；
   「能解析」≠「能执行」。
8. **频率入账**：每个被搬件的验证归属必须写明频率（verify / test / e2e / entry / nightly / manual / none）；
   搬家把件移出快门时，必须同变更更新声明；否则「证据存在」不等于「证据在门里」。

| 类 | 一句话 | 本波已知实例 |
|---|---|---|
| **M9 兼容层吸收** | 旧名可解析把「没更新」从红变成绿；账本成为事实源后，错映射无处可查 | 活/冻结按目录判；P-1 的分类表死路径被重生成吸收 |
| **M10 车道时延** | 搬家把证据从 required 移到 nightly/manual，声明与预算不跟 | push 门 0 条 smoke；11 条 `tier: ci` 全在 nightly |
| **M11 指令面/证据面错位** | 同一份冻结层既是历史证据、又被当作当前步骤读；按目录判冻结单位错了 | 活跃 bug 卡的复现步骤、当前轮 charter 的命令块 |

## 预扫（2026-11-17，E1；已闭合）

| 面 | 判据 / 证据 | 判定 |
|---|---|---|
| 基线 | `pnpm verify` 绿；`pnpm test` 1366/220；`build`/`typecheck`/`test:vendor` 绿 | 关闭（起点绿） |
| 账本覆盖 vs 本波 rename | 257 对 rename 逐对解析：200 直接命中、53 经链到最终落点（正确）、4 无条目 = 2 个 `-helpers` 改名 + 1 个配置件的两跳（该件随后被删） | 关闭（覆盖完整；缺的 4 个无 live/冻结 Markdown 链接依赖，verify 绿） |
| 账本表示能力 | 575 条（预扫时）中 basename 变化的条目 = **0** | 关闭（M8 扩展：账本无法表达「改名」与「删除」，只表达换目录） |
| 删除面 | 本波唯一删除 = `tools/build/vendor-host-typert.config.ts`；引用只剩 archived Note 的代码跨度 + gitignored runtime 脚本 | 关闭（无 live 消费者） |
| 老卡遗留的 `tests/tests` 空目录 | 盘上已不存在（11-17 清理） | 关闭（老卡观察） |
| 运营模块的路径字面量 | 排除变异语料/测试夹具后扫 `checks/lib` + `tools` + `probes`：55 条路径字面量里 2 条死路径，均在 `checks/lib/test-infra/asset-ledger.mjs`（`tests/pack/handbook-surface.mjs`、`tests/pack/template-files.mjs`） | **候选 P-1**（见下） |
| CI 频率事实 | `ci.yml` 的 `executedSmokeFiles` = 0；nightly = 11 条 `tier: ci`；`smoke-registry` / `ci-jobs` 已按 `ci ∪ nightly` 对账 | 预扫事实（N8 的输入） |

**候选 P-1（预扫已复现，执行时开卡）**：`checks/lib/test-infra/asset-ledger.mjs` 的 `CANONICAL_LIBS`
仍写旧 helper 名；盘上已是 `*-helpers.mjs`。同一 commit（266b216c）重生成账本时，
`tests/pack/contract/template-contract.spec.mjs` 的 `oracleType` 从 `canonical` 翻成 `self-referential`
——**搬家的语义副作用被生成器吸收成「当前状态」**（M4/M9 合成）。账本测试用同一张表重算，所以自洽绿。
修法方向 = 改表 + 重生成 + 类级守卫「分类/白名单表里的路径必须存在」（变异语料与测试夹具除外）。

## charter（核心 6 条，keyless，≤55 分钟；0 模型）

一条 = 一条可被证伪的命题。七件齐全；每批至少一条负对照。

| ID | 假设（要杀死的命题） | 最低层 | oracle / 变异 | 预算 | 停止 |
|---|---|---|---|---|---|
| N1 | `call-surface` 覆盖它声称的三入口（文档围栏 / CI `run:` / 探针头注）的「能执行」形态：env 前缀 / `./` / `&&` 链 / heredoc / 缩进代码块 / 表格内命令里的坏路径都会红 | 门禁 | 逐形态向 live 文档注入 `node checks/__nope__.mjs`（或等价坏路径）→ `verify --only=call-surface`；同形态补 CI/头注各一例；负对照 = 行首 `node checks/__nope__.mjs` 必红；还原后绿 | 10 min | 任一形态在坏路径下仍绿 = P2 守卫缺口 |
| N2 | 退役根名在任何**被声明为合同**的可读形态里都红：反引号（含围栏内）/散文有扩展名/表格反引号/链接文字；放行只有裸目录名、同句讨论退役、vendor/pack 同形 shorthand；无扩展名散文是已知边界，只记观察 | 门禁 + 纯函数 | 逐形态注入 `scripts/__retired__.mjs` / `dev/x` / `probes/run/x`；负对照 = `scripts/`（裸目录名）与 `vendor/dsh/scripts/AGENTS.md` 绿 | 7 min | 任一非放行形态绿 = P2（无扩展名散文除外） |
| N3 | 冻结层（`_backlog/`、`notes/`）里没有**当前会被执行**的命令；活跃卡复现步骤、当前轮 charter 命令、implemented Note 验证节都还指向现盘 | 静态 + 抽样 | 取活跃 bug/issue 卡 + 近 3 篇 implemented Note 的围栏/反引号命令，解析路径存在性；用「卡状态 = 排查中/修复就绪/推敲中」与「live 文档是否把它当当前步骤」区分历史叙述 | 8 min | 一条「当前步骤」路径不存在且照做会失败 = M11 实例（观察或 P2，看是否 load-bearing） |
| N4 | 第二波（lib 子组 + `checks/release` + tools 子组 + 删配置）之后，每个被搬入口的**文档化只读调用**仍可执行（no-arg 已验不算） | 入口（副作用白名单） | 矩阵：`bootstrap.sh --check`、`render-test-index --check`、`render-overlay --check`、`market --check`、`export-handoff --out /tmp/…`、`runtime-clean`（dry-run）、`run-inventory --workspace`、`acceptance-check` / `run-accept` 无参（应 2）、`release-check`；判据 = exit 码符合脚本声明（0/1/2）+ 输出无 `MODULE_NOT_FOUND` / `ENOENT` / 路径错误 + 副作用只落 tmp / gitignored runtime（bootstrap 的隔离 home 与 hooks 配置属预期）；负对照 = 把一条指向不存在路径应立刻失败 | 14 min | 一个文档化调用出现路径类失败或写仓外仓内 = P1/P2 |
| N5 | 每个派生账/生成物以现盘为输入；删/改名一个输入会让账红，而不是被重生成吸收 | 生成器 + 纯函数（tmp 输出） | 对 asset-ledger / guard-ledger / test-index / probes 索引 / registry / overlay / `_dist` 手册逐个重算到 tmp 并与盘上比；注入一条 stale 条目看谁吸收；检查分类/白名单表的每个路径存在（收口 P-1） | 10 min | 生成器吸收不存在输入，或分类表含死路径 = M4/M9 实例 |
| N6 | 257 个被搬文件里，任何「按自身位置算根」的常量都指向仓根（重点 = 改变深度的 `tools/* → tools/<sub>/*` 17 件；其余 240 件同深度兜底） | 纯静态（AST/正则） | 枚举 `import.meta.url`+`..`、`BASH_SOURCE`+`/..`、`process.cwd()` 假设，打印解析结果 vs 仓根；负对照 = 人为改深一层应报错 | 7 min | 一个常量解析到非根目录且被当根用 = M2 实例 |

**加时 3 条**（只在核心提前收口时按剩余预算选跑，总墙钟仍 ≤60 min）：

| ID | 假设 | 最低层 | oracle / 变异 | 预算 | 停止 |
|---|---|---|---|---|---|
| N7 | 账本坏形态全部 fail-loud：重复 from / 环 / 过深 / from 在盘 / final 不存在 / final 未 tracked / to 是目录 / to 空串；活面依赖账本必红；冻结层链式解析到最终落点 | 纯函数 + 门禁（临时副本 + 还原） | 逐形注入账本副本，`--only=md-links`；负对照 = 合法链绿 | 6 min | 一个坏形态绿 = P2 |
| N8 | 频率声明与执行面一致：guides/67 §8 的 required/slow、registry `tier: ci`、D54 预算 vs `ci ∪ nightly`；没有「声明 required 但只在 nightly / 从不跑」的件 | 静态 | `executedSmokeFiles(ci)` / `(nightly)` × registry × 预算 × 文档声明对账；特别看 11 条 `tier: ci` 在 push 门的占比 | 6 min | 声明与执行面不一致 → 契约歧义（用户/D54）或文档漂移（owner） |
| N9 | 三个门户 README 之外的面声明（AGENTS 布局、project-map、guides/68 §5 例外表）与盘上件一致，尤其本波新件（tools 子组、checks/release、probes/analyze、env.sh、overlay） | 静态 + 纯函数 | 抽取面词/路径 vs 盘上枚举；例外表覆盖每个面例外件，无遗漏/错面 | 6 min | 一处矛盾且无理由 → 观察/文档 owner |

**证据落点**：一次性脚本与输出落 `runtime/exploratory-20261117/`（gitignored）；升格后落
`tests/checks/*.test.mjs`（门禁/表类）或 `tests/**/*.spec.mjs`（纯函数类）；本卡只记判定与链接。
**负对照**：N1 行首坏路径必红；N2 裸目录名必绿；N4 坏路径调用必失败；N7 合法链必绿。

## 执行记录（2026-11-17，keyless，0 模型）

**charter 判定**（七件→四态；证据落 `runtime/exploratory-20261117/`）：

| ID | 判定 | 证据 / 卡 |
|---|---|---|
| N1 | 已探 → 发现 | call-surface 7 形态漏 → [BUG-210](../fixed_bugs/BUG-210-call-surface-line-start-command-forms.md) |
| N2 | 已探 → 发现 | 散文/表格/围栏/HTML 退役根漏 → [BUG-211](../fixed_bugs/BUG-211-doc-paths-prose-fence-retired-roots.md) |
| N3 | 已探 → 发现 | 活方法文档整树豁免、旧命令 → [BUG-212](../fixed_bugs/BUG-212-live-methods-excluded-retired-roots.md) |
| N4 | 已探 → 发现 | 入口矩阵全绿；usage exit 不一致 → [BUG-213](../fixed_bugs/BUG-213-usage-exit-code-inconsistent.md) |
| N5 | 已探 → 发现 | 派生账无漂移；分类表死路径 → [BUG-209](../fixed_bugs/BUG-209-asset-ledger-canonical-libs-stale-helper-names.md) |
| N6 | 关闭（无发现） | 74 个 ROOT 常量、0 偏差（全树） |
| N7 | 关闭（既有红证） | `redirect-ledger.test` 4 单测 + `md-links` stale/dangling/live-ledger/cycle 案例；未新增 mutation |
| N8 | 已探 → 发现 | `tier: ci` = nightly，预算/docs 两义 → [BUG-215](../fixed_bugs/BUG-215-ci-tier-nightly-required-semantics.md)；成本计数 → [BUG-214](../fixed_bugs/BUG-214-cost-baseline-108-stale-count-free-vocabulary.md)；全 SKIP 退出码 → [BUG-218](../fixed_bugs/BUG-218-run-lane-all-skip-exit-zero.md) |
| N9 | 已探 → 发现 | 面表/例外覆盖完整；108 案例计数漂移 → [BUG-214](../fixed_bugs/BUG-214-cost-baseline-108-stale-count-free-vocabulary.md)；`test-placement` TS 盲 → [BUG-216](../fixed_bugs/BUG-216-test-placement-support-module-ts-blind.md) |

**本批 10 张卡（209–218）**：

| 卡 | 严重级 | 状态 | 一句话 |
|---|---|---|---|
| [209](../fixed_bugs/BUG-209-asset-ledger-canonical-libs-stale-helper-names.md) | P2 | 修复就绪 | asset-ledger 分类表旧 helper 名 → oracleType 翻转 |
| [210](../fixed_bugs/BUG-210-call-surface-line-start-command-forms.md) | P2 | 等人拍板 | call-surface 只认行首命令词（7 形态） |
| [211](../fixed_bugs/BUG-211-doc-paths-prose-fence-retired-roots.md) | P2 | 等人拍板 | doc-paths 散文/表格/围栏/HTML 面不认退役根 |
| [212](../fixed_bugs/BUG-212-live-methods-excluded-retired-roots.md) | P2 | 等人拍板 | 活方法文档整树豁免，旧命令仍在 |
| [213](../fixed_bugs/BUG-213-usage-exit-code-inconsistent.md) | P2 | 修复就绪 | run-dashboard / run-kickoff usage exit 1（应 2） |
| [214](../fixed_bugs/BUG-214-cost-baseline-108-stale-count-free-vocabulary.md) | P2 | 修复就绪 | 成本基线 108（实际 142）；count-free 不含「案例」 |
| [215](../fixed_bugs/BUG-215-ci-tier-nightly-required-semantics.md) | P2 | 修复就绪 | tier:ci = nightly，预算/docs 仍称 required（已拍板拆 tier） |
| [216](../fixed_bugs/BUG-216-test-placement-support-module-ts-blind.md) | P2 | 修复就绪 | test-placement 非测试模块不认 .ts/.tsx/.js |
| [217](../fixed_bugs/BUG-217-run-lane-no-match-lacks-all-hint.md) | P2 | 修复就绪 | run-lane 无匹配不点 --all；guides/67 漏 --all |
| [218](../fixed_bugs/BUG-218-run-lane-all-skip-exit-zero.md) | P2 | 修复就绪 | run-lane 全 SKIP 仍 exit 0（已拍板全 SKIP=2） |

**已跑的装配/入口基线**（全部绿，作为「不是搬家把大面打红」的负对照）：
`pnpm verify` 全绿；`pnpm test` spec 1366 / checks 220；`pnpm build` / `typecheck` / `test:vendor` 绿；
`gates.e2e` 142 案例全绿（含对照组）；`preset.e2e` 真挂载 5 角色 + 2 worker ALL PASS；
`lifecycle.entry` / `handoff.e2e` / `pack.e2e` / `run-accept.e2e` / `method-library-tool.e2e` /
`model-experience.e2e` 全绿；`cold-start.entry` 在 `source tools/env.sh` 后 GREEN。

**未开卡的观察**：
- `preset.e2e` 默认（无 `DSH_SMOKE_REAL=1`）只跑 keyless 预检并 exit 0；真挂载档由 nightly 设置。
  文档已写明，不算假绿，但本地 `pnpm test:e2e --only preset` 的 PASS 不等于 L1 真挂载。
- `cold-start.entry` 需要先 `source tools/env.sh`；`pnpm test:entry` 不自动 source，缺 env 时按 exit 1
  而非 2（前置检查依赖 `DSH_HOME`；本会话环境有值时才会进入真跑）。属入口前置契约的邻接，未开卡。
- `md-anchors` 不认 `#L45` 这类行锚（本批卡曾因此把真仓判红，已改回普通链接）；门禁语义正确，无发现。
- 门户 README / 生成物头 / ROOT 常量 / 派生账均无旧根残留（`checks/README`、`probes/README`、
  `tools/README`、`tests/INDEX.generated.md`、`probes/INDEX.generated.md`、`overlay` 逐件看过）。

## 批修复（2026-11-17 用户放行；批 Note 待收口）

用户 2026-11-17 放行全部 7 张 `等人拍板` 卡，并拍板 4 个契约选择；10 张卡同批修完再写一篇批 Note
（[bugs/README §批修复](../../bugs/README.md)），每卡仍有自己的 `fix-evidence`。

| 决定 | 选定 | 卡 |
|---|---|---|
| CI 频率语义 | 拆 tier：`ci` = push/required，新增 `nightly`；预算分列两 cap | 215 |
| 全 SKIP 退出码 | exit 2（PASS+SKIP 混合仍 0，有 FAIL 仍 1） | 218 |
| 非测试模块闭集 | 扩到 `.ts/.tsx/.js`（`-helpers.<ext>`）；`tests/` 下未知扩展名兜底红 | 216 |
| 围栏路径清单 | 纳入 `doc-paths`（命令仍归 `call-surface`） | 211 |

**实施顺序**（内容先归位，再开宽门禁；契约选择隔离到最后）：

1. **P1 出口契约 + 自授权三张**：新建 `checks/lib/shared/cli-exit.mjs`（0/1/2 + `usageError()`）；
   209 修分类表并重生成 + 身份表存在性守卫；213 两入口 usage=2；217 错误信息补 `--all`。
2. **P2 内容归位**：`_backlog/methods/*.md` 与 `triggers.md` 的 15 处旧根改现行根。
3. **P3 文档面归一器（核心）**：新建 `checks/lib/repo/doc-surface.mjs`（唯一形态枚举器：反引号/
   散文/表格/围栏/HTML href/链接标签/缩进块/heredoc/YAML 折叠块 + 命令归一：env 前缀、`./`、
   sudo/env/time、`&&` 链）+ 形态台账（每形态 = 在合同内带 gates.e2e 案例 id，或不在合同带理由）；
   `call-surface` / `doc-paths` / `count-free` 改为消费它；扫面纳入 `_backlog/methods/*.md` +
   `triggers.md`；count-free 词表扩容（案例）+ 计数指正本。覆盖 210/211/212(结构)/214。
4. **P4**：`test-placement` 角色闭集（216）。
5. **P5**：registry `tier` 拆 `ci`/`nightly` + 预算分列 + workflows 对账 + guides/67 + D54 行（215）。
6. **P6**：`run-lane` 三态退出码（218）。
7. **P7**：批 Note、十卡归档、索引/台账、全量验收、语义自审。

**收口（2026-11-17）**：10 张卡全部 `已修` 并归档到 [fixed 池](../fixed_bugs/README.md)；批 Note =
[2026-11-17-namespace-move-residual-fixes](../../../notes/implemented/2026-11-17-namespace-move-residual-fixes.md)。
失败类守卫落点：M9（兼容层吸收）→ 身份表路径存在性（asset-ledger）+ 形态台账；
M10（车道时延）→ tier 频率拆分 + 双向对账 + 全 SKIP=2；
M11（指令面/证据面错位）→ 活指令面纳入扫描 + 方法文档归位。
`pnpm verify` / `pnpm test` / `gates.e2e` 全量绿；每卡红证回放记录在卡内 `fix-evidence`。

每张门禁卡的红证 = 先注入旧形态看红（`gates.e2e` 或单测），绿证 = 同一命令 exit 0；门禁改动同 diff
更新 `docs/evaluation.md` 与 `tests/checks/verify-gates.test.mjs` 的静态对账。

## 已知与未决

- **已知**：第一轮已跑（N1–N6 + N8/N9；N7 以既有红证关闭）；10 张卡 209–218；`pnpm verify` / `pnpm test` 绿；
  老卡 0–11 轮与覆盖地图已归档，不重开。
- **未决**：10 张卡全部 `修复就绪`（用户 2026-11-17 放行其余 7 张并拍板 4 个契约选择），按 §批修复
  的 P1–P7 顺序推进；P-1 的身份表存在性守卫与 214 的 count-free 词表已在批内。
- **不证**：「账本绿」不证「旧名没人用」；「nightly 绿」不证「push 安全」；「守卫存在」不证「守卫有效」；
  「没找到」不写「没有 bug」。

## 验收标准

1. N1–N6 全跑或逐项写「未跑 + 原因」；每条有七件与四态判定（发现 / 关闭 / 观察 / 歧义）。
2. P-1 开卡（P1/P2/P3 按证据）并带红证；可机械化的一类落类级守卫或写明不升格理由。
3. `pnpm verify` + `pnpm test` 绿；本轮不改产品代码（守卫/测试按 bugs 通道或用户指示）。
4. 覆盖地图更新；发现全部有去向；不把「没找到」写成「没有 bug」。

## 关闭条件

- 核心 6 条全跑或逐项写明未跑；加时按预算取舍并记录；证据可复读（runtime 路径 + 命令）。
- 发现的去向成立（bug 卡 / 观察 owner / 用户歧义 / 空假设）；失败类 M9–M11 有守卫或无机械化的理由。
- 审查记录 `审查：agent｜用户｜跳过 — 理由`；归档与去向载体同变更（本卡为账本，若下一轮另立卡则本卡归档）。

## 范围与排除

**范围**：本波 29 个 commit 的 rename / 删除 / CI 分层 / 新守卫；三根与子组；账本链式化；既有 verify/test 与
gates.e2e 案例；可复用 `checks/lib/**`、`checks/smoke/*`、`probes/analyze/*`、车道 runner。

**排除**：重跑老卡 0–11 轮已闭面；L4 全量；真模型（Y9）与真浏览器（nightly 面）——分别授权；
改产品代码；为让门禁变绿而重生成账本（吸收不是修）；改写冻结层正文；把探索写成固定回归清单。

## 覆盖地图（滚动）

> 状态：已探（有判定）/ 已关闭（无发现）/ 未跑（写明原因）/ 待跑（本轮 charter）。空白 ≠ 缺口。

### 本轮预扫（2026-11-17）

| 面 | 状态 | 判定 |
|---|---|---|
| 基线（verify / test / build / typecheck / vendor） | 已关闭 | 全绿（1366 / 220） |
| 账本覆盖 vs 本波 rename | 已关闭 | 257 对：200 直接、53 链到最终、4 无法表示；无 live/冻结链接依赖 |
| 账本表示能力 | 已关闭 | 575 条 basename 变化 = 0；只表达换目录，不表达改名/删除 |
| 删除面 | 已关闭 | 唯一删除件无 live 消费者 |
| 运营模块路径字面量 | 已探 → 候选 | 2 条死路径（asset-ledger 分类表）→ P-1 |
| CI 频率 | 预扫事实 | push 0 条 smoke；11 条 `tier: ci` 只在 nightly（N8 输入） |

### 本轮已跑（charter 结果）

| ID | 面 | 状态 |
|---|---|---|
| N1 | call-surface 命令形态 | 已探 → [BUG-210](../fixed_bugs/BUG-210-call-surface-line-start-command-forms.md) |
| N2 | doc-paths 退役名形态 | 已探 → [BUG-211](../fixed_bugs/BUG-211-doc-paths-prose-fence-retired-roots.md) |
| N3 | 冻结层作为指令面 | 已探 → [BUG-212](../fixed_bugs/BUG-212-live-methods-excluded-retired-roots.md) |
| N4 | 被搬入口的文档化调用 | 已探 → [BUG-213](../fixed_bugs/BUG-213-usage-exit-code-inconsistent.md)（矩阵本身全绿） |
| N5 | 派生账重算与吸收（含 P-1） | 已探 → [BUG-209](../fixed_bugs/BUG-209-asset-ledger-canonical-libs-stale-helper-names.md)；其余无漂移 |
| N6 | 深度常量 | 已关闭（74 常量 0 偏差） |
| N7 | 账本负控 | 已关闭（既有 4 单测 + 4 案例） |
| N8 | 频率账/成本账 | 已探 → [BUG-215](../fixed_bugs/BUG-215-ci-tier-nightly-required-semantics.md) + [BUG-214](../fixed_bugs/BUG-214-cost-baseline-108-stale-count-free-vocabulary.md) |
| N9 | 面声明/成本计数 | 已探 → [BUG-214](../fixed_bugs/BUG-214-cost-baseline-108-stale-count-free-vocabulary.md) + [BUG-216](../fixed_bugs/BUG-216-test-placement-support-module-ts-blind.md) |

### 移交观察（来自老卡，非本轮靶子）

| 观察 | owner / 状态 |
|---|---|
| `tests/tests` 空目录 | 已消失（11-17 清理）；关闭 |
| `smoke-child-paths` 的 `resolve(ROOT)` / 模板 / 变量段 | 与 `call-surface` 同边界；N1 邻接 |
| `run-lane` 全 SKIP exit 0 | 旧观察；契约歧义 |
| Y9 真模型 worker 行为 | 未授权；单独预算 |
| 安装域默认语言 / hook-DOM / world-tree | 空白；未冒充已验 |
| 真实 GitHub CI / model-smoke | 老卡记未跑；本轮不复核（11-17 提交称 runner 红根因已修并实证） |
| claim 路径只查存在性、不查 tracked | 无 live 实例；M8 邻接 |

## 判据形状

不适用（本卡不改产品判据；探索判据 = 每条 charter 的 oracle，正本 = [guides/67](../../../docs/guides/67-test-strategy.md)
+ [技能](../../../.agents/skills/exploratory-verification/SKILL.md)）。
