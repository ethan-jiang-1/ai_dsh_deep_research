# AGENTS.md — keyless 回归与夹具（证据放置）

`tests/` 拥有 **keyless 回归**：`pnpm test`（= `node --import tsx/esm --test tests/*.test.mjs`；零依赖、无凭据可跑）。
它证明的是**契约与形状**，不是产品行为——行为证据归分级冒烟与真模型档（见
[docs/evaluation.md](../docs/evaluation.md)）。上游对应物 = DSH `snapshots/AGENTS.md`
的"证据住在被它证明的对象旁边"规则。

## 放置规则（一处证据一个家）

- **`tests/`**：契约测试与守卫（`*.test.mjs`），断言对象是仓库里的自控文件；
- **`tests/fixtures/`**：只放**测试夹具**（构造的样本文件/会话片段）。运行产物、真会话日志、
  抓取到的证据**不进这里**——它们归 `dev/smoke-workspace/`（gitignored 运行区）与
  `research-workspace/` 的 `drt_*`/`archive/`（run bundle 与已交付归档）；
- 真模型/网络/子进程的检查**不进 `tests/`**：`layering` 守卫在门禁层面拒绝这种越界
  （keyless 回归必须无凭据可跑），这类证据走 `scripts/*-smoke.mjs` 的对应档。

## 写测试时

- **verify the world**：断言重读文件或观察持久状态，不信"代码里已经设好了"；
- **新契约测试带反证**：同 diff 注入回归看红（改夹具 / 松判据 / 删断言皆是回归手法）再还原——
  只交付绿 = 不知道测试会不会咬人；
- **改夹具先想红**：夹具语义由消费它的契约测试钉住（node-gate / schema-scan 的用例即永久反证
  记录）——改夹具应预期变红，绿了说明钉歪了；
- 新契约（手册谓词、门禁登记、模板形状）→ 同 diff 加测试，并在
  [docs/evaluation.md](../docs/evaluation.md) 的对应面登记；
- 测试描述行为，不描述"正确性"：行为变了就同 diff 改断言，不留下与代码打架的旧断言。
