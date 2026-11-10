---
status: 待落地
opened: 2026-11-10
---

# 落地：claim 级独立复核——typed verdict + 机械覆盖门

> 立卡：2026-11-10 ｜ 状态：待落地 ｜ 类型：Feature ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> 去向：implemented — 交付时写 `notes/implemented/2026-11-10-claim-verdict-quality-loop.md`（理由/备选/试点证据进 Note，docs 只写 now）
>
> **研究依据**：[quality-loop 题名页](../_archived/research/quality-loop/README.md) → [verdict-contract](../_archived/research/quality-loop/2026-11-10-verdict-contract.md)（契约、机械门清单、备选裁决表、试点、重议条件）
>
> **开工授权**：用户 2026-11-10「推动落地」= 授权开工（`待落地` 本身不是授权）；改动面含 **pack 公共行为**，
> 按审阅分层在阶段边界请人：P1 模型可见面之前一次、P4 真 run 一次、交付验收一次。
>
> **基座同步（2026-11-10 落地前核对，commit `85a4f1b` 后）**：
> ① lens 层已落（D43）——`review.md` 终局块已承载 `topic × lens` 覆盖表，本卡的 claim 覆盖必须是**另一块**，
> 不复用那张表（证据面覆盖 vs 结论覆盖）；D43 明写「v1 不加机械覆盖门」，本卡的门只证**闭集**（`claims.json`
> 表内逐条有裁决），不证开放集（topic × lens 的语义完整性），边界写进 D44 与 Note。
> ② `content/manual.md` 有 12,288 字符预算，当前 **12,187（余 101）**——**已定（2026-11-10 用户拍板）**：
   不抬 cap，做一次**下放**——`plan.md` 条目 626 字符里的 W 语法/节点列/lifecycle 三处重复（正本已在
   `templates/run/plan.md` 与 `research-planning` skill）压到 ~150 字符，腾出 ~476；再加 claim 两行 +
   完成判据一行（~200）。落点 ~11,911（余 ~377）。准入规则写进 `content-shape` 门禁注释。
> ③ D43 已占号 → 本卡交付登记 **D44**。
> ④ 基线：`pnpm verify` 全绿、`pnpm test` 1054 绿；工作树另有 21 个归档指针卫生改动（非本轮，不并入提交）。

**问题与期望结果：** 现在 critic 的交付判据是一段 prose（`review.md` 的 `readiness: PASS`），
颗粒度是整篇：一条 CRITICAL 与十条 MINOR 得到同一个「FAIL」，机器读不出「哪条关键结论被谁核过、核成什么」，
交付后改 review 也无人知。期望：把验证做成**claim 级、typed、可机检**——每条关键结论有独立上下文里的一纸裁决，
覆盖缺口永远显形，且「裁决原文没被改」由门禁复算，不靠任何人保证。

**当前情况（事实与锚点，逐条核过）：**

- critic 是独立会话（`agent_preset: critic` 可钉）且有 fs 写；它逐条重抓 URL、独占终局 PASS。
  但「只读」只是任务形状，「claim 级」根本不存在——全仓只有「claim 句」这个读法（`content/manual.md` §按意图读）。
- **Lead 没有 bash**（工具面 = fs / fs-search / web / skill / todo / ask-user / goal / present / subagent /
  session-query）→ 哈希不能让模型算；**`subagent` 工具不暴露 `outputSchema`**（工具参数只有
  `description / prompt / agent_preset`，见 `vendor/dsh/packages/subagent/tool-subagent/src/index.ts:236-260`）
  → typed 输出只能靠 prompt。**`subagent` 也不等结果**（返回 `started subagent <childId>`，最终答案走
  completion notice，见 `vendor/dsh/packages/subagent/tool-subagent/README.md:59,100,227`）→ 裁决是跨轮落盘。
- dev home 的 116 个会话日志里 `session` / `assistant/message` / `tool/call` / `turn/end` 四类原子齐备，
  但**没有一场真实 child 会话**（scout/analyst/critic 各有 14 场，全是 depth 0 探针）——「child 头带
  `delegationDepth≥1` + `parentSession`」目前只有 vendor 契约与测试为证，试点要顺带补这条现场证据。
- 同类实现已在 company 仓跑通（两次真模型 E2E）：结构、裁决头、只读验证者、审计七件、先产后验的机械判据都可搬，
  五条实测教训已并入契约 §3；本仓不复用它的「方法包 + check-id」单元（那是绑方法层的形状）。

## 方案（四件工件 + 一道门 + 三处内容面）

工件（全部在 bundle 内，形状 = 契约 §4.1）：

1. `review/claims.json` — Lead 写：`{id, text, critical, topics, evidence[], urls[]}`；`text` 必须是
   `final/v<finalRef>.md` 里的原句（去 `[来源:]` 标记后逐字）。
2. `review/verdicts-r<N>.json` — Lead 写：`batches[]`（`session / preset / depth / raw`）+ `verdicts[]`
   （`claim_id / batch / verdict / quote / reason / rechecked_urls / source_tier_ok`）。`raw` = child 最终正文原文。
3. `review.md` — critic（团队态）写：终局 readiness + 覆盖表 + 跨条冲突；只引用最新 `rN`，不机读。
4. `review/verdict-audit-r<N>.md` — 门禁 `--write` 落：代码/级别/证据行 + 「不核什么」页脚。

门禁：`scripts/run-gates/verdict-audit.mjs`（CLI 壳）+ `scripts/lib/verdict-audit-core.mjs`（纯判据，
tests 直调，分层同 evidence-audit / node-gate）；检查 = 契约 §5 全表；默认只读，`--write` 才落盘；
接 `scripts/run-ops/run-accept.mjs` 预检第三道门；旧 bundle（无 `run.md` 或契约日期前）与 quick_factual 豁免。

内容面：`content/manual.md` 新增「独立复核与裁决留痕」一节（值域 / PASS 规则 / 轮次 / HITL2 三行数字 /
不核边界）+ `content/templates/run/claims.json` 与 `verdicts.json` 模板；critic 新增
`presets/critic/skills/claim-verdict/SKILL.md` + persona 一条排斥句（claim 模式不写 review.md）；
lead persona ≤3 句 + `team-assembly` 表一行。

## 落地计划（六段；每段一个可独立提交的窄片）

路由依据 = [guides/60 §2 任务型路由表](../../docs/guides/60-dev-loop.md)：本卡叠加三行——「改 run 审计门」
（L0 + `tests/run` 契约）、「改 persona / skill / 手册文本」（`render-overlay` → L1 → snapshot-replay B →
重启 run 通道；L0 + L1 + L4-lite）、「改 `scripts/lib` 支撑模块」（消费方复跑 + 契约测试）。

| 段 | 内容（改动面） | 红先 / 必跑 | done |
|---|---|---|---|
| **P0 门禁核**（keyless，不动模型可见文本） | 新 `scripts/lib/verdict-audit-core.mjs`（纯判据，注入会话事实）、新 `scripts/run-gates/verdict-audit.mjs`（CLI 壳，0/1/2）、新 `tests/run/verdict-audit.test.mjs`；`scripts/run-ops/run-accept.mjs` 第三道预检 + `--write` 落盘；`scripts/README.md` run-gates 与 lib 两表；`docs/evaluation.md` L4 判据 ⑤ + 退出语义行；`tests/contracts/evaluation-contract.test.mjs` 加 ⑤ 断言；`scripts/smoke/run-accept-smoke.mjs` 合成 bundle 两例 | 五条红配方先红（改 `raw` / 删覆盖 / 非法枚举 / 换 session / child 写盘）→ 还原绿；`node scripts/smoke/run-accept-smoke.mjs`；`pnpm verify`（navigability 的 lib 消费列会对账） | 门禁在**合成会话日志**上证明读得到 preset/depth/verbatim；旧 bundle 与 quick_factual 不判；test + smoke 绿 |
| **P1 契约面**（模型可见，阶段边界请人） | `content/manual.md` 两处（目录约定两行 + 完成判据一行，先预算处置）；新 `presets/critic/skills/claim-verdict/SKILL.md`；`critic.patch.yml` persona 两句；`lead.patch.yml` persona 三句；`lead/skills/team-assembly/SKILL.md` 通道表一行 | `node dev/render-overlay.mjs` → `DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs`（L1）→ `node scripts/smoke/snapshot-replay-smoke.mjs`（B 层红 = 已捕获）→ `--update-expected` 重写金标准 + 人审 diff；`content-shape` 预算 | L1 绿 + snapshot B 绿 + `tests/pack/presets.test.mjs` 新钉绿 + 文档同步 |
| **P2 装配验证** | 真模型档：`l4-lite-smoke`（四角色响应）；重启 run 通道（web 缓存 boot 时文本） | `source dev/env.sh && node scripts/smoke/l4-lite-smoke.mjs` | L4-lite 绿；未跑项如实列 |
| **P3 试点 A**（机制，1 child） | 复用已交付 bundle + 手工 `claims.json`；`run-driver up` → `run-kickoff --preset lead` 派一个 critic child；按验收 8 的五条判据收证 | child 会话头 / JSON 可解析 / 无写盘 / 逐字相等 / 门禁绿 | 五条判据全绿；会话 id 与 verdicts 路径进 Note |
| **P4 试点 B**（真 run，用户在场） | 一场非 quick_factual 真 run 走完 claims → 分批 dispatch → verdicts → review 终局块 → HITL2 → run-accept | HITL1/HITL2 由用户点；`run-accept` 绿 | 验收 9 全绿；证据进 Note，不进 CI |
| **P5 收尾**（与交付同变更） | `docs/decisions.md` 加 **D44**（≤800 字，含与 D43 的边界）；`notes/implemented/2026-11-10-claim-verdict-quality-loop.md`（决定/输掉的方案/实际跑过的验证）；卡 `git mv` 归档 + 状态行 `已结`/`可关闭：是` + `审查：`；`_backlog/issues/README.md` 移行；研究题页按「消费者离开」决定是否同迁 `_archived/research/` | `pnpm verify` + `pnpm test` 终跑；归档同变更 | 全绿 + 卡与 Note 同变更 + 用户验收 |

**不做的事（同卡「不做」节）**：新只读 `verifier` preset、运行时 veto、语义门禁、host 代码、收据扩展（P6 可选片）。

## 落地进度（2026-11-10）

- **P0 门禁核 已落**（commit `7e77d24`）：`verdict-audit-core.mjs` + CLI + 28 例 keyless 回归 +
  `run-accept` 第三道预检 + `scripts/README` 两表 + `evaluation.md` L4 判据 ⑤ + 两份写者模板。
  证据：五条红配方真 CLI 各红一次（`not-verbatim` / `coverage-gap` / `verdict-invalid` / `session-preset` /
  `verifier-wrote`），epoch 豁免 exit 0；`run-accept-smoke` 补齐 claims-绿 / gap-红 / `--require` 强制三例。
- **P1 内容面 已落**（commit `d324240`）：`claim-verdict` skill、critic/lead persona、team-assembly 通道行、
  手册两处（**预算下放**：`plan.md` 的 W 语法搬模板+skill、三件 ops 合并，净 12,187 → 12,038，余 250）、
  准入规则写入 `content-shape` 门禁注释。证据：`render-overlay` 重生成、`preset-smoke` ALL PASS（新 skill 挂载 +
  隔离仍绿）、snapshot B 先红（两条 persona 都被捕获）→ lead/critic 真模型重录 + `snapshot.json` 身份更新 →
  C5 金标准重写人审 → replay ALL PASS、`l4-lite-smoke` ALL PASS、`pnpm verify` 全绿、`pnpm test` 1083 绿。
- **P3 试点 A 已过**（真模型，2026-11-10）：复用已交付 bundle 副本 `drt_claim-pilot`（2 条 critical claim），
  Lead 派 1 个 `agent_preset=critic` child（session `394f8a00…`，depth 1），child 真加载 claim-verdict、
  读两张证据卡、重抓两条 URL、做轮反例搜索 → 回 `[supported, partially_supported]`；Lead 原文落
  `review/verdicts-r1.json`，未写 review.md。`verdict-audit --require` 在**真实会话**上 PASS
  （覆盖 2/2，`not-verbatim`/`session-preset`/`session-depth`/`verifier-wrote` 全过——这一条同时补上了
  「dev home 无真实 child 会话」的现场空白；唯一警告 = `review-missing`，因试点故意不写 review.md）。
- **P4 前置（2026-11-10 补：测试资产与交付门风险）**：
  - **BUG-046 已修**（独立 bug 卡）：手册固定形态 `## readiness（终局）: PASS|FAIL` 此前被
    `terminalVerdictLine` 读成 null（真实 review 靠另一条裸 `readiness: PASS` 才过）。解析器增
    判定词后可选短括号段（≤8 字），未动手册与 snapshot；先红 2 例 → 绿 18/18。卡 =
    [BUG-046](../_archived/fixed_bugs/BUG-046-readiness-parenthetical-unparsed.md)。
  - **真实 child 日志夹具已落**：Pilot A 的 child `394f8a00…` 脱敏切面 + 真实 bundle 三件 →
    `tests/fixtures/verdict-audit/pilot-a/`（约 92 KB）；消费测试
    `tests/run/verdict-audit-fixture.test.mjs` 走 `findSessionDir → resolveSessionLog →
    parseSessionFacts → auditClaimVerdicts` 全链（绿 + 三条派生红：改 header preset / 追加 write /
    改 child 正文）。`parseSessionFacts` 从 CLI 抽到 core，补上验收 6 此前“注入对象、不过日志读取”的空档。
    红先：把 core 的 `preset` 读取改坏 → 该文件 2 红，还原 → 5/5 绿。全量 `pnpm test` **1107/1107**、
    `pnpm verify` 全绿、`run-accept-smoke` ALL PASS。
- **剩**：P4 试点 B（真 run，需用户在场走 HITL1/HITL2）→ P5 收尾（D44 / implemented Note / 卡归档 / 研究题去向）。
- **顺带发现（已修，BUG-046）**：手册写「`review.md` 末尾固定 `## readiness（终局）: PASS|FAIL`」，
  但门禁的 `readinessOf` 解析不了这个括号形态——真实 review 能过是因为别处另有一行裸 `readiness: PASS`。
  2026-11-10 用户拍板修解析器（不动手册/snapshot），卡 =
  [BUG-046](../_archived/fixed_bugs/BUG-046-readiness-parenthetical-unparsed.md)。

## 验收标准

1. **工件契约在场**：手册两处（目录约定 + 完成判据）+ `claim-verdict` skill 的输出契约；字段名与 core 的
   解析键逐字一致，测试锁。JSON 形状示例默认住手册/skill，**不新增 `templates/run/*.json`**（理由见「未决」4）。
2. **critic claim 模式**：`claim-verdict` skill 在场，输出契约为「一个 JSON 数组，每条 verdict 四值之一」；
   persona 有排斥句（接到 claim 级任务 → 按 skill 回 JSON、不写 `review.md`、不给修复建议）；
   报告级 `adversarial-review` 的三线与 readiness 判据**不变**。
3. **lead 派工纪律**：persona 写死「一批 3–5 条、一个 child、等 notice 再派下一批、notice 到齐才落盘」；
   `team-assembly` 的通道表加 claim 复核一行（subagent + `agent_preset=critic`，不进任务板）。
4. **门禁实现**：契约 §5 的检查全部实装（含 `claim-not-in-final`、`raw-reparse`、`session-preset`、
   `session-depth`、`not-verbatim` 跨轮单调、`verifier-wrote`）；退出码 0/1/2 与 evidence-audit 同律；
   `--write` 才落 `review/verdict-audit-r<N>.md`，报告页脚列出「不核什么」。
5. **反证（先红后绿）**：五条破坏各自红一次并给对应 code —— ①改 `raw` 一个字节；②删一条 critical 的 verdict；
   ③verdict 值改成 `supported `（尾空格）；④把 `session` 换成另一场 child；⑤让 child 调一次 `write`；还原 → 绿。
6. **keyless 回归**：`tests/run/verdict-audit.test.mjs` 用合成 bundle + 合成会话日志（`.jsonl` 夹具，
   不起子进程，遵守 tests 分层）；五条红配方的反证进用例，不做「只测绿」。
7. **接入验收**：`run-accept` 预检加第三道门；新契约 run 缺 `claims.json` → 红；旧 bundle 与 quick_factual → 不判；
   `run-accept-smoke` 的合成 bundle 补一例「有 claims 绿 / 缺 claims 红」。
8. **试点 A（机制）**：复用已交付 bundle（`drt_unsc-p5-members` 或同类），2–3 条 claim、1 个 critic child，
   五条判据全绿 —— ①child 头 `agentPreset=critic` + `delegationDepth≥1` + `parentSession` 非空（补本仓空白的现场证据）；
   ②最终正文是可解析 JSON 数组且条数 = claim 数；③child 无 `write`/`edit` 调用；④Lead 抄录与 child 正文逐字相等；
   ⑤门禁绿且五条红配方各红一次。
9. **试点 B（真 run）**：一场非 quick_factual 真 run 走完全链（claims → 分批 dispatch → verdicts →
   review 终局块 → HITL2 → run-accept）；HITL2 摘要三行数字在场；证据进 Note，**不进 CI**。
10. **文档与账**：`scripts/README.md` 的 run-gates 与 lib 两表各加一行；`docs/evaluation.md` §L4 证据表加一行
    （判据 = `verdict-audit` 退出码）；`presets/critic` 与 `content/` 的改动面在 `docs/design/20-roles.md` /
    `docs/design/30-methodology-mapping.md` 各补一句（若涉及）；交付时登记一条 D（质量环口径），
    **不改 D2/D3**（不加角色、不改主通道）。

## 范围与排除项

- **范围**：上面四件工件 + 门禁 + 三个内容面（手册/模板/critic skill+persona/lead 三句）+ keyless 测试 +
  run-accept 接线 + 两段试点 + 文档账。
- **不做**：新 `verifier` 只读 preset（重议条件 = 契约 §8 第 2 条）；运行时 veto；语义门禁（quote 真伪）；
  host 代码；新调度器；把 claim 表做成 must-answer 清单；收据（`delivered.json`）扩展 —— 后者列为可选片 P6，
  只有用户在试点后要求「交付后也能复算裁决」时才做（那会动 `run-receipt` 与回执三态契约）。
- **切片**：与上方「落地计划」同一编号——P0 = core + 门禁 + keyless + 反证（纯工具面）；P1 = 内容面（手册/skill/persona）；
  P2 = L4-lite 装配；P3 = 试点 A；P4 = 试点 B；P5 = 收尾（D44/Note/归档）；P6 = 可选收据扩展。
  P0 绿再动 P1；**不并行开两个面**。

## 未决（默认按推荐，用户改任一项先回卡）

1. ~~**批量 3–5 条 / child**~~（2026-11-10 用户采纳推荐）：3–5 条 / child，试点 A 后可按实测调。
2. **quick_factual 豁免**（推荐，同读者版豁免）还是也要求 claims。
3. **收据扩展**：v1 不进 `delivered.json`（推荐，门禁报告 + `--write` 文件足够）；要「交付后复算」再加 P6。
4. ~~**JSON 模板去留**~~（2026-11-10 用户采纳推荐：**加**）——新增 `templates/run/claims.json` 与
   `templates/run/verdicts.json` 作**写者契约**（Lead 不加载 critic skill，形状必须有写者的家），
   并用测试把模板键集合钉到 core 的解析面（缺/多即红）；模板按需 read，不进常驻上下文。
5. **跑 Pilot A 的位置**：dev home 的 `research-workspace`（推荐，现场日志可读）还是临时工作区。

## 已知与未决（诚实边界）

- **soft 只读**：critic child 有 fs 写能力，v1 靠任务形状 + 审计 `verifier-wrote`；堵法是 staging `cwd`
  （只放 claims + evidence），试点证明管不住再上。
- **claim 表完整性不由门禁保证**：门禁只证「表内每条都真、都被核过」，不证「表没漏」；漏判靠团队态 critic 与用户。
- **typed 输出是唯一大假设**：spawn 有 `outputSchema` 能力但工具不暴露，prompt 约束是否稳，只有试点能答。
- **同模相关性不消失**：只许标 L2；本仓无第二家 provider 凭据，L3 不做。

## 关闭条件

验收 1–10 全绿 + 试点 A/B 证据进 Note + 用户验收（pack 公共行为面）；卡顶补去向与 `审查：` 后归档
（卡与 Note 同变更）。
