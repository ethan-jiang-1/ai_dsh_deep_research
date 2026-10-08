# reference/ · 推敲资料区（喂活跃卡片的证据面）

> 打磨场的原料堆：为 [../plans/](../plans/README.md) 与 [../bugs/](../bugs/README.md) 的
> 活跃卡推敲时攒下的调研材料——证据走读、综述、机制笔记。它载推敲的**证据半面**（卡片的
> 倾向由它喂出来；卡本身载问题、候选与判断）。规矩手册 = [`../README.md`](../README.md)。

## 契约

- **收什么**：服务活跃卡、值得保留的调研材料——推敲时攒的、被卡引用的、喂毕业判断的；
  半成品合法。
- **不收什么**：抛弃型草稿（按 [AGENTS.md](../../AGENTS.md) 留在树外）；价值越过所有卡
  的留存型参考（留存语义归 docs 索引——[00-index §外部研究材料](../../docs/00-index.md)）。
- **命名**：`YYYY-MM-DD-<slug>.md`（与卡同款日期编码），slug 指向它服务的卡或主题；卡链接它。
  **按主题分子目录**（2026-10-06 用户定调）：同主题多份材料归一个子目录（索引对账按
  basename，子目录合法——`plans-liveness` 用 `git ls-files` 递归扫）；单份材料可留区根。
- **无状态行、无逐文件门禁**（2026-10-03 借鉴时的 owner 选择）：纯约定；唯一的文件级
  检查是索引交叉对账（本区文件必须被下方索引点名——`plans-liveness` 强制，孤儿即红）。
- **生命周期——随卡走**：卡毕业时 `git mv` 到
  [`../_done/_reference/`](../_done/_reference/README.md)，文件名不变、内容不重写；
  服务完最后一张卡的不滞留。

## 索引

| 文件 | 服务 | 一句话 |
|---|---|---|
| [2026-10-08-notes-stocktake.md](2026-10-08-notes-stocktake.md) | [notes-stocktake 条目](../../notes/implemented/2026-10-08-notes-stocktake.md)（已毕业） | 72 篇 implemented 三结局体检：**结论 = 归档判据本身不可靠**——宽口径 72/72 全留、严格口径 23 归档、对抗证伪 8/8 打回；硬数据 = 72 篇 / 61 家族（检索不靠猜）/ archived 自 09-28 后零归档；根因 = 进门条件无可执行面（verify.mjs 里 archived 仅 2 处注释） |
| [2026-10-08-model-visible-calibration.md](2026-10-08-model-visible-calibration.md) | [recorded-session-obligation 条目](../../notes/implemented/2026-10-08-recorded-session-obligation.md)（已毕业） | recorded-session 义务标定：**不够格按路径立门禁**——近 40 次 10 次命中（真阳 2 / 假阳 6〔5 次纯 skill 正文 + 1 次另改 dev skill description，均不在 runtime 面〕/ **真漏判 2**）；最重发现 = **smoke 头注称覆盖 skill 与工具行，实际对 3 处 `user/message` 注入全不覆盖**（工作区手册全文 / skill-catalog / runtime-context），故 2 例漏更新跑了也绿；9 类候选面经**三轮对抗自审**才穷举（首版 5 类 / 二版 6 类 / 三版 8 类均漏），首版"无漏判"已作废 |
| [strategy-benchmark/2026-10-03-strategy-benchmark-sources.md](strategy-benchmark/2026-10-03-strategy-benchmark-sources.md) | [pipeline-polish 面①](../_done/_closed_plans/2026-09-28-pipeline-polish.md) | 专业 DR 三轴对标材料：源仓 research_style_params 全参数化 + Anthropic 工程自述一手 + OpenAI 系统卡物种边界；采纳候选 A/B 带触发条件 |
| [strategy-benchmark/2026-10-06-per-topic-card-distribution.md](strategy-benchmark/2026-10-06-per-topic-card-distribution.md) | [queue §搁置池「per-topic 地板参数化」](../queue.md) | 候选 A ①步存量标定：25 场可数 / 68 primary topic，中位 13、p25=6、max=53，低于源仓地板 28/68（双条件未满足不立门）；quick_factual 型 6 场口径不可数（无 primary 标记） |
