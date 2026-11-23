# 观察面读失败、解析宽容与异步收尾（BUG-385…403）：读不到 ≠ 没有、放宽容错、失败出口必须解锁

> 状态：implemented
>
> 批索引/证据 = 逐卡 `json fix-evidence`（归档池 `_backlog/_archived/fixed_bugs/`）；
> 本 Note 记决定理由、输掉的方案、实际验证与未证边界。
> 前置批 = [观察面残余](../../notes/implemented/2026-11-23-observation-residuals.md) 与
> [内容实质](../../notes/implemented/2026-11-23-observation-substance.md)。

## 决定

1. **读策略按工件语义分档，不按「默认 40 行」一刀切**（BUG-385）。`run-context.readPolicyOf`
   把 canonical 研究工件扩到 `eof`：`question.md` / `leads.md` / `findings.md` / `evidence/*.md` /
   `review.md` / `review/readiness.json` / `delivered.json` / `final.md` / `final/vN.md` /
   `final/readable*.md`；`plan.md`/`plan/vN.md` 仍 800 行；其余 40 行。理由 = `artifact-read` 把
   `truncated` 判成 `unreadable`，40/80 行窗会把真实长度的合法工件变成「读失败」，而 canonical
   工件没有「只读开头就够」的语义。到 eof 的翻页仍有 64 页上限，触顶照旧 `truncated`（负控在
   `run-context.spec.mjs`）。

2. **`final/` 目录读失败 ≠ 没有版本账**（BUG-386）。`ResearchFinalTab` 用 `readStateOf(listed)`
   区分 `absent`（合法旧形态 → 回落 `final.md`）与 `unreadable`（显式失败 + 重试，`finalDirUnreadable`）。
   不做「读失败就当空目录」的 fallback：那会把工作稿伪装成当前终稿，并静默隐藏同版读者版。

3. **失败态必须原子**（BUG-387）。`ResearchFinalTab` 的失败出口收成一个 `failLoad(key)`：清
   `text`/`readerText`/`draftText`/`readerName`/`shownVersion`/`stale` 再置失败。旧渲染守卫是
   `failure !== null && text === null`——残留正文会绕过主失败屏，只在长报告底部留一行小字。

4. **已读工件的失败态不得因为别处正常而被吞**（BUG-388/389）。状态面新增两个事实：
   `BundleFace.evidenceUnreadable`（可读卡之外的失败卡数）与 `BundleFace.finalBodyIssue`
   （工作稿 `final.md` 的 empty/unreadable/body-empty）。通知层分别给
   `statusEvidencePartialUnreadable` 与 `statusFinalReadFailed`；计数继续只代表可读卡，不冒充全集。

5. **快照目录读失败与快照文件读失败各自成态**（BUG-390/391）。`GraphFeedState.snapshotsState:
   SourceRead` 记录 `plan/` 列举结果（抛错 = unreadable，不是 absent）；版本轨在 unreadable 时
   显示 `graphSnapshotListFailed` 而不是「无旧图快照」。差异卡改用 `snapshotDiffMessage(state)`
   对 `SnapshotState` 穷举（`assertNever`），并给重试；`retryTick` 进入快照 effect 依赖——
   旧实现让 `retry()` 只能重跑 plan 读取。

6. **异步轮询属于发起时的会话代际**（BUG-392）。`useConfigFeed.send` 绑定 `AbortController`
   + `stillMine()`（组件存活 / 未中止 / `sessionRef` 与 `epochRef.current` 都指向发起会话），
   切会话立即 abort；轮询自己的 `reload` 会推进 `epoch.seq`，因此归属判据**不比较 seq**
   （比较会把每次对账都判成越代）。

7. **方法库写队列的失败出口统一解锁**（BUG-397/401）。`useOperationQueue` 抽 `failOperation(detail)`
   = 写回执 + `setSending(false)` + `releaseCoachIfIdle()`，覆盖 7 处预检早退；`sendCoach` 用
   try/catch 收尾（抛错按发送失败清理 pending/timeout）。`MethodLibraryView` 抽
   `clearQueuedOperation()`，`watchCoach` 的 `.catch` 同时清队列 ref/30s 超时并释放 `sending`。
   「排队恢复」与「建连失败」共用同一收尾，30s 后不再覆写明确错误。

8. **重置即失效**（BUG-398/399）。`useRunSourcePicker.abortRunRead` 在 abort 后**清空** controller
   ref（只 abort 不清引用，被取消代次仍通过 `ref === controller` 守卫回写 `cancelled`），
   卸载再加一条 cleanup；`DefaultsPanel` 的 `confirmClear` 绑 `[sessionId]` 复位——
   破坏性二次确认不得跨会话上膛。

9. **解析器与门禁入口共用同一事实源**（BUG-393/394/402/403）。
   - `method-of-question` 的字段行改用与 `library-fold` 同口径的正则（前后空白 / `-*+` /
     加粗键 / `[:：]`），并按 `\r\n|\r|\n` 归一、剥 BOM；
   - `review-readiness` 的重复键判定换成零依赖 JSON key scanner（解码 `\uXXXX`/`\"`，任意层级）；
   - `run-dashboard-core` 的 topics/leads/findings（含 `研究类型`/`深度与篇幅`）统一 `[:：]`；
   - `protocol-audit` 删掉影子方法库解析，条目解析收进 `protocol-audit-core.methodLibraryEntryOf`
     （`foldLibrary` 精确 `entry.name === name`），并用 `hasOwnProperty` 区分「未提供 / 显式
     undefined（文件缺失，BUG-307）/ null（条目缺失，BUG-276）」——解构默认值曾把显式 undefined
     吞成 null，使 BUG-307 分支成为死代码。

10. **工具回执只认请求参数**（BUG-396/400）。`method_library_set_default` 的核对与回执改用
    `requestedName`（模块级 `name` 是插件名）；`MethodLibraryToolCard` 对 remove 从 `args.name`
    取名称。

11. **测试底座补 `DOMParser`**（BUG-395，已随前序归档）。JSDOM 环境缺该全局，任何含 LaTeX
    公式的真实报告在 primitives 渲染期抛 `ReferenceError`；`client-dom-helpers` 绑定后
    385/395 的「真实规模 + 公式」矩阵才可跑。

12. **pnpm 设置迁入 `pnpm-workspace.yaml`**（工具态，非产物行为）：pnpm 11 不再读 `.npmrc`
    的 `verify-deps-before-run`，导致非 TTY 下 `pnpm <script>` 触发 install 并中断；设置改由
    workspace 文件承载（`.npmrc` 保留为历史记录）。

## 输掉的方案

- **给 40 行窗加「够不够」的判断**：没有可信长度来源（`read` 返回的 lines 已截断），只能猜。
  按工件语义分档才是可解释的判据。
- **`final/` 读失败时回落到工作稿 + 一条提示**：提示会被页尾淹没，且读者版配对信息永久丢失；
  观察面宁可显式「读不到终稿目录」并给重试。
- **把 `final.md` 读失败塞进 `StatusReads.final`**：该槽语义是 `final/` **目录**；混用会让
  「目录读失败」与「工作稿读失败」互相顶替。独立成 `finalBodyIssue`。
- **`snapshotsState` 只在 UI 层从 `snapshots.length === 0` 推断**：无法区分「没有快照」与「没读到」，
  正是 BUG-390 本身；事实必须由数据层采集。
- **`useConfigFeed.send` 用 `epoch.seq` 判归属**：`reload` 每步推进 seq，会把自身后续轮次判成
  越代（本批第一版即如此，被 `config-feed-behavior.spec.mjs` 抓到）。归属只认会话身份。
- **`sendCoach` 抛错按 unknown 收尾**：unknown 会锁写入口（按钮仍禁用）直到刷新对账；传输层
  已用 `uncertain` 显式表达不确定，抛错按失败收尾更符合「恢复可用」。
- **把 `protocol-audit` 的方法库解析再复制一份到 core**：仍会有两份 grammar；改为 core 直接
  import pack `foldLibrary`（与写路径同一 codec）。
- **在 `evaluateBundle` 里保留 `methodLibraryEntry = null` 默认值**：解构默认值无法区分「没传」
  与「传了 undefined」；用 `hasOwnProperty` 按属性在场性区分，调用方几乎不需要改。

## 实际跑过的验证

- **红→绿**（逐卡在 `json fix-evidence` 记实跑命令与退出码；下表为审批时重跑汇总）：
  - `tests/run/gates/run-context.spec.mjs`（385）、`tests/cockpit/client/tabs-fault-matrix.spec.mjs`
    （385/386/387/388/389/390/391/395）、`tests/cockpit/client/research-config/config-feed-poll.spec.mjs`
    （392）、`tests/cockpit/lib/method-library/method-of-question.spec.mjs`（393）、
    `tests/run/gates/readiness-declaration.spec.mjs`（394）、
    `tests/pack/contract/method-library-tool-defaults.spec.mjs`（396）、
    `tests/cockpit/client/method-library/method-library-queue.spec.mjs`（397/401）、
    `tests/cockpit/lib/method-library/run-source-picker.spec.mjs`（398）、
    `tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs`（399）、
    `tests/cockpit/client/method-library/method-library-tool-card.spec.mjs`（400）、
    `tests/run/analyze/run-dashboard.spec.mjs`（402）、`tests/run/gates/protocol-core.spec.mjs`（403）。
- **真入口（CLI）**：BUG-403 复现脚本（前缀同名方法库 + `protocol-audit.mjs --no-write`）修前
  exit 1（`[method-library] library_fields_sha256 不一致`），修后 exit 0；删库后如实报
  BUG-307「候选路径找不到方法库文件」。
- **全套**：`pnpm lint` 0/0；`tsc -b packages/deep-research-pack` 与 `tsc -p tsconfig.scripts.json`
  零诊断；`pnpm test` spec 1560 + checks 270 全绿；`pnpm verify` 全绿（含 dist 重建后的
  `dist-freshness`）；`tests/checks` 的 asset/guard ledger 重算一致（259 资产 / 257 守卫卡）。

## 未证边界（留给触发）

- 浏览器真机：本批的 386–391 用 JSDOM 故障矩阵覆盖；观感（失败条位置、按钮可用性）仍需
  `client-load.entry` / run 通道真机复核（触发 = 下一次发布前收尾或用户首次撞见观感问题）。
- `useConfigFeed.send` 的 20×3s 轮询上限仍是固定值；模型落笔更慢时停在「已发送/已回话」态是
  设计内行为，未做自适应退避。
- `pnpm store` 仍可能落在全局默认（`.npmrc` 的 `store-dir` 对 pnpm 11 已失效）；本批只修
  `verify-deps-before-run`，store 迁移留给独立触发（会影响 node_modules 重建）。
