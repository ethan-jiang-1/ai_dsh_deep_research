# 任务说明

- 类型: 探针任务（非正式 run），无 bundle。lead 地图写在草稿区，供主编判断方向价值。
- 方向: 「国产大模型 2026 年的混合专家（MoE）架构演进」
- 产出: 候选方向清单（3–5 条 lead），每条按 lead-mapping 方法论走完 query 多样化 → 30 秒去留判 → A–D 分级 → 检索器对账。
- 抓取日期: 2026-09-26
- 纪律声明: 本文件所有 URL 均为本轮 `web_fetch` 真实成功取回的页面；搜索列表里出现过但未抓取的 URL 一律不进「支持来源」，仅出现在「未验证」节并注明原因。
- 边界: 本文件只画地图、不下结论、不写报告正文。每条 lead 的「建议 owner: analyst」是给主编的分派建议。

---

## 方向 1: 总参数持续膨胀而激活参数被按住——国产旗舰 MoE 的「稀疏率」在 2026 年系统性下探

- **状态**: 建议挖深（一线可证，证据最厚）
- **一句话假设**: 2026 年国产旗舰把 MoE 当成本结构工具用：总参数继续翻倍撑能力上限，单 token 激活参数增速远慢于总参数，激活率从 2025 年的个位百分比一路压到 1% 量级；旗舰与 Flash 版共用同一架构只是激活/规模档位不同。
- **支持来源**（全部真实抓取）:
  - [DeepSeek-V4 arXiv 摘要（1.6T 总参 / 49B 激活；V4-Flash 284B / 13B 激活；≥32T tokens；Muon 优化器）](https://arxiv.org/abs/2606.19348)（**A**，arXiv 一手论文，DeepSeek-V4 提交于 2026-04-26）
  - [Kimi K3 官方技术博客（2.8T 总参；896 专家激活 16；Stable LatentMoE；KDA + Attention Residuals；1M 上下文；scale 效率约 K2 的 2.5×）](https://www.kimi.com/blog/kimi-k3)（**A**，厂商一手技术博客）
  - [Kimi API 官方文档 K3 页（同样的 2.8T / 896 激活 16 / Stable LatentMoE 表述）](https://platform.kimi.ai/docs/guide/kimi-k3-quickstart)（**A**，一手官方文档，与上条互为厂商侧双入口）
  - [HySparse2 arXiv（80B-A3B MoE 消融载体：A3B 即 3B 激活，用于注意力架构对照实验）](https://arxiv.org/abs/2609.26368)（**A**，arXiv 一手论文）
  - [阿里云开发者社区《Qwen3.5 迈向原生多模态智能体》（397B 总参 / 激活 170 亿；全球首个原生多模态 MoE 大模型；已开源）](https://developer.aliyun.com/article/1712860)（**B**，阿里云官方技术社区文章；**注意**：页面作者为注册用户账号「modelscope」，不是 Qwen 团队署名，需以 HF/GitHub 一手卡复核）
  - [SemiAnalysis InferenceX 模型页 DeepSeek-V4-Pro（1.6T / 49B 激活；`n_routed_experts: 384`、`num_experts_per_tok: 6`、`n_shared_experts: 1`；0813 GA 版报 1.7T）](https://inferencex.semianalysis.com/zh/model/deepseek-v4)（**B**，SemiAnalysis 独立分析机构；其 config 参数引自 HF 仓库，属可回溯二手）
  - [投资界转载《阿里、字节、DeepSeek 豪赌 10 万亿参数模型》（Kimi K3 2.8T/896 专家激活 16/实际激活约 1040 亿；Qwen3.8-Flash-Next 1250 亿总参每次只激活 60 亿、训练成本较前代砍近 90%；GLM-5.3-Flash 3200 亿总参激活 180 亿）](https://news.pedaily.cn/202609/569596.shtml)（**C**，转载自 Tech 星球的行业报道，只能做背景与线索）
- **关键线索**:
  - 「DeepSeek-V4-Pro with 1.6T parameters (49B activated) and DeepSeek-V4-Flash with 284B parameters (13B activated)」——arXiv 摘要，一手。1.6T/49B ≈ **3.1%**。
  - 「We have also scaled up Mixture of Experts (MoE) sparsity, effectively activating 16 out of 896 experts」——Kimi 官方博客。2.8T/104B（后者见 tmtpost/投资界报道）≈ **3.7%**；而 GLM-4.5 时代是 3550 亿总参 / 320 亿激活 ≈ 9%。
  - 「Kimi K3 … 896个专家每次只激活16个，实际激活参数仅约1040亿」——投资界转载（C 级，需一手复核）。
  - 反面/边界证据（同一地图内的不共识）: 腾讯混元 Hy3 preview 走「不盲目 Scale Up」路线，**总参数（295B）小于上一版**，理由是把资源投数据质量、300B 是能力—效率最优档。见 [界面新闻《混元重建后，姚顺雨在腾讯交出第一份成绩单》](https://www.jiemian.com/article/14306613.html)（**B**，主流财经媒体，引腾讯官方口径）。这说明「总参数只增不减」不是全线一致。
- **检索器**: 官方域（arXiv abs 页、厂商技术博客、厂商 API 文档）＋ 学术检索 ＋ 主流搜索 ＋ 行业垂直报道 —— **多检索器可达**（≥3 条独立路径）。唯一薄弱环节：HF 模型卡/`config.json` 这条一手通路本轮抓取失败（见「未验证」节），所以专家数与激活率的**模型配置级**证据目前主要靠 B 级转引。
- **建议 owner**: analyst（对应 topic 待主编在 topics.md 定义，建议命名 T1「MoE 稀疏率演进」）
- **给 analyst 的判深提示**: 把「激活率」当成可计算指标逐代列表（DeepSeek V3 → V4、Qwen3-235B-A22B → Qwen3.5-397B-A17B → Qwen3.8-Flash-Next、GLM-4.5 → GLM-5.3-Flash、Kimi K2 → K3），并标注每一个数字的口径（是否含 shared expert、是否计入 MTP 层）。数字口径不一致是本方向最大的翻车点。

---

## 方向 2: 长上下文/Agent 负载把瓶颈从「专家稀疏」转到「注意力稀疏」——国产 MoE 集体转向稀疏+线性混合注意力

- **状态**: 建议挖深（证据最新、含一手论文，且存在厂商立场反转的强张力）
- **一句话假设**: 2026 年 MoE 的架构演进重点不在专家侧，而在注意力侧：长时 agent 的多轮工具调用把 prefill 计算与 KV cache 变成主成本，于是各家用「压缩稀疏注意力 / 混合线性注意力 + 层级 KV 共享」把 1M 上下文成本压到上一代的 1/5–1/20。
- **支持来源**:
  - [HySparse2 arXiv 摘要（两级 KV sharing：KV Bridging 用 YOCO 式 self-decoder/cross-decoder、KV Reuse；block-level 稀疏改 token-level；强制保留最近窗口；`Prefill can therefore exit after the self-decoder`）](https://arxiv.org/abs/2609.26368)（**A**，arXiv 一手，2026-09-22，通讯作者 Fuli Luo）
  - [TechNode：Xiaomi's MiMo-V3 to adopt new architecture as HySparse2 cuts long-context costs（1M 上下文下 prefill 计算降 5.02×、KV cache 降 4.5×；MRCRv2/RULER-v2 分数更高、AgentPPL/LongPPL 更低）](https://technode.com/2026/09/24/xiaomis-mimo-v3-to-adopt-new-architecture-as-hysparse2-cuts-long-context-costs/)（**B**，英文科技媒体，并直接给出 arXiv 号）
  - [36 氪英文版：MiMo-V2.6 发布、罗福莉提前剧透 MiMo-V3 架构（1M 上下文下 prefill FLOPs 降至 HySparse 的约 34%、Hybrid SWA 的约 20%；KV cache 2.69GB vs 6.72GB vs 12.09GB；49 层模型中 prefill 节点只需部署前 25 层、权重近半；RULER-v2 256K 下 58.45 vs 32.61 vs 35.74）](https://eu.36kr.com/en/p/3996783462780800)（**B**，主流科技媒体，含论文数据的转述性明细）
  - [DeepSeek-V4 arXiv 摘要（CSA + HCA 混合注意力；1M 上下文下单 token 推理 FLOPs 仅 V3.2 的 27%、KV cache 仅 10%）](https://arxiv.org/abs/2606.19348)（**A**）
  - [MiniMax 官方博客 M3（MSA = MiniMax Sparse Attention 取代 full attention；1M 上下文每 token 计算仅为上一代 1/20；prefill 加速 >9×、decode >15×；多处消融中 MSA 在绝大多数能力上与 full attention 打平）](https://www.minimax.io/blog/minimax-m3)（**A**，厂商一手博客，2026-06-01）
  - [MiniMax 官方博客《为什么 MiniMax M2 是一个 Full Attention 模型？》（2025-11-06：Efficient Attention「在一个现实的工业系统中…想要打败 Full Attention 还有些距离」；自测 Hybrid SWA 两类混合方案「都没 work」，表现为上下文越长性能下降越显著；开源推理代码里残留的 SWA 实现是「忘记删」，「当然是效果不行」）](https://minimax.cn/news/%E4%B8%BA%E4%BB%80%E4%B9%88minimax-m2%E6%98%AF%E4%B8%80%E4%B8%AAfull-attention%E6%A8%A1%E5%9E%8B)（**A**，厂商一手博客；本轮检索的最大意外收获——同一厂商在约 7 个月内从「开倒车用 full attention」翻转到自研稀疏注意力，构成可证伪的立场时间线）
  - [阿里云开发者社区《Qwen3.8-Flash 来了》（Qwen3.8-Flash-Next 为 Qwen4 新架构预览，四个方向 Attention/Residual/Embedding/Optimization；QSA = Qwen Sparse Attention；1M 上下文下 attention kernel prefill/decode 最高 7.6× / 4.9× 加速）](https://developer.aliyun.com/article/1759085)（**C**，注册用户贡献的技术社区文章，但转述了 Qwen 官方发布口径，可作线索；需以 qwen.ai 官方 blog 与 HF 复核）
  - [RITS（上海纽约大学图书馆研究与技术服务中心）Qwen 3.5 Small 报道（全系共享 3:1 线性注意力与 full softmax attention 混合架构；Gated DeltaNet；MTP/NEXTN）](https://rits.shanghai.nyu.edu/ai/qwen-3-5-small-models-9b-parameters-that-beat-120b/)（**C**，高校信息服务中心博客，文末自述「drafted with AI assistance and reviewed by RITS staff」，只做背景）
- **关键线索**:
  - 一手论文原文：「At the outer level, KV Bridging adopts a YOCO-style self-decoder and cross-decoder structure… Prefill can therefore exit after the self-decoder, skipping all cross-decoder layers.」——省的不只是算力，而是**执行路径长度**，这对 MoE 部署形态（prefill/decode 分离、PD 异构部署）有直接含义。
  - 立场反转原文：「为什么你们在 MiniMax M2 上开倒车, 采用了 Full Attention 机制?」→ 到 M3：「It uses MSA (MiniMax Sparse Attention)… and avoid the 'inherent flaw' of full attention: quadratic computational complexity growth.」两条均为厂商一手。**反转原因值得单独挖**（该博客自己给出的条件：算力增速慢于数据长度带来的算力压力时，线性/稀疏的收益才会释放）。
  - 同一现象跨厂商收敛：DeepSeek（CSA+HCA）、Qwen（QSA / Gated DeltaNet 3:1）、Kimi（KDA 混合线性注意力）、MiniMax（MSA）、小米（HySparse2）——五家独立团队、五种命名、同一方向。
- **检索器**: 官方域（arXiv、厂商 blog、厂商 API 文档）＋ 学术检索 ＋ 主流搜索 ＋ 英文科技媒体（TechNode/36Kr EN）—— **多检索器可达**。单检索器缺口：Qwen 侧 QSA 的**官方一手表述**（qwen.ai blog / GitHub tech_report.pdf）本轮未抓到，目前只有 C 级转述，标 `单检索器——待破`（仅中文技术社区 + 转载链可达）。
- **建议 owner**: analyst（建议 topic 命名 T2「注意力侧稀疏化」）
- **给 analyst 的判深提示**: 各家「加速倍数」都是厂商自报、口径各异（对照基线分别是上一代自家模型 / HySparse / Hybrid SWA / Flash-Sparse-Attention），**不可横向比较**。可行的做法是只记「相对自家上一代」的比值并注明基线，把跨厂商比较降级为「方向一致」的定性判断。

---

## 方向 3: 「总参数大竞赛」回归（5–10 万亿）——但那是 MoE 容量而非计算量的竞赛，与 2024 的效率叙事正面冲突

- **状态**: 建议挖深（但需接受证据先天薄弱，且必须与方向 1 合并看，不单独成篇）
- **一句话假设**: 2026 下半年国产头部（阿里、DeepSeek、字节）集体把下一代目标抬到 5–10 万亿总参数；因为 MoE 把「能装多少」与「每次算多少」解耦，这轮参数竞赛与「效率优先」并不矛盾，反而互为因果。
- **支持来源**:
  - [投资界转载 Tech 星球（2026-09-24；云栖大会阿里 CEO 吴泳铭披露下一代模型 5 万亿–10 万亿参数；Qwen LLM 负责人刘大一恒称 Qwen4.5/Qwen5 迈向 5–10 万亿；The Information 报道 DeepSeek 在训约 2 万亿参数模型、梁文锋称下一步推到 8 万亿；FT 8 月称字节在训最高 10 万亿）](https://news.pedaily.cn/202609/569596.shtml)（**C**，转载链）
  - [钛媒体/字母榜《8 万亿，梁文锋也开始卷"超大"》（2026-09-22；复述 The Information 与 FT 报道；并给出关键机制表述：「模型能装多少, 和每次要算多少, 变成了两个不同的数字」；Kimi K3 激活约 104B ≈ 3.7%、DeepSeek V4-Pro 激活 49B ≈ 3%；V3 时代 6710 亿总参/370 亿激活、278.8 万 H800 GPU 小时、557.6 万美元训练成本）](https://www.tmtpost.com/8148966.html)（**C**，自媒体专栏，机制解释质量高但非一手）
  - [DigitalToday 转述 The Information（2026-09-24：梁文锋在非公开投资者会议称华为最早今年四季度供训练芯片；DeepSeek 正训 2 万亿参数模型、主力 V4 约 1.4 万亿、并规划 8 万亿参数模型）](https://www.digitaltoday.co.kr/cn/view/107306/deepseek-bets-on-training-ai-models-with-huawei-chips-plans-8-trillion-parameter-model)（**C**，韩媒转述英文一手报道，二手转述链）
  - [DigitalToday 转述 Reuters/FT（2026-08-07：字节在训最高 10 万亿参数模型，处于通常 3–6 个月的预训练阶段；FT 称 10 万亿将超过 Kimi K3 的 2.8 万亿三倍以上；业内估计 Anthropic Mythos 5 约 8 万亿、Fable 5 约 5 万亿）](https://www.digitaltoday.co.kr/en/view/90696/bytedance-trains-ai-model-with-up-to-10-trillion-parameters-nearing-anthropics-mythos)（**C**，二手转述，但明确交代了信源链 The Information → FT → Reuters）
  - 一手侧的唯一硬锚点：[DeepSeek-V4 arXiv（1.6T/49B，32T tokens）](https://arxiv.org/abs/2606.19348)（**A**）——即「已发布旗舰」的规模，与「规划中的 5–10T」形成鲜明层级差。
- **关键线索**:
  - 「MoE 架构可解耦总参数与激活参数，兼顾能力上限与成本可控性」——投资界摘要（C）。
  - 「所以今天说一个模型有 5T、8T 甚至 10T 参数, 并不意味着每生成一个 Token 都要跑完这 10T 参数」——钛媒体（C）。
  - 反向张力：「参数越大，推理越慢…即便只是几千亿乃至两三万亿参数的旗舰模型，用户的实际使用成本也已经相当高」——投资界（C）；以及腾讯 Hy3 明确不跟规模（界面新闻，B）。
- **检索器**: 主流搜索 ＋ 行业垂直报道 ＋ 财经媒体 —— **只有媒体路径可达**，官方域与学术检索**均无**任何 5–10 万亿的官宣文案或论文（本轮多次换词尝试均未命中）。按对账纪律标 **`单检索器——待破`**：这条 lead 的真实度完全押在 The Information / FT 的匿名信源上。
- **建议 owner**: analyst（建议 topic 命名 T3「参数规模竞赛」）
- **给 analyst 的判深提示**: 这条方向的**证据等级上限就是 B/C**。所有「5T/8T/10T」数字都不可作为关键结论的单源支撑，必须显式标注「规划/据报，未官宣」并配 `单源——待破`。可行的增值做法：转去挖 The Information / FT 原文（付费墙，需自查可达性），或把它降级为方向 1 的「动机解释」段落而非独立结论。

---

## 方向 4: 工程可用性成为 MoE 架构选择的一等约束——单机可部署档位、专家压缩与路由稳定性的「研究—落地」落差

- **状态**: 建议挖深（有一条强 B 级一手口径支撑其「存在」，但「国产旗舰如何实现」这一层目前是 gap）
- **一句话假设**: 2026 年国产 MoE 的规模选择不再只由能力上限决定，而由部署经济学反向约束：300B 档被明确论证为「能力与效率的最优平衡带」（量化后单机可部署），同时学术界在研究专家剪枝/合并后的恢复与路由塌缩——两端之间存在明显的证据缺口。
- **支持来源**:
  - [界面新闻《混元重建后，姚顺雨在腾讯交出第一份成绩单》（2026-04-23：Hy3 preview 为快慢思考融合 MoE，总参 295B、激活 21B、最大 256K 上下文；「不盲目 Scale Up」；「理论上，300B 是能力与效率的最优平衡带」；「300B 级别的 MoE 模型经过量化后可实现单机部署，大幅降低了部署的硬件成本」；团队自建 50 多个 benchmarks 而非依赖公开评测集）](https://www.jiemian.com/article/14306613.html)（**B**，主流财经媒体，引腾讯官方口径）
  - [arXiv 2609.06076《Beyond Retraining-Free MoE Compression》（EMNLP 2026 Main：免重训的专家剪枝/合并只能把压缩 checkpoint 当「压缩后的初始化」；两个 MoE 主干 × 4 种剪枝合并法 × 3 档专家保留率 × 28 个 benchmark，仅 3000 条 C4 样本、单 epoch 微调即可恢复原始—压缩性能差距的 37.3%）](https://arxiv.org/abs/2609.06076)（**A**，同行评审会议论文；**注意**：这是通用 MoE 研究，不是国产模型研究，只能做机制参照）
  - [arXiv 2605.12476《Routers Learn the Geometry of Their Experts》（路由与专家之间存在几何耦合；辅助负载均衡损失会破坏该结构、使不同路由方向相似度提高近 3 倍；无参数的在线 K-Means 路由在负载均衡上最优而困惑度仅小幅上升；1B SMoE 从零训练验证）](https://arxiv.org/abs/2605.12476)（**A**，arXiv 论文，作者含 Mor Geva）
  - [Zenodo 预印本《Diagnosing and Stabilising Routing Behaviour in Mixture-of-Experts Models》（提出 ELE/RDI/ECD 三个路由诊断指标；作者自述「While empirical validation at scale remains future work」）](https://zenodo.org/records/19770276)（**D**，独立研究者预印本、无同行评审、作者自认未做大尺度验证 —— 按纪律**不作为支撑**，仅登记为待验证独苗）
- **关键线索**:
  - 「300B 是能力与效率的最优平衡带」「量化后可实现单机部署」——界面新闻引腾讯官方（B）。这是本轮唯一一条把「部署形态」明确写进**规模决策理由**的官方口径。
  - 「compressed MoE checkpoints are better understood as compressed initializations that benefit from a tiny post-compression adjustment stage」——EMNLP 2026 论文（A），说明「免重训压缩」在 MoE 上并不成立，压缩后必须补一小段调整。
  - 明确的研究—落地缺口：国产 2026 旗舰（384 专家、896 专家、Qwen3.8-Flash 的 125B/6B 档）**如何**在训练侧维持极高稀疏率下的路由稳定与负载均衡，本轮**没有抓到任何一手披露**（各家技术报告或未发布、或未检索到该章节）。这是本方向最值得 analyst 挖的空白。
- **检索器**: 主流搜索 ＋ 学术检索 ＋ 财经媒体 —— 可达；但「国产旗舰的路由/压缩工程细节」这条只走了**模型卡与文档域**（且 HF 抓取本轮失败），标 `单检索器——待破`（仅 HF/ModelScope 模型卡 + 各厂技术报告可达，搜索引擎侧覆盖差）。
- **建议 owner**: analyst（建议 topic 命名 T4「部署经济学与路由工程」）
- **给 analyst 的判深提示**: 学术侧证据（EMNLP/arXiv）与国产侧证据不共享任何作者或数据集，**不可直接互相支撑**；正确用法是「学术侧提供机制假设 → 到国产侧找验证或反证」。若国产侧始终拿不到一手披露，这条方向应显式记为 gap 而非结论。

---

## 已排除的方向（显式记录，避免重复检索）

| 方向/假设 | 处置 | 一句话原因 |
|---|---|---|
| MoE 专家数量「细粒度化」是 2026 的主要演进轴 | 已排除（并入方向 1） | 专家数（384/896）只是稀疏率的分母，本身不构成独立机制；且缺跨代同厂可比数据 |
| 全模态/原生多模态推动「模态专属专家」路由 | 已排除（并入方向 2） | 抓到的都是「模态统一进同一稀疏主干」的证据（如 Ming-Flash-Omni 100B/6.1B 激活、Qwen3.5 原生多模态、MiniMax M3 混合模态训练），没有找到「模态专属专家」的一手设计披露；假设方向反了 |
| MoE 训练稳定性/路由塌缩是 2026 国产前沿的**主**瓶颈 | 不作为独立 lead（降级为方向 4 的机制参照） | 学术侧有 A 级论文，但**无法**关联到任何国产 2026 旗舰的一手披露；按「关键结论须 A/B 支撑」纪律，不能凭机制论文反推国产现状 |
| 稀疏注意力与 MoE 是两条竞争路线 | 已排除（并入方向 2） | 证据一致显示二者同模型叠用（DeepSeek V4、Kimi K3、Qwen3.5 均在 MoE 主干上叠加稀疏/线性注意力），不存在路线竞争 |

## 未验证 / 抓取失败（不要当成来源用）

搜索列表出现过或需要但本轮 **web_fetch 失败/被拦** 的关键页，下一轮直接补抓，不必重新检索：

- `https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro`（HF 模型卡，含 `config.json` 的 `n_routed_experts: 384`、`num_experts_per_tok: 6`、`compress_ratios`）→ **fetch 失败（TypeError: fetch failed）**。这是方向 1 最需要的一手锚点。
- `https://huggingface.co/Qwen/Qwen3.5-397B-A17B`（Qwen3.5 旗舰模型卡）→ 同上失败。
- `https://huggingface.co/blog/deepseekv4`（官方 CSA/HCA 层结构说明：层 0–1 HCA、层 2–60 CSA/HCA 交替、MTP 块仅 SWA）→ 同上失败。目前该内容仅通过 InferenceX 转引可见。
- `https://huggingface.co/Qwen/Qwen3.5-9B`、`https://raw.githubusercontent.com/huggingface/transformers/main/docs/source/en/model_doc/qwen3_5.md` → 失败/超时。
- `https://www.morphllm.com/qwen-3-5`（Qwen3.5 397B/17B/262K 汇总）→ **HTTP 429 + Vercel 安全校验**，不可用。
- `https://www.cnbc.com/2026/02/17/china-alibaba-qwen-ai-agent-latest-model.html` → 抓取成功但正文为空（付费/反爬截断），无可用内容。
- FT / The Information 原文（字节 10 万亿、DeepSeek 8 万亿的一手出处）→ 本轮只拿到 DigitalToday / 钛媒体 / 投资界的转述链，**原文未抓取**。
- `https://www.sgpjbg.com/...`（浙商证券「MoE 架构成本优势：V4-Pro 激活率仅 3%」研报摘要页）、`https://www.gdsig.cn/...pdf`（GLM-4.5 3550 亿/320 亿的机构 PDF 转引）→ 未抓取，仅出现在搜索结果中，**不列为来源**。

## 检索器对账小结（给主编的覆盖面判断）

| 检索器路径 | 本方向覆盖情况 |
|---|---|
| 官方域（arXiv abs、厂商 blog、厂商 API 文档） | 强。方向 1、2 的一手锚点全在这里 |
| 学术检索（arXiv 全文、Springer、EMNLP） | 中。命中的多为**通用** MoE 机制论文，国产旗舰专属论文仅 DeepSeek-V4、HySparse2 两篇 |
| 主流搜索引擎 / 中文科技媒体 | 强。方向 3 几乎全靠这条路 |
| 代码托管与模型卡（HF / ModelScope / GitHub） | **弱——本轮全部 fetch 失败**，是最大单点缺口 |
| 行业垂直站（SemiAnalysis、TechNode、36Kr EN） | 中。可拿到带数字的转述，但不能当一手 |
| 厂商发布 blog 的中英双入口 | 强（Kimi、MiniMax 均中英双入口互证） |

**给主编的分派判断**：方向 1、2 证据已足够支撑 analyst 直接开写（各有 ≥2 个独立注册域、A+B 混合），可作本 run 主干；方向 3 只作背景层且必须显式标注单源待破；方向 4 的「国产侧实现」是真空白，适合作为一轮额外检索的目标而非直接开写。
