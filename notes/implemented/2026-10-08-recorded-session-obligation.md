# recorded-session 义务标定：零机械面 + smoke 广告了它不覆盖的三处注入

> 状态：implemented

出处 = 推敲卡 [2026-10-08-sdlc-reference-absorption](../../_backlog/_archived/settled_issues/2026-10-08-sdlc-reference-absorption.md)
（§候选与取舍 第二档 C11 + §毕业门"缺什么证据才能判"）。标定报告全文 =
[_backlog/research/2026-10-08-model-visible-calibration.md](../../_backlog/_archived/research/2026-10-08-model-visible-calibration.md)。

## 决定

**对参考卷 `12 §2` 的 recorded-session 义务做假阳率标定，结论 = 不够格按路径立门禁。**
本 Note 承载**判决与判据形状建议**；逐次判定与实测数据住 report。

参考卷原条款（DSH `docs/testing.md` "When a snapshot test is required"）：非平凡
model-visible 变化 → **同一 PR 内**新增或更新 keyless recorded-session 夹具。
本仓等价物 = [snapshot-replay-smoke](../../scripts/smoke/snapshot-replay-smoke.mjs) 的
`snapshots/replay/research-face/`。

### 核心数据

**近 40 次变更里 10 次命中 model-visible 面**：真阳 **2**（persona 变更，夹具确实更新了）、
假阳 **6**（全是 skill 正文，实测不该触发）、**真漏判 2**（该更新而没更新）。

若门禁只按 persona/工具 schema 路径判 → 假阳率 **75%**（分母 = 该门禁会命中的 6 假阳 +
2 真阳 = 8）；另有 **2 例真漏判**（分母 = 全部 10 次命中 = 20%）。
**两个数不同分母，不能相加。****不够格按路径立门禁。**

| commit | 命中的面 | 判定 |
|---|---|---|
| `fe29e63` | 四角色 `.patch.yml` persona | **真阳**（实际更新了夹具） |
| `336d8f9` | `lead.patch.yml` persona | **真阳**（commit body 实录 B1 先红→重录） |
| `b6c6e8f` | **`research-workspace/AGENTS.md`** | **真漏判**（夹具零更新） |
| `762eb6c` | **`research-workspace/AGENTS.md`** | **真漏判**（夹具零更新） |
| `762eb6c` `2a8897a` `00a5c14` `1909bdb` `8236524` `1fc9ef1` | `presets/*/skills/*/SKILL.md` | **假阳**（6 次，全为 skill 正文） |

### 最反直觉的实测：SKILL.md 正文**不**进 `system/message`

RFC 立项时把 "skills" 列进了 model-visible 面——**实测为假**，这是本次标定最有价值的一条。

夹具的 `system/message` 里确实出现 `team-assembly`、`synthesis` 等词，但读上下文可知是
**persona 正文在"点名"技能**（"组队：拆解完成后**加载 team-assembly skill**"），
**不是技能正文**——skill 正文按需读取，不在 `system/message` 里。
反面验证：夹具里 `adversarial` 命中 **0** 次，正说明 critic 的 skill 正文根本不在场。

**这条实测把 skill 正文从候选面里排除**，也正是 6 次假阳的全部来源。
（⚠️ 首版据此断言"候选面只剩 2 类"——**错**，漏了工作区手册注入面；见 §最重的发现 与
§首版为什么错。修正后候选面 = **9 类**，属"模型可见且该更新夹具"的是 **3 类**：
persona 正文、工具 schema、工作区手册。）

### 最重的发现：smoke 广告了它不拥有的覆盖

`snapshot-replay-smoke.mjs` 头注（13-15 行）称 B 层让 "**persona/skill/工具行等模型可见
文本变化在此红**"。**两处与实测不符**：

1. **"skill"** ——skill 正文**不**进 `system/message`（实测：6 个 SKILL.md 的正文行命中 **0** 条），
   改它 B 层**不会红**；
2. **未提三处 `user/message` 注入** ——夹具里模型可见的注入面有 **3 处**，B 层**全不覆盖**：

   | fixture 事件 | `source.kind` | 内容 | 随源码变更 |
   |---|---|---|---|
   | [10] | `agent-instructions` | **工作区手册全文**（88 条长行中 **87 条**逐字在场） | **是** ← 两例漏判来源 |
   | [12] | `skill-catalog` | runtime skill 的 `<available_skills>` 摘要表 | 是（改 description 会变） |
   | [11] | `runtime-context` | 运行时上下文（**非** `<system-reminder>`） | 否（运行时态） |

   结构性原因 = `systemTextOf` 的 filter 只收 `system/message`（`snapshot-replay-smoke.mjs:80`），
   而这三处都是 `user/message`。

**后果：`b6c6e8f` 与 `762eb6c` 两例改注入面而夹具零更新——不是"忘了跑 smoke"，
而是"跑了也抓不到"。**这比"义务无机械面"更重。

这与本仓已实证的同型缺陷一致（`discipline-map` 的 `na` 行静默腐烂、`design/30` 内容面
可被清空而 verify 仍全绿、`archived/` 进门条件零机械面）。
**共同形态 = 声明的覆盖强于实际的覆盖。**

### 义务当前零机械面

`snapshot-replay-smoke` **不在**默认 `pnpm test` glob 内
（[tests/fixtures/README.md](../../tests/fixtures/README.md) 标"否（独立 smoke，keyless）"），
**不在** pre-commit 钩子链里（钩子只跑 `verify` + `test`）。
所以"改了 persona 却忘了更新夹具"可以完整通过 CI。
按 RFC 输掉的方案明写"纯文档义务在本仓已有实证会静默失效"——
本条的诚实结论是：**该义务目前正是这样一条纯文档义务，且它的机械面还带着盲区。**

## 首版为什么错（对抗自审打回，如实登记）

首版结论是"真阳:假阳 = 2:6、候选面从 5 类压到 2 类、**无漏判**"。
**它错在一处方法论**：判据"该更新夹具的充分条件 = persona 或工具 schema 变了"是
**从 smoke 的 B1/B2 覆盖反推**出来的，于是**继承了 smoke 的盲区**。
**用被测物的覆盖范围去定义被测物该覆盖什么 = 循环论证。**

对抗自审独立跑出反例（注入面），首版的三处断言（候选面 5 类 / 压到 2 类 / 无漏判）随之作废，
本 Note 与报告均已修正。**登记此错的意义**：它与本轮标定想治的病是同一个——
**声明的能力可以远超实际执行的能力**，而首版自己就犯了一次。

## 输掉的方案

- **直接立门禁**：RFC 已标"易假阳"，而标定实测假阳率 **75%**——`guides/60 §0` 明写
  "数值未标定的门禁是假牙齿"。**当初的顾虑被数据证实**，直接立会得到噪音门禁。
- **按"改了 `packages/deep-research-pack/**` 就要更新"的粗模式上**：范围更宽。
  实测本仓绝大多数 pack 改动是配置行与文档；粗模式假阳率只会更高。
- **把 "skills" 留在 model-visible 面里**：立项时的假设，**实测推翻**（见上）。
  若照原假设立门禁，6 次假阳会全部命中——这正是"没标定就立门禁"的具体代价。
- **不做、只留文档义务**：那样它就是第二处纯文档义务。**但标定的诚实结论是它现在就是**
  ——所以正解不是"再写一遍义务"，而是**第二段做形状 B**（把 smoke 接进钩子/CI）。
- **用 `repo-conventions` 顺带做**：该门禁职责是"与 vendor 本体的机械约定对比"
  （`.editorconfig`/`.gitattributes`/`engines.node`）。语义不同，塞进去会污染 owner 边界
  ——本轮 C17/C18 修的正是"expand 一条门禁去管它不拥有的事实"这类漂移。
- **顺带把 C12（evidence-audit misquote 升格）一起做**：C12 有独立前置（假阳率标定），
  性质不同（run bundle 审计），须独立标定。**不夹带。**
- **在本 RFC 里把门禁写了**：RFC 判据 5/6 明写范围纪律。`git diff --stat scripts/verify/`
  为空即证未越界。

## 实际跑过的验证

- **判据 1（逐次判定无遗漏）**：**如实登记偏离**——RFC 要求"近 10 次变更"，
  但实测**近 10 次里 0 次命中 model-visible 面**（那 10 次是 SDLC 吸纳线的文档与门禁工作），
  0:0 无标定价值，**故窗口扩至近 40 次**取得 **10 个**命中样本，逐次判定全部列出。
- **判据 2（判据显式写出并列出路径族）**：report §判据 给 **9 类**候选面表
  （persona 正文 / 工具 schema / **工作区手册** / **skill description** / skill 正文 /
  **runtime-context** / **dev skill description** / 观察面 client / cordis.patch.yml），
  **按"模型实际看见什么"枚举，不按 B 层覆盖反推**（首版与二版都是后者，见下），
  每类标明"是否该更新夹具"及依据（B1 逐字比对 `system/message`、B2 全量钉工具 schema）；
  抽查判定能对回该判据。
- **判据 3（真阳:假阳 比 + 明确结论）**：真阳 **2** / 假阳 **6** / **真漏判 2**（10 命中）；
  按路径判的假阳率 **75%**；结论 = **不够格按路径立门禁**——明确，不含糊。
  另给窄路径形状（含工作区手册、排除 skills）与形状 B 两条建议，并标注
  "真阳样本仅 2，不足以定案"；形状 B 另标 **前置 = 先修 B 层覆盖缺口**。
- **判据 4（漏判风险反向检查）**：做了——**发现 2 例真漏判**（`b6c6e8f`、`762eb6c` 改
  注入面 `research-workspace/AGENTS.md` 而夹具零更新）。另做两条定向反查：
  ① SKILL.md 是否真不进上下文——6 个 SKILL.md 的正文行在 `system/message` 中命中 **0** 条
  → 确认不进；② 工作区手册是否真进上下文——`user/message` 的 `agent-instructions` 注入中
  手册 88 条长行命中 **80** 条 → 确认全文注入（与首版写的"80 条"不符，实测 87 条），且 `systemTextOf` 只收 `system/message`
  → **B 层不覆盖它**。
- **判据 5（不新增门禁、不改 verify.mjs）**：**机械门禁**——`git diff --stat scripts/verify/`
  **输出为空**（实测）· `pnpm verify` 全绿。
- **判据 6（不产生门禁决定）**：report §四 明写"本条仅给建议；是否立、怎么立由第二段独立卡
  决定"；本 Note 亦未写"已立门禁"。
- **全量**：`pnpm verify` 全绿（37 门禁）· `pnpm test` 252/252。
- **注入口探针实验（本轮实跑，结论钉死）**：向 `research-workspace/AGENTS.md` 追加一行探针
  文本 → `source dev/env.sh` → `node scripts/smoke/snapshot-replay-smoke.mjs --scenario lead`
  → **ALL PASS**，**B1 仍绿且仍报 9888 字**。即**改了模型可见的注入面，B 层毫无反应**
  ——"B 层不覆盖注入面"由静态源码判据升级为**实测**。（实验后已还原，
  `git status -- research-workspace/` = 0 处改动。）
- **未跑项**（如实登记）：① 形状 B 的耗时未标定——第二段的输入，不在本条猜；
  ② `skill-catalog`（[12]）与 `runtime-context`（[11]）两条注入**未做同样的探针实验**
  （本轮只验了 [10] 工作区手册）。其"B 层不覆盖"依据是同一条源码事实
  （都是 `user/message`，而 `systemTextOf` 只收 `system/message`），判定同型但未逐个实测。

## 环境状态

- 队列条目毕业：RFC 迁入本目录并改写为事实体；`_backlog/queue.md` 该行删除。
- **队列就此清空** → `queue.md` 回 parked 态（`（队列空——待用户取题）`），
  按根 `AGENTS.md` §入口链 第 3 步：**标 parked 时正确动作是向用户取题，不是找活凑数**。
- 新增承载物：`_backlog/research/2026-10-08-model-visible-calibration.md`（标定报告）。
- 未改：`scripts/verify/verify.mjs`、`docs/evaluation.md`、`tests/`、pack 面。
- 后续依赖（**不在本条**）：① 形状 B 独立卡（先标定 smoke 耗时与钩子预算，
  再走 `writing-a-gate`：先想红 + 反证 + `evaluation.md` 登记）；② C12 evidence-audit
  misquote 升格的独立标定卡。
