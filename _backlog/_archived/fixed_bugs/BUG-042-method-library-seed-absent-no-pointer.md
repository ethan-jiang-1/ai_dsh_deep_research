---
status: 已修
severity: P2
opened: 2026-10-19
---

# BUG-042：偏好库 `method-library.md` 从不播种、手册不指路——面板宣称"我的偏好库"而盘上无此文件

> 状态：**已修**（2026-10-19：四条修复判据全部达成，证据见 §实际跑过的验证；含一条新真模型档
> 探针 `method-library-probe.mjs` 作机器化证明）。
> 来历：用户在一次真 run 里要求「按我保存的研究偏好『领域地图』来做」，Lead 答"工作区根目录
> 不存在 method-library.md，读不到，改用内置预设"。
> 症状现场 = 用户观察面（研究配置页签 ③ 区）与 Lead 立项行为的不一致。

## 症状

用户在一次真 run 里说「本次研究请按我保存的研究偏好「领域地图」来做」。Lead 的回复里承认：

> 当前工作区根目录下不存在 `method-library.md`，也就是我读不到你保存的那条「领域地图」条目

三个可观察事实（本轮实测，非转述）：

1. **该 run 的工作区根 `research-workspace/method-library.md` 客观存在**，且内容可读（只有一条
   「格局调研」）。Lead 报的"不存在"与盘上状态不符。
2. **`method-library.md` 不在 pack 的播种种子里**：`packages/deep-research-pack/workspace/` 只有
   `AGENTS.md` / `NODES.md` / `question-patterns.md` / `templates/`；`scripts/scaffold.mjs` 把这些
   原样铺进工作区。**所以全新安装 + 首次运行，这个文件必然不存在**，Lead 探测不到是必然结果。
3. **模型可见的手册不指路**：种子里 `AGENTS.md` 与 `NODES.md` 对 `method-library` / 偏好库
   **零命中**。唯一提到它的地方是 lead preset 与 `research-brief` skill 的一句括号
   （「会话 cwd 根有 `method-library.md` 则先读作方法推荐参考」）。

## 为什么是缺陷（用户裁定 + 本仓自己的内部矛盾）

判定依据不是"契约没写"，而是**产品自相矛盾**：

- 观察面（研究配置页签 ③「我的偏好库」）向用户宣示"你有偏好库、它在这儿、可以管"；
- 而同一时刻盘上可能根本没有这个文件，也没有任何种子、模板或手册指引告诉用户**去哪建、按什么格式建**；
- 用户对"我的偏好库"的唯一感知入口 = 那个面板；面板不给路，盘上又没有 → **功能事实上不可用**。

本仓已有代码承认空态是**正常**状态，但"正常空态"不等于"应当缺席文件"：

```
tests/library-fold.test.mjs:256  'absent'     = 文件不在 = 新工作区的正常空态（不是失败）
tests/library-fold.test.mjs:257  'unreadable' = 在而读不回 = 如实报读不到，不冒充"正在读取"
```

`libraryReadStateOf()` 的三态（`ok` / `absent` / `unreadable`）已经在观察面落地；**但 Lead 立项时
走的还是旧的 glob 探测路径**，没有复用这套三态。同一概念两处实现分叉 = 缺陷。

## 根因假设（待证据确认）

- **H1（主）**：种子缺文件 + 手册缺指路 → 新工作区必然无库、模型无从得知该去哪找。
  证据强度：强（种子目录与手册 grep 本轮实测）。
- **H2（次）**：Lead 报"glob 零命中"与盘上文件存在冲突，可能探测 cwd 不是工作区根，
  或 glob 实现/权限问题。**未验证**——需该 run 的 journal 与会话 cwd 实况。
  同现象已在 `runtime/smoke-workspace/entry-draft-ws/drt_anthropic-claude-release-line/journal.md:35`
  与 `runtime/smoke-workspace/drt_everest-elevation/journal.md:7` 出现过，均为"零命中 → 跳过"。
- **H3**：库里本来就没有叫「领域地图」的条目（实测 grep 零命中）——**这不是缺陷**，是用户记错了
  名字或那条偏好从未存过。与 H1/H2 正交，需在修复后向用户澄清。

## 牵出的失败类

**"正常空态"被实现成"文件缺席"而非"空架子"**：任何"用户资产型"文件（偏好库、笔记库、模板库）
若不在种子里，新用户永远见不到它，功能名存实亡。本卡是这一类问题的第一个实例。

## 修复判据

1. `packages/deep-research-pack/workspace/method-library.md` 播种存在：标题 + 四字段模板 +
   管理动词说明 + 一行"暂无偏好"的合法空态记录；`scaffold.mjs` 铺种子后**该文件在场**。
2. 种子 `AGENTS.md` 增加一行指路：偏好库在本工作区根、四字段格式、怎么存怎么用——
   **模型在手册层就能知道**，不依赖 skill 括号里的一句。
3. Lead 立项的库探测复用 `libraryReadStateOf()` 三态；`unreadable` 如实报"文件在但读不到"，
   `absent` 不再降级成"没偏好"而不告知用户。
4. 端到端验证：全新工作区 scaffold → 库文件在场 → 一个真/裸挂载档 run 的 Lead 能说出
   库的路径与当前条目数。

## 修法（已落地）

1. **播种**：新增 `packages/deep-research-pack/workspace/method-library.md`——合法空架子（标题 +
   四字段说明 + 管理动词 + 用法引导 + **注释内的示例模板** + 变更记录位）。`scaffold.mjs` 按
   `.md` 自动收集，无需改收集器（实测种子由 10 → 11 个）。
2. **手册指路**：`research-workspace/AGENTS.md` 目录表新增 `method-library.md` 行（**三态**：
   在场→用 / 缺席→说"还没存过偏好"（别静默）/ 读不回→如实说"文件在但读不到"及原因，绝不降级
   成"没有偏好"；点名条目不在库里 → 明说，不声称"已按该偏好执行"）。同步进 pack 种子。
3. **Skill + preset 同钉**：`research-brief` SKILL.md 的库探测段重写为三态；lead preset 的内联
   副本同步（**模型实际看到的那份**是 preset 内联文本，两处必须一致）。
4. **门禁**：`dev/sync-pack-workspace.mjs` 增"独立种子"守卫——该文件**不参与正本同步**（否则
   一个人的偏好会被传播进所有人的新工作区），但把守三件事：在场、注释外无个人条目、四字段骨架
   完整；并在孤儿对账**之前**登记豁免（否则会被当"源侧已删"删掉）。

## 实际跑过的验证

| 档 | 结果 |
|---|---|
| `pnpm verify` | **全绿**（含 `pack-workspace-fresh`；手册压到 127 行，预算内） |
| `pnpm test` | **542/542 pass** |
| 种子门禁**反证** | 注入"含个人条目"→ 红（`含个人条目，种子必须是空架子`）；删除文件 → 红（`包内缺席`）；复原 → 绿 |
| `scaffold.mjs` 真落盘（`/tmp/scaf-test`） | 种子 **11 个**，`method-library.md` 在场；注释外条目 **0**、四字段骨架 **全中** |
| `preset-smoke --real`（L1 真挂载） | **ALL PASS**——四个 preset 全部真挂载绿（skill 文本改动未破坏挂载） |
| **`method-library-probe.mjs`（新，真模型档）** | **ALL PASS 3/3**——① 说出 `method-library.md` 与"工作区根"位置；② 报"现有 0 条"且**自己识别出示例条目在 HTML 注释里不算条目**；③ 如实说「领域地图」不在库、**不声称已按它执行** |
| 探针**反证** | 移走种子 → `FAIL 种子里没有 method-library.md`（前置断言拦得住） |

**判据逐条对照**：①播种 ✅（scaffold 真落盘 + 门禁把守）②手册指路 ✅（目录表 + 三态）③三态复用 ✅
（skill/preset/手册同钉）④端到端 ✅（探针 ALL PASS，含"模型自己数出 0 条"这一非预期但更强的证据）。

**H2 就地闭合**：Lead 当初报"glob 零命中"而文件确实在场——现在探测判据从"glob 有没有命中"
改成"文件在不在 + 读不读得回"的三态，`unreadable` 不再被降级成"没有偏好"。原假设保留为历史。

**H3 澄清（待用户）**：库里确实没有「领域地图」这条，属用户侧命名/未存，非缺陷。修复后 Lead 会
明说"库里没有这个名字、当前有这些条目"，不再让用户以为偏好已生效。
