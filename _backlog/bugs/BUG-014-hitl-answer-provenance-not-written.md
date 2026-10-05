# BUG-014：hitl-answer 的"代理模拟记录"只打印不写盘，HITL 代答 provenance 静默丢失

> 严重级别：P2｜发现：2026-10-05｜状态：活跃

## 症状

代理代答 HITL 后，bundle 的 `question.md` §Decisions 拍板行把作答者记为**用户**（lead 无从得知答案来自代理——它只看到 ask 通道的正常答复）；`hitl-answer` 输出声称「代理模拟记录（写进 bundle 的 question.md §Decisions 与 journal.md）」，但两文件中 代理/代答/模拟 类词**零命中**（grep 实测）。

## 根因（源码核对）

[dev/hitl-answer.mjs](../../dev/hitl-answer.mjs) 第 297 行——「代理模拟记录（写进 …）」**仅为 console log，无任何写盘调用**；脚本头注（第 9 / 18 行）明确要求「**必须**在 question.md §Decisions 与 journal.md 标注"代理模拟"」——承诺与实现脱节，写盘义务被静默丢弃。

## 复现

drt_mistral-api-model-list（2026-10-05，HITL2 代答实录）：hitl-answer 执行后 grep 两文件零命中；操作侧手工补记（question.md「provenance 修正」行 + journal「操作侧收尾记账」节）救回证据链。

## 牵出的失败类

**声明性记账无机械把守**：驱动声称的副作用无实现，也无门禁/测试对账（契约测试只查会话日志 answer 事件，不查 bundle 记账落位）。修复方向二选一：①驱动在作答成功分支真写盘（append §Decisions 拍板行标注 + journal 行）；②明示"记录由操作侧负责"并删掉输出里的写盘承诺——不再让输出暗示已发生的事没发生。修复须带反证（代答后 grep 两文件应命中；先立红：契约测试断言驱动写盘或断言输出不再承诺）。

## 修复关联

症状实录 = mistral run 的 journal「操作侧收尾记账」节；技能正本（代理模拟须显式记账）= `.agents/skills/running-a-research-run` §2。
