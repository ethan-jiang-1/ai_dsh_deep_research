---
topic: P2 新 run 契约
intent: 记录 run.md 状态头、contract epoch 与模板/门禁/创建程序的最小落地及验收证据
---

# P2：新 run 契约（run.md + contract epoch）

> 消费者：[_backlog/issues/2026-10-23-run-bundle-agent-state-and-read-chain.md](../../../_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)
> ｜ 2026-10-23 ｜ **只对新 run 生效；旧 bundle 无 run.md = epoch 豁免**，不迁移、不补文件。

## 1. 落地

| 面 | 改动 |
|---|---|
| 模板 | 新增 `research-workspace/templates/run/run.md`（5 键：contract / phase / next / delivered / parked）；经 `dev/sync-pack-workspace.mjs` 同步到 pack `workspace/` 种子 |
| 创建程序 | lead `research-brief` skill 新增第 4 步“建状态头”：新建 run 时落 `run.md`（contract=当天、phase=briefing、next=HITL1） |
| 断代 | `schema-scan-core.contractEpochOf`：run.md 的 `contract` 优先；无 run.md 回退 `deliveryDate`（旧场）；run.md 在场但 contract 非法 = 空串（新契约、交门禁判红） |
| 门禁 | `node-gate-contracts.isPreContract` 用 epoch；`schema-scan` 在 run.md 在场时校验 contract/phase/next；`workspace-contract` 从六件模板扩到 `templates/run/` 全表（含 plan.md、run.md） |
| 反证 | `tests/run/node-gate-contracts.test.mjs` 3 例（epoch 优先 / 无 run.md 回退 / 非法 contract 不回退）；`tests/run/schema-scan.test.mjs` 增一例非法 run.md；`gates-cases` 增 run.md 缺失案例 |

## 2. 验收（2026-10-23）

- `pnpm verify`：**全绿**（`workspace-contract` / `pack-workspace-fresh` / `gate-ledger-sync` 均过）。
- `pnpm test`：**665 pass / 0 fail**（+4 条新断言）。
- `node scripts/smoke/gates-smoke.mjs`：**全绿**（77 个注入案例，含新增 `workspace-contract-run-template-missing`）。
- 旧场：53 个 bundle 无 `run.md`；`contractEpochOf` 返回 null，`schema-scan`/`isPreContract` 仍走 mtime，不追溯判红；旧 bundle 零写入。
- 未跑：L1/L2、snapshot 重录（本阶段未改手册文本；P7 统一）。

## 3. 边界与后续

- `run.md` 的 `phase` 闭集 = briefing / research / synthesis / review / delivery / accepted / parked；
  `next` 必须可执行；`delivered`/`parked` 非该阶段写 none。
- 门②/③ 仍读旧文本/日志（P3 改为 `deliverables/presented` / `user-question-reply`）。
- 观察面仍按位置三回退（P4 改为内容判态）。
- 手册/NODES 仍无 run.md 读序（P7 批量，一次 snapshot 重录）。
