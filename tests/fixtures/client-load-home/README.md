# client-load-home — client-load.entry 的种子夹具

用途：让 `scripts/smoke/client-load.entry.mjs` 在**干净机器 / CI** 上跑完整的真浏览器断言
（`--seed tests/fixtures/client-load-home`），不需要预置 dev home。实现 = `scripts/smoke/client-load-seed.support.mjs`。

## 布局

```
sessions/<sessionId>/session.v4.jsonl        明文会话日志（正本是明文；materialize 时压成 zstd）
workspace/research-workspace/
  method-library.md                          用户方法库（「格局调研」行 = pass-3c 的库条目正例）
  drt_unsc-p5-members/                       绑定会话的已交付 bundle（渐进面/终稿页签的磁盘真值）
  archive/drt_cn-open-vs-us-closed-agentic/  方法库「从已完成研究沉淀」的来源正例（smoke 里点名）
```

文本里两个占位（`scripts/smoke/client-load-seed.support.mjs` 在 materialize 时替换）：

- `__WORKSPACE__` → 种子工作区绝对路径（如 `runtime/smoke-workspace/seed/research-workspace`）；
- `__REPO_ROOT__` → 当前 checkout 的仓根（会话日志里历史工具路径的仓根前缀，仅为可移植性）。

## materialize 规则（三条实测边界，改夹具前必读）

1. **组目录名 = vendor `projectKey(种子工作区绝对路径)`**：会话日志头 `id` + `cwd` 必须与落盘路径
   吻合（vendor `assertStoredIdentity`）；组名不能手抄，按 cwd 现算。
2. **默认会话后端是 zstd**：明文 `.jsonl` 会被 `encodingMismatch` 拒绝，workspaceRegistry 不激活
   （`workspace/create` → service-unavailable）。故 materialize 写 `session.v4.jsonl.zstd`。
3. **zstd 首帧必须恰好只有 header 一行**（vendor `assertZstdHeaderFrame`）：帧 1 = header + 换行，
   帧 2 = 其余事件。整份日志压一个帧时 vendor 会把会话当 corruption **静默跳过**（无报错、侧栏只剩空会话）。

另：会话 mtime 回拨 2 小时（冒烟排除"30 分钟内仍写盘"的在飞会话）；materialize 每次清空并重建
`runtime/smoke-workspace/seed-home/` 与 `runtime/smoke-workspace/seed/`（均 gitignored）。

## 内容与断言依赖

- `session-2473b678…`（bound，507 事件 / ≈279 KB）：取自 dev home 的「联合国安理会五常国家」run 会话，
  只截断长 payload（assistant 正文 320 字、工具参数 160 字、`data.stream` 清空），**事件条数与 seq 不变**
  （vendor v4 的 `deliverables/presented` / `delivery-accepted` 关系仍自洽）。断言依赖：
  - 末条 assistant 正文以 `**结论：截至 2026 年 11 月 1 日…` 开头（marker 身份核）；
  - `present` 工具调用声明 `drt_unsc-p5-members/final/v1.md`（交付门/终稿页签）；
  - 窗口内 12 条活动行（pass-3 行数对账）；
  - HITL 两问均已作答（无挂起，锚点由文件事实承载）。
- `session-82b7f4fb…`（unbound，21 事件 / ≈6 KB）：纯 Q&A 负样本（无 `drt_` 工具路径、无挂起 ask），
  pass-2 的「未绑定提示行 / 零泄漏 / 队员区不渲染 / 🎯 尚未确认 / 本次研究区无 run 态」用它。
- `drt_unsc-p5-members/`：question.md 首行、evidence 9 张卡（含 `_failed.md`，计数对账）、final.md、
  final/v1.md（终稿页签默认正文）、review.md 顶部 `readiness: PASS`（终局块）、plan.md 4 个 active 节点
  （研究图谱覆盖率行）。**不要改**这些文件的在场性/首行/命名，否则断言期望会跟着变（多数断言是
  「UI = 盘侧同一折算」的自洽核对，改内容通常仍绿；但 marker/问题行/终稿标题是跨面锚点）。
- `archive/drt_cn-open-vs-us-closed-agentic/`：名字是 smoke 的 pass-3c 硬编码候选；非空
  `final/v1.md` + `question.md`、`run.md` phase: accepted + `delivered.json` + 旧式 `acceptance.md`
  同时在场，满足 `isCompletedMethodSourceRun`（两条完成读法任一成立即可，留两条是防读法漂移）。

## 重新录制（dev home 有新的干净样本时）

1. 在 dev home 选一条绑定 `drt_*` 的已交付会话 + 一条无 `drt_` 的短会话（无挂起 ask）；
2. 按上面的截断规则生成明文（保留事件条数/顺序/seq；把所有绝对工作区路径换 `__WORKSPACE__`、
   仓根换 `__REPO_ROOT__`）；
3. 同步更新对应 bundle（只保留 client 读的文件：question/findings/review/final/final\/vN/plan/topics/
   evidence；**不要**带 provenance/audit/manifest——客户端不读，徒增体积）；
4. 跑 `node --import tsx/esm scripts/smoke/client-load.entry.mjs --seed tests/fixtures/client-load-home --port 3109`
   全绿后提交；体积目标 < 0.5 MB（当前 ≈ 0.31 MB / 29 文件，含本 README）。
