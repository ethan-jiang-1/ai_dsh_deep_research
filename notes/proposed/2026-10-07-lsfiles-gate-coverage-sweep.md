# ls-files 门禁族覆盖盲区清扫

> 状态：proposed

## 问题

目录治理第二轮收口 pin-agreement 时实证同族缺陷（[Note](../implemented/2026-10-07-runtime-scripts-layout.md)）：`git ls-files` 默认 `core.quotepath` 把非 ASCII 路径转义输出（`_dist/安装手册.md` 实测 `existsSync` 永远 miss）+ tracked 文件盘上缺席/不可读静默跳过。pin-agreement 已修（quotepath=false + 缺席红证）；其余 `git ls-files` 消费门禁（count-free / doc-now-only / plans-liveness 等）沿用同形态——**覆盖面声明与实际扫描面可能不一致**，同类盲区是否已咬中过真实内容未知。

## 方案

盘点 `verify/verify.mjs` 全部 `ls-files` 消费面（grep `spawnSync('git', ['ls-files']`），凡逐文件读盘的判据统一收口：`core.quotepath=false`；缺席/不可读按各判据语义处置（fail-loud 或显式 skip 带 note），**每个改动的门禁带红证**（非 ASCII 路径注入 / 暂移 tracked 文件离盘 → 红 → 还原绿）。只动扫描器，不动判据语义；台账行（[evaluation §L0](../../docs/evaluation.md)）同步。

## 输掉的方案

- **统一封装 lib 函数一次改齐**：先盘点各消费面的豁免语义（notes/ 历史层、vendor/、fixtures 形态各异），抽象先行容易把语义差异压平——逐门禁改、逐门禁立红。
- **只留 pin-agreement 已修者**：同族盲区不收口则台账的覆盖面声明失真（"防空语料"条款自身防空失败）。

## 验收

1. 盘点清单落实施记录（几处消费、各自处置与理由）；
2. 每个改动的门禁带缺席与非 ASCII 两型红证（实测红 → 还原绿）；
3. `pnpm verify` + `pnpm test` 全绿；台账行同步（gate-ledger-sync 绿）。
