---
name: exploratory-verification
description: Use when regression is green but the new behavior's input space is not enumerated — a new parser/judgment/state machine, a batch of "silent fail-open" bugs, or a post-release "what did we not test?" sweep; covers the E1–E6 loop, charter template, four-state outcomes, and graduation into class-level guards.
---

# 探索性验证：从「回归绿」到「找出静默做错的事」

本技能是 **guidance**，不是 checklist。策略总图 = [guides/67](../../../docs/guides/67-test-strategy.md)；
类级守卫形态 = [class-level-guards](../../../_backlog/methods/class-level-guards.md)；探针 = [guides/66](../../../docs/guides/66-probe-playbook.md)；
历史协议与逐轮实录 = [探索卡](../../../_backlog/issues/2026-11-11-exploratory-test-strategy.md)。

## 1. 什么时候用

- 新机制/新判据/新解析器落地，回归只覆盖了 happy path；
- 一批 BUG 有共同气味（静默接受、邻接变体、消费者遗漏、双份事实）；
- 发布后问「哪些输入我们根本没写进测试」；
- 同类复发第 2 次——先探索一类，再考虑加门禁。

**不用**：纯算术/纯折算；已由静态契约穷尽的封闭枚举；只是想把已知的一条测试补绿。

## 2. E1–E6 循环

### E1 变更面盘点（git 驱动，0 模型）

`git diff --stat <上一探索锚点>..HEAD` → 按**机制**归组（不是按文件）→ 每条机制一个候选面。
优先级 ≈ 近期改动量 × 合同/散文密度 × 现有证据薄度 ÷ 证据成本。上一锚点 = 最近探索卡/发布 tag。

### E2 最低可观察层

纯函数 → L0 门禁/契约 → L1 真挂载 → 回放 → 探针 → L4。**默认往下走**：能在纯函数层证伪的命题，
不许用探针/L4 回答；到最低层无发现 → 记「关闭假设」，不升级。

### E3 四条无规格 oracle

1. **散文合同变异**：把 docs/审计里「必须红 / 不得静默」逐字变成输入；绿 = fail-open 候选。
2. **表示层差分**：同一事实的两份副本逐字段对账；漂移 = 观察/bug。
3. **回放差分**：直接跑 `snapshot-replay.entry --layers a,b`；diff 说明改动进了哪个模型可见面。
4. **后验取证**：既有会话/bundle 是免费样本（`session-events`、`stream-diagnostics`、
   `run-inventory`、`unconsumed-evidence`）；只记计数/分布，不下单场结论。

### E4 探针加速（三条，不是「更小的 E2E」）

- **降级**：先压到能回答它的最低层；
- **放大**：一支探针 = 一次 boot + N 个场景（把候选变异塞进同一次 boot）；
- **取证复用**：`llm-stream-tee` / `session-replay` / `scene-capture` 对既有会话做事后归因。

### E5 charter 纪律

一条 charter = 一条可被证伪的命题，写清七件（缺一不跑）：

```
ID｜假设（要杀死的命题）｜最低可观察层｜oracle 与变异/场景｜预算｜停止条件｜证据落点
```

一条只证一个命题；每轮至少一条负对照（已知该红的输入），防矩阵退化成「永远绿」。

### E6 分诊与毕业（强制）

| 判定 | 去向 |
|---|---|
| 真缺陷（有红/绿或复现） | `_backlog/bugs/` 卡 → 修复 → 类级守卫或显式不可机械化 |
| 可机械化的一类 fail-open | 先注入回归看红 → 还原 → 写矩阵/契约 → 登记台账 |
| 文档/命名漂移 | 观察 + owner，不在探索卡里顺手改 |
| 契约歧义 | 用户/D 号，不擅自选一边 |
| 空假设（探索过、没发现） | 记「已探索、无发现」+ 日期；**不写「没有 bug」** |

**毕业判据**：每轮结束更新失败类账本（类 → 案例 → 守卫 → 缺口）；发现只落 bug 卡不落守卫 =
未完成。类级守卫方法见 [class-level-guards](../../../_backlog/methods/class-level-guards.md)。

## 3. 预算与停止

- 默认 keyless 批：一个探索轮 ≈ 半天，0 次模型调用；真模型批单独授权、单独预算。
- 停止 = 预算耗尽 + 覆盖地图无空格 + 收益递减；不是「找到几个 bug 就停」。
- 证据落 `runtime/`（gitignored）；只有要冻结成金样/常驻守卫才进 `snapshots/`/`tests/`。

## 4. 证据放置

- 纯函数/判据变异 → `tests/{run,cockpit,pack,contracts}/**/*.spec.mjs`；
- 门禁自身 → `tests/checks/*.test.mjs`；
- 真进程 → `scripts/smoke/*.e2e.mjs`；真浏览器/profile/tarball → `*.entry.mjs`；
- 单点真实边界 → `probes/`（头注六字段 + 索引）；一次性实验 → `_backlog`/`runtime/`，复现第二次才升格。

## 5. 反模式

- 用探索代替回归，或把探索发现直接塞进回归（实例修）；
- 在最低层能答的问题上跑 L4；用模型自述当证据；
- 只写 bug 卡不写守卫；只写守卫不登记失败类账本；
- 把「没找到」写成「没有 bug」；把空假设当毕业。
