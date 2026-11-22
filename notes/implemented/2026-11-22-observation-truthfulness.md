# 观察面事实真实性（BUG-356…360）：读失败三态、地址目标与交付×审查矩阵

> 状态：implemented
>
> 批索引与决定账 = [修复程序卡](../../_backlog/_archived/settled_issues/2026-11-22-observation-truthfulness-program.md)。
> 本 Note 只记决定理由、输掉的方案、实际验证与未证边界；逐卡证据在卡内 `json fix-evidence`。

## 决定

1. **观察面事实显式三态，不再折平**：`lib/run/brief-fold.ts` 提供 `SourceRead = ok | absent | unreadable`
   与 `readStateOf(Outcome | null)` 单一映射；`StatusReads` 同时携带 bundle / review / evidence。
   `useStatusFeed` 在 `openRun` / `read` / `list` 失败时写 unreadable，不再落 `null` / `0`。
   `scanSettled` 区分「首扫还没落定」与「真读失败」，避免首帧假失败。
2. **失败态与空态分开**：bundle 读失败 → 「研究状态读取失败」+ 重试，摘要优先级在未绑定之后、
   审查/交付之前；review 读失败 → 「审查文件读取失败」；evidence `list` 失败 → 「证据读取失败」，
   不显示「证据 0 份」。三者共用 `retry()` 重扫。
3. **步骤条四态**：`RunStep.state` 增 `unknown`；`deriveSteps` 接 `unknown` 键，读失败步标 `?`
   且不被后续在场步线性推断抹成 done。`TrackRail` 用琥珀 `?`，图例同步。
4. **地址目标版本优先**：`finalTargetOf(plan, versionNames)` 返回 `{version, audit, reader, fallback}`；
   `final/vN.md` / `readable-vN.md` 地址点名的版本是正文身份，目标缺失即失败态，版本账最高号不得
   覆盖；只有 `final.md` / `readable.md` 通用地址才回退最新/工作稿；读者版只认同版本。
   `latestRunVersion` 的版本词法正本收进 `final-target`，`run-fold` re-export。
5. **交付 × 审查矩阵**：`deriveBusinessBrief` 在「已交付 + review FAIL」时走独立分支——「已交付版本
   仍可用 + 新审查发现问题」；未交付 + FAIL 保留交付前「报告不交付」政策；`delivered × reviewFail ×
   bundleReadFailure × hitl` 有全组合无矛盾性质测试。
6. **守卫分层**：纯函数矩阵（`final-target.spec` / `brief-fold.spec` / `run-fold.spec` /
   `status-feed.spec`）+ 提交的真浏览器入口 `checks/smoke/cockpit-truth.entry.mjs`（S1/S1b/S2–S5，
   keyless，dev-only）。`runtime/e2e/*` 五条一次性夹具只作诊断现场，不作 guard。
7. **流程修正 G12–G16**：按显示事实登记（不是按 reader 枚举）；消费者边界守卫；多轴真值表；
   带目标的地址是权威；与修复冲突的旧测试必须显式改写为更强合同并记录理由。详见程序卡 §5.2。

## 输掉的方案

- **五个局部字符串补丁 / 按 BUG 号逐张修**：五卡共享 `brief-fold`/`useStatusFeed` 同一路径，逐张修会
  二次改同一函数；且只改显示文案不解决事实模型。按机制聚类为 F1/F2/F3 后一次设计。
- **只修 reader 的 `missing/unreadable` 区分**：上一轮 BUG-355 的有界扫描就是这么做的；reader 已区分，
  但 `useStatusFeed` 仍把 Outcome 折平——消费者边界才是故障点。
- **把读失败折成「研究失败」「审查 FAIL」「0 份」**：三者都是错误语义；卡片判据要求失败 + 重试，
  且不污染空/缺席的既有语义。
- **用版本账最高号当交付目标**：v1 已交付 + v2 草稿时读 v2；目标缺失时拿别的版本冒充。地址目标
  才是交付身份。
- **已交付 + FAIL 保留「报告不交付」或改成「已交付失效」**：交付是历史事实、复审失败是新增事实，
  两者合法共存；正确说法是「已交付版本仍可用 + 新审查问题」。
- **只把 runtime 夹具当守卫**：`runtime/e2e/*` gitignored，无法在干净 clone/下一轮复跑；升格为
  `checks/smoke/cockpit-truth.entry.mjs` 才成为可提交证据。
- **新开 `lib/run/status-facts.ts`**（计划首选）：三态模型体量小，且 `brief-fold` / `run-fold` 已是
  直测纯件；并入现有 owner 避免新增文件/faces/索引的机械面。代价是 `brief-fold` 多承担一组读态类型，
  由 `status-feed.spec` 与 `brief-fold.spec` 直接钉住。

## 实际跑过的验证

- **机械**：`pnpm verify` 全绿；`pnpm test` 全绿（266 checks + 全量 spec）；`pnpm typecheck` exit 0；
  `pnpm build` exit 0；`node tools/release/export-dist.mjs` 重建 `_dist` 后 `pnpm verify` 全绿。
- **浏览器五场景**：`node --import tsx/esm checks/smoke/cockpit-truth.entry.mjs` → **24/24 PASS，exit 0**。
  修复前同一命令 **15/24，exit 1**（S2 仍「报告不交付」、S3 仍「研究推进中」、S4 仍 ✓ 审查、
  S5 仍「证据 0 份」+ 全绿）。
- **S1 定向红绿**：把 `finalTargetOf` pinned 分支改回 `latestRunVersion`（注入旧实现）→
  `--scenario S1` **3/8，exit 1**（显示「审计版 · v2」+ v2 正文）；还原 → **8/8，exit 0**。
- **纯函数**：`final-target.spec` 24 例（含 BUG-356 地址矩阵）；`brief-fold.spec` 含 BUG-357 四组合 /
  无矛盾性质与 BUG-358 bundle 读失败；`run-fold.spec` 含 unknown 步；`status-feed.spec` 源级接线。
- **locale**：`client-locale` / `i18n` / `cjk-source` 全绿（新键 zh/en 同 diff，en 零 CJK）。
- **未跑（不冒充通过）**：L2 安装/首启（本批不改安装形态/入口）；真模型与 snapshot（不改模型可见内容）；
  en 浏览器装配面（en 字典 + 折叠 i18n 已有单测，浏览器仍以 zh-CN 为主）。`cockpit-truth.entry`
  为 dev-only，未进 CI/nightly；五场景证据为本机真浏览器。
- **值级不可证**：无——本批判据是用户可见状态串与失败态，浏览器 DOM 直接断言。

## 判据形状

- **权威事实**：文件/目录读取只认 `run-context` 的 `Outcome`（missing / unreadable / ok）；
  `readStateOf` 是唯一映射点；审查终局只认 `terminalReadiness`；交付只认 `present` ∨ 工具回执；
  终稿目标只认地址；不做第二份手写事实。
- **读取方**：`useStatusFeed`（装配三态 + retry）、`deriveBusinessBrief`（五问 + 优先级）、
  `deriveSteps` / `TrackRail`（四态）、`ResearchFinalTab`（地址目标）、
  `checks/smoke/cockpit-truth.entry.mjs`（用户可见结果）、四组纯函数测试。
- **坏输入**：bundle `missing` 与 `unreadable` 分开；review `absent`（真没有）≠ `unreadable`（在而读不到）
  ≠ `FAIL`（读到但不过）；evidence `absent` / `unreadable` / `ok(0)` 三态分开；`final/vN` 目标缺失
  → 失败态，不换文件/版本；已交付 + review FAIL 是合法共存。
- **旧形态退场**：`finalReadPlan` 的「地址不影响正文」旧合同退场（测试显式改写）；`reviewFail:
  boolean | null` 不再作为状态页唯一审查态；`face: null` 不再兼任读失败；旧 bundle 数据不迁移、不兼容。
- **反证**：每个分支以注入旧实现/回退单态看红（S1 注入即 3/8；全入口修复前 15/24）；
  brief 做全组合无矛盾性质；地址矩阵四方向；浏览器每场景「该出现/不该出现」双断言。

## 残余与未证边界

- `cockpit-truth.entry.mjs` 为 `dev-only`（真浏览器、文件突变、主机负载敏感），未进 CI/nightly；
  重议条件 = 连续两轮发布/nightly 稳定后升 nightly，或 client-load 相位吸收五场景。
- en 浏览器装配面未跑（J16 旧缺口）；en 字典/折叠 i18n 已有单测。重议条件 = 下一次 en 装配夹具。
- 真模型遵守（上一批 canonical）仍属 L2/L4 边界，与本批无交集；不复述为已证。
- 本批不覆盖 `final.md` 通用地址的「当前工作稿 vs 最新版本」产品取舍；既有回退语义保留。
