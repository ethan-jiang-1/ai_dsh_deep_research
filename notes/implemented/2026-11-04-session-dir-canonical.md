# 会话目录发现收进 canonical session-log

> 状态：implemented

## 决定

`sessionDirOf` 的双形态目录发现（`session-<id>` 优先，其次裸 `<id>`；组按 `readdirSync` 序首匹配）
收进 [scripts/lib/session-log.mjs](../../scripts/lib/session-log.mjs) 的 `findSessionDir` /
`readSessionTextOf`，六个真模型档消费方改为 import：

- `scripts/smoke/l4-lite-smoke.mjs`
- `scripts/smoke/team-preflight-smoke.mjs`
- `scripts/probe/discipline-probe.mjs`
- `scripts/probe/method-library-probe.mjs`
- `scripts/probe/entry-chain-probe.mjs`
- `scripts/probe/rerun-triage-probe.mjs`

这**部分取代**了 [2026-10-16 round3 Note](2026-10-16-structure-round3-harness-convergence.md)
里“`sessionDirOf` 保留本地”的决定；该篇已加历史注记。`readSessionLog` 换 canonical
`resolveSessionLog` + `readSessionText` 的旧结论不变。

为什么现在重开：当时保留本地的约束是“不为收敛改语义”，且 canonical 没有目录发现函数。
到 2026-11-04，副本从 5 份变成 6 份，`rerun-triage-probe` 那份甚至少了根目录存在性检查——
继续保留的成本已从“重复”变成“同类实现开始漂移”。新函数逐字保留双形态/首匹配语义，
不改日志代际选择、不改解压通路；`readSessionTextOf` 的缺件返回 `''` 与六个消费方的既有契约一致。

顺手删除 `entry-chain-probe.mjs` 里已不再调用的 `decompressLog` 与 `node:zlib` 导入
（上一轮迁移后留下的死码）。

## 输掉的方案

- **保持六份本地副本**：旧决定可以维持，但第 6 份的漂移证明“逐份复制”不会自我约束；
  下次再加一个探针又会复制一份。
- **把目录发现也塞进 `sessionLogsInGroup` 的既有遍历**：需要调用方先知道组，不能回答
  “只给 session id 找目录”这个现有需求；会迫使消费方复制组遍历。
- **改日志选择语义（首匹配 → 代际优先）**：这是 2026-10-16 已否决的行为变化，不在本轮
  范围内；本轮只抽目录发现，`resolveSessionLog` 仍由 canonical 负责。
- **新建一个独立 lib 模块**：单函数缝不值得新增模块；`session-log` 已经是日志定位的 owner。
- **每个消费方保留本地包装、只共享底层扫描**：仍会留下六种注释/边界差异，正是要消灭的漂移面。

## 实际跑过的验证

- 先加 `tests/run/session-log.test.mjs` 两态（形态优先、缺件），实现前 import 红：
  `SyntaxError: ... does not provide an export named 'findSessionDir'`；实现后 5/5 绿。
- `pnpm test`：1032/1032 绿（新增 2 条 `findSessionDir` / `readSessionTextOf` 测试）。
- 六个消费方 `node --check` 全绿；`grep -rn "const sessionDirOf" scripts dev tests` 零命中。
- `pnpm verify`：G2 改动后全绿（README lib 行、md-links、note-format 同 diff）。
- **未跑**：六个真模型档脚本的真实会话（`l4-lite` / `team-preflight` / `discipline-probe` /
  `method-library-probe` / `entry-chain-probe` / `rerun-triage-probe`）。本轮改动是纯函数提取 +
  import 替换；目录发现由 `session-log.test.mjs` 直测覆盖，日志选择/解压仍走原 canonical。
  未跑 ≠ 通过，提交时按此分列。

## 环境状态

- 新增两个 canonical 导出：`findSessionDir(sessionsRoot, sessionId)`、`readSessionTextOf(sessionsRoot, sessionId)`；
- `scripts/README.md` 的 `session-log` 行同步说明；消费者名单无需新增（六处均已在列）；
- 旧 Note 状态行下的历史注记与本文互链；无新增门禁、无 gate 台账变更。
