---
status: 已定性
opened: 2026-11-10
---

# 产出/验证分离：独立复核与裁决留痕

> 状态：已定性
> 问题：怎样让「验证」真的独立于「产出」——独立 activation、只读工具面、裁决原文、可机械复核的哈希；以及按 claim 验证还是按报告验证。
> 消费者：本轮 presets 设计推演（用户 2026-11-10 直派）；落地消费者 = 推进卡（下方「产出的卡」）。
> 产出的卡：[claim 级独立复核](../../issues/2026-11-10-claim-verdict-quality-loop.md)（待落地，2026-11-10）
> 结论：本仓只到 L2 弱形态（critic 是独立会话，但判据是报告级 prose）；最小增量 = claim 表 + typed verdict + 父级原文落盘 + 覆盖门，不新增角色；Lead 无 bash 故哈希归门禁、`subagent` 无 `outputSchema` 故 typed 输出是唯一未证的大假设——已写成两段试点与六条重议条件。详见 [verdict-contract](2026-11-10-verdict-contract.md)。

## 研究问题（已逐条回答）

1. **哪些独立性已被机制保证，哪些只是 prompt 纪律？**
   机制保证：独立会话（`agentPreset=critic` 的 child 头可机读）、逐条重抓 URL、只有 critic 能写终局 PASS。
   prompt 纪律：claim-first（不给草稿"是让验证者自己判断"还是"被叙事带着走"，靠派工 brief，不靠机制）、
   只读（critic 有 fs 写能力，"只读"只是任务形状）。→ [契约 §2](2026-11-10-verdict-contract.md)
2. **独立验证的最小形态与质量/成本差。**
   = fresh child + claim brief + typed verdict + 父级落盘。质量差：消锚定、消自评、保住原文可核；
   成本差：一批 3–5 条一个 child，比报告级 critc 多一次派工与一次跨轮落盘。
   → [契约 §4.4](2026-11-10-verdict-contract.md)
3. **裁决工件写哪、谁写、怎么防事后改？**
   `review/claims.json` + `review/verdicts-r<N>.json`，Lead 写；防改靠门禁复算 `claimsSha256` +
   与 child 会话正文逐字比对（**哈希不归模型**：本仓 Lead 没有 bash）。→ [契约 §4.1/§5](2026-11-10-verdict-contract.md)
4. **同模相关性怎么诚实标注？**
   只许标 L2「上下文独立复核（同模异上下文，独立性有限）」；解决锚定/自评/注意力稀释，不解决同源盲区；
   第二家 provider 凭据出现前不写「第二双眼睛」。→ [契约 §8 第 5 条](2026-11-10-verdict-contract.md)
5. **哪些判据可机械查，哪些不该做成语义门禁？**
   可查：覆盖、值域、表内条目真实（claim 必须是 final 原句）、原文一致、child 身份、child 没写盘。
   不查：quote 真伪、claim 表完整性、source tier 匹配、整篇 readiness。→ [契约 §5](2026-11-10-verdict-contract.md)
6. **与 HITL2 的关系：critic PASS 是前提还是建议？**
   机械前提（有结论性覆盖），不是替代；HITL2 摘要必须带三行数字（独立性层级 / 覆盖 x/y + UNVERIFIED 数 /
   重抓 URL 数），覆盖 < 100% 时摘要必须显形，不允许「PASS 即全绿」。→ [契约 §4.2/§4.6](2026-11-10-verdict-contract.md)

## 边界

- 不在运行时做 veto；验证者仍是模型，不替代可执行证据。
- 不扩 host 代码 / 新调度器；先看现成 subagent / workflow 能否承载（结论：subagent，理由见契约 §6 第 4 行）。
- 「异人复核」不在本仓能力内；只讨论「同模异上下文，独立性有限」的诚实标注。
- 本方向只到「契约 + 机械门设计 + 试点方案」；实现与真机证据归推进卡。

## 本方向上下文

- **问题**：验证如何真正独立于产出；per-claim vs per-report；裁决如何留痕。
- **当前结论**：L1 机械重算 / L2 同模异上下文 / L3 异人异模；本仓稳定在 L2；claim-first + typed verdict +
  父级原样落盘 + 门禁覆盖。已定性（2026-11-10）。
- **口径**（与共享上下文一致，冲突时以共享上下文为准）：
  - verdict 值 = `supported | partially_supported | unsupported | unverifiable`；`unverifiable` 聚合为 `UNVERIFIED`，
    **不算 PASS 覆盖**。
  - v1 PASS 要求全部 critical claim 有结论性 verdict；仍有 `unverifiable` → readiness 只能 FAIL（可交付但标缺口），
    不写「带缺口的 PASS」。
  - v1 的哈希口径：**门禁算、门禁记**（两个文件哈希写进门禁报告；防改的硬锚 = 与 child 会话正文逐字比对），模型不填哈希——与首版设想不同，原因 = Lead 无 bash。
  - 轮次：r1 首验、r2 复验，上限 2 轮；处置归首次提出该裁决缺口的那一轮。
- **必读增量**：
  - `packages/deep-research-pack/presets/critic.patch.yml`（工具面：无 bash/subagent，有 fs 写）
  - `presets/critic/skills/adversarial-review/SKILL.md`（三线/readiness 格式/复审上限 3 轮）
  - `content/manual.md` §交付物三态、§完成判据、§终局块、证据契约
  - `scripts/run-gates/evidence-audit.mjs`（三条断言的现有实现）
  - `scripts/run-ops/run-accept.mjs` + `scripts/lib/run-receipt.mjs`（预检顺序与回执哈希面）
  - vendor `packages/subagent/tool-subagent/README.md`（不等结果、返回 `subagentId`）
  - 仓外：company 的归档卡 / 落地 Note / `quality-loop` skill / `tools/lib/quality-loop.mjs`（**不随本仓**）
- **外部证据（已复核，逐项见 [契约 §1](2026-11-10-verdict-contract.md)）**：
  - self-critique 掉点（16%→2%、5%→3%、F.N.R 95.8%）: https://arxiv.org/html/2402.08115v2
  - 同模 judge 自偏爱（自识别 ↔ 自偏爱线性相关）: https://arxiv.org/html/2404.13076v1
  - DeepResearch Bench C. Acc. 77.96–90.24（四个 DR agent）: https://arxiv.org/html/2506.11763v1
  - Anthropic rubric: https://www.anthropic.com/engineering/multi-agent-research-system
  - Elicit quote-per-decision: https://support.elicit.com/en/articles/14759154-systematic-reviews-in-elicit
- **首版五问的落点**：claim 抽取 = Lead（critic 复核表完整性）；粒度 = critical 全验 + 非关键抽验记账；
  UNVERIFIED 可交付但只能 FAIL；**不新建 verifier preset**（v1 用 critic + 任务形状；重议条件 = 契约 §8 第 2 条）；
  哈希 = 门禁算、`review/verdict-audit-r<N>.md` 落盘（不进 `delivered.json`，收据扩展留给卡里可选的 P1 片）。
- **完成判据**：verdict schema + 机械门检查清单 + 两段试点方案 + HITL2 措辞 + 六条重议条件——**已齐**；
  真机证据（Pilot A/B）**未做**，归推进卡。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-10-claim-verdicts.md](2026-11-10-claim-verdicts.md) | 首版：独立性三层、claim 级 verdict、父级落盘、hash/覆盖判据（两处外部数字已就地更正） | 2026-11-10 |
| [2026-11-10-verdict-contract.md](2026-11-10-verdict-contract.md) | 结论稿：工件契约、机械门检查清单、备选裁决表、两段试点、重议条件、锚点索引 | 2026-11-10 |
