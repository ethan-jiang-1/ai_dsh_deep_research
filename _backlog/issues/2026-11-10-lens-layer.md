---
status: 待落地
opened: 2026-11-10
---

# 推敲：研究视角层（lens）落成 pack 数据层

> 立卡：2026-11-10 ｜ 状态：待落地 ｜ 类型：Feature ｜ 结论倾向：现在做 ｜ 可关闭：否
> 去向：implemented — `notes/implemented/2026-11-10-lens-layer.md`；业务验收：用户

**问题与期望结果：** 现在的 Deep Research 方法层是「整场一种方法」（事实核查 / 领域地图 /
主张核查 / 方案比较 / 时间线与信号），没有「同一道题，这次从哪几个证据面挖」的显式选择；
evidence 只记 `supports: topic`，critic 只能按源数/等级/引用链审，报告只能写「不知道什么」，
写不出「哪些面看过、哪个面是空的」。期望：把视角做成**可选、可配对、可检查覆盖的数据层**
（lens），让同一题可以有 1–4 个可区分的证据面，且三条委派通道（subagent / team / workflow）
都能执行同一份数据。研究结论与证据 = [lens-abstraction v2](../research/lens-abstraction/2026-11-10-lens-as-data.md)；
8 条出厂草案 = [catalog draft](../research/lens-abstraction/2026-11-10-lens-catalog-draft.md)。

**当前情况：**

- 设计已定（v2 §10 决策表）：九字段（前八必需，`pairs_with` 可选）；住
  `packages/deep-research-pack/content/lenses/<id>.md` + Lead 索引 + 手册契约；HITL1 按题型给
  默认集（默认 2、上限 4；P1 单 `official` 例外）；per-topic 子集、cells ≤12；多 lens 同 topic
  默认独立 activation；evidence 加单值 `lens`；覆盖用 review `topic × lens` 表，**v1 不加新门**。
- **已实测的兼容性**：带 `lens` 的 evidence 卡在 `evidence-audit` 里仍判「frontmatter 契约符合」
  （硬五字段检查不看额外键，`scripts/lib/evidence-audit-core.mjs:212-218`）；带 `lenses:` 的
  `topics.md` + 带 `lens:` 的 `evidence/` 在 `schema-scan` 全绿（它只查核心文件在场，
  `scripts/lib/schema-scan-core.mjs:218`）；`method-of-question.ts:60-84` 只读方法节
  `- 采用/来源/调查要求`，加 `- 本次视角:` 不改驾驶舱五态。
- **成本已测**：3 张 HITL1 计划卡 171/183/200 字，上限 200（`plan-card-stats.mjs`）——所以
  v2 的选择规则是「默认隐、偏离显」，默认集不逐条上卡。
- **仓内动机数据**（不是缺陷判决）：52 个 ≥4 卡的 run 中 13 个单一 publisher 占比 ≥70%，
  5 个 100%；很多 P1/P2 题天然单官方源，但机制上没有任何东西阻止所有 topic 从同一张脸挖。
- 本卡是**实现合同**；研究卡已 `已定性`。尚未改任何 pack 代码。

**未决问题：**

- 无设计级未决；以下四个是**实施前探针**（v2 §14），不算阻塞：
  ① workflow child 是否继承 host 级 manual + `research_pack_root`（读不到就内联全文）；
  ② 计划卡「视角：+X」能否压进 200 字（按 `plan-card-stats.mjs` 口径实测）；
  ③ critic 能否只凭文件填满覆盖表（fixture 试跑）；
  ④ lens 目录 test 的红例先写红（缺字段行 / 坏 pair / 「你是」）。
- **用户判断**：本卡触及 pack 公共行为（HITL1 卡、`evidence` 契约、模板/技能模型可见面），
  实施授权与 D 号登记归用户；`待落地` 不是授权。

**下一步：** 用户授权后按 §方案与取舍 的 M1→M2→M3 落地；M3 的 pilot 通过 → 同变更写
`notes/implemented/2026-11-10-lens-layer.md`、`可关闭：是`、归档；pilot 硬线失败 → 回
`推敲中`/`等人拍板` 并附读数，不强行收口。

## 实施记录（2026-11-10，M1/M2）

- **目录与合同**：`content/lenses/` 8 条（`official/quant/practitioner/adversarial/structural/
  historical/regulatory/academic`）+ `tests/pack/lenses.test.mjs`（先红：缺目录/字段 → 绿）；
  手册 §研究视角 + 证据八字段；`question-patterns` 索引/默认集；`research-brief` 选择/落格；
  `team-assembly` lens 装载；`research-planning` cell；`analyst` 卡格式/persona；`critic`
  覆盖线；`nodes-contract`；templates（question/topics/evidence-entry/findings/final）；
  `synthesis`/`reader-final`。
- **文档**：D43（`docs/decisions.md`）；根/pack AGENTS 布局；pack README；design/30 八字段 +
  wave1 cell。
- **验证（实际跑过）**：`pnpm verify` 全绿；`pnpm test` 1054 pass；L1 真挂载 ALL PASS；
  snapshot B ALL PASS（analyst 重录，fixture 同 diff；`source.codeAnchor` 记录录制基线
  `1ed4917`）；L4-lite ALL PASS；`release-smoke --install-only` ALL PASS。
- **未跑**：M3 pilot（A8）。下一步 = 用户给 pilot 题/授权；pilot 通过后写 Note + `可关闭：是`。
  实现改动与 fixture 尚未提交（工作树）；提交时把 pack/测试/快照与 Note 作为窄证据切片一起入库。

## 已知与未决

**已知（证据锚点）**

- 现状层：方法预设五条 = `presets/lead/skills/research-brief/SKILL.md:57-79`；P1–P8 =
  `presets/lead/skills/question-patterns/SKILL.md:19-178`；证据七字段 =
  `content/manual.md:149-165`；计划卡 200 = `research-brief/SKILL.md:49-55`；顶层节点 ≤12 =
  `research-planning/SKILL.md:56`。
- 通道机制：workflow child 不传 preset（`vendor/dsh/packages/workflow/workflow-ptc/src/host.ts:203-219`）；
  team activation 不传 preset（`.../agent-team/src/roster.ts:264-274`）；省略 preset = join
  parent revision（`tool-subagent/README.md:70`）；workflow 只给显式要求
  （`tool-workflow/src/index.ts:329`）。
- 外部：STORM 消融（99.83→54.36；大纲几乎不动）、persona 2024/2025、Anthropic 重复工作/低方差、
  Co-STORM 未覆盖信息 mind map、Elicit pre-run Setup；逐条链接 = v2 §8/§16。
- 目录路径：`package.json:37` 已发布 `content/**`；`{{research_pack_root}}` 由
  `src/content/index.ts:52-70` 注册。

**未决（实施期才回答）**

- pilot 的面分离/成本读数（v2 §12 六指标）。
- workflow child 的 context 继承（探针 ①）。
- 用户在 HITL1 对「默认视角不逐条上卡」的接受度（探针 ② + pilot 读者价值）。
- 是否在 pilot 后升机械覆盖门（触发 = 连续 2 次静默空格；不是现在）。

## 方案与取舍

**选定方案（v2 §10 的投影，不重新论证）**

1. **目录 = 数据**：`content/lenses/<id>.md`（九字段，前八必需）+ Lead 的
   `question-patterns` 索引/矩阵 + 手册契约（约 8–10 行，不注入全文）。
2. **选择 = HITL1**：题型默认集 1–4（默认 2；P1 单 `official` 例外）；完整集合落
   `question.md` §研究方法 `- 本次视角:` 与 `topics.md` 每 topic `lenses:`；卡上只写偏离
   （`视角：+监管`），默认不占 200 字。
3. **执行 = cell**：cells = Σ(topic × lens) ≤12；同 topic ≥2 lens 默认独立 activation
   （subagent / workflow child），同 activation 顺序跑须在 plan/journal 记理由。
4. **证据 = 单值**：evidence 第八字段 `lens`；一卡一面，多面拆卡；`findings.md` 加
   `lenses`/`lens_gaps`；`review.md` 终局块加覆盖表；`final.md` §目前不能判断加覆盖行。
5. **覆盖 = 语义**：有卡（关键 claim A/B）或显式 gap；静默空格 = MAJOR + FAIL；盲区处置
   三选一（配对 / 不 material / 单镜风险接受）；v1 不加门，连续 2 次静默空格再评估。
6. **通道 = 同一份数据**：subagent 真 preset + brief；team 派发第五件带 lens 路径/内联；
   workflow 子代 = Lead 组合 + brief 内联；读不到文件不静默，brief 已含三条关键动作。

**候选实施步骤（可独立验证才拆）**

- **M1 目录与合同**：8 个 `content/lenses/*.md`（按 catalog draft）；`tests/pack/lenses.test.mjs`
  （先红后绿：id/文件名、必需七个字段行、pairs 存在、无「你是/你的职责」）；手册 §研究视角；
  `question-patterns` 索引 + 默认矩阵；`dev/render-overlay.mjs` 重渲染。
- **M2 选择与证据**：`question.md` 模板 `- 本次视角:` + Snapshot 行；`topics.md` 模板
  `lenses:`；`evidence-entry.md` 加 `lens`；analyst `evidence-extraction` 与
  `nodes-contract` 的「七字段」改八字段；`research-brief` 方法行/默认集/偏离显；
  `team-assembly` 第五件加载 lens；critic `adversarial-review` 加覆盖线与表格式；
  `findings.md`/`final.md` 模板加 lenses/gaps/覆盖行。
- **M3 pilot 与证据**：一场 P5/P6（3–4 topic，2–3 lens，Team + 至少一个独立 subagent）；
  按 v2 §12 六指标记录；通过 → Note + 归档；硬线失败 → 回卡附读数。

**输掉的方案（v2 §9 全表；本卡只列最相关的）**

| 方案 | 否决理由 |
|---|---|
| 每个视角一个 persona/角色 | persona 弱杠杆；角色绑工具面/编制/硬隔离；team max 8 |
| 新增第五个研究角色 | 推翻 D2；roster/哨兵/l4-lite 全动；lens 是方法层 |
| 加进 plan schema | parser/图/门禁/驾驶舱连锁；lens 是 cell 属性；topics.md 零解析成本 |
| workspace `lenses/` 第二目录 | 与 method-library 四字段语义打架；版本/审计漂移；先不建 |
| 全套注入 manual | manual 已 18.8KB；8 条 × 25–40 行 = 每次会话常驻 token 税 |
| v1 就上机械覆盖门 | 覆盖是语义判断；先让 critic 填两个 run，连续 2 次静默空格再升门 |
| ≥N 源/域当覆盖 | 可打卡可注水；STORM 的 99.83→54.36 是结果不是判据 |

**同步面（漏一处就漂移）**

- `dev/research.overlay.yml`：改 pack 后 `node dev/render-overlay.mjs`（`overlay-fresh` 门禁）；
  run 通道镜像由 `boot-run.sh` 同步，漂移即 fail-loud。
- 模型可见面：`content/manual.md`、`presets/lead/skills/*`、`presets/analyst|critic/skills/*`、
  `content/templates/run/*` → snapshot B 层 + `l4-lite-smoke`（AGENTS：只跑 keyless 不算验过
  角色行为）。
- 包形状：`tests/pack/content-injection.test.mjs` / `package-contract.test.mjs`；新增
  `content/lenses/` 不破坏 `content/**` 发布；必要时 `release-smoke --install-only`。
- 文档 = 当前合同：pack README、根 `AGENTS.md` 与 `packages/deep-research-pack/AGENTS.md`
  的 `content/` 布局行（加 `lenses/`）、`docs/design/30-methodology-mapping.md`（方法层）、
  `docs/decisions.md`（D 号，用户签）；`_backlog/research/lens-abstraction/README.md` 的
  `产出的卡` 已链本卡。
- 不变量：四角色身份（D2）、两 HITL 点、`method-library` 四字段与 method-editor、驾驶舱读面
  （v1 不接 evidence）、plan 解析器（不碰）。

## 验收标准

> 判据按 [validation-design](../methods/validation-design.md) 分三类：确定性 / 模型行为 /
> 编排。每行「通过」是下游判定口径；「人」列只有用户能判。未列的 pilot 读数见 v2 §12。

| # | 行为 | 类 | 输入/状态 | 通过信号 | 负例/恢复 | 证据 owner | 人 |
|---|---|---|---|---|---|---|---|
| A1 | 8 条 lens 目录形状与身份 | 确定性 | `content/lenses/*.md` | `tests/pack/lenses.test.mjs` 绿：id=文件名、`id/name` 在场、`when/seek/verify/frame/refuse/bias/blind_spots` 七个字段行齐、`pairs_with` 指向存在的 id、无「你是/你的职责」；先写红（缺字段行/坏 pair/人格句）再绿 | 缺一条/重名/坏 pair → test 红；不许用排除清单绕过 | 测试 + catalog draft 对账 | 无 |
| A2 | 手册与 Lead 索引只放契约/索引，不复制全文 | 确定性 | `content/manual.md`、`question-patterns/SKILL.md` | 手册含「研究视角」契约 + 路径 + 覆盖规则；question-patterns 含 8 行索引 + P1–P8 默认矩阵；manual 不含任一条 lens 的完整九字段（grep） | 全文进手册 → token 税回归；只放索引找不到全文 → HITL1 读路径 | `tests/pack/content-injection.test.mjs` + 人工 grep | 无 |
| A3 | HITL1 选择：默认集落盘、偏离上卡、200 字不破 | 模型行为 + 编排 | 一场新 run 的 HITL1 | `question.md` §研究方法有 `- 本次视角:`；`topics.md` 每个 evidence topic 有 `lenses:`；计划卡**默认不写**、偏离才写一个词（如 `视角：+监管`）；`plan-card-stats.mjs` 读数 ≤200 | 默认集逐条上卡 → 超限（node-gate 门① WARN）；缺 `lenses:` → critic MAJOR；不得新增交互点 | `plan-card-stats.mjs` + snapshot B + 真 run 卡 | 用户看卡是否可读 |
| A4 | evidence `lens` 契约与兼容 | 确定性 | 新 run 的 evidence 卡 | 模板/analyst skill/nodes-contract/manual 同 diff 写八字段；带 `lens` 的 fixture 在 `evidence-audit` 仍「契约符合」、`schema-scan` 绿；critic 对新 run 缺 `lens` 记 MAJOR | 旧 bundle 不追补（epoch 豁免）；额外键不得被写成多值 | `evidence-audit`/`schema-scan` fixture + 新 run | 无 |
| A5 | 覆盖表与静默空格 | 模型行为 | pilot 的 review/findings/final | review 终局块有 `topic × lens` 表；每格 = 卡数+质量或 `gap：原因/渠道` 或 `n/a：理由`；静默空格 = 0；final「目前不能判断」点名空面；盲区三选一有记录 | 任一静默空格 → MAJOR + readiness FAIL；只写 ✓ 无卡 → 抽查判造假 | pilot bundle + critic 审查 | 用户看报告是否说明空面 |
| A6 | 多 lens 独立 activation | 编排 | 同 topic ≥2 lens | plan/journal 记录「哪些 cell 独立 activation、哪些顺序跑及理由」；pilot 至少一个独立 activation | 全在同一 activation 且无理由 → MAJOR；面分离 = 0 → pilot 失败 | plan/journal + pilot | 无 |
| A7 | 三通道数据可用 | 编排 | subagent / team / workflow | subagent 与 team 的派发 brief 含 lens 路径 + 三条动作；workflow child 能读路径或 brief 内联全文；读不到不静默 | workflow child 读不到且 brief 没内联 → 停，补内联再跑 | 探针 + pilot | 无 |
| A8 | pilot 六指标 | 模型行为 + 编排 | v2 §12 的 run | 硬线（面分离、静默空格 0、卡 ≤200）全过；六指标里 ≥4 项达标（硬线计入）；读数写进本卡 | 面分离 0 / 成本 >2× / 静默空格 >0 → 停，回 `推敲中`；不硬收 | pilot bundle + 本卡记录 | 用户接受 pilot 结论 |
| A9 | 回归与证据档 | 确定性 | 全树 | `pnpm verify`、`pnpm test` 绿；`node dev/render-overlay.mjs` 后 `overlay-fresh` 绿；改模型可见文本跑 `snapshot-replay-smoke`（有意 diff 重录/`--update-expected`）+ `l4-lite-smoke`；包形状变化跑 `release-smoke --install-only` | 任一红 → 不交付；keyless 绿不替代 l4 | guides/60 的任务型路由 | 无 |
| A10 | 文档与 D 号 | 确定性 + 人 | 同 diff | pack README、根/pack AGENTS 的 `content/` 布局行、`docs/design/30` 与方法层现状一致；`docs/decisions.md` 有 lens 行（或明确归入 D40 内容扩展）；本卡 `产出的卡`/Note 互链 | 文档仍写「七字段」/布局漏 `lenses/`/没登记 → 门禁或人审红 | `pnpm verify` + 用户签 | **用户**：公共行为 + D 号 |

**Out of scope（本卡不做）**：驾驶舱覆盖矩阵接入；workspace lens 目录/用户自定义目录；
机械覆盖门；method-library 第五字段；改四角色/persona 工具面；挂 `tool-workflow` 到 preset；
`content/lenses` 的本地化（locale）——等 pilot 和独立需求。**后续（不属于本卡）**：
`lens-fanout` workflow 配方 + HITL1「执行方式」——依赖本卡的 lens 数据 + wave 方向的授权点，
本卡只保证数据层可被 workflow child 消费（A7）。

## 关闭条件

- 上表 A1–A10 全过；A8 的 pilot 读数在本卡记录（不是「跑了」就算）。
- `notes/implemented/2026-11-10-lens-layer.md` 同变更写就：决定、输掉的方案（引本卡）、
  实际跑过的验证（A1–A9 的命令与结果）、残余风险（workflow 继承/成本/用户接受度）。
- 业务验收（用户）：接受「默认隐、偏离显」的 HITL1 形态与 lens 公共契约。
- 满足后 `可关闭：是`，`git mv` 到 `_archived/settled_issues/`，更新 `issues/README.md`
  与 `_archived/settled_issues/README.md`；研究卡 `lens-abstraction/` 的 `产出的卡` 已链本卡，
  若 pilot 后无活跃消费者再考虑归档研究目录（单独判断，不在本卡）。
- 硬线失败（A8）→ 本卡回 `推敲中` 或 `等人拍板`，附读数与新的重议条件；不归档。
