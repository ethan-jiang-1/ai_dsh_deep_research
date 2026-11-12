---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-080：snapshot-replay research-face B 层基线缺 Team Lead/Team 工具 schema——12 项红（既有漂移，非 D50）

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 根因已证：当前 `deep-research` profile 含
> agent-team-profile 层（D16/D41），每个 root agent 都拿到 `team:identity`「You are the Team Lead」与 8 个
> Team 工具；research-face 的录制基线来自不含该组合的旧窗口。修复 = 用当前 profile 重录 4 角色 +
> 更新 `snapshot.json` source 身份 + 复核 C 金标准；不碰产品代码。
>
> 修复证据（2026-11-12）：4 角色 fixture 重录；source 更新为 HEAD `27a6fdd7…` / pin `b830ec95…`；
> `snapshot-replay-smoke --face research-face` **ALL PASS**（C 金标准 `--update-expected`，diff 仅检索词/活动行文案）；
> `pnpm test` / `pnpm verify` 绿；snapshot diff 无产品代码。审查：机械门禁 + snapshot diff 语义自审。
> 补充（2026-11-12）：重录后 `replay-fixtures` 的 BUG-019 守卫先红——新 fixture 无 `list_mcp_resources`，而 mirror patch 无 mcp 行（MCP_PLAYWRIGHT=0 形态）。修法 = 场景声明 `mcp: false` + `replay-fixtures` 条件守卫（`mcp:false` 时要求无 MCP 组）；`replay-scene` 校验非 bool；`pnpm test` 1289 pass。
>
> 位置：`snapshots/replay/research-face/`（fixture + `snapshot.json`）；
> 复核命令 = `source dev/env.sh && node scripts/smoke/snapshot-replay-smoke.mjs --face research-face`。

## 症状

`snapshot-replay-smoke` 在 research-face 上报 **12 项红**（lead / scout / analyst / critic 各 B·persona、
B·headers、B·runtime-context），A 层回放与 C 层渲染不红。差异首行：

- persona expected 从研究报告纪律开始；actual 以 `You are the Team Lead named "lead"` 开始；
- headers expected 的工具表无 Team 工具；actual 含 `spawn_teammate` / `team_task_*` / `wait_agent` 等；
- runtime-context 同样多出 Team Lead 注入。

`research:defaults` 段**不在** diff 中；D50 改动没有进入这 12 条差异。

## 根因（已证）

- 当前 dev `deep-research` profile 组合含 `agent-team` / `tool-agent-team` 行（D16；release 形态 D41），
  团队层在 profile 级启用；所有 root preset（lead/scout/analyst/critic）都会看到 Team 身份与工具。
- research-face 的 `source` 记录 = 2026-11-11 / `codeAnchor bd7159c…` / `vendor b830ec9…`，其录制
  窗口不含 Team Lead 注入（fixture 的 `system/message` 与 `request/header` 无 Team 面）。
- 场景声明 `profile: deep-research` 与当前 profile 组合不一致；这是**基线陈旧**，不是回放器/产品代码
  在本轮改坏。旧 fixture 仍能回放（A 层绿），但 B 层按当前组装面比对必然红。

## 修法

1. 备份并删除 4 个旧 fixture（`snapshots/replay/research-face/session.v4.jsonl`、
   `scout|analyst|critic/session.v4.jsonl`；tracked 文件可用 `git checkout --` 回滚）。
2. `source dev/env.sh`，用当前 dev profile 逐个重录：
   `node --import tsx/esm dev/record-role-fixture.mjs --role lead|scout|analyst|critic`
   （lead 探针含真实 web_search/fetch；其余零工具；录制品人审后入库）。
3. 更新 `snapshot.json` 每个 case 的 `source`：`codeAnchor` = 当前 HEAD（工作树含 D50/探针改动时在
   note 写明 working tree）、`vendor` = 当前 pin `b830ec950f…`、`recordedAt`、`recording: live`；
   note 写明「Team Lead/Team tools baseline re-record」。
4. 跑 `snapshot-replay-smoke --face research-face`；A/B 应绿；lead C 若因真实检索内容变化而红，
   用 `--update-expected` 重写 C 金标准并人审 diff（只许重写，不放宽比对）。
5. 全量 `pnpm test` / `pnpm verify` 绿；snapshot diff 只含 fixture/expected/source，不含产品代码。

## 修复判据

- [x] 4 个 fixture 已用当前 profile 重录，`snapshot.json` source 身份已更新。
- [x] `snapshot-replay-smoke --face research-face` **ALL PASS**（A/B/C；若 C 重写，diff 已人工复核）。
- [x] `pnpm test`、`pnpm verify` 绿；`git diff --stat` 只含 `snapshots/replay/research-face/**`（+ 本卡/Note/索引）。
- [x] 重录成功（若失败则本条不勾；实际已成功）或模型/凭据不可用：卡停在 `修复就绪` 或 `修复落地` 并如实记证据，不冒充已修。

## 不证明

- 不证明 Team Lead 注入本身的行为正确（那是团队层合同，另案）；
- 不证明 `research:defaults` 的模型行为（由 `probes/behavior/defaults-probe.mjs` 与 Note 承担）；
- 单场重录不证长上下文稳定。
