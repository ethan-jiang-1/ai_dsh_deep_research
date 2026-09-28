# backlog-deliberation-space：`_backlog/` 推敲空间立层 + 规划面单一化（D19/D20）——已交付

> 状态：implemented

用户直派 2026-09-28（"company `_backlog` 的思想要借鉴过来"）；借鉴链 = `ai_deerflow_deep_research_v2`
→ company D31 → 本仓。当日四裁：根目录 / plans+bugs+_done 全三件 / 走正门 / plans 卡
`YYMMDD-slug` 日期编码。同日追加裁决（D20）：roadmap.md 退役、痕迹彻底清理——规划面单
入口，队列并入 `_backlog/`。取代检查：无同决定 owner（`research/` 2026-09-27 清并是不同
决定——完结调研的归宿，非未裁决思考的家）。

## 决定

1. **根目录 `_backlog/` = 推敲空间（D19）**：plans/（推敲卡，设计/分析/调研）+ bugs/
   （缺陷卡）+ `_done/`（归档：_closed_plans/ + _fixed_bugs/），六份 README 规矩手册自
   company 移植改写；规划面单入口（D20）后加次序半区 queue.md，目录 = 推敲 + 次序一个家分半区。
2. **红线（company D23 教训正面化）**：推敲卡只载判断材料（问题/证据/候选/取舍），不载
   次序与授权——次序唯一 = [_backlog/queue.md](../../_backlog/queue.md) §队列，授权唯一 =
   [guides/60](../../docs/guides/60-dev-loop.md)；推敲卡不是任务，入口链结构不变（第 3 步
   改锚 queue.md）。
3. **半区互斥（D20 增）**：queue.md 只载次序与归宿、零判断内容；plans/ 卡零调度——互越
   界即回归 D23 病（第二个队列）。
4. **毕业四门**：批准 → RFC 落 notes/proposed/ + queue.md §队列行（小修可不设 RFC，直接
   进队列小条目——本仓无磨清单，有压力再借）；待触发 → queue.md §搁置池行；证伪/否决 →
   rejected/ 或 owner Note「输掉的方案」；消化 → 并入 owner 记落点。产出 = 一个毕业判断，
   不是开工。
5. **卡片命名（对 company 的登记偏离，用户定）**：plans 卡 `YYMMDD-<slug>.md`（YYMMDD =
   立卡日期；归档 `git mv` 文件名不变 → 日期流在归档侧可读）；bugs 卡 `BUG-<NNN>-<slug>.md`
   （编号权威住 _done/README，活跃 ∪ 归档一起算）。位置即状态：内容不重写，毕业只在状态行
   补去向指针；README 永不删。
6. **机械门禁 `plans-liveness`**：每张活跃 plans 卡 ① 文件名 = `YYMMDD-<slug>.md`；② 首部
   12 行内「状态：…毕业门判断 = <值>」户口行；plans/README.md 缺席 = 红（层契约）；零卡 =
   合法空态（note 声明，company 同款空转）。
7. **边界三句**：推敲卡 ≠ 提案（卡可以只有问题没有方案）；推敲卡不是任务；立新卡前先检索
   （防重复推敲）。bugs 边界：当场修掉不建档；决定不当场修的必须建档（症状/根因假设/复现/
   严重级/修复关联）；bug 当契约探针。
8. **roadmap.md 退役（D20）**：队列 + 搁置池原文迁 queue.md（搁置池五行与复活条件逐字
   保留，链接改挂 rejected/）；`git rm` 删除文件（历史在 git）；全仓 live 面同 diff 清理——
   入口链第 3 步（AGENTS.md）、guides/60（§0 生命周期 / §1.1 契约表 / §7 中断恢复）、
   notes/README 时态表、proposed/README 与 rejected/README 规则、guides/62、design/20+30、
   discipline-map、pack README、pnpm-workspace 头注、graduating-a-queue-item 技能、人类门面
   README；历史层（implemented/archived/rejected/postmortem 正文）不动——历史记录只修
   链接死链（signal-to-noise Note 两处 URL 重定向），措辞不改。
9. **门禁改锚（D20 同 diff）**：verify.mjs 的 queueSection/parkedSection（原 roadmapQueue/
   roadmapParked 改名）读 `_backlog/queue.md`；`proposal-scheduled`（RFC ↔ 队列/搁置池配对）、
   `queue-pointer-live`（regex 容许 `../` 前缀链接）、`entry-chain`（成员清单 roadmap.md →
   _backlog/queue.md）三门禁随迁；`entry-chain-probe` 真值抽取改读 queue.md。doc-budgets
   新登记 `_backlog/queue.md`（上限 45 行）。
10. **不借清单（负知识，住 `_backlog/README.md`）**：todos/ 桶、独立 roadmap 文件、
    `_suspended_*`、`_reference/`、复盘卡、deerflow 三道一致性门禁——各带理由，有压力再借。

## 输掉的方案

- **保留 roadmap 双层（本仓初版倾向，用户同日裁断否决）**：论据（推敲与次序互补、门禁网
  挂载其上、借鉴源同日保留 ROADMAP）全部成立并随首张推敲卡永久归档
  （[_done/_closed_plans/260928-retire-roadmap](../../_backlog/_done/_closed_plans/260928-retire-roadmap.md)），
  但两个规划入口的真实成本（双指针纪律、入口链分叉、fresh agent 二跳）被裁断大于复用价值；
  反证论据按位置即状态原样保留，重新提出合并前先读该卡。
- **notes/ 下子目录**：卡毕业纪律（内容不重写）与 Note 毕业纪律（正文必须改写）方向相反，
  混入时态地图两套纪律打架。
- **只借 plans 不借 bugs**：建档边界纪律价值在纪律不在目录，拆借 = 半套思想。
- **plans 卡纯 slug 无日期（company 原样）**：归档后日期流不可读——用户裁定日期编码。
- **队列加"推敲中"状态 / 放宽 `proposal-scheduled`**：队列 = 已批准的有序索引，混入未批准
  = 调度器变停车场（company D23 复发）；proposed/ 同理退化。
- **照搬 deerflow 全套**（todos/、_suspended、_reference 三桶 + 三道一致性门禁）：本仓已有
  对应家 = 第二事实家；门禁预铺违反"有压力再借"升格判据。

## 实际跑过的验证

- **plans-liveness 反证（红→还原→绿）**：① 无状态行卡（`260928-probe-card.md` staged 注入）
  → 红「无『状态：…毕业门判断 = <值>』户口行」；② 补状态行 → PASS；③ 错名卡
  `260928_Bad Name.md` → 红「文件名违反 YYMMDD-<slug> 编码」；④ 还原 → PASS + 零卡合法空态
  note。untracked 注入门禁不可见 = `git ls-files` 索引面（staged 后兜住，同 md-links 边界）。
- **md-links pre-commit 活体拦截**：首卡毕业迁 `_closed_plans/` 后相对层级变了（两层上溯 →
  三层），未 staged 前终跑扫不到——commit 时 pre-commit 红在卡内三条旧链接，修正后绿。
  毕业迁移的指针腐化风险由此有机械兜底（两次实证同一边界）。
- **L0**：`pnpm verify` 全绿（含新门禁与三门禁改锚后）+ `pnpm test` 全绿——计数不写进
  文档，查命令输出。
- **roadmap 清扫面**：`git grep roadmap`（vendor 外）复核——live 面零残留（历史层正文措辞
  与 postmortem 文件名除外，属不可篡改历史）；历史 Note 死链重定向后 md-links 全绿。
- **未跑项**：`entry-chain-probe`（真模型档，无凭据）——真值抽取已改锚 queue.md 且 parked
  分支在位，语义版人工复核随下次真模型档窗口补。

## 环境状态

- 规划面 = [_backlog/](../../_backlog/README.md)：queue.md（次序半区，parked 态落地）+
  plans/（推敲半区，空态）+ bugs/ + _done/；roadmap.md 已 `git rm`（历史在 git）。
- 新门禁 `plans-liveness`（gates 数组 + [evaluation §L0 台账](../../docs/evaluation.md) 同步）；
  doc-budgets 新登记 `_backlog/queue.md`。
- 首张推敲卡 260928-retire-roadmap 当日立卡、当日经用户裁决毕业归档——卡生命周期首例全程
  走完（立卡 → 检索 → 毕业门 → 归档补去向指针），plans/ 回到合法空态。
- 并行会话交接：rerun-loop-live 的毕业件（notes/implemented/2026-09-28-rerun-loop-live.md）
  系并行会话在飞成果，保持 untracked 归其整轮提交；本变更 queue.md 直接以 parked 态落地
  （其"删队列行"步骤被 roadmap 退役超越，无冲突）。
- 本 Note = RFC（notes/proposed/2026-09-28-backlog-deliberation-space.md）毕业改写（同名
  迁移，主题首提日期 2026-09-28）。
