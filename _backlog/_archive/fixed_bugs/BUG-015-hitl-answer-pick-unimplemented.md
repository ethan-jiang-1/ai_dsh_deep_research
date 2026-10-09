# BUG-015：hitl-answer 的 --pick 非默认选项未实现——驱动静默提交 UI 预选项，意图与落地脱节无检测

> 严重级别：P1（重要——操作侧意图完整性：命令选 X、落地交 Y，且盘侧裁决只验"答案落地"不验"落的是不是命令的答案"——代理模拟的意图通道被静默劫持）｜发现：2026-10-06（license-terms run HITL2 实录）｜状态：已修复（2026-10-06 同日，TDD 红→绿：23/23；活体确认挂账 = 下一次非默认 pick 代答——决策层改选 + 对账抓获双形态）

## 症状

`hitl-answer --pick 2`（意图 = 选第二项「补研究：破单源」）执行后：盘侧 answer 批实际落地 **「按现稿定稿交付（Recommended）」**——UI 预选项原样提交，驱动 0 次点击、无任何警告；run 按意图相反的分支交付（v1 定稿，证据扩张分支未走）。操作者若不复查 answer 批内容，意图被静默覆盖。

## 根因（源码核对）

[scripts/lib/ask-drive.mjs](../../../scripts/lib/ask-drive.mjs) `nextDriveAction` 的动作空间只有两种：`点推荐项`（radioCount>0 且无选中时）与 `复点已选中项推进`（checkedCount>0 时）——**不存在按 PICK 选择指定选项的逻辑**；`--pick` 参数只在 provenance 文本里留名，从未参与驱动决策。非默认 pick（`first` / `<index>`）是**装饰性参数**。

## 复现

1. 起一个带选项卡的挂起 ask（推荐项被 UI 预选）；
2. `node --import tsx/esm dev/hitl-answer.mjs --port … --token … --pick 2`；
3. 盘侧 answer 批 = 预选项（Recommended），非第二项；驱动全程零点击、零警告。

## 修复方向

- **实现 pick**：驱动读出选项清单后按 PICK（recommended / first / N）点击目标选项（`nextDriveAction` 扩动作或驱动侧目标解析）；`--custom` 填文本同理；
- **意图对账**：盘侧裁决通过后，比对 landedBatch 的 selected 与 PICK 意图——不匹配即**响亮失败**（exit 非 0），不再让"答案落地"冒充"意图达成"（与 BUG-004 的盘侧裁决精神同源：裁决对象从"有没有答"升格到"答的是不是命令的"）；
- 修复带契约测试（ask-drive 纯函数面可 keyless 测：选项解析 → 目标选项 → 对账谓词）。

## 修复关联

发现实录 = license-terms run（2026-10-06）：操作侧命令补研究分支被静默替换为定稿——后以"交付后证据扩张 rerun"补救（D17 允许），意图劫持本身立本卡。与 BUG-014 同工具族（hitl-answer 的声明与实现脱节系）。

已修复（2026-10-06 同日，TDD 红→绿）：

- **根因精修**（修复时源码复核的再发现）：clickOption 的 pick 定位逻辑**本就在**（recommended → /Recommended/ 标签、数字 → radios[N-1]）——劫持机制的真身是 **UI 预选推荐项使 Submit 提前可用，决策层（nextDriveAction）"Submit 可用即提交"的第一优先级短路了点击侧的 pick 逻辑**；
- **决策层修复**：`nextDriveAction` 增可选参 `selectionMatchesIntent`（缺席 = 相符，旧调用方零破坏）——Submit 可用但预选与意图不符 → **click-option 先改选再提交**（"Submit 可用 ≠ 意图达成"）；驱动侧 `decideWithIntent` 用 `pickTargetLabel(obs.labels, PICK)` vs `checkedLabel` 算符合性（目标不可解析 → 放行交对账把关，不瞎改选）；
- **意图对账**（裁决后半）：新 `intentReconcile({batch, questions, pick})`——盘侧 answer 批逐题对 pick 目标解析结果，不符即**响亮红（exit 1）+ 逐题报告**（"答案已落地但不是命令的答案，勿当成功用"）；答案内容仍进 provenance（事实归事实、意图归意图，pick 字段标注不符实录）；
- **配套纯函数**：`parseAskQuestions`（ask 参数 → 逐题 id/prompt/option 标签——意图解析的输入面）+ `pickTargetLabel`（recommended 精确/回退两态、first、数字 N、越界 null 不猜）；
- **测试**：tests/ask-drive.test.mjs 增八断言（parseAskQuestions 两形态 / pickTargetLabel 四态 / 决策层劫持形态钉 + 旧行为不破坏 / 对账一致-不符-不可解析三态）——立红实录：导出缺席即红（0/1），实现后 23/23 绿；
- 验证：ask-drive 23/23 + `pnpm verify` 全绿 + `pnpm test` 216/216（净增八项）；
- 活体确认（挂账）：下一次非默认 pick 代答——决策层改选形态（预选项不符 → click-option 改选）与对账抓获形态（若仍不符 → exit 1 响亮）双验证，未兑现即回滚本卡状态。
