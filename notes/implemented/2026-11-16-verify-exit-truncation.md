# 2026-11-16 · verify 退出前不排空 stdout 会截断失败详情（Linux CI 假红根因）

> 状态：implemented

## 决定

- `scripts/verify/verify.mjs` 的失败分支不再 `process.exit(1)`，改为 `process.exitCode = 1` 后自然退出（stdio 排空后再走），并把「全绿」行放进 `else` 分支。退出码语义不变（红仍 1、绿仍 0）。
- 机制：POSIX 下**管道写是异步的**，`process.exit()` 会丢弃尚未排空的 stdout。同一棵树下实测：`> file`（同步）**75,522 B**；管道捕获（异步）**11,401 B**——只剩 15%。失败详情打印在门禁行与「N 处失败」之后，被截断的正是**位于清单末尾的报因**。
- 这解释了长期存在的 Linux CI 假红：`gates.e2e` 用 `out.includes(expect)` 判「门禁是否以本案例的报因红了」，而 9 个中文 expect 案例的报因（align-ledger 的 na 活性三条、repo-conventions 的两条 dev 路径等）恰好排在失败清单末尾 → 被截断 → 报「门禁报了红但非本案例报因」，且**失败案例随截断长度轮换**。macOS 时序不同故历史全绿（暖树绿掩盖 Linux 红）。

## 输掉的方案

- **给 `gates.e2e` 加"等 stdout drain 再比对"**：治的是宿主一侧，但**其他消费者**（CI 日志、人读、任何 `| tail`）同样被截断——证据丢失是 verify 自己的缺陷，应在 verify 修。
- **在 verify 末尾 `await new Promise(setImmediate)` 之类**：不可靠（不保证内核缓冲排空）；`process.exitCode` + 自然退出是 Node 文档推荐的正解。
- **缩小失败清单（只打前 N 条）**：把「证据完整」换成「证据变短」，掩盖问题而非修复。

## 实际跑过的验证

- **红（机制）**：同一 fixture，`node scripts/verify/verify.mjs > file.log` → 75,522 B、含 `na 理由已失效`；同命令经管道捕获 → 11,401 B、不含该串（`expect=false`）。
- **红（端到端，Linux 容器）**：修复前 `gates.e2e` 并行 5 处失败 / 串行 1 处失败（失败案例轮换）。
- **绿（端到端，Linux 容器，修复后）**：`gates.e2e` 并行 → 全绿（133 案例 + 对照组）；`--jobs=1` 串行 → 全绿。macOS 宿主 `node scripts/verify/verify.mjs` → 全绿、exit 0。
- **未跑**：远程 CI（本提交推送后由 run 116 验证 keyless job；gates.e2e 在 keyless job 内）。
