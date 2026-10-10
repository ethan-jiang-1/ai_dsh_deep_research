# 节点拓扑演进程序——改轨道六处同步技能（pipeline-polish 面⑦）

> 状态：implemented
>
> 归档：2026-10-10（notes-stocktake 边界个案 B 裁定：六处同步清单 + 四条已知坑已由 changing-node-topology SKILL 全文承接〔2026-10-08 体检核实〕，活面零引用——裁定记录 = `notes/implemented/2026-10-10-archive-review-surface.md`）

出处：[pipeline-polish 卡](../../_backlog/_archived/settled_issues/2026-09-28-pipeline-polish.md) 面⑦（收尾
棒；主序 ⑤②③④ 已毕业 2026-10-03）。

## 决定

1. **新开发技能 `changing-node-topology`**（`.agents/skills/`，model-invoked——改轨道任务
   以队列条目到达，代理须自主发现程序，与 writing-a-gate/adding-a-research-role 同理由）：
   ① **边界成文**——加/删/并节点、改 I/O 件、改回边语义、改编制条件性 = 改轨道（本技能）；
   单行判据升格 = writing-a-gate；② **先想红程序**——可机械判定面 / node-gate 挂行与契约日 /
   内容级判据归属三问；③ **六处同步清单**（每处"谁拥有什么+动作"）：NODES.md 契约全表 →
   sync-pack-workspace 双副本 → templates/run/ → 研究手册（owner 表）→ run-fold.ts
   STEP_ORDER（+build/client 冒烟）→ schema-scan + node-gate；附属两处：步序正本 Note、
   run-dashboard 投影；④ **验证档**按改动面选跑；⑤ **已知坑**四条（双副本/镜像两道门、
   运行区不进 L0 + 断代、门内样板行污染朴素匹配、doc-now-only 扫 tracked 夹具）——全部
   本 session 实测在案。
2. **三处指针同步**：根 AGENTS.md 两处技能清单括号（四个 → 五个）；guides/60 §1.1 分支表
   （加/调节点轨道 → changing-node-topology）+ "上列五个"计数。
3. **零机制新增**：dev-skill-format 门禁已把守技能形状；清单是过程 checklist 非恒真事实，
   不起 verify 门禁。

## 输掉的方案

- **程序写进 NODES.md**：NODES 进模型可见面（agent-instructions 注入角色会话），开发程序
  是开发侧工作记忆——读者不同，混入 = 角色会话吃进开发噪音；
- **程序写进 guides/60 正文**：60 是六步闭环通用环，轨道程序是专项任务记忆——同
  writing-a-gate 先例（专项技能不住通用环正文）；
- **同步清单起 verify 门禁**：文件存在 ≠ 同步做对——机械门查不出"漏改"，checklist 的价值
  在过程不在断言（防空语料门禁的适用对象是扫描面）。

## 验证

- **dev-skill-format 门禁过**（frontmatter name = 目录名；description 以 "Use " 开头携带
  触发分支 + 反向分支路由到 writing-a-gate）；
- **harness 目录发现实录确认**：技能落盘后 available-skills catalog 更新含
  changing-node-topology（model-invoked 生效的直接证据）；
- **清单经实战反写**：六处+两附属逐条对照本 session 面②（leads 行升格走全六处）与面④
  （门④走 NODES/node-gate/双副本）实际走过的路，非设计稿；
- **L0**：verify 34 门全绿（entry-chain/doc-budgets 过新措辞）+ tests 140/0；
- writing-for-agents / SKILL-MECHANICS 全文对照（pointer 规则、model-invoked 选择、
  leading words 先想红/断代/防空语料复用）。

## 环境状态（Consequences）

- **pipeline-polish 卡剩余 = 面①**（策略对标——并行研究型，产出判断材料非机制）+ **面⑥**
  （质量门滚动——随每场 run 喂证据逐行升格，不单独立卡）；⑦ 毕业即第二阶段的结构性收尾。
- 下一场真 run 的双重身份不变：第二阶段验收现场 + 面⑥ 证据引擎 + 健康遥测计数（划界已钉
  2026-10-03：授权代驱不算救场、故障代驱算）。
