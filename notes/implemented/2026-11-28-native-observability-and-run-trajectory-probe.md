# 继承 DSH 原生可观测能力与多角色研究轨迹诊断探针

> 状态：implemented

相关背景：归档问题卡 [2026-11-28-runtime-logging-and-run-trajectory-probe](../../_backlog/_archived/settled_issues/2026-11-28-runtime-logging-and-run-trajectory-probe.md) · 前序探针治理 [probe-surfacing](2026-11-10-probe-surfacing.md) · 实证复盘 [run-fidelity-and-gate-accuracy-fixes](2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)。

## 决定

完全继承 DSH 原生可观测底座（`ctx.logger` / `inspector-profile` / `/export` / `subagent/catalog` & `team/member` 事件），按「宿主原生留痕 + 深研域多角色轨迹体检 + 原生优先排障路由」三件套落地，不自造第二套日志系统、不新增运行时依赖：

1. **宿主热路径原生 `ctx.logger` 留痕（零新依赖、全脱敏）**：
   - [`packages/deep-research-pack/src/fetch-fallback/orchestrate.ts`](../../packages/deep-research-pack/src/fetch-fallback/orchestrate.ts) & [`index.ts`](../../packages/deep-research-pack/src/fetch-fallback/index.ts)：导出 `sanitizeUrlForLog`（剥离 query、fragment、userinfo），在本地抓取失败/超时/非 2xx 回退路径输出单行 `[deep-research:fetch-fallback] event=<local_aborted|fallback_skipped|fallback_ok|fallback_fail|fallback_unavailable> ...`。
   - [`packages/deep-research-pack/src/defaults/command.ts`](../../packages/deep-research-pack/src/defaults/command.ts) & [`index.ts`](../../packages/deep-research-pack/src/defaults/index.ts)：导出 `formatDefaultsCommandLog`，对写盘变更（`set`/`unset`/`clear`）输出 `info`，对校验拒绝或读写失败输出 `warn`，只读 `show` 成功保持零噪静默。
   - [`packages/deep-research-pack/src/method-library-tool.ts`](../../packages/deep-research-pack/src/method-library-tool.ts)：为 `method_library_upsert` / `method_library_set_default` / `method_library_remove` 统一包装 `[deep-research:method-library]` 留痕（成功 `info`，抛错前 `warn`），保留原有工具结果供原生 `Session Inspector` 查看。
2. **多角色研究轨迹一键体检取证件（`show` 面）**：
   - [`checks/lib/analyze/run-trajectory-core.mjs`](../../checks/lib/analyze/run-trajectory-core.mjs)（纯核，零 IO，keyless 直测）：从 DSH 原生 `subagent/catalog` 与 `team/member` 事件精确识别子会话，汇总 Lead→子会话树成本/步数/缓存命中/技能总账，检出 5 类深研域非确定性 Smells（`missing-skill` / `fetch-anomaly` / `orchestration-drift` / `write-conflict` / `count-mismatch`）外加 `missing-child`，并支持按 run 时间窗切片 `$STATE_DIR/web.log` 中的 `[deep-research:*]` 行。
   - [`probes/analyze/run-trajectory.mjs`](../../probes/analyze/run-trajectory.mjs)（CLI 壳，登记在 [`probes/INDEX.generated.md`](../../probes/INDEX.generated.md)）：支持 `<bundle|leadSessionId>` 与 `--dir <原生 /export 解压目录>`（同时兼容 `.jsonl.zstd` 与 `.jsonl`），可选 `--web-log <path>` 与 `--json`，不替代 `checks/run-gates/` 的交付放行裁决。
3. **诊断路由文档**：
   - 在 [`docs/guides/probe-playbook.md`](../../docs/guides/probe-playbook.md) §2.1 与 [`docs/guides/run-ops.md`](../../docs/guides/run-ops.md) §9 补齐「症状 → DSH 原生能力（`$STATE_DIR/web.log` / 按需本地 `inspector-profile` / `/export`）→ 本仓 `probes/analyze/`」查表。

## 输掉的方案

- **自造 `rotating-log.ts` 与私有 `research-host-events.jsonl`**：在 DSH 已有 `ctx.logger` + `$STATE_DIR/web.log` + 会话日志导出链路之外制造第二事实源与额外轮转维护成本，违反不重复造轮子原则。
- **在 `deep-research-pack` 业务包引入 `@deepseek-ai/dsh-experimental-inspector` 依赖或影子类型**：把实验态调试工具耦合进发布包依赖面；改为需要深度网络抓包或 Cordis 树检查时由开发者在本地按需启用官方 `inspector-profile`。
- **把开发者 Smells 推送至面向最终用户的驾驶舱 UI**：非确定性工程告警对研究读者是噪音；保持 `probes/analyze/` 只读 CLI / JSON 出口。
- **在探针内自写 ZIP 解压器**：直接复用操作系统解压后的原生 `/export` 目录（`--dir`），零依赖即可离线分析。

## 判据形状

- **权威事实**：DSH 原生 `session.v*.jsonl[.zstd]` 事件流（含 `subagent/catalog`、`team/member`、`tool/call`、`tool/result`、`goal/change`）、原生 `ctx.logger` 输出（`$STATE_DIR/web.log`）与 bundle 盘上文件（`evidence/*.md`、`review/verdicts-r*.json`）。
- **读取方**：`probes/analyze/run-trajectory.mjs`（人读摘要 + `--json` 机读，面 = `show`），纯核由 [`tests/run/analyze/run-trajectory.spec.mjs`](../../tests/run/analyze/run-trajectory.spec.mjs) 直测。
- **坏输入**：目标 bundle / session / `--dir` 不存在或根日志不可读 → exit 2（fail-loud）；原生 `subagent/catalog`/`team/member` 声明的子会话缺盘或不可读 → 显式产出 `missing-child`（不静默跳过）；`--web-log` 路径不存在 → 标 `web-log: absent` 并继续输出轨迹（不冒充 0 条日志）。
- **旧形态**：兼容既有 `drt_*` bundle 与 v4 会话日志，零迁移成本。
- **反证**：宿主三模块单测覆盖成功/失败/跳过分支及 URL query/userinfo 脱敏；轨迹纯核单测覆盖干净负控、全部 5 类 Smells 正控、`missing-child`、原生子会话提取抗网页随机 UUID 干扰与 `web.log` 时间窗切片；真实档案与局部 `--dir` 实跑验证端到端检出。

## 实际跑过的验证

- **构建与发布面**：`pnpm build && node tools/release/export-dist.mjs` → `export-dist: 全绿`（`dsh-deep-research-pack-0.3.8.tgz` 88 条目，无新增 peer/dependency）。
- **静态检查与全仓门禁**：
  - `source tools/env.sh && pnpm typecheck`（`tsc -b packages/deep-research-pack` + `tsc -p tsconfig.scripts.json`）→ exit 0；
  - `pnpm lint`（`oxlint packages/deep-research-pack/src`，154 files）→ 0 warnings / 0 errors；
  - `node probes/_index.mjs --check` → `probe-index: 一致（19 支）`；
  - `source tools/env.sh && pnpm verify` → `verify: 全绿`（62/62 门禁通过，含 `pack-bundle-compat`、`row-deps`、`probe-registry`、`dist-freshness`、`backlog-liveness`、`md-links`、`doc-budgets`）。
- **Keyless 回归与契约**：
  - `source tools/env.sh && pnpm test:spec` → 1791 / 1791 PASS（含新增 `fetch-fallback` / `defaults` / `method-library-tool` 原生 `ctx.logger` 留痕与脱敏单测、`tests/run/analyze/run-trajectory.spec.mjs` 4 组正反例）；
  - `source tools/env.sh && pnpm test:checks` → 281 / 281 PASS（含 `scripts-typecheck`、`checks/README` 消费列对账、维护层 550 行上限、`tests/INDEX.generated.md` 与 `asset-ledger` 对账）。
- **真实档案与故障态实跑（只读）**：
  - `source tools/env.sh && node probes/analyze/run-trajectory.mjs research-workspace/drt_huawei-ascend-dd` → exit 0，完整还原 8 会话（Lead + 7 子会话，351 步，601 工具调用，cacheHit=98.0%），自动检出 20 条 Smells（Lead 未载 `synthesis`、4 处 ~10s `WEB_ABORTED`、3 处 HTTP 200 GBK `\ufffd` 乱码、PDF 与跨源重定向、`task-8/9/10` 未闭合、同 step 并发 `subagent`、`wait_agent` `no-active-peer`、`journal.md`/`readiness.json` 写冲突、终交付 48 vs 49 与 8/3 vs 7/3 计数失真）；
  - `leadSessionId` 直跑 → exit 0（8 会话）；局部单会话 `--dir` 实跑 → exit 0 且显式产出 7 条 `missing-child` 告警；缺席 `--web-log` → 标 `web-log: absent`；无参数或不存在目录 → exit 2（fail-loud）。
- **未跑项（显式声明）**：未起真模型实网 run 验证实时 `$STATE_DIR/web.log` 输出与 `inspector-profile` GUI 挂载（留待下一次真模型 run 自然验证；宿主日志接线由单测与 `pnpm build` 覆盖，不冒充已跑真模型）。
