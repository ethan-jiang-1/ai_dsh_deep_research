---
topic: W 工作包身份卡 review
intent: 作为第二个 reviewer 对活跃卡 2026-10-22-w-work-package-identity 做事实核对与设计评审，产出四条定稿前修正、七条建议与 §11 八问结论，供用户拍板与卡修订。
---

# W 工作包身份卡 review（2026-10-22）

> **历史评审（已被取代）**：本文件评审的是 2026-10-22 旧版“W=工作包/LAYER”；
> 用户同日纠正为“W<wave>.<index> / WAVE”。结论不再作当前合同，仅保留旧方案记录。

> 对象：[W 工作包命名与 L 拓扑层卡](../../../_archived/settled_issues/2026-10-22-w-wave-node-identity.md)（设计评审稿，`推敲中`；卡头明写"用户与第二个 reviewer 先审"）。
> 方法：只读评审——卡 §1 的实现声称逐条对本仓源码/模板/skill/手册核对；DSH 机制面按 vendor `dsh-v0.2.1-rc.2` 正本与[机制盘点](./2026-10-21-dsh-orchestration-primitives.md)；评审期间未改卡。
> 结论：**方向成立**（W 稳定身份 + 层为计算值 + stage 承载流程不变量；DSH 映射未发明机制，与 A0 决定一致）；**四条定稿前修正（B1–B4）**、七条建议（S1–S7）、八问逐条结论（§4）。

## 0. 评审结论

| # | 修正 | 为什么 |
|---|---|---|
| **B1** | **"L" 前缀三重撞车**：深度档 L0–L3（模板/skill）与评估五面 L0–L4（docs）已占用 L；卡 §2 仍以裸 `L` 为拓扑层符号，§4 示例表 depth 列值即 L1/L2（评审后卡:97 已加 caption 澄清 depth≠层，符号重叠仍在） | 按 docs/AGENTS.md「编号词汇引入前先消歧 + 新编号词汇进 00-index 术语映射登记」；推荐弃用裸 `Ln` 符号，文档/UI 一律「第 n 层 / LAYER n」 |
| **B2** | **墓碑机制未指定载体**：验收要求墓碑可追溯，但没定 retired 行放哪、parser/图如何对待 | `plan-graph.ts:583` 把表内所有行进 `topLevel`——retired 留表会继续画图，移出表则旧引用解析不到；需定 lifecycle 列 + 过滤规则 |
| **B3** | **stage 列与 kind 列近重复，未拍权威**：顶层 kind 枚举 ≈ stage 枚举，增量只在子 W | 候选 = 派生（stage = 根 W 的 kind 映射，不加列）或独立列 + 一致性校验；不拍会出现第二事实源；另 kind 有 `gate` 而 stage 枚举无对应 |
| **B4** | **"不改 NODES 八节点契约"措辞过强**：NODES.md 37–39 行有"按 plan 的 N 节点重建"，第 2 行列清单无 stage；研究手册目录约定同样有 N 字样 | 验收应改写为"不动 I/O 行与既有门；行内 N 字样与列描述同 diff 同步" |

## 1. 事实核对（卡 §1 声称 vs 盘上实现）

全部属实：

| 卡的声称 | 锚点 |
|---|---|
| 节点表已有 id/parent/kind/…/task_id；parent 已用于复合节点 | [plan 模板](../../../../research-workspace/templates/run/plan.md)（表头 + N3.1 注释示例） |
| `planIndex` 解析节点表，`planIssuesOf` 报重号/悬空 parent/deps，`levelsOf` 按最长路径算层 | `packages/deep-research-pack/src/lib/plan-graph.ts:526` / `:610` / `:196` |
| 图谱默认画顶层；复合子节点收在父详情（图上标 `+N` / `内部 N`） | `packages/deep-research-pack/src/client/ResearchGraphTab.tsx:274-276` / `:554` |
| 节点可复制 `drt_<slug>/N3` | `packages/deep-research-pack/src/client/ResearchGraphTab.tsx:501` |
| 图表行当前叫 `WAVE n` | `packages/deep-research-pack/src/client/ResearchGraphTab.tsx:694` |
| skill/模板/手册已有"N 是 ID 不是序号"纪律 | [research-planning skill §0](../../../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md)；模板头部；研究手册目录约定 |
| DSH Agent Teams 平铺 DAG、任务无 parent、无 nested Team、task_id 会话映射 | `vendor/dsh/docs/subsystems/agent-team.md:56-74`（TeamTaskSnapshot 无 parent 字段）；[机制盘点 §2.1](./2026-10-21-dsh-orchestration-primitives.md) |
| A0 run plan 为 N1–N4 | `research-workspace/_abandoned/drt_deepseek-v4-status/plan.md` |

补充实测：A0 run 的节点表**没有 parent 列**（四节点全顶层），按 parser 逻辑可正常解析——"解析器接受任意稳定 id、旧 plan 只读兼容"（卡 §9）成立：parser 对 id 无前缀校验（`plan-graph.ts` 的 `read('id')` 接受任意串）。

## 2. 定稿前修正（B1–B4）

### B1 "L" 前缀三重撞车（卡内自冲突）

- 已占用：深度档 **L0–L3**（plan 模板头部"深度档：L0 快答 / L1 标准 / L2 深挖 / L3 穷尽"、research-planning §2）+ 评估五面 **L0–L4**（docs；D27 已为 S/L 编号撞车做过一次分离先例）。
- 卡 §2 术语表定义 L=Layer/拓扑层（卡:39）；§4 示例表 depth 列值就是 L1/L2（卡:92-95）；同节文字"图上的 L 可能从 L1 变 L2"（卡:85）。本 review 提出撞车后，卡在表下 caption 补了"`depth` 列 = 研究深度 L0–L3，不是拓扑层 L；拓扑层不落表"（卡:97）——**表格级消歧已做，符号级撞车仍在**：同一文档里 `L1`/`L2` 仍可能被读成深度档或拓扑层两义，且与 docs 评估五面 L0–L4 构成第三重。
- 处置二选一：**推荐**弃用裸 `Ln` 符号——文档与 UI 一律「第 n 层 / `LAYER n`」，depth 列保持 L0–L3 不动；或保留 L 符号但进 [00-index §术语映射](../../../../docs/00-index.md)登记三向消歧。§4 措辞随之改写。

### B2 墓碑机制没有指定载体

- 验收要求"拆分/合并有墓碑/`derived_from` 可追溯"，但卡没说 retired 行放哪。现状：生命周期字段只活在模板"重写记录"的注释里；`plan-graph.ts:583` 把表内所有行进 `topLevel`——retired 节点留在表里会继续画进图，移出表则旧引用 `drt_<slug>/W2` 解析不到（`byId` 不含）。
- 建议在卡上定：节点表加 lifecycle 列（`retired` / `merged_into` / `derived_from` / `superseded_by`）；`topLevel` 过滤 retired；`byId` 保留可查（图不画、引用能解析）。

### B3 stage 列与 kind 列近乎重复

- 顶层 kind 枚举（broad-scan/deep-dive/cross-check/synthesis/review）≈ stage 枚举（scan/dive/check/synthesis/review）；stage 的增量只出现在子 W（fetch/search 等子 kind 挂父 stage）。
- 候选：**派生**（stage = 根 W 的 kind 映射，不加列，永不漂移，符合"一个事实一个家"）或独立列 + `planIssuesOf` 加"子 W stage 必须等于父 W stage"校验。卡只写了列形态，没写为什么不用派生。
- 附：kind 有 `gate`，stage 枚举没给 gate 的归属——补一句。

### B4 "不改 NODES 八节点契约"措辞过强

- `research-workspace/NODES.md:37-39` 写着"恢复时按 plan 的 `N` 节点重建任务"；第 2 行"组队"输出的列清单（id/kind/…/task_id）没有 stage；研究手册目录约定同样有 N 字样与列清单。改前缀 + 加 stage 列必然触动这些文字。
- 验收改写为："不动 I/O 行与既有门（schema-scan/node-gate）；行内 N 字样与列描述同 diff 同步"。

## 3. 建议（S1–S7）

- **S1 rollup 定义补全**：§6-B 只写"rollup 的 `blocked_by` = 已建子任务"，漏了外部依赖——应写全 = **外部依赖的 task + 已建子任务**。子任务废弃要先 `set_dependencies` 清边再 delete（Team 对有依赖者的 delete 拒绝；`blockedBy` 必须指向非删除任务——`vendor/dsh/docs/subsystems/agent-team.md:58`）。
- **S2 引用形式统一**：§8 同时出现 `@W2.1`（chat 反馈）与 `drt_<slug>/W2.1`（复制按钮）；现行 skill §0 的 canonical 是 `run_slug/N3`。定一个 canonical（建议 `drt_<slug>/W2.1`），`@W2.1` 写明为"当前 run 上下文简写"；UI 复制文案与 skill 同措辞。
- **S3 "W 层级校验"清单化**：把 `planIssuesOf` 的新 issue kinds 点名，避免一句话过模糊——混用 W/N 家族、子号前缀不匹配父号（W2 的子必须 W2.x）、超深（>3 层）、跨组子 dep、stage 不一致（若 B3 选独立列）。验收 §12 直接引用这份清单。
- **S4 落地面补两项**：① W/层/stage 进 [00-index §术语映射](../../../../docs/00-index.md)登记；② 模板改动走生成物链——pack workspace 种子重同步（`pack-workspace-fresh` 把守）+ overlay/镜像三处一致（packages/deep-research-pack/AGENTS.md）+ design/40 图谱节同步。§13 顺序表补"文档/术语登记"与"种子同步"两项。
- **S5 NODES wave0/1/2 消歧**：NODES 表行"侦察 wave0 / 挖掘 wave1"是生命周期固定段名，与本卡 stage/层是第三个易混词；卡内加一句"NODES wave = 生命周期段名，非 plan 的层/包"。
- **S6 状态流转**：吸收本 review 修订后，卡按生命周期翻 `等人拍板`（下一步 = §11 八问），别停在推敲中隐性等待。
- **S7 说清 B 是行为变更，不只是改前缀**：现行 skill §0/§4 明文"拆并行执行单元 = Lead 追加**新的顶层节点**"；B 允许子 W 直接上板，是卡内最大的语义 delta。实施 diff 点名替换 skill §0 复合节点段与 §4 规则 1，避免新旧纪律同页打架。

## 4. 卡 §11 八问逐条结论（以 B1–B4 修订为前提）

| # | 问题 | 结论 |
|---|---|---|
| 1 | W 稳定 + 层计算 vs W 当波次 | **同意前者**；层不用裸 L 符号（B1） |
| 2 | 固定 stage 别名 vs 自由工作包 + stage 列 | **同意自由工作包**；stage 先按 B3 拍派生 vs 列 |
| 3 | WAVE→LAYER 改名 | **同意**（`ResearchGraphTab.tsx:694` 一处文案）；连带 S5 |
| 4 | 子号深度限制 | **同意**（限 2–3 层、展示 2 层）；超深进 S3 结构提示 |
| 5 | A / B / C | **B（rollup）**。机械成立（无环、CAS、owner/Lead 可 complete），保住"每个 W 可观察"又不发明 nested Team；按 S1/S7 补定义。A 丢层级引用（与用户诉求相悖）；C 板上看不到子层进度（正是现状痛点） |
| 6 | 跨组子依赖 | **禁止并提升到父级**。顶层图只画顶层节点，跨组子边在图上不可见，放行即静默边；提升后由 rollup 的 blocked_by 承载，可见可调度；机械兜底进 S3 |
| 7 | stage 枚举 | **同意固定枚举 + 未知兜底**；先过 B3，补 gate 归属 |
| 8 | 旧 N 兼容 | **同意只读、不迁移**（parser 本就 id 无关，已实测 A0 run 无 parent 列可解析）；S3 的家族类校验按 W/N 分别适用，别让旧 plan 误报 |

## 5. 未查的面

design/40 全文；cockpit keyless 测试对 `WAVE` 文案的断言点（若测试钉了字样，改名要同 diff 改测试）；combination-review 之外的 research 材料。不阻塞上述结论，实施 diff 时会碰到。

## 6. 证据

- 卡：[2026-10-22-w-work-package-identity.md](../../../_archived/settled_issues/2026-10-22-w-wave-node-identity.md)
- 机制正本：`vendor/dsh/docs/subsystems/agent-team.md`；[机制盘点](./2026-10-21-dsh-orchestration-primitives.md)
- 本仓实现：`plan-graph.ts` / `ResearchGraphTab.tsx` / plan 模板 / research-planning skill / NODES.md / 研究手册 / A0 run plan（§1 表内逐条锚点）
- A0 决定：[2026-10-21-dynamic-research-dag-a0.md](../../../../notes/implemented/2026-10-21-dynamic-research-dag-a0.md)
