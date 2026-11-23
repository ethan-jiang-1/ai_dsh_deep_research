# 观察面内容实质与英文文案（BUG-377…384）：非空≠有实质、sentinel 与本地化计数

> 状态：implemented
>
> 批索引/决定账 = [修复程序卡](../../_backlog/_archived/settled_issues/2026-11-23-observation-substance-program.md)。
> 本 Note 记决定理由、输掉的方案、实际验证与未证边界；逐卡证据在卡内 `json fix-evidence`。

## 决定

1. **内容谓词层（G25）**：`lib/run/artifact-content.ts` 提供 `hasBodyText` / `hasQuestionBody` /
   `hasPlanBody` / `isEvidenceCardName` / `isEvidenceCard`。`artifact-read` 的五态只回答文件字节
   层面（ok/absent/unreadable/empty/invalid），**不回答有没有实质内容**；标题、空小节、frontmatter-only
   都不算正文。状态页的步骤/计数只消费谓词，不再用 `hasFile` / `trim() !== ''`。
2. **步骤 unknown 优先**：`deriveSteps` 的线性推断会把早步 false 在后续 final 在场时补成 done；
   内容为空/读失败/仅失败登记的步骤必须进 `unknown`。本批给 question/leads/evidence/findings
   加 unknown，S23/S24/S25/S27/S28 的 `?` 芯片由真实矩阵证明。
3. **证据卡 sentinel 排除（G26）**：`_failed.md`/`_` 前缀是失败登记，不是证据卡；0 字节/
   frontmatter-only 卡不算有效。`evidenceCount` 只计有效卡；只有失败登记/空卡 → 0 +
   「没有有效证据卡」+ 挖掘 unknown；有效 1/9 卡正控。
4. **plan.md policy 改 nonEmpty:true**：0 字节 plan 不再 `ok`；状态页消费 `empty`，显示
   「计划为空/计划版本未知」；图谱既有 `empty-source` 提示保留。旧 run 无 plan = absent，不回退。
5. **question body**：`hasQuestionBody` 取第一个非标题正文行（与 `questionLine` 同源）；
   只有标题/空小节 → `questionIssue='body-empty'`，目标行「研究问题正文为空」，立项不 done；
   0 字节 = empty（BUG-367），缺席 = absent（负控）。
6. **英文计数（G27）**：`countText(t,count,oneKey,otherKey,params)` 在 locale 层选单/复数；
   en 1 单数、0/≥2 复数；zh 两键同值。覆盖 evidence/questions/checkpoints/nodes/tasks。
7. **主 tab 短标签**：`methodLibraryTab`（zh「方法库」/en `Methods`）用于 `conversation.view` label；
   完整 `Method library` 留在页面标题/说明。P0 确认 tab 宽度由 vendor 槽控制，pack 不改 vendor。
8. **入口拆分**：locale 是 **boot-level overlay**，不能在同一真浏览器入口混 zh/en；zh 内容实质
   六场景进 `cockpit-truth-substance.entry.mjs`（S23–S28），en 二场景进
   `cockpit-locale.entry.mjs`（S29/S30）。两条均 dev-only、medium；不申请 CAP 例外。
9. **379 的 vendor 边界**：subagent 顶栏计数是 vendor-owned，pack locale 无该键；本卡只修
   pack-owned 计数（evidence/questions/checkpoints/nodes/tasks），vendor 部分记 trigger，不冒充修好。

## 输掉的方案

- **只把 `hasFile` 换成 `trim() !== ''`**：标题-only question 仍非空；381/382 的 0 字节可修，但
  `deriveSteps` 线性推断仍把早步补 done；必须谓词 + unknown。
- **把 `_failed.md` 改名/删除**：它是研究纪律的失败登记，不能因计数 bug 删除；计数层排除。
- **把 plan.md 保持 nonEmpty:false 再在状态页特判**：graph/status 会继续各自解释同一文件；
  policy 改 true，状态页消费 empty。
- **改 vendor tab 宽度/样式**：vendor 只读；pack 用短标签 + 页标题，不改 vendor。
- **只做字符串替换修 `1 evidence files`**：0/≥2、其他计数、zh 负控会漏；用共享 countText。
- **一个入口混 zh/en**：locale overlay 是 boot-level；一个 web 实例不能按 page 切 UI 语言。
- **把内容实质塞进 `ArtifactState` 第五态**：headings-only 文件不是 empty（有字节）；它是
  content predicate 问题，保持五态 + 谓词两层。

## 实际跑过的验证

- **机械**：`pnpm verify` 全绿；`pnpm test` 266 checks 全绿；`pnpm typecheck` exit 0；
  `pnpm build` exit 0；`export-dist` 后 verify 绿。
- **内容实质入口**：`cockpit-truth-substance.entry.mjs` **19/19 PASS，exit 0**；修复前同一命令
  **9/24，exit 1**（S23/S24/S25/S26/S27/S28 各自命中；旧入口版本含 S29/S30，拆分后 S23–S28 为 19 项）。
- **英文入口**：`cockpit-locale.entry.mjs` **3/3 PASS，exit 0**；变异（countText 固定复数 + tab
  长标签）**1/3，exit 1**（S29/S30 各自命中）；还原后 3/3。
- **旧入口回归**：`cockpit-truth` 24/24、`cockpit-artifact-truth` 31/31、
  `cockpit-truth-residuals` 28/28。
- **纯函数**：`artifact-content.spec` 四组谓词；`artifact-read.spec` policy/空快照；`run-fold.spec`
  早步 unknown + final 矩阵；`status-feed.spec` leads/findings/content 接线；`brief-fold.spec`
  body-empty；`i18n.spec` countText en/zh 矩阵。
- **未跑（不冒充通过）**：L2 安装/首启（不改安装形态/入口）；真模型/snapshot（不改模型可见内容）。
  en 已跑 S29/S30（boot overlay）；两条新入口 dev-only，未进 CI/nightly。
- **未证边界**：subagent 顶栏计数 vendor-owned；380 短标签是产品取舍（完整名在页标题）；
  evidence 逐卡读在超大 evidence 目录下的耗时未压测（真实 10 卡级已跑）；`plan.md` 仅有表格
  但零节点时 `hasPlanBody` 仍 true，图谱写 empty-source，属下一层的「节点表可解析」问题。

## 判据形状

- **权威事实**：内容有效性只认 `artifact-content` 谓词；证据数只认 `isEvidenceCardName` +
  `isEvidenceCard`；question 正文只认 `questionBodyLineOf`；plan 空只认 policy `empty`；
  步骤完成只认谓词 + unknown；en 计数只认 `countText`。
- **读取方**：`useStatusFeed`、`ResearchStatusTab`、`TrackRail`、`ResearchGraphTab`、
  `brief-fold`、`method-of-question`（后续复用）、两条新入口、纯函数矩阵。
- **坏输入**：0 字节/纯空白/标题-only/空小节/frontmatter-only/失败登记/空证据卡/读失败，
  全部与「有效正文/有效卡/完成」分开；文案必须命名实际状态。
- **旧形态退场**：leads/findings `hasFile`；question `state==='ok'` 即立项；evidence `.md` 后缀
  计数；plan `nonEmpty:false`；en 固定复数；长 `Method library` tab label。
- **反证**：artifact-content 谓词矩阵；deriveSteps 早步 false/unknown + final true；content
  入口 S23–S28 双断言；locale 变异红；旧三入口回归；修复前 9/24。

## 残余与未证边界

- 两条新入口 dev-only（真浏览器 + 文件突变/语言 overlay）；重议条件 = 连续两轮稳定，或
  `client-load` 吸收。
- 379 的 subagent 顶栏计数 vendor-owned；若 vendor 后续暴露 locale 计数键，另立卡。
- 380 选择短标签而非改 vendor 宽度；若用户要求完整 `Method Library` 标签，另议布局，不改 vendor。
- evidence 逐卡读的性能只在 10 卡级验证；超大目录需要 limit/缓存，不由本批猜。
- graph `plan.md` 仍裸读以保留 `truncated` 分态，G21 清单登记为已知遗留；本批未迁移。
