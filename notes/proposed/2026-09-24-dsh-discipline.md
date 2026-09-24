# RFC：dsh-discipline 全量枚举——纪律表从子集到全量

> 状态：**approved（2026-09-24 显性化；同日用户放行静默自主执行）** ·
> 归宿：roadmap §队列「dsh-discipline 全量枚举」（卫生型）·
> 前置：「vendor-submodule-and-pnpm-dsh」（源头在 vendor 树，submodule 落地后枚举）

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
