# 手册版本与安装副本收口：0.3.4

> 状态：implemented

## 决定

0.3.3 的安装手册第八节升级示例仍硬编码 `0.3.2`，而 `release-copies` 只扫 README/pack README/decisions/guides，没扫手册源与生成物——版本头是 0.3.3，升级示例却停在 0.3.2。0.3.4 把手册源改成 `<new-version>` 占位，并把 `scripts/dist/product-manual.md` 与 `_dist/安装手册.md` 纳入 `release-copies` 扫描；同 diff 新增 `install-copies`：live 安装文档必须保持 profile bootstrap → pack add → team layer 的顺序，且团队层不得用 `@latest`。

安装说明的 owner 不变：manual = 完整安装合同，root README = 用户 quickstart，pack README = 包级摘要，CONTRIBUTING = 源码首跑。副本由 `release-copies` + `install-copies` 机械对账，不再靠“记得同步”。

`client-load` 的 NOT-RUN 现在带 `HOST_HEALTH_HINT`：先列本仓 dev web 的 `pgrep`/`lsof` 清理入口，并保留当前 GUI（默认 52887）；再给非 repo 负载的 `top`/`ps` 入口。清理 3 个 stale repo dev web（PID 9381/3122、67104/3118、90998/3116）后，正常档 client-load 曾 ALL PASS（load 12.58）；随后其他进程把 load 抬到 28.74（92 个 node / 20 个 Chrome，均非本仓 dev server）时正常门再次 NOT-RUN，强制档仍 ALL PASS。正常门保持环境判据，不伪造常绿。

版本升 **0.3.4**，annotated tag 指向本变更 commit；0.3.3 制品不重发。

## 输掉的方案

- **只修生成手册**：`export-dist` 会从仍带 `0.3.2` 的源重新生成，下一次导出复发；源必须改成占位。
- **只修手册、不加扫描**：同一类“头对、例子旧”还能出现在任何 live 文档；`release-copies` 扩到手册源/生成物才是机械把手。
- **只修版本、不加安装副本守卫**：profile→pack→team 的顺序和 `@latest` 禁令仍是散落的自然语言；`install-copies` 把关键顺序变成红/绿。
- **清掉进程但不改 NOT-RUN 文案**：下一次接手仍要自己猜是哪个 server 占着 load；`HOST_HEALTH_HINT` 把 repo 进程与非 repo 负载分开给命令。
- **把正常门 NOT-RUN 写成绿**：环境 U 保留；强制档只证明断言面，不冒充正常门。

## 实际跑过的验证

- `release-copies` 红证：把手册源/生成物纳入扫描后，`scripts/dist/product-manual.md` 的 `0.3.2` 立即红（tarball 名 + 旧版本两测）；改成 `<new-version>` 并重导出 0.3.4 后 3/3 绿。
- `install-copies` 红证：把 root README 的团队层命令改成 `@latest` → 红；还原 → 绿。
- 正常档 client-load：清 3 个 stale repo dev web 后 `ALL PASS`（load 12.58，无强制）；随后非 repo 负载把 load 抬到 28.74，正常门 `NOT-RUN`，新 hint 打印 repo/非 repo 分诊；`DSH_CLIENT_LOAD_ALLOW_UNHEALTHY=1` 强制档 `ALL PASS`。
- `pnpm verify` → 全绿；`pnpm test` → 1,407 pass / 0 fail / 0 skipped；`pnpm typecheck` → exit 0。
- L2 对 0.3.4 制品：`lifecycle.entry` ALL PASS、`install-shape.entry` ALL PASS、`product-boot.entry` GREEN。
- `node scripts/dist/export-dist.mjs` → 0.3.4 全绿：185 条目、5/5 preset 行、15 skill、11 模板；手册 0.3.4 / 2026-11-13；升级示例为 `<new-version>`，无 0.3.2/0.3.3 残留。
- `node scripts/dist/release-check.mjs` → 打 tag 前/后结果见交付报告；tag 后必须 `version=0.3.4 tag=0.3.4（annotated）`。
- `handoff.e2e` 在 0.3.4 HEAD/tag 上跑 → ALL PASS（源码移交不含 runtime/凭据/run 数据，HANDOFF 接收命令齐全）。

## 环境状态

macOS；Node 22.23.1；pnpm 11.7.0；全局 DSH 0.2.1-rc.5。0.3.4 tarball 本地生成；annotated tag `0.3.4` 本地创建，未 push、未 npm publish。client-load 正常门在当前主机因非 repo 负载（92 node / 20 Chrome，load 28.74）仍为环境 NOT-RUN；强制档断言绿，hint 已给出分诊入口。
