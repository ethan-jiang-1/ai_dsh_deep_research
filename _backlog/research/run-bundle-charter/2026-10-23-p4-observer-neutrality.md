---
topic: P4 观察面与位置中立
intent: 记录三操作桶观察、run-state 跨桶落定、门禁默认只读与 run-accept 显式写盘的落地与验收
---

# P4：观察面 / 位置中立

> 消费者：[_backlog/issues/2026-10-23-run-bundle-agent-state-and-read-chain.md](../../_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)
> ｜ 2026-10-23 ｜ D28 只约束未来 run；旧 bundle 只读、零改写。

## 1. 落地

| 面 | 改动 |
|---|---|
| 多 run 总表 | `run-dashboard` 的 `SCENE_ROOTS` 增 `_abandoned/`（label `drt·停放`）；`isParkedScene` 与 `isArchivedScene` 分桶标注，stdout 不再把桶当“在飞/已交付” |
| 会话状态 | `run-state` 增 `bundleDirOf`（根 → archive → _abandoned，根优先）；`runStateOf` 的 `finalWritten`/`runSettled` 跨三桶判，归档/停放不再“final 恒 false”；新增 `bundleLocation` 字段 |
| watch-run | 超时提示改为“先查日志回退/绑定；归档/停放不再是 final 恒 false 的原因（D28）” |
| 驾驶舱 | `ResearchStatusTab`/`ResearchConfigTab` 注释改为 D28 三操作桶 + 内容判态；行为不变（本来就三位置回退） |
| 门禁默认只读 | `node-gate`/`evidence-audit` 默认**不写**报告；`--write` 才落盘；`--no-write` 显式只读（兼容 run-accept 预检） |
| run-accept | 预检 `--no-write`，绿后给两门 `--write` 落盘，再写 `delivered.json`/`acceptance.md`；红跑零写 |
| 文档 | guides/60、guides/61、project-map、scripts/README 的命令/职责同步“默认只读、`--write` 才写” |

## 2. 验收（2026-10-23）

- `pnpm verify`：**全绿**。
- `pnpm test`：**673 pass / 0 fail**（新增 run-state archive 跨桶落定 + dashboard 桶标签各 1 条）。
- **默认只读实测**：复制 `fixture-hitl2-missing` 到 `/tmp`，跑 `node-gate`（无 `--write`）→ exit 1，bundle **无** `node-gate.md`；跑 `evidence-audit`（无 `--write`）→ exit 0，**无** `audit.md`。
- **run-accept 绿跑**：`/tmp` 构造 `drt_x`（run.md + final/v1 + review PASS + 结构化 audit + lead 日志含 HITL1 ask / HITL2 ask+reply / presented）→ exit 0，写 `node-gate.md`、`audit.md`、`delivered.json`、`acceptance.md`；`present` 指针 = `drt_x/final/v1.md`。
- 旧场：53 个 bundle 零写入；旧测试 71 条 node-gate 全绿（无 run.md 走 epoch 兼容）。

## 3. 未跑 / 边界

- `client-load-smoke` 未跑（本轮只改驾驶舱注释，未改行为；P8 非回归矩阵会跑）。
- L1/L2、snapshot 重录：P7。
- 盲测 baseline：仍未跑；最迟 P7 前。
- `run-accept` 的 `--archive` 仍移动 bundle；归档是操作桶，不改变状态（D28）。
