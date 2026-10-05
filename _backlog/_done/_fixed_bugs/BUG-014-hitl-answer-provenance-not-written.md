# BUG-014：hitl-answer 的"代理模拟记录"只打印不写盘，HITL 代答 provenance 静默丢失

> 严重级别：P2｜发现：2026-10-05｜状态：已修复（2026-10-05 同日，TDD 红→绿；活体确认 = 下一次代答的写盘日志 + bundle 内 grep 双证，挂账如下）

## 症状

代理代答 HITL 后，bundle 的 `question.md` §Decisions 拍板行把作答者记为**用户**（lead 无从得知答案来自代理——它只看到 ask 通道的正常答复）；`hitl-answer` 输出声称「代理模拟记录（写进 bundle 的 question.md §Decisions 与 journal.md）」，但两文件中 代理/代答/模拟 类词**零命中**（grep 实测）。

## 根因（源码核对）

[dev/hitl-answer.mjs](../../../dev/hitl-answer.mjs) 第 297 行——「代理模拟记录（写进 …）」**仅为 console log，无任何写盘调用**；脚本头注（第 9 / 18 行）明确要求「**必须**在 question.md §Decisions 与 journal.md 标注"代理模拟"」——承诺与实现脱节，写盘义务被静默丢弃。

## 复现

drt_mistral-api-model-list（2026-10-05，HITL2 代答实录）：hitl-answer 执行后 grep 两文件零命中；操作侧手工补记（question.md「provenance 修正」行 + journal「操作侧收尾记账」节）救回证据链。

## 牵出的失败类

**声明性记账无机械把守**：驱动声称的副作用无实现，也无门禁/测试对账（契约测试只查会话日志 answer 事件，不查 bundle 记账落位）。修复方向二选一：①驱动在作答成功分支真写盘（append §Decisions 拍板行标注 + journal 行）；②明示"记录由操作侧负责"并删掉输出里的写盘承诺——不再让输出暗示已发生的事没发生。修复须带反证（代答后 grep 两文件应命中；先立红：契约测试断言驱动写盘或断言输出不再承诺）。

## 修复关联

症状实录 = mistral run 的 journal「操作侧收尾记账」节；技能正本（代理模拟须显式记账）= `.agents/skills/running-a-research-run` §2。

已修复（2026-10-05 同日，TDD 红→绿）：

- **[scripts/lib/hitl-provenance.mjs](../../../scripts/lib/hitl-provenance.mjs) 新模块**：`provenanceLines`（纯函数——日期/pick/逐题 Q→选项 → §Decisions 行 + journal 行，均含"操作侧代理模拟"标注）+ `appendProvenance`（写盘器——追加式不改写既有内容；缺件 fail-loud 报文件名与修正入口）；
- **[dev/hitl-answer.mjs](../../../dev/hitl-answer.mjs) 接线**：盘侧裁决通过（answer 真落地）才写盘；dry-run 不写；裁决红或零作答不写（answer 没发生就不记）；工作区无 drt_* bundle 时 fail-loud——"打印承诺"改为"真写盘 + 写完报路径"；
- **tests/hitl-provenance.test.mjs**（三断言：行内容 / 追加幂等〔二次=两行〕 / 缺件 fail-loud）——立红实录：首跑模块缺席即红，实现后 3/3 绿；**资产门契约测试同步实抓一次**（lib/hitl-provenance.mjs 未进 scripts/README 索引 → 红 → 补行 → 绿——新资产必须同步索引的门禁闭环当场兑现）；
- 验证：provenance 3/3 + navigability 9/9、`pnpm verify` 全绿、`pnpm test` 206/206（净增三项）；
- 活体确认（挂账）：下一次代理代答的运行日志应出现「代理模拟记录已写盘——…question.md + …journal.md」，且 bundle 两文件 grep「代理模拟」命中——若未兑现即回滚本卡状态。
- **活体确认进展（2026-10-05，drt_mcp-hosts-governance run 实录）**：①**HITL1 窗口边界缺口当场发现并修**——澄清先于 bundle 实例化（persona 合同），原 fail-loud 在 HITL1 代答后会崩；改为**响亮延迟**（答案落地、不崩、记账义务移交操作侧并打印答案内容），HITL1 4/4 落地实测通过（驱动同 diff 提交）；②**lib 写盘路径活体兑现**——操作侧补记调用 `appendProvenance`，答案取会话日志 answer 批**真实四问值**，question.md + journal.md 双文件落「操作侧代理模拟」行；③驱动**自动写盘路径**待 HITL2（bundle 在场场景）兑现；④小疵记账：answer 批形态为 `{id, selected}` 无 prompt 文本，手工补记行显示 `Q「」→「…」`——下次手工补记以 `b.id` 作标签（驱动路径不受影响，其 answered 来自 UI 命中、带真实 prompt）。
- **第二缺口（同 run HITL2 实录）与二修（2026-10-06）**：DSH UI 预选推荐项、驱动零点击直接 Submit → 点击日志 answered 为空 → provenance 未触发（活体确认判"未兑现"的那半，实录形态与 mistral HITL2 同源）。修复 = 数据源改为**实际提交的 answer 批**：lib 增 `batchToAnswered`（纯函数，id 作标签——顺带闭合 ④的空标签小疵），驱动捕获裁决通过时的 `landedBatch` 为权威源；契约测试第四断言先立红（导出缺席即红）后绿（4/4）。终态 `pnpm verify` 全绿 + tests 207/207；驱动自动写盘（批路径）的活体终证挂下一次代答。
