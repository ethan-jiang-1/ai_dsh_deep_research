---
status: 已结
opened: 2026-11-11
---

# 推敲：presets/content 测试资产的覆盖收口——模板清单、模板契约、类型 fixture

> 立卡：2026-11-11 ｜ 状态：已结 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：是
> 去向：implemented — [Note](../../../notes/implemented/2026-11-11-test-asset-coverage.md)（模板 schema 集、解析键、具名非 quick 类型；keyless 测试资产调整，未改 pack 行为）。
>
> **研究依据**：[presets/content 测试与内容组织题名页](../research/presets-content-test-coverage/README.md) → [参照仓阅读](../research/presets-content-test-coverage/2026-11-11-reference-reading.md) + [本仓实验](../research/presets-content-test-coverage/2026-11-11-our-experiment.md)
> **组织约定**：[design/70 内容组织](../../../docs/design/70-content-organization.md)
> **已结前置**：`presets.test.mjs` 拆分已裁决**不拆**（[已结卡](2026-11-11-presets-content-test-coverage.md)）；本卡不重开拆分，只收口覆盖边界。

**问题与期望结果：** 第一刀接线契约已落（`presets-wiring` 6 例 + `content-coverage` 5 例），但测试资产还有三个“半接头”：`content-injection` 仍手写 10 件模板清单（新增模板不会自动进入）；`question/topics/leads/findings/final` 没有像 `run.md` 那样的字段/节集契约；研究类型只有 quick_factual 有显式 fixture，exploratory_map / claim_verification 没有“第二消费者”。期望：把这三个缺口收成**窄而可失败**的契约，或者显式判“不做 + trigger”，不留“看起来覆盖了”的假象。

**当前情况：**

- **已落**：`tests/pack/preset-helpers.mjs`；`tests/pack/presets-wiring.test.mjs`（skill 根/加载器成对/唯一/孤儿/`agentPreset` 引用）；`tests/pack/content-coverage.test.mjs`（研究类型闭集、P1–P8×lens、模板消费面、manual 模板根）；`docs/evaluation.md` L0 登记；9 组红证。
- **手写清单**：`tests/pack/content-injection.test.mjs` 的 `TEMPLATES` 是 10 件字面量；新增模板不会自动进入，删除模板会红（两个方向不对称）。
- **模板契约**：`tests/contracts/run-bundle-charter.test.mjs` 钉 `run.md` 的键集/phase/schema；`tests/run/schema-scan.test.mjs` 用 `run.md` 模板造 run 验零违约；`tests/run/verdict-audit.test.mjs` 钉 `claims.json`/`verdicts.json` 写者契约。`question/topics/leads/findings/final` 没有同级的键集/节集断言，只有散在 `presets.test`/`rerun-triage`/`wave-contract` 的文本句。
- **fixture**：`tests/fixtures/schema-scan/` 有 quick_factual 形态；`tests/fixtures/node-gate/bundles/` 有 quick_factual/complete 等；没有按 exploratory_map / claim_verification 命名的显式样本。
- **拆分**：`presets.test.mjs` 323 行、19 个 test；裁决不拆，trigger = 单文件 >500 行 / 第二个独立合同模型 / 一次改动跨 ≥3 个主题且 review 痛。

**未决问题：**

1. **模板清单的方向**：只把 `content-injection` 的 `TEMPLATES` 改成盘上枚举，还是让它与 `content-coverage` 共用一个 `templateNames()` 读取器？推荐后者：一处枚举，两个断言各取所需。
2. **模板契约的粒度**：给五个模板补字段/节集，还是只补“机器会读的键”（question 的研究类型/计划确认、topics 的 lenses、leads 的状态、findings 的 F#/gap、final 的六节）？推荐后者：只钉机器/流程真正消费的键，不把散文节名抄成第二份真相。
3. **类型 fixture**：exploratory_map / claim_verification 各造一条最小 bundle，还是只造能咬住 node-gate/schema-scan 的最小样本？推荐后者：先证明它们能触发一个真实的门禁分支，再决定是否加更多。
4. **是否需要新文件**：`content-injection` 改造 vs 新增 `template-contract` / `type-fixtures` 测试；推荐按主语分：清单改造留在 `content-injection`，模板契约新文件，fixture 用例进现有 `schema-scan`/`node-gate` 测试。

**下一步：** 用户确认 1/2/3 的推荐 → 先改 `content-injection` 的清单（红证：新增模板不登记即红）→ 加模板契约（先红）→ 加类型 fixture（先红）→ 跑 `pnpm test`/`verify` → 写 Note、归档；若某项判“不做”，在本卡记理由 + trigger，不假装覆盖。

## 已知与未决

### 已知（证据锚点）

- 第一刀：`tests/pack/presets-wiring.test.mjs`（6 例）、`tests/pack/content-coverage.test.mjs`（5 例）；研究材料 §4 有 9 组红证。
- 清单：`tests/pack/content-injection.test.mjs` 的 `TEMPLATES = [...]`；`tests/pack/content-coverage.test.mjs` 已用 `readdirSync` 枚举模板。
- 模板契约：`tests/contracts/run-bundle-charter.test.mjs`（run.md）、`tests/run/schema-scan.test.mjs`（模板→解析器）、`tests/run/verdict-audit.test.mjs`（claims/verdicts）。
- fixture：`tests/fixtures/schema-scan/`、`tests/fixtures/node-gate/`；taxonomy = `tests/fixtures/README.md`。
- 历史：2026-10-05 判“全量覆盖账不做”；本卡只做**窄契约**，不造覆盖台账。

### 未决（实施期才回答）

- 模板契约里哪些键是“机器/流程真正消费”的，哪些只是模型看到就够；
- exploratory_map / claim_verification 的最小 fixture 是否需要新目录，还是复用 `schema-scan` 的 `drt-*` 形态；
- 新增 fixture 后是否触发 `navigability-contract` 的 consumer 对账（需要真实 consumer，不能只放样本）。

## 方案与取舍

### 方案 A（推荐）：清单共用一个读取器 + 窄模板契约 + 最小类型 fixture

1. 抽 `tests/pack/template-files.mjs`（或 `preset-helpers` 旁）提供 `templateNames()`；`content-injection` 与 `content-coverage` 共用；红证 = 新增模板不进清单即红。
2. 新增 `tests/pack/template-contract.test.mjs`：只钉机器/流程消费的键（见 §未决 2），每个模板至少一个键；红证 = 删键即红。
3. 在现有 `schema-scan` / `node-gate` 测试里加 exploratory_map / claim_verification 的最小 fixture 用例；红证 = 类型条件件缺席即红。

### 方案 B：只改手写清单，其他判不做

- 收益最小、风险最低；但模板契约和类型 fixture 的缺口继续存在。可作为方案 A 被用户砍掉两项后的退路。

### 方案 C：给五个模板补完整字段/节集

- 容易把散文节名抄成第二份真相，维护成本高；否决。只补机器消费键。

### 输掉的方案

| 方案 | 否决理由 |
|---|---|
| 用覆盖台账/百分比 | 2026-10-05 已判不做；清单会腐 |
| 给每个模板都造 fixture | 没有真实门禁分支的样本只是装饰 |
| 把模板契约并进 `presets.test.mjs` | 主语是“模板 schema”，不是 preset 声明；会重新变成大文件 |

## 范围

| 做 | 不做（本卡外） |
|---|---|
| 模板清单盘上枚举/共用读取器 | 拆 `presets.test.mjs`（已裁决不拆） |
| 窄模板契约（机器消费键） | 全量模板字段/节集 |
| exploratory_map / claim_verification 最小 fixture | 每个模板/每个题型都配 fixture |
| 红证 + L0 + evaluation 登记 | 改 pack 行为/门禁/内容文案 |

## 验收标准

1. `content-injection` 不再维护独立手写模板清单；新增模板未登记时测试红，删除模板时仍红（两方向对称）。
2. `template-contract`（或等价）测试在场，只钉机器/流程消费键；删任一键先红，还原后绿；判“不做”的模板在卡上记理由 + trigger。
3. exploratory_map / claim_verification 至少各一条 fixture 用例，且能触发一个真实门禁/解析分支；若判不做，记理由 + trigger。
4. `pnpm test` 全绿；`pnpm verify` 在 tracked 树上全绿；`docs/evaluation.md` 对应登记更新。
5. 不改 pack 行为、content 文案、门禁与测试发现命令；coverage 层 11 例不被合并/弱化。

## 交付证据

- **已落**：`tests/pack/template-files.mjs`（`CORE_TEMPLATES` + 盘上 `templateFiles()`）、
  `tests/pack/template-contract.test.mjs`（4 个模板、只钉解析器/门禁消费键）、
  `content-injection`/`content-coverage` 共用盘上枚举、`tests/run/schema-scan.test.mjs` 的
  具名非 quick 类型（exploratory_map / claim_verification）合成 bundle 用例。
- **验证**：`pnpm test` 1127/1127；`pnpm verify` 全绿；红证 4 组（新增 orphan 模板 / findings 删 gap /
  leads 删状态 / 类型测试改 quick_factual）全部先红后绿。
- **未跑**：L1/L2/L4 不属本卡判据面（纯 keyless 测试资产，无模型可见或安装面改动）。
- **Note**：[2026-11-11-test-asset-coverage](../../../notes/implemented/2026-11-11-test-asset-coverage.md)

## 关闭条件

- 上述 1–4 满足，用户对“窄契约/不做项”无异议；
- 同变更写 `notes/implemented/2026-11-11-test-asset-coverage.md`（清单改造、模板契约取舍、fixture 取舍、红证），`可关闭：是` 并归档；
- 任一项判不做时，trigger 落 `_backlog/triggers.md`，不以“测试已绿”关闭。
