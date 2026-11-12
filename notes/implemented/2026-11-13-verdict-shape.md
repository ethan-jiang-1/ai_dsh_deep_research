# 判据不猜，投影不编

> 状态：implemented
> 关联：[D51](../../docs/decisions.md#d51)；合同 = [evaluation §判据形状](../../docs/evaluation.md#verdict-shape)；
> 迁移清单与顺序 = [判据形状迁移](../../_backlog/issues/2026-11-13-verdict-shape-migration.md)

## 决定

机器判据（门禁、审计、交付决定）不得用关键词表或装饰启发式在多种读法里挑一个「最像的」。存在互斥候选、
或无法唯一判定，判据给红，并给出可执行的改法；投影层（驾驶舱、仪表盘、回放）读不出，显式写
`unknown` / `unreadable`，不显示一个看起来合理的值。

判据的权威输入是结构化事实：canonical JSON、会话事件、文件事实。散文（review.md、question.md、
leads.md）是人读副本；判据读它只做交叉核对，不一致即红。改造判据不新增兼容分支；历史 bundle 与
之冲突时按清单删除，不为它加 epoch 豁免（既有门的 schema/日期断代 = D33，不在本条范围）。

机械化落在行为上：变异矩阵 + 不变量测试住 `tests/contracts/`（L0），不造 grep 门禁。

## 为什么

三类证据指向同一件事：判据的对象是自然语言，而输入空间由模型每次生成，词表路线没有终点。

**一、同一行修了四轮。** readiness 终局判定走 046 → 074 → 141 → 150；HITL2 拍板行走
075 → 140 → 144/146 → 149 → 156。每轮都是「扩关键词表 / 加窄正则」，下一句自然措辞再开一张卡。
BUG-150 的卡自己写明：「词表路线必然漏同义措辞」。

**二、落地批次仍在扩表。** `4d6308c9` 把 HITL2 的 pending 词表又扩了一轮（等回复、挂起、推迟、暂缓、
未最终、未裁决、on hold 等），readiness 保留「语境关键词」路由。实例被钉住，类没关。

**三、双向都漏。** 当前实现实测：

- 代理记账行 `HITL2 交付审阅 代理模拟：待用户点头` → `isHitl2Row` 返回 **true**（当成拍板，fail-open）；
- 用户真拍板 `HITL2：行，就这么办` / `HITL2：LGTM` / `HITL2 交付审阅：用户说可以` → **false**（误杀）；
- `本轮 readiness: PASS` 单独一行 → 被语境关键词路由采纳为 **PASS**，尽管散文前缀不是装饰、整行不是判定行。

同一函数里代理行还挂着第三套更窄的 pending 正则——三套标准互不一致，正是双份事实漂移的形态。

**四、反面对照：类修复止得住。** Protocol 层早已按同一原则落地——深度集合收成一对编解码函数、
「歧义按 fail-loud 处理，不静默猜」，此后不再复发（[Protocol 审计的单一正本](2026-11-11-protocol-audit-presence-and-depth-codec.md)）。
逐实例补词表止不住，抽共用件 + 歧义即红止得住。

## 输掉的方案

- **继续扩词表**：修得快、假红少，但没有收敛点；每轮都要再买一次同样的债。
- **只补例子测试**：红先只证「这一个例子」，测试集会持续变厚而类不关。
- **全量结构化重写（flag day）**：一次改完手册、skill、模板、快照，风险与收益不匹配；先 fail-closed
  止血，再逐面声明化。
- **给历史 bundle 加 epoch 豁免**：用户 2026-11-13 裁定不做兼容；冲突数据按清单删除，豁免只会把旧口径
  永久养在判据里。
- **造一条 grep 门禁禁止关键词表**：可判的是行为，不是措辞；grep 不出「有没有在猜」，造出来是假门禁。

## 实际跑过的验证

- **readiness 三态**（`terminalVerdictLine`，tsx 直跑）：同行旧引用 + 随后裸写 FAIL → FAIL（074/150 形态已过）；
  `本轮 readiness: PASS；本轮 readiness: FAIL` → `null`（互斥已 fail-closed）；`本轮 readiness: PASS` 单独一行
  → **PASS**（语境关键词路由仍在，是本卡要拆的残余）。
- **HITL2 双向**（`isHitl2Row`，node 直跑）：代理 + 「待用户点头」→ **true**（fail-open）；
  「可以 / 行 / LGTM」三形态 → **false**（误杀）。证据命令与输出留在 [issue](../../_backlog/issues/2026-11-13-verdict-shape-migration.md) §当前情况。
- **基线**：`node scripts/verify/verify.mjs` 全绿；`pnpm test` 1364 通过 / 0 失败（2026-11-13，基线 `4d6308c9`）。
- **落地（Slice A + C，2026-11-13）**：readiness 去关键词与历史词表、互斥读法判 `null`；门③ 决策改事件链
  （`isHitl2Row` 与两张词表删除）；门② 版本配对改读 present；`tests/contracts/verdict-conformance.test.mjs`
  五条不变量 + 生成矩阵。`pnpm test` 1369 通过 / 0 失败、`pnpm verify` 全绿、`pnpm typecheck` 绿。
- **历史语料对账（只读）**：71 个 bundle 中 8 个归档件的 `review.md` 在新判据下读作「无法判定」，0 个
  present 版本落后；无活跃冲突，未删除数据。
- **git 血缘**：`git log --oneline -- _backlog/_archived/fixed_bugs/BUG-{074,141,150}*` 与
  `git show 4d6308c9 -- scripts/lib/node-gate-session-gates.mjs` 可见上述四轮与词表扩张。

## 环境状态

本 Note 只承载决定与证据。逐面迁移的清单、分片与验收标准住 issue；机械把守（变异矩阵 + 不变量测试）
随迁移落 `tests/contracts/`，不另立文档。
