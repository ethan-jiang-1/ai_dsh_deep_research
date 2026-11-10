---
topic: ai_dsh_company/tests 如何组织 presets/content 测试，以及为什么
intent: 读清参照仓的分区、coverage、解析式断言、独立事实源与证据边界，提炼可迁移原则和不可迁移的形状。
---

# 参照仓阅读：company pack 的 presets/content 测试怎么想（2026-11-11）

> 性质：外部参照阅读记录。参照仓 = `/Users/bowhead/ai_dsh_company`（作者本地，只读，不随本仓）；
> 本仓不复制它的业务轴与目录名。所有结论以该仓 2026-11-11 的盘上文件为准。

## 0. 一句话

它的组织不是“多两个目录”，而是把**资产是否完整、是否被消费**做成 keyless 合同，把**真挂载 /
真行为**留给 smoke 与真模型档；分区按资产寿命，不按测试类型。`tests/presets` 与 `tests/content`
只是这个原则在 company pack 上的两个落点。

## 1. 参照仓是什么（决定了它的测试形状）

company pack 是一个**多角色公司操作系统**：6 个经营角色 + 多个 support preset，有 host 半、client 半、
workspace 数据与多种内容包。它的内容本身就是产品面，且有两条正交业务轴：

- **产品类型**：`content/product-types/<id>/`（五件套 + 品类表 + reference + fixture）；
- **交付模式**：`content/delivery-modes/<mode>/`（规则 + 模板 + owner，且要分派到 CFO/COO/VP-Sales
  三个经营角色与三个 workflow）。

测试规模也说明了这一点：`tests/presets/` 8 个 spec、1632 行；`tests/content/` 5 个 spec、429 行。
它不是“给代码补单测”，而是**给内容资产建合同**。

## 2. 分区与证明边界

`tests/README.md` 的区表不是按“单元/集成/端到端”分，而是按**资产寿命与消费面**分；每区都写
“不证明什么”，并把下一层证据指出去。摘其要点：

| 区 | 测什么 | 明确不证明 |
|---|---|---|
| `tests/host` | `src/host/` 的 keyless 逻辑与真文件集成；目录镜像宿主八组 | Cordis 真装配、profile 挂载、会话级行为 |
| `tests/lib` + `tests/content` | `src/lib/` 纯逻辑；`content/` 的形状与合同（模板头、产品类型包、交付模式包、编号合同、两轴 scenario） | Host 注册/装配、运行时注入行为 |
| `tests/client` | client 视图模型 + 静态渲染 + CSS + 槽注册目录；whole-client 组合 | 真浏览器渲染交互（→ client-load-smoke / ui-scene-smoke） |
| `tests/presets` | persona / skills 声明内容；两轴 coverage（产品类型五件齐 + playbook + fixture；交付模式经营侧方法 + workflow 分派 + awareness） | 组合装配与工具行实际生效（→ preset-smoke + 会话日志） |
| `tests/harness` | 仓库结构、测试分层合同、`tools/lib/` 纯判据、会话/证据/UI 金样 | 运行时或 CLI 端到端行为 |
| `tests/support` + `tests/fixtures` | 共享夹具/合成输入与 provenance（不是 spec） | 产品行为或运行时行为 |

这里有两个值得记住的**结构性选择**：

- **spec 清单 = 各区目录本身**（DSH no-index 教义）；`tests/README` 只做导航与改动面映射，不列文件清单，
  因为清单会随仓库增长而腐。
- **真模型/真浏览器不进 `tests/`**，由 `harness/repo/layering.spec.ts` 机械守卫；需要真入口的检查写
  `checks/smoke/*.mjs` 或 `probes/`。

## 3. 四个可迁移机制

### 3.1 coverage 从盘上枚举，断言“被消费”

`tests/presets/product-type-coverage.spec.ts` 对每个 `content/product-types/<id>/` 断言：

1. `overview / document-map / requirements-model / glossary / check-rules` 五件齐；
2. `product-definition` 的品类表恰有一行指向 `references/<id>.md`，reference 在场且不是“未来类型”；
3. 至少一个 `tests/fixtures/companies/*` 的 `productType = <id>`（换公司/换类型可跑）；
4. 没有类型包的 reference 必须自报“未来类型”，不能冒充可选。

`delivery-mode-coverage.spec.ts` 对每个 mode 断言：

1. `content/delivery-modes/<mode>/` 存在；`productized` 是默认，不建包；
2. CFO/COO/VP-Sales 各至少一个 skill 的方法契约声明 `适用交付模式 = <mode>`；
3. 三个 workflow 都点名该 mode 并写 fail-closed；
4. 没有任何方法声明不存在的 mode；
5. 经营角色 persona 与 meta/手册/product-definition/CEO 四个 awareness 面都点名。

关键不在“断言多”，而在**枚举源是盘上目录**：新增一个类型/mode，测试自动扩展；删一个，引用会悬空。
这正好补上“文件存在但没人消费”的假绿。

### 3.2 解析运行时消费的格式，而不是正则扫全文

- `tests/presets/preset-yaml.ts` 用 `js-yaml` + 自定义 `!!js` schema 读 preset，`flattenPlugins`
  展开 group 行；测试拿到的是 `config.plugins` 的真实结构。
- `delegation-composition.spec.ts` 从 YAML 推导通道、worker profile、命名委托、深度、控制面、
  workflow，再和测试侧 `COMPOSITIONS` 期望模型比；这是“观测 vs 模型”，不是“把 YAML 再抄一遍”。
- `requirements-templates.spec.ts` 直接调用产品自己的 `validateProductDocs`，让模板与校验器同源；
  `requirements-contract.spec.ts` 把编号合同 R1–R10、退役词节、五层/四种定义形态钉在文本上，
  因为那是模型可见的语义合同。

### 3.3 测试侧独立事实源 + 红配方

- `presets.spec.ts` 的 `ROLES` 字面量故意不 import 生产常量：角色被误删时，测试不会静默少跑一半。
  这是**对“静默缩表”的防御**，不是反对单一事实源。
- 每个 spec 头注写“删什么会红”；BUG 标题必须对到事故卡，并在同文件留 `// 负例留证 日期：…`。
  这使“这个守卫咬过什么”在文件内可读，而不是只存在于提交历史。
- 测试名是行为命题现在时，不写 “should”；测试描述行为，不描述正确性。

### 3.4 awareness surface 与第二消费者

- 一条业务轴不只住一个目录：类型要有品类表/reference/fixture；mode 要有三角色方法/workflow/
  meta/手册/CEO skill 点名。**“资产存在”与“模型/流程知道它”是两件事**。
- fixture 是“第二消费者”：没有第二个真实消费者，就不算通用资产。这条对方法/模板同样成立。

## 4. 为什么这套在 company 成立，而形状不能照搬

company 的测试形状由三个事实撑起来：

1. **内容轴多且正交**（产品类型 × 交付模式），资产之间有稳定的引用链（品类表、reference、fixture、
   workflow、awareness），所以“盘上枚举 + 消费断言”能咬住真实回归；
2. **测试量大**（presets 1632 行），按资产/主语拆 spec 的收益大于维护成本；
3. **失败模式以“资产漏接线”为主**（新类型忘登记、mode 没分派、preset 挂载失败），而不是“某个纯函数
   算错”；所以 keyless 合同 + preset-smoke 的分层最划算。

本仓（deep-research-pack）性质不同：

- 它是**研究方法论 harness**：5 个角色（4 研究 + 1 方法编辑）、一个 run 生命周期、一套证据/lens 协议；
- 内容轴是**研究类型 × 题型 P1–P8 × lens × run 模板/节点**，不是产品类型 × 交付模式；
- 测试分区按**源面**（`run/`、`cockpit/`、`pack/`、`contracts/`、`vendor/`），`pack/` 同时拥有 presets
  与 content；
- 主要失败模式是**run 契约漂移、技能不可达、lens 不进题型、模板没人消费、模型不按纪律**，其中最后一类
  只能 L3/L4 证明。

因此可迁移的是**原则**，不是坐标：

| 参照仓原则 | 本仓落点 | 不迁移的形状 |
|---|---|---|
| 盘上枚举资产 | 枚举 `presets/*.patch.yml`、`presets/*/skills/`、`content/lenses/`、`content/templates/run/` | 产品类型/交付模式目录 |
| 断言被消费 | skill 被 persona/手册/同角色技能点名；lens 进 P1–P8 表；模板被 manual/persona/skill 点名 | 品类表/reference/fixture 链 |
| 解析运行时格式 | `js-yaml` + `!!js` 读 preset；模板 JSON 由 node-gate/verdict-audit 解析 | `preset-yaml.ts` 的目录与接口 |
| 独立事实源 | 角色数量哨兵、lens 的 8 条字面量、研究类型闭集 | 测试侧 `ROLES` 字面量（本仓 `role-list-sync` 禁止） |
| 证据边界 | 新测试只证接线；挂载 → preset-smoke；行为 → L3/L4 | `checks/smoke` 的脚本清单 |
| awareness surface | 研究类型在模板/组队矩阵/research-brief 三处一致 | meta/手册/CEO 四面的业务枚举 |

## 5. 参照仓自己也没有证明什么

这点对“把上下文搞对”最重要：

- `tests/presets` 不证明 persona 真生效、skill 真的可见、工具行真的挂上——那要 `preset-smoke` 真会话；
- `tests/content` 不证明运行时注入真的进了 prompt、手册真的被模型读到——那要 host/prompt 测试与回放；
- 行为质量（模型是否照做）只有真模型档能证明，keyless coverage 不能替代。

所以本仓的新守卫也不该被写成“presets/content 已经测好了”；它只证明**资产之间的引用与消费面在场**。
这条边界必须写进研究题与 issue，防止下一位 agent 把绿当成行为保证。

## 6. 留给本仓的问题

1. 我们需不需要一张 `tests/README` 式的“改动面 → 最窄检查”表？现在有 `docs/project-map` 词汇表与
   `guides/60` 路由表，但没有按 `presets`/`content` 面的窄入口。
2. `tests/pack/presets.test.mjs` 是否按主语拆？参照仓的 8 个 preset spec 是规模撑起来的；本仓只有
   19 个 test，拆的收益要单独算。
3. 模板字段级契约要不要补？参照仓用产品自己的 validator 做同源；本仓已有 node-gate/schema-scan，
   哪些该进 keyless、哪些留在 run 门，需要按失败模式定。
4. 每个研究类型是否需要一个 fixture 当第二消费者？参照仓的 fixture 是“换公司/换类型可跑”；本仓的
   对应物可能是按 `quick_factual / exploratory_map / claim_verification` 各一条 run fixture。

这些问题由 [已结卡](../../settled_issues/2026-11-11-presets-content-test-coverage.md) 收口；本材料不直接下实施结论。
