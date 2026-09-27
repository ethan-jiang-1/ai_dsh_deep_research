# DSH 插件生态认真研究（deep-research 定位与竞品）
> 状态：implemented

<!-- grandfather: 调研报告形态（状态表），非 Note 骨架——内容有效不追改。原状态行：已完成 | 2026-09-25 | 马拉松三号条目 3 -->


> 触发：roadmap §队列「DSH 插件生态认真研究」（粗扫后续）；用户纳入马拉松三号

## 结论先行

生态**极其活跃且竞争激烈**：知识研究类 456+ 插件、多个 awesome 清单（280+ 至全量收录）。
deep-research 相邻位至少 8 个直接竞品。**我们的差异化优势在多角色分工 + 证据机械审计 +
DSH 原生 Teams 通道**，而非搜索或学术工具面——那些已被重度覆盖。

## 生态规模

| 清单 | 规模 | 侧重 |
|---|---|---|
| [dshworks/awesome-dsh-plugins](https://github.com/dshworks/awesome-dsh-plugins) | 14 类清单（含 knowledge-research.md 456 条） | 分类目录 + [gallery](https://dsh.works/awesome-dsh-plugins/) |
| [kejixiaoliang/awesome-dsh-plugins](https://github.com/kejixiaoliang/awesome-dsh-plugins) | 14 类 280+ | 中文精选 |
| [Dominic789654/awesome-deepseek-harness](https://github.com/Dominic789654/awesome-deepseek-harness) | 全量 | 插件/技能/MCP/编排器/UI |
| [hikariming/dshfind](https://github.com/hikariming/dshfind) | 全量 | 原理学习 + 插件市场 |

生态定性：从 [极客公园报道](http://www.geekpark.net/news/369003)看，DSH 已从"赛博乐高"进化为
**Agent Store**——社区插件市场成熟（含 [hrhgit/deepseek-harness-plugin-manager](https://github.com/hrhgit/deepseek-harness-plugin-manager)
等插件管理器）。

## 直接竞品（deep-research 相邻位）

| 插件 | ★ | 与我们的差异 |
|---|---|---|
| [dsh-deep-research](https://github.com/omdsh-dev/dsh-deep-research)（omdsh-dev） | 24 | **官方 workflow 引擎**驱动的自适应编排（控制论/信息论设计）；复用内置 web_search/fetch——单工具编排 vs 我们的多角色分工 |
| [dsh-plugin-insight-mode](https://github.com/deepseek-ai/deepseek-harness/discussions/5307)（官方 Discussion） | — | Master/worker 深研 + **开工前人审批门**；官方讨论区亮过相——与我们 HITL1 相似但无结构化选项卡 |
| [dsh-scholar](https://github.com/lzszq/dsh-scholar) | 46 | **全自动科研流水线**（survey→idea→实验→手稿→发布 bundle）；面向科学论文而非通用研究 |
| [dsh-deepresearch](https://github.com/havingautism/dsh-deepresearch) | 13 | **证据优先**（与我们同理念）+ 自带 Web 视图 + 持久状态 |
| [dsh-evoresearch](https://github.com/Karbo123/DSH-EvoResearch) | 17 | **自演化研究工作流**（项目工作区 + 研究记忆 + 多 agent 团队） |
| [dsh-search-boost](https://github.com/Mr-remon219/dsh-search-boost) | 15 | 多引擎融合搜索 + **并行多 agent 研究** |
| [dsh-industry-research](https://github.com/PerryLink/dsh-industry-research) | 166 | **行业研究**域包（方法论技能 + 产业链模型 + 政策/新闻追踪）——垂直领域 |
| [dsh-science](https://github.com/biociao/dsh-science) | 40 | Claude Science 同款 ReAct 研究环 + **来源可溯的版本化工件** |

## 相邻能力面（生态已重度覆盖）

- **搜索增强**：[dsh-web-search-pro](https://github.com/anweat/dsh-web-search-pro)（70★，多引擎路由）、
  dsh-cross-search（多引擎交叉验证）、dsh-search-mcp（Tavily/Brave/Exa 替换内置搜索）等 10+
- **学术工具**：[dsh-Mimir-Academic-research](https://github.com/1692775560/dsh-Mimir-Academic-research)（539★，
  LaTeX 论文 + arXiv + 实验追踪 + GPU 编排）、[dsh-ai4scholar](https://github.com/literaf/dsh-ai4scholar)（28★，
  38 个学术工具）等 20+
- **知识库/RAG**：[WeKnora](https://github.com/Tencent/WeKnora)（30018★，腾讯知识检索 + RAG）、
  dsh-library（混合检索 + 多样性重排）、dsh-obsidian 变体 10+ 等 30+
- **MCP 集成**：大量插件以 MCP server 形式接入外部能力（Firecrawl、Context7、Querit 等）

## 我们 deep-research-pack 的差异化定位

**独占/领先面**：

1. **多角色 preset 架构**（Lead/Scout/Analyst/Critic 四角色 + Agent Teams 原生通道）——
   竞品多为单 agent 或 master/worker 两层，我们是四角色分工 + 持续对话组队；
2. **证据机械审计**（evidence-audit：URL 对会话日志溯源 + 摘录回溯 + final 链完整性）——
   dsh-deepresearch 同样"证据优先"但无机械对账面；
3. **HITL 结构化选项卡**（ask_user_question 一次多问 + options + 推荐位 + HITL2 审阅三选项）——
   insight-mode 有审批门但非结构化；
4. **观察面 UI**（研究状态页签：人性化活动流 + 步骤条 + 活标题 + HITL 挂起横幅 + 工具卡）——
   dsh-deepresearch 有自带 Web 视图，但我们的在 DSH 原生右栏内。

**生态已覆盖（我们不做）**：搜索引擎增强（用内置 web_search 足够）、学术工具面
（非通用研究方向）、知识库/RAG（harness 只读铁律——run bundle 即知识载体）、MCP 桥。

## 战略含义

- **不要**往搜索增强或学术工具面扩（生态饱和）——守住"多角色 + 证据审计 + DSH 原生 Teams"
  的差异化定位；
- **可借鉴**：dsh-scholar 的 claim-evidence ledger（与我们 evidence 身份链同构，可对比取长）；
  dsh-industry-research 的垂直域包形态（未来如做垂直方向，打包模式可参考）；
- **生态位**：我们的定位 = **通用 deep research 的质量框架**（多角色分工 + 证据可靠性 + HITL
  交互），而非搜索工具箱或学术流水线——在竞品中这是**空白位**。

## 来源（钉版引用）

- [dshworks/awesome-dsh-plugins knowledge-research 清单](https://github.com/dshworks/awesome-dsh-plugins/blob/main/lists/knowledge-research.md)（456 条，2026-09-25 拉取）
- [kejixiaoliang/awesome-dsh-plugins](https://github.com/kejixiaoliang/awesome-dsh-plugins)（280+ 目录）
- [omdsh-dev/dsh-deep-research](https://github.com/omdsh-dev/dsh-deep-research)
- [DSH Discussion #5307: dsh-plugin-insight-mode](https://github.com/deepseek-ai/deepseek-harness/discussions/5307)
- [dsh-scholar](https://github.com/lzszq/dsh-scholar)、[dsh-deepresearch](https://github.com/havingautism/dsh-deepresearch)、
  [dsh-evoresearch](https://github.com/Karbo123/DSH-EvoResearch)、[dsh-search-boost](https://github.com/Mr-remon219/dsh-search-boost)、
  [dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)、[dsh-science](https://github.com/biociao/dsh-science)
- [极客公园：黑鲸鱼 DeepSeek Harness，从「赛博乐高」变成 Agent Store](http://www.geekpark.net/news/369003)

---

## 吸收记录（2026-09-27 补：战略含义里"可对比取长"两钩子的处置）

1. **dsh-scholar 的 claim-to-evidence 体系（对比后维持现状）**：读其 README——它的模型是
   claim 为一等实体（claim-to-evidence links 记为持久研究状态）+ 两段式 intake（上传物先进隔离
   Intake、永不自动成为 Evidence）+ gate 治理（agent 不能伪造已采纳 Evidence / 绕过 Gate）。
   与本仓 evidence 身份链**同构但不同架构**：它有 Research Kernel（类型化数据库状态），我们是
   文件契约（frontmatter 七字段 + 摘录/解读分节 + 口径 + 单源待破 + evidence-audit 机械审计）。
   逐项对照：typed claim ledger ≈ 我们的 findings 行 + [来源:] 链（架构错配，文件式 harness
   不值得引入类型化账本）；两段式 intake ≈ 我们的 drafts/ 与 evidence/ 之分 + critic + audit
   （无失败证据，加流程纯增摩擦）；confidence ≈ 我们的 quality A–D。**反向强项**：机械溯源审计
   （抓取强度/摘录覆盖率/final 链）、反例搜索纪律、口径纪律——scholar 的 README 均无对应物。
   结论：**不吸收**；两者的差异是架构路线差，不是能力缺。
2. **dsh-web-search-pro 多引擎路由（seam 阻塞）**：见 [search-fallback-seam](../implemented/2026-09-27-search-fallback-seam.md)
   ——vendor web seam 是单 provider 语义、明文拒绝隐藏优先级链；替代路径 = 换 provider（用户动作）
   或 agent 韧性（已实证）。
