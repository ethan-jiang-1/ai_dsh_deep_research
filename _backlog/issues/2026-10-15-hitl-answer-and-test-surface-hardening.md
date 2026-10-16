---
status: 推敲中
opened: 2026-10-15
---

# 推敲：hitl-answer 与测试面的三条小硬化候选（留痕，不单独排期）

> 立卡：2026-10-15 ｜ 状态：推敲中 ｜ 类型：Task ｜ 结论倾向：以后做（待触发：下次改动对应文件、或出现 `--custom` 真实需求时顺带处理）｜ 可关闭：否

**问题与期望结果：** 全仓清理轮的对抗自审提出三条真但极小的问题；逐条单独开工的收益不抵风险（其中两条落在**无法活体验证**的路径上）。本卡收拢留痕，避免散失；触发条件 = 下次改动对应文件时顺带处理。

**当前情况（三条，各带证据与"为何不现在做"）：**

1. **`dev/hitl-answer.mjs` 侧栏行扫描 300 行上限**：`findTargetRow`/`expandOneSidebarSection` 用 `Math.min(n, 300)` 截断——超限时找不到目标行，走**已 fail-closed** 的报错路径（`exit 3` + 侧栏样本），但错因文案不区分"扫描上限截断"与"目标不在侧栏"。候选修法 = 命中上限即显式报"行数超扫描上限（N）"。
   为何不现在做：该文件是**无法活体验证**的代答路径（本轮已因它反复谨慎）；为文案精度动它不划算。触发 = 下一次真实代答窗口顺带。

2. **`tests/library-fold.test.mjs` 缺「给用户的一句话」列对账**：其余列都有逐列断言，仅此列不对等。候选修法 = 补一条列级断言（12 形态例库复用既有夹具）。
   为何不现在做：纯增量、零风险，但价值低；可与下次 library 面板/例库改动合并。

3. **`--custom` 语义非一等公民**：现行为"点完选项后把文本填进**当前题**的 custom 字段"，而 UI 的单选自定义是"替换选择"语义（`packages/.../QuestionComposer.tsx` 的 `draftCustom` 会清空 selected）。候选 = 升格为"纯文本作答"路径（先填 custom 再推进）。
   为何不现在做：**YAGNI**——历史使用证据显示被用的是 `--pick`（BUG-015 族），无 `--custom` 实战需求；等真实需要再改，改时须连带 `optionIndexToClick` 的意图对账。
   **2026-10-16 触发并落地**（真实需求出现）：nvidia 交付闭合的 HITL2 卡 Q1 是**自由文本题**（逐题翻页形态：
   1 个 textarea + `Next` 钮、零 radio），旧驱动观察 `radio=0` → abort「无选项可读」→ **整张卡答不了**。
   落地四件：①判据层 `lib/ask-drive.nextDriveAction` 新增 **`fill-text`**（无选项 + 有文本域 + 给了作答文本 → 先填；
   按「现值 ≠ 作答文本」幂等防回环；未给文本仍 abort 不猜）；②页面侧**零 radio 一律按文本题面观察**
   （报 `textFieldAvailable/textValue`），推进钮认 `Next/继续/下一题`——**仅零 radio 时**（选项题面只认 `Submit`，
   逐字不变）；③**翻页 ≠ 提交**：点击结果带 `kind`（advance 继续循环 / final 收尾；旧行为把翻页当终局提交会提前 break）；
   ④`--custom` 文本被文本题消费后不再当选项题的补充文本（防串题）。
   证据 = keyless 四例先红后绿（`tests/ask-drive.test.mjs` 34/34）· 对实卡 dry-run 观察面转正 ·
   **实答落地**（盘侧裁决「1/2 实质作答 + 意图对账通过」+ provenance 写盘）· `client-hitl-smoke` 回归 ALL PASS。
   `optionIndexToClick` 与意图对账**未动**（卡上原话的约束）。

**未决问题：** 第 3 条是否已有真实使用场景（若有，优先级从"待触发"升为"现在做"）。

**下一步：** 无独立排期；由触发条件驱动（下次改 `dev/hitl-answer.mjs`、`tests/library-fold.test.mjs`、或出现 `--custom` 真实需求时）。

## 参考

- 侧栏上限与 custom 语义所在 = [dev/hitl-answer.mjs](../../dev/hitl-answer.mjs)（本轮已把 custom 填写收窄到目标卡内并 fail-loud 记录失败）；
- 库面板读数上限的姊妹卡 = [BUG-026](../_archived/fixed_bugs/BUG-026-library-read-40-line-truncation.md)（已修，同族"上限静默截断"）。

## 附：2026-10-16 同文件已修（当场修掉、不另建档）

诊断 `client-hitl-smoke` 既存确定性红（⑤b/⑤c，四跑同两条）时定位到**本文件自身**的判据缺陷并当场修复：

- **根因**：`operateOnTargetCard` 的 `visible()` 把"零尺寸祖先"一律当隐藏，而 DSH web 的会话容器外有
  **三层 `display: contents` 包装**——`display:contents` 不生成盒子，`getBoundingClientRect()` 恒 0×0
  是布局语义。于是守卫判 `active-session-unavailable` → 拒绝代答（exit 3）。
- **证据**：四次复现同一 exit 3；守卫 reason = `active-session-unavailable` 且 `total=1 / sid 匹配 /
  选中行匹配 / dialogs=0 / masks=0`；祖先链阻塞项 = `DIV[rect 0x0|display:contents|pos:static|overflow:visible|children:1]` ×3。
- **修法**：`display: contents` 的元素跳过尺寸检查（其余隐藏信号 display:none / visibility:hidden /
  opacity:0 / aria-hidden 照查）。
- **活体验证（本卡此前记"该路径无法活体验证"——本轮已推翻）**：修复后 `client-hitl-smoke`
  **ALL PASS**（⑤b 挂起卡已答 → ⑤c 回合闭合 → ⑤d 二次挂起 → ⑤e 右栏自动展开 → ⑤f 横幅在场）。
- 三件待触发硬化（本卡正文）**不受影响，仍按原触发条件待命**。
