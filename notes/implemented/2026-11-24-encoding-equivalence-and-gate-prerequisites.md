# 编码等价与门禁判据前提（BUG-412…423）：同一文本的等价书写必须同判、判据前提为空必须红

> 状态：implemented
>
> 批索引/证据 = 逐卡 `json fix-evidence`（归档池 `_backlog/_archived/fixed_bugs/`）；
> 本 Note 记决定理由、输掉的方案、实际验证与未证边界。
> 前置批 = [2026-11-24 门禁 CLI 解析与会话本地瞬态](../../notes/implemented/2026-11-24-gate-cli-parsing-and-session-local-state.md)。

## 决定

1. **契约文本的行切分只有一个正本**（BUG-412/413/414/417/420）。pack
   `src/lib/shared/text-fold.ts` 新增 `stripBom(text)` 与 `linesOf(text)`：先剥 UTF-8 BOM，再按
   `\r\n|\r|\n` 切、行内不留 `\r`。所有吃 run 工件的逐行解析器改用 `linesOf`——findings-core
   （topics/findings）、node-gate-run-gates（leads 分节、topics 分节、版本索引、headingGate）、
   evidence-audit-core（摘录节）、plan-gate、library-fold。旧代码各自 `split('\n')`，CRLF 的
   行尾 `\r` 让任何以 `$` 收尾的逐行正则失配（`^>\s*(.+)$` 的引文、`^\s{2,}-\s+(.+)$` 的
   must_answer），BOM 又让 `^##`/`^---` 整条失配。

2. **BOM 在解析入口剥离，不在消费方各自补**（BUG-414）。`splitFrontmatter` 自己剥 BOM（证据卡
   frontmatter 的五个消费方同时受益）；`foldLibrary` 走 `linesOf`；JSON 工件同办。BOM 不是内容，
   带不带必须同判（RFC 8259 §8.1 对 JSON 亦然）。

3. **JSON 解析前统一剥 BOM**（BUG-415）。`parseReadinessDeclaration`（pack，门禁与驾驶舱共用）、
   `verdict-audit-core` 的 `parseJson`/`parseRawVerdicts`、`run-receipt.receiptProblems`
   （`delivered.json`）。旧行为把编码差异报成「声明非法 / 回执损坏」，修正提示指向错误方向。

4. **判据前提为空必须红**（BUG-421/422/423）：
   - `scope_role` 缺失 = RED（`leadsGate` 与 `topicsContractIssues` 双侧），覆盖门不再因缺字段
     变成 0/0 空门；显式 `synthesis` 仍免覆盖要求（合法的「无需独立侦察」）；
   - `gap: supported` 却零支撑证据 = RED（supported 的定义就是「有证据」）；`needs_search`/
     `insufficient` 不受影响（它们本就没有证据，负控钉住）；
   - plan 节点表缺 `deps`/`parent` 列 = RED（缺列 ≠ 全列皆空）。`lifecycle` 缺省 = `active` 是
     合理默认，不在此列。

5. **人读日期只走 `localDateStr()`**（BUG-416）。`run-kickoff` 的 closing provenance 与
   `runtime-clean` 的清理清单都改用它；新增守卫扫 `tools/` + `checks/` 的
   `toISOString().slice(0, 10)`（白名单 = `local-date.mjs` 自身），把「再写一次 UTC 切片」变成红。

6. **成功即清错**（BUG-418）。`MethodCoachPanel` 建会话成功分支 `setError(null)`；错误详情走
   `errorDetailOf`（去掉 `Error: ` 工程前缀）。

7. **两腿预算的两种语义分名**（BUG-419）。`legBudget(total, localTimeout)` 只做**初始切分**；
   新增 `remainingAfterLocal(total, elapsed)` = 总预算 − 已耗时（已消耗只扣一次）。旧实现把
   已耗时塞进 `legBudget`，API 腿被重复扣一个 `localTimeout`——本地越慢，回退预算越少，正是
   回退最该救的场景。

## 输掉的方案

- **给每个失配正则补 `m` 旗标**：治不了根因——逐行循环里 `m` 不改变「行尾带 `\r` 时 `$` 不匹配」
  的事实；`linesOf` 是唯一能同时覆盖 `$`、`^` 与 BOM 的入口。
- **在 gate 壳（CLI）里统一 normalize 一次**：解析器还被门禁核、驾驶舱、测试直调；入口层
  归一只是把缺陷挪到第二条调用路径上。
- **给 `scope_role` 缺省值（如默认 primary）**：等于替模型/作者做「这个 topic 需要覆盖」的
  判断，且会让「文件被删字段」继续静默通过——缺省只能用于「有合理默认」的列（`lifecycle`）。
- **把 `deps` 缺列降级为诊断（row-arity 类）**：门禁仍会输出「图无环/无悬空」的结论；诊断
  不改变结论就是假绿。缺列直接 RED，结论才与验证过的事一致。
- **让 `legBudget` 的第三个参数继续存在但改语义**：同一函数名承载「规划切分」与「剩余预算」
  两种语义，下一位调用者必然再踩；拆成两个名字。
- **在 `runtime-clean` 保留 UTC 切片并把它算作「机器时间戳」**：清理清单是给人看的（「清理哪些
  日期之前的产物」），凌晨窗口差一天会让人算错；机器比较用的 `cutoff` 仍保持 UTC ISO。

## 实际跑过的验证

- **红→绿**（逐卡 `json fix-evidence`）：编码批 412/413/414/415/417/420 共用矩阵守卫
  `tests/run/gates/text-encoding-equivalence.spec.mjs`（LF / CRLF / BOM / BOM+CRLF 四变体，
  覆盖 topics/leads/findings/evidence/final/plan/方法库/四种 JSON 工件）；判据批 421/422/423
  住 `node-gate-leads` / `findings-contract` / `plan-gate`；单点 416 住
  `tests/checks/shared/local-date-usage.test.mjs`，418 住 coach RTL，419 住 fetch-fallback。
  每卡都以「临时还原缺陷 → 定向测试 exit 1」采集红证，还原后同命令 exit 0。
- **语义变更随同 diff 改断言**：`library-fold.spec` 的「`## x\r- …` 不产生条目」改为「CR 是合法
  行分隔符、产生 1 条」；`fetch-fallback.spec` 的 `legBudget(…, elapsed)` 旧期望拆成
  `legBudget` 切分 + `remainingAfterLocal` 余量。
- **全套**：`pnpm lint` 0/0；两份 `tsc` 零诊断；`pnpm test` spec 1598 + checks 273 全绿；
  `pnpm verify` 全绿（dist 已按新 pack 源重建）；asset ledger 265 资产 / guard ledger 277 卡一致。

## 未证边界（留给触发）

- **浏览器真机未跑（NOT-RUN ≠ pass）**：本批只有 418 触及 client（方法编辑面板），证据是
  JSDOM + RTL；观感仍在 `client-load.entry` 档。本批复跑记录：`pnpm build` 通过后仍被主机健康
  预检拒绝（load/cpu 2.92 > 1.5，机器负载来自本批之外）。触发 = 下一次发布前收尾或换环境补跑
  `client-load.entry --seed tests/fixtures/client-load-home`。
- **`linesOf` 的换行闭集 = LF/CRLF/CR**：U+2028/U+2029（行分隔符/段分隔符）不在闭集内，Markdown
  契约文本里未见过；若出现需扩 `linesOf` 并补矩阵变体，不要在 gate 里特判。
- **`scope_role` 必填只对「topics.md 在场」生效**：旧 bundle（契约前自由体）由断代/在场级判据
  分流，本批未回扫历史归档；真复跑旧场时若 RED，先看断代而不是改字段。
