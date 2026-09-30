# 判型模式库 v1 与增长机制（dispatch-distillation）

> 状态：implemented
> 源卡：[260929-dispatch-distillation](../../_backlog/_done/_closed_plans/260929-dispatch-distillation.md)（2026-09-29 立卡→当日毕业，用户三轮定调：强模型思考直接沉淀、典型场景起步、增长机制是命门、漏的靠模型能力兜底）；外部调研过程稿 = `research-workspace/drafts/self-growing-pattern-library-research.md` 与 `research-workspace/drafts/2026-09-29-hitl1-intake-routing-survey.md`（已随本变更入库如同目录先例，一手来源核实、URL 内联可复核）

## 决定

- **两层结构**：判型知识住模式库 `research-workspace/question-patterns.md`（首批 8 条、
  六段固定骨架〔识别特征/思考路径/分派结论/陷阱/困惑信号/澄清问法〕；种子 = 三分法
  升级 ×3 + 真实语料 mined ×5〔pricing×4 复现、cn-us×3 复现、siliconflow 前提级发现、
  geometry-coaching、release-watch〕）；行为接线住 `research-brief` skill（先查库协议：
  命中走条目、未命中三分法兜底 + journal 判型落痕）+ lead persona 类型选项委托。
- **增长机制五件套**：落痕（命中 `判型命中=P#` / 未命中 `判型未命中：<特征>；兜底=…`，
  D17 合规只落 bundle journal）→ 收割（guides/61 §7，inline grep 出候选 + 效用账两清单）
  → 晋升门槛（跨 run 复现 ≥2 或单次真实成本；新条目（留察）至第二次命中转正；条目只写
  模型不知道的增量）→ 淘汰（连续 3 次收割零命中移休眠节，不删；困惑信号不灵改第 5/6
  段）→ 编典生效（强模型侧离线编典 → l4-lite 真模型档 → 种子同步随包发布）。
- **升级路径**：条目 >12 或库 >500 行拆一模式一文件 + 索引（渐进披露）。
- **外部校准吸收**：Memp（强模型过程记忆迁弱模型仍大幅涨分 = 前提外部证据）；Anthropic
  Agent Skills（失败缺口建条目/只写增量/渐进披露）；ExpeL（计数留察）；Letta sleep-time
  （离线整理挂强档 = 编典步同构）；Rose & Levinson simple/complex/extensive 与三分法
  同构；Anthropic 量化档（工具调用数 × 时长）→ 深度推荐依据（检索往返锚）；OpenAI
  澄清准则（不问已提供/一次问全/未确认标 open 禁虚构）→ 澄清纪律；CIA ACH → P4 区分性
  证据；Indicators & Signposts → P8 趋势锚指标清单。
- **A/B 强弱对照**降级为可选验收（库落地后弱模型带库判题 vs 强模型基线）；**预测型**
  （What-If/Alternative Futures）不预载——无语料复现无真实成本，过不了自家晋升门槛，
  留给增长协议自然长出。

## 输掉的方案

- **A/B 对照前置采证**（前版方案，44 次判定 diff 实验）——被方向重塑取代：直接蒸馏 +
  后置验效果更直接；
- **新增 Node 承载**——Node = 管道形状，判型知识是内容；NODES.md 八节点 2026-09-29 刚
  定稿，加节点三处同步；翻案条件 = 采证揭示"缺阶段"（归 pipeline-polish 第 7 面）；
- **一次性穷举模式空间**——典型场景起步、漏的长回来（增长机制承担覆盖演进）；
- **模式库放 docs/**——docs 是人读开发面，run 内 lead 读不到；必须落模型可见面
  （workspace 种子 → 会话 cwd）；
- **收割起脚本/门禁**——起薄：guides/61 一行 inline grep，变重再升格；
- **Gemini 计划审阅式澄清**——违反两点交互纪律，不采纳。

## 实际跑过的验证

- `pnpm verify` 全绿（种子对账 pack-workspace-fresh、手册预算压缩至 120 行内、链接/锚点/
  台账全过）——初版落地与调研折入各跑一轮；
- `l4-lite-smoke` 真模型档 **ALL PASS ×2**（四角色真挂载 + 真模型响应 + scout 真实
  web_search 调用）——模型可见面变更（skill + persona）的证据义务，两轮各验一次。

## 环境状态

- 模型可见面变更两处已过真模型档；库/手册/guides 属按需读面；
- 实战检验场 = 后续真 run：journal 判型落痕开始记效用账，首个未命中候选按晋升门槛走
  收割链；调研过程稿已入库（drafts/），复核走仓库文件。
