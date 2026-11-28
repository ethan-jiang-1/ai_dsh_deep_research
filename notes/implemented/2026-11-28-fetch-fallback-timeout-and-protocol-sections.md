# 抓取回退本地超时分类修复与协议自定义节跨语言收口

> 状态：implemented

相关前序决定：[run-fidelity-and-gate-accuracy-fixes](2026-11-28-run-fidelity-and-gate-accuracy-fixes.md) · [handoff-readiness-all-green](2026-11-28-handoff-readiness-all-green.md)。

## 决定

针对新暴露的两例 P1 缺陷（`BUG-488` 与 `BUG-489`），按边界根因收口如下：

1. **抓取回退区分外层腿超时与真正调用方取消（`BUG-488`）**：
   - 根因：[`packages/deep-research-pack/src/fetch-fallback/orchestrate.ts`](../../packages/deep-research-pack/src/fetch-fallback/orchestrate.ts) 用 `deps.deadline(signal, budget.local)` 先创建外层 `AbortSignal.timeout`，它与底层 `HttpFetchProvider` 同为 `localTimeoutMs` 且先启动；外层 deadline 先触发时，`HttpFetchProvider` 只认内部 `TimeoutReason`，把外层 abort 归类成 `WEB_ABORTED`，导致编排层误按“调用方取消”跳过 DeepSeek Fetch API 回退并裸抛无 URL 错误。
   - 决定：导出单一 `withDeadline` 供 [`packages/deep-research-pack/src/fetch-fallback/index.ts`](../../packages/deep-research-pack/src/fetch-fallback/index.ts) 与测试复用；在 `fetchWithFallback` 内先判 `callerAborted()`（真取消仍绝不回退），再对 `localSignal.aborted` / `apiSignal.aborted` 触发的 `WEB_ABORTED` / `TimeoutError` 归一为 `WEB_FETCH_TIMEOUT` 并附带 `request.url` 与预算毫秒，同时补齐状态码回退腿调用方取消时的 URL 信息。
   - 补齐真 provider 契约层盲区：新增零外网 [`checks/smoke/fetch-fallback.e2e.mjs`](../../checks/smoke/fetch-fallback.e2e.mjs)（`dev-only` 快速冒烟，遵守 `tests/` 零 `node:net`/零 `fetch` 分层守卫），直接实例化真实 `HttpFetchProvider`（通过构造函数 `resolveAddresses` 注入挂起解析器）验证外层超时进入 API 回退与调用方主动取消不回退。
2. **`protocol.output.sections` 源头对齐交付语言 + 门禁跨语言诚实降级（`BUG-489`）**：
   - 源头契约：在 [`packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md`](../../packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md) §Protocol 明确约定——除六个内置标准键（`decision` / `options` / `criteria` / `tradeoffs` / `risks` / `coverage`）外，自定义章节直接写交付语言 H2 节名（与 `final.md` 对齐），不再在中文报告里发明仅存在于 JSON 的自由英文 slug（不动 YAML `description:` 以保持 B 层快照稳定）。
   - 机械门禁：[`checks/lib/gates/protocol-audit-core.mjs`](../../checks/lib/gates/protocol-audit-core.mjs) 的 `checkFinalSections` 在中文报告中遇到未匹配的自定义纯 ASCII slug 且剩余未匹配中文 H2 数量不少于未映射 slug 数时，输出 `warning`（`final-sections-unmapped`）显式交由 Critic 核验 Protocol 兑现，不再硬红；内置标准键缺失、中文自定义节名缺失、纯英文报告缺节、以及报告真正漏节（剩余中文 H2 数不足）均严格维持 `red`（`final-sections`）。

## 输掉的方案

- **在 `fetch-fallback/index.ts` 把 `HttpFetchProvider` 的 `timeoutMs` 改小或删掉外层 `deps.deadline`**：改小内部超时会缩短单腿预算且仍受事件循环抖动影响；删掉外层 deadline 则失去对非合作 provider / DNS 挂起的硬上限兜底。在编排层直接用 `callerAborted()` vs `localSignal.aborted` 区分来源最根治，且同时修好 API 腿超时归类。
- **在 `protocol-audit-core.mjs` 维护一份无限膨胀的英文 slug → 中文 H2 翻译词典**：每次新题面发明新 slug 都会再次漂移，且掩盖了“中文报告在协议里硬造自由英文 slug”的源头问题；改为源头约束交付语言节名 + 门禁对遗留/未映射自定义英文 slug 在节数充足时显式降级为 `final-sections-unmapped` warning。

## 实际跑过的验证

- **Red→Green 回归与真 provider 契约**：
  - `tests/pack/fetch-fallback/fetch-fallback-orchestration.spec.mjs`（`BUG-488` 假腿全分支先红后绿）；
  - `checks/smoke/fetch-fallback.e2e.mjs`（真实 `HttpFetchProvider` 零外网超时先复现 `WEB_ABORTED` 红，修复后转绿，调用方主动 abort 仍绝不回退）；
  - `tests/run/gates/protocol-core.spec.mjs` 与 `tests/pack/contract/template-contract.spec.mjs`（`BUG-489` 先红后绿，并保留漏节/英文报告/中文自定义节缺失/内置键缺失四重负控）。
- **真实档案对照（`research-workspace/drt_huawei-ascend-dd`）**：`node checks/run-gates/protocol-audit.mjs research-workspace/drt_huawei-ascend-dd --no-write` 的 `[final-sections]` 误红清零，转为显式 `warn [final-sections-unmapped]`。
- **全仓门禁**：刷新 `skill-golden`、`asset-ledger`、`tests/INDEX.generated.md`、`docs:gen` 与 `pnpm build && export-dist` 后，实跑 `pnpm typecheck`、`pnpm lint`、`pnpm verify`、`pnpm test`、`pnpm test:vendor`、`pnpm docs:check` 与 `DSH_SMOKE_REAL=1 node checks/smoke/preset.e2e.mjs` 全绿。
