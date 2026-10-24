---
topic: 可读终稿（reader-final）流程位与读者版合同
intent: 为两张活跃 issue 卡提供机制核验、DSH 载体选择、交付/门禁/观察面设计、验收证据路线与已输掉的方案；不含实施授权之外的结论。
---

# 可读终稿（reader-final）设计证据

> 消费者：[流程位卡](../../settled_issues/2026-10-23-readable-final-process.md) ·
> [可读层卡](../../settled_issues/2026-10-23-run-final-human-readable.md)。
> 本页只放较长机制依据与设计；结论、验收标准与执行计划住卡，不在这里维护进度。
> 事实核验基线：工作树 `3f934f0`（2026-10-23），`pnpm verify` 全绿、`pnpm test` 747 通过。

## 1. 结论

采用 **A. 独立派生文件**，不新增 run phase、不新增角色：

| 项 | 决定 | 理由 |
|---|---|---|
| 阶段 | `review` 终局 PASS 后、HITL2 之前 | 用户看到 HITL2 前必须已有可读版；PASS 前 canonical 还会改，提前派生会返工 |
| owner | Lead（新 `reader-final` skill） | `final.md` 的 owner 就是 Lead；读者版是派生件，不是第二份事实；D2 四角色不变 |
| 工作件 | `final/readable.md` | HITL2 前未交付，不能先落 `vN`（门③/④ 的顺序语义）；`final/` 已合法存在 |
| 交付件 | `final/readable-vN.md` | 与 `final/vN.md` 同版、不可变；用户定稿后复制，和 canonical 一起 present |
| canonical | `final.md` / `final/vN.md`（不变） | 审计、critic、gate、receipt 仍以 canonical 为准 |
| 机械门 | 新 `门C`（读者版合同） | 交付时检查同版副本、读者结构、长度、来源链接；旧场/quick_factual 豁免 |
| 观察面 | 「终稿」页签默认读者版，可切审计版 | 用户实际读到的就是读者版；审计源随时可切回 |
| 回执 | `manifest` 记 `reader-final` 角色与哈希；`delivered.json` 记 reader 哈希 | 交付件随交付走，必须可复算、可验篡改 |

## 2. 机制核验（卡上 7 条约束逐条对代码）

| # | 卡上原话 | 复核结果 | 依据 |
|---|---|---|---|
| 1 | `schema-scan.hygieneOf` 的 D28 顶层白名单不含 `readable-final.md`，放 run 根会核心违约；`final/` 内额外 `.md` 不受顶层白名单限制 | **属实**。顶层白名单 `TOP_LEVEL_ALLOWED` 只查 bundle 根的直接子项；`final/` 是已登记目录，其内文件不再过顶层名单，但仍过递归内容卫生（绝对路径 / `../drt_` / 跨 bundle `[来源:]` / 指令文件 / 脚本 / symlink） | `scripts/lib/schema-scan-core.mjs:90-95`、`:103-136`；顶层检查 `:126-128`；递归内容检查 `:108-125` |
| 2 | `node-gate` 门②/④/门A 只认 `final/vN`、review、audit；没有 reader 对象 | **属实**。门④只看 `final/vN`；门A 看 `final/v1.md` + audit + readiness；门②看 present 事件。三处均无读者版 | `scripts/lib/node-gate-run-gates.mjs` versionGate；`scripts/lib/node-gate-delivery-gate.mjs`；`scripts/lib/node-gate-session-gates.mjs` presentGate |
| 3 | `run-receipt` 的 `FILE_ROLES` / `manifest.json` 需要 reader 角色（若随交付走） | **部分属实**。`FILE_ROLES` 只有顶层角色；`buildManifest` 已把 `final/vN.md` 记为 `version-ledger`，但不会列 reader；`buildDelivered` 只记 final/audit 哈希 | `scripts/lib/run-receipt.mjs:13-42`、`:149-173`、`:126-145`、`:97-123` |
| 4 | `ResearchFinalTab` 只承接 `final.md`/`final/vN` 与 review 静音条 | **属实但更窄**：页签**地址认领**只认 `drt_*/final.md`；页签体默认读 `final/vN`（读面由 `finalReadPlan` 定表）；`final/vN.md` 文件地址本身不被 extension 带认领，点交付卡片里的 vN 会落到普通文件预览。读者版若独立，必须扩地址族与读面 | `packages/deep-research-pack/src/lib/final-target.ts:70-104`、`:160-205`；`src/client/index.ts:131-146`；`src/client/ResearchFinalTab.tsx:103-145` |
| 5 | `present` 的 `files[]` 可带多个文件；HITL2 呈卡与 present 的关系要明确 | **属实**。`present` 支持 1–`maxFiles`（默认 8）个普通文件，成功时追加 `deliverables/presented{turn,callId,files[]}`；工具描述建议 1–2 个主交付、每次至多 4 个 | `vendor/dsh/packages/deliverables/tool-present/src/index.ts:52-110`；`README.md` 的 `present` 节 |
| 6 | 不要新增 `run.md` phase；reader 是 synthesis/review/delivery 内的显性步骤 | **属实**。`run.md` phase 闭集 = `briefing / research / synthesis / review / delivery / accepted / parked`；新增 phase 会牵动 schema-scan、恢复读序、观察面。读者版不需要新 phase | `research-workspace/templates/run/run.md`；`scripts/lib/schema-scan-core.mjs:26`、`:169-170` |
| 7 | 旧场（无 `run.md`/无 reader）按 epoch 不回溯；新 run 才要求，缺失有可见注记 | **可行**。旧 bundle 无 `run.md`（如 `drt_cn-us-ai-models-hardware` 只有 `acceptance.md`）；新契约断代可复用 `READABLE_CONTRACT_DATE` 模式；quick_factual 已有编制豁免先例 | `research-workspace/drt_cn-us-ai-models-hardware/`（无 `run.md`）；`scripts/lib/node-gate-contracts.mjs` 的断代常量模式；`schema-scan` 的 `runType` |

### 2.1 补充事实

- **交付时序**：`guides/61 §4` 规定拍板前跑 node-gate/evidence-audit，拍板后 lead 落 `final/vN` 并 present；门②/④/A 在拍板前必然缺席是预期态。读者版放在「review PASS 后、HITL2 前」写工作件，拍板后复制为交付件，正好接上这条时序。
- **present 自动打开**：`final-target.latestFinalDelivery` 目前只认 `final.md` 路径；若 present 只点名 `final/readable-vN.md` 与 `final/vN.md`，交付监听不会触发。交付卡片、结句引用与自动打开要一起扩到「终稿地址族」。
- **版本账**：`latestRunVersion` 只匹配 `^v(\d+)\.md$`；`readable-vN.md` 不会污染版本账。`latestPresentedFinalVersion` 只从 present 路径里认 `final/vN.md`；present 同时带 canonical 时不受影响。
- **旧场样本**：`research-workspace/drt_cn-us-ai-models-hardware/final.md` 427 行 / 39,771 字符 / 160 张证据卡 / 30 行判定表 / 76 行含 `[来源:]`（共 148 个标记）。这组数字是读者版长度的现实基线，不是「所有 run 都该这么长」的规范。
- **final.md 模板**：`templates/run/final.md` 已有「决策摘要」首屏六段（答案/备选/关键依据/最强反证/不能判断/下一步），但没有「读者版」这个产物；读者版是它的**压缩派生**，不是另一套研究。

## 3. 为什么是 A（独立派生文件）

| 方案 | 做法 | 代价 | 结论 |
|---|---|---|---|
| **A. 独立派生** | `final.md` 保持 canonical；新增 `final/readable.md` → `final/readable-vN.md`，附录/链接回 canonical | 两份可能漂移，需一致性断言；多一个交付件 | **选**：审计面零改动；`final/` 已合法；可用机械门与哈希绑定；页签可双视图 |
| B. `final/vN` 改成 reader-first | 交付副本先写人话，引用/版本进附录 | canonical 角色被削弱；critic/gate/审计都要改读法；`ResearchFinalTab`、`present`、门④全牵动 | 不做：等于把审计源降级为附录，违背 D17/D28 的 canonical 合同 |
| C. 只改 `final.md` 写法 | 把正文写浅 | 审计信息被压缩，critic 无法复核；用户要的不是「研究做浅」 | 不做：卡 2 已排除 |
| D. 只做读者探针，不设产物 | 用探针逼 Lead 写好人话 | 探针不是交付件，无法 present/复用/审计；每次重生成 | 不做：不可预期，违反「流程位」诉求 |

**反证检查**：A 的最大风险是「读者版成为第二份事实」。处置不是靠口头纪律，而是四层绑定：① 读者版只允许压缩 canonical，不得新增数字/来源；② 门C 检查同版、结构、长度、无 `[来源:]`/`evidence/` 路径；③ 数字子集检查以 WARN 呈现，人工复核；④ HITL2 用户读到的是读者版，canonical 随时可切，发现不一致即可退回。读者版永远不是 `final.md` 的替代品，页签与 present 都同时给两份。

## 4. 时序（新 run，非 quick_factual）

```
synthesis 完成
  → critic 终局 PASS
  → Lead 加载 reader-final skill
  → 写 final/readable.md（从 final.md 当前版派生，自检）
  → HITL2：页签默认读者版；卡片正文说明「审计源 = final.md」
  → 用户拍板「定稿」
  → ① §Decisions 追加 HITL2 行（既有）
  → ② final.md 忠实复制为 final/vN.md（既有）
  → ③ readable.md 复制为 final/readable-vN.md（新增）
  → ④ present [final/readable-vN.md（读者版）, final/vN.md（审计源）]（顺序）
  → ⑤ update_goal complete（既有）
  → ops: node-gate 门C PASS → run-accept 写 delivered.json/manifest.json/acceptance.md
```

- **用户选「补研究」**：`readable.md` 是工作件，不复制为 vN；rerun 后 review PASS 时重写。
- **用户选「改说法」**：定稿前原位改 `final.md` + `readable.md`；定稿后按既有 D17 版本语义处理，读者版跟随 `vN`。
- **quick_factual**：`final.md` 通常已是短答案；读者版豁免，门C N/A，页签回退 canonical。
- **旧场**：无 `run.md` → 门C N/A，页签回退 canonical；不补文件、不追改。
- **只有工作件、没有交付件**（例如 review PASS 后 HITL2 前）门C N/A；交付时缺 `readable-vN.md` 才红。

## 5. 读者合同（内容面）

**受众**：懂 AI/业务、但没有读过本 run 方法论与证据链的决策者；不是完全小白，也不要求先学 AA / ECI / as-of / 等级 / 单源标记。

**结构（固定六节）**：

1. `## 结论`——一句话答案 + 3–5 条分维度判断；成立条件写在括号里。
2. `## 为什么`——支撑结论的 2–4 条最强依据，用平话解释指标；不逐句挂来源。
3. `## 这对你意味着什么`——3–5 条可执行含义，写清适用场景与反例。
4. `## 什么会改变这个结论`——阈值/信号；用户据此知道何时回来重看。
5. `## 目前不能判断`——未取得/无法判定/单源，按重要性列 3–6 条，保留原始限定语。
6. `## 依据与延伸`——链回 canonical（`vN.md` / `../final.md`）与 findings；不列 160 卡清单。

**必须保留**：结论与成立条件、时间口径/版本、最强反证、未取得/无法判定、单源/等级等会改变解读的限定语。

**可以省略**：run 元数据块（run / 版本 / 窗口 / 语言 / 类型 / 篇幅 / 立项 / 执行图 / 组队 / 证据链）、v1→v2 改动清单、30 行判定表、160 卡来源清单、逐句 `[来源:]`、内部知识地图、审查/修复记账、HITL 与计划细节。

**硬约束**：

- 不新增 canonical 没有的事实、数字、来源或因果句；数字逐字取 canonical，不四舍五入出新值。
- 全文不出现 `[来源:`、`evidence/` 路径；依据用 canonical 链接（`vN.md`、`../final.md`、`../findings.md`）。
- 目标 1,200–2,400 字（中文），硬顶 4,500 字 / 180 行；超过即不是「1–3 页读者版」。
- 首段写明「读者版 · 对应 canonical: final/vN.md · 以 canonical 为准」。
- 术语首次出现给一句人话解释；不假设读者知道 AA / ECI / TB / LHTB / as-of / 单源。
- 不写成第二份报告：不按 topic 重排，不复制 §1–§9 的论证结构；只保留决策所需。

**自检（Lead 在 HITL2 前）**：

- 一个没读过本 run 的人，只读这 1–3 页，能否在 5 分钟内答出：结论是什么 / 为什么 / 什么会改变结论？
- 每个数字都能在 canonical 找到同一写法；每个「新」实体都能在 canonical 找到。
- 反证与「目前不能判断」没有被删掉或弱化。
- 没有 `[来源:]`/`evidence/`；canonical 链接可解析。
- 没有把「未取得」写成「没有」；没有把「结构性差异」写成「落后」。

## 6. DSH 载体（不发明机制）

| 需求 | 载体 | 为什么是它 |
|---|---|---|
| Lead 知道何时写、怎么写、怎么自检 | 新 skill `presets/lead/skills/reader-final/SKILL.md`（按需加载） | skill = 程序化工作记忆，不占常驻上下文；`skill-filesystem` 自动发现，无需新工具 |
| 跨角色/恢复时仍知道读者版是交付件 | `research-workspace/AGENTS.md`（agent-instructions 注入）+ `NODES.md` | 手册是会话注入正本；NODES 是节点 I/O 正本 |
| 用户看到读者版 | `ResearchFinalTab` 默认读者版 + 审计版切换 | 现有「终稿」页签就是用户实际读终稿的面；不新造页签 |
| 交付两份文件 | `present` 的 `files[]`（reader 第一、canonical 第二） | 原生多文件交付；`deliverables/presented` 是交付见证 |
| HITL2 不新增交互点 | 既有 HITL2 卡片正文提一句「读者版在终稿页签」 | 两点交互纪律不变；不新增 ask |
| 机械验收 | `node-gate` 新门C + `run-receipt` 哈希 | 现有交付门与回执是交付判据的家；不新造验收系统 |
| 人工可读性判断 | HITL2 用户读读者版 | 可读性是品味/业务判断，机械门不能替代 |
| 旧场兼容 | 断代 + N/A + 页签回退 canonical | 与 D28 epoch 规则一致，不追改历史 |
| 读者探针（可选） | 一次性 subagent 只读读者版，答三问 | 新鲜上下文可当代理读者；只作自检，不替代用户判断 |

**明确不做**：不新增角色（D2 四角色）；不新增 run phase；不新增 HITL 点；不把读者版做成第二份事实；不在 run 根放 `readable-final.md`（白名单）；不要求旧场回溯。

## 7. 门C（读者版合同）判据

**触发**：新契约 bundle（有 `run.md`）且 `final/vN.md` 在场（交付副本已落）且 research type ≠ quick_factual。

**状态**：

- `N/A`：无 `final/vN`（未到交付段）；无 `run.md`（旧场 epoch）；quick_factual（类型豁免）。
- `PRE-CONTRACT`：交付日 < `READABLE_CONTRACT_DATE`（落地日；具体日期在实施时钉）。
- `RED`：以下任一。
- `PASS`：全部满足，可带 WARN。

**检查**：

1. `final/readable-vN.md` 存在，且 N = `final/` 内最高 `vN`（不是任意版本）。
2. 文件头有 `对应 canonical: final/vN.md`（同一 N），并有「以 canonical 为准」。
3. 六个固定二级标题齐：结论 / 为什么 / 这对你意味着什么 / 什么会改变这个结论 / 目前不能判断 / 依据与延伸。
4. 去空白字符后 ≤ 4,500 字；行数 ≤ 180（不含空行）。
5. 不含 `[来源:`；不含 `evidence/` 路径。
6. 不出现 `drt_` 路径（避免把 bundle 内路径泄漏给读者；canonical 链接用同目录 `vN.md` / `../final.md`）。
7. **WARN（不红）**：读者版出现的数字 token 在 canonical 中找不到同一写法 → 「人工核对是否新增数字」。

**为什么数字检查只 WARN**：中文排版、区间写法、单位省略会让等价数字在字符串层不等；把它做成 RED 会产生假红。门C 的 RED 只保留结构/同版/来源面可机械判的事实；「不新增事实」的语义判断归 Lead 自检 + HITL2 用户 + critic 的 canonical 审查。

## 8. 观察面（终稿页签）

- **地址族**：页签认领 `drt_*/final.md`、`drt_*/final/vN.md`、`drt_*/final/readable.md`、`drt_*/final/readable-vN.md`（含 `archive/`、`_abandoned/` 前缀）。同族地址都落到同一「终稿」页签，避免交付卡片点 reader 落普通预览。
- **默认视图**：有读者版 → 读者版；无读者版 → 既有逻辑（最高 `final/vN`，否则 `final.md`）。
- **切换**：`看审计版` / `看读者版`；审计版显示 `vN`（或 `final.md` 工作稿），读者版显示 `readable-vN.md`（或 `readable.md` 工作稿）。
- **静音条**：`读者版 · vN` / `读者版 · 未定稿` / `审计版 · vN` / `当前工作稿` / `审查未过`；不写「已交付」（交付只由状态页 ⑤ 的 present 见证说）。
- **自动打开**：present 同时带 reader 与 vN；`latestFinalDelivery` 优先取 reader 地址，交付时自动开读者版。只认 live 帧、按 callId 去重、焦点有草稿不打断——既有规则不变。
- **负例**：页签不泄漏 `question.md` / `topics.md` / `evidence/` / `drafts/` 路径；读者版不含这些路径是门C 与 smoke 的共同断言。

## 9. 验收证据路线

| 行为 | 类 | 证据 owner | 能证明 | 不能证明 |
|---|---|---|---|---|
| `final/` 放 reader 不触发 schema-scan 违约；run 根放 reader 违约 | 确定性 | `tests/run/schema-scan.test.mjs` + fixture | 白名单边界 | 读者内容质量 |
| 门C 同版/结构/长度/无来源路径/数字 WARN | 确定性 | `tests/run/node-gate-reader.test.mjs` + `node scripts/run-gates/node-gate.mjs <fixture>` | 机械合同与反例 | 真实模型是否照做 |
| manifest/delivered 记 reader 角色与哈希；篡改 → 红 | 确定性 | `tests/run/run-receipt.test.mjs` | 回执绑定与篡改检测 | 交付语义 |
| 页签地址族/默认视图/切换/静音条 | 确定性 + 浏览器 | `tests/run/final-target.test.mjs` + `client-load-smoke` pass-5 | 纯函数与真浏览器加载 | 可读性 |
| Lead 技能挂载与合同文本在场 | 编排 | `preset-smoke`（keyless 真挂载）+ `tests/pack/presets.test.mjs` | skill 被发现、persona/手册文本在场 | 模型是否执行 |
| 真实 run 产出 reader、present 两份、门C 绿、run-accept 写回执 | 模型 + 编排 | L4 真 run + `node-gate` + `run-accept` | 端到端产物与交付链 | 可读性 |
| 5 分钟三问 | 人工 | 用户读真实 reader | 业务可读性 | 研究结论正确性 |

**红先绿后**：门C 的每个失败形态先写 fixture/测试并看红，再实现；client smoke 的 reader 分支在真实 run 前可先以纯函数覆盖，真实 run 后补浏览器证据。

## 10. 风险、反证与已输掉的方案

- **风险 1：读者版成为第二份事实。** 处置 = 只压缩 + 门C 结构/来源 + 数字 WARN + HITL2 用户对照 + canonical 始终同屏可切。若真实 run 出现「读者版比 canonical 更准/更新」，立即回退：读者版不独立改事实，改 canonical 再重派生。
- **风险 2：Lead 敷衍（复制 §0 加几个标题）。** 处置 = skill 的六节结构与自检 + 长度上限 + 用户 5 分钟三问；若首场不达标，收紧为「必须删除 30 行表/160 卡/逐句来源」并加样例对照。
- **风险 3：门C 假红。** 数字子集只 WARN；结构标题允许全角/半角空格；版本取最高 vN 而非任意；旧场/quick_factual N/A 显式。门C 的任何新增判据必须带反证 fixture。
- **风险 4：页签地址族扩宽把别的项目 `final/v1.md` 认进来。** `canOpen` 仍限定 `drt_<slug>/` + 三位置；`final/` 下只认 `vN.md` 与 `readable*.md` 两种文件名。
- **风险 5：手册字节预算。** 手册当前 17,461B / 18,944B、194/200 行；新增 reader 合同必须 ≤ 6 行并压缩，或按处置序升顶登记理由。优先压缩（D28 已有的重复句）。
- **已输掉**：B（canonical 降级）、C（写浅）、D（只做探针）；不新增第七个 phase、不新增 editor/ops 角色、不在 run 根放 reader。

## 11. 未决（用户面）

1. 受众：领域决策者（本设计假设）还是完全外行——影响术语解释深度，不影响架构。
2. 长度：1–3 页（本设计假设）还是「一页纸」——影响门C 硬顶与 skill 自检。
3. 真实 run 的 5 分钟三问由用户执行；未答前可读性证据记为「human judgment pending」，不冒充已验收。
