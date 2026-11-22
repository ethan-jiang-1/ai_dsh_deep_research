# 观察面工件真实性（BUG-361…368）：五态、读取点收口与可见回退

> 状态：implemented
>
> 批索引与决定账 = [修复程序卡](../../_backlog/_archived/settled_issues/2026-11-22-observation-artifact-truth-program.md)。
> 本 Note 只记决定理由、输掉的方案、实际验证与未证边界；逐卡证据在卡内 `json fix-evidence`。

## 决定

1. **工件读取五态**：`lib/run/artifact-read.ts` 定义 `ArtifactState = ok | absent | unreadable | empty |
   invalid`，带 `ARTIFACT_POLICY`（文本/JSON、是否必须非空）与 `readArtifact` 唯一 `view.read` 入口。
   空 ≠ 缺席 ≠ 读失败 ≠ 非法：0 字节 canonical 工件是 `empty`，坏 JSON/形状是 `invalid`，truncated
   是 `unreadable`；evidence 目录/`final/` 目录/bundle 仍走 `readStateOf` 三态。
2. **事实清单闭合**：`StatusReads` 扩为 bundle / question / review / readiness / evidence / receipt；
   终稿 `FinalContent`（body/reader）由 `readArtifact` 构造。状态页与终稿页签的文本工件读取全部走
   `readArtifact`，源级守卫禁止裸 `view.read`（G19）。新增读取点必须进 policy 表 + 测试 + 浏览器场景。
3. **question 四态**：ok → 问题行 + ✓ 立项；absent → 「尚未定稿」；empty/unreadable → 目标行
   「研究问题为空/读取失败」+ 重试，立项步 `unknown`，不显示「尚未确认」+✓。
4. **审查四态**：`readinessOfSources` 的 `declaration|prose` 且有 boolean → pass/fail；
   `missing|invalid|mismatch|ambiguous`、空/读失败的 review 或 readiness → `unconfirmed`；无 review
   面 → `absent`（BUG-347 语义）。步骤条只在 pass/fail/absent 时 done，unconfirmed → `unknown`；
   业务摘要 delivered+unconfirmed 保留交付事实但明确「审查结论未确认」，不说审查通过。
5. **回执五态**：只有 `ok` 且 `deliveryFromReceipt` 通过才出交付；`unreadable/empty` →
   「交付回执读取失败」，`invalid` → 「交付回执不合法」，均带重试；absent + 窗口无 present →
   「交付未见证」；旧 install-only 形状 → invalid，不冒充（BUG-345 负控）。
6. **终稿视图矩阵**：`finalViewOf({body, reader, requested})` → `{view, notice, failure}`。
   请求版 ok 展示它；请求版空/读失败时另一版 ok → 回退 + 可见提示；审计版空/坏而读者版 ok 也提示；
   两版不可用 → `empty` / `unreadable` / `missing` 失败态。跨版本绝不回退（356 已定）。
7. **流程机械面**：G17 非空 canonical 工件、G18 回退/空态可见、G19 读取点收口 + 源级清单、
   G20 同一类第三次出现后先闭合清单/入口。守卫拆两条浏览器入口（旧五场景 + 新九场景），
   不申请 550 行 CAP 例外。

## 输掉的方案

- **继续在 `brief-fold` 里加第三态**：终稿页签不消费它，状态与终稿各造一套；第三批之后仍会从第五个
  读取点漏。改为共用 `artifact-read`。
- **逐卡补字符串/逐卡加分支**：终稿三卡共享 `ResearchFinalTab`，状态五卡共享 `useStatusFeed`；
  按号修会二次改同一路径，且不解决读取点收口。
- **把空文件当 absent/unreadable**：空是「工件在但没内容」，缺席是「没有工件」，读失败是 IO；
  三者用户措辞与修复动作不同，混用会让「重试」无效或把空当未做。
- **只修 reader 的 `ok/missing` 两态**：终稿页签仍只判 `read.ok`；empty/invalid 永远到不了失败态。
- **一条大浏览器入口塞 14 场景**：旧入口 357 行 + 新九场景超 550 CAP；拆两条入口而不是抬上限。
- **为旧 bundle 加兼容/second reader**：沿用「不做旧产物兼容」；旧数据不迁移，观察面只如实说
  空/读不到/非法。
- **把 `final/` list、`plan.md`、终稿 `review.md` 读失败都建卡**：P0 逐行判为当前合同下无用户可见
  假绿/假交付（target 地址 pin 版本；version face 缺席不冒充；status 359 已管 review 读失败；
  pinned delivery 无草稿 toggle），记 `none` + trigger，不为凑数扩卡。
- **新开 `final-view.spec` / `status-facts.spec`**：计划首选，但现有 `final-target.spec` /
  `artifact-read.spec` / `brief-fold.spec` / `run-fold.spec` 已覆盖同一 owner；并入避免新文件、
  index、asset-ledger、guard-ledger 的重复机械面。偏差记录在程序卡与卡内 guard 链接。

## 实际跑过的验证

- **机械**：`pnpm verify` 全绿；`pnpm test` 全绿（266 checks + 全量 spec）；`pnpm typecheck` exit 0；
  `pnpm build` exit 0；`export-dist` 重建后 verify 绿。
- **新浏览器九场景**：`node --import tsx/esm checks/smoke/cockpit-artifact-truth.entry.mjs` →
  **31/31 PASS，exit 0**；修复前同一命令 **15/31，exit 1**（S6/S7/S8/S9/S10/S11/S12/S13/S14 各自命中）。
- **旧五场景回归**：`cockpit-truth.entry` **24/24 PASS，exit 0**（P1 后、P3 后各跑一次）。
- **纯函数**：`artifact-read.spec`（outcome × 空/非空/truncated/JSON 坏 × 六类工件）；
  `final-target.spec` 的 `finalViewOf` 矩阵 + 不变量（view=reader→reader ok；view=audit→body ok；
  无失败→至少一版 ok；提示与视图互补）；`brief-fold.spec` questionIssue/reviewUnconfirmed/负控；
  `run-fold.spec` question unknown；`status-feed.spec` 源级接线 + 零裸 `view.read`；
  `final-tab-patterns.spec` 终稿零裸 `viewIo.read`。
- **locale**：新键 zh/en 同 diff；`client-locale` / `i18n` / `cjk-source` 全绿。
- **未跑（不冒充通过）**：L2 安装/首启（不改安装形态/入口）；真模型/snapshot（不改模型可见内容）；
  en 浏览器装配面（en 字典/折叠 i18n 有单测，浏览器仍以 zh-CN 为主）。两条浏览器入口均为 dev-only，
  未进 CI/nightly。
- **值级不可证**：无——本批判据是用户可见状态串/失败态，浏览器 DOM 直接断言。

## 判据形状

- **权威事实**：文本工件只认 `readArtifact` 的 `ArtifactState`；`artifactStateOf` 是唯一映射；
  审查终局只认 `readinessOfSources` 的 source + boolean；交付只认 `present` ∨ `ok` 回执；
  终稿目标只认地址；终稿展示只认 `finalViewOf`。不做第二份手写事实。
- **读取方**：`useStatusFeed`、`deriveBusinessBrief`、`deriveSteps`/`TrackRail`、
  `ResearchFinalTab`/`finalViewOf`、两条浏览器入口、纯函数矩阵。
- **坏输入**：question/review/readiness/receipt/final body/reader 的 `absent` / `unreadable` /
  `empty` / `invalid` 必须分开；`reviewVerdict` 的 pass/fail/unconfirmed/absent 必须分开；
  reader↔audit 互补回退必须有提示；已交付 + unconfirmed 不得显示 ✓ 审查，也不得把交付徽标改成
  「未交付」；空正文不得渲染空白，空读者版不得藏起非空审计版。
- **旧形态退场**：`readStateOf` 三态不再承担文本工件；`useStatusFeed` 的「只认 declaration/prose」
  退场；`ResearchFinalTab` 的 `readerText !== null` 判有效读者版退场；旧 install-only 回执仍 invalid。
- **反证**：`artifact-read.spec` 内容矩阵；`finalViewOf` 全组合不变量；`brief-fold` 组合；
  浏览器 S6–S14「该出现/不该出现」双断言；旧 S1–S5 回归；修复前新入口 15/31。

## 残余与未证边界

- `cockpit-artifact-truth.entry.mjs` 为 `dev-only`（真浏览器 + 文件突变 + 主机负载敏感），未进
  CI/nightly；重议条件 = 连续两轮稳定，或 `cockpit-truth`/`client-load` 吸收九场景。
- en 浏览器装配面未跑；重议条件 = 下一次 en 装配夹具。
- 潜在行 `final/` list、`plan.md`、终稿 `review.md`、`final.md` 草稿读失败判 `none`；若真实用户路径
  出现可见假绿/假交付，建新卡（369+），不重开已修卡。
- `final.md` 通用地址的「当前工作稿 vs 最新版本」回退语义保持既有合同；本批不改。
- 本批新增 `artifact-read.ts` 与五态；后续新增文本工件必须进 `ARTIFACT_POLICY`，否则
  `readArtifact` 返回 invalid（fail-loud，不猜）。
