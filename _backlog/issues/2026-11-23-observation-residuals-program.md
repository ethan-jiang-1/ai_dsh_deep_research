---
status: 待落地
opened: 2026-11-23
---

# 观察面残余与跨面事实一致性修复程序：BUG-369…376 的次序、流程与系统修法

> 立卡：2026-11-23 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
> 对象：8 张活跃 P2 卡（369–376），全部有真浏览器 verdict；现场 = `runtime/e2e/*verdict.json` + `*.png`（gitignored）。
> 去向：implemented — `notes/implemented/2026-11-23-observation-residuals.md`（批 Note，收口时写）
> 上一批 = [观察面工件真实性 Note](../../notes/implemented/2026-11-22-observation-artifact-truth.md) · [程序卡](../_archived/settled_issues/2026-11-22-observation-artifact-truth-program.md)；
> 本批是同一观察面的**第四批**（351–355、356–360、361–368 之后），但第一次跨出「状态页 + 终稿页签」。
> 方法 = [bug-to-fix §2 批模式](../methods/bug-to-fix.md)；状态机 = [bugs/README](../bugs/README.md)；证据主人 = [guides/60](../../docs/guides/60-dev-loop.md)。

## 0. 结论

1. 8 张卡不是 8 个孤立字符串 bug，是**四条机制 + 一个假阳性风险**：
   - **F1 事实清单仍只覆盖两个面**（372/373/375）：`artifact-read` 五态落到了状态页/终稿页签，
     但配置页的 question、状态页的 plan、状态页的 final 目录仍是各自的裸读/折平；空/读失败
     在第三个、第四个面上继续变成「文件不在」「版本面消失」「已交付且无警告」。
   - **F2 同一事实两套派生**（369/374）：状态页用 `reviewVerdict`（mismatch 折 unconfirmed），
     终稿页签只用 `review.md` 的 `terminalReadiness`；同一 run 同时得到「审查未定」与「审查未过」。
     缺的不是新事实，是**共享派生 + 冲突态**。
   - **F3 watcher 盯代理而不是盯显示件**（371）：终稿页签默认显示 reader，却只轮询 audit 的令牌；
     显示件更新不触发 stale。缺的是 `watchTargetOf(displayed)`，不是更多轮询。
   - **F4 状态与文案错位**（369/370/376）：mismatch 说「声明缺失」、空快照画成零节点图、
     未知键说「已忽略」而合法值是否生效没人验证；共同修法是**文案必须命名实际状态**。
   - **376 先别当已证实 bug**：现行 `parseDefaults` 对 unknown **顶层键**是 `warnings`（不是
     `problems`），`value` 仍带合法 `effort`；`DefaultsStore` 也写 `value: parsed.value`。但
     376 的 verdict 只断言了 `paneText`（面板文本包含所有 select 选项标签），**没有读 select 的
     实际 value**——「深度自动」可能只是选项文案，不是选中值。P0 必须用 DOM 值 + store 快照复核；
     若合法 effort 实际生效，376 应作为**E2E 假阳性**纠正/撤回，而不是为它写代码。
2. **系统修法**：
   - 继续用 `artifact-read` 五态，但把**事实清单**从「状态页/终稿页签」扩到全部 cockpit 读取面
     （status / final / graph / config）；新增 G21「跨面读取点清单」：canonical 文本工件的裸读
     必须被源级守卫点名，新增读取点不能只靠 reviewer 记得。
   - 把「同一事实」的派生收到一处：`reviewVerdictOf`（pass/fail/conflict/unconfirmed/absent）、
     `watchTargetOf`（displayed reader/audit/draft）、`snapshotStateOf`（empty/invalid/missing/
     unreadable/ready）、`adoptionQuestionState`（question 四态）。G22「一个事实一套派生」。
   - 状态文案与状态同源：冲突不说缺失、空不说零节点、未知键不冒充已忽略。G23「诊断文案必须命名
     实际状态」。G24「P0 可以用证据判一张卡不成立」——不为假阳性写代码。
3. **次序 = 证据/复核 → 终稿+审查信任 → 状态残余轴 → 图谱快照 → 配置面 → 收口**。
   先做 369/374/371（同一 `ResearchFinalTab` + 同一 review 事实，共享派生一次落）；再做 373/375
   （同一 `StatusReads` 扩轴）；然后 370（独立快照状态机）；最后 372/376（config 面；376 先复核）。
   不按 BUG 号逐张修，也不做「一次统一所有 feed」的大重构。
4. **流程保障**：G1–G20 继承；新增 G21/G22/G23/G24。守卫载体新增
   `checks/smoke/cockpit-truth-residuals.entry.mjs`（S15–S22，dev-only、keyless、真浏览器；
   现有 366 行入口再加八场景会超 550 行 CAP，故拆第三条入口，**不申请例外**）。
5. 预算约 4–5 个会话（goal 60 轮上限）；每卡 `json fix-evidence`，红→绿同一命令；376 若判假阳性，
   以「已定性/not-a-bug」收口并留纠正证据，不伪造绿。

## 1. 事实基线（2026-11-23，HEAD `bddc085d`）

| 项 | 事实 |
|---|---|
| 活跃卡 | **8 张**：369/370/371/372/373/374/375/376，全 `排查中`、P2 |
| 上批 | 361–368 已修归档；`cockpit-truth.entry` 24/24、`cockpit-artifact-truth.entry` 31/31 绿 |
| 本批现场 | 第五轮 E2E J38–J45 全 FAIL；夹具 = `review-conflict-e2e.mjs`、`graph-empty-snapshot-e2e.mjs`、`final-reader-stale-e2e.mjs`、`config-question-unreadable-e2e.mjs`、`final-dir-unreadable-e2e.mjs`、`final-review-unreadable-e2e.mjs`、`status-plan-unreadable-e2e.mjs`、`config-defaults-mixed-e2e.mjs` |
| 现有事实核 | `ArtifactState` 五态；`StatusReads` = bundle/question/review/readiness/evidence/receipt；`finalViewOf`；`reviewVerdict` 只处理 declaration/prose/absent；状态页 `finalDir` 裸 list；`useGraphFeed` snapshot 只有 idle/loading/ready/missing；`useConfigFeed` adoption 裸 `view.read` + `hasFile` |
| 现有入口 | 旧五场景入口 357 行 + 新九场景入口 366 行；慢资产 15/15 满额（新入口按 `medium`，不加 slow） |
| 376 反证线索 | `parseDefaults({schema:1,effort:'deep',unknown:'x'})` 在代码上返回 `value.effort='deep'` + unknown warning；`DefaultsStore` 写 `value: parsed.value`；但 verdict 的 `paneText` 无法证明 select 选中的是 auto；`config-defaults-mixed-e2e.mjs` 也没有读 select.value。**P0 必须复核** |

## 1.1 P0 结果（2026-11-23）

- 八条夹具复跑：七条仍红（369 状态页/终稿分歧、370 空快照无文案、371 无 stale、372 配置误报「不在」、373 状态页无警告、374 终稿无审查提示、375 状态页无计划提示）；**376 证伪**。
- 376 三方对照：`parseDefaults` mixed 键 → `value.effort='deep'`；真浏览器 select.value='deep'、selectedOptions 文本「深度档」、defaults-state=count；原 verdict 只读 `paneText`（包含全部 option 标签）→ **E2E 假阳性，不写产品代码**。处置 = P4 纠正夹具/卡 + mixed-key 回归，按 not-a-bug 收口；红/绿以「把 parser mixed 键折回 empty」的变异红证明回归会咬人。
- 新入口 `cockpit-truth-residuals.entry.mjs` 预修复：**17/28 PASS，exit 1**；11 条红分别落 369/374/371/373/375/372/370，S21（376）正向绿（select.value=deep）。
- 七卡已补 `## 分诊与授权` / `## 批` / `## 复现` / `根因证据`，翻 `修复就绪`；376 留 `排查中` + `## P0 复核（非缺陷）`。
- G21 清单：`artifact-read.spec` 新增跨面裸 `view.read` 清点（当前只允许 graph/config 三处已知遗留），P3/P4 迁移后清空。

## 2. 系统视角

### 2.1 F1：事实清单仍按「面」而非「事实」建

上一批的 G19 只把 status/final 的文本读取收进 `readArtifact`。本批的 372/373/375 说明：

- `useConfigFeed` 仍用 `view.read('question.md')` + `hasFile`，`!ok` 与 absent 同形 → 「不在/被移走」；
- `useStatusFeed` 仍用裸 `view.list('final')`，`!ok` 与 empty 同形 → versions=0、无警告；
- `useStatusFeed` 已读 plan，但 `StatusReads` 没有 plan 轴 → 读失败/空在版本面同形。

修法不是给三个页面各加一句 warning，而是：

- 状态页 `StatusReads` 增 `plan`（ArtifactState）与 `final`（SourceRead/list 三态）；
- 配置页 adoption 改走 `readArtifact('question.md')`，把 `questionState` 带进 `foldMethodAdoption`；
- 图谱快照改走 `readArtifact('plan/vN.md')`（动态 policy），把空/坏变成独立状态；
- 源级守卫枚举 cockpit 的 canonical 读取点，未登记裸读 = 红。

### 2.2 F2：同一事实，两套派生

`readinessOfSources` 已经能返回 `declaration|prose|missing|invalid|mismatch|ambiguous|absent`；问题在
消费方：

- 状态页 `reviewVerdict` 只把 `declaration/prose` 当结论，`mismatch/ambiguous` 落 `unconfirmed`；
- 终稿页签只跑 `terminalReadiness(review.md)`，完全不看声明件。

所以 369 的「声明 PASS + 散文 FAIL」在状态页变「声明缺失」，在终稿页签变「审查未过」；
374 的「review 读不到」在状态页有警告，终稿页签静默正常。

修法：在 `review-readiness.ts` 落一个共享 `reviewVerdictOf(reading)`：
`pass | fail | conflict | unconfirmed | absent`（`mismatch/ambiguous` → `conflict`；
缺失/坏/空 → `unconfirmed`；无 review 面 → `absent`）。状态页、brief、终稿页签都消费它；
`reviewFail` 只给 fail，`conflict` 有独立文案与步骤语义（不冒充 PASS，也不说「声明缺失」）。

### 2.3 F3：watcher 盯代理，不盯显示件

`ResearchFinalTab` 的 `targetRef` 在 load 时设成 audit（body ok 时），但默认 view=reader；
reader 改写不触发 audit 令牌，stale 永不出现。draft 视图同样。

修法：纯函数 `watchTargetOf({ view, body, reader, draft })` 返回当前显示件；`load` 后按 view 更新
watcher target；或在 watcher 里同时比较 audit/reader/draft 三令牌。前者更窄，且能写矩阵测试。
stale 文案区分「读者版已更新」/「终稿已更新」，点击重读。

### 2.4 F4：状态与文案错位

- 369：`mismatch` → 「声明缺失/不可读」；应说「声明与 review.md 冲突」；
- 370：0 字节快照 → `planIndex('')` 零节点 + `ready`；应说「快照为空」，非空但零节点 →
  「无法解析」，不冒充零节点图；
- 376：未知键 warning 的文案说「已忽略」，但合法值是否进入 value / select 未验证；**先验证，
  再决定是修 UI 还是撤卡**。

G23：每一种状态必须有**能区分邻态**的文案；不能用一个「缺失/不可读」覆盖 mismatch/empty/invalid。

### 2.5 376：先证伪，再修

现行代码的两个事实：

1. `parseDefaults` 对未知顶层键只进 `warnings`，合法 `effort` 仍进 `value`；
2. `/research-defaults set` 在 `current.warnings.length > 0` 时直接失败（unknown 不会被静默删除）。

因此 376 的「合法 effort 被静默丢弃」**在当前代码路径上不成立**；更可能是 E2E 断言读了
`paneText`（包含所有 select 选项标签），把「自动」选项文案当成选中值。P0 用：

- `page.locator('[data-testid="defaults-depth"]').inputValue()`；
- `DefaultsStore.getSnapshot(sessionId).value.effort`；
- `parseDefaults` 单测（mixed 键矩阵）

三方对照。结论分支：

- **合法 effort 生效** → 376 判 **not-a-bug**：纠正卡/夹具（读 select 值，不读 paneText），
  加一条 mixed-key 回归防再误报；不写「保留/整份 invalid」的代码。
- **合法 effort 真丢失** → 按默认合同修：**保留合法字段 + 未知键 warning，写入仍 blocked**
  （parser/command 现有取向；避免丢弃用户合法意图，也避免把 unknown 静默写掉）。只有在该取向
  无法与写路径自洽时，才改用「整份 invalid + 明示」，且必须同变更改文案/测试。

这一节是 G24 的具体应用：P0 可以用证据判一张卡不成立，不把「8 张都改代码」当目标。

### 2.6 不做的方案

- **一次统一所有 client feed 的读取器**：graph/config/defaults 的读面/写面/解析面不同，硬收一个
  大接口会把 8 张卡变成一次高风险重构；本批只收 canonical 文本读取 + 每面一个状态机。
- **按 BUG 号逐张修**：369/371/374 共享 `ResearchFinalTab`，373/375 共享 `StatusReads`；
  逐张会三次改同一文件、三次跑同一入口。
- **给 376 直接改成「整份 invalid」**：在 parser 已保留合法字段、写命令已 blocked 的情况下，
  这是把假阳性变成真的行为变化；先证伪。
- **把新八场景塞进现有 366 行入口**：超 550 CAP；拆入口而不是抬上限。
- **把 371 的等待降到 <30s 求快**：REFRESH_MS=30s，降等待只会制造 flake；保持 35s，入口记
  `medium`（不是 slow，慢资产 15/15 已满）。
- **为 370 的非空零节点文本猜「空图」**：零节点可能是合法空图，也可能是解析失败；用
  `planIndex` 结果 + 文本非空判 invalid，不猜。

## 3. 修法总览

| 卡 | 机制 | 修法 | owner / 证据 |
|---|---|---|---|
| 369 | mismatch/ambiguous → unconfirmed；终稿只看 prose | `reviewVerdictOf` 五态 + 状态/brief/终稿共用；冲突文案；终稿读声明件 | `review-readiness.ts`、`useStatusFeed`、`brief-fold`、`ResearchFinalTab`；S15 |
| 370 | 空 plan/vN 快照画空面板 | snapshot 增 `empty/invalid/unreadable`；`plan/vN` policy；rail 文案 | `useGraphFeed`、`GraphVersionRail`、`artifact-read`；S22 |
| 371 | watcher 只盯 audit | `watchTargetOf(displayed)`；reader/audit/draft 矩阵；stale 文案 | `ResearchFinalTab`、`final-target`；S17 |
| 372 | config question 读失败当 missing | adoption 走 `readArtifact`；`questionState` 进 fold；失败/空文案 + retry | `useConfigFeed`、`method-of-question`；S20 |
| 373 | final/ list 失败当 0 版本 | `StatusReads.final`（SourceRead）；失败 warning + retry；版本细节不冒充 | `useStatusFeed`、`ResearchStatusTab`；S18 |
| 374 | 终稿 review 读不到静默正常 | 终稿消费 `reviewVerdictOf`；unconfirmed → 「审查未定」+ retry；absent 不提示 | `ResearchFinalTab`；S16 |
| 375 | plan 读失败静默消失 | `StatusReads.plan`（ArtifactState）；失败/空 warning；版本面「计划版本未知」 | `useStatusFeed`、`ResearchStatusTab`、`brief-fold`；S19 |
| 376 | unknown 键 + 合法 effort | **P0 复核**；真丢失 → 保留合法字段 + warning、写入 blocked；假阳性 → 纠卡/夹具 + mixed-key 回归 | `research-defaults.ts`/`store`/`DefaultsPanel`/E2E；S21 |

### 3.1 共享 review 判定（369/374）

- `reviewVerdictOf(reading: ReadinessReading): ReviewVerdict`：
  - `declaration|prose` + `pass=true` → pass；`pass=false` → fail；
  - `mismatch|ambiguous` → conflict（`pass` 字段不唯一，不许单边取）；
  - `missing|invalid` → unconfirmed；
  - `absent` → absent；
  - 空/读不到的 review/readiness 由 feed 先折成对应 reading，再走同一函数。
- `StatusFeed` 暴露 `reviewVerdict` + `reviewDetail`；brief 增 `reviewConflict`/`reviewUnconfirmed`；
- `ResearchFinalTab` 读 review + readiness（`readArtifact`），调 `readinessOfSources` + `reviewVerdictOf`；
  conflict/unconfirmed 显示 warning + retry；absent 不显示；pass/fail 现有态不回退；
- 369 的正/负矩阵：PASS/PASS、FAIL/FAIL、PASS/FAIL、FAIL/PASS、mismatch、ambiguous、missing、absent。
- 交付态：conflict/unconfirmed 保留「报告已交付」事实 + 明确「审查结论冲突/未定」，不把交付徽标
  改成「未交付」，也不给 ✓ 审查。

### 3.2 状态页扩轴（373/375）

- `StatusReads` 增 `plan: ArtifactState`、`final: SourceRead`（list 三态）。`final` 的 `empty` 是
  **合法 0 版本**（目录空/缺席），只有 `unreadable` 才是失败；不把 empty 当 read failure。
- 373：`reads.final === 'unreadable'` → ⑤ 行「终稿目录读取失败」+ retry；保留交付事实但加
  caveat；不渲染「v1 已交付 · 当前工作稿」的版本细节；终稿页签既有失败态保留。
- 375：`reads.plan === 'unreadable'|'empty'` → 「计划读取失败/为空」+ retry；`absent` 旧 run 空态；
  版本面显示「计划版本未知」，不静默消失；图谱页签独立失败态不回退。
- `StatusReads` 从 6 轴变 8 轴；`status-feed.spec` 源级守卫更新；`brief-fold` 只在 review/question
  轴消费，plan/final 不新增业务摘要文案（避免把技术读取失败变成业务阶段）。

### 3.3 图谱快照（370）

- `artifact-read` 增动态 policy：`plan/vN.md` → nonEmpty=true, json=false；
- `useGraphFeed` snapshot 状态机：
  `idle | loading | ready | empty | invalid | missing | unreadable`
  - 0 字节/纯空白 → empty；
  - 非空但 `planIndex` 零节点/解析失败 → invalid；
  - `readArtifact` absent → missing；unreadable → unreadable；
  - 非空有节点 → ready（正向不回退）。
- `GraphVersionRail`：empty → 「旧图快照 vN 为空」；invalid → 「旧图快照 vN 无法解析」；
  missing/unreadable 保留既有文案；empty/invalid 可给「查看原文/重试」，不画空面板。
- 当前图/版本轨取数不改。

### 3.4 配置面（372/376）

- 372：`useConfigFeed` adoption 读 `question.md` 改 `readArtifact`；`foldMethodAdoption` 的输入从
  `{bundle, question}` 扩为 `{bundle, questionState}`（或增 `questionIssue`），新增
  `question-unreadable`/`question-empty` 两态；UI 复用「研究问题读取失败/为空」+ retry；
  `absent` 仍是 `missing`/「不在」，`no-run`/`unrecorded`/`unparsable`/`recorded` 不回退。
- 376：按 §2.5 先复核。真丢失时默认合同 = **保留合法字段 + 未知键 warning，写入仍 blocked**；
  `DefaultsPanel` 的 select 必须显示 `state.value.effort`，warning 文案不能暗示「合法值已丢」；
  加 mixed-key 单测 + browser select.value 断言。假阳性时只改夹具/卡 + 回归，不改产品行为。

## 4. 修的次序

### P0 证据再就绪与 376 复核（0.5–1 会话）

1. 复跑八条 runtime 夹具，确认 J38–J45 仍红；369 同时收状态页 + 终稿页签文本；376 增加
   `select.value` / `getSnapshot().value.effort` / `parseDefaults` 三方对照（见 §2.5）。
2. 给八卡补 `## 分诊与授权` / `## 批` / `根因证据`；376 的根因证据必须写「已证/未证/假阳性」，
   不复制卡片断言。
3. 建 `checks/smoke/cockpit-truth-residuals.entry.mjs`（S15–S22）；登记 registry / checks README；
   预修复跑红（预期八场景各有失败，376 若假阳性则其场景是「select.value=deep」正向绿，并在卡内
   记录「不是 bug」）。
4. 源级清单：在 `artifact-read.spec` 或新 `artifact-sites.spec` 枚举 status/final/graph/config
   的 canonical 读取点；先红后绿。填 §7 批表；`pnpm verify` 绿。
5. 输出：八卡 `修复就绪`（376 若假阳性 → `已定性`/撤卡，不翻修复就绪），P0 结论回填本卡。

### P1 终稿 + 审查信任（369/374/371，1–1.5 会话）

- 先落 `reviewVerdictOf` 五态 + 矩阵测试（369/374 共用）；
- 状态页/brief 改消费新 verdict；终稿页签读声明件并显示 conflict/unconfirmed；
- `watchTargetOf` 矩阵 + 终稿 watcher 改显示件（371）；
- 每卡红→绿→`fix-evidence`；S15/S16/S17 绿；旧入口 24/24 + 31/31 不回退。
- 卡 369/374/371 翻 `修复落地`。

### P2 状态页残余轴（373/375，1 会话）

- `StatusReads` 增 plan/final；状态页 warning/retry/版本面 unknown；
- 373/375 红→绿→`fix-evidence`；S18/S19 绿；旧入口不回退；
- 卡翻 `修复落地`。

### P3 图谱快照（370，0.5–1 会话）

- `plan/vN` policy + snapshot 状态机 + rail 文案；
- 370 红→绿→`fix-evidence`；S22 绿；
- 卡翻 `修复落地`。

### P4 配置面（372/376，1 会话）

- 372 先修（readArtifact + adoption 状态 + retry）；S20 绿；
- 376 按 P0 结论：真丢失→保留合法字段 + warning + select 断言；假阳性→纠卡/夹具 + 回归；
- 372 `fix-evidence`；376 若真修则 `fix-evidence`，若假阳性则按 not-a-bug 收口（证据 + 卡去向，
  不留 `修复落地` 假状态）。
- 卡翻 `修复落地`/`已定性`；S21 绿（或正向断言）。

### P5 收口（0.5–1 会话）

- `pnpm verify/test/typecheck/build` 全绿；旧 24/24 + 新 31/31 + 残余入口全绿；
- `reviewing-a-delivery` 语义自审；批 Note；八卡归档/撤回；程序卡 `已结`；README/triggers；
- design/40、guides/60、evaluation、checks README 同变更；最终 verify。

## 5. 流程保障

- **每卡一个 fix-evidence**：`changes` 含代码/测试/守卫，`red/green` 同一命令，`exit` 为 oracle，
  `guard.path` = `checks/smoke/cockpit-truth-residuals.entry.mjs`（或纯 spec 作为附加 guard）；
  共享入口不替代单卡证据。
- **新入口**：S15–S22 八场景（369/374/371/373/375/372/376/370）；`dev-only`、`keyless`、
  `cost: medium`（慢资产 15/15 已满，不新增 slow）；现有 366 行入口不动，避免 550 CAP 例外；
  失败逐场景点名，文件突变/chmod 在 finally 还原。
- **源级守卫**：canonical 文本读取必须走 `readArtifact`；status/final/graph/config 的裸
  `view.read`/`view.list` 要么被登记为合法例外，要么红。这是 G21 的机械面，不靠 reviewer。
- **共享派生测试**：`reviewVerdictOf` 全 source × pass 矩阵；`watchTargetOf` view × state 矩阵；
  `snapshotStateOf` 文本 × parse 矩阵；`adoptionQuestionState` 四态矩阵；`defaults` mixed 键矩阵。
- **假阳性出口**：376 若证伪，按 `已定性`/`not-a-bug` 收口，纠正 E2E 断言并留回归；不把
  「卡数完成」当验收，验收是「每个用户可见断言有事实支撑」。
- **不申请 CAP 例外**；不改 vendor；不做旧 bundle 兼容；不改 `final.md` 通用地址的既有回退合同。

## 验收标准

- 369：声明/散文冲突（两种方向）→ 状态页与终稿页签都说「冲突/审查未过」，不出现「声明缺失」，
  不出现单边 PASS；PASS/PASS、FAIL/FAIL、missing、absent 各回退正确。
- 370：0 字节快照 → 「快照为空」；非空零节点 → 「无法解析」；正常快照/当前图不回退。
- 371：reader 视图改写 readable-vN → ≤35s stale 提示；audit/draft 各自命中；无变化不误报。
- 372：question 不可读/空 → 「读取失败/为空」+ retry；absent 仍「不在」；可读正常。
- 373：final/ 不可读 → 状态页 warning + retry，不再无条件「v1 已交付」；目录空/缺席 = 0 版本负控。
- 374：终稿 review 不可读/空 → 「审查未定」+ retry；absent 不提示；pass/fail 不回退。
- 375：plan 不可读/空 → 状态页 warning + retry，版本面不静默消失；absent 旧 run 负控。
- 376：合法字段 + 未知键 → 要么合法值生效且只 warning，要么整份 invalid 明示；不允许
  「自动 + 已忽略」矛盾。若证伪，则 select.value/parse/store 三方证据 + 纠正后的回归为验收。
- 机械：`pnpm verify/test/typecheck/build` 绿；旧入口 24/24、新入口 31/31、残余入口全绿；
  两卡浏览器/纯函数证据同 diff；八卡 `fix-evidence`/not-a-bug 证据 + 归档/撤回；批 Note/程序卡/
  docs/triggers 同变更。

## 7. 停止条件

- 376 证伪：不修代码，按 not-a-bug 收口；若用户仍要求「整份 invalid」取向，另立产品决定，不在本批偷改。
- 371 的 35s 等待在主机负载下 flake：记录 NOT-RUN/现场，不把等待降到 <30s 制造假绿；可拆纯函数矩阵
  先绿，浏览器场景记未跑。
- 369 的 conflict 语义若与交付门/`readinessOf` 冲突：以门禁的 `pass:false` 为事实，观察面只呈现
  conflict；需要改门契约时停 P1，另立卡，不在观察面单边放行。
- 373/375 若 `final`/`plan` 轴会改变 `StatusReads` 的公共类型并波及 361–368 已修路径：先加兼容的
  可选字段 + 测试，不重写六轴语义；已修负控必须全绿。
- 任一卡在 P0 证伪且用户不再要求：撤卡/`已定性`，不进入修复阶段；goal 验收按实际成立卡数调整并记录。

## 8. 批表

| 卡 | 机制 | P 阶段 | 守卫场景 | 状态（P0 回填） |
|---|---|---|---|---|
| 369 | readiness mismatch/ambiguous + 终稿单边 prose | P1 | S15 | 修复就绪 |
| 370 | 空 plan/vN 快照空面板 | P3 | S22 | 修复就绪 |
| 371 | watcher 只盯 audit | P1 | S17 | 修复就绪 |
| 372 | config question 读失败当 missing | P4 | S20 | 修复就绪 |
| 373 | final/ list 失败当 0 版本 | P2 | S18 | 修复就绪 |
| 374 | 终稿 review unconfirmed 静默 | P1 | S16 | 修复就绪 |
| 375 | plan 读失败静默消失 | P2 | S19 | 修复就绪 |
| 376 | unknown 键 + 合法 effort（待证伪） | P4 | S21 | 排查中（假阳性） |
## 9. 执行入口（goal 用）

- 每轮先读本卡 §4；只推进当前阶段；阶段结束把「实际红/绿/未跑 + 卡状态」回填本卡。
- 每卡翻状态前对照 §验收标准；缺证据停在该状态，不跳。
- 376 先按 §2.5 出「已证/未证/假阳性」结论；假阳性走 §5 出口，不为卡数写代码。
- 收口条件 = §验收标准 全部成立（含 376 的复核结论），而不是「代码改完」。
