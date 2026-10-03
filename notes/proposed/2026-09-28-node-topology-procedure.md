# RFC：节点拓扑演进程序——改轨道的六处同步技能（pipeline-polish 面⑦）

> 状态：proposed

出处：[pipeline-polish 卡](../../_backlog/plans/2026-09-28-pipeline-polish.md) 面⑦（加节点/
调节点的程序——2026-10-03 复查确认同步面已从「三处」涨到六处，原文过时，程序本身仍缺）；
主序 ⑤②③④ 已毕业完毕，本棒为收尾文档活。

## 问题（带实证）

1. **改轨道无程序**——本 session 实际走过两轮轨道级变更（面② leads 行升格、面④ 门④），
   每轮都要靠现场回忆同步面：NODES 双副本、模板、手册、STEP_ORDER、schema-scan、node-gate
   ——缺一处 = 下一场 run 撞上（面②立卡时漏算 sync-pack-workspace，boot 漂移检测当场抓红
   才补）。程序只存在于 pipeline-polish 卡的一句括号里。
2. **同步面已扩到六处**（2026-10-03 复查实证）：NODES.md（双副本）／模板六件／研究手册／
   cockpit STEP_ORDER（`run-fold.ts`）／schema-scan（在场级 + CONDITIONAL 条件件清单）／
   node-gate（判据级）；附属两处：步序正本 Note（m2-run-mechanics）／观察面投影
   （run-dashboard 跟随 run-state 谓词，通常自动）。
3. **判据升格与轨道变更的边界**（本 session 实践沉淀）：升格单行判据走 writing-a-gate；
   加/删节点、改 I/O 件、改回边语义、改编制条件性 = 改轨道——两套程序的分界需要成文。

## 方案

1. **新开发技能 `.agents/skills/changing-node-topology/SKILL.md`**（与加角色/写门禁同构，
   任务匹配即加载）：① 触发判据（什么算改轨道 vs 什么只是升格）；② 六处 + 两附属同步清单
   （每处一行"谁拥有什么"）；③ 程序 = 先想红（G8 教训：散文判据不拦角色）→ 同 diff 六处 →
   验证档（L0/sync/build+client 冒烟/真模型档按面）→ 反证（新判据 fixtures 先红后绿 + 契约
   日断代）→ 收尾（Note 同 diff）；④ 已知坑（双副本漂移门禁、mirror 随 boot 同步、运行区
   不进 L0、mtime 断代局限）。
2. **三处指针同步**：根 AGENTS.md 技能清单括号（四个 → 五个）；guides/60 §1.1 分支表 +
   "上列四个"措辞。
3. **零机制新增**——技能是程序化工作记忆，不加门禁（dev-skill-format 门禁已把守形状）。

## 输掉的方案

- **程序写进 NODES.md**：NODES 进模型可见面（agent-instructions 注入），开发程序是开发侧
  工作记忆——读者不同，混入 = 角色会话吃进开发噪音；
- **程序写进 guides/60**：60 是六步闭环通用环，轨道程序是专项任务记忆——同 dev 技能层先例
  （writing-a-gate 不住 60 正文）；
- **同步清单起 verify 门禁**（逐处断言存在性）：同步面是过程清单不是恒真事实——文件存在
  ≠ 同步做对，机械门查不出"漏改"（防空语料门禁的适用对象是扫描面，不是 checklist）。

## 验收

1. dev-skill-format 门禁过（frontmatter 形状）；L0 全绿；
2. 三处指针同步（根 AGENTS.md / guides/60 两处）无死链；
3. 技能内容经本 session 两轮实战对照（面②④的实际同步动作与清单逐条对得上——清单是从
   实战走过的路反写，不是设计稿）。
