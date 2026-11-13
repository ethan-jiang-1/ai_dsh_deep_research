---
name: class-level-guards
description: Turn a discovered defect into a guard that catches its whole input class — six reusable shapes, a graduation template, anti-patterns, and cost control.
whenToUse: A bug/incident is fixed and the adjacent variants should fail too; a parser, judgment, state machine, path handler, consumer set, or slow-shell oracle is added or repaired. Not for one-off arithmetic, closed enums with a single writer, or a single call contract.
---

# 类级守卫形态库：一个 BUG 怎么变成咬住邻接变体的守卫

> **口径**：DSH 侧取 `vendor/dsh/`（pin `dsh-v0.2.1-rc.5` @ `b830ec950f`）一手源，引到文件:行；
> 本仓侧引到文件:行。**未运行任何测试**——本文全部为读码/读文档所得的静态事实；凡需实跑的数字
> 均标出处（仓内既有记录）或标「估算」。不修改任何 tracked 文件。
> **结构**：§0 给可判定的定义（否则「类级」会变成形容词）→ A 上游形态 → B 本仓样本解剖 →
> C 六种可复用形态 → D 毕业模板与两个真实族示例 → E 反模式 → F 成本控制。
> **本文与 `special-topics.md` 的分工**：那篇判「差距在哪、该不该补」；本篇判「补的时候写成什么形状」。

---

## 0. 先把「类级」变成可判定

「类级守卫」在本仓是个形容词容易、判据难的东西。本文采用三条可判据（缺一即不算类级）：

| # | 判据 | 反例（本仓真实存在过） |
|---|---|---|
| 1 | 断言的命题里有一个**显式的 ∀**：对某一族输入的**任意**成员成立 | 「`旧轮记录：\`readiness: PASS\`；本轮真实终局：readiness: FAIL` 读成 FAIL」——只对一个字符串成立 |
| 2 | 变体族由**同一事实的两种写法 / 两个读者 / 两个时刻**生成，不是随机字符串 | 「随机 fuzz 10 万条不崩」——不崩不是契约 |
| 3 | 能**指名一个邻近变体**让它变红（负控），且这个变体不是已报的那一条 | 修 BUG-141 时补的用例，全部取自 141 报告里的那几行 |

第 3 条最容易被跳过，也最贵：**修 BUG-141 时补的用例，正好漏掉了 BUG-150 的四种措辞**
（`随后/复核后/结论/本 run`，见 BUG-150 卡的症状表），两次修复、同一行代码（`lastInlineVerdict`）、相隔一天。这就是「没有类级守卫」的
可计量代价——不是「不够优雅」，是同一个 bug 交两次学费。

上游把这条判据写在两处：`vendor/dsh/docs/testing.md:40`（「A guard only guards if the
regression fails it… prove it: introduce the regression, watch red, revert」）与
`vendor/dsh/.agents/skills/dsh-code-review/SKILL.md:54`（「verify a deliberately invalid case
fails through the real runner **for each changed acceptance rule**」）。注意后者是
**per-rule** 而不是 per-test——一条验收规则一个负控，这就是类级的粒度。

---

## A. DSH 一手源里的类级做法

### A.1 negative control / prove-it-red（三处，粒度不同）

| 出处 | 原文要点 | 粒度 | 机械面 |
|---|---|---|---|
| `docs/testing.md:40` | 「A guard only guards if the regression fails it」+ plugin 导出守卫的具体红法（引入回归、看红、还原） | 每条守卫 | 无（review 纪律） |
| `packages/AGENTS.md:19` | 「Registry contributions **prove disposal** through the HMR-safety test required by testing policy」——把「证明」写进包规则 | 每类注册 | vitest（该测试本身是机械的） |
| `dsh-code-review/SKILL.md:54` | 「verify a deliberately invalid case fails **through the real runner** for each changed acceptance rule」 | **每条验收规则** | 无（review 清单） |

三点非显然：
- **`through the real runner`** 是防「用 assert 在测试里自证」的关键限定。本仓 `gates-smoke`
  （真注入 → 跑真 `verify` 入口 → 判红）是这个形态；单测里的 `assert.throws` 不是。
- DSH 把「证明」当**规则**写，不当流程写——所以它出现在 `packages/AGENTS.md`（常驻指令）
  而不是某个 cookbook。本仓的对应物是 `tests/AGENTS.md:44`（见 A.5）。
- 三处都**没有**要求「每次提交都跑一遍」——负控是一次性证据（红过即算），不是常驻成本。

### A.2 `contract-regressions.spec.ts` 的形态（1522 行 / 40 例）

`vendor/dsh/packages/core/agent-loop/tests/contract-regressions.spec.ts`。文件头注自己给了
分类：**「Regression tests for agent-loop boundary, identity, and lifecycle contracts」**（`:30`）
——三个词就是三个类。

结构规律（按 `describe` 分组，`:59`–`:1283`）：

| `describe`（= 失败类） | 行 | 例数 | 邻接变体维度 |
|---|---|---|---|
| assistant replay provider and model fields | :59 | 1 | — |
| abort during tool execution ends the turn | :81 | 5 | 哪个阶段 abort（tool-step / 后续 call / 空批 / disposal / injection deferral） |
| steering from late extension points is never stranded | :318 | 1 | — |
| plugin exceptions are contained | :345 | 1 | — |
| **disposal leaves the two-state status contract balanced** | :374 | 2 | 谁抛（active turn / throwing listener） |
| adapter registration, routing, and accepted-input ownership | :428 | 5 | 重复注册 / 无 model / waterfall 供 model / inbox 精确性 / batch 记录 |
| turn numbering continues across seeded sessions | :565 | 2 | fork 形态（整段 / mid-turn） |
| a finish-error stream chunk ends the turn as error, not completed | :767 | 3 | error 带 code / aborted / 不带 code |
| **turn and step boundary recovery** | :870 | 11 | 谁抛 × 哪个边界（turn/start、step/start、step/end、session/event）× disposal 介入时点 |
| forked tool history reaches the next model request | :673 | 1 | — |
| discriminated SessionEvent narrows without casts | :749 | 1 | — |
| step boundary publication order | :843 | 1 | — |
| tool result call identity | :1238 | 1 | — |
| **disposal and cancellation during pre-step assembly** | :1283 | 5 | disposal/cancel × assembly/pre-step × 是否泄漏 LLM 调用 |

**关键事实修正**：任务假设「注释回指 bug」。实际**40 例里只有 1 处**注释提到原始 bug：
`:1478`「The key assertion from the original bug report: after disposal, no `assistant/attempt`
or `assistant/message` appears」。其余全靠在**标题里写不变量**：
- 「a throwing `step/end` observer **cannot rewrite** the turn outcome」（`:1137`）
- 「a throwing agent/status listener **cannot break** disposal or **leak** the registry entry」（`:406`）
- 「an agent without a model fails the step with a clear error (**not** `NO_ADAPTER` for "default")」（`:440`）

这就是可复制的第一条：**类级守卫的标题是命题，不是场景描述**。DSH 的标题里出现
`cannot / never / not` 的比例极高——那是在写 ∀，不是在写一次执行。

**它证明什么/不证明什么**：例数按失败类聚，但**每个变体仍是手写单例**（没有生成矩阵、没有
`it.each`）——45 例里 `it.each` 命中 0。所以 DSH 的这条形态是「**变体枚举**」而非「**空间量化**」：
它靠人把邻接变体列全，不靠机器穷举。这是本文 §C 形态 1 与本条的差别所在，也是本仓可以超过上游的地方。

### A.3 `tool-todo` 四件套的分工

四个文件，四种「真」，没有一条是重复证据：

| 文件 | 真的是什么 | 替身是什么 | 顶部声明 |
|---|---|---|---|
| `tool-todo.spec.ts:16-19` | 真插件体 + 真 `ToolRuntime` + 真 `Session` | 只替身 parent Agent 壳 | 「drives the REAL plugin body… only the agent wrapper is a stand-in」 |
| `integration.spec.ts:11-13` | 真 agent-loop + 真工具 + 真会话日志 | 只 mock 模型 | 「Only the model is mocked; the tool and the session log are real」 |
| `projection.spec.ts:1-7` | 投影 provider + **unmount 即撤销**（HMR safety） | 无 | 「unmounting tool-todo removes it (HMR safety)」 |
| `loader-composition.spec.ts:1-4` | 真 Loader 起 `cordis.yml` + 配置值两面跟随 | 无 | 「Proves `allowParallelInProgress` is **real configurability and not a constant**」 |

分工判据一句话：**行为 / 集成 / 生命周期 / 组合，四个面各有一个文件，文件头注写明「真是哪个、假是哪个」**。
本仓的五台阶（`docs/guides/62:82-88`）是同一个分类轴，但落成「一张表 + 各自载体」，
没有这个「每件自述真假」的写法。这一点值得抄：**头注里的「真/假对照」是类级守卫的可读性来源**——
读标题知道守什么，读头注知道这个守卫站在哪一层。

### A.4 `timeout-policy` 的分支矩阵

`vendor/dsh/packages/guard/timeout-policy/tests/timeout-policy.spec.ts`（244 行）按**分支**分组，
而不是按函数：

| 分组 | 行 | 覆盖的分支 | oracle |
|---|---|---|---|
| delegation (unconfigured / fast) | :48 | 无预算 → 不动 signal；有预算快返回 → 保留自身结果；有预算慢 → 收**派生** deadline signal | `expect(seenSignal).toBe(upstream)`（身份相等，不是「值差不多」） |
| signal restoration | :84 | 包装后把 caller signal 还给 post-execute | 同一 identity |
| TOOL_TIMEOUT replacement | :97 | 自己 deadline 赢 / provider 抛 abort 但 signal 是我们的 / **caller 先 abort（上游取消不是超时）** / deadline 赢之后才 caller abort | `TOOL_TIMEOUT` vs registry `ABORTED` 的**码位** |
| contract | :196 | 常量导出 | 值 |
| disposal (HMR safety) | :202 | dispose 后 listener 摘除 | 注册数 |
| real-load-path guard | :220 | 枚举形态 + 真挂载包裹 | `expect('default' in mod).toBe(false)` + `unwrapExports` |

「竞态两序」是这里最值钱的一格：`:131`（caller 先 abort → 保留 `ABORTED`）与 `:159`
（deadline 先到 → 保留 `TOOL_TIMEOUT`）**同一段代码、两种到达顺序、两个期望**。这是 §C 形态 4
的最小原型：**顺序不是场景细节，顺序是输入维度**。

另外两点工程细节可直接抄：
- 用 **fake timers** 驱 deadline（`:4`「drive the deadline under fake timers (deterministic — no
  wall-clock race)」）——时间竞态要假时钟，不要 `sleep`。
- 用一个**合作式工具**（只在 `exec.signal` abort 时落定，`:36-44`）来证明「信号真的传到了下游」——
  这就是 A.2 里「verify the world」的单元级形态。

### A.5 「读散文判值」：DSH 没有等价物（明说）

DSH 的判断几乎都读**结构化事实**（Session 事件、`snapshot.yml` 字段、manifest 字段）。所以
「从 review.md 里判 PASS/FAIL」这类判定在 DSH 语料里**找不到对应形态**。这不是遗漏，是设计：
DSH 把「模型的说法」变成事件，再从事件判值。

DSH 最接近的替代物是**全仓语法守卫**：`vendor/dsh/scripts/verify-*.ts` 共 **76 个**，每个都是
「一条语法/结构规则 × 全仓所有匹配文件」。样例 `verify-cordis-config.ts:1-12` 的头注就是一篇
小型判据设计：说明 Loader 只在 `config` 与 `disabled` 上插值、其余元数据保持静态、表达式留在
那里是**真值数据**从而静默改变组合——然后对全仓 Cordis YAML 扫这条规则（该守卫由
`docs/postmortem/0002` 的 Guardrails added 一节催生，见该文 `:36-40`）。

对本仓的结论：**「读散文判值」这一类只能自建**，不能抄。可抄的是它的**形状**——
「一条规则 × 全仓所有文件」= §C 形态 3（消费者清单）的静态版，以及「把不变量写在头注里，
让守卫自己解释为什么存在」。

### A.6 property / fuzz / mutation / table-driven 的实况（grep 结果）

| 手段 | DSH 实况 | 证据 |
|---|---|---|
| **property-based** | **有**，`fast-check ^4.9.0` 是 devDependency；**5 个文件**用到 | `package.json:260`；`packages/schedule/schedule/tests/recurrence.spec.ts:19-22`（三个整数 generator + `fc.assert(fc.property(...))`）；`packages/llm/llm/tests/properties.spec.ts:1-9`（头注写明「The assembler is protocol-shaped: arbitrary interleavings… valid and malformed」） |
| **table-driven** | **很普遍**：`grep -rn 'it\.each\|test\.each'` 命中 **2,489 行** | 样例 `packages/settings/settings/tests/editor-failures.spec.ts:13-16`（`it.each([...])('refuses %s observed after initial validation', ...)`，三个变体：权限拒 / 截断 YAML / 错文档） |
| **fuzz** | **无 harness**。`fuzz` 的命中全是产品语义（模糊搜索 `fuzzy`） | `packages/context/file-reference-local/tests/search.spec.ts:153` 是「fuzzy match」，不是 fuzzing |
| **mutation testing** | **无**。`stryker` / `mutation testing` 零命中；docs 里的 "mutation" 指 Session 事件变更 | grep 结果为空 |

三条推论：
1. DSH 的 property 测试**不是泛用**，只给「协议形状 + 任意交错」的组件（流式装配、日程递推）。
   它不拿 fast-check 测散文解析——因为散文解析根本不在 DSH 的判据面上。
2. `it.each` 的 2,489 处说明**表驱动是默认写法**，不是高级技巧。本仓的对应物是
   文件内 `for (const x of [...])`（`verdict-conformance.test.mjs:17-22`、`:72-88`），**等价且零依赖**——
   不需要为「表驱动」引任何东西。
3. **没有 mutation testing 不代表没有变异**：DSH 的变异在 `gates-smoke` 式「注入回归看红」里
   （一次性、人工构造），本仓 `scripts/smoke/gates-smoke.mjs` 的 108 个注入案例是同一件事的
   规模化形态。**这是本仓唯一领先上游的机械面**，值得在写新守卫时优先复用
   （把新门禁也加入注入案例表，而不是只写一条 `assert.throws`）。

### A.7 小结：DSH 的类级手段分两层

```
判据层（读什么值）      → contracts 里的「变体枚举」+ 标题里的 ∀          ← 靠人列全
执行层（怎么防假绿）    → prove-it-red / negative control / gates         ← 一次性红证
语法层（全仓规则）      → scripts/verify-*.ts（76 个）                    ← 一条规则 × 全文件
空间层（穷举输入）      → fast-check，仅 5 个文件，协议形状组件          ← 不用于散文
```

本仓的落点：执行层已有（`guard-red-record` 门禁，比上游更机械）；**判据层部分有**（见 §B）；
语法层有等价物（`verify/gates/*.mjs`）；空间层几乎空白（见 §C 形态 1）。

---

## B. 本仓 8 件样本：形状与缺口

### B.0 归类总表

七种形状的定义（本文自用，按「变体从哪来」区分）：

| 形状 | 变体来自 | 断言的对象 |
|---|---|---|
| 例子集合 | 人挑的样例 | 每个样例的输出 |
| 边界表 | 缺/空/非法/互斥/旧形态/编码 | 边界处的判决 |
| 笛卡尔矩阵 | 维度的乘积 | 每一格 |
| 不变量 | 无变体，只有命题 | 性质（∀ 已在命题里） |
| 同源对账 | 两个实现 / 两个读者 | 两者一致 |
| 状态交错 | 时刻与顺序 | 每个交错点的状态 |
| 消费者清单 | 生产者集合 | 每个生产者都有消费者 |

| 文件 | 行/例数 | 主形状 | 副形状 | 缺的那一维 |
|---|---|---|---|---|
| `tests/run/review-readiness.test.mjs` | 233 / 21 | 例子集合 | 边界表、同源对账 | **生成矩阵**（唯一没有的，见 B.1） |
| `tests/cockpit/library-fold.test.mjs` | 507 / 41 | 例子集合（夹具电池） | 边界表、单点 round-trip | **语法变体笛卡尔 + fold⇄write 同源**（见 B.2） |
| `tests/run/node-gate-witness.test.mjs` | 433 / 29 | 状态交错 | 消费者清单、假绿 oracle | **时刻×绑定的组合矩阵**（见 B.3） |
| `tests/contracts/verdict-conformance.test.mjs` | 89 / 5 | **不变量 + 笛卡尔矩阵** | 边界表 | **编码变体**（BOM/CRLF/U+3000 不在矩阵里，见 B.4） |
| `tests/contracts/present-version-conformance.test.mjs` | 49 / 4 | 不变量 | 同源对账 | **输入空间**（present 条数×路径形态×事件序，见 B.5） |
| `tests/run/replay-request.test.mjs` | 360 / 22 | 同源对账 | 假绿 oracle、消费者清单 | **归一化边界的对偶矩阵**（见 B.6） |
| `tests/pack/method-library-io.test.mjs` | 102 / 7 | 路径/形态矩阵 | 状态交错 | **空格/unicode/超长 + 读写同源显式对账**（见 B.7） |
| `tests/run/run-lock.test.mjs` | 63 / 4 | 状态交错 | 边界表 | **跨进程真并发 + pid 复用长龄**（见 B.8） |

### B.1 `review-readiness.test.mjs` —— 例子集合 + 跨实现对账，缺矩阵

**形状**：21 例，绝大多数是「一种写法 → 一个期望」。头注 `:1-13` 是本文见到的**最好的判据头注**：
它把三条反证配方逐条写成「改回 X → 用例 N 红」（`:9-12`），而不是笼统说「有负例」。

**已有的类级成分**（两处，都很值钱）：
- **同源对账**：`:168`「跨实现一致（BUG-040）：门 `readinessOf.pass` 必须等于 pack 终局判定为 PASS」、
  `:185`「附条件 PASS 仍算 pass（门独有语义不得被委托丢掉）」。这是形态 2 的原型——
  **两个入口同判**，且第二个用例专门钉「委托不能丢掉调用方独有语义」。
- **负例留证块**：`:102`（D51）、`:144`（BUG-046）、`:165`（BUG-040）、`:192`（074）、`:211`（141）、
  `:225`（150）——六个块，每块一句话红配方。这是 `guard-red-record` 要求的形态，也是本仓的
  强项。

**缺口**：**没有生成矩阵**。而 074/141/150 三代同源的失败恰好只能被矩阵咬住——它们的共同点是
「同行两个判定，谁说了算」，输入空间 = (位置) × (值) × (散文前导) × (包裹形态)。
现有 21 例覆盖了这个空间的**约 8 个点**，且全部来自三张卡的报告行。

**这个缺口现在被补上了，但补在另一个文件里**：`tests/contracts/verdict-conformance.test.mjs:68-88`
就是那个矩阵。所以真实状态是「**矩阵存在，但与 21 例的回归集分居两个文件、两套命名**」——
搜索「readiness」的人会命中前者，搜索「不变量」的人命中后者，两者互不指认。
这是组织缺口不是能力缺口，修法成本 ≈ 两行交叉引用。

### B.2 `library-fold.test.mjs` —— 夹具电池，缺语法笛卡尔与写侧同源

**形状**：41 例。核心是 **「自测例电池」**（`:226-230` 定义、`:233-330` 十个「电池·X」用例）：
一份 12 条条目的夹具 `SELFTEST_LIBRARY`（单一正本在 `scripts/lib/selftest-library.mjs`，
与 `client-load-smoke` 自测工作区共用），逐条断言。这个形状的价值是**夹具与冒烟共享**，
防形态漂移——比每个测试自带内联字符串强。

**已有的类级成分**：
- **单点 round-trip**：`:382`「`renderLibraryEntry`：四字段/来源/默认标注可 round-trip 回 `foldLibrary`」。
- **编码变体单点**：`:302`「电池·CRLF+缩进：`\r` 被 `trimEnd` 消化；前导空格分区行不匹配」。
- **静态文案钉**：`:332` 的 `COPY_PINS`（8 句防错读文案）——这是形态 3 的窄版（文案键的消费者清单）。

**缺口（本文最重要的一条发现）**：`library-fold` 相关的 8 张卡是**同一个类的 7 个邻接变体**，
而测试的应对是「一卡一例」：

| 卡 | 变体 | 谁和谁不一致 | 当时的修法 |
|---|---|---|---|
| BUG-081 | 名称含全角 `（` | fold 切成 provenance / UI 用 raw name | 在 UI/写工具**拒绝**该名称（`methodNameIssue`） |
| BUG-085 | `〔默认偏好〕` 在 `（provenance）` 之前 | fold 认任意序 / upsert 只认正序 | 写入侧正则接受任意序 |
| BUG-093 | 四字段用 `*`/`+`/缩进/全角冒号 | fold 只认 `- 找来源:` 前缀 | 前缀匹配放宽 |
| BUG-123 | 标记写在 provenance 括号内 | fold 查整条 title | 排除括号段 |
| BUG-124 | 段间带空格 `## 方法 （来源） 〔默认偏好〕` | fold 接受 / upsert 不接受 | upsert 加 `\s*` |
| BUG-127 | **半角**括号 `## 方法(来源)〔默认偏好〕` | fold 只认全角 | 半角当同一语法 |
| BUG-128 | **U+3000 全角空格** | `[ \t]*` 不含 U+3000 | 改 `[^\S\n]*` |
| BUG-138 | 未识别后缀 `[草稿]` | 两侧都不认 → 幽灵条目 | upsert fail-loud + remove 按 fold 名寻址 |

这 8 条的共同命题只有一句：**「同一段标题文本，fold（读）与 upsert（定位）必须给出同一个名字」**。
每次修完只补了报告里的那一个字符串，于是下一次换一个空白类/括号类/后缀类就复发。
`method-library-write.test.mjs` 里虽然有 `foldLibrary(result.text)` 的 round-trip（`:25`、`:31`），
但**只在 canonical 形态上跑**，且**在另一个文件里**——两个文件的断言从不交叉验证同一输入。

**这一族的类级守卫形态本该是**：括号宽度 × 段顺序 × 分隔符空白类 × 后缀 × 标记位置 的笛卡尔，
oracle = 「`fold(h).name` 命中的行 == `upsert` 命中的行」（见 §D 示例二）。

### B.3 `node-gate-witness.test.mjs` —— 状态交错 + 假绿 oracle，缺组合维

**形状**：29 例，是本文见到的**最接近「状态交错」**的本仓样本。它的骨架是**真实语料形状的
夹具构造器**（`:24-70`）：

```js
const head = (preset='lead', depth=0) => at({ type:'session', version:4, ..., delegationDepth:depth, agentPreset:preset })
const bind = (slug='x') => at({ type:'tool/call', data:{ ..., name:'write', arguments: JSON.stringify({ file_path:`drt_${slug}/question.md`, ... }) } })
const ask   = (slug='x') => ...   // ask_user_question 调用
const reply = (label, time) => ... // agent/inbox/spliced，source.kind = 'user-question-reply'
const present = (path, time) => ...// deliverables/presented
const askResult = (label, time) => ... // timed ask 的真实答复形态（tool/result，无 inbox splice）
```

头注 `:7-9` 明写夹具来源：「真实语料（2026-10-23 清点 1831 条日志）——presented 147 条、
user-question-reply 20 条；reply 正文是 `{answers:[{id,selected:[…]}]}`（不是顶层 `selected`）」。
**「保留真实形状，防实现只认自造简形」**——这句话是形态 5/6 的分界判据，值得抄成规则。

**已有的类级成分**：
- **消费者清单**：三族断言（`presentedInLogs` / `hitl2ReplyInLogs` / `hitl2RowGate`）各自把
  「哪些不算见证」列全：前缀 slug（`:86`）、未绑定（`:94`）、别的 run（`:103`）、非 lead（`:111`）、
  早于契约纪元（`:150`）、整数契约无 contract（`:162`）、非法纪元（`:175`）。
- **假绿 oracle**：`:130`「会话语料缺席 → **UNATTESTED**（不是红也不是绿）」——三态，不是二态。
- **时序交错**：`:139`「present 早于 HITL2 答复 → RED（事件链顺序不成立）」；
  `:321`「最新 ask 未答复时，更早 ask 的答复不得放行」；`:333`「最新 ask 已答复 → PASS」。

**缺口**：维度是**逐个点动手写的**，没有组合。真实输入空间是
`(绑定 × 身份 × 时限 × 版本配对)` 四维：绑定{本 run/别的 run/无} × 身份{lead/子代理} ×
时限{纪元前/纪元后} × 版本{v1/v2/末条无版本}。现在覆盖 ≈ 11/24 个点，且 `:420`（BUG-156
版本配对）是**最后一个被发现的**——它正是 (版本 × 末条) 这一维的交叉点。

### B.4 `verdict-conformance.test.mjs` —— 本仓最标准的类级样本

**形状**：5 个用例，恰好是「四条不变量 + 一个生成矩阵」：

| 用例 | 行 | 形状 | 机制 |
|---|---|---|---|
| 不变量①结构位置 | :16 | 笛卡尔（小） | `for value × for prefix`（9 种装饰前缀） |
| 不变量②散文前缀 | :28 | 表 | 8 个前导词 + 3 种整行包裹 |
| 不变量③互斥 → null | :45 | 表 | 5 个互斥行 + 3 个「引用/模板/表格不夺权」 |
| 不变量④跨行次序 | :61 | 表 | 末位 vs 轮次高者 |
| **不变量⑤生成矩阵** | :68 | **三重笛卡尔** | `position(4) × value(2) × lead(4)` = 32 格，期望 `lead === '' ? value : null`；再加 `position × value × lead(×2)` 的互斥格 = 16 格 |

它的头注 `:3` 说清了为什么必须是行为测试而不是门禁：**「可判的是『同一行给出互斥读法时返回
什么』，grep 判不出猜不猜」**。这一句是「什么时候该写矩阵」的判据——**当被测对象的核心行为是
"在歧义下选什么"时，例子永远不够**。

**缺口**：矩阵的三维里**没有编码维**。而同类问题（§D 示例二的方法库族）的复发几乎全在编码维上
（`\r`、`\t`、U+3000、全角/半角括号/冒号、BOM）。`judgment-design.md:46` 明确把
「encoding (full-width/half-width, U+3000, BOM, CRLF)」列进必覆盖清单，而本文件没照做。
**这是本仓「写对了形态但漏了一维」的典型**，也是成本最低的一处补强（加两行 `for`）。

### B.5 `present-version-conformance.test.mjs` —— 纯不变量，无空间

**形状**：4 条不变量（`:19`/`:26`/`:33`/`:38`），零矩阵。
- 不变①：交付版本只认 present 事件路径，正文提及 v9 不算。
- 不变②：最后一条 present 指 `final.md`（无版本）→ `null`，不拿更早的 v1 冒充。
- 不变③：交付判定与 plan 正文版本**解耦**（plan 写 v9 不改 delivered）。
- 不变④：plan 头与重写记录冲突 → 报冲突，current 取头部声明（不取 max）。

**它凭什么不需要矩阵**：因为这四条不变量是**否决式**的（「X 不能影响 Y」），不是**仲裁式**的
（「同一行两个读法选哪个」）。否决式的 ∀ 已经在命题里（「正文提及**任何**版本都不算」），
举例即证。这是 §F「哪些类不需要矩阵」的第一条判据。

**缺口**：`null` 的三态语义（无版本 / 未交付 / 有版本）只有 `:26` 一个点；present 条数从 0 到 N
只测了 1 和 2。若将来出现「present 只发 v2、v1 从未发」这类形态，无从判断。轻，但便宜。

### B.6 `replay-request.test.mjs` —— 同源对账 + 假绿 oracle

**形状**：22 例，几乎每一例都是一条「比较器语义」的**边**：

| 边 | 用例 | oracle |
|---|---|---|
| 空输入不许放行 | `:55`「empty logs never pass a required criterion」 | 空 → 不满足必过判据 |
| 归属按 source kind，不按正文像不像 | `:74`「injection attribution uses source kind rather than a reminder-looking body」 | 身份字段 |
| 归一化只归该归的 | `:119`「runtime-context normalizes **only** boot-generated GUI port, harness checkout and workspace root」；`:161`「header schema keeps arbitrary SHA and loopback URL text unchanged」 | 该留的逐字 / 该归的 token |
| 面覆盖双向 | `:243`「an injection kind absent from the reviewed baseline is surfaced」；`:255`「a new `system/message` injection kind is surfaced too」；`:264`「every recorded role injects only kinds the compared judges cover」 | 覆盖率 |
| 回合落定只认 assistant | `:306` 哨兵只在 prompt 回显 → **不算**；`:316` 在 assistant 文本 → 算；`:324` `turn/end` 缺席/非 completed → 未结束 | 事件类型 + 显式状态 |
| 归一化不许过宽 | `:331`「time-context 只比 turn/step：墙钟不同不红，步序不同红」 | 结构 |

**这是本仓「同源对账 + 归一化边界」的最佳样本**，因为它**同时**测了两个方向：
该归的必须归（否则跨机假红）、不该归的必须逐字（否则真回归被吞）。两方向缺一，归一化就会
滑向「凑绿」。

**缺口**：`normalizeRuntime` 的三条 replace（`scripts/lib/replay-request.mjs:26-35`）是**逐条例子**，
没有「一个 token 被归一后，同类的另一个 token 也必须被归一」的生成式断言。若上游再加一行
runtime context（例如 cwd 之外的某个根），第三条 replace 的句式就失配，而测试不会红——
**这正是 `:30` 注释里已记过一次的失效形态（0.2.1 换 pin 时 persona 归一化变死规则）**。

### B.7 `method-library-io.test.mjs` —— 路径/形态矩阵（本仓最佳路径样本）

**形状**：7 例，每例一个**形态**，且每例都断言「外部文件不变」这个**世界侧真值**：

| 形态 | 行 | 断言 |
|---|---|---|
| symlink 目标 | :14 | 读/写都 `throws`；`readFileSync(outside) === 'OUTSIDE ORIGINAL\n'` |
| 原子写残留 | :26 | 写入后 `accessSync(tmp)` 抛（无残留）；目录当文件 → `throws` |
| 活锁 / 陈旧锁 / 串行 | :37 | 活锁抛「正在进行」；改 mtime 后可接管；串行 mutate 看到前写者文本 |
| hardlink | :54 | 读 `throws /hardlink|nlink/`；外部不变 |
| 活 pid 旧 mtime | :64 | 不接管 |
| 旧 owner 释放 | :76 | token 不匹配 → 不删新锁 |
| 活 pid 长龄 | :92 | 错误**含锁文件路径 + 删除处置**（可操作性也是契约） |

强在三点：①**每个形态都覆盖双向**（该拒的拒 + 外部世界没变）；②`:92` 把「错误信息可操作」
当契约测；③锁族的四个变体（活/死/旧 owner/长龄）是同一状态机的四个边。

**缺口**：①没有空格/unicode/超长路径（`replay-scene.test.mjs:196` 有「路径含空格」的先例，
可移植）；②「读路径与写路径用同一判据」是**逐个断言**而非显式对账——现在靠每个 test 都调
`assert.throws` 间接证明，若将来只改一侧，另一侧的测试仍绿（这是 081 族的同构失败）。

### B.8 `run-lock.test.mjs` —— 状态交错，缺真并发

**形状**：4 例，覆盖建锁原子性（`:14`）、死 pid 接管（`:30`）、**创建窗口**（`:42`，且断言
「必须给创建者 ≥100ms 宽限」而不是断言「最终拿到了」）、释放所有权（`:54`）。

`:42` 是全仓唯一一条**断言时序预算**的测试（`Date.now() - started >= 100`），它把
「3×50ms 宽限」这个实现细节变成了可证伪契约。这个写法值得独立成形态：
**「不许抢跑」也是不变量**，而且只能靠时间下界断言。

**缺口**：①**同进程两次调用 ≠ 跨进程并发**——真正的并发面（两个进程各自 `acquireRunLock`）
需要子进程，测试没有；而 DSH 的判据恰好是「run independent test processes concurrently」
（`dsh-ci-test-reliability/SKILL.md` §Prove the intended regression）。②pid 复用的长龄分支
只在 `method-library-io.test.mjs:92` 测过（另一个模块的锁），`run-lock` 自己没有。

---

## C. 六种可复用形态

每种给：适用失败类 / 输入空间 / oracle / 骨架 / 负控 / 成本 / 何时不该用。
骨架是 `node:test`，零新依赖，符合 `tests/AGENTS.md`（不引测试框架）。
骨架里的 `entryOf` / `headNameOf` / `outcomeOf` / `writeOwner` / `age` / `readVia` /
`verdictOf` / `turnEnd` / `walk` / `escapeRe` = 该文件自带的 2–3 行辅助（文件内私有，不进 `lib/`），
不是待装依赖。`walk` 可直接抄 `scripts/verify/gates/f-repo.mjs` 的递归实现。

### 形态 1：语法/解析矩阵

| 项 | 内容 |
|---|---|
| **适用失败类** | 「同一段文本有多种等价写法，解析器只认一种」。本仓实例：BUG-093（bullet 变体）、123（标记位置）、124（段间空白）、127（半角括号）、128（U+3000）、138（未识别后缀）；`review-readiness` 的全角冒号/强调符 |
| **输入空间** | 维度 = 该语法的**自由度**：装饰前缀 × 分隔符 × 空白类 × 括号宽度 × 标记位置 × 后缀。每维取**等价类代表**（不要取值域） |
| **oracle** | 等价类内**全部相同输出**；不可识别形态**必须落到 null/红**，不许「最像的」 |
| **负控** | 取一个**必须不识别**的邻近形态（散文提及、模板行、行内引用），断言它是 null——若它也返回值，说明解析器在猜 |
| **成本** | 纯函数，秒级。32–64 格 ≈ 毫秒 |
| **何时不该用** | 语法是**封闭枚举且写入方唯一**（如 locale key、协议常量）。此时等价类只有 1 个，矩阵是剧场 |

```js
// 维度 = 同一事实的等价写法；oracle = 等价类内同值、类外为 null
const DECOR  = ['', '## ', '> ', '- ']               // 装饰
const SPACE  = [' ', '\t', '\u3000']                 // 分隔符后的空白类（U+3000 必须有）
const LEAD   = ['', '随后 ', '本轮 ', '旧轮记录：']    // 散文前导
const POSITIVE = ['PASS', 'FAIL']                     // 只有正半边需要两个值

test('类级：装饰 × 空白 × 前导 的任意组合下，判定只由结构位置决定', () => {
  for (const decor of DECOR) for (const space of SPACE) for (const lead of LEAD) {
    // 负半边（lead ≠ ''）期望恒为 null —— 不为它跑两个值，格数从 96 压到 60
    for (const value of lead === '' ? POSITIVE : [POSITIVE[0]]) {
      const expected = lead === '' ? value : null
      const line = `${decor}${lead}readiness:${space}${value}`
      assert.equal(terminalReadiness(`${line}\n`), expected, JSON.stringify({ decor, space, lead, value }))
    }
  }
})

// 负控：不可被识别为判定的三类形态（它们绿 = 解析器在猜）
test('负控：引用 / 模板 / 段落提及都不构成判定', () => {
  for (const line of ['**结论行：`readiness: PASS`**', '## readiness: PASS | FAIL', '正文提到 readiness: PASS 但没判定'])
    assert.equal(terminalReadiness(`${line}\n`), null, line)
})
```

### 形态 2：同源 codec / round-trip

| 项 | 内容 |
|---|---|
| **适用失败类** | 「两个实现读同一事实，口径漂移」。本仓实例：BUG-040（门 `readinessOf` vs pack 终局判定）、BUG-081/085/124/127/128（fold 读 vs upsert 定位）、`replay-request` 的「录制侧 vs 回放侧归一化」 |
| **输入空间** | 三个函数组成的**三角形**：`render`（写）→ `parse`（读）→ `render`（再写）。断言 `render(parse(render(x))) === render(x)`（固定点）+ `parse(render(x))` 三字段全等 |
| **oracle** | 固定点 + 跨实现相等（**identity 相等**，不是「语义差不多」） |
| **负控** | 给一个**只有一侧接受**的形态（例如半角括号），断言两侧同时接受或同时拒绝；若一侧接受一侧拒绝 → 红 |
| **成本** | 纯函数，毫秒 |
| **何时不该用** | 两侧**故意**不同（例如 UI 宽松、门禁严格）。此时要测的不是「相等」而是「严格侧的拒绝**理由**」，且必须写清这是**有意的非对称** |

```js
const shape = (h) => { const [e] = foldLibrary(`${h}\n`); return { name: e.name, prov: e.provenance, def: e.isDefault } }
const HEADS = [
  '## 方法（来源）〔默认偏好〕',   // canonical
  '## 方法(来源)〔默认偏好〕',     // 半角括号（BUG-127）
  '## 方法 （来源） 〔默认偏好〕',  // 段间空格（BUG-124）
  '## 方法\u3000（来源）〔默认偏好〕', // U+3000（BUG-128）
  '## 方法〔默认偏好〕（来源）',    // 反序（BUG-085）
]

test('同源：fold 能读的每个标题，upsert 必须定位到同一行（不许新建）', () => {
  for (const head of HEADS) {
    const lib = `${head}\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n`
    const before = foldLibrary(lib).length
    const { text } = upsertMethodEntry(lib, { ...entryOf(head), sections: SECTION })
    assert.equal(foldLibrary(text).length, before, `upsert 复制了条目：${head}`)
    assert.equal(shape(head).name, headNameOf(head), `fold 名字口径漂移：${head}`)
  }
})

test('同源：render→fold 是不动点（任意 entry）', () => {
  for (const e of ENTRIES) assert.deepEqual(shape(renderLibraryEntry(e)), { name: e.name, prov: e.provenance, def: e.isDefault })
})
```

**注意一个真实约束**：`renderLibraryEntry` 只产 canonical 形态，所以「写侧发出的形态」这一维
round-trip 天然覆盖；**用户手写的等价形态**只能靠 `HEADS` 表。两者都要，别只做前者。

### 形态 3：消费者清单

| 项 | 内容 |
|---|---|
| **适用失败类** | 「新工件/字段/角色/文案键出现后，N 个消费者里有一个没学会」。本仓实例：`presets-wiring.test.mjs:79`（每个技能都有消费面）、`:57`（skill-filesystem 与 tool-skill 成对）、`navigability-contract.test.mjs:65`/`:76`/`:85`（索引覆盖全量入口、每组 ≥1 consumer）、`test-surface`（每模块有直测或登记） |
| **输入空间** | **生产者集合**（从盘上扫，不手写），每个生产者 → 消费者集合。判据双向：零孤儿（每个生产者有消费者）+ 全覆盖（每个声明面被覆盖） |
| **oracle** | 集合相等 / 覆盖为真；且**防空语料**（扫到 0 个即红） |
| **负控** | 临时新增一个生产者（未登记）→ 必须红；删掉一条登记 → 必须红 |
| **成本** | 文件系统扫描，毫秒–秒（取决于扫多少）；本仓 `verify` 全量 2.5s（仓内实测） |
| **何时不该用** | 生产者**不在盘上**（远程/动态注册）。此时清单会假绿，改测「注册后的事件」 |

```js
test('类级：盘上每个 <生产者> 都有消费者；扫到 0 个即红（防空语料）', () => {
  const producers = walk(join(ROOT, 'packages/deep-research-pack/content/templates/run'))
    .filter(f => f.endsWith('.md')).map(f => basename(f))
  assert.ok(producers.length >= 5, `防空语料：只扫到 ${producers.length} 个生产者`)
  const consumers = readFileSync(CORE_SOURCE, 'utf8') + readFileSync(PARSER_SOURCE, 'utf8')
  for (const p of producers) assert.match(consumers, new RegExp(escapeRe(p)), `${p} 零消费者`)
})
```

### 形态 4：状态/交错矩阵

| 项 | 内容 |
|---|---|
| **适用失败类** | 「同一段代码，到达顺序不同结果不同，但只有一个顺序被测过」。本仓实例：timeout-policy 的「caller 先 abort vs deadline 先到」；run-lock 的「创建窗口 / 陈旧 / 活 pid」；`node-gate-witness` 的「present 早于 HITL2 答复」；BUG-074 的「同行两判定谁先」 |
| **输入空间** | 维度 = **时刻**（创建前/窗口内/已存在/已释放）× **身份**（自己/别人/已死）× **顺序**（A 先/B 先/交错）；**时间竞态必须用假时钟或屏障，不用 sleep** |
| **oracle** | 每个交错点的**终态** + 「不该发生的副作用没发生」（例如「第二次尝试不得覆盖属主」） |
| **负控** | 一个**必须失败的顺序**（例如「释放别人活着的锁」），断言它失败 |
| **成本** | 纯内存或临时目录：毫秒；若需真子进程：秒级 |
| **何时不该用** | 顺序**由产品定义**（协议规定必须 A 先 B），此时测顺序是测协议常量，不是测竞态 |

```js
// 状态机：absent → creating → owned → released；每个迁移点 × 身份
const SEQ = [
  { name: 'create 窗口：目录在、owner 暂缺', setup: (l) => mkdirSync(l), expect: 'takeover-after-grace' },
  { name: '活属主：不许接管',              setup: (l) => writeOwner(l, process.pid), expect: 'busy' },
  { name: '死属主：可接管',                setup: (l) => writeOwner(l, 999999),     expect: 'takeover' },
  { name: '活属主 + 旧 mtime：仍不许接管',  setup: (l) => { writeOwner(l, process.pid); age(l) }, expect: 'busy' },
  { name: '别人的锁：不许释放',             setup: (l) => writeOwner(l, process.ppid), expect: 'release-refused' },
]

test('状态交错：每个迁移点的判决与副作用', () => {
  for (const s of SEQ) {
    const dir = mkdtempSync(join(tmpdir(), 'lock-'))
    try {
      s.setup(dir); const busy = []
      const ok = acquireRunLock({ lockDir: dir, onBusy: (p) => busy.push(p) })
      assert.equal(outcomeOf(ok, busy), s.expect, s.name)
      // 副作用面：失败的获取不得改动属主
      if (s.expect === 'busy') assert.notEqual(lockOwnerPid(dir), process.pid, `${s.name}：覆盖了属主`)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  }
})
```

### 形态 5：路径/形态矩阵

| 项 | 内容 |
|---|---|
| **适用失败类** | 「路径/文件形态的边界被当成细节」。本仓实例：`method-library-io`（symlink/hardlink/目录当文件）、`replay-scene`（绝对/`..`/symlink/空格）、BUG-138（同族：形态识别不全） |
| **输入空间** | 绝对 / 相对 / `..` 穿越 / symlink（文件、父目录、清单本身）/ hardlink / 目录当文件 / 带空格 / unicode / 不存在 / 只读。每格 → 接受或拒绝 |
| **oracle** | 拒绝必须**抛**，且**外部世界不变**（这是关键：只断言 throw 会漏掉「先写后抛」）；接受必须**真读到**内容 |
| **负控** | 一个合法形态（带空格/unicode 的普通文件）必须**不**被拒——否则守卫变成「一律拒绝」 |
| **成本** | 临时目录 + `mkdtemp`：毫秒 |
| **何时不该用** | 路径来源是受控常量（仓内自己的 `join(ROOT, ...)`）。此时没有攻击面，只有拼写错误，类型/常量足够 |

```js
const FORMS = [
  { name: 'absolute',        make: (d) => '/etc/passwd',                 expect: 'reject' },
  { name: 'traversal',       make: (d) => join(d, '..', 'x.md'),          expect: 'reject' },
  { name: 'symlink file',    make: (d) => { symlinkSync(outside, join(d, 'f.md')); return join(d, 'f.md') }, expect: 'reject' },
  { name: 'hardlink',        make: (d) => { linkSync(outside, join(d, 'h.md')); return join(d, 'h.md') },     expect: 'reject' },
  { name: 'directory',       make: (d) => { mkdirSync(join(d, 'x.md')); return join(d, 'x.md') },             expect: 'reject' },
  { name: 'spaces + unicode',make: (d) => join(d, '方法 库.md'),           expect: 'accept' },  // ← 负控：合法形态不许被拒
]

test('路径形态：该拒的拒 + 外部世界逐字节不变；合法形态不许被拒', () => {
  for (const f of FORMS) {
    const d = mkdtempSync(join(tmpdir(), 'p-'))
    try {
      const p = f.make(d)
      if (f.expect === 'reject') {
        assert.throws(() => readVia(p), undefined, f.name)
        assert.equal(readFileSync(outside, 'utf8'), ORIGINAL, `${f.name}：拒绝前已写外部`)
      } else {
        assert.doesNotThrow(() => readVia(p), f.name)
      }
    } finally { rmSync(d, { recursive: true, force: true }) }
  }
})
```

### 形态 6：假绿 oracle（断言世界，不断言自报）

| 项 | 内容 |
|---|---|
| **适用失败类** | 「测试绿了但产品坏了」。本仓实例：postmortem 0002（refresh 把 `UNKNOWN_TOOL` 当成新金标准）、BUG-030（哨兵出现在 prompt 回显就放行）、BUG-074（引用夺权 = 读到了「像 PASS 的文本」）、`node-gate-witness:130`（证据缺席 → UNATTESTED 而不是绿） |
| **输入空间** | 不是变体空间，是**证据种类**：盘侧真值 / 计数 / 明细行 / 类型化字段 / 外部重读 |
| **oracle** | 四条：①**盘侧真值**（读文件、读事件，不信被测方的返回值或日志）；②**计数 ≥1**（「扫到 0 个」即红，防空语料）；③**明细行对账**（期望行集合 == 实际行集合，不是子串包含）；④**在场 ≠ 内容**（文件存在不算有内容） |
| **负控** | 删掉一个必过判据 / 让一条记录消失 → 必须红（这是唯一能证明 oracle 在咬的方式） |
| **成本** | 取决于真值来源；盘侧读数毫秒，真进程秒级 |
| **何时不该用** | 真值**只能自报**（外部服务的内部状态）。此时改用「外部副作用」或契约探针，不要伪造世界 |

```js
test('假绿 oracle：空/缺/全为空 一律不许放行（三态：绿/红/未跑）', () => {
  assert.equal(verdictOf([]), 'UNATTESTED')          // 空语料 ≠ 绿
  assert.equal(verdictOf([{ type: 'assistant/message', data: { text: SENTINEL } }]), 'UNATTESTED')
  assert.equal(verdictOf([turnEnd('completed'), assistantText(SENTINEL)]), 'PASS')
})

test('假绿 oracle：明细行逐条对账（不是子串包含）', () => {
  const actual = parseRows(readFileSync(log, 'utf8'))
  assert.deepEqual(actual.map(r => r.id).sort(), EXPECTED_IDS.sort(), '明细行集合不符')
  assert.ok(actual.length >= 1, '防空语料：零行')
})
```

### C.7 六形态的选择判据（一张表）

| 问题 | 用哪个形态 |
|---|---|
| 这类 bug 是「同一事实的多种写法」吗？ | 1（语法矩阵）+ 2（同源） |
| 这类 bug 是「两个实现漂移」吗？ | 2（同源），加 3（消费者清单）若漂移发生在「新面没被登记」 |
| 这类 bug 是「顺序/时刻」吗？ | 4（状态交错），时间竞态必用假时钟 |
| 这类 bug 是「路径/文件形态」吗？ | 5（路径矩阵） |
| 这类 bug 是「绿了但产品坏」吗？ | 6（假绿 oracle）——**这一条要么有，要么全白搭** |
| 判据是**否决式**（X 不能影响 Y）？ | 不变量即可，不要矩阵（见 B.5） |
| 判据是**仲裁式**（歧义下选谁）？ | 必须矩阵 + 负控（见 B.4） |

---

## D. 毕业模板：BUG → 类 → 守卫

### D.1 模板（7 行，可直接抄）

```js
// 类级守卫：<类名一句话>（变体来自：同一事实的两种写法 | 两个读者 | 两个时刻）
// 负例留证 YYYY-MM-DD：BUG-nnn —— <一句红配方：改哪个函数 / 删哪个检查会让它红>
test('<不变量：任意…都…；或 歧义 → null，不许选>', () => {
  for (const v of CROSS_PRODUCT) assert.equal(judge(v.input), v.expected, JSON.stringify(v))
})
// 负控：<一个必须不被接受的邻近形态>——它绿 = 矩阵在自证，不是守卫在守
test('负控：<邻近形态> 必被拒', () => { assert.equal(judge(NEIGHBOR), null) })
```

三条硬约束（不是风格建议）：

1. **写进模板之前先填完 `## 判据形状` 五行**（`_backlog/methods/judgment-design.md:19-27`：
   Authority / Readers / Bad inputs / Legacy exit / Proof）。填不满 = 类没定清楚，别写矩阵。
2. **标题里放 BUG-nnn 就要付代价**：`guard-red-record` 门禁（`scripts/verify/gates/f-repo.mjs:144-184`）
   要求每个 BUG-nnn 标题配一个 `// 负例留证 YYYY-MM-DD：…BUG-nnn…` 块，且卡必须真实存在
   （双址 `_backlog/bugs/` ∪ `_backlog/_archived/fixed_bugs/`）。**因此类级守卫的正确做法是
   标题写不变量、不写 BUG 号**——BUG 号进留证块。否则一个矩阵文件会挂上七八个 BUG 号，
   每个都要一条配方，而矩阵本身只有一条红法。
3. **文件名带 `*-conformance.test.mjs` 会自动触发义务**：`f-repo.mjs:159-164` 对
   `*conformance.test.mjs` 一律要求「负例留证/夹具留证」块，**即使标题里没有 BUG 号**。
   这是本仓一个隐式的命名即契约（用好了很省事：命名即声明「我是判据测试」）。

### D.2 示例一：readiness 族（BUG-046 → 074 → 141 → 150）

**卡上的事实（逐字引自三张卡）**：

| 卡 | 报告的行 | 当时的修法 | 一天后怎样了 |
|---|---|---|---|
| BUG-074 | `旧轮记录：\`readiness: PASS\`；本轮真实终局：readiness: FAIL` → 读成 PASS | 新增 `lastInlineVerdict`：只认引号/加粗**外**、且前 20 字符含「本轮/终局/真实/…」的裸写 | 关键词表外的新措辞复发（BUG-141） |
| BUG-141 | `旧轮真实记录：\`readiness: PASS\`；现在 readiness: FAIL` → 仍 PASS | 关键词表扩到 8 个（加了「现在/新判定」） | 关键词表外的新措辞再复发（BUG-150） |
| BUG-150 | `…；随后 readiness: FAIL` → 仍 PASS | **去掉关键词依赖**：按未包裹范围取最后一个裸写判定 | 未再复发（截至本文） |

**类的识别**（这一步是全部工作的所在）：三张卡的表象是「关键词不够」，类是
**「同一行有多个判定时，用词法特征（包裹/关键词）区分『引用』与『真判定』」这条路本身是错的**——
因为自然语言里"引用"的表达是开放的，任何关键词白名单都是对开放集合的有限枚举。
类名 = **「仲裁依据必须是结构位置，不能是词法特征」**。

**守卫**（`tests/contracts/verdict-conformance.test.mjs`，已在位）：

```
不变量① 结构位置 → 采用（9 种装饰前缀 × 2 值的笛卡尔）           :16-25
不变量② 散文前缀 → 不构成判定（8 个前导词 + 3 种整行包裹）        :28-42
不变量③ 互斥 → null（5 个互斥行 + 引用/模板/表格三不夺权）        :45-58
不变量④ 跨行次序（末位 / 轮次高者）                              :61-65
不变量⑤ 生成矩阵 position(4) × value(2) × lead(4) = 32 格        :68-88
                               └ 期望 = lead === '' ? value : null
```

**为什么这条守卫能咬住 141 与 150，而当时的 21 例回归集咬不住**：

| | 21 例回归集 | 本条矩阵 |
|---|---|---|
| 覆盖 | 三张卡报告过的 8 个点 | 32 个格 + 4 个负控 |
| 141 的新措辞「现在」 | 不在集合里 | 命中 `LEAD` 维的一格，期望 null |
| 150 的新措辞「随后/复核后/结论/本 run」 | 不在集合里 | `随后` 在 `LEAD` 里；其余三种即使不在，`lead !== '' → null` 这条**规则**也覆盖了**任何**前导词 |
| 失效方式 | 换一个词就漏 | 只有「结构位置识别坏了」才红 |

最关键的一行是期望值的写法：**`lead === '' ? value : null`**。它不是「逐格写 32 个期望」，
而是把不变量本身写成代码——所以新增一个前导词只需加进 `LEAD`，期望自动正确。**这就是矩阵与
例子的分水岭**：矩阵的期望由规则生成，例子的期望由人填。

**这条例子的缺口（诚实标注）**：`LEAD` 维没有编码变体（`\u3000` 前导、全角冒号、BOM 开头）。
按 `judgment-design.md:46` 应补。补法 = 给 `LEAD` 加两个元素、给 `DECOR` 加一个 BOM 前缀。

**一个反面教训**：BUG-150 的修法（去掉关键词）本身是对的，但**修法落地在 `lastInlineVerdict`，
而守卫在 `verdict-conformance`**——两者之间没有指针。下次有人改 `lastInlineVerdict`，
`review-readiness.test.mjs` 的 21 例会红，`verdict-conformance` 也会红，但**没人知道去跑后者**
（`guides/60 §2` 的路由表只写「改判据 → 对应 `tests/<domain>/*.test.mjs`」）。
修法成本 ≈ 在 `review-readiness.test.mjs` 头注加一行「矩阵正本见 verdict-conformance」。

### D.3 示例二：方法库标题族（BUG-081/085/093/123/124/127/128/138）

**卡上的事实**（8 张，全部 P2，全部「已修」，全部只补了报告里的那一个字符串）：

| 卡 | 变体 | 两侧口径 | 修法 |
|---|---|---|---|
| 081 | 名称含全角 `（` | fold 切成 provenance / UI 用 raw name | 写入侧**拒绝**该名称 |
| 085 | 标记在 provenance 之前 | fold 任意序 / upsert 只认正序 | 正则接受任意序 |
| 093 | 四字段用 `*` `+` 缩进 全角冒号 | fold 只认 `- 找来源:` | 前缀匹配放宽 |
| 123 | 标记写在 provenance 内 | fold 查整条 title | 排除括号段 |
| 124 | 段间空格 | fold 接受 / upsert 不接受 | 加 `\s*` |
| 127 | **半角**括号 | fold 只认全角 | 半角并入同一语法 |
| 128 | **U+3000** | `[ \t]*` 不含 | 改 `[^\S\n]*` |
| 138 | 未识别后缀 `[草稿]` | 两侧都不认 → 幽灵条目 | upsert fail-loud + remove 按 fold 名寻址 |

**类的识别**：表象是「解析器认不全」，类是**「同一段标题文本有两个读者（fold 读字段 /
upsert 定位行），两者对『哪些写法是同一个标题』必须同源」**。081 是这条的极端形态（第三个读者：
`method-library-commands.ts` 用 raw name 比对命令），127/128 是它的编码维展开，138 是它的
结构剩余（「未被任何规则命中的尾部文本」）。

一句话判据：**如果两个函数都在解析同一段文本，而没有任何一条断言比较它们的输出，这一类就会被反复发现。**

**守卫（建议形态，本仓尚未有）**：形态 2 + 形态 1 的组合。

```js
// 类级守卫：同一标题文本，fold（读字段）与 upsert（定位行）必须同源
// 负例留证 2026-11-13：BUG-081/085/124/127/128/138 —— 只放宽/收紧其中一侧的正则 → 本条红
const BRACKET  = ['（来源）', '(来源)']                  // 127
const ORDER    = ['{p}〔默认偏好〕', '〔默认偏好〕{p}']    // 085（{p} = 括号段）
const GAP      = ['', ' ', '\t', '\u3000', '  ']         // 124 / 128
const SUFFIX   = ['', ' [草稿]']                         // 138

const HEADS = []
for (const b of BRACKET) for (const o of ORDER) for (const g of GAP) for (const s of SUFFIX)
  HEADS.push(`## 方法${g}${o.replace('{p}', b)}${s}`)

test('同源：fold 与 upsert 对每个标题变体的「同名」判断一致', () => {
  for (const head of HEADS) {
    const lib = `${head}\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n`
    const folded = foldLibrary(lib)
    const { text, action } = upsertMethodEntry(lib, { ...folded[0], sections: folded[0].sections })
    // 判据：同一标题再写一次，条目数不变（updated ≠ created）
    assert.equal(foldLibrary(text).length, folded.length, `upsert 复制了条目：${head}`)
    assert.equal(action, 'updated', `同一标题被判为新条目：${head}`)
  }
})

// 负控：未识别后缀必须 fail-loud（BUG-138 的正向要求），不许静默新建幽灵
test('负控：带未识别后缀的标题 → upsert 抛错，而不是新建', () => {
  assert.throws(() => upsertMethodEntry('## 方法（来源）[草稿]\n', entryOf('方法')), /未识别|无法定位/)
})
```

**成本**：`2×2×5×2 = 40` 个标题 × 一次 upsert + 一次 fold，纯字符串操作，估算 < 50ms。
放在 `tests/cockpit/`（`tests/AGENTS.md` 的域映射：pack `src/lib` → `cockpit/`），
或独立成 `tests/cockpit/library-heading-consistency.test.mjs`——**不要**叫 `*-conformance.test.mjs`
除非你愿意同时交出 `负例留证` 块（`f-repo.mjs:159-164` 会强制）。

**为什么这条能一次咬住 8 个变体，而 41 例的 `library-fold.test.mjs` 没有**：

| | 41 例（现状） | 40 格矩阵（建议） |
|---|---|---|
| 读者 | 只有 fold | fold + upsert |
| 变体来源 | 每张卡报告的那一行 | 维度乘积（含未报过的组合，例如半角×U+3000×后缀） |
| 新变体成本 | 一条新 test | 一个维度值 |
| 能咬住 138 吗 | 有（`:499` 单点） | 有（且 `SUFFIX` 维的每一格都咬） |

---

## E. 反模式（每条给本仓可核对的出现位置）

| 反模式 | 判据（怎么认出来） | 本仓实例 |
|---|---|---|
| **矩阵剧场** | 很多行，但改一个 `if` 只让一格红——等价于「一条路径 + 多维装饰」 | 判据：给矩阵每格标注它走的分支；若 > 80% 的格落在同一分支，砍维。`verdict-conformance:72-80` 的 32 格里真正分支只有 2 个（`lead === ''` / 否则），所以它的价值在**负控与期望生成规则**，不在格数——认清这一点才不会继续加维 |
| **过拟合报出的输入** | 修复提交里新增的用例，全部取自带 BUG 卡的症状表 | **BUG-141 → 150** 是教科书案例：141 的修复把关键词表从 6 个扩到 8 个，新增的两个词正是 141 报告里的「现在/新判定」；150 的四种措辞一个都不在表内。修法 = 类级规则（结构位置），不是扩表 |
| **把实现当行为** | 断言的对象是源码文本/正则/结构，而非运行结果 | `tests/pack/export-shape.test.mjs:24`（对源文本 `doesNotMatch(/export\s+default/)`）——它的失效形态已在 `special-topics.md §1.3` 登记。另一类是「断言渲染出的字符串」，但 `library-fold.test.mjs:391` 断 `renderLibraryEntry` 的输出格式，这是**与 Lead 的契约**（skill 契约要求该形态），不算反模式——**区分标准：这段文本有外部消费者吗** |
| **夹具迁就谓词** | 修复一并改了夹具，使判据「看起来」通过 | test-asset-fence 的 S0 明确拒绝了这条路：`run-accept` 第 ⑦ 段红的原因是夹具创建了 `review/` 却没有 `review/readiness.json`，**没有**去放宽 `readinessOfSources`，也没有改 `## readiness: PASS` 标题（`_backlog/issues/2026-11-13-test-asset-fence.md` §方案与取舍：「不改标题：`terminalReadiness` 会剥 `##` 读成 PASS，改标题是误诊」） |
| **归一化凑绿** | 为了让新录制/新环境通过，给比较器加 replace | `scripts/lib/replay-request.mjs:23` 已把这条堵死（persona 归一化**清零**，而不是「加一条 replace」）；`snapshots/README.md` 写「只许重写、不许放宽比对」；反面教材 = `docs/postmortem/0002`（refresh 把 `UNKNOWN_TOOL` 当成新金标准，「A snapshot refresh is fixture production, not correctness review」） |
| **只交付绿** | 没有红过的守卫 | `guard-red-record` 门禁就是为这条存在的（`f-repo.mjs:129-184`）。注意门禁自己声明了边界：「它不制造回归不跑测试，故**不证明留证是真的**」——留证写了但假，门禁看不出。**这是本仓唯一无法机械化的诚实缺口，必须靠人复现一次** |

---

## F. 成本控制：让类级守卫留在快环

### F.1 输入空间的压缩（三条，按顺序用）

1. **等价类代表**：每个维度取值时问「这一组写法在本仓的解析器里走同一分支吗」。走同一分支的
   只留一个代表 + 一个边界（例如空白类留 `\u3000` 与 `\t`，不留 `\u00A0`，除非有证据它是独立分支）。
2. **配对覆盖（pairwise）**：维度 ≥4 且全乘积 > 100 时，用「任意两维的所有组合至少出现一次」的
   表（手写 16–24 行即可，不必引库）。**类级 bug 几乎都发生在 ≤2 维的交叉点**——081 是
   (名称内容 × 括号宽度)，138 是 (结构 × 后缀)，150 是 (位置 × 前导词)。三维交叉的 bug 在本仓
   8 张卡里没有一例。
3. **上限 N**：单个矩阵文件的格数上限取 **64**。超了先砍维（用 1 判定维度必要性），再不然拆文件
   ——**不要**用随机采样糊过去（随机会掩盖「维度没想全」这件事）。

### F.2 预算（按本仓实测口径）

| 形状 | 单格成本 | 64 格估算 | 归属 |
|---|---|---|---|
| 纯函数矩阵（形态 1/2） | 微秒级 | **< 50ms** | `pnpm test`（快环），单文件 ≤1s |
| 文件系统矩阵（形态 3/5） | 毫秒级（`mkdtemp` + 几次 syscall） | **< 500ms** | `pnpm test` |
| 状态交错（形态 4，纯内存） | 毫秒级 | **< 300ms** | `pnpm test` |
| 状态交错（真子进程） | 百毫秒–秒 | 不适合放矩阵 | 独立 smoke（`scripts/smoke/`，分级申报） |
| 假绿 oracle（盘侧真值） | 毫秒 | < 100ms | `pnpm test` |

口径依据：本仓 `pnpm test` 全量 1,407 例 4.4s（`_backlog/research/test-asset-fence/2026-11-13-test-asset-fence.md:14`，
**本文未复测**）→ 单例均值 ≈ 3ms；纯函数矩阵单格远低于此，所以「64 格 ≈ 一条普通测试」。
**估算的用法**：写完后给该文件加 `--test-name-pattern` 定时一次，>1s 就砍维。

### F.3 哪些类**不需要**矩阵

`judgment-design.md:4` 的 `whenToUse` 已经给了排除项，转成可判据：

| 情形 | 为什么不需要 | 本仓实例 |
|---|---|---|
| 纯算术 / 纯折算 | 输入空间连续，代数性质（交换/结合/单位元）比矩阵强 | `src/lib/*-fold.mjs` 的计数类 |
| **封闭枚举 + 写入方唯一** | 等价类只有一个，矩阵是剧场 | locale key 集合（`tests/pack/client-locale.test.mjs`）、协议常量 `TOOL_TIMEOUT` |
| **否决式不变量**（X 不能影响 Y） | ∀ 已在命题里，举例即证 | `present-version-conformance.test.mjs:19`（正文提及任何版本都不算） |
| 路径来源是受控常量 | 无攻击面 | 仓内 `join(ROOT, …)` 的拼装 |
| 单次调用契约 | 没有输入变体，只有调用方契约 | `export-shape`（应改成 `unwrapExports` 往返，不是矩阵） |

### F.4 与门禁的成本分工

一张表回答「这个检查该写成 `tests/` 还是 `verify` 门禁」：

| 判据需要什么 | 落点 | 理由 |
|---|---|---|
| 运行行为（同一函数在不同输入下返回什么） | `tests/`（形态 1/2/4/6） | grep 判不出「猜不猜」（`verdict-conformance.test.mjs:3` 的原话） |
| 全仓静态一致性（每个文件都有 X） | `verify/gates/<域>.mjs`（形态 3 的静态版） | 需要跨全仓扫；有 `gates-smoke` 注入案例可复用 |
| 「守卫本身会不会咬人」 | `gates-smoke` 注入案例表 | 本仓 108 个注入案例（fence 研究 `:77`），**新增门禁必须同 diff 加案例**（`scripts/AGENTS.md` 新增或改门禁节） |
| 一次性红证（本文件不常驻） | 测试头注的「负例留证」块 | `guard-red-record` 机械对账块的存在，不对账内容真假 |

---

## 附：本文引用的一手源清单

- DSH：`vendor/dsh/docs/testing.md:40`、`packages/AGENTS.md:19`、
  `.agents/skills/dsh-code-review/SKILL.md:54`、`.agents/skills/dsh-ci-test-reliability/SKILL.md`
  （Prove the intended regression 节）、`packages/core/agent-loop/tests/contract-regressions.spec.ts`、
  `packages/todo/tool-todo/tests/*.spec.ts`、`packages/guard/timeout-policy/tests/timeout-policy.spec.ts`、
  `packages/llm/llm/tests/properties.spec.ts`、`packages/schedule/schedule/tests/recurrence.spec.ts`、
  `packages/settings/settings/tests/editor-failures.spec.ts`、`scripts/verify-cordis-config.ts`、
  `docs/postmortem/0002-js-expression-disabled-filesystem-tools.md`、`package.json:260`
- 本仓：`tests/AGENTS.md:44`（不变量 + 变异矩阵）、`_backlog/methods/judgment-design.md`、
  `scripts/verify/gates/f-repo.mjs:129-184`（`guard-red-record`）、
  八个样本测试文件、`scripts/lib/replay-request.mjs`、`scripts/lib/run-lock.mjs`、
  `packages/deep-research-pack/src/lib/{review-readiness,library-fold,method-library-write}.ts`、
  `_backlog/_archived/fixed_bugs/BUG-{081,085,093,123,124,127,128,138,074,141,150}-*.md`、
  `_backlog/issues/2026-11-13-test-asset-fence.md`、`_backlog/research/test-asset-fence/2026-11-13-test-asset-fence.md`
