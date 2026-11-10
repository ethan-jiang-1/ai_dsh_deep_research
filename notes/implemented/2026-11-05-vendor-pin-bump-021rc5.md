# vendor pin 升到 dsh-v0.2.1-rc.5——兼容带扩到 rc.5 与用户形态证据

> 状态：implemented

## 决定

`vendor/dsh` 从 `687f282e86`（`dsh-v0.2.1-rc.2`）升到 `b830ec950f`（`dsh-v0.2.1-rc.5`；19 commits /
667 files）。pack 的 `engines.dsh` 由 `>=0.2.1-rc.2 <=0.2.1-rc.3` 放宽为 `>=0.2.1-rc.2 <=0.2.1-rc.5`，
pack README、安装手册、驾驶舱兼容行与 [triggers](../../_backlog/triggers.md) 同步。

结论：rc.5 与包兼容——真实用户形态安装（全局 `dsh 0.2.1-rc.5`）+ 首屏 StartCard + client-load +
L4-lite 全绿。triggers 原先登记的「rc.5 首屏冒烟失败」在 rc.5 基线 + 当前 pack 上不再复现。
`rc.4` 在区间内但未单独取证，文档如实登记（不把区间当逐版证据）。

pin 身份四处（submodule gitlink / 根 [AGENTS §DSH 源码表](../../AGENTS.md#dsh-源码机制权威在哪) /
[evaluation §L0 vendor-pin](../../docs/evaluation.md) / pack `engines.dsh`）同变更落定；`_backlog/_archived/`
的历史 pin 提及按 `pin-agreement` 去字面量。上一轮 bump = [021rc2](../archived/2026-10-19-vendor-pin-bump-021rc2.md)。

## 输掉的方案

- **只放宽 engines、不升 vendor**：dev 基线与用户运行时继续分叉，机制核对拿不到 rc.5 真实源码；
  engines 声明还会超出基线证据面。
- **保持 rc.2 基线、把 rc.5 留给用户**：用户面继续被版本门拒绝（本轮起点即全局 rc.5 装不上），
  每次验证都要先走 exact-version 豁免。
- **用 exact-version 豁免装 rc.5 当「支持」**：豁免是风险接受，不是支持声明；用户安装仍会被拒。
- **重录 snapshot 时只改 B 基线、削减判据**：违反 snapshot 判据集不可削减（BUG-018）。

## 实际跑过的验证

- L0：`pnpm verify` 全绿；`pnpm test` 1038/1038。
- L1：`preset-smoke`（真挂载档）绿。
- L2：`install-shape-smoke` ALL PASS——全局 `dsh 0.2.1-rc.5` 真实用户形态（profile init → tarball
  `plugin add` → team 层 rc.5 → 真启动，roster 三态齐）；`product-boot-smoke` GREEN——首屏品牌 /
  Lead preset / 工作区标题 / StartCard 三步全过（2026-11-03 记录的三项失败已恢复）。
- `client-load-smoke` ALL PASS（观察面 client 真浏览器加载、页签与终稿面）。
- `l4-lite-smoke` ALL PASS（5 角色 assistant 响应 + scout `web_search` 工具调用真实发生）。
- snapshot：`snapshot-replay-smoke` ALL PASS——research-face 4 场景真模型重录（lead / scout /
  analyst / critic），`snapshot.json` 场景身份（`vendor` / `recordedAt` / `codeAnchor`）同步；
  C 金标准按真实回放重写 1 行（模型结果数 8→10），未削减判据面。
- run 通道：`boot-run` 重建 profile（team 层 = rc.5）→ `run-driver up` GREEN（镜像一致 + 宿主挂载 +
  首屏无遮挡 + 研究状态页签 + 零 console 错误）。
- 逐源重审：根 `AGENTS.md`、`docs/{AGENTS,testing,architecture}.md`、`scripts/AGENTS.md`、
  `packages/{AGENTS,README}.md` 与 rc.2 逐文件 diff 为空；`packages/experimental/agent-team*` 四包仅
  `package.json` 版本 bump（源码零变化）；新增 vendor notes（plugin-entry-customization /
  new-session-blank-reuse-by-preset / deepseek-official-model-listing）登记为 rc.5 的行为面变化。
- 环境状态：`dev/vendor-build.sh --clean` 完成（⑥b 入口产物断言全部落地、⑦⑧ 通过）；vendor 内
  `install-lefthook` postinstall 因 submodule 的 `core.worktree` git config 失败，不参与本仓 hooks，
  构建与门禁不受影响；根 `pnpm-lock.yaml` 按 rc.5 workspace 重解析（registry 依赖改为 vendor link）。
- 外部语料：`_digested/test-strategy` 与 `_dsh_plugin_agent_ready_development` 自钉旧 pin，按规矩标
  「待复核」。
