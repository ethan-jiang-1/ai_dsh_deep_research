---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-153：protocol-audit 的版本快照只查「文件在场」——`protocol/v1.json = {}` 也 PASS，历史链内容未校验

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — protocol 历史快照校验最小协议结构 + version 配对 + 可选历史指纹；空对象/错版 RED（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`scripts/lib/protocol-audit-core.mjs` 的 `checkAudit`（`protocol.version > 1 && !hasSnapshot` 才红）。

## 症状

协议 v2 要求保留 v1 的历史快照 `protocol/v1.json`；审计只检查**文件是否存在**：

```js
if (protocol.version > 1 && !hasSnapshot) {
  out.push(red('protocol-snapshot', `version=${protocol.version} 但缺 protocol/v${version-1}.json 快照`))
}
```

在真实 bundle 的**副本**上把 `protocol.json` 的 `version` 改为 2、并写入一个空的 `protocol/v1.json = {}`：

```
$ node scripts/run-gates/protocol-audit.mjs /tmp/pa-snap --no-write
protocol-audit: PASS（v2 / 877ae9fab9c2…）     ← 空对象也通过
```

即：**版本历史链的内容、schema、版本号、设计指纹全部未校验**——一个占位/空文件就能满足「保留旧版设计」
的契约。同理，快照若是**任意别的协议**（哪怕 version 99）也 PASS。

## 复现

```sh
cp -R research-workspace/drt_llm-inference-cost-routes /tmp/pa-snap
node -e '
const fs=require("node:fs"); const p="/tmp/pa-snap/protocol.json"; const j=JSON.parse(fs.readFileSync(p,"utf8")); j.version=2;
fs.writeFileSync(p, JSON.stringify(j,null,2)+"\n");
fs.mkdirSync("/tmp/pa-snap/protocol",{recursive:true});
fs.writeFileSync("/tmp/pa-snap/protocol/v1.json", "{}\n");
'
source dev/env.sh
node scripts/run-gates/protocol-audit.mjs /tmp/pa-snap --no-write   # → PASS（应 RED）
```

## 根因（已证）

1. `checkAudit` 只接一个 `hasSnapshot` 布尔（文件存在与否），不解析快照内容；
2. 协议的历史快照是「设计可追溯」的载体（D46：协议级变更 → v2 + `protocol/v<旧>.json`）——只查在场
   无法区分「真正保留了旧设计」与「放了个空文件」；
3. `protocol-audit.md` 已有 `vN design_sha256=` 行机制（当前版本可核指纹），但历史版本的指纹从未被要求
   写入或核对。

## 影响面

- **版本历史可伪造**：任何人都能用一个空/占位文件满足 `protocol-snapshot`，审计仍绿；
- 交付物声称「设计有版本链」，实际不可追溯；
- 与「只查在场不查内容」的其它缺口同族（契约形似而非事实）。

## 修复判据

1. `checkAudit` 读取 `protocol/v{version-1}.json`：
   - 必须是**合法 protocol**（`validateProtocol` 无 red）；
   - `snapshot.version === version - 1`（允许 v3 只查 v2，或要求全链 v1..v{n-1} 按设计定）；
   - 若 `protocol-audit.md` 有 `v{version-1} design_sha256=` 行，则要求
     `designSha256(snapshot) === 该行`（历史指纹可核）；
2. 先红后绿：`{}` 快照当前 PASS（红）→ 修复后 RED（点名 schema/version）；`version: 99` 的错版快照 RED；
   真实 bundle 的合法 v1 快照仍 PASS；
3. 不回归：`version=1`（无快照）不判；「缺快照」仍 RED；`protocol-audit.md` 缺当前版本行仍 warning；
4. `pnpm test` + `pnpm verify` 绿；真实 bundle 回归（8 个带 protocol 的场次）。

## 修复关联

D46（协议版本历史）；与 [BUG-148](BUG-148-evidence-short-quotes-not-audited.md)（门槛静默放行）/
[BUG-152](BUG-152-client-load-unhealthy-host-assertion-red.md)（判据选错层）同族：**在场 ≠ 内容**。
发现方式 = 版本快照的邻接变异（空对象）。

## 已落地（2026-11-13）

- 证据 = `tests/run/protocol-core.test.mjs` BUG-153；真实 v2 bundle PASS。
- 全量 `pnpm test` 1364 绿、`pnpm verify` 全绿；run-accept-smoke ALL PASS。
- 去向 = none。
