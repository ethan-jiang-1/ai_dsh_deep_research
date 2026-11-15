# RFC：测试子目录按消费者接口分层（owner 轴）

> 状态：proposed
> 关联：[issue 2026-11-15-test-source-mirror](../../_backlog/issues/2026-11-15-test-source-mirror.md) ·
> [研究题](../../_backlog/research/test-source-mirror/README.md) ·
> [研究正文](../../_backlog/research/test-source-mirror/2026-11-15-test-source-mirror.md)

## 问题

`tests/run` 77 个 spec、`tests/cockpit` 40 个 spec 平铺；`scripts/lib` 86 个模块平铺。测试的落家由
「证据种类」决定，源码位置不参与：86 个模块里 19% 按名字找不到测试，11 个模块的测试跨 2–3 个域。
用户要求测试子目录与源码位置对应，且本仓不是普通 JS 仓库——研发面的「源码消费者」是**命令**，
产品面的消费者是 DSH Loader / agent / 用户。因此组织轴 = 消费者接口，不是 import 图。

2026-10-28 的「维持单域」裁决基于「118 处历史链接 + 检索仍命中」；实测断链 22 条（16 冻结层）、
19% 名字不可达，前提已变（[triggers](../../_backlog/triggers.md) 已重开）。

## 决定

1. **第一层轴 = owner**：模块归「最终调用它的命令家族」；被 2+ 家族调用 → `shared/`；只服务测试/记录
   工具 → `tools/`；无入口消费者 → `test-infra/`。
2. **目录名**（两侧同名）：`gates`（run-gates）、`ops`（run-ops）、`channel`（dev 通道）、`harness`
   （smoke/browser）、`probes`、`tools`（record/verify 支撑）、`shared`、`test-infra`。
3. **测试镜像规则**：`tests/run/<owner>/x.spec.mjs` 只 import `scripts/lib/<owner>/` 或 `shared/`
   的模块；跨 owner 或只测 pack 折算的 spec 住 `shared/`；`shared/` 允许 import 任意 owner。
4. **入口目录不搬**（`scripts/{verify,smoke,run-gates,run-ops,dist,test}`、`dev/`、`probes/`）；
   `tests/checks` 平铺不动（D53 车道硬规则）；`tests/contracts` 不动。
5. **冻结层不改写**：新增 `scripts/test-path-redirects.json`（旧路径 → 新路径），`md-links` 对缺失
   目标先查登记簿，登记且新目标存在才放行；未登记一律红。
6. **索引**：生成 `tests/INDEX.generated.md`（模块 → owner → 测试路径 → 消费者），由契约测试重算对账；
   人类按主语检索走索引，目录回答「谁在用」。

## 目标形状

```
scripts/lib/gates/       node-gate-* / schema-scan-core / evidence-audit-core / verdict-audit-core
scripts/lib/ops/         run-dashboard-* / session-events-core / run-inventory-core / stream-diagnostics-core …
scripts/lib/channel/     run-channel / ask-drive / hitl-card-driver / channel-cache / inject-reconcile
scripts/lib/harness/     web-harness / web-banner / playwright / browser-cache / run-lock / host-health …
scripts/lib/probes/      probe-* / web-ui-nav / client-load-select / llm-stream-tee-core
scripts/lib/tools/       asset-ledger / ci-workflow / keyless-imports / workspace-parsers / …
scripts/lib/shared/      多消费者模块（session-log / env / run-state / final-version / node-gate-contracts …）
scripts/lib/test-infra/  method-presets / selftest-library / smoke-assets
tests/run/<owner>/<subject>.spec.mjs
tests/cockpit/client/<tab>/… 与 tests/cockpit/lib/…（Step 1）
```

## 门禁与机制变更

| 变更 | 类型 | 先红后绿 |
|---|---|---|
| `md-links` 查重定向登记簿 | 扩展既有门禁 | 注入「移动文件 + 登记」应绿；「挪走未登记」应红（`gates.e2e` 两案例） |
| `test-owner-mirror.test.mjs` | 新契约测试 | 当前平铺树必红（错位/根层 spec）；移动后绿；空 owner 目录/错位/`shared` 越权各留反例 |
| `test-index.test.mjs` | 新契约测试 | 删一条索引行/改一条路径应红 |
| `test-surface` | 改判据 | 支持子目录且覆盖集合用相对路径；SMOKE_ONLY 键同步 |
| `navigability-contract` | 改判据 | lib 递归 + 表行 `lib/<owner>/<file>`；消费列按 basename 对账不变 |
| `scripts/README.md` | 数据 | 每个 lib 文件一行，路径加 owner 前缀 |
| `d-vendor` | 硬路径 | `scripts/lib/env.mjs` → 新路径 |

## 验收（与 issue 的 8 条对应）

1. Step 0 三件套在场且各有反证；
2. `scripts/lib` 8 个 owner 目录 + `tests/run` 同名镜像，根层零平铺 spec；
3. `tests/cockpit` 切 `client/`+`lib/`，`tests/pack` 对应关系写进 tests/AGENTS；
4. 四处门禁假设 + README 同步；
5. guard-ledger / asset-ledger 重生成后对账绿；22 条历史链接经登记簿全部可解析；
6. `pnpm verify` + `pnpm test` 全绿，零新增 skip；
7. tests/AGENTS、evaluation、project-map、triggers 同步；
8. 每步可 `git mv` 反向回退。

## 输掉的方案

- **按 import 图分组**：只证依赖不证消费者；8 个入口目录零 import 边。
- **按源根（tests/scripts-lib、tests/pack-lib）**：破六域语义与 D53 车道命名，链接改写最大。
- **按主语（gate/session/audit…）**：人读顺，但不是「谁在用」；agent 找命令时仍要二次跳转。
- **改写冻结层链接**：违反冻结纪律；登记簿是既有先例（archived-note-pointers）的延伸。
- **合并 lib 小模块**：删除测试跑过——27 个 ≤60 行模块多为纯判据，合并撞 550 行上限并拆掉一域一文件的可 review 性。

## 残余风险

- owner 随消费关系漂移 → 索引与门禁需定期重算（重跑生成器）。
- `shared/` 可能超过 50% → 那时按 `shared/<子簇>/` 二级桶重估。
- 产品面 `pack src/lib` 分家族（Step 3）本轮不做：它已 84% 同名，收益最小；触发条件 = 该树出现
  第二个跨域证据或名字漂移。

## 迁移顺序（每步一个提交，可独立回退）

1. Step 0a：登记簿 + `md-links` 扩展（空登记簿先绿；案例先红后绿）。
2. Step 0b+2：owner 门禁 + 索引生成器（当前树先红）→ `scripts/lib` 分组 + `tests/run` 镜像 → 绿。
3. Step 1：`tests/cockpit` 切 `client/`+`lib/`（独立提交）。
4. 收尾：两账重生成、文档同步、Note、归档卡与研究题。
