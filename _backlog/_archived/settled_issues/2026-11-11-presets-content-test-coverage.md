---
status: 已结
opened: 2026-11-11
---

# 推敲：presets/content 测试资产的组织化——拆 presets.test 与固定接线契约边界

> 立卡：2026-11-11 ｜ 状态：已结 ｜ 类型：Task ｜ 结论倾向：以后做 ｜ 可关闭：是
> 去向：deferred — [triggers](../../triggers.md)「presets.test.mjs 拆分」（暂不拆：323 行、19 个 test；按源面不按主题；触发 = 单文件 >500 行 / 第二个独立合同模型 / 一次改动跨 ≥3 个主题且 review 痛）
>
> **研究依据**：[presets-content-test-coverage 题名页](../research/presets-content-test-coverage/README.md) → [参照仓阅读](../research/presets-content-test-coverage/2026-11-11-reference-reading.md) + [本仓实验](../research/presets-content-test-coverage/2026-11-11-our-experiment.md)
> **开工边界**：第一刀（helper + 2 条 spec + 11 例）已落；本卡只收口“拆 323 行 `presets.test.mjs` + 边界决定”。不改 pack 行为、不改门禁、不动 content 文案。

## 裁决（2026-11-11）

**不拆。** 第一刀（11 例接线契约）保留；`presets.test.mjs` 继续作为单文件，一个主语 = preset 的声明与模型可见文案。

理由：

- 323 行、19 个 test，全量回归约 3 秒；没有“按改动面检索靠猜”的实证；
- 按 structure / delegation / hitl / delivery 拆是**按主题**切片，与 2026-10-20“目录映射被测面”的裁决相抵，
  且会把 BUG 负例留证切碎；
- 参照仓 `presets.spec.ts` 单文件 694 行，比本仓整份还大；它的 8 个 spec 是 8 个**独立合同模型**，
  不是主题切片；
- 正确的测试组织已经成形：`presets.test`（声明/文案）、`presets-wiring`（role↔skill）、
  `content-coverage`（content↔选择/模板）。若 manual T0 缝落地，加 `content-disclosure`，不拆 presets。

触发才拆：单文件 >500 行，或出现第二个独立合同模型，或一次改动跨 ≥3 个主题且 review 开始痛。
届时按**模型**拆，不按主题拆。触发登记 = [triggers](../../triggers.md)「presets.test.mjs 拆分」。

**问题与期望结果：** 现在 `tests/pack/presets.test.mjs` 323 行，把 roster/行结构、委派面、HITL 文案、reader-final、claim-verdict 混在一个文件里；改一处 persona 要读整份，跑一处失败要在一屏里找主语。期望：按**被测主语**拆开，结构断言改用 YAML 解析，文案断言只留模型可见合同与 BUG 留证；新增的接线契约（`presets-wiring` + `content-coverage`）保持独立，不并回大文件。

**当前情况：**

- 参照仓调研与九组候选不变量实验已完成（见研究材料）；九条在现状全部成立，守卫价值在防未来断线。
- 第一刀已落树：`tests/pack/preset-helpers.mjs`（`js-yaml` + `!!js` schema + group 展开）、
  `tests/pack/presets-wiring.test.mjs`（6 例）、`tests/pack/content-coverage.test.mjs`（5 例）；
  `docs/evaluation.md` L0 已登记。红证 9 组（跨接 skill 根/删 `tool-skill`/同名技能/孤儿技能/
  幽灵 lens/孤儿模板/悬空引用/类型漂移/ stale `agentPreset`）全部先红后绿。
- `tests/pack/presets.test.mjs` 未动。它同时承担：roster 哨兵、preset 行字段、skill frontmatter、
  peer 依赖、bundle 行、web 预算、subagent/workflow、engines、HITL1/HITL2 文案、reader-final、
  claim-verdict、报告首屏。`preset-structure` 门禁覆盖了其中一部分形状断言。
- 域边界不变：`tests/pack/` 仍是 pack 结构/preset/导出的 owner（2026-10-20 分域裁决 = 目录映射被测面）。

**未决问题：**

1. **拆分粒度**：按 4 个主题拆（`presets-structure` / `presets-delegation` / `presets-hitl` /
   `presets-delivery`），还是 3 个？推荐 4 个——HITL 与交付文案的改动面不同，混在一起会回到“一屏找主语”。
2. **与门禁重复的断言**：`preset-structure` 已查行字段、skill 目录、frontmatter。拆分时**删掉纯重复**、
   保留“门禁不查的接线属性”（skill 根归属、加载器成对、技能孤儿、`agentPreset` 引用），还是全部保留作
   快速反馈？推荐前者：重复断言会在两处漂移，且 `pnpm verify` 是收尾必跑。
3. **模板字段级契约**（question/topics/leads/findings/final 的键集/节集）是否本卡做：推荐**不做**，
   另立卡；本卡只做组织化，避免把散文再抄一遍。
4. **用户确认**：拆分粒度与“删纯重复”是否接受；不接受则本卡回 `推敲中` 并记录理由。

**下一步：** 用户确认上述 1/2 两项 → 按 §方案与取舍 拆文件、迁 BUG 留证、跑红证与 L0 →
同变更写 Note、`可关闭：是`、归档；若用户要保留单文件，则回 `推敲中` 并只保留接线契约。

## 已知与未决

### 已知（证据锚点）

- **参照仓**：`/Users/bowhead/ai_dsh_company/tests/presets/`（`presets.spec.ts`、`product-type-coverage.spec.ts`、
  `delivery-mode-coverage.spec.ts`、`preset-yaml.ts`、`delegation-composition.spec.ts`）；
  `tests/content/templates.spec.ts`、`requirements-templates.spec.ts`；`tests/README.md` 四区表。
- **本仓现有**：`tests/pack/presets.test.mjs`（323 行，测试清单见文件）；`scripts/verify/gates/b-pack.mjs`
  的 `preset-structure`；`tests/pack/presets-wiring.test.mjs` / `content-coverage.test.mjs`（第一刀）；
  `tests/contracts/guard-red-record` 的 BUG 留证规则。
- **历史裁决**：2026-10-05 测试资产组织判“全量覆盖账不做、不按测试类型分目录”；2026-10-20 分域裁决
  “目录映射被测面”。本卡不推翻；接线契约是 11 条行为命题，不是覆盖台账。
- **当前验证**：`pnpm test` 1122/1122；`pnpm verify` 全绿（并行出现的未跟踪 `_backlog/.../preference-protocol-*`
  已随其自身变更进入 tracked 面，`md-links` 红已消失）。

### 未决（实施期才回答）

- 拆分后是否需要一条“旧测试标题 → 新文件”的迁移表；若要，放本卡 `## 交付证据` 还是 Note。
- 结构断言改用 helper 后，是否删掉 `presets.test.mjs` 里对 `engines.dsh` 的文本匹配（`satisfiesVersion`
  已足够）。
- 拆完后是否给 `tests/pack` 增加一个 `README`/域注释；当前 `tests/AGENTS` 已有域表，优先不改预算顶格的
  `tests/AGENTS.md`。

## 方案与取舍

### 方案 A（推荐）：按主语拆 4 个文件，结构断言解析化

| 文件 | 主语 | 从旧文件迁什么 |
|---|---|---|
| `tests/pack/presets-structure.test.mjs` | roster、preset 行、skill frontmatter、peer、bundle、engines | roster 哨兵、行字段、frontmatter、peer、bundle、engines |
| `tests/pack/presets-delegation.test.mjs` | subagent / workflow / team / maxDepth / allowedAgentPresets | 委派配置、workflow-only-analyst、死行回归 |
| `tests/pack/presets-hitl.test.mjs` | HITL1 两段卡、ask 硬约束、计划卡字数、业务简报 | HITL1/HITL2 文案与 skill 合同 |
| `tests/pack/presets-delivery.test.mjs` | reader-final、claim-verdict、报告首屏、三态 | 交付/报告/claim 文案 |

- 结构断言改用 `tests/pack/preset-helpers.mjs` 的 `loadPreset`/`rowById`，不再用全文正则猜 `config` 归属。
- 文案断言保留逐字合同句与 BUG 留证；不再把“行字段在场”这类门禁已查的纯重复抄一遍。
- 旧文件删除；`docs/evaluation.md` 的登记改指新文件。

### 方案 B：保留单文件，只加接线契约

- 第一刀已经加了接线契约；本卡若只做 B，等于不做组织化。323 行继续混，改 HITL 仍要读交付文案。
- 否决：用户本轮要的正是“先 research 再 issue”的组织化落点，B 没有可交付的组织收益。

### 方案 C：按 `tests/pack/presets/` 与 `tests/pack/content/` 再分子目录

- 参照仓的目录形状；本仓 2026-10-20 裁决是“目录映射被测面”，`pack/` 已是 owner；再按对象类型分，
  会把 `tests/pack` 变成第二层分类学。
- 否决：导航收益小于路径 churn 与域表维护成本。触发重评 = `tests/pack` 文件数显著上升或检索开始靠猜。

### 输掉的方案

| 方案 | 否决理由 |
|---|---|
| 把接线契约并回 `presets.test.mjs` | 两个新 spec 的主语是“接线/覆盖”，与单角色文案不同；并回会重新变成大文件 |
| 用测试侧角色字面量替代盘上枚举 | `role-list-sync` 门禁禁止；本仓用 5 角色哨兵 + 盘上枚举 |
| 断言“persona 提到工具 ⇒ preset 必须有行” | team 行由 vendor 层提供；method-editor 还有否定句；会假红 |
| 给每个模板补字段级节集测试 | 本卡外；容易把散文再抄一遍，先另立卡 |

## 范围

| 做 | 不做（本卡外） |
|---|---|
| 拆 4 个主题文件、迁 BUG 留证 | 改 pack persona/skill/content 文案 |
| 结构断言改用 `preset-helpers.mjs` | 改 `preset-structure` 门禁或 `verify` |
| 删除纯重复的门禁断言（经用户确认） | 新模板字段级契约（另立卡） |
| `docs/evaluation.md` 登记改指 | `tests/AGENTS.md` 域表/预算变更（非必要） |
| 红证 2 组 + L0 复跑 | 真挂载/真模型档（非本卡判据面） |

## 验收标准

1. `tests/pack/presets.test.mjs` 拆为 4 个主题文件（structure / delegation / hitl / delivery），旧文件删除；
   每个文件只测一个主语，标题为行为命题。
2. 旧文件的每条 `test` 标题都有去向：迁入新文件，或在卡上记“退役 + 理由”；无静默丢失。
3. 结构断言（行/config/`agentPreset` 引用）走 `preset-helpers.mjs` 解析；文案断言只保留模型可见合同句
   与 BUG 负例留证；纯重复的 `preset-structure` 断言已删（用户确认后）。
4. BUG 负例留证块随所属测试迁移，`guard-red-record` 绿；至少 2 组迁移后的守卫做注入红→还原绿，记录在卡。
5. `pnpm test` 全绿；`pnpm verify` 在 tracked 树上全绿（除并行未跟踪资产的 `md-links` 外部红）。
6. `docs/evaluation.md` 的 preset/content 登记指向新文件；无重复/死链。
7. 不改 pack 行为、content 文案、门禁与测试发现命令；`tests/pack` 域边界不变。

## 关闭条件

- 上述验收标准全满足，且用户对拆分粒度与“删纯重复”无异议；
- 同变更写 `notes/implemented/2026-11-11-presets-content-test-coverage.md`（记录接线契约边界、
  拆分粒度和“不做的覆盖台账”），`可关闭：是` 并归档；
- 若用户要求保留单文件或保留重复断言，本卡回 `推敲中`，记录理由，不以“已拆分”关闭。
