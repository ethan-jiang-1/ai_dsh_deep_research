> 状态：implemented

# 研究视角层（lens）落成 pack 数据层

## 决定

把「同一道题从哪些证据面挖」做成可选、可配对、可检查覆盖的**数据层**（D43）：

- **九字段**（前八必需）：`id/name`、`when`、`seek`、`verify`、`frame`、`refuse`、`bias`、
  `blind_spots`；`pairs_with` 可选。lens 是证据面，不是角色/persona、不拥有报告骨架
  （骨架归研究方法预设）。
- **出厂目录**：`packages/deep-research-pack/content/lenses/<id>.md` 8 条
  （official / quant / practitioner / adversarial / structural / historical / regulatory /
  academic）；Lead 的 `question-patterns` 放索引与 P1–P8 默认集；研究手册放契约与路径，
  不注入全文（按需 read）。
- **选择**：HITL1 按题型给默认集（默认 2、上限 4；P1 可单 `official`）；完整集合落
  `question.md` §研究方法 `- 本次视角:` 与 `topics.md` 每 topic 的 `lenses:`；计划确认卡
  **默认不写、偏离才写一个短词**；per-topic 子集、cells ≤12；同 topic ≥2 lens 默认独立
  activation（subagent / workflow child），同 activation 顺序跑须在 plan/journal 记理由。
- **证据与覆盖**：evidence frontmatter 加**单值** `lens`（一卡一面，多面拆卡）；findings 记
  `lenses`/`lens_gaps`；review 终局块填 `topic × lens` 覆盖表（卡数+质量 / gap / n/a），
  静默空格 = MAJOR + readiness FAIL；每个 lens 的盲区处置三选一（配对 / 不 material /
  单镜风险接受）；v1 不加机械覆盖门。
- **通道**：同一份数据在 subagent / team / workflow 通道都可执行；派发第五件带 lens id +
  路径 + seek/verify/blind_spots 三条动作，读不到文件不静默。
- **命门**：lens 与既有方法预设的分工 = 方法管 run 级立场/报告骨架/run 级不承诺，lens 管
  面级来源/验证/高限/盲区；冲突时用户 > 方法预设 > lens。method-library 保持四字段，**不做
  lens 同名覆盖**；单场自定义面写 `topics.md` 的 `custom:<名>`，不建第二目录。

## 输掉的方案

完整备选与否决（八个）住在 [issue §方案与取舍](../../_backlog/_archived/settled_issues/2026-11-10-lens-layer.md)；
最相关的否决：

- **每个视角一个 persona/角色（STORM 式）**：persona 是弱杠杆（2024 空结果；2025 不相关细节
  ≈ −30pp）；角色会绑工具面/编制/硬隔离；team max 8。
- **新增第五个研究角色（Perspective Analyst）**：推翻 D2 角色清单；lens 是方法层，不是人。
- **加进 plan schema**：`plan-index`/`plan-graph`/门禁/驾驶舱连锁；lens 是 cell 属性，topics.md
  零解析成本。
- **workspace `lenses/` 第二目录**：与 method-library 四字段语义打架；版本/审计漂移。
- **全套注入 manual**：8 条 × 25–40 行 = 每次会话常驻 token 税；只放契约 + 路径。
- **v1 就上机械覆盖门**：覆盖是语义判断；机械只能查表在场，查不出「面真的挖过」。
- **≥N 源/域当覆盖**：可打卡注水；STORM 的 99.83→54.36 是结果不是判据。
- **直接替换五种方法预设**：公共行为变更太大；先并存、按证据再合并。

## 实际跑过的验证

**目录与回归**

- `node --test tests/pack/lenses.test.mjs`：先红（缺 `content/lenses/` 目录 / 缺字段行），
  补 8 条后绿（2/2）。
- `pnpm verify`：全绿（含 `content-shape`、`overlay-fresh`、`backlog-liveness`、`md-links`）。
- `pnpm test`：1054 pass / 0 fail（含新增 lens 目录测试与证据契约 7→8 字段对账）。
- `node dev/render-overlay.mjs`：重渲染 `dev/research.overlay.yml`，`overlay-fresh` 绿。

**模型可见面**

- `DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs`：5 个 preset 全部真挂载 ALL PASS
  （roster / 逐角色建会话 / skills 隔离）。
- `node scripts/smoke/snapshot-replay-smoke.mjs`：analyst persona 变更先红（B·persona 捕获），
  重录 analyst fixture 后 **4 场景 ALL PASS**（A 回放 + B 组装 diff + C 金标准）；场景
  `source.codeAnchor` 记录录制基线 `1ed4917`、`recordedAt=2026-11-10T04:39:23.000Z`。
- `node scripts/smoke/l4-lite-smoke.mjs`：全角色（含 method-editor）assistant 响应 +
  scout web_search 工具调用 **ALL PASS**。
- `node scripts/smoke/release-smoke.mjs --install-only`：真实安装形状 **ALL PASS**
  （pack → 干净 profile → plugin add → 安装域 preset-smoke → remove/端口释放）。

**pilot（P5，一场真 run）**

- Bundle = `research-workspace/drt_ds-vs-bailian-longctx`；lens = official + quant +
  practitioner + adversarial；cells = 7（T1 2 / T2 3 / T3 2 / T4 synthesis 0）。
- 39 张证据卡：official 19 / practitioner 13 / adversarial 5 / quant 2；frontmatter 八字段
  39/39、`lens` 39/39 有效（critic 逐卡核）；review 覆盖表 **0 静默空格**（每格卡数+质量，
  未声明面 `n/a` + 理由，盲区表 4 lens 有配对/显式接受）。
- 面分离：每个 ≥2 lens 的 topic，每个 lens 至少 1 个 publisher 域不在其他 lens 里
  （T1 1/1；T2 4/4/5；T3 3/4）——全部成立。
- 计划卡 **193 字**（≤200）；计划图有 `lens 与 activation` 节，独立 activation 有记录；
  39 卡与本仓 55 run 中位 40 同量级，无成本爆炸。
- critic 填满覆盖表且无追问，并用表抓出 **C1**：T2 未声明 `quant`，但 final 内做了 TPM 换算
  （覆盖表该格 `n/a` + C1 成因）——覆盖表能抓「综合阶段越界使用未声明面」。
- **报告 readiness = FAIL**（C1 + 6 MAJOR：单源标记/日期/负面断言范围/同域冲突/摘录缺原文/
  超时语义）；无 HITL2/present，报告未交付。这是 pilot 的**内容结论**，不是 lens 契约失败；
  A3（卡 193 合规但追加的 adversarial 偏离未上卡）与 A7（Team 实跑；subagent/workflow 未跑）
  作为已记录残余。

## 残余风险与后续

- **workflow / subagent 通道未单跑**：Team 任务描述已带 lens 路径与三条动作；workflow child
  是否继承 host 级手册/`research_pack_root` 仍未探针（workflow 工具需用户显式授权）。读不到
  文件时 brief 内联三条动作的 fallback 已在合同中，但未实测。
- **200 字卡的偏离是真实预算冲突**：pilot 里 lead 追加 `adversarial` 后卡 193 字，未把偏离
  写进卡；下一步要么给「删字」fallback（压 topic 骨干/方法行），要么允许卡外短指针。触发 =
  再出现一次「用户从 question.md 才发现视角被改」。
- **综合阶段越界使用未声明面**：C1 的根因是 T2 没有 `quant` cell、final 却做 TPM 换算。覆盖表
  已能抓，但合同可再收紧：synthesis 引入某面时，要么在该 topic 的 `lenses:` 声明它，要么在
  findings 标 `cross-topic` 并挂对应证据；连续两场再出现，升为 critic 必查项。
- **报告内容 FAIL 未修**：pilot 报告停在 review FAIL，未交付；内容修复（C1/M1–M6）不在本决定
  的范围，按需另起 rerun/补研究。
- **方法预设与 lens 的合并未做**：v1 并存、lens 只写面级增量；若两个 run 都不再单独引用方法
  表的信息源/检验两列，再评估合并（触发已在 v2 §2.1/§13）。
- **驾驶舱覆盖矩阵未接**：v1 覆盖表由 critic/Lead 手填；cockpit 仍只读 plan/task/run。

**环境状态**：pack 源 + `tests/pack/lenses.test.mjs` + analyst fixture/snapshot 身份 +
`dev/research.overlay.yml` + D43/AGENTS/pack README/design30 同变更；run 通道镜像已重建
（`release-smoke` 安装域绿）；pilot bundle 在 `research-workspace/` 根，报告未交付。
