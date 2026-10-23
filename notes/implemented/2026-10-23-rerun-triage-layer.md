# rerun 不满转接层——用户说法 ↔ 我们的手段（已落地）

> 状态：implemented

> 落地 2026-10-23 ｜ 锚点卡 = [_backlog/issues/2026-10-23-rerun-dissatisfaction-triage.md](../../_backlog/_archived/settled_issues/2026-10-23-rerun-dissatisfaction-triage.md)
> ｜ 前身：[rerun 版本面](2026-10-23-rerun-version-face.md)（说清"有几版/交的是哪版"）· [D17 三形态](../../docs/decisions.md)
> ｜ 影响面：lead persona、synthesis skill、新 rerun-triage skill、final 模板、研究手册、驾驶舱两处渲染

## 问题

用户对交付不满时说的是人话（太浅 / 方向不对 / 太长 / 不信来源），系统只会回自己的三种词
（定稿 / 补研究 / 修订表述）。中间缺一层**转接**：用户说法 → 诉求类别 → 可用手段（产出 / 代价 /
什么不变）→ 一句能直接说的话。七块既有半成品各覆盖一角：D17 定语义不翻译、图例只复述后果、
HITL2 卡没有"你为什么不满意"的入口、结构性重跑不在卡上、交付后无入口。

## 决定

1. **L1 词表住新 skill**（`presets/lead/skills/rerun-triage`）：七类说法逐行给出手段 / 产出代价 /
   不变项，外加五条对话纪律（先复述再分类、至多两个手段 + 一句"不用重跑"、范围只从报告来、
   不动手、不自动分类）。persona 在 HITL2 与"用户表达不满"两处指向它——交付前/后都可能触发，
   独立 description 才能按需加载。
2. **L2 HITL2 三选项带后果**（逐字三处同源）：`定稿（按现稿交付）(Recommended)` /
   `补研究（补哪块看报告末节；会出新版本）` / `改说法（只改措辞，版本不变）`；题干末尾给
   「太浅 / 方向不对 / 太长」三个词，**不新增问题**；摘要 + 选项后果合计守 ≤200 字。
3. **L2 报告末节**：`final.md` 模板新增 `## 下一版优先项` 与 `## 什么会改变建议`；synthesis 把它
   写成完成判据（没有 = 未完成）；quick_factual 缩略为一行。
4. **L3 只读出口**：`src/lib/rerun-triage.ts` 单一文案常量（三行：补研究 / 改说法 / 另起一个
   bundle，各带版本后果 + 一句可复制的话）；状态页 ⑤（已交付时）与终稿页脚共用。观察面仍只读，
   无按钮、无动作 API（D18）。
5. **不碰既有合同**：不加交互点（仍 HITL1/HITL2 两点）、不做关键词分类、不自动 rerun、不改
   D17 三形态与版本记账。
6. **实施中发现并同批修复**：persona 的交付四步仍写 `present` 指 run 根 `final.md`（与 D28
   门②要求 `final/vN` 冲突）——改为"忠实复制为 final/vN 再 present"；HITL2 判型签名新增
   `定稿（按现稿交付）`，旧措辞 `按现稿定稿` 保留为历史别名（旧会话尾窗仍判成交付审阅）。

## 输掉的方案

- **观察面加 rerun 按钮**：D18 只读；rerun 是发起人向 Lead 的对话动作。
- **自然语言分类器 / 关键词路由**：抱怨说法长尾，机械分类必然误判；分类住模型。
- **新 HITL3 或 HITL2 加"不满类型"第一问**：+1 停靠、破 ≤200 字；先用措辞观察真实体感。
- **把结构性重跑塞进 HITL2 第四选项**：四项 + 每项后果会超字数并冲淡"审阅报告"这个时刻；
  由 Lead 在用户说"方向不对"时提出（sibling 预检 + 同意）。
- **另建"不满意工单"或第二套状态**：报告末节 + §Decisions 已是事实源。

## 实际跑过的验证

- **红先**：新契约测试 6/7 先红（三处同源 / 选项后果 / persona final/vN / 模板末节 / 技能在场 /
  两组件共用常量），实现后 10/10 绿；`hitl-fold` 判型新增测试（新措辞 → 交付审阅 pending，
  旧措辞仍判）。
- `pnpm verify`：全绿（含 `handbook-budget`、`pack-workspace-fresh`、`overlay-fresh`、
  `cockpit-doc-registry`）。
- `pnpm test`：**719 pass / 0 fail**（新增 rerun-triage 契约 7 + cockpit 3 + hitl-fold 1）。
- `snapshot-replay-smoke`：四角色真模型重录后 **4 场景 ALL PASS**（persona + 手册 + skill catalog
  三处模型可见面同批；`codeAnchor` = 录制时 HEAD）。
- `client-load-smoke`：终稿页脚与状态页 ⑤ 两处「还不满意？三种改法」折叠块均真浏览器 **PASS**
  （展开后可复制话术在场；切页签按显式内容有界等待，不读旧 DOM）——两处共用同一文案常量，
  契约测试钉 import。
- `preset-smoke`（`DSH_SMOKE_REAL=1`）：**4 个 preset 全部真挂载绿**；lead/scout/analyst/critic
  各自只看见自己的 skills（技能隔离随新 skill 一起成立）。
- **真模型探针**：`scripts/probe/rerun-triage-probe.mjs` **五条全中**——(a) 复述为"证据不足、
  不是方向错"；(b) 两个手段（补研究 / 改说法）；(c) 各自写出版本后果与代价；(d) 未确认前零
  写/派工/rerun 调用；(e) 范围引 `final.md` 末节两条 + findings gap。单次行为证据，不冒充长尾
  说法不误判。

## 边界

- 词表是**模型侧程序**，不是机械路由；五条纪律靠 skill 与 persona，机械面只钉三处文本同源与
  出口文案单一正本。
- 观察面只读：折叠块只给话术，不按钮化 rerun；用户照抄发给 Lead 才触发。
- 报告末节是"下一版候选"，不是承诺；写不进就标"未取得"。
- 旧 bundle 不迁移、不补末节；结构性重跑不改 HITL1。
