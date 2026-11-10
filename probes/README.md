# probes/ · 探针（调试第一入口）

> 真实边界上的单点机制/行为实验：不是单测，不是冒烟，也不是 E2E。它回答「某一个机制在这个
> 真实边界上是否按合同工作」，补的是单测与 E2E 之间的归因空白。
>
> **指南 = [../docs/guides/66-probe-playbook.md](../docs/guides/66-probe-playbook.md)**
> （什么时候用、怎么加、证据在哪、边界）。
> **索引 = [INDEX.generated.md](INDEX.generated.md)**（生成物，勿手改；重生成 =
> `node probes/_index.mjs --write`，校验 = `--check`）。

## 什么时候来

- 行为/纪律/入口链/GUI 可疑，先看索引里有没有现成探针；有就跑，别先上完整 run 或 E2E。
- 例：模型不按纪律回话 → `source dev/env.sh && node probes/behavior/discipline-probe.mjs`
  （真模型档；判据与「不证明」看头注；其余探针同理）。
- 一个 bug 只能靠 E2E/真 run 抓到 → 补一支探针，或写明为什么不做。
- 新机制第一次落地 → 按指南 §4 的顺序：先红、隔离/端口、证据落盘、登记索引。
- 一次性实验不进本目录：留 `_backlog` / `notes`；复现第二次才升格为入库探针。

## 目录（按失败面分域，域内平铺）

| 域 | 放什么 | 现有 |
|---|---|---|
| `behavior/` | 真模型行为：同一套 boot + RPC + 会话日志 harness | entry-chain / discipline / method-library / rerun-triage |
| `browser/` | 真浏览器交互：裸 CDP、GUI 场景 | cdp-probe |
| `stream/` | 流取证仪器：预载 tee，不判 PASS/FAIL | llm-stream-tee |
| 根 | 门户与生成物：`README.md` / `INDEX.generated.md` / `_index.mjs` | — |

域是一组**共享 harness、共享证据来源、共享失败模式**的机制；新探针先归现有域，确实不同再建新域。
域内平铺 `<mechanism>-probe.mjs`，不按 unit/integration 分。

头注是唯一事实源（`状态` / `一句话` / `何时跑` / `档位` / `判据` / `不证明`；`为什么存在`
推荐）。索引只投影，不复制长文；`probes/README.md` 只做门户，不手工枚举。
