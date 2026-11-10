---
status: 待落地
opened: 2026-11-10
---

# 落地：claim 级独立复核——typed verdict + 机械覆盖门

> 立卡：2026-11-10 ｜ 状态：待落地 ｜ 类型：Feature ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> 去向：implemented — 交付时写 `notes/implemented/2026-11-10-claim-verdict-quality-loop.md`（理由/备选/试点证据进 Note，docs 只写 now）
>
> **研究依据**：[quality-loop 题名页](../research/quality-loop/README.md) → [verdict-contract](../research/quality-loop/2026-11-10-verdict-contract.md)（契约、机械门清单、备选裁决表、试点、重议条件）
>
> **开工授权**：本卡 = 准备进开发，不是授权。改动面含 **pack 公共行为**（critic 人设、手册合同、交付判据），
> 开工等用户一句「做」；开工后先做 keyless 片（门禁 + 契约 + 测试），再动内容面。

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

## 验收标准

1. **工件契约在场**：手册新增节 + 两份 JSON 模板；模板与门禁解析器同源（`tests/pack/content-injection`
   的模板清单同 diff 扩充；模板字段名与 core 的解析键逐字一致，测试锁）。
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
  host 代码；新调度器；把 claim 表做成 must-answer 清单；收据（`delivered.json`）扩展 —— 后者列为可选片 P3，
  只有用户在试点后要求「交付后也能复算裁决」时才做（那会动 `run-receipt` 与回执三态契约）。
- **切片**：P0 = core + 门禁 + keyless + 反证（纯工具面，不动模型可见文本）；P1 = 内容面（手册/模板/skill/persona）；
  P2 = 试点 A/B + 接线 + 文档账。P0 绿再动 P1；**不并行开三个面**。

## 未决（默认按推荐，用户改任一项先回卡）

1. **批量 3–5 条 / child**（推荐）还是 1–2 条（更纯但成本线性涨）——试点 A 后可按实测调。
2. **quick_factual 豁免**（推荐，同读者版豁免）还是也要求 claims。
3. **收据扩展**：v1 不进 `delivered.json`（推荐，门禁报告 + `--write` 文件足够）；要「交付后复算」再加 P3。
4. **跑 Fly A 的位置**：dev home 的 `research-workspace`（推荐，现场日志可读）还是临时工作区。

## 已知与未决（诚实边界）

- **soft 只读**：critic child 有 fs 写能力，v1 靠任务形状 + 审计 `verifier-wrote`；堵法是 staging `cwd`
  （只放 claims + evidence），试点证明管不住再上。
- **claim 表完整性不由门禁保证**：门禁只证「表内每条都真、都被核过」，不证「表没漏」；漏判靠团队态 critic 与用户。
- **typed 输出是唯一大假设**：spawn 有 `outputSchema` 能力但工具不暴露，prompt 约束是否稳，只有试点能答。
- **同模相关性不消失**：只许标 L2；本仓无第二家 provider 凭据，L3 不做。

## 关闭条件

验收 1–10 全绿 + 试点 A/B 证据进 Note + 用户验收（pack 公共行为面）；卡顶补去向与 `审查：` 后归档
（卡与 Note 同变更）。
