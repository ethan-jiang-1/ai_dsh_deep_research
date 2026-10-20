# tests/ 分域：目录映射源代码（2026-10-20 用户指令）

> 状态：implemented
>
> 取代：[2026-10-20 测试资产重估](2026-10-20-test-asset-reassessment.md) 的「维持单目录平铺」决定
> （同日用户指令改判；重估过程保留在该页，本页为现行合同）。

## 决定

`tests/` 按**被测面**分四个域 + fixtures；目录映射源代码，agent 由源文件即可猜测试位置：

| 目录 | 映射面 | 例 |
|---|---|---|
| `tests/run/` | run 通道/状态/HITL/门/审计/观察/回放/run-ops/probe | `run/run-state.test.mjs` ↔ `scripts/lib/run-state.mjs`；`run/node-gate.test.mjs` |
| `tests/cockpit/` | pack client 观察面与其折算 | `cockpit/library-fold.test.mjs` ↔ `src/lib/library-fold.ts` |
| `tests/pack/` | pack 结构/preset/导出/部署 | `pack/presets.test.mjs`、`pack/deploy-bin.test.mjs` |
| `tests/contracts/` | 跨仓合同/文档/门禁自测/测试基础设施 | `contracts/navigability-contract.test.mjs`、`contracts/layering.test.mjs` |
| `tests/fixtures/` | 构造样本与冻结录制语料（不在发现面） | taxonomy = `tests/fixtures/README.md` |

发现面 = `node --import tsx/esm --test 'tests/**/*.test.mjs'`（package.json `test` 与
pre-commit 同命令；`fixtures/`、`_tmp/` 除外）。域内文件名 = 被测模块名 + `.test.mjs`；
一文件测多个面按主语归域，跨域合同进 `contracts/`。`tests/AGENTS.md` 持有完整放置规则与域表。

同步收口：`layering` 扫描递归化并在测试命令钉上改递归 glob；`navigability` 的 fixture consumer
扫描递归化；`guard-red-record` 递归扫描；文档/笔记/归档卡的测试链接全部改到新路径。

## 输掉的方案

- **维持单目录平铺**（2026-10-20 上午重估结论）：48+ 文件时"`ls tests` 一屏"的便利已抵不过
  按源文件找测试的映射成本；用户明确要求分域，故改判。
- **1:1 镜像深路径**（`tests/scripts/lib/<name>.test.mjs`、`tests/packages/...`）：映射最机械，
  但制造大量单文件深目录、相对 import 深度不一，且跨面合同测试无处安放；域级映射 + 域表是
  导航性与迁移成本的平衡。
- **按测试类型分 unit/contract/e2e**：类型词不回答"改这个源文件该看哪"，且 keyless 档同一条
  `pnpm test` 已统一；类型维度留在测试标题与文档，不占目录。

## 实际跑过的验证

- 51 个测试文件 `git mv` 入四域；`pnpm test` 570/570 全绿（递归 glob 选中，fixtures 不在内）。
- 路径改写反证：改域后首跑 75 红（HERE/ROOT/import 深度/夹具路径），逐条修正后全绿——不是
  "移动即绿"。
- `pnpm verify` 全绿（md-links 全量测试链接改写、layering 递归、navigability 递归、
  guard-red-record 递归、doc-budgets 新 tests/AGENTS 预算）。
- `gates-smoke` 全绿（含 guard-red-record / entry-chain / doc-budgets 案例）。
