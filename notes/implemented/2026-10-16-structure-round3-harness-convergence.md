# 第三轮结构收敛（round3）：web harness 单一正本 + 小件收口

> 状态：implemented

## 决定

2026-10-16 用户委托的全仓结构评审（结构 / 臃肿 / SOLID 三问）收敛为一张计划卡
（[2026-10-16-structure-round3-convergence](../../_backlog/issues/2026-10-16-structure-round3-convergence.md)；
取代检查已对齐前两轮裁决——[repo-structure-refactor](2026-10-13-repo-structure-refactor.md)（输掉的方案：
`clientHistoryWindowOf` 下沉、`readLog` 换 canonical、内闭包 rpc 硬收敛）与
[verify-domain-regroup](2026-10-13-verify-domain-regroup.md)（`verify.mjs` 拆分重启条件））。
三点已拍板：① Phase B 做 B1+B2 全量、真模型档五站点逐件复跑取证；② `verify.mjs` 不拆（重议条件登记
[triggers](../../_backlog/triggers.md)）；③ hitl-answer 长函数本轮不动。执行纪律 = 每阶段独立 diff →
验收判据全绿 → 报告（实际跑过 / 未跑分列）→ 用户确认 → 才进下一阶段。

**Phase A（本 Note 记录的已交付部分）**：两处**逐字重复**收敛为中立小件，**参数保形、零行为变化**：

1. **`scripts/lib/frontmatter.mjs`**（新）= `splitFrontmatter` 唯一正本。run-dashboard-core 与
   evidence-audit-core 曾各持一份**逐字相同**的实现；evidence-audit 侧当年"独立副本——audit 不依赖
   dashboard 的副作用面"的理由，在两核都纯化为 lib 纯件之后已经失效——中立第三方模块比任一消费方更小。
   契约逐字搬运（按首个 `---` 块拆、扁平 `key: value`、无围栏返回 `fm: null`），不是改写。
2. **`scripts/lib/zstd-read.mjs`**（新）= `readZstdText`，两壳逐字相同的
   `spawnSync('zstd', ['-dc', p], { maxBuffer: 64MB })` 段。**只收敛调用段，不收敛失败契约**：
   node-gate 解压失败按空语料继续（`''`）、evidence-audit 返回 `null` 跳过该文件——这是两壳各自判据的
   载重墙（"缺失偏红" vs "半份语料不得当全份"），失败语义与 stderr 线索留在消费方。

## 输掉的方案

- **evidence-audit 侧保留独立副本**（"不依赖 dashboard 副作用面"）：理由在两核纯化后失效——
  共享件是 `lib/` 里的纯函数，不含任何一方的副作用面；保留副本 = 让逐字重复继续漂移。
- **`readLog` 整体换 canonical `session-log`**：解压通路（zstd CLI 多帧拼接 vs node zlib）与失败契约
  双差异 = 行为变化，超出本轮"零行为"边界（前轮结构评审已裁过，本卡不重开）。
- **把两壳的失败契约也统一**：`''` 与 `null` 各自承载判据语义（继续算 vs 跳过文件），统一即行为变化。
- **`verify.mjs` 文件级拆分 / 域级拆分**：既有裁决维持，重议条件（门禁继续增长 / 追加块编辑摩擦成
  实测痛点）登记进 triggers。
- **内闭包形态 rpc 硬收敛**（cdp-ask / snapshot-replay / run-kickoff）：形态差异非逐字重复，
  与前轮"测试须知模态两处刻意不收敛"同原则。

## 实际跑过的验证

Phase A 验收判据（计划卡 §验收标准 A-1…A-5）逐条：

| # | 判据 | 结果 |
|---|---|---|
| A-1 | `pnpm test` 全绿 | ✓ 468/468（run-dashboard / evidence-audit / node-gate 的 1:1 测试即反证记录） |
| A-2 | `pnpm verify` 全绿 | ✓ 全门禁绿（含 navigability 对账 `scripts/README.md` lib 表两新行） |
| A-3 | 仪表盘零行为 | ✓ `run-dashboard` 对同一 bundle：exit 0 + stdout + HTML **逐字一致**（时间戳归一后） |
| A-4 | node-gate 零行为 | ✓ exit 0 + stdout + `node-gate.md` **逐字一致** |
| A-5 | 审计零行为 | ✓ 内容场 exit 0 逐字一致；红样本（零证据 bundle）维持 **exit 1 + CRITICAL 1**，`audit.md` 逐字一致 |

**零行为比对的做法**（可复跑）：把 Phase A 五个改动 `git stash` 回退到改前态 → 用同一脚本跑三壳并留档
（显式 bundle 路径，避免 `--latest` 随 mtime 漂移）→ `git stash pop` 还原 → 复跑 → 逐文件 diff
（时间戳归一）；stdout / 报告件 / HTML / exit code 全部一致。

**第一次基线的教训（如实记）**：首版基线在 `--latest` 上取，而当日未归档 bundle 被处置移走后
`--latest` 解析目标漂移；且报告件在两次运行之间被重写，导致 node-gate 读数变化——该差异来自
基线顺序而非重构。改用显式路径 + stash A/B 后差异归零。

## 环境状态

- 只动 `scripts/`（两 core 改 import、两壳改调用、README lib 表两行、两个新 lib 件）；无门禁逻辑改动、
  无 pack 行为改动、无凭据面；Phase A 全程 keyless。
- 未跑：Phase B1（web-harness 单一正本 + keyless 三站点）与 B2（真模型档五站点）、Phase D（触发登记）
  ——按计划等用户逐阶段发令；B2 与主线真模型段排开跑。

## 顺带修复与两条实测发现（处置工作的副产物，2026-10-16）

B1 的**改前基线**要三站点先绿，跑基线时暴露两件事——都不是 B1 引入的，但都由当日处置工作触发：

1. **位置=状态是三个位置，工具面要认第三处**。未交付 bundle 迁入 `research-workspace/_abandoned/`
   后：`client-load-reference.mjs` 的绑定 bundle 解析（原两处：根 / archive）找不到会话绑定的 run
   → 观察面冒烟的"磁盘侧真值"前置直接判缺；驾驶舱 `ResearchStatusTab.tsx` 同款两处列表则让
   **UI 侧**读不到 bundle（渐进面凭空消失）。两处同 diff 补第三位置（`_abandoned/` 末位：根 > archive >
   _abandoned 的优先级不变）。**判据**：补后 client-load 的 6 条渐进面对账（轨道/证据计数/问题行/业务摘要）
   从红转绿。
2. **手册是模型可见输入——改它就要真模型重录**。给手册加 `_abandoned/` 目录约定后，
   `snapshot-replay` 的 B 层 `agent-instructions` 四角色全红（录制件里存的是旧手册全文，diff 首个分歧
   正是被改写的行）。正本程序 = 重录该场景（真模型档）+ 人审登记 `source` 身份（`snapshots/README` §维护）。
   **本轮改走另一条**：把约定落在工作区规则文件 `.gitignore.example`（不进会话、不影响录制基线）+
   停放区 README + 处置卡，手册回退到与录制件一致的字节。理由 = 研究角色**不接触**停放区（它是操作侧
   区域，`_abandoned/` 的存在语义是"不在流水线里"），一条不影响模型行为的约定不值得一次真模型重录。
   **遗留触发**：下次因别的原因重录 fixture 时，顺带把手册的目录约定与 `web-only 语料` 措辞
   （BUG-029 后应为"取回语料"）一起同步进手册。

## 未跑与阻断（如实分列）

- **B1 三个站点的改前基线**：`preset-smoke` ALL PASS ✓、`snapshot-replay`（修副产物后）ALL PASS ✓、
  `client-load` 曾 1 条红 → **已诊断并修断言**，现 **ALL PASS**（B1-2/B1-3/B1-4 三站点基线全绿）。
  那条红 = `研究配置编辑态：四分区草稿预填 + 单保存钮在场（textarea 5 区）`：临时诊断打印五个
  textarea 的可见性与值 → **#1–#4 正是四分区且逐字预填**、#0 是一个**空的、Modal 之外**的
  textarea（页面级，非本包渲染——本包 client 只有两处 `<textarea>` JSX：分区草稿与旧正文块）。
  即**产品行为正确、断言错**：判据用未限域的 `page.locator('textarea')` 计数，页面多一个 textarea
  就红。**修复** = 三处 textarea 断言锚到 Modal（`[role="dialog"] textarea`）——意图不变（两条旧正文
  用例仍断言"Modal 内 5 区"），去掉的是与判据无关的页面级耦合。
- **B1（web-harness 单一正本）**：三站点**已迁移**（每站点独立 diff）——`preset-smoke` ALL PASS、
  `client-load-smoke` ALL PASS（42 条）、`snapshot-replay-smoke` 除下述**既有间歇**外全绿。
  参数保形原值：preset `smoke-`/15s AbortSignal/200 截断/组杀+收端口；client-load `cls-`/**无**超时/
  全角冒号文案/非 detached；snapshot-replay 内层 rpc **刻意不收敛**（闭包形态 `(endpoint, args)`，
  与 makeRpc 的 `(base, cookie, endpoint, args)` 不同形——硬收敛即行为改写）。
- **`snapshot-replay` 的 C5 是既有间歇**（非本轮引入）：迁移版 4 跑 1 绿，**未迁移的对照脚本 2 跑 1 绿 1 红**
  ——同机同客户端对照即复现；形态 = 活动行少一行（2→1），卡片部分一致。已立
  [BUG-030](../../_backlog/bugs/BUG-030-snapshot-replay-c5-activity-row-flicker-recurrence.md)（P2，排查中；
  按"已修永不重开、复发 = 引用旧卡的新卡"引用 BUG-027），假设 = C0b 就绪谓词覆盖面 < 断言面
  （只等 tool/call，不等 assistant 文本折出的活动行）。
- **Phase D（触发登记）**：**已交付**——[triggers](../../_backlog/triggers.md) 新增两行（`verify.mjs` 拆分重议、
  `tests/` 分域），每行带**可观察**的重议条件与决定正本链接（D-1：`pnpm verify` 绿 + md-links 把守链接）。
- **B2（真模型档五站点）**：未开始——`l4-lite-smoke` / `team-preflight-smoke` / `client-hitl-smoke` /
  `discipline-probe` / `entry-chain-probe` 的 harness 收敛 + `session-log` canonical 化需逐件真跑取证，
  与主线真模型段排开（本阶段申报的判据变更：解压通路 zstd CLI → node zlib，同输出不同路）。
