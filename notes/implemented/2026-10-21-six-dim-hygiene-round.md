# 六维卫生轮：评审发现的全量修复

> 状态：implemented

六维卫生评审（维度1 渐进披露 / 2 代码与测试结构层次 / 3 文档-执行-验收整体结构 / 4 上下文腐化 / 5 测试资产 / 6 反馈通路）经五路深挖 + 逐项交叉实证后，用户授权"所有发现的问题都要修复"（预算加倍、静默自主、不惜代价）。本 Note 记录承载持久决定理由的部分；逐项证据住各 commit 与评审实录。

## 决定

- **索引的机械对账**：scripts/README lib 表「被谁消费」列 = scripts/dev/tests 实际 import 图（navigability-contract 契约，双向精确对账 + 每模块必须有表行）；根 AGENTS 布局块 ↔ 盘上工作区根实体/pack 种子（docs-consistency 契约）。理由：索引此前只查"点名在场"不查"准确"，消费列漂移实证（frontmatter 漏 bundle-date-sanity、session-log 5↔20、三处陈旧点名）——按索引找消费方者漏改即静默分叉；正本 = import 图，登记即效应。
- **正本收拢**：交付判据逐字正本 = 研究手册 §完成判据 + NODES 交付行（design/50 留六件骨架一行、guides/61 一行指针——原 4 份全文与两套互相矛盾的正本声明拆除）；门禁反证配方正本 = writing-a-gate 技能（tests/AGENTS 保留测试侧变体——另一受众的 owner）；偏离登记簿迁 decisions.md D26（根 AGENTS 预算下放处置序的执行）。
- **D27 参与阶梯 S0–S3**：与评估五面 L0–L4 前缀撞车曾需 4 处常驻消歧句——消歧句的存在本身证明编号选撞；改前缀根除（评估轴 L 不动）。
- **appendDecisionsRow 节内插入**：立红发现盲 append 在 §Decisions 后有尾随节的形态下记账落节外（node-gate 门③只读节内行 = 记账白落）；§Decisions 缺节 fail-loud。模板形态输出与旧实现逐字节等价（唯一消费方 run-kickoff 无行为变化）。
- **门禁反证两态口径**：gates-cases 常驻案例覆盖 18→26 门禁（+8 条 mutate 便宜 × 判据复杂优先）；副本注入不适的 4 道（vendor-pin / vendor-clean / pin-agreement / hooks-active——断言对象 = submodule/git config 真实状态，结构性不可注入）在 evaluation §L0 反证列登记理由，"一次性 Note 红录"与"常驻案例"两态闭合。
- **金标准有机审半边**：fixture web_search 调用经**同一批折算纯函数**（tool-card / activity-fold）重放 ↔ ui.expected.md **按节** deepEqual——发现金标准两节各出一次「检索：」（1 调用 = 1 卡 + 1 行）的非同构，朴素计数对账不成立，按节分列后逐行一致；--update-expected 重写链从此有机械对照。
- **web-ui-nav 单一正本（data-row-key 主锚）**：两套选择器各有实红教训（类名 span[class*='_root_'] 随 vendor 换版静默失效 = e2e 分叉实录），裁决 data-row-key 为主路径、类名降级兜底；六处私有版退役，cdp-probe 保留薄 CDP 适配层（裸 CDP 无法共用 page 鸭子接口）但选择器策略从 lib 取纯常量。
- **client-load-smoke 相位化**：六相位提顶层函数（定义序=执行序）+ helper 文件级 + 配置面拆 client-load-config.mjs 模块（保持单一 boot 入口与端口）——消灭全仓唯一真平铺巨物（~880 行单 try）。
- **反馈通路事后半边**：session-events/watch-run `--group` 逃生口（982 场冒烟/自测会话此前不可读）；run-state teammate 信号（origin==='subagent'——agentPreset 继承 lead 致提醒恒假的修复）；归档提示与 --latest 归档标注；llm-stream-tee 转正（复现技能 §2 的 tracked 仪器，凭据抄写面脱敏、原始流透传）；回放场景集发现参数化（discoverReplayFaces + --face）；调试表补 HITL 行。
- **场景包消费闭环**：scene-capture `--list` / `--show` + lib/scene-pack（五件套概要如实——缺件与坏 meta 不静默；"看见当时页面"补读取半边，原全仓零消费者）。
- **evaluation §L0 表列形自律**：43 行断言列全部一句话化（max 452→126 字、>200 清零），已知边界与判定细节迁居 verify.mjs 门禁块头注（合并去重，54 项特征短语 grep 审计全部命中新家），表内粗体 20→4（只留红线词）；发现 backlog-liveness 原行是 _backlog/README 规则正本的手抄副本（slop 实锤）。
- **裁定（评审后登记不改动）**：backlog 非前置的 7 处短语级提及保留（正本明确 = design/60 + D19，无全文多 home 形态，过度收拢伤各读者语境）；evaluation §0 血缘表与 discipline-map 的三原则重叠保留（两表 charter 不同——血缘"原则→权威出处" vs 纪律全量枚举"做法→本仓落点"，均为单行指针形态，非全文多 home；pnpm test 非 TTY 全量 TAP 输出噪音与 runtime 页面证据密度不改（观感/使用密度问题，非工具缺口）；decisions/00-index 的行首粗体保留（台账扫读结构）。

## 输掉的方案

- 消费列"代表性消费方 + grep 正本"降级——咬不住漏报，而漏报正是实发事故方向（frontmatter 案例）。
- 参与阶梯保留 L + 加消歧句——4 句永久税；A0–A3 撞 verify 门禁 A–F 域字母；P0–P3 撞缺陷 severity P0–P2。
- 交付判据正本放 design/50——手册模型可见且随 pack 分发，正本应在消费现场。
- client-load-config 独立 smoke——多一份 boot/端口/登记面；模块拆分已消除平铺且共享 boot。
- 金标准朴素计数对账（检索行数 = 调用数）——两节非同构，硬凑必假绿。
- gates-smoke 判据匹配保留 `\n…\n` includes 形态——对输出首行（md-utf8-newline）失明（首条靶向首行门禁的案例暴露：对照组假红 + 案例永不转绿）；^…$m 行锚定胜出。
- 过程输掉的（git 协作教训，供并行 agent 复用）：直接 unstage 他人 staged 文件后整树提交——pathspec 提交的临时 index 不含该组文件，md-links 判链接目标未跟踪而红；正解 = 各组各自 pathspec 提交（`git commit -m … -- <本组文件>`），或他人内容自成一组先单独入库。

## 实际跑过的验证

- 每提交过 pre-commit（verify + 全量 tests）；收尾态 pnpm verify 43 门禁全绿、pnpm test 597/597（轮首 570/570）、gates-smoke 对照组全 PASS + 64 注入案例点名红、verify-gates 静态对账绿。
- 先红后绿实录（新契约/新守卫全带反证）：根布局契约与消费列对账（首跑即红 = 当前真实漂移为自然反证）；appendDecisionsRow 三态（尾随节/缺节首跑红 + journal 双写 sabotage 红）；scene-pack（模块缺席红 + sabotage ×2）；text-fold sabotage；金标准加伪「检索：」行红；events.mjs sabotage（toolCall type 错值 → hitl-fold 11 例红）；SHOW_MORE_SESSIONS_PATTERN sabotage；findGroup / readableTitle / isArchivedScene 缺席红；quotepath 盲区双案例（非 ASCII 路径注入在旧实现下"未被点名报红"两轮实证）。
- 行为保持证据：client-load-smoke 基线↔复跑逐断言标签全同（61/61 × 3 时点）、e2e-021rc2 全同（7/7 × 2）、trackedFiles 收口前后 gates-smoke 62 案例同判、events 工厂迁移 8 文件 113 例测试数不变、D27 改名后契约测试 13/13。
- 实走（keyless 只读/本地）：scene-capture --list/--show/缺席 exit 2；session-events --group 读 564 场冒烟会话 + 无命中组 fail-loud 列组；watch-run 盯已归档 teammate 会话（teammate:true + 提示 + 归档 TIMEOUT 文案）；run-dashboard --latest 归档标注；llm-stream-tee 本地假端点（原始凭据到达服务端、抄写副本脱敏、调用方逐字流、四件套落盘）；unconsumed-evidence/acceptance-check 壳五形态 + exit 2 路径；snapshot-replay 发现式 ALL PASS（端口 3103）。
- 未跑项（如实登记）：client-hitl-smoke 与 cdp-ask-smoke（真模型档，需凭据）——hitl-answer 导航收敛的证据缺口由 ask-drive keyless 回归 + client-load/e2e 基线冒烟间接覆盖；pack src/client 两文件注释级改动未跑 client-load-smoke（无行为面变化，判断写入当次 commit message）。**2026-10-21 后续：三档真模型档（含 l4-lite）已补跑全绿，并以 cdp-ask 为线索修掉一处 D16 后遗症——见 [真模型档补跑与 cdp-ask 前置修复](2026-10-21-real-model-tier-evidence.md)**。

## 环境状态

- 用户并行 _backlog 工作（动态研究 DAG 问题卡与机制盘点）以独立提交 f69aec6 入库（staged 快照原样），未混入卫生轮任何切片；两次误并入事故已拆净（教训入输掉的方案节）。
- 交接已知项：gates-smoke 对 staged 中间态敏感（并行方 add 未 commit 期间对照组可瞬态红——共享验证周期的已知噪声源，经保留 fixture 重放证实）；剩余 13 道低风险结构门禁的常驻反证 = 一次性 Note 红录（evaluation 反证列两态口径可查，升级条件 = 出现该族真实回归）；repo-conventions 实查范围大于登记行（env 卫生面欠描述，扩写 = 独立 writing-a-gate 轮）。
