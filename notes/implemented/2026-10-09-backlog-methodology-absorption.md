# Backlog 方法论吸收：问题澄清不是实施前置

> 状态：implemented

来源 = `ai_dsh_assitant/_backlog/` reference repository snapshot，commit `ce649dbcdb4c908f7fc3de0d564554b5aa8880ab`；版本作为外部参考，不是 DSH vendor pin。当前合同见 [D19/D20](../../docs/00-index.md) 与 [_backlog 意图载体总图](../../docs/design/60-intent-carriers.md)。

## 决定

默认吸纳来源仓的 backlog 精神：以问题澄清、事实查证、方法按需选择和证据归属为核心；工作大小按独立判断依赖和可验收结果控制。Backlog 是问题与证据空间，不是普遍实施前置、优先级机制或授权来源。issue 卡可止于结论、拒绝、延后或下游处理申请；提交申请不等同于 RFC、实施或验收。

`queue.md` 保留的唯一例外，是 D11/D20 已由用户明确裁定的队列能力：对已授权、需要跨步骤或跨会话排序的工作，它是可选顺序索引。▶ 只表示该索引内的位置，不表示全仓唯一当前工作，也不授权。

`notes/proposed/` 只用于需要显式评审的持久决定；不因工作复杂、进入队列或建立 issue 而自动创建 RFC。直接授权的工作按授权范围执行，后续持久决定理由遵循 notes 规则。

## 输掉的方案

- **把每张 issue 等同 implementation plan，并要求全部 issue 毕业成 RFC + queue 行**：会把来源仓的问题澄清职责重新变成必经审批/实施通道，混淆问题已想清楚与工作已授权。
- **把 queue 作为所有工作的唯一入口或授权依据**：与本轮明确的 backlog 边界相冲突；同时保留 queue 的既有用户决定，仅限已授权工作的可选排序用途。
- **把来源仓协作系统逐项照搬**：本仓是单人文件工作流，没有 GitHub Issue/Project 事件源；采用本地问题卡、方法和归档形态，而非远端 tracker 状态机。

## 实际跑过的验证

- `pnpm verify`：36 个门禁全绿，含 `backlog-liveness`、queue/RFC 指针与文档链接检查。
- `pnpm test`：265/265 通过，含 issue/RFC 授权边界的词法反例测试。
- `node scripts/smoke/gates-smoke.mjs`：22 个真实入口注入案例均点名报红，对照组与空 queue 合法态全绿。
- 日期 `2026-10-09` 由系统 `date +%F` 实际核验。

## 环境状态

跨 owner 当前合同已同步至根 `AGENTS.md`、`README.md`、`docs/00-index.md` 的 D11/D12/D13/D19/D20 与外部材料登记、`docs/design/60-intent-carriers.md`、`docs/guides/60-dev-loop.md`、`notes/README.md`、`notes/AGENTS.md`、`notes/proposed/README.md` 和 `graduating-a-queue-item` 技能。
