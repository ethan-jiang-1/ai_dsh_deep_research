# RFC：vendor-submodule-and-pnpm-dsh——机制权威自持

> 状态：**approved（2026-09-24 显性化；同日用户放行静默自主执行）** ·
> 归宿：roadmap §队列「vendor-submodule-and-pnpm-dsh」· 偏离销账：D10（偏离登记簿）

## 问题

本仓机制权威借 company checkout（D10 偏离）：路径耦合他仓、无 vendor-pin 门禁、
vendor 未入 workspace（`pnpm dsh` 不可用）——机制核对与验证会话的根基悬在外部仓，
tag 升级时无从机械校验。

## 方案

1. `git submodule add` 钉住 tag `dsh-v0.1.5-rc.2`（commit `fb2c4b9e`）→ `vendor/dsh/`；
2. workspace 五件套：pnpm-workspace.yaml 收 vendor/dsh + 根 package.json scripts
   `dsh` 从钉住源码起会话（替代 env.sh 的 company 借用路径）；
3. verify 新门禁两条：**vendor-pin**（submodule 在位 + 指向钉住 commit）与
   **vendor-clean**（只读纪律：无未提交改动）；红绿反证按门禁规矩；
4. 机制权威切换：dev/env.sh 的 dsh 别名与 preset-smoke/release-smoke 的 DSH_SRC
   从 company checkout 切到本仓 vendor（D14 的源码域/安装域双通道随之切）；
5. D10 偏离登记簿销账（AGENTS.md 偏离表 + design/10 头注同步）。

## 输掉的方案

- **git subtree**（否——更新不透明，无法精确钉 tag）；
- **每日 copy vendor**（否——无 pin、漂移不可检）；
- **维持借用**（否——D10 登记时明示随本条目销账，久借必漂）。

## 验收判据

- vendor-pin/clean 门禁红绿反证在案（门禁 15→17，gate-ledger-sync 同步）；
- `pnpm dsh` 一条命令从本仓 vendor 起会话（实证一次）；
- preset-smoke 源码域 + release-smoke 安装域在 DSH_SRC 切换后全绿；
- D10 从偏离登记簿销账；AGENTS.md 布局树 vendor 行更新。
