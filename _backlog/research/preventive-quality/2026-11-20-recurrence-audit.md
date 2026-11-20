---
topic: preventive-quality-recurrence-audit
intent: 抽样追溯多轮邻接变体到当前实现与测试，区分设计缺陷、执行缺口和证据边界，并提出有代价、可证伪且可停止的预防试点。
---

# 复发链审计：把探索收益变成有限的预防资产

本次抽样支持的结论是：**D54/D55 已经把正确原则写出来，也改善了若干机制，但“守卫在场、账本闭环、oracle 有类型”仍不足以证明新模块继承了旧类的不变量，或证明资产覆盖了它声称的入口。** 当前最强反例是启动锁：旧方法库锁已有 token 与活 pid 保护，新启动锁仍重新引入时间接管与无身份释放；其测试和两份账本同时成立。本轮没有理由把已修的 Markdown/CI 历史问题重新列为现行漏洞。

这里讨论确定性工程缺陷与证据有效性；模型研究结果是否正确、领域结论是否充分不在这些 keyless 资产的证明面内。材料服务[预防性质量研究题](README.md)，只提出研究判断和试点，不改变产品、测试、门禁或当前合同。

## 取样、时态与证据限制

取样不是发生率普查。按“同一事实的不同写法、不同消费者或不同时刻”选择四条链：Markdown 判据、CI 执行识别、artifact freshness、跨入口启动锁。它们分别覆盖开放语法、消费者与运行政策、产物身份、状态与所有权。只读相关源码、测试、CI 和 bug 卡；未全量扫描 runtime、vendor 或构建生成物。

下文三种证据各有用途：

- **历史**：归档 bug 卡与当时 Note 证明曾发生什么、修法为何不充分；旧路径按历史文字理解，现行 owner 另给链接。卡内早先“未修”等段落不推翻其后修复落地记录。
- **当前**：2026-11-20 工作区实际实现、测试与本轮执行结果。绿只约束实际输入和资产证明面。
- **假设/建议**：未执行的设计替代、小试点和泛化判断；不得据此新增“当前漏洞”。

基准是 [guides/67](../../../docs/guides/67-test-strategy.md)、[类级守卫方法](../../methods/class-level-guards.md)、[D54 制度 Note](../../../notes/implemented/2026-11-13-test-strategy-operating-model.md) 与[制度化交付记录](../../../notes/implemented/2026-11-13-test-strategy-institutionalization.md)，并对照 [D55 初版历史](../../../notes/archived/2026-11-14-verification-oracle.md) 和[当前补强 Note](../../../notes/implemented/2026-11-14-verification-oracle-hardening.md)。方法文中“尚未有”的样本结论不直接作为今天的事实；当前实现要重新抽查。

本轮执行一组现有 keyless 测试，七文件共 **33 PASS / 0 FAIL / 0 SKIP，runner duration 约 616ms**。命令前缀为 `TSX_TSCONFIG_PATH="$PWD/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --test --test-reporter=spec`，随后是以下文件：

| 当前资产 | 实际证明面 |
|---|---|
| [markdown-mask-conformance](../../../tests/contracts/markdown-mask-conformance.spec.mjs) | 具名语料及结构组合对当前 mdast 的逐行等同 |
| [ci-workflow](../../../tests/checks/test-infra/ci-workflow.test.mjs) | 合成输入、当前工作流与规范 run 写法 |
| [ci-workflow-oracle](../../../tests/checks/test-infra/ci-workflow-oracle.test.mjs) | 当前实现与已录制 shell/YAML oracle 的 executed/events 字段一致 |
| [artifact-freshness](../../../tests/checks/shared/artifact-freshness.test.mjs) | mtime、manifest 与文件集的临时文件矩阵 |
| [start-lock](../../../tests/checks/channel/start-lock.test.mjs) | 新 helper 的顺序 acquire/release 与时间接管 |
| [run-lock](../../../tests/run/harness/run-lock.spec.mjs) | 旧锁的创建窗口、活/死 pid、释放边界 |
| [method-library-io](../../../tests/pack/contract/method-library-io.spec.mjs) | 方法库文件边界、token 释放与 pid 存活策略 |

另在系统临时目录执行一次当前 start-lock 的交错复现，见链四。临时目录在清理前核验绝对路径。没有运行模型、服务、浏览器、真实 boot、完整安装/发布档；没有重录 CI oracle，没有执行 GitHub 工作流，没有运行全量 verify/test。下述“当前防线存在”不等于这些未运行面已验收。

## 链一：readiness 措辞 → Markdown 容器 → 组合语法

| 时间/案例（历史） | 此前防线 | 下一次逃逸及原因 |
|---|---|---|
| 11-13 [BUG-150](../../_archived/fixed_bugs/BUG-150-readiness-keyword-window-still-hijacked.md)，接续 074/141 | 对行内引用和上下文做词表仲裁；141 又加入“现在/新判定” | “随后/复核后/结论/本 run”仍可让旧 PASS 劫持 FAIL。自由措辞不能由有限同义词表穷尽；测试恰好只补报告中的词。 |
| 11-14 [BUG-169](../../_archived/fixed_bugs/BUG-169-readiness-fenced-code-verdict.md) | 行内包裹/结构位置仲裁 | fence 内独立行与真实 verdict 同形，代码示例可翻转终局。修行内范围没有定义块级范围。 |
| 同日 [BUG-178](../../_archived/fixed_bugs/BUG-178-readiness-markdown-containers-and-bold-paren.md) | 0–3 空格顶层 fence mask、标签装饰归一 | 引用容器中的 fence、缩进代码与加粗标签+括号漏面。支持一个 Markdown 形态被误当成支持这类 Markdown。 |
| 同日 [BUG-185](../../_archived/fixed_bugs/BUG-185-markdown-mask-html-before-fence.md) | 两份 mask 都支持 fence 和 HTML 注释，conformance 钉两者同判 | 两份实现都先剥注释；fence 内未闭合 `<!--` 吞掉后面的真实内容。同判只证明同错，分别支持也没有证明组合优先级。 |
| 11-14 D55 初版后补强 | 初版录制 Markdown 语料及两份 mask 对账 | [补强 Note](../../../notes/implemented/2026-11-14-verification-oracle-hardening.md)记录行内反引号与容器退出等新分歧；静态录制集仍只覆盖录制者想到的输入。 |

**当前防线。** [markdown-mask.ts](../../../packages/deep-research-pack/src/lib/shared/markdown-mask.ts) 是单一零第三方运行时依赖实现；[note-scan](../../../checks/lib/repo/note-scan.mjs) 与 [readiness](../../../packages/deep-research-pack/src/lib/review/review-readiness.ts) 共同消费。测试直接调用 mdast，独立生成预期，并覆盖容器×围栏字符×闭合态×载荷的 54 格组合；本轮通过。它比“两份实现相等”强，仍不构成全部 CommonMark 输入的等价证明。

当前 readiness 还已改变权威来源：[readinessOfBundle](../../../checks/lib/shared/node-gate-contracts.mjs) 在 review 目录在场时要求结构化声明；[readinessOfSources](../../../packages/deep-research-pack/src/lib/review/review-readiness.ts) 检查缺失、非法及散文冲突，旧场才回退散文。不能拿 BUG-150 当年的期望，要求今天任意新措辞必须被当成权威判定。函数头注也明确保留轮次标题插入语的有限边界；这是已声明限制，不能直接判为新 bug。

**归因。** 主因是设计曾让散文同时承载事实与显示；次因是手写开放语法，以及资产只测单点/同错。D54 的矩阵能扩大已知维度，D55 的外部真值能发现作者心智模型之外的组合；两者都不能替代权威来源收窄。

**可在引入阶段预防的更深改动（建议）。** 新机器判定从第一版就让类型化声明承载权威，Markdown 仅作展示与一致性检查；对必须继续读取的开放 Markdown，先选择规范解析器或明示受控子集，避免宣称“通用 Markdown”而逐个补语法。当前结构化 readiness 已部分实现此方向，试点应从一个新判据验证迁移成本，不能再造第二套 readiness。

**代价与可证伪试点。** 一项新判据、半天预算：先列 Authority/Readers/Bad inputs/Legacy exit/Proof（复用[现有方法](../../methods/judgment-design.md)），独立准备 12 个“正文重写但声明不变/声明互斥/缺声明/旧场”样本。通过条件是正文重写不改权威值、非法不猜、所有消费者同判；失败则推翻“声明已经隔离散文”的假设。代价是新写方必须产声明、迁移需要旧场边界、重复人读副本有对账成本；若作者负担大于减少的解析维护，先不扩面。

## 链二：CI 文件名在场 → step 语义 → YAML 与 shell

| 时间/案例（历史） | 此前防线 | 下一次逃逸及原因 |
|---|---|---|
| 11-13 [BUG-160](../../_archived/fixed_bugs/BUG-160-smoke-registry-mention-not-execution.md) | registry 中 ci 资产必须在工作流文本出现 | 注释/echo 保留名字即可绿；“被提及”不等于执行。该卡还明确当时实际 CI 都在执行，是守卫钝化而非生产已停跑。 |
| 11-14 [BUG-177](../../_archived/fixed_bugs/BUG-177-ci-workflow-expression-normalization.md)，接续 172 | 已看 run、needs、step if/continue-on-error | `${{ always() }}` 与裸值同义却假红，`${{ true }}` 的容错可假绿；表达式外壳与语义没有统一。 |
| 同日 [BUG-187](../../_archived/fixed_bugs/BUG-187-ci-workflow-shell-short-circuit.md) | shell 切段后逐段识别 node | `false && node`、`node || true`、后台等被算成执行；命令出现、实际调用、失败传播是三件事。 |
| 同日 [BUG-190](../../_archived/fixed_bugs/BUG-190-ci-workflow-inline-on-flow-mapping.md) | 手写 on 标量/块形态解析；另有事件白名单 | 合法 flow mapping 被当一个 event 字符串。初版 CI oracle 又只消费 executed，未核对录制的 events，外部 oracle 在场仍没有覆盖该承诺字段。 |

**当前防线。** [ci-workflow](../../../checks/lib/test-infra/ci-workflow.mjs) 用锁定 YAML 解析器解析结构/重复键，表达式共用归一函数；写入侧 `ciWorkflowRunProblems` 限定 smoke 调用行，避免开放支持任意 bash。读取侧仍有受限 shell 识别逻辑，不能表述成“已换成完整 bash parser”。[录制器](../../../tools/record/record-ci-oracle.mjs)通过真 bash 与逐目标失败 node stub 证明“确实调用且该失败传播”；[oracle 测试](../../../tests/checks/test-infra/ci-workflow-oracle.test.mjs)同时对 executed 和 events 断言，本轮通过。真 shell 录制结果在本轮是冻结输入，未重新执行。

当前 [registry 测试](../../../tests/checks/test-infra/smoke-registry.test.mjs)双向对账频率与执行集合；[ci-jobs](../../../tests/checks/test-infra/ci-jobs.test.mjs)检查 needs 与 skipped/failure/cancelled；[model-workflow](../../../tests/checks/test-infra/model-workflow.test.mjs)要求事件集合恰为 workflow_dispatch。当前 [push CI](../../../.github/workflows/ci.yml)跑 verify/test，[nightly](../../../.github/workflows/nightly.yml)负责装配重档，[模型工作流](../../../.github/workflows/model-smoke.yml)为手动。夜间失败不阻塞 push 是明确成本政策，不能因为重档未进 required 就认作遗漏。

**归因。** 前半是 oracle 选错边界，后半是自写 parser 追逐开放语法；BUG-190 又展示“oracle 来源独立”不等于“消费了全部证明面”。D55 最有效的变化是写入侧收窄语法、用真实执行语义抽查；继续给读侧加 shell 词表不会自然收敛。

**可在引入阶段预防的更深改动（建议）。** 首次登记 CI 证据时就把命题定义为“目标失败令步骤非零”，每个输出字段有显式消费者；工作流作者可用的命令面固定为有限规范，而不是允许任意 bash 后要求检查器理解全部语法。现行实现已经走此方向，下一步应先验证组合边界，再决定是否需要更多机制。

**代价与可证伪试点。** 限一份 keyless 工作流，最多半天、0 模型：预先封存 8 个 shell 变体与 4 个 YAML 形态，在临时目录用失败 stub 验证；每个样本必须要么被写入侧拒绝，要么读取侧 executed 与真 bash 的失败传播一致，events 单独一致。故意删一字段断言应使试点失败。任何“门允许但 oracle 分歧”的样本即推翻受控语法足够的假设。代价是工作流写法受限、外部解析器升级要复核、真 shell 对照需独立进程车道；不把它逐次推入秒级回归。

## 链三：旧 tarball → mtime 防线 → 内容身份 → 消费入口

| 时间/案例（历史） | 此前防线 | 下一次逃逸及原因 |
|---|---|---|
| 11-14 [BUG-174](../../_archived/fixed_bugs/BUG-174-lifecycle-stale-dist-tarball.md) | lifecycle 验证版本名 tarball 在场，CI 先 export | 本地可装旧包仍全部通过；CI 前置正确不证明每个入口绑定当前源。先增加共享 mtime 谓词。 |
| 同日 [BUG-181](../../_archived/fixed_bugs/BUG-181-artifact-freshness-deletion-blind.md) | tarball 时间不早于现存源码最大 mtime | 删除、重命名、内容替换但 mtime 回拨不可见；“时间更新”被错误当作“身份相同”。改用源文件集/内容指纹与 artifact 哈希。 |
| 11-15 [移交锚机械化记录](../../../notes/implemented/2026-11-15-handoff-anchor-mechanical.md) | helper、lifecycle、release-check 已能证明源/制品关系；其它门仍只证版本/手册自洽 | 交接时全绿与 handoff 红可同时出现；已有判据未处在日常必需路径。把源/制品同源检查提升为 dist-freshness，发布 tag 时点仍留在发布入口。 |

**当前防线。** [artifact-freshness](../../../checks/lib/shared/artifact-freshness.mjs)优先核对 manifest 中源路径+内容指纹、artifact 哈希；[export-dist](../../../tools/release/export-dist.mjs)写 manifest；[lifecycle](../../../checks/smoke/lifecycle.entry.mjs)消费同一 helper，提供 tar 文件集回退；[dist-freshness 门](../../../checks/verify/gates/e-workspace.mjs)在 tarball 与 lib 都在时要求 manifest 并对账；[release-check](../../../checks/release/release-check.mjs)发送方核源，接收方使用明确的接收政策。当前测试覆盖删源、同 mtime 改内容、替换产物、无 manifest 文件集，已在本轮通过。没有检查本机实际制品是否 fresh，也未安装它。

无 manifest 的 helper 回退会显式返回 `mtime-only`；lifecycle 还可显式 allow-stale。clean clone 缺制品或缺 lib，dist-freshness 记 note。这些是代码可见的有意兼容/适用边界，不应写成“BUG-181 尚未修”。但报告若只提取 `fresh`、丢弃 mode/override，将来仍可能把较弱证据冒充内容身份；这是试点要验证的消费风险，非本轮发现的现行漏洞。

**归因。** 此链不是无限开放语法：定义“新鲜”的设计错误可以通过内容身份收敛；第二段复发属于执行入口接线缺口。源码版本、产物版本、自洽与同源是不同命题，增加版本/时间断言无法替代身份对账。

**可在引入阶段预防的更深改动（建议）。** 新产物第一版就定义 provenance：输入文件集、内容身份、产物身份、生产者与消费者；消费入口保留证据强度，明确区分 manifest 证明与兼容回退。不要先以 mtime 承诺“当前源码已验证”再升级。

**代价与可证伪试点。** 只选一条 export→lifecycle 的临时夹具链，预算两小时：固定 add/delete/rename/same-mtime-content/artifact-swap/missing-manifest 六变体，强模式全部 fail-closed，兼容模式必须在报告里保留降级原因；消费者漏检查一次 mode 的故意变异应被抓住。若六变体无判别力或 provenance 成本超过现有检查而没有新证明面，就停止新增资产，沿用当前 helper。哈希成本随输入字节增加；绝对路径参与源指纹使跨机重算有局限，当前移交 Note 已以 sender 制品+receiver 对账分工处理，不能承诺可重复构建。

## 链四：方法库锁旧教训 → 新启动锁 → 两个入口两把锁

| 时间/案例（历史，最后一行仍为活跃卡） | 此前防线 | 下一次逃逸及原因 |
|---|---|---|
| 11-12/13 [BUG-114](../../_archived/fixed_bugs/BUG-114-method-lock-release-stale-owner.md)，源于 097 并发修复 | 方法库已加锁，测试覆盖冲突/陈旧接管 | 旧 owner finally 删除新 owner 锁；原测试只证可接管，不证释放所有权。后来增加 token；活 pid 超龄策略亦有专门回归。 |
| 11-12 的旧 run-lock 防线；11-13 D54 归纳 | [run-lock](../../../checks/lib/harness/run-lock.mjs)头注明禁 mkdir 后补 owner 的创建窗口；[方法形态4](../../methods/class-level-guards.md)已要求时刻×身份×交错 | 该知识存在，但没有成为同类新模块的准入事实。此处不声称旧 run-lock 穷尽所有竞态或能直接替代产品锁。 |
| 11-18 发现、11-19 修复 [BUG-309](../../_archived/fixed_bugs/BUG-309-run-driver-no-up-lock.md)/[310](../../_archived/fixed_bugs/BUG-310-boot-run-no-start-lock.md) | run-driver/boot-run 原来都无启动互斥 | 加 helper 与 shell mkdir 锁，永久守卫是同一 helper 测试。修复了“无锁”实例，但没有继承旧类的身份/生命周期语义。 |
| 11-19 [320](../../bugs/BUG-320-boot-run-drift-only-lock-regression.md)、[322](../../bugs/BUG-322-start-lock-stale-reclaim-race.md)、[325](../../bugs/BUG-325-start-lock-release-removes-new-owner.md)、[326](../../bugs/BUG-326-run-driver-boot-run-two-locks.md)、[332](../../bugs/BUG-332-start-lock-no-pid-liveness.md)等 | 新 helper、shell 锁及“共享”守卫账 | 活 pid 时间接管、旧 owner 释放、双入口互不排他、只读漂移被启动锁拦等邻接状态出现。活跃卡状态为修复就绪；本轮仅抽查，不实施。 |

**当前实现与资产。** [start-lock](../../../checks/lib/channel/start-lock.mjs)第 19–21 行先 mkdir 再写 owner，release 无 token；31–36 行只按 `at`/读取失败接管，没有使用 owner.pid 验存活。[唯一测试](../../../tests/checks/channel/start-lock.test.mjs)不仅没有 token/身份交错，还明确断言同一活进程的锁跨 11 分钟可以被回收。相比之下，[方法库锁](../../../packages/deep-research-pack/src/method-library-io.ts)有 token 释放与活 pid 不接管，[对应测试](../../../tests/pack/contract/method-library-io.spec.mjs)明确测 BUG-114/126。这是现行代码和期望的可核对差异，不只是旧卡推断。token 检查只表达释放资格；先读 token 再删除仍有检查后变化窗口，不能把旧实现的这项保护称为原子 CAS，也不据本次抽查宣称旧锁完全正确。

本轮临时目录复现：A 在 `now=1000` acquire；B 在 `now=661000` acquire，两者 pid 都为本进程；B 成功后 A.release。输出：

```json
{"activePidWasReclaimed":true,"newOwnerLockSurvivesOldRelease":false}
```

该复现证明当前 helper 的两项行为，不模拟真实十分钟启动分布，也不证明多进程 stale 交错的全部结果。后者如 BUG-322，应使用屏障验证，不能把顺序复现冒充真实并发证据。

跨入口边界也可静态确认：[run-driver](../../../tools/channel/run-driver.mjs)第 279 行取 run-driver-up.lock，第 322 行启动 shell；[boot-run](../../../tools/channel/boot-run.sh)第 37 行取另一把 boot-run.lock，且抢锁早于第 118 行 drift-only 分支。helper 测试未执行 shell，无法证明直起/代理启动间互斥，也无法证明只读模式不抢启动锁。[guard-ledger](../../../tests/fixtures/guard-ledger/ledger.json)仍把 309/310 都记 closed，310 红配方写“同 309（共享锁）”；[asset-ledger](../../../tests/fixtures/asset-ledger/ledger.json)把此测试标 structured。账本结构一致、临时文件系统真读写，均不保证“两个真实入口共享锁”这个命题。

**需要降级的卡文。** [BUG-339](../../bugs/BUG-339-boot-run-trap-removes-new-lock.md)把 shell EXIT trap 无 token 删除描述为整条运行路径。当前脚本第 42 行确有 rmdir trap，但第 269 行用 cleanup trap 覆盖它，cleanup 只杀子进程。早退与完整启动的释放路径必须分别核对，本轮未启动服务，不能照卡断言完整路径一定删新锁；覆盖关系反而提示还有释放时点问题待专门验证。同样，[活跃列表](../../bugs/README.md)中的 328/329/330 是等人拍板项，卡文不自动成为当前缺陷事实；本报告不把它们加入已证计数。

**归因。** 主要是旧类保障未迁移到同类新模块、不同入口的互斥范围未建模；测试既覆盖错误边界（helper 代替 shell），又把实现策略当 oracle（活 pid 超龄可抢）。不需要再发明一种“锁失败类”来解释。D54 的状态矩阵形态已经够用；D55 的 oracleType 分类只是来源形状标签，此例表明 structured 不蕴含独立行为期望。

**可在引入阶段预防的更深改动（建议）。** 新锁设计先列“保护的资源键、全部入口、owner 身份、存活、创建/接管/释放线性化点”，复用不变量而非抄局部代码。是否合并成一个锁库需先比较短方法写入、长启动、进程退出等语义；直接强行共用旧实现会引入另一种误用。入口委托必须证明真实竞争同一资源，而非只 import 同名 helper。

**代价与可证伪试点。** 优先试此链：一天预算、一份语义表、至多 12 个确定性交错；活 owner 超龄、死 owner、创建中、旧 owner 迟到释放、两 stale 竞争、owner 写失败、代理/直起、只读漂移各有代表。用假时钟/屏障与临时目录，入口阶段用替身停止在实际服务前。至少把当前已证两行为和“两入口使用独立锁”的故意变异判红。若为覆盖真实入口必须依赖长睡眠或真实 web，先记录该格未证明，不能把 helper 绿交成类关闭。成本是为可控交错暴露测试接缝、协调 shell/Node ownership；不增加全量模型/浏览器门。

## D54/D55 为何仍会复发：规则覆盖到哪里

| 候选解释 | 抽查判断 | 不能推出什么 |
|---|---|---|
| 设计缺陷 | 历史上散文权威、mtime=身份、任意 shell 可解析均属选错事实/边界；当前启动锁所有权与入口范围仍可直接抽查 | 不能因历史设计错就说当前所有 parser 或旧锁未修 |
| 执行缺口 | 旧锁不变量未用于新锁；artifact helper 曾没有进入必需路径 | 不能简单归为“多读文档”即可修；需要设计时触发和实际入口证据 |
| 有限词表/自写开放语法 | Markdown/CI 历史链反复出现；当前 YAML 已用外部解析，shell 由写入侧收窄，Markdown 仍为手写子集+外部对账 | 不能从有限测试推导现行 parser 完全正确，也不能未经反例断言又有漏洞 |
| 资产只自证/覆盖错误边界 | 两份 mask 同错；events 曾未被消费；新锁 fixture 直接认可时间抢活锁、helper 冒充 shell 守卫 | oracleType 非 self-referential、red/green 在场、标题带 BUG 均不是行为充分性的证明 |
| 有意未覆盖 | 旧场 prose、allow-stale、无产物 clean clone、接收方、手动模型档与夜间频率有明确 owner/理由 | 不能以“没有常驻测试”自动算执行遗漏；需先核合同承诺 |

D54 是证据路由与毕业纪律，D55 是 oracle 来源与账本纪律；两者都没有声称测试数、AST 分类或 closed 字段能自动穷尽行为。[asset-ledger 的实际分类](../../../checks/lib/test-infra/asset-ledger.mjs)从 import、临时目录/JSON 等调用形状推导类型，不能自动辨认期望是否复制被测实现。[现行方法](../../methods/class-level-guards.md)已说“负例留证在场不证明留证为真”。因此应补的最小研究问题是：怎样在新模块引入时把类不变量变成准入输入，并在修复关闭时抽查声称入口，而非继续扩大账本字段或逐卡加例子。

## 有限资产与纪律：优先级、代价及退出

建议先做锁试点，再据结果决定是否扩面。其回报可直接观测：旧不变量现成，当前反例已证，验证不依赖模型。Markdown/CI 方向已有结构化/独立 oracle，先保留为试点对照；artifact 身份已有可复用实现，只需验证消费面的证据强度。四项一起全面迁移会把研究变成又一轮无界整仓治理。

在一个新机制的引入阶段，复用现有判据形状而不是增加常驻模板：先声明有限输入域或外部语法、权威事实、受保护资源及全部入口，再选已有失败类的不变量；测试作者先写“必须拒绝的邻近变体”和独立预期，然后看实现。关闭时只允许声称已经过真实消费入口的证明面，缺口保留为未证明。代价是每项复杂机制前置几十分钟设计与一次负控；纯算术/唯一写方闭枚举继续采用简单测试，避免矩阵剧场。

衡量单位应是“机制/不变量×变更暴露”，而非 bug 编号或测试数量：

| 指标 | 可操作定义 | 防误读 |
|---|---|---|
| 新增缺陷类 | 当现有不变量/事实边界无法解释且必须新建 oracle 或机制时记 1；措辞、编码、容器、入口变化通常仍属旧类 | 冻结本轮分类规则，另列合同歧义；不能靠改类名把复发消掉 |
| 同类复发 | 某类声称关闭后，在已声明输入域和入口内又出现违反同一不变量的当前反例 | 分开“同模块复发、迁移到新模块未继承、明确新输入域”；旧已修事故不计新发现 |
| 守卫有效性 | 预先封存的邻近反例/故意回归，被声明守卫捕获的比例；另计合法控制的误红 | oracle 作者与被测实现尽量分开；12 个样本全过只证明这 12 个及声明不变量，不能换算总体可靠率 |
| 检查成本 | 一次性设计/修复工时 + 每次运行墙钟/频率 + 误红定位工时 + 重录/维护工时 | 本轮 616ms 只是一台机器的抽样基线；不把测试条数、矩阵格数当收益 |
| 发现收益 | 每个预算轮新增的当前反例数，按新类/旧类复发/资产边界错误/卡文失真分列，再除调查工时 | “找得多”可能表示闭环差；分类前先重读当前 owner，避免重复算旧事故 |

**建议停止条件（试点假设，不改当前探索合同）。** 开始前冻结一个机制的输入域/入口表、12 个封存样本、两轮各两小时的独立邻接探索上限。第一轮允许定位和修复，第二轮只检验修复后的声明面。预先选定的负控全部有效、合法控制无误红、每个声明入口有证据、第二轮零新增同类反例、无未处置合同歧义，且新增 keyless 资产单文件实测不超过 1 秒，则关闭该机制的主动探索；发布/运行现场继续接收新证据。

预算到达仍有反例就停本轮，明确写“试点未收敛”，选择重构事实来源、收窄支持域或登记剩余风险；不要靠再开一轮无限找洞，也不要把预算用完称为质量关闭。若第二轮只发现域外形态，先由 owner 判断是否承诺支持，不能自动扩大域。重新开启仅由同类复发、语法/入口/资源范围变更、外部 oracle 升级或现场信号触发；“时间到了再全仓扫一遍”不是默认策略。

这种退出条件证的是“有限声明面的预防资产已可交接”，不是“没有 bug”。它让发现环的收益回到设计与回归环，并把新类发现、旧类迁移失败和纯探索成本分别显现出来。
