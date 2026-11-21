---
topic: preventive-quality-change-admission-audit
intent: 追踪 D54/D55 五关在新代码引入时的实际执行面，以启动锁实证区分结构闭环与语义准入，并提出复用现有 owner 的有限长期方案。
---

# 变更准入审计：谁让新 Module 继承旧不变量

## 判断与研究边界

**当前能机械阻止“缺直测、账本漂移、假修空挂靠”，不能机械判定“这是旧类的新实现，必须继承哪些不变量”。
** 后者由实施前验收设计与交付语义自审承担；若未把性质绑定到真实调用者，五关形式齐全仍能漏旧类。
依据是[开发环](../../../../docs/guides/60-dev-loop.md)、[五关](../../../../docs/guides/67-test-strategy.md)与下列实现，而非以 BUG 数推断。

长期最小落点是两段：agent 对有限语义变更作一次归属判断；判断后的已知家族由公共操作与实际行为测试持续执行。只修锁没有第一段，只加字段没有第二段。本材料是研究建议，不改变现行产品、门禁、纪律或授权。

采样为 2026-11-20 当前工作树；读了入口链、[首轮综合](2026-11-20-prevention-synthesis.md)、[复发审计](2026-11-20-recurrence-audit.md)、[试点卡](../../settled_issues/2026-11-20-preventive-quality-pilot.md)，另只读[本仓落地稿](2026-11-20-repo-landing-plan.md)。
仅新增本文件；没有运行服务、模型、浏览器或完整启动。

## 一、五关究竟由谁执行

[D54 Note](../../../../notes/implemented/2026-11-13-test-strategy-operating-model.md)把五关定义为证据选择制度；[D55 Note](../../../../notes/implemented/2026-11-14-verification-oracle-hardening.md)补强解析、oracle 与双账。
是否执行某条具体性质，仍须追到当前代码，不能从制度名推导。

| 关口 | 当前实际入口 | 能执行的事实与仍需判断的部分 |
|---|---|---|
| 准入 | [guides/67 §五关](../../../../docs/guides/67-test-strategy.md)、[writing-a-gate](../../../../.agents/skills/writing-a-gate/SKILL.md)、[资产账测试](../../../../tests/checks/test-infra/asset-ledger.test.mjs) | 最低层、唯一证明面、owner、成本的合理性由 agent 判断；机器核字段、枚举值和路径，不证明资产值得存在或性质正确 |
| 变更类 | [guides/60 任务型表](../../../../docs/guides/60-dev-loop.md)、[test-surface](../../../../tests/checks/test-infra/test-surface.test.mjs) | 新纯件有直接 import 可机械对账；新实体消费者是否完整、新状态机是否继承旧性质、判据矩阵是否选对仍是语义工作 |
| 必需 | [pre-commit](../../../../tools/hooks/pre-commit)、[package scripts](../../../../package.json)、[CI](../../../../.github/workflows/ci.yml)、[smoke-registry](../../../../tests/checks/test-infra/smoke-registry.test.mjs) | 默认测试 glob 真执行；smoke 频率与工作流执行面双向对账。但未证明“应有的证据”已经被选出；夜间不等于 push required |
| 退役 | [资产生成器](../../../../checks/lib/test-infra/asset-ledger.mjs)、[smoke 字段测试](../../../../tests/checks/test-infra/smoke-oracle-surface.test.mjs) | 文件/账本可对账，sunset 非空可判；证明面是否重复、是否该删除仍由 owner 判断 |
| 复盘 | [guides/67](../../../../docs/guides/67-test-strategy.md)、[交付自审](../../../../.agents/skills/reviewing-a-delivery/SKILL.md)、[修复配对](../../../../checks/lib/repo/staged-change-pairing.mjs) | P0/P1/复发的类因与新守卫是否充分须人/agent判断；修复配对执行的是状态、证据形状、路径和同暂存集 |

提交时 [pre-commit](../../../../tools/hooks/pre-commit)运行暂存空白检查、工作树 verify 和 `pnpm test`；[verify](../../../../checks/verify/verify.mjs)调用六域门禁并汇总退出码。
它不读取语义自审证据表，也不运行一个“新 Module 的失败类继承”判定器。

[reviewing-a-delivery](../../../../.agents/skills/reviewing-a-delivery/SKILL.md)要求按 diff 核对意图、真实入口、断言反证和显式未覆盖，并明确证据表“不是新门禁”。
[guides/60](../../../../docs/guides/60-dev-loop.md)同时规定高风险面必审与日常绿可提交：这是语义完成和机器可提交的分工，不能合并成“绿即充分”。

## 二、可执行守卫、格式守卫与标签的精确边界

| 实现 | 实际判定 | 不能由它推出 |
|---|---|---|
| [test-surface](../../../../tests/checks/test-infra/test-surface.test.mjs) | checks/lib 的 mjs/cjs、pack src/lib 的 ts 必须被测试 AST 直接 import；checks 的未覆盖集合须等于带理由的 SMOKE_ONLY；有防空下限 | 直接 import 不证明调用了相关分支、期望独立或旧类不变量被继承；文件头已明确“不证直测质量” |
| [asset-ledger 生成器](../../../../checks/lib/test-infra/asset-ledger.mjs) | path/lane/class/cost/sunset 多由路径与常量生成；uniqueClaim 取头注或标题；oracleType 按 import/调用形状推导 | class 是资产车道类，不是 C1–C12 失败类；固定 fast-inproc 不是实测预算；uniqueClaim 非空不证明唯一 |
| [asset-ledger 测试](../../../../tests/checks/test-infra/asset-ledger.test.mjs) | 重算资产相等、六属性合法、claim 内路径和分类表路径存在；外部解析器 import 不能由注释冒充 | external 不证明结果参与 assert；structured 不证明模型独立；canonical 不证明正确需求 |
| [guard-ledger 测试](../../../../tests/checks/test-infra/guard-ledger.test.mjs) | 必收 BUG 闭集、标题反向入账、guard 在场、两账类型一致、redRecipe 非空；self-referential 只能 provisional | 不执行 redRecipe，不核 closed 的语义充分性；未带 BUG 标题的新普通测试也不因此继承任何旧性质 |
| [guard-red-record](../../../../checks/verify/gates/f-repo.mjs) | BUG 标题须有对应事故卡和逐号留证注释；conformance 文件须有留证块 | 不制造回归、不运行红证；实现注释明确“留证真假靠人复现” |
| [fix-evidence](../../../../checks/lib/repo/fix-evidence.mjs) | 唯一合法 JSON，changes 路径形状，声明 red.exit 非零、green.exit 为零，guard 或不可机械化+trigger | 检查的是填写的 exit 值，不执行 command；不证明 red/green 同一命题、同一入口或来自真实运行 |
| [staged-change-pairing](../../../../checks/lib/repo/staged-change-pairing.mjs) | 修复落地/新归档卡须有 changes 精确命中暂存文件；guard 存在，未改 guard 要有 BUG 标题等绑定；另管 Note/金标准配对 | 不适用于每个普通代码新增；即使命中，也不证明代码与声明性质有因果关系 |

[backlog-liveness](../../../../checks/lib/repo/backlog-liveness.mjs)另常驻检查修复卡证据与 guard 路径，并非只有暂存时才校格式；[staged-change-pairing 的 verify 壳](../../../../checks/verify/gates/f-repo.mjs)无暂存对象时只记 note。
二者都没有执行卡内命令。

相反，[smoke-registry](../../../../tests/checks/test-infra/smoke-registry.test.mjs)确实消费[CI 解析器](../../../../checks/lib/test-infra/ci-workflow.mjs)识别的可执行步骤，拒绝注释、echo、if:false、吞错等冒充执行。
这是有用的实接线守卫，但只作用于已经登记的 smoke 频率，不自动选择新代码需要的证明面。

## 三、真实反例：新锁怎样全绿却漏旧不变量

窄历史 `git show bf386685 -- <下列文件>`确认：309/310 同 diff 新增[启动锁 helper](../../../../checks/lib/channel/start-lock.mjs)及[唯一直测](../../../../tests/checks/channel/start-lock.test.mjs)，driver 调 helper，shell 另写 mkdir 协议。
历史身份用于追溯；下列现行路径仍能独立核实结论。

1. 旧[方法库锁测试](../../../../tests/pack/contract/method-library-io.spec.mjs)已有 BUG-114“旧 owner 不删新锁”和 BUG-126“活 pid 超龄不接管”；旧[run-lock](../../../../checks/lib/harness/run-lock.mjs)头注明禁 mkdir 后补 owner 的创建窗口。
这些不是此次才发明的新类。
2. 新[start-lock](../../../../checks/lib/channel/start-lock.mjs)先 mkdir 后写 owner、只按时间/读失败接管、release 无身份判断；[新测试](../../../../tests/checks/channel/start-lock.test.mjs)默认同一 process.pid，却断言 11 分钟后取得成功。
测试 oracle 已认可与旧性质相反的策略。
3. [run-driver](../../../../tools/channel/run-driver.mjs)取得 run-driver-up.lock 后 spawn shell；[boot-run](../../../../tools/channel/boot-run.sh)取得 boot-run.lock，且在 drift-only 分支之前。
helper 单测没有执行 shell，也没有证明代理/直起竞争同一资源。
4. 测试直接 import helper，满足 test-surface；使用 mkdtemp 归 structured；有 BUG 标题与留证注释，满足两项标题/留证规则。
[资产账](../../../../tests/fixtures/asset-ledger/ledger.json)与[守卫账](../../../../tests/fixtures/guard-ledger/ledger.json)都与之自洽；310 的 redRecipe 还写“同 309（共享锁）”。
5. [309 修复卡](../../fixed_bugs/BUG-309-run-driver-no-up-lock.md)与[310 修复卡](../../fixed_bugs/BUG-310-boot-run-no-start-lock.md)给同一 helper 测试的 red/green exit、同 diff changes 与 guard，足以通过格式/配对检查，不能证明 shell 的声称面。

故遗漏无需“绕门禁”：新代码带一条会通过但不完整甚至错误的直测，再正常更新生成账和修复材料即可。这里不是证明历史作者没有运行所记红证；而是证明即使该红证真实，也没有回答旧 owner、活 pid、创建窗口和跨入口命题。

本轮实跑六文件：test-surface、asset-ledger、guard-ledger、start-lock、fix-evidence、staged-change-pairing，39 PASS / 0 FAIL / 0 SKIP，约 2.44s。
命令前缀 `TSX_TSCONFIG_PATH="$PWD/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --test --test-reporter=spec`，文件均见上节链接。
没有据此声称全仓 verify/test 或未来方案通过。

## 四、最小长期方案：归属判断一次，已知性质持续执行

以下须后续授权实施；不建议新增总账、全仓质量分类器或每次提交全量变异。
复用[现有验收门和路由表](../../../../docs/guides/60-dev-loop.md)、[现有语义自审](../../../../.agents/skills/reviewing-a-delivery/SKILL.md)与[默认测试 runner](../../../../package.json)。

| 应修改的现有 owner | 最小改动 | 替代什么 |
|---|---|---|
| [guides/60 §验收门及新纯件/支撑模块路由](../../../../docs/guides/60-dev-loop.md) | 对新增/实质改变解析裁决、可变状态所有权、共享事实写入、生产者/消费者集合，先定位旧 owner/性质，列本次入口，选择复用或有理由的新实现；写入已有验收记录 | 替代“有对应直测就足够”的使用方式，不另建必填卡/RFC/长模板 |
| [guides/67 §五关](../../../../docs/guides/67-test-strategy.md) | 明确准入的语义判断与机械证明范围，指回 guides/60 的执行动作 | 替代把字段在场、oracleType、closed 当充分证明的解释，不再复制程序 |
| [reviewing-a-delivery §断言有效性/高风险扫描](../../../../.agents/skills/reviewing-a-delivery/SKILL.md) | 从当前 diff 反查上述触发：复用有无绕行、性质适用性、真实入口与目标回归是否被拒；不能回答则明确未证或回到设计 | 用实际核对替代再添一个“已审核”字段；沿用现有证据表，不增第二份清单 |
| [tests/AGENTS](../../../../tests/AGENTS.md)、[test-surface](../../../../tests/checks/test-infra/test-surface.test.mjs) | 保留覆盖发现守卫，明确“直测是下限”；已知家族的行为要求放当前域测试执行，不把 test-surface 扩成任意机制识别器 | 不删除有效覆盖门；替代“每个实现各抄几个事故例子”的长期策略 |
| [class-level-guards](../../../methods/class-level-guards.md) | 用一次实际交付的“同类新实现继承”案例链接可执行性质与负控 | 替代只有旧缺陷毕业、缺新 Module 消费方式的示例；不再搬一套原则 |

### 有限触发，不能靠文件名决定

- 触发：新增 parser/裁决器、资源 owner、状态迁移、缓存/产物身份、同事实新读写方、已有公共操作的替代入口；旧性质修改也触发。
角色/模型可见面沿[原有专用路由](../../../../docs/guides/60-dev-loop.md)处理，不再套一份通用全流程。
- 不触发完整动作：纯文档、改名搬家但无语义变更、受控常量投影、纯算术、封闭枚举唯一写方、单次调用契约；仍跑其原有机械检查。
例外基础来自[guides/67 成本原则](../../../../docs/guides/67-test-strategy.md)与[类级方法适用范围](../../../methods/class-level-guards.md)。
- 同类与性质适用性由 agent 读 diff、接口、历史 owner 判断；不能用 Lock/parse 等名字 grep 认定任意新机制。差异只需记具体语义与未适用理由，不要求新分类体系。

### 已判定家族的真正执行入口

优先让后续入口调用拥有状态的公共操作；[启动锁](../../../../checks/lib/channel/start-lock.mjs)、[driver](../../../../tools/channel/run-driver.mjs)、[shell](../../../../tools/channel/boot-run.sh)是第一片。
若生命期不同而必须多实现，在现有测试内显式执行每个批准适配器的共同性质；差异单测。
不要把同名 helper import 当参与证明，也不立“全仓所有锁”清单。

低层性质由[当前 start-lock 测试](../../../../tests/checks/channel/start-lock.test.mjs)承接进入 `pnpm test:checks`，经[hook](../../../../tools/hooks/pre-commit)与[push CI](../../../../.github/workflows/ci.yml)持续跑；跨入口、退出、委托需真进程，在既有 smoke e2e 车道按影响执行并登记真实频率，不冒充默认 keyless 已验。
先查[driver 契约测试](../../../../tests/run/channel/run-driver-contract.spec.mjs)能承接什么：它当前只读源码/测折算，不能直接充当两入口竞争验收。

只对已知两入口可加精确结构委托约束，并用真实入口行为佐证；其证明域必须点名。尚未识别的新入口/新机制仍由有限语义准入发现。若未来声称机械全覆盖，必须另有产品结构上的唯一注册/写入口；当前没有依据承诺自动发现任意重实现。

## 五、负控、减法与“长期成立”的验收

负控应在后续实施时经真实 runner 运行；本轮没有修改/注入产品。
复用[writing-a-gate](../../../../.agents/skills/writing-a-gate/SKILL.md)的“规则可判才机械化”和[现有类级负控](../../../methods/class-level-guards.md)，每个命题独立选最便宜层。

| 被验证的连接 | 必须拒绝的负控 | 合法对照与入口 |
|---|---|---|
| 旧性质 → 新 owner | 活 owner 只按年龄接管；旧 release 删除新锁；创建失败仍报成功 | 死 owner 合法接管、正常释放；默认 Node 测试 runner，读实际状态 |
| 已知入口 → 公共操作 | 恢复 shell 独立锁/让一个入口绕开操作；不能只删注释 | 代理与直起相互排斥、只读复用合法；隔离真进程、替身停在服务前 |
| 多实现 → 共同行为（仅确需多实现） | 从执行集合漏掉一个已批准适配器，或给其中一个注入旧错误 | 断言执行身份集合恰等于该家族已批准实现，再逐个实跑性质；非全仓新机制扫描 |
| 准入动作本身 | 给未参与调优的变更 diff：新 owner 只带 happy-path 单测，要求审查指出旧性质/入口遗漏 | 另一份普通重命名/闭集常量 diff 应免扩流程；保存语义评审结果，不包装成机械证明 |

最后一行要有一个非锁样本，例如新 parser 或给同事实增加消费者；否则只证明锁家族成熟，未证明跨任务准入可迁移。
输入、期望和范围应先固定，不能看到结果后把漏识别改称新类。
这是对[现有落地稿 §第一批验收](2026-11-20-repo-landing-plan.md)的进一步限定。

交付要删除被统一操作替代的 shell 协议、逐入口释放义务与无独立证明面的重复例子；保留不同生命期实现与必要真入口测试。
不删 test-surface/账本完整性守卫，它们仍有独立用途；把它们的“语义已闭环”解读退役。
新增慢资产按[现有预算](../../../../docs/guides/67-test-strategy.md)先合并/替代，不提高日常频率。

退出同时看：有限性质正反例、目标变异拒绝、真实入口参与、已替代义务删除、一次未调优的准入复核及合法免触发对照。
之后停止该专项主动探索；仅语义/入口/资源范围改变、依赖 oracle 改变或真实同类逃逸重开。
预算到仍未证则结束实验并报告，不自动续轮，也不把耗尽预算叫验收通过。

## 六、为什么“又加字段/分类/评论”不解决

现有[start-lock 资产记录](../../../../tests/fixtures/asset-ledger/ledger.json)已有六属性、[守卫账](../../../../tests/fixtures/guard-ledger/ledger.json)已有 mechanism/redRecipe/closed、[直测](../../../../tests/checks/channel/start-lock.test.mjs)已有 BUG 与留证注释，[两卡](../../fixed_bugs/BUG-310-boot-run-no-start-lock.md)已有结构化红绿。
再加 failureClass、invariants、reviewedBy 只多一个作者可自填的说法；不使旧性质执行、不使 shell 进入同一操作。

字段只有被独立消费者用于一个可证伪决定才产生新保障；比如既有[smoke 频率对账](../../../../tests/checks/test-infra/smoke-registry.test.mjs)真核执行位置。
不能以换成 external/structured、提高 closed 比例、改名 conformance 或注释更详细作为方案收益。
收益必须是先前会绿的具体回归现被拒，且后续调用者少记一项义务。

## 七、父会话材料最大遗漏与本轮验证边界

[首轮综合](2026-11-20-prevention-synthesis.md)与[试点卡](../../settled_issues/2026-11-20-preventive-quality-pilot.md)最初最大遗漏是：锁试点出口没有约束下一个重建同类机制的新 Module。
[落地稿](2026-11-20-repo-landing-plan.md)已补有限准入和真实入口；仍建议补三项验收限定：未调优样本包含一个非锁机制及免触发对照；多实现执行集合遗漏要有负控；已知入口的静态约束不能替代真进程，真进程的影响触发与频率须交付时落定。

本轮证据是读当前源码、窄历史 diff 与上文 39 项现有测试。
语义审查核对了“机器所判事实”和研究主张、触发/豁免、现有 owner 与拟删除义务；没有把方案当已生效。
未跑全量 verify/test、未来负控、进程竞争、服务或模型；新材料相对链接另作逐项存在性检查。
唯一新文件无 status，索引与其余材料由父会话拥有，本子任务不修改。
