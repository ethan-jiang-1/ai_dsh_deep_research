---
status: 等人拍板
opened: 2026-10-23
---

# 推敲：rerun 的版本面与图谱表达

> 立卡：2026-10-23 ｜ 状态：等人拍板 ｜ 类型：设计 ｜ 结论倾向：现在做（先拍板 plan 快照契约与终稿默认版本） ｜ 可关闭：否
>
> 用户 2026-10-23 定调：rerun 是真实需求——跑到尾、出了 final 后，因问题理解加深/方向修正/A 不对要
> 重跑；通路必须还在，视觉（研究图谱）也要表达清楚。用户与第二 reviewer 先审本卡。

## 1. 问题

rerun 在文件契约里存在，但**观察面只显示当前 plan**，看不出“这是 v2 rerun / v1 已交付 / v2 待审”：

- 图谱只读当前 `plan.md`，没有 v1/v2 plan 快照，画不出差异；
- 状态页签的 `↻ rerun` 是图例，不是当前状态；`face.versions` 只读 `final/`，v2 未落账就不显示；
- 终稿页签读 run 根 `final.md`（v2 草稿），但已交付仍是 v1，存在“草稿冒充终稿”风险；
- 当前真实 v2 rerun 已经跑到 `final.md` v2，但 `final/` 只有 v1，HITL2 仍 pending；
- 旧 run 的 flat W/N 命名与新的 Wave `W<wave>.<index>` 又在同一观察面叠加，容易把版本问题和
  命名问题混在一起。

## 2. 现状：rerun 通路还在（D17）

**rerun 不是工具、不是按钮，是 run bundle 的版本演进。** 三种类型：

| 类型 | 落点 | 版本 |
|---|---|---|
| 表述修订（polish） | 当前 `final.md` 原位改 | 版本号不变 |
| 证据扩张 rerun | 同 bundle 补证据、重审、重交 | `final/vN+1.md` + `final.md` 当前版 |
| 结构性 rerun | 另起 `drt_<slug>/` | sibling 预检 + 用户同意，不混旧 bundle |

触发路径：

- HITL2 三选一：**定稿 / 补研究 / 修订表述**；
- 或新开 lead 会话说“继续 `archive/drt_<slug>` 这个 run”；
- 操作侧 `dev/run-kickoff.mjs --session <id>` 是续跑/注入工具，不新建会话；
- 方向修订走 steer；run 执行中改方向**不算** rerun。

机械契约：

- `question.md §Decisions` append-only：日期 / delta / 受影响 topics / agent interpretation / 用户原话；
- `final/` 版本记账：首版 `v1.md`；证据扩张 rerun 落 `v2.md`；
- `final.md` 始终是“当前版”；`final/vN` 是版本账；
- `node-gate` 门④：`final/v2` 在场时 `question.md` 必须有 v2 行，`v1.md` 索引必须登记；
- 状态页签的 `face.versions` = `final/` 最高版本；`final` 页签只认 `present` 交付，不把
  `final.md` 在场当已交付。

**所以通路没有被后续特征弄没；缺的是版本面的表达。**

## 3. 真实证据：`drt_cn-us-ai-models-hardware` v2

盘上正在发生一次**证据扩张 rerun**，不是假设：

- `question.md` 有 `2026-10-22 v2 rerun 立项拍板`，写明同 bundle、模型轴加深、产出 `final/v2.md`；
- `plan.md` 是 **plan v2**（11 顶层节点，flat W legacy；命名问题另卡）；
- `evidence/` 从 v1 的 65 张扩到 **160 张**；
- run 根 `final.md` 已是 v2 当前稿；
- `final/` 只有 `v1.md`，**没有 `v2.md`**；
- HITL2 尚未拍板，`present` 仍是 v1；
- journal 明确记了“v1 已交付、同 bundle 证据扩张 rerun”。

结论：**rerun 路在**；但当前观察面无法表达“v1 已交付、v2 正在 rerun、final/v2 未成版”。

## 4. 视觉缺口

- 图谱头只有 `plan v2`，没有 `rerun` 状态；
- 没有 `plan/v1.md` 快照，旧 plan 被覆盖，无法画 v1→v2 diff；
- 状态页签可能显示“✅ 已交付”（v1）而当前 `final.md` 已是 v2 草稿；
- 终稿页签默认打开根 `final.md`，v2 未审稿可能被读成终稿；
- `final/ v2` 不存在时，`face.versions=1`，v2 rerun 在 UI 上没有版本徽标；
- 旧 run 的 legacy flat W 警告与 rerun 版本面混在一起，用户要自己分辨“是命名旧，还是版本旧”。

## 5. 提议

### 5.1 新增 plan 版本快照契约

```text
drt_<slug>/
  plan.md          # 当前 plan，唯一 canonical
  plan/
    v1.md          # 旧 plan 只读快照
    v2.md
```

- 每次 rerun / plan 重写前，Lead 把当前 `plan.md` 复制到 `plan/vN.md`；
- `plan.md` 仍是唯一当前版；旧 plan 只用于 diff/追溯；
- 表述修订（polish）不产生 plan 快照；
- 结构性 rerun 开新 bundle，不用同 bundle 快照；
- 没有快照的旧 bundle（含当前 v2）如实显示“无旧 plan 快照，不能 diff”，**不伪造旧图**。

### 5.2 `RunVersionFace`（只读投影）

从 `question.md` / `plan.md` / `plan/vN` / `final/` / `present` 计算：

```text
deliveredFinalVersion: 1
currentPlanVersion: 2
currentFinalDraft: v2（根 final.md 当前稿）
rerunKind: evidence-expansion | polish | structural | none
rerunState: none | in-progress | pending-hitl2 | delivered
planSnapshots: v1, v2
```

状态面不再只说“✅ 已交付”，而说：

```text
v1 已交付 · v2 证据扩张 rerun · HITL2 待审
```

### 5.3 终稿页签

- 默认打开**已交付的 v1**；
- v2 草稿单独标 `v2 草稿（未交付）`，可切换查看，不冒充终稿；
- `final/v2` 落账 + HITL2 拍板 + present 后，才把 v2 标为已交付。

### 5.4 图谱

- 顶部版本轨：

```text
run v1 已交付  →  run v2 证据扩张 rerun  ·  HITL2 待审
[ v1 ] [ v2 当前 ] [ 差异 ]
```

- 有 `plan/vN` 快照才可切版本；没有则只显示当前，注明“无旧图快照”；
- 差异模式：新增节点绿 `+` / 保留灰 / 退役墓碑或删除线 / 依赖变化琥珀 / 重编号
  `W2.1 → W3.2` alias chip；
- Wave 泳道保留（`WAVE 2 · 4 个并行`），差异模式显示 `+1 新增 / 2 保留 / 1 退役`；
- 顶部 banner 显示 `v2 草稿 / HITL2 待审`，不藏在详情；
- 结构性 rerun 不是同图 diff，而是 bundle 血缘条：
  `drt_old（v1 已交付） → drt_new（结构性 rerun）`；
- 图谱仍**只读**，不放“调整”按钮；调整走对话/HITL2 卡。

### 5.5 与 Wave 命名的关系

- 新 plan 的节点 ID 是 `W<wave>.<index>`；rerun 导致 Wave 变化时，按当前语义**重编号 + 旧号别名**；
- 图谱 diff 要把 alias 显示为 `W2.1 → W3.2`，不能静默当成两个不同节点；
- 当前 v2 的 flat W 是旧命名，不因本卡自动改写；本卡只修版本面，命名面另案。

## 6. 输掉的方案

- **只画当前 plan，不加快照**：省事，但无法回答“v1 哪里不对、v2 改了什么”；
- **从 journal/重写记录硬重建旧图**：不可靠，容易伪造节点/边；
- **把 v2 草稿当终稿展示**：违反 present 交付判据；
- **把 polish 也当证据扩张**：版本号会乱；
- **结构性 rerun 硬拼成同一张 DAG**：两个 bundle 的节点/证据/task 不可混；
- **在图谱里加“补研究”按钮**：观察面只读纪律；调整走对话/HITL2；
- **自动把旧 run 的 flat W 重编号**：会断 task 映射和旧反馈；标 legacy。

## 7. 待拍板（用户 + 第二 reviewer）

1. **是否接受 `plan/vN.md` 快照契约？** 没有它，图谱只能显示“当前 v2 + rerun 横幅”，不能真 diff。
2. **终稿页签默认打开哪个版本？** 推荐已交付 v1；v2 草稿单独切换。
3. **当前 `drt_cn-us` v2 没有 v1 plan 快照**：推荐如实显示“无快照，不能 diff”，不伪造。
4. **结构性 rerun 是否画 bundle 血缘条？** 推荐画轻量血缘，不把两图拼在一起。
5. **图谱是否保持只读（无“补研究”按钮）？** 推荐是；HITL2/对话是唯一入口。
6. **旧 flat W/N 与版本面混排时**：推荐先标 legacy 命名，再显示版本轨；不自动迁移。

## 8. 验收标准

- 当前 `drt_cn-us` v2 在状态面显示 `v1 已交付 · v2 rerun · HITL2 待审`（或等价的诚实三态）；
- `final` 页签默认 v1 交付；v2 草稿有明确未交付标记；
- 有 `plan/v1.md` + `plan/v2.md` 的 fixture 时，图谱可切换 v1/v2 并显示 diff 徽标；
- 无 plan 快照的旧 run 显示“无旧图快照”，不画假 diff；
- `plan/vN` 快照契约进入研究手册/NODES/模板/skill；`node-gate` 不误伤没有证据扩张的 v1；
- 两版本受控 E2E：v1 交付 → 同 bundle 补研究 → `final/v2` + present + 图谱 v2 已交付；
- keyless 测试覆盖 `RunVersionFace` / plan snapshots / diff；`client-load` 覆盖版本轨。

## 9. 测试资产与 E2E

- 新增 `tests/fixtures/run-rerun/`：`question.md`（v1/v2 decisions）、`plan/v1.md`、`plan/v2.md`、
  `final/v1.md`、`final/v2.md`、`final.md` v2、`review.md` PASS；
- 纯函数测试：`RunVersionFace` 三态、plan snapshot diff、polish 版本不变、structural lineage；
- 受控 E2E：用抛弃型 run 跑完 v1，再走“补研究”到 v2；不碰当前 `drt_cn-us`；
- 现成 in-flight v2 作为 `pending-hitl2` 真实样本（只读）。

## 10. 边界

- 不改 D17 的三种 rerun 语义；
- 不自动迁移旧 plan / 旧 flat W / N；
- 不新增 nested Team / 第二 store / 自动 rerun daemon；
- 不把“补研究”做成图谱按钮；
- 当前 `drt_cn-us` 的 v2 HITL2 由用户决定，本卡不代拍。

## 11. 去向

- 本卡先承载设计与待拍板项；用户 + 第二 reviewer 审后，按“契约 → 状态面 → 图谱 → 测试 → E2E”
  落。
- 实现后按 [notes/AGENTS.md](../../notes/AGENTS.md) 的 implemented 骨架沉淀 Note（决定 / 输掉的
  方案 / 实际验证）。
- 相关证据：[design/10 §1](../../docs/design/10-architecture.md)、[design/30 rerun 行](../../docs/design/30-methodology-mapping.md)、
  [design/40 图谱](../../docs/design/40-research-cockpit.md)、[research-planning skill](../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md)、
  [研究手册 AGENTS](../../research-workspace/AGENTS.md)、[question 模板](../../research-workspace/templates/run/question.md)、
  [run 指南](../../docs/guides/61-run-playbook.md)、[状态页签](../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx)、
  [图谱页签](../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx)。
