# 推敲：SDLC Reference 全量对表——notes 管理 / backlog 衔接 / 测试资产三处的 gap 与吸纳

> 状态：已毕业·部分采纳（2026-10-08 用户指令"推动落地"）｜去向 = 本卡迁 `_done/_closed_plans/` + 四个 RFC 立入 [queue.md §队列](../../queue.md)（C10 语义扫描 ▶ / C19 存量体检 / C2 北星页 / C11 标定）
> 已落地 = C17 + C18 + C1 + C3 + 10 处失真登记（见 §落地记录）｜未立 RFC 的第二档项各有独立前置（缺分布或标定），判断材料留在本卡

## 背景 / 触发

2026-10-08 用户通读 `/Users/bowhead/deepseek-harness/_dsh_plugin_agent_ready_development/sdlc-reference/`
（13 页 + 12 图，DSH 官方 SDLC 精确条款）后指出三处体感症状：

1. **notes 的管理有问题**；
2. **backlog 与 notes 的衔接有时有严重问题**；
3. **测试资产如何测试这一块比较扯淡**。

整体症状 = "可控感差 + 写出来的程序质量不知道在哪里"。本卡 = 把体感症状钉到条文级事实，
量化 gap，给出吸纳候选。**不是开工**——按 `_backlog/README.md` 主干，本卡产出 = 毕业判断。

方法：① 参考卷 13 页全文通读；② 本仓 notes/backlog/tests/verify 五面独立审计（含两个只读
子代理：门禁实现审计 + 证据强度审计）；③ 每条 gap 带**双证据**（参考卷条款 + 本仓实测行号）。

## 参考卷的三条组织立场（全文骨架）

参考卷 `00-index.md:9-13` 自述三条立场，全部 gap 由此展开：

| 立场 | 含义 | 对应页 |
|---|---|---|
| **agent 是一等参与者** | 状态/条件/例外写成可独立查证的条文，不依赖口头传统 | 01、09、08 |
| **可机械判断的规则接入可执行检查** | policy 定义判断、workflow 定义执行——但**不宣称全部语义规则都可自动验证** | 02、04、05、10 |
| **每类事实有唯一 owner** | Note / Issue / Plan / 文档 / 测试 / GitHub 状态各自拥有哪些事实、互不越界 | 01、03、05、06、11、12 |

## 已知与未决

### 结论先行：三条症状的根因（均已实测坐实）

| 症状 | 根因（一句话） | 本仓实测证据 |
|---|---|---|
| ① notes 管理有问题 | **"活的决策记忆"没有维护触发器**——库已超自我声明的分裂阈值，重估入口已到齐但重估本身没做；且权威登记表自身在漂移 | `notes/implemented/` 实有 **70 篇**；`notes/README.md:91` 自述"引入 class 层条件 = 超过约 50 篇"——**超 40%，无门禁提醒**；`note-lifecycle-absorption:36-37` 已否决 class 层并写明"随 dsh-discipline 条目重估"，该条目已于 2026-09-24 毕业（= `discipline-map.md`）→ **重估入口到齐、重估未做**（详见 §二轮复核） |
| ② backlog 与 notes 衔接有严重问题 | **链接靠人肉字符串，北星文档缺席**——`proposal-scheduled` 是子串测试，且本仓没有 DSH `09-intake` 的 intent-carrier 总图 | `verify.mjs:365-367` 用 `queue.includes(stem)` 判归宿（子串命中即绿，prose 里提一句 slug 就过）；仓库无 `09-intake` 等价页（Issue 模板 / Project 状态机 / 意图载体清单一个没有）；`.github/` 目录不存在 |
| ③ 测试资产如何测试比较扯淡 | **验收合同的判据有机械盲区**——L3 判据 1"生命周期每环节在映射表有落点"零机械面；无覆盖率；L4 四条判据只有两条有机械落点 | 实证注入：把 `design/30` 映射表**每一行内容换成 `\| x \| y \|`** → `pnpm verify` 全绿 + 252 测试全过；全仓 `grep istanbul\|c8\|nyc\|coverage\|knip` 只剩 inventory prose 自称"不适用"；`evaluation.md` §L4 四条中 **④中断恢复零机械检查**、**③HITL 只查锚点在场不查静默** |

### 逐面 gap 表（条文 ↔ 本仓）

**A. Note 生命周期（参考卷 01，最厚的一页 163 行）**

| # | 参考卷条款 | 本仓现状 | gap |
|---|---|---|---|
| A1 | `{lifecycle}/{class}/yyyy-mm-dd-topic.md`，**六 class 闭集**由门禁校验（01 §2） | 无 class 层 | **大**——自定阈值已破 |
| A2 | 判据 = 持久决定理由；机械/局部编辑豁免（代码/测试/文档装不下才写） | 同构（`notes/AGENTS.md:9`）；2026-09-24 已吸纳 | ✅ 无 gap |
| A3 | `implemented/` **是活的**：路径/名称/默认值随实现维护；逆转写新 Note 互链 | `notes/implemented/README.md:3-5` 同构 | ✅ 声明同构 |
| A4 | 新增 Note 触发**取代检查**：更新 owner / 部分互链 / 完整吸收后才删（01 §6） | `notes/AGENTS.md:12-19` 硬触发 | ⚠️ **声明有、机械面零**（见 A7） |
| A5 | **三结局**：留下 / 归档 / 合并后删除；归档有 triplet + hash seal | 留下 ✅；归档 ✅（单文件等价，`> 归档：<日期>`）；**合并后删除**无程序 | 中——删除路径未定义 |
| A6 | 格式骨架 `## Problem/Decision/Alternatives considered/Verification` 强制 | 中文骨架 + `note-format` | ⚠️ **部分**——见 A8 |
| A7 | 归档**唯一机械编辑** = 插 `> 归档：<日期>`；实测 `grep -n "归档：" verify.mjs` = **0 命中** | 同——**纯文档义务** | 中小 |
| A8 | — | 本仓 `note-format` 实际只断言：状态行 + `## 决定` + `## 输掉的方案` | **`实际跑过的验证` 与 `环境状态` 两节零校验**，尽管 `notes/README.md:93` 与 `evaluation.md:40` 都宣称是骨架（见 §候选 C1） |

**B. 意图入口与工作项（参考卷 09）——本仓完全无对应物**

| # | 参考卷条款 | 本仓现状 | gap |
|---|---|---|---|
| B1 | 意图载体清单：Issue 三模板 + proposed Note + 代码 TODO + Dependabot（09 §5） | 无 Issue 模板；无 `.github/`；TODO 语义未定义 | **大**（部分为有意简化） |
| B2 | Project 生命周期状态机 `Inbox→Backlog→Ready→In progress→In review→Done/No action`，事件驱动（09 §4） | `_backlog/` 各池 + queue ▶——**纯文件约定，无事件驱动** | 中（是否要状态机待裁） |
| B3 | **PR 模板三节**：Motivation（`Fixes #NN`）/ Changes（两个相邻占位：高层变化 + 可观察行为变化）/ Testing（每法一条 + `<details>Proof</details>`）（09 §3） | 无 PR 模板；commit message 承载证据链（本仓自定形态） | 中 |
| B4 | `human-review policy` 精确条件：`!isDraft && !automated && (reviewRequestCount>0 \|\| reviewCount>0)`（02 §2） | 单人仓，不适用 | 不适用（登记） |
| B5 | 三模板固定最小语义输入（Bug: Summary/Reproduction/Current/Expected/Environment 等）（09 §2） | 缺陷卡 `bugs/` 有字段约定，但**无模板文件** | 小 |

**C. 证据路由（参考卷 04 + 12）——本仓最强也最弱的一处**

| # | 参考卷条款 | 本仓现状 | gap |
|---|---|---|---|
| C1 | **focused coverage 100% per-file**；不得用 `--passWithNoTests` 掩盖（04 §3） | 无覆盖率工具、无覆盖率门禁 | **大**（`discipline-map:200` 登记"不适用"——但配置仓 + 70 Note 的规模下该重估） |
| C2 | 改动面 → 证据类型路由表（04 §3 五行表） | `guides/60 §2 任务型路由表` 同构 | ✅ 良好 |
| C3 | **负例把规则接到真实接受路径**：新规则须有 invalid case 经真实 runner 被拒（04 §5） | `writing-a-gate` 技能 + 反证实录强制；`gates-smoke.mjs` 是本仓亮点（注入真回归 → 跑真 verify 入口 → 断言目标门红 + 零注入对照） | ✅ **本仓强于参考卷** |
| C4 | **三件资产**：model-visible 即 logged / recorded-session 可回放 / 独立外部世界（12 §2） | 三件都有：invariant 由 vendor 承担；`snapshot-replay-smoke.mjs` 四角色夹具（禁 llm-deepseek + 插 `dsh-llm-replay`，A 回放通路 / B persona+tool schema 逐字 diff / C Playwright 渲染金标准）；`evidence-audit.mjs` | ✅ 强 |
| C5 | **非平凡 model/protocol/human-visible 变化必须同 PR 加 keyless recorded-session 场景**（12 §2，`docs/testing.md#when-a-snapshot-test-is-required`） | `snapshot-replay-smoke` 存在但**不在默认 `pnpm test` glob**（`tests/fixtures/README.md` 自标"否（独立 smoke，keyless）"） | **大**——义务无机械把守，靠人记得跑 |
| C6 | **改行为 / 修 bug / 新守卫三种情况红灯含义不同**（12 §3，`three-red-cases.svg`） | 本仓只有"先红后绿"一条笼统纪律 | 中——缺区分，易把"新守卫先红"与"改行为先红"混谈 |
| C7 | **完成判断分属不同位置**：绿灯 / 语义评审 / 批准分数 / goal complete 各建立什么（12 §5） | `evaluation.md §完成判断四分离` 已吸纳（机械检查/语义自审/用户批准/显式交互） | ✅ 已吸纳 |
| C8 | **不重复已通过且未被新改动失效的检查**；不专门重跑 typecheck 复制 hook（04 §3） | 无此纪律；每轮收尾惯例全跑 L0 | 小 |
| C9 | 红灯台账 `evidence-audit.mjs` | CRITICAL 才 exit 1；**misquote 只 MAJOR 不红** | 中——引文失真正好能从绿门溜过 |

**D. 评审与人类角色（参考卷 06）**

| # | 参考卷条款 | 本仓现状 | gap |
|---|---|---|---|
| D1 | 三层证据不互相冒充（static gates / semantic review / explicit interaction 各能建立什么）（06 §1） | `evaluation.md §完成判断四分离` + `reviewing-a-delivery` 技能 | ✅ 已吸纳 |
| D2 | Review 从 **live diff + owner** 开始；先验证 fetch exact base/head（06 §2） | `reviewing-a-delivery`："重读当前工作树与 diff" | ⚠️ 单人仓无 fetch base 面，**无 review 状态失效概念** |
| D3 | **blocking requirements 清单**（prose 已审 / config 同 diff 更新 owning README / disposal evidence / invariant companion / 作者跑过覆盖 diff 的证据）（06 §3） | 本仓有相似断言散在 `reviewing-a-delivery` 五条阻塞判据 | ⚠️ 中——可对表补齐 |
| D4 | **高风险语义检查 11 条**（error/cancellation/ownership/disposal；race/reentry/detach/quiescent disposal；consumer 泄漏；defensive copy；模型可见面；denial 双路径；derived state 权威点；byte limit；shipped entry path；断言会在目标回归上失败；proposed Note 同 diff 改写）（06 §4） | `reviewing-a-delivery` 的"高风险语义扫描"只有 4 条（模型可见面 / 生成物链 / live 文档 / 篡改断言） | **大**——11 条里多条本仓从未检查（disposal、race、denial 双路径、byte limit、shipped entry path） |
| D5 | **Findings 格式**：defect + location + impact + evidence；blocker/suggestion 分开（06 §5） | `reviewing-a-delivery` 有 blocker/suggestion 两档 | ⚠️ 小——缺 impact/evidence 显式要求 |

**E. 文档所有权（参考卷 05）**

| # | 参考卷条款 | 本仓现状 | gap |
|---|---|---|---|
| E1 | **一个事实一个家** + tier taxonomy 表（05 §1） | `docs/AGENTS.md` 层级归属表同构；`docs = now / notes = why` 分工明确 | ✅ 强 |
| E2 | 当前状态写作**不是变更日志**：不保留 `previously/now/no longer`、PR 号、review 对话（05 §2） | `doc-now-only` 门禁 + slop 清单 | ✅ 强 |
| E3 | `dsh-prose-standard`：编辑单位是**完整命题**不是词数；删改须保留每个 load-bearing clause；短文本丢 negative guarantee 仍是退化（05 §2） | 无等价物 | 中——本仓 Note 极长，压缩冲动下有退化风险 |
| E4 | `dsh-trim-cot-leakage` 判定问题：**读者只拿 HEAD、无 transcript / PR thread / 未提交 draft，能否解析每个引用并核验每个 claim？**（05 §2） | **无** | **大**——本仓 Note 满篇"用户定调""实测""本轮"等会话视角（见 §已知与未决末条） |
| E5 | **文档 move 是原子操作**：同变更删旧家、加新家、修全部入站引用（05 §3） | `md-links` + `md-anchors` 兜底 | ✅ 良好 |

**F. Plan / Sandbox / 批准门 / 发布（参考卷 03、10、11、07、08）**

| # | 参考卷条款 | 本仓现状 | gap |
|---|---|---|---|
| F1 | Plan Mode = 软引导；sandbox / approval 独立强制；**三者不能合并理解**（03 §1） | 用 DSH 现成 plan mode + todo_write | ✅ 无 gap（机制由 vendor 提供） |
| F2 | Plan 质量七条（目标成功标准 / 按 subsystem 分组 / public API 变化 / 失败与边界 / 测试 / 验收 / 显式假设；详细到**另一位工程师无需重新作设计决定**）（03 §2） | `guides/60 §0` 验收门 + RFC 四件 | ⚠️ 中——本仓 RFC 无"显式假设"节要求 |
| F3 | Plan ≠ Note：Plan 是会话内可审批对象，Note 是仓库内未来维护者决定记录；**两者不能互相替代**（03 §5） | 同构 | ✅ |
| F4 | 加权批准分数 / `/delegate` / branch rules（10） | 单人仓不适用 | 不适用（登记） |
| F5 | 三条 release 序列 + rehearsal/publish 分离 + **CI 从不回写仓库**（11 §1、§3） | `dist-export` + `_dist/安装手册.md`；`dist-manual-version` 门禁 | ⚠️ 小——无 rehearsal 概念（每次出包即真出） |
| F6 | **历史证据的边界**：git 能证明什么、不能证明什么（web seam 四 commit 样本，明确列出"是否有 Issue / 是否用 Plan Mode / 是否经 review / 跑过哪些命令" = 不能）（08 §4） | 无 | 小——但本仓 commit message 承载证据链，**恰是参考卷判为"不能证明"的那类**（见 §候选 C5） |
| F7 | Stacked PRs / branch rewrite lease 纪律（07） | 单人 master 直推 | 不适用（登记） |

### 三条症状之外的**第四个**发现：倒数两层没有闭环

参考卷 `04 §1` 把检查职责分派为一张表（检查逻辑 / push 前选择 / CI 触发 / hooks / reviewer
各 owner）。本仓对应面**缺少 review 状态失效层**：单人仓无 PR，`reviewing-a-delivery` 每次
从零重读，**"这一版比上一版更好吗"没有载体**。这不是参考卷的条款，是本仓结构性缺口——
但它解释了为什么"可控感差"（用户体感原话）比 gap 表本身更严重。

## 候选与取舍

按"吸纳成本 × 症状覆盖"分三档。**档位是候选，不是结论**。

### 第一档：零成本 / 只补文档与纪律（治症状② 的北星 + 治症状③ 的自证）

| 候选 | 动作 | 治哪个 | 代价 |
|---|---|---|---|
| **C1 补 `实际跑过的验证`/`环境状态` 两节进 note-format 门禁** | `verify.mjs:302-310` 加两条断言（与 `## 决定`/`## 输掉的方案` 同形） | ① 格式漂移 | 极低——但**现有 70 篇大量不合规，必先定 grandfather 或先清存量**（实测：`实际跑过的验证` 节名有 5 种变体 + 3 篇用日期后缀）|
| **C2 立 intent-carrier 总图页**（`09-intake` 等价物） | 新建 `docs/design/60-intent-carriers.md`：本仓的意图载体清单（queue 行 / plans 卡 / bugs 卡 / reference 材料 / proposed RFC / 代码 TODO / degraded 观察项的**各自 owner、进门条件、出场**）+ 状态机图 | ② 北星缺席 | 低——纯文档，但有 `doc-budgets` 与 `entry-chain` 同步成本 |
| **C3 补 `dsh-trim-cot-leakage` 判定问题**进 `docs/AGENTS.md` slop 清单 + `notes/AGENTS.md` | 一句话判定问题（读者只拿 HEAD 能否核验） | ① Note 会话视角 | 极低 |
| **C4 补负例纪律 C8**（不重复已通过且未失效的检查）进 `guides/60 §1.2` | 一句话 | ③ 无谓重跑 | 极低 |
| **C5 复核 commit message 承载证据链的做法** | 参考卷 `08 §4` 明确判 git **不能**证明"跑过哪些命令"——本仓却把命令证据写进 commit body。要么承认它是**自述**（需另找机械消费方），要么改 `gates-smoke` 式把它接进可重跑面 | ③ + ④ | 低（认知），中（若改形态）|

### 第二档：中成本 / 动门禁与技能（治症状① 的分类轴 + 治症状③ 的 L3/L4）

| 候选 | 动作 | 治哪个 | 代价 |
|---|---|---|---|
| **C6 落 class 层**（参考卷 01 §2）→ **首轮定性有误，改挂 C19** | 首轮写成"漏做"；实为**已裁的延后决定**（`note-lifecycle-absorption:36-37` 否决 + 写明重估入口），正确动作 = 按既定触发器**重估**，见 §二轮复核 C19 | ① notes 管理 | 重估本身低；**若重估结论是采 class 层**才上升到中高（70 篇搬迁 + 链接重写 + 门禁扩面反证）|
| **C7 L3 面重定义**（首轮表述已更正，见 §二轮复核） | `design/30` 映射表的**判据 1**（生命周期每环节有 DSH 落点）现零机械面（实证：把表内每行换成 `\| x \| y \|` 仍全绿）→ 补**逐行双向对账**断言（每条映射的落点真实存在、每个 lifecycle 环节有行） | ③ 合同盲区 | 中 |
| **C8 补 L4 ④中断恢复的机械检查** | 参考卷 `12 §2` 的"可回放会话"面可复用：从 kill 点重放 + 断言 bundle 文件事实链完整 | ③ L4 假面 | 中——需 run 夹具 |
| **C9 补 L4 ③HITL 静默检查** | 现只查锚点在场；补"两 HITL 点之间无 stray ask"断言（session log 扫 `ask_user_question` 调用密度） | ③ | 中 |
| **C10 补 `reviewing-a-delivery` 高风险扫描 11 条**（参考卷 06 §4） | 从 4 条扩到 11 条（补 disposal / race / denial 双路径 / byte limit / shipped entry path / derived state 权威点…） | ③④ 语义层 | 中——纯技能文本，但是**本仓质量体感最直接的抓手** |
| **C11 recorded-session 义务接进机械面**（参考卷 12 §2） | 非平凡 model-visible 变化 → 强制同 PR 更新 `snapshot-replay-smoke` 夹具；用 `repo-conventions` 或新门禁按 diff 路径判 | ③ 最关键的一条 | 中高——需定义"非平凡"判据，易假阳 |
| **C12 evidence-audit misquote 升格** | MAJOR → exit 1（或至少交付门读 MAJOR） | ③ 引文失真溜过 | 低中——先标定假阳率 |

### 第三档：高成本 / 动仓库形态（多数**建议不采**）

| 候选 | 动作 | 判断 |
|---|---|---|
| C13 引入 GitHub Issue/Project/PR 模板 + policy workflow | 全套 `02`/`09`/`10` 机制 | **倾向不采**——单人仓，DSH 明文"独立插件仓可以参考这些机制，但不因使用 DSH runtime 就继承主仓的 Issue、Project、批准、CI 或发布制度"（`sdlc-reference/00-index.md:5`）。**但 B3 PR 模板的"两个相邻占位"值得局部借** |
| C14 覆盖率门禁 C1 | per-file 100% | **待定，优先级上调**——`discipline-map:200` 登记"不适用"，但该表已被实测证出 7 处陈旧（§二轮复核），**登记的可信度本身受影响，重估时须重看事实而非只信登记行**。建议**只在 client/scripts 纯函数面**试点，不整仓 |
| C15 三结局的"合并后删除"程序 | 完整取代后删旧 Note | 倾向**缓**——70 篇里实际需要删的可能很少，先做 C6 分类再谈删 |
| C16 重量级 review 状态失效机制 | | **不采**——单人仓成本远超收益；改用轻量形态（见 C5/C10） |

## 毕业门

四门各自的满足条件与本卡当前倾向：

**① 该不该做 / 采哪几档**
- 症状 ①②③ 均已钉到条文级事实（本卡 §已知与未决三条根因）——**该做已成立**；
- **二轮复核后，优先级重排**：**C17（`na` 理由活性检查）+ C18（重校触发条件不认本仓自身演进）**
  升为最高——它们是**根因级**：`discipline-map` 是我们判断"该做/不该做"的依据本身，实测已
  有 7 处陈旧且无门禁可咬。**依据会静默腐烂，则后面每一张 gap 表都可能建在假前提上**；
- 开放点 = **范围**：第一档五项（C1–C5）可直接纳入；第二档里 **C19（重估 class 层）** 是
  分水岭——但注意它是**本仓既定触发器要求的动作**（`note-lifecycle-absorption` 自己写的
  重估入口），不是新提案；C11（recorded-session 义务机械化）治症状③ 最彻底但有假阳风险。
- **需用户裁定**：第二档采哪几项 + 是否优先做 C17/C18。

**② 何时做**
- **C17/C18 无前置依赖**（7 处陈旧已实测坐实，可直接修 + 建门禁）——建议最先；
- 症状②③ 的第一档候选同样无前置依赖，可立即起 RFC；
- 症状①（C19）建议**先做一次 notes 存量体检**（把 70 篇按未来决策价值分类：留活跃 /
  归 archived / 该合并 / 该删），体检产出决定 class 层是否真的必要——**参考卷 `01 §6`
  的三结局正好是这次体检的判据表**。

**③ 次序**
- 建议序：**C17+C18（修依据层）** → C3+C4（零成本纪律）→ C2（北星页）→ C10（语义扫描 11 条）
  → C19 notes 存量体检 → 由体检结果决定 C19 是否落 class 层、C1/C7/C8/C9/C11 是否起 RFC。
- 理由：先修"判断依据"再做需要判断的事——否则 C19 的体检会重蹈首轮覆辙（**我首轮就是
  拿一份会漂的登记表当事实源**）。

**④ 放弃出路**
- 若用户认为症状可忍：本卡进 `_postponed_plans/`，复活条件 = 下一次"可控感差"复发且
  能指出具体一处 notes/backlog 失配实例；
- 若只采第一档：本卡按"部分采纳"毕业，第二档逐项另立卡（**不夹带进 Note**）。

**缺什么证据才能判**：
- **C17 缺"34 条 `na` 里有多少条的理由可机械判定失效"**——需要逐条看（本卡已实测 3 条为假、
  估 6–7 条含同族）；这是 C17 能否落地的关键；
- C19 缺"70 篇按三结局分类的实际分布"——没有这个分布，成本估算全是猜；
- C11 缺"近 10 次变更里有多少次真的改了 model-visible 面"——没有这个，假阳风险无法标定；
- C1（覆盖率）缺"client/scripts 纯函数面实际行数占比"。

## 喂给谁

本卡结论将喂给：① 用户裁定（范围门）；② 裁定后各档分别立 `notes/proposed/` RFC + queue 行；
③ C6 体检若做，其产出形态参考 `notes/archived/README.md` 的进门三条件——**体检报告本身
进 `_backlog/reference/`**，不直接改 notes 树（推敲卡规矩：卡载思考、Note 载决定）。

## 二轮复核（2026-10-08，用户要求"再 review 一下"）——自我纠错与升级

首轮报告有三处**我自己的错**，和一处**首轮完全没查到、比原来所有发现都更锋利**的东西。
按本仓纪律（`discipline-map` 是纪律权威正本、`notes/postmortem` 收"到达不该到达的地方"的
事故），以下逐条更正。

### 我错在哪（三处）

| # | 首轮说法 | 事实 | 性质 |
|---|---|---|---|
| 1 | "L3 的最小真检查是 `assert.ok(text.includes('L0 结构面'))`——字面就是字符串在场测试" | **断章取义**。`evaluation.md` §L3 写的最小真检查 = **`design/30` 映射表审查 + `evaluation-contract` 的 keyless 断言**（两件）。我引的那段是**防静默删改合同的守卫**（它的 job 就是"合同被删就红"），不是 L3 的检查本体 | 证据误读——把守卫当成被测物 |
| 2 | "class 层未落是漏做" | **已裁过**：`2026-09-24-note-lifecycle-absorption.md:36-37` 明文否决"吸纳 class 子目录封闭集：否——notes/README.md 差异表既有结论（规模不到，随「dsh-discipline 全量枚举」条目重估），维持" | 漏查既有裁决——违反本仓"取代检查"纪律 |
| 3 | 隐含"notes 分层是我们没想到" | **参照本仓自定的触发模式**：`2026-10-05-test-asset-organization.md:38` 写"不现在建。触发条件 = tests/ 检索开始靠猜或文件数显著上升（**同 vendor notes class 层的既定触发模式**）"。即 class 层是**带触发器的延后决定**，不是遗漏 | 同 2 |

**修正后的 class 层判断**：它**不是"漏做"**，是**声明的延后决定**，且否决句自己写了重估入口
（「dsh-discipline 全量枚举」条目 = 已于 2026-09-24 毕业 = `docs/discipline-map.md`）。
所以正确表述是：**重估入口已经到齐，重估本身没做**。`notes/README.md:91` 的"超过约 50 篇"
与实测 **70 篇** 说明触发条件已满足——**该做的是"按既定触发器重估"，而不是"引入 class 层"**。
这个区别很重要：前者是本仓纪律要求的动作，后者是新提案。

### 首轮完全漏掉的发现（最锋利的一处）

**`docs/discipline-map.md` —— 全仓纪律权威正本 —— 自身在漂移，且无门禁能咬住。**

`discipline-map.md` 是本仓"该遵守什么"的权威正本（`AGENTS.md §纪律` 只留指针）。它的
维护规则（253 行）写明**只随 vendor 换 tag 重校**。但它的行描述的是**本仓自己的落点**，
本仓自己变了它却不跟着变。实测至少 **7 处已陈旧**：

| # | discipline-map 行 | 它说 | 实测事实 |
|---|---|---|---|
| 1 | 源 4（61 行） | `archived/` **暂不设**（无低价值存量） | `notes/archived/` 有 **27 篇** + README（2026-09-27 用户指令启用） |
| 2 | 源 9（175 行） | `snapshots/`（session 回放 fixture）**不适用：无 session 快照测试面** | `snapshot-replay-smoke.mjs`（25 KB）+ `tests/fixtures/snapshot-research-face/` 四角色夹具全在 |
| 3 | 源 2（45 行） | 同一文件里**已经写了** snapshot-replay 三层判据为"带证据适配" | **与第 2 条同一个文件自相矛盾** |
| 4 | 源 4（66 行） | 归档树 append-only hash manifest **不适用** | 随第 1 条一起失效（archived 已引入，虽用单文件+归档行等价形态——该行的"随 archived 引入重估"条件已触发） |
| 5 | alignment-ledger `na` | `.agents/notes/archived/AGENTS.md`：**本仓未引入 archived 冻结层** | 同第 1 条 |
| 6 | alignment-ledger `na` | `docs/cordis-primer.md`：本仓以 cordis 行消费，**不写插件代码** | `src/client/index.ts` 有 7 处 `ctx.`/`effect` 自写 cordis 插件代码；`discipline-map:26` 自己写"**D18 后本仓有自写 cordis 插件代码**" |
| 7 | alignment-ledger `na` | `snapshots/session/**`：本仓**无会话录制夹具面** | 同第 2 条 |

**为什么没有门禁咬住**：`align-ledger` 门禁的实现注释（`verify.mjs:898`）**自己承认**——
"本门禁**只判存在性，不判语义对错**"。它查的是 `vendor/dsh` 里源文件在不在、`na` 有没有
给 reason；**从不检查那个 reason 是否仍然为真**。于是"不适用 + 一个当时为真的理由"成了
**永久免检区**：理由后来变假，门禁依然绿。

**这比首轮报的三条症状更要紧**，理由：`discipline-map` 是**我们判断"什么该做什么不该做"的
依据本身**。依据漂移 ⇒ 后续每一个"参考卷这条我们已登记不适用"的判断都可能建立在假前提上。
本卡 §"逐面 gap 表"里我自己就引用了它（F4/F7/C1 的"不适用（登记）"）——**同一份会漂的资源**。

**这一条同时修正了首轮对 C1（覆盖率）的定性**：我说"`discipline-map:200` 登记不适用，
该重估"——现在看，"登记不适用"这件事本身的**可信度**已被上面 7 处证伪削弱，C1 的重估
优先级应上调，且重估时**不能只信登记行，要重看事实**。

### 复核后新增候选

| 候选 | 动作 | 治哪个 | 代价 |
|---|---|---|---|
| **C17 `na` 理由的活性检查**（**首轮漏掉，建议优先级最高**） | `align-ledger` 扩面：`verdict=na` 的条目带**可机械判定的失效条件**（如"本仓无 X"→ 断言 X 不存在），条件不再成立即红；或至少对 `na` 行加**季度人工复审触发器**（挂 `_backlog/_postponed_plans/` 的 per-run 检查义务模式） | ④ 依据漂移——**根因级** | 中——需给 34 条 `na` 逐条设计失效判据；但这是**唯一能防止"依据静默腐烂"的机制** |
| **C18 discipline-map 与实测的定期对账** | 上条的人读版：升 pin 重校之外，补一条"本仓自身演进也触发重校"（现维护规则只认 vendor 换 tag——**这正是 7 处陈旧的结构原因**） | ④ | 低——改维护规则一句话 + 落一张卡 |
| **C19 重估 class 层**（替换首轮 C6 的错误定性） | 按 `note-lifecycle-absorption` 自己写的入口，正式重估：触发条件实测已满足（70 > 50）；重估对象 = class 层 **vs** 其他分裂轴（按 D 号 / 按子系统）**vs** 维持 | ① | 低（重估本身）→ 中高（若采 class 层） |

### 落地记录（2026-10-08，用户指令"能修的修，能补的补"）

用户当场授权动手，故 C17/C18/C1/C3 及 10 处已证伪登记**已落地**（余项仍按 §毕业门 待裁定）：

| 项 | 落地形态 | 反证 |
|---|---|---|
| **C17** | `align-ledger` 增 `na` 活性依据，**如实分两层**：11 条"目录/文件树缺席即信号"用机械 `liveness`（`absent`/`globAbsent`）；13 条能力面缺席用声明式 `reReviewOn`（一条 glob 无法表达"没有模块实现能力 X"）；两者皆无即红。另防"装饰性断言"（断言=源路径本身） | 六形态注入红→还原绿（含 glob 型、装饰性断言型、能力面两依据皆缺型），`gates-smoke` 加 4 案例（共 14 案例全绿）。**对抗自审打回首版**：首版要求每条都给机械断言，实测造 `src/lib/session-v5.ts` / `lifecycle.ts` 时门禁照旧全绿——即把免检区换了个写法；故改分层，不广告不存在的覆盖 |
| **C18** | `discipline-map` §维护规则 增设"本仓自身演进同样触发重校"（列三类事件）+ "`不适用` 是当时不适用、不是豁免"条款 | 文档变更，随 `md-links`/`md-anchors` 绿 |
| **C1** | `note-format` 增 implemented 证据节断言（恰好 h2 + 证据词族，容忍历史命名变体；**否定式标题判红**——`## 未验证的猜测` 原先因"验证"二字在场而通过） | 注入"改成中性词"与"改成否定式标题"两形态 → 均点名红 → 还原绿。**并抓到 1 处真阳性**：`polish-to-plateau` 的机械绿证据原误置 `## 环境状态`（= Consequences）、已归位 Verification |
| **C3** | `docs/AGENTS.md` §slop 清单 增"单页自足性终检"（只有 HEAD 的读者能否解析每个引用、核实每条主张）——等价 `dsh-trim-cot-leakage` | 文档变更；受 `doc-budgets` 约束（初版超 3 行，按处置序**压缩**而非升顶） |
| **10 处失真登记** | `alignment-ledger` 与 `discipline-map` 修正：archived 层、snapshot 录制夹具、cordis 自写插件、client UI/样式面、capability seam 五族共 10 条 `na` 转为 `adopted`/`adapted` 或改写落点 | `pnpm verify` 全绿 + `pnpm test` 252/252 |

**未落地（仍在 §毕业门 等待裁定）**：C19（class 层重估）、C7（L3 判据重定义）、C8/C9（L4 ④/③
机械面）、C10（高风险扫描 11 条）、C11（recorded-session 义务）、C12（证据审计升级）、C2（北星页）、
C4/C5、C13–C16。**其中 C19 已满足自身触发条件，是下一个该动的。**

### 复核方法（可复核性）

- **实证注入**（全部已还原、`git diff` 干净、verify 复绿）：
  ① 把 `design/30` 映射表**每一行内容换成 `| x | y |`** → `pnpm verify` **全绿**、252 测试 **全过**
  （证明 L3 判据 1"生命周期每环节有落点"**无机械面**——这是我首轮想说但说错了位置的那件事）；
  ② 删掉一篇 Note 的 `## 验证` + `## 环境状态` → **仍全绿**（证明这两节确实零校验，首轮结论成立）；
  ③ 造一份孤儿 RFC 并把它的 slug **只写进 queue.md 的一句散文**（非链接行）→ `proposal-scheduled`
  **PASS**（证明子串测试洞，首轮结论成立）；
- **回归**：`pnpm verify` 全绿 + `pnpm test` 252/252；`git diff HEAD -- notes/ docs/ tests/ scripts/ _backlog/queue.md` 空
  （仅本卡与 plans/README 为新增）；
- **漏读纠正**：首轮**没通读** `docs/discipline-map.md`（253 行）——而它正是本仓纪律权威正本。
  这是首轮方法论上的最大漏洞：**我用本仓自己的标准审本仓，却跳过了那份标准的正本**。

## 附：本次审计的取证方式（可复核）

- 参考卷：`sdlc-reference/` 13 页全文通读（`00-index.md` + `01`–`12` + `README.md`）；
- 本仓门禁：`scripts/verify/verify.mjs` 逐门读（37 门，重点 `note-format` 283–316 /
  `note-graduation-rewrite` 853–893 / `note-status` 818–839 / `proposal-scheduled` 355–371）；
- 本仓证据强度：`docs/evaluation.md` 五面 + `scripts/smoke/*`（8 个）+ `scripts/run-gates/*`（3 个）
  + `tests/*.test.mjs`（25 个）+ `tests/fixtures/`（196 件）逐面抽样读；
- 实测命令：`pnpm verify`（全绿）、`ls notes/implemented/*.md | wc -l`（70）、
  `ls tests/*.test.mjs | wc -l`（25）、`grep -n "归档：" scripts/verify/verify.mjs`（0 命中）；
- 两个只读子代理分别做门禁实现审计与证据强度审计，结论已交叉复核（子代理报"26 个测试"，
  实测 **25**，以实测为准）。
