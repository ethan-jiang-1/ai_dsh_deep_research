---
status: 等人拍板
severity: P1
opened: 2026-11-20
---

# BUG-342：门 P 的「剩余工作」要求字面 owner/next 关键词——所有真实 plan 都被判红

> 严重级别：P1 ｜ 发现：2026-11-20 ｜ 状态：等人拍板（判据形态按关键词还是按语义/机器格式，是合同取舍）
>
> 现场 = `runtime/e2e-2026-11-20/`；新 run = `research-workspace/drt_sodium-ion-bess/`。

## 症状

新 run 的 `plan.md` 节点表是合法 12 列表（6 节点、v2、Wave 分组齐），但门 P 红：

```text
P 剩余工作条目缺 owner/next：- W1.1 scout —— 待派发（等 HITL1 计划确认）；
P 剩余工作条目缺 owner/next：- W2.1 research-wave —— 待 W1.1；…
```

条目里语义上有节点、owner（scout / research-wave）、next（待派发 / 待 W1.1），但没有**字面**
`owner`/`负责人` 与 `next`/`下一步`。同判据下既有真实 plan 也全红：

```sh
node checks/run-gates/node-gate.mjs research-workspace/drt_eu-cn-gpai-obligations   # 门P RED（4 条）
node checks/run-gates/node-gate.mjs research-workspace/drt_ai-model-regulation-cn-eu-us  # 门P RED
```

## 根因

`checks/lib/gates/plan-gate.mjs` 的剩余工作判据是字面正则：

```js
if (!/(owner|负责人)/i.test(line) || !/(next|下一步)/i.test(line)) issues.push(...)
```

而模型可见面只给语义要求：模板 `content/templates/run/plan.md` 写「未完成节点 + owner + next」，
NODES 也只写「未完成节点+owner+next」，**没有给行格式样例**。lead 自然写成
`- W1.1 scout —— 待派发`，被关键词判红。

## 复现

```sh
node checks/run-gates/node-gate.mjs research-workspace/drt_sodium-ion-bess
# 门 P = RED … 剩余工作条目缺 owner/next（5 条全中）
```

## 修法（需拍板）

1. 判据放宽：owner 接受盘上角色名（scout/analyst/critic/lead/research-wave），next 接受 `待…`/`→`；
2. 判据收紧到机器格式（如 `- W1.1 owner=scout next=待派发`），模板与 NODES 同 diff 给样例；
3. 双轨：模板给机器格式 + 判据保留语义兜底。

## 修复判据

- 本卡现场（真实 v2 plan）门 P 绿；把 owner 或 next 删掉仍红（负控）。
- 既有三份 plan 重跑结果符合新口径；旧场 epoch 豁免如适用须显式。
- `pnpm test` 的 plan-gate 矩阵同步更新并通过。

可关闭：否
