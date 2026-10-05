# BUG-015：hitl-answer 的 --pick 非默认选项未实现——驱动静默提交 UI 预选项，意图与落地脱节无检测

> 严重级别：P1（重要——操作侧意图完整性：命令选 X、落地交 Y，且盘侧裁决只验"答案落地"不验"落的是不是命令的答案"——代理模拟的意图通道被静默劫持）｜发现：2026-10-06（license-terms run HITL2 实录）｜状态：活跃

## 症状

`hitl-answer --pick 2`（意图 = 选第二项「补研究：破单源」）执行后：盘侧 answer 批实际落地 **「按现稿定稿交付（Recommended）」**——UI 预选项原样提交，驱动 0 次点击、无任何警告；run 按意图相反的分支交付（v1 定稿，证据扩张分支未走）。操作者若不复查 answer 批内容，意图被静默覆盖。

## 根因（源码核对）

[scripts/lib/ask-drive.mjs](../../scripts/lib/ask-drive.mjs) `nextDriveAction` 的动作空间只有两种：`点推荐项`（radioCount>0 且无选中时）与 `复点已选中项推进`（checkedCount>0 时）——**不存在按 PICK 选择指定选项的逻辑**；`--pick` 参数只在 provenance 文本里留名，从未参与驱动决策。非默认 pick（`first` / `<index>`）是**装饰性参数**。

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
