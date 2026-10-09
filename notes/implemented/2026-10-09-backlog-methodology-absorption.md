# Backlog 方法论吸收：问题澄清不是实施前置

> 状态：implemented

来源 = `ai_dsh_assitant/_backlog/` reference repository snapshot，commit `ce649dbcdb4c908f7fc3de0d564554b5aa8880ab`；版本作为外部参考，不是 DSH vendor pin。当前合同见 [D19/D20](../../docs/00-index.md) 与 [_backlog 意图载体总图](../../docs/design/60-intent-carriers.md)。

## 决定

默认吸纳来源仓的 backlog 精神：以问题澄清、事实查证、方法按需选择和证据归属为核心；工作大小按独立判断依赖和可验收结果控制。Backlog 是问题与证据空间，不是普遍实施前置、优先级机制或授权来源。issue 卡可止于结论、拒绝、延后或下游处理申请；提交申请不等同于 RFC、实施或验收。

2026-10-09 后续用户裁定「其实应该消除它，把问题复杂化了」：彻底退役仓级 `queue.md`，而非改成可选、空置或另一张清单。已授权工作按本轮请求直接执行；复杂实施需要拆步时使用会话内 Plan/todo。无需补一个仓级顺序 owner。D11/D20 当前合同按此收敛，roadmap 退役决定继续有效。

`notes/proposed/` 只用于需要显式评审的持久决定；不因工作复杂、进入队列或建立 issue 而自动创建 RFC。直接授权的工作按授权范围执行，后续持久决定理由遵循 notes 规则。

## 输掉的方案

- **把每张 issue 等同 implementation plan，并要求全部 issue 毕业成 RFC + queue 行**：会把来源仓的问题澄清职责重新变成必经审批/实施通道，混淆问题已想清楚与工作已授权。
- **把 queue 作为所有工作的唯一入口或授权依据**：与本轮明确的 backlog 边界相冲突；同时保留 queue 的既有用户决定，仅限已授权工作的可选排序用途。
- **把来源仓协作系统逐项照搬**：本仓是单人文件工作流，没有 GitHub Issue/Project 事件源；采用本地问题卡、方法和归档形态，而非远端 tracker 状态机。

## 实际跑过的验证

以下为 2026-10-09 吸收提交时的历史验证，并非本次 queue 退役验证：

- `pnpm verify`：36 个门禁全绿，含 `backlog-liveness`、queue/RFC 指针与文档链接检查。
- `pnpm test`：265/265 通过，含 issue/RFC 授权边界的词法反例测试。
- `node scripts/smoke/gates-smoke.mjs`：22 个真实入口注入案例均点名报红，对照组与空 queue 合法态全绿。
- 日期 `2026-10-09` 由系统 `date +%F` 实际核验。

## 环境状态

queue 机制及 `graduating-a-queue-item` 技能已退役。D11/D20 与当前入口、门禁、探针及测试同步移除队列依赖；具体历史裁决留在其 `notes/rejected/` owner，研究数据留在研究报告与索引。
