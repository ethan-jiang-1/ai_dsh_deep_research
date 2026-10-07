# ls-files 门禁族覆盖盲区清扫

> 状态：implemented

## 问题

目录治理第二轮收口 pin-agreement 时实证同族缺陷（[Note](2026-10-07-runtime-scripts-layout.md)）：verify.mjs 的 `git ls-files` 消费面里，逐文件读盘的门禁存在两型盲区——`core.quotepath` 默认把非 ASCII 路径转义输出（`_dist/安装手册.md` 被 count-free / doc-now-only / proposed-pointer-live 三门禁**整体静默跳过**）+ tracked 文件盘上缺席/不可读静默 `continue`（npm 缓存件误入库漏检三周的同款形态）。

## 决定

- **三处逐文件读盘门禁同族收口**（proposed-pointer-live / count-free / doc-now-only）：`ls-files` 加 `core.quotepath=false`；tracked 文件缺席/不可读 fail-loud（迁移/清扫残留态不是合法稀疏态）；tracked 目录型 symlink（`.claude/skills`）显式放行——结构面归 claude-symlink 门禁。
- **secrets-untracked 不改**：纯路径后缀/斜杠模式匹配、不读内容——转义形态下 `\.pem$`、`\/\.env` 等模式仍命中原文件，语义天然免疫 quotepath（盘点表 = 下文实施记录）。
- **evaluation §L0 台账三行同 diff** 更新判据与反证（gate-ledger-sync 对账）。
- 后续新增 `ls-files` 消费门禁沿用同族形态：quotepath=false + 缺席处置 + 红证。

## 输掉的方案

- **统一封装 lib 函数一次改齐**：各消费面的豁免语义（notes/ 历史层、vendor/、fixtures、parked 态）各异，抽象先行会压平语义差异——逐门禁改、逐门禁立红。
- **只留 pin-agreement 已修者**：同族盲区不收口则台账"防空语料"条款自身防空失败，覆盖面声明失真。

## 验证

- 红证（2026-10-07）：一次注入三型违规于 `_dist/安装手册.md`（收口前被整体跳过的非 ASCII live 文档）——proposed-pointer-live（死指针）/ count-free（写死计数）/ doc-now-only（变更史措辞）**各自红且 file:line 逐字命中** → 还原绿。
- pin-agreement 缺席红证（README 暂移离盘 → FAIL → 还原绿）已在目录治理轮实录。
- `pnpm verify` 全绿 + `pnpm test` 234/234（2026-10-07，实施与毕业两次实跑）。
- L1/L2 未跑——门禁扫描面改动不触 preset/发布集，不适用。

## 环境状态

- verify.mjs `ls-files` 消费面五处全部有明确处置（本 Note 问题/决定节盘点）；非 ASCII tracked 文档（`_dist/安装手册.md`）自本轮起进入 count-free / doc-now-only / proposed-pointer-live 的实际扫描面。
