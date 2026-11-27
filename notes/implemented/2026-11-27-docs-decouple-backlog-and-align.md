# docs/ 依赖解耦、实盘校准与分层地图重构

> 状态：implemented

## 决定

1. **建立 `docs/` 对 `_backlog/` 的单向依赖边界**：
   - `docs/` 只维护系统核心思想主干与当前合同，可依赖 `notes/`（已交付/拟定决定）与真实源码/测试，不再反向链接 `_backlog/_archived/` 历史探索卡或 `_backlog/methods/` 具体方法文件；
   - 仅保留两类合法指针：[`_backlog/triggers.md`](../../_backlog/triggers.md)（可观察重议条件索引）与 `_backlog/` 各池入口文档（`README.md` / `AGENTS.md` / `issues/README.md` / `bugs/README.md` / `research/README.md` / `methods/README.md`）；
   - 将原 `docs/` 内全部 `_backlog/_archived/` 与 `_backlog/methods/` 链接迁往对应活跃/归档 `notes/`、现行合同章节或类级守卫规则（并在 [`checks/archived-note-pointers.json`](../../checks/archived-note-pointers.json) 补登 `docs/design/40-research-cockpit.md` → `notes/archived/2026-10-11-member-activity-first-validation.md` 指针），同步在 [`_backlog/methods/README.md`](../../_backlog/methods/README.md) 与 [`docs/AGENTS.md`](../../docs/AGENTS.md) 显式声明边界（`_backlog/methods/` 仅服务 `_backlog/` 探索推敲，不一定落地）。
2. **新增机械防回潮守卫**：在 [`tests/checks/repo/docs-consistency.test.mjs`](../../tests/checks/repo/docs-consistency.test.mjs) 导出纯判据 `checkDocsBacklogLinks(entries)`，配合真仓合同与变异矩阵，拦截 `docs/` 新增任何越界 `_backlog/` 链接。
3. **重构 [`docs/00-index.md`](../../docs/00-index.md) 阅读入口**：在保持预算上限内新增「怎么读（先按目标选起点）」导向表，并将「文档地图」按「系统与技术设计 / 基准合同与治理规则 / 操作与工程指南 / 按需字典与仓外导航」四层分组呈现。
4. **实盘校准与冗余清理**：
   - [`docs/design/20-roles.md`](../../docs/design/20-roles.md) §2 脚本层修正为 `subagent(agent_preset=research-wave)`（与 D47 及 §0.1 对齐）；
   - [`docs/terms.md`](../../docs/terms.md) 与 [`docs/evaluation.md`](../../docs/evaluation.md) 修正旧扁平路径为 `src/lib/plan/...` 与 `src/lib/run/...`，并将 `evaluation.md` 契约回归段落墙拆分为按域列表；
   - [`docs/design/70-content-organization.md`](../../docs/design/70-content-organization.md) §8 移除过期的静态字符数与阶段流水账，改指 `checks/lib/repo/content-budget.mjs` 与 [`2026-11-11-content-organization-t0.md`](./2026-11-11-content-organization-t0.md)；
   - [`docs/guides/67-test-strategy.md`](../../docs/guides/67-test-strategy.md) 将 2026-11-14 批探索逐 BUG 流水表下沉至 [`guard-ledger/ledger.json`](../../tests/fixtures/guard-ledger/ledger.json) 与 [制度化交付 Note](./2026-11-13-test-strategy-institutionalization.md)，内化「类级守卫三判据与旧性质继承」，修复倒序节号与重复行。

## 输掉的方案

- **同步迁移 `docs/design/40-research-cockpit.md` 文件注册表与 `cockpit-doc-registry` 门禁结构**：把逐文件注册表从设计正文外置为类似 `tests/INDEX.generated.md` / `probes/INDEX.generated.md` 的生成索引可进一步精简 `design/40`；本轮按用户范围先保稳定门禁结构不动，待后续 `design/40` 模块注册继续膨胀时再独立切换。
- **同步重命名/搬迁 `docs/design/60-intent-carriers.md`**：将仓库治理类文档移出 `design/` 并重编号可消除与 `guides/60` 的撞号；本轮保持全部既有文件名不变，先通过 `00-index.md` 地图分组在逻辑上将其归入「基准合同与治理规则」。
- **一并迁移 `_backlog/triggers.md`**：按用户裁决保留在 `_backlog/triggers.md` 并允许 `docs/` 引用。

## 实际跑过的验证

- **先红实录**：在 `tests/checks/repo/docs-consistency.test.mjs` 新增 `checkDocsBacklogLinks` 后执行 `node --test tests/checks/repo/docs-consistency.test.mjs`，真仓合同用例按预期红（捕获 `docs/` 下全部 76 条 `_backlog/_archived/` 与 `_backlog/methods/` 越界链接），变异矩阵用例绿（10 pass / 1 fail）。
- **解耦与校准后**：
  - `wc -l docs/00-index.md docs/AGENTS.md`：`docs/00-index.md` 85 行（预算 ≤120）、`docs/AGENTS.md` 85 行（预算 ≤85）；
  - `node --test tests/checks/repo/docs-consistency.test.mjs`：11/11 全绿；
  - `pnpm test`：`test:spec` 1680/1680 全绿、`test:checks` 276/276 全绿；
  - `node checks/verify/verify.mjs`：62/62 全绿（含 `docs/`、`notes/`、`_backlog/`、`alignment-ledger.json` 与 `.agents/skills/` 相关全部门禁）；
  - `gates.e2e`（`md-anchors` / `doc-paths` / `doc-drefs` / `archived-note-pointer` / `count-free` / `doc-now-only` / `doc-budgets` / `release-vocab` / `cockpit-doc-registry` / `align-ledger` / `discipline-na-trigger` / `discipline-state-vocab` / `gate-ledger-sync` / `entry-chain` / `note-tree` / `note-format` / `note-graduation-rewrite`）：17 道门禁自测案例全部通过；`md-links` 副本对照组红系原有归档调研 `2026-11-20-native-quality-evidence.md` 引用 `vendor/dsh` 引起。
