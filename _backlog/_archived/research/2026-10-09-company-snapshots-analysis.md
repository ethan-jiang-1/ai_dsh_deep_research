---
topic: company snapshots 机制
intent: 为本轮用户直派的 snapshots 借鉴分析保存来源机制、本仓差距与具体建议，区分快照、可运行回放、独立期望与归档。
---

> 来源说明：本报告引用的 `ai_dsh_company` 是作者本地私有参考仓，不随本仓发布；下文以 `ai_dsh_company/<path>` 标识来源，不可点击，也不声称公开可访问。

# ai_dsh_company snapshots：存储、回放、消费与归档机制

观察日期为环境墙钟 **2026-10-09 CST**。只读调查参考仓，未启动模型、回放进程或测试，未修改参考仓；下文“实测”均明确指源仓已留存的实测记录。第 1–7 节分析来源仓，第 8–9 节对照本仓并提出借鉴建议；本轮未实施目录迁移或修复回放。观察时 company HEAD = `fb01c7492313`；其 vendor HEAD 与参考仓根 AGENTS:49–74（`ai_dsh_company/AGENTS.md`） 钉住的 `dsh-v0.2.0-rc.2` 一致。快照树没有自己的入口 AGENTS；规则由快照 README:1–15（`ai_dsh_company/snapshots/README.md`） 拥有，DSH 原生 recorded-session 合同由vendor snapshots AGENTS:1–17（`ai_dsh_company/vendor/dsh/snapshots/AGENTS.md`） 拥有。

## 主要结论

1. **company 的 snapshots 是分类证据库，比 DSH 原生 recorded-session 树更宽。** 它保存完整场景，把日志、replay 输入、sidecar、工作区和声明放在一起；目录在场不等于可执行回放，也不等于工作区独立 oracle。分类合同:1–13（`ai_dsh_company/snapshots/README.md`）
2. **live 权威仍是 DSH session + workspace；快照保存时点证据。** Run bundle 是引用合同，不新增 live manifest，不形成第二套运行状态账。引用合同:80–95（`ai_dsh_company/snapshots/README.md`）
3. **回放固定模型输出，执行真实 agent/tool/UI 路径。** 它可以证明指定转录下的装配、循环、日志和声明过的外部效果；它不向模型发请求，不能证明模型会遵守新 persona/skill，也不能推出未录行为。replay README:12–28（`ai_dsh_company/vendor/dsh/packages/test-support/llm-replay/README.md`）、模型边界:135–149（`ai_dsh_company/vendor/dsh/packages/test-support/llm-replay/README.md`）
4. **“expected”须查来源及消费合同。** 历史 r2/r4/scenario-b/r6/r7 是录制整盘副本；r1 是独立编写期望；foundation 是 authored 回放。只有显式 `workspace.final: true` 配场景内 before/expected 才触发 company 的完整工作区断言。来源政策:70–76（`ai_dsh_company/snapshots/README.md`）、oracle 实现:103–118（`ai_dsh_company/tools/lib/workspace-oracle.mjs`）
5. **当前回归能力远小于资产体积。** 逐场声明为 runnable 1 / archived 4 / baseline 4；仅 r2 runnable，且是 presence 判据。活性门只验证声明与磁盘结构相符，不运行回放；声明可随内容演进失效。资格合同:76（`ai_dsh_company/snapshots/README.md`）、活性门实现:924–956（`ai_dsh_company/checks/run-gates.mjs`）、已留存逐场结果:42–55（`ai_dsh_company/notes/implemented/2026-10-09-replay-scene-liveness.md`）

## 1. 存什么：五桶与场景形状

| 桶 | 保存的证据 | 典型消费与边界 |
|---|---|---|
| replay | 明文 session 归档、归一化 session fixtures、prompt/tool sidecar、组合 patch、场景声明、工作区 before/actual/expected（各场景不一定全有） | 可运行回归或时点对照，资格必须看场景声明 |
| visual | 真实浏览器截图、样式/computed 信息、节点文本 dump、采集身份；也含合成任务视觉夹具 | 渲染/视觉证据，不能一概解释为真实模型产物 |
| probes | 按次答案、日志、评分、来源哈希、截图、红绿证据 | 机制/行为探针；来自排练环境，不写真公司盘 |
| archive | 真动议及轮末收敛的时点副本，常见 workspace.actual、journal、迁档前交付物；有的没有 sessions | 历史证据、记忆原文与审计；不天然可回放 |
| corpora | 歧义输入、case 期望与独立人工 labels | 仪器自检与真实标注评分须分开 |

分类及具体资产依据分类表与场景索引:5–55（`ai_dsh_company/snapshots/README.md`）；排练/真盘边界依据时点语义:72–75（`ai_dsh_company/snapshots/README.md`）；语料自检不能推出真实精确率/召回率，独立 labels 才是金标准，依据语料 README:1–9（`ai_dsh_company/snapshots/corpora/candidate-scan-corpus/README.md`）。

一次场景必须整体保存，不能只搬 fixture 忽略 child discovery 或审计依赖。历史裸路径已物理迁入五桶，没有旧目录别名；读取历史引用可经 snapshot-path 解析，冻结日志与 payload 保留录制时的路径，不重写证据。路径合同:57–68（`ai_dsh_company/snapshots/README.md`）

## 2. 谁是正本：四层职责

| 载体 | 拥有的事实 | 不应推断 |
|---|---|---|
| live DSH sessions + workspace | 当前执行事实和工作区事实 | snapshots 已替代 live |
| snapshots README | 分类、来源政策、引用字段、归档顺序和预算 | 每个 scene 已通过运行验收 |
| 场景 snapshot.yml / README | 场景身份、时点、代码锚、组合、会话/workspace 引用、资格及理由 | 可运行资格永不过期；文件名 expected 足以证明独立性 |
| 测试/脚本与 vendor 源码 | 实际读取哪些输入、断言哪些性质 | 顶层文案比实际断言更强 |

依据Run bundle 引用合同:80–95（`ai_dsh_company/snapshots/README.md`）、资格事实家:76（`ai_dsh_company/snapshots/README.md`）、测试分层:7–21（`ai_dsh_company/docs/testing.md`）。orient 只读取声明形成视图，不落盘 manifest；代码注释明确它采用有界字段扫描而非完整 YAML 解析。orient:1–7（`ai_dsh_company/tools/lib/orient.mjs`）

新场景需能反查 scenario/date、录制代码锚、profile/preset、lead/children、cwd、workspace 来源、验证命令，以及采集时使用的系统 tmp 出口。历史 payload 不追填新字段；不足在场景层补充，不另建 manifest。该政策不是“自动捕获所有字段”的保证。引用字段表:84–95（`ai_dsh_company/snapshots/README.md`）

## 3. capture 与 record：两条入口

### 3.1 snapshot-motion：收已有会话与盘面

snapshot-motion:43–82（`ai_dsh_company/tools/snapshot-motion.mjs`） 要求隔离开发 home，按 cwd 映射到 DSH per-workspace session 桶；选 canonical 最高日志世代，zstd 用 `zstd -dc` 导明文。Lead 日志的 `team/member`（member id/name）是 child 发现依据；child 读不到会被跳过，并非完整性失败。世代选择按版本数值最高、同代 zstd 优先，child 名不参与该选择器。选择器:7–15（`ai_dsh_company/tools/lib/session-log-generation.mjs`）

输出重建 `sessions/`，写 lead 与 `<name>-<id>.jsonl` children，并写场景声明；workspace 处理交给独立 helper。它不创建归一化 replay fixtures、sidecar 或回放组合，因此“capture 完成”仅表示存证，不表示 runnable。capture 输出:84–105（`ai_dsh_company/tools/snapshot-motion.mjs`）

helper 将 live **完整普通文件树**复制到 actual；before/expected 从显式独立输入导入一次，拒绝 live/output 重叠、symlink、special file 与 changed expected 覆盖。`--no-workspace` 保留已有 oracle。`final` 只有本次输入同时提供 before+expected 才为 true，已有旧 expected 不自动变成认证 oracle。树与导入校验:26–69（`ai_dsh_company/tools/lib/workspace-oracle.mjs`）、capture:71–101（`ai_dsh_company/tools/lib/workspace-oracle.mjs`）

**接线缺口：** capture 的声明 writer 只有 scenario/date/profile/preset/cwd/motion/session/workspace，profile 固定写 web；没有 codeAnchor、replayEligible、replayJudges 或资格日期。重采同场会替换声明，故可能擦掉手工维护的新合同字段。活性门要求的字段须另补，不能直接把该工具当完整新场景生产线。writer:96–105（`ai_dsh_company/tools/snapshot-motion.mjs`）、活性门必填校验:933–950（`ai_dsh_company/checks/run-gates.mjs`）

### 3.2 replay-smoke：prepare、真模型重录、keyless refresh

- `--prepare`：从 replay/raw 的 lead 与按 createdAt 排序的 children，生成固定 v3 名字 fixtures 和逐会话 sidecar；不发模型请求。prepare:208–223（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）
- `--record`：从已有 fixture/raw/首录 archive 提取原始用户任务，以 live 组合启动真实 Web 路径并使用开发凭据；收割日志，再写 raw、归一化 fixture 与 sidecar。Web 录制期望至少 lead+1 child，headless lane 不支持该模式。任务抽取:185–195（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）、record:393–435（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）、headless 限制:76–78（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）
- `--refresh`：仅 headless authored keyless 场景；先过完整 workspace 与会话数检查，再更新 session/sidecars，独立 workspace oracle 不重写。refresh:745–758（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）

归一化复用 vendor 的 catalog restore、cwd token、bulk scrub 与关系保真的 identity redaction；company 另对日期注入的采样时刻/elapsed 与 Web 随机端口做对称归一化。system prompt sidecar 保存所有 system/message 首文本块及变更段；tool sidecar 保存所有 request/header 工具表为 initial+changes。sidecar 是可比对请求内容，并不是工具结果 mock。归一化与 sidecar:109–175（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）、vendor compare:449–467（`ai_dsh_company/vendor/dsh/packages/test-support/session-snapshot/src/normalize.ts`）、vendor scrub:506–569（`ai_dsh_company/vendor/dsh/packages/test-support/session-snapshot/src/normalize.ts`）

## 4. replay 如何执行、实际证明什么

company 驱动从 committed v3 fixtures 发现连续 child ordinal，raw 只是 prepare/record 输入；传入 `DSH_SNAPSHOT_FILE/CHILD_FILES/PROVIDER/MODEL`，用 shipped CLI/真实 Web RPC 创建会话与发用户任务。Web 无独立 oracle 时镜像**当前**公司参考手册、KB 和 templates 到隔离 workspace，journal 不混入；有 oracle 时以 before seed。headless lane 同样用 shipped CLI，隔离 home 并剔除 key/secret/token/password 环境变量。fixture 输入:452–468（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）、headless:231–253（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）、Web 路径:262–305（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）、RPC:321–354（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）、env 接线:733–743（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）

录/放组合保持同构，禁用 live LLM 和 title LLM，插入 llm-replay；r2 禁用 api-key/account 两个出厂 provider。title 调用不是 ordinary Assistant settlement replay 输入，会吃错供条，故两侧都禁。工具、团队与 client 行继续真实装配；foundation 的写文件调用也走真实工具。r2 replay patch:1–20（`ai_dsh_company/snapshots/replay/r2-motion/replay/cordis.snapshot.yml`）、真实团队/client+replay 行:37–73（`ai_dsh_company/snapshots/replay/r2-motion/replay/cordis.snapshot.yml`）、foundation patch:1–49（`ai_dsh_company/snapshots/replay/foundation-workspace/replay/cordis.snapshot.yml`）

vendor 的 llm-replay 从 assistant/message、assistant/attempt 的 compact stream 展开每次调用 chunks，另接受带 `llmStreamCall:true` 的本地 compaction rawOutput；没有 finish 的 stream 要求 override。children 只派生 inherited cut 之后自己的调用，按 createdAt 排序；新 live Session 第一次 model call 按顺序认领脚本，每会话独立推进 cursor。未录 session 与脚本耗尽 fail loud；请求内容并不驱动真实模型重新决策。派生:462–502（`ai_dsh_company/vendor/dsh/packages/test-support/llm-replay/src/index.ts`）、child 裁切排序:820–850（`ai_dsh_company/vendor/dsh/packages/test-support/llm-replay/src/index.ts`）、binding/cursor:1031–1099（`ai_dsh_company/vendor/dsh/packages/test-support/llm-replay/src/index.ts`）

| company 判据 | 实际断言 | 证明边界 |
|---|---|---|
| full（缺省） | 会话数、全部归一化事件逐行相等、所有 prompt/tool sidecar 零 diff；有 team 事件则 presence board 同形 | 当前组装与固定输出下的转录/请求内容；不是模型行为质量 |
| presence | 会话数；逐会话 team/member 与 team/task 序列排序后相等；presence board 终态 role/displayName/currentTask 同形 | 这些读模型数据与该投影；不检查全量日志、prompt/schema、queued/delivered 及交错顺序 |
| workspace.final | 用 before seed，比较 expected 与 actual 的完整文件清单和字节，包括隐藏、binary、未变文件；报 missing/extra/content | 声明覆盖的隔离 workspace 外部效果；历史整盘 expected 本身不触发此检查 |
| --ui | r3 委派卡可访问名/ARIA 金样，或 r2 在场页签五行与点 VP-Eng 进入成员空间 | 相应浏览器操作与呈现，非所有 UI/用户场景 |

依据全量及 presence 实际代码:768–855（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）、board 投影:856–869（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）、workspace 比较:46–54（`ai_dsh_company/tools/lib/workspace-oracle.mjs`）、UI 委派卡:650–675（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）、UI board:687–718（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）。头注仍有“team/* 逐行、事件类型序列”的旧描述；当前 executable presence 判据应以上述 member/task 排序序列与有限 board shape 为准，不把旧注释扩大成覆盖。

**限制必须随绿结果一起说：** sibling 并发可使 first-call-order binding 非确定；pure pre-chunk throw、cancel/hang、未标记外部 summarizer 要额外 replay override；provider acceptance 使用合成 `{messages:[]}` 仅证接受副作用，不证 wire body。company fixture 无 oracle 时会明确 SKIP workspace；不因模型正文说写成功就证明盘面效果。vendor 限制:74–86（`ai_dsh_company/vendor/dsh/packages/test-support/llm-replay/README.md`）、并发边界:146–149（`ai_dsh_company/vendor/dsh/packages/test-support/llm-replay/README.md`）、company workspace SKIP:449–451（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）

vendor 提供 `assertConsumed()` 检查未绑定脚本和少驱动调用；company smoke 既未取得 ReplayHandle，也未调用该接口，只依其会话/日志/判据检测。presence 会省略许多事件，不能将它描述成显式“所有 recorded calls 消耗完”断言。vendor teardown:1105–1121（`ai_dsh_company/vendor/dsh/packages/test-support/llm-replay/src/index.ts`）、company 判据至退出:749–894（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）

## 5. 测试、门禁与资格消费者

| 消费者 | 使用方式 | 自动化边界 |
|---|---|---|
| keyless unit suite | deliverables spec 读取 r1 盘面/明文日志；r2 明文 lead/teammate 作为身份判据实样 | 证明纯判据，不启动真实回放 |
| replay-smoke | 独立进程 lane；可选浏览器，full/presence 判据 | 不进 pnpm test，不进 hook/CI，默认仍选 r3 |
| workspace-oracle spec | complete tree、独立导入、防覆盖、symlink/overlap、显式 final 的反证 | 检查 helper 语义 |
| snapshot-motion-smoke | 临时 fixture + 真实 capture CLI，含 zstd，复采保留独立 expected | 单独 CLI 集成，不进 unit suite |
| deliverables-check | live 全盘全日志，或快照 workspace 配该场明文 sessions + only slug | 不进 verify；只给单场日志却审整盘会假报历史无背书 |
| journal-audit | live 参与角色/slug 与原文匹配；跨分类查 workspace.actual/kb/role/journal | 归档目录形状是消费合同，不是随便的存储布局 |
| orient --scenario | 引用存在性、身份与消费命令视图 | 不新增 manifest，不证明执行通过 |
| replay-scene-liveness + snapshots-budget | 声明/文件存在性与体积 | 不证明 runnable 运行绿或内容语义 |

依据deliverables spec:25–44（`ai_dsh_company/tests/company/deliverables.spec.ts`）、r2 实样:173–181（`ai_dsh_company/tests/company/deliverables.spec.ts`）、smoke 分层与默认:30–57（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）、unit 反证:24–116（`ai_dsh_company/tests/harness/workspace-oracle.spec.ts`）、CLI smoke:1–61（`ai_dsh_company/checks/smoke/snapshot-motion-smoke.mjs`）、audit 范围:1–20（`ai_dsh_company/checks/audit/deliverables-check.mjs`）、journal archive lookup:147–171（`ai_dsh_company/checks/audit/journal-audit.mjs`）、orient 视图:241–262（`ai_dsh_company/tools/lib/orient.mjs`）、活性门:894–956（`ai_dsh_company/checks/run-gates.mjs`）。

观察时资格及历史实测如下；这是场景声明/源仓 2026-10-09 已留存记录，非本轮复跑：

| 场景 | 资格 | 原因/范围 |
|---|---|---|
| r2-motion | runnable | presence ALL PASS；workspace 未认证，sidecar 跳过 |
| r3-delegation | archived | full 4 failures，注入内容/工具表/persona 漂移 |
| foundation-workspace | archived | full 3 failures；完整 workspace oracle 仍 PASS |
| r6-baseline | archived | member/task 集合红；mid-flight/尾部时序 |
| r7-motion-final | archived | 缺 replay patch 起不来；完整终局用于归档/audit |
| r1/r4/r5b/scenario-b | baseline | 无 replay 输入 |

依据逐场实测记录:42–55（`ai_dsh_company/notes/implemented/2026-10-09-replay-scene-liveness.md`）、r2 声明:14–30（`ai_dsh_company/snapshots/replay/r2-motion/snapshot.yml`）、foundation 声明:8–18（`ai_dsh_company/snapshots/replay/foundation-workspace/snapshot.yml`）、r7 声明:1–23（`ai_dsh_company/snapshots/replay/r7-motion-final/snapshot.yml`）。r6 部分 child fixtures 已外置冷存，仓内 raw.tar.zst 承担恢复/备份路径；不是完整可运行 regression。r6 README:7–19（`ai_dsh_company/snapshots/replay/r6-baseline/README.md`）

活性 gate 仅检查三值、带日期理由、v3 fixture 存在与 runnable patch 存在；不检查日期新鲜度、完整 child/sidecar 集、不按资格拦 smoke 执行。还允许 scene 根 fixture/patch，而 smoke 实际固定读 scene/replay，因此存在“结构门绿但驱动找不到”的宽窄不一致。gate:933–950（`ai_dsh_company/checks/run-gates.mjs`）、smoke 固定路径:65–68（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）、输入硬要求:453–463（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）

升 pin 政策称回放是第一道回归网，同时明确保留已知 full 漂移红作为 canary，可能新版本重录而不覆盖旧锚；所以“政策要求回放”和“全语料现实全绿”必须分开陈述。当前 default r3 已 archived，与这层缺口一致。release:98–100（`ai_dsh_company/docs/release.md`）、测试政策:37–48（`ai_dsh_company/docs/testing.md`）

## 6. 晋升、冻结、归档与预算

**场景晋升不是入目录即完成。** 从录制/基线变成 regression 需完整回放输入、匹配组合、明示 judges、真跑判据通过，再在场景写 runnable + 带日期理由；无输入为 baseline，有输入但判据红/启动失败为 archived。这里 archived 是场景资格，不要求把它物理迁进 archive 桶。门禁只守可判结构，判断有效性由执行证据承担。资格合同:76（`ai_dsh_company/snapshots/README.md`）、三态判据:899–912（`ai_dsh_company/checks/run-gates.mjs`）

**journal → skill 是另一个晋升回路：** 人读 journal、只提炼有证据教训、写方法到 pack skill；不自动提升，不把公司事实与出处塞入可复用 skill，出处留 Note。它不是 replay 成功后自动训练 agent，也不是让运行角色自改插件。presets:161–166（`ai_dsh_company/docs/presets.md`）

**轮末业务归档由维护者做：** 回填话题 meta → 同步台账 → 五角色 CHARTER 写日期/结论/canonical snapshot 路径 → 整盘以迁移前形状进 memory-convergence/workspace.actual → 交付话题迁 deliverables-archive → 清 live journal 留 .gitkeep。已 present final 与被 CEO present 点名 drafts 不删；其他 drafts 要先留完整唯一证据副本；journal 须先全文归档及摘要引用。归档顺序与保留表:97–112（`ai_dsh_company/snapshots/README.md`）

审整盘历史快照要配仅该场日志及 `--only <slug>`；轮末快照可能没有 sessions，须将匹配 live zstd 日志导明文。多 home 场次需每家导出/审计后拼结果，单一 home 不能推出完整作者归属。归档审计:114–122（`ai_dsh_company/snapshots/README.md`）、跨 home 归档实例:3–10（`ai_dsh_company/snapshots/archive/memory-convergence-2026-10-04-5/README.md`）

体积 gate 为快照总量 ≤64 MiB、跨分类 memory-convergence 场景累计 ≤16 MiB；超线先压缩、再外置冷存，同时保 journal 消费路径、CHARTER 引用和 git remote 备份连续性。重复哈希仅证字节相同，删派生/raw 前仍须查 discovery、prepare/replay 与 audit；r2 raw 剔除曾破 child discovery，后改成从 committed fixtures 发现。预算实现:227–254（`ai_dsh_company/checks/run-gates.mjs`）、剔除合同:124–128（`ai_dsh_company/snapshots/README.md`）

**冻结合同与实现不能混为一谈。** vendor 合同规定 record/refresh 保留已提交世代，选择最高 canonical generation，review 后才可独立策展旧世代；独立 workspace oracle 不随录制刷新。vendor AGENTS:7–17（`ai_dsh_company/vendor/dsh/snapshots/AGENTS.md`） company 的 prepare/record 却直接覆盖固定 `session.v3.jsonl/session.k.v3.jsonl` 及 sidecar；同代重录并不形成保留旧锚的新场景。需要借鉴的是保留/审阅合同，不能声称该脚本自动实施它。company prepare:216–221（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）、record:425–430（`ai_dsh_company/checks/smoke/replay-smoke.mjs`）

## 7. 提供给父任务的机制借鉴边界

可供比较的成熟部分是：按证据用途分类但保完整 scene；live 与冻结时点职责分离；scene-local 来源/组合/引用/消费者/资格；独立 before/expected 与真实工具效果检查；固定模型流复演；纯判据单测、进程回放、真模型探针分档；归档消费者路径和预算。company 的工程经验同时提供反例：资产数不能当覆盖数，runnable 声明会过期，presence 绿不能当请求内容/真模型绿，capture writer 与新 metadata 合同会脱节，固定版本覆盖会弱化冻结锚。这些结论来自上述源面，移植落点与本仓差距由父任务另行比较。证据分类与来源合同:1–13（`ai_dsh_company/snapshots/README.md`）、测试边界:7–21（`ai_dsh_company/docs/testing.md`）、活性边界:909–917（`ai_dsh_company/checks/run-gates.mjs`）

本报告完成条件是源机制与执行边界已查到 owning docs/scripts/vendor 源码，并保留可逐行复核的引用；没有将源仓历史 ALL PASS 或声明当作本轮运行验证，也没有从 replay 推断真实模型行为。

## 8. 本仓已经有什么、实际缺什么

本仓已具备 snapshots 思路的核心部分。四角色录制在 [fixtures taxonomy:11](../../../tests/fixtures/README.md)，独立 [snapshot-replay-smoke:58](../../../scripts/smoke/snapshot-replay-smoke.mjs) 经真实 DSH CLI、research profile 与 Web RPC 创建研究会话，用 llm-replay 替换模型；B 层比较 persona 和工具 schema，Lead 另有 C 层渲染期望。它不属于默认 `pnpm test`，因此默认回归绿不能推出回放通过。[测试职责:150](../../../docs/project-map.md)

| 对照面 | 本仓实际情况 | 借鉴的增量 |
|---|---|---|
| 会话驱动的集成证据 | 已有四角色回放，住 `snapshots/replay/research-face`（观察时在 `tests/fixtures/snapshot-research-face`） | 整组迁移已含消费者同步；纯函数夹具继续留 tests/fixtures |
| 探针历史证据 | entry-chain 按时间写输出；discipline 反复覆盖 last.md，均在 gitignored 运行区 | 有持久决定或 bug 消费的运行才精选成完整场景，保留日志、输入、判据、身份和结果；普通输出仍留 runtime |
| 研究事实与执行事实 | bundle 为研究事实正本，DSH session 为执行事件正本 | 研究归档继续用既有 archive；snapshot 只保存需要复核/回归的独立证据，不建立第二运行状态账 |
| 场景声明 | fixture 有 snapshot.yml，但自写 smoke 没有读取它 | 声明由消费脚本校验；名称、profile、格式、覆盖面、日志和期望引用须与驱动一致 |
| 模型可见覆盖 | B1 只收 system/message；B2 只取首个 request/header 的 provider/model/tools | 修 BUG-018，按实际请求的来源比较工作区指令、skill catalog 等注入；动态时间与身份采用有依据的定向归一化 |
| 工作区外部效果 | 当前角色探针未比较完整 before/expected 文件树 | 为写文件、恢复、交付等具体需求建立隔离场景，独立编写 before/expected，不拿实际运行副本当期望 |
| 录制保存 | 录制器要求先删除旧 session.v4，再录同名文件 | 区分 Session 格式版本与录制次数；同格式重录用新场景修订或受审更新，不能把录制次数伪装成 session.v5 |

来源分别为 [smoke 路径与版本选择:52](../../../scripts/smoke/snapshot-replay-smoke.mjs)、[真实装配与回放 patch:120](../../../scripts/smoke/snapshot-replay-smoke.mjs)、[实际 B 层比较:226](../../../scripts/smoke/snapshot-replay-smoke.mjs)、[场景声明](../../../snapshots/replay/research-face/snapshot.json)、[录制前置与输出:40](../../../dev/record-role-fixture.mjs)、[discipline 输出:194](../../../scripts/probe/discipline-probe.mjs)、[entry-chain 输出:248](../../../scripts/probe/entry-chain-probe.mjs)、[运行区忽略规则:13](../../../.gitignore) 与 [四类运行事实:21](../../../docs/design/50-agent-loop-and-state.md)。观察时自写 smoke 未读取场景声明；落点实施与本报告建议的差异由 [snapshots 落点 issue](../settled_issues/2026-10-09-snapshots-adoption.md) 记录。

[BUG-018](../fixed_bugs/BUG-018-snapshot-replay-advertised-coverage.md) 已记录工作区手册、skill-catalog、runtime-context 三类 user/message 注入漏比较，以及源仓实测的漏判。本轮复核 systemTextOf 与 B 层实现确认该缺口仍在；没有重新进行注入或回放实验。skill 正文只在实际读取它的场景中比较，不将 persona 点名技能或 catalog description 当成正文覆盖。[既有标定结论:36](../../../notes/implemented/2026-10-08-recorded-session-obligation.md)

DSH 原生 session-snapshot 完整套件提供 manifest、关系保真身份 token、prompt/schema sidecar、完整文件树与协议适配；但其入口直接导入 vitest，只能在 vitest 中使用。原生库限制:12（`ai_dsh_company/vendor/dsh/packages/test-support/session-snapshot/README.md`） 本仓约定 Node 标准库与 node:test，不因目录借鉴顺带引入测试框架；可复用不依赖框架的源码接口前，须核对其导出与依赖，不能直接复制整个 suite。

## 9. 建议怎样吸收：按当前消费者落地

建议采用根目录 snapshots，专门保存经过选择、能被开发验证或持久决定消费的场景证据。它是测试与取证资产，不是插件运行组件、任务清单或开工前置。先有消费者再收场景，不建五个空桶，也不导入 company 的业务日志。

建议的首批组织如下（候选目录，尚未创建）：

```text
snapshots/
  README.md                     分类、保存边界及消费入口
  replay/research-face/         现有四角色场景整组迁入
  probes/<scene>/<run>/         有 bug/决定消费者的完整探针证据
  visual/<scene>/<run>/         需要复核的浏览器证据，注明真实/合成
```

archive 与 corpora 仅在出现独立消费者时建立。研究 run 继续住 research-workspace/drt_* 与 archive；纯判据样本继续住 tests/fixtures；普通运行产物继续住 runtime/smoke-workspace。company 的 CHARTER/journal 收敛业务流程不适用于本仓研究 bundle，不能照搬为额外归档动作。[本仓事实 owner:25](../../../docs/design/50-agent-loop-and-state.md)、[夹具放置规则:10](../../../tests/AGENTS.md)、[已有归档方式:167](../../../docs/guides/61-run-playbook.md)

推荐顺序：

1. 先校正 BUG-018 的声明与实际比较面，分别注入 persona、schema、工作区手册、catalog 等变更看红，再还原；真实模型行为另由探针验证。目录迁移不能修复漏比较。
2. 将既有 research-face 完整迁入 replay 场景，连同四角色 JSONL、声明、Lead 渲染期望和全部消费者一起变更。默认命令明确选到可运行场景；全角色实际回放通过后才声称迁移成功。
3. 统一采集与驱动读取的最小场景信息：场景/采集时点、代码锚与 vendor 身份、profile/preset/cwd、主/子会话、workspace 来源、消费命令、判据与本次结果。可回放与只存证两种用途明确区分；无需另建全仓登记状态表。
4. 精选一次有持久消费者的探针作为落地样例，保存完整日志和失败结果，避免只保成功答案或持续覆盖 last.md。快照为该次证据，不能倒推当前运行状态。
5. 对外部效果有明确需求时，才添加小型独立 before/expected 场景，例如文件写入或恢复；比较完整文件清单与字节，先注入缺文件、额外文件、错误内容证明判据能拒绝。

只加结构守卫不能推出回放绿。结构检查应使用本仓 tracked-only 规则，并从同一场景读取真正被驱动使用的路径；执行判据必须由独立回放命令验证。无需机械照搬 company 的 64/16 MiB 数值，先量本仓精选资产，再根据实际增长决定预算。泛化路径门禁已有假阳/漏判标定，不能把“改某文件就强制重录”当作覆盖修复。[本仓标定:19](../../../notes/implemented/2026-10-08-recorded-session-obligation.md)、[脚本范围纪律:17](../../../scripts/AGENTS.md)

本轮完成的是来源分析与本仓借鉴建议；未创建 snapshots 目录、未迁移 fixture、未修 BUG-018、未新增采集器或回放门禁，也未重新运行来源仓的 replay。报告与研究索引的结构校验结果以本轮实际命令输出为准。
