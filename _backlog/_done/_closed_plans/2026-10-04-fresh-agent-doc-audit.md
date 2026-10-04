# 推敲：fresh agent 清晰度与信噪比审计——七红、布局停更与门禁盲区的处置

> 状态：已毕业·判断产出（2026-10-04 用户批准全修：七红 + 布局中道补账 + 门禁盲区 + 卫生 + 低风险黄项；段落墙/叙事迁移暂缓单列）｜去向 = RFC 2026-10-04-fresh-agent-doc-audit（notes/proposed/，随条目毕业迁 implemented/）+ queue ▶

## 背景 / 触发

2026-10-04 用户发起"打扫卫生"审计，两问：① 对 fresh agent 是否清晰、信息是否渐进披露不多不少（agent chain / task execution chain / AGENTS.md 是否披露整个文件系统）；② 整体信噪比、有无概念相左。

审计为**三方独立交叉**；条目复核状态随条标注——【已核】= 主会话写卡前盘上核实；【抽验坐实】= 子代理发现、写卡后抽验逐字坐实；【抽验修正】= 抽验后改判（原表述过强或细节失实）。**行号与计数 = 审计时点 2026-10-04**，后续编辑会漂移，复核一律以文件事实为准：

1. 主会话通读治理层全量（根 AGENTS.md、00-index、queue、README、notes/README、_backlog/README、guides/60、evaluation、research-workspace/AGENTS、NODES.md 头部、scripts/pack 两份子树 AGENTS）+ 定向机械核对（grep 短语计数、门禁源码、盘上 tag/目录）；
2. 零上下文子代理 A：深水区文档审计（guides/61、62、evaluation、design/10–40、pack README、手册、NODES），按"清晰度 / 相左 / 术语 / 死链 / 净信息量"五维逐份出证；
3. 零上下文子代理 B：根 AGENTS.md §布局 vs 盘面双向机械对账（排除 node_modules、vendor、.git、dev 运行区）。

写卡后用户又令对卡本身做质量审查——红 1、红 8（原编号）被抽验改判，61:112 为审查期新收实例，均已并入下文。

## 已知（已核实的事实）

### 红：文档互相打架（P0）

1. **61 §0(b) 交付线判别标签误导（措辞级）**【抽验修正：原判"三处三个样、互不引用"过强——61:41-42 确有衔接语（"final/ + PASS 只是盘上可验的交付线……(b) 类归档前请用户确认"），程序有确认兜底，不会擅自归档】。残留实质：`docs/guides/61-run-playbook.md` §0(b) 把「有 `final/` 且 review PASS」标注为"交付线已在盘、按 D17 该进 `archive/`"，但 `research-workspace/NODES.md` 综合节点证明 `final/` 版本记账在 HITL2 拍板**之前**就在场——停在 HITL2 等拍板的 run 会被打上"该归档"标签。§6 真判别器（final.md + present）与 §0(b) 标签语义不一致。
2. **guides/62 内 overlay 身份自相矛盾**【抽验坐实：62:21 逐字「镜像；源 = overlay」；62:101-102 生成物节；`dev/render-overlay.mjs`/`dev/boot-run.sh` 机制】：§词汇行（62:21）写 profile「镜像；源 = overlay」；同页 §改动影响面（62:101-102）把 overlay 列为**生成物**（render-overlay.mjs 从 pack 渲染、勿手改）；boot-run.sh 实证 run 通道 profile 由 npm pack 从 **pack** 重建。照 §词汇第一改就改错正本——P1 定案（D16）后没回改的过期结论。
3. **YYMMDD ↔ YYYY-MM-DD（2026-10-03 翻案未同步，两处）**【已核：grep 三处对照 + verify.mjs 门禁 32 源码】：`AGENTS.md:32`（布局）与 `docs/evaluation.md:64`（plans-liveness 台账行①）仍写 plans 卡 `YYMMDD-slug`；门禁实断言 `YYYY-MM-DD-<slug>.md`、[../README.md](../README.md) 铁律节与 `_done/_closed_plans/` 七张归档卡【抽验坐实：7 张】全是新格式。**照根 AGENTS 命名立卡会被门禁咬红**。没炸的原因：plans 当前 0 卡（空态免检）。
4. **notes/README.md:88 钉 tag 过期**【已核：盘上 `git -C vendor/dsh describe`】：写旧版 tag（0.1.7-rc.2——去 `dsh-` 前缀记录，防 pin-agreement 把证据引文当复述咬），盘上 submodule 实为 `dsh-v0.2.0-rc.2`（根 AGENTS §DSH 源码表正确）。
5. **final/ ≠ final.md 混用族（三处）**【已核 ①，抽验坐实 ②，③ 与红 1 同源】：① `research-workspace/AGENTS.md:120` 完成判据写「文件事实（**final/ 当前版** + present 声明）」，同页 30–34 行刚钉死「final/ 只放版本记账，不放当前版全文；当前版权威副本 = run 根 final.md」——此句每场 run 注入每个角色；② `docs/guides/61-run-playbook.md:112`「拍板后 **final/ 当前版**落盘」同款混用（卡质量审查期新收）；③ 61 §0(b) 的「有 final/ = 交付线」判别。
6. **pack README 折算层计数相左**【抽验坐实：design/40:37 逐字「折算层五件」+ `src/lib/bundle-bind.ts`/`tests/bundle-bind.test.mjs` 在盘】：`packages/deep-research-pack/README.md` 写四件（activity-fold / hitl-fold / run-fold / tool-card），构成正本 `docs/design/40-research-cockpit.md` 明文五件。README 自链"构成正本 = design/40"却与之不一致；另 README:72 硬编码「14 个平台 peer 包」（count-free 句式盲区）。
7. **遗漏型相左**【已核：grep 61 全文零"驾驶舱"】：guides/61 全文零处提到研究驾驶舱；§3（61:94）说"进度看三处"（消息流 / 任务板 / deliverables），而 design/40 与 pack README 把驾驶舱定位为 run 期观察主面。操作入口页不知道自己 ship 的观察面。

### 黄：困惑 / 噪音（不阻塞，扫荡时顺手）

- "D18"一号两义【抽验修正：原判"同一行内撞车"失实——实为 `docs/design/10-architecture.md` 第 13 行（本仓 D18 驾驶舱例外）与 60-61 行（company D18 ×3）**同文件不同行**】。**合规复核结论：company D18 带仓前缀，符合 00-index「引用他仓决策必须带仓前缀」裁定，不改文档**；残留代价仅 grep 混杂——裁定记 RFC 即可。
- guides/62:12、62:27 裸引用 `_agent_ready_development/repo-harness/…`【抽验坐实】——仓内/盘上不存在；真实位置是仓外 `/Users/bowhead/deepseek-harness/…`，只有 docs/00-index 外部材料表登记；写成相对样子会被当本仓路径找。
- guides/62 证据义务表（62:64-68）缺「先 `source dev/env.sh` 否则 exit 2」前置——照表执行第一条 L1 命令即自拒。
- node-gate 门数漂移：手册（research-workspace/AGENTS.md:37）说"交付判据两门"【已核逐字】，NODES 实际 ≥4 门（交付两门 + 门L + 版本记账门）。每场注入的手册低估机械把守面。
- 步序正本三家：design/40 自称"当前事实单一正本"，但 §6 承认 run-dashboard 步序副本手工同步、步序正本住 notes/implemented（冻结层）；40 轨道 9 可视步 vs NODES 8 节点无映射说明。
- 一处事实多家：owner 表（design/20 复述手册，自认"一处事实一个家"仍复制）、两点交互纪律（手册 + NODES + design/30 三份）、skill 清单（pack README 整列 vs design/20 明训"复制即缓存"）、NODES 门编号无图例。
- 手册目录约定代码块缩进把 drt_ 子件视觉上挂在 `archive/` 之下。
- guides/61 §0 段落墙（端口让位史 + SSRF 机理三段 + 呈交纪律混进启动步骤）、§白屏判别序含 vendor 前端重建——违反自家 docs/AGENTS"每段一条规则 / 不写变更史"。

### 信噪比（结构性观察）

- **制度层厚于对象层**：队列空（parked）、plans 0 卡，但 queue.md 头注 12 行、_backlog/README 146 行宪章、00-index 台账约 30 行。制度质量高（"明确不借"负知识表是亮点），但治理词汇密度过载：**"正本"在 9 份治理文档出现 47 次**、"全仓唯一"7 个文件、"推敲卡不是任务"6 个家（该规则自己违反"一个事实一个家"）。
- **事故叙事进常驻注入面**：手册"2026-09-26 实测五场交付物日期全错""第五场 lead 放进了 final/"——教训已固化进契约句，叙事是每场 run 的持续 token 税，可降级 notes。
- **evaluation.md 门禁表反证列双载体**：第三列已是反证出处，断言列再复述完整事故故事，断言本体被淹没。

### 门禁盲区（机制层事实，修红时一并判）

- `gate-ledger-sync` 只对账门禁**名**，不管断言文本——evaluation.md:64 的过期 YYMMDD 没人咬。
- `pin-agreement`（`scripts/verify.mjs:447`【已核行号】）**整层排除 `notes/`**——历史层豁免有理，但 notes/README.md 是活动地图不是历史 Note，于是红 4 成了盲区。
- `count-free` 的禁用句式抓不到 pack README 的「14 个平台 peer 包」这类硬编码计数。

### 反面确认（健康面，打扫时别误伤）

- `pnpm verify` 全绿、`pnpm test` 154/0（2026-10-04 实跑）；35 个门禁名与 evaluation 台账经 `gate-ledger-sync` 逐一一致；抽查相对链接全部在盘（零死链）；种子逐字节同步（`pack-workspace-fresh` 名副其实）；doc-budgets 10 项登记无一超限（5 项顶格，时点数据）；vendor 22 子树 AGENTS.md 计数属实；pack README 部署四步与 _dist/ tarball 版本一致；design/10 的"bundle 行 ≠ run bundle"消歧节与 NODES.md 三要领是全仓术语治理最佳实践。

### 未决（四问开放点）

- **该不该**：主体已裁——2026-10-04 用户裁定「发现的都要修」。残余开放：黄项中的段落墙重排、手册叙事迁移（均改**模型可见注入面**，keyless 只证结构不证行为）是否入本轮——倾向暂缓、单独立卡，避免一次变更同时动契约句与叙事。
- **次序**：红先 → 布局与门禁 → 卫生与黄项（每步 verify 守门）。
- **放弃候选**：gate-ledger-sync 断言文本抽查机械化（散文对账无便宜判据，假牙齿风险）；D18 消歧改写（复核合规，不改）。
- **是否触发重审**：pin-agreement 扩围属门禁改动，按 writing-a-gate 规矩带反证；不涉 vendor 换 pin。

## 候选与取舍

- **候选 A（一卡全修）**：七红 + 布局补账 + 门禁盲区 + 卫生（.pi）+ 低风险黄项一次收口；段落墙/叙事迁移按未决节暂缓。代价：单条目面宽（文档 + 门禁 + 卫生三面），反证义务重（pin-agreement 扩围须带"注入旧 tag → 红 → 还原 → 绿"实录）。
- **候选 B（拆两条目）**：红修复一条；降噪 + 布局处置 + 门禁扩围一条。代价：两次收尾与两次入口链程序开销；收益：P0 不被大面拖住。
- **候选 C（最小 diff）**：只修红，布局不补账、改声称——§布局头加一行"骨架图；scripts 全档 = guides/60 §2、run 面细节 = research-workspace/AGENTS.md、_backlog 细构 = _backlog/README"。代价：`src/`、NODES 等重项仍不在地图；收益：避开顶格预算的升顶程序。
- **输掉的方案**：布局全量枚举 22 条补齐——doc-budgets 顶格（132/132）必然升顶，且"全量清单"已两次腐烂（本次 22 条 + 上次 C7 清单漂移先例），证明全量枚举不可维护；gate-ledger-sync 文本抽查机械化——无便宜判据，先红后绿的假绿风险大于收益；全仓降噪重排（改 note 位置、重写手册叙事）——收益低于成本，且正撞"docs 只写 now、notes 是时间层"的分层。

## 毕业门

- **该做（已裁）**：2026-10-04 用户过卡裁定全修（候选 A + 暂缓项单列）→ 立队列条目；验收 = 每红一修一验（verify + tests 绿），布局处置同 diff 登记（升顶须登记理由），门禁扩围带反证实录，涉面子证据如实分列。
- **待触发**：暂缓项（段落墙重排、手册叙事迁移、evaluation 反证列瘦身）若本轮不收，另立卡并写明触发（下一场 run 验收前后）。
- **否决条件**：若执行中复核发现某"红"实为设计意图，该条降黄并在"已知"节改判——本卡所有结论以盘上复核为准，不以审计方转述为准（本条已在卡质量审查轮对红 1、红 8 触发过一次，机制有效）。
