# 测试命名四车道：spec / e2e / entry / checks

> 状态：implemented
> 关联：[测试策略制度化程序卡](../../_backlog/issues/2026-11-13-test-strategy-institutionalization.md)（W0-10）；
> DSH `.spec.ts` / `.e2e.ts` 约定 = [test-strategy 语料](../../docs/external-materials.md)；
> 测试栈 = D26（node:test，不迁 vitest）

## 决定

测试资产按**证据形态 + 入口真实性**分四条命名车道，文件名本身就是车道：

| 后缀 / 位置 | 证据形态 | 命令 | DSH 对应 |
|---|---|---|---|
| `tests/{run,cockpit,pack,contracts}/**/*.spec.mjs` | 进程内 keyless | `pnpm test:spec` | `*.spec.ts` |
| `scripts/smoke/*.e2e.mjs` | 起真实进程（含 keyless process/built） | `pnpm test:e2e` | `*.e2e.ts` |
| `scripts/smoke/*.entry.mjs` | 真浏览器 / 真 profile / 真 tarball | `pnpm test:entry` | web/built 入口面 |
| `tests/checks/*.test.mjs` | 门禁自身（平铺） | `pnpm test:checks` | `.github/**/*.test.mjs` |

配套：`tests/vendor/*.vendor.spec.mjs` 是 vendor 源契约（`pnpm test:vendor`）；`scripts/smoke/*.support.mjs`
是支援件，不进任何车道；`pnpm test` = `test:spec` + `test:checks`（快环），慢车道显式跑。
`scripts/test/run-lane.mjs` 读 `scripts/smoke/registry.json` 的 `lane`/`tier` 选跑；默认只跑 `tier: ci`，
`--all` 带 dev-only，0/1/2 汇总。

## 为什么

- **只看文件名就知道是什么资产。** 旧名 `preset-smoke.mjs` / `client-load-config.mjs` / `entry-chain-probe.mjs`
  只说了「smoke/probe」，没说前置是 keyless、浏览器还是真模型；`client-load-config` 甚至像 smoke 但只是支援件。
  新名把 target + 证据形态 + 入口真实性一次说完。
- **命令与文件名一一对应。** `test:spec` 只跑 `.spec.mjs`，`test:e2e`/`test:entry` 只跑对应 lane，
  `test:checks` 只跑门禁自身；错后缀不会被某个大 glob 静默吸进默认回归。
- **对齐 DSH 的约定而不搬它的运行器。** 保留 `node:test`/`.mjs`（D26），但采用 `spec/e2e` 的语义后缀；
  `entry` 是本仓对「真浏览器/profile/tarball」入口面的明确命名。
- **空间穷尽机械可判。** `test-lanes` 钉 spec 四域 + checks 平铺 + 无旧 `.test`/`.e2e`/`.entry`；
  `smoke-registry` 钉 smoke 后缀 ↔ registry `lane`；`smoke-oracle` 钉账本字段。

## 输掉的方案

- **保留 `*.test.mjs` + `*-smoke`，只加文档映射**：用户明确要「只看文件名」；映射表仍要查。
- **全仓迁 vitest / `*.spec.ts`**：D26 已定 node:test；TS 面只有一个 pack；迁移零收益，且会改变所有命令。
- **只改新文件、旧名 grandfather**：留下双词表，下一轮仍要猜；这次一次迁完。
- **把 `entry` 并进 `e2e`**：真浏览器/profile/tarball 的失败面与纯进程不同，命令和前置也不同；
  合并会让 `test:e2e` 隐式依赖浏览器/安装面。
- **一个 `pnpm test` 跑全部**：慢车道（浏览器/安装/模型）会拖垮 pre-commit；默认只聚合 spec+checks。

## 实际跑过的验证

- `pnpm test:spec`：1335 pass / 0 fail（本机 2026-11-13）。
- `pnpm test:checks`：96 pass / 0 fail。
- `pnpm test:vendor`：4 pass / 0 fail。
- `pnpm test` = spec + checks；两条分跑均绿，聚合命令按序执行。
- `pnpm test:e2e --list`：6 个 CI e2e 条目；`pnpm test:entry --list`：3 个 CI entry 条目。
- 红证（实测）：`tests/root-lane.spec.mjs` → 域红；`tests/foo.test.mjs` → 旧后缀红；
  `scripts/smoke/bad-name.mjs` 未登记 → smoke registry 红；删除/还原 → 绿。
  其余（checks 嵌套、registry 错 lane、孤儿支援件）由契约代码覆盖，未逐一手工注入。
- 未跑：`test:e2e` / `test:entry` 的全量实跑（需要 dev home/浏览器/安装前置；命令与选择面已验）。

## 环境状态

本机 macOS / Node 22.23.1 / pnpm 11.7.0；正式 CI 的 `snapshot-replay` job 仍按 `entry` 资产单独跑
A/B（`--read-only --layers a,b`），不走 `test:entry` 的全量车道。
