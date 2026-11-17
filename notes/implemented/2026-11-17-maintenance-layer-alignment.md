# 维护层对齐：四目录整理与搬家安全（2026-11-17）

> 状态：implemented
> 关联：[D57](../../docs/decisions.md#d57) / [D58](../../docs/decisions.md#d58)；合同 = [guides/68](../../docs/guides/68-surface-contract.md)；
> 前序 = [surface-root-unification](2026-11-16-surface-root-unification.md)；门户 = [checks](../../checks/README.md) ·
> [probes](../../probes/README.md) · [tools](../../tools/README.md)。

## 决定

1. **库归属：`checks/lib` = 维护层公共库，不设第五根。** 三根（checks/probes/tools）是 D58 的对外承诺；
   把 92 个模块搬到新根换来的是名字好看，代价是全仓最大一次 churn。子组按**消费者域**重切：
   `ops` → `analyze`（show 10）+ `gates`（judge 2）+ `channel`（operate 1）；`tools` → `test-infra`（5）。
   子组名从此描述“谁在用”，不再复用旧三分法的目录名。
2. **测试镜像保留。** `tests/run/<owner>/` 与 `checks/lib/<owner>/` 同名，落点可机械推导；本轮付
   21 个 spec 搬迁。镜像的税只在整组搬家时收——**本轮后结构冻结**，整组搬家需新 D/Note，单件移动按 §3 协议。
3. **搬家安全按“agent 调用面”建门禁**（本仓的调用者是模型，不是编译器）：
   `call-surface`（文档围栏命令 / 探针头注 / CI `run:` 的路径存在性）、`generated-artifacts`
   （生成物头 = 生成器模板）、`test-placement` 非测试模块（必须 `tests/<domain>/…-helpers.mjs`）、
   `doc-paths` 链接文字退役根名。搬家协议 = manifest → census → 路径-only diff → 七条判据（引用归零 /
   语义差零 / 深度完整 / 生成物可复现 / 调用面可执行 / 行为等价 / 可回滚）。
4. **账本 append-only。** `checks/test-path-redirects.json` 改为链式解析（旧条目的 `to` 可再次成为
   `from`；环/过深/重复 from fail-loud）。本轮追加 40 条（18 lib + 21 test + 1 dist），**零重写**；
   307 条冻结层链接经链解析。
5. **合同桶二分写死，不改名。** `tests/pack/contract/` = 包级合同（断言对象只涉及本包）；
   `tests/contracts/` = 产品级合同（同时钉 ≥2 个面：pack × run bundle × vendor/DSH 惯例 × 方法映射）。
   改名会把包内 `AGENTS.md`/源码注释一起拖进 diff → 已发布 0.3.6 的 tarball sha 变化（同版本不同工件）；
   延后到下一次 pack 版本变更（见 triggers）。
6. **冻结。** 本轮后不再整组搬目录；新增/单件移动照常。事实源 = 各根 README + guides/68；本 Note 只记理由。

## 输掉的方案

- **设第五根 `lib/`**：破坏三根承诺，且 92 模块的 import/测试/账本迁移是全仓最大一次 churn，收益只是命名。
- **把 lib 复制进各消费者**：双源；`test-owner-mirror` 与 lib 消费列会同时失真（前序 Note 已否）。
- **废除测试镜像、改按行为域放置**：省本轮 21 个搬迁，但丢掉“改了哪个模块 → 测试在哪”的可推导落点；
  镜像刚立两天就推翻 = 第二次搬迁，且这次没有替代的确定性规则。
- **立刻重命名合同桶**（`tests/contracts`→`product` 或 `pack/contract`→`package`）：实测会改包内文档/注释，
  迫使 repack 已发布的 0.3.6；为命名撞词改已发布工件 = 短视。改为写死二分规则 + trigger。
- **先 `git mv` 再补门禁**：没有 detector 的搬家 = 盲搬；本轮把 call-surface / generated-artifacts /
  非测试模块落点放在移动之前落地。
- **全仓 sed**：实测咬到 `packages/` 注释与 `tests/contracts` 路径；改用 manifest + 精确 token 替换，
  并在提交前做“路径-only”反向归一化比对。
- **保留 `checks/dist` 历史名**：与根 `_dist` 撞义；本轮有 `call-surface` 兜底 CI 引用，改名成本才可接受。

## 实际跑过的验证

| 面 | 证据 | 结果 |
|---|---|---|
| L0 | `pnpm verify`（60 门） | 全绿 |
| keyless 回归 | `pnpm test`（1365 spec + 220 checks） | 全绿 |
| 门禁红证 | `gates.e2e`：`surface-claims-face-drift`、`doc-paths-retired-label`、`call-surface-fenced-command`、`-probe-header`、`-ci-run`、`test-placement-support-module`、`md-links-chain-cycle` | 逐条注入红 → 还原绿 |
| 搬家语义差 | 39/39 移动文件反向归一化（路径替换还原）后与 HEAD 逐字一致；唯 `test-index` 的 `OWNERS` 为有意变更 | 0 例外 |
| 语法 | 18 个迁移 lib `node --check` | 18/18 |
| 索引 | `render-test-index --check` / `probes/_index.mjs --check` | 一致（18 支） |
| 生成物 | snapshot 金标准头由 `node scripts/…` 修为 `node checks/…`（生成器命令） | 红→绿 |
| 账本 | 追加 40 条、旧条目零重写；冻结层 307 条链接链式解析 | 绿 |
| fresh-agent 审计 | 无上下文子代理按入口链走三任务（探针入口 / run-dashboard 核心 / 面分类） | 3 处发现：run-dashboard-core 头注退役名、design/40 导航缺口、guides/60 缺 `source` 前缀 → 已修；pack 注释按计划延后 |
| 发布面 | pack 源未改（误改的注释已 revert）；`_dist` 复建后 sha 回到 `1b1dde…`（0.3.6 原 sha），manual 恢复 HEAD | 绿 |

## 残余风险

- `packages/deep-research-pack/src/lib/review/review-readiness.ts` 的注释仍指 `checks/lib/ops/run-dashboard-core.mjs`；
  修它要同步 repack 已发布 0.3.6，故随下一次 pack 版本变更同 diff 修（不改已发布工件）。
- 合同桶改名与 `client-load.entry`（1366 行）拆分已登记 [triggers](../../_backlog/triggers.md)，有可观察重议条件。
- `call-surface` 只认命令词开头/头注内的路径；模板字符串与变量拼接段仍不在车道内（与 `smoke-child-paths` 同边界）。
- 账本链式解析让历史条目永久有效，但 `from` 唯一性由门禁保证；如果未来出现同名 `from` 的清理需求，需先删旧条目再登记。
