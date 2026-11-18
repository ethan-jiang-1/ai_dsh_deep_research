> 状态：implemented

# 门禁自测的范围：选择面 + fixture 复用（日常轻、发布重）

> 2026-11-18 ｜ 决定载体：[_backlog 卡](../../_backlog/_archived/settled_issues/2026-11-18-gate-self-test-cost.md) ｜ 影响面：`checks/smoke/gates.e2e.mjs`、`checks/lib/harness/gates-cli.mjs`、guides/60 任务型路由

## 决定

`gates.e2e` 拆成三个可分辨的 scope，并且**日常迭代不跑发布档**：

- **选择面**：新增 `--gate=<门禁名[,名]>`，按案例表每行已有的 `gate` 字段过滤（零新映射）；
  `--case` 保留，两者同时给取交集。改哪道门禁就跑哪道门禁的案例；省略两个 flag = 全量。
  未登记门禁、无注入案例的门禁（`NO_CASE_GATES`）、交集为空三种情况都 exit 2 并点名。
- **建仓面**：一案例一克隆改为一组 worker 各持一份**已 commit** 的基线 fixture；每案例前
  `git reset --hard` + `git clean -fdx` + 断言工作树干净（不干净 fail-loud，只会假红不会假绿），
  失败现场另存副本。复位全程异步（同步版会把并发压回串行——实测差 2×）。
- **档位**：日常 commit = hook 的 verify + tests（不跑本件、不为一次 commit 等 CI）；改门禁 =
  `--gate`（十几秒）；发布/nightly = 全量。分层正本 = [guides/60 §门禁分层](../../docs/guides/60-dev-loop.md)。

为什么这样切：案例的断言只有一条（目标门禁在注入后点名报红），所以按门禁选择不损失判据；
真正的成本在每案例一次整树克隆（tracked 全树 + git 索引重建），不在门禁执行。`--only` 不是解法：
它只过滤输出，门禁全跑。

## 输掉的方案

- **用 `--only=<gate>` 收窄执行**：`--only` 只过滤 `fail()` 收集，全部门禁照跑；实测与全量同价。
  要真省时得改 `--only` 的既有合同并给每道门禁加跳过守卫，改造面远大于收益。重估条件 = 发布门
  全量仍显著超预算且选择面已用尽。
- **异步克隆 + `jobs=availableParallelism`**：实测更慢（10 并发下每案例 13.6s）。该负载受 I/O 限制，
  并发只加剧争抢；减少克隆次数才是杠杆。
- **按门禁批处理**（多个 mutation 塞进一份 fixture）：省的是 verify 次数，牺牲的是隔离与可诊断性，
  正好落在最需要可信的地方；fixture 复位已拿到同样的收益。
- **按 (gate 源 hash, case id, fixture hash) 缓存 PASS**：源依赖闭包算漏 = 假绿，且不能替代发布门。

## 实际跑过的验证

- **受控 A/B（同一时段、交替跑、同 40 例子集、jobs=4）**：旧驱动 70.2s / 66.1s（sys ≈ 59s），
  新驱动 30.8s / 30.1s（sys ≈ 27s），**2.2×**；两轮均 0 失败。差别几乎全在 sys（整树拷贝），
  user 时间持平——证明省的是建仓而不是判据。
- **全量**：旧驱动 237.6s；新驱动全量跑通、对照组与全部注入案例 0 失败（交付版实测 182.9s，
  机器 load avg ≈ 33；绝对值受同机其它负载支配，不可跨时段比较——判据看上面的受控 A/B）。
- **选择面路径**：`--gate=md-links`（6 例 + 1 对照）、`--gate=note-status,doc-paths,md-links`
  （15 例 + 1 对照，含删除型 mutation）全绿；`--gate=<无案例门禁>` / 未登记门禁 / 交集为空均
  exit 2 并点名；`--case` 与原行为一致。
- **机械面**：`pnpm verify` 当轮全绿；`tests/run/harness/gates-cli.spec.mjs` 覆盖 `--gate` 两种形状
  与空值/缺值/空项（含 `--gate` 与 `--case` 并存）。交付时工作树另有两道红（`dist-freshness` /
  `guard-red-record`），来自并行会话的未提交改动，与本变更无关。
- 备注：fixture 由 `git ls-files` + 工作树内容构建，**别的会话未提交的改动会进 fixture**（本轮
  验证时另一会话在改测试与卡，正对照因此红过一次）——这是既有性质，不是复用的副作用；工作树
  本身红时先修树再跑。
