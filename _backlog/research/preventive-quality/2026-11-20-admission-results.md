---
topic: preventive-quality-admission-blind-review-results
intent: 原样记录首批 A4 两份实际输入并对照封存判据登记失败与证据限制，避免将标签泄露或未暴露规则的实验误作规则效果证明。
---

# 首批 A4：准入评测结果与实验边界

## 结果

本轮按[封存案例与 expected](2026-11-20-admission-cases.md)登记：**A 未满足封存判据；B 的静态等价、免专项资产判断符合对照判据，但标签泄露使其不能作为有效的盲分类效果证据。** 不因输出不符而补样本、改 expected 或重评。

两名受测者实际只获准读取各自的一份输入；输入未提供准入 guide/skill，也禁止读源码、expected、guide/skill 与运行其他工具。因此本实验既不证明准入规则有效，也不能定性准入规则无效。实验设计遮蔽了 A 所需的真实消费方，又没有暴露待测准入流程；按原合同记录 A 失败，并保留这个失败无法归因于规则效果的限制。

本页是研究证据材料，不实施案例中的虚拟 diff。A 的扩展、改包及后续生产源头研究均不在本材料范围；生产源头研究在本批提交后另做。

## 身份、实际暴露与记录完整性

| 项目 | 记录 |
|---|---|
| 取样 baseline | `48d57835` |
| 封存材料 | [独立准入盲评案例](2026-11-20-admission-cases.md) |
| 封存 SHA-256 | `168aae2981ca84334c62e3ac3da35bf7e13036692257216ba4a2dc33de065e17`；封存原件副本为 `runtime/smoke-workspace/preventive-quality/admission-cases.sealed.md`，已重算核对一致。入库前仅删除第 9 行 blockquote 的尾随空格（git whitespace 检查）；现仓内材料 SHA-256 为 `9416286eae4b41ec7e99716f472adec68a3e5fbd387452715a5098a3d90e48d0`，输入及 expected 均未变 |
| 受测者 | 两个独立 blind 子会话，各使用 `gpt-6.1-sol`；模型与隔离安排由实验委托记录提供 |
| A 唯一允许读取的文件 | `runtime/smoke-workspace/preventive-quality/admission-A.input.md`，79 行 |
| A 输入 SHA-256 | `1385ec403b14c883c87d82fd2f8d13c688bbc297100fcd8d24c3ee4b8b7d3d25` |
| B 唯一允许读取的文件 | `runtime/smoke-workspace/preventive-quality/admission-B.input.md`，58 行 |
| B 输入 SHA-256 | `c1d810e2f15e13c30875d5ae20f52c95e686451a4ded00336974f9a2098a4e44` |
| 读取与工具限制 | 每名受测者只准读自己的一个输入；禁止读源码、expected、guide/skill，不运行其他工具 |
| 标签泄露 | A 第 2 行为“Case A：新增 plan parser 字段（语义触发）”；B 第 2 行为“Case B：局部改名对照（免触发）” |
| 规则暴露 | 准入 guide/skill 未实际提供；候选片段与最小断言不能替代准入流程 |
| 输出记录范围 | 已读取父会话落盘的 A/B 完整 final；本页末节以 text 围栏原样收录，下表为原文摘述，保留既定判据与结果 |

上述运行区路径是本机实验原件的位置，属于非入库运行态；读者无需取得它们即可阅读下文保存的实际输入与完整输出正文。输入哈希与行数指运行区原件；下方围栏仅用于展示其内容。封存 expected 的来源与判据保存在仓内材料中；逐项判读沿用它们，不另立事后标准。输出原文中的本机路径及 Markdown 链接保留在 text 围栏内，作为原始文本而非仓内导航；其指向的输入已在本页完整收录。

## A：逐项对照封存 expected

判据来自[Case A expected](2026-11-20-admission-cases.md#case-a-expected)，输出摘述对应本页末节完整 final，仅补足记录，不改变既定判据或结果。

| 封存要求 | 输出摘述 | 判读 |
|---|---|---|
| 将候选归为语义触发 | A 判为语义触发，理由是 `planIndex()` 新增可观察输出属性；自述不依赖标题分类 | 分类文字吻合；输入标题已泄露该标签，即使自述不依赖标签，也不能据此恢复盲分类证据效力 |
| 识别应继承的具体旧性质：active 节点 budget 必填、单元格存在且非空；无预算以 `—` 显式占位 | A 要求保持旧字段、无 budget 列的旧输入、不引入默认值、空 cell 依既有约定及直接消费兼容；未识别 active budget 必填 | 未满足；这些兼容关注点不能替代封存的 budget 必填性质 |
| 点名真实入口 `plan-gate`，识别其仍以 `cellOf`/`budgetOf` 读原表、未消费新增字段的证据 | A 将直接入口列为 `planIndex()`、直接契约列为 `PlanNode`，只确认输入展示的属性读取；未点名 `plan-gate` | 未满足；只谈直接消费兼容不能替代实际消费者及其原文读取证据 |
| 给出可验证的修正边界：改为消费 `node.budget` 并保留等价列语义/反例，或明确保留双读的理由并证明一致 | A 认为解析器级定点验证足够，并把 budget 参与执行或裁决列为后续另有变更时才评估；未给出绑定 `plan-gate` 的修正边界 | 未取得满足此项的证据；不将泛化兼容建议算作通过 |
| 不以单一 happy path 断言代替消费者证据；不得无证据扩张全部 plan 消费面 | A 明确候选断言尚须真实执行，另列旧输入、空 cell、条件性直接消费兼容，并要求核对 `.join('\\n')` 的实际夹具；没有无条件扩张扫描 | 保留这些证据限制与最小范围说明；它们仍未识别封存要求的实际消费者，不改变总判据 |
| 总判据 | 漏掉实际 `plan-gate` 及 active budget 必填性质 | **失败**；封存失败条件已明确“漏掉 `plan-gate`”即失败，无需事后放宽或重评 |

A 的失败是相对于封存合同的事实。输入只暴露 parser 片段和一个合法 budget 的断言，未给实际消费者代码，且受测者禁止追查源码；这一实验条件遮蔽了通过所需的消费事实。记录该设计缺陷不会改变 A 的封存失败，也不能由 A 的失败推出准入规则无效。

## B：逐项对照封存 expected

判据来自[Case B expected](2026-11-20-admission-cases.md#case-b-expected)，输出摘述对应本页末节完整 final。

| 封存要求 | 输出摘述 | 判读 |
|---|---|---|
| 判为免触发的局部改名对照 | B 判为普通改动、不触发语义专项准入，理由是六处局部绑定一致替换；自述依据实际 diff 而非标签 | 符合对照判据；标题泄露“免触发”，自述不能消除已发生的暴露，不能用于证明有效盲分类 |
| 说明无新语义，保持输入、输出字段、正则和循环行为 | B 说明表达式、控制流、字段和返回值未变，列出 findings 顺序、首项前忽略、gap/evidence 写入和对象初始形状，并确认无 `current` 绑定冲突 | 与无新语义的对照要求一致，理由原文保存在末节 |
| 不要求 A 类旧性质迁移或新消费者准入追查；最多建议常规静态/既有回归 | B 仅建议沿用普通改动检查，无需新增专测、消费者矩阵或真实入口探针；明确没有核对具体外部消费者且未运行验证 | 符合对照所需的有限判断，不将其提升为执行测试或行为验证结果 |
| 总判据与效力 | 静态等价、免专项资产判断通过；存在标签泄露 | **对照判据通过，盲分类效果证据无效**；两种结论分别保留 |

## 实际输入 A（79 行）

下列为唯一允许输入的正文，含泄露标签，未清洗或补充消费者信息。

````markdown
取样基线：48d57835。
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

````

## 实际输入 B（58 行）

下列为唯一允许输入的正文，含泄露标签。

````markdown
取样基线：48d57835。
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

````

## 已知限制与延后工作

- A/B 各只有一个样本，且标题直接给出预期标签；不能从两份输出估计盲分类准确率、稳定性或总体效果。
- 准入规则 guide/skill 未实际提供，真实消费方又被读取约束遮蔽；本次无法识别规则的因果效果。失败按封存合同记录，规则有效性保持未受测。
- 两份完整 final 已从父会话落盘原件收录；输出中的“未读取其他文件”“未执行测试”等为受测者自述，本页原样保留，不将自述提升为独立工具轨迹审计。
- 未重评、未补样本、未调整 expected；未应用虚拟 diff，未开展生产源头研究。本页只保留实验事实与既定判读，后续研究在本批提交后另做。

## 完整原始输出

以下两份为父会话从独立 blind 子会话 final 落盘的完整文本；原文未改写。两份原件均无末尾换行，下列 text 围栏在闭合前各加一个展示换行，该换行不属于原文或所记哈希。运行区原件为非入库材料，下面同时保存原文及其 SHA-256，保证只持有 HEAD 的读者也能检查输出依据。

### A 完整 final

非入库原件：`runtime/smoke-workspace/preventive-quality/admission-A.output.md`；38 行；SHA-256：`261dab2df21534236ce68108a5807821e4fb4c30fd539d6af0246e569204fa28`。

````text
建议分类为**语义触发**；但**没有必要因此新增专门准入流程**。候选变更扩展了 `planIndex()` 的可观察输出契约，所需证据应聚焦字段保留与旧输入兼容。

本次仅阅读了[指定输入](</Users/bowhead/ai_dsh_deep_research/runtime/smoke-workspace/preventive-quality/admission-A.input.md>)，未读取其他仓库文件、expected 或 issue/research 材料，也未修改文件。完整结果已发送给父 agent。

1. **分类及理由**

   候选 diff 为 `PlanNode` 新增 `budget?: string`，读取 `budget` 列，并在结果非 `undefined` 时加入节点对象，见输入[第 43–59 行](</Users/bowhead/ai_dsh_deep_research/runtime/smoke-workspace/preventive-quality/admission-A.input.md#L43-L59>)。因此，同一张含有 budget 列的节点表，解析结果会新增可观察属性，属于输出语义变化。

   这个判断不依赖第 2 行标题已经写出的分类。变更意图仅是“保留节点表的 `budget` 单元格”，见[第 4 行](</Users/bowhead/ai_dsh_deep_research/runtime/smoke-workspace/preventive-quality/admission-A.input.md#L4>)；不能从中推导出新增预算计算、格式校验或执行限制。

2. **应保持的旧性质**

   给定基线使用 `read(...)` 读取 `output`、`acceptance`、`depth`，并仅在结果非 `undefined` 时加入属性，见[第 26–36 行](</Users/bowhead/ai_dsh_deep_research/runtime/smoke-workspace/preventive-quality/admission-A.input.md#L26-L36>)。此次扩展应保持已有字段的解析结果与节点、依赖等已有输出；没有 budget 列的旧输入应继续可用，不凭空引入预算默认值。

   输入没有提供 `read` 的实现，因此不能断言空单元格最终应为 `undefined`、空字符串还是其他归一化结果。需要核对它是否沿用相邻可选字符串字段的约定。输入也没有建立“预算必须符合数字、单位或范围要求”的旧性质。

3. **受影响入口与消费者**

   直接入口是 `planIndex()` 的节点表读取与节点构造段；直接契约是 `PlanNode` 以及返回的节点对象。输入明确展示的消费行为只有 `index.nodes[0].budget` 属性读取，见[第 66–73 行](</Users/bowhead/ai_dsh_deep_research/runtime/smoke-workspace/preventive-quality/admission-A.input.md#L66-L73>)。

   展示、序列化或依赖节点完整形状的下游若存在，可能观察到新增属性，但本输入没有给出这些消费者的身份和逻辑。不能据此声称某个 UI、调度器或预算执行链已经受影响。必要时只沿实际直接消费关系定点核对，无需按相关名词扫描文件。

4. **必要的最小证据**

   - **字段保留正例：**真实节点表经 `planIndex()` 后得到 `budget === '2 轮'`。候选断言表达了这个目标，但需要实际执行成功，不能把断言文本当作通过证据。
   - **旧输入兼容：**一个无 budget 列的有效旧表，仍产生原有字段、节点及依赖结果，且不生成预算默认值。
   - **空单元格边界：**一个有 budget 列但内容为空的输入，结果遵循 `read` 处理其他可选字符串字段的既有约定；无需在本轮发明新的空值规则。
   - **直接消费兼容：**若实际消费者依赖完整对象形状或序列化结果，只补对应的最小证据。输入没有显示这类消费者，不能将其扩成无条件必跑清单。

   输入[第 76 行](</Users/bowhead/ai_dsh_deep_research/runtime/smoke-workspace/preventive-quality/admission-A.input.md#L76>)明确指出，候选测试只覆盖一个合法值，不覆盖缺失、空值、格式或消费者裁决，因此现有正例不能证明这些边界。

   另一个需要确认的具体细节是[第 71 行](</Users/bowhead/ai_dsh_deep_research/runtime/smoke-workspace/preventive-quality/admission-A.input.md#L71>)的 `.join('\\n')`：如果按展示的 JavaScript 原样执行，它会连接字面量反斜杠和 `n`。应确认实际夹具使用真实换行，确保正例确实经过表格解析。这是证据有效性检查，不要求替作者补写测试。

5. **是否新增专门准入流程**

   **不需要。**当前候选是一个可选字符串字段的透传扩展，解析器级的定点验证即可承载上述证据。语义触发应带来契约核对和适量兼容证据，不自动要求新门禁、新 RFC、专门审批或整链验收。

   若后续另有变更让 budget 参与执行或裁决，再评估那部分新增语义。本次结论仅针对输入记录的基线 `48d57835` 与尚未应用的虚拟 diff；当前材料不足以判定实现已验收通过。
````

### B 完整 final

非入库原件：`runtime/smoke-workspace/preventive-quality/admission-B.output.md`；25 行；SHA-256：`c01816b77358e4330b71de36be57388ec3c05f964a4ed0125ccd85fb5d1a9e85`。

````text
建议分类：**普通改动，不触发语义专项准入；无需新增专门准入流程。** 已仅阅读指定输入，未读取其他文件、未修改文件，也未执行测试。完整结果已发送给父 agent。

1. **分类依据**

   候选 diff 只把 `parseFindings` 内局部变量 `cur` 一致改为 `current`，覆盖声明、对象赋值、加入数组、空值守卫、`gap` 赋值和 `evidence` 赋值六处。没有改变表达式、控制流、数据字段或返回值，符合“不改变解析规则、返回形状或消费者”的意图。判断依据是实际 diff，而非输入中“免触发”的标签。见[输入第 4 行及第 39–54 行](</Users/bowhead/ai_dsh_deep_research/runtime/smoke-workspace/preventive-quality/admission-B.input.md#L39-L54>)。

2. **应保留的旧性质**

   `parseFindings` 按行读取文本：遇到匹配 `## F数字: 标题` 的行，创建 finding 并按出现顺序加入数组；首个 finding 前的非标题行被忽略；后续匹配的 `gap` 和支撑证据路径写入当前 finding；最终返回数组。元素形状为 `{ id, conclusion, gap, evidence }`，初始 `gap` 为 `null`、`evidence` 为空数组。本次改名保留这些行为。见[输入第 11–31 行](</Users/bowhead/ai_dsh_deep_research/runtime/smoke-workspace/preventive-quality/admission-B.input.md#L11-L31>)。

3. **受影响入口与消费者**

   直接修改范围仅为候选模块中的 `parseFindings` 函数体。其调用方和返回数组消费者没有由本 diff 引起的可观察合同变化。

   输入没有展示调用点、导出关系或具体消费者名称，因此不能声称已经核对某个 CLI、dashboard 入口或具体消费者，也没有必要按相关名词扩展扫描。此处可确认的是函数内部绑定等价，以及意图明确声明消费者不变。见[输入第 4–6 行](</Users/bowhead/ai_dsh_deep_research/runtime/smoke-workspace/preventive-quality/admission-B.input.md#L4-L6>)。

4. **必要的最小证据**

   将基线片段与候选 diff 对照，确认上述六处声明与引用全部一致替换，且函数作用域内没有引入 `current` 同名绑定冲突。输入展示的完整函数片段与 diff 已足以完成这项静态核对，支持“普通改动”的分类。见[基线第 11–32 行](</Users/bowhead/ai_dsh_deep_research/runtime/smoke-workspace/preventive-quality/admission-B.input.md#L11-L32>)和[diff 第 39–54 行](</Users/bowhead/ai_dsh_deep_research/runtime/smoke-workspace/preventive-quality/admission-B.input.md#L39-L54>)。

   实际落地沿用既有普通改动检查即可；无需为此次纯局部改名新增专测、消费者矩阵或真实入口探针。本次结论是静态等价判断，不代表已运行验证。

5. **是否有必要新增专门准入流程**

   **没有。** 当前候选没有改变解析规则、输出合同或消费者约定，增加专项门禁或准入材料没有对应的新增证明对象。若实际落地 diff 进一步改变正则、字段、分支、返回值或绑定关系，应针对那项实际变化重新评估；当前输入不支持升级准入要求。
````
