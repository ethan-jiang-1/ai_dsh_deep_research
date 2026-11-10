---
topic: 产出/验证分离：claim 级独立复核的可落地契约
intent: 把「验证独立于产出」从设计推演收敛成工件契约、机械门、试点与重议条件，并逐条复核首版引用的外部数字。
---

# Claim 级独立复核：契约、机械门与试点（v2）

> 性质：结论稿。每条事实带锚点（文件 / 命令 / 会话日志 / 论文表号）；判断段标「判断」。
> 与 v1 的关系：[v1（claim-verdicts）](2026-11-10-claim-verdicts.md) 回答「为什么」；本文件回答
> 「落成什么、怎么机检、怎么证明有效」。两份冲突时以本文件为准（v1 已就地标注被本文件取代的两处）。

## 0. 结论先行

1. **本仓的独立性今天只到 L2 的弱形态**：critic 是独立会话 + 独立上下文（`subagent(agent_preset=critic)`），但
   交付判据是**报告级** `readiness: PASS` 的一段 prose；没有 claim 级单元、没有 typed 工件、没有可机械回答
   「每条关键结论都被独立核过吗」的覆盖面。
2. **最小增量不是新角色，是四件工件**：claim 表（Lead 写）+ typed verdict（critic child 只回文本）+ 父级
   原文落盘（Lead 写）+ 覆盖门（脚本核）。不新增角色、不新增调度器、不改 vendor。
3. **机械面只管工件完整性**：覆盖、值域、原文一致、表内条目真实（claim 必须是 final 里的原句）、
   child 会话身份。**不判** quote 是否真支持、不判 claim 表是否漏——那是 critic 与人的语义审。
4. **一个同类实现已经跑通**（company 2026-11-10 落地；两次真模型 E2E——一次 R1 fail → R2 pass，一次 R1 一次过）：结构可行已被证明，但它也给出
   六条实测教训（见 §3）；它证明的是「形状能跑」，不是「本仓这套能跑」。
5. **本仓有两个与 company 不同的硬约束**，它们决定了实现形状：
   - **Lead 没有 bash**（工具面只有 fs/web/skill/todo/ask-user/goal/present/subagent）→ **哈希必须由门禁算，
     不能让模型算**；模型只负责「原文抄下来」。
   - **`subagent` 工具不暴露 `outputSchema` 参数**（provider 侧能力 `outputSchema: true`，但工具 schema 里
     只有 `prompt / description / agent_preset` 等）→ **typed 输出只能靠 prompt 约束**。这是整条链上
     唯一一个未经真机验证的大假设，也是试点（§7）要证的那一件事。

## 1. 复核：v1 引用的外部数字（两处要改）

v1 把五个数字当成承重证据。逐个回原文核（arXiv HTML 表号为准）：

| v1 主张 | 复核结果 | 锚点 |
|---|---|---|
| Graph Coloring 自评把准确率 16% 打到 2% | ✅ 成立 | 2402.08115 Table 1：S.P. 16% → S.C. 2% |
| Game of 24 从 5% 打到 3% | ✅ 成立 | 同上：5% → 3% |
| false-negative 95.8% | ✅ 成立，但**只属 Graph Coloring** | 2402.08115 Table 2：Graph Coloring F.N.R 95.8%（Game of 24 为 20.7%） |
| 换 sound verifier 回到 38% / 36% / 10% | ✅ 前两个成立；10% 属 Mystery Blocksworld 档 | Table 1：Graph Coloring 38%/37%、Game of 24 36%/38%、Mystery Blocksworld 10%/8% |
| LLM judge 选自己 59.3% vs 选别人 18% | ❌ **复核不到**：2404.13076（v1 HTML 全文）里检索不到 `59.3`，正文没有这组数 | 该论文可核的结论 = 「LLM 能非平凡地识别自己的输出，且自识别能力与自偏爱强度线性相关」——**改引结论句，不引这组数字** |
| FACT 给头部 agent 的 citation accuracy 78–90%（即 10–22% 引用不被支持） | ✅ 对**四个 DR agent** 成立；不能扩成整表 | 2506.11763 结果表 C. Acc.：OpenAI Deep Research 77.96 / Gemini-2.5-Pro Deep Research 81.44 / Grok Deeper Search 83.59 / Perplexity Deep Research 90.24。同表搜索类 LLM 区间 74.42（Perplexity-Sonar high）– 94.04（Claude-3.5-Sonnet w/Search） |

**判断**：结论不变（同模无接地自评会掉点、同模 judge 有自偏爱、头部 DR agent 的引用有 10–22% 不被支持），
但两处措辞必须收紧：`95.8%` 与 `59.3%/18%`。后者是**未核实引用**——留着它就是在用「看起来精确的数字」
支撑一个本来站得住的论点，正是本方向要治的病。

## 2. 本仓现状：独立性到哪、缺什么（锚点）

**已有的事实性独立**（不是 prompt 纪律）：

| 事实 | 锚点 |
|---|---|
| critic 可以是**独立会话**：`subagent` 的 `allowedAgentPresets` 含 critic，child 会话头带 `agentPreset=critic` | `presets/lead.patch.yml`（tool-subagent 行）；vendor `packages/session/session-persistence-jsonl/src/format.ts:82-96`（header 字段） |
| critic 会**重抓 URL** 而不是只看 URL 出现过 | `presets/critic/skills/adversarial-review/SKILL.md` §轻量模式（"独立重抓…实测各重抓 20+ URL"）；`content/manual.md` §摘录最小契约（"source_url 必须由 web_fetch 成功取回"） |
| 只有 critic 能写终局 PASS；Lead 升级必须落新的终局块 | `content/manual.md` §终局块；`presets/critic/skills/adversarial-review/SKILL.md` §review.md 格式 |
| 证据侧已有机械溯源（URL 真抓过、摘录能回溯、final 链不断） | `scripts/run-gates/evidence-audit.mjs` 三条断言 |

**缺的四件**（v1 已列，逐条给现状锚点）：

| 缺口 | 现状锚点 | 后果 |
|---|---|---|
| claim 级单元 | 全仓只有「claim 句」这个说法（`content/manual.md` §按意图读-查证行），没有 claim 表 | 判断粒度 = 整篇 |
| typed 工件 | `review.md` 是 prose（skill 里固定了 CRITICAL/MAJOR/MINOR + readiness，仍是自由文本） | 机器读不出「哪条被核过、核成什么」 |
| 留痕 / 防改 | `run-receipt.mjs` 只对 final/readable/audit 算 sha256；review.md 无入账 | 交付后改 review 无人知 |
| 覆盖可核 | `node-gate` 门A 只看「review 终局块 PASS 在不在」 | 「PASS 了但只核了 3/9 条」看不出来 |

**两个新核实、且改变设计的事实**：

1. **`subagent` 不等结果**。vendor README 原文："Every call returns `started subagent <childId>`…
   It does not wait for the child's result… the runtime sends a completion notice"。工具结果是
   `{ kind: 'activation', subagentId }`，**不含最终输出**（`packages/subagent/tool-subagent/README.md:59,100,227`）。
   → 裁决**不可能在同一轮写盘**：Lead 派工后必须结束回合，等 completion notice 到下一轮再落盘。
   这意味着「父级落盘」不是一次 write，而是一个**跨轮次**动作；`review/verdicts-r1.json` 因此不能作为
   「派工时就知道」的文件，只能是派工后补齐。
2. **真实会话日志里有全部需要的原子**（dev home 的 116 个 v4 日志实测）：
   `session`（头：`agentPreset` / `delegationDepth` / `parentSession`）、`assistant/message`
   （`data.message.content[]`，块类型 `reasoning`｜`text`）、`tool/call`（`data.name` / `data.arguments`）、`turn/end`。
   现场分布：`lead` 70 场、`scout/analyst/critic` 各 14 场、`method-editor` 4 场（都是 depth 0 的探针会话——
   **dev home 尚无真实 child 会话**，所以「child 头带 depth≥1 + parentSession」这一条只有 vendor 契约与测试为证，
   未被本仓现场日志证实；试点要顺带把它录进证据）。

## 3. 一个已跑通的同类实现（company）：能搬什么、不能搬什么

结构（四槽：人 / 流程 / 方法 / 政策）与两次真模型 E2E 的产物都在 company 仓，本仓不该重新发明。可核的落点：
归档卡 `_backlog/_archive/settled_issues/2026-11-10-producer-verifier-quality-loop.md`、
落地 Note `notes/implemented/2026-11-10-producer-verifier-quality-loop.md`、
流程正本 `packages/company-pack/presets/_shared/skills/quality-loop/SKILL.md`、
判据 `tools/lib/quality-loop.mjs`（418 行）、驱动 `probes/team/quality-loop-audit.mjs`（338 行）。（仓外路径，不随本仓。）

**它做到的**：两个独立 activation（`quality-loop-producer` / `quality-loop-verifier`）；验证者**真只读**
（`tool-fs` 的 `write:false` + `edit:false`，无 bash）；裁决头行带 `session/preset/depth/producer/method/body-sha256`；
审计核七件（独立会话、原文一致、未被改、处置覆盖、方法配对、check-id 全覆盖、验证者没写盘）；
「先产后验」被做成**机械判据**（验证者会话创建时间晚于产出者首轮 `turn/end`）。

**六条实测教训（E2E 后写进 Note / 处置表的，省我们一轮返工）**：

| 教训 | 我们怎么接 |
|---|---|
| 判据过严两例：原文只认「最后一条助手正文」（同一 child 被续跑时 R1 会误判）、处置首格带标题不认编号 | 原文一致 = 该 child **任一**助手正文命中，且跨轮**单调向后**；first-cell 解析按开头 `F<n>`/`C<n>` 认 |
| 契约缺口：R2 没出处置表，因为发工 prompt 只点了 r1 → 定为「处置归首次提出该发现的那一轮」 | 轮次语义写死进契约：处置归首轮，复验只作闭环陈述 |
| 只读验证者**算不了哈希**（E2E 里它如实写了"无法核对 sha256/字节数"） | 哈希归门禁；模型只抄原文——本仓 Lead 无 bash，正好同一处置 |
| 改名后审计按现行 preset id 报 `header-preset` | 头行记录 `preset` 时写**当次实际 id**，判据里放一行白名单演进记录 |
| **独立性实质泄漏**：产出侧首稿把「给验证者的复核指引」写进产物，把检查表预先映射成通过结论——不是内容缺陷，是让验证者复核自己 | 送审前查「产物里有没有给验证者的话」，有就删再冻结；本仓对应 = brief 只给 claim + 证据 + schema，`claims.json` 里不许出现「预期结论」，也不转给 child 任何 Lead 的推理 |
| 检查表写复合值（`fail→本轮 pass`）不可机器核 | verdict 必须是**单值**枚举；程度用 `partially_supported` 表达，禁止 `fail→pass`、`基本支持` 这类复合/程度词（脚本直接判红） |

**不能搬的两件**：

- **方法层 + check-id**：company 的验证单元是「方法包的 check-id」，本仓的验证单元是 **claim**（研究产物的
  最小可判真假单位）。照搬会造出第二套「方法包」体系，与 `research-workspace/method-library.md` 打架。
- **真只读 preset**：company 加两个 support preset 的代价是包内新档 + 名册 + smoke 计数；本仓 D2 的
  角色数是 5 且有 `role-list-sync` 哨兵，新增角色 = 推翻 D2 + 新 D 号 + preset-smoke 全链。v1 不做（见 §6 第 3 行）。

## 4. 契约 v1（可实现的形状）

### 4.1 工件（三处，全部在 bundle 内）

```
drt_<slug>/
  review/
    claims.json          # Lead 写：claim 表（唯一事实源）
    verdicts-r<N>.json   # Lead 写：裁决原文 + 批次元数据
  review.md              # critic（报告级，团队态）写：终局 readiness + 覆盖表（人读，不机读）
```

`claims.json`：

```json
{ "version": 1, "round": 1, "finalRef": 3,
  "claims": [
    { "id": "C1", "text": "<final/v3 里的原句，去掉 [来源: …] 标记>",
      "critical": true, "topics": ["T1"], "evidence": ["evidence/x.md"],
      "urls": ["https://…"] }
  ] }
```

`verdicts-r<N>.json`：

```json
{ "version": 1, "round": 1,
  "batches": [ { "session": "<childId>", "preset": "critic", "depth": 1,
                 "raw": "<child 最终正文原文（一个 JSON 数组字符串）>" } ],
  "verdicts": [ { "claim_id": "C1", "batch": 0, "verdict": "supported",
                  "quote": "<原文里支持/反驳的那一句>", "reason": "一句话",
                  "rechecked_urls": ["https://…"], "source_tier_ok": true } ] }
```

三条形状纪律：**`raw` 是原文**（不重排、不美化）；`verdicts` 是 `raw` 的解析投影（门禁会重解析比对，
手改解析面即红）；**文件里不出现模型算的哈希**——Lead 没有 bash，算不了也不该算。两个 sha256
（claims 与 verdicts 文件）由门禁算、写进门禁报告；要「交付后也能复算」就把它们绑进
`delivered.json`（P1 可选片，本卡 v1 不做）。

### 4.2 值域与判定

- `verdict ∈ {supported, partially_supported, unsupported, unverifiable}`，**单值**（不许 `fail→pass`、`基本支持` 这类复合/程度词——机器读不了）；前两者必有 `quote`；
  `unsupported` 必有 `reason`；claim 带 `urls` 时 `supported` 必须有 `rechecked_urls`（不要求全等）。
- `unverifiable` 是 child 的结论值；聚合状态叫 **UNVERIFIED**（覆盖表里的"没有结论性命中"）。两者不同义。
- **readiness PASS 的机械前提**：全部 `critical: true` 的 claim 都有**结论性** verdict（前三个之一）。
  仍有 `unverifiable` → 只能 FAIL。可以交付，但产物必须标 FAIL + 缺口清单，**不写「带缺口的 PASS」**。
- `critical` 由 Lead 标，critic 可加；`critical: true` 一条都没有 = 门禁告警（`no-critical`），因为
  「全都不关键」通常是表做漏了，不是真没有。

### 4.3 谁写、谁核

| 角色 | 写什么 | 不写什么 |
|---|---|---|
| Lead | `review/claims.json`、`review/verdicts-r<N>.json`（原文抄录）、覆盖表 | 不判 verdict；不改 child 原文 |
| critic child（one-shot） | 只回一段 JSON 数组（最终消息） | 不写盘、不写 review.md、不给建议 |
| critic（团队态，报告级） | `review.md` 终局块 + 覆盖表 + 跨条冲突 | 不改 verdicts 文件 |
| 门禁 `verdict-audit` | `review/verdict-audit-r<N>.md`（`--write` 时） | 不判语义 |
| 用户 | HITL2 签字 | —— |

### 4.4 派工形状（给 Lead 的硬约束）

- 每批 **3–5 条 claim**（成本与注意力稀释的折中）；一批一个 child；同一批的 claim 来自同一 final 版本。
- **claim-first**：brief = claim 原文 + 证据路径 + URL + 输出 schema，**不给** `final.md`、`drafts/`、
  findings 的叙事；明写"不要读 `final.md`"（软边界，见 §9）。
- child 一律 `agent_preset: critic`；**一次派一批，等 completion notice 回来再派下一批**（不做并发长队，
  免得批次与轮次对不上）。
- 落盘时机：notice 到齐后一次性写 `verdicts-r<N>.json`；不要边收边写（半份文件会让门禁读到假缺口）。

### 4.5 轮次

- `r1` 首次；复审 `r2`。**上限 2 轮**（与 company 同口径）。注意本仓 critic skill 里「复审 ≤3 轮」针对的是**报告级**复审，与本条不冲突：claim 复核轮次更紧，超限即升级。
  第 2 轮仍有 `unsupported` / `unverifiable` 未收口 → 停止循环，readiness 如实 FAIL，交 HITL2 人工裁决。
- 新轮新文件，旧文件不改；`review.md` 当前终局块指向最新 `rN`。
- 处置归**首次提出该裁决缺口的那一轮**；复验只写「已消除 / 仍成立」，不重抄处置表。

### 4.6 HITL2 措辞（新增三行，替换现有摘要的一段）

现有摘要只有「证据充分性判断 + 关键残留风险」。加三行**数字**：

```
独立性：L2 上下文独立复核（同模异上下文，独立性有限）
覆盖：critical 7/9 有结论性裁决；UNVERIFIED 2（C4、C8）
重抓：本次复核重抓 URL 14 条；抽样率 100%（critical）
```

PASS 但覆盖 < 100% 时，摘要**必须**显示缺口——不允许「review.md 写了 PASS」就当成全绿。

## 5. 机械门 `verdict-audit`（检查清单）

落点：`scripts/run-gates/verdict-audit.mjs`（CLI 壳）+ `scripts/lib/verdict-audit-core.mjs`（纯判据，tests 直调；
分层同 evidence-audit / node-gate）。默认只读，`--write` 落 `review/verdict-audit-r<N>.md`；
接入 `scripts/run-ops/run-accept.mjs` 预检（第三道门，与 node-gate / evidence-audit 并列）。

| code | 判据 | 级别 |
|---|---|---|
| `no-claims` / `claims-invalid` | claims 文件在场、形状对、id 唯一、text 非空 | 红（新契约 run） |
| `claim-not-in-final` | `claim.text`（去 `[来源:]`、压空白）是 `final/v<finalRef>.md` 的子串 | 红 |
| `claims-round-mismatch` | claims.round == verdicts.round | 红 |
| `claims-sha-record` | 门禁把 claims/verdicts 的 sha256 写进 `review/verdict-audit-r<N>.md`；文件里若自带 `claimsSha256`（手跑/兼容）则复算比对 | 红（仅当自带值不符） |
| `verdict-invalid` | verdict ∉ 四值；quote/reason/rechecked_urls 的形状纪律 | 红 |
| `raw-reparse` | `JSON.parse(batch.raw)` 投影 == `verdicts`（按 claim_id/batch 对齐） | 红（手改解析面） |
| `batch-orphan` | 每条 verdict 的 `batch` 指向在场批次 | 红 |
| `coverage-gap` | 每条 `critical: true` 至少一条 verdict | 红 |
| `unverified-critical` | `critical` 的 verdict = unverifiable 时：若 review 终局块写 PASS → 红；否则 INFO | 见左 |
| `no-critical` | `critical: true` 计数为 0 | 黄 |
| `review-round-ref` | review.md 终局块含最新 `r<N>` | 红 |
| `session-preset` | child 会话头 `agentPreset` == `batch.preset` | 红（日志在场时） |
| `session-depth` | child 会话头 `delegationDepth` ≥ 1 且父会话非空 | 红（日志在场时） |
| `not-verbatim` | `batch.raw` 去尾空白后与 child **任一**助手正文逐字相等（跨轮单调向后） | 红（日志在场时） |
| `verifier-wrote` | child 会话无 `write`/`edit`/`bash` 调用 | 红（日志在场时） |
| `session-missing` | 会话日志不可读 | 黄（只核文件自洽，不假装核过原文） |
| `legacy-not-applicable` | 旧 bundle（无 `run.md` 或契约日期前）无 claims | 不判（epoch 豁免） |

**明确不核**（写进报告页脚，防过度声称）：quote 是否真支持 claim、claim 表是否漏了关键句、
source tier 配不配、readiness 的整篇判断。这四条只能语义判——不要把门禁造成语义打卡机。

**红配方**（实现时先红后绿）：改 `raw` 一个字节 → `not-verbatim`；删一条 critical 的 verdict →
`coverage-gap`；把 verdict 改成 `supported ` 带空格 → `verdict-invalid`；换掉 child 会话 id →
`session-preset` 或 `session-missing`；让 child 调一次 `write` → `verifier-wrote`。

## 6. 备选与裁决（decision table）

| # | 问题 | 选定 | 输掉的方案（为什么不） | 何时翻转 |
|---|---|---|---|---|
| 1 | 验证单元 | **claim** | 报告级（现状：颗粒度看不出「3/9 条被核过」）；方法包 check-id（company 口径，绑方法层，本仓没有这层） | claim 表做不出来（Lead 标不出 critical）→ 退回报告级 + 覆盖表 |
| 2 | 谁落盘 | **父级（Lead）原文抄录** | child 自己写（与只读冲突；且审计无法区分「验证者写」与「被改」） | 试点里 child 反复写盘/改产物 → 见 §8 第 2 条 |
| 3 | 验证者身份 | **复用 critic（one-shot child）** | 新 `verifier` 只读 preset：成本 = 推翻 D2 + 新 D 号 + preset-smoke/roster/团队表全链；收益 = 能力面真只读 | 试点证明「任务形状」管不住写盘（≥1/3 批次）→ 立新 preset（那时是 D 号变更，走卡） |
| 4 | 通道 | **`subagent(agent_preset=critic)`** | workflow（无 preset、同人格、且政策要求用户显式授权）；team 里的 critic（持久上下文 → anchoring，逐条不合适） | 批量 claim（>12）成为常态且 subagent 排队成瓶颈 → 评估 workflow + 显式授权 |
| 5 | 批量 | **3–5 条 / child** | 每 claim 一 child（成本 ×N，且 One-shot 启动开销占比过高）；一次全量（注意力稀释 + 锚定增强） | 试点测出批次内质量显著低于单条 → 降到 1–2 条 |
| 6 | 工件格式 | **JSON（原文 + 解析投影双份）** | Markdown 表（机器解析脆、无原文锚）；纯 prose（不可机检） | 不需要机检时（不会） |
| 7 | 哈希 | **门禁算，不写模型** | 模型算（本仓 Lead 无 bash，物理做不到）；不记（失去「防事后改」） | 上游给 Lead 读写/执行面 → 可让模型自报，但门禁仍复算 |
| 8 | 覆盖口径 | **critical 全验，non-critical 抽验并记抽样率** | 全量验（成本线性涨，收益递减）；只验 critical 不记抽样（静默放弃） | 试点显示 non-critical 也常翻车 → 提高抽样率 |
| 9 | UNVERIFIED 能否交付 | **可以，但 readiness 只能 FAIL + 缺口清单** | 允许「带缺口的 PASS」（等于把第三态抹平成绿）；禁止交付（把信息缺口变成不可交付） | 用户明确要求「宁可不出也不要缺」→ 改成阻塞 |

## 7. 试点（两段，先便宜后真）

### Pilot A —— 机制试点（复用已交付 bundle，不跑新 run）

- 输入：`research-workspace/` 里任一已交付 bundle（例：`drt_unsc-p5-members`，2–3 条关键句）。
- 做法：`dev/run-driver.mjs up` 起通道，`dev/run-kickoff.mjs --preset lead --prompt-file <brief>` 起一个 cold lead 会话，
  把**手工**的 `claims.json`（2–3 条，`text` 逐字取自 `final/v1.md`）给它，
  指令 = "按 claim-first 派一个 critic child 复核，收到 notice 后按契约写 `review/verdicts-r1.json`"。
- 判据（全绿才算试点过）：
  1. child 会话头 `agentPreset=critic`、`delegationDepth=1`、`parentSession` 非空（**dev home 现场日志尚无此形态，这一步就是补证**）；
  2. child 最终正文是**可解析的 JSON 数组**，条数 = claim 数；
  3. child 没调 `write`/`edit`（`tool/call` 里无）；
  4. Lead 写出的 `raw` 与 child 最终正文逐字相等（门禁 `not-verbatim` 不触发）；
  5. 门禁在该 bundle 上跑绿，且五条红配方各自红一次（红配方用副本做，不改原 bundle）。
- 成本：1 child + 1 Lead 轮次；不需要新 run，不需要用户在场。

### Pilot B —— 流程试点（一场真 run，任一非 quick_factual 题）

- 做法：按新契约走完 judge → verdicts → review 终局块 → HITL2；`verdict-audit` 进 run-accept 预检。
- 判据：门禁绿；HITL2 摘要三行数字在场；review.md 终局块引用了最新 rN；
  `delivered.json`（若本卡纳入收据扩展）带 verdicts 块且可复算。
- 成本：约 3–6 个 child 会话；证据进落地 Note，**不进 CI、不进回归**（同 company 口径）。

**失败预案**：Pilot A 的第 2 条（typed JSON）不成立时，先降到「每批 1 条 + 更窄的输出模板」再测一次；
仍不成立 → 本卡停在「报告级覆盖表」，把 claim 级降级为 triggers 里的重议项（见 §8 第 1 条），不硬推。

## 8. 什么会改变结论（可观察的重议条件）

1. **child 不返回可解析 JSON**（Pilot A 判据 2 连续两次不成立）→ claim 级退回「报告级覆盖表 + 单源标注」，
   本卡只交付覆盖表与门禁的弱版；重议条件写进 `_backlog/triggers.md`。
2. **child 读 final.md 或写盘**（Pilot A 判据 3 红，或 B 里 ≥1/3 批次）→ 上只读 `verifier` preset，
   或把 child 的 `cwd` 指到只含 claims+evidence 的 staging 目录（后者更便宜，先试后者）。
3. **每场 run 的复核成本 > 总时长 40%**（试点实测）→ 只验 critical、抽样率降到 50% 并显式记账。
4. **上游出现 per-child 只读沙箱** → 可让验证者带 bash 跑测试（届时改工具面与审计判据，流程不动）。
5. **第二家 provider 凭据出现** → L3 可做（`tool-subagent` 的 `modelSelectionSettings` 支持 per-child 路由）；
   在那之前，独立性只许标 L2，不许写「第二双眼睛」。
6. **critic 的 persona 与 claim 模式持续冲突**（child 反复写 review.md、给建议而不是裁决）→ 把 claim 模式
   移进独立 skill 并加一条 persona 排斥句；再不行 → 同第 2 条。

## 9. 不做 / 已知边界

- **不做运行时 veto**：门禁是事后检测；父级理论上仍能改盘，改了会被 `claims-hash`/`not-verbatim` 抓，但那是事后。
- **不做语义门禁**：quote 真伪、claim 表完整性只能靠 critic + 人。
- **不新增角色、不改 vendor、不造调度器**。
- **soft 边界**：claim-first 靠 brief 约束，child 有 fs 读权限，理论上能去读 `final.md`；v1 不堵（堵法是 staging cwd，
  见 §8 第 2 条）。
- **quick_factual 豁免**：轻量档不要求 claims/verdicts（与读者版豁免同型）；证据缺口仍按单源标注处理。
- **claim 表完整性不由门禁保证**：门禁只证「表内每条都真、都被核过」，不证「表没漏」。漏判靠团队态 critic
  的覆盖表语义审 + 用户。

## 10. 锚点索引

| 结论 | 锚点 |
|---|---|
| critic 工具面无 bash/subagent、有 fs 写 | `packages/deep-research-pack/presets/critic.patch.yml` |
| 三线审查与 readiness 判据 | `packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md` |
| PASS 是 HITL2 前提、终局块唯一 | `packages/deep-research-pack/content/manual.md` §交付物三态 / §完成判据 / §终局块 |
| 证据七字段与重抓底线 | `packages/deep-research-pack/content/manual.md` §证据契约 |
| 现有机械溯源三条断言 | `scripts/run-gates/evidence-audit.mjs` |
| 回执只绑定 final/readable/audit | `scripts/lib/run-receipt.mjs`（`receiptProblems`） |
| 验收原子动作与预检顺序 | `scripts/run-ops/run-accept.mjs` |
| `subagent` 不等结果、返回 `subagentId`、completion notice 带最终答案 | `vendor/dsh/packages/subagent/tool-subagent/README.md:59,100,227` |
| 工具参数无 `outputSchema` | `vendor/dsh/packages/subagent/tool-subagent/src/index.ts:236-260` |
| 会话头字段（`delegationDepth` 必需、`agentPreset`/`parentSession` 可选） | `vendor/dsh/packages/session/session-persistence-jsonl/src/format.ts:82-96` |
| `tool-fs` 的 `write`/`edit` 开关 | `vendor/dsh/packages/fs/tool-fs/README.md:57,63` |
| dev home 日志事件形状与 preset 分布 | `runtime/harness-home/sessions/`（116 个 v4 日志，2026-11-10 扫描） |
| 自评掉点（16%→2%、5%→3%、F.N.R 95.8%） | [2402.08115](https://arxiv.org/html/2402.08115v2) Table 1 / Table 2 |
| 同模 judge 自偏爱（自识别 ↔ 自偏爱线性相关） | [2404.13076](https://arxiv.org/html/2404.13076v1) 摘要 |
| DR agent 引用准确率 77.96–90.24 | [2506.11763](https://arxiv.org/html/2506.11763v1) 结果表 C. Acc. 列 |
| 同类实现的结构与实测教训 | company 仓：归档卡 / 落地 Note / `packages/company-pack/presets/_shared/skills/quality-loop/SKILL.md` / `tools/lib/quality-loop.mjs`（仓外，不随本仓） |
