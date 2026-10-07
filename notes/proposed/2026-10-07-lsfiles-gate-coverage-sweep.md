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

## 实施记录

盘点结果（verify.mjs 全部 `git ls-files` 消费面 = 五处）：

| 门禁 | 读内容？ | 处置 |
|---|---|---|
| pin-agreement | 是 | 已在目录治理轮收口（quotepath=false + 缺席/不可读红 + 目录型 symlink 放行） |
| proposed-pointer-live | 是 | 同族收口（本轮） |
| count-free | 是 | 同族收口（本轮） |
| doc-now-only | 是（`ls-files '*.md'`——非 ASCII 的 .md 曾被整体跳过，`_dist/安装手册.md` 实测） | 同族收口（本轮） |
| secrets-untracked | **否**（纯路径后缀/斜杠模式匹配） | 不改——转义形态下 `\.pem$`、`\/\.env` 等模式仍命中原文件，语义天然免疫 quotepath；缺席文件无内容可泄，不适用缺席红 |

红证（2026-10-07，一次注入三型违规于 `_dist/安装手册.md`——收口前被 quotepath 转义整体跳过的非 ASCII live 文档）：三门禁各自红且 file:line 逐字命中（proposed-pointer-live 死指针 / count-free 写死计数 / doc-now-only 变更史措辞）→ 还原绿。台账三行同 diff 登记。
