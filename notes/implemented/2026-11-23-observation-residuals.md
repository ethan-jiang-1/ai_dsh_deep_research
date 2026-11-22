# 观察面残余与跨面事实一致性（BUG-369…376）：共享派生、显示件 watcher 与 376 证伪

> 状态：implemented
>
> 批索引/决定账 = [修复程序卡](../../_backlog/_archived/settled_issues/2026-11-23-observation-residuals-program.md)。
> 本 Note 记决定理由、输掉的方案、实际验证与未证边界；逐卡证据在卡内 `json fix-evidence`。

## 决定

1. **审查判定共享**：`review-readiness.ts` 新增 `reviewVerdictOf(reading, states)` 五态
   `pass | fail | conflict | unconfirmed | absent`。`mismatch/ambiguous` = **conflict**（声明与
   review.md 不一致，不得单边取 PASS/FAIL）；review/readiness 空/读失败/非法 = **unconfirmed**；
   无 review 面 = **absent**；其余按 pass/fail。状态页、brief、终稿页签共用，不再各自把 source
   折成 unconfirmed（BUG-369/374）。
2. **终稿页签读声明件**：终稿不再只跑 `terminalReadiness(review.md)`；同时读
   `review/readiness.json` 并调 `readinessOfSources` + `reviewVerdictOf`。conflict/unconfirmed
   显示独立警示 + 重试；absent 不提示；pass/fail 既有态不回退。
3. **watcher 盯显示件**：`final-target.ts` 新增 `watchTargetOf({view, body, reader, ...})`；
   终稿 stale watcher 在 reader/audit/draft 视图分别盯 readable-vN / vN / final.md，切换视图时
   重设 baseline；`load` 首读即时取当前显示件版本令牌，避免首轮 30s 把更新当基线（BUG-371）。
4. **状态页事实清单扩轴**：`StatusReads` 增 `plan`（ArtifactState）与 `final`（SourceRead）。
   plan 读失败/空 → 「计划读取失败/为空」+ 重试，版本面显示「计划版本未知」；final/ 目录
   `unreadable` → 「终稿目录读取失败」+ 重试，保留交付事实但不再无条件显示「v1 已交付」；
   目录缺席/空仍是合法 0 版本（BUG-373/375）。
5. **图谱快照状态机**：`plan/vN.md` 纳入 `artifact-read` 动态 policy；`useGraphFeed` snapshot
   `ready | empty | invalid | missing | unreadable`。0 字节/纯空白 →「快照为空」；非空但零节点/解析
   失败 →「无法解析」；不再把空快照画成零节点图（BUG-370）。
6. **配置页 question 读取态**：`foldMethodAdoption` 增 `question-unreadable` / `question-empty`；
   `useConfigFeed` 改走 `readArtifact('question.md')`；「本次研究」区显示「研究问题读取失败/为空」
   + 重试，`absent` 仍「不在/可能还没立项完成」（BUG-372）。
7. **376 证伪，不写产品代码**：P0 三方对照证明合法 effort 生效——
   `parseDefaults({schema:1,effort:'deep',unknown:'x'})` → `value.effort='deep'` + unknown warning；
   真浏览器 `select.value='deep'`、`selectedOptions[0]='深度档'`、defaults-state=count。原 verdict 只读
   `paneText`（含全部 option 标签）导致假阳性。处置 = 纠正 E2E 断言（S21 读 select.value）+ mixed-key
   回归；卡按 not-a-bug 收口，无产品行为变更。
8. **流程 G21–G24**：
   - G21 跨面读取点清单：`artifact-read.spec` 扫描 client 的裸 `view.read`，只允许已知遗留
     （graph `plan.md` 的 truncated 分态）；新增读取点 = 红。
   - G22 一个事实一套派生：reviewVerdictOf / watchTargetOf / snapshot 状态机 / adoption 状态。
   - G23 诊断文案命名实际状态：冲突不说缺失、空快照不说零节点、mixed 警告不冒充丢值。
   - G24 P0 可以用证据判一张卡不成立；不把「卡数完成」当验收。

## 输掉的方案

- **一次统一所有 cockpit feed 的读取器**：graph/config/defaults 的读面/写面/解析面不同，硬收一个
  大接口会把 8 张卡变成一次高风险重构；本批只收 canonical 文本读取 + 每面一个状态机。
- **按 BUG 号逐张修**：369/374/371 共享 ResearchFinalTab，373/375 共享 StatusReads；逐张会三次改
  同一文件、三次跑同一入口。
- **376 直接改成「整份 invalid」**：parser 已保留合法字段、写命令已 blocked；这是把假阳性变成真的
  行为变化。先证伪，再决定不修产品。
- **把 376 的 paneText 当 select 值**：paneText 包含所有 option 标签，永远命中「自动」；E2E 必须读
  `select.value`/`selectedOptions`。
- **把 371 的等待降到 <30s**：REFRESH_MS=30s；降等待只会制造假绿，保持 35s，入口记 medium
  （慢资产 15/15 已满，不新增 slow）。
- **370 的非空零节点文本猜「空图」**：零节点可能是合法空图或解析失败；用 planIndex + 文本非空判
  invalid，不猜。
- **把新八场景塞进现有 366 行入口**：超 550 CAP；拆第三条入口，不申请例外。

## 实际跑过的验证

- **机械**：`pnpm verify` 全绿；`pnpm test` 全绿（266 checks + 全量 spec）；`pnpm typecheck` exit 0；
  `pnpm build` exit 0；`export-dist` 重建后 verify 绿。
- **残余入口**：`cockpit-truth-residuals.entry.mjs` **28/28 PASS，exit 0**；修复前同一命令
  **17/28，exit 1**（S15/S16/S17/S18/S19/S20/S22 各自命中；S21 正向绿，证明 376 非缺陷）。
- **旧入口回归**：`cockpit-truth.entry` **24/24 PASS**；`cockpit-artifact-truth.entry` **31/31 PASS**。
- **纯函数矩阵**：`reviewVerdictOf` 五态 + 不变量；`watchTargetOf` reader/audit/draft/空态矩阵；
  `brief-fold` 冲突/未定；`artifact-read` 五态 + `plan/vN` policy；`method-of-question` 七态；
  `status-feed` 零裸 `view.read` + plan/final 轴；`final-tab-patterns` 零裸 `viewIo.read`。
- **376 变异红**：临时把 unknown 键从 `warnings` 改到 `problems` → mixed 回归红（exit 1）；还原后
  **17/17 PASS，exit 0**。证明回归会咬人；产品代码未改。
- **未跑（不冒充通过）**：L2 安装/首启（不改安装形态/入口）；真模型/snapshot（不改模型可见内容）；
  en 浏览器装配面（zh 字典/en 折叠 i18n 有单测，浏览器仍以 zh-CN 为主）。三条入口均 dev-only，
  未进 CI/nightly。
- **未证边界**：371 的 35s 等待依赖主机负载；连续两轮稳定后再议 nightly。370 的「非空零节点」
  判 invalid 是产品取舍（零节点计划可能是合法空图）；若真实 run 出现合法零节点快照，另立卡。

## 判据形状

- **权威事实**：审查结论只认 `readinessOfSources` + `reviewVerdictOf`；终稿显示只认
  `finalViewOf` + `reviewVerdict`；状态读取只认 `StatusReads` 八轴；图谱快照只认
  `readArtifact('plan/vN.md')` + snapshot 状态机；配置方法节只认 `foldMethodAdoption` 七态；
  defaults 只认 `parseDefaults` 的 value/warnings/problems。
- **读取方**：`useStatusFeed`、`ResearchStatusTab`、`ResearchFinalTab`、`useGraphFeed`/
  `GraphVersionRail`、`useConfigFeed`/`ResearchConfigTab`、三条浏览器入口、纯函数矩阵。
- **坏输入**：review 冲突/未定/缺席/读失败、plan 读失败/空、final 目录读失败、question 读失败/空、
  plan/vN 空/非空零节点、defaults mixed 键，全部与邻态分开；回退/空态/冲突必须可见。
- **旧形态退场**：状态页 `mismatch → unconfirmed` 退场；终稿只读 prose 退场；stale watcher 固定 audit
  退场；graph snapshot `read.ok → ready` 退场；config `!read.ok → null/hasFile` 退场；
  376 的 paneText 假阳性退场。
- **反证**：reviewVerdictOf/watchTargetOf/artifact-read 矩阵；brief/status 源级接线；S15–S22
  双断言；旧 S1–S5/S6–S14 回归；376 变异红；修复前 17/28。

## 残余与未证边界

- 三条浏览器入口均 `dev-only`（真浏览器 + 文件突变 + 主机负载敏感）；重议条件 = 连续两轮稳定，或
  `client-load` 吸收场景。
- en 浏览器装配面未跑；重议条件 = 下一次 en 装配夹具。
- graph `plan.md` 仍保留裸读以区分 `truncated`；G21 清单显式登记为已知遗留。若新增 canonical 文本
  读取点，必须先进 `ARTIFACT_POLICY` + G21 清单。
- 376 卡按 not-a-bug 收口；若用户要求「整份 invalid」取向，另立产品决定，不重开本卡。
- `final.md` 通用地址的「当前工作稿 vs 最新版本」回退合同不变；本批未改。
