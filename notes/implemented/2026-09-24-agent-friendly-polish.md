# Agent 友好性整治轮记录（2026-09-24，入口链探针驱动）

> 状态：implemented

> 触发：用户指令"第一次提交之后不断打磨迭代，确保框架没有任何问题；要满足对 Agent 友好"。
> 方法：全新上下文入口链探针（fresh subagent 只读 AGENTS → 00-index → roadmap → evaluation
> 四文件答"现在"问题 + 审计矛盾）→ 逐条修复 → 门禁复绿。

## 探针结论（修复前）

方向层无歧义（▶ 指针唯一、验收内联、命令可抄跑）；**状态层有歧义**，五处真问题：

1. **evaluation.md 状态腐化**：各面"脚本待建"字样与 AGENTS.md"存在可跑"直接矛盾——违反
   本仓自己的 docs=now 纪律（status rots 的活体样本）；
2. **命令面分裂**：`pnpm verify` vs `node scripts/verify.mjs` 两套写法无对齐说明；
3. **路径漂移**：evaluation.md 写 `docs/design/methodology-mapping.md`，实际文件是
   `docs/design/30-methodology-mapping.md`（同一文件两个家）；
4. **R/M 双坐标混用**：R 轮号是时间编码标识（company D23 判死刑的东西），泄漏进常设文档
   而无任何文件定义 R 序列——47 处命中；
5. **▶ 条目 RFC 悬空**：roadmap 头注承诺"条目全文住 RFC"但 ▶ 无直链，新代理无从开工。

另修（本轮自查顺手）：角色 persona 与 research-brief skill 里的路径
`research-workspace/AGENTS.md`、`research-workspace/templates/...` 在角色会话 cwd
（=research-workspace/）视角不可解析 → 改为"手册已注入"措辞 + cwd 相对路径；研究手册
跨角色 skill 指针修正（skills 硬隔离，critic 加载不到 analyst 的 skill，手册最小契约
自足）；AGENTS.md/README/guides 的 `node --test tests/` 目录形式是坏命令（Node 22 下
MODULE_NOT_FOUND，实测）→ 统一为 `node --test tests/*.test.mjs`。

## 修复清单

| 探针发现 | 修复 |
|---|---|
| evaluation.md 待建字样/历史叙述 | 去腐化：只写检查定义；状态路由到 roadmap ▶；§6 收敛为两条边界 |
| 命令面分裂 | evaluation 统一 `node scripts/...` 形式 + pnpm 别名注记一次 |
| 路径漂移 | 统一 `docs/design/30-methodology-mapping.md` |
| R 轮号泄漏 | 全仓清扫（AGENTS/00-index/roadmap/design/scripts/dev/包文件），时间坐标
  → 队列条目名（company R1 实证等**外部引用**保留）；notes/ 时间性记录按性质保留 |
| ▶ RFC 悬空 | 写 RFC `notes/proposed/2026-09-24-web-tool-rows.md` + roadmap 直链 |
| Q4–Q6 家分裂 | 统一登记 00-index 待定表，design 文档只留背景指认 |
| 探针链盲区 | roadmap #7 探针入口链补 evaluation.md（四文件） |

## 实际跑过的检查

- 修复前：`node scripts/verify.mjs` 8/8 PASS；`node --test tests/*.test.mjs` 9/9 pass
  （探针在绿基线上跑出语义层问题——机械门禁抓不住"读起来过期"，探针的价值实证）；
- 修复后：`node scripts/verify.mjs` + `node --test tests/*.test.mjs` 复跑（见 git 本条
  commit 时的输出记录）；proposal-scheduled 门禁对新增 RFC 生效（roadmap 含其 stem）。

## 教训（给后续轮）

1. **机械门禁与语义探针分层防漂移不是理论**——本轮 8/8 绿基线上探针抓出 5 处状态层
   歧义，正是 company 探针设计（"门禁抓不住读起来过期"）的复现；
2. **写"计划要做 X"的文档在 X 做完后必须回扫**：evaluation.md 的"待建"是最典型的
   承诺腐化——凡是描述"将要"的句子都是未来的 rot，合同文档只写"是什么/怎么跑"；
3. **路径要写消费视角**：给角色会话看的路径必须从其 cwd 可解析（仓库读者视角 ≠ 会话
   agent 视角），注入式载体（agent-instructions）里的引用尤其如此；
4. **提交链必须挂在测试退出码上**（web-tool-rows 收尾的流程失误：`node --test … | tail`
   之后 `&& git commit` 挂在了 tail 的成功上，红灯状态被提交进 509a04b）——正确形状 =
   `node --test … > out 2>&1 && git …`（重定向不吞退出码）；红灯 commit 的事实保留在
   git 历史里作证，修复向前。

<!-- grandfather: note-format 门禁生效（2026-09-24）前的遗留形态——内容有效不追改，新篇一律按 guides/60 §4 骨架 -->
