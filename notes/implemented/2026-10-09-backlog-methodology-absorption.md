# Backlog 方法论吸收：问题澄清不是实施前置

> 状态：implemented

来源 = `ai_dsh_assitant/_backlog/` reference repository snapshot，commit `ce649dbcdb4c908f7fc3de0d564554b5aa8880ab`；版本作为外部参考，不是 DSH vendor pin。当前合同见 [D19/D20](../../docs/00-index.md) 与 [_backlog 意图载体总图](../../docs/design/60-intent-carriers.md)。

## 决定

默认吸纳来源仓的 backlog 精神：以问题澄清、事实查证、方法按需选择和证据归属为核心；工作大小按独立判断依赖和可验收结果控制。Backlog 是问题与证据空间，不是普遍实施前置、优先级机制或授权来源。issue 卡可止于结论、拒绝、延后或下游处理申请；提交申请不等同于 RFC、实施或验收。

2026-10-09 后续用户裁定「其实应该消除它，把问题复杂化了」：彻底退役仓级 `queue.md`，而非改成可选、空置或另一张清单。已授权工作按本轮请求直接执行；复杂实施需要拆步时使用会话内 Plan/todo。无需补一个仓级顺序 owner。D11/D20 当前合同按此收敛，roadmap 退役决定继续有效。

`notes/proposed/` 只用于需要显式评审的持久决定；不因工作复杂、进入队列或建立 issue 而自动创建 RFC。直接授权的工作按授权范围执行，后续持久决定理由遵循 notes 规则。

制度骨架之上的显性化扩展（入口两张票、缺陷修复通道含「修复就绪」P1/P2 自授权例外、双轨状态生命周期、`_backlog/AGENTS.md` 门牌）= [借鉴 Note](2026-10-12-backlog-process-borrow.md)（[D24](../../docs/00-index.md)）；本篇决定全部维持。

## 输掉的方案

- **把每张 issue 等同 implementation plan，并要求全部 issue 毕业成 RFC + queue 行**：会把来源仓的问题澄清职责重新变成必经审批/实施通道，混淆问题已想清楚与工作已授权。
- **把 queue 作为所有工作的唯一入口或授权依据，或保留为可选排序索引**：前者混淆授权与问题澄清；后者仍维持用户明确判定为复杂化的机制。本轮裁决完整退役仓级 queue，不另建清单。
- **把来源仓协作系统逐项照搬**：本仓是单人文件工作流，没有 GitHub Issue/Project 事件源；采用本地问题卡、方法和归档形态，而非远端 tracker 状态机。

## 历史裁决 owner

queue 搁置池中的结论不再由索引维护，按决定本身回到现有 owner：workflow adoption → [rejected Note](../rejected/2026-09-30-workflow-adoption.md)；browser-use adoption → [rejected Note](../rejected/2026-09-30-browser-use-adoption.md)；UI skin → [rejected Note](../rejected/2026-09-24-ui-skin.md)；专职 synthesizer → [rejected Note](../rejected/2026-09-24-synthesizer-role.md)；floor gate → [rejected Note](../rejected/2026-09-24-floor-gates.md)；LICENSE → [rejected Note](../rejected/2026-09-24-license.md)；frontmatter caliber → [rejected Note](../rejected/2026-09-24-frontmatter-caliber-gate.md)；per-topic floor 数据 → [strategy benchmark Note](2026-09-28-strategy-benchmark.md) 与其 research 数据；HITL2 条件范围轮 → [_backlog settled issue](../../_backlog/_archived/settled_issues/2026-09-28-hitl2-scope-round.md)。重启条件留在各 owner 内，不复制成新清单。

## 实际跑过的验证

2026-10-09 queue 退役验证：

- `pnpm verify`：全绿，含入口链、backlog 活性、文档链接、预算和索引对账。
- `pnpm test`：265/265 通过（含新增 RFC 条件谓词测试）。
- `node scripts/smoke/gates-smoke.mjs`：19 个注入案例均点名报红，对照组全绿。
- `source dev/env.sh && node scripts/probe/entry-chain-probe.mjs`：真模型档 Q1–Q3 全通过；原始会话留在 gitignored `runtime/smoke-workspace/`。
- 历史吸收验证记录在旧提交中，不作为本次结果。

## 环境状态

queue 机制及 `graduating-a-queue-item` 技能已退役。D11/D20 与当前入口、门禁、探针及测试同步移除队列依赖；具体历史裁决留在其 `notes/rejected/` owner，研究数据留在研究报告与索引。
