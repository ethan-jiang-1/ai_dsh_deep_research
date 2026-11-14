---
status: 等人拍板
severity: P2
opened: 2026-11-14
---

# BUG-171：protocol v3 的版本链只查 v2——`protocol/v1.json = {}` 仍 PASS

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及交付审计/版本链，需用户放行
>
> 位置：[scripts/run-gates/protocol-audit.mjs](../../scripts/run-gates/protocol-audit.mjs)（只加载
> `v{version-1}.json`）与 [protocol-audit-core.mjs](../../scripts/lib/protocol-audit-core.mjs) 的
> `checkAudit`；前科 = BUG-153（快照只查在场）。

## 症状

当前协议 v3 时，CLI 只读取 `protocol/v2.json`，`protocol/v1.json` **从未打开**：

```js
const snapshotPath = version !== null && version > 1 ? join(bundle, 'protocol', `v${version - 1}.json`) : null
```

因此 v3 + v2 合法 + **v1 = `{}`** 仍可 PASS；`checkAudit` 也只校验 v2 的字段/哈希。

## 复现（2026-11-14 实测）

取真实 v2 bundle `drt_llm-inference-cost-routes` 副本，改成 v3：

```sh
cp -R research-workspace/drt_llm-inference-cost-routes /tmp/probe-v3
python3 - <<'PY'
import json, pathlib
b = pathlib.Path('/tmp/probe-v3')
cur = json.loads((b/'protocol.json').read_text())
(b/'protocol'/'v2.json').write_text(json.dumps(cur, ensure_ascii=False, indent=2) + '\n')
(b/'protocol'/'v1.json').write_text('{}\n')          # 空历史链
cur['version'] = 3
(b/'protocol.json').write_text(json.dumps(cur, ensure_ascii=False, indent=2) + '\n')
for name in ('plan.md','question.md'):
    p = b/name
    p.write_text(p.read_text().replace('protocol: v2', 'protocol: v3'))
PY
node scripts/run-gates/protocol-audit.mjs /tmp/probe-v3 --no-write
# warn [audit-missing] protocol-audit.md 无 v3 行（首次 --write 可补）
# protocol-audit: PASS（v3 / …）— 报告未写（--write 才落盘）
```

`protocol/v1.json = {}` 是伪造的旧链；审计仍 PASS（只有 v3 当前哈希的 warning）。

## 根因（已证）

版本链的判据只建模了「当前版本 vs 前一版本」一跳：

- CLI 只计算 `version - 1` 一个路径；
- `evaluateBundle` 的 `snapshot` 入参是单值，`checkAudit` 只校验它；
- `protocol/v1.json` 既不在读取面，也不在 `checkAudit` 的字段/版本/哈希矩阵里。

D46 的「协议版本链」被实现成单跳链；v3 的第二跳（v1）没有消费者。

## 影响面

- v3/v4 bundle 可以携带一个空/伪造的早期快照，审计仍 PASS；历史链不是可复核证据。
- 与 BUG-153（v2 只查 v1 在场）叠加：现在 v3 连「早期在场」都不查；L4 交付审计的版本链承诺
  只剩最后一跳。
- 当前真实 bundle 只有 v2（单跳），属门禁钝化；v3 一旦出现即触发（P2）。

## 牵出的失败类

- **C7 假绿**（链只查一跳）+ **C2 消费者遗漏**（早期快照的消费者不存在）。
- 同机制第 **2** 次（153 内容 → 本条链长）。类修：版本链按 `1..version-1` 枚举，逐份校验
  schema/version/design hash；缺一份即红。

## 修复判据

- CLI 读取全部 `protocol/v{k}.json`（k = 1..version-1），`evaluateBundle` 接收快照数组；
  `checkAudit` 对每份校验最小字段、`version === k`、`auditHashOf(auditText, k)` 与
  `designSha256(snapshot)` 一致（哈希行缺失 = red 或明确 documented warning，不再静默跳过）。
- 反证：上面的 v3 + v1={} → 必须 RED `protocol-snapshot`；补一份合法 v1 → 绿；
  v3 + v2 缺 → 仍红（现有行为）。
- 若产品决定「只要求前一版」，把 D46 的「版本链」措辞收窄到单跳并在文档/审计文案里明示；
  不能保留「链」的承诺而只查一跳。

## 修复关联

未修。触面 = 交付审计/版本链，按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`。
