# 交接缺口收口：0.3.2 发布身份、源码首跑路径与常驻面预算

> 状态：implemented
> 历史注记：0.3.2 发布锚；现行发布身份 = [2026-11-13-handoff-evidence-closure-0.3.3](2026-11-13-handoff-evidence-closure-0.3.3.md)。

## 决定

0.3.1 的 tarball 在 tag `0.3.1`（`b767d728`，2026-11-11）之后构建，且含 tag 外的 D50；HEAD 又前进 30 个 commit。三者同叫 0.3.1，用户无法从版本号或手册 sha 辨别。下一个本地 tarball 定为 **0.3.2**：root/pack 同 diff 升版，`node scripts/dist/export-dist.mjs` 从 HEAD 重导出 tarball、安装手册与 market；annotated tag `0.3.2` 指向本变更 commit；0.3.1 制品不重发。发布形态仍是本地 tarball / npm staged（D42 不变）。

根 README 的源码交付行改为链到 CONTRIBUTING 的 `## From source to first run` 节：clean clone 没有 `_dist/*.tgz`，四段命令 = clone → install + vendor-build → export-dist → profile/团队层/启动；手册“tgz 与本手册同目录”只在交付目录成立，源码路径单独写明。

新增两条常驻面回归：`LEAD_PERSONA_MAX_CHARS` / `RESIDENT_TOTAL_MAX_CHARS` 住 `scripts/lib/content-budget.mjs`，由 `tests/pack/content-disclosure.spec.mjs` 把守；`tests/checks/release-copies.test.mjs` 扫 live 安装文档的版本与 tarball 名，旧副本即红。`product-boot.entry` 改为等 `[data-testid="deep-research-start"]` 再读 body，消除异步起步卡抢读的假红。

## 输掉的方案

- **重导 0.3.1**：tag 0.3.1 已占用；同版本替换制品违反 [guides/64](../../docs/guides/64-release-versioning.md) “发布后发现缺件发新 patch”，且 tag 与 tarball 继续错位。
- **只重导 0.3.2、不 tag**：制品可复现但发布锚仍缺；`release-check` 停在“未打 tag”，下一个接手者仍要猜。
- **只补 README 一行**：clean clone 在 `pnpm install` 后仍缺 vendor 构建与 export 步骤；聊天里的修复不能替代可执行路径。
- **只加常驻预算测试、不改文档**：版本副本仍可由手工改 README 漂移；发布身份与文档副本必须同 diff 守。
- **保留 product-boot 的立即读 body**：异步起步卡在慢机上必假红（本次实测 3 处失败），测试竞态会被误判成产品回归。

## 实际跑过的验证

- `node scripts/dist/export-dist.mjs` → 全绿：`pnpm build` exit 0；185 条目；preset 行 5/5；skill 15；模板 11；手册 0.3.2 / 2026-11-13；`_dist` 只留 0.3.2 tgz。
- `node scripts/smoke/lifecycle.entry.mjs` → ALL PASS：market staged、tarball locale/icon、profile 初始化、装 tarball、dump 10 行、真启动 token URL、五个 specifier 中英标题/图标、remove 后 roster 回落。
- `node scripts/smoke/install-shape.entry.mjs` → ALL PASS：profile 初始化 → 装 pack → 装团队层 → 真启动无 `did not activate`。
- `node scripts/smoke/product-boot.entry.mjs` → RED（3 处起步卡）→ 加显式等待 → GREEN：Orca / Lead / 工作区标题 / 起步卡三行 / session cwd / preset。
- `pnpm verify` → 全绿（含 `release-version` / `dist-manual-version` / `dist-tarball` / `dist-manual-fresh` / `md-anchors` / `doc-budgets`）。
- `pnpm test` → 1,404 pass / 0 fail / 0 skipped / 约 3.9s（新增 `release-copies` + persona 预算；红证：persona 预算改 1 → `lead persona 5,760 > 1` 红；README 改 0.3.9 → `release-copies` 两测红；还原绿）。
- `pnpm typecheck` → exit 0。
- `node scripts/dist/release-check.mjs` → 打 tag 前 OK `version=0.3.2`（HEAD 未打 tag）；打 tag 后复跑结果见交付报告。
- 工作区收口：`_dist` 旧 0.3.1 tgz 由 `export-dist` 清理；`git status` 的提交面 = 本变更文件集，无凭据/运行态。

## 环境状态

macOS；Node 22.23.1；pnpm 11.7.0；全局 DSH 0.2.1-rc.5。0.3.2 tarball 本地生成；annotated tag `0.3.2` 本地创建，未 push、未 npm publish。`client-load.entry` 未跑（本轮 L2 由 lifecycle / install-shape / product-boot 覆盖；client-load 需要 Playwright 健康门与种子 home，另档）。
