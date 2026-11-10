---
status: 待落地
opened: 2026-11-10
---

# 落地：探针凸显化——根 `probes/`、生成索引与头注门

> 立卡：2026-11-10 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> 去向：implemented — 交付时写 `notes/implemented/2026-11-10-probe-surfacing.md`（决定/输掉的方案/实际跑过的验证进 Note，docs 只写 now）
>
> **研究依据**：[probe-surfacing](../research/probe-surfacing/README.md)（现状、缺口、借鉴决策、
> 根迁移面、S1/S2/S3、验收）→ [company 机制审计](../research/probe-surfacing/2026-11-10-external-probe-model.md)
> （可移植 / 必须替换 / 不要照抄）。
>
> **开工授权**：用户 2026-11-10 定调「方向可以、探针要在仓库根部、一定要凸显」= 授权本方案方向；
> **`待落地` 不是实施授权**。改动面含根 `AGENTS.md`、`docs/`、五支探针 + 一支仪器的迁移、
> `scripts/` 支撑与一道新门禁，实施前请用户确认范围；按审阅分层在迁移完成与门禁边界请人。
>
> **与既有资产的关系**：不新增评估面；不改探针端口值（`port-exclusive` 仍守）；不动研究产物
> （pack/preset/manual）；一次性实验仍留 `_backlog` / `notes`，不进入库探针目录。归档材料只修
> 链接，不改正文。

**问题与期望结果：** 本仓有五支 `*-probe.mjs` 与一支流取证仪器，却住在 `scripts/probe/` 的
检查面里；发现链只有根布局一个括号短语 + `scripts/README` 一张手维护表；头注无
`状态`/`何时跑`，无索引、无头注门，新增 keyless 探针无登记义务。期望：根目录 `probes/` 成为
调试第一入口；fresh agent 从「行为可疑」一跳到达指南或具体探针；新增/改名/删除探针不重生成
索引会被门拦住；每支探针自述状态、触发、档位、判据与不证明边界。

**当前情况：** 盘上事实与迁移面见研究材料 §1 / §4.1.1；company 的可复制机制见外部审计 §3
——只有 `状态` + `何时跑` + 生成索引字节级新鲜度是硬机制。根 `AGENTS.md` 139/140 行，加一行
根布局刚好到顶，不能再加第二处指针。

**未决问题：** 无设计级未决。迁移顺序可拆：先 `git mv` + 修路径让旧门禁绿，再新件与门，
最后指南/路由/技能；目录名采用复数 `probes/`（与 company 同名），若坚持单数只改目录名与路径。

**下一步：** 实现已落（见 §实现记录）；请用户验收根布局、冷读与门禁边界。验收通过后归档卡与研究题（Note 已写 = [2026-11-10-probe-surfacing](../../notes/implemented/2026-11-10-probe-surfacing.md)）。

## 方案与取舍

采用研究 §4.1 的 S1：**根迁移 + 单一指南 + 生成索引 + 头注/索引门 + 技能 + 三处路由**。

- **根迁移 + 分域**：`git mv scripts/probe/* probes/`；按共享 harness 分 `behavior/` /
  `browser/` / `stream/`；六件探针的用法注释、`../../scripts/lib` import、`ROOT` 推导同步改；
  `probes/README.md` 做门户，`probes/INDEX.generated.md` 做生成物（按域分组 + 域计数）。
- **单一指南** = `docs/guides/66-probe-playbook.md`：定义、选择规则、目录/索引、头注协议、
  新增步骤、生命周期、覆盖地图、边界；细节归头注，不复制。
- **生成索引** = `scripts/lib/probe-index.mjs`（纯函数）+ `probes/_index.mjs`
  （`--write/--check`）；`scripts/README` 改指针，删手枚举。
- **头注协议 + `probe-registry` 门**：必填六字段（状态 / 一句话 / 何时跑 / 档位 / 判据 /
  不证明；`为什么存在` 推荐）；门同时查索引字节级新鲜与 `probes/README` 链接；同 diff 登记
  `context.gates`、`evaluation.md` §L0、`gates-smoke` 案例。
- **迁移面**：根 `AGENTS.md` 布局独立一行 + 从 `scripts/` 行删除旧短语；`scripts/AGENTS` 命名行；
  `scripts/README`；`docs/guides/60` 五处、`62`、`design/50`、`project-map`、归档链接、技能链接；
  代码注释；`smoke-contract` 扫描面 + `REAL_MODEL` 路径；`navigability` lib 消费图；
  `layering` 正则；`no-unused-code` 扫描根；`port-exclusive` 与 `host-paths` 范围。
- **技能** = `.agents/skills/using-a-probe/SKILL.md`：选择规则 + 先红 + 头注/索引 + 隔离/证据 +
  升格规则 + 反模式；guides/60 点名（docs-consistency 对账）。
- **路由**：`00-index` 先分流一行；`guides/60` §2 一行；`project-map` 症状三行 + 词汇一行；
  `terms.md` 一行；`evaluation.md` 一句「探针不是第六个评估面」。

**不采用**：68 支规模、company 四域名、65 道门、CI 跑真模型探针、`--port 0`（与本仓
`port-exclusive` 冲突）、把 `判据/不证明` 的语义交给门禁；S1 不做物理分域（S2 触发后再分）。

## 验收标准

1. 根目录 `probes/` 存在，根 `AGENTS.md` 布局有独立一行；新读者只读 `AGENTS.md` + `00-index`，
   一跳到达 guides/66，能回答「行为可疑先跑哪支 / 没有现成的怎么加」；冷读问答原文留档。
2. `node probes/_index.mjs --check` 绿；新增/改名/删除探针不重生成 → `pnpm verify` 红；
   `--write` 后绿。
3. 每支入库探针头注六字段齐全；删任一必填字段 → `probe-registry` 红；还原 → 绿。
4. `scripts/README` 不再手枚举探针；`navigability`、`smoke-contract`、`layering`、
   `port-exclusive`、`host-paths` 全绿；`REAL_MODEL` 仍精确覆盖要求凭据的探针。
5. `pnpm verify` + `pnpm test` 全绿；`probe-index` 纯函数有直测；`test-surface` 无孤儿；
   根 `AGENTS.md` 行数 ≤140。
6. 不新增评估面；不改探针端口值；不把一次性实验塞进入库目录；归档材料只修链接不改正文。

## 实现记录（2026-11-10，待用户验收）

- **根目录**：`git mv scripts/probe/* probes/`；按共享 harness 分 `behavior/`（4 支）/
  `browser/`（cdp）/ `stream/`（tee）；六件资产 + `probes/README.md` + `probes/INDEX.generated.md` +
  `probes/_index.mjs`；脚本内 import/`ROOT`/用法路径同步。
- **头注 + 索引**：六字段协议；`scripts/lib/probe-index.mjs` 纯函数（递归扫描/按域渲染/域计数）+
  `probes/_index.mjs` `--write/--check`；`scripts/README` / `scripts/AGENTS` 改指针。
- **门禁**：`probe-registry`（f-repo）查头注六字段 + 索引字节一致 + README 链接；
  登记 `context.gates`、`evaluation.md` §L0、`gates-smoke` 案例。
- **回忆层**：`docs/guides/66-probe-playbook.md`、`.agents/skills/using-a-probe/SKILL.md`、
  根 `AGENTS.md` 布局独立行 + 证据匹配面一句、`00-index` 先分流行 + 文档地图、
  `project-map` 任务矩阵/症状表/词汇表、`guides/60` §2 任务行、`terms.md`、`evaluation.md`。
- **机械面**：`smoke-contract` 双区闭集、`navigability` lib 消费图、`layering` 驱动面禁令、
  `port-exclusive` / `host-paths` / `no-unused-code` 扫描面。
- **已跑证据**：`pnpm verify` 全绿；`pnpm test` 1099/1099；`gates-smoke` 全绿（107 案例）；
  `probes/_index.mjs --check` 一致；红证 = 索引失鲜 / 缺头注；冷读 PASS（fresh agent 只看
  `AGENTS.md` + `00-index` 能定位 `probes/` 并选探针）。
- **未跑**：真模型/GUI 探针本体（无凭据与授权面）；用户验收待答复。

## 关闭条件

- S1 全部验收项有实际证据（红证 + 绿证 + 冷读记录）；
- 实施记录与输掉的方案进 implemented Note；
- 研究题名页 `产出的卡` 与本卡互相链接；用户按重要性验收（根布局 / 文档合同 / 新门禁边界）。
