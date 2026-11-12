---
status: 待落地
opened: 2026-11-13
---

# 推敲：判据形状迁移 II——人工走查、method heading、version/present

> 立卡：2026-11-13 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> **一句话**：把第一张迁移卡队列里的三个判据面——`acceptance.md` 人工走查节、方法库 heading、版本/present
> 散文解析——按 D51 同一模式收口：结构化位置优先，歧义即红，散文只做副本。
>
> 去向：implemented — `notes/implemented/2026-11-13-verdict-shape.md`（第一张卡的 Note 续记验证）

**问题与期望结果：** 第一张卡把 readiness / HITL2 两族从「猜判定」迁到「结构位置 + 事件链」。同类的
三处仍是散文判定：① 人工走查节靠标题词表识别，重跑验收会整节丢失（BUG-062/145/155 的类）；② 方法库
heading 的 fold 与写路径各有一套空白/括号口径（BUG-081/083/093/123/124/127/128/138 的类）；③ 版本/present
靠正文 `vN` 解析（BUG-101/102/103/112/116/125 的类），而 `delivered.json` 与 `deliverables/presented`
事件已是结构化事实。期望：三处各自只剩一个结构来源；读不出/互斥 = 红；旧形态不静默猜测。

**当前情况：**

- 人工走查：`run-receipt.mjs` 的 `MANUAL_TITLE` 以标题词表识别节，节尾取文件尾；标题变体是历史 bug 源。
- method heading：`library-fold` 与写路径（upsert/clear/set）各自解析标题；全半角括号、U+3000、段间空白
  的修复是逐实例补的。
- version/present：`planVersionsOf` / `latestPresentedFinalVersion` / `finalPathOf` 读正文；结构化事实
  （present 事件、`delivered.json`）只在部分消费点使用。
- 基线：`verify` + `pnpm test` 全绿、`typecheck` 绿（第一张卡收口时点）。

**未决问题：** 三面的验收顺序（建议 人工走查 → method heading → version/present，由小到大）；
version/present 是否要为此改驾驶舱投影的读数路径（客户端读 review/plan，不经 gate）。

## 方案与取舍

| 面 | 结构来源 | 收口判据 | 输掉的方案 |
|---|---|---|---|
| 人工走查 | 显式标记 `<!-- manual-walkthrough:start/end -->` | 无标记的节不保留（红/明示），标记在重生成/`--repair` 中原样保留；模板教写入者 | 继续扩标题词表（同类第 4 次修复） |
| method heading | 单一 heading codec（归一空白/括号宽度/全角空格），fold 与写路径共用 | 变异矩阵全绿；两侧对同一 heading 的解析逐字一致 | 两侧各补正则 |
| version/present | `deliverables/presented` 事件 + `delivered.json` | 有结构化事实时不用正文；正文只在无结构化事实的旧场回退，歧义即红 | 继续修正文解析（每形态一张卡） |

## 验收标准

| # | 行为 | 类 | 判据 | 证据 owner |
|---|---|---|---|---|
| 1 | 人工走查节由显式标记界定 | 确定性逻辑 | 无标记节不被 `withManualEvidence` 保留（明示拒绝）；有标记节跨重生成/`--repair` 逐字保留 | `tests/run/run-receipt.test.mjs` |
| 2 | 方法库 heading 单一 codec | 确定性逻辑 | fold 与 upsert 对括号宽度/全角空格/段间空白同判；变异矩阵全绿 | `tests/cockpit/library-fold.test.mjs` + 写路径测试 |
| 3 | 版本/present 结构化优先 | 确定性逻辑 | 有 present 事件/`delivered.json` 时正文 `vN` 不影响判定；无结构化事实的旧场回退且歧义即红 | `tests/run/run-context*.test.mjs` + `final-target` |
| 4 | 三面各有常驻变异矩阵 | 确定性逻辑 | 与第一张卡同形（不变量 + 生成组合），不靠手写例子 | `tests/contracts/` |
| 5 | 全绿证据 | 机械 | `verify` + `test` + `typecheck` 全绿；动到模型可见面时补 replay/l4-lite | 命令输出 |

## 关闭条件

- 验收 1–4 绿；验收 5 有实际输出。
- Note 验证节追加三面证据；审查记录落卡尾。
- 归档同变更。

## 队列

- 第一张卡（已归档）= [判据形状迁移](../_archived/settled_issues/2026-11-13-verdict-shape-migration.md)。
