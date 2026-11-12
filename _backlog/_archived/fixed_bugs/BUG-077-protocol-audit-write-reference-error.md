---
status: 已修
severity: P1
opened: 2026-11-12
---

# BUG-077：protocol-audit `--write` 崩溃（ReferenceError: PROTOCOL_CONTRACT_DATE）——run-accept 写报告阶段必败

> 严重级别：P1 ｜ 发现：2026-11-12 ｜ 状态：已修 — CLI 补 `PROTOCOL_CONTRACT_DATE` import；`--write` 恢复落盘含 v1 指纹；`run-accept-smoke` ALL PASS；新增源码契约测试防回归（2026-11-12，去向：none — 机械修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`scripts/run-gates/protocol-audit.mjs` 的 `renderReport`（第 71 行）。

## 症状

带有效 `protocol.json` 的 bundle 走 `run-accept` 时，预检全绿，但**写报告阶段**崩溃：

```
$ node scripts/run-gates/protocol-audit.mjs <bundle> --write
file:///…/scripts/run-gates/protocol-audit.mjs:71
    `> 契约日 ${PROTOCOL_CONTRACT_DATE}；bundle epoch = ${String(epoch)}；…
             ^
ReferenceError: PROTOCOL_CONTRACT_DATE is not defined
    at renderReport (…/protocol-audit.mjs:71:14)
    at …/protocol-audit.mjs:161:24
Node.js v22.23.1   (exit 1)
```

`--no-write` 正常（预检 PASS），所以问题只在**落盘路径**：`protocol-audit.md` 永远写不出，
`run-accept` 退出 1、不写 `delivered.json`/回执——**新契约 run 的验收被卡死**。

复现（合成 bundle 正则）：
`node scripts/smoke/run-accept-smoke.mjs` → **3 项失败**：

```
FAIL ⑩ 契约日后有效 protocol：run-accept 绿
FAIL ⑩ protocol-audit.md 落盘
FAIL smoke 未抛异常 — ENOENT: …/drt_proto/protocol-audit.md
```

（该冒烟是 keyless 全链回归；`pnpm test`/`verify` 不跑它，所以红了没被 L0 发现。）

## 根因（已证）

`PROTOCOL_CONTRACT_DATE` 在 `6a463a20`（presence-aware protocol/strategy projections）从 CLI 的
import 里被删掉（判定迁到 `protocol-audit-core.requiredByProtocolContract`），但 `renderReport`
的模板仍引用它：

```js
// 现 import（无 PROTOCOL_CONTRACT_DATE）
import { designSha256, preContractByDelivery } from '../lib/protocol-core.mjs'
import { evaluateBundle, requiredByProtocolContract } from '../lib/protocol-audit-core.mjs'
…
// 第 71 行仍用
`> 契约日 ${PROTOCOL_CONTRACT_DATE}；…`
```

`protocol-audit-core.mjs` 自己有 `PROTOCOL_CONTRACT_DATE` 的 import/re-export，CLI 补一行即可。
`--no-write` 不经过 `renderReport`，所以预检与既有 smoke 只测到绿。

## 影响面

- **所有新契约 run 的验收**（`run-accept` 第四道之后的落盘阶段）→ 交付被阻塞；
- `protocol-audit.md` 是 D46 的机械判据载体（v1 版本指纹行），缺失 = 协议可追溯性断链；
- 该崩溃从 02:04 的提交起存在，`run-accept-smoke` 一直红但不在 L0，属于「门禁自己的冒烟没进必跑集」。

## 修复判据

1. `protocol-audit.mjs` 补 import `PROTOCOL_CONTRACT_DATE`（从 `protocol-audit-core.mjs` 的 re-export
   或 `protocol-core.mjs`；二选一，保持单一正本）；
2. 先红后绿：`node scripts/run-gates/protocol-audit.mjs <fixture> --write` 当前崩（红）→ 修复后
   exit 0 且写出含 `v1 design_sha256=…` 的 `protocol-audit.md`；
3. `node scripts/smoke/run-accept-smoke.mjs` 三项恢复绿（它是本 bug 的完整回归）；
4. 增加防回归：把「protocol-audit **--write** 至少跑一次」纳入某个 keyless 必跑面（`run-accept-smoke`
   已在，但不在 L0；可考虑在 `pnpm test` 加一条只测 `--write` 落盘的用例，或把该冒烟挂进发布清单）；
5. `pnpm test` + `pnpm verify` 绿；真实 bundle 上 `--write` 不回归（已有 5 个带 protocol-audit.md 的样本）。

## 修复关联

机械回归（缺 import），不改变任何判据/语义；与 074/075/076 的「合同面」问题无关。发现方式 =
`run-accept-smoke` 全链冒烟（探索协议 §E1/E3 的非默认路径）。

## 已落地（2026-11-12）

- 证据 = 临时 bundle `--write` exit 0 + `v1 design_sha256=…`；`node scripts/smoke/run-accept-smoke.mjs` ALL PASS（⑩ 三项恢复绿）；`tests/run/protocol-core.test.mjs` BUG-077 源码契约测试。
- 去向 = none（缺 import 的机械修复）。
