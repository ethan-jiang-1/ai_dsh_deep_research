---
topic: 测试子目录与源码位置的对应（DSH 插件仓：研发面 vs 产品面）
intent: 实测命名可达性、消费者归属与搬家成本，判定测试子目录应镜像哪一层源码，并把调整候选写成一张 issue 卡。
---

# 测试子目录 ↔ 源码位置：先定「谁在用」

> 证据边界：静态测量基线 = HEAD `686d4482`（2026-11-15，TypeScript AST import 图 + 盘上枚举 +
> 门禁源码阅读）；**复核基线 = HEAD `7421dc17`**（同日 08:10，见 §0.1）。所有计数可用 §2 的口径复算。
> 本材料取代本轮两份临时架构评审口头结论中的「按 import 图找家」框架（数据仍有效）。

## 0. 结论

1. **本仓的「源码」有两面，不能混。**
   **产品面**（随 tarball 发布）= `cordis.patch.yml` 的 13 条 bundle 行 + `presets/` 6 个 preset +
   `content/` + `src/{content,startup,defaults,fetch-fallback}` + `src/client`（观察面）+ `src/lib`（共享纯件）。
   **研发面**（不发布）= `scripts/` + `dev/` + `probes/` + `tests/`。
   `tests/` 顶层六域已经按面切开：`run`/`checks` = 研发面，`cockpit`/`pack`/`contracts`/`vendor` = 产品面。
2. **面的内部，测试家应当镜像「消费者接口」，不是内部 import 图。**
   产品面的消费者 = DSH Loader / agent / 用户，接口 = 组合面（preset、content 注入、startup、defaults、
   fetch-fallback、client 页签）；研发面的消费者 = **命令**，接口 = `scripts/{run-gates,run-ops,smoke,verify}`、
   `dev/`、`probes/` 等入口目录。`scripts/lib` 是这些命令背后的内部缝。
3. **建议的第一层轴 = owner（命令家族 / 组合面），第二维用生成索引承载主语**（gate / session / audit…）。
   `shared` 是诚实的桶：86 个 lib 模块里 37 个被 2+ 入口消费，`session-log` 有 27 个消费者。
4. **搬运成本低于 2026-10-28 的估计。** `tests/run` 只有 **22 条 Markdown 链接**（16 条在冻结层），
   不是当时记的「118 处历史链接」（那是引用数）；另有 19 条 guard-ledger、77 行资产账、10 个
   `../fixtures` 相对 import。`scripts/lib` 一侧 = 211 条 import 语句 + 94 条 md 链接 + README 88 行表
   + 4 处门禁假设。
5. **产出**：[issue 2026-11-15-test-source-mirror](../../issues/2026-11-15-test-source-mirror.md)
   （`待落地`，去向 `proposed`；真正的调整借这张卡做，不直接动树）。

## 0.1 基线复核（2026-11-15 08:10，HEAD `7421dc17`）

- 两次提交之间**源码 / 测试 / 门禁面零改动**：`7421dc17` 只动 `_backlog/`（归档两个旧研究题）、
  `notes/`、`scripts/archived-note-pointers.json` 与 archiving 技能；56 道门禁与 D 号台账未变。
- 盘上计数与 §4/§5 一致：`tests/run` 78 文件（77 spec）、`tests/cockpit` 40、`tests/pack` 38、
  `tests/checks` 45、`scripts/lib` 86 个 `.mjs`、`scripts/` 155 文件。
- `pnpm verify` 全绿；`pnpm test` 全绿（checks 188/188，零 skip）。
- 结论与成本数字不变；旧决定的重开条件仍成立。

## 1. 研究问题与边界

- **回答**：`tests/` 子目录镜像哪一层源码；怎样让 agent 与人「找得到」；代价、机械面与回滚。
- **不回答**：单个文件具体落哪（属实施）；是否重命名模块；是否合并 lib 模块；是否改
  `tests/checks` 平铺（车道硬规则）；是否动 `vendor/`（只读铁律）。
- **既有决定**：[D53](../../../docs/decisions.md#d53) 命名即车道；[tests/AGENTS](../../../tests/AGENTS.md) 分域
  映射；[triggers.md tests/ 分域行](../../triggers.md)（2026-10-28 维持单域）。

## 2. 方法与口径（可复核）

- **import 图**：`scripts/lib/keyless-imports.mjs` 的 `parseKeylessImports`（TS 解析器，只认真实
  `import`/`export from`/动态 `import()`，注释与字符串不计数），再用 `localImportPath` 解析到绝对路径。
- **名字可达**：模块名 vs 全部 210 个测试文件名（`.spec.mjs` + `.test.mjs`）。判定三档：精确同名 /
  去掉 `-core|-gate|-policy|-html` 后缀后互相包含（模糊）/ 无。
- **owner**：从 8 个入口目录（`scripts/verify`、`smoke`、`run-gates`、`run-ops`、`dist`、`test`、`dev/`、
  `probes/`）出发，沿 lib→lib 反向 import 做传递闭包；一个模块的 owner 集 = 最终调用它的入口目录集。
- **成本**：Markdown 链接用 `](...tests/run/...)` 形态计数（`md-links` 只咬链接）；guard/asset 两账用
  JSON 行计数；import 语句用 `from '…scripts/lib/…'` 行计数。
- **测试与门禁**：测量阶段未跑；入库前在 `686d4482` 与复核基线 `7421dc17` 上跑过 `pnpm verify`（全绿）
  与 `pnpm test`（checks 188 全绿），未做浏览器/模型档——本材料的数字仍只来自静态测量。

## 3. 谁在用：五类消费者（DSH 模型）

DSH 的官方放置逻辑（`vendor/dsh/docs/architecture.md` 的 §Profiles and bundles /
§Capability seams / §Where new behavior goes）：行为挂在**扩展点**上——
模型能力挂 `ctx.tools`、一个会话换能力集走 **preset**、人类命令挂 `ctx.commands`、界面走 **client slot**、
持久状态走 session event。本包 [cordis.patch.yml](../../../packages/deep-research-pack/cordis.patch.yml)
就是这张表的实例。

| 代码 | 消费者 | 何时 |
|---|---|---|
| `cordis.patch.yml`（bundle 行） | **DSH Loader** | `dsh --profile deep-research` 启动时按层组合 |
| `presets/*.patch.yml` | preset registry / Loader | 建会话时按角色选 preset |
| `presets/*/skills/` | `skill-filesystem` → 模型 `skill` 工具 | agent 回合内按需加载 |
| `content/manual.md` + `src/content` | `systemPrompt.context` → **每个 agent 的 prompt** | 每次请求（durable 快照） |
| `src/startup` | **Host** | profile 启动 / 首请求 |
| `src/defaults` | Host context + `/research-defaults` 命令 | 用户与模型 |
| `src/fetch-fallback` | web seam 的 fetch provider | 搜索 / 抓取 |
| `src/client`（研究驾驶舱） | **DSH web client**（slot 注册） | 用户在浏览器看页签 / 工具卡 |
| `src/lib` | client 半 **与** dev 脚本共享 | 两边 |
| `scripts/run-gates/*` | **Lead / Critic / 人** | run 收活验收 |
| `scripts/run-ops/*` | **Lead / 人** | run 进行中与交付后观察 |
| `scripts/verify/*` | pre-commit / CI / agent | `pnpm verify` |
| `scripts/smoke/*` | agent / CI | 分级冒烟车道 |
| `dev/*` | agent / 人 | 起通道、HITL 代答、录制 |
| `probes/*` | agent | 单点机制证据 |
| `tests/*` | agent / CI | 回归与门禁 |

**推论**：`scripts/lib` 的模块没有「直接用户」；它们被命令调用。所以「测试跟源码对应」在研发面
只能是「测试跟命令家族对应」，不能是「测试跟 lib 模块同名」——后者就是今天半衰的那条约定
（77 个 run spec 里 40 个同名）。

## 4. 现状盘点：所有代码相关子目录

| 目录 | 代码行 | 角色 | 今天的测试家（实测） |
|---|---:|---|---|
| `scripts/lib` | 12,489 | 共享模块树（86 `.mjs` + 2 `.cjs`） | run 89 边 · checks 35 · pack 6 · contracts 6 · cockpit 4 |
| `scripts/verify` | 2,511 | L0 门禁（6 域 + 入口 + 助手） | `tests/checks/verify-gates` + `smoke/gates.e2e` |
| `scripts/smoke` | 6,154 | 分级冒烟（27 件 + registry） | registry + `tests/checks/smoke-*` |
| `scripts/run-gates` | 814 | run 门（7 件） | `tests/run/node-gate-*` 等 |
| `scripts/run-ops` | 1,556 | run 观察/运维（14 件） | `tests/run/{dashboard,session-*}` 等 |
| `scripts/dist` | 547 | 分发（4 件） | `checks/release-*` + `pack/package-contract` |
| `scripts/test` | 39 | 车道 runner | `checks/smoke-lane` |
| `dev/` | 1,849 | 通道驱动（11 件 + hooks） | `run/run-driver-contract`、`run/ask-drive` |
| `probes/` | 1,893 | 探针（behavior/browser/stream） | `run/probe-*` + `INDEX.generated` |
| `pack src/client` | 9,268 | 观察面 client（38 `.ts` + 21 `.tsx`） | `cockpit` 41 边 · `pack` 2 |
| `pack src/lib` | 5,788 | 折算纯件（38 `.ts`） | `cockpit` 52 · `run` 20 · `pack` 13 · `contracts` 6 |
| `pack src/{content,startup,defaults,fetch-fallback}` | 1,275 | 注入/启动/默认/回退 | `pack` 各 1–5 · `vendor` 1 |
| `pack scripts/` | 691 | doctor 等 | `pack` 5 |
| `pack presets/ · content/` | — | 数据（配置 / 手册 / 模板） | `pack` 17（无源码 import） |
| `.agents/skills/` | — | 开发技能（documentation） | `navigability-contract` |
| `.github/workflows/` | — | CI | `checks/ci-*` |

**关键事实**：只有三棵「模块树」被测试 import——`scripts/lib`、`pack src/lib`、`pack src/client`。
八个入口目录**零 import 边**；它们的证据是车道（`registry.json`）、门禁自测（`gates.e2e`）、
探针索引（`probes/INDEX.generated.md`）。

## 5. 测量

### 5.1 名字可达性（86 个 lib 模块）

- 精确同名（任意域）：**54**
- 去后缀模糊命中：**16**
- 按名字找不到：**16**（其中 5 个是设计上的 SMOKE_ONLY：`playwright`、`port-reclaim`、`cdp-driver`、
  `web-harness`、`zstd-read`；**11 个是真找不到**）：
  `keyless-imports → checks/layering.test`、`gates-cases → checks/verify-gates.test`、
  `web-banner → checks/boot-timer.test`、`snapshot-mode → checks/snapshot-readonly.test`、
  `run-source-node → run/run-context-node.spec`、`run-channel → run/run-driver-contract.spec`、
  `direct-authorization-boundary → run/entry-chain-probe.spec`、`roles`、`node-gate-run-gates`、
  `content-budget`、`selftest-library`。

### 5.2 跨域（同一模块的测试落在 2+ 个域）

**11 个模块**：`workspace-parsers`（run+contracts+checks）、`web-ui-nav`（run+cockpit+checks）、
`schema-scan-core`（run+contracts）、`node-gate-contracts`（run+contracts）、`port-reclaim-policy`（run+checks）、
`probe-index`（run+checks）、`protocol-core`（run+pack）、`roles`（run+pack）、`run-dashboard-core`（run+checks）、
`run-receipt`（run+contracts）、`note-scan`（contracts+checks）。

### 5.3 消费者归属（传递闭包，86 个模块）

- **单一 owner：46**
- **共享（2+ owner）：37**
- **无入口消费者：3**（`method-presets`、`selftest-library`、`smoke-assets`，测试基建）

完整分布见附录 A。要点：`run-ops` 独占 13、`run-gates` 独占 8、`dev` 独占 8、`smoke` 独占 7、`verify` 独占 5、
`probes` 独占 3；`run-gates+run-ops` 共享 10；`session-log`/`workspace-root` 被 5 个入口共用。

### 5.4 顶层域的构成（说明「域」不是「源码位置」）

- `tests/cockpit` 40 个：**20 个 import `src/client`，20 个只 import `pack src/lib`**。
- `tests/pack` 38 个：**17 个不 import 任何 pack 源码**（跑配置/内容/文档合同）；其余按
  `src/startup|defaults|fetch-fallback|content` 与 `pack scripts` 分布。
- `tests/contracts` 7 个：跨仓承诺，不归属单一源树。
- `pack src/lib` 38 个模块里 **32 个**有精确同名测试（84%）；`src/client` 38 个 `.ts` 里只有 10 个
  （其余由 `client-surface` 的 `CLIENT_SMOKE_ONLY` 逐件登记理由）。

### 5.5 搬运成本（实测）

| 动作 | 链接（其中冻结层） | 账 | 其他 |
|---|---|---|---|
| 搬 `tests/run` 77 件 | 22（16：`notes/archived` / `_backlog/_archived`） | guard-ledger 19 · asset-ledger 77 | 10 个 `../fixtures` import · 6 处 live docs 反引号 |
| 搬 `tests/cockpit` 40 件 | 11（4） | guard-ledger 10 · asset-ledger 40 | 4 个 `../fixtures` import |
| 搬 `tests/pack` 38 件 | 19（3） | guard-ledger 1 · asset-ledger 38 | — |
| 搬 `scripts/lib` 86 件 | 94（notes 29 + `_backlog` 56 + docs 6 + tests 3） | — | **211 条 import**（tests 145 / probes 37 / dev 27 / scripts 2）· README 88 行表 · 4 处门禁假设 |

「4 处门禁假设」= `test-surface` 的 `!rel.includes('/')`（lib 分组后覆盖对账会静默变空）、
`navigability-contract` 的非递归 `readdirSync(lib)` + 「每文件一行 `| lib/<file> |`」、
`scripts/README.md` 的「被谁消费」列对账、`d-vendor` 里硬编码的 `scripts/lib/env.mjs` 存在性检查。

## 6. 轴的四选一

| 轴 | 形态 | 判定 | 理由 |
|---|---|---|---|
| **import 图** | `tests/<被测模块名>` | **否决** | 只证依赖，不证消费者；8 个入口目录零边；`session-log` 的 27 个消费者无法表达 |
| **源根** | `tests/scripts-lib/…`、`tests/pack-lib/…` | **否决** | 破坏六域语义，与 [D53](../../../docs/decisions.md#d53) 命名即车道、tests/AGENTS 分域冲突；链接 churn 最大 |
| **主语** | `tests/run/{gate,deliver,session,audit,observe,channel,replay}` | **次优** | 人读顺，但不是「谁在用」；跨域模块仍要猜；agent 找命令时二次跳转 |
| **owner** | `tests/run/{gates,ops,channel,harness,shared}` ↔ 同名 `scripts/lib/<owner>/` | **推荐** | 与消费者一致：agent「要跑哪个命令 → 测试在哪」一条路径；`shared` 把 37 个多消费者模块显式化；产品面已有先例（`tests/pack` 就是按组合面组织的） |

**判定**：owner 第一层；主语作为生成索引的第二维（人类检索用）。

## 7. 建议形状

### 7.1 研发面（owner 轴）

```
scripts/lib/run-gates/   ← node-gate-* / schema-scan / evidence-audit / verdict-audit / protocol* …
scripts/lib/run-ops/     ← watch-run / session-events / dashboard / provider-errors / run-inventory …
scripts/lib/dev/         ← run-channel / ask-drive / hitl-* / channel-cache …
scripts/lib/smoke/       ← host-health / replay-scene / snapshot-mode / run-lock / client-load-select …
scripts/lib/verify/      ← backlog-liveness / content-budget / fix-evidence / note-scan / staged-change-pairing
scripts/lib/probes/      ← probe-* / direct-authorization-boundary / llm-stream-tee-core
scripts/lib/shared/      ← 37 个多消费者模块（session-log / env / web-* / local-date / final-version …）
scripts/lib/test-infra/  ← method-presets / selftest-library / smoke-assets
tests/run/<同名 owner>/<subject>.spec.mjs
```

入口目录（`scripts/{verify,smoke,run-gates,run-ops,dist,test}`、`dev/`、`probes/`）**不搬**：
它们已经是 owner 目录，搬动只破坏命令与文档。

### 7.2 产品面（组合面轴）

| 组合面 | 源码 | 测试家 | 现状 |
|---|---|---|---|
| preset roster | `presets/*.patch.yml` | `tests/pack/{presets,presets-wiring,role-consumer-matrix}` | 已对齐 |
| 内容注入 | `content/` + `src/content` | `tests/pack/content-*` | 已对齐 |
| 启动行 | `src/startup` | `tests/pack/startup*` | 已对齐 |
| 项目默认 | `src/defaults` | `tests/pack/defaults*` | 已对齐 |
| 抓取回退 | `src/fetch-fallback` | `tests/pack/fetch-fallback*` | 已对齐 |
| 观察面页签 | `src/client/<tab>/` | `tests/cockpit/<tab>/` | **缺（40 个平铺）** |
| 折算纯件 | `src/lib/<family>/` | `tests/cockpit/lib/<family>/` | **缺** |

`tests/pack` 已经按组合面组织——这就是「镜像组合面」在本仓的既有先例，不是新发明。

### 7.3 落家规则（新文件）

1. 产品面模块 → `packages/deep-research-pack/src/<surface>/`，测试 → `tests/pack/<surface>.spec.mjs`
   （或 `tests/cockpit/<tab>/`）；
2. 研发面 lib 模块 → 它**最终服务于哪个命令**就进哪个 owner 目录；被 2+ 命令调用 → `shared/`，
   并在生成索引里登记全部消费者；
3. 新 spec → 与模块同一 owner 目录；跨域合同 → `tests/contracts/`；门禁自身 → `tests/checks/`（平铺不动）。

## 8. 落地顺序、回滚与反证

**Step 0（使能，不搬文件）**
1. 路径重定向登记簿（照 [scripts/archived-note-pointers.json](../../../scripts/archived-note-pointers.json)
   的形状）：让冻结层指向旧路径的 22 条链接仍可解析——**不改归档正文**；
2. 生成索引 `tests/INDEX.generated.md`（模块 → owner → 测试路径 → 消费者），照
   [probes/INDEX.generated.md](../../../probes/INDEX.generated.md) 的形状；
3. owner 门禁：spec 所在目录必须等于其 import 模块的 owner（多 import 用 `shared` 白名单），先红后绿。

**Step 1（试点）**：`tests/cockpit` 切 `client/` 与 `lib/`（40 件、11 链接、10 guard、40 行资产账），
验证重定向 + 索引 + 门禁三件套。

**Step 2（主戏）**：`scripts/lib` owner 分组 + `tests/run` 镜像。tracer = `run-gates/`（10 个 spec，
同时咬住冻结链接、pack spec、guard-ledger 三类难点）。

**Step 3（收尾）**：`pack src/lib` 分家族（它已 84% 同名，收益最小，最后做）。

**回滚**：每步独立——`git mv` 反向 + 索引重生成 + 两账重生成即可；Step 0 不改变任何现有路径。

**反证（新门禁先红）**：① 把一个 spec 放到错 owner 目录 → 红；② 建一个空 owner 目录 → 红（防空语料）；
③ `shared` 里放一个单消费者模块 → 红；④ 删一条索引行 → 红；⑤ 把一条冻结层链接改成新路径再撤登记 → `md-links` 红。

**风险**：owner 随消费关系漂移（需定期重算索引）；`shared` 可能膨胀（超过 50% 则重估边界）；
`scripts/README` 行表与导航门禁需要同变更维护。

## 9. 未决（需用户拍）

1. 第一层轴：**owner（本材料推荐）** vs 主语（gate/session/audit…）。
2. `shared` 是否拆二级桶（如 `shared/session/`、`shared/bundle/`），还是保持单层 + 索引。
3. 产品面是否本期一起动（`tests/cockpit` 40 → client/lib；`tests/pack` 已基本对齐）。
4. 「文件名 = 被测模块名」这条旧约定是保留（作为索引的别名来源）还是正式退役。

## 附录 A · owner 全表（86 模块，传递闭包）

| owner 集 | 数量 | 模块 |
|---|---:|---|
| run-ops | 13 | acceptance-check, bundle-date-sanity, bundle-sessions, provider-errors, run-dashboard-core, run-dashboard-html, run-inventory-core, runtime-clean-core, scene-pack, session-events-core, session-replay, stream-diagnostics-core, unconsumed-evidence |
| run-gates+run-ops | 10 | final-version, frontmatter, node-gate-contracts, node-gate-session-gates, path-hygiene, plan-card, run-receipt, schema-scan-core, secret-scan, zstd-read |
| dev | 8 | ask-drive, asset-ledger, channel-cache, ci-workflow, hitl-card-driver, keyless-imports, run-channel, workspace-parsers |
| run-gates | 8 | evidence-audit-core, node-gate-core, node-gate-delivery-gate, node-gate-reader-gate, node-gate-run-gates, provenance, run-source-node, verdict-audit-core |
| smoke | 7 | client-load-select, gates-cases, host-health, replay-scene, run-accept-fixture, run-lock, snapshot-mode |
| verify | 5 | backlog-liveness, content-budget, fix-evidence, note-scan, staged-change-pairing |
| dev+probes+run-ops+smoke | 5 | env, startup-hint, web-banner, web-harness, web-ui-nav |
| dev+run-ops+smoke | 3 | browser-cache, playwright, run-state |
| probes | 3 | direct-authorization-boundary, llm-stream-tee-core, probe-send-target |
| dev+smoke | 3 | hitl-provenance, profile-health, replay-request |
| （无入口） | 3 | method-presets, selftest-library, smoke-assets |
| probes+smoke | 3 | port-reclaim, port-reclaim-policy, roles |
| run-gates+smoke | 3 | protocol-audit-core, protocol-core, strategy-core |
| probes+run-ops | 2 | cdp-driver, probe-status-tab |
| dev+probes+run-gates+run-ops+smoke | 2 | session-log, workspace-root |
| dist+smoke | 1 | artifact-freshness |
| dev+dist+probes+run-gates+run-ops+smoke | 1 | cli-entry |
| dev+probes | 1 | inject-reconcile |
| dev+dist+run-gates+run-ops | 1 | local-date |
| probes+verify | 1 | probe-index |
| dist | 1 | release-anchor |
| test-runner | 1 | smoke-lane |
| probes+run-ops+smoke | 1 | vendor-artifacts |

## 附录 B · 与旧决定的冲突（值得重开）

[triggers.md tests/ 分域行](../../triggers.md) 记：2026-10-28 以 `tests/run` 56 个文件重估，维持单域，
理由是「文件名 = 被测模块名，机制名检索仍直接命中；拆分要改 118 处历史链接」。
今天：`tests/run` 已 77 个 spec；名字可达 54/86（19% 找不到，触发条件「机制名检索失败」已在
这些模块上成立）；链接实测 22 条（16 冻结层），不是 118。**前提变了，应重开而不是照旧。**
