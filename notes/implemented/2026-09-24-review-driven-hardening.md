# 基石加固轮：review 漂移修补 + 提交门禁 + 入口链/预算门禁（用户 steer，非队列条目）

> 状态：implemented

> 历史注记（2026-10-30）：本篇是 2026-09-24 基石加固轮记录；`entry-budget` 现名 `doc-budgets`，
> `research/` 已于 2026-09-27 清并，roadmap ▶ 队列已由 D20 退役。现行门禁与入口链见
> [evaluation §L0](../../docs/evaluation.md) 与 [AGENTS](../../AGENTS.md)。

> 来源：外部 review（用户委托的基石评估）指出 3 处语义漂移 + §四改进建议 P0–P2，用户
> 指令"修补好 + 帮着调一调"。落库 = d5a9113（漂移修补）/ 593b97f（门禁三连）/ 1446e5c
> （pre-commit 钩子）+ 本 commit（探针修正与收尾 Note）。本 Note = 全轮收尾记录。

## 决定（8 项）

1. **roadmap ▶ 行 RFC 直链回位**（review P0）：四份 RFC stem 改 Markdown 直链（link text =
   全 stem，proposal-scheduled 的 stem 在场不破），活跃件 m2-run-mechanics 单独标注——
   fresh agent 不再需要从四份里推断哪份是活跃 RFC（探针复证：定位 = 纯指针跟随零检索）。
   直链纪律源自 agent-friendly-polish 轮，曾在 M2 四件 RFC 入队时回退为纯文本 stem。探针
   复核后追加微调："已落地"改"三件已落地"，消除把活跃件也读成已落地的字面歧义。
2. **D 号命名空间消歧**（一处事实一个家）：规则正本 = 00-index §决策台账头注一行（本表
   D 号 = 本仓决策；引用他仓必须带仓前缀，company D15/D18/D23 = `ai_dsh_company` 台账；
   裸 D 号一律指本表）。活文档 11 处裸 D18 补 company 前缀：AGENTS 命令表、00-index D16
   行、design/10 ×2、cordis.patch.yml、三 preset 注释、roadmap、team-preflight ×2。
   notes/ 时间层不追改（R 轮号清扫同款边界）。
3. **notes 读取触发补全**：AGENTS.md §notes 读取触发枚举补 `rejected/`（否决防复犯）与
   `research/`（机制考古报告）——research/ 两份考古报告是 README 所称"设计来源"，缺
   枚举时做方法论改动的 agent 若不读 README 即错过。
4. **布局树补真**：scripts/ 补 lib/roles.mjs、tests/ 补 fixtures/、dev/ 补 hooks/（本轮
   新成员入图，防"盘上有图上无"——入口链审计先例的反向）。
5. **proposal-scheduled 收紧 + 欠账清偿**：归宿判定从全文件子串匹配收紧到 §队列节
   （搁置池/头注不算归宿）。本轮触碰该门禁，按登记表"下次改本门禁时补"规则清偿
   r1-scaffold 欠账：无归宿 / 仅搁置池双形态注入红→还原绿。
6. **新门禁 entry-chain**（队列 #7 的最小版落地，时间无关部分）：入口链存在性投影——
   成员文件在场（AGENTS/00-index/roadmap/proposed//guides60/evaluation/design10-30/
   guides61；md-links 不检的反引号指针盲区）+ roadmap §队列 恰一个 ▶（D11 唯一"当前"
   指针的存在性与唯一性）。成员缺席 / ▶ 删除 / ▶ 复制三形态注入红→还原绿。语义版
   （真模型"现在"问答）仍归队列 #7 不动。
7. **新门禁 entry-budget**（vendor verify-doc-budgets 裁剪版）：AGENTS.md ≤145 行、
   README.md ≤30 行——只防常驻入口膨胀（纪律表全量枚举替换在即 = 膨胀风险最高点）；
   台账/指南是生长面不设顶（vendor "review governs unbudgeted tiers" 同款）。超顶处置序
   = 下放（指针化）> 压缩 > 升顶（升顶须 D 号）。两文件各注入超顶红→还原绿。门禁
   11→13，gate-ledger-sync 双向对账。
8. **pre-commit 提交门禁**（review P1）："收尾必跑"从纪律变机制——`dev/hooks/pre-commit`
   （verify+tests 红灯即拦 commit；测试输出重定向 dev/smoke-workspace/，遵守工具态纪律）；
   激活 = source dev/env.sh 块③（幂等 `git config core.hooksPath dev/hooks`，零 npm 依赖）；
   应急 `--no-verify` 须 commit message 说明。教训实证 = agent-friendly-polish 教训 4
   （红 commit 509a04b：管道吃 exit code 让红灯溜进历史）。

## 输掉的方案

- **roadmap 队列行 ≤3 行机械化**：预实现扫描发现 6/8 条目 4–6 行超标——头注"每行 ≤3 行"
  （D12 行文）与现实漂移，此前两轮探针均未抓到（新发现，见遗留 2）。不擅自压缩（内容
  手术须条目级 RFC 承接）、不擅自改规则（D 号决策）、不以现实为准设 6 行顶（把违规定成
  合法），交用户拍板。
- **entry-budget 覆盖 00-index 与 guides/60**：生长面（台账随决策积累、指南随操作演进），
  设顶即假阳性源；预算只给常驻入口。
- **消歧行放 AGENTS.md 术语速查**：D 号的家 = 00-index 台账，规则随家走。
- **追改 notes/ 内裸 D18 与旧路径**：时间层按性质保留（R 轮号清扫先例）；guides/60 头注
  的 company 悬空路径例外——活文档指针必须真（探针发现，见下表）。
- **语义探针全量提前**：真模型"现在"问答的题库需要 run 实测派生（队列 #7 既有判断
  成立）；本轮只落时间无关的机械投影（entry-chain 门禁）。

## 实际跑过的验证

- 基线（改动前）：verify 11 门禁 + 20 tests 全绿（review 轮亲跑复现）；
- A/B/C 各 commit 前：verify + tests 全绿，且三个 commit 均经 pre-commit 钩子真实把关
  （钩子先于本轮 commit 落盘激活）；
- 红绿反证（guides/60 §6，全部注入→看红→还原→绿，亲跑）：
  - proposal-scheduled：无归宿（2099 假提案）/ stem 仅在搁置池节（文件尾追加）双形态红；
  - entry-chain：成员缺席（evaluation.md 暂移 dev/smoke-workspace/）/ ▶ 删除 / ▶ 复制
    三形态红（成员缺席形态伴生 md-links/gate-ledger-sync 红，主断言 entry-chain 在列）；
  - entry-budget：AGENTS.md +8 行（146>145）/ README +6 行（31>30）红；
  - pre-commit：scratch 死链 staged 后走真 commit 路径被拦（exit 1，verify 精确点名
    zz-probe.md 死链 + 钩子给出修法与应急路径）→ 清场直跑复绿；本轮四个 commit 全部
    经钩子落库 = 活体绿证；
- 门禁终态：13 门禁 + 20 tests 全绿（本 commit 提交前亲跑）；
- 入口链探针（语义版，docs/AGENTS 改动必跑——guides/60 §4）：零上下文 subagent 只读
  走链（禁脚本/git/改文件），7/7 时不变问答通过，要点见下节。

## 环境状态

- 纯 docs/门禁/钩子层改动，未动 preset 与包内容 → 按面选择表（60 §2）不触发 L1/L2/L3
  加跑；
- 本仓 git 已设 core.hooksPath=dev/hooks（env.sh 块③同款命令，幂等）；
- ▶ 条目「首个完整研究 run」仍挂起 HITL1，不受本轮影响。

## 探针记录（7 问要点 + 三处弱点处置）

问 1–5 全中：▶ 唯一当前指针定位无歧义；活跃 RFC 纯指针跟随；company D18 消歧规则被
找到并正确应用（探针另按规则链外一读 company 台账核到全文——规则显式指向参考仓）；
notes 五子目录检索面（含本轮补的 rejected//research/）全答出；pre-commit 定义/激活/
应急三问全中。问 6：走读 50+ 链接全部可解析，命令/档位/路径三轴零文件间矛盾，另抓出
三处弱点：

| 发现 | 处置 |
|---|---|
| 活跃 RFC 内部矛盾：m2-run-mechanics §开放问题 4 写"研究题已定 = DR 证据链题"，§暂停点记录却是芯片题已进正规通道（session-0fc52a87）；"岔口 C"全链无定义 | **不擅自动**——研究题目状态属内容层（用户域），遗留 1 交用户拍板 |
| guides/60 头注引用 company 仓 `notes/research/2026-09-23-dsh-inround-task-surface.md`——该文件已毕业到 company 仓 notes/implemented/（悬空反引号路径，md-links 不检） | 本 commit 修正：路径改 `notes/implemented/…` |
| roadmap ▶ 行"四份 RFC 全 approved（已落地…）"字面可把活跃件也包进"已落地" | 本 commit 修正：改"三件已落地"（决定 1 追加微调） |

问 7 总判：fresh agent 能零盲找开工；最不确定处 = 重启后以哪个研究题为准（即遗留 1）。

## 遗留（交用户拍板，非本轮欠账）

1. **活跃 RFC 的题目矛盾**（探针 Q6/Q7）：重启 run 前建议在 m2-run-mechanics §开放问题
   4 处加一行换题注记（岔口 C 切到芯片题的取舍），或拍板回 DR 证据链题——否则 fresh
   agent 无法从链上确定重启后答哪个题的 HITL1（答错方向 = 浪费一次完整 run）；
   **销账（D17，2026-09-24）**：正解不是拍板题目而是分层修正——题目本就不该进 RFC
   （问句预设了错误分层，撤回）；m2-run-mechanics 已去实例化，见
   [run-bundle Note](2026-09-24-run-bundle-drt-separation.md)。
2. **队列行规 ≤3 行 vs 现实 6/8 条目 4–6 行超标**：压缩 / 修订 D12 / 维持现状（去机械化）
   三选一；若压缩，条目 2–7 的细节须有承接家（RFC 或 Note）。
