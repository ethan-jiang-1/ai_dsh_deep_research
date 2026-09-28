# intents — 初始意图与用户指令存档

> 性质：时间性记录（为什么起这个项目、用户原话要点）。当前语义一律住 docs/，本文件只存
> 意图与来历。

## 2026-09-24 · 立项

用户指令要点（原话语义保留）：

1. **做什么**：开发一个 DSH 插件，这个插件擅长 **Deep Research**——Deep Research 对
   harness 要求高：要接触大量搜索，搜索结果信噪比可能非常差，但要探索出对一个问题的
   最终答案可能在哪儿，会搜到很多很多事实。
2. **参考什么**：工程范式参考 `/Users/bowhead/ai_dsh_company`（DSH 插件开发项目）；
   方法论参考 `/Users/bowhead/ai_tool_deepresearch`（codex 下做过的成熟 deep research
   harness，"信息很多，慢慢消化"）。
3. **怎么组织**（2026-09-24 追加）：用**多个角色**而非散装 subagent——Deep Research 天然
   需要多种擅长不同内容的 sub-agent；历史上用 subagent，现在用角色（preset）更好，
   今后的任务比较容易配合地做出来；**全程用 agent team 来做更合理**。
4. **怎么验收**（2026-09-24 追加）：先把**评估标准**定下来（"你清楚如何评估我们搭好的
   框架合不合理吗"）——评估先行，今后才知道 final/ongoing goal 是不是可被 meet。→
   落地：`docs/evaluation.md`（五面合同）。
5. **怎么迭代**（2026-09-24 追加）：八成把握就先落地，不断 review/iteration 知错改错，
   不要想透澈了一口气输出。→ 落地：垂直轮节奏 + 队列制。
6. **流程精神**（2026-09-24 追加）：借鉴 company 仓
   `notes/implemented/2026-09-23-dsh-inround-task-surface.md` 的精神——先枚举再继承、
   轮内反馈双门（plan 呈批 + todo 活清单）、队列不积累历史、status rots、默认严格
   偏离登记。→ 落地：AGENTS.md 纪律表（R1 枚举子集 + 全量枚举队列条目）、guides/60
   §0 条目生命周期、roadmap 纯队列。
7. **开发流程——推敲空间**（2026-09-28 追加）：借鉴 company 仓 `_backlog/`（其 D31：
   决策前四问——该不该做/何时/次序/是否放弃——的家；只承载判断材料，不承载次序与
   授权，永不成为第二队列）。用户裁定：根目录 `_backlog/`、plans/bugs/_done 全三件、
   走正门立队列条目；plans 卡文件名日期编码 `YYMMDD-slug`（归档后日期流可读）。
8. **规划面单一化**（2026-09-28 追加，同日第二裁）：用户提出「有了 `_backlog`，roadmap.md
   不再有必要、流程复杂了」——代理反证（倾向保留，论据随推敲卡归档）后**用户裁断退役**：
   roadmap.md 删除、痕迹彻底清理；队列 + 搁置池迁 `_backlog/queue.md`（纯索引），规划面
   单入口。plans 卡与队列半区互斥（卡零调度、队列零判断材料）。
