---
topic: 本仓 presets/content 的测试现状、九组接线实验与第一刀
intent: 用本仓证据回答“缺哪层、已经补了什么、还差什么”，并把 issue 的边界写清楚。
---

# 本仓实验：从“散落”到“接线合同”（2026-11-11）

> 性质：本仓实验与落地记录；第一刀已进树，issue 只收口剩余组织化，不是已完成的交付声明。
> 前置阅读：[参照仓阅读](2026-11-11-reference-reading.md)。实验面：
> `packages/deep-research-pack/{presets,content}`、`tests/pack/`、`docs/evaluation.md`。

## 0. 一句话

现状不是“没有测试”，而是**形状在门禁、文案在 `presets.test.mjs`、语义散在 `contracts/`**；缺的是
跨资产**接线命题**。第一刀补了 11 条（6 条 preset 接线 + 5 条 content 覆盖），全部 keyless、纯 fs +
YAML 解析；它不证明真挂载或模型行为。

## 1. 本仓测试上下文（fresh agent 先读）

| 文件 | 为什么先读 |
|---|---|
| [`tests/AGENTS.md`](../../../../tests/AGENTS.md) | 四个域（run/cockpit/pack/contracts）+ vendor；`pack/` 是 presets/content 的 owner；`*.test.mjs` 即回归，fixtures 不在发现面 |
| [`docs/evaluation.md`](../../../../docs/evaluation.md) §L0/§L3 | 新测试属于 L0 契约回归；L3 方法论完整性另有映射审查与真模型档，不由 keyless 覆盖替代 |
| [`docs/project-map.md`](../../../../docs/project-map.md) §测试怎么选 | 三轴（档位/验收面/命名即层）与“新检查落家序”；契约测试是第 1 步，义务 = evaluation 登记 + 带反证 |
| [`docs/guides/60-dev-loop.md`](../../../../docs/guides/60-dev-loop.md) §2 | 任务型路由；纯文档/卫生只跑 L0；preset 内容改动还要看 L1 preset-smoke |
| [`tests/contracts/layering.test.mjs`](../../../../tests/contracts/layering.test.mjs) | tests 禁真模型/浏览器/子进程/网络；新测试必须保持 keyless |
| [`tests/contracts/test-surface.test.mjs`](../../../../tests/contracts/test-surface.test.mjs) | `scripts/lib` 与 pack `src/lib` 的覆盖边界；新测试不改变该登记 |
| [`tests/contracts/no-unused-code.test.mjs`](../../../../tests/contracts/no-unused-code.test.mjs) | 新 helper/import 不得留下未使用绑定 |
| `guard-red-record` 门禁 | 标题带 BUG-nnn 才需要负例留证；本卡新测试没用 BUG 标题 |

当前命令：`pnpm test`（递归 glob，keyless，约 3–4s）、`pnpm verify`（L0 结构门禁）、
`pnpm test:vendor`（vendor 源码契约，另档）。新测试只跑 `pnpm test` 与 `pnpm verify` 即可。

## 2. 现状盘点（2026-11-11 盘上）

### 2.1 presets

- 5 个角色（`lead / scout / analyst / critic / method-editor`），15 个 `SKILL.md`。
- 形状门禁：`scripts/verify/gates/b-pack.mjs` 的 `preset-structure` 查声明行、config 字段、时钟行、
  skill 目录、frontmatter name；`row-deps` 查 peer；`pack-bundle-compat` 查 bundle 数组。
- `tests/pack/presets.test.mjs`：19 个 `test`、323 行。主语包括 roster 哨兵、行字段、skill
  frontmatter、peer、bundle 行、web 预算、subagent/workflow、engines，以及 HITL1/HITL2 文案、
  reader-final、claim-verdict、报告首屏。
- 没有的接线断言：`skill-filesystem` 是否指向**自己的** skills 目录；`tool-skill` 是否成对；
  技能名是否跨角色唯一；技能是否有 persona/手册/同角色技能点名；`agentPreset` 引用是否都在盘上。

### 2.2 content

- 资产：1 份 `manual.md`、8 个 lens、10 个 run 模板（8 md + 2 JSON）、1 个 wave recipe。
- 现有测试：`content-injection`（随包/插值/注入行/10 件模板存在）、`lenses`（8 条、七字段、pairs、
  无人格句）、`wave-contract` / `wave-recipes`（plan 模板与 lens fanout）、`content-effect`
  （`ctx.effect` 注册）；另有 `run-bundle-charter`、`rerun-triage`、`schema-scan`、`verdict-audit`
  等各钉一段。
- 没有的接线断言：从盘上枚举模板并断言每件被 manual/persona/skill 点名；`templates/run/<name>`
  字面引用可解析；P1–P8 题型表是否覆盖所有 lens；研究类型词表是否跨三面一致。
- `content-injection` 里的 `TEMPLATES` 是**手写 10 件清单**——新增模板不会自动进入它。这是“手写清单
  会腐”的本仓实例，也是新 coverage 测试用盘上枚举的直接理由。

### 2.3 缺口（按本仓词汇，不发明新层）

| 面 | 缺口 | 应由哪类证据补 |
|---|---|---|
| preset ↔ skill | 根归属、加载器成对、唯一性、孤儿、`agentPreset` 引用 | keyless 契约测试（`tests/pack`） |
| lens ↔ 题型 | 8 个 lens 是否都进入 P1–P8 默认/加面表 | keyless 契约测试 |
| template ↔ 消费面 | 每件模板是否被 manual/persona/skill 点名；引用是否悬空 | keyless 契约测试 |
| 研究类型 ↔ 三面 | 模板枚举 / 组队矩阵 / research-brief 是否同一闭集 | keyless 契约测试 |
| 真挂载/真行为 | 技能真的可见、persona 真的生效、模型真的照做 | L1 preset-smoke / L3 / L4，不进本层 |

## 3. 实验：九个候选不变量

方法：先用一次性 Node 脚本直接读盘 + `js-yaml`（含 `!!js` schema，展开 group 行），不先写测试文件；
逐条问“现在是否真的成立、成立说明什么、不成立是不是真 bug”。九条全部成立，说明现状干净；因此守卫
的价值是**防未来悄悄断线**，不是修当前缺陷。

| # | 候选不变量 | 观测 |
|---|---|---|
| 1 | 每个 preset 恰有一条 `skill-filesystem`，`customSkillDirs` 只指自己的 `presets/<role>/skills` | 成立 |
| 2 | `skill-filesystem` 与 `tool-skill` 成对 | 成立 |
| 3 | 技能名跨角色唯一 | 成立（15 个技能，零重名） |
| 4 | 每个技能被自己的 persona / 手册 / 同角色另一个技能点名 | 成立；`nodes-contract` 靠手册，`question-patterns` 靠手册 + `research-brief`，`method-from-run` 靠 `method-interview` |
| 5 | `agentPreset` / `allowedAgentPresets` 都指向盘上角色 | 成立 |
| 6 | 研究类型闭集在三处一致 | 成立（`quick_factual / exploratory_map / claim_verification`） |
| 7 | P1–P8 八行齐，默认 lens 1–4 个，8 个 lens 都至少被一行点名 | 成立 |
| 8 | `content/templates/run/` 每件都被 manual/persona/skill 点名 | 成立 |
| 9 | 所有 `templates/run/<name>` 字面引用可解析 | 成立（5 处） |

两个**假阳性**教训：

- lead persona 说 `spawn_teammate` / `team_task`，但 preset 里没有 team 行——team 行由
  `vendor/dsh/packages/experimental/agent-team-profile` 层提供。不能断言“persona 提到工具 ⇒
  preset 必须有该行”。
- `method-editor` persona 写“不调用 web / fs / subagent”——否定句里的关键词会让 naive 文本扫描
  假红。文本断言只适合钉“必须说出口的合同句”，不适合推导工具面。

这两个教训决定了第一刀的边界：**只测 skill/资产接线，不测工具承诺**。

## 4. 第一刀（已落，11 例）

- `tests/pack/preset-helpers.mjs`：`js-yaml` + `!!js` schema，展开 group 行；非 spec，不进发现面。
- `tests/pack/presets-wiring.test.mjs`（6 个 `test`）：
  1. skill 根归属（恰一条 `skill-filesystem`，只指自己目录）；
  2. 目录/加载器成对（`tool-skill` 在场）；
  3. 技能名跨角色唯一；
  4. 技能消费面（自己的 persona / 手册 / 同角色技能点名）；
  5. frontmatter name = 目录名、description 非空；
  6. `agentPreset` / `allowedAgentPresets` 引用都在盘上。
- `tests/pack/content-coverage.test.mjs`（5 个 `test`）：
  1. 研究类型闭集：question 模板枚举 = team-assembly 矩阵 = research-brief 判型；
  2. 闭集外近形扫描（content + presets 全文）；
  3. P1–P8 × lens：八行齐、默认 lens 1–4、每个 lens 至少被一行点名；
  4. run 模板消费面 + `templates/run/<name>` 引用可解析；
  5. manual 的 `{{research_pack_root}}` 模板根存在。
- `docs/evaluation.md`：L0 契约回归登记一行。

### 红证（逐条实跑，先红后绿）

| 注入 | 红的守卫 |
|---|---|
| lead 的 `customSkillDirs` 改指 `presets/scout/skills` | skill 根归属 |
| 删 lead 的 `tool-skill` 行 | 目录/加载器成对 |
| 复制 `nodes-contract` 到 `scout/skills/` | 技能名唯一 |
| 新增 `scout/skills/orphan-skill/` 无人点名 | 技能消费面 |
| `allowedAgentPresets` 的 `critic` 改 `critic-x` | agentPreset 引用 |
| question 模板 `claim_verification` 改 `claim_check` | 研究类型闭集 |
| P7 默认 lens 改 `ghost` | P1–P8 × lens |
| 新增未点名 `templates/run/orphan.md` | 模板消费面 |
| lead persona 的 `verdicts.json` 改 `verdicts-missing.json` | 模板引用可解析 |

### 每条测试证明 / 不证明

| 测试 | 证明 | 不证明 |
|---|---|---|
| skill 根归属 / 加载器成对 | preset 声明了正确的技能目录与加载工具 | 真会话里技能真的可见（→ preset-smoke） |
| 技能消费面 | 技能在 persona/手册/同角色技能里有入口 | 模型真的会加载它 |
| 研究类型闭集 | 三处文本用同一套类型词 | 模型真的按类型分派 |
| P1–P8 × lens | 选择表覆盖 8 个 lens 且引用在场 | review 的 topic × lens 覆盖真的执行 |
| 模板消费面 | 模板被某个模型可见面点名 | 模板字段被正确填写（→ node-gate/schema-scan） |

验证：`pnpm test` 1122/1122；`pnpm verify` 全绿。中途曾出现并行未跟踪
`_backlog/.../preference-protocol-*` 引发的 `md-links` 红，随后其自身变更进入 tracked 面后消失，
与本轮资产无关。

## 5. 没有断言什么（以及为什么）

- **persona 提到工具 ⇒ preset 必须有行**：team 层与否定句会假红（见 §3）。
- **对称 `pairs_with`**：lens 配对是方向性的（`historical → official`，`official` 不回指
  `historical`），对称会制造假规则。
- **模板字段级节集**：已有 `run.md` 的键集/phase 合同与 node-gate/schema-scan；给
  `question/topics/leads/findings/final` 再抄一遍节名，容易把散文变成第二份真相，留给独立卡。
- **真挂载/真模型**：keyless 只证文件与引用；真行为归 L1/L4。
- **覆盖百分比/台账**：2026-10-05 已判“全量覆盖账不做”；这 11 条是行为命题，不是覆盖率清单。

## 6. 与历史裁决的关系

- **2026-10-05 测试资产组织**：判“全量覆盖账不做、不按测试类型分目录”。本卡不推翻；新测试是
  “资产被接线”的契约，不是“每个文件都有一条测试”的台账。
- **2026-10-20 的 tests 分域裁决**：目录映射被测面；`tests/pack/` 是 presets/content 的 owner。本卡不新建
  `tests/presets` / `tests/content` 子域，避免为组织而组织。
- **触发重评**：`tests/pack` 文件数显著上升、或按改动面检索开始靠猜、或 coverage 测试开始维护
  手写资产清单——任一条出现，再谈目录/结构变更。

## 7. 剩余工作

1. **`presets.test.mjs`：裁决不拆**（323 行、19 个 test；按源面/模型，不按主题）；trigger = 单文件 >500 行 /
   第二个独立合同模型 / 一次改动跨 ≥3 个主题且 review 痛。理由与裁决 = [已结卡](../../settled_issues/2026-11-11-presets-content-test-coverage.md)。
2. **`content-injection` 的模板清单改为盘上枚举**：它现在手写 10 件；新增模板不会自动进入。可以复用
   `content-coverage` 的枚举，或抽一个共享的模板清单读取器——这是第二份手写清单的机会成本，不阻塞本卡。
3. **模板字段级契约**：`question/topics/leads/findings/final` 还没有像 `run.md` 那样的键集/节集守卫；
   要不要补、补到什么粒度，需另立卡，避免抄散文。
4. **每个研究类型一个 fixture**：本仓 `schema-scan` 夹具已有 quick_factual，但 exploratory_map /
   claim_verification 没有显式样本；要不要补，取决于能否咬住真实回归，而不是为了对称。

1 已裁决并归档：[已结卡 2026-11-11-presets-content-test-coverage](../../settled_issues/2026-11-11-presets-content-test-coverage.md)；2–4 的覆盖收口 = [已结卡 2026-11-11-test-asset-coverage](../../settled_issues/2026-11-11-test-asset-coverage.md)。
