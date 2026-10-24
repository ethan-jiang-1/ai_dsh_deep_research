---
status: 已结
opened: 2026-10-23
---

# 推敲：run 终稿缺面向人的可读层

> 立卡：2026-10-23 ｜ 状态：已结（2026-10-24） ｜ 类型：Task ｜ 结论倾向：现在做（已落地） ｜ 可关闭：是


## 结案（2026-10-24）

- **结论**：读者版内容合同落地——六节、1–3 页、不新增事实/数字/来源、正文无 `[来源:]`/
  `evidence/`/`drt_`、canonical 链接按 `final/` 解析；真实 reader = `final/readable-v1.md`
  （2,664 字 / 57 行）。
- **验收**：门C 同版/六节/长度/来源路径/链接全过；真实 run 交付回执含 reader 哈希；
  用户 2026-10-24 选择 A「收口归档」；ops 三问复核通过（未逐题记录用户原话）。
- **去向**：[流程位卡](2026-10-23-readable-final-process.md) ·
  [Note](../../../notes/implemented/2026-10-23-reader-final.md) · [D29](../../../docs/decisions.md)。

## 审阅上下文（先看这一节）

- **触发**：用户 2026-10-23 读完 `research-workspace/drt_cn-us-ai-models-hardware/final.md`
  后的原话是“这是一团糟”“我是懂 AI 进来的，都觉得这么多引用、版本、知识地图乱七八糟”；用户
  要的是**人能读懂的终稿**，不是把研究做浅。
- **具体证据（2026-10-23 逐项复核）**：该 `final.md` **427 行 / 39,771 字符**；开头 **5 行
  元数据块**含 11 个字段（run / 版本 / 口径 / 窗口 / 语言 / 类型 / 篇幅 / 立项 / 执行图 /
  组队 / 证据链），其后是 6 条「读前必读」口径纪律；§0.1 四条总判断 + 五条可执行含义，大量
  句后挂 `[来源:]`；§10.1 是 **30 行判定表**（# / 维度 / 判定 / 判据句 / 主证据 / v1→v2）；
  §11 用 **44 行**紧凑列出 **160 张证据卡**；全文 **76 行**含行内 `[来源:]`（合计 **148 个
  标记**）。这些对审计正确，对读者是噪声。
- **期望读者**：懂 AI/业务、但没有读过本 run 的方法论与证据链的人（例如要拿结论做选型/汇报的
  决策者）。不是完全小白；但要求**不先学 AA / ECI / as-of / 等级 / 单源标记**也能读懂。
- **硬约束**：`final.md`/`final/vN` 是 canonical（[D17/D28](../../../docs/decisions.md)）；不能为了
  好读删证据；不能造第二份事实；不能加 per-run `AGENTS.md`/静态知识地图（宪章 §7/§11.4）；
  旧 run 按 epoch 不回溯。
- **不在本卡范围**：改研究结论、重做证据、替代 `final.md`、让所有读者都去读审计面。

**问题与期望结果：** `final.md` 同时承担 Agent/审计面与用户面：来源链、`as-of`、证据等级、
判定表、版本账、内部知识地图、修复记录都在正文。期望交付里有一份**面向人的可读终稿**：
结论先行、理由可懂、影响和不确定性说清；同时保留 canonical 的可追溯性。

**当前情况：** 以上述 `final.md` 为标本；bundle 里没有任何 reader-facing 产物，HITL2 与交付都
只看 `final.md`/`final/vN`。现有 `ResearchFinalTab` 只承接 `final.md` 路径与 review 静音条；
没有“人读层”的产品面。流程位（阶段/owner/落点/门禁/页签）由
[流程位卡](2026-10-23-readable-final-process.md) 定；本卡只定**内容合同与可读性验收**。

## 读者合同（建议，内容面的单一正本）

**受众**：领域决策者（懂 AI/业务、没读过本 run 的方法论与证据链）。

**结构（固定六节，顺序即阅读顺序）**：

1. `## 结论`——一句话答案 + 3–5 条分维度判断；成立条件写在括号里。
2. `## 为什么`——2–4 条最强依据，用平话解释指标；不逐句挂来源。
3. `## 这对你意味着什么`——3–5 条可执行含义，写清适用场景与反例。
4. `## 什么会改变这个结论`——阈值/信号；用户据此知道何时回来重看。
5. `## 目前不能判断`——未取得/无法判定/单源，按重要性列 3–6 条，保留原始限定语。
6. `## 依据与延伸`——链回 canonical（`vN.md` / `../final.md`）与 findings；不列 160 卡清单。

**必须保留**：结论与成立条件、时间口径/版本、最强反证、未取得/无法判定、单源/等级等会改变
解读的限定语。

**可以省略**：run 元数据块、v1→v2 改动清单、30 行判定表、160 卡来源清单、逐句 `[来源:]`、
内部知识地图、审查/修复记账、HITL 与计划细节。

**硬约束**：

- 不新增 canonical 没有的事实、数字、来源或因果句；数字逐字取 canonical，不四舍五入出新值。
- 全文不出现 `[来源:`、`evidence/` 路径；依据用 canonical 链接（`vN.md`、`../final.md`、
  `../findings.md`）。
- 目标 1,200–2,400 字（中文），硬顶 4,500 字 / 180 行；超过即不是「1–3 页读者版」。
- 首段写明「读者版 · 对应 canonical: final/vN.md · 以 canonical 为准」。
- 术语首次出现给一句人话解释；不假设读者知道 AA / ECI / TB / LHTB / as-of / 单源。
- 不写成第二份报告：不按 topic 重排，不复制 §1–§9 的论证结构；只保留决策所需。

**为什么不是第二份事实**：读者版只允许压缩 canonical；门C 检查同版/结构/长度/来源面；
数字子集以 WARN 呈现供人工复核；HITL2 用户随时切审计版；任何不一致以 canonical 为准并重派生。
完整控制面 = [研究材料 §5/§10](../../research/reader-final/2026-10-23-reader-final-design.md)。

**样张**：[cn-us v2 读者版样张](../../research/reader-final/2026-10-23-sample-readable-cn-us-hardware.md)
（原型，不是交付物；用于判断结构/长度/语气）。

## 方案与取舍

- **A. 独立派生文件（选）**：`final.md` 保持 canonical；新增 `final/readable.md` →
  `final/readable-vN.md`，附录链回 canonical。优点是审计面不变；缺点是两份可能漂移，需要
  一致性断言（门C + 用户对照）。
- **B. 把 `final/vN` 改成 reader-first**：交付副本先写人话，引用/版本进附录。优点是交付物就是
  人读的；缺点是 canonical 角色被削弱，审计要读附录；会牵动 `ResearchFinalTab`、`present`、
  `node-gate` 门④。不做。
- **C. 只改 `final.md` 的写法**：把正文写浅。缺点：审计信息被压缩，critic/审计无法复核——不做。
- **D. 只做读者探针，不设产物**：探针逼 Lead 写人话，但探针不是交付件，无法 present/复用/
  审计，每次重生成。不做。

## 已知与未决

- 已知：`final.md` 的引用/等级/版本对 Agent 和审计有用，不能为了“好读”删除。
- 已知：用户要的是“人能读懂”，不是“把报告缩短”；可读层可以比 canonical 短，但不能改变结论。
- 已知：现有 `ResearchFinalTab` 在流程卡里扩为「读者版默认 + 审计版切换」；本卡不重复流程细节。
- 未决（用户面）：受众是否收窄到领域决策者；长度是 1–3 页还是「一页纸」。实施按推荐假设先行。
- 未决（内容面，真实 run 后按样张纠偏）：章节是否再少一节；「依据与延伸」是否只留 canonical
  链接、不再提 findings。

## 验收标准

| # | 行为 | 类 | 输入/状态 | 通过信号 | 反例/恢复 | 证据 owner | 人工判断 |
|---|---|---|---|---|---|---|---|
| 1 | 没读过本 run 的领域读者，只读 reader 能在 5 分钟内答出结论/为什么/什么会改变结论 | 人工 | 真实 run 的 `final/readable-vN.md` | 三问答出；无术语卡点；不需要回翻 canonical | 答不出/需查术语 → Lead 改 reader 再呈；不降低标准 | 用户 + HITL2 记录 | **是**（最终判据） |
| 2 | reader 不新增事实/数字/来源；关键结论与 canonical 一致 | 模型 + 确定性 | reader vs canonical | 数字逐字可回查；无 canonical 没有的实体/因果；`[来源:]`/`evidence/` 为零 | 新增数字 → 门C WARN + 人工核；新增来源/实体 → 重派生 | 门C + Lead 自检 + critic/用户抽查 | 语义一致性由人判 |
| 3 | 长度 1–3 页、六节结构、canonical 指针在场 | 确定性 | reader 文件 | 六节齐；≤4,500 字/180 行；首段有 `对应 canonical: final/vN.md` | 缺节/超长/版本错 → 门C RED | `tests/run/node-gate-reader.test.mjs` + `node-gate` | 无 |
| 4 | canonical 仍是 `final.md`/`final/vN`；reader 可切回审计版 | 确定性 + 浏览器 | 终稿页签 | 默认 reader；`看审计版` 在场；无 reader 回退 canonical | 旧 run 不误红；负例不泄漏过程路径 | `final-target` 单测 + `client-load-smoke` | 视觉/交互 |
| 5 | HITL2 与交付能同时看到两份、知道哪份是审计源 | 编排 | present 两份 + 页签 | present 含 reader 与 vN；页签可切；卡片正文写明审计源 | 只 present 一份/只给 canonical → 交付门红或用户不可见 | L4 真 run + `node-gate` 门C + `run-accept` | 用户确认 |

### 验收现状（2026-10-23）

| # | 现状 | 证据 |
|---|---|---|
| 1 | 通过 | 用户选择 A（收口）；ops 三问复核；真实 reader `final/readable-v1.md` |
| 2 | **部分** | 门C 查 `[来源:]`/`evidence/`/长度；语义一致性由 Lead 自检 + critic + 用户；真实 reader 无新数字 WARN |
| 3 | 通过 | `tests/run/node-gate-reader.test.mjs`；真实 run 门C PASS（2,664 字 / 57 行 / 六节） |
| 4 | 通过 | `tests/run/final-target.test.mjs`；`client-load-smoke` 读者版默认 + 审计版切换 PASS |
| 5 | 通过 | present 两份、页签切换、`delivered.json`/`manifest` reader 绑定在场；用户选择 A |

## 需要你拍板

技术决定已按推荐落地；受众/长度请用**真实 reader** 确认，不是重新选型：

1. **受众**：领域决策者（推荐）还是完全外行？——看 reader 是否需要更多术语解释。
2. **长度**：1–3 页（推荐）还是「一页纸」？——看 reader 是否还嫌长。

认可 → 回复「可读，归档」；要改 → 指出哪一节/哪段。技术项（六节/门C/页签/回执）已落地，
不因这两个回答重开实现，只调读者面。

## 关闭条件

- 读者合同、位置、owner、验收在流程卡落地，并在一场真实 run 上产出；用户认可可读性。
- 或经用户拍板并入已有决定（关闭时在状态行记去向）。

## 落地记录（2026-10-23）

- 真实 reader：`final/readable-v1.md`（2,664 字 / 57 行；六节齐；无 `[来源:]`/`evidence/`/
  `drt_` 路径；canonical 链按 `final/` 解析）。产出 run =
  `research-workspace/drt_cn-open-vs-us-closed-agentic`。
- 机械面：门C 同版/六节/长度/来源路径/相对链接全过；`delivered.json` reader 哈希、
  `manifest` `reader-final` 角色、`acceptance` 读者版行在场；`client-load-smoke` 读者版默认 +
  审计版切换 PASS。
- 内容合同与样张：`final/readable-v1.md` 按六节合同产出；样张见
  [cn-us 样张](../../research/reader-final/2026-10-23-sample-readable-cn-us-hardware.md)。
- 仍缺：用户本人读真实 reader 的 5 分钟三问；若结构/长度/语气不合，回改 `reader-final`
  skill 与门C 上限，再重派生，不把「机械绿」当「可读性已验收」。
