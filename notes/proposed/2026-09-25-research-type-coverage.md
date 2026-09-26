# RFC：研究类型覆盖（下一场真实 run 与多类型固化）

> 状态：proposed

归宿：roadmap §队列「研究类型覆盖」（研究/活动，**用户带题驱动**；兼「观察面 GUI 化」
（已毕业）的 L4 验收载体）。

## 问题

首个完整 run（drt_cn-us-cpu-gap，L4 四判据全闭）只覆盖了一种研究形态；lead persona 的
HITL1 三型（快速事实核查 / 探索性全景 / 主张验证）另两型**未经实战**。且首场的 HITL2 是
代理模拟拍板——**真实用户拍板的全流程**还没跑过。观察面的真人档验收也需要一场活 run。

## 方案（草图）

用户带 1–2 个真实研究问题（建议覆盖另一型，如"主张验证"）→ `bash dev/boot-run.sh` →
**真人 HITL1/HITL2**（这次不代理模拟——观察面横幅/活标题正好承接"等你拍板"）→ run
bundle 落 `drt_<slug>/`。可选：同场一并做完观察面的真人档验收（一石二鸟）；或多跑一场
小型"快速事实核查"验最薄路径。

## 输掉的方案

- **自造题目刷覆盖**：否决——真实问题才有真压力（评估面教义：真模型、真实问题）；
- **等 GUI 全好才跑**：可议——GUI 前 run 也有效（D 路仪表盘已可用），不必串行死等。

## 验收

一场真人 run 同时闭以下四项：

1. **类型覆盖**：≥1 场真人 HITL 全流程 run，类型 ≠ 首场类型；
2. **L4 四判据机器断言全绿**：报告 + 来源清单 / 抽查回溯 / 两点纪律 / 中断恢复；
3. **证据可靠性面（run 级，自 [evidence-reliability 毕业记录](../implemented/2026-09-25-evidence-reliability.md) 延期）**：
   bundle 含 `audit.md` 且关键结论佐证结构达标；
4. **交互卡片与观察面真人档（自 [research-interaction](../implemented/2026-09-25-research-interaction.md) ·
   [observability-gui](../implemented/2026-09-24-observability-gui.md) 毕业记录延期）**：
   HITL1 三问选项卡可用性 + HITL2 选项拍板 + 工具卡可读性；活标题/横幅目验 + 矩阵/review
   状态与 run bundle 对账。

顺手取证两条搁置项的重估证据：lead 综合负载（synthesizer）与质量滑坡有无（floor）。

## 实施记录

（待用户带题。开工前置 = 把 `research-workspace` 注册进 DSH——[guides/61 §1](../../docs/guides/61-run-playbook.md)；
启动 = `bash dev/boot-run.sh`。）
