---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-429：`depends_on` 的括注被当成 topic id——`无（说明）` 变悬空依赖、注记里的全角逗号把 id 切碎

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：depends_on 剥括注/强调，「无（说明）」= 无依赖；诊断不再指向假悬空 id；去向：implemented — 批 Note [2026-11-24-single-source-receipt-signature-topics](../../../notes/implemented/2026-11-24-single-source-receipt-signature-topics.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

`topics.md` 的 `- depends_on:` 后面写括注（真实 run 里很常见）时，`topicsGate` 报出**不存在的 topic id**：

| 真实写法（仓内归档实测） | 解析出的 dep | 门禁结论 |
|---|---|---|
| `- depends_on: 无（**下游 T2/T3/T4 的实体集合以此为准**）` | `['无（下游 …）']` | **RED「depends_on「…」不存在」**（本该是"无依赖"） |
| `- depends_on: T1（实体集合）` | `['T1（实体集合）']` | **RED「不存在」**（T1 其实在场） |
| `- depends_on: T1（缺 T1 会把已停更方案纳入约束对比）` | `['T1（缺 T1 会把已停更方案纳入约束对比）']` | RED 同上 |
| `- depends_on: T1、T2、T3、T4（**由 lead 纯综合，不派 analyst**）` | `['T1','T2','T3','T4（**由 lead 纯综合','不派 analyst**）']` | **两个假悬空 id**（全角逗号把注记切开） |

仓内 58 个归档 bundle 中，**4 个**在 `topicsGate` 因此判 RED（`drt_agent-memory-landscape`、`drt_ai-coding-security`、`drt_cn-moe-2026`、`drt_2026-ai-video-generation-landscape`）——都是已交付过的真实 run。诊断指向「某个 topic id 不存在」，而真实原因只是「id 后面带了注记」，操作者按提示去查 topic id 会一无所获。

## 分诊与授权

- 严重级：P2 — 门禁误报（合规意图被判悬空依赖）+ 诊断误导；不破坏数据。
- 表面 / 边界：run 门禁（[findings-core.mjs](../../../checks/lib/gates/findings-core.mjs) `listOf`/`scalarOf` + `parseTopicsReport` 的 depends_on 图判据）/ ① 代码（值域解析）。
- DSH 不变量：失败信息 = 失败对象 + 违反规则 + 修正入口——把注记说成「topic 不存在」违反这条；且「无（说明）」不得等价于「有一个叫『无（说明）』的依赖」。
- 触及面：none — checks 解析器 + 单测。
- 授权：排查显式化，待分诊推进。
- 批：receipt-and-signature-single-source-424-430。

## 复现

复现状态：稳定 — 三种真实写法各自产出假悬空。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { parseTopicsReport } from "./checks/lib/gates/findings-core.mjs";
const doc = (dep) => `## T1: a\n\n- must_answer:\n  - x\n  - y\n- scope_role: primary\n- depends_on: 无\n\n## T2: b\n\n- must_answer:\n  - x\n  - y\n- scope_role: comparison\n- depends_on: ${dep}\n`;
for (const dep of ["T1", "T1（实体集合）", "无（**下游以此为准**）", "T1、T2（**说明，含逗号**）"]) {
  const r = parseTopicsReport(doc(dep));
  const t2 = r.topics.get("T2");
  console.log(JSON.stringify(dep), "→ deps=", JSON.stringify(t2?.dependsOn), "issues=", JSON.stringify(r.issues.slice(0, 2)));
}
const bad = parseTopicsReport(doc("无（说明）"));
assert.deepEqual(bad.topics.get("T2").dependsOn, []);
'
```

实测：`"T1" → ["T1"] issues=[]`；`"T1（实体集合）" → ["T1（实体集合）"] issues=["T2 的 depends_on「T1（实体集合）」不存在"]`；`"无（**下游以此为准**）" → ["无（**下游以此为准**）"]`（断言红）；`"T1、T2（**说明，含逗号**）" → ["T1","T2（**说明","含逗号**）"]`。

## 根因（已证）

[findings-core.mjs](../../../checks/lib/gates/findings-core.mjs)：

```js
const scalarOf = (value) => String(value ?? '').trim().replace(/^['"]|['"]$/g, '')
export function listOf(raw) {
  const value = scalarOf(raw)
  if (value === '' || value === '无' || value === '[]') return []
  return value.replace(/^\[|\]$/g, '').split(/[,，、]/).map((x) => scalarOf(x)).filter(Boolean)
}
```

1. **不剥括注**：`T1（…）` 保留注记参与 id 比较；`无（…）` 因为不等于字面 `无` 而不进"空"分支；
2. **先切分再剥注记**（顺序反了）：`split(/[,，、]/)` 在注记内部的全角逗号处切开，产生 `T4（**由 lead 纯综合` 这类碎片；
3. `parseTopicsReport` 的图判据只做 `ids.has(dep)`，于是注记/碎片全部落成「不存在」。

## 牵出的失败类

- 同机制第 2 次（中文书写变体导致解析偏差；与 BUG-393/402/428 同族）｜处置：类修——`listOf` 先把「尾部括注」剥掉（`\s*[（(][^）)]*[）)]\s*$`，可重复），再判 `无`、再切分；并让"仍含无法识别的字符"的条目报「注记/书写非法」而不是「topic 不存在」。

## 修法方向

- `listOf`：`无 + 括注` → `[]`；`T1（说明）` → `['T1']`；
- 切分顺序：剥注记 → 判空 → split → 逐项再剥；
- 若剥完仍不是合法 id 形态（如碎片），报 `depends_on 含无法识别的片段（原文：…）`，与「topic 不存在」分开。

## 修复判据

- 复现脚本断言全绿（四种写法：`T1` / `T1（…）` / `无（…）` / 含逗号注记 都得到正确 dep 列表）；
- 真悬空（`W9.9`）仍 RED 且文案准确（负控）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 depends_on 值解析改回裸 `listOf` → 括注被当成 topic id，`无（说明）` 变悬空依赖。

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/findings-core.mjs",
    "tests/run/gates/topics-parsing.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-429' tests/run/gates/topics-parsing.spec.mjs",
    "exit": 1,
    "output": "depends_on 括注 expected ['T1'] / actual ['T1（实体集合）']（假悬空 id）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-429' tests/run/gates/topics-parsing.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/topics-parsing.spec.mjs"
  }
}
```
