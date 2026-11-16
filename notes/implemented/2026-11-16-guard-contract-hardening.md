# 守卫契约加固（批 F：BUG-199…208）

> 状态：implemented

## 决定

1. **离线闸的承诺 = 可创建的每一种 DNS 形态**（BUG-199/206）：`replay-network-offline.cjs` 补
   `dns.promises.Resolver.prototype.*` 的 patch（Node 22 的 promises Resolver 是独立类，不继承
   `dns.Resolver`）；回归从源码子串改为 `node:vm` 加载 `install()` 的行为测试，注入假 dns/net 与
   假 argv，覆盖 `dns.lookup` / `dns.promises.resolve*` / callback Resolver / promises Resolver 四形态；
   非武装与 loopback 作为互补/负控。`test-surface` 的 preload `SMOKE_ONLY` 理由改为指向该直测。
2. **落点规则把「深度」也算进闭集**（BUG-200）：`tests/run/<owner>/<file>`、`cockpit/lib/<domain>/<file>`、
   `cockpit/client/<file>` 或 `<sub>/<file>` 均为恰好段数；`test-placement` 门禁、`pack-mirror`、
   `test-owner-mirror` 共用同一 `placementIssues` 判据，未知深度在三条车道都红。
3. **shared 是受限准入，不是逃逸口**（BUG-205）：`shared/` 只收无依赖、仅依赖 `shared`、或
   test-support（`test-infra`）的跨切 spec；单 owner spec 归位到对应 owner/domain。两个
   `tests/run/shared` 单 owner spec 归位 `tests/run/gates/`，登记簿与文档链接同变更。
4. **tests 下禁符号链接**（BUG-207）：`test-placement` 从 `git ls-files -s tests` 读 mode 120000 并
   点名目标；`pack-mirror` 用 `isSymbolicLink()` 盘上枚举（含目录链接）。node --test 不跟随
   symlink 目录，放行等于接受一个永不运行的「测试目录」。
5. **守卫台账覆盖到最新一批**（BUG-201）：台账从 A–D 扩到 A–F（D-1/D-2 + BUG-160..208）共 90 条；
   条目计数由 `SCOPED_IDS.length` 推导；新增反向判据——测试标题声称的 BUG-nnn（≥191）必须入账。
6. **claim 路径按仓内根前缀闭集**（BUG-202）：`uniqueClaim` 里的 `scripts|tests|packages|docs|dev|probes|snapshots|notes`
   加文件扩展名的 token 全部验存在；前缀计数进防空报因。
7. **索引对账验集合，不验非空**（BUG-208）：索引行的测试单元格解析为 spec 列表，与独立
   `tsxClientImporters()` 集合排序后 `deepEqual`；行缺/多/少都红。
8. **gates.e2e 的 flag 形状 fail-loud**（BUG-203）：`parseE2eArgs` 同判 `--name=value` 与
   `--name value`；空 `--case=`/缺值/未知 flag/位置参数一律 exit 2；`--jobs` 复用同一正整数校验。
9. **live 文档散文路径有车道**（BUG-204）：纯函数 `doc-prose-paths` 剥反引号/围栏/URL 后枚举
   带扩展名的仓内路径；`doc-paths` 门禁按仓根/文档目录/`vendor/dsh` 同一解析序验证。三处实例
   （`runtime/README`、`scripts/README` 两处）改现路径并进反引号扫面。
10. **批处理**：10 张卡同批归档，每卡独立 `fix-evidence`；共享守卫（`test-placement` /
    `pack-mirror` / `guard-ledger`）不替代单卡证据。

> 卡索引：[BUG-199](../../_backlog/_archived/fixed_bugs/BUG-199-offline-gate-promises-resolver-bypass.md) ·
> [BUG-200](../../_backlog/_archived/fixed_bugs/BUG-200-test-placement-unknown-depth-not-enforced.md) ·
> [BUG-201](../../_backlog/_archived/fixed_bugs/BUG-201-guard-ledger-closed-set-stops-at-190.md) ·
> [BUG-202](../../_backlog/_archived/fixed_bugs/BUG-202-asset-ledger-claim-path-check-tests-prefix-only.md) ·
> [BUG-203](../../_backlog/_archived/fixed_bugs/BUG-203-gates-e2e-empty-and-bare-flag-shapes.md) ·
> [BUG-204](../../_backlog/_archived/fixed_bugs/BUG-204-live-doc-prose-stale-paths-ungated.md) ·
> [BUG-205](../../_backlog/_archived/fixed_bugs/BUG-205-mirror-shared-escape-hatch.md) ·
> [BUG-206](../../_backlog/_archived/fixed_bugs/BUG-206-offline-preload-source-substring-test-and-smoke-only.md) ·
> [BUG-207](../../_backlog/_archived/fixed_bugs/BUG-207-tests-symlink-directory-passes-placement-never-runs.md) ·
> [BUG-208](../../_backlog/_archived/fixed_bugs/BUG-208-test-index-tsx-spot-check-nonempty-only.md)

## 输掉的方案

- **继续源码子串判覆盖**：BUG-199 就是子串断言与真实行为分家的产物；判据必须调用被测入口。
- **只给 promises Resolver 补一行 patch、不改回归**：下一次同类漏面仍不会被咬住。
- **只改 `test-placement` 不补 `pack-mirror`/`test-owner-mirror`**：三条车道各自枚举，深路径/共享
  逃生口会在另外两条继续绿。
- **把 symlink 跟随进仓内目标**：跟随后仍可能让测试宿主与运行器行为分家；明确拒绝并点名，
  需要时走显式登记表。
- **把 shared 的 `dir === 'shared'` 豁免保留**：它就是 BUG-205 的逃逸口本身。
- **保留 72 条手抄闭集**：新批守卫存在但台账看不见，反向也不查；计数由闭集长度推导。
- **claim 只认 `tests/`**：BUG-198 的类修被做成实例修，`scripts/`/`docs/` 的失效路径继续固化。
- **索引只验「非空」**：丢一半 importer 无法发现；集合相等才叫独立抽查。
- **空 `--case=` 静默跑全量**：90 秒全绿会被读成「指定案例绿了」；空值是未跑/非法输入，不是默认。
- **散文路径只修实例不加车道**：下一次搬家仍会留下无门禁的旧路径；`doc-prose-paths` 提供窄带枚举。
- **手改索引/账本生成物**：仍由生成器重跑，检查器只改对账面。

## 实际跑过的验证

| 面 | 命令 | 结果 |
|---|---|---|
| L0 结构 | `pnpm verify` | 全绿 |
| keyless 回归 | `pnpm test` | spec 1365 / checks 213，0 fail / 0 skip |
| 门禁自测 | `node scripts/smoke/gates.e2e.mjs` | 全量注入案例全绿（新增 depth / symlink / doc-prose 三例；对照组零注入 PASS） |
| BUG-199/206 | `node --import tsx/esm --test tests/run/harness/replay-network-offline.spec.mjs` | 删 promises Resolver patch → `Missing expected rejection` 红；恢复 → 3/3 绿；武装态实测 `promises.Resolver → blocked ENOTFOUND` |
| BUG-200 | `node --import tsx/esm --test tests/checks/pack-mirror.test.mjs` | `tests/run/ops/deep/zz-deep.spec.mjs` → 未知深度红；门禁/owner-mirror 同红；删除 → 绿 |
| BUG-201 | `node --import tsx/esm --test tests/checks/guard-ledger.test.mjs` | 删 BUG-191 入账 → `缺账：BUG-191` 红；合成 BUG-199 标题 → 反向判据红；恢复 → 4/4 绿 |
| BUG-202 | `node --import tsx/esm --test tests/checks/asset-ledger.test.mjs` | claim 注入 `scripts/lib/__gone__.mjs` → 红点名；恢复 → 绿 |
| BUG-203 | `node --import tsx/esm --test tests/run/harness/gates-cli.spec.mjs` | 旧解析 → 形状用例红；恢复 → 6/6 绿；`--case=` / `--case` / `--jobs=` / `--jobs` / `--frobnicate` / 位置参数均 exit 2；裸 `--case … --jobs 2` 案例绿 |
| BUG-204 | `node scripts/verify/verify.mjs --only=doc-paths` | 散文注入 `scripts/lib/__gone__.mjs` → 红点名；还原 → PASS；`gates.e2e --case=doc-paths-prose-dangling` 绿 |
| BUG-205 | `node --import tsx/esm --test tests/checks/test-owner-mirror.test.mjs` | run/shared 单 owner 探针 → 红点名；cockpit/lib/shared 探针 → pack-mirror 红；归位后绿 |
| BUG-207 | `node --import tsx/esm --test tests/checks/pack-mirror.test.mjs` + `pnpm verify --only=test-placement` | symlink 目录 → 盘上枚举与 mode 120000 双红；还原 → 绿；`gates.e2e --case=test-placement-symlink-dir` 绿 |
| BUG-208 | `node --import tsx/esm --test tests/checks/test-index.test.mjs` | 合成丢失一个 importer + 重生成 → 集合不一致红；恢复 → 2/2 绿 |

未跑：`pnpm typecheck`、`pnpm test:vendor`、`test:e2e`、`test:entry`、真模型档（Y9 未授权）。
L1/L2 不适用：改动面是门禁/脚本/生成物/文档，不是 preset/安装/pack 公共行为。

## 残余风险

- 守卫台账仍是手写 JSON（90 条）；反向判据只覆盖标题声称的 BUG-nnn（≥191），更早的历史闭集
  仍靠 `SCOPED_IDS` 维护。新增守卫必须同 diff 入账，否则反向判据红。
- `doc-prose-paths` 只认已知根前缀 + 文件扩展名；无扩展名简写、模板串、URL 路径不在内。
- `smoke-child-paths` 仍只认 `join(ROOT, <全字面量>)`；`resolve(ROOT)`/模板/变量段不在车道内。
- `test-placement` 的已知 home/owner/domain/surface 是手写常量；新增目录须同 diff 更新
  （构造不出「已知但放行」的未知落点，未知会红）。
- shared 准入收紧后，pack lib 的多 domain 交叉 spec 没有新的家；出现时先登记规则再迁移，
  不靠 `shared/` 兜底。
- `test-placement` 门禁用 `git ls-files -s`（tracked-only）；未跟踪 symlink 由 `pack-mirror`
  的盘上 `isSymbolicLink()` 枚举兜住，两条车道都需保留。
