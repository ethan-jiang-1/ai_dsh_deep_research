# notes/ 存量体检：72 篇 implemented Note 的三结局判定（2026-10-08）

> 服务 = [queue §队列 ① Note 存量体检](../queue.md)（已毕业）｜RFC =
> [2026-10-08-notes-stocktake](../../notes/implemented/2026-10-08-notes-stocktake.md)。
> 本材料**只做体检、不动 notes 树**（`git status --short notes/` 在本轮体检期间为空）。

## 一句话结论

**这次体检没能给出可执行的归档名单——因为"该不该归档"这个判据本身在本仓不可靠。
两轮独立判定、同一份 72 篇、同一份 archived/README.md 进门条件，得出的名单几乎不相交：
宽口径判 72/72 全留活跃，严格口径判 23 篇可归档，而对抗证伪把严格口径的归档判定
8/8 全部打回。真结论是"判据不可用"，不是"某一份名单对"。**

## 触发：本仓自己的重估义务到期

链条（不是"漏做"，是"入口到齐、重估没做"）：

1. [notes/README.md:91](../../notes/README.md) 自述 class 层引入条件 =
   "`implemented/` 超过**约 50 篇**，**或检索开始靠猜**"；
2. 实际 = **72 篇**（体检当日 `ls notes/implemented/*.md` 去 README）；
3. [2026-09-24-note-lifecycle-absorption.md:36-37](../../notes/implemented/2026-09-24-note-lifecycle-absorption.md)
   当年否决 class 层，但**登记了重估入口**；
4. 该入口 2026-09-24 随条目毕业成 `docs/discipline-map.md`——**重估本身从未执行**。

## 硬数据

| 项 | 值 | 命令 |
|---|---|---|
| implemented 篇数 | **72** | `ls notes/implemented/*.md \| grep -v README \| wc -l` |
| 自述阈值 | 约 50 | [notes/README.md:91](../../notes/README.md) |
| archived 篇数 | 27 | `ls notes/archived/*.md \| grep -v README \| wc -l` |
| archived 冻结日期 | **23 篇 = 2026-09-27，4 篇 = 2026-09-28**，此后**零归档** | `rg -o "归档：\d{4}-\d{2}-\d{2}" notes/archived/*.md` |
| proposal/ 在飞 | 3 | 队列行为证 |
| rejected / postmortem | 8 / 1 | — |

**归档机制上次被行使是 2026-09-28，此后 10 天零归档。**这本身就是信号：要么 72 篇真的
全部仍有决策价值（可疑），要么归档这条路在实践中已经不通（详见 §根因）。

## 检索可分辨性（阈值的第二半，比篇数更该看）

`notes/README.md:91` 的条件是**析取**："超过约 50 篇 **或** 检索开始靠猜"。前半满足；
**后半才是引入 class 层的真实理由**，所以直接量它：

- 主题家族（去掉日期后的首个主题词分组）：72 篇 → **61 个家族**，51 个是单篇家族；
- 同家族 ≥3 篇的家族只有 **1 个**（`dsh-plugin*` 三篇）；
- 文件名主题词 Jaccard ≥0.34 的篇对：**8 对**，其中最高 1.0
  （`project-navigability` × `project-navigability-phase1`）。

**判读**：72 篇分布在 61 个家族里，**"找一篇"不靠猜**——文件名足以分辨。
按阈值本意，**class 层的引入条件并未真正满足**；满足的只是"篇数 > 50"这个代理指标。
这与参考卷 `01 §6` 的口径一致：分层按**检索/所有权**需要，不按篇数凑。

⚠️ 但这是**本报告的判断，不是机械结论**——见 §根因：判据轴无可执行面。

## 两轮判定：同口径、不同结果（本次体检最重要的产出）

同一份 72 篇、同一份 `archived/README.md` 进门条件，两次独立分类：

| 口径 | leave | archive | consolidate |
|---|---|---|---|
| 第一轮·**宽口径**（"负知识在身即留活跃"） | **72** | 0 | 0 |
| 第二轮·**严格口径**（"机制若消失，哪次具体未来变更会变差"，答不出即 archive） | 35 | 23 | 1 |
| 第三轮·**对抗证伪**（逐篇打开承接文件，专找假承接/未兑现承诺/唯一理由载体） | 严格口径的 archive **8/8 全部被打回 leave** | — | — |

**三轮的唯一共同点 = 宽口径的"全留"被两轮独立证否。**
第一轮 12 篇抽样细读，严格口径就把其中 5 篇改判 archive——**抽样偏老偏冷门，正是宽口径
系统性偏宽的证明**（5 篇 archive 全是 09-24～09-27，leave 多为 09-28）。

### 严格口径的 archive 名单为什么不能直接用

对抗证伪要求"打开承接文件、确认里面写着该 Note **独有**的理由（为什么选它 / 放弃了
什么 / 哪条非显然陷阱），而不只是结论形状"，结果 8/8 全部找出反例，四类：

1. **未兑现承诺（硬豁免）**——[human-gate-acceptance](../../notes/implemented/2026-09-26-human-gate-acceptance.md)
   正文自写"**复查口常开**……结论补记本 Note"，即它自己声明未来还会被改 → 不能冻结；
   [living-verification-hook](../../notes/implemented/2026-10-07-living-verification-hook.md)
   自留"低卡数据点入候选 A 标定池…**待候选 A 复核**"。
2. **假承接**——[acceptance-criteria](../../notes/implemented/2026-10-06-acceptance-criteria.md)：
   `NODES.md` / skill / `acceptance-check.mjs` 只留"UNVERIFIED 结论形状"，而本篇独有
   "判据是 model-supplied 不可信通道数据须框定"等理由全仓无第二处。
3. **被现行面当正本引用**——[r1-scaffold](../../notes/implemented/2026-09-24-r1-scaffold.md)
   被 `docs/evaluation.md` 门禁登记表引为红证出处（该表由 `gate-ledger-sync` 机械对账）；
   [agent-ready-absorption](../../notes/implemented/2026-09-25-agent-ready-absorption.md)
   被 `evaluation.md` 引用 10 次。
4. **判据悬空**——[note-lifecycle-absorption](../../notes/implemented/2026-09-24-note-lifecycle-absorption.md)
   （class 层重估入口的正本）若归档，本次体检自己的判据就没有出处。

### 反向：严格口径也确实抓到了宽口径漏掉的真东西

不是"严格口径全错"。它至少实证了宽口径的系统性偏宽，并给出两篇**经过承接核实**的
archive 候选，两处承接主张我都手工复核过：

- [hitl-docking-polish](../../notes/implemented/2026-09-28-hitl-docking-polish.md)
  → [guides/61:23-28](../../docs/guides/61-run-playbook.md) 确有 SSRF 守卫机理
  与代理变量配方全文（已 commit）；⚠️ 但该行末仍链回本 Note 作"实证与 vendor 依据"
  ——**这是"承接了，但没有完全承接"的边界个案**，不是干净的 archive。
- [node-topology-procedure](../../notes/implemented/2026-09-28-node-topology-procedure.md)
  → [changing-node-topology SKILL](../../.agents/skills/changing-node-topology/SKILL.md)
  确有六处同步清单 + 四条已知坑（`rg` 命中）；此篇最接近干净 archive。

**两篇都是边界个案，不足以支撑"批量归档 23 篇"。**按
[archived/README §进门条件](../../notes/archived/README.md)"边界个案用判断并留档"，
本报告把它们列为**待裁定**，不在本轮执行归档。

## 根因：判据轴没有可执行面

`archived/README.md` 的进门条件 2（"不再可能指导未来变更"）是**语义判断**，而：

- `scripts/verify/verify.mjs` 里 `archived` 只出现 **2 次，且均为注释**（900 行、981 行），
  **没有任何门禁检查归档判定**；
- 全仓无"该 Note 是否仍被承载体消费"的对账命令；
- 因此归档与否**完全靠单轮人工判断**，而上面三轮实验证明：同一判据、同一语料，
  换个提问形状就得到几乎不相交的名单。

**这与本轮 SDLC 吸纳的另外两个结论是同一种病**：
`docs/discipline-map.md` 的 `na` 行会静默腐烂（无重估触发器 → 已实证 10 处变假）、
`docs/design/30` 的内容可被替换成 `| x | y |` 而 verify 仍全绿（无内容面门禁）。
**共同形态 = "文档声明了某个判断义务，但没有任何面在履行或复核它"。**

## 下一步（不在本报告范围）

本报告按 RFC §范围界定 **只做体检、不动 notes 树、不产出 class 层决定**
（`git status --short notes/` 为空即证）。三条候选处置，各带前置：

1. **给归档判定补一层可复核面**（推荐先做）——例如"被引用的 Note 不得归档"的对账命令，
   或把进门条件 2 改写成可判定的问句形状（本报告 §严格口径的问法已可复用）。
   属 `writing-a-gate` 程序，需先想红。
2. **class 层暂不引入**——本报告的检索可分辨性数据显示文件名已够用（61 家族 / 72 篇）；
   真正缺的是 1 里的复核面，不是子目录。⚠️ 此为判断，非机械结论。
3. **两篇边界个案待用户/后续裁定**（hitl-docking-polish、node-topology-procedure），
   前提是 1 落地后能用同一判据复核。

## 方法诚实边界（必须保留）

- 三轮判定**全部是子代理读全文后的人工判断**，无可执行判据；三轮之间有 8/8 的分歧，
  **本报告不主张任何一份名单为准**；
- 72 篇的判定覆盖率：宽口径 72/72；严格口径 47/59 解析成功 + 12 篇由两个子代理补齐
  （其中 6 篇的口径被该代理事后自我收紧，已按收紧后记录）；
- 对抗证伪只抽了 8 篇 archive 判定（占 23 篇的 35%），**未全量证伪**——"8/8 被打回"
  是抽样结果，不能推广为"23 篇全不成立"；
- 本报告未修改任何 `notes/` 下文件，未执行任何归档动作。
