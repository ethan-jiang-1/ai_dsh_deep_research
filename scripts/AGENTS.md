# AGENTS.md — 仓库脚本（门禁与生成器）

`scripts/` 拥有**检查逻辑**：`verify.mjs` 是唯一 L0 聚合入口（门禁清单正本 = [docs/evaluation.md](../docs/evaluation.md) §L0 登记表，本文件不复制计数），其余是分级冒烟与
观察面投影。上游对应物 = DSH `scripts/AGENTS.md` + `scripts/run-gates.ts`。

## 新增或改门禁

流程与判据住在 [`.agents/skills/writing-a-gate`](../.agents/skills/writing-a-gate/SKILL.md)
——**先想红，再写绿**。本文件只记必须在场的事实：

- `verify.mjs` 的 `gates` 数组与 [docs/evaluation.md](../docs/evaluation.md) §L0 登记表
  **两处同步**（`gate-ledger-sync` 门禁对账）；每条新门禁带"注入回归 → 红 → 还原 → 绿"的
  反证记录。
- 失败信息要给出**失败对象 + 违反的规则 + 修正入口**；不确定就 fail-loud，不静默跳过。

## 范围纪律（实测教训，不是风格偏好）

- **覆盖面用 `git ls-files` 驱动**（tracked-only）：运行区（`dev/harness-home/`、`research-workspace/`
  的 `drt_*` 与 `archive/`）不进 L0——否则 pre-commit 会被 run 产物拦红；稀疏态（文件可能缺席）用
  `existsSync` 防御，目录扫描跳过 `.git` 与 `node_modules`。
- **子进程环境要剥 `GIT_*`**：`git -C <dir>` 在 pre-commit 钩子里会被注入的 `GIT_DIR`
  覆盖仓库发现（实测两次假红）——需要时传去掉 `GIT_DIR/GIT_INDEX_FILE/GIT_WORK_TREE/
  GIT_NAMESPACE` 的 env。
- **端口与临时路径自持有**：冒烟/探针脚本各自独占端口（3101/3102/3103…），用完释放；
  一个只在单独运行时通过的脚本是脚本的缺陷。

## 语料面纪律（vendor scripts/AGENTS.md 吸纳）

- **防空语料**：扫描型门禁必须能对"扫到 0 个文件"或"范围被收窄"判红——一个静默变成空集的
  门禁等于不存在。范围收窄要显式（例如 tracked-only），并在门禁注释里写清为什么。
- **测边界形态**：以语法/发现规则驱动检测的门禁，对**每个被纳入与被排除的形态**都要有断言
  （例如"路径含空格/是 symlink/在忽略目录下"各一条），否则检测边界只是猜的。

## 冒烟脚本可靠性纪律（test-strategy 语料采纳，2026-10-04）

- **verdict 契约**：exit 0=全绿 / 1=断言红 / 2=未跑（前置缺席）；未跑 ≠ 通过，交付报告分列。
- **retry 白名单**：重试只许在真模型/浏览器等外部边界且带理由注释；确定性检查加重试 = 掩盖竞态。
- **等待显式状态**：等就绪信号/状态迁移/谓词（范本 = watch-run 事件形状判定）；固定 sleep 不是证据。
- **释放到静默**：kill 后 await 退出码——孤儿进程 = 脚本缺陷（"单独运行才通过"条款的孪生）。

## 依赖与分层

- 脚本只用 Node 标准库（`node:test`、`node:zlib`、`node:child_process`）；不引入测试框架。
- 真模型调用只出现在 keyless/tier 已登记的真模型档脚本里（`l4-lite-smoke`、
  `team-preflight-smoke`、`entry-chain-probe`、`client-hitl-smoke`）；`tests/` 的 layering
  守卫禁止 keyless 回归里出现真模型、网络与子进程。
- 投影类脚本（`run-dashboard.mjs`）**只读**：canonical 源是会话日志与 bundle 文件，产物
  （HTML）是抛弃型投影，永不入库、永不手改。
