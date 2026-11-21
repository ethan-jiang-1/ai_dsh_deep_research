---
status: 已结
opened: 2026-11-21
---

# 缺陷积压修复程序：BUG-320…350 的账实对齐、合同收紧与流程保障（v2）

> 立卡：2026-11-21 ｜ 状态：已结（2026-11-21）— 结论：20 张活跃卡中 18 张已修归档、1 张修复落地待浏览器复验（348）、1 张判为已由 313 修复迁暂停池（330）；批 Note = 2026-11-21-bug-stack-repair；可关闭：是
> 去向：implemented — [批 Note](../../../notes/implemented/2026-11-21-bug-stack-repair.md)
> 对象：`_backlog/bugs/` 的积压缺陷。执行载体 = 后续 goal 按 §5 阶段推进；本卡是批索引 + 决定账 + 卡→用例映射。
> **v2（2026-11-21）**：用户裁定——技术合同与排版由 agent 自定，不把 schema 选择推给用户；**不做旧产物兼容，
> 长期正确优先**。v2 因此把 v1 的「双轨/兼容」改为「生产者收紧 + 一份正本三处投影」，取消「两场旧 bundle
> 全绿」这个验收目标，并把 12 张已不是缺陷的卡迁出活跃区（§3）。
> 方法正本 = [bug-to-fix §2 批模式](../../methods/bug-to-fix.md)；状态机 = [bugs/README](../../issues/README.md)；证据主人 = [guides/60](../../../docs/guides/60-dev-loop.md)。

## 0. 结论

1. **31 张 → 12 张迁暂停池 → 19 张 live。** 迁出的 12 张不是「修好了」，是「不再是缺陷」：8 张被
   `71010fef` 的新启动所有权取代、2 张实现已入树而最终反控未跑、1 张是获批合同取向。迁移 = 用户直派
   （2026-11-21）；**不制造修复证据，也不为它们补「已修」计数**。
2. 19 张按机制分 **5 簇**；顺序 = 再就绪与流程门 → oracle/通道 → 端口与缓存 → 合同收紧 → 驾驶舱 → 沙箱与收尾。
   不按 BUG 号逐张修。
3. **不做兼容。** 判据只认 canonical 形状；旧产物红了是预期，不为它放宽门、不加 shim、不手改 bundle。
   两场旧 run 降级为**修复前诊断夹具**：研究结果仍然可用，但它们不是本程序的验收目标。
4. 这批的系统成因是三类机制缺陷 + 一个流程缺陷；每类落一个类级守卫（§4），而不是 20 个局部补丁。

## 1. 原则（v2 的判据，写死）

| # | 原则 | 推论 |
|---|---|---|
| P1 | **不做兼容**：不为历史产物写 second reader / 宽松分支 / 迁移脚本 | 旧 `claims.json`、`readiness.json`、一行式 findings、手写回执一律按非法处理 |
| P2 | **一份产物一份正本**：代码 parser/schema 与模型可见样例（模板或 skill 的 fenced 块）同源，样例直接进测试 | 改 parser 不改样例 = 红；改样例不改 parser = 红 |
| P3 | **机器事实由工具写，模型只写叙事** | 回执、状态、计数不得由 lead 手写；lead 只 present + 写 findings/review 正文 |
| P4 | **未知 ≠ 失败**：投影显式三态 `pass / fail / unknown` | absent/unreadable 不得触发「失败」文案，也不得冒充 PASS |
| P5 | **技术决定 agent 自定并记理由与推翻条件**；只在阶段边界报告结果 | 不再把 schema/排版选择作为用户问题 |

## 2. 事实基线（2026-11-21；代码 HEAD `dc0c7fb5`，本卡 v1 = `82fad1b9`）

| 项 | 事实 |
|---|---|
| 活跃卡 | **19 张**（327/328/329/333/334/335/336/338/340/341/342/343/344/345/346/347/348/349/350） |
| 暂停池 | 12 张（320/321/322/323/324/325/326/330/331/332/337/339），索引与原因见 [暂停池 README](../suspended_bugs/README.md) |
| 卡的来源 | 340–350 = 2026-11-20 端到端回归；327–339 = 11-19 第 9 轮低置信探索 |
| 薄卡 | 327–329、333–336、338 共 8 张仍是 38 行模板卡：`修法` 是模板句、`复现` 代码块为空；P0 必须逐张写实或降级 |
| vendor pin | 自 2026-11-05 未变（`dsh-v0.2.1-rc.5` @ `b830ec950f`）；「base 变了」= 本仓代码基线 `71010fef` |
| 机械面 | `pnpm verify` exit 0、`pnpm test` exit 0（本会话实测，checks 265 全过零 skip） |
| 本机夹具 | `runtime/e2e-2026-11-20/`、`research-workspace/drt_pg-latest-stable/`、`drt_sodium-ion-bess/`（gitignored） |
| 环境坑 | **run-gates 必须先 `source tools/env.sh`**：不 source 时 `DSH_HOME` 缺失，evidence-audit 假红（实测 `0/46 → 43/46`、CRITICAL `46 → 0`） |

## 3. 活跃 19 张的存在性判定与簇归属

判据 = 当前源码是否仍能产生卡里写的症状（行号见 v1 审计，未变；327–338 均仍存在）。

| 簇 | 卡 | 共享 owner | 边界 |
|---|---|---|---|
| C0 oracle/通道 | 340、346 | `checks/run-gates/protocol-audit.mjs`、`tools/channel/start-channel.mjs` | 真跑 CLI；真进程 + PATH 假 `ps` |
| C2 端口/缓存身份 | 327、333、334、335、336、338 | 新增 `parsePort` + `channel-cache` 身份函数 + `port-reclaim` | 入口负控 5 例；key 对称性；真抢占 |
| C3 判据↔生产者 | 328、329、341、342、343、350 | parser/schema 模块 + 模板/skill + `contract-fixture` | 真实 bundle 现场 + canonical 夹具 + 负控 |
| C4 驾驶舱/见证 | 344、345、347、348 | `run-state`、`review-readiness`、`final-target`、新 run-health fold | spec + client-load + 录得事件重放 |
| C5 沙箱 | 349 | 启动探测 + workflow 降级记账 | 嵌套/非嵌套对照 |

## 4. 系统视角：三类机制 + 一个流程

### 4.1 判据↔生产者断裂（C3，7 张）

`341/342/343/350/328/329`：判据按「想象的写法」解析，模板/技能没承诺，模型写了合法但不同的形态。
真实证据：A 的 findings 是 `- F1｜…` 一行式、B 是 `## F1 ` 无冒号；B 的 plan 用 `scout —— 待派发`；
A 的 readiness 多 4 个计数键；B 的 claims 是 rich ledger。**过去六批（260→350）反复放宽判据没有收敛**，
因为放宽只是把「另一种写法」追认为合法，下一轮换个写法又红。

**类级对策（P2/P3）**：每个产物一份正本，三个投影同源——① 代码 parser/schema 是唯一判定；
② 模型可见样例（模板文件或 skill 的 fenced 块）**就是**测试输入；③ `contract-fixture` 测试从样例抽出、
喂给 parser，样例/parser 任一改动不同步即红；负控 = 同一测试对畸形样例必须红。

### 4.2 未知折成失败（C4，4 张）

`347`（无 review → FAIL）、`344`（子代理在飞 → settled）、`345`（窗口外/异形回执 → 未见证）、
`348`（无活动 → 无告警）是同一个投影缺陷；`329` 的 `null → 全部 evidence` 同族。
**对策**：观察面判定显式三态；`unknown` 不触发失败文案、不冒充 PASS；每个投影一张状态表测试。

### 4.3 资源身份与所有权（C2，6 张）

锁类已由 `71010fef` 收敛；残留三处：probe 缓存读写用了两个 key（327）、端口输入域未校验（333–337）、
`pickFreePort` 先取后绑的窗口（338）。**对策**：一个资源一个身份函数、读写双方调用同一个；入口 fail-loud；
预留失败有界重试并报明原因。守卫 = 性质测试（`key(read) === key(write)`、非法端口 5 例、抢占重试）。

### 4.4 流程缺陷：读码即可「修复就绪」

9 张 live 薄卡的 `复现` 仍是空代码块，却带着自授权。**对策（P0，G2）**：`修复就绪` 必须带同边界的可复现
命令（或显式 `未复现` + 读法协议）；机械面 = `backlog-liveness` 新检查，先在这 9 张卡上取红证。
这一步也防止未来再产生「读码即就绪」的幽灵卡。

## 5. 修复次序（6 个阶段）

排序原则：先把「账」和「证据通道」修好；纯代码先于合同/用户可见；共享 owner 先于单卡。

### P0 再就绪与流程门（0.5 会话，不写生产代码）

- 8 张薄卡（327–329、333–336、338）逐张写实：具体修法 + 同边界红命令 + 判据；写不出 → 降 `排查中`。
- 落 G2 机械门：先在这些卡上看到红（空复现块），再改绿；同时把规则写进 `backlog-liveness` 注释。
- 建 §8 批表（填不满的行不开工）；复跑 `pnpm verify` / `pnpm test` 记账。
- 退出：每张 live 卡有可执行方案；门禁在旧形态上红、在新形态上绿。

**P0 结果（2026-11-21）**

- **动态复核推翻一条静态判定**：BUG-330 的症状已由 BUG-313 修复——`countLength` 剔除围栏/inline code/URL/表格；实测 `checkOutputLength` 对代码+URL+表格文本返回 `[]`。已迁暂停池（12 张），活跃 19。
- **G2 红证**：规则落入 `checks/lib/repo/backlog-liveness.mjs` 后，真仓 `pnpm verify` 在 6 张 `修复就绪` 薄卡上红（327/333/334/335/336/338），错误逐卡点名「requires a replayable command」。
- **绿证**：6 张卡写入同边界命令或 `未复现` + 读法协议；328/329 补可复现命令并从 `等人拍板` 翻 `修复就绪`（用户 2026-11-21 授权按计划修）；`pnpm verify` 全绿。
- **门禁自测**：`node checks/smoke/gates.e2e.mjs --gate=backlog-liveness` → 25 注入案例 + 5 对照全绿；新增注入案例 `backlog-bug-ready-no-repro`；单测 24/24。
- 批表已填（§8）；每张 live 卡有可执行方案。

### P1 打通 oracle 与通道（2 张，0.5–1 会话）

| 卡 | 修法 | 红 → 绿 |
|---|---|---|
| 340 | 补 `readdirSync` import + CLI 壳级测试（真跑入口 + 最小 bundle） | 当前崩 → exit 0；反控：无 import 版本 exit 1 |
| 346 | 进程组静默判据改 `process.kill(-pgid, 0)`（ESRCH=静默 / EPERM=仍在），`ps` 只作诊断 | PATH 塞必败 `ps` 后正常退出仍释放两锁；真孤儿仍保留 |

理由：340 是 `run-accept` 的 protocol 预检入口；346 是本沙箱 `ps` EPERM 的现场，修好后真进程负控才跑得动。

### P2 端口与缓存身份（6 张，1 会话）

- **333–336**：一个 `parsePort` 正本（1–65535 整数；空/NaN/0/1.5/负/越界 → 入口 fail-loud exit 2 并报参数名），
  接到 run-driver `--port`、cold-start env、snapshot、client-load；负控 = 6 个畸形值各一例。
- **338**：不做「预留」假承诺；`pickFreePort` 的抢占窗口改为**有界重试 + 明示失败**（bind 冲突 → 换端口重试
  N 次 → 仍失败 exit 1 并打印实际端口与占用者）。卡上写明「TOCTOU 未被消除，只被兜住」。
- **327**：读写共用 `probeCacheKeyOf(...)`（一个身份函数）；守卫 = `key(read) === key(write)`，且 MCP=on
  写入的 GREEN 不被 MCP=off 命中。

**P2 结果（2026-11-21）**

- 已修归档：**327 / 333 / 334 / 335 / 336**。`parsePort` 成为唯一端口正本（`checks/lib/shared/port.mjs`），四个入口接线；`probeCacheKeyOf` 成为唯一缓存键构造器，run-driver 不再内联。
- 红证：注入回归（`parsePort → Number(raw)`、构造器丢 `mcp`）下 `port.spec` / `channel-cache.spec` 红；入口负控实测（`--port abc` / `COLD_START_PORT=abc` → exit 2 且报参数名；旧实现分别把 `abc` 传进 supervisor、或撞无关前置）。
- **338 移到 P5**：有界重试必须改三个入口的端口生命周期（`PORT` 从常量变可重选、retry 的失败形状要按 `bootWeb`/`startWeb` 实测），本阶段不做半成品；卡保持活跃，判据不变。

### P3 判据↔生产者合同（7 张，2–3 会话）

按「结构化优先、散文次之」排序；全部按 §4.1 的正本 + 夹具落地；**旧 bundle 红了不处理**。

| 卡 | canonical（新正本） | 生产者（模板/skill） | 守卫与负控 |
|---|---|---|---|
| 343 | `review/readiness.json` v2：`{version:2, readiness, conditional, round, at, counts:{critical,major,minor,unverified,rechecked_urls}}`；未知键红 | 新增 `content/templates/run/readiness.json`；critic skill 给同块样例 | parser 测试从模板读样例；坏 JSON/错值/多余键红；`critical` 与 review CRITICAL 清单可解析时对账 |
| 350 | `claims.json` v2：`{version:2, finalRef, claims:[{id,text,critical,topics,evidence,urls,must_answer?}]}`；裁决只住 `review/verdicts-r*.json`，按 claim id 关联；禁 `verdict/verdict_file` 双份事实；`version` = schema 版本整数 | `content/templates/run/claims.json` + research-planning skill 样例 | 模板样例 → verdict-audit 绿；`version` 非 2、缺 `finalRef`、claim 缺 `text/critical` 红 |
| 342 | `## 剩余工作` 改成两列表格（`task_id` + `state`），`state ∈ 待派发/进行中/完成/阻塞`；owner 与 next 从节点表/`deps` 派生，不再手写 | plan 模板给表头与一行样例 | 行 id 必须在图里；state 闭集；`- 无` 与 active 节点冲突仍红；删 owner/next 不再影响 |
| 341 | findings 块：`## F<n>：`（冒号必需）+ `- 支撑证据：`/`- lenses：`/`- lens_gaps：`/`- gap：`（`- 备注：` 可选），一行一字段 | findings 模板已是该形态；lead skill 给同块样例 | 模板块 → parser 绿；一行式、无冒号标题、重复 F#、幽灵 lens 红 |
| 328 | 快照 vN-1 必须与当前图在节点/验收/预算上**有差异**，不只比文本 | plan 模板的重写纪律补一句 | 构造「内容改过但文本不同」的旧图 → 红；空快照/版本错仍红 |
| 329 | `criticalEvidence=null` 不再退全部：阈值判据给出显式 `unverifiable`（不冒充通过，也不假装红）；claims 已红时由 claims 承担失败 | 无需改（判据侧） | null 场景 → 不出现「关键阈值」假红；有 critical 集时仍按集判 |

- 共享交付：`contract-fixture` 守卫 + 每个产物的 canonical 样例（模板文件或 skill fenced 块）。
- 旧 bundle 的 `readiness.json`/`claims.json`/findings/plan 一律不迁移、不手改；它们在新判据下红是预期。

**P3 结果（2026-11-21）**

- 已修归档：**343 / 350 / 342 / 341 / 328 / 329**（330 已在 P0 迁暂停池）。canonical：readiness v2（必填 counts）、claims v2（critical 必填、禁 verdict 字段）、plan 剩余工作表（task_id|state）、findings 块（冒号必需 + 报错点名）、plan 快照事实比对、threshold unscoped warning。
- 契约夹具：critic skill 的 readiness 样例、claims 模板、findings 模板直接进测试（改一侧不同步即红）；synthesis skill 的「每个 finding 一行」改为块样例。
- 模型可见面变更 → 5 角色 fixture 全部重录 + C 金标准 `--update-expected`；skill-golden/asset-ledger/guard-ledger 同变更。
- 实测：`pnpm test` 1445 spec + 266 checks 全绿；`pnpm verify` 全绿（含 dist 重建）。

### P4 驾驶舱与交付见证（4 张，2 会话）

- **347**：`readinessOfSources` 增 `absent`（pass=null）；`useStatusFeed` 只折有判定的结果；
  `deriveBusinessBrief` 对 null 不出「审查未过」。守卫 = 三态状态表 + client-load。
- **344**：`runSettled` 追加「无在飞子代理」（`subagent/catalog` spawn 与完成事件求差集）；
  夹具 = `runb-events-full.jsonl`；负控 = spawn + turn 关闭 + final 未完成 → 不 settled。
- **345**：交付事实 = **durable `present` 事件（窗口无关）∨ 工具写的 canonical 回执**；lead 手写回执不被
  当作回执（`deliveryFromReceipt` 校验 `version/slug/acceptedAt/present|final`，否则 null）；A 的手写形态
  不兼容、不迁移。守卫 = fold 测试（canonical 回执 / 仅 present / 异形手写）+ 真浏览器 present 后显示已交付。
- **348**：**derive-only** run health（最后活动时间、最后一回合错误、在飞子代理）住 pack lib（`src/lib/run/`），
  客户端横幅与 `probes/analyze/watch-run.mjs` 消费同一 fold；不写 `run.md` 机器事实（避免第二份真相）。
  阈值 30 min 无事件且末回合有错；守卫 = `runb-events-full.jsonl` 02:35–08:47 窗口重放出告警 + 正常长回合不误报。

**P4 进度（2026-11-21）**

- 已修归档：**347**（无 review 面 = absent，pass=null）、**344**（runSettled 追加无在飞子代理；watch-run 读子会话）、**345**（回执只认工具形状；install-only 手写不冒充；窗口外无回执 = 未见证，不伪造）。
- **348 修复落地**：health fold + 状态页横幅（zh/en）+ watch-run STALLED 行；真日志 02:35–08:47 重放 stalled=true/372min；浏览器复验 `client-load.entry --seed` 因主机 load 15–20 NOT-RUN，负载下降后复跑再归档。
- 残差（记入批 Note）：vendor follow 快照窗口不改；present-only 且窗口外且无工具回执 = 未见证（生产侧正路 = ops run-accept 写回执）。

### P5 沙箱、残余红分诊与收尾（1 会话）

- **338**（自 P2 移入）：`pickFreePort` 抢占窗口的有界重试；先按 `bootWeb`/`startWeb` 的失败形状实测再改三个入口的端口生命周期（单次重选 + 明示失败），不写「预留」假承诺。
- **349**：启动探测嵌套沙箱（benign `sandbox-exec` 探测）并把能力写进运行态诊断；嵌套时 plan/Wave 不承诺
  脚本层，workflow 的 `sandbox-unavailable` 记为显式 deviation（已在 waves 记，补 plan 侧声明）；非嵌套负控
  保留。若需要 DSH 侧选项，另立 upstream issue，不改 vendor。
- **残余红分诊**：两场旧 bundle 的卡外红逐条判「生产者错 / 判据错 / 交付确实不合格」：B 的
  `owner_role` 含 `executor=`、`W2.2 task_id` 非 plan-only、review 覆盖表缺 T1/T2/T3、未解释 CRITICAL C7/C1。
  这些不是本批的 19 张；各建新卡或记 `none — 门禁判定正确`。**不为它们放宽门。**
- **收尾**：批 Note（共享根因簇）+ 每卡 `fix-evidence` + 归档 + `bugs/README` + `triggers.md` 的下一次
  natural run 触发条件 + 本卡 `git mv` 到 `_archived/settled_issues/`。
- **合规未证边界**（必须写进批 Note）：模型是否照新 canonical 写，只有下一次自然 run 能证明；
  `run-accept` 会在那次红。触发条件 = 「下一次 P5 run 必须在新合同下绿；否则引用旧卡新建卡」，不把
  「旧 bundle 转绿」当完成。

## 6. 流程保障（沿本仓流程，不靠自觉）

| # | 保障 | 落点 |
|---|---|---|
| G1 | **批入口表**：卡→症状→边界→红命令→guard→处置，填不满不开工 | §8；每簇开工前补齐 |
| G2 | **再就绪复核 + 机械门**：`修复就绪` 必须带可复现命令或显式未复现协议 | `backlog-liveness` 新检查，先在 9 张空复现卡上红 |
| G3 | **每卡一案**：共享守卫命名 BUG 号或单卡用例；共享绿不替代单卡证据 | `staged-change-pairing` 的 `claimsBug` 已支持；用例名统一带 BUG 号 |
| G4 | **红先绿后**：先跑红并记录，再改生产；`exit` 是 oracle | `fix-evidence` 的 `red.exit≠0` + `guard` |
| G5 | **一簇一提交序列，WIP=1**：同一共享路径不在两张卡上各改一次 | commit 粒度 + 批 Note 的卡→case 表 |
| G6 | **技术决定自定，阶段边界报告**：不把 schema/排版选择推给用户；只在阶段结束报结果与未证边界 | 本卡 §7 |
| G7 | **验收阶梯**：`verify` → `test` → 目标门禁 → 真入口（run-accept 定向 / client-load / channel-start.e2e） | guides/60 §2 路由表；每阶段退出条件写在本卡 |
| G8 | **审查分层**：机械门禁不跳；跨面 diff 跑 `reviewing-a-delivery`；用户验收只在阶段边界 | `.agents/skills/reviewing-a-delivery` |

## 7. 技术决定（已定；含推翻条件）

| # | 决定 | 理由 | 什么会推翻它 |
|---|---|---|---|
| T1 | **生产者收紧，不做兼容** | 六批历史证明「放宽判据」不收敛；正本 + 样例 + 夹具能一次关类 | 出现合法且无法用 canonical 表达的产物需求（先改正本，不放宽 parser） |
| T2 | **机器事实工具写**：回执、状态、计数不由 lead 手写 | 双写者 = 双真相；345/348 的根因就是模型手写机器事实 | 工具无法拿到模型侧事实（届时先改工具边界，不恢复手写） |
| T3 | readiness v2 用嵌套 `counts`；claims v2 允许 `must_answer`、裁决只住 verdicts | 计数是相关事实，嵌套可校验；裁决双份事实会漂移 | 评审发现 `must_answer` 与 verdicts 的关联仍有歧义（改契约，不加字段） |
| T4 | findings 用块格式（冒号必需），一行式不兼容；剩余工作改 `task_id|state` 表 | 块格式字段可判；剩余工作是执行状态，owner/next 可从图派生 | 若表格式让 lead 维护成本明显高于收益（观察一场 run 后再议） |
| T5 | 交付事实 = present 事件 ∨ 工具回执；窗口无关 | present 是 durable 事件（model-visible ⟺ logged）；回执只是佐证 | 事件日志不可靠/被截断成为常态（那时才考虑持久锚点） |
| T6 | run health derive-only，不写 run.md | 观察面应当从同一事实派生；写文件 = 第二份真相 | 离线排障必须在无会话日志时看状态（改为工具写状态文件） |
| T7 | 349 做探测 + 显式降级，不改 vendor | 只读铁律；嵌套是环境事实，诚实记账即可 | DSH 提供 `sandbox: none/inherit` 选项（走 upstream seam） |
| T8 | G2 机械门落地 | 「读码即就绪」是本批最大流程风险，必须机械挡 | 门禁误伤合法卡（先在 9 张卡上验红再放宽规则） |

## 8. 批表（开工前填满；P0 先填红命令列）

| 簇 | 卡 | 共享 owner | 红命令（同边界） | 处置 |
|---|---|---|---|---|
| C0 | 340 | `checks/run-gates/protocol-audit.mjs` | `node checks/run-gates/protocol-audit.mjs <bundle>` | 修 |
| C0 | 346 | `tools/channel/start-channel.mjs` | `PATH=<假ps> … start-channel` + 真孤儿 | 修 |
| C2 | 327 | `run-driver.mjs` + `channel-cache.mjs` | key 对称性单测 + 真 probe 缓存 | 修 |
| C2 | 333–336 | `parsePort`（新支撑件） | 入口畸形 `--port`/env 负控 | 修 |
| C2 | 338 | `port-reclaim.mjs` | 抢占重试 + 明示失败 | 修（取舍上卡） |
| C3 | 343/350/342/341/328/329 | parser/schema + 模板/skill + `contract-fixture` | 模板样例 → 门禁绿；旧形态红 | 修 |
| C4 | 347/344/345/348 | `review-readiness`/`run-state`/`final-target`/`run-health` | spec + client-load + 事件重放 | 修 |
| C5 | 349 | 启动探测 + workflow 降级 | 嵌套/非嵌套对照 | 修 |

## 9. 预算、停止条件与未证边界

- 预算：P0 0.5、P1 0.5–1、P2 1、P3 2–3、P4 2、P5 1 会话；合计约 7–8.5 个会话。
- **不要求完整 L4 run 作为关闭前置**；合规证明走「模板/fixture（⑤ 装配）+ 下一次自然 run 的触发条件」。
  若用户要端到端业务验收，再单独排一场 P5 run（可能数小时，环境上 Playwright 会降级 web_fetch）。
- 停止条件（任一成立即停本轮并报告，不自动扩面）：
  1. 某簇在同一边界建不出红命令（卡转 `排查中`/`等人拍板`，不假修）；
  2. 门禁误伤合法产物（先改正本，不改 expected）；
  3. 连续两会话只增测试、不推进实现；
  4. 环境阻断（ps/沙箱/网络）使证据无法取得——记 `notMechanizable` + trigger，不伪造红绿。
- 未证边界（批 Note 必写）：模型对新 canonical 的遵守、P5 级业务结果、跨平台行为。

## 10. 交付物与追踪

- 每簇一篇批 Note（共享根因/一次修/卡→case 表/残余），`notes/implemented/`；机械局部簇用本卡 + `none`。
- 每卡 `## 修复落地` 的 `json fix-evidence`；归档同变更 `git mv` 到 `_archived/fixed_bugs/`，更新
  `bugs/README.md` 活跃表与「最近归档」。
- 本卡：每阶段回填结果/实际红绿/未证边界；完结 `git mv` 到 `_archived/settled_issues/`，
  `去向：implemented — 批 Note`。
- 触发条件：`triggers.md` 记「下一次自然 P5 run 必须在新合同下绿；否则引用旧卡新建卡」。
- 显式不做：不改 `vendor/dsh/`；不手改两场 bundle 的 findings/plan/claims/readiness/receipt；不为旧产物
  放宽负控或删断言；不复活暂停池的 12 张来凑「已修」数。

## 11. 风险清单

| 风险 | 触发信号 | 缓解 |
|---|---|---|
| 收紧后模型仍不照写 | 下一次 run 在新的门禁上红 | 正本 + 样例 + fixture 已就位；run-accept 会 fail-loud；新建卡跟进 |
| 旧 bundle 的红被误当成本批未完成 | 有人拿 `run-accept` 红项问进度 | 本卡 §0.3 明示它们是诊断夹具；批 Note 再写一次 |
| 门禁误伤合法写法 | 真实 run 出现 canonical 未覆盖的合法形态 | 先改 canonical 正本与样例，再改 parser；不放宽到「任意形态」 |
| 沙箱 EPERM 使真进程证据不可得 | `channel-start.e2e` NOT-RUN | P1 先修 346；仍不可得则记 `notMechanizable` + trigger |
| 范围回涨 | 新红项不在 §8 表 | 新建卡，不入本批；本批只收这 19 张 |

## 验收标准

1. 19 张 live 卡全部有终局处置（`已修` 归档，或明确新建卡/驳回），每卡 `json fix-evidence` 的 `changes` 与代码/测试同暂存集，`guard` 在同边界存活。
2. `pnpm verify` 与 `pnpm test` 全绿；改动面定向门禁（protocol/verdict/plan/findings/readiness/client-load）绿；真进程/浏览器档该跑的都跑了，未跑项记增 `NOT-RUN` 与理由。
3. 不做旧产物兼容：树内没有为旧 `claims.json`/`readiness.json`/一行式 findings/手写回执新增的宽松分支或迁移脚本；两场旧 bundle 的红不当作未完成。
4. G2 门禁在「空复现块」形态上红、在「命令/未复现协议」形态上绿，注入案例与单测同 diff。
5. 批 Note、`bugs/README`、暂停池索引与 `triggers.md` 的「下一次 P5 run」触发条件在同一收尾变更里。
