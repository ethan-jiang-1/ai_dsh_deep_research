---
status: 等人拍板
opened: 2026-11-21
---

# 缺陷积压修复计划：BUG-320…350 的账实对齐、次序与流程保障

> 立卡：2026-11-21 ｜ 状态：等人拍板 ｜ 类型：Task ｜ 结论倾向：现在做（待批准次序、簇口径与 D1–D5） ｜ 可关闭：否
> 对象：`_backlog/bugs/` 全部 31 张活跃卡的修复程序。执行载体 = 后续 goal 按 §4 阶段推进；
> 本卡是批索引 + 决定账 + 卡→用例映射，不是实现记录。
> 方法正本 = [bug-to-fix §2 批模式](../methods/bug-to-fix.md)；状态机 = [bugs/README](README.md)；证据主人 = [guides/60](../../docs/guides/60-dev-loop.md)。

## 0. 结论先说

1. **不做「31 张逐卡修」。** 按当前代码基线，11 张已不需要修（8 张被 `71010fef` 的新启动所有权取代、
   2 张已实现只欠收尾、1 张是获批合同取向）；真正要修的是 **20 张**。
2. 20 张按机制分 **5 簇 + 1 个 oracle 单点**；每簇一个共享 owner，每卡一个命名用例。顺序按
   「先打通证据 → 再纯代码 → 再合同/用户可见」排，不按 BUG 号。
3. 这批不是 20 个独立失误：系统成因 = **三类机制缺陷 + 一个流程缺陷**（三方合同断裂 / 未知折成失败 /
   资源共享身份不全 / 读码即「修复就绪」）。§3 给类级对策，每类一个永久守卫。
4. **两场旧 run 不能当「全绿」验收目标。** 它们除卡内红项还有卡外红（§4.3），其中一部分是门禁在
   如实判坏交付。验收分三层：卡判据 → 定向门禁 → 新 run 触发；不手改 bundle 迁就门禁。

## 1. 事实基线（2026-11-21，HEAD `dc0c7fb5`，master）

| 项 | 事实 |
|---|---|
| 活跃卡 | 31 张：20 `修复就绪` + 11 `等人拍板`（README 活跃表与 frontmatter 一致） |
| 卡的来源 | 340–350 = 2026-11-20 端到端回归（3aada741 / dc0c7fb5）；320–339 = 11-19 第 9 轮低置信探索（43f89a0b） |
| 薄卡 | 320、322–338 共 18 张是 38 行同模板卡：`修法` 是同一段模板话（「为锁/端口/缓存/plan 字段补 owner token…」），不含本卡具体方案；`复现` 代码块为空 |
| vendor pin | 自 2026-11-05 未变（`dsh-v0.2.1-rc.5` @ `b830ec950f`）。用户说的「base 变了」= **本仓代码基线**：`71010fef`（11-20 18:51）晚于 320–339 建卡 |
| 机械面 | `pnpm verify` exit 0、`pnpm test` exit 0（本会话实测；test = spec + checks 两车道，checks 265 全过、零 skip）；P0 再复跑一次记账 |
| 本机夹具 | 仍在：`runtime/e2e-2026-11-20/`、`research-workspace/drt_pg-latest-stable/`、`drt_sodium-ion-bess/`（均 gitignored，换机不存在） |
| 环境坑 | **run-gates 必须先 `source tools/env.sh`**：不 source 时 `DSH_HOME` 缺失，evidence-audit 找不到会话日志，实测假红 `0/46 → 43/46`、CRITICAL `46 → 0`。判红前先排除这一项 |

## 2. 存在性审计（静态，逐卡；P0 负责动态复核）

判据 = 当前源码是否仍能产生卡里写的症状。`已取代` 不等于「修过这张卡」，见 §4 P2 的关闭证据要求。

| 卡 | 症状还在？ | 依据（当前 HEAD） | 处置 |
|---|---|---|---|
| 320 | 否 | `start-channel.mjs:195` 只在 `mode !== '--drift-only'` 时取锁；`channel-start.e2e.mjs:308-310` 断言 drift-only 不夺锁 | 已取代 |
| 321 | 已实现 | 卡内已有 fix-evidence；`start-channel` + `start-lock` 已是新模型；`verify/test` 已绿 | 只欠收尾 |
| 322 | 否 | `start-lock.mjs` 全文无 stale 分支（只 mkdir + owner + release） | 已取代 |
| 323 | 否 | 同上，无 age/TTL 判据 | 已取代 |
| 324 | 否 | 同上，无 10min TTL | 已取代 |
| 325 | 否 | release 只 unlink 自身 identity、非递归 rmdir（`start-lock.mjs:24-38`） | 已取代 |
| 326 | 否 | `start-channel.mjs:196-206` 统一取 home/state 双锁；旧 `boot-run.lock`/`run-driver-up.lock` 残留显式拒绝 | 已取代 |
| 327 | **是** | `run-driver.mjs:395` 写 key 带 `mcp`；`:431` 读 key 不带 → 读写身份不对称 | 修 |
| 328 | **是** | `plan-gate.mjs:82-87` 快照只判空/版本/同文本，不比对节点/验收/预算内容 | 修 |
| 329 | **是** | `protocol-audit.mjs:163-168` claims 解析失败 → `criticalEvidence=null`；`protocol-audit-core.mjs:426` null 退全部 evidence | 修 |
| 330 | **是** | `protocol-audit-core.mjs:453-462` 未排除围栏/URL/表格，按 Segmenter 与行数计 | 修 |
| 331 | 否 | owner 写失败 catch 内 unlink + rmdir（`start-lock.mjs:42-50`） | 已取代 |
| 332 | 否（合同） | 获批合同 = 不按 TTL/PID/坏 owner 在线接管；崩溃残留离线恢复（卡 321/339 与 preventive-quality 实施合同） | 合同关闭 |
| 333 | **是** | `run-driver.mjs:331` `wantPort` 无整数/范围校验，直接进 `DSH_RUN_PORT` | 修 |
| 334 | **是** | `cold-start.entry.mjs:27` `Number(COLD_START_PORT)` 无校验 | 修 |
| 335 | **是** | `snapshot-replay.entry.mjs:60` `Number(PORT_ARG)` 无校验 | 修 |
| 336 | **是** | `client-load.entry.mjs:87` 同上 | 修 |
| 337 | 否 | 公开入口 exec `start-channel`，其 `:168-169` 校验 `DSH_RUN_PORT` 1–65535；body 不可绕过 | 已取代 |
| 338 | **是** | `port-reclaim.mjs:69-83` bind(0) 后立即 close，无预留/重试合同 | 修（含取舍） |
| 339 | 已实现 | `boot-run.sh` 仅 8 行 exec；body 无锁、无锁相关 trap（只 `cleanup_dashboard`） | 只欠收尾 |
| 340 | **是** | `protocol-audit.mjs:16` 只 import `existsSync/readFileSync/writeFileSync`，`:157` 用 `readdirSync` | 修 |
| 341 | **是** | `findings-core.mjs:105` 只认 `## F<N>:`；真实产出 A=`- F1｜…`、B=`## F1 `（无冒号） | 修 |
| 342 | **是** | `plan-gate.mjs:102` 要求字面 `owner/负责人` + `next/下一步`；B 的 plan 写 `- W1.1 scout —— 待派发` | 修 |
| 343 | **是** | `review-readiness.ts:224` 拒绝未知键；A 的 `readiness.json` 多 `critical/unverified/rechecked_urls/ts` | 修 |
| 344 | **是** | `run-state.mjs:175` `runSettled` 只看 turn 关闭 + final 在场，无在飞子代理条件 | 修 |
| 345 | **是** | `final-target.ts:260-274` 只认 `present.path/version`；A 的 `delivered.json` 用 `final_copy/presented` | 修 |
| 346 | **是** | `start-channel.mjs:64` 用 `spawnSync('ps')` 作进程组静默判据 | 修 |
| 347 | **是** | `review-readiness.ts:255-260` 无 review 目录时折进 prose → `pass=false`，无 `absent` 态 | 修 |
| 348 | **是** | 只有 plan-graph 的任务级 `stalled`（`plan-graph.ts:82`），无 run 级停摆判据 | 修（需拍板） |
| 349 | **是** | `waves/W2.json` 现场 `sandbox_apply: Operation not permitted`；包内无嵌套探测/降级记账 | 修（需拍板） |
| 350 | **是** | `verdict-audit-core.mjs:69-72` 白名单 + `version===1`；B 的 `claims.json` 是 `version:"v3"` + `must_answer` 等 | 修 |

计数：已取代 8（320/322/323/324/325/326/331/337）+ 只欠收尾 2（321/339）+ 合同关闭 1（332）= **11**；
仍存在 **20**（327–330、333–338、340–350）。

**动态复核（P0 必做，防止我静态看错）**：337 的 body 直跑、320 的 drift-only 持锁复用、326/339 的
旧锁残留路径，各用一条真实入口命令复跑；结论与上表冲突时以实跑为准并改表。

## 3. 系统视角：20 张其实是三类机制 + 一个流程

### 3.1 三方合同断裂（producer / artifact / judge）—— 7 张

`341/342/343/350/328/329/330` 同一形状：**判据按「想象的写法」解析，模板/技能没承诺那个写法，模型写了
合法但不同的形态**。证据是两份真实 bundle：A 的 findings 是一行式、B 的是无冒号标题；B 的 plan 用
`scout —— 待派发`；A 的 readiness 多计数键；B 的 claims 是 rich ledger。每次修都只改一侧，下一轮换个
写法又红——所以 260–350 连续多批同族复发。

类级对策（推荐）：**每个产物一份语法/形状正本，三个投影同源**——

- ① 代码里的 parser/schema（唯一判定）；
- ② 模型可见样例（`content/templates/run/*` 或 skill 里的 fenced 样例）**就是** ① 的测试输入；
- ③ 守卫：一条 `contract-fixture` 测试从 ② 抽出样例喂 ①，样例与 parser 任一改动不同步即红。
  负控 = 同一测试对畸形样例必须红。

这把「判据 vs 真实产出」从每轮临时对表，变成一条可执行的配对合同。

### 3.2 未知被折成失败（tri-state）—— 4 张

`347`（无 review 面 → FAIL）、`344`（子代理在飞 → settled）、`345`（窗口外/异形回执 → 未见证）、
`348`（无活动 → 无告警）是同一个投影缺陷：**把 absent / unreadable / unknown 折成 false**。
复核 `329` 的 `null → 全部 evidence` 也是同一族（null 不等于「无 critical」）。

类级对策：观察面的每个判定显式三态 `pass | fail | unknown(absent/unreadable)`，`unknown` 不得触发
「失败」文案，也不得冒充 PASS；守卫 = 每个投影一张状态表测试（三态 × 输入形状），`deriveBusinessBrief`
等消费者只对 `fail` 出横幅。

### 3.3 共享资源的身份与所有权 —— 8 张（多数已取代）

锁/端口/缓存键的老问题：资源没有身份、或有身份但读方与写方用的不是同一个函数，或 check-then-act。
`71010fef` 已给锁类补上唯一 owner + 唯一 supervisor；**残留的是同族的另外三处**：端口输入域
（333–338）、probe 缓存键读写不对称（327）、交付回执的身份（345）。

类级对策：**一个资源一个 acquire/release owner + 一个身份函数，读写双方必须调用同一函数**；守卫 =
性质测试（key(read) === key(write)；非法端口在入口 fail-loud exit 2；预留失败有界重试且报明原因）。
锁类已按此落地，本批只补残余，不重开 320–326。

### 3.4 流程缺陷：读码即可「修复就绪」

18 张薄卡的 `复现` 是空代码块、`修法` 是模板话，却都是 `修复就绪`——而 `修复就绪` **同时是修复授权**
（P1/P2 自授权）。于是 11 张在代码已变后仍可被「授权修复」；若照卡修，会重犯已被取代的旧协议。
这是本批最大的流程风险，不是代码风险。

类级对策（§5 G2）：`修复就绪` 必须带**同边界的可复现命令**（或显式 `未复现` + 读法协议）；否则降级
`排查中`。机械面 = `backlog-liveness` 增一条检查（D4）。

## 4. 修复次序（8 个阶段，含 1 个用户检查点）

排序原则：**先把「账」和「证据通道」修好，再修代码**；纯代码先于合同/用户可见；共享 owner 先于单卡；
用户决定集中在 P4 一次给完，避免每簇停等。

### P0 账实对齐与再就绪（0.5–1 会话，不写生产代码）

- 动态复核 §2 的 4 条不确定项；更新表与卡的 `复现`。
- 18 张薄卡逐张改写 `修法` + `## 修复判据`：写得出具体方案与红命令 → 留 `修复就绪`；写不出 →
  降 `排查中`（同变更，理由上卡）。
- 建本卡的**批表**（§7 卡→簇→边界→红命令→guard→处置），填不满的行不许开工。
- 复跑基线：`pnpm verify` / `pnpm test`；记录两场 bundle 的定向红项（§4.3）。
- 退出：活跃集从 31 → 20（或更少），每张 live 卡有一行可执行方案。

### P1 打通 oracle（2 张，0.5–1 会话）

| 卡 | 修法 | 红 → 绿 |
|---|---|---|
| 340 | 补 `readdirSync` import + CLI 壳级测试（真跑入口 + 最小 bundle） | `node checks/run-gates/protocol-audit.mjs …` 当前崩 → exit 0；反控：删 import 的 HEAD 版本 exit 1 |
| 346 | 进程组静默判据改 `process.kill(-pgid, 0)`（ESRCH=静默 / EPERM=仍在），`ps` 只作诊断 | PATH 塞必败 `ps` 后正常退出仍释放两锁；真孤儿仍保留 |

为什么这么早：340 是 `run-accept` 的 protocol 预检入口（不修则后面所有 gate 证据都被它挡住）；346 是
本沙箱里 `ps` EPERM 的现场——修好后 `channel-start.e2e` 的负控才跑得动，P2 的入口级红证才拿得到。

### P2 关闭幽灵与收尾（11 张，1 会话）

不是「翻状态」，是**给每张卡一个同边界的红证 + 命名用例**：

- 模块级（322/323/324/325/331/332）：从 `71010fef^` 取旧 `start-lock.mjs` 存为
  `tests/fixtures/legacy/start-lock.baseline.mjs`；新测试逐个断言「旧实现违反本卡性质、当前实现不违反」。
  红 = 对 baseline 跑 exit 1；绿 = 对当前实现跑 exit 0；guard = 命名含 BUG 号的测试。
- 入口级（320/326/337/339）：用例登记到 `checks/smoke/channel-start.e2e.mjs` + `checks/lib/harness/gates-cases.mjs`；
  红 = 基线 shell（`git show 71010fef^:tools/channel/boot-run.sh`）或 `--mutate=drop-home-lock` /
  `--mutate=bypass-wrapper` 的 exit 1（真实反控）；绿 = 当前入口 exit 0。
- 321/339：补最终证据与审查，翻 `修复落地` → `已修`。
- 332：按合同处置关闭，结论行写明「不按 PID/TTL 接管是获批取向，不是未修漏洞」并链合同。
- 同变更：卡 → `_archived/fixed_bugs/`，更新 `bugs/README.md`；本卡追加 P2 段。
- `staged-change-pairing` 要求 `changes` 与代码/测试同暂存集——所以每张卡的关闭都必须带真实用例改动，
  不允许只移卡（这正是 2026-11-14 假修事故的形状）。

### P3 端口与缓存身份（6 张，1 会话）

- 一个 `parsePort` owner（1–65535 整数，空/NaN/0/1.5/负 → 入口 fail-loud exit 2，报参数名）接到
  run-driver `--port`、cold-start env、snapshot、client-load；负控 = 5 个畸形值各一例。
- 338：`pickFreePort` 的 TOCTOU 不做「预留」假承诺；改为**有界重试 + 明示失败**（bind 冲突 → 换端口重试
  N 次 → 仍失败 exit 1 并打印实际端口与占用者）。取舍上卡，不写成「已消除 TOCTOU」。
- 327：读写共用 `probeCacheKeyOf(...)`；守卫 = 同一配置下 key(read) === key(write)，且 MCP=on 写的
  GREEN 不被 MCP=off 命中。

### P4 决策检查点（用户 1 轮，阻塞 P5–P6 的方向）

见 §6 D1–D5。一次回答完；实现中不再拆问。

### P5 判据↔生产者合同（7 张，2–3 会话）

按「结构化优先、散文次之」排序，每张都带真实 bundle 现场 + 负控：

1. `343` readiness 声明：接受合法 `counts` 对象（或按 D1 口径），skill/模板与 parser 同改；负控 = 坏 JSON/错值仍红。
2. `350` claims：按 D1 定 v1 严格 / v2 接纳 rich ledger；必须定义与 `verdicts-r*.json` 的事实归属，避免双份事实；负控 = `version` 非 1、缺 `finalRef`、claim 缺 `text/critical` 仍红。
3. `342` plan 剩余工作：接受 `角色 —— 待…` 语义，或模板给机器格式（D1）；负控 = 删 owner/next 仍红。
4. `341` findings：解析器接受一行式与无冒号标题（字段切分按 `支撑/lenses/lens_gaps/gap`），模板同步；负控 = 重复 F#/幽灵 lens/无 F# 仍红。
5. `328` plan 快照：快照必须与当前图在节点/验收/预算上**有差异**，同文本之外再判内容；负控 = 空快照/版本错仍红。
6. `329` 阈值作用域：`criticalEvidence=null` 不再退全部；改为「无法确定 → 不判 or 红」的显式态（按 D1 统一口径）。
7. `330` 输出长度：计长前排除围栏、URL、表格；负控 = 正文超限仍红。
- 共享交付：`contract-fixture` 守卫（§3.1），每类产物一个样例，样例 = 模板/skill 里的 fenced 块。

### P6 驾驶舱与交付见证（4 张，2 会话）

- `347`：`readinessOfSources` 增 `absent`（pass=null）；`useStatusFeed` 只折有判定的结果；`deriveBusinessBrief` 对 null 不出「审查未过」。
- `344`：`runSettled` 追加「无在飞子代理」；从 `subagent/catalog` spawn 与完成事件求差集；夹具 = e2e 事件日志；负控 = spawn + turn 关闭 + final 未完成 → 不 settled。
- `345`：回执语法 v2（接受 install-only 形状 + slug 归一 + 窗口外事实）；真浏览器复验（`client-load.entry` + seed 夹具）；两张截图对照。
- `348`：最后活动时间 + 最后一回合错误 → 可行动横幅 + `run.md` 事实标记；用 `runb-events-full.jsonl` 的 02:35–08:47 窗口重放，正常长回合不误报。

### P7 沙箱、残余红分诊与总收尾（1 会话 + 可选新 run）

- `349`：按 D5 落「启动探测 + 显式降级记账」或文档化边界；负控 = 非嵌套环境脚本层仍绿。
- **残余红分诊**（不扩大本批修复范围，只建卡）：两场 bundle 还有卡外红——
  B 的 `W2.1 owner_role「analyst（executor=research-wave）」`、`W2.2 task_id 不是 plan-only`、
  review 覆盖表缺 T1/T2/T3、`未解释 CRITICAL C7/C1 但 readiness=PASS`；A 的 `leads.md` 不在场是
  quick_factual 设计豁免。逐条判「生产者错 / 判据错 / 交付确实不合格」，各自新建卡（P1/P2）或记
  `none — 门禁判定正确`。
- 收尾：批 Note（共享根因的簇）+ 每卡 `fix-evidence` + 归档 + README + `notes/implemented`（有持久决定时）。
- 总验收：`pnpm verify` + `pnpm test` 绿；改动面的门禁/入口定向绿；两场 bundle 的**卡内红项**清；
  新 run 仅在需要证明「生产者真的照新模板写」时触发（见 §7 停止条件）。

### 4.3 当前两场 bundle 的红项（本会话实测，`source tools/env.sh` 后）

| bundle | 卡内红 | 卡外红 |
|---|---|---|
| A `drt_pg-latest-stable` | protocol-audit 崩（340）、node-gate `readiness.json` 未知键（343）、findings 无 F# 块（341） | 无（`leads.md`/`plan.md` 不在场 = quick_factual 豁免） |
| B `drt_sodium-ion-bess` | protocol-audit 崩（340）、findings 无 F# 块（341）、剩余工作 owner/next（342）、verdict-audit claims（350） | `W2.1 owner_role` 含 `executor=`、`W2.2 task_id` 非 plan-only、覆盖表缺 T1/T2/T3、未解释 CRITICAL C7/C1 |

注意：B 的卡外红**可能是门禁在如实判坏交付**（review 真的缺覆盖表、CRITICAL 真的没解释）。这类
「修完卡仍红」不等于本批没做完；也不等于要放宽门禁——按 P7 分诊。

## 5. 流程保障：让「修」真的沿本仓流程走

| # | 保障 | 落点（机械面） |
|---|---|---|
| G1 | **批入口表**：卡→症状→边界→红命令→guard→处置，填不满不开工（方法 §2.1） | 本卡 §7 表；每簇开工前补齐 |
| G2 | **再就绪复核**：`修复就绪` 必须带可复现命令或显式 `未复现` + 读法协议，否则降 `排查中` | 新 `backlog-liveness` 检查（D4），先在 18 张薄卡上看红 |
| G3 | **每卡一案**：共享守卫必须命名 BUG 号或单卡用例；共享绿不替代单卡证据（方法 §2.3） | `staged-change-pairing` 已支持 `claimsBug`；本批把用例名统一带 BUG 号 |
| G4 | **红先绿后**：先跑红并记录，再改生产；幽灵卡用 baseline/mutation 红证，不用「代码看起来已对」 | `fix-evidence` 的 `red.exit!=0` + `guard` |
| G5 | **一簇一提交序列，WIP=1**：同一共享路径不在两张卡上各改一次；簇内按 owner 排，不按卡号 | commit 粒度 + 批 Note 的卡→case 表 |
| G6 | **决策批处理**：D1–D5 一次问完；簇内不即兴扩面、不改验收标准 | 本卡 §6；答复后回填 |
| G7 | **验收阶梯**（按改动面）：`verify` → `test` → 目标门禁（`gates.e2e --gate`）→ 真入口（run-accept 定向 / client-load / channel-start.e2e）→ 新 run | guides/60 §2 路由表；每阶段退出条件写在本卡 |
| G8 | **审查分层**：机械门禁不跳；跨面 diff 跑 `reviewing-a-delivery` 自审；用户验收只在阶段边界 | `.agents/skills/reviewing-a-delivery`；`审查：跳过 — 理由` 合法但不写成 verified |

## 6. 需要拍板的五件事（一次回答即可）

| # | 问题 | 推荐 | 代价/影响 |
|---|---|---|---|
| D1 | 判据 vs 生产者：全走 A（判据宽容）/ 全走 B（生产者收紧）/ 双轨 | **双轨**：机器事实优先结构化声明（readiness/claims），散文产物放宽到「技能承诺的语法」并把该语法收进一个模块；模板/skill 同改 | 旧 bundle 能按 A 侧转绿（不手改证据）；B 侧对新 run 生效，但「模型真照写」需下一次自然 run 证明 |
| D2 | 345 回执 schema | **v2：接受现有 install-only 形状（`final_copy`/`presented`/`version`）+ slug 归一 + 交付事实不依赖 history 窗口**；模板同步给 v2 样例 | 旧 bundle 可被见证；若只认 `present.path`，A 永远「未见证」 |
| D3 | 348 停摆告警形态 | **横幅 + `run.md` 事实标记**（阈值默认 30 min 无事件且最后一回合有错）；不改机制 | 只做横幅 = 变了会话就丢；只做文件 = 人不看 |
| D4 | 是否加 G2 的机械门（`修复就绪` 需可复现命令） | **加**；先在 18 张薄卡上取红证再落绿 | 触面 = 门禁与验收合同，故需你放行；长期防「读码即就绪」再生 |
| D5 | 349 处置 | **启动探测 + 显式降级记账**（嵌套环境不声称脚本层已执行；非嵌套负控保留）；DSH 侧选项另立 upstream issue | 不改 vendor；要新增一处运行态探测与文案 |

默认口径（你不回答时的处理）：D1/D2/D3/D5 按推荐执行并在卡上记账；D4 因触面属门禁合同，**不默认执行**，
保持 `等人拍板`，只做卡内再就绪（不改门禁）。

## 7. 批表（开工前填满；P0 先填红命令列）

| 簇 | 卡 | 共享 owner | 边界 / 红命令 | 处置 |
|---|---|---|---|---|
| C0 oracle | 340 | `checks/run-gates/protocol-audit.mjs` | 真跑 CLI + 最小 bundle | 修 |
| C0 oracle | 346 | `tools/channel/start-channel.mjs` | 真进程：PATH 假 `ps` + 真孤儿 | 修 |
| C1 所有权 | 320/322/323/324/325/326/331/337/339 | `checks/lib/channel/start-lock.mjs` + `start-channel` | 模块性质 + `channel-start.e2e` | 已取代（P2 关闭） |
| C1 所有权 | 321 | 同上 | 卡内已有证据 + e2e | 收尾 |
| C1 所有权 | 332 | 同上 | 合同 + 性质用例 | 合同关闭 |
| C2 端口/缓存 | 327 | `run-driver.mjs` + `channel-cache.mjs` | key 对称性单测 + 真 probe 缓存 | 修 |
| C2 端口/缓存 | 333/334/335/336 | 新 `parsePort`（`checks/lib/shared` 或 `tools/channel` 支撑件） | 入口 `--port`/env 负控 5 例 | 修 |
| C2 端口/缓存 | 338 | `port-reclaim.mjs` | 抢占重试 + 明示失败 | 修（取舍上卡） |
| C3 合同 | 343/350/342/341/328/329/330 | parser/schema 模块 + 模板/skill | 真实 bundle 现场 + 负控；`contract-fixture` | 修（D1） |
| C4 驾驶舱 | 347/344/345/348 | `review-readiness` / `run-state` / `final-target` / 状态折层 | spec + client-load + 事件重放 | 修（D2/D3） |
| C5 沙箱 | 349 | 启动探测 + workflow 降级 | 嵌套/非嵌套对照 | 修（D5） |

## 8. 预算与停止条件

- 预算：P0 0.5–1、P1 0.5–1、P2 1、P3 1、P5 2–3、P6 2、P7 1 会话；P4 = 用户 1 轮。合计约 8–10 个会话。
- 停止条件（任一成立即停本轮并报告，不自动扩面）：
  1. 某簇在**同一边界**建不出红命令（记录缺口，卡转 `排查中` 或 `等人拍板`，不假修）；
  2. 用户改了 D1–D5 口径导致某簇返工；
  3. 连续两个会话只增改测试、未推进实现；
  4. 新 run 的触发条件未满足（见下）——不为了「证绿」强起一场 L4。
- 新 run 的触发条件：P5 选择 B/双轨的 B 侧且需要证明「模型真照新模板写」时，挂在**下一次自然 P5 run**
  上验收；本批不以新 run 为关闭前置，只在批 Note 的「未证边界」里登记。

## 9. 交付物与追踪

- 每簇一篇批 Note（共享根因/一次修/卡→case 表/残余），`notes/implemented/`；机械局部簇可用本卡作批索引 + `none`。
- 每卡 `## 修复落地` 的 `json fix-evidence`；归档同变更 `git mv` 到 `_archived/fixed_bugs/`，更新
  `bugs/README.md` 活跃表与「最近归档」。
- 本卡：每阶段结束回填「阶段结果 / 实际红绿 / 未证边界」；完结时 `git mv` 到 `_archived/settled_issues/`，
  `去向：implemented — 批 Note`。
- 显式不做：不改 `vendor/dsh/`；不手改两场 bundle 的 findings/plan/claims/readiness/profile 迁就门禁；
  不为「让旧 bundle 变绿」放宽负控或删断言；不逐卡开 31 个 front。

## 10. 风险清单

| 风险 | 触发信号 | 缓解 |
|---|---|---|
| 幽灵卡判错（静态看漏） | P0 动态复核与表冲突 | 以实跑为准，改表并留撤回记录 |
| 放开判据后掩盖真错 | 负控变绿/被删 | 每卡负控与正向样例成对；`contract-fixture` 双向红 |
| 两场旧 bundle 的红被误当 bug | P7 分诊 | 先判「门禁判定正确」，不为旧证据改门禁 |
| 沙箱 EPERM 使 e2e 不可跑 | `channel-start.e2e` NOT-RUN | P1 先修 346；仍不可跑则记 `notMechanizable` + trigger，不伪造红 |
| 范围回涨（修一张冒三张） | 新红项不在 §7 表 | 新建卡，不入本批；本卡只收 31 张原卡 |
