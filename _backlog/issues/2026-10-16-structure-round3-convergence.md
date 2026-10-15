---
status: 等人拍板
opened: 2026-10-16
---

# 计划：第三轮结构收敛——web harness 单一正本、小件收口与触发登记

> 立卡：2026-10-16 ｜ 状态：等人拍板 ｜ 类型：Task ｜ 结论倾向：现在做（三点已拍板，实施等用户逐阶段发起）｜ 可关闭：否

**问题与期望结果：** 2026-10-16 用户委托的全仓结构评审（结构 / 臃肿 / SOLID 三问），经取代检查对齐 2026-10-13 两篇结构 Note 后确认：剩余的真实改善面集中在上轮刻意避开的区间——那轮硬约束"零行为变化 + 红即回滚"、未跑真模型档面，而 DSH web harness 家族的 ~7 份近重复（`rpc` / `boot` 横幅等待 / `authenticate` / 本地会话日志读法 / 谓词轮询，约 500 行）恰恰集中在真模型档脚本里。本卡承载已拍板的收敛计划。期望结果 = 重复面收敛为单一正本、参数保形零行为变化、每阶段有可机械执行的验收判据。

**当前情况：**

1. **取代检查已完成**——评审初稿中与既有裁决相撞的三条已撤回：verify.mjs 文件级拆分（重启条件正本 = [verify-domain-regroup](../../notes/implemented/2026-10-13-verify-domain-regroup.md)）、clientHistoryWindowOf 下沉 lib 与 readLog 换 canonical 之外的收敛边界（[repo-structure-refactor](../../notes/implemented/2026-10-13-repo-structure-refactor.md) 输掉的方案）、tests/ 分域（[test-asset-organization](../../notes/implemented/2026-10-05-test-asset-organization.md)）。
2. **三点已拍板（2026-10-16 用户）**：① Phase B 做 B1+B2 全量，真模型档五站点逐件复跑取证；② verify.mjs 不拆，重议条件登记进 [triggers](../triggers.md)；③ hitl-answer 长函数本轮不动——其三条硬化候选仍归 [2026-10-15 卡](2026-10-15-hitl-answer-and-test-surface-hardening.md)，两卡互不接管。
3. **两条实证修正了计划形态**：① [run-dashboard-core](../../scripts/lib/run-dashboard-core.mjs) 与 [evidence-audit-core](../../scripts/lib/evidence-audit-core.mjs) 的 `splitFrontmatter` 逻辑逐字相同，可收敛——evidence-audit 侧"独立副本——不依赖 dashboard 副作用面"的理由在两核均纯化为 lib 纯件后失效，中立第三方模块比任一消费方更小；② 两个 run-gates 壳的 `readLog` **语义不同**（[node-gate](../../scripts/run-gates/node-gate.mjs) 解压失败返回 `''` 空语料继续、[evidence-audit](../../scripts/run-gates/evidence-audit.mjs) 返回 `null` 跳过该文件——失败契约是各自判据的载重墙，头注实证），且解压通路（zstd CLI）与 canonical [session-log](../../scripts/lib/session-log.mjs)（node zlib）不同——**不换 canonical**（那是行为变化），只抽逐字相同的 zstd CLI 调用段为共享小件。

**未决问题：** 计划内容无未决；在等的只有用户逐阶段起步令。

**下一步：** 等用户发令（例：开工 Phase A）。执行纪律 = 每阶段独立 diff → 验收判据全绿 → 报告（实际跑过 / 未跑分列）→ 用户确认 → 才进下一阶段；同 diff implemented Note（含参数保形原值表与输掉的方案，互链 2026-10-13 两篇）。

## 方案与取舍

### Phase A · 小件收敛（keyless 全证）

- 新增 `scripts/lib/frontmatter.mjs`（splitFrontmatter 唯一正本）+ zstd CLI 文本解压小件（两壳共享段：spawnSync `zstd -dc` + 64MB maxBuffer）；
- 两 core 改 import、两壳改调用并各留 2–3 行失败包装（`''` 继续 / `null` 跳过——原契约不动）；
- 同步面：[scripts/README](../../scripts/README.md) lib 表两行（navigability 资产门对账）；无门禁 / 测试改动；
- 实施首步 = 复跑三壳并留存基线（stdout + 报告文件拷贝 + HTML——keyless 秒级；报告文件会被重跑覆盖，先拷贝）。evidence-audit `--latest` 当前真态 = exit 1 + CRITICAL 1（在飞 bundle 零证据），该红样本保留用于证明零行为。

### Phase B1 · web-harness 单一正本 + keyless 三站点

- 新 lib（暂名 `scripts/lib/web-harness.mjs`，终名按 README 命名惯例）：`bootWeb` / `authenticate` / `rpc` / 谓词等待；
- 站点：preset-smoke / client-load-smoke / snapshot-replay-smoke 改 import + 参数保形；
- 参数保形原值表（差异全部参数化，原值进 Note）：rpcId 前缀各站点原值（`smoke-` / `ch-` …）；AbortSignal 超时仅 preset-smoke；boot detached 组长收割 + 失败 reclaimPort 仅 preset-smoke；错误截断 200 / 300 各按原值；authenticate 三种签名统一为 `(base, token)` 等价改写；
- 硬约束：端口不进 harness 缺省（port-exclusive 门禁——端口认领留在各站点）；harness 不被任何 tests import（layering import 闭包图）；README lib 表新增行；
- 每站点独立小 diff，单站点红只回滚该站点。

### Phase B2 · 真模型档五站点

- 站点：l4-lite-smoke / team-preflight-smoke / client-hitl-smoke / discipline-probe / entry-chain-probe——harness 收敛 + 本地 `sessionDirOf` / `readSessionLog` 换 canonical session-log；
- 如实申报的判据变更：解压通路 zstd CLI → node zlib（同输出、不同路）；`session-<id>` 双形态扫描 vs canonical 代际选择逐站点比对，不等价处保留本地并记 Note（不为收敛改语义）；
- 形态不同的内闭包不硬收敛：cdp-ask / snapshot-replay 的内层 rpc、dev/run-kickoff 的 rpc——留本地记"刻意不收敛"（与 2026-10-13"测试须知模态两处刻意不收敛"同原则）；
- vendor 产物由各脚本 assertVendorArtifacts 自检把守，缺席先 `bash dev/vendor-build.sh` 复跑；改前一轮留档 → 改后复跑 → stdout 形态一致（时间戳 / 时长 / token 类波动字段白名单化后 diff）；任一档被外部阻断 → 该站点改动退回本地副本，如实分列，不阻塞其余。

### Phase D · 触发登记

[triggers](../triggers.md) 两行：verify.mjs 拆分重议（条件 = 门禁继续增长 / 追加块编辑摩擦成实测痛点，正本 = verify-domain-regroup Note）；tests/ 分域（条件 = 检索开始靠猜或文件数显著上升，正本 = test-asset-organization Note）。

### 输掉的方案（不做，有裁决或实证背书）

- verify.mjs 文件级拆分 / 域级拆分——重启条件在场，本卡不重开；
- clientHistoryWindowOf 下沉 lib——单消费方不成缝（2026-10-13 裁决）；
- readLog 换 canonical session-log——失败契约与解压通路双差异 = 行为变化，超出零行为边界；
- 内闭包形态 rpc（cdp-ask / snapshot-replay / run-kickoff）硬收敛——形态差异非逐字重复；
- hitl-answer `operateOnTargetCard` 分段——驱动面无直接契约测试、验证面薄，收益不抵；与 [2026-10-15 卡](2026-10-15-hitl-answer-and-test-surface-hardening.md) 的触发条件（下次改该文件时顺带）合并考虑；
- tests/ 分域、run-dashboard-core 再拆、ResearchStatusTab 再拆——既有裁决维持。

## 验收标准

| 阶段 | # | 判据 | 检查 | 通过形态 |
|---|---|---|---|---|
| A | A-1 | keyless 回归 | `pnpm test` | 全绿（run-dashboard / evidence-audit / node-gate 1:1 测试即反证记录） |
| A | A-2 | 结构门禁 | `pnpm verify` | 全绿（navigability 对账 README 新行） |
| A | A-3 | 仪表盘零行为 | `node --import tsx/esm scripts/run-ops/run-dashboard.mjs --latest --out <tmp>` | stdout / exit / HTML 与基线一致 |
| A | A-4 | node-gate 零行为 | `node scripts/run-gates/node-gate.mjs --latest` | exit 0 + stdout + node-gate.md 逐字一致（改前拷贝留档） |
| A | A-5 | 审计零行为 | `node scripts/run-gates/evidence-audit.mjs --latest` | 维持 exit 1 + CRITICAL 1 真态（不"顺手修好"行为） |
| B1 | B1-1 | L0 | `pnpm verify` + `pnpm test` | 全绿（含 smoke-contract closed set——lib 非凭据入口，名单不变） |
| B1 | B1-2 | L1 真挂载 | `source dev/env.sh && DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs` | ALL PASS |
| B1 | B1-3 | 观察面 | `source dev/env.sh && node --import tsx/esm scripts/smoke/client-load-smoke.mjs` | ALL PASS |
| B1 | B1-4 | 回放 | `source dev/env.sh && node scripts/smoke/snapshot-replay-smoke.mjs` | ALL PASS |
| B2 | B2-1 | L0 | `pnpm verify` + `pnpm test` | 全绿 |
| B2 | B2-2 | 真模型档 | 五件各自命令实跑（命令正本 = [guides/60 §2](../../docs/guides/60-dev-loop.md)） | 各自 ALL PASS |
| B2 | B2-3 | 零行为对比 | 改前留档 → 改后复跑 | stdout 形态一致（波动字段白名单化后 diff） |
| B2 | B2-4 | 未跑项分列 | 交付报告 | 阻断站点退回本地 + 如实分列，不阻塞其余 |
| D | D-1 | 登记形态 | `pnpm verify` | 绿 + triggers 行格式一致 + 链接落决定正本（md-links 把守） |

各阶段收尾共用：同 diff Note 四节齐（决定 / 输掉的方案 / 实际跑过的验证 / 环境状态）+ 取代检查互链 2026-10-13 两篇 + reviewing-a-delivery 自审；报告实际证据与未跑项分列。

## 关闭条件

- 全部已拍板阶段（A / B1 / B2 / D）交付且验收判据全绿、Note 落盘、自审完成、用户确认后：状态行改 `可关闭：是` + 同次变更归档 settled_issues；
- 中途范围调整 = 用户明确答复后本卡同 diff 改（计划正文是当前合同，不是历史叙事）；
- 用户叫停 = 转 suspended_issues（已交付阶段的证据与 Note 不回滚）。
