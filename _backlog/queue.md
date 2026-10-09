# queue · 已授权工作的可选次序索引与既有搁置决定

> 只有工作已获授权，且需要多步排序或跨会话恢复时，才使用本表。▶ 标记本表中当前项，不代表仓库全部当前工作；queue 是索引，不授予授权。用户直派按本轮授权执行，不要求先登记。
> 已登记条目按主题命名、完成或停止即离队；每行 ≤3 行并标注 `等人`（缺明确真人输入）或 `可自主`（在授权内可推进）。判断材料住 [issues/](issues/README.md)，不要求 issue 关闭时生成 RFC 或 queue 行。
> 只有持久决定需要显式评审时才建立 `notes/proposed/` RFC。已有 RFC 和搁置裁决继续由本表链接，按其真实 owner 更新；队列空是合法状态，不从卡片清单自行找活。规则见 [backlog 手册](README.md)。

## 队列

（队列空——待用户取题）

> 出处 = SDLC Reference 全量对表推敲卡
> [2026-10-08-sdlc-reference-absorption](_archive/settled_issues/2026-10-08-sdlc-reference-absorption.md)
> （2026-10-08 按"部分采纳"毕业：C17/C18/C1/C3 已落地，余项择要立上述 RFC）。
> 卡上第二档其余项（C1 覆盖率 / C7 L3 逐行对账 / C8 L4 ④中断恢复 / C9 L4 ③HITL 静默 /
> C12 misquote 升格 / C13–C16）**各有独立前置**（缺分布或标定），未立 RFC——需要时回卡取判断材料。

## 搁置池（既有裁决与重启条件；保留历史决定链接，不是待办队列）

| 条目 | 进池原因 | 复活条件（现状） |
|---|---|---|
| workflow 工具采纳——[RFC](../notes/rejected/2026-09-30-workflow-adoption.md) | 内核错位（方法论弃管道面）+ 载体倒转（one-shot 裸代理跑主通道倒转 D3/D16——2026-10-02 源码重估：内线形态不构成倒转）+ HITL 停点结构性无落点；run 实证每个高价值行为皆不可预脚本 | 双轨（2026-10-02 重估改写，全文见 RFC）：主通道轨 = 引擎出现 continuable/teammate 或 HITL 感知语义；受控内线轨 = preset 两行声明 + 封闭扇出域 + run 实证扇出段载体疼痛，三者同时满足（✗） |
| browser-use 插件族——[RFC](../notes/rejected/2026-09-30-browser-use-adoption.md) | 缺口真实（15 场 run 中 13 场命中 SPA 证据失败）但 experimental 零出厂采纳信号 + 团队形态错配（每 agent 起 MCP 子进程）；绕行已对冲大半，**2026-10-02 起五绕行含 mcp-playwright 通道**（[采纳 Note](../notes/implemented/2026-10-02-mcp-playwright-adoption.md)） | C1 provider 晋级 stable（pin bump 后 experimental 目录 grep 空）或进可选 bundle；C2 leads 阶段 ≥2 条 A/B 级线索五绕行（含 mcp-playwright）全败 → 单场 scoped pilot；C3 `js-render-blocked-no-workaround` 标签累计 ≥4 例（历史已 3）（✗） |
| UI 皮肤（client 面 + slots 品牌）——[RFC](../notes/rejected/2026-09-24-ui-skin.md) | 核心研究流未稳，皮肤是表现层（company 到 R5 才做皮肤）；与观察面边界已辨析 | 首个完整 run 通过（✓）+ 有 demo 需求（✗ 等用户点名） |
| 专职 synthesizer 角色——[RFC](../notes/rejected/2026-09-24-synthesizer-role.md) | lead 独任综合无过载：首场 run（[m2-run-mechanics](../notes/implemented/2026-09-24-m2-run-mechanics.md)）+ **2026-09-26 两场 run 重估**（26 / 46 张证据卡、6 topic，无过载迹象） | run 实测综合负载过高（✗；**2026-09-26 已多 run 重估一轮，条件仍未满足**） |
| floor 数值门禁机械化——[RFC](../notes/rejected/2026-09-24-floor-gates.md) | critic 散文审查实证有效（九场无一滑坡）；**可实现核心已被 evidence-audit 吸收**（抓取强度/摘录覆盖率/final 链/日期——数值门禁的灵魂已活在机械审计里） | run 出现质量滑坡实证（✗；重估至第九场，条件仍未满足） |
| 许可证（LICENSE）——[RFC](../notes/rejected/2026-09-24-license.md) | 本仓 `private: true` 未对外分发（**未决非遗漏**） | 对外分发/发布 pack 前（✗ 等用户分发计划） |
| evidence caliber 数值断言——[RFC](../notes/rejected/2026-09-24-frontmatter-caliber-gate.md) | margin ≠ threshold：实测前数值门禁是假牙齿（口径是散文判断，"字段在场"断言查不出"口径真实"；基础整治 §3.4 用户拍板独立成篇） | 首个 run 实测出现口径缺失高频导致 critic 狩猎漏检、或口径标记被滥用逃避纪律，且实测数据能定出判据形状（随 floor 机械化一并重提）（✗） |
| per-topic evidence 数量地板参数化（策略对标候选 A/B）——[对标材料](research/strategy-benchmark/2026-10-03-strategy-benchmark-sources.md) | 三轴对标判定"地板缺失/数量型终止部分缺失"（源仓 wave0 12/wave1 10 + CLI 单点计算权威可借鉴；Anthropic 用 prompt 区间）；floor 教训 = 数值未标定前是假牙齿，**先标定后立门** | ①存量 19 场标定"每 primary topic 卡数"分布（journal 逐场数，零成本）→ ②下一场 run 起 journal 增记该字段 → ③分布实证"primary 卡数 < 下限且 wave2 返工"场次 → 立门（数值由分布定；候选 B 参数单点计算权威同 diff）（✗） |
| HITL2 条件范围轮（A+D 合流）——[卡](_archive/settled_issues/2026-09-28-hitl2-scope-round.md) | 严格门实证未发生（零 rerun）+ 实施归第二阶段（环节合同）；试点正证留卡〔范围轮试点题两场被认真作答、零过烦〕 | 首场补研究型 HITL2 发生（体感定形 → 立 RFC）或用户点名提前（✗） |
