---
status: 修复落地
severity: P2
opened: 2026-10-18
---

# BUG-041：官方恢复路径（`run-kickoff --session` 自由文本关挂起）不落任何 HITL 记账

> 状态：**修复落地**（修法已进树 + 单测/同钉反证；**端到端绿证待跑**——需一场真挂起 + kickoff 关单）。
> 从 [BUG-040](../_archived/fixed_bugs/BUG-040-terminal-readiness-two-copies-drift.md) 闭环时带出：
> readiness 判据修正后，`drt_cambricon-commercial-sustainability` 的门②/门③ 由 N/A 转**如实判红**。

## 症状与根因

那场 bundle 的 §Decisions 有 HITL1 拍板行，**没有任何 HITL2 行** → 门③（交付拍板行）与门②（present
声明）判红。查下来**判红是对的**，缺的是记账：

- 当时代答链路故障（BUG-035 的"侧栏找不到会话"），恢复手段用的是**仓里官方推荐的那条**——
  `node dev/run-kickoff.mjs --session <id> --prompt "<文本>"`（发一条自由文本关闭挂起）；
- 而 `dev/run-kickoff.mjs` **完全没有 provenance 记账**（`appendProvenance` 只在 `dev/hitl-answer.mjs`
  里被调用）→ 谁在何时答的、答了什么，**盘侧无痕**；
- 后果：交付段的记账链断在"外力关单"这一步，门②/门③ 如实判红，复盘只能靠人回忆。

## 修法

1. `scripts/lib/hitl-provenance.mjs`：新增纯函数 `closingProvenanceRow({cardKey, text, date})`——按代驱
   记账纪律产出 §Decisions 行（写明**卡名**（交付审阅／计划确认 HITL1）+ **代理模拟**标记 + 文本摘录），
   措辞与门侧 `isHitl2Row` **同钉**；新增 `appendDecisionsRow({bundle, row, journalNote})`（question.md +
   journal.md 双写，bundle/契约件缺席即 throw，与 `appendProvenance` 同契约）。
2. `dev/run-kickoff.mjs`：发送前判"该会话是否有挂起 + 挂起是哪张卡 + 归属哪个 bundle"（挂起 = 会话日志
   `foldHitlPending`；卡种 = 末位 ask 的问题头经 `isDeliveryReviewCard`；归属 = `attributionBundleOf`（同
   BUG-020 正修的判据），三位置查找 bundle）→ 发送成功后落行；归属不唯一/无挂起 → 静默跳过（不猜、不误归）。

## 修复判据

1. **同钉（keyless，已过）**：`closingProvenanceRow({cardKey:'anchor-2', …})` 的产出**必须**被门的
   `isHitl2Row` 认作拍板行（否则记账白落）；HITL1 卡的产出**不得**被认成 HITL2 拍板行（不越权）。
2. **反证（已做）**：两例先看红（函数不存在时整文件红）→ 实现后 530/530 绿。
3. **端到端（待跑）**：对一场真挂起会话跑 `run-kickoff --session <id> --prompt "<关单文本>"` →
   该 bundle §Decisions 出现对应行、journal 出现备注，且门③/门② 对该 bundle 转绿（或至少门③ 认行）。

## 端到端绿证尝试记录（2026-10-18，两跑 + 一次修正）

1. **第 1 跑**：题面是"一句话回答今天几号"→ Lead 走 **quick_factual 直答**（不发卡、不建 bundle）。
   → 结论：绿证题面必须选**会发卡的研究型题**（这一跑不算失败，是题面选错）。
2. **第 2 跑**（研究型题面）：kickoff 后 ~4 分钟无卡 → 查下来那条通道被我脚本的 kill 弄成**半死**
   （能收 RPC、后端不工作）。→ 教训：验证通道要用**独立托管**（nohup/后台作业），别让脚本自己 kill。
3. **第 3 跑**（新通道 3086，独立托管）：**第一次轮询就真有挂起**（盘侧文本 `"name":"ask_user_question"` 命中）
   → 用官方恢复路径关单 → **没落账**，且工具**没打印记账行**。逐层查下来是**我接线里的两个缺陷**：
   - **`readSessionEvents` 返回 `{readable, events}` 不是数组**，我把对象喂给了 `foldHitlPending` →
     抛错 → 被我写的 `catch { return null }` **吞掉**（静默不记账，违反 fail-loud）。**已修**：按契约取
     `.events`，并把跳过/异常原因**打出来**（同形态坑本轮第三次咬我，已在代码注释里钉住）。
   - 修后真数据核对（同一条真挂起过的会话）：`pending=true`、`cardKey=anchor-1` ✓，但 `slug=null` ——
     属**设计使然**（`attributionBundleOf` = "仅写命中归属；读命中一律延迟"；HITL1 阶段该会话还没写过
     任何 bundle）→ **HITL1 关单本就不该落账**（要落就得等人工补记）。
   → 由此确认：**本卡的标的应限定在 HITL2（交付段）关单**——那时 bundle 必然存在且有写命中，归属可解析。
4. **仍未做（下一轮）**：一场跑到交付段的 run（真 HITL2 卡）→ 用官方恢复路径关单 → 断言
   §Decisions 出现记账行、journal 出现备注、门③ 认该行（`isHitl2Row` = true）。这需要 ~30 分钟真模型，
   本轮上下文已耗尽，**不冒充已验**。

## 端到端现场结果（2026-10-18 深夜，第 4 跑 · 驱动器订阅式抓到卡）

- **抓卡成功**：独立托管通道 3087 + 驱动器（60s 轮询）在第 26 轮判定 **`isDelivery=true`（交付审阅卡在场）**，
  HITL1 已由 `hitl-answer` 结构化代答（`盘侧复核通过`）✓ —— 即"受测路径确实被走到"。
- **记账仍未落**：`question.md` 无 `run-kickoff 自由文本` 行、`journal.md` 无备注、`isHitl2Row` 无对象，
  且 **`run-kickoff` 什么也没打印**（既无"已落"，也无"跳过/异常"）。
- **由此定位到我的第二个缺陷**：跳过分支里除 `catch` 与"日志不在"外**仍是静默 `return null`**
  （无挂起 / 归属未定 / bundle 找不到三处）。**已修**：三处补齐各自原因（fail-loud），下一跑即可一眼定位。
- **下一跑（收口用）**：同一姿势（订阅式抓交付卡 → 官方恢复路径关单）→ 看打印出的原因分支 →
  若为"归属未定"则该场确无 write 命中（按纪律延迟补记，属如实行为，需人工补记）；若为其它分支则继续修。

## 第 5 跑现场（2026-10-18 深夜）与**工具设计缺陷**

- 驱动器跑到 60 分钟窗口仍未收（阻塞在 `spawnSync` 的长调用里，已人工终止）→ **受测路径未被走到**；
- 但盘侧给出一个**正面事实**：该场交付卡的记录是
  `HITL 代答 provenance（hitl-answer 自动落账）：Q1「交付审阅」→「按现稿定稿 (Recommended)」`
  —— 即**结构化代答路径 + 我这轮加的交付闸一起工作正常**（readiness PASS 时放行并落账 ✓）；
- **由此暴露驱动器的设计缺陷（我的，不是产品的）**：驱动器用"选项标签含定稿+补研究/修订"来判交付卡
  （`isDeliveryReviewCard`），而 HITL1 计划卡的选项措辞也可能撞上 → 它可能把**交付卡当计划卡**、
  于是先走了 `hitl-answer` 分支，受测的恢复路径永远轮不到。
  **修法（下一跑用）**：判交付卡改用**卡头/问题文本**（如含「交付审阅」/「审查未决项」），
  并在驱动里对"检测到交付卡"与"调 hitl-answer"两条分支互斥加硬断言（命中交付卡时**禁止**调 hitl-answer）。

## 第 6/7 跑现场（2026-10-18 后半夜）与**取证教训**

- **第 6 跑**：驱动器抓到交付卡（第 20 轮）→ 走受测路径关单 → 仍无记账行。随后逐层排查发现
  **`run-kickoff` 有两个 `session/prompt` 站点（新建 / 续跑）**，我的记账接线一度落在**新建分支**，
  而恢复路径走**续跑分支** → 整块记账代码从未执行（所以连"跳过原因"都没有）。**已修**（接线挪到续跑分支）。
- **第 7 跑（改用现场活的交付卡，省去整场 run）**：现场确有 pending 交付卡（`header: 交付审阅` ✓，
  判据 = 盘侧 ask 参数含「交付审阅/定稿」）→ 直接对那条会话调受测路径 → **工具打印了跳过/原因**，
  但被我自己的 `2>&1 | tail -3` **截断丢掉**（**取证教训：查这类输出必须落文件或 grep，不能 tail 截断**）。
  → 因截断而**未能读到分支原因**，绿证仍差这最后一步；卡内已写明：下一跑把输出**落文件后 grep 记账**，
  一次即可定性（若为「归属未定」则该场确无 write 命中，属既定延迟补记纪律，应改绑定判据或人工补记）。

## 缺陷⑤（最后一层，2026-10-18 后半夜）与判定链核对

- **第 6 跑的输出交出真因**（fail-loud 生效）：`记账判定异常（如实报告，不静默）——ReferenceError:
  researchWorkspaceGroup is not defined` —— 我那条 import 没插进去，函数里用了未导入的符号。
  **已修**（补进动态导入）。至此链路上共 5 个缺陷全部修完：
  ① 静默 `catch` ② `readSessionEvents` 形态（对象 vs 数组）③ 跳过分支静默 ④ 接线站点错位（新建 vs 续跑）
  ⑤ 符号未导入。
- **判定链真数据核对**（复刻接线每一步，对真会话 `session-0398fa1c…`）：
  `卡种=anchor-2(交付) ✓ · 归属=anthropic-claude-release-line-timeline ✓ · bundle 定位=命中 ✓` ——
  即**落账三要素齐**；此刻 `挂起=false`（该卡已过 600s 放行窗），故此时关单会如实打印"跳过——无挂起"。
- **仍差的一步（唯一）**：在**卡的存活窗内**（真挂起时）执行一次关单，看到
  `关闭挂起的记账行已落 §Decisions` 打印 + 行/备注/`isHitl2Row` 三项为真。取证要求（教训）：
  输出**落文件后 grep**，不要 `| tail -N`（本轮因此丢过一次关键行）。

## 边界（写清楚免得被误用）

- **不追改历史 bundle**：`drt_cambricon-commercial-sustainability` 的红是**当时事实的如实记录**，
  禁止手改它的 §Decisions 去"修绿"（append-only 记录 + 文件即真相）；
- 本修法只保证**今后**走这条恢复路径会留痕；自由文本关单仍**不等价于**结构化代答（内容取舍责任在操作者）。
