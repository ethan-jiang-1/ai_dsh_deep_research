# RFC：立意图载体总图页（`09-intake` 等价物）——治"backlog↔notes 衔接靠人肉字符串"

> 状态：proposed

出处 = 推敲卡 [2026-10-08-sdlc-reference-absorption](../../_backlog/_done/_closed_plans/2026-10-08-sdlc-reference-absorption.md)
（§候选与取舍 第一档 C2 + §逐面 gap 表 B 面）。判断材料全文住卡。

## Problem

推敲卡实测坐实的症状②：**链接靠人肉字符串，北星文档缺席**。

两处实证：

1. `verify.mjs:365-367` 的 `proposal-scheduled` 判归宿用的是 `queue.includes(stem)`
   ——**子串测试**：RFC 的 slug 只要在 `queue.md` 的 prose 里被提一句就算"有归宿"，不需要
   真有一行队列条目（推敲卡 §二轮复核 已实证：孤儿 RFC 的 slug 只出现在散文里即通过）；
2. **本仓没有 DSH `09-intake` 的 intent-carrier 总图**——`Issue 模板 / Project 状态机 /
   意图载体清单`一个没有，且 `.github/` 目录不存在（有意简化，但**等价物缺席**）。

后果不是"少一页文档"，而是**每类意图载体的 owner、进门条件、出场方式散在四处**
（根 `AGENTS.md` §布局 说一半、`_backlog/README.md` 说一半、`notes/README.md` 说一半、
`guides/60 §0` 说一半），**没有任何单页给出总图**。这正是本轮 C17/C18 修的同一个病在文档层
的形态：**没有唯一 owner 的事实会漂**。

**现在有原料了**：本轮落地的 `align-ledger` 两层结构（`liveness` 机械 / `reReviewOn`
声明）就是一个现成范例——"哪些判断归机械、哪些如实标为声明"。C2 在此刻写，比二轮复核
之前写要准。

## 方案

新建 `docs/design/60-intent-carriers.md`，内容 = 本仓的意图载体总图：

**① 载体清单表**（每行 = 一个载体：owner / 载什么事实 / 进门条件 / 出场方式）

| 载体（本仓） | 对应参考卷 `09` 的载体 | 拥有的唯一事实 |
|---|---|---|
| `_backlog/queue.md` §队列行 | Project 条目 | 次序与"当前"（▶） |
| `_backlog/plans/` 推敲卡 | —（本仓特有） | 判断材料（该不该/何时/次序/放弃） |
| `_backlog/bugs/` 缺陷卡 | Bug Issue 模板 | 已发现不当场修的缺陷 |
| `_backlog/reference/` | —（本仓特有） | 喂卡的调研证据面 |
| `notes/proposed/` RFC | proposed Note | 条目的问题/方案/输掉的方案/验收全文 |
| `notes/implemented/` | 合并后关闭的 Issue | 已交付的决定与证据 |
| 代码 TODO / degraded 观察项 | 代码 TODO / Dependabot | 就地标注的待办 |

**② 状态机图 + 与参考卷的差异声明**：本仓是文件约定（无事件驱动），参考卷 `09 §4` 是
`Inbox→Backlog→Ready→In progress→In review→Done/No action` 六态事件驱动。**如实标注差异**
（本仓有意简化的部分、以及"是否要状态机"作为未决点），不假装同构。

**③ 一句话分流接口**：指回根 `AGENTS.md` §入口链（"用它" vs "改它"）与
`_backlog/README.md` §主干——**本页只做总图，不复制规则正文**（一处事实一个家；根
`AGENTS.md` 的 `doc-budgets` 纪律同精神）。

## 输掉的方案

- **把总图写进根 `AGENTS.md`**：根文件是"每轮常驻指令"，受 `doc-budgets` 硬上限（140 行，
  见 `scripts/doc-budgets.json`）；总图是**按需查阅**的地图，不是每轮在场判据。写进去必然
  又要走"下放 > 压缩 > 升顶"的处置序，而正解就是下放到 `docs/design/`。
- **新建 `docs/design/70-*`**：`docs/design/` 现有 10–50 编号段；60 是空位且语义合适
  （意图入口层在架构层之后、指南层之前）。落笔时核对实际编号占用，不撞号。
- **同时修 `proposal-scheduled` 的子串测试洞**：那是**改门禁**（性质不同、需反证、需登记
  `evaluation.md`），且它治的是"机械面判归宿"，本 RFC 治的是"人读的北星页"。**不夹带**——
  子串洞另立小条目（推敲卡 §逐面 gap 表 B 面已记，属"回写不夹带"该回缓冲的那类）。
- **照抄参考卷的六态状态机**：本仓是单人仓 + 文件约定，没有事件源；引入六态会得到一套
  无人更新、无门禁可咬的标签。参考卷 `00-index.md:5` 自己写明独立插件仓不继承主仓制度。
- **把 `docs/00-index.md` 的 D 号台账当总图**：D 号记的是**已作出的决定**（历史），
  意图载体总图记的是**意图从哪进、从哪出**（当前结构）。两者是不同事实。

## 验收判据

| # | 判据 | 检查方式 |
|---|---|---|
| 1 | 新页在场且列出**全部**实际载体，逐个有 owner / 进门条件 / 出场方式三列 | 人工判据：与 `_backlog/README.md` §目录 + `notes/README.md` 时态表逐一对照，无载体遗漏 |
| 2 | 与参考卷 `09` 的**差异显式声明**（本仓无事件驱动状态机等），不假装同构 | 人工判据：页面须有"与参考卷差异"节 |
| 3 | **不复制**规则正文——规则仍住各自 owner 文件，本页只链接 | 人工判据：抽查每条规则句，确认其正本仍在原文件（防"第二份事实"） |
| 4 | 页内所有链接可解析 | **机械门禁**：`md-links` + `md-anchors` 全绿 |
| 5 | 页内不出现时变状态（"当前条目是 X"） | **机械门禁**：`doc-now-only` 全绿（D13：docs 只写 now，全仓唯一"当前"= queue ▶） |
| 6 | 新页被入口链或索引页指到（否则是孤儿页，无人会读到） | 人工判据：`docs/00-index.md` 的文档地图须含该页一行 |
| 7 | 根 `AGENTS.md` 等受限文件**未被撑超预算** | **机械门禁**：`doc-budgets` 全绿 |

判据 6 针对本仓已实证的失败形态：本轮推敲卡记录了"没通读 `discipline-map.md`"的方法论
漏洞——**文档在场 ≠ 文档被读到**。新页必须有入口指针。

## 影响面

- 新增：`docs/design/60-intent-carriers.md`
- 同步：`docs/00-index.md` 文档地图加一行（判据 6）
- 不改：`verify.mjs`、`evaluation.md`、`tests/`、`notes/` 树、pack 面
- 证据档：L0（`pnpm verify`——本 RFC 是纯文档，`md-links`/`md-anchors`/`doc-now-only`/
  `doc-budgets` 四道门禁即其机械面）
