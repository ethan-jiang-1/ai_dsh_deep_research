# 搬家副作用的类级收口（批 E：BUG-191…198）

> 状态：implemented

## 决定

1. **落点补集 = 门禁，不是生成器**（M1/M4）：tests 的落点规则从散落在
   `pack-mirror` / `test-owner-mirror` / `test-lanes` 的「已知子树枚举」收口到
   `scripts/lib/repo/test-placement.mjs` + L0 门禁 `test-placement`；判据 = 全集 − 已知子集 = 空。
   `pack-mirror` 同 diff 增加盘上全量 spec 的同一断言与 `tests/cockpit/shared` 正向规则
   （≥2 个 client 子目录）。资产账/索引重生成不能吸收未知落点（M4 的出口被移到规则面）。
   卡 = [BUG-191](../../_backlog/_archived/fixed_bugs/BUG-191-placement-gates-unknown-subtree-unruled.md)。
2. **非 JS 分段路径有车道**（M3）：`snapshot-replay` 的离线预载改
   `scripts/lib/harness/replay-network-offline.cjs`；`cdp-ask` 的探针改
   `probes/browser/cdp-probe.mjs`。两处入口在 spawn/boot 前 `existsSync` 前置并以 exit 2 点名
   常量（未跑 ≠ 断言红）。新增 `tests/checks/smoke-child-paths.test.mjs` 用 TS AST 扫
   `join(ROOT, <全字面量>)`，运行/生成区（runtime、_dist、node_modules、pack lib）显式豁免。
   卡 = [BUG-192](../../_backlog/_archived/fixed_bugs/BUG-192-snapshot-replay-offline-preload-stale-path.md) /
   [BUG-193](../../_backlog/_archived/fixed_bugs/BUG-193-cdp-ask-spawns-moved-probe-path.md)。
3. **索引与覆盖的可见性**（M6/C7）：`test-index` 的 importer 扩展名闭集加 `.tsx`，并在对账
   测试加一条不复用该过滤器的独立 `.tsx` 非空抽查；`test-surface` 的 lib 模块全集复用
   `libModulesOf`（`.mjs` + `.cjs`），preload 以 `SMOKE_ONLY` 登记「只能子进程 preload」，
   登记项存在性检查同时认 `.cjs`。卡 =
   [BUG-194](../../_backlog/_archived/fixed_bugs/BUG-194-test-index-drops-tsx-importers.md) /
   [BUG-196](../../_backlog/_archived/fixed_bugs/BUG-196-test-surface-cjs-coverage-blind.md)。
4. **数值 CLI 输入与有界并发**（C4/C7）：`gates.e2e` 的 `--jobs` 走 `parseJobsArg`（缺省
   fallback；其余必须是正整数，否则 exit 2 并点名原值）；`mapLimit` 换成 `boundedMap`
   （非法 limit 在起 worker 前抛错）；失败聚合只收字符串，`undefined` 不再冒充失败。卡 =
   [BUG-195](../../_backlog/_archived/fixed_bugs/BUG-195-gates-e2e-adhoc-jobs-value-fake-failures.md)。
5. **门禁自测面**（R8/C7）：`repo-conventions` 的 `dev/hooks` 扫面新增
   `repo-conventions-dev-hook-path` 注入案例；`test-placement` 新增
   `test-placement-unknown-subtree` 案例；`verify-gates` 静态钉住两个案例。卡 =
   [BUG-197](../../_backlog/_archived/fixed_bugs/BUG-197-repo-conventions-hooks-surface-no-gate-case.md)。
6. **账本 claim 的自指路径**（M3）：7 个 spec 头注改现路径；`asset-ledger.test` 逐条检查
   `uniqueClaim` 里的 `tests/…` token 是否存在（防空 ≥10 条 claim）。卡 =
   [BUG-198](../../_backlog/_archived/fixed_bugs/BUG-198-spec-header-stale-path-frozen-into-ledger-claim.md)。
7. **批处理**：8 张卡同批归档，每卡独立 `fix-evidence`；共享守卫（`smoke-child-paths`、
   `test-placement`）不替代单卡证据。

## 输掉的方案

- **逐卡修症状**：先改四个位置的判据再补账本，会在同一棵树上反复搬；规则面先收口。
- **只改 `pack-mirror`/`test-owner-mirror`**：它们是 `pnpm test` 车道，`gates.e2e` 看不到；
  BUG-191 的判据要求门禁自测有红证，故落 L0 门禁 `test-placement`。
- **把 `--jobs` 非法值静默钳到 1**：`Math.max(1, Number(x))` 正是假失败的来源；数值输入
  没有「差不多」的合法值。
- **给 `.cjs` 直接补一条 `SMOKE_ONLY` 了事**：preload 可以登记，但 `.cjs` 全集必须入覆盖
  合同；两个既有件分别走直测（policy）与登记（preload）。
- **手改 `tests/INDEX.generated.md` / `tests/fixtures/asset-ledger/ledger.json`**：生成物只由
  生成器改写；修法是生成器的过滤条件 + 生成器重跑，不是改产物。
- **只把 7 个头注改掉**：`uniqueClaim` 下次还会把错误路径固化；必须给账本加存在性判据。
- **给未知落点只加 `expect` 文本**：`gates.e2e` 的 `expect` 只用于「副本基线非 PASS」的
  门禁；`test-placement` 基线 PASS，案例靠 `FAIL test-placement` 判红。
- **把 `tests/run/shared/` 的单 owner 兜底一起收紧**：它不在批 E 的 8 张卡内，且现有
  `shared/` 用例的归属需单独判断；记在残余风险，不夹带迁移。

## 实际跑过的验证

| 面 | 命令 | 结果 |
|---|---|---|
| L0 结构 | `pnpm verify` | 全绿 |
| keyless 回归 | `pnpm test` | spec 1363 / checks 209，0 fail / 0 skip |
| 门禁自测 | `node scripts/smoke/gates.e2e.mjs` | 130 个注入案例全绿（对照组零注入全 PASS） |
| BUG-191 三格 | `node --import tsx/esm --test tests/checks/pack-mirror.test.mjs` | `tests/cockpit/misc`、`tests/pack/misc`、`tests/cockpit/shared` 各红（重生成 asset ledger 后仍红）；`tests/cockpit/client/method-library`、`tests/pack/contract` 绿 |
| BUG-191 门禁 | `node scripts/verify/verify.mjs --only=test-placement` | 注入 tracked `tests/cockpit/misc/…` → FAIL 点名未知落点；删除 → PASS |
| BUG-192/193 静态 | `node --import tsx/esm --test tests/checks/smoke-child-paths.test.mjs` | 注入 `join(ROOT, 'scripts','lib','__moved-probe__.cjs')` → 红；还原 → 绿 |
| BUG-192/193 运行前置 | `node scripts/smoke/snapshot-replay.entry.mjs` / `source dev/env.sh && node scripts/smoke/cdp-ask.entry.mjs` | 常量指回旧路径 → exit 2 并点名 `OFFLINE_PRELOAD` / `PROBE`；不是 banner 超时/断言红 |
| BUG-194 | `node --import tsx/esm --test tests/checks/test-index.test.mjs` | 过滤收回 `.ts` + 重生成 → 独立抽查红（`method-library/views` 显示「—」）；恢复 `.tsx` → 绿 |
| BUG-195 | `node --import tsx/esm --test tests/run/harness/gates-cli.spec.mjs` | 旧 `Math.max(1, Number(x))` + 无校验 `boundedMap` → 2 条 invalid 用例红；恢复 → 绿；`--jobs=abc/0/-1/1.5/1e999/''` 全部 exit 2；`--jobs=1` 案例绿 |
| BUG-196 | `node --import tsx/esm --test tests/checks/test-surface.test.mjs` | 新增无测试 `.cjs` → 红点名；删除 → 绿 |
| BUG-197 | `node scripts/smoke/gates.e2e.mjs --case=repo-conventions-dev-hook-path` | 去掉 `dev/hooks` 扫面 → 案例红（报因不命中）；恢复 → 绿 |
| BUG-198 | `node --import tsx/esm --test tests/checks/asset-ledger.test.mjs` | 注入不存在的 claim 路径 → 红点名；还原 + 重生成 → 绿；旧 7 条 claim 路径复扫 = 0 |

未跑：`pnpm typecheck`、`pnpm test:vendor`、`test:e2e`、`test:entry`、真模型档（Y9 未授权）、
R6/R9 的构建面（不在批 E 范围）。

## 残余风险

- `tests/run/shared/` 的单 owner 兜底已于 2026-11-16 收口（shared 准入 = 无依赖/仅 shared/
  test-support；见 [批 F Note](2026-11-16-guard-contract-hardening.md)）。
- `smoke-child-paths` 只认 `join(ROOT, <全字面量>)`；模板字符串/变量段仍不在车道内
  （它们不是本次两个实例的形态）。
- `test-placement` 的已知闭集是手写常量；新增 client 子目录/domain/surface 时需同 diff 更新
  `scripts/lib/repo/test-placement.mjs`（未知落点会红，不会静默放行）。
- `gates.e2e` 的 `expect` 机制对「基线 PASS 的门禁」不可用；`test-placement` 案例只判
  `FAIL test-placement`，报因细读在 `tests/checks/test-placement.test.mjs` 的逐形态矩阵。
