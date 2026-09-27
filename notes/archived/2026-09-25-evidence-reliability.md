# RFC：证据可靠性面（信源分级 + 交叉验证 + 机械对账）

> 状态：implemented
> 归档：2026-09-27

归宿：roadmap §队列 ▶「证据可靠性面」（feature/卫生混合；**先于下一场研究 run 落地**——
该 run 即其验收载体，与「研究类型覆盖」天然配套）。触发 = 用户指令（2026-09-25）：
"信息源对不对；所有关心的东西最好有交叉验证；一路留下 evidence 在 run bundle 底下；
否则可信度有问题，谁知道是真事还是幻觉"。

## 决定

证据可靠性按三层防线落地（用户 2026-09-25 点名的两个问题——信息源正确性、
交叉验证与反幻觉——分别由 L1 分级与 L2+L3 承接），并把"是不是幻觉"从怀疑变成
**机检报告**（evidence-audit 对会话日志的机械对账）。

## 问题

首场 run 审计出四个幻觉/可信度入口（链路流程面已被 run 实证合理，不动）：

1. **转写幻觉**：analyst/scout 从 tool result 手写 `evidence/*.md`——引句/数字转写错或编造，
   无对账；
2. **URL 伪造**：frontmatter 的 `source_url` 是模型写的——可填日志里根本没出现的链接；
3. **交叉验证缺失**：单源结论可进 `final/`；`quality` 是模型主观评级，非独立信源数；
4. **信源权威性无机制面**：scout 的质量分级是散文判断，SEO 垃圾/软文/转载链与一手信源
   无区分。

关键事实：**会话日志存着全部真相**（model-visible ⟺ logged：每次 web_search/web_fetch 的
原始结果都在 zstd 日志里）——"是不是幻觉"今天就可机器查清，缺的只是查的那个环节。

## 方案（三层防线）

**L1 信源分级（frontmatter 契约扩展）**

- `evidence/*.md` frontmatter 增加 `source_tier`（primary=官方文档/论文/财报/一手数据 ·
  secondary=主流权威媒体/机构 · tertiary=行业博客/技术社区 · weak=论坛/自媒体/内容农场）
  与 `publisher`（注册域）；
- 分级表唯一正本 = 研究手册（research-workspace/AGENTS.md）；scout 的"质量分级"persona 与
  此对齐（同一套词，不再散文自创）；
- evidence 契约五字段 → 七字段（`tests/evaluation-contract.test.mjs` 对账点同步）。

**L2 交叉验证纪律（手册合同 + critic 职责）**

- 进 `final/` 的关键结论（must-answer 的答案）须 **≥2 个独立信源**：不同注册域，且非同一
  通稿/转载链（**独立性判定归 critic**——同源两票不算两票）；
- 单源结论不硬禁（快速事实核查型 run 可能天然单源），但必须显式标注"单源·未交叉"并在
  review.md 说明风险——**显性化而不是静默**；
- `topics.md`/矩阵可加佐证列（corroborated by 哪些 evidence）。

**L3 机械对账（keyless 审计工具，反幻觉的硬面）**

- 新增 `scripts/evidence-audit.mjs`（keyless，纯 fs + zstd CLI 全帧解——多帧坑本轮已踩平）：
  ① 每个 evidence 的 `source_url` 在会话日志的 web 工具结果里**真实出现过**（防伪造链接）；
  ② evidence 正文的关键引句在对应 tool result 文本里**可找到**（规范化后子串匹配——数字/
  引文转写对账；整段模糊匹配做不到 100% 就先抽样断言，如实报覆盖率）；
  ③ `final/` 每条 `[来源: …]` 溯源链完整（报告 → evidence 文件 → 日志 tool result → URL）；
- 输出审计报告落 run bundle `audit.md`（发现的问题按"伪造链接/转写不符/单源未标/溯源断链"
  分类列出）——把"谁知道是不是幻觉"变成**机检报告**；
- URL 内容的最终真实性（页面当时真的这么说）靠 retrieved_at + L2 交叉 + L1 分级承载；
  实时 re-fetch 比对（`--recheck`，真网络面）列为可选强化，不进首版。

## 输掉的方案

- **实时重访每个 URL 比对内容**（最硬的验证）：押后——真网络面、慢、且被改版页会误伤；
  首版靠"日志在场的原始结果"（它就是当时真实抓到的东西）+ 交叉验证兜住；
- **硬禁单源结论**：否决——研究类型里"快速事实核查"天然可能单源；显性化标注优于一刀切
  （与 Q6 销账同思路：critic 散文审查 + 显性风险说明 > 数值 floor 假绿）；
- **让 analyst 在抽取时自证**（每条引句附 tool call id）：部分采纳为简化形态——首版由审计
  工具从日志侧反查（不改 analyst 工作流），若反查命中率低再考虑正向标注。

## 验收

- 契约：evidence 七字段在手册/模板/analyst skill/persona/方法论映射各副本同 diff 对账
  （evaluation-contract 测试同步）；
- 工具：`evidence-audit.mjs` 对首场 run bundle（drt_cn-us-cpu-gap）跑出基线报告——三条
  溯源断言在真数据上工作（含至少一个注入红证：伪造 source_url → 红）；
- 流程：critic skill 与手册补独立性判定/单源标注条款；下一场 run（「研究类型覆盖」）的
  bundle 含 `audit.md` 且关键结论的佐证结构符合 L2；
- 不破坏：L0 门禁/tests 全绿；工具 keyless（无网络/无模型）。

## 毕业（2026-09-25 马拉松二号条目 1，实施记录与验证）

**决定**：三层防线全部落地；一处**实测修正**——有效证据谓词改**分层**：硬五字段定有效性、
软二字段（source_tier/publisher）缺失标 `ungraded` 不否决（原方案七字段全硬会判旧 run 全部
证据无效——存量不回填：run bundle 是交付记录，历史按"未分级"如实显示而非否决）。

**L1**：契约七字段六处副本同 diff（手册正本含分级表/模板/analyst skill/analyst persona/
30-mapping/critic skill）；tier（信源身份）与 quality（内容质量）分立。
**L2**：手册条款（关键结论 ≥2 独立信源、独立性=不同注册域且非转载链、判定归 critic、
单源显性标注）+ analyst persona 与 critic skill 独立性定义同步（persona 原有条款补强）。
**L3**：`scripts/evidence-audit.mjs`（keyless；`auditBundle()` 可导入——tests 层禁子进程，
纯 .jsonl 夹具直调）：①URL 溯源只认**工具事件**（模型口述不算）②摘录 blockquote 规范化
（CJK 安全）后语料回溯③final 链（反引号内格式占位豁免——首场 run 假阳性实测修正）；
附带契约符合性 + 佐证结构（按 supports 数独立域名）；报告写 bundle `audit.md`，
CRITICAL → exit 1；AGENTS 命令表登记。

**实际跑过的验证**：

| 面 | 结果 |
|---|---|
| keyless tests | 8/8 绿（干净面 / 删工具事件→未溯源 CRITICAL / 红证①伪造 source_url / 红证② final 断链 / 占位豁免回归钉 / 契约分层 / 摘录回溯） |
| 基线审计（首场 run drt_cn-us-cpu-gap） | **102/102 URL 全部可溯源到真实工具事件（无伪造链接）**；final 链 94/94；31 份证据**全部无 frontmatter**（契约从未被执行——散文式证据卡，32 MAJOR 如实揭出）；exit 0 |

**补记（2026-09-26 实测）**：首场 run 的会话 cwd = `dev/harness-home`，而研究手册在
`research-workspace/AGENTS.md`（`agent-instructions` 从 cwd 向上发现）——**该 run 一份手册都没
注入**（system 消息无手册特征串，实证）。"31 份证据全无 frontmatter"的直接原因由此确定：
跨角色契约没进上下文，run 靠 persona + 角色 skill 跑完。根因与修复见
[bundle-face-wiring](./2026-09-26-bundle-face-wiring.md)（工作区未注册 → 会话建错 cwd）。

**基线审计的诚实结论**：首场 run 的**链接真实性**通过机械对账（102/102——好消息）；
但**格式契约**完全没被执行（31 份全无 frontmatter——run 期间的 analyst 没按手册写）。
这正是用户担心的"谁知道是不是幻觉"的两面：链接没造假，但契约纪律缺位；下一场 run
（「研究类型覆盖」）是新契约的首个真实执行场。

**输掉的方案追加**：七字段全硬谓词（否决——会判旧 run 全部证据无效，历史不回填）。
