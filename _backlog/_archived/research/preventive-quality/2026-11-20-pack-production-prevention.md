---
topic: deep-research-pack 的生产源头缺陷预防
intent: 沿模型产物与确定性写方追查真实缺陷因果链，判断包内可承担的不变量、原生机制与人工边界，并提出有独立判据的最小试点。
---

# Pack 能否在生产源头减少缺陷

## 结论与调查范围

**可以前移一部分确定性责任；优先统一 plan 的严格解释与发布校验，再评估证据交接和读者版发布。没有证据支持“换成 schema 或结构化工具就提高领域研究质量”。** plan 的生产规则已有字段、图和预算义务，但硬裁决在包外；方法库已展示包内写方可以承担授权、字段不变量、持久化与回读。两者比较支持试点方向，不证明收益已经取得。直接依据是 [research-planning skill](../../../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md) 第 38–63、92–105 行、[plan-gate](../../../../checks/lib/gates/plan-gate.mjs) 第 29–82 行及 [method-library-tool](../../../../packages/deep-research-pack/src/method-library-tool.ts) 第 59–110 行。

本次以 2026-11-20、HEAD `71010fef` 的源文件为采样点；既有[综合材料](2026-11-20-prevention-synthesis.md)第 12–20、39–43 行和[复发审计](2026-11-20-recurrence-audit.md)第 12–22 行仅作导航，下述新判断逐项回到生产和消费源码。首批开发通道 supervisor 属另一条工程链，不能计为本文研究业务产物的源头改善；本文也不重新评测 A4、扩样或改 expected。A4 的封存判据与既有失败分别见[准入案例](2026-11-20-admission-cases.md)第 155–156 行及[准入结果](2026-11-20-admission-results.md)第 42–46 行。

本文分三种时态：**已存在**指当前源码可查；**源码缺口**指指定生产路径尚未承担某义务，不等于已经复现新的现场事故；**建议**均未实施。只研究和写材料，不修改产品、测试、Note、BUG 或评测口径。材料 frontmatter 依 [research owner](../../../research/README.md) 第 49–57 行，只用 topic、intent，不承载状态。

## 一、先把“谁生产 → 谁裁决 → 谁消费”接完整

| 产物 | 当前生产路径 | 当前裁决与消费路径 | 生产端尚不能声称的保障 |
|---|---|---|---|
| plan | Lead 按 [planning](../../../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md) 第 38–63 行写节点表；第 92–105 行创建 Team task 并回填 task_id；第 132–137 行先复制旧版再改图 | [plan-index](../../../../packages/deep-research-pack/src/lib/plan/plan-index.ts) 第 139–203 行读表；[ResearchGraphTab](../../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx) 第 126–145 行折算提示和任务映射；[plan-gate](../../../../checks/lib/gates/plan-gate.mjs) 第 30–82 行及 [protocol-audit-core](../../../../checks/lib/gates/protocol-audit-core.mjs) 第 95–129 行作包外字段/图/投入裁决 | 模型写入、快照和建任务尚不是同一个强制操作；有工具可写不等于已验证后才能派工 |
| evidence | Analyst 按 [evidence-extraction](../../../../packages/deep-research-pack/presets/analyst/skills/evidence-extraction/SKILL.md) 第 14–39、51–79 行写 frontmatter、摘录与解读；[analyst preset](../../../../packages/deep-research-pack/presets/analyst.patch.yml) 第 18–24、40–43 行挂通用文件工具 | Lead 的 [synthesis](../../../../packages/deep-research-pack/presets/lead/skills/synthesis/SKILL.md) 第 12–24 行据卡写结论；[evidence-audit](../../../../checks/lib/gates/evidence-audit-core.mjs) 第 208–271、281–289、315–325 行查字段、引用、日志/provenance；Critic [adversarial-review](../../../../packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md) 第 12–35 行判实质支撑和来源身份 | 合法枚举不能证明来源评级正确、两源独立或引文支持结论；短引文当前仍需人工核对（audit 第 238–242 行） |
| findings / canonical final | Lead 按 [synthesis](../../../../packages/deep-research-pack/presets/lead/skills/synthesis/SKILL.md) 第 12–24、50–55 行综合已有证据、显式 gap、保留反证并写来源链 | [findings-core](../../../../checks/lib/gates/findings-core.mjs) 第 100–120、132–180 行解析 F#、gap 和证据关联；Critic [adversarial-review](../../../../packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md) 第 14–23、70–88 行读内容核查 | 支撑路径在场只证明可解析；不会自动证明 supported 是恰当判断 |
| review / readiness | Critic 按 [critic preset](../../../../packages/deep-research-pack/presets/critic.patch.yml) 第 23–28 行写 review.md 与 readiness 声明；[adversarial-review](../../../../packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md) 第 113–126 行要求同值 | 包内 [review-readiness](../../../../packages/deep-research-pack/src/lib/review/review-readiness.ts) 第 212–230、245–280 行严格读声明并对散文；包外 [review-contract](../../../../checks/lib/gates/review-contract.mjs) 第 40–104、107–126 行核覆盖和未解释 CRITICAL；Lead 用 PASS 进入 HITL2（[lead preset](../../../../packages/deep-research-pack/presets/lead.patch.yml) 第 28–32 行） | readiness JSON 已存在，不能再建议“从零补结构化终局”；PASS 值正确解码不证明审查做对了 |
| reader-final | Lead 在 PASS 后按 [reader-final](../../../../packages/deep-research-pack/presets/lead/skills/reader-final/SKILL.md) 第 8–21、25–43、57–63 行派生、复制并 present | 包外 [readerGate](../../../../checks/lib/gates/node-gate-reader-gate.mjs) 第 42–103 行查同版、六节、长度、链接和来源面；用户默认先读 reader（[ResearchFinalTab](../../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx) 第 13–16、138–162 行） | 机械门未保证新事实、限定语和反证保真；数字差集仅 WARN（readerGate 第 96–103 行） |

这些是文件生产链，不是一个随包执行的 run validator。发布清单 [pack manifest](../../../../packages/deep-research-pack/package.json) 第 34–63 行包含 presets、content、lib 与 scripts，没有仓根 checks；[NODES](../../../../packages/deep-research-pack/presets/lead/skills/nodes-contract/SKILL.md) 第 15–18 行明确验证由包外承接，第 41 行定义装态没有审计时 `no machine audit (install-only)`、phase 停 delivery。开发侧 [node-gate-core](../../../../checks/lib/gates/node-gate-core.mjs) 第 20–35 行已聚合 plan/findings/review 交付/reader 等判据；**本仓门已修，不等于安装包已在生成当刻拒绝同类输入**。这也不构成把全部 checks 打包的理由。

## 二、历史因果样本与当前代码核对

### 样本 1：plan 只读提示、字段门补齐，以及 active budget 的旧性质

历史 [BUG-267](../../fixed_bugs/BUG-267-plan-graph-issues-ui-only.md) 第 19–25、54–69 行记录：Lead 生产的坏 plan 能被观察解析器发现，却未接 run 硬裁决。后续 [BUG-282](../../fixed_bugs/BUG-282-plan-gate-columns-unchecked.md) 第 7–19、40–59 行记录：补出门后字段仍可缺；当前修复确实在 [plan-gate](../../../../checks/lib/gates/plan-gate.mjs) 第 38–42、70–82 行把图硬错、active 必填接入判断，不再把历史事故报成现行“无门”。[plan-gate tests](../../../../tests/run/gates/plan-gate.spec.mjs) 第 22–31、70–75、110–118 行保有图/字段反例。

**active 节点 budget 单元格存在且非空、无预算写 `—` 是现有性质，不是本研究新发明的预算规则。** [plan-gate](../../../../checks/lib/gates/plan-gate.mjs) 第 68–76 行直接表达它；墓碑可省是第 70–71 行的条件。要注意 [plan-gate tests](../../../../tests/run/gates/plan-gate.spec.mjs) 第 70–75 行虽然标题写了 budget，实际只改 question 和 depth；不能仅凭标题称预算空格已有独立断言。准入案例明确要求继承这一旧性质，但它的 expected 只作既有评测边界，不替代产品源码（[封存案例](2026-11-20-admission-cases.md)第 155–156 行）。

当前还有可指认的解释分工缺口：[PlanNode](../../../../packages/deep-research-pack/src/lib/plan/plan-index.ts) 第 19–36 行没有 budget；第 113–123、163–188 行归一表头、去装饰并把 `—` 转 undefined。硬门在 [plan-gate](../../../../checks/lib/gates/plan-gate.mjs) 第 56–69 行另读全文件原表，只 trim/lowercase 表头、按裸 id 找行，再独立取 budget 和 task_id。其注释称“不解析 budget/task_id”，但 parser 第 182、194 行实际已读 task_id，说明这块注释也不足为事实正本。**这是两套解释政策的源码证据；本轮还对同一份合法控制及其装饰变体作了消费者对照，结果见下段，未据此决定支持格式。** 简单往 PlanNode 加 budget 不会让硬门自动消费该字段；把 `—` 一律折成缺失又会丢掉旧性质需要的“显式无预算”。

本轮父会话运行 `node --import tsx/esm runtime/smoke-workspace/preventive-quality/plan-consumer-contrast.mjs`，exit 0；本材料复读脚本及 `.out`。两份输入都用当前 12 列表头、图版本 v1、active/scout/broad-scan、budget=`1`、task_id=`—` 和有效剩余工作，仅 id 分别为 `W1.1`、`**W1.1**`。完整观测节点均为 `{id:"W1.1",deps:[],lifecycle:"active",kind:"broad-scan",question:"q",ownerRole:"scout",output:"out",acceptance:"ok",depth:"L1",stage:"scan"}`；前者门结果是 `PASS` / `节点 1；图无环/无悬空/无重号；字段/剩余工作/版本链齐`，后者是 `RED` / `W1.1 缺 budget（无预算写 —）；W1.1 缺 task_id（无映射写 —；BUG-302）`。输入/输出留在仓内忽略运行区同名脚本与 `runtime/smoke-workspace/preventive-quality/plan-consumer-contrast.out`；该观察可按所述输入与已链源码重建。它证明当前消费者确有解释差异，**不证明加粗 id 已受公共合同支持，也不自动判哪一侧应改**；试点先定支持域再统一解释，不为此修改产品或测试。

另一个量纲要分清：节点 budget 是 worker/轮次文本（[planning](../../../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md)第 51、59 行）；Protocol 投入上限现在按 topLevel、active depth、cells 和 waves 裁决（[protocol-audit-core](../../../../checks/lib/gates/protocol-audit-core.mjs)第 95–129 行），不是解析节点 budget 后加总。建议不能借统一字段之名悄悄改这两个承诺。

生产→裁决→消费的结论是：Lead 仍先写文件和建任务，观察面宽松读，包外门补硬裁决；适合把完整严格解释和校验前移到候选 plan 变为当前版/用于派工之前。快照的“先存旧版”目前仍是模型步骤；[活跃 BUG-328](../../../bugs/BUG-328-plan-snapshot-same-text-only.md) 第 13–19 行的疑虑与现行门第 91–99 行一致——只验旧文件在场、非空、可选版本和不等于当前文本，不证明它来自先前提交。这里只记录当前检测能力，不复现或修该卡。

### 样本 2：findings 的引用外键被 lens 条件吞掉

历史 [BUG-260](../../fixed_bugs/BUG-260-findings-support-evidence-existence-skips-without-lens.md) 第 20–38、58–66 行记录：Lead 写 findings 的证据引用，裁决器却把“引用存在”放在有 lens 才执行的分支；无 lens 的消费者可收到断链结论。当前 [findings-core](../../../../checks/lib/gates/findings-core.mjs) 第 149–152 行已对所有解析出的支撑路径检查存在性，lens 差集另在第 165–180 行。不是“当前还没修外键”，而是这条外键仍由包外后验裁决承担。

适合前移的是“已声明的引用必须指向本 run 可读证据、gap 必须单值、F# 唯一”；其值域/现有检查见 [findings-core](../../../../checks/lib/gates/findings-core.mjs) 第 12、141–151 行。领域判断“证据真的支持该 finding”归 [Critic skill](../../../../packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md) 第 14–18 行。新增结构化 `supported` 参数只能收住拼写和关联，不能替 Critic 决定其真实性。

### 样本 3：evidence 评级合法，不等于阈值对象选对

历史 [BUG-312](../../fixed_bugs/BUG-312-evidence-threshold-all-evidence.md) 第 7–19、40–59 行记录：Protocol 阈值错误作用于所有卡，背景 C 卡也使关键结论门变红。当前 CLI 从 claims 中取 `critical === true` 的 evidence 集合（[protocol-audit](../../../../checks/run-gates/protocol-audit.mjs)第 162–168 行），[checkEvidenceThreshold](../../../../checks/lib/gates/protocol-audit-core.mjs) 第 419–432 行按该集合筛选；没有集合时仍回退全 evidence。这里应保留“关键结论关联的证据”这一业务量纲，不能把全部卡升级为 A/B 作为预防目标。

Analyst 生产卡片的 quality/source_tier，Lead 生产 critical claim 与关联，裁决器只比较这些声明，Critic 再判来源身份与实质支撑。生产接口可减少未知 topic/lens、缺字段与误关联，但 quality=A 可以写得合法却判得错误。当前 [evidence-audit](../../../../checks/lib/gates/evidence-audit-core.mjs) 第 244–269 行验值域/关联；[Critic skill](../../../../packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md) 第 27–35 行保留评级、独立性和真实抓取判断。这个因果样本反对“越多结构门越好”的无范围方案。

### 样本 4：review 措辞复发后，声明已有，写入还可分步

历史 [BUG-150](../../fixed_bugs/BUG-150-readiness-keyword-window-still-hijacked.md) 第 11–27、45–59 行显示，Critic 写出的自然措辞与旧引用让关键词窗口误选 PASS。当前 [review-readiness](../../../../packages/deep-research-pack/src/lib/review/review-readiness.ts) 第 10–19 行限定结构位置，且第 212–230、245–280 行已严格解析 readiness 声明、拒绝坏值/重复键/未知键/散文不一致。不能把今日仍描述成“只靠关键词猜终局”，更不能把新增 JSON 再提一次当新成果。

剩余责任分离是：Critic 仍按 [adversarial-review](../../../../packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md) 第 113–126 行分别写两个文件；包外 [review-contract](../../../../checks/lib/gates/review-contract.mjs) 第 49–104、107–126 行再读卡数、覆盖与 CRITICAL。一项包内发布操作可以由同一已校验输入渲染声明和人读判定，减少双写漂移；它仍必须接受 Critic 的语义裁决，不能根据“没填问题”自动造 PASS。

### 样本 5：方法库的 write transaction 是已有生产写方，锁也有边界

历史 [BUG-097](../../fixed_bugs/BUG-097-method-library-lost-update.md) 第 17–25、39–62 行：方法编辑器生产新条目，工具做无锁读改写，两个客户端的成功回执不代表最终保留了两份状态。紧接 [BUG-114](../../fixed_bugs/BUG-114-method-lock-release-stale-owner.md) 第 14–25、43–47 行：加锁又因旧 owner 无条件 release 删新锁复发。当前生产路径已经收成 [mutateMethodLibrary](../../../../packages/deep-research-pack/src/method-library-io.ts) 第 123–130 行的锁内读改写和回读，原子替换第 50–70 行，token release 第 118–119 行；已修历史不重报。

这里可迁移的是“由同一操作承担前置判据、变更和持久状态核对”。不是借一个 helper 的名字就称“事务完备”：锁第 97–109 行存在先观察再删除的接管步骤，第 119 行也先比 token 再删除；本轮未执行并发/文件系统反例，不据读源把它升级为新事故或原子 CAS 证明。defaults 在 [command](../../../../packages/deep-research-pack/src/defaults/command.ts) 第 130–168 行复用同一方法库锁，所以资源范围也不能凭文件名假定互不相关。

## 三、现有源头能力到底证到哪里

方法库 [tool input](../../../../packages/deep-research-pack/src/method-library-tool.ts) 第 35–40 行的 entry 只是 string；真正业务约束在 execute 第 59–80 行的 owning Method Editor session、摘要、UI projection claim、单条解析，在 [upsertMethodEntry](../../../../packages/deep-research-pack/src/lib/method-library/method-library-write.ts) 第 27–44 行的名称、四字段、重名和默认唯一性，在 tool 第 88–110 行的持久内容/默认状态回读。schema 外形、业务授权、读改写隔离、持久化、语义回读是不同性质；只有组合起来才减少相应缺陷生成机会，仍不证明四字段描述的方法适合任何领域。

defaults 也已有确定性写方：[/research-defaults 注册](../../../../packages/deep-research-pack/src/defaults/index.ts) 第 100–107 行把会话 cwd 交命令，[command](../../../../packages/deep-research-pack/src/defaults/command.ts) 第 142–171 行校验 patch、锁内重读 revision、拒绝 stale 并写入，第 97–112 行 temp/rename 后回读；[context](../../../../packages/deep-research-pack/src/defaults/context.ts) 第 83–88 行只把它注入成“用户设置、非硬约束”的立项起点。这证到配置状态的生成约束，不证到 Lead 必定采用正确方法或研究结论更好。

写入可达性必须一起核：Method Editor 的限定 preset 明确没有 fs/web/subagent，并只挂方法库窄工具（[preset](../../../../packages/deep-research-pack/presets/method-editor.patch.yml)第 4、24–25、55–57 行）；宿主 Team 工具可能可见的例外也在第 25 行，本轮没有真挂载证明最终工具面。研究角色则实际挂通用 fs：Lead [preset](../../../../packages/deep-research-pack/presets/lead.patch.yml) 第 53–54 行，Analyst [preset](../../../../packages/deep-research-pack/presets/analyst.patch.yml) 第 40–43 行，Critic [preset](../../../../packages/deep-research-pack/presets/critic.patch.yml) 第 42–45 行。原生 `vendor/dsh/packages/fs/tool-fs/src/index.ts` 第 26–34、45–49、93–96 行默认注册 write/edit，`vendor/dsh/packages/fs/tool-fs/src/write.ts` 第 25–27、112–124 行校验路径与文件写入政策，不认识 plan/evidence 业务语义。

所以仅增 `publish_plan` 后保留直接 write/edit 对 canonical 的可达性，最多是推荐路径；不能声称“唯一生产写方”。原生 write-intent 是文件版本/创建政策（`vendor/dsh/packages/fs/tool-fs/src/write.ts` 第 119–124 行），不能无证据当作可直接挂任意正文 validator 的 API。若要强制，须另核原生注册/权限/文件操作接缝，对实际组合里的 write、edit、其它写能力逐一做拒绝测试；本研究没有设计一个臆造 Service，也没有修改 harness loop。

## 四、优先候选（最多三项，全部未实施）

| 顺位 | 建议与产品 owner | 能减少的生成机会 | 不能承担的判断与代价 |
|---|---|---|---|
| 1 | **plan 单一严格 decoder + 发布前校验**。在包内 plan 家族拥有完整输入结果，区分缺列/空格/显式 `—`，保留 diagnostics；当前 Markdown 仍是当前版唯一正本。候选发布操作读取旧版、校验 active 字段/图/Protocol 投入、校验 expected version，再保存旧版并发布当前版；门和观察面消费同一解释结果 | 减少表头/占位/身份双读漂移、坏字段到建任务后的补救；直接针对样本 1。依据 owner 为 [plan-index](../../../../packages/deep-research-pack/src/lib/plan/plan-index.ts) 第 19–36、113–123、139–203 行与 [plan-gate](../../../../checks/lib/gates/plan-gate.mjs) 第 56–99 行 | acceptance 是否能回答研究问题、预算是否值得由 Lead/用户判断；跨 plan 快照和任务板并非单文件原子写。需明确失败恢复与任务镜像重建，不能靠 rename 宣称多文件事务 |
| 2 | **证据/结论交接前校验关联与取证身份**。包内生产操作复用一个解析结果，先验证 topic/lens/引用/枚举；可信取证元数据尽量从原生工具结果导出，模型写解读和质量判断。参考现有 [evidence-audit](../../../../checks/lib/gates/evidence-audit-core.mjs) 第 208–271、275–289 行与 [findings-core](../../../../checks/lib/gates/findings-core.mjs) 第 141–180 行 | 减少断外键、错 lens、凭空 URL/日期/quote 元数据进入下游；只在实际可取得且有身份的源结果范围内成立 | 日志/抓取与本地 provenance 的可得性、第三方页面变动要由原生能力和部署提供；关键 claim 选择、评级与是否支持仍由 Critic 判断。需避免把非关键背景 C 卡误红（样本 3） |
| 3 | **review/reader 发布收口**。先复用现有 readiness decoder，再由一次 review 输入渲染人读判定和声明；reader 发布验证 canonical 版本/摘要、同版副本与显式 gap，提供忠实性差异供核查。已有约束见 [review-readiness](../../../../packages/deep-research-pack/src/lib/review/review-readiness.ts) 第 212–280 行、[reader skill](../../../../packages/deep-research-pack/presets/lead/skills/reader-final/SKILL.md) 第 25–53 行 | 减少双写不一致、错版本、坏链接、错交付顺序；不另增一种 readiness 权威 | reader 是 PASS 之后生成，[readerGate](../../../../checks/lib/gates/node-gate-reader-gate.mjs) 第 3–6、96–103 行已明确语义归人工；删弱限定语、添因果句须独立阅读比较。自动事实匹配可能误红合法改写，先保持核查提示 |

排名依据是当前可观察、可独立裁决且有真实消费者的缺口，不是缺陷数量或工程 LOC。首项有明确旧性质和双读位置，能先用 keyless 有界验证；后二项把取证接缝和语义忠实性引入试点，成本与判断歧义更大。上述优先级是研究建议，没有修改任何 preset、公开格式或默认行为。

## 五、否决方案与责任边界

- **否决再堆一层 schema 然后宣布领域质量改善。** 样本 3 表明合法 quality 的比较对象仍会选错；[Critic skill](../../../../packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md) 第 14–35 行要求实质支撑、身份和独立性判断。字段正确率与研究结论正确率应分开评估。
- **否决为每种产物新增 JSON 权威并与 Markdown 双写。** 当前 review 已有声明优先和副本一致检查（[readiness](../../../../packages/deep-research-pack/src/lib/review/review-readiness.ts)第 233–280 行）；plan 的真实问题先是解释/裁决双读。先统一 decoder，是否需要更换持久格式另须消费者和迁移证据。
- **否决把仓根 checks 全搬进包或把 dev 准入当产品门。** 发布范围见 [manifest](../../../../packages/deep-research-pack/package.json) 第 34–63 行；安装态降级是 [NODES](../../../../packages/deep-research-pack/presets/lead/skills/nodes-contract/SKILL.md) 第 41 行的现有行为。候选只移动有生产 owner 的纯业务规则，保留原生工具政策/日志归属与开发侧审计各自职责。
- **否决扩大提示词“请自检”后就称强制预防，或禁掉所有文件工具以制造唯一写方。** 研究角色确需写多种过程文件（[NODES](../../../../packages/deep-research-pack/presets/lead/skills/nodes-contract/SKILL.md)第 34–41 行）；应先验证受保护路径和全部写入口，在无旁路证明前明确标为辅助路径。业务限制放包内，原生文件/授权机制仍归 pinned DSH；最终方法偏好、未决证据和交付取舍仍归用户/领域审阅者。

## 六、最小试点、独立 oracle、负控、成本与停止条件

**建议只试 plan，先回答一个可证伪的问题：在相同输入域内，统一解释并在发布前拒绝，能否保持旧性质且让非法候选不进入 canonical 或任务派发。** 当前 Lead 写图→建任务的顺序见 [planning](../../../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md) 第 38–63、92–105 行；当前硬门现成旧性质见 [plan-gate](../../../../checks/lib/gates/plan-gate.mjs) 第 70–82 行。本节均为后续可授权的试点设计，本轮未建实现、未造样本资产、未运行试点。

1. **先冻结承诺和独立期望。** 选“当前模板的节点表”这一窄输入域；逐项明确 active 与墓碑、缺列/空值/`—`、owner/kind/depth、重复 id/dep/环、版本和历史快照、Protocol 上限的口径。由另一审阅者依据上述 owner 手写输入→期望表，先封存再实现；不能从新 decoder、renderer、被测 gate 或同一实现生成 expected。至少有 active budget 缺列/空值红、显式 `—` 绿、墓碑缺 budget 合法、有效 budget 字节保留；表头装饰/同名多表若不支持须明确拒绝，不能静默当空图。
2. **先 keyless 验写世界。** 临时工作区里走生产发布操作，观测磁盘当前版、旧版、版本冲突和下游收到的内容；非法输入必须保持旧 canonical 字节与任务镜像不变。成功读回需由独立输入期望比对，不只验证 serialize→parse 相等。保留当前 [plan-gate tests](../../../../tests/run/gates/plan-gate.spec.mjs) 第 22–31、70–75、110–118 行的性质作回归参照，并新增真实 budget 空值断言；不能用现有标题替代该断言。
3. **至少五组变异/绕路负控。** 临时变异跳过 active budget 检查、恢复硬门 raw-table 第二读、跳过 expected version、先改当前版再存旧快照、直接 write/edit 改受保护 canonical。每组在既定 oracle 下必须失败，合法单行更新和墓碑对照必须通过。若直接写仍能被观察/派工消费，试点只能报告“推荐发布路径改善”，不能报告强制预防完成；也不为取得全绿回头改 expected。
4. **原生组合验证单列。** 纯件通过之后，后续另经授权验证安装组合中真实工具权限、写路径及 Team 任务镜像恢复；不把测试 stub 的 task adapter 当真 Agent Teams。角色配置无 bash/node 是既有声明（[synthesis](../../../../packages/deep-research-pack/presets/lead/skills/synthesis/SKILL.md)第 44–46 行），但宿主/子代理仍须核实际能力。本轮不运行服务、浏览器、模型或升权命令，所以这一项是未运行，不写成已保证。
5. **领域质量另设盲评，不搭便车。** 若首项工程试点成立，再按另行批准的固定小题集，对既有流程和候选流程的结果匿名混排，由未参与实现的审阅者核“关键结论能否被源文支持、反证/限定语是否保留、是否答对决策问题”；合法但结论相反、同一通稿伪装两源、reader 删除“不确定”等负控必须被识别。只报这批观察值和成本，不外推总体质量；本轮不启动模型或刷 A4。

成本与停止条件也是**建议阈值，不是实测收益**：先限一次 4 小时的设计/实现可行性时间盒、一次独立审阅不超过 90 分钟；严格 decoder + 临时写入的 keyless 小组新增墙钟目标 ≤1 秒，记录实际维护行数、样本判读工时和误红，不以新增测试数作收益。真实组合/模型成本另申请范围，本次不预支。任一关键机制在时间盒内无法确认全部写入口、出现合同歧义、需要新增第二持久权威，或要求改 expected 才过，即停并报“未收敛”，不滚动扩样。

试点工程通过条件是封存非法输入全部拒绝、合法控制零误红、负控全部被独立 oracle 抓住、旧版/当前版/下游实际状态一致，并且所有声称受保护的写入口都有拒绝证据。无法覆盖旁路时降格结论；领域盲评没做或没改善时只交付确定性机制结果。通过后停止这一窄输入域的主动探索；再开仅由同类现场反例、新写入口、语法/版本合同或原生机制变动触发，而不是继续用 BUG 总数证明进步。

## 七、本轮自查与证据限制

本材料的历史样本为 BUG-267/282、260、312、150、097/114，均同时对照当前生产与裁决源码；没有把归档事故再次列作未修漏洞。active budget 的旧性质、plan-index/plan-gate 双读、方法库授权/写入/回读和锁的非原子边界、evidence/review/reader 输出与装态审计缺席均已分开说明。[BUG-330](../../../bugs/BUG-330-output-length-heuristic-still.md) 第 15 行声称未排除 URL/代码/表格，但当前 [countLength](../../../../checks/lib/gates/protocol-audit-core.mjs) 第 435–450 行已排除所列形态，本材料不采用那句历史描述作为当前缺陷。

本轮执行范围为读源、只读 git 历史、上述 keyless 消费者对照与材料修改；未运行模型、浏览器、服务、安装/真挂载、并发反例、领域评测或候选试点。机械验证结果由交付报告按实际命令记录；机械绿只说明文档与现有断言，不证明候选生产机制或研究质量已经改善。写入范围仅本材料与题名页材料表新增的一行；既有 issue/README 的其他工作树修改保留，不读用户保留的 REVIEW 文件。
