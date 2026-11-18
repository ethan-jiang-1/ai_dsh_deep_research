# 运行时依赖与安装边界（批 I：BUG-229…239）

> 状态：implemented
> 历史注记：安装边界；干净室解析基/pack-deps 反向与动态面/manifest scripts 由 [move-residuals-ii](2026-11-18-move-residuals-ii.md) 增补，其余决定仍现行。

## 决定

1. **发布物依赖闭包 = 声明的唯一账**（BUG-229 / 232 / 238）。新增 `checks/lib/repo/pack-deps.mjs`：
   正向（`lib/*.js` 的非相对 require + 发布 `.d.ts` 的 external import ⊆ `peerDependencies`）、
   反向（非 host-row peer 必须被用到或在随包 YAML 行里点名）、版本（`@deepseek-ai/dsh-*` 组 peer
   范围必须与 `engines.dsh` **同一字符串**）。`pack.e2e` 在真 tarball 清单上跑三面。
   顺带删除死 peer `zod`（仅 devDependency 需要，发布物无 require/import）。
2. **React 加 peer，不打包**（BUG-229）。`react` / `react-dom` `^18.2.0`（与 DSH web 宿主同版）
   进 `peerDependencies` 与 optional `peerDependenciesMeta`（D38 要求所有 peer optional）。
   client bundle 外置 React 的既有形状不变。
3. **公开类型面 = `exports.types` 的可达相对闭包**（BUG-239，修正 219）。上轮把 219 收成「7 个入口集」
   是错的：`client/index.d.ts` 与 `fetch-fallback/index.d.ts` 各带相对 import（`./locales.ts`、
   `./config.ts`），闭包实为 11 个文件。新增 `tools/record/record-type-closure.mjs` 生成
   `tests/fixtures/shipped/type-closure.json`；`files` 逐条列出 11 个；keyless 测试对夹具、
   `pack.e2e` 对盘上真实闭包双向对账。消费者 `tsc --noEmit`（NodeNext）在本轮前后分别复现/消除 TS2307。
4. **干净室 = 一个可执行矩阵**（BUG-233 / 234 / 235）。新增 `checks/lib/harness/clean-room.mjs`
   + 纯判据 `clean-room-policy.mjs`（仓外 home、`dsh --version ∈ engines.dsh`、解析祖先不落
   `ROOT/node_modules`）。三个入口接入：`cold-start.entry` 改为仓外 home + 钉版 dsh + `_dist`
   tarball 安装 → 起 web 换 token（浏览器面归 client-load）；`release.entry` 默认仓外 home +
   钉版 dsh（`--dev-home` 保留旧模式）；`lifecycle.entry` 默认钉版 dsh（`--global-dsh` 仅对照）。
5. **发布会话的文本与集合守卫加固**（BUG-230 / 231）。`shipped-surface` 的路径 token 先归一
   （`./` `../` 前导 `/` 反斜杠）再判根，裸根按开发根闭集判；绝对 URL 是外部导航不判。
   源侧扫描集改由 `files` 允许集派生（不再手工挑目录），`pack.e2e` 断言「发布文本集 ⊆ 源侧扫描集」。
6. **发布 manifest 剥离 devDependencies**（BUG-236）。`export-dist` 在 staging 副本里剥离
   devDependencies 后打包（源 manifest 不动，构建仍用 devDeps）；`pack.e2e` 读 tarball 的
   `package.json` 断言零 `workspace:` 协议、零 devDependencies。
7. **旧 profile 删除 + 非默认 profile fail-loud**（BUG-237）。删除 `research`（0.3.1）与
   `wave-pilot`（0.3.0）两个死镜像；`run-driver` 的 `up`/`probe` 在 `DSH_RUN_PROFILE` 非默认时
   exit 2（判据与文案收口到 `checks/lib/channel/profile-guard.mjs`，keyless 测试共判），
   显式 `--allow-stale-profile` 才放行。

## 输掉的方案

1. **把 pack 的 devDependencies 移到根 workspace**：需要动 lockfile 与依赖提升，构建/类型解析风险
   大于收益；staging 剥离让源 manifest 与发布 manifest 各守其职。
2. **React 打进 bundle**：会产生第二份 React、破坏宿主单实例；peer 声明是正确形状。
3. **cold-start 继续走 run-driver**：那会把「安装测试」变回「仓内通道测试」，正是 233 的根因；
   浏览器面有 client-load 真浏览器档承接。
4. **反向「死 peer」对 host-row 组强判**：preset 行以 id 引用 base 行，YAML 里不出现包名，
   反向对它们不可判；改为正面约束（范围 = engines.dsh），边界写在模块头注。
5. **声明打包器（把 7 个入口压成自包含 d.ts）**：需要新增构建依赖，本轮不引入；可达闭包是
   零依赖的正确不变式，若将来要压成单文件再开卡。

## 实际跑过的验证

- `pnpm verify` 全绿（含 `pack-manifest`/`readme-shape`/`dist-*`/`guard-red-record`/`gate-ledger-sync`）。
- `pnpm test` 全绿（新增 `pack-deps` / `publish-manifest` / `clean-room-policy` / `profile-guard`
  门禁自测；`shipped-surface` 补路径归一/扫描集/闭包矩阵）。
- `node checks/smoke/pack.e2e.mjs`：86 个 tarball 条目、类型集合 = 11 文件闭包、tarball manifest
  零 devDependencies/workspace、发布物依赖闭包 = peers、随包文本零 dev 引用。
- `node checks/smoke/lifecycle.entry.mjs`（默认钉版 dsh）：ALL PASS（market → 装 tarball → 显示面
  → remove 回落）。
- `node checks/smoke/release.entry.mjs`（默认仓外 home + 钉版 dsh）：ALL PASS，含 `preset.e2e`
  真挂载 5 角色 + 2 worker、端口释放。
- `node checks/smoke/cold-start.entry.mjs`（仓外 home + tarball + 钉版 dsh）：GREEN，web 横幅 +
  token 换 cookie；`NODE_PATH=$PWD/node_modules` 时红（解析落仓根 = 假绿），证明判据会咬。
- 逐卡红证回放：229 删 React peer → pack.e2e 正向红；230 退回旧 lookbehind → 边界用例红；
  231 收窄源侧扫描集 → 集合用例红；232 注入 `require('left-pad')` → 依赖闭包红；233 NODE_PATH
  泄漏 → 冷启动红；234 `--dev-home` + 非 dev home → 拒（旧行为）；235 假 dsh 9.9.9 → NOT-RUN；
  236 关闭剥离重导出 → tarball manifest 红；237 非默认 profile 直起 → exit 2；238 peer 改 `^0.3.0`
  → 范围红；239 从 `files` 删一个闭包文件 → 清单红。
- 消费者类型面：解包 tarball 到临时 node_modules，NodeNext `tsc --noEmit` 在修复前报
  `TS2307 './locales.ts' / './config.ts'`，修复后消除（peer 未安装的 `@deepseek-ai/cordis`
  错误属预期，不在包内容断言内）。

## 残余风险

- **nightly 侧未真跑**：`lifecycle.entry`/`pack.e2e` 的改动只在本机真跑过；`nightly.yml` 的真实
  执行要等下一次夜间/手动触发。
- **clean-room 的 host-row 反向边界**：`@deepseek-ai/dsh-*` peer 的「死 peer」不可判（行以 id
  引用），只有范围受到正面约束；将来若行开始点名包名，可收紧。
- **类型闭包夹具需在 build 后重生成**：`record-type-closure.mjs --check` 依赖 `lib/types`；
  fresh clone 只比对夹具与 `files`（keyless），盘上闭包一致性由 `pack.e2e` 在构建产物在位时判。
- **cold-start 不再覆盖浏览器面**：由 `client-load.entry` 承接；`release.entry --dev-home` 与
  `lifecycle.entry --global-dsh` 仍是对照模式（会失去干净室/版本保证，需显式选择）。
- 本轮未改运行期代码路径（除 `run-driver` 的 profile 守卫）；L1/L4 未重跑，真模型面未变化。
