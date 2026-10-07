# BUG-016：fresh clone 上 `pnpm verify` 红——_done/_reference 摘要链接运行区归档件

> 严重级别：P2（次要）｜发现：2026-10-07｜状态：活跃

## 症状

`_backlog/_done/_reference/oss-dr-mining/2026-10-06-oss-dr-bundle-digest.md` 的正文链接指向
`research-workspace/archive/drt_dr-product-landscape/` 下的 run 产物（leads.md、evidence/*.md）。
这些目标在 `research-workspace/`（gitignored 运行区）——**本机恰好有历史 run 归档时
`md-links` 门禁绿；fresh clone（或归档被清理）后同一条门禁红**。绿色依赖机器状态而非仓库
状态，违反「L0 结构门禁 = keyless 可复现」的验收合同。

## 根因（假设）

md-links 门禁的链接可解析判定检查**盘上存在性**，不区分 tracked 与 untracked 目标；_reference
摘要（tracked）把 gitignored 运行区文件当链接目标，是把「引用本机数据」混进了「入库材料」——
证据放置规则（tests/AGENTS：原始运行产物归运行区，入库引用须指向 tracked 或外部钉版源）的
违例。发现路径：`scripts/smoke/gates-smoke.mjs` 门禁自测的零注入对照组在 tracked 副本上首跑
即红（正是该 smoke 要抓的"门禁绿依赖运行态"类问题）。

## 复现

临时移除 `scripts/smoke/gates-smoke.mjs` fixture 的运行区补拷段后运行，对照组即红（输出含
`[md-links] …链接不可解析 → ../../../../research-workspace/archive/drt_dr-product-landscape/…`）；
等价人工复现 = clone 本仓到新目录（不带运行区）后 `pnpm verify`。

## 牵出的失败类

「tracked 文档链接 untracked 运行区文件」可能不止这一篇——值得横切 grep
`_backlog/**` 与 `docs/**` 中指向 `research-workspace/`、`runtime/` 的相对链接（排除显式标注
"运行区"的说明性路径）。

## 修复关联

候选方向（修复时定）：摘要改述 + 移除运行区链接（引用改外部钉版源）；或 md-links 收紧为
「tracked .md 的链接目标必须 tracked 或明确白名单」（新门禁走 writing-a-gate 全流程带反证）。
发现与登记 = [吸收审计毕业 Note](../../notes/implemented/2026-10-07-dsh-plugin-corpus-absorption.md)；gates-smoke fixture 的运行区补拷为临时对冲（注释在案），修复后可移除。
