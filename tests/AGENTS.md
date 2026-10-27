# AGENTS.md — keyless 回归与夹具（证据放置）

`tests/` 拥有 **keyless 回归**：`pnpm test`（命令正本 = [package.json](../package.json)）。
它验证契约、纯函数、解析、折算与渲染输出的确定性行为；宿主挂载、浏览器交互与模型行为另取
分级冒烟证据（[docs/evaluation.md](../docs/evaluation.md)）；上游对应物 = DSH `snapshots/AGENTS.md` 的“证据住在被它证明的对象旁边”。

## 分域（2026-10-20 用户指令：目录映射源代码）

`tests/**/*.test.mjs` 是默认回归的递归发现面；`fixtures/` 与 `_tmp/` 不在发现面内。
新测试按**被测面**入域，不放在 `tests/` 顶层：

| 目录 | 映射的源代码/面 | 放什么 |
|---|---|---|
| `run/` | run 通道、run 状态、HITL、run 门与审计、观察/回放、run-ops/probe | `scripts/lib` 对应模块的回归（模块清单 = 盘上 `scripts/lib/` 目录，不在此枚举） |
| `cockpit/` | pack client 观察面与其折算 | pack `src/lib` 折算模块的回归（清单 = 盘上 `src/lib/` 目录） |
| `pack/` | pack 结构、preset、导出与部署 | presets 形状、export-shape、deploy-bin |
| `contracts/` | 跨仓合同/文档/门禁自测/测试基础设施 | 清单 = 盘上 `contracts/` 目录（evaluation、navigability、layering 等） |
| `fixtures/` | 构造样本与冻结录制语料 | 测试/smoke 消费；taxonomy = [fixtures/README](fixtures/README.md) |

域内文件名 = 被测模块名 + `.test.mjs`（如 `run/run-state.test.mjs` ↔ `scripts/lib/run-state.mjs`）；
一文件测多个面按**主语**归域，跨域合同放 `contracts/`——pack src/lib 的 run 族折算（journal-wire 类）归
`run/`，跨 scripts/lib 与 pack 的驾驶舱数据面（method-presets 类）归 `cockpit/`；与 verify 门禁同源的双断言面（`pack/presets.test` ↔ role-list-sync/preset-structure/row-deps/pack-bundle-compat）登记 = 该测试头注。

## 放置规则（一处证据一个家）

- **`tests/`**：契约测试与守卫（`*.test.mjs`），断言对象是仓库里的自控文件；
- **`tests/fixtures/`**：构造样本与经整理、人审冻结的录制回放语料；由测试或独立回放 smoke
  消费。原始运行日志、报告与抓取证据归 `runtime/smoke-workspace/`、`research-workspace/` 的
  `drt_*`/`archive/`，夹具不自动进入默认测试 glob；
- 真模型/浏览器/网络/子进程检查走独立 smoke；默认回归无凭据可跑。`layering` 守卫五件套 =
  提及级禁物 + 解析级调用（[lib/keyless-imports](../scripts/lib/keyless-imports.mjs)——夹具
  字符串不咬）+ import 闭包图（传递引入也红；从 `scripts/` 树只许 import `lib/`，pack
  `src/lib` 纯件另由闭包图背书）+ 命令钉 + 有家句。违规样本只住 `fixtures/`，不回头污染域。

## 写测试时

- **覆盖边界有契约**：`scripts/lib` 每个模块要么有直测、要么在 [test-surface](contracts/test-surface.test.mjs) 的 `SMOKE_ONLY` 登记"为什么只能 smoke"；覆盖率 = `pnpm test:coverage`（观察面，不设百分比门禁）；
- **命名即申报**：`*.test.mjs` 命名即进 regression（递归 glob 选中，`layering` 钉 keyless）——
  新检查先想清它是不是 keyless 契约证据再命名；支援件住 `lib/`、`fixtures/`（glob 之外，
  import 不注册测试）；
- **verify the world**：断言重读文件或观察持久状态，不信"代码里已经设好了"；
- **新契约测试带反证**：同 diff 注入回归看红（改夹具 / 松判据 / 删断言）再还原——只交付绿 = 不知道测试会不会咬人；
  声称守卫具体事故（标题带 BUG-nnn）须留「负例留证/夹具留证」块（机械面 = `guard-red-record`）；
- **改夹具先想红**：夹具语义由消费它的契约测试钉住（node-gate / schema-scan 的用例即永久反证
  记录）——改夹具应预期变红，绿了说明钉歪了；
- 新契约（手册谓词、门禁登记、模板形状）→ 同 diff 加测试，并在
  [docs/evaluation.md](../docs/evaluation.md) 的对应面登记；
- 测试描述行为，不描述"正确性"：行为变了就同 diff 改断言，不留下与代码打架的旧断言。
