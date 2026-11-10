# 70 · 内容组织：按寿命分家，按需披露

> 层：设计（为什么 / 怎么长）。适用 = `packages/deep-research-pack/{presets,content}`。
> 本页不是文件清单：清单 = 盘上目录。本页只定**新内容放哪、怎么长、什么时候该动结构**。
> 相关：常驻面预算 = `content-shape` 门禁；接线守卫 = `tests/pack/{presets-wiring,content-coverage}.test.mjs`；
> 测试落家 = [project-map §测试怎么选](../project-map.md)；上游参照（只读，不随仓）= `ai_dsh_company/docs/content-charter.md`。

## 0. 一句话

**先问“这段内容跟谁一起变”，再问“它是不是每轮都必须在场”，最后才决定放哪。** 结构为寿命服务，
不为整齐服务；能按需读的，不放进常驻面；能用盘上枚举验证的，不维护手写清单。

## 1. 四槽：先分清是什么

| 槽 | 本仓对应物 | 典型家 |
|---|---|---|
| 人 | 身份、职责边界、工具面、必须每轮在场的硬规则 | `presets/<role>.patch.yml` 的 persona / 工具行 |
| 流程 | 角色怎么做；跨角色怎么交接 | `presets/<role>/skills/`；跨角色协议在 `content/manual.md` |
| 方法 | 研究视角、题型选择、用户偏好 | `content/lenses/`、lead 的 `question-patterns` skill、workspace `method-library.md` |
| 政策 | 研究类型的条件性、深度、证据门槛、HITL | 分散在 `team-assembly` / `research-brief` / `nodes-contract` / 模板 |
| 实例 | 这一次 run 的变量 | workspace 的 `drt_<slug>/`；不进包 |

“政策”不是第五层；它是 run-type 的条件性，住在使用它的流程/skill/模板里，不另造目录。

## 2. 三层 + 一实例

| 层 | 回答 | 本仓落点 |
|---|---|---|
| engine / contract | 系统怎么跑；随 DSH pin 变 | preset 工具行、`src/content` 注入、`cordis.patch.yml` |
| generic | 所有研究都成立吗 | `content/manual.md`（T0）+ `content/generic/`（按需） |
| run-type | 快速事实 / 探索地图 / 主张验证的差异 | 组队矩阵、research-brief、nodes-contract、模板的条件句 |
| instance | 这一次 run 的具体变量 | run bundle（workspace） |

方法（lens / 题型 / 方法库）是**正交轴**，不是第四层。它跨 run-type 存在，住在数据与选择逻辑里。

## 3. 放哪：按“变更时一起动”分

| 家 | 跟什么一起变 | 怎么长 |
|---|---|---|
| `presets/<role>.patch.yml` | 角色身份 / 工具面 / DSH pin | 加角色或改工具行 |
| `presets/<role>/skills/` | 这个角色的做事方式 | 加 skill 目录；persona 或同角色 skill 点名 |
| `content/manual.md`（T0） | 跨角色、且不加载任何 skill 也必须知道的**不变量与索引** | 加不变量或指针；撞顶时下放，不扩顶 |
| `content/generic/`（缝） | 跨角色、但可以按需读的细则 | 加文件 + T0 指针；每个文件都要被点名 |
| `content/templates/run/` | run 工件的结构（schema 实例） | 加模板 + 写者/解析者/门禁消费者 |
| `content/lenses/` | 证据面数据 | 加文件 + 进 P1–P8 选择表 |
| `content/waves/` | 可执行的研究配方 | 加 recipe + workflow 消费者 |
| workspace `method-library.md` / run bundle | 用户偏好 / 本次实例 | 不进包；harness 只读 |

**判定顺序**：换角色要改吗 → 角色 skill；换研究类型要改吗 → 条件句/模板；换方法要改吗 → lens/题型/库；
只有机制变才改吗 → engine；只有这次 run 变吗 → bundle。四问全“不” = 还没找到不变量，停。

## 4. 生长协议（加新内容的五步）

1. **定性**：用 §1 的四槽和 §3 的“跟什么一起变”选家；不按文件后缀选。
2. **选家**：优先放进已有家。确实没有家，才加新家——并且同一变更里写清“它跟什么一起变、谁消费、
   什么触发搬家”，不先建空层。
3. **接消费边**：内容不是放进目录就生效。persona/手册/skill 点名、P1–P8 选择表、模板写者/解析者、
   run 门禁——至少一条入边；没有入边的资产就是孤儿。
4. **加守卫**：优先**盘上枚举**（新增资产自动进入检查），不维护手写清单。研究类型、P1–P8 这类
   **闭集词表**是例外：它们是决策，不是清单，改它们要同时改三处消费面 + 测试。
5. **补证据**：模型可见变更（persona/skill/手册/模板）要带 L1 真挂载；改手册/提示词装配还要
   snapshot B / L4-lite。keyless 绿只证文件与引用，不证行为。

## 5. 三条缝（可生长，不预建）

- **T0 ↔ generic**：T0 是每轮注入的常驻面，只收“不加载 skill 也必须知道”的不变量与指针；
  细则放 `content/generic/`，由 T0 用 `{{research_pack_root}}/content/generic/...` 指过去。
  撞顶处置序 = **下放 > 压缩 > 升顶**；升顶须同变更登记理由。
- **角色 skill ↔ 共享 skill**：只有**第二个角色**真的要复用同一套方法时，才建
  `presets/_shared/skills/` 并在相关 preset 声明根；不预建。届时 `presets-wiring` 的“只装自己
  skills 目录”断言要**有意**放宽为“自己的根 + 已声明的共享根”，不是静默改。
- **包内容 ↔ run 实例**：包内 `content/` 只读；一切 per-run 变量写进 bundle。run 期间零写回
  手册/模板；`harness(bundle)` 这条不破。

## 6. 什么时候动结构（trigger）

- **manual 撞顶**：`content/manual.md` 超预算，或剩余空间装不下一条新规则 → 先下放一节到
  `generic/`，再谈扩顶；一次下放一节，带 L1/snapshot 证据。
- **第二个角色复用同一 skill**：建 `_shared`，放宽 presets-wiring 的根断言。
- **`presets.test.mjs` 膨胀**：>500 行，或出现第二个**独立合同模型**（不是多一个主题），才按模型拆；
  不按 structure/delegation/hitl 这类主题切片。
- **content 顶层出现新的寿命**（不是新文件）：更新本页 + 加消费边 + 加守卫；不直接往根目录扔文件。
- **新增研究类型 / 题型**：闭集词表变更，同 diff 改模板枚举、组队矩阵、research-brief、测试。

**不算 trigger**：文件数本身、审美上的对称、“参照仓有所以我们也要有”。

## 7. 不做什么

- 不造 product-type / delivery-mode / company 层：本仓只有一套方法论，没有多公司/多产品轴。
- 不造 `content/manifest.json` 或全量清单：清单会腐；盘上枚举 + 消费边才是正本。
- 不预建 `_shared/`、不预拆 `tests/pack/`、不预拆 `presets.test.mjs`：等 trigger。
- 不把能按需读的程序塞进 persona；**例外 = 必须每轮在场的硬门**（HITL 两点、交付顺序、veto），
  因为 skill 加载不保证。
- 不在没有 L1/snapshot 证据时改模型可见内容；不在 keyless 层假装行为已被证明。

## 8. 当前债与下一步

`content/manual.md` 现为 **12,038 / 12,288 字符**（约 98%）；字符数最大的三节 = 目录约定 3,734、
状态头/读序/恢复 2,484、证据文件契约 1,595。下一次新增跨角色规则就会撞顶。

**首刀已落（2026-11-11）**：状态头/读序/恢复细则下放到 `content/generic/state-and-recovery.md`；
T0 = 9,995 字符（余量 2,293）；`content-disclosure` 守卫在场；L1 真挂载绿；L4-lite 全角色真模型绿。
snapshot B 的旧回放仍绿，但回放的是旧录制对，**不捕获**本次手册变更——重录窗口未开，不能拿它冒充
新手册的组装证据。下一刀 = 证据文件契约（1,595）或目录约定（3,734），按同一形状增量下放；
trigger = T0 >10,000 或新增跨角色规则装不下。首刀卡 = [2026-11-11-content-organization-t0](../../_backlog/_archived/settled_issues/2026-11-11-content-organization-t0.md)。

## 9. 指针

- 常驻面预算与准入规则 = [`content-shape` 门禁](../../scripts/verify/gates/e-workspace.mjs)
- 内容接线守卫 = [presets-wiring](../../tests/pack/presets-wiring.test.mjs) · [content-coverage](../../tests/pack/content-coverage.test.mjs)
- 测试落家与证据分层 = [project-map §测试怎么选](../project-map.md) · [evaluation §L0/L3](../evaluation.md)
- 参照仓内容宪章（只读） = `ai_dsh_company/docs/content-charter.md`
