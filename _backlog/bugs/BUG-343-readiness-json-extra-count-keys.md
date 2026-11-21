---
status: 等人拍板
severity: P2
opened: 2026-11-20
---

# BUG-343：critic 把计数键写进 readiness.json，门② 判红且交付链无自检

> 严重级别：P2 ｜ 发现：2026-11-20 ｜ 状态：等人拍板（严格 schema 与附加字段怎么共存，是合同取舍）
>
> 现场 = `runtime/e2e-2026-11-20/`；run = `research-workspace/drt_pg-latest-stable/`。

## 症状

一场正常交付的 quick_factual run，critic 的 `review/readiness.json` 是：

```json
{ "version": 1, "readiness": "PASS", "conditional": false, "round": 1,
  "at": "…", "critical": 0, "unverified": 0, "rechecked_urls": 6, "ts": "…" }
```

`node-gate` 门② 红：

```text
② review/readiness.json 不合法：未知键 critical；未知键 unverified；
   未知键 rechecked_urls；未知键 ts
```

驾驶舱同一解析器也把 readiness 判为非法（`readinessOfSources` → invalid）。

## 根因

- 判据：`packages/deep-research-pack/src/lib/review/review-readiness.ts` 的
  `parseReadinessDeclaration` 只收 `version/readiness/conditional/round/at` 五键，未知键 = 非法（fail-closed）。
- 模型侧：critic skill 给的五键样例是对的，但该 critic 自行追加了「计数键」；lead 无法在 HITL2 前
  跑门②，critic 也没有自校验步骤——错误直到操作侧跑门才暴露。
- 追加的计数（critical/unverified/rechecked_urls）本身是 review 需要的事实，只是没有正式落点。

## 复现

```sh
node checks/run-gates/node-gate.mjs research-workspace/drt_pg-latest-stable
# 门 ② = RED … 未知键 …
```

## 修法（需拍板）

1. 给声明加合法 `counts` 对象（critical/unverified/rechecked_urls），skill 与解析器同改；
2. 解析器忽略未知键但要求五键合法（放宽 fail-closed）；
3. 保持严格，给 critic 一个可运行的本地校验入口/清单（写盘后自检），把错误前移。

## 修复判据

- 本卡现场 `readiness.json` 在选定修法下不再打红；readiness 值与 review.md 判定行一致。
- 坏 JSON / 错版本 / 声明与散文不一致仍红（既有负控不回退）。
- `pnpm test` 的 review-readiness 矩阵同步更新并通过。

可关闭：否
