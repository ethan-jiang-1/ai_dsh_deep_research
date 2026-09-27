# RFC：dsh-discipline 全量枚举——纪律表从子集到全量

> 状态：implemented
> 归档：2026-09-27

归宿：roadmap §队列「dsh-discipline 全量枚举」（已离队）· 前置：「vendor-submodule-and-pnpm-dsh」✓（同日毕业）

## 决定

本条目同日立项、同日实施毕业——全量正本 = [docs/discipline-map.md](../../docs/discipline-map.md)。

## 问题

AGENTS.md 纪律表是首版枚举子集（仅三个来源：vendor docs/testing.md、company 纪律表、
company inround 研究）——**"你无法继承你从没清点过的东西"**：未清点的纪律不构成约束，
遗漏即违规风险（今天三次注入面事故 = 集合外纪律失守的实证）。

## 方案

vendor 逐源枚举（根 AGENTS.md / docs/AGENTS.md / docs/testing.md / .agents/notes/
全树 / postmortem），每行三态：**DSH 做法 → 本仓落点 → 状态**（照搬 / 带证据适配 /
不适用+理由）；替换 AGENTS.md 首版子集表；源头清单照 company 五件套研究 §六之 1。

## 输掉的方案

- **照单全收**（否——不适用的必须带理由，否则表会烂成清单墙）；
- **维持子集**（否——子集来源清单本身没清点过，正是本条目要修的病）。

## 验收判据

- 新表覆盖全部源头文件（对账清单在案，源头文件逐一打勾）；
- 每行三态齐（无裸引述）；
- AGENTS.md 行数仍在 entry-budget 顶内（超顶走处置序：下放 > 压缩 > 升顶须 D 号）。

## 实施记录（2026-09-24，同日毕业）

**实现**：`docs/discipline-map.md`——vendor 五源逐源枚举（根 AGENTS.md Conventions 30+ 条 /
docs/testing.md / docs/AGENTS.md 文档标准 / .agents/notes 规则 / postmortem），每行三态
（照搬/带证据适配/不适用+理由）带本仓落点；AGENTS.md §纪律首版子集表按 entry-budget 处置序
**下放**（143/145 行无扩容空间——处置序首选被执行）为指针 + 速查关键词（AGENTS 降至 ~127
行）；00-index 文档地图 + AGENTS 布局树同步。

**枚举要点**：照搬 12 条（fail-loud、单尾换行、同 diff Note、verify the world、真入口路径、
真实现优先 mock、keyless/with-key 分层、取代检查、alternatives 必载……）；带证据适配 10 条
（plugins-not-loop→纯配置包组合面、源码/产物平面→L1 双通道、工具呈现先行→persona/skill 先
定稿、budgets→entry-budget 裁剪版、note 格式→regex 版+grandfather……）；不适用 10 条全部带
理由（TS 机制类/ESM 命名/client UI/SDK/PR 流——纯配置仓无该面；R3+ 引入 TS 面时重估，vendor
tsconfig 门面已就位）。

**维护规则**：随 vendor 换 tag 重校（触发型条目「升 pin 重校」）；新增三态行同 diff 落 map，
不在 AGENTS 复制（一处事实一个家）。

**验证**：17 门禁 + 23 tests 绿；AGENTS 行数 127 ≤ 145（entry-budget）。
