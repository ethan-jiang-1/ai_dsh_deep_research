# 研究类型覆盖（类型固化 + 两场 run 实测）

> 状态：implemented

来源：首个完整 run（`drt_cn-us-cpu-gap`）只覆盖一种研究形态、且 HITL2 是代理模拟——本条目要用
真实问题覆盖其余类型并闭掉此前延期的验收。**执行时用户不在场**：题面方向由用户给出、具体问题由
代理判断，两个交互点按仓规**代理模拟**并显式标注。因此本条目只闭"机器可判"的部分，"要人在场"
的部分**转出**为独立条目（[真人档验收](../implemented/2026-09-26-human-gate-acceptance.md)）。

## 问题（提案时基线）

首个完整 run 只覆盖一种研究形态；lead persona 的 HITL1 三型（快速事实核查 / 探索性全景 /
主张验证）另两型未经实战；首场 HITL2 是代理模拟——真实用户拍板的全流程没跑过；观察面的真人档
验收也需要一场活 run。

## 决定（已交付）

用**两场真实 run**覆盖类型，并把机器可判的验收一次闭掉：

| run | 类型 | 题面 | 交付 | 证据审计 |
|---|---|---|---|---|
| `research-workspace/archive/drt_cn-llm-deep-research` | **claim_verification** | 国产大模型"深度研究"能力是否追平国际一线 | `final.md` 402 行 · 26 张证据卡 · critic 三轮 FAIL→**PASS** | URL 溯源 93/93 · final 链 118/118 · **CRITICAL 0** |
| `research-workspace/archive/drt_cn-llm-infra` | exploratory_map | 国内 LLM infra 现状与瓶颈 | `final.md` 628 行 · 46 张证据卡 · critic **PASS** | URL 溯源 85/88 · final 链 128/128 · **CRITICAL 0** |

（bundle 在 gitignored 运行区，故此处以反引号记路径、不做链接——链到运行区会让新 clone 的
`md-links` 红。）

- **类型固化**：首场是 exploratory_map，本轮新增 **claim_verification** 实测（"类型 ≠ 首场"成立）；
  HITL1 三型里"快速事实核查"仍未实战（最薄路径，未单独跑，随真人档条目一并验）。
- **两点纪律与中断恢复**：两场各**恰好 2 次** `ask_user_question`（HITL1 + HITL2）、单 turn 静默
  98/80 步；另做**判据④ 实测**——新开 lead 会话只给"继续 `<slug>`"，纯凭 bundle 文件答出研究问题/
  类型/口径、当前状态、critic 结论、缺口与下一步（它还主动指出 `audit.md` 是过期快照）。
- **证据契约首次真正生效**：run 1 26/26、run 2 45/46 张证据卡带完整 frontmatter（首场 run 是
  **0/31**——根因是会话 cwd 不在研究工作区、手册未注入；`workspaceId` 形态修好后正常）。
- **顺手取证两条搁置项**：见 §验收怎么闭的 第 5 行——两条复活条件**仍未满足**，维持搁置。

## 输掉的方案

- **自造题目刷覆盖**：否决——真实问题才有真压力；本轮题面由用户给方向、代理选具体问题。
- **等 GUI 全好才跑**：否决——GUI 前 run 也有效；本轮证明机器可判部分不依赖界面打磨。
- **把代理模拟当真人档闭掉**：否决——机械证据只证管道通，证不了"人是否用得下去"；转出为独立条目。
- **把两场 run 的 bundle 入库当交付物**：本轮未做——运行区契约就是盘上（`research-workspace/drt_*`
  被 gitignore）；要不要另立留证方式，是**另一个决策**，不在本条目里顺手改。

## 验收怎么闭的（逐条）

| # | 判据 | 怎么验的 | 结果 |
|---|---|---|---|
| 1 | 类型覆盖（≥1 场，类型 ≠ 首场） | `drt_cn-llm-deep-research` 实跑 claim_verification | **类型部分闭**；"真人 HITL"转出 |
| 2 | L4 四判据 | ① 报告+来源清单（90 / 95 条 `[来源:]`）② 抽查回溯（final 链 118/118、128/128）③ 两点纪律（每场恰好 2 次 ask、单 turn）④ 中断恢复（判据④ 实测 PASS） | **全绿** |
| 3 | 证据可靠性 run 级 | 两个 bundle 均有 `audit.md` 且 **CRITICAL 0** | **闭** |
| 4 | 交互卡片与观察面真人档 | 机械部分：三问选项卡（推荐位置首）/ 分页 / 提交 / 横幅渲染全部跑通；**目验部分**（人是否看得懂） | **转出**给[真人档验收](../implemented/2026-09-26-human-gate-acceptance.md) |
| 5 | 顺手取证 synthesizer / floor | 两场 run：**无**综合过载；critic 首轮抓 1 / 5 条 CRITICAL 且**全部闭合**（散文审查有效、无质量滑坡） | 两条复活条件**仍未满足**，维持搁置 |

## 实施记录

- 两场 run 的过程证据在各自 bundle 的 `journal.md` / `review.md` / `audit.md`；环路侧暴露并修掉的
  六处缺陷见 [run-loop-hardening](../archived/2026-09-26-run-loop-hardening.md)（其中"没有 headless HITL 代答
  路径"是本条目能跑完的前提——`dev/hitl-answer.mjs` 即为此新建）。
- HITL 的代理模拟性质已在两个 bundle 的 `question.md` §Decisions 与 `journal.md` 显式声明，不隐去。
- 遗留（不属本条）：两场 lead 把日期写成 `2026-10-02`（系统日期 2026-09-26，模型日期漂移，未改写）；
  run 1 正文自述证据档数有 23/26/27 三个说法（自带勘误），盘上实为 26 个文件。
