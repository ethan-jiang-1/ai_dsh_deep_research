---
topic: 外部钉版债复核·第二轮（company +17 / assitant +12）
intent: 为 00-index 两行钉版的再次前进提供逐提交判定与逐吸收面三态结论（两仓吸收面全维持、本仓落点零跟改；company HITL 候选登记上游同日改判新形态），并给重钉依据（company bf76d36 / assitant 7dc4ff6）。
---

# 外部钉版债复核·第二轮：ai_dsh_company + ai_dsh_assitant（2026-10-10）

> 服务 = [company 钉版复核 Note](../../notes/implemented/2026-10-09-company-repin-review.md)
> 的下一轮（钉版纪律：不一致即"上游已前进、结论待复核"——00-index company 行 `b19e9ed`
> 与 assitant 两行 `202a27b` 三笔钉版债本轮清偿；上一轮 = [外部钉版债复核](2026-10-10-external-repin-review.md)、
> [company 漂移复核](2026-10-10-company-drift-review.md)，其为历史时点记录不追改）。
> 方法 = 只读（外部仓 log/diff/show 固定身份读取，本仓零写入）。company 漂移面
> `b19e9ed..bf76d36`（**17 提交**——fd12161 之后复核进行中新增 1 个 docs 收口 commit bf76d36，
> 按纪律钉复核时点 HEAD）；assitant 漂移面 `202a27b..7dc4ff6`（12 提交）。

## A. ai_dsh_company（b19e9ed → bf76d36，17 提交）

### 逐提交归类

| 提交 | 归类 |
|---|---|
| bf76d36 docs(收口) | **收口日新增**：行级映射单家化（testing §2→tests/README）+ 收口规则对齐 `_backlog` 章制 + D30/D31 路由改新 + 布局补 `.agents/`——9 文件全 `.md`，零机制面 |
| fd12161 fix(审计) | **verify 门禁强化**：run-gates 新立 `retired-path` 门禁（退役前缀扫描，注释内联负例留证）；同轮补 `TOP_DIRS` 漏 `_backlog/` 的 bare-path 盲区（自曝"扫描面内一半路径从未被存在性检查"）；布局补 tests/_dist |
| e51441f / 025183d chore(公司盘) | 会话产物同步（运行产物入库，非合同） |
| 8404742 / 18fb790 docs(backlog) | 卡收拢归档（说人话卡迁 settled_issues、卡①归档）——纯 `_backlog/` |
| 4d5f09b feat(说人话) | 四模板一分钟摘要 + CEO 收口口令 + 手册一条——产品/手册面 |
| 43ba666 / 4984fe6 docs(backlog) | 立卡送审（说人话卡）——纯 `_backlog/` |
| cdbd823 feat(卡②) | 多实例警告横幅（client `instance-guard.ts` 新增 + 单测 + 探针）——client 行为新增，未触页签契约/数据通道/双半构建 |
| 92dfbb1 feat(卡①) | follow-up 模板（执行类照跑/决策类排队）+ 待补料↔schedule 审计判据（TDD）+ drafts 主题子目录合法化（手册 2 行） |
| 9210540 fix(BUG-008) | deliverables-check 归档件存量豁免（exit1→0，降观察项）+ 卡迁 fixed_bugs——门禁维护带归因 |
| 11e14f5 / 69a770b / b226e5d docs(backlog) | 拍板回写 / 探针 receipt / 三卡显性化——纯 `_backlog/` |
| 8a47a00 feat(HITL) | **手册闸门改判 + 门禁补态**：事实阻塞闸门 ③卡壳必跳出（静默卡死=违纪）④复算触发=真 schedule 任务（title 审计锚 `待补料·<slug>·<T号>`；follow-up 两型）；deliverables-check 补 source 态（红证 8 条） |
| a28e5aa feat(取证) | **preset 行 ×5 + CEO skill**：全员挂 `tool-bash` + `browser-use` 组（两行包组 isolate realm）；手册取证能力边界改判（web_fetch 拦截=工具层 DNS 检查，shell 出网不受限，FETCH-LOG 实录） |

### 逐吸收面三态

| 吸收面（本仓落点） | 判定 | 证据 |
|---|---|---|
| 包结构（anatomy → design/10） | **维持** | 根 AGENTS 布局仅补 tests/、_dist/、.agents/ 三行（与本项目既有布局趋同）；checks/probes/tools/run 分层骨架零改动；pack 仅 README 1 行 + dep 1 行（tool-bash） |
| patch 语法（单行 preset 行形态） | **维持且强化** | 新工具行仍是 config.plugins 内单行形态；新增实证入档："重复声明 executor = 双注册非法（挂载直接红），preset 只声明工具行"（a28e5aa/92dfbb1 注释与 fact-finding-ladder 输掉的方案） |
| preset 教义（per-preset 工具声明/继承语义） | **维持且强化** | "bundle 的工具到不了会话——preset 自包含原则"获运行时确认（base 挂 tool-bash 而公司会话无 bash，归因=preset 未声明）；"Lead 有手=分身有手"继承语义复用（四形态矩阵现行）；tool-workflow 保持 CEO-only 登记 |
| verify 门禁范式（新门禁带反证） | **维持且强化** | retired-path 新门禁把红证原话写进代码注释（负例 A/B 实录、豁免方向实测）；deliverables-check 补 source 态带红证 8 条；BUG-008 豁免带归因说明 |
| 双 home（run/env.sh 形态出处） | **维持** | `run/env.sh` 区间**零 diff**（实测）；runtime/README 仅 1 处 dev/→run/ 指针笔误修复 |
| `_backlog` 推敲空间（D19/D20/D31） | **维持** | 章程 `_backlog/README.md` 区间**零 diff**；9 个提交全是内容卡/归档迁移 |
| handbook-budget 门禁（已吸收，形态出处） | **维持** | 形态出处 `checks/run-gates.mjs` 手册字节预算块（**99–117 行）在 HEAD 逐字存活**——区间 +47 行全部落在其后新增的 retired-path 块（@@ -337/-385 两 hunk），不移动该块行号 |
| 上轮候选①：事实阻塞闸门 HITL | **候选仍候选，形态上游改判（登记新形态）** | 同日两连改：hitl-fact-gate Note（闸门骨架+待补料枚举+依赖链冻结）→ fact-finding-ladder Note **改判**（HITL 从"唯一获取通道"降为"最后手段"——先打能力探针、换通道穷举八条 bash/镜像/浏览器打法，穷尽仍卡壳才准 HITL；补 schedule 复算审计锚与 follow-up 执行/决策两型）。**本仓无落点需跟改**（候选登记不实施）；若未来实施，以改判后形态为准——「待补料机器可查枚举 + 依赖链整链禁完成」核心不变，新增前置义务"通道穷举"与"卡壳必跳出" |
| 上轮候选②：认领让位/owner-bound 覆盖权 | **维持** | 证据锚 `docs/multi-human.md` 区间**零 diff**（实测）；手册该节仅日期行补"2026-10-10 补认领让位与覆盖权" |
| 上轮候选③：BUG-007 read 屏障判读注意项 | **维持** | 区间无反证（probes 面零改动） |
| vendor 同 pin 声明 | **维持** | 区间 submodule 指针**零 diff**；HEAD 实测 `vendor/dsh @ 639ed01539`（dsh-v0.2.0-rc.2，工作树干净）= 本仓 pin 逐字同版 |

## B. ai_dsh_assitant（202a27b → 7dc4ff6，12 提交）

### 逐提交归类

12 提交三簇：**K4 桌面页重设计**（74bb9e2 feat + 7481fc1 fix + bc79cc5/397a5e9/b83c6c7 docs 走查反馈与收口卡 + issues/README 3 行对齐）、**desk-daily-brief 技能**（dc86df6 feat + 8654466 fix + 7dc4ff6 docs eval 过）、**工具目录与文档收口**（4e5e191 fix: catalog 按 wire name 发现 + 7f2c7af docs/operating.md 新合同页 + a884180 四工具措辞退役）。核心= **c177fff（notes/backlog 对账）**：notes/README 增「已获点名授权的卡」段（授权=决定事实记状态行；切片推进/停点/证据缺口住 `_backlog/issues` 收口卡）+ proposed 卡撤阶段簿记 + AGENTS.md 撤 intent-channel-default-flip note 指针（**呈批默认规则原文保留**）。

### 逐吸收面三态

| 吸收面（本仓落点） | 判定 | 证据 |
|---|---|---|
| notes/README 门牌节（分类 owner；本仓 notes/README） | **维持且上游略强化** | 头部反而补强：新增"机制正文 = `vendor/dsh/.agents/notes/README.md`（**在本 pin 树内**）"指针；c177fff 新增段属 proposed 卡授权簿记形态（两行不一致的仓内对账），不触我们吸收的条款 |
| 验收门四条硬边界（§二之三 test-first 证据环；本仓 guides/60 §0） | **维持** | §二之三在 HEAD 逐字在位（notes/README.md:77–95）：①开工先答「怎么算对」②造红→实现→绿+禁掩盖修法③真证据记在交付里④验收写不出=提案未成熟——四条纪律零改动（第 3 条维持上轮已登记的"证据由交付记录承载"改述形态，未再变） |
| 复发升格触发器移居其复发追踪 Note | **维持** | `notes/implemented/2026-10-08-postponed-trigger-index.md` 未被本区间触及（notes/implemented/ 区间**零 diff** 实测）；§二之三尾句"本文件不记『再出现就升级』的观察"原样 |
| 问题澄清/按需方法/证据分层（_backlog；D19/D20） | **维持** | 章程 `_backlog/README.md` 区间**零 diff**（实测）；仅 1 张新收口卡（261010-desk-k4-closure）+ issues/README 行对齐——内容卡，与上轮"全是内容卡、分层零变化"同判 |
| 呈批优先立场差异（上轮"如实登记不跟"） | **维持登记** | c177fff 只撤了 AGENTS.md 里该规则的 note 依据指针，规则文本未动——与本仓 D12（RFC 按需）/轻立场的分歧照旧，不跟 |
| 其余 9 提交（client/技能/catalog/operating） | **不触吸收面** | 产研面：桌面页重设计、daily-brief 技能、gen-catalog 发现逻辑、operating 合同页——均在本仓吸收范围（notes 治理 + _backlog 分层）之外 |

## 结论

1. **两仓吸收面无一被推翻，本仓落点零跟改**（00-index 行描述、guides/60 §0、notes/README、D23 Note 均无需修改）；
2. **需跟改的只有钉版行本身**：company `b19e9ed → bf76d36`（钉复核时点）、assitant 主仓行与 `_backlog` 快照行 `202a27b → 7dc4ff6`（同仓同 commit）——重钉由主会话在 00-index 执行；
3. **company 候选①登记上游改判新形态**（HITL=最后手段 + 通道穷举八条 + schedule 复算审计锚 + follow-up 两型）：候选地位不变、优先级判断仍归用户；本仓 run 门禁面若吸收，按改判后形态立卡；
4. company 的 `retired-path` 门禁与本仓 bare-path 盘点（[2026-10-10-bare-path-audit](2026-10-10-bare-path-audit.md)）同题异构：其"TOP_DIRS 漏 `_backlog/`"盲区自曝与"内联负例留证"注释风格，支持本仓已有门禁纪律，无需新动作。

## 方法诚实边界

逐 diff 亲读 = a28e5aa 的 ceo/vp-sales preset 行、bf76d36/fd12161 的 run-gates.mjs 两 hunk 与 handbook-budget 块 HEAD 重读、8a47a00 手册闸门节 diff、c177fff 全部（notes/README/AGENTS/proposed 卡）、assitant notes/README HEAD §二之三 原文；归类推定 = 产物同步/收卡/客户端重设计等 14 提交按标题+stat+抽查归类；零 diff 断言（run/env.sh、multi-human.md、company `_backlog/README.md`、assitant notes/implemented/、assitant `_backlog/README.md`、company vendor 指针）均为 `git diff <base>..HEAD --stat` 空输出实测；外部仓自述测试绿未复跑（纯只读复核）；「维持」= 未发现反证，非全量逐字复核。bf76d36 为复核进行中 HEAD 前进所得，仅按 stat+抽查归类（纯 docs 收口轮）。
