---
status: 推敲中
opened: 2026-10-25
---

# 推敲：工作区所有权与种子升级

> 立卡：2026-10-25 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 结论倾向：现在做——A 已落地；跨版本证据与文档收尾 ｜ 可关闭：否

**问题与期望结果：** 研究工作区里的 `AGENTS.md`、`NODES.md`、`question-patterns.md` 与 `templates/run/` 既是研究纪律的载体，也是 agent 行为的一部分；它们由 pack 的 `workspace/` 种子铺到用户工作区，但之后不再随插件升级。`method-library.md` 则是明确的用户数据，却在 `scaffold --force` 下会被空架子覆盖。期望明确“哪些是插件行为、哪些是用户数据、升级时谁变”，并给出一条不丢用户编辑的升级路径。

**当前情况：** `dev/sync-pack-workspace.mjs` 从 `research-workspace/` 正本同步手册、NODES、判型库、`.gitignore.example` 与 run 模板到 `packages/deep-research-pack/workspace/`；`pack-workspace-fresh` 门禁防漂移。`scaffold.mjs` 遍历种子中的 `.md` 与 `.gitignore.example`，目标已存在则跳过，`--force` 才覆盖；`method-library.md` 作为独立空架子种子也在遍历范围内。`preflight.mjs` 只检查文件在场与模板数量，不检查种子版本。`method-library.md` 的正本在用户工作区，`sync-pack-workspace` 不把它当同步源，只校验包内种子是空架子。

**未决问题：** 手册/NODES/判型库/模板的 owner 是“插件行为”还是“用户可定制数据”；插件升级后旧工作区如何知道种子过期；用户改过的文件如何合并；`method-library.md` 如何保证永不被 `--force` 覆盖；种子版本标记放在哪里、由谁生成；`preflight` 对过期种子是警告还是失败。

**下一步：** 按 A（用户所有 + 版本化升级）落地；`--check/--upgrade/--force` 与状态文件已进树，继续补跨真实版本升级的证据与文档收尾。B 仅在需要把手册收归 pack 时重开评估（D17 边界 + 模型可见文本重录）。

## 实施进度（2026-10-25）

- `dev/sync-pack-workspace.mjs` 生成 `packages/deep-research-pack/workspace/seed.json`（版本 + 每个落地文件的 sha256），并入 `pack-workspace-fresh` 对账；`export-dist` 把 `seed.json` 与 `scripts/lib/seed-core.mjs` 列为必备条目。
- `scaffold.mjs` 改为按清单三态处理：`--check` 只读、`--upgrade` 只更新未改文件（改过的写 `.seed-new`）、`--force` 全量覆盖；`method-library.md` 任何模式都不覆盖已存在文件；状态写 `.dsh-research-seed.json`。`--seed-only` 可只处理工作区。
- `preflight.mjs` 增“工作区种子版本”检查（旧/缺失标未验证，不硬红）。
- 证据：`tests/pack/seed-core.test.mjs`（五态 + 清单一致性）；临时工作区实测装/查/force/upgrade（方法库保留、用户改过的 AGENTS 不覆盖且写 sidecar、旧 NODES 被安全升级）；`pnpm verify`/`pnpm test` 待本轮收尾复跑。
- 未落地：真实 pack 版本 bump 下的跨版本升级证据；安装手册的升级段与 FAQ；`--force` 对 `.gitignore` 用户追加的说明。

## 范围与依赖

本卡拥有**工作区资产的归属、版本与迁移**；不拥有分发安装流程（[分发合同](2026-10-25-distribution-contract.md)）与运行态数据根（[运行态数据边界与移交](2026-10-25-runtime-data-boundary.md)）。种子生成器与新鲜度门禁是现有机制，本卡只扩展版本/升级面。

依赖：

- D17：harness 只读、run 变量只进 `drt_<slug>/`；手册与模板属于 harness 侧，但当前住在用户工作区。
- `dev/sync-pack-workspace.mjs` 与 `pack-workspace-fresh` 是种子的正本/生成物关系。
- 模型可见文本变更的证据义务：手册/NODES 文本变化会进 snapshot B 层，需按 [guides/62](../../docs/guides/62-plugin-authoring.md) 与 [evaluation](../../docs/evaluation.md) 选证据。

## 已知事实

- 种子文件清单由 `dev/sync-pack-workspace.mjs` 的 `FILES` 拥有：手册、NODES、判型库、`.gitignore.example`、run 模板；`method-library.md` 是 `SEED_ONLY`，不从正本同步，必须保持空架子。
- `scaffold.mjs` 的收集器只认 `.md` 与 `.gitignore.example`；新增非 `.md` 种子（例如版本清单）不会自动铺开，必须同步改收集器与门禁。
- `scaffold.mjs` 的幂等语义是“已存在不覆盖，`--force` 覆盖”；当前没有“只升级未修改文件”的中间态。
- `preflight.mjs` 的工作区检查只有在场与模板计数，没有版本/哈希对账。
- `research-workspace/drafts/` 是开发侧证据，不随种子发布；工作区 `.gitignore.example` 已把 `drt_*`、`archive/`、`_abandoned/`、`method-library.md` 列为运行区。

## 方案与取舍

| 路线 | 做法 | 收益 | 成本 / 风险 |
|---|---|---|---|
| **A 用户所有 + 版本化升级**（推荐） | 种子带版本/哈希清单；`scaffold --check` 报告差异，`--upgrade` 只自动更新未被用户改过的文件，改过的文件出 diff/备份；`method-library.md` 永不覆盖；`preflight` 报告过期 | 保留用户定制；升级可解释；不把手册收进 pack 的模型可见面 | 需要版本清单格式、三态比较、备份/回滚；`scaffold` 收集器与门禁要扩 |
| **B 手册收归 pack** | 手册/NODES 改成 pack 内的 skill 或生成片段，工作区只留薄指针 | 单一版本源，升级天然跟随插件 | 改变 D17 的“工作区=纪律载体”；手册是跨角色共享文本，skills 按角色硬隔离；模型可见文本与快照重录成本高 |
| **C 维持快照** | 继续“不覆盖”，文档要求用户手工重铺 | 改动最小 | 旧工作区永远落后；`--force` 仍可能覆盖方法库；用户无法知道种子过期 |

推荐 A：它承认手册/NODES 既是插件行为又是用户可定制资产，用“版本 + 三态合并”处理升级，而不是二选一。B 只在用户明确要求“手册必须由插件单一拥有”时再评估；当前证据不足以承担 D17 变更与重录成本。

## 验收标准

翻「现在做」时，至少覆盖：

- 种子有可读的版本标识（格式在卡内定；若新增非 `.md` 文件，`scaffold` 收集器、`sync-pack-workspace` 清单与 `pack-workspace-fresh` 同 diff 更新）。
- `scaffold --check` 能区分：种子缺失、用户未改但版本旧、用户已改、用户删除；输出可读差异与退出码。
- `scaffold --upgrade` 只自动更新“用户未改且版本旧”的文件；用户改过的文件不覆盖，给备份/diff 与手动合并提示；`--force` 仍然显式，但**不得覆盖 `method-library.md`**。
- `preflight` 报告工作区种子版本与 pack 版本的关系；过期不静默（警告或失败在卡内定，且与 `--install-only` 语义一致）。
- 新增契约测试覆盖：方法库在 `--force` 下不被覆盖；用户改过的 `AGENTS.md` 在 `--upgrade` 下不被覆盖；未改文件能升级；`--check` 的四种状态。
- 文档写明 owner、升级命令、备份位置与回滚方式；`research-workspace/AGENTS.md` 与 pack README 不出现两套说法。

## 关闭条件

归属、版本标记、升级/合并语义与 `--force` 边界有结论并落盘；`scaffold`/`preflight`/门禁/文档同 diff；验证证据覆盖未改、已改、方法库三种情况；结论去向记录。未定期间保持活跃。
