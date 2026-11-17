# probes/ · 探针（调试第一入口）

> 维护面：**show**——装证据入口（`behavior/` `browser/` 探针、`analyze/` 只读取证投影、`stream/` 预载仪器），不装裁决（→ `checks/`）与持久改动（→ `tools/`）。`_index` 是生成器、stream tee 是驱动——非面（probe-index 按路径排除）；
> 规则 = [surface-contract](../docs/guides/68-surface-contract.md)。
>
> 两类件：**探针** = 真实边界上的单点机制/行为实验（给 PASS/FAIL），补单测与 E2E 之间的归因空白；
> **取证件**（`analyze/`）= 只读投影/诊断/回放（不判 PASS/FAIL）。
>
> **指南 = [../docs/guides/66-probe-playbook.md](../docs/guides/66-probe-playbook.md)**
> （什么时候用、怎么加、证据在哪、边界）。
> **索引 = [INDEX.generated.md](INDEX.generated.md)**（生成物，勿手改；重生成 =
> `node probes/_index.mjs --write`，校验 = `--check`）。

## 什么时候来

- 行为/纪律/入口链/GUI 可疑，先看索引里有没有现成探针；有就跑，别先上完整 run 或 E2E。
- 例：模型不按纪律回话 → `source tools/env.sh && node probes/behavior/discipline-probe.mjs`
  （真模型档；判据与「不证明」看头注；其余探针同理）。
- 一个 bug 只能靠 E2E/真 run 抓到 → 补一支探针，或写明为什么不做。
- 新机制第一次落地 → 按指南 §4 的顺序：先红、隔离/端口、证据落盘、登记索引。
- 一次性实验不进本目录：留 `_backlog` / `notes`；复现第二次才升格为入库探针。
- run 卡住、要复看历史会话、要数跨场分布 → 先看 `analyze/` 域的只读取证件（不判裁决，只出证据）。

## 目录（按失败面分域，域内平铺）

| 域 | 放什么 |
|---|---|
| `behavior/` | 真模型行为：同一套 boot + RPC + 会话日志 harness |
| `browser/` | 真浏览器交互：裸 CDP、GUI 场景 |
| `stream/` | 流取证仪器：预载 tee，不判 PASS/FAIL（非面驱动） |
| `analyze/` | run 现场与取证投影（只读）：状态盯场、会话事件、HTML 投影、流诊断、跨场分布、历史回放、场景包、保留期、差集 |
| 根 | 门户与生成物：`README.md` / `INDEX.generated.md` / `_index.mjs` |

域是一组**共享 harness、共享证据来源、共享失败模式**的机制；新探针先归现有域，确实不同再建新域。
命名：behavior/browser 域内平铺 `<mechanism>-probe.mjs`；analyze 域是观测器，用 `<mechanism>.mjs`（不判 PASS/FAIL）；stream 是仪器（`.cjs` 预载）。

头注是唯一事实源（`状态` / `一句话` / `何时跑` / `档位` / `判据` / `不证明`；`为什么存在`
推荐）；取证件同样六字段，`判据` 写「不适用（show）」。索引只投影，不复制长文；`probes/README.md` 只做门户，件名与件数以索引为准。
