# Note：notes 纪律补借 P0——树形、归档元数据、拒绝条重启条件与归档校准 skill

> 状态：implemented

> 出处：[落地卡](../../_backlog/_archived/settled_issues/2026-11-14-notes-discipline-hardening.md) ·
> 研究 = [notes 工程纪律补借](../../_backlog/research/notes-discipline-borrow/2026-11-13-notes-discipline-borrow.md) ·
> 规则正文 = [notes/README](../README.md) · 数据面 = [evaluation §L0](../../docs/evaluation.md)

## 决定

**补四道窄把守 + 一个判断载体，位置不动、不加分类层、不动冻结件正文。** 2026-11-13 的探针
实测：嵌套目录、未知生命周期层、无日期文件名、重复状态行、无元数据冻结件全部静默通过；往
冻结件追加一行，`pnpm verify` 仍全绿。本条只把能机械判的四类形状补齐，并把归档判断写成可
加载的 skill。

1. **S1 `note-tree`（新门禁，c-notes 域）**：`notes/` 顶层只允许四个生命周期目录
   （`proposed / implemented / rejected / archived`）与根级 `README.md` / `AGENTS.md`；生命周期
   目录内**只允许普通文件**（`README.md` 例外），出现嵌套目录即红；Note 文件名须匹配
   `^\d{4}-\d{2}-\d{2}-.+\.md$`（允许 `0.3.x` 这类含点 slug）；`notes/` 下任何 `INDEX.md` 即红；
   四个生命周期目录必须同时在场（空层合法）；扫描集为零即红。**闭集常量只住门禁**
   （[c-notes.mjs](../../scripts/verify/gates/c-notes.mjs)），notes/README 只链接、不复制名单。
2. **S2 `note-format` 扩展**：`> 状态：` 必须**唯一**且住**头七行**（四态通用）；
   `archived/` 只读元数据——`> 状态：implemented` + 唯一 `> 归档：<YYYY-MM-DD>`（状态行后三行内，
   允许空引用行；合法日历日；不得早于文件名日期），**不查骨架**（快照不追改）；
   `rejected/` 必须有标题含 `复活条件 / 重启 / 重新引入` 的节——这一层的价值是"什么时候可以
   重提"。12 篇历史冻结件的状态行与归档行之间有空引用行，按三行内容忍，不逼重排。
3. **S3 `.agents/skills/archiving-a-note/SKILL.md`**：归档/删除/合并/审计 Note 的判断载体。
   内容 = 反指标（字数/年龄/配额不是判据）→ 取证程序（读当前代码/docs/台账 + grep 活面 +
   确认承接 owner + 入链登记）→ 五类处置（原地更新 / 历史注记互链 / 合并 / 删 / archive）→
   本仓校准样例（425 行留、59 行留、110/131 行归档）→ 最小归档动作 → 报告与
   `git diff --name-status` 逐条对账。guides/60 的技能路由同步加一行。
4. **S4 文档同 diff**：`notes/README` 补「树形与元数据（机械把守）」与「已知缺口 G1–G5」，
   更新与 vendor 的差异表（class 层、冻结层、集中索引、状态标记）；`docs/evaluation.md`
   §L0 增 `note-tree` 行并更新 `note-format` 行；`scripts/verify/context.mjs` 的 gates 数组、
   `scripts/lib/gates-cases.mjs` 的案例表、`tests/checks/verify-gates.test.mjs` 的静态对账随行。

**边界**：`notes/` 留在仓库根目录；不引入 class 层；不改任何冻结件正文；不做 P1 封印。

## 输掉的方案

- **加 class 子目录（孙目录）**：82/136 篇时点主题家族 61/94、机制名检索未失效；迁移要改
  133 个 tracked `.md` 的引用、187 对登记与冻结件出链；且封印一旦落地，历史层不可重组，
  只能形成"新归档按类、旧归档平铺"两套路径。引入条件仍 = 检索失败或按类批阅成常态。
- **`> 类型：<class>` 头字段**：没有消费者的分类会腐烂；真要分类直接做目录，不做第二套标记。
- **提案期标题禁行**（`## 提案`/`## 方案`/`## 验收标准`）：`## 方案` 在活跃区是合法交付节，
  标题检查只证外观；现有 `note-graduation-rewrite` 已咬住计划体标记与裸 `## 验收`。
- **把 S1/S2 并成一个大检查**：树形与元数据失败面不同，合成一道会让错误文案与 `--only`
  窄面变差。
- **本卡顺带做 P1 封印**：需要一次全量封印提交，并把"归档出链可解析"降级为"不检查"；
  两件事风险与验收面不同，绑在一起会让 P0 被 P1 的设计争论拖住。
- **重命名 `v2`/`final` 文件**：版本化发布 Note 是有意命名；重命名 = 全仓链接与登记簿噪声。

## 实际跑过的验证

- **基线（2026-11-14，HEAD `37aea4c3`）**：`node scripts/verify/verify.mjs --only=note-tree,note-format`
  → `PASS note-tree` / `PASS note-format`；语料 = 83 篇 implemented + 136 篇 archived + 10 篇
  rejected + 0 篇 proposed。新增门前同一注入全绿；新增后九类注入各自点名红，原文：
  - `[note-tree] notes/implemented/probe-nested/: 禁止嵌套目录（树深固定为 notes/<lifecycle>/<note>.md；分类层未引入，加层是显式结构调整）`
  - `[note-tree] notes/probe-layer/: 未知生命周期目录（允许：proposed / implemented / rejected / archived）——目录里的 Note 会被扫描静默跳过`
  - `[note-tree] notes/implemented/notadate.md: 文件名须为 yyyy-mm-dd-topic.md（日期 = 主题首提日，不是实现/归档日）`
  - `[note-tree] notes/INDEX.md: 禁止集中索引（路径即清单；浏览生命周期目录或检索）`
  - `[note-format] notes/implemented/2099-01-01-probe.md: 状态行必须唯一（发现 2 条，行 3/14）——正文引文不算状态`
  - `[note-format] notes/archived/2099-01-01-probe.md: 归档行必须唯一（> 归档：<YYYY-MM-DD>；发现 0 条）——何时入层只有这一处记录`
  - `[note-format] notes/archived/2099-01-01-probe.md: 归档日期不是合法日历日（2099-13-40）`
  - `[note-format] notes/archived/2099-01-01-probe.md: 归档日期 2000-01-01 早于文件名日期 2099-01-01——归档不能早于主题首提`
  - `[note-format] notes/rejected/2099-01-01-probe.md: 缺"重启/复活条件"节——这一层的价值是"什么时候可以重提"（标题须含 复活条件|重启|重新引入）`
- **门禁自测**：`node scripts/smoke/gates.e2e.mjs` → `gates.e2e: 全绿（对照组零注入全 PASS +
  117 个注入案例均被点名报红）`。新增九案例（四 tree + 五 format）在表内；`pnpm test:checks`
  104/104——首跑红抓出 `archiving-a-note` 未在 guides/60 路由（`docs-consistency`），补路由后复绿。
- **全量**：`pnpm verify` 全绿；`pnpm test` 1341 spec + 104 checks 全过。
- **反向对证**：把 `notes/README` 新增链接改为未跟踪目标、把 skill 的冻结件引用改为未登记
  链接，`md-links` / `archived-note-pointer` 各自点名红；登记 5 条历史指针后复绿。

## 残余边界

- **P1 未做**：冻结层仍无 append-only 封印，`md-links` / `md-anchors` 仍扫 `notes/archived/**`，
  仓库级改名仍会逼改冻结件。证据与设计 = 研究 §5.2/§5.3；后续载体 = `_backlog/triggers.md`
  的 P1 行。**本 Note 不声称冻结层已硬**。
- `note-format` 对 archived **只查元数据**，不查骨架；冻结件的旧骨架不追改。
- 状态行"头七行"是实测阈值（83+136+10 篇全满足）；若未来 banner 变长，重估阈值。
- `note-tree` 不检查非 `.md` 附件与顶层非 `.md` 文件；分类层、存在性门禁、质量门禁仍按
  notes/README §已知缺口 G1–G4 保持"软"。
- 归档判断本身仍不可机械判定；skill 提供校准与对账，不替代用户对删/留的业务判断。
