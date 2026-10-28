---
topic: P7 手册文本批与快照重录
intent: 记录 D28 手册/NODES 文本批、行预算升顶、四角色快照重录与 L1/preset-smoke 的验收证据
---

# P7：手册文本批 + 快照重录

> 消费者：[_backlog/issues/2026-10-23-run-bundle-agent-state-and-read-chain.md](../../../_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)
> ｜ 2026-10-23 ｜ **所有手册文本一次落**，只付一次 snapshot 重录；旧 bundle 不参与。

## 1. 手册 / NODES 文本批（D28）

| 文件 | 改动 |
|---|---|
| `research-workspace/AGENTS.md` | 目录树增 `run.md`/`provenance/`/`delivered.json`/`manifest.json`/`_abandoned`；plan 在场时须 `## 剩余工作`；journal 方向头；review 终局块；final/vN 交付；新增「状态头、读序与恢复」「交付与审查终局」「来源证明」三节；完成判据改为 final/vN + presented + delivered/acceptance |
| `research-workspace/NODES.md` | 状态合同指 D28/手册读序；plan 可选加速器 + 剩余工作；review 终局块；交付输出 = final/vN + presented + audit + ops 回执 |
| 模板 | `templates/run/run.md` 已在前；模板计数七→八 |
| 预算 | 手册 **15,274 B / 190 行**；字节仍 ≤ 16,384−1,024 余量；行预算 127→200（`scripts/doc-budgets.json` 登记理由：注入载荷、部署态无 docs 可下放，字节合同才是真实闸门） |

`node dev/sync-pack-workspace.mjs` 同步 12 文件 → pack 种子；`pack-workspace-fresh` 绿。

## 2. 快照重录（真模型档）

手册是模型可见输入，B 层按预期先红：4 角色 `B·agent-instructions` 全部 FAIL（差异 = 新增“位置=操作桶”行）。

重录（`source dev/env.sh`）：

```sh
# 先备份旧 fixture 到 /tmp/snapshot-backup-20261023，再删旧文件（记录器拒绝覆盖）
node --import tsx/esm dev/record-role-fixture.mjs --role lead
node --import tsx/esm dev/record-role-fixture.mjs --role scout
node --import tsx/esm dev/record-role-fixture.mjs --role analyst
node --import tsx/esm dev/record-role-fixture.mjs --role critic
```

- 4 角色均「回合落定（MCP 组在场 + 哨兵在场 + 日志静默）」，写入新 `session.v4.jsonl`。
- `snapshot.json` 的身份：`codeAnchor: unknown-historical`（录制输入含未提交变更，HEAD 不一致；
  如实标记，不猜填）、`vendor: 687f282e…`、`recordedAt: 2026-10-23T06:20:00Z`、`recording: live`。
- `node scripts/smoke/snapshot-replay-smoke.mjs`：A/B 全绿；lead C5 仅一条活动行措辞变化
  （旧 “I'll run the probe exactly…” → 新 “探针完成：用 web_search 搜索了…”）；`--update-expected`
  重写金标准后 **ALL PASS**。人审判定 = 结构未变、仅新录制的模型措辞，接受。
- `node scripts/smoke/preset-smoke.mjs`：预检绿（四角色 preset/skills 在位）。

## 3. 验收

- `pnpm verify`：**全绿**（含 `handbook-budget` / `pack-workspace-fresh` / `doc-budgets`）。
- `pnpm test`：**677 pass / 0 fail**。
- `snapshot-replay-smoke`：**4 场景 ALL PASS**（含重写后的 lead C5）。
- `preset-smoke`：预检绿。
- 旧 bundle：未读、未写、未作为 P7 验收对象；用户 2026-10-23 告知旧 run bundle 已清，
  本文件不再依赖它们。

## 4. 未跑 / 边界

- **正式 lead 盲测**未跑成：run 通道 3083 的 lead 会话两次在 5 个工具调用后 `max-tokens` 结束、
  无 assistant 文本；baseline 已用 subagent 完成 4/4（见 [P7 baseline](2026-10-23-p7-blind-baseline.md)）。
  P8 需另跑正式 lead 或如实保留该限制；不能把 subagent baseline 冒充 lead 验收。
- L2 安装验收、client-load-smoke：P8 非回归矩阵。
- 旧样本已清，P8 正式验收应用**新 run / 当前在飞 run**；旧样本 4/4 只说明“旧事实够用”，
  不能证明改手册后变好。
