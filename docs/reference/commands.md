# pnpm 命令字典

> 类型：reference。本页是根 [`package.json`](../../package.json) 全部 `pnpm` 脚本的完整字典，由 `docs-reference-fresh` 门禁与 `package.json` 双向校验（缺项或多出即红）。
> 任务级执行次序与运行通道脚本（`run-driver` / `boot-run` / 冒烟脚本）见 [guides/60 §2](../guides/60-dev-loop.md)。

## 根 `package.json` 脚本全表

| 命令 | 档位 / 前置 | 做什么 |
|---|---|---|
| `pnpm verify` | keyless（首次先 `source tools/env.sh` 激活 hooks） | 运行全量 L0 结构门禁（`node checks/verify/verify.mjs`；支持 `--only=<gate>`） |
| `pnpm test` | keyless（默认回归） | 聚合跑 `pnpm test:spec && pnpm test:checks`（pre-commit 与 CI keyless 必跑） |
| `pnpm test:spec` | keyless（进程内） | 跑 `tests/{run,cockpit,pack,contracts}/**/*.spec.mjs` 行为与契约 spec |
| `pnpm test:checks` | keyless（进程内） | 跑 `tests/checks/*/*.test.mjs` 门禁自身与仓库守卫测试 |
| `pnpm test:vendor` | keyless（fresh clone 可跑） | 跑 `tests/vendor/*.vendor.spec.mjs` vendor 源码组合层与导出契约 |
| `pnpm test:coverage` | keyless（观察面） | 以 `test:spec` 同一 TSX 配置运行 `--experimental-test-coverage` 覆盖率采样 |
| `pnpm test:e2e` | 慢车道（真进程，经 `checks/test/run-lane.mjs e2e`） | 按 `checks/smoke/registry.json` 跑 `*.e2e.mjs`（默认 `ci ∪ nightly`；`--all` 含 dev-only） |
| `pnpm test:entry` | 慢车道（真浏览器/profile/tarball） | 按 `checks/smoke/registry.json` 跑 `*.entry.mjs`（支持 `--only <substr>`、`--list`） |
| `pnpm build` | 需 vendor 构建产物 | 构建 `packages/deep-research-pack` 双半产物（`tsc -b . && tsdown` → `lib/`） |
| `pnpm lint` | keyless | 对 `packages/deep-research-pack/src` 运行 standalone `oxlint` 静态规则检查 |
| `pnpm typecheck` | pack 半需 vendor 构建产物 | 运行 `tsc -b packages/deep-research-pack` + `tsc -p tsconfig.scripts.json`（含脚本 `checkJs`） |
| `pnpm release:check` | keyless（只读） | 发布/移交锚检查（`node checks/release/release-check.mjs`；支持 `--handoff` / `--receiver`） |
| `pnpm dsh` | 需 vendor 构建产物 | 直接从钉版 `vendor/dsh` 源码运行机制基线 CLI（等价 `tools/env.sh` 的 `dsh` 函数） |
| `pnpm docs:gen` | keyless | 重生成 `docs/reference/{package-catalog,cockpit-registry,gates-ledger}.generated.md` |
| `pnpm docs:check` | keyless（只读） | 校验三份 `docs/reference/*.generated.md` 新鲜度及本页与 `package.json` 的双向同步 |

## 常用非 `pnpm` 运维入口速查

完整命令块与前置条件正本 = [guides/60 §2](../guides/60-dev-loop.md) 与 [tools/README](../../tools/README.md)：

- **冷启动前置**：`bash tools/build/bootstrap.sh --check` / `bash tools/build/vendor-build.sh`
- **环境隔离与 hooks**：`source tools/env.sh`
- **研究 run 通道**：`node tools/channel/run-driver.mjs up`
- **门禁自测（改门禁时定向）**：`node checks/smoke/gates.e2e.mjs --gate=<门禁名>`
- **刷新索引与资产账**：`node tools/record/render-overlay.mjs`、`node tools/record/render-test-index.mjs`、`node tools/record/record-asset-ledger.mjs`、`node probes/_index.mjs --write`
