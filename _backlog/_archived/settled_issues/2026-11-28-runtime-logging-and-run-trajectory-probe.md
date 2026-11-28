---
status: 已结
opened: 2026-11-28
---

# 推敲：继承 DSH 原生可观测能力与多角色研究轨迹诊断探针

> 立卡：2026-11-28 ｜ 状态：已结 ｜ 类型：Task ｜ 结论倾向：现在做（2026-11-28 用户拍板按 DSH 原生极简 3 件套落地）｜ 可关闭：是
> 去向：implemented — [native-observability-and-run-trajectory-probe](../../../notes/implemented/2026-11-28-native-observability-and-run-trajectory-probe.md)（业务验收 owner = 用户）

**问题与期望结果：** 2026-11-28 完整复盘真实深研 run `drt_huawei-ascend-dd`（Lead 104 步 + 7 个子会话）时暴露出两大可观测短板：① `deep-research-pack` 宿主热路径（`fetch-fallback`、`/research-defaults`、`method-library`）运行态打点为零，关键状态跃迁与失败现场全靠人工反算日志时间戳；② 现有 [`probes/analyze/`](../../../probes/README.md) 11 支取证件只看单会话尾部与 LLM 流错误，缺少从 bundle / Lead 一键展开整棵多角色树并自动扫**深研域反模式（Diagnostic Smells）**的入口。期望**完全继承 DSH 原生机制、不自造第二套日志/导出设施**，同时补齐「**宿主原生关键状态留痕 + 多角色研究轨迹一键体检取证件 + 遇事如何利用原生工具的诊断路由指南**」，让运行过程该留的痕迹全部留在原生通道内，出问题或跑完后 10 秒内定位现场。
**当前情况：** 已按 DSH 原生极简 3 件套落地交付并通过机械门禁、单测与真实档案实跑验证；毕业 Note 已落盘，本卡同变更归档。伴生实锤的 2 个确定性代码 Bug 已独立记在 [`BUG-488`](../fixed_bugs/BUG-488-fetch-fallback-local-timeout-misclassified-as-web-aborted.md) 与 [`BUG-489`](../fixed_bugs/BUG-489-protocol-audit-full-report-custom-sections-still-red.md)。
**未决问题：** 无（3 个决策分支已于 2026-11-28 拍板收敛：不自造 `rotating-log.ts` / 私有 JSONL、不在业务包耦合实验包 `ctx.inspector`、不造 ZIP 解析器、不把开发者 Smells 推入用户驾驶舱）。
**下一步：** 已结归档。

## 范围与排除项

- **在范围内（原生极简 3 件套）**：
  1. **宿主运行状态原生留痕（~30–60 行，零新依赖）**：
     - 在 [`fetch-fallback/orchestrate.ts`](../../../packages/deep-research-pack/src/fetch-fallback/orchestrate.ts) & [`index.ts`](../../../packages/deep-research-pack/src/fetch-fallback/index.ts)、[`defaults/command.ts`](../../../packages/deep-research-pack/src/defaults/command.ts)、[`method-library-tool.ts`](../../../packages/deep-research-pack/src/method-library-tool.ts) 补齐低噪、结构化（统一 `[deep-research:<module>]` 前缀 + `key=value`、脱敏敏感 query 与凭据）的原生 `ctx.logger.info/warn`，自然进入已有 `$STATE_DIR/web.log` 与 DevTools Console；
     - 凡属会话内工具调用的诊断摘要（如 `method-library-tool` 读写/校验结果），按 DSH 原生规范优先保留在工具结果与 `tool/result.meta` 中，自然随原生 `/export` 与 `Session Inspector` 留存。
  2. **多角色研究轨迹一键体检取证件（`show` 面）**：
     - 新增 [`probes/analyze/run-trajectory.mjs`](../../../probes/analyze/run-trajectory.mjs)（CLI 壳，登记进 [`probes/INDEX.generated.md`](../../../probes/INDEX.generated.md)）+ [`checks/lib/analyze/run-trajectory-core.mjs`](../../../checks/lib/analyze/run-trajectory-core.mjs)（纯核 + keyless 单测）；
     - 输入支持 `<bundle | leadSessionId>`（精准读取 `$DSH_HOME/sessions/` 同 workspace 组）以及 `--dir <解压后的原生 /export 目录>`（同时兼容 `.jsonl.zstd` 与 `.jsonl`）；
     - 输出：① 整棵 Lead → Teammate → Subagent 树拓扑与分角色总账（`turns / steps / wallClock / inTok / outTok / cacheHit / maxContext / loadedSkills / toolErrors`）；② 5 类深研域非确定性 **Diagnostic Smells**；③ 可选 `--web-log <path>` 按会话时间窗关联 `$STATE_DIR/web.log` 中的 `[deep-research:*]` 运行留痕片段。
  3. **遇事如何利用原生工具与探针的诊断路由表**：
     - 在 [`docs/guides/probe-playbook.md`](../../../docs/guides/probe-playbook.md)（并从 [`docs/guides/run-ops.md`](../../../docs/guides/run-ops.md) 链出）补齐「症状 → 第一步用哪件 DSH 原生能力（插件管理器按需开 `inspector-profile` 的 Host `captureFetch` / `Session Inspector` / 原生 `/export`）→ 第二步跑哪支本仓 `probes/analyze/`」实战查表，同时写清 `inspector-profile` 的本地调试安全边界。
- **不在范围内**：
  - **不自造私有日志轮转器与第二事实源**：不写 `rotating-log.ts`，不落私有 `research-host-events.jsonl`，不自写 ZIP 解压器；
  - **不耦合实验调试包**：业务包不增加 `@deepseek-ai/dsh-experimental-inspector` 依赖，不手抄影子 `ctx.inspector` 类型；
  - **不侵入面向用户的驾驶舱 UI**：开发者 Smells 停留在 CLI / Agent 可读的 `probes/analyze/`，不向最终用户界面推送工程告警；
  - **不改 `vendor/dsh/` 与既有裁决面分工**：上游边界现象（GBK 乱码、`http -> https` 判跨源重定向、重复 `Background subagent finished` 通知）只由探针显性标出；交付放行裁决继续归 [`checks/run-gates/`](../../../checks/README.md)；
  - **已实锤确定性缺陷另单修复**：[`BUG-488`](../fixed_bugs/BUG-488-fetch-fallback-local-timeout-misclassified-as-web-aborted.md) 与 [`BUG-489`](../fixed_bugs/BUG-489-protocol-audit-full-report-custom-sections-still-red.md) 独立走 bug 通道，不用探针替代码 Bug 兜底。

## 已知与未决

- **DSH 原生已提供的 5 套可观测底座（全部直接继承）**：
  1. `vendor/dsh/packages/experimental/inspector-profile`（`inspector` + `session-inspector`）：开箱带 Host `captureFetch: true`、Host+Client Console、Cordis 树、Sidebar 原始事件表；
  2. `ctx.logger` + `tool/result.meta` + `SessionEventMap` log-only 事件（见 `vendor/dsh/docs/subsystems/session.zh.md`）；开发态 [`tools/channel/boot-run-body.sh`](../../../tools/channel/boot-run-body.sh) 已将宿主输出 `tee` 到 `$STATE_DIR/web.log`；
  3. `ctx.sessionQuery.traceSession()`（见 `vendor/dsh/docs/subsystems/session-query.zh.md`）+ `dsh-session-log-export`（`/export` 全树 ZIP，`includeDescendants=true`）；
  4. `ctx.sessionProjections` + `dsh-session-stats`（原生步数/耗时/token 折叠）；
  5. `ctx.sessionTelemetry`（全日志透传与错误 severity 预标）。
- **本仓当前零留痕盲区（实查 `packages/deep-research-pack/src/`）**：
  - 仅 [`startup/index.ts`](../../../packages/deep-research-pack/src/startup/index.ts)（8 处）、[`defaults/index.ts`](../../../packages/deep-research-pack/src/defaults/index.ts)（2 处）、[`content/index.ts`](../../../packages/deep-research-pack/src/content/index.ts)（1 处）有启动/降级日志；
  - `fetch-fallback`、`/research-defaults`、`method-library-tool` 运行期全静默。
- **未决项**：无（已于 2026-11-28 全部收敛）。

## 方案与取舍

### 1. 运行状态「该留的痕迹都留」原生留痕矩阵

统一用原生 `ctx.logger`（单行 `[deep-research:<module>] event=<name> ...`，单场研究 <100 行，绝不打印完整正文/密钥/未脱敏 query）：

| 模块 | 必须留下的状态跃迁/结果痕迹 | 级别 | 脱敏/成本约束 |
|---|---|---|---|
| [`fetch-fallback/orchestrate.ts`](../../../packages/deep-research-pack/src/fetch-fallback/orchestrate.ts) & [`index.ts`](../../../packages/deep-research-pack/src/fetch-fallback/index.ts) | `local_fail` / `fallback_start` / `fallback_ok` / `fallback_fail` / `fallback_skipped` / `fallback_unavailable`（记 `host`+去 query 路径、`localCode`/`localStatus`、`localMs`、`remainingMs`、`outcome`、`totalMs`） | `info`（正常回退成功） / `warn`（跳过、无凭据或双腿失败） | 仅记录 `origin + pathname`，剥除 query string 与鉴权头 |
| [`defaults/command.ts`](../../../packages/deep-research-pack/src/defaults/command.ts) | `op`（`get`/`set`/`reset`）、`ok`、`changedKeys`、`reason`、`revision` | `info`（写入成功） / `warn`（校验拒收或写盘失败） | 不打印整份配置敏感值，仅记键名与摘要 |
| [`method-library-tool.ts`](../../../packages/deep-research-pack/src/method-library-tool.ts) | `action`、`entryName`、`ok`、`reason`（并在工具结果中保留结构化状态摘要供 `Session Inspector` 查看） | `info`（变更成功） / `warn`（不存在/校验失败/写盘失败） | 不打印完整方法正文 |
| [`startup/index.ts`](../../../packages/deep-research-pack/src/startup/index.ts) | 保持现有 8 处启动/工作区/会话登记日志，与上述格式风格对齐 | 既有不变 | 无新增 |

### 2. 深研域多角色轨迹体检取证件（`probes/analyze/run-trajectory.mjs`）

- **纯核**：`checks/lib/analyze/run-trajectory-core.mjs`（零外部依赖、keyless 可测）；
- **输入**：`<bundle | leadSessionId>` 或 `--dir <目录>`（同时识别 `session.v4.jsonl.zstd` 与 `/export` 解压后的 `session.v4.jsonl`），复用 [`checks/lib/shared/session-log.mjs`](../../../checks/lib/shared/session-log.mjs)，仅扫目标 workspace 组，不遍历全 `$DSH_HOME`；可选 `--web-log <path>` 按 `[createdAt, lastEventAt]` 窗口关联同期 `[deep-research:*]` 日志行；
- **首版 5 类非确定性 Smells**：
  1. **Skill 漏载**：角色进入关键产出动作前未加载对应约定 skill（如 Lead 写 `findings.md`/`final.md` 前未载 `synthesis`、Analyst 写证据卡前未载 `evidence-extraction`）；
  2. **外部抓取异常聚类**：统计接近 `localTimeoutMs` 的 `WEB_ABORTED`、HTTP 200 高密度 `\ufffd`（疑似 GBK/非 UTF-8 乱码）、`WEB_REDIRECT_BLOCKED`、`WEB_UNSUPPORTED_CONTENT_TYPE`；
  3. **协作与任务漂移**：`goal complete` 时仍处 `pending`/`in_progress` 的 `team_task`、`subagent` 同 step 并行派发、`wait_agent` `no-active-peer` 空转；
  4. **写盘冲突与重试浪费**：`FS_STALE_VERSION` 或「未读先改」错误次数与受影响文件；
  5. **交付叙述与盘上实数对账**：Lead 终交付消息 / HITL2 摘要声称的证据卡数与 `supported`/`partially` 计数 vs `evidence/*.md` 盘上文件数与 `review/verdicts-r*.json` 实际统计。

### 3. 遇事如何利用：实战诊断路由表（落入 `probe-playbook.md` 与 `run-ops.md`）

| 症状 | 第一步：DSH 原生工具 | 第二步：本仓 `probes/analyze/` |
|---|---|---|
| `web_fetch` 慢、超时或回退疑似未触发 | 查 `$STATE_DIR/web.log` 的 `[deep-research:fetch-fallback]`；需看底层 HTTP 包时在插件管理器临时开启官方 `inspector-profile`（`captureFetch: true`，完事关闭） | 跑 `run-trajectory.mjs` 汇总全场抓取错误与 GBK `\ufffd` 乱码 |
| 前端驾驶舱报错、点击无响应或插件状态异常 | 开 `inspector-profile` 按 `Ctrl/Cmd+Shift+.` 看 Host+Client Console 与 Cordis 树 | 跑 [`scene-capture.mjs`](../../../probes/analyze/scene-capture.mjs) / [`session-replay.mjs`](../../../probes/analyze/session-replay.mjs) 留场景包 |
| 单步工具参数/返回或事件序列异常 | Sidebar 打开原生 **Session Inspector** 筛选原始事件并反查 Chat | 跑 [`session-events.mjs`](../../../probes/analyze/session-events.mjs) 或 [`stream-diagnostics.mjs`](../../../probes/analyze/stream-diagnostics.mjs) |
| 整场多角色跑完或卡住需全面复盘 / 异地排查 | Web 端原生 `/export` 下载全树 ZIP 并解压（本机直接指 `drt_<slug>`） | 跑 `run-trajectory.mjs <bundle \| sessionId \| --dir <unzipDir>>` |
| 交付放行最终裁决 | — | 跑 `checks/run-gates/run-accept.mjs <bundle> --no-write` |

## 判据形状

- **权威事实**：
  - 会话树与事件：DSH 原生 `session.v4.jsonl.zstd`（本地持久化）或原生 `/export` 解压目录内的 `session.v*.jsonl`；
  - 宿主运行留痕：原生 `ctx.logger` 输出（开发态落 `$STATE_DIR/web.log`）；
  - Bundle 事实：`research-workspace/drt_<slug>/` 盘上文件。
- **读取方**：`probes/analyze/run-trajectory.mjs`（人类可读摘要 + `--json` 机读），纯核由 `tests/` 下 keyless 单测消费。
- **坏输入**：
  - 目标 bundle / session / 目录不存在或日志不可读 → exit 2（fail-loud，不假装健康）；
  - 引用的子会话文件缺失 → 树视图显式标 `missing-child`（不静默跳过）；
  - 指定 `--web-log` 文件不存在 → 显式标 `web-log: absent` 并继续输出轨迹（不静默冒充 0 条日志）。
- **旧形态**：完全兼容历史 `drt_*` bundle 与 v4 会话日志，零迁移负担。
- **反证**：5 类 Smells 均有正向触发 + 负向控制 keyless 单测；`fetch-fallback` / `defaults` / `method-library` 留痕有单测验证 URL query 脱敏与零异常抛错；使用最小脱敏夹具验证 `run-trajectory.mjs` 能检出 `drt_huawei-ascend-dd` 中的典型 Smells。

## 验收标准

| 验收项 | 命令 | 断言 | 红形态 |
|---|---|---|---|
| 1. 宿主原生留痕单测 | `source tools/env.sh && pnpm test:spec` | `fetch-fallback`、`defaults`、`method-library` 在成功/失败/跳过分支均调用 `ctx.logger` 并剥除 URL query/敏感字段，无新增 peerDependency | 关键分支漏打点、泄露 query token，或触发 `pack-bundle-compat`/`row-deps` 红 |
| 2. 多角色轨迹纯核单测 | `source tools/env.sh && pnpm test:checks` | `run-trajectory-core.mjs` 正确还原 Lead → 子会话树（兼容 `.jsonl.zstd` 与 `.jsonl`），5 类 Smells 正/负例全绿，缺失子会话显式标 `missing-child` | 任意 Smell 漏报/误报，或坏输入静默返回 0 问题 |
| 3. 真实 bundle 只读试跑 | `source tools/env.sh && node probes/analyze/run-trajectory.mjs research-workspace/drt_huawei-ascend-dd --json` | exit 0；输出含完整角色树与成本总账，自动标出本例已知 Smells（如 Lead 未载 `synthesis`、4 次 10s `WEB_ABORTED`、`task-8/9/10` 未闭、终交付计数漂移） | exit 非 0、丢失子会话或漏检已知实锤 Smells |
| 4. 探针索引与文档路由 | `source tools/env.sh && node probes/_index.mjs --check && pnpm verify` | `run-trajectory.mjs` 已登记在 `probes/INDEX.generated.md`，`probe-playbook.md` 与 `run-ops.md` 含原生排障路由表，`pnpm verify` 全绿 | `probe-registry` / `md-links` / `doc-budgets` 任一红灯 |

## 关闭条件

- 上述 4 项验收标准全绿并通过交付自审；
- 同变更落地毕业 Note `notes/implemented/2026-11-28-native-observability-and-run-trajectory-probe.md` 并以 `git mv` 将本卡归档至 `_backlog/_archived/settled_issues/`（`status: 已结`、`可关闭：是`）。
