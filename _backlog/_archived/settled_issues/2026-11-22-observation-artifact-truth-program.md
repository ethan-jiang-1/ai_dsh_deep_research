---
status: 已结
opened: 2026-11-22
---

# 观察面工件真实性修复程序：BUG-361…368 的次序、流程与系统修法

> 立卡：2026-11-22 ｜ 状态：已结 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：是
> 结论：八卡已修归档（361–368）；批 Note = [2026-11-22-observation-artifact-truth](../../../notes/implemented/2026-11-22-observation-artifact-truth.md)。
> 去向：implemented — [2026-11-22-observation-artifact-truth](../../../notes/implemented/2026-11-22-observation-artifact-truth.md)
> 对象：8 张活跃 P2 卡（361–368），全部真浏览器已复现；现场 = `runtime/e2e/*verdict.json` + `*.png`（gitignored）。
> 上一批 = [观察面真实性 Note](../../../notes/implemented/2026-11-22-observation-truthfulness.md) · [修复程序卡](../settled_issues/2026-11-22-observation-truthfulness-program.md)；
> 本批是同一观察面的**第三批**（351–355、356–360 之后）。
> 方法 = [bug-to-fix §2 批模式](../../methods/bug-to-fix.md)；状态机 = [bugs/README](../../bugs/README.md)；证据主人 = [guides/60](../../../docs/guides/60-dev-loop.md)。

## 0. 结论

1. 8 张卡不是 8 个孤立字符串 bug，是上一批事实模型的**三个残留面**：
   - **F1 空文件不是状态**（364/365/366/367）：`ArtifactRead` 只有 `ok | absent | unreadable`，0 字节
     canonical 工件在 IO 层是 `ok`，于是「空」被当成有效正文/有效审查/有效问题。缺的是 `empty`。
   - **F2 事实清单没闭合**（361/362/363/368）：question / delivered.json / review/readiness.json /
     final reader 四个读取点从未进入上一批的 `StatusReads`/终稿状态模型；读失败被折成
     「尚未定稿」「交付未见证」「prose PASS ✓ 审查」或无提示回退。
   - **F3 回退不可见**（364/365/368）：读者版空/读不到时静默换审计版；审计正文空时渲染空白；
     回退/空态没有一行提示，用户无法知道「看到的不是默认那份」。
2. **系统修法**：把所有观察面工件读取收进一个纯核 —— `ArtifactRead` 五态
   （`ok | absent | unreadable | empty | invalid`）+ 工件策略表（文本/JSON、是否必须非空）+ 一个
   `readArtifact` 读取器。状态页与终稿页签只消费事实；新增读取点必须走同一个读取器
   （源级守卫：不再允许裸 `view.read`）。终稿另有 `finalViewOf` 真值表（正文 × 读者版 × 回退提示），
   审查另有 `reviewVerdict`（声明/散文/缺席/未定），回执另有 `receiptState`（ok/缺席/读失败/空/非法）。
3. **次序 = 证据 → 共用工件状态核 → 终稿三卡 → 状态五卡 → 收口**。不按 BUG 号逐张修：
   终稿三卡共享 `ResearchFinalTab`/`finalTargetOf`，状态五卡共享 `useStatusFeed`/`brief-fold`；
   共用核先落，两个簇各一次设计。
4. **流程保障**：G1–G16 继承；新增 G17 非空 canonical 工件、G18 回退必须可见、G19 读取点收口 +
   源级清单守卫、G20「同一类第三次出现后不再做卡片驱动的有界扫描」。上一批的 G12 只是计划表，
   本批把它变成机械事实清单。
5. 预算约 4–5 个会话；浏览器入口按 550 行 CAP 拆成两条（旧五场景 + 新九场景），不申请例外。

## 1. 事实基线（2026-11-22，HEAD `9ea5dfce`）

| 项 | 事实 |
|---|---|
| 活跃卡 | **8 张**：361/362/363/364/365/366/367/368，全 `排查中`、P2 |
| 上一批 | 356–360 已修归档；`cockpit-truth.entry` 五场景 **24/24**；`SourceRead` = ok/absent/unreadable；`StatusReads` 只含 bundle/review/evidence |
| 本批现场 | 第四轮 E2E J30–J37 全 FAIL；夹具 = `status-fixture-e2e.mjs`（question/receipt/readiness）、`status-readiness-missing-e2e.mjs`、`review-empty-e2e.mjs`、`status-question-empty-e2e.mjs`、`final-empty-e2e.mjs`、`final-reader-empty-e2e.mjs`、`final-reader-unreadable-e2e.mjs` |
| 机械面 | 立卡时实测：`pnpm verify` 全绿；`pnpm test` 266 checks 全绿（零 skip）；工作树干净 |
| 守卫容量 | `cockpit-truth.entry.mjs` 357 行；`script-file-size` CAP = 550；本批 9 个新场景不能塞进同一条入口 |
| 关键现状 | `useStatusFeed` 的 question/receipt/readiness 只判 `read.ok`；`ResearchFinalTab` 的 body/reader 只判 `read.ok`；`readinessOfSources` 的 `missing/invalid/mismatch/ambiguous` 被 `useStatusFeed` 折成 `null`；`finalTargetOf` 只解决版本身份，不解决内容空/坏 |

## 2. 系统视角：一张完整事实表 + 三个残留面 + 一条流程缺陷

### 2.1 页面显示的全部事实（本批要闭合的清单）

| 事实 | 读取源 | 现折成 | 应有状态 | 卡 |
|---|---|---|---|---|
| 本场 bundle 可读 | `openRun` | `!ok` → 进度 | `ok/absent/unreadable`（上一批已修） | 358 |
| 研究问题 | `read('question.md')` | 读失败/空 → `null` → 「尚未定稿」 | `ok/absent/unreadable/empty`；立项步只认 ok | 361/367 |
| 审查散文 | `read('review.md')` | 空 → absent/✓ | `ok/absent/unreadable/empty`；步认终局判定 | 366（+359） |
| 结构化审查声明 | `read('review/readiness.json')` | 缺席/坏 → `null` → prose PASS ✓ | `ok/absent/unreadable/empty/invalid` + `reviewVerdict` | 363 |
| 证据 | `list('evidence')` | `!ok` → 0 | `ok/absent/unreadable`（上一批已修） | 360 |
| 交付回执 | `read('delivered.json')` | 读失败/空/坏 JSON/异形 → `null` → 「未见证」 | `ok/absent/unreadable/empty/invalid`；只有 ok 出交付 | 362 |
| 终稿正文 | `read(target.audit)` | 空 → 空白渲染 | `ok/absent/unreadable/empty` | 365 |
| 终稿读者版 | `read(target.reader)` | 空/读失败 → `null` → 静默审计 | `ok/absent/unreadable/empty` + 回退提示 | 364/368 |
| 版本账 | `list('final')` | `!ok` → 0 版本 | `ok/absent/unreadable`（本批清单登记；是否建卡见 §2.5） | 潜在 |
| plan.md | `read('plan.md')` | 读失败 → 版本面 null | `ok/absent/unreadable`（本批清单登记；是否建卡见 §2.5） | 潜在 |

### 2.2 上一批为什么没覆盖

1. **状态只到 IO 层**：`readStateOf(outcome)` 只看 `ok/reason`，不看内容。0 字节文件 `ok=true`，
   于是空正文、空 review、空 question 都是「有效事实」。上一批的 `ok|absent|unreadable` 缺 `empty`。
2. **清单只到上一批的卡**：上一批把 bundle/review/evidence 三件收进 `StatusReads`，但没有把
   question/receipt/readiness/final body/final reader 纳入；这些读取点仍各自折平。
3. **读取没有唯一入口**：`useStatusFeed` 与 `ResearchFinalTab` 各自直接 `view.read`；新读取点
   不需要登记状态，也不会被任何测试发现。上一批的 G12 是计划表，不是机械收口。
4. **回退没有语义**：终稿读者版失败/空时直接 `readerText=null`，默认回退审计；这不是「没有读者版」，
   但 UI 无法区分。上一批只修了「地址目标版本」，没修「内容空/坏」和「回退可见」。
5. **审查判据只认两个 source**：`readinessOfSources` 有 `missing/invalid/mismatch/ambiguous`，
   `useStatusFeed` 只收 `declaration|prose`，其余落 `null`，步骤条又用 `reviewState==='ok'` 判 done。

### 2.3 三个失败面 + 一条流程缺陷

- **F1 空/非法内容不是状态**（364/365/366/367）：需要 `empty`（0 字节/纯空白）与 `invalid`
  （JSON 坏/形状非法，主要归回执与声明）两个内容态；空 ≠ 缺席 ≠ 读失败。
- **F2 未登记读取点**（361/362/363/368）：question、回执、结构化声明、终稿读者版四处从未进入
  事实模型；其中 363 还是**判据来源**问题（结构化声明缺席被 prose PASS 顶替），不只是读失败。
- **F3 回退不可见**（364/365/368）：reader→audit、audit→reader 的互补回退本身可以接受，
  但必须有一行提示；两边都坏/空时必须是失败/空态，而不是空白正文。
- **C4 流程**：同一观察面第三批仍由卡片驱动有界扫描；上一批的 `G12` 没有机械面。
  本批若再按卡片逐张修，下一批还会从另一个读取点漏出来。

### 2.4 类级修法

1. **一个工件读取器**（新纯件 `lib/run/artifact-read.ts`，client 面；由 `useStatusFeed` 与
   `ResearchFinalTab` 共用）：
   - `ArtifactState = 'ok' | 'absent' | 'unreadable' | 'empty' | 'invalid'`；
   - `ARTIFACT_POLICY`：question/review/readiness/receipt/final body/final reader 的文本/JSON、
     是否必须非空、是否允许 truncated；evidence 目录与 bundle 不是文本工件，走原 `readStateOf`；
   - `artifactStateOf(outcome, policy)`（纯，矩阵测试）与 `readArtifact(view, name)`（异步读取，
     内部统一 `view.read`）；
   - 源级守卫：`useStatusFeed.ts` / `ResearchFinalTab.tsx` 不得再出现裸 `view.read(` / `viewIo.read(`；
     新增读取点必须走 `readArtifact` 并在 policy 表登记（G19）。
2. **完整事实清单**：`StatusReads` 扩为 bundle/question/review/readiness/evidence/receipt；
   终稿用 `FinalContent = { body, reader }`。每个事实一个状态行，每个状态行至少一个纯测试 +
   一个浏览器场景（或明确 `notMechanizable` + trigger）。
3. **审查判定收口**：`reviewVerdict = 'pass' | 'fail' | 'unconfirmed' | 'absent'`。
   `readinessOfSources` 的 `declaration|prose` 且有 boolean → pass/fail；`missing|invalid|mismatch|
   ambiguous` → unconfirmed（可行动提示）；无 review 面 → absent（BUG-347 语义）。步骤条 review
   只在 pass/fail 时 done；absent 维持既有「步骤照常」；unconfirmed → `unknown`。
4. **回执状态收口**：`receiptState = ok | absent | unreadable | empty | invalid`。只有 ok 且
   `deliveryFromReceipt` 通过才出交付；unreadable/empty/invalid → 「交付回执读取失败/不合法」+ 重试；
   absent + 窗口无 present → 「交付未见证」（既有语义）；旧 install-only 形状 → invalid，
   不冒充已交付（BUG-345 负控）。
5. **终稿视图矩阵**：`finalViewOf({ body, reader, requestedView })` → `{ view, text, notice, failure }`。
   - reader ok → reader；reader empty/unreadable + body ok → audit + notice（空/失败分别措辞）；
   - body empty/unreadable + reader ok → reader + notice；两边都不可用 → 失败/空态；
   - 任何互补回退都有一条可见提示；跨版本绝不回退（356 已定）。
6. **流程机械面**：
   - **G17** 非空 canonical 工件策略（question/review/readiness/receipt/final body/reader）；
   - **G18** 回退/空态必须可见；
   - **G19** 读取点唯一入口 + 源级清单守卫；
   - **G20** 同一类第三次出现后，先闭合事实清单与机械入口，不再按卡片做有界扫描。

### 2.5 清单可能牵出的潜在读取点（不静默吸收）

`final/` 目录 list 失败、`plan.md` 读失败、终稿页签 `review.md` 读失败是清单里的潜在行。
P0 逐行判：若造成用户可见失真 → 新卡（编号续 369+）；若不可达/无消费者 → 记 `none — 原因`，
不并入本批八卡。**不为凑数建卡，也不静默漏掉**。

## 方案与取舍

| 选项 | 判定 | 理由 |
|---|---|---|
| 统一工件读取器 + 五态 + 完整清单 | **选** | 终稿与状态共用同一内容有效性；读取点收口后新读取点无法再静默折平；G17–G20 可机械守 |
| 继续在 `brief-fold` 里加第三态 | 不选 | 上一批已经这么做；终稿页签不消费它，状态与终稿会各造一套，第三批之后仍会漏 |
| 逐卡补字符串/逐卡加分支 | 不选 | 终稿三卡共享 `ResearchFinalTab`，状态五卡共享 `useStatusFeed`；按号修会二次改同一路径，且不解决读取点收口 |
| 把空文件当 `absent` | 不选 | 空 ≠ 缺席：空是「工件在但没内容」，缺席是「没有这个工件」；两者的用户措辞与修复动作不同 |
| 把空文件当 `unreadable` | 不选 | 空不是 IO 失败；混在一起会让「重试」变成无效动作 |
| 一条大浏览器入口塞 14 场景 | 不选 | 旧入口已 357 行，CAP = 550；拆两条入口，不申请例外 |
| 修所有 reader（图谱/方法库/配置） | 不选 | 各有既有守卫（355/045 等）；本批只闭合状态页 + 终稿页签事实清单，超界另立卡 |
| 为旧 bundle 加兼容 | 不选 | 沿用「不做旧产物兼容」；旧 bundle 的数据不迁移，观察面只如实说读不到/空/非法 |

## 3. 卡 → 修点 → 守卫

| 卡 | 机制 | 修点（落层） | 同边界守卫 | 浏览器场景 |
|---|---|---|---|---|
| 361 | question 读失败折成「尚未定稿」 | `artifact-read` + `useStatusFeed`（question 状态）+ `brief-fold`（question issue）+ `run-fold`（立项步只认 ok）+ 文案 | `artifact-read.spec` question 矩阵；`brief-fold.spec`；`run-fold.spec`；`status-feed.spec` 接线 | S6 question 不可读 |
| 362 | 回执读失败/畸形折成「未见证」 | `artifact-read`（receipt JSON）+ `useStatusFeed`（receiptState/交付警告）+ `brief-fold`（回执 issue）+ 文案 | `artifact-read.spec` receipt 矩阵；`deliveryFromReceipt` 负控；`brief-fold.spec` | S7 回执不可读（移除 present） |
| 363 | readiness 缺席/坏被 prose PASS 顶替 | `useStatusFeed`（readiness 状态 + `reviewVerdict`）+ `review-readiness` 全 source 映射 + `run-fold`（review unconfirmed → unknown）+ 文案 | `review-readiness.spec` 全 source；`brief-fold.spec` unconfirmed；`run-fold.spec` | S8 缺席 / S9 不可读 |
| 364 | 空读者版显示空白 | `finalViewOf`（reader empty → audit + notice）+ `ResearchFinalTab` 接线 + 文案 | `final-view.spec` 4×4 矩阵；`final-target.spec` 地址矩阵不回退 | S10 空读者版 |
| 365 | 空终稿正文渲染空白 | `finalViewOf`（body empty → 空态；有 reader 则 reader + notice）+ `ResearchFinalTab` + 文案 | `final-view.spec`；`final-target.spec` | S11 空正文 |
| 366 | 空 review.md 仍 ✓ 审查 | `artifact-read`（review empty）+ `useStatusFeed`（review 状态）+ `reviewVerdict`（empty = unconfirmed）+ `run-fold` + 文案 | `artifact-read.spec`；`brief-fold.spec`；`run-fold.spec` | S12 空 review |
| 367 | 空 question 仍「尚未定稿」+✓ 立项 | 同 361（question empty 分支）+ 文案 | 同 361 | S13 空 question |
| 368 | 读者版读失败静默回退 | `finalViewOf`（reader unreadable → audit + notice + retry）+ `ResearchFinalTab` + 文案 | `final-view.spec`；`final-target.spec` | S14 读者版不可读 |

**共享守卫不替代单卡 case**：`artifact-read.spec` / `final-view.spec` 的矩阵之外，每卡在自己的
场景里有独立断言名（S6…S14），`fix-evidence` 的 `red.output` 点名该卡。

## 4. 修复次序（五个阶段；不按 BUG 号逐张修）

### P0 再就绪与证据升格（≈0.5 会话，不写生产代码）

1. 逐条复跑 §7 红命令（361–368；363 跑缺席 + 不可读两条），记录当前 verdict；确认 HEAD 仍红。
2. 八卡补 `## 分诊与授权` / `## 批` / `根因证据`；`## 修复判据` 非空；翻 `修复就绪`；`pnpm verify`。
3. **守卫载体**：新入口 `checks/smoke/cockpit-artifact-truth.entry.mjs`（S6–S14，dev-only，keyless，
   真浏览器），旧 `cockpit-truth.entry.mjs`（S1–S5）保持不动；两条入口都按 `scripts-file-size` CAP
   控制（>550 行就按场景组再拆，不申请例外）。可提取共享 seed/boot/page helper 为
   `cockpit-truth.support.mjs`（support lane，`none:` oracle 有理由）；登记 registry + checks README。
4. 填 §7 批表；更新 [bugs/README](../../bugs/README.md) 的活跃表与计划行、[issues/README](../../issues/README.md)；`pnpm verify`。
5. 退出：八卡 `修复就绪`；守卫入口/场景表已定；`pnpm test` 基线绿；§2.5 潜在行有处置。

### P1 共用工件状态核（≈1 会话，无用户可见行为变化）

- 落 `lib/run/artifact-read.ts`：五态、`ARTIFACT_POLICY`、`artifactStateOf`、`readArtifact`；
  把 `brief-fold` 的 `SourceRead/readStateOf` 与 `useStatusFeed`/`ResearchFinalTab` 的裸读迁移到
  新入口；`finalReadPlan`/`finalTargetOf` 只保留地址/版本职责。
- 源级守卫：两个消费文件不得出现裸 `view.read(` / `viewIo.read(`；policy 表覆盖当前全部读取点名。
- 测试：`artifact-read.spec`（outcome × 空/非空/truncated/JSON 坏 × 六类工件）；
  迁移后旧 `cockpit-truth.entry` **24/24 必须仍绿**（回归）。
- 退出：共用核在树内；旧五场景绿；新九场景尚未要求绿（P2/P3 逐卡转绿）。

### P2 终稿三卡（364/365/368，≈1.5 会话）

1. `finalViewOf` 真值表（body/reader × ok/absent/unreadable/empty/invalid；requested view）×
   `ResearchFinalTab` 接线：空读者版→审计+提示；空正文→空态（有 reader 则 reader+提示）；
   读者版读失败→审计+失败提示+重试；两边不可用→失败/空态。
2. 每卡红→绿→`fix-evidence`；新入口 S10/S11/S14；旧 S1/S1b 回归（356 地址目标不回退）。
3. 退出：三卡 `修复落地`；`final-view.spec` 矩阵绿；新入口 S10/S11/S14 绿。

### P3 状态五卡（361/367 → 363/366 → 362，≈2 会话）

1. **question**（361/367）：question 状态 ok/absent/unreadable/empty；立项步只认 ok；
   摘要/页面在 empty/unreadable 时显式「研究问题为空/读取失败」+ 重试；absent 保留「尚未定稿」；S6/S13。
2. **review/readiness**（363/366）：`readinessOfSources` 全 source → `reviewVerdict`；
   missing/invalid/mismatch/ambiguous → unconfirmed（可行动提示），empty/unreadable → unconfirmed；
   step review 只在 pass/fail done；S8/S9/S12。
3. **receipt**（362）：receiptState 五态；只有 ok 出交付；unreadable/empty/invalid → 回执失败/不合法 +
   重试；absent + 无 present → 未见证；旧 install-only → invalid 不冒充；S7。
4. 每卡红→绿→`fix-evidence`；卡 `修复落地`；旧 S2–S5 回归（357/358/359/360 不回退）。
5. 退出：五卡 `修复落地`；新入口九场景全绿；旧入口 24/24 仍绿。

### P4 收口（≈0.5 会话）

1. `pnpm verify` / `pnpm test` / `pnpm typecheck` / `pnpm build`；旧入口 24/24 + 新入口 S6–S14 全绿。
2. `reviewing-a-delivery` 语义自审；`changing-ui-copy` 复核 zh/en；docs/design/40 补五态/回退/
   question/receipt/readiness 事实；guides/60 + evaluation + checks README 登记新入口。
3. 批 Note（决定/输掉的方案/验证/判据形状/未证边界）；八卡 `fix-evidence` + `git mv` fixed 池；
   `bugs/README` 活跃/最近归档；程序卡 `已结` 归档；`issues/README`；`triggers.md`。
4. 同变更跑 `pnpm verify`，`staged-change-pairing` 过；收口。

### 为什么是这个次序

| 选择 | 理由 |
|---|---|
| P0 先做 | 八卡有现场但无「根因证据/可重放命令」的完整翻转；不先做就是读码即就绪 |
| P1 共用核先于两个簇 | 否则终稿与状态各造一套 empty/read 状态，第三批之后还会从第三个读取点漏 |
| P2 终稿先于 P3 状态 | 终稿三卡自足、共享 `finalViewOf`，是空/回退语义的最小完整证明；状态五卡还要接 `readinessOfSources`/步骤真相，风险更大 |
| P3 内 question → review/readiness → receipt | question 最简（读 + 空）；review 要接判据 source 与步骤；receipt 要接 JSON/旧形状负控 |
| 不按 BUG 号 | 终稿三卡共享 `ResearchFinalTab`，状态五卡共享 `useStatusFeed`；按号修会二次改同一路径 |
| 浏览器入口拆两条 | 旧 357 行 + 新 9 场景超 550 CAP；CAP 是守卫，不申请例外 |

## 5. 流程保障

### 5.1 继承上一批 G1–G16

G1 批表填满才开工 · G2 `修复就绪` 带可重放命令/未复现协议 · G3 每卡一案 · G4 红先绿后、`exit` 为 oracle ·
G5 一簇一提交序列、WIP=1 · G6 技术决定自定、阶段边界报告 · G7 验收阶梯 · G8 审查分层 ·
G9 真实产物夹具 · G10 同一事实同一输入集 · G11 时间谓词有推进面 · G12 按显示事实登记 ·
G13 消费者边界守卫 · G14 真值表 · G15 地址身份 · G16 旧测试显式取代。

### 5.2 本批新增 G17–G20

| # | 保障 | 落点 | 防的是什么 |
|---|---|---|---|
| **G17** | **非空 canonical 工件**：question/review/readiness/receipt/final body/reader 的 `empty` 独立成态；0 字节/纯空白不得当 `ok` | `artifact-read.ts` 的 `ARTIFACT_POLICY` + `artifact-read.spec` | 364/365/366/367 的空白/假绿 |
| **G18** | **回退/空态必须可见**：reader↔audit 互补回退、空正文、坏读者版都要有提示或失败态 | `finalViewOf` 矩阵 + 浏览器 S10/S11/S14 | 364/368 的静默降级、365 的空白 |
| **G19** | **读取点收口**：状态页/终稿页签不得裸 `view.read`；新增读取点必须走 `readArtifact` 并在 policy 表登记；源级守卫扫消费文件 | `artifact-read.ts` + `status-feed.spec` 源级断言 | 361/362/363/368 的未登记读取点 |
| **G20** | **第三次复发规则**：同一观察面类第三次出现，先闭合完整事实清单与机械入口，再逐卡修；不再做卡片驱动的有界扫描 | 本卡 §2.1 + P1 | 下一批再从第五个读取点漏出 |

### 5.3 每卡 DoD（同上一批，逐卡打勾）

1. `修复就绪`：根因证据 + 修法 + 非空 `## 修复判据` + 可重放命令 + `## 分诊与授权`/`## 批`。
2. 红：同边界新用例在旧实现上 `exit≠0`，红因正确；记录命令与输出。
3. 绿：同一命令 `exit 0`；邻接/负控同跑。
4. guard：提交物在树内、同边界、能在回归上红；`guard.path` 或 `notMechanizable` + trigger。
5. `fix-evidence`：`changes` 含代码 + 测试/门禁资产；`red.exit≠0`；`green.exit=0`；`guard` 非空。
6. 卡 `修复落地`：`pnpm verify` 过 `backlog-liveness`；卡与代码/测试同暂存集。
7. 语义自审：跨面 diff 跑 `reviewing-a-delivery`；跳过记理由。
8. 归档：`已修` + `git mv` + README + Note + trigger 同变更；`可关闭：是`。

### 5.4 命令

```sh
pnpm verify
pnpm test
pnpm typecheck
pnpm build
# 旧五场景回归
node --import tsx/esm checks/smoke/cockpit-truth.entry.mjs
# 新九场景（P0 建；示例）
node --import tsx/esm checks/smoke/cockpit-artifact-truth.entry.mjs
node --import tsx/esm checks/smoke/cockpit-artifact-truth.entry.mjs --scenario S10
# 定向纯件
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm --test tests/cockpit/lib/run/artifact-read.spec.mjs tests/cockpit/lib/run/final-view.spec.mjs
```

### 5.5 技能与登记

- 用户可见文案：`changing-ui-copy`（zh/en 同 diff；chrome 住 `zh/en`，折叠文案住 `zh-fold/en-fold`）。
- 新增 smoke/门禁：`writing-a-gate`（先看红、registry/README、oracle/sunset、CAP）。
- 交付前：`reviewing-a-delivery`（语义自审，不替代机械门禁）。
- 新增 `src/lib` 纯件：`faces.json` + 直测（`pack src/lib 每个纯件被直接 import` 检查会红）。

## 判据形状

- **权威事实**：工件读取只认 `readArtifact` 的 `ArtifactState`（ok/absent/unreadable/empty/invalid）；
  `artifactStateOf` 是唯一映射；审查终局只认 `readinessOfSources` 的 source + boolean；
  交付只认 `present` ∨ `ok` 回执（`deliveryFromReceipt` 形状校验）；终稿目标只认地址。
- **读取方**：`useStatusFeed`（StatusReads）、`deriveBusinessBrief`（question/review/receipt issue）、
  `deriveSteps`/`TrackRail`（question/review unknown）、`ResearchFinalTab`/`finalViewOf`、
  两条浏览器入口、纯函数矩阵。
- **坏输入**：question/review/readiness/receipt/final body/reader 的 `absent`（真没有）、`unreadable`
  （IO/权限/truncated）、`empty`（0 字节/纯空白）、`invalid`（JSON 坏/形状非法）必须分开；
  `reviewVerdict` 的 pass/fail/unconfirmed/absent 必须分开；读者版/审计版的互补回退必须有提示；
  已交付 + 审查 unconfirmed 不得显示 ✓ 审查，也不得把交付徽标改成「未交付」。
- **旧形态退场**：`readStateOf` 的三态不再承担文本工件；`useStatusFeed` 的「只认 declaration/prose」
  退场；`ResearchFinalTab` 的 `readerText !== null` 判有效读者版退场；旧 install-only 回执仍 invalid。
- **反证**：`artifact-read.spec` 的 outcome × 内容矩阵；`final-view.spec` 的 body×reader×view 矩阵；
  `brief-fold.spec` 的 question/review/receipt 组合；浏览器 S6–S14 的「该出现/不该出现」双断言；
  P1 后旧 S1–S5 必须仍绿（回归反证）。

## 批表（P0 开工前填满）

| 卡 | 边界 / 红命令（同边界） | 共享 owner | guard | 处置 |
|---|---|---|---|---|
| 361 | `node --import tsx/esm runtime/e2e/status-fixture-e2e.mjs question` → `failureShown:false` +「尚未定稿」 | `useStatusFeed` / `brief-fold` / `run-fold` | `artifact-read.spec` + `brief-fold.spec` + S6 | 修 |
| 362 | `node --import tsx/esm runtime/e2e/status-fixture-e2e.mjs receipt` → `delivered:false` +「交付未见证」 | `useStatusFeed` / receipt | `artifact-read.spec` + `deliveryFromReceipt` 负控 + S7 | 修 |
| 363 | `... status-fixture-e2e.mjs readiness` + `... status-readiness-missing-e2e.mjs readiness` → `reviewFail:false` + ✓ 审查 | `review-readiness` / `useStatusFeed` / `run-fold` | `review-readiness.spec` + `brief-fold.spec` + S8/S9 | 修 |
| 364 | `node --import tsx/esm runtime/e2e/final-reader-empty-e2e.mjs` → 空白读者版 | `finalViewOf` / `ResearchFinalTab` | `final-view.spec` + S10 | 修 |
| 365 | `node --import tsx/esm runtime/e2e/final-empty-e2e.mjs` → 空白正文 | `finalViewOf` / `ResearchFinalTab` | `final-view.spec` + S11 | 修 |
| 366 | `node --import tsx/esm runtime/e2e/review-empty-e2e.mjs` → `reviewDone:true` | `useStatusFeed` / `reviewVerdict` | `artifact-read.spec` + S12 | 修 |
| 367 | `node --import tsx/esm runtime/e2e/status-question-empty-e2e.mjs question` →「尚未定稿」+✓ 立项 | `useStatusFeed` / `brief-fold` / `run-fold` | `artifact-read.spec` + S13 | 修 |
| 368 | `node --import tsx/esm runtime/e2e/final-reader-unreadable-e2e.mjs` → `failureShown:false` | `finalViewOf` / `ResearchFinalTab` | `final-view.spec` + S14 | 修 |

> runtime 夹具是诊断现场，不是最终 guard；P0/P1 升格为新入口场景后，卡内 `fix-evidence.red`
> 用升格后的同边界命令（或运行时命令 + `changes` 含测试/门禁资产，按方法 §7 记录读法协议）。

## 验收标准

1. **八卡全部 `已修` 归档**，每卡 `json fix-evidence` 的 `changes` 含代码 + 提交的守卫资产，
   `red.exit≠0`、`green.exit=0`、`guard` 与缺陷同边界；每卡用例名带 BUG 号。
2. **共用核**：`artifact-read.ts` 五态 + policy 表在树内；状态页/终稿页签零裸 `view.read`；
   新读取点必须走 `readArtifact` 并在 policy 表登记（源级守卫绿）；旧五场景 24/24 仍绿。
3. **F1**：空 question/review/final body/reader 不再当有效内容；对应页面显示「为空/读取失败」
   或可见回退提示；非空正向不回退。
4. **F2**：question 读失败、回执读失败/畸形、readiness 缺席/坏、读者版读失败各有独立状态 +
   重试/可行动提示；不再出现「尚未定稿」「交付未见证」「✓ 审查」的假状态。
5. **F3**：reader↔audit 回退有提示；两边不可用 → 失败/空态；不渲染空白正文。
6. **审查/交付**：`reviewVerdict` 四态；空/坏声明/空 review 不给 ✓；readiness PASS + review PASS
   正向不回退；已交付 + unconfirmed 不把交付徽标改成未交付；旧 install-only 不冒充。
7. **机械面**：`pnpm verify` / `pnpm test` / `pnpm typecheck` / `pnpm build` 全绿；两条浏览器入口
   全绿（旧 24/24 + 新 S6–S14）；locale/i18n/cjk 绿；`backlog-liveness` / `staged-change-pairing` 过。
8. **文档/去向**：批 Note + 八卡归档 + `bugs/README` + 程序卡 `已结` 归档 + `issues/README` +
   `triggers.md` + design/40/guides/60/evaluation/checks README 同变更。
9. **范围**：不改 vendor；不做旧 bundle 兼容；不吸收表外新缺陷（§2.5 潜在行先判定再决定建卡/`none`）。

## 预算、停止条件与升级路径

- **预算**：P0 0.5、P1 1、P2 1.5、P3 2、P4 0.5 会话；合计约 5.5，按 5–6 会话给足（含浏览器重跑）。
- **停止并记录**：
  1. 某卡在同边界建不出红 → 翻回 `排查中`，留撤回记录；
  2. 浏览器被主机负载/环境阻断 → `NOT-RUN` + trigger；卡停 `修复落地`，不冒充 `已修`；
  3. 修复与既有测试冲突且无法给出更强合同 → 先写取代理由，不静默删/放宽；
  4. 新证据推翻根因 → 回退 `排查中`；
  5. 共用核需要重画整站状态机/所有 reader → 本批只做状态页 + 终稿页签的有界事实模型，超界另立卡；
  6. 新入口 >550 行 → 按场景组拆，不申请 CAP 例外。
- **升级路径**：触及 D 号/入口链/门禁与验收合同/文档合同/pack 公共行为 → `等人拍板`；
  本批均为 P2 观察面修理型，自授权。静默自主执行，阶段边界汇报；不把技术选择推给用户。

## 显式不做

- 不 patch `vendor/dsh/`；不改 agent loop。
- 不把空文件当 `absent` 或 `unreadable`；也不把 `unreadable` 当 `empty`（三者措辞不同）。
- 不把 `review/` 在场但 readiness 声明缺席的 bundle 判成审查通过；不把 prose PASS 当结构化声明。
- 不把回执读失败/畸形说成「没有回执/未见证」；不把旧 install-only 形状当回执。
- 不静默 reader→audit / audit→reader；不渲染空白正文；不隐藏空/坏读者版。
- 不改变「交付 = present/回执」的事实判定；不把已交付徽标改成未交付。
- 不为旧 bundle 写兼容分支或迁移脚本。
- 不扩到图谱/方法库/配置页签（各有既有守卫）；不重写状态页/终稿页签。
- 不申请 `script-file-size` CAP 例外；不把 runtime 夹具当最终 guard。

## 未证边界（收口时进批 Note / triggers）

- 新入口 `cockpit-artifact-truth.entry.mjs` 为 dev-only（真浏览器 + 文件突变 + 主机负载敏感）；
  未进 CI/nightly。重议条件 = 连续两轮稳定，或 client-load/旧入口吸收九场景。
- en 浏览器装配面未跑；en 字典/折叠 i18n 有单测。重议条件 = 下一次 en 装配夹具。
- L2 安装/首启、真模型/snapshot 与本批无交集（不改安装形态/模型可见内容）。
- §2.5 潜在行（final/ list、plan.md、终稿 review.md）若判为不可达/无消费者，记 `none — 原因`；
  若建卡，编号续 369+，不并入本批。
- `final.md` 通用地址的「当前工作稿 vs 最新版本」回退语义保持既有合同；本批不改。

## 执行入口（goal 用）

- 每轮先读本卡 §4；只推进当前阶段；阶段结束把「实际红/绿/未跑 + 卡状态」回填本卡。
- 每卡翻状态前对照 §5.3 DoD；缺证据停在该状态，不跳。
- 收口按 §4 P4 与 §验收标准；完成条件 = §验收标准 全部成立，而不是「代码改完」。

## 阶段结果（2026-11-22）

### P0 再就绪与证据升格

- 九条 runtime 夹具复跑仍红（361「尚未确认」；362「交付未见证」；363 缺席/不可读均 `reviewFail:false`；
  364 空白读者版；365 空白正文；366 `reviewDone:true`；367「尚未确认」+✓ 立项；368 无提示审计版）。
- 八卡补 `## 分诊与授权` / `## 批` / `根因证据`，翻 `修复就绪`；`pnpm verify` 过。
- 守卫载体 = 新入口 `checks/smoke/cockpit-artifact-truth.entry.mjs`（S6–S14，dev-only，keyless 真浏览器）；
  旧 `cockpit-truth.entry`（S1–S5）不动；登记 registry/checks README。旧入口 357 行 + 新入口 366 行，
  均在 550 CAP 内，**未申请例外**。
- 预修复红证：新入口 **15/31，exit 1**。
- §2.5 潜在行判决：`final/` list 失败、`plan.md` 读失败、终稿页签 `review.md` 读失败、`final.md` 草稿
  读失败均判 `none`（当前合同下无用户可见假绿/假交付；target 地址仍 pin 版本；status 359 已管 review
  读失败；pinned delivery 无草稿 toggle），登记 trigger 而不建卡。未为凑数扩卡。

### P1 共用工件状态核

- 落 `lib/run/artifact-read.ts`：`ArtifactState` 五态（ok/absent/unreadable/empty/invalid）+
  `ARTIFACT_POLICY` + `readArtifact` 唯一 `view.read` 入口；`brief-fold` 的 `SourceRead`/`readStateOf`
  迁入并 re-export。
- `useStatusFeed` 全部文本工件读取改走 `readArtifact`（question/review/readiness/receipt/plan），
  `reads` 扩为 bundle/question/review/readiness/evidence/receipt；源级守卫断言状态页零裸 `view.read`。
- `artifact-read.spec` 4 组矩阵；旧 `cockpit-truth.entry` **24/24 仍绿**（回归）。

### P2 终稿三卡

- `finalViewOf`（body/reader × 五态 × 请求视图）落 `final-target`；`ResearchFinalTab` 改走
  `readArtifact` + `finalViewOf`；空读者版→审计+提示、空正文→空态（有 reader 则 reader+提示）、
  读者版读失败→审计+提示+重试；终稿页签源级守卫零裸 `viewIo.read`。
- S10/S11/S14 绿（S11 的「终稿可达」预检从 `len>40` 改为非空，失败文案本身是有效可达内容）；
  旧 S1/S1b 回归绿。
- **偏差**：计划的 `final-view.spec` 并入 `tests/run/gates/final-target.spec.mjs`（同一 owner，
  避免新文件/索引/台账机械面）；卡内 guard 链接已同步。

### P3 状态五卡

- question 四态（ok/absent/unreadable/empty）+ 目标行显式（读取失败/为空）+ 立项步 unknown；
  review 四态 `reviewVerdict`（pass/fail/unconfirmed/absent）+ 空/缺/坏声明不 ✓；receipt 五态 +
  只有 ok 出交付 + 旧 install-only 不冒充；⑤ 回执失败行不显示「交付未见证」。
- S6/S7/S8/S9/S12/S13 绿；全入口 **31/31，exit 0**；旧入口 **24/24 仍绿**。
- **偏差**：计划的 `status-facts.spec` 并入 `artifact-read.spec` + `brief-fold.spec` + `run-fold.spec`
  + `status-feed.spec`（现有 owner 已直测，避免重复文件）；卡内 guard 链接同步。

### P4 收口（本阶段）

- 语义自审：docs/design/40 五态/回退/reviewVerdict、guides/60 双入口、evaluation 加跑面、
  checks README、旧批 Note 互链同变更。
- 批 Note = `notes/implemented/2026-11-22-observation-artifact-truth.md`。
- 八卡 `已修` 归档 fixed 池；本卡 `已结` 归档；triggers 记 dev-only/en 装配/潜在行。
