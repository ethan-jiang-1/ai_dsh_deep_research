# runtime/ · 运行态区（gitignored，不入库）

> 目录治理第二轮档 B 自 dev/ 外移（[毕业 Note](../notes/implemented/2026-10-07-runtime-scripts-layout.md)）：dev/ 只住源码驱动，跑出来的东西住这里。

| 目录 | 性质 |
|---|---|
| harness-home/ | 开发 DSH home（`dev/env.sh` 的 `DSH_HOME`）：会话、凭据、插件安装（崩溃半径隔离；日用 ~/.dsh 不动） |
| smoke-workspace/ | 冒烟与 boot 的运行产物区：日志（*.log）、探针留档（entry-chain-probe-*.md）、release-pack/、run-pack/、npm-cache/（工具态重定向）、dashboard.html 投影——全部非 canonical；regression-process-guard.mjs = 被走查 Note 引用的一次性原型，非正本 |
| scenes/ | scene-capture 场景包区：每包五件套 page.png / page.html / body.txt / console.txt / meta.json（token 脱敏；抓取与读取入口 = scripts/run-ops/scene-capture.mjs，读取判据 = scripts/lib/scene-pack.mjs） |

runtime/ 根级散件（kickoff-*.md、opnote-*.md、一次性诊断 .mjs 等）= run 驱动留档，同属 gitignored 运行区，随需清理、无索引义务。

## 清理（默认 dry-run，人工确认）

`node scripts/run-ops/runtime-clean.mjs` 只列白名单内、整棵子树都早于保留期（缺省 14 天）的条目；`--yes` 才删除，且逐条复核路径仍在 `runtime/` 内。

- 白名单：`smoke-workspace/<child>`、`field-sim*`、`probe-*`、`explore-*`、`spike-*`、`research-tmp`、`ab-prompts`、`gate-out`、`audit`、`repair-backup`；
- 永不候选：`harness-home/`（会话/凭据）、`research-workspace/` 的 `drt_*` 与 `archive/`、`_dist/`、`vendor/`、`packages/*/lib/`、runtime 根散件、未知名、symlink（不跟随、不删链接指向）、`scenes/`（场景包是运行证据，人工处理）；
- 保留期按**子树最新 mtime**，防“目录旧但里面刚写了文件”；
- 触发清理的可观察条件 = `du -sh runtime` > 1GB，或 `runtime/smoke-workspace` 下目录 > 30，或磁盘压力；触发与裁决记 [`_backlog/triggers.md`](../_backlog/triggers.md)。
