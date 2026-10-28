---
topic: P1 位置语义收口
intent: 记录 D17 位置子句修订为 D28（位置=操作桶、状态=内容）的落点、残留检查与验收证据
---

# P1：位置 = 操作桶（D28）

> 消费者：[_backlog/issues/2026-10-23-run-bundle-agent-state-and-read-chain.md](../../../_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)
> ｜ 2026-10-23 ｜ 只改人类文档；**不动手册/NODES/模板**（P7 批量，避免两次 snapshot 重录）。

## 1. 决定

- 新增 **D28**：run bundle 状态 = 内容，位置 = 操作桶；根 / `archive/drt_<slug>/` / `_abandoned/`
  只用于发现与展示，不参与恢复/交付判定；新 run 交付 = `final/vN` + `deliverables/presented` +
  `delivered.json`/`acceptance.md` 回执；旧 bundle 按 epoch 豁免。
- D17 的位置子句改为“位置=操作桶”，注明由 D28 修订；D17 的 harness/bundle 分离主体不动。

## 2. 落点

| 文件 | 改动 |
|---|---|
| [docs/decisions.md](../../../../docs/decisions.md) | D17 位置子句 → 操作桶；新增 D28 行 |
| [docs/design/40-research-cockpit.md](../../../../docs/design/40-research-cockpit.md) | 会话绑定：位置只用于发现，三位置都认，状态从内容读（D28） |
| [docs/design/50-agent-loop-and-state.md](../../../../docs/design/50-agent-loop-and-state.md) | run bundle 行：D17/D28，位置=操作桶；保留 `archive/drt_<slug>/` 路径 |
| [docs/guides/61-run-playbook.md](../../../../docs/guides/61-run-playbook.md) | 启动发现扫三桶；位置=操作桶；交付判别 = `final/vN` + presented + 回执 |

## 3. 残留检查

```sh
grep -rn '位置=状态' docs README.md packages/deep-research-pack/README.md
# 0
grep -rn '在飞住工作区根' docs README.md
# 0
```

## 4. 验收

- `pnpm verify`：**全绿**（2026-10-23）。
- `pnpm test`：**661 pass / 0 fail**（`docs-consistency` 的 archive 路径断言已保留）。
- 未跑：L1/L2、snapshot 重录（本阶段没动手册/模板，不需要；P7 统一付一次）。
- 旧 bundle 零改写；`_abandoned`/archive 位置未移动。
