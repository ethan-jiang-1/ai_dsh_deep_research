# rerun-loop-live：证据扩张 rerun 的活体验证（探索环第二程）——已交付

> 状态：implemented

归宿：roadmap §队列「rerun-loop-live」（2026-09-28 用户直派并当日交付，已离队）。
取代检查：[cockpit-flow-face](../archived/2026-09-28-cockpit-flow-face.md)（implemented，同日）拥有轨道/
回边的构成决定——本条不改构成，只做活体验证与走查续篇，未取代。

## 决定

在**已交付的真实 bundle** 上做一次证据扩张 rerun（D17 正宗形态：同 bundle final/ 下一版），
活体验证驾驶舱回边/版本/走查。预算（防跑飞）：rerun ≤ 2、零新开题——**动用 1 次、备 1 次
未动**；真人档窗口保留（发起人未在场，代理代答照旧标注）。

**rerun 端到端实录**（载体 = `archive/drt_selfhosted-ai-gateway`，按其 final/v1.md 末节的
v2 优先项四条拟指令，不发明新范围）：

1. **跨会话恢复**：新 lead 会话续跑（判据④ 同款，只凭 bundle 文件重建上下文）；lead 记账
   "不重开 HITL1"（方向契约未变，范围逐项锁定）+ bundle 位置原地于 archive（不擅自移动）；
2. **回挖掘补证**：lead 组队（spawn ×3 + 任务板 ×7），新增 evidence 卡 20 张
   （66 → 86：发版计数三态、贡献者数探针、onthebench 第三方实测六格、Helicone 第二源、
   t1-31 冲突登记卡等）；
3. **critic 两幕真拦截**：review.md §10 判 v2 **FAIL（CRITICAL=1）**（代理通道伪影包装的
   "更精确数字"被对抗复核逐条反驳、整体撤回并留痕）→ 处置改写 → **§11 重判 PASS
   （CRITICAL = 0）**——对抗审查在 rerun 中真实咬合；
4. **交付**：findings 增补 → final/v2 落盘 + final/ 版本索引登记 → present 声明 →
   evidence-audit **CRITICAL = 0**（86 卡、final 链 186/186 零悬空；MAJOR/INFO 记账
   audit.md）；
5. **驾驶舱活体证据**：回边点亮"↻ … 已落 v2"、交付节点旁 v2（08-v2-landed.png）；resume
   会话开局即显全 passed 轨道 + 回边（07-rerun-start.png——read 绑定非挂起时渐进面正常
   显示，cockpit-flow-face G4 修复的 resume 语义实测正确）；rerun 期间 cursor 钉在交付、
   进行中信号由活动流承载（与预期一致）。

**G8 headline 发现（本条最重要的实测产物）——resume-rerun 纪律塌陷**：v2 首次落盘时
**HITL2 与 present 双缺席**（全量日志复核 ask=0/present=0），且 journal 曾预写"本次
present 声明"——**散文宣称先于工具事实**。watch-run 的 ⚠ 偏差旗捕获；处置 = 操作侧窄指令
补审（只许呈卡 + 补 present，不许其他）→ HITL2 补行 + 代答追认（代理模拟标注）→ lead 补记
偏差（实质影响分析：present 缺席即成品未声明，不构成未经审阅即交付，但纪律缺了停靠点）。
**候选后续（未立项，待取题）**：① synthesis/rerun 相关 skill 补"rerun 交付同样过 HITL2 +
present"锚定（模型可见面）；② watch-run 增 ask-absent 偏差旗；③ 审计层查版本交付前的
ask 在场。

走查其余记录：G9 证据计数 30s 时滞（eventual-correct，非 cap——vendor maxEntries 默认
2000，实时重探 86 ✓）；07 截图 cursor 落点误读被 DOM 探针证伪（走查结论以探针为准）。
全部留档 `dev/smoke-workspace/observations/`（07/08 + gap-list.md）。

## 输掉的方案

- **新开一场 run 在 HITL2 拍非推荐"补研究"**：代价一场完整 run 且要给代答工具加 pick
  覆盖——已有真实 bundle 自带 v2 优先项，直接在其上 rerun 更便宜更正宗（D17 同形）——降为
  备选第二程（未动用）；
- **等真人档再验**：真人档是窗口不是门——拒；
- **rerun 期间给轨道加"进行中"指示**：走查实测确认现有表达（回边 + 活动流）可用、cursor
  钉住语义如预期——指示器不做，候选条目待实证积累；
- **偏差静默处置（私下把 present 补上不记档）**：违反显性化不隐去——补审 + 偏差记账 +
  追认标注，全程留痕。

## 验证

- **rerun 端到端**：resume → 补证（66→86 卡）→ critic 两幕（FAIL→PASS）→ final/v2 +
  版本登记 → present（补行）→ evidence-audit **CRITICAL = 0**；
- **驾驶舱**：回边"已落 v2" + 交付节点 v2 实证照；resume 开局轨道正确（DOM 探针取 chip
  底色核验：交付 amber current、余者绿 done）；
- **偏差处置**：HITL2 补行（ask=1）+ present 补行（present=1）后全量日志复核确认；
  偏差与追认在 bundle 的 question.md §Decisions 与 journal.md 如实记账（含代理模拟标注）；
- **L0**：`pnpm verify` 全绿——本条为纯验证程，无折算/客户端改动（RFC 验收 3 的收口条款）；
  单测 96/96 维持。

## Consequences

- `drt_selfhosted-ai-gateway` 现为 v2（86 卡）：后续再验 in-run 回路（HITL2 拍"补研究"）需
  新场 run（预算备 1 次还在）——由发起人定；
- G8 候后续三项 + "rerun 进行中指示"候选，均在 gap-list 留档待取题；
- 走查件 `dev/smoke-workspace/observe-cockpit.mjs`、`probe-rail.mjs`（抛弃型）与截图
  07/08 留档；hitl-answer 的非推荐项 pick 覆盖仍未建（YAGNI 维持）。
