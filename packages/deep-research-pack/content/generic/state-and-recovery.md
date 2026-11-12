# 状态头、读序与恢复（按需细则）

> 本文件是 `content/manual.md` §状态头、读序与恢复 的下放细则，由 T0 手册按需指向；不是独立指令面。
> 路径相对 `research_pack_root`；键义模板 = `content/templates/run/run.md`。

**五问**：阶段 / 最近拍板 / 最大未闭合 / 下一步 / 交付态。

**按意图读**（读完即停；五问答齐即停）：

| 意图 | 先读 | 停在哪 | 不读 |
|---|---|---|---|
| 继续 | `run.md`（无 → 旧场行；旧场行替代本行，不叠加）→ `question.md §Decisions` → `journal.md` 顶部 3–5 条 → `plan.md §剩余工作` | 五问答齐 | 全部 evidence、历史 review |
| 交付 | `run.md`（旧场跳过）→ `final/` 最高 `vN` + `final.md §0` → `question.md §Decisions` → `review.md` 当前终局块 → `delivered.json`（新）/`acceptance.md`（旧） | 版本副本 + 拍板 + readiness + 回执齐 | 研究过程、evidence |
| 查证 | `final.md` 的 claim 句（多卡逐卡）→ `findings.md` 的 F# → 该 `evidence/<id>.md` + `provenance/<id>.json`（若在场；旧场常缺） | 来源与口径（数字/等级/as-of/单源；丢限定语 = 不符） | question/plan/journal、其他 evidence |
| 旧场 | 旧表（下方）→ `question.md §Decisions` → `journal.md` 顶部 → `final.md` + 最高 `final/vN` → `review.md` 当前终局块 → `acceptance.md`（旧） | 五问答齐 + 回执 | 不补 `run.md`、不读 evidence（查证行除外） |

**交付口径**：`final/` 取最高 `vN`；`final/vN` = 不可变交付副本，`final.md` = 当前稿，不是副本；`final/v1-ledger.md` 不是副本。新契约看 `delivered.json`；旧场只有 `acceptance.md`（二选一，不是都要）。旧场 `final/v1.md` 兼作版本索引：修复回填可在文末加索引行、正文不改；新契约 `final/vN` 不可变。`acceptance.md` 只记硬门（CRITICAL 0）；MAJOR 数看 `audit.md`，不因它重判交付。旧场 receipt 无哈希；交付后改 review/plan 要重跑 `run-accept`；accepted 后只归档。旧场 `present` 可能指 `final.md`/v1，且不是文件（session log 事件）；有 `acceptance.md` + HITL2 行 + 最高 `final/vN` = accepted，present 不指 v2 时注明“操作侧验收”，不伪造模型 present。

**终局块**：`review.md` 只认当前终局块（文件头声明方向；当前实现最新在上）；`readiness: PASS|FAIL` 是判据，末尾/历史轮的 PASS 不算。

**终局声明**：critic 同轮写 `review/readiness.json`（`version:1` + `readiness` + 可选 `conditional`/`round`）；门禁以声明为准，review.md 的判定行只做副本——不一致/缺席/非法 = 红。历史轮/附录不夺权；lead 升级须引 critic 授权并落新的终局块。无 `run.md` 的旧场不出结构化证据，门禁记 UNATTESTED（不是通过）。

**旧 run 推导表**（无 `run.md`；不补）：

| 事实 | phase | 下一步 |
|---|---|---|
| 无 `question.md` | 立项前 | 问用户是否立项 |
| `review.md` 无 PASS 或 `final/` 不在场 | research/review | 继续研究 |
| review 终局 PASS、无 HITL2 行 | delivery | 呈 HITL2 |
| HITL2 行 + 最高 `final/vN` +（present 指同一 `vN` 或 `acceptance.md` 在场） | accepted | 可 `run-accept` |
| 最高 `final/vN` 无对应拍板，或 present 指旧 `vN` 且无 acceptance | delivery | 先补拍板/present |
| `_abandoned/` + 停放原因 | parked | 按复活条件 |

**冲突 / 过期**：`plan.md` 的剩余工作、`review.md` 历史轮、journal 旧条都可能过期；以**最新 journal + §Decisions + final 事实**为准，不按 stale plan 继续。`> rerun:` 标记不是必需；rerun 以 §Decisions 的 `vN` 行 + `final/vN` 为准。**查证优先于旧场恢复**：先 claim → findings/evidence，不先读 question/plan/journal。

**恢复**：读最小集 → 答五问 → 先定范围（`run.md.next`/`phase`；不明只问一个带范围的澄清问）→ 重问 pending HITL（一次）→ 按 `plan.md §剩余工作` 重建 Team（若已过期以 journal/§Decisions 为准）→ 继续，不重做已完成。

## provenance 与 hash

- provenance 可选；owner = ops/Lead。analyst 只写 kind/url/path/retrieved_at/channel/slice 等
  **非 hash** 元数据；hash 由 ops/Lead 在 run 后用 shell 补，或走显式窄工具。
- 不要要求 analyst 用 `python3 hashlib` 或在 run 内算 `sha256`；也不要把 `workflow` 当通用
  计算器——它不是 JS 沙箱工具。
- 缺 hash = UNATTESTED，不是伪造；`file://` 无 provenance = MAJOR。
