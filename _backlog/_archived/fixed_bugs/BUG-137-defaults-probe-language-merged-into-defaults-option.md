---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-137：D50 真模型探针 C5 红——语言被写进「沿用项目默认」选项名（语言冒充项目默认）

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — research-brief 明写「项目默认/库默认选项名/分句不得出现语言词」；真模型 C5 PASS（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁/真模型探针）。
>
> 位置：`probes/behavior/defaults-probe.mjs` 的 C5 判定（失败）；被违反的合同 =
> `packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md:26`（「语言不是项目默认」）。

## 症状

真模型探针 `defaults-probe` 在 seeded 场景（`research-defaults.json` 设了 depth/output/source）跑出：

```
PASS seeded：项目默认标记 5/7（项目默认, 事实核查, 完整报告, official, regulatory）
FAIL seeded：语言被并入「项目默认」同句/选项名
  （沿用项目默认：近 12 个月 + official/regulatory + 中文 严格照默认口径执行，
    但会漏掉作为依据的 1945/1971 年原始文件。）
```

即 HITL1 卡的第三问（时间口径与来源范围 + 语言）里，Lead 把「中文」并进了
**「沿用项目默认：…」的选项 label**——这正是 D50 明令禁止的「语言冒充项目默认」：
`research-defaults.json` 的三轴不含语言，用户选这一项时，中文被当作「项目默认」的一部分，
而不是本次题面/界面语言的独立选择。

auto 场景对照 PASS（无「项目默认/库默认」标记）——说明不是探针把「中文」一律判红，
而是 seeded 场景的具体选项名把语言与项目默认并在一起（探针的 `labelOnly` 判据）。

## 复现

```sh
# 需要空闲端口；见 BUG-136（探针的失败路径会泄漏宿主，重跑前先清理）
source dev/env.sh
node probes/behavior/defaults-probe.mjs --port <free>
# → FAIL seeded：语言被并入「项目默认」同句/选项名
# 证据原文：runtime/smoke-workspace/defaults-probe-last.md（seeded args 第三问 option label）
```

（本卡证据来自一次真实运行；因 [BUG-136](BUG-136-defaults-probe-port-self-lock.md) 的端口自锁，
连续复跑需换端口/先清理宿主，**未做多次稳定性采样**——如实记录。）

## 根因（已证 + 推断）

1. **已被证明**：模型在 seeded 场景把语言写进含「项目默认」的选项 **label**，违反 research-brief 的
   「语言不是项目默认」；
2. **可能的结构诱因（推断，需产品确认）**：HITL1 第三问把「时间口径 + 语言 + 来源范围」三件事合并
   在一问里；当用户想「沿用默认」时，模型自然把同一问里的语言也并进「沿用项目默认」选项。
   skill 只写了「语言不是项目默认」，没有写「**选项 label 不得把语言与项目默认并写**；语言用独立
   分句/独立问表述」——探针的 C5 容忍分号分句（NOTE），但模型给出的是同一 label；
3. skill 的禁止句在 §HITL1 的上下文里权重不够（模型仍合并），属「指引强度不足」而非「无指引」。

## 影响面

- 用户看到「沿用项目默认」选项时，会以为中文也是项目设置的一部分（实际语言随界面/题面）；
- 选该项后，模型按「严格照默认口径执行」——可能把语言约束误当默认轴，造成回答语言/来源语言偏差；
- 这是**已交付功能的真模型行为回归**（D50 的核心承诺之一），不是 lint 级问题。

## 修复判据

1. **指引加固**（首选）：`research-brief` 的 HITL1 三问处明写「含『项目默认/库默认』的**选项名/分句**
   不得出现语言词（中文/英文/中英）；语言如需在卡上出现，用分号独立分句，或单独一问」；
2. **提问结构**（可选）：把「语言」从「时间口径与来源范围」的问里拆出，或把 seeded 卡的选项拆成
   「沿用项目默认（深度/输出/来源）」+「语言按界面默认」两段；
3. 先红后绿：修复后连续跑 `defaults-probe` **≥2 次** C5 均 PASS（模型档允许偶发？若两次一红一绿，
   记录 flaky 并加强指引直到稳定）；auto 场景不回归；
4. 单测面：`tests/pack/presets.test.mjs` 或 skill 文本测试可断言「HITL1 选项语言禁令」句子在场
   （防文本被删），但真正的判据仍是 C5 真模型探针；
5. `pnpm test` + `pnpm verify` 绿；探针的端口泄漏（136）修复后才能稳定复跑。

## 修复关联

D50（`research:defaults`）与 `defaults-probe` 的 C5；[BUG-136](BUG-136-defaults-probe-port-self-lock.md)
是本卡复跑的阻塞项（先修 136，再验 C5）。发现方式 = 用户批预算后的真模型探针首跑。

## 已落地（2026-11-13）

- 证据 = 同一探针 seeded C5 PASS（语言未并入项目默认）。
- 全量 `pnpm test` 1355 绿、`pnpm verify` 全绿；defaults-probe ALL PASS。
- 去向 = none。
