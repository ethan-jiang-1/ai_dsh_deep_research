# RFC：毕业正文改写门禁（implemented 零计划体残留扫描）

> 状态：proposed

## 问题

"毕业 = 正文改写（计划体 → 已交付事实体）"是 [notes/AGENTS.md](../../notes/AGENTS.md)
明文纪律，但目前**只有 skill 散文约束、无机械守卫**——两处明文自认不查：

- `.agents/skills/graduating-a-queue-item/SKILL.md`：改写步骤无对账检查；
- `notes/AGENTS.md`（毕业与命名节）：只写"只改路径不改正文 = 未来计划伪装成当前事实"，
  无"谁发现"。

病是真发生过的：roadmap-graduation-drift 事故（postmortem 在案）就是毕业时序纪律失守的
近亲——队列指针漂移靠事后门禁（`queue-pointer-live`）补上了机械面，而**正文改写这半边
至今无机械面**。活跃 implemented 现存约 30 篇（2026-09-27 归档清欠后），逐篇靠人眼维持
"已交付事实体"不可持续。

## 方案

新增 L0 门禁 `note-graduation-rewrite`（挂 `scripts/verify.mjs` gates 数组 +
[evaluation.md](../../docs/evaluation.md) §L0 登记表，走 `writing-a-gate` 全程序）：

- **扫描范围**：`notes/implemented/*.md`（grandfather 条款豁免——遗留形态本就允许骨架
  不齐；`archived/` 冻结层不扫，快照不追改）；
- **判据（窄词表，先探针后钉版）**：计划体强标记——RFC 专有节名 `## 验收`（implemented
  骨架应为 `## 决定`/`## 输掉的方案`/`## 实际跑过的验证`/`## 环境状态`）与行内
  `TODO`/`TBD`/`待办`/`待实施`/`下一步将`/`接下来将`/`将迁移`/`将新增`；
- **探针前置**：对活跃区全量跑一轮候选词表，量误报率（中文"将"字在陈述句里合法：
  "将 X 映射到 Y"），只钉零误报的形态进正则——判据宁窄勿宽，漏报由毕业 skill 兜底；
- **失败信息**：文件 + 命中的计划体标记 + 修正入口（改写为已交付事实体，见
  graduating-a-queue-item skill）。

## 输掉的方案

- **全量中文未来时态语义判断**（"将/将要/计划"宽匹配）：误报灾难（"将 X 映射到 Y"类
  陈述句海量合法命中），弃；
- **维持 skill 散文约束**：现状即此，postmortem 近亲事故证明纯散文毕业纪律会漂，弃；
- **扫 roadmap 行措辞代替扫 Note 正文**：队列行只是指针（≤3 行），计划体伪装发生在
  RFC/Note 正文里，扫错对象，弃；
- **grandfather 全量豁免 + 人工抽查**：无机械信号，抽查无人排期，弃。

## 验收

- **负例控制**：向任一活跃 implemented Note 注入 `## 验收` 节与"下一步将迁移"行 →
  门禁红 → 还原绿；红证记录进 evaluation.md §L0 该行（含原始红输出）；
- 探针报告：候选词表对活跃区零误报（或有词因误报出局，记录取舍）；
- `gate-ledger-sync` 对账绿（gates 数组 ↔ 登记表）；`pnpm verify` / `pnpm test` 全绿。
