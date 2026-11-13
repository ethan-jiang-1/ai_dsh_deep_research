# 测试资产围栏：S0–S2 交付记录

> 状态：implemented
> 关联：程序卡 = [2026-11-13 测试资产围栏](../../_backlog/_archived/settled_issues/2026-11-13-test-asset-fence.md)；
> 研究 = [test-asset-fence](../../_backlog/research/test-asset-fence/README.md)；
> 制度 = [D54](2026-11-13-test-strategy-operating-model.md) / [guides/67](../../docs/guides/67-test-strategy.md)

## 决定

S0–S2 全部落地，S3（慢档降本/退役/合并）按卡内边界另卡推进，不在本卡关闭条件内。

- **S0**：run-accept claim 夹具补 `review/readiness.json`，构造器住 `scripts/lib/run-accept-fixture.mjs`，
  同源快测钉「有声明 = declaration/PASS、缺声明 = missing/红」。
- **S1**：`src/client` 6 个纯逻辑件直测 + `client-surface` 契约；`.tsx`/hooks/entry/style/type-only/
  字典内部件进 `CLIENT_SMOKE_ONLY`/`TSX_SMOKE_ONLY`，逐件写理由，不静默排除。
- **S2**：`scripts/smoke/registry.json` 每条 smoke 加 `cost`/`uniqueClaim`/`oracle`/`sunset`/`lane`；
  `smoke-oracle-surface` 契约把「唯一证明面 + 判据核 + 退役条件」变成可对账字段。

## 为什么

研究实测指出：快核健康，但慢档有成本悬崖；客户端 36/59 无直测；run-accept claim 夹具与
`readinessOfSources` 漂移导致 CI 红。S0–S2 用最小改动把「快测补位、慢档只证装配、夹具同源、
慢资产有账」落成可机械复核的围栏，不以新增 E2E 换覆盖。

## 输掉的方案

- 改 `## readiness: PASS` 标题掩盖夹具缺件：误诊，且会放宽 D51 判据；不采纳。
- 要求 `src/client/**/*.ts` 全直测：`.tsx`/hook/entry/style/type-only 需要 DOM/浏览器，强塞会假红；
  改为逐件登记 `CLIENT_SMOKE_ONLY`。
- 新建独立台账文件：`smoke-registry` 已是 smoke 集合事实源，扩字段最小；不造第二份清单。
- 把 S3 塞进本卡：跨浏览器/安装/CI，且退役有升级路径前提；另卡/trigger。

## 实际跑过的验证

- S0：`run-accept.e2e` 由 3 FAIL → **ALL PASS**；`run-accept-fixture.spec` 2 例绿（有声明/缺声明）。
- S1：`client-surface` 与 `client-pure-logic.spec` 在 `pnpm test` 内全绿；红证 = 新增未测试
  `src/client/*.ts` → 契约点名红（头注记录）。
- S2：`smoke-oracle-surface` 在 `pnpm test` 内全绿；红证 = 删 oracle / 填不存在路径 / `none` 空理由 → 红。
- 当期总基线（本机 2026-11-14）：`pnpm test:spec` 1341 / 0、`pnpm test:checks` 104 / 0、
  `pnpm test:vendor` 4 / 0、`pnpm verify` 全绿；`test:e2e` 6/0、`test:entry` 3/0（全量车道）。
- S3 后续已另片完成一部分：`e2e-021rc2` 退役、`gates.e2e` 并行 248→86s、慢资产预算 ratchet；
  这些记在 [测试策略交付记录](2026-11-13-test-strategy-institutionalization.md)，不回溯冒充本卡范围。

## 未证明 / 后续

- S3 中 `snapshot` 多角色共用 boot、`client-load` 纯逻辑外移、`install-shape` 合并仍按研究触发条件评估；
  当前未做。
- 用户验收：2026-11-14 用户确认两张卡可归档；本 Note 是交付记录，不是新的验收结论。

## 环境状态

本机 macOS / Node 22.23.1 / pnpm 11.7.0；`pnpm verify` / `pnpm test` 绿；工作树在归档提交前含
BUG-160（另卡）不混入本卡范围。
