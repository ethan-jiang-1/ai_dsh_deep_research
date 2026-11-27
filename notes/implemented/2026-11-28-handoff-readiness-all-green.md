# 十三维接手与发布就绪全绿收口（0.3.8）

> 状态：implemented

相关前序决定：[handoff-anchor](2026-11-15-handoff-anchor.md) · [shipped-boundary-self-contained](2026-11-17-shipped-boundary-self-contained.md) · [ci-platform-alignment](2026-11-16-ci-platform-alignment.md)。

## 决定

1. **子路径显示面、运行期入口与挂载行的单一派生源**：在 [`checks/lib/repo/shipped-surface.mjs`](../../checks/lib/repo/shipped-surface.mjs) 集中提供 `packSpecifiersOf`、`displayMetaTargetsOf`、`runtimeJsPathsOf` 与 `insertedRowIdsOf`，从 `packages/deep-research-pack/package.json` 与 `dsh.bundle.patch` 引用的全部 YAML 派生 6 个可寻址 specifier、7 个 `lib/*.js` 产物及 13 条新增行；补齐 `locale-defaults/{en,zh}.json` 与 `./defaults/{icon,locale/*.json}`、`./workers/*.patch.yml` 导出，并让 `pack-manifest`、`pack-bundle-compat`（含 `workers/` 盘面对账）、`doctor.mjs`、`lifecycle.entry.mjs`、`export-dist.mjs` 与 `pack.e2e.mjs` 共用同一事实源。
2. **包级编译依赖自足与发布产物单一入口**：将 `packages/deep-research-pack/src` 全部外部依赖显式镜像进子包 `devDependencies`（遵循上游客户端约定不在子包写 `@types/react*`），由 `package-contract.spec.mjs` 机械把守；修正 [`docs/contracts/release.md`](../../docs/contracts/release.md) 与 `release-check.mjs`，规定 `npm publish` 只能发布 `export-dist.mjs` 剥离了 `workspace:*` `devDependencies` 与 `scripts` 的 `_dist/dsh-deep-research-pack-<version>.tgz`，并以 `0.3.8` 重锚版本与产物。
3. **客户端显式依赖注入与设置文件权限硬化**：将 `src/client/index.ts` 中三处无类型 `scoped.get('layout')` 改为显式声明 `'layout'` Cordis `inject` + `MainPanelId` 品牌类型调用，同步补齐 `dsh.client.inject`；将 `src/startup/settings.ts` 的临时文件升级为 `pid + UUID`、`0600` 权限与 `fsyncSync` 原子写（含 `.corrupt` 备份）。
4. **冷启动预检、内环按域短路与 CI 覆盖前移**：`tools/build/bootstrap.sh` 增加本包 `lib/` 构建产物检查与 `dsh-app-boot` 视角下的 `node-addon-require-builtin` 原生插件可加载预检；`checks/verify/verify.mjs` 在 `--only` 模式下跳过无交集门禁域（保留全集与 `context.gates` 一致性自检）；`ci.yml` 的 `keyless` 作业并入 `tsconfig.scripts.json` 类型检查与 `pnpm test:vendor`，`nightly.yml` 的 `snapshot-replay` 升为完整 `--layers a,b,c`。
5. **上游升级指南纳管、五角色常驻预算与实跑故障清零**：`d-vendor.mjs`（`align-ledger`）强制纳管 `vendor/dsh/docs/upgrade-guide/v*` 版本目录；`content-budget.mjs` 与 `model-experience.e2e.mjs` 覆盖盘上全部 5 个角色 preset；同时修复全矩阵实跑暴露的三处潜伏缺陷：① `run-accept.e2e.mjs` 案例 ⑤ 旧回执夹具补齐 `decodeDeliveredReceipt` 必填的 `acceptedAt` 与 `gate`；② `port-reclaim-policy.mjs` 的 `DSH_ENTRY` 识别 `nvm`/绝对路径 `process.execPath` 启动的本仓 DSH 进程；③ `client-load.entry.mjs` 轨道完成步标签读取前剥离 `aria-hidden="true"` 的装饰徽章（`↺`）。

## 输掉的方案

- **继续在各门禁与冒烟维护手写数组（4 个 locale 目录 / 5 个 specifier / 10 条挂载行）**：已实证导致新增 `defaults` 子路径与 `workers/` 后多处静默漏检；改为从盘上包清单与 patch YAML 动态派生。
- **把 `@types/react` / `@types/react-dom` 写进子包 `devDependencies`**：违反 `vendor/dsh/packages/client/AGENTS.md` 单一根类型源约束，会引发双份 React 类型冲突；只镜像运行时/框架包并在 `package-contract.spec.mjs` 反向禁止子包声明 `@types/react*`。
- **允许在 `packages/deep-research-pack` 目录裸跑 `npm publish`**：会把含 20+ 条 `"workspace:*"` 的源 `package.json` 直接发上注册表；强制只发布经 `export-dist.mjs` 净化并由 `pack.e2e.mjs` 验过的 `_dist` tarball。
- **保留 `scoped.get('layout')` 或放宽 `host-health` 阈值绕过 `client-load` 红灯**：前者绕开 Cordis 生命周期依赖声明，后者掩盖真实断言失配（本次实测抓出 `挖掘↺` 未剥离 `aria-hidden` 装饰符的真失配）；均按真根因修复。

## 实际跑过的验证

- **门禁与契约红→绿反证**：
  - `gates.e2e.mjs --gate=pack-manifest`（含新增 `pack-manifest-subpath-display-missing`）：2/2 注入红例被点名拦截，基线绿；
  - `gates.e2e.mjs --gate=pack-bundle-compat`（含新增 `pack-bundle-compat-worker-unlisted`）：5/5 注入红例被点名拦截，基线绿；
  - `gates.e2e.mjs --gate=align-ledger`（含新增 `align-ledger-upgrade-guide-unindexed`）：6/6 注入红例被点名拦截，116 条源面对账绿；
  - `package-contract.spec.mjs` 首跑真实抓红子包漏声明的 `@deepseek-ai/dsh-web-deepseek-api` 与 `@deepseek-ai/dsh-web-fetch-http`，补齐后转绿；
  - `port-reclaim.spec.mjs` 先注入 `/Users/me/.nvm/.../bin/node --import tsx/esm .../bin.ts` 实测红（`false !== true`），修复 `DSH_ENTRY` 后 4/4 转绿，同轮 `data.entry.mjs` 端口释放由红转绿。
- **L0 / 静态 / 类型 / 回归全套**：
  - `pnpm verify`（63/63 PASS）· `pnpm lint`（oxlint 141 files 0 warnings/0 errors）· `pnpm typecheck`（pack host/client + `tsconfig.scripts.json` 0 errors）· `pnpm test`（`test:spec` + `test:checks` 全绿）· `pnpm test:vendor`（4/4 PASS）· `pnpm docs:check`（全绿）。
- **L1 / L2 / L3 真进程与真浏览器全矩阵**：
  - `bash tools/build/bootstrap.sh --check`：0 缺件就绪；
  - `pack.e2e.mjs`（88 条目 ALL PASS）· `doctor.e2e.mjs`（含 `lib/defaults.js` / `workers/` / `locale-defaults` 负例 ALL PASS）· `handoff.e2e.mjs`（ALL PASS）· `run-accept.e2e.mjs`（ALL PASS）；
  - `method-library-tool.e2e.mjs`（PASS）· `model-experience.e2e.mjs`（5 角色全量计价 PASS）；
  - `DSH_SMOKE_REAL=1 preset.e2e.mjs`（5 角色 + 2 worker 真挂载与 skill 隔离 ALL PASS）；
  - `lifecycle.entry.mjs`（13 条挂载行 + 6 个 specifier `readPluginMeta` 中英标题/描述/图标 + 3 处 `apply` disposer + 卸载清零 ALL PASS）· `cold-start.entry.mjs`（GREEN）· `install-shape.entry.mjs`（ALL PASS）· `release.entry.mjs --install-only`（ALL PASS）· `data.entry.mjs`（包目录零写入/凭据零泄漏/卸载保留用户数据 ALL PASS）；
  - `client-load.entry.mjs --seed tests/fixtures/client-load-home`（全五相位 + 研究工作台 + 终稿/证据卡分屏全绿）· `cockpit-locale.entry.mjs`（英文界面装配全绿）· `snapshot-replay.entry.mjs --read-only --layers a,b,c`（5 角色场景 A+B + `lead` C0–C5 渲染金标准 ALL PASS）；
  - 交付收尾经 `reviewing-a-delivery` 对抗自审后提交并打 annotated tag `0.3.8`，实跑 `release-check.mjs --handoff` 与 `--receiver` 验收通过。
