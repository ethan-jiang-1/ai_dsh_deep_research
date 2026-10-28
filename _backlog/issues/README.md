# issues/ · 还没结束的问题

一文件一张卡。先找已有问题，用户点名后再推敲；缺陷记在 [bugs](../bugs/README.md)。完整流程与关闭条件在 [backlog 入口](../README.md)；本区子树指令 = [门牌](../AGENTS.md)。

## 活跃清单



## 最近归档

- [2026-10-28 方法库页内对话共创](../_archived/settled_issues/2026-10-28-method-library-cocreation.md) — implemented：页内三栏 + 方法编辑 preset + 草稿回填 + 保存闭环；证据 = 调研 §14 + `runtime/probe-save/artifacts/2026-10-28T14-47-08-504Z/`。

最近三条（更早 = [settled 池索引](../_archived/settled_issues/README.md)，逐卡一行；本区不重复维护）：

（[2026-10-28 数据面收口](../_archived/settled_issues/2026-10-28-data-plane-hardening.md) 已结：FAQ 24 对账 → D32–D36；回执三态 / 原生时钟 / 整数契约 + created / 可移植列 / 种子 policy；自审补见证下界回归；P2 与 W/D 同路径转触发器；[Note](../../notes/implemented/2026-10-28-data-plane-hardening.md)。）

（[2026-10-27 复核后硬化](../_archived/settled_issues/2026-10-27-post-review-hardening.md) 已结：run-accept 全链 smoke + 数据卡形状 + 秘密模式扩展；P2.4/P2.5/P3 转触发器。）

（[2026-10-27 发布前数据契约](../_archived/settled_issues/2026-10-27-release-data-contract.md) 已结：FAQ 26 对账 → 数据卡/回执路径/种子 schema/N2 披露/秘密扫描；D1–D4 全采纳；[Note](../../notes/implemented/2026-10-27-release-data-contract.md)。）

（2026-10-25 运行形态合同组已结归档：[合同](../_archived/settled_issues/2026-10-25-run-form-contract.md)、[分发](../_archived/settled_issues/2026-10-25-distribution-contract.md)、[工作区](../_archived/settled_issues/2026-10-25-workspace-ownership-and-upgrade.md)、[数据边界](../_archived/settled_issues/2026-10-25-runtime-data-boundary.md)、[独立启动](../_archived/settled_issues/2026-10-25-standalone-cold-start.md)；残余逐卡记录。）

## 写一张卡

文件名为 `YYYY-MM-DD-<slug>.md`。开头先让下一位读者知道：解决什么、现在什么情况、还缺什么、下一步是什么。讨论中的事实、假设和建议分别写清，历史推演放在当前情况之后。

新卡参考下面的骨架；简单问题可以简写。`Feature` 表示可观察行为会变，`Task` 表示要交出代码、文档、配置或结论；还分不清就写 `未定`，旧卡不回填类型。

```markdown
---
status: 推敲中
opened: YYYY-MM-DD
---

# 推敲：<标题>

> 立卡：YYYY-MM-DD ｜ 状态：推敲中 ｜ 类型：未定 ｜ 结论倾向：未定 ｜ 可关闭：否

**问题与期望结果：** 什么情况引出问题，用户应得到什么，怎么算完成。
**当前情况：** 已经确定什么。
**未决问题：** 还缺什么事实或选择。
**下一步：** 谁来做什么，或等待什么具体条件。

## 已知与未决

## 方案与取舍

## 验收标准

## 关闭条件
```

**结论倾向**是状态行上的闭集头（`pnpm verify` 检查）：`未定 | 现在做 | 以后做 | 不做 | 并入已有`，头后可跟自由说明。它把推敲期的出口先命名，是倾向不是状态——frontmatter `status` 仍是当前阶段的唯一家。各倾向关闭时要落的东西：

| 倾向 | 关闭时在场 | 典型去向 |
|---|---|---|
| 现在做 | `## 验收标准`（[验收设计](../methods/validation-design.md)）+ 方案与取舍 | `proposed`（需实施前评审）或 `implemented`（交付时） |
| 以后做 | 延后理由 + 可观察的重议条件 | `deferred`（owner = [triggers](../triggers.md) / owning note / 明确 none） |
| 不做 | 理由与适用范围 | `rejected`（有防复犯价值）或 `none` |
| 并入已有 | 指向已有决定或当前合同的链接 | `none` |
| 未定 | 推敲未到出口时的常态 | 不可关闭 |

`## 验收标准` 描述下游做成什么样算合格；backlog 关闭不要求这些未来检查已执行。业务验收归用户，技术证据归 agent——去向只决定理由住哪，不转移质量责任。具体选择与记录格式 = [结论去向](../methods/issue-to-note.md)。

## 入口两张票

与 bugs 共用同一道加工入口票（正本 = [入口](../README.md)）：**问题清楚** + **验收手段在场**——结论倾向为「现在做」时 `## 验收标准` 必写。

## 状态生命周期

frontmatter `status` 是当前阶段的唯一家；状态行 `状态：` 记号镜像它并拥有历史（结论追加、退出时记去向）。沉默不翻转；每次翻转带守卫与记录；退出值（已结/叫停）只在归档的同次变更里翻转；已结永不重开（复发 = 引用旧卡的新卡）。法则正本 = [入口](../README.md)。

| 从 | 守卫 | 到 | 谁 |
|---|---|---|---|
| （开卡） | 分流后——卡只在路由后存在 | 推敲中 | agent |
| 推敲中 | 下一步是用户选择（`下一步：` 写明具体问题） | 等人拍板 | agent |
| 等人拍板 | 用户的明确答复 | 推敲中，或退出 | 仅用户 |
| 推敲中 | 判断落地 + `去向` 已记录 | 已结（同次变更归档） | agent |
| 任意活跃值 | 用户叫停、无结论 | 叫停（归档） | 仅用户 |
| 叫停 | 用户明确的复活决定 | 推敲中 | 仅用户 |
| 已结 | 永不重开——复发 = 引用旧卡的新卡 | — | — |

## 范围与粒度

每张卡写清本轮讨论什么、哪些不讨论、期望结果和推敲完成条件。大而模糊的目标先在同卡画粗粒度决策依赖图：目标、已决、精确问题/前置、未展开范围和排除项。每个 session 推进一个需要人判断的分支，独立查证可并行。候选实施步骤留在同卡，只有可独立验证且确有必要时才列出，写结果、验收和真实前置；小问题不硬拆，步骤不是执行队列。

## 关闭或叫停

按 [入口的关闭条件](../README.md) 检查。结论确定后按 [结论去向](../methods/issue-to-note.md) 选一种去向，在状态行下记一行 `去向：<none|rejected|proposed|implemented|deferred> — <target>`，`implemented` 另记业务验收 owner；是否成为 note 由载体准入决定，不由“申请”决定。**实施绑定卡留活跃到交付**：`implemented` 与交付/决定关闭同一变更，不得先关后补。满足条件后，头部写 `可关闭：是` 并在同次改动中归档，不留在活跃清单。

- 有结论：用 `git mv` 进 [settled_issues](../_archived/settled_issues/README.md)，`status` 改为 `已结`，状态行补结论与去向。
- 被用户明确叫停、尚无结论：进 [suspended_issues](../_archived/suspended_issues/README.md)，`status` 改为 `叫停`。重新讨论需要用户明确的新决定。

搬迁保留文件名和讨论正文，修相对链接，更新两边清单。`pnpm verify` 检查清单、frontmatter、状态行镜像与结论倾向头，以及已声明可以关闭却仍留在活跃区的卡；旧字段保持兼容。

## frontmatter

新卡第一行是 `---`，字段按下面顺序：

```yaml
---
status: 推敲中
opened: YYYY-MM-DD
---
```

| 字段 | 内容 |
|---|---|
| `status` | 活跃区用 `推敲中`；等用户作选择时用 `等人拍板`。旧卡已经实施但验收未完成时仍用 `推敲中` |
| `opened` | 立卡日，与正文一致 |

离开目录时只改 frontmatter 的 `status`，其他字段保留。不把正文长说明复制进 frontmatter。

## 🔒 只有用户能判定触发

状态行带 🔒 的卡，agent 只报告和建议，不自行判定触发、删卡或实施。
