---
topic: 运行时可见面
intent: 为 recorded-session 义务标定与 BUG-018 保存被消费的判定证据。
---

# recorded-session 义务标定：判据不可按路径立（且 smoke 广告了它不覆盖的面）

> 服务 = [recorded-session-obligation 条目](../../../notes/implemented/2026-10-08-recorded-session-obligation.md)（已毕业）
> ｜RFC（已毕业，正文即上方条目）= [`2026-10-08-recorded-session-obligation.md`](../../../notes/implemented/2026-10-08-recorded-session-obligation.md)
> ｜参考卷条款 = `12 §2`「看见的请求」+「可回放的会话」。
> **本报告只标定，不立门禁**（RFC 判据 6）。`git diff --stat scripts/verify/` 为空即证。

## 一句话结论

**不够格按"路径命中"立门禁。**近 40 次变更里 **10 次**命中 model-visible 面，其中只有
**2 次真需要更新夹具**（真阳）、**6 次是 skill 正文**（假阳，见下实测）、
**2 次是本该更新而没更新的真漏判**——本仓**已经发生过漏更新**，不是理论风险。

**更要紧的发现（对抗自审打回首版时挖出）**：`snapshot-replay-smoke` 的 B 层**只比对
`system/message`**，而模型实际还会收到一份 **`user/message` 注入的工作区手册全文**。
B 层不覆盖它，**但 smoke 的头注声称覆盖 "persona/skill/工具行"**——这是本仓反复栽过的
**"广告了不存在的覆盖"**。首版标定把候选面写成 5 类并断言"无漏判"，正是因为继承了
smoke 自己的盲区（循环论证）；本版修正，并如实记录首版错在哪。

## 首版错在哪（对抗自审打回，如实登记）

首版（同 diff 内已修）的结论是"真阳:假阳 = 2:6，候选面从 5 类压到 2 类，无漏判"。
**它错在一处方法论**：判据"该更新夹具的充分条件 = persona 正文或工具 schema 变了"
是**从 smoke 的 B1/B2 覆盖反推**出来的，于是**继承了 smoke 的盲区**。
用被测物的覆盖范围去定义被测物该覆盖什么 = 循环论证。
对抗自审独立跑出反例：`research-workspace/AGENTS.md` 以 `user/message` 全文注入
（`source.kind = "agent-instructions"`），B 层不比它。**首版的"无漏判"是假结论。**

## 判据：什么是"model-visible 面"

参考卷 `12 §2` 的原条款（DSH `docs/testing.md` "When a snapshot test is required"）：

> Every non-trivial model-, protocol-, or human-visible change adds or updates a keyless
> recorded-session scenario in the same PR; package, e2e, mock-only, and rationale evidence
> does not replace the assembled transcript.

本仓等价物 = [snapshot-replay-smoke](../../../scripts/smoke/snapshot-replay-smoke.mjs) 的
夹具 `tests/fixtures/snapshot-research-face/`（`dsh-llm-replay` 驱动，keyless）。
**它钉什么由 smoke 自己的 B 层定义**（`snapshot-replay-smoke.mjs:226-240`）：

- **B1**：`system/message` 的 **persona 全文**逐字比对；
- **B2**：`request/header` 的 **工具 schema 全量**（模型可见文本）比对。

所以"该更新夹具"的判据**不能只从 B1/B2 反推**（那是循环论证）。
按**模型实际看见什么**枚举，共 **9 类候选面**（下表）。⚠️ 首版写 5 类、二版写 6 类、三版写 8 类，**三次都不穷举**
（首版漏注入面；二版漏 skill description 与 runtime-context；三版漏数 dev skill description 那行）
——本表是第四次修正，**行数已逐行核对 = 9**：

| 面 | 路径 | 模型可见？ | B 层覆盖？ | 该更新夹具？ |
|---|---|---|---|---|
| **persona 正文** | `presets/<role>.patch.yml` 的 persona 段 | 是（`system/message`） | **B1 逐字比对** | **是** |
| **工具 schema** | 工具行的 config | 是（`request/header`） | **B2 全量钉** | **是** |
| **工作区手册** | `research-workspace/AGENTS.md` → pack `workspace/` 种子 | **是**（`user/message`，`agent-instructions` **全文注入**） | **✗ 不覆盖** | **是**（但当前无处可钉——见下） |
| **skill description** | runtime skill 的 frontmatter `description:` | **是**（经 `skill-catalog` 注入，见下） | **✗ 不覆盖** | 否（当前实测：改它不必然要更新夹具——catalog 是摘要，夹具未钉） |
| skill **正文** | `presets/<role>/skills/<n>/SKILL.md` 正文 | **否**（实测：正文行命中 0） | 不适用 | 否 |
| **runtime-context** | 运行时注入（`source.kind = "runtime-context"`） | **是**（fixture 事件 [11]，**不以 `<system-reminder>` 开头**） | **✗ 不覆盖** | 否（不随源码变更，故不进夹具义务） |
| **dev skill description** | `.agents/skills/**` 的 `description:` | **否**（不在 runtime catalog） | 不适用 | 否 |
| 观察面 client | `src/client/**`、`src/lib/**` | 否 | 不适用 | 否 |
| `cordis.patch.yml` | bundle 行 | 否 | 不适用 | 否 |

**关于注入面：夹具里有 3 处 `user/message` 注入，都是模型可见的**（首版与二版都只讲了一处）：

| fixture 事件 | `source.kind` | 内容 | 是否随源码变更 |
|---|---|---|---|
| [10] | `agent-instructions` | **工作区手册全文**（`<system-reminder>` 包裹） | **是** → 该进夹具义务 |
| [12] | `skill-catalog` | runtime skill 的 `<available_skills>` 摘要表 | 是（改 description 会变） |
| [11] | `runtime-context` | 运行时上下文（**非** `<system-reminder>`） | 否（运行时态） |

**B 层对这三处全不覆盖。**其中 [10] 是本轮两例漏判的来源；[12] 与 [11] 登记为**同型缺口**
（未产生漏判实例，因为近 40 次里没有"改 runtime skill description"的变更——
`762eb6c` 改的是 `.agents/skills/writing-a-gate` 的 description，那是 **dev skill，
不在 runtime catalog 里**，故仍是假阳；它对该 runtime skill 的改动只在**正文**第 25 行）。

**"工作区手册"这一行是首版漏掉的，且它同时是漏判的来源。**实测（fixture 第 10 条事件）：

- `type = "user/message"`，`source.kind = "agent-instructions"`，`baseline = true`；
- 注入文本包在 `<system-reminder>` 里，**是全文注入**——手册 88 条长行（口径 = 非空且 >20 字）中 **87 条**逐字在场
  （对照：`system/message` 里 skill 正文命中 0 条）；
- 而 `systemTextOf` 的 filter 是 `j.type === 'system/message'`
  （`snapshot-replay-smoke.mjs:80`）→ **B1 结构上不可能看到它**；
- B2 只比 `request/header` 的 tools；C 层只比渲染面 → **三层全不覆盖**。

**persona 自己就承认它是模型可见的**（"研究手册（会话 cwd 根的 AGENTS.md）**已自动注入本会话**"）。

**实跑实验（本轮做了，结论钉死）**：向 `research-workspace/AGENTS.md` 追加一行探针文本
（`<!-- … PROBE-INJECT-9271 -->`），`source dev/env.sh` 后跑
`node scripts/smoke/snapshot-replay-smoke.mjs --scenario lead` → **ALL PASS**，
其中 **B1 仍绿且仍报 9888 字**。即：**改了模型可见的注入面，B 层毫无反应。**
（实验后已 `cp` 还原，`git status -- research-workspace/` = 0 处改动。）

这条把 §四 的结论从"源码级推断"升级为**实测**——不再依赖源码解读。

**再补一条源码证据**：smoke 在折算用户 prompt 时**丢弃**这类注入——
`snapshot-replay-smoke.mjs:108-110`：

```js
const userTexts = fixtureLines.filter((j) => j.type === 'user/message')
  .map(...)
  .filter((t) => !t.startsWith('<system-reminder>'));
```

**该 filter 的用途须说准**（避免夸大）：它只为 A 层取"真实用户 prompt"（`userTexts[0]` →
`session/prompt`），**不是 B 层的机制**。B 层根本不走 `userTexts`，它走 `systemTextOf`。
所以注入面不被比对的**真正原因**是 `systemTextOf` 只收 `system/message`（:80），
filter 只是让注入面在 A 层路径上也一并消失。

### 为什么 SKILL.md 不该触发（关键实测，推翻了立项时的假设）

RFC 立项时把"skills"列进了 model-visible 面（`notes/proposed/…:36-37`）。**实测为假**：

夹具 `system/message` 里确实出现 `team-assembly`、`synthesis` 等词（各 1 次），
但读上下文可知**是 persona 正文在"点名"技能，不是技能正文**：

> 组队：拆解完成后**加载 team-assembly skill** 决定这间研究室有谁……
> 综合方法**加载 synthesis skill**。

即 persona 只说"去加载 X skill"，**skill 正文按需读取、不在 `system/message` 里**。
所以改 SKILL.md 正文**不会**让 B1 变红——**不需要更新夹具**。
（反面验证：夹具里 `adversarial` 命中 0 次，正说明 critic 的 skill 正文根本不在场。）

**这条实测把 skill 正文从"该更新夹具"里排除**，也正是 6 次假阳的来源
（6 次均只改 SKILL.md，其中 5 次纯正文、`762eb6c` 另改了一个 **dev skill** 的 description
——dev skill 不在 runtime catalog，故仍是假阳；它对该 runtime skill 的改动在正文第 25 行）。
⚠️ 但"改 SKILL.md 就一定不触发"**不能反推**：`description:` 行经 `skill-catalog` 注入，
是模型可见的（只是夹具当前没钉它）。首版与二版都在这里压缩得过狠。
⚠️ 首版据此断言"候选面只剩 2 类"——**错**，漏了工作区手册注入面（见 §判据表 与
§首版错在哪）。**修正后 = 9 类候选面**（见 §判据表，行数已核对），其中"模型可见且该更新夹具"的是 **3 类**：
persona 正文、工具 schema、工作区手册。

## 一、逐次判定（近 40 次窗口，命中 model-visible 面的 10 次全部列出）

RFC 判据 1 要求"近 10 次变更逐次判定"。**如实登记：近 10 次变更里 0 次命中
model-visible 面**（那 10 次是 SDLC 吸纳线的文档与门禁工作）——真阳 : 假阳 = 0 : 0，
无标定价值。**故窗口扩至近 40 次**。此偏离已登记。

| # | commit | 命中的面 | 判定 | 理由 |
|---|---|---|---|---|
| 1 | `fe29e63` | 四角色 `.patch.yml` persona | **真阳** | persona 正文变更 → **实际更新了夹具**（`session.v4.jsonl` + `ui.expected.md`）✓ |
| 2 | `336d8f9` | `lead.patch.yml` persona + 手册 | **真阳** | commit body 实录"B1 先红（persona 有意变更被捕获）→ 重录"✓ |
| 3 | `b6c6e8f` | **`research-workspace/AGENTS.md`** | **真漏判** | NODES.md 行加 `+ 门A` = 改模型可见注入文本，**夹具零更新** ✗ |
| 4 | `762eb6c` | **`research-workspace/AGENTS.md`** | **真漏判** | 手册里 `run-dashboard.mjs` 路径改写，**夹具零更新** ✗ |
| 5 | `762eb6c` | `synthesis/SKILL.md` | 假阳 | skill 正文不进 `system/message` |
| 6 | `2a8897a` | `team-assembly/SKILL.md` | 假阳 | 同上 |
| 7 | `00a5c14` | `adversarial-review/SKILL.md` | 假阳 | 同上 |
| 8 | `1909bdb` | `adversarial-review/SKILL.md` | 假阳 | 同上 |
| 9 | `8236524` | `team-assembly/SKILL.md` | 假阳 | 同上 |
| 10 | `1fc9ef1` | `adversarial-review/SKILL.md` | 假阳 | 同上 |

**口径（重要，两个数不同分母，别混）**：

- **75% = 假阳率**，分母 = "**若门禁只按 `presets/**` 路径判会命中的次数**" = 6 假阳 +
  2 真阳 = 8 → 6/8 = 75%。它回答"这样一条路径门禁有多吵"。**6 个假阳已逐个复核**
  （5 次纯 skill 正文 + 1 次另改 dev skill description，均不在 runtime model 面）。
- **2 例真漏判**的分母是"近 40 次的全部命中"= 10 → 2/10 = 20%。它回答"当前有多少该更新
  而没更新的"。
- 两者**不互补、不能相加**：漏判不在路径门禁的命中集里（旧判据扫不到手册），
  真阳/假阳则是路径门禁的命中集。

⚠️ **首版曾把这 2 例算漏、并宣称"无漏判"。**本版计入，这是对抗自审的产出。

⚠️ **同一 commit 可在多个面各计一次**：`762eb6c` 既改工作区手册（→ 漏判）又改 skill
正文/dev description（→ 假阳），故它在两行各出现一次。表中"次数"= **面命中次数**，不是
commit 数（10 = 8 个不同 commit 的 10 次面命中）。

## 二、漏判实证（RFC 判据 4）

反向问题 = "有没有**没命中路径模式**但实际该更新夹具的"。

**结论：有，2 例，且是真发生的漏判**——首版答"无漏判"，是错的（见 §首版错在哪）。

| commit | 改了模型可见的什么 | 夹具更新 | 为什么漏 |
|---|---|---|---|
| `b6c6e8f` | 手册 `AGENTS.md` 的 NODES.md 行加 `+ 门A`（node-gate 门全集列举） | **0** | 旧判据只扫 `presets/**`，不扫工作区手册 |
| `762eb6c` | 手册里 `run-dashboard.mjs` 路径改写 | **0** | 同上 |

两例都在近 40 次窗口内，也都**完整通过了 CI**——因为：

- `snapshot-replay-smoke` **不在**默认 `pnpm test` glob 内
  （[tests/fixtures/README.md](../../../tests/fixtures/README.md) 标"否（独立 smoke，keyless）"）；
- 它**不在** pre-commit 钩子链里（钩子只跑 `verify` + `test`）；
- **且即使跑了它，B 层也不比对注入面**——所以这 2 例**跑 smoke 也会绿**。

**最后一条是本轮最重的发现**：这两例不是"忘了跑"，而是"**跑了也抓不到**"。

### smoke 广告了它不拥有的覆盖（本仓反复栽的病）

`snapshot-replay-smoke.mjs` 头注（第 13-15 行）原文：

> B 组装请求 diff：……`system/message`（persona 全文）与 `request/header`——
> **persona/skill/工具行等模型可见文本变化在此红**

**两处与实测不符**：

1. **"skill"** ——skill 正文**不**进 `system/message`（实测命中 0 条），改它 B 层**不会红**；
2. **未提工作区手册** ——而它才是**全文注入**的那一份，B 层**不覆盖**。

这与本仓已实证的其它同型缺陷一致：`discipline-map` 的 `na` 行会静默腐烂、
`design/30` 内容面可被清空而 verify 仍全绿、`notes/archived` 进门条件零机械面。
**共同形态 = 声明的覆盖强于实际的覆盖。**本轮标定的首版正是被这句话误导而答出"无漏判"。

## 三、若立门禁：判据形状建议（不实施）

**推荐形状 A（窄，路径 + 内容双条件）**：

- **触发面**：`presets/*.patch.yml` 的 **persona 段** + **工具 schema config**
  + **`research-workspace/AGENTS.md`**；**不含** `presets/*/skills/**`；
- **判据**：diff 命中上述面 **且** 同一 diff 未触碰 `tests/fixtures/snapshot-research-face/**` → 红；
- **预期假阳率**：本次 10 个样本上 6 假阳全部被排除 → 假阳 0；但**真阳样本仅 2 个**，
  不足以定案。

**推荐形状 B（宽，改为"跑 smoke"而非"查路径"）**——更彻底，但**必须先补覆盖**：

- 把 `snapshot-replay-smoke` 接进 pre-commit 或 CI（keyless）；
- 优点：测真实失效（逐字比对），不做路径代理——合"a guard only guards if the regression
  fails it"；
- **⚠️ 前置条件**：**先修 B 层对注入面的覆盖缺口**，否则接进钩子后那 2 例漏判**照样绿**
  （跑了也抓不到）。具体 = 让 B 层同时比对 `user/message` 的 `agent-instructions` 注入文本
  （或至少钉其 digest——fixture 里已有 `source.changes[].digest` 字段可用）；
- 代价：需 boot web 进程，比现有门禁重。

**形状 B 更符合本仓纪律**（"verify the world, not the self-report"），
但**成本与覆盖缺口都须先解决**。**这是第二段的输入，不在本报告实施。**

## 四、结论

| 问题 | 结论 |
|---|---|
| 够不够格按**路径**立门禁？ | **不够**——若只按 persona/工具路径判，假阳率 75%（6 假阳 / 8 命中） |
| 够不够格按**窄路径**（含工作区手册、排除 skills）立门禁？ | 本次 10 样本上假阳 0，**但真阳仅 2 个，不足以定案** |
| 义务当前有机械面吗？ | **没有**。smoke 不在默认回归 glob、不在钩子链 |
| 有没有已发生的漏更新实例？ | **有 2 例**（`b6c6e8f`、`762eb6c` 改注入面而夹具零更新），且**跑 smoke 也会绿**——因为 B 层不覆盖注入面 |
| smoke 的声明与实测一致吗？ | **不一致**：头注称覆盖 "skill"（实测不覆盖）且未提真正全文注入的工作区手册 |

**给第二段的建议（按序）**：

1. **先修覆盖缺口**（让 B 层比对 `agent-instructions` 注入文本或钉其 digest）——
   否则任何基于 smoke 的门禁都带着同一个盲区；
2. 再考虑**形状 B**（把 keyless smoke 接进钩子/CI）；
3. 形状 A 的窄路径门禁可作为**过渡**（成本低），但只能拦住 persona 路径，拦不住注入面。

⚠️ 本条仅给建议；**是否立、怎么立由第二段独立卡决定**（先标定耗时与钩子预算，
再走 `writing-a-gate`：先想红 + 反证 + `evaluation.md` 登记）。

## 五、方法诚实边界

- **首版曾给出错结论并已修正**：首版称"候选面 5 类压到 2 类 + 无漏判"，实为漏掉注入面
  （方法论错误 = 用被测物覆盖反推被测物该覆盖什么）。修正由**对抗自审**触发，
  修正后的数字（10 命中 / 2 真阳 / 6 假阳 / 2 漏判）已独立复核；
- 样本量小：命中面 **10 次**（窗口 40 次），其中真阳仅 **2 个**——不足以支撑窄路径形状定案；
- 逐次判定为**人工判据**，靠读 smoke 源码 B1/B2 定义 + 夹具实际内容，**不可机械复核**
  ——本报告正是"判据无可执行面"的又一实例；
- ~~未实跑 smoke~~ → **已实跑**：改 `research-workspace/AGENTS.md` 加探针行后
  `--scenario lead` **ALL PASS（B1 仍绿、仍报 9888 字）**，实验后已还原。
  "B 层不覆盖注入面"由**静态源码判据 + 实测**双重坐实；
- **仍未实跑的部分**：`skill-catalog`（[12]）与 `runtime-context`（[11]）两条注入
  未做同样的探针实验（本轮只验了 [10]）。它们的"B 层不覆盖"依据是**同一条源码事实**
  （都是 `user/message`，`systemTextOf` 只收 `system/message`），故判定同型，
  但**未逐个实测**；
- "近 10 次"窗口无命中，故扩至 40 次——**这是对 RFC 判据 1 的偏离，已如实登记**；
- 未穷举 `presets/*.patch.yml` 里"工具 schema 段"的逐次判定（采信 B2 全量钉的源码事实）；
- 未审 `tests/fixtures/snapshot-research-face/{analyst,critic,scout}/` 三个子目录夹具的一致性
  （只审了 lead 根夹具）；
- 本报告**未新增或修改任何门禁**：`git diff --stat scripts/verify/` 为空。
