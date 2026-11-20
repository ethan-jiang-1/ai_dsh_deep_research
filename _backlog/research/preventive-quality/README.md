---
status: 已定性
opened: 2026-11-20
---

# 预防性质量：让探索发现收敛为设计约束与测试资产

> 状态：已定性
> 问题：为什么已有测试策略、类级守卫和探索毕业纪律，仍持续依赖探索找 bug 再补？哪些机制应在设计与变更时预埋，怎样用有限资产和可证伪的退出条件减少同类复发？
> 消费者：[预防性质量落地卡](../../issues/2026-11-20-preventive-quality-pilot.md)（首批实施记录与未决验收）；[Pack 生产源头预防](../../issues/2026-11-20-pack-production-prevention.md)（plan 候选、支持域与发布边界的后续推敲）
> 产出的卡：[预防性质量落地](../../issues/2026-11-20-preventive-quality-pilot.md)（待落地、可关闭否；12 项真进程正向回归及 verify/test exit 0，A4 未通过、最终版负控未跑，未作用户业务验收）；[Pack 生产源头预防](../../issues/2026-11-20-pack-production-prevention.md)（推敲中、可关闭否；候选质量合同已写，未授权产品实施）
> 结论：旧类保障未随新 Module 和真实入口继承是已证缺口。首批将既有开发环的有限准入与启动互斥实证配套，以公共操作和执行性质减少重复义务；实际技术决定见[首批 Note](../../../notes/implemented/2026-11-20-preventive-quality-pilot.md)，研究依据见[综合](2026-11-20-prevention-synthesis.md)，范围见[落地方案](2026-11-20-repo-landing-plan.md)。

## 研究委托

阅读用户指定的 Schemastery basics 与 preset quality 两组材料，对照本仓实际机制和探索修复历史，研究应预埋的设计机制、测试资产与开发纪律。先形成有一手证据的判断和有界试点；本轮授权为立题和研究。

参考材料位于作者本机的 `/Users/bowhead/deepseek-harness/_faq_on_digested/30_schemastery-basics/` 与 `/Users/bowhead/deepseek-harness/_faq_on_digested/31_preset-quality/`。它们是调查入口；具体机制结论回查本仓 pinned vendor、源实现与原生测试，区分版本差异与本轮未运行项。

## 研究边界与完成判据

- 分开回答确定性工程缺陷与模型决策、领域结果质量；不把 schema、快照或真实模型测试任一层当作全能证明。
- 从多轮邻接变体复发中找共同成因，区分已有机制、执行缺口与设计上仍缺的能力。
- 给出候选方案、取舍、最小试点、独立 oracle、反例、成本与停止条件。
- 保留不确定项与会改变结论的证据；研究建议不自动升级为当前合同或实施授权。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [首轮综合](2026-11-20-prevention-synthesis.md) | 根因、设计落点、资产与纪律、备选、有界试点和停止条件 | 2026-11-20 |
| [原生质量证据](2026-11-20-native-quality-evidence.md) | 两组 FAQ 的一手机制核实与本仓适用范围 | 2026-11-20 |
| [复发链审计](2026-11-20-recurrence-audit.md) | 多轮历史、当前保障、最新锁反例与证据限制 | 2026-11-20 |
| [开发准入审计](2026-11-20-change-admission-audit.md) | 五关在真实 hook、验证与新增 Module 中的执行范围和缺口 | 2026-11-20 |
| [本仓落地方案](2026-11-20-repo-landing-plan.md) | 既有 owner 的具体修改、有限准入、首批实证与后续触发条件 | 2026-11-20 |
| [准入封存案例](2026-11-20-admission-cases.md) | 首批 A4 的虚拟变更输入、独立 expected 与取样边界 | 2026-11-20 |
| [准入评测结果](2026-11-20-admission-results.md) | 两份实际输入、逐项判读、标签泄露与规则未受测的证据边界 | 2026-11-20 |
| [重复确认与工具许可](2026-11-20-approval-friction.md) | 直接授权、阶段判断与当前安装原生许可的分界及减摩擦方案 | 2026-11-20 |
| [Pack 生产源头预防](2026-11-20-pack-production-prevention.md) | 模型产物与确定性写方的因果样本、包内边界、三项优先候选及有界试点 | 2026-11-20 |

## 本轮进度与实施证据

先读综合稿和本仓落地方案，再按需查证据材料。研究定性不替代实施验收；逐项执行记录与关闭边界以[承接卡](../../issues/2026-11-20-preventive-quality-pilot.md)为准。

首批技术改动已提交为 `71010fef`，决定理由与实际已取得证据见[implemented Note](../../../notes/implemented/2026-11-20-preventive-quality-pilot.md)。当前状态仍是部分验收：低层 5 项启动锁性质通过；旧实现的活 owner 超龄接管与旧 release 删除后来锁目录均有 exit 1 反证，后者按实际文件系统状态判定而非返回值。`pnpm test`（1423 spec + 265 checks，零 fail/skip）与 `pnpm verify` 均 exit 0。

真实入口方面，早期 `bypass-wrapper.out` 与 `DJhmFY` 在 `--mutate=bypass-wrapper` 下 exit 1；变异后实际拒绝码 1、期望 busy=2。`CNezLA` 是 `--mutate=drop-home-lock` 的 exit 1（同 home/不同 state 实际 23、期望 2）。两者均属于预期负控红，断言抓住了错误拒绝。最终版 `bypass-wrapper.final.out` 因 `ps` 进程组观察被沙箱 EPERM 阻断，0 checks、exit 2（NOT-RUN）；保留旧版有效红证，不称最终版负控已复跑。正向结果：`runtime/smoke-workspace/channel-start-e2e-h6jRC5/result.json` exit 0，12 项通过，覆盖双向委托/handoff、drift/reuse、共享与独立资源、启动失败、TERM/交接取消、子进程静默、相对路径和后台诊断；使用隔离 fixture adapter，不证明 DSH/GUI/model 行为。runner 登记为一个 12-case、影响触发的 dev-only 检查，不进默认回归或 nightly。

A4 原样材料与判读见[准入评测结果](2026-11-20-admission-results.md)：Case A 按封存 expected 失败；Case B 静态等价判断符合对照，但标题标签泄露。受测上下文未获准读取准入 guide/skill，故规则效力未证；不扩样、不改 expected。A4 未通过，不能称首批 A+B 整体完成，也未发生用户业务验收；issue 保持待落地且不可关闭。

规模与收益只按本轮可核事实表达：启动锁默认回归用例由 1→5，旧协议两套收敛为一个 supervisor；删除 driver 与 shell 的重复锁、pgrep 和旧 log polling。新增代码净行较大，不称净 LOC 减少；收益是减少重复调用/释放义务，不以 BUG 数量替代业务价值。一次性工时来自本 session 多轮实施与错误诊断，无法精确计量，不编造时数。

本轮研究阶段原有 verify/test 与未覆盖情况见[综合稿验证节](2026-11-20-prevention-synthesis.md#九本轮验证与显式未覆盖)；那组研究期计数不冒充本批最终验证。本批 `pnpm test:spec && pnpm test:checks` exit 0（1423 spec + 265 checks，0 fail/skip），`pnpm verify` 全绿 exit 0；9 项 dev-parity 注入 exit 0，增量 review `547fac7b` 修复原 3 个 blocker 后无剩余 blocker。source-only 非发布件形态，L2 未跑。最终版 bypass-wrapper 负控因沙箱 EPERM exit 2/0 checks（NOT-RUN），保留早期有效 exit 1 负控红。A4 未通过，issue 仍为待落地、可关闭否；首批 A+B 不称整体完成，也未作用户业务验收。
