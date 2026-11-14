---
status: 已结
opened: 2026-11-14
---

# 推敲：验证层换 oracle + 每个修复沉淀守卫——从「制度齐全」到「证据可对账」

> 立卡：2026-11-14 ｜ 状态：已结 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：是
>
> **一句话**：D54 把测试制度建起来了，但改善没有体感——31 张新卡里 22 张落在验证层自身，
> 修复仍在补启发式；同时旧账 41 张里 22 张没有带号的永久测试，补没补没人能对账。下一台阶不是再加一层
> 矩阵，而是**换 oracle**（结构化 / 真实工具录制 / 规范形）**+ 给每个修复沉淀永久守卫或显式豁免**；
> 停止条件 = 同一探索协议在声明面上找不到新邻接变体。
>
> 证据 = [research/verification-oracle](../research/verification-oracle/README.md)；
> 计划 Note = [Note](../../../notes/implemented/2026-11-14-verification-oracle.md)。
>
> 结论：S1 24 张全部沉淀；S2 换 oracle（Markdown 36 / CI 29 / fix-evidence 结构化 + guard）；
> S3 双账（守卫 31、资产 208，194 自指显式）；S4 声明面 0 新邻接变体；verify/test/typecheck 全绿。
> 去向：implemented — [Note](../../../notes/implemented/2026-11-14-verification-oracle.md)
> 授权：用户 2026-11-14 直派「推动落地 + 加码」；审查：机械门禁全跑 + 语义自审逐条对验收。
> 证据 = [research/verification-oracle](../research/verification-oracle/README.md)

## 落地记录（2026-11-14）

- **S1**：普查 D-1 的 24 张全部有永久 keyless 守卫或 source 形状 + 重录触发；守卫账
  `guard-ledger` 31 项（closed 29 / partial 2，自指 0）。新增守卫：captureReadyOf、state-note、
  VM 隔离预载、boot timer、probe 端口、smoke 标识符/死 import、client-load 同源等。
- **S2**：Markdown 录制 oracle 36/36（mdast；note-scan + readiness 同判）；CI 录制 oracle 29/29
  （真 YAML + 真 bash + 失败 stub）；fix-evidence 结构化块（exit 为 oracle、重复键 fail-closed、
  guard 必填）；note 状态行规范形（note-format + gates.e2e 红案）。
- **S3**：guard-ledger（oracleType/status/redRecipe）+ asset-ledger（208 个 spec/check；显式 14 /
  self-referential 194 显式可见）；新卡缺 guard → 红，路径不在场 → 红。
- **S4**：换 oracle 后复扫声明面 0 新邻接变体；5 个真分歧（子 shell、列表 fence、跨行注释、
  绝对路径、重复键）全部先红后绿（探索卡第 10 轮）。
- **证据**：`pnpm verify` / `pnpm test` / `pnpm typecheck` 全绿；e2e/entry 基线见 Note；D55 入台账。

**问题与期望结果：** 2026-11-14 在 HEAD `85b7026f` 复算：

- **层转移**：BUG-160..190 共 31 张，按 `## 修复落地` 路径分层 = **22 张验证层**（ci-workflow /
  note-scan / smoke-registry / fix-evidence / staged-pairing / model-workflow / artifact-freshness）、
  5 张产品、4 张未提取到路径（按根因仍属 readiness/present）。失败类与产品期同族：C7 14、C8 7、
  C2 3、C4 3、C3 2、C9 2。
- **自指 oracle**：批次 D 的三个修复仍是启发式（`isKnownFailure` 正则、`NEGATION` 只看紧邻、
  fence-first 行扫描）；相邻变体实测仍漏：子 shell 不计执行、`并不存在失败` 当红证、
  引号日志当证据、`<strong>状态</strong>` 不认。`markdown-mask-conformance` 的 oracle 是
  “两份实现一致”，不是 CommonMark。
- **D54 交付/未交付**：交付偏制度可见性（D53 车道、registry、成本 ratchet、guide 67、技能、普查、
  若干矩阵）；未交付偏证据强度（W2-3 消费者全矩阵、W2-6/7 全族假绿 oracle/变异、W0-6 hook/DOM、
  `test:e2e`/`test:entry` 全量基线）。**上一轮把“能写下来的”做完了，把“能证明的”留着了。**
- **旧账**：普查 §D 的 41 张（D-1 24 无永久 keyless 守卫 + D-2 17 未入账/只在贵层）；按“测试文本含
  BUG-号”复算，D-1 里 22 张仍无带号测试，但其中至少 4 张已有同名测试——**真正的问题是资产账只覆盖
  27 条 smoke，194 个 spec/check 没有 uniqueClaim/class/oracleType/sunset，补没补无法对账。**

期望：① 每个已修 bug 有永久 keyless 守卫，或显式「不可机械化 + 理由 + 触发条件」；② 验证层每个
parser 有独立 oracle（structured / external / canonical），`self-referential` 只算临时；③ 资产账覆盖
spec/check，能一眼回答“这张 bug 有没有守卫”；④ 重跑探索在声明面上 0 新邻接变体。

**当前情况：** `pnpm verify` / `pnpm test` 绿（批次 D 已由另一 agent 修完归档）；
`tests/contracts/markdown-mask-conformance.spec.mjs` 与 `tests/checks/ci-workflow.test.mjs` 的
fixture 均为手写；`scripts/lib/{ci-workflow,note-scan,fix-evidence}.mjs` 均为行/正则扫描；
`scripts/smoke/registry.json` 27 条只覆盖 smoke；普查 §D-1 的 24 张未逐张复核当前守卫状态。

**未决问题：**

- **录制式 external oracle 是否接受**：不引运行时依赖，dev 端用真实 Markdown 解析器 / GitHub Actions
  跑一次，把“可见行/执行集”录成仓内夹具；手写 parser 与夹具对账。这是 S2 的前提。
- **S1 与 S2 的顺序**：S1（24 张沉淀）有限、可审计，直接回应“没体感”；S2 是发生器。建议先 S1 +
  S2c（fix-evidence 结构化），再 S2a/S2b。
- **D55 还是扩 D54**：本卡触测试制度与验收合同，落地时登记 D55（不扩 D54，避免一条决定混两代）。

## 方案与取舍

| 方案 | 做法 | 判定 |
|---|---|---|
| **A 换 oracle + 沉淀** | S1 逐张沉淀；S2 结构化/录制/规范形；S3 资产账 + 关卡门；S4 重跑探索做停止条件 | **选**：直接改发生器与旧账，可量化 |
| B 再加矩阵 | 按 31 张继续补维度矩阵 | 不选：矩阵维度仍由同一个心智模型选；自指 oracle 不变 |
| C 全部换真解析器 | 引入 YAML/CommonMark/shell 运行时依赖 | 不选：违背“不引运行时依赖”；录制式 oracle 已够 |
| D 逐 bug 补例子 | 每张卡补一条测试 | 不选：实例修，22 张 D-1 已证明会复发 |
| E 只写资产账 | 把 194 个 spec/check 登记完 | 不选：账本只让缺口可见，不关缺口 |

**输掉的细节**：覆盖率百分比门禁（高覆盖仍可全 happy path）；把 `self-referential` 守卫当“已关闭”；
用“账本写完”当停止条件；为 41 张旧账逐张写长文（先给守卫或一句理由）。

## 分片

- **S1 沉淀旧账（有限、先做）**：逐张复核普查 D-1 的 24 张（其中 4 张已有同名测试，补号即可）；
  每张落一个永久 keyless 守卫，或写「不可机械化 + 理由 + 触发条件」。产物 = 一张 24 行对账表
  （卡 / 现状 / 守卫或理由 / 证据路径）。
- **S2 换 oracle**：
  - **S2c fix-evidence 结构化**（先做，收益最高）：`## 修复落地` 增机器字段（frontmatter/JSON）：
    `changes` + `red {command, exit, output}` + `green {command, exit}`；门禁读字段，删掉否定/引号/
    目录前缀启发式；旧卡 grandfather。
  - **S2a Markdown**：dev 端用真实 CommonMark 解析器录制“可见行”语料（含探索发现的容器/注释/
    装饰边界），`markdown-mask-conformance` 对录制 oracle；两份实现一致只作附加断言。
  - **S2b CI**：dev 端录制真实 Actions（或 runner/actionlint 派生）的“执行集”语料；
    `ci-workflow` 对录制 oracle；`run` 只许规范 `node <file>` 行，写入侧校验。
  - **S2d note-scan**：状态行只许规范形；`note-format` 在写入侧拒非规范形；mask 只做结构剥离。
- **S3 账本与关卡门**：
  - 资产账扩到 spec/check：`uniqueClaim / class / cost / oracleType / sunset`；
    `oracleType ∈ structured | external | canonical | self-referential`。
  - **Bug 关卡门**：`## 修复落地` 必须有 `永久守卫：<path>` 或 `不可机械化：<理由 + 触发条件>`；
    缺 = 红（机械面 = fix-evidence / staged-change-pairing）。
  - 退役/合并：重复 parser（note-scan vs readiness mask、ci `on:` 第二份、fix-evidence 启发式）；
    慢资产按 uniqueClaim 降级。
- **S4 体感验收**：重跑探索 E1–E6（只打声明面）；目标 = 0 新邻接变体；有发现必须归因到“哪个面
  还没换 oracle”。记录“验证层新 bug / 10 commits”前后对比。

## 验收标准

| # | 行为 | 类 | 判据 | 证据 owner |
|---|---|---|---|---|
| 1 | 24 张 D-1 每张有守卫或理由 | 确定性逻辑 | 24 行对账表 0 空白；守卫路径存在且在 `pnpm test` 中执行；理由含触发条件 | 对账表 + `md-links`/test-surface |
| 2 | 修复卡必须沉淀 | 确定性逻辑 | 新卡缺 `永久守卫`/`不可机械化` → 红；旧卡 grandfather | fix-evidence + staged-change-pairing 测试 |
| 3 | fix-evidence 读结构化字段 | 确定性逻辑 | frontmatter/JSON 字段驱动；否定/引号/目录前缀启发式删除；旧卡兼容 | `tests/checks/fix-evidence.test.mjs` |
| 4 | Markdown 对真实 oracle | 确定性逻辑 | 录制夹具存在；mask 与夹具逐行一致；新增边界案例能红 | `markdown-mask-conformance.spec.mjs` |
| 5 | CI 对真实执行集 | 确定性逻辑 | 录制夹具存在；`executedSmokeFiles` 与夹具一致；`run` 规范形校验 | `ci-workflow.test.mjs` + 生产者门 |
| 6 | 资产账覆盖 spec/check | 确定性逻辑 | 每项有 uniqueClaim/class/oracleType/sunset；`self-referential` 计数可见 | `tests/checks/asset-ledger.test.mjs` |
| 7 | 体感验收 | 编排 | 重跑探索：声明面 0 新邻接变体，或每个发现归因到未换 oracle 的面 | 探索卡新轮记录 |
| 8 | 全量证据 | 编排 | verify/test/typecheck 绿；`test:e2e --all` / `test:entry` 基线一次并记成本 | 提交 + 成本记录 |

## 判据形状

- **权威事实**：录制 oracle 夹具（external）、卡片/测试的结构化字段（structured）、规范形
  （canonical）、资产账条目；散文只作人读副本。
- **读取方**：`fix-evidence`、`staged-change-pairing`、`markdown-mask-conformance`、`ci-workflow`、
  资产账门禁、探索卡。
- **坏输入**：缺 oracle / 缺守卫 / 缺理由 → 红；`self-referential` 只标临时；旧卡 grandfather；
  录制夹具缺席 → 显式“未覆盖”，不静默绿。
- **旧形态**：无（新规则；旧卡/旧 parser 按 grandfather 与迁移条件退场）。
- **反证**：每面一个必须红的输入（子 shell、`并不存在失败`、`<strong>状态</strong>`、目录前缀），
  以及录制 oracle 的分歧例。

## 排除项

- 不引运行时依赖（录制式 oracle 只在 dev 端录制，夹具入库）。
- 不重写全部 parser；只收口四个面（Markdown / CI / fix-evidence / note-scan）。
- 不逐 bug 补例子；不做覆盖率百分比门禁；不把 `self-referential` 当关闭。

## 关闭条件

- S1–S3 全部落地，S4 重跑探索有记录（0 新邻接变体或逐项归因）；D55 入台账；
- Note 与卡同变更；用户验收（测试制度/验收合同 = 触面）；
- verify/test/typecheck 绿；e2e/entry 基线记录；卡归档同变更。

## 与 D54 的区别

D54 回答「这次改动配什么证据、算不算够」，交付的是**制度可见性**（车道/账本/指南/技能）；
本卡回答「证据的 oracle 是否独立、旧账是否沉淀」，交付的是**证据强度**（外部/结构化 oracle、
守卫对账、停止条件）。D54 Note 里的“未证明”清单，就是本卡的验收来源；不是再建一层流程。
