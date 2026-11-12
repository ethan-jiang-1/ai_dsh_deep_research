---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-076：schema-scan 的 D28 顶层白名单漏掉协议/复核/wave 新 canonical 件——新契约 run 必红

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 顶层白名单补 `protocol.json` / `protocol-audit.md` / `protocol` / `review` / `waves`；新增「5 类新件不红 + 真违约仍红」用例；契约期真实 bundle 普查只剩 3 例真违约（脚本/绝对路径/未登记 leads），协议类假红消失（2026-11-12，去向：none — 门禁白名单修复，审查：agent 自审 + 机械门禁）。
> 翻转守卫需用户/评审放行）
>
> 位置：`scripts/lib/schema-scan-core.mjs` 的 `TOP_LEVEL_ALLOWED`（D28 顶层白名单）。

## 症状

契约期（有 `run.md`）的新 run 一旦使用今天的协议层 / claim 复核 / wave 通道，`schema-scan` 就报：

```
drt_llm-inference-cost-routes  [契约期 2026-11-11]  ✗ RED：
  未登记顶层条目 protocol（D28 顶层白名单，RFC §11）
  未登记顶层条目 protocol-audit.md
  未登记顶层条目 protocol.json
  未登记顶层条目 review
```

而这些条目全部是**成文 canonical**：

| 顶层条目 | 依据 |
|---|---|
| `protocol.json` | D46「偏好层 Protocol = `protocol.json` canonical」；`content/templates/run/protocol.json` 写者契约 |
| `protocol/v<旧>.json` | `research-brief` skill：「协议级变更 → v2 + `protocol/v<旧>.json`」 |
| `protocol-audit.md` | `run-accept` 第四道 `protocol-audit` 的落盘报告（与 `audit.md` 同级） |
| `review/`（claims.json / verdicts-rN.json / verdict-audit-rN.md） | D44 claim 级复核批次契约（Lead 原文落盘） |
| `waves/<wave>.json` | `wave-execution` skill：「**报告必须写** `waves/<wave>.json`」；`team-assembly` 同 |

## 复现

```sh
source dev/env.sh
node scripts/run-gates/schema-scan.mjs research-workspace/drt_llm-inference-cost-routes
# → 契约期 RED：protocol / protocol-audit.md / protocol.json / review 未登记
```

盘上普查（契约期 bundle）：

```
protocol.json 8 个 · review/ 8 个 · protocol-audit.md 5 个 · waves/ 4 个 · protocol/ 1 个
```

即：**所有用到这些新件的 run 都会红**，不是单场数据问题。反过来，`.probe.py` / `.provenance-build.py`
被扫出来是**对的**（bundle 禁止脚本），说明白名单机制本身工作正常——缺的是新件的登记。

## 根因（已证）

`TOP_LEVEL_ALLOWED`（`schema-scan-core.mjs:162`）自 D28 起未随新契约扩展：

```js
const TOP_LEVEL_ALLOWED = new Set([
  'run.md', …, 'audit.md', 'node-gate.md', 'acceptance.md', 'delivered.json', 'manifest.json',
  'plan', 'leads', 'evidence', 'provenance', 'final', 'journal', 'drafts',
])
```

缺 `protocol.json`、`protocol`（版本历史目录）、`protocol-audit.md`、`review`、`waves`。
D46/D44 落地时跑了 `protocol-audit` 的 8 个 bundle 回归（Note 有记），但**没跑 schema-scan**，
所以白名单漏项没被发现。

## 影响面

- 契约期 run 的 L4 卫生门**假红**：新流程越完整（protocol + verdicts + waves），越必然红；
- 与「未跑 ≠ 通过」相反方向的噪声：真违约（脚本、绝对路径、未登记 leads 分片）会被淹没在
  每条 run 都出现的 4 条假红里；
- `run-accept` 不跑 schema-scan（它跑 node-gate/evidence/verdict/protocol/path-hygiene/secret），
  所以**不阻塞验收**，但 L4/发布清单会被误判。

## 修复判据

1. 白名单加入 `protocol.json`、`protocol`、`protocol-audit.md`、`review`、`waves`；
2. 先红后绿：造一个含这 5 个条目 + 真违约（顶层 `x.py`）的 bundle——修复前 5 条假红 + 1 条真红，
   修复后只剩真红；纯合法 bundle 修复后绿；
3. 增加**登记面回归**：新增 bundle 顶层件时，schema-scan 测试必须同步白名单（建议在
   `tests/run/schema-scan.test.mjs` 里钉「canonical 顶层件清单」与白名单相等——单一事实源）；
4. 既有违约不被豁免：`.probe.py` / 绝对路径 / 未登记 leads 分片仍红；
5. `pnpm test` + `pnpm verify` 绿；真实 bundle 普查从「8 红」变「0 假红（真违约除外）」。

## 修复关联

与 [BUG-074](BUG-074-readiness-inline-quote-hijack.md) / [BUG-075](BUG-075-hitl2-pending-row-counted-as-decision.md)
同为「词面/清单与真实合同脱节」类，但方向是**假红**（那两条是假绿）。发现方式 = 交付链门禁全量扫真实
bundle（探索协议 §E1/E3）。

## 已落地（2026-11-12）

- 证据 = `tests/run/schema-scan.test.mjs` BUG-076 用例；`node scripts/run-gates/schema-scan.mjs` 契约期 3/42 RED（均为真违约）。
- 去向 = none（白名单修复）。
