# runtime/ · 运行态区（gitignored，不入库）

> 目录治理第二轮档 B 自 dev/ 外移（[RFC](../notes/proposed/2026-10-07-runtime-scripts-layout.md)）：dev/ 只住源码驱动，跑出来的东西住这里。

| 目录 | 性质 |
|---|---|
| harness-home/ | 开发 DSH home（`dev/env.sh` 的 `DSH_HOME`）：会话、凭据、插件安装（崩溃半径隔离；日用 ~/.dsh 不动） |
| smoke-workspace/ | 冒烟与 boot 的运行产物区：日志（*.log）、探针留档（entry-chain-probe-*.md）、release-pack/、run-pack/、npm-cache/（工具态重定向）、dashboard.html 投影——全部非 canonical；regression-process-guard.mjs = 被走查 Note 引用的一次性原型，非正本 |
