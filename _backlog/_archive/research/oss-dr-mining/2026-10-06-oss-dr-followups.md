# 开源 DR 挖掘遗留下钻（DeerFlow PR ×5 + gptr 归属核查）

> 服务卡：[2026-10-06-oss-dr-lessons](../../settled_issues/2026-10-06-oss-dr-lessons.md)
> （毕业卡「DeerFlow 可验证执行四件套」待下钻注记 + gptr"retriever 插件化"引用归属疑点）。
> 前程材料：[2026-10-06-oss-dr-arch-mining.md](2026-10-06-oss-dr-arch-mining.md)（web 深挖正本，§2 deer-flow 节与收尾候选清单）。
> 截至：**2026-10-06**（`bash date` 输出 2026-10-06 16:16 CST；本卡所有"当前/截至"类日期与数字口径均以此为抓取当刻）。
> 方法声明：只用一手来源——GitHub PR API 元数据（api.github.com/repos/.../pulls/N）、PR diff 原文
> （github.com/.../pull/N.diff，全量抓取后抽关键文件 patch）、release API 正文（api.github.com/repos/.../releases）、
> 源码原文（raw.githubusercontent.com）；每条关键判断带完整 https URL；引文行只放原文（引文块内），
> 本卡标注写在引文块外；数字带口径。抓取通道：curl 直连 GitHub API 与 raw 域，全部成功取回。
> 失败形态如实标"未取得"，不臆断"官方没有"。本卡只补材料与归属核查，不改两份前程材料与
> 任何 bundle 交付记录。

---

## §1 DeerFlow 可验证执行四件套 PR 下钻

### §1.0 系列归属与总口径

五个 PR **全部 merged 进 `base: main`（即 2.x super harness 主线）**，无 `main-1.x` 归属疑义。
一个必须如实记录的口径问题：**这套四件套是 2.x 的机制，1.x（DR 框架本体）没有**——arch-mining
§2 已确认 deer-flow 2.0 是 ground-up rewrite（"It shares no code with v1"），而 1.x 的质量控制
仅 planner prompt 级判断 + human feedback 打回（arch-mining §2c）。毕业卡引用 release notes 时
把这套机制记在 deer-flow 名下成立，但物种上它属于"通用 agent harness 的子代理验证层"，
**不是 DR 管道层的机制**——这直接影响 §1.7 的借鉴初判。

系列结构：RFC [#4651](https://github.com/bytedance/deer-flow/issues/4651) 的分层交付计划——
PR4 的 body 自述层级："PR1 #4659, PR2 #5076, PR3 #5090 shipped. This is PR4"。#4365 是独立的
runtime 层前置切片（Refs #4272，非 #4651 系列，但在 release notes 口径里同被归入可验证执行叙事）。
全部五 PR 出自同一贡献者（Vanzeren），AI 辅助实现、人主导设计评审（各 PR body "AI assistance" 节自述）。

| PR | 标题 | merged_at | 规模 | 层 |
|---|---|---|---|---|
| [#4365](https://github.com/bytedance/deer-flow/pull/4365) | feat(runtime): record terminal artifact delivery receipts (slice 1 of #4272) | 2026-07-26 | 19 files, +1310 −36 | runtime 事件流 |
| [#4659](https://github.com/bytedance/deer-flow/pull/4659) | feat(harness): deterministic tool receipts with model-visible ledger (RFC #4651, layer 1) | 2026-08-23 | 23 files, +963 −46 | 工具收据 + 上下文注入 |
| [#5076](https://github.com/bytedance/deer-flow/pull/5076) | feat(harness): subagent receipt citation verification | 2026-08-29 | 21 files, +1682 −49 | 父侧引文交叉核查 |
| [#5090](https://github.com/bytedance/deer-flow/pull/5090) | feat(harness): subagent report contract and delegation acceptance criteria | 2026-08-30 | 13 files, +747 −8 | prompt 契约层 |
| [#5109](https://github.com/bytedance/deer-flow/pull/5109) | feat(harness): deterministic acceptance checklist for subagent delegations (RFC #4651, layer 2) | 2026-09-01 | 30 files, +4666 −34 | 判据确定性核查 |

合计约 106 文件、+9,368/−173 行，交付窗口 2026-07-22 → 2026-09-01（约六周）——**实现成本口径**，
对"值不值得在别的载体上重建"是直接证据（见 §1.7）。

---

### §1.1 PR #4659 —— 工具收据 + 模型可见账本（Layer 1）

元数据：base `main`，head `Vanzeren:feat/tool-receipts`，2026-08-23 merged，23 files +963 −46。
body 的 Why（原文见 [PR 页](https://github.com/bytedance/deer-flow/pull/4659)）指出动机是
"lead 收到的只是自由文本自报，无可用证据"：

> A subagent that goes off the rails but returns `completed` has its conclusions adopted wholesale.

**新文件 `backend/packages/harness/deerflow/agents/middlewares/tool_receipt.py`（150 行）核心结构**
（diff 原文摘录，https://github.com/bytedance/deer-flow/pull/4659.diff ）：

> ```python
> class ToolReceipt(TypedDict):
>     id: str  # display id, assigned by extract_tool_receipts ("r1"..)
>     tool_call_id: str
>     tool_name: str
>     status: str  # success | error | partial_success (from deerflow_tool_meta)
>     args_sha256: str
>     output_sha256: str
>     output_bytes: int
>     created_at: str
> ```
> ```python
> _HASH_LEN = 16
> _RENDER_CHAR_BUDGET = 2000
> ```

**Tamper-evident 的实现形态**（诚实记录：不是密码学签名，是"运行时所有权 + 防伪造规则"）：

> ```python
> # The receipt key is runtime-owned: always overwrite, never preserve
> # a pre-existing value — a tool could otherwise forge its own
> # "evidence" and have it rendered as runtime-stamped provenance.
> kwargs[TOOL_RECEIPT_KEY] = make_tool_receipt(request.tool_call, message)
> ```

配套：gateway 剥离客户端伪造的 receipt/verdict 元数据（#5076）、读侧结构校验（malformed 跳过不 crash）、
receipt 由消息流**派生**而非单独存储（"Receipts are *derived* from the message stream (never stored
separately), so rendering for the model and harvesting for the parent agent always agree"）。docstring
自带两条诚实局限声明：

> `output_sha256` is a *freshness stamp*, not a re-checkable fingerprint against the persisted message.

> an ``[r3]`` cited before compaction can point at a different tool call (or nothing) after.

**Bounded ledger 的界与注入形态**（`tool_receipt_middleware.py`，156 行）：账本渲染硬顶 2,000 字符
（PR body 口径"bounded to ~2,000 chars with newest-first eviction"，约 ≤600 tokens），超限从最老
收据开始淘汰并留 `"... older receipts omitted (context budget)"` 标记；注入为隐藏 HumanMessage
（`hide_from_ui`），"never written back to state and never shown in the UI"；lead 链渲染模式
`delegation_only`（只在处理子代理结果的当前轮渲染，省 token），子代理链恒渲染（否则无法引用）。
账本头部恒带证据边界声明：

> Execution evidence only — receipts record that a call happened and its status; they do not validate claim correctness or task acceptance.

配置面：新 `verification` 配置节（config version 32→33），`receipts_enabled` 默认 **on**、
`receipts_render_mode` 默认 `delegation_only`、`judge_enabled` 默认 off（留给后续 PR）、`judge_model_name`。

### §1.2 PR #5076 —— 父侧引文交叉核查

元数据：base `main`，2026-08-29 merged，21 files +1682 −49。
新文件 `receipt_verification.py`（172 行，纯函数、无 IO 无 LLM）。引文协议单点所有权在
`tool_receipt.py`（PR 原文）：

> ```python
> CITATION_RE = re.compile(rf"\[{RECEIPT_ID_PREFIX}(\d+)(?:\s+([A-Za-z_][\w.-]*))?\]")
> ```
> ```python
> def format_citation(rid: str, tool_name: str | None = None) -> str:
>     """Canonical model-facing citation (``[r2]`` bare, ``[r2 write_file]`` anchored)."""
> ```

核查语义（diff 原文）：`resolved`（id 在账本且 status=success 且锚工具名匹配）/ `failed`（非成功
状态或锚不匹配）/ `unknown`（id 不在账本）；**零引文 ≠ 干净**——用动作动词表（英文 + CJK 双表）
+ 文件路径模式 + "非平凡报告长度 ≥240 字符"三重启发式判"有动作主张却零引文"→ UNVERIFIED：

> ```python
> no_citation_claims = not cited and (_has_action_claims(report_text) or bool(receipts) and len(report_text.strip()) >= _NONTRIVIAL_REPORT_MIN_CHARS)
> ```

判定结果**只渲染为 advisory 信号，不做门禁**（PR body："Verdicts are advisory signals for the lead
model — no gating, no retry loops; re-delegation stays with the model."），渲染格式：

> `citations: 2 resolved, 1 failed — execution evidence only, does not validate claim correctness`

词汇分层规则（多处反复出现的 Design rule）：

> the summary boolean is ``citation_resolved``, never ``satisfied``/``verified``/``passed`` — strong-positive words are reserved for the runtime hard gate so the model never conflates advisory execution evidence with task acceptance.

### §1.3 PR #5090 —— 报告契约 + 交付物 handle + acceptance_criteria 布线（prompt 层）

元数据：base `main`，2026-08-30 merged，13 files +747 −8。
新文件 `subagents/report_contract.py`（148 行）：每个子代理（内建与自定义）的 system prompt 注入
`<report_contract>` 节。**Deliverable handle 的形态原文**：

> - Attach a verifiable handle to every deliverable: absolute file path, URL, record ID, or HTTP status.

即 handle 不是哈希、不是新协议，是**报告文本里可被父侧复核的四种常规指针**（绝对路径/URL/记录
ID/HTTP 状态）。契约开头（原文）：

> Your final report is a SELF-REPORT. The delegating agent cross-checks it against your execution record and treats uncorroborated action claims as unverified.

`task` 工具新增可选 `acceptance_criteria` 参数：判据文本是**不可信通道数据**（model-supplied、
user-influenceable，与委派 prompt 同通道）——走 task HumanMessage 经 `InputSanitizationMiddleware`
转义与边界框定，**SystemMessage 只带框架所有的指针注记、永不携带判据文本**（防自然语言注入获得
系统通道权威），条目上限 **20 条 × 500 字符**、存储态再做 tag 中和。`report_contract` 与
`acceptance_criteria` 同时注册为 input sanitization 的封锁框架权威标签（防不可信输入伪造验证契约）。
原话：

> Every string entering a model context has a source, and the source's trust level decides the channel.

### §1.4 PR #5109 —— acceptance_criteria 父侧确定性核查（Layer 2）

元数据：base `main`，2026-09-01 merged，30 files +4666 −34。
新文件 `subagents/acceptance_checks.py`（**1,396 行**，全纯函数、sandbox IO 经注入 reader、
`asyncio.to_thread` 下放）。**支持的判据叶族**（diff 原文，docstring）：

> - ``file:<path> exists`` / ``file:<path> non-empty`` — read through ``read_current_file_content`` ... **scoped to the shared thread workspace** ...
> - ``file_written:<path>`` — typed claim binding: existence + read-back through the same workspace-scoped read.
> - ``tests_passed:<command>`` — typed claim binding: the criterion must anchor to a *specific recorded execution* — a matching bash execution ... with ``status=success`` and a test-summary shape in its output tail — not merely to some successful call.
> - Anything else is undecidable in code: ``checked=False``, rendered ``UNVERIFIED``, never silently passed.

判不了的处理是本 PR 的核心卖点：**UNVERIFIED 显式标注，永不静默放行**；`unchecked` 清单留给
PR5 selective judge（`judge_enabled` 默认 off，截至本卡抓取日尚未见 PR5 落地——"未取得"）。
`tests_passed` 的证据形状机检（pass/fail/zero 三组正则，"0 passed"否决 pass 形状；fail 形状优先）；
沙箱提供方对齐（e2b/OpenSandbox/Tenki/BoxLite/AIO 补齐非零退出的 `Exit Code: N` 尾标记，本地超时
`=124`），否则 `tests_passed` 在远端沙箱上不可靠。路径越界（共享线程工作区之外）一律 UNVERIFIED
而非猜可达。验收清单渲染进 lead 可见文本与 delegation ledger：

> `acceptance: 1 hold, 1 does not hold, 1 UNVERIFIED — execution evidence only, does not validate claim correctness`

测试（PR body 自述）：12,980 passed 全量套 + 专项 `test_acceptance_checks.py`（80 passed）；
并附"teeth proven"锚测试（revert 掉 `asyncio.to_thread` 下放即红）。**记账一笔**：该 PR 的
"I've read and understand every line" 复选框为**未勾选**状态（diff/页面可见）——不影响机制判断，
但作为来源可信度口径如实记。

### §1.5 PR #4365 —— run 级交付收据（runtime 事件流，独立切片）

元数据：base `main`，2026-07-26 merged，19 files +1310 −36（Refs #4272，非 RFC #4651 系列）。
动机：graph 无异常完成即记 process `success`，与"工件真交付了"混同。修法（body 原文）：

> Every terminal run now records exactly one `run.delivery` event in the run event stream: `{presented, paths, by_tool}`

**零行为变更的 surface-only 切片**：`presented: 0` 仍 `success`，fail-closed 语义显式推迟到
#4243 契约讨论（"which runs carry a delivery contract"未决）。测试自述一笔诚实方法论：

> This slice adds a previously non-existent observable (the delivery receipt), so there is no legacy assertion to turn red on `main` — the bug was that delivery facts were *not recorded anywhere*, which is not expressible as a failing test against old code. Instead, the new behavior is pinned directly.

### §1.6 固定问题集答案（汇总）

1. **receipt 数据结构**：`ToolReceipt` TypedDict 八字段（display id `r1..rN`、tool_call_id、
   tool_name、status ∈ success/error/partial_success、args_sha256、output_sha256、output_bytes、
   created_at UTC ISO）；哈希为 sha256 截 16 hex。**Tamper-evident 实现不是密码学签名**，而是四层
   运行时所有权规则：运行时盖戳（模型不可伪造）→ `deerflow_tool_receipt` 键恒覆盖（工具无法自带
   假证据）→ gateway 剥离客户端伪造的 receipt/verdict 元数据 → 读侧结构校验、malformed 跳过；
   另有诚实局限：output_sha256 只是 freshness stamp（压缩后不可对持久消息重验）。
2. **bounded ledger 的界**：2,000 字符（≈600 tokens）硬顶；超限 newest-first 淘汰 + omission 标记
   + 末尾硬截断；账本是每次模型调用从消息流**派生**的隐藏 HumanMessage，不写回 state、不进 UI；
   lead 链另有轮次界（`delegation_only`——仅当前轮处理子代理结果时渲染，防一次委派占永久 token 税）。
3. **deliverable handle 形态**：不是哈希/新引用协议，是四种常规指针——**绝对文件路径、URL、记录
   ID、HTTP 状态**，以文本附着在报告的交付主张上、按"父侧可复核"定义；在 acceptance_criteria 里
   收敛为三个 typed 叶形式：`file:<path> exists|non-empty`、`file_written:<path>`、`tests_passed:<command>`。
4. **acceptance_criteria 判据类型与核查代码**：三叶族（文件在场/非空、文件写入读回、测试通过——
   后者锚定到具体已记录 bash 执行 + 真实退出码 + 测试摘要形状，"0 passed"否决 pass）。父侧核查
   代码 = `backend/packages/harness/deerflow/subagents/acceptance_checks.py`（#5109，1,396 行，零
   LLM 成本）；**判不了 → `checked=False` → UNVERIFIED，永不静默放行**，`unchecked` 清单是后续
   selective judge 的现成输入（judge 默认 off，PR5 未落地——未取得）。UNVERIFIED 语义传播：随
   `subagent_acceptance_verdict` 元数据到 delegation ledger 与结果文本，词汇分层保证 advisory
   证据不冒充验收（`checked/holds`、`citation_resolved`，禁用 `satisfied/verified/passed`——强正面词
   留给 runtime hard gate）。
5. **作用面**：主作用面 = **lead↔subagent 委派**（task 工具 + 状态契约 + executor 终态收割 + 父侧
   核查 + delegation ledger 渲染）；次作用面 = 工具调用审计（middleware 链最外层盖戳，每次工具
   结果都有收据）；#4365 另有 run 级事件流面（`run.delivery`，runtime/事件存储层，与工具收据层
   只共享判定结构约定）。
6. **实现规模**：五 PR 合计约 106 文件、+9,368/−173 行、六周窗口；核心四个新模块 150/172/148/1,396
   行 + 六个沙箱提供方退出码对齐 + gateway/事件存储/worker 改造 + 大量契约测试。同一贡献者、
   AI 起草人主导评审的 RFC 分层交付。

### §1.7 对本仓的借鉴初判

对照靶 = DSH Agent Teams 型 DR 插件（lead 收活、subagent 报告、node-gate 对 bundle 机械核查、
evidence-audit 溯源审计；诚实取舍 = "提交前验证降格为 critic 狩猎——critic 也是 LLM 可能漏"，
docs/design/30-methodology-mapping.md §4 之 2）。宪章约束：循 DSH 而不发明、借鉴候选带触发条件、
无实证疼痛不开工。

**有落点（按触发现实性排序）：**

1. **委派时显式带 acceptance_criteria 清单 → lead 收活时机械核验文件在场性**。这是四件套里唯一
   在 DSH 载体上有插桩面的成分：DSH 协作是文件契约面，subagent 交付落 bundle 文件，node-gate/
   schema-scan 已是同型机制（对 bundle 的判据级/在场级机械核查）。可借鉴的是**纪律而非代码**：
   （a）lead 向 subagent 分派时把"哪些判据可机械判"显式写成清单（而非留在 lead 脑内自由文本收活）；
   （b）收活时对可机械判判据逐条跑机械核查（node-gate 语义）；（c）判不了的判据**显式标 UNVERIFIED，
   永不静默放行**——这条正对"提交前验证降格为 critic 狩猎（critic 可能漏）"的取舍账：降格可以保留，
   但漏网的应显性化而不是无声。**触发条件**：下一场 run 出现实证疼痛——lead 收活时漏核 subagent
   交付物在场性/判据，或 critic 漏查且事后才发现；或用户点名提前。落点形态 = NODES.md 交付判据行
   + critic/analyst skill 文风（若涉及 NODES 判据行改动，走 NODES 同 diff 程序）。
2. **UNVERIFIED 显式标注语义 → 收活纪律 / review.md 格式**（B 档零机械成本）：critic 的
   adversarial-review 对"查了但判不了"的项显式标注，与本仓证据卡"口径不明写口径不明"同型，
   可并入 B 档"文件被触碰时顺带采纳"。
3. **verifiable handle 附着于每条 action claim 的报告纪律**（B 档 prompt 级）：与本仓
   `[来源: evidence/xx.md]` 溯源链同构且本仓已更强（文件级 + evidence-audit 机械审计）——半重复，
   降权；唯一增量是"**动作主张**（写过什么/跑过什么）也须附可复核指针"这一维度，evidence 溯源
   只覆盖"来源主张"不覆盖"动作主张"，可作 analyst/critic skill 的措辞参考。

**无落点（附理由）：**

1. **receipt 签名/tamper-evident 全套（#4659 核心）**：DSH 会话日志已 event-sourced（vendor 全局
   不变量 model-visible ⟺ logged），运行时已拥有完整工具调用记录；且本仓是 DSH 插件，不存在
   `wrap_tool_call` 中间件层可供插桩——机制载体不存在，重建即"发明"。+#4659 体系自身的诚实局限
   （freshness stamp、renumbering caveat）说明这套 tamper-evidence 的实际强度有限。
2. **bounded receipt ledger 进模型上下文（#4659）**：注入面在宿主 runtime；DSH 载体上 subagent
   的中间工具消息本就不进 lead 上下文，"子代理执行事实不可见"的病灶由"报告落文件 + node-gate 扫
   文件"覆盖。无病可治。
3. **[rN] 引文交叉核查（#5076）**：依赖 receipt ledger 存在，随之无落点；其立场（自报不可信、
   须可机械对账）本仓 evidence-audit 已更强覆盖（含"防自证式摘录回溯"）。
4. **词汇分层（advisory/gate 双层禁用强正面词）**：本仓门禁输出本就是 fail-loud 机械判定，无
   "advisory 信号被误读为验收"的病灶——机制为治 specific 病而生，无病不强加。
5. **run.delivery 事件（#4365）**：DSH 交付判定 = 文件在场（node-gate）+ present 声明，无独立
   事件流消费面。
6. **整体移植的成本反证**：9.4k 行 / 六周 / 单人专职贡献者的 runtime 层工程，本仓无此载体也无此
   疼痛量级——毕业卡"待下钻后才能判"的问题，下钻后的答案是**不进 A 档**：四件套中可借鉴的只有
   纪律层三条（见上），且全部是 B 档或带触发的契约行，不是机制移植。

**定位注脚**（同 arch-mining §2g.4 反向读法）：这套机制恰恰是 deer-flow 2.x 长成 harness 后
**自建**的子代理验证层——本仓借 DSH 为宿主，等价问题（"自报 vs 实做不可分"）由宿主的
Agent Teams 生命周期 + 本仓的文件契约机械门禁分层承担，不需要也不应该在插件里长出第四套。

---

## §2 gptr"retriever 插件化"引用归属核查

### §2.1 疑点复述

final.md §1.5（research-workspace/archive/drt_dr-product-landscape/final.md:145）写：

> 最近发布：**v3.7.0，2026-09-26**（Jev 上下文过滤器成为默认、无 key 时回落本地 BM25、要求 Python 3.12+、retriever 插件化）。[来源: evidence/os-gptr-releases.md]

（此行是从归档 bundle 只读摘录的核对基准，本卡不回填。）但证据卡
os-gptr-releases.md 的 v3.7.0 摘录（其 29–43 行）只含"Smarter context"（Jev）节、Python 3.12+
breaking 项与 Install 行，**没有 retriever 字样**；"retriever 插件化（entry points）"原话只在
leads.md:163（scout 笔记）。

### §2.2 核查过程（一手来源）

1. **release notes 原文**：`https://api.github.com/repos/assafelovic/gpt-researcher/releases` 取回
   74 条 release（截至 2026-10-06）；v3.7.0（published_at 2026-09-26T17:46:25Z，name "Jev update
   and many bug fixes and improvements"）body 共 9,228 字节。关键词命中：`retriev` ×9、`plugin` ×1、
   `entry point` ×2。**正文"Also in this release"节确有该条目**（原文）：

   > - Retriever plugins: ship a search provider as its own package via the `gpt_researcher.retrievers` entry point (#2154)

2. **机制实存性**（release 条目指向的 PR 与主线代码）：
   - PR [#2154](https://github.com/assafelovic/gpt-researcher/pull/2154)
     "feat(retrievers): load third-party retrievers from entry points"，merged 2026-09-26（与
     release 同日），改 `gpt_researcher/actions/retriever.py`(+22)、`retrievers/utils.py`(+16)、
     新增 `docs/docs/gpt-researcher/search-engines/retriever-plugins.md`(+77) 与
     `tests/test_retriever_plugins.py`(+93，7 个测试)；
   - 主线代码实存（raw.githubusercontent.com/assafelovic/gpt-researcher/main/，2026-10-06 取回）：

     > ```python
     > RETRIEVER_ENTRY_POINT_GROUP = "gpt_researcher.retrievers"
     > ```

     （gpt_researcher/actions/retriever.py）与

     > ```python
     > from importlib.metadata import entry_points
     > return sorted({ep.name for ep in entry_points(group=RETRIEVER_ENTRY_POINT_GROUP)})
     > ```

     （gpt_researcher/retrievers/utils.py，`get_plugin_retriever_names`）
   - **pyproject 口径**：gpt-researcher 自身的 pyproject.toml（main 与 master 两分支均查，HTTP 200）
     **无 `[project.entry-points]` 声明**——这不是缺失：entry-point group 由**插件包**在自己包的
     pyproject 里声明，核心包只经 `importlib.metadata` 读取注册项；PR #2154 的验证记录也如此
     （"built and `pip install`ed a real package with an entry point, set `RETRIEVER=acme`"）。
     "pyproject 找 plugins 声明"这一核查路径在核心仓不命中属预期形态，非失败。
   - 降级行为：broken plugin 记 warning 并 resolve 为 None，`get_retrievers()` 保持既有回落默认
     行为（PR #2154 body 自述，fail-soft，与本仓 fail-loud 立场相异——只记口径，不展开）。
3. **证据卡摘录核对**：os-gptr-releases.md 的 v3.7.0 摘录为**选择性摘录**（只摘 Jev 节 +
   Python 3.12 + Install 行），未含"Also in this release"节——该卡未声明"全文摘录"，属摘录范围
   选择问题，非来源矛盾。leads.md:163 的"retriever 插件化（entry points）"与 release 原文
   （"Retriever plugins ... via the `gpt_researcher.retrievers` entry point"）语义一致、措辞同源。

### §2.3 结论：**a) release notes 确有该条目（卡摘录漏摘——final 引用成立）**

- final.md §1.5 把"retriever 插件化"归入 v3.7.0 release notes 的引用**成立**：release body 原文
  即有该条目（§2.2.1 原句），归属无错位；
- 证据卡 os-gptr-releases.md 的摘录只是未覆盖到该条目（"Also in this release"节未摘）——卡摘录
  漏摘，不影响 final 引用的成立；是否回填卡片属 bundle 交付记录问题，本卡按任务书不改；
- 附加强化（超出归属核查的最小闭环）：机制本身亦经主线源码 + PR #2154 独立核实实存，且维护者
  原话（"Search providers keep arriving as PRs that add another built-in retriever: 23 ship today
  and 8 more were open this month"）给出动机——"插件化"不是 release 文案的夸大，是已落地的
  entry-point 机制。

（§2 完 · 仅核归属，不改 bundle 交付记录 · 全部一手来源，URL 随文）

（完 · 截至 2026-10-06 抓取当刻）
