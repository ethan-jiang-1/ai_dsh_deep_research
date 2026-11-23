---
status: 待落地
opened: 2026-11-23
---

# 观察面内容实质与英文文案修复程序：BUG-377…384 的次序、流程与系统修法

> 立卡：2026-11-23 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
> 去向：implemented — `notes/implemented/2026-11-23-observation-substance.md`（批 Note，收口时写）
> 对象：8 张活跃 P2 卡（377–384），全部有真浏览器 verdict；现场 = `runtime/e2e/*verdict.json` + `*.png`（gitignored）。
> 上一批 = [观察面残余 Note](../../notes/implemented/2026-11-23-observation-residuals.md) · [程序卡](../_archived/settled_issues/2026-11-23-observation-residuals-program.md)；
> 本批是同一观察面的**第五批**（351–355、356–360、361–368、369–376 之后），第一次把「非空」与「有实质内容」分开。
> 方法 = [bug-to-fix §2 批模式](../methods/bug-to-fix.md)；状态机 = [bugs/README](../bugs/README.md)；证据主人 = [guides/60](../../docs/guides/60-dev-loop.md)。

## 0. 结论

1. 8 张卡不是 8 个孤立字符串 bug，是**三条机制**：
   - **M1「非空」≠「有实质内容」**（381/382/383/384）：leads/findings 只判 `hasFile`；question
     非空但只有标题；plan.md 空仍 `state='ok'`（policy `nonEmpty:false`）。步骤条只认在场性，
     且 `deriveSteps` 的线性推断会把前面 false 的步在后续 final 在场时仍画成 done。
   - **M2 失败登记/空卡被算成证据**（377/378）：`evidence/*.md` 全按后缀计数，`_failed.md`
     是失败登记不是证据卡；0 字节卡也计入 `evidenceCount`，于是「挖掘」done。
   - **M3 英文计数语法/主导航标签**（379/380）：en 计数模板固定复数（1 evidence files）；主 tab
     按中文宽度排版，`Method Library` 被截成 `Method libr...`。这两张不是观察事实 bug，是
     locale/布局面；放在最后，不混进 M1/M2 的 state 设计。
2. **系统修法**：
   - 在 `artifact-read` 五态之上加**内容谓词层**（G25）：`hasQuestionBody`、`hasPlanBody`、
     `hasBodyText(leads/findings)`、`isEvidenceCard`。非空只证明文件有字节，不证明「有问题正文/
     有节点/有证据卡」；步骤与计数只消费谓词结果，不消费 `hasFile`。
   - **`deriveSteps` 的未知优先**：内容为空/读失败/仅失败登记的步骤必须进 `unknown`，不能只把
     `has` 设 false——线性推断会把 false 的早步在后续 final 在场时补成 done（本批 381/382 的
     隐藏机制，必须用 `unknown` 矩阵钉住）。
   - **失败登记是 sentinel**（G26）：`evidence/_failed.md` 排除出证据卡计数；可单独呈现
     「检索失败登记」，但不得计入 evidence 数/步骤完成；0 字节/纯空白证据卡不计入。
   - **英文计数语法**（G27）：locale 层提供 `countText(t, count, oneKey, otherKey)`；en 1 用单数、
     0/≥2 用复数；zh 键值不变。主 tab 用短标签 + 完整页标题/可达全名，避免把 vendor tab 宽度
     当成 pack 可硬编码的尺寸。
3. **次序 = 证据复核 → 步骤内容实质（381/382/383/384）→ 证据有效性（377/378）→ 英文（379/380）→ 收口**。
   先修「假 ✓ 步骤」（用户以为研究做完了），再修「假证据数」（用户以为有证据），最后修文案/布局。
   不按 BUG 号逐张修：381/382/384 共享 `useStatusFeed`/`run-fold`，383 也共享 question 读取；
   377/378 共享 evidence 计数；379/380 共享 locale/导航面。
4. **流程保障**：G1–G24 继承；新增 G25 内容谓词、G26 sentinel 排除、G27 本地化计数语法。
   新增第四条浏览器入口 `checks/smoke/cockpit-truth-substance.entry.mjs`（S23–S30，dev-only、
   keyless、真浏览器、cost medium）；现有三条入口不动，不申请 550 行 CAP 例外。
5. 预算约 4–5 个会话（goal 60 轮）；每卡 `json fix-evidence`，红→绿同一命令；若 379 的 subagent
   计数落在 vendor 而非 pack，P0 记边界与 trigger，不冒充修好 vendor。

## 1. 事实基线（2026-11-23，HEAD `c49ccd97`）

| 项 | 事实 |
|---|---|
| 活跃卡 | **8 张**：377/378/379/380/381/382/383/384，全 `排查中`、P2 |
| 上批 | 369–375 已修 + 376 not-a-bug；三入口 `cockpit-truth` 24/24、`cockpit-artifact-truth` 31/31、`cockpit-truth-residuals` 28/28 绿 |
| 本批现场 | 第六轮 E2E J46–J53 全 FAIL；夹具 = `evidence-failed-only-e2e.mjs`、`evidence-empty-card-e2e.mjs`、`locale-singular-real-evidence-e2e.mjs`、`locale-audit-e2e.mjs`、`empty-findings-leads-e2e.mjs`、`question-headings-plan-empty-e2e.mjs`、`graph-empty-plan-e2e.mjs` |
| 现有状态 | `ArtifactState` 五态；`StatusReads` = bundle/question/review/readiness/evidence/plan/final/receipt；`ARTIFACT_POLICY['plan.md'] = nonEmpty:false`；leads/findings 不在 policy/reads；evidence 只按 `.md` 后缀计数；question `hasQuestion = state==='ok'` |
| 现有步骤 | `deriveSteps` 输入是布尔/计数；`unknown` 已存在但只用于 question/review/evidence 读失败；线性推断 `i < lastDone => done` 会把 false 早步补成 done |
| 现有文案 | `statusEvidenceCount: '{count} evidence files'`；`questionCount`/`statusDecisionStops`/`graphKept`/`graphCoverage`/`graphTeamTasks` 均固定复数；主 tab label = `methodLibrary`（en `Method library`），由 `conversation.view` 槽渲染 |
| 入口预算 | 旧 24/24、31/31、28/28；三条入口均 dev-only；慢资产 15/15 已满（新入口用 medium） |

## 2. 系统视角

### 2.1 M1：非空 ≠ 实质内容

上一批的 `ArtifactState` 把「0 字节/纯空白」判成 `empty`，这是必要的，但**不够**：

- question.md 可有标题、空小节、模板占位，仍是 `ok`；`questionLine` 取不到正文，业务摘要说
  「尚未确认」，`hasQuestion` 却仍 true → 立项 ✓（383）。
- leads.md / findings.md 根本不在 policy，步骤用 `view.hasFile`；0 字节仍 true（381/382）。
- plan.md 的 policy 是 `nonEmpty:false`，0 字节仍 `ok`；状态页没有 empty 分支（384）。

更隐蔽的是 `deriveSteps` 的线性推断：即使把 `leads`/`findings` 的 `has` 设 false，只要 final
在场，`lastDone=final`，前面的 i 仍会 `done`。所以修法必须是：

1. 内容谓词（`hasQuestionBody`/`hasBodyText`/`hasPlanBody`）决定 `has`；
2. 内容为空/读失败/仅失败登记时把该步放进 `unknown`；
3. 测试矩阵必须包含「早步 false/unknown + 后续 final true」形态，否则改完仍是假 ✓。

`question` 的「有效」取现有 `questionLine` 同源逻辑（第一个非标题、非空行）；只有标题/空小节 =
`body-empty`，不是 `empty`（0 字节）也不是 `absent`（无文件）。plan.md 0 字节改 policy
`nonEmpty:true`；leads/findings/evidence 加 policy。

### 2.2 M2：失败登记/空卡不是证据

`evidenceCount` 现在只按 `.md` 后缀：

- `_failed.md` 是「抓取失败/未取得登记」，**不是证据卡**；只有它时 count=1、挖掘 ✓（377）。
- 0 字节卡与有效卡同形；count=1、挖掘 ✓（378）。

修法：

- `isEvidenceCard(name, state/text)`：排除 `_failed.md`/`_` 前缀，正文非空（最好有 frontmatter
  `source_url`；至少 nonEmpty），读失败单独计 issue；
- `evidenceCount` = 有效卡数；`evidenceEmpty`/`evidenceUnreadable`/`failedLogOnly` 作为 issue；
- 0 有效卡且 evidence 目录在场 → `unknown: ['evidence']`；「挖掘」不 done；显示
  「证据为空/读取失败」或「只有检索失败登记」；
- 保留有效 1/9 卡计数、`_failed.md` + 9 卡 = 9（负控）。

### 2.3 M3：英文计数与导航标签

- 379：en 计数键固定复数；需 `one`/`other` 两形态，0 用复数。中文量词不变，是负控。
- 380：`conversation.view` 的 tab 宽度由 vendor 主导航排版决定；pack 不应硬编码中文宽度。
  可选：en tab 用短标签 `Methods`，完整名保留在页面标题/可达文本；或扩 tab 宽度。计划选
  **短标签 + 完整页标题**（不改 vendor），P0 先确认 tab label 的 owner 与 title/aria 能力。
- 379 的「顶栏 subagent 计数」若不在 pack locale，P0 记为 vendor 边界；本批只修 pack-owned
  计数键，不冒充 vendor 修好。

### 2.4 不做的方案

- **一次把全部 client 文案/布局重构**：379/380 是 locale 面，和 M1/M2 的 state 设计不同；
  混在一起会让「事实正确」和「英文好看」互相掩盖。
- **只把 `hasFile` 换成 `text.trim()!==''`**：383 的标题-only 仍非空；381/382 的 0 字节可修，
  但线性推断仍补 done；必须谓词 + unknown 双管。
- **把 `_failed.md` 改名/删掉**：它是研究纪律的失败登记，不能因为计数 bug 删除；计数层排除。
- **给 plan.md 保持 nonEmpty:false 再在状态页特判**：会让 graph/status 两处继续各自解释同一文件；
  policy 改 true，状态页消费 `empty`。
- **改 vendor tab 宽度/样式**：vendor 只读；pack 用短标签/页标题解决，不碰 vendor。
- **把 `1 evidence files` 只做字符串替换**：0/≥2、其他计数、zh 负控会漏；用共享 count helper。

## 3. 修法总览

| 卡 | 机制 | 修法 | owner / 证据 |
|---|---|---|---|
| 381 | 空 findings 让综合 ✓ | findings 进 policy/`StatusReads`；`hasBodyText`；空/读失败 → unknown + warning | `artifact-read`、`useStatusFeed`、`ResearchStatusTab`；S23 |
| 382 | 空 leads 让侦察 ✓ | leads 同上；`hasBodyText`；unknown + warning | 同上；S24 |
| 383 | 标题-only question 仍立项 ✓ | `hasQuestionBody`（复用 first non-heading line）；`questionIssue='body-empty'`；立项 unknown；摘要不「尚未确认」 | `useStatusFeed`、`brief-fold`、question 谓词；S25 |
| 384 | 空 plan 状态页无提示 | `plan.md` policy nonEmpty:true；`plan empty` warning + 「计划版本未知」；graph 既有 empty-source 保留 | `artifact-read`、`useStatusFeed`、`ResearchStatusTab`；S26 |
| 377 | `_failed.md` 算证据 | evidence sentinel 排除；失败登记单独提示；有效计数 | `useStatusFeed`、evidence predicate；S27 |
| 378 | 0 字节证据卡算证据 | evidence card 正文非空；空/读失败不计；挖掘 unknown + warning | 同上；S28 |
| 379 | en 计数无单数 | `countText(t,count,oneKey,otherKey)`；覆盖 evidence/questions/checkpoints/nodes/tasks（subagent 若 pack-owned） | `lib/shared/i18n`、locales；S29 |
| 380 | en 主 tab 截断 | tab 用短标签 `Methods`（zh「方法库」不变），页面标题/可达文本保留 `Method Library`；P0 确认 owner | `client/index.ts`、locales；S30 |

### 3.1 内容谓词（381/382/383/384）

- 新增 `lib/run/artifact-content.ts`（keyless）：
  - `hasBodyText(text)`：去掉 frontmatter/标题/空行后仍有正文；
  - `hasQuestionBody(text)`：至少一个非标题、非空行（与 `questionLine` 同源）；
  - `hasPlanBody(text)`：`planIndex` 有顶层节点或非空计划正文；
  - `isEvidenceCardName(name)`：排除 `_failed.md`/`_` 前缀。
- `ARTIFACT_POLICY` 加 leads/findings/evidence 卡（nonEmpty:true）；plan.md 改 nonEmpty:true。
- `StatusReads` 增 `leads`/`findings`（ArtifactState）；`useStatusFeed` 读 `readArtifact`；
  steps 用 `state==='ok' && hasBodyText`；empty/unreadable/body-empty → unknown；
- `BriefInputs.questionIssue` 增 `'body-empty'`；目标行「研究问题正文为空」；立项步 unknown；
- 状态页 warnings：leads/findings 空/读失败；question body-empty；plan empty；
- `deriveSteps` 测试矩阵：早步 false/unknown + final true → 早步不得 done。

### 3.2 证据有效性（377/378）

- `useStatusFeed` evidence 读取：只对 `.md` 文件逐个 `readArtifact('evidence/<name>')`（或
  `readArtifact` 结果矩阵）；排除 `_failed.md`；有效卡 = `state==='ok' && hasBodyText`；
  `evidenceCount` = 有效数；`evidenceEmptyCount`/`evidenceUnreadableCount`/`failedLogPresent`；
- `face.evidenceIssue`：`'failed-only' | 'empty' | 'unreadable' | null`；状态页 warning；
- steps：有效 0 且 evidence 目录在场 → unknown `evidence`；有效 1/9 正控；
- 纯函数 `evidenceSummaryOf(entries, read(...))` 可测试；浏览器 S27/S28 覆盖。

### 3.3 英文计数/导航（379/380）

- `countText(t, count, oneKey, otherKey)`：`count===1` 用 one，否则 other；zh 两键同值。
- 覆盖 `statusEvidenceCount`、`questionCount`、`statusDecisionStops`、`graphKept`、
  `graphCoverage`（nodes）、`graphTeamTasks`（total）；subagent 计数 P0 定 owner。
- 主 tab：新增 `methodLibraryTab`（zh「方法库」/en `Methods`）；`index.ts` 的 label 用它；
  页面标题/说明继续 `methodLibrary`（`Method library`）；P0 确认 slot 是否支持 title/aria，
  不支持则完整名在页面 heading；窄屏截断必须有可达全名。

## 4. 修的次序

### P0 证据复核与入口（0.5–1 会话）

- 复跑八条夹具，确认 J46–J53 仍红；383/384 共用夹具要分别收状态页/图谱文本；
- 379/380 确认 owner：`methodLibrary` 是 pack label；subagent 计数若 vendor → 记边界；
- 八卡补 `## 分诊与授权` / `## 批` / `根因证据`，真问题翻 `修复就绪`；
- 建 `checks/smoke/cockpit-truth-substance.entry.mjs`（S23–S30），登记 registry/checks README；
  预修复红；G25/G26/G27 的纯函数矩阵先落（可红）；
- `pnpm verify` 绿。

### P1 步骤内容实质（381/382/383/384，1–1.5 会话）

- 先落 `artifact-content` + policy + `StatusReads` leads/findings + question body + plan policy；
- 状态页 warnings/unknown；`brief-fold` question body-empty；
- 381/382/383/384 红→绿→`fix-evidence`；S23–S26 绿；
- 旧三入口 24/24 + 31/31 + 28/28 不回退。

### P2 证据有效性（377/378，1 会话）

- evidence 逐卡读 + sentinel 排除 + issue 文案；有效计数；
- 377/378 红→绿→`fix-evidence`；S27/S28 绿；旧入口不回退。

### P3 英文计数/导航（379/380，0.5–1 会话）

- `countText` + 六个计数键矩阵；tab 短标签 + 完整页标题；
- 379/380 红→绿→`fix-evidence`；S29/S30 绿；zh 负控。

### P4 收口（0.5 会话）

- `pnpm verify/test/typecheck/build` 全绿；四入口全绿；
- 批 Note `notes/implemented/2026-11-23-observation-substance.md`；八卡 `fix-evidence`/边界证据 + 归档；
- 程序卡 `已结`；bugs/issues README、triggers、design/40、guides/60、evaluation、checks README 同变更。

## 5. 流程保障

- **每卡 fix-evidence**：changes 含代码/测试/守卫；red/green 同一命令；exit 为 oracle；
  共享入口不替代单卡证据。
- **新入口**：S23–S30 八场景，dev-only/keyless/真浏览器/`medium`；现有三条入口不动；
  慢资产 15/15 已满，不新增 slow；不申请 CAP 例外。
- **G25** 内容谓词：非空 ≠ 有正文/节点/证据卡；步骤只消费谓词，不消费 `hasFile`。
- **G26** sentinel 排除：`_failed.md` 是失败登记，不是证据卡；失败登记可单独呈现。
- **G27** 本地化计数：en 1 单数/0、≥2 复数；zh 不变；`countText` 单一入口。
- **G21 扩展**：canonical 读取点清单加 leads/findings/evidence；evidence 逐卡读必须走
  `readArtifact`，新裸读 = 红。
- **反证**：`deriveSteps` 早步 false + final true 矩阵；question body-empty；evidence sentinel；
  en one/plural；修复前 S23–S30 逐场景红。

## 验收标准

- 381：findings 0 字节/纯空白/不可读 → 综合不 done，显示「综合材料为空/读取失败」+ 重试；
  有效 findings → 综合 ✓；absent 旧 run 不回退。
- 382：leads 同上；有效 leads → 侦察 ✓；absent 不回退。
- 383：question 只有标题/空小节 → 「研究问题正文为空」，立项不 ✓，不再「尚未确认 + ✓立项」；
  有问题正文 → ✓；0 字节 → BUG-367 文案；缺席 → 「尚未定稿」。
- 384：plan.md 0 字节/纯空白 → 状态页「计划为空/无计划版本」；不可读 → BUG-375 文案；
  缺失 → 旧 run 空态；有节点 → 正常。
- 377：只有 `_failed.md` → 0 份证据、挖掘不 done、失败登记有独立提示；1 卡 + failed → 1；
  9 卡 + failed → 9；无 evidence → 0。
- 378：0 字节卡 → 0 份、挖掘不 done、空证据提示；空卡 + 有效卡 → 只计有效；有效 1 → 1。
- 379：en 1 evidence file / 1 question / 1 checkpoint / 1 node / 1 task；0/≥2 复数；zh 不变。
- 380：en 主 tab 完整可读（短标签 `Methods` + 页面标题 `Method library` 可达），zh「方法库」
  不变；窄屏截断有全名可达。
- 机械：verify/test/typecheck/build 全绿；四入口 24/24 + 31/31 + 28/28 + S23–S30 全绿；
  八卡 fix-evidence/边界证据 + 归档；批 Note/程序卡/docs/triggers 同变更。

## 停止条件

- 379 的 subagent 计数归 vendor：只修 pack-owned 键，卡内记 vendor 边界 + trigger；不冒充修好。
- 380 的 tab label 由 vendor 固定宽度且不能短标签：先确认 slot 是否支持 title/aria；若都不行，
  以「短标签 + 页面标题」收口，不修改 vendor。
- 381/382 若 `deriveSteps` 线性推断需要改公共契约：先加 unknown 矩阵与调用方，再改默认语义；
  已修 356–375 负控全绿前不推进。
- 383 的 question body 谓词误伤合法「只有研究问题标题」的 question.md：以 canonical 正文行
  为准；若用户确认只有标题也可立项，停 P1 另立产品决定。
- 377/378 的 evidence 逐卡读在真实 9+ 卡 run 上超时：先加 limit/并行与缓存；不上调状态页
  刷新频率，不把读失败当 0。
- 主机负载导致浏览器场景 NOT-RUN：记录现场，不用纯函数绿替代浏览器绿。

## 批表

| 卡 | 机制 | P 阶段 | 守卫场景 | 状态（P0 回填） |
|---|---|---|---|---|
| 377 | `_failed.md` 算证据 | P2 | S27 | 排查中 |
| 378 | 0 字节证据卡算证据 | P2 | S28 | 排查中 |
| 379 | en 计数无单数 | P3 | S29 | 排查中 |
| 380 | en 主 tab 截断 | P3 | S30 | 排查中 |
| 381 | 空 findings → 综合 ✓ | P1 | S23 | 排查中 |
| 382 | 空 leads → 侦察 ✓ | P1 | S24 | 排查中 |
| 383 | 标题-only question → 立项 ✓ | P1 | S25 | 排查中 |
| 384 | 空 plan 状态页无提示 | P1 | S26 | 排查中 |

## 执行入口（goal 用）

- 每轮先读本卡 §4；只推进当前阶段；阶段结束回填「实际红/绿/未跑 + 卡状态」。
- 每卡翻状态前对照 §验收标准；缺证据停在该状态。
- 379/380 先确认 owner；vendor-owned 部分只记边界，不写进 pack 修复证据。
- 收口条件 = §验收标准 全部成立，而不是「代码改完」。
