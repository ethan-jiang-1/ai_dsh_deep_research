# AGENTS.md — keyless 回归与夹具（证据放置）

`tests/` 拥有 **keyless 回归**：`pnpm test`（命令正本 = [package.json](../package.json)）。
它验证契约、纯函数、解析、折算与渲染输出的确定性行为；宿主挂载、浏览器交互与模型行为另取
分级冒烟证据（见 [docs/evaluation.md](../docs/evaluation.md)）。上游对应物 = DSH
`snapshots/AGENTS.md` 的“证据住在被它证明的对象旁边”规则。

## 放置规则（一处证据一个家）

- **`tests/`**：契约测试与守卫（`*.test.mjs`），断言对象是仓库里的自控文件；
- **`tests/fixtures/`**：构造样本与经整理、人审冻结的录制回放语料；由测试或独立回放 smoke
  消费。原始运行日志、报告与抓取证据归 `runtime/smoke-workspace/`、`research-workspace/` 的
  `drt_*`/`archive/`，夹具不自动进入默认测试 glob；
- 真模型/浏览器/网络/子进程检查走独立 smoke；默认回归无凭据可跑。`layering` 守卫五件套 =
  提及级禁物 + 解析级调用（[lib/keyless-imports](../scripts/lib/keyless-imports.mjs)——夹具
  字符串不咬）+ import 闭包图（传递引入也红，tests 本地 import 只走 `scripts/lib/`）+ 命令钉 + 有家句。

## 写测试时

- **命名即申报**：`*.test.mjs` 命名即进 regression（`pnpm test` 的 glob 选中机制，layering
  守卫钉 keyless）——新检查先想清它是不是 keyless 契约证据再命名；支援件住 `lib/`、
  `fixtures/`（glob 之外，import 不注册测试）。档位语法正本 = [scripts/AGENTS §依赖与分层](../scripts/AGENTS.md)；
- **verify the world**：断言重读文件或观察持久状态，不信"代码里已经设好了"；
- **新契约测试带反证**：同 diff 注入回归看红（改夹具 / 松判据 / 删断言皆是回归手法）再还原——只交付绿 = 不知道测试会不会咬人。声称守卫具体事故（标题带 BUG-nnn）须留「负例留证/夹具留证」块——机械面 = verify 门禁 `guard-red-record`；
- **改夹具先想红**：夹具语义由消费它的契约测试钉住（node-gate / schema-scan 的用例即永久反证
  记录）——改夹具应预期变红，绿了说明钉歪了；
- 新契约（手册谓词、门禁登记、模板形状）→ 同 diff 加测试，并在
  [docs/evaluation.md](../docs/evaluation.md) 的对应面登记；
- 测试描述行为，不描述"正确性"：行为变了就同 diff 改断言，不留下与代码打架的旧断言。
