---
topic: preventive-quality-admission-blind-review-cases
intent: 为已授权 preventive-quality 首批 A4 提供一份新增解析语义与一份无新语义对照的独立准入盲评输入及封存判据。
---

# 首批 A4：独立准入盲评案例

> 本材料只新增本文件。以下两个 diff 均为**虚拟 diff，未应用**；评测者应把每个 Case 的“盲评输入”作为独立输入，不读取后面的封存 expected。
>
> 取样 HEAD：`48d57835`（短 hash；2026-11-20）。案例基线来自该工作树实际读取的源码，不以全局安装版本或生成物为依据。

## 盲评输入

### Case A：新增 plan parser 字段（语义触发）

**候选变更意图（仅供理解 diff，不是验收结论）**：让 plan 节点索引也保留节点表的 `budget` 单元格。

**虚拟 diff：`packages/deep-research-pack/src/lib/plan/plan-index.ts`**

基线（实际源码的相关片段）：

```ts
export interface PlanNode {
  readonly id: string
  readonly parent?: string
  readonly lifecycle?: string
  readonly stage?: PlanStage
  readonly taskId?: string
  readonly kind?: string
  readonly question?: string
  readonly ownerRole?: string
  readonly deps: readonly string[]
  readonly output?: string
  readonly acceptance?: string
  readonly depth?: string
}

// planIndex() 的表格读取段
const output = read('output')
const acceptance = read('acceptance')
const depth = read('depth')
const node: PlanNode = {
  id,
  deps,
  ...(output !== undefined ? { output } : {}),
  ...(acceptance !== undefined ? { acceptance } : {}),
  ...(depth !== undefined ? { depth } : {}),
}
```

候选 diff（未应用）：

```diff
@@
   readonly output?: string
   readonly acceptance?: string
+  readonly budget?: string
   readonly depth?: string
 }
@@
 const output = read('output')
 const acceptance = read('acceptance')
+const budget = read('budget')
 const depth = read('depth')
 const node: PlanNode = {
   id,
   deps,
   ...(output !== undefined ? { output } : {}),
   ...(acceptance !== undefined ? { acceptance } : {}),
+  ...(budget !== undefined ? { budget } : {}),
   ...(depth !== undefined ? { depth } : {}),
 }
```

配套 happy-path 断言（同样是虚拟 diff，`tests/cockpit/lib/plan/plan-index.spec.mjs`）：

```diff
+test('planIndex：读取 budget 字段', () => {
+  const index = planIndex([
+    '| id | budget | deps |',
+    '|---|---|---|',
+    '| N1 | 2 轮 | — |',
+  ].join('\\n'));
+  assert.equal(index.nodes[0].budget, '2 轮');
+});
```

> 注：该断言故意只覆盖一个合法 budget 值的 happy path，不覆盖缺失、空值、格式或任何消费者裁决；评测者可将其视为候选作者声称的最小资产，不要求替作者补写测试。

**可独立提取的 Case A 输入**：上面的候选意图、`plan-index.ts` 基线片段、两个虚拟 diff 片段，以及本文件记录的取样 HEAD。不要把“封存 expected”段落一并提供给受测者。

### Case B：局部改名对照（免触发）

**候选变更意图**：在 `parseFindings` 函数中把局部变量 `cur` 改为更清楚的 `current`，不改变解析规则、返回形状或消费者。

**虚拟 diff：`checks/lib/analyze/run-dashboard-core.mjs`**

基线（实际源码的相关片段）：

```js
function parseFindings(text) {
  const findings = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const h = /^##\s+F(\d+):\s*(.+?)\s*$/.exec(raw);
    if (h) {
      cur = { id: `F${h[1]}`, conclusion: h[2], gap: null, evidence: [] };
      findings.push(cur);
      continue;
    }
    if (!cur) continue;
    const g = /^-\s+gap:\s*(\w+)\s*$/.exec(raw);
    if (g) {
      cur.gap = g[1];
      continue;
    }
    if (/^-\s+支撑证据:/.test(raw)) {
      cur.evidence = [...raw.matchAll(/evidence\/[\w.-]+\.md/g)].map((m) => m[0]);
    }
  }
  return findings;
}
```

候选 diff（未应用）：

```diff
@@
-  let cur = null;
+  let current = null;
@@
-      cur = { id: `F${h[1]}`, conclusion: h[2], gap: null, evidence: [] };
-      findings.push(cur);
+      current = { id: `F${h[1]}`, conclusion: h[2], gap: null, evidence: [] };
+      findings.push(current);
@@
-    if (!cur) continue;
+    if (!current) continue;
@@
-      cur.gap = g[1];
+      current.gap = g[1];
@@
-      cur.evidence = [...raw.matchAll(/evidence\/[\w.-]+\.md/g)].map((m) => m[0]);
+      current.evidence = [...raw.matchAll(/evidence\/[\w.-]+\.md/g)].map((m) => m[0]);
```

**可独立提取的 Case B 输入**：上面的候选意图、`run-dashboard-core.mjs` 基线片段、局部改名虚拟 diff，以及本文件记录的取样 HEAD。不要把“封存 expected”段落一并提供给受测者。

## 封存 expected（盲评裁决材料）

> 本节是独立 expected；父 agent hash 封存后再把两个 Case 输入交给全新上下文。expected 不是受测者输入的一部分。

### Case A expected

- **必须识别的旧性质**：`planIndex` 是 plan 节点表的共享解析/查询面；active 节点的 `budget` 是现行 `plan-gate` 的必填性质。现有门禁要求 active 节点 budget 单元格存在且非空（无预算以 `—` 作为显式占位），并且 plan 解析与各消费面的节点身份/字段语义不能漂移。
- **必须识别的具体遗漏入口与证据**：候选 diff 只让 `PlanNode`/`planIndex` 产生 `budget`，没有改仍然读取 plan 原文的 `checks/lib/gates/plan-gate.mjs`。该消费者在现行源码约第 56–69 行明确注释“`plan-index` 不解析 `budget/task_id`”，并通过本地 `cellOf`/`budgetOf` 读取原始表；约第 70–82 行再对 active 节点执行 budget 缺失判定。因此新字段没有成为门禁的消费事实，新增 parser 语义与真实裁决入口之间存在漏消费/双来源风险。仅指出“加了字段”或只要求一个解析 happy-path 断言，不足以识别该遗漏。应至少点名 `plan-gate` 这个实际入口和上述 raw-table 证据；若声称其余消费者需要改变，应区分 `plan-diff`/`graph-model` 当前只消费结构/映射字段，不无证据扩张范围。
- **通过判定**：盲评明确把该 diff 归为语义触发；指出旧 budget 必填性质、`plan-gate` 的原文读取与未消费新字段的证据；并给出可验证的修正边界：要么让 `plan-gate` 使用 `node.budget` 并保留等价的列语义/反例，要么明确保留双读的理由并证明两者一致，且不能把仅有 `budget` 存在的正例当作完整证据。
- **失败判定**：将其判为普通类型/字段整理或“只需加断言”；只指出 parser happy path 而漏掉 `plan-gate`；把 `plan-gate` 已经消费 `PlanNode.budget` 当成事实；或泛化为必须扫描所有含 `plan` 的文件而不点名实际入口与证据。

### Case B expected

- **必须识别的旧性质**：不存在需要迁移的旧 parser/裁决性质；`parseFindings` 的输入、输出对象字段、正则、循环顺序和其唯一调用关系均保持不变。这里的“旧性质”应具体表述为行为等价，而非另造一条质量承诺。
- **必须识别的具体遗漏入口与证据**：没有应被追查的遗漏入口。diff 只在同一函数内一致替换局部绑定名，`findings.push`、`gap`/`evidence` 写入和返回数组都保持原语义；该文件的 `parseReview`/dashboard consumer 不受影响。可指出通常的语法/既有回归仍按仓库常规处理，但不能把它包装成 parser 新语义或新消费者。
- **通过判定**：盲评把它判为免触发对照，明确说明是无新语义的局部改名，不要求 A 类的旧性质/全入口准入追查；最多建议常规静态/既有测试，不新增专门准入资产。
- **失败判定**：要求为此新增 parser 变体矩阵、寻找旧类不变量、追查新的消费者/入口、增加真实 smoke，或把变量改名误判为改变解析行为。

## 实际读源路径

- `packages/deep-research-pack/src/lib/plan/plan-index.ts`
- `checks/lib/gates/plan-gate.mjs`
- `tests/cockpit/lib/plan/plan-index.spec.mjs`
- `checks/lib/analyze/run-dashboard-core.mjs`
- `packages/deep-research-pack/src/lib/plan/plan-diff.ts`
- `packages/deep-research-pack/src/lib/plan/graph-model.ts`
- `checks/lib/shared/node-gate-contracts.mjs`
- `packages/deep-research-pack/src/lib/review/review-readiness.ts`
- `packages/deep-research-pack/src/client/research-status/useStatusFeed.ts`

明确未读：用户指定正在修改的 `docs/guides/60`、`docs/guides/67`、`.agents/skills/reviewing-a-delivery/SKILL.md`、`.agents/skills/exploratory-verification/SKILL.md`。

## 边界声明

- 本材料只封存案例输入、expected、源码取样路径和 revision；不实施任一虚拟 diff。
- 本轮不编辑其他文件、不跑测试、不 commit；未对两个案例作实际评测。
- Case A 是故意只测 happy path 且漏掉真实消费者的语义候选；Case B 是故意无新语义的普通局部改名对照。
