---
status: 待落地
opened: 2026-11-13
---

# 落地：测试资产围栏——先修 run-accept 夹具，再补客户端快测与慢资产台账

> 立卡：2026-11-13 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> 去向：implemented — `notes/implemented/2026-11-13-test-asset-fence.md`
> 授权：用户 2026-11-13 直派「弄个 issue，然后推动落地」；研究 = [test-asset-fence](../research/test-asset-fence/README.md)
>
> **一句话**：把研究结论落成三件可验收的事——S0 修当前 CI 红的 run-accept 夹具并加同源快测；
> S1 补客户端纯逻辑直测 + `client-surface` 围栏；S2 给 28 条 smoke 加成本/唯一证明面/判据核台账。
> S3（慢档降本/退役/合并）触面更大，另卡，不在本卡关闭条件内。

**问题与期望结果：** 研究实测发现：快核健康（verify 2.5s、test 4.4s），但慢档有成本悬崖
（`gates-smoke` 202s、`snapshot-replay` 162s）；真正缺口是慢资产判据仍长在慢壳里、客户端 19 个
文件无测试路径、夹具随判据漂移。期望：先让 CI keyless 绿，再把“纯逻辑进快测、慢档只证装配、
夹具同源、慢资产有台账”变成可对账的围栏；不以新增 E2E 换覆盖。

**当前情况：**

- 研究正文与第二遍复核 = [2026-11-13-test-asset-fence.md](../research/test-asset-fence/2026-11-13-test-asset-fence.md)。
- **S0 前红（现已修复）**：`node scripts/smoke/run-accept-smoke.mjs` 第 ⑦ 段曾 exit 1。根因不是
  `## readiness: PASS` 标题行，而是 claim 夹具创建了 `review/` 却没有 `review/readiness.json`；
  D51 的 `readinessOfSources({hasReviewDir:true})` 判 `source:'missing'`。实测补声明件后
  `run-accept` exit 0、`review/verdict-audit-r1.md` 落盘；S0 已按此落地（§执行记录）。
- 客户端 59 个 `src/client` 文件里，测试直接 import 23 个；36 个未直接 import，约 19 个无任何
  测试路径。4 个零路径纯逻辑：`lead-prompt`、`section-labels`、`operation-prompts`、`coach-prompts`；
  另 2 个有组件可达但无直测：`research-graph/format`、`defaults/labels`。
- `verify --only` 只过滤输出、全部门禁仍执行；实测 `--only=md-links` 3.24s ≥ 全量 2.53s，
  **不能用于 gates-smoke 降本**。
- `e2e-021rc2` 退役需先有 `client-load` 的真实 picker 顺序断言；静态 order 只是代理。若仍承诺
  从 0.2.1-rc.2 升级，则更新而非退役。

**未决问题（本卡外）：**

- S3 的具体顺序：`snapshot-replay` 定向/并行、`client-load` 纯逻辑外移、`e2e-021rc2` 退役、
  `install-shape` 合并、`cold-start` 补隔离断言——各自前置已写在研究 §3/§5，触面跨 smoke/CI/
  发布文档，另卡推进。
- `verdict-audit-core` 第 483 行把“声明缺席”说成“不是终局判定行”的误导文案：可随 S0 同 diff，
  也可另开小卡；不阻塞 S0。

**下一步：** S0 已落地（见 §执行记录）；按 S1 → S2 推进。S3 在研究文档登记触发，不在本卡
假装完成。

## 方案与取舍

| 片 | 做法 | 为什么不选另一个 |
|---|---|---|
| **S0 夹具** | `writeClaimFixtures` 写 `review/readiness.json`；把 review/readiness 文本抽成 `scripts/lib` 可 import 的夹具构造器；加 fast fixture 合同（用 `readinessOfSources` 断言“应绿/缺声明应红”） | 不改 `## readiness: PASS` 标题：`terminalReadiness` 会剥 `##` 读成 PASS，改标题是误诊；也不把断言放宽到“看到 PASS 就算” |
| **S1 客户端** | 4 个零路径纯逻辑直测 + 2 个无直测直测；新增 `client-surface` 契约：纯逻辑件必须被测试直接 import，`.tsx`/hooks/entry/style/type-only/字典内部件进 `CLIENT_SMOKE_ONLY` 写理由 | 不要求所有 `src/client/**/*.ts` 直测：`index.ts`/`styles.ts`/`types.ts`/字典内部件会被误红；不把组件测试硬塞进 jsdom |
| **S2 台账** | 扩 `scripts/smoke/registry.json`：每条加 `cost`/`uniqueClaim`/`oracle`（数组或 `none: 理由`）/`sunset`；新增 `smoke-oracle-surface` 契约 | 不新建独立台账文件/队列：`smoke-registry` 已是 smoke 集合的事实源，扩字段最小 |
| **S3 慢档** | 另卡：snapshot/client-load 降本、e2e/install-shape 条件式退役/合并、cold-start 补断言 | 不塞进本卡：跨浏览器/安装/CI，且 e2e 退役有升级路径前提 |

## 判据形状

- **权威事实**：
  - S0：`review/readiness.json`（critic 写的 JSON，`version:1` + `readiness:PASS|FAIL`）+ `review/claims.json`/
    `verdicts-rN.json`；夹具构造器 = `scripts/lib` 的纯文本函数。
  - S1：`src/client/**/*.ts` 的 import 图（测试直接 import 的文件事实）+ `CLIENT_SMOKE_ONLY` 登记。
  - S2：`scripts/smoke/registry.json` 的显式字段（人写）+ 其 `oracle` 指向的测试路径。
- **读取方**：`run-accept`/`node-gate`/`verdict-audit`（S0）；`client-surface` 与 `test-surface`（S1）；
  `smoke-oracle-surface` 与 `smoke-registry`（S2）。
- **坏输入**：
  - `review/` 在场但 `review/readiness.json` 缺席/非法/重复键 → 红（D51；S0 反证）。
  - 纯客户端逻辑件无测试直接 import → 红；组件/hook/entry/style/type-only 未登记 → 红。
  - smoke 条目缺 `cost`/`uniqueClaim`/`oracle` → 红；`oracle` 路径不存在 → 红；`none` 无理由 → 红。
- **旧形态**：`run-accept` claim 夹具无声明件（S0 修）；`test-surface` 只覆盖 lib（S1 新增
  `client-surface`，不改旧门）；smoke registry 只有 tier/reason（S2 加字段，28 条一次性填齐，不设
  grandfather）。
- **反证**：
  - S0：fast 测试断言“有声明 = declaration/PASS；缺声明 = missing/红”；S0 落地前 `run-accept-smoke`
    当前红即真红录。
  - S1：注入一个未测试纯逻辑件 → `client-surface` 点名红；删除断言/登记 → 红。
  - S2：删一条 `oracle` 或填不存在的路径 → 契约红；新增 smoke 不登记 → 红。

## 验收标准

| # | 行为 | 类 | 判据 | 证据 owner |
|---|---|---|---|---|
| 1 | **S0** run-accept claim 夹具带声明件，CI keyless 恢复绿 | 确定性逻辑 | `review/readiness.json` 由 shared fixture 写出；`node scripts/smoke/run-accept-smoke.mjs` exit 0；`review/verdict-audit-r1.md` 落盘 | `tests/run/run-accept-fixture.test.mjs` + `run-accept-smoke` 实跑 |
| 2 | **S0 反证** 缺声明件必须红 | 确定性逻辑 | fast 测试：`readinessOfSources({hasReviewDir:true, declarationText:null})` → `source:'missing'`、`pass:false`；有声明 → `source:'declaration'`、`pass:true` | same test；负例留证块 |
| 3 | **S1** 4 个零路径纯逻辑 + 2 个无直测件有直测 | 确定性逻辑 | 6 个测试文件/用例在场；`pnpm test` 增加且绿 | `tests/cockpit/*` + `tests/run/*` |
| 4 | **S1 围栏** 新纯客户端模块不写测试 = 红 | 确定性逻辑 | `client-surface` 契约：纯逻辑件必须被测试直接 import；其余在 `CLIENT_SMOKE_ONLY` 有理由 | `tests/contracts/client-surface.test.mjs` + 一次性注入红录 |
| 5 | **S2** 28 条 smoke 有成本/唯一证明面/判据核台账 | 确定性逻辑 | `registry.json` 每条 `cost`/`uniqueClaim`/`oracle` 齐；`oracle` 路径存在且被测试 import，或 `none:` 有理由；新增 smoke 不登记 = 红 | `tests/contracts/smoke-oracle-surface.test.mjs` |
| 6 | 收尾不回归 | 确定性逻辑 | `pnpm verify` 绿；`pnpm test` 绿；`pnpm typecheck` 绿（触 pack 时）；`run-accept-smoke` 绿 | 命令输出 + Note |
| 7 | 交付记录 | — | Note 与研究/卡同变更；`scripts/README` 的 lib 表与 registry 说明同步 | `notes/implemented/2026-11-13-test-asset-fence.md` |

**排除项**：不新增浏览器/真模型档；不改产品行为；不做 S3 的慢档退役/合并；不设覆盖率百分比门禁；
不把 `## readiness: PASS` 标题行当作修法；不为了“全绿”放宽任何判据。

## 执行记录

- **2026-11-13 S0（已落地）**：新增 `scripts/lib/run-accept-fixture.mjs`（claim 夹具的
  `review.md` + `review/readiness.json` 文本，D51 同源）与 `tests/run/run-accept-fixture.test.mjs`
  （有声明 = declaration/PASS，缺声明 = missing/红）。`run-accept-smoke` 第 ⑦ 段由 3 FAIL
  → **ALL PASS**；`pnpm test` **1,409 / 0**；`pnpm verify` 全绿。
- 证据：`node scripts/smoke/run-accept-smoke.mjs` → ALL PASS；新测 2 例绿；`scripts/README`
  lib 表已登记新模块。
- 待办：S1（客户端纯逻辑 + `client-surface`）、S2（smoke oracle/cost 台账）。

## 关闭条件

- S0–S2 全部落地，且每条新判据有一次真红录（S0 当前红 + S1/S2 注入红）。
- `pnpm verify`、`pnpm test`、`pnpm typecheck`（触 pack 时）、`run-accept-smoke` 绿。
- Note 与卡关闭同变更；研究文档与 `scripts/README` 同步；S3 登记为后续卡/trigger。
- 用户验收（测试资产/CI 触面）。
