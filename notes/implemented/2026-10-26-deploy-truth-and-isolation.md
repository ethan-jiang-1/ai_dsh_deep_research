# 部署真伪与工作区隔离：install anchor、seed 判据、scaffold 守卫

> 状态：implemented

> 来源：用户 2026-10-26「围绕插件打包/分发/安装/数据隔离，覆盖各种 DSH 环境做探索性测试并固化测试资产」。本 Note 记录本轮由探索证实的决定；部分取代 [部署工程](2026-09-26-deployment-engineering.md) 的 preflight peer 解析与 scaffold 边界。

## 决定

- **运行时 peer 的解析锚 = DSH 安装本体，不是 profile。** `preflight` 只检查 bundle/preset 的 `name:` 行依赖，从 `--install-anchor` / `$DSH_INSTALL_ANCHOR` / PATH 上的 `dsh` 反推 `@deepseek-ai/dsh/package.json`；`peerDependencies` 里的 client 侧共享模块与构建期依赖不做 Node 解析。原因是 profile 的 pnpm 配置为 `autoInstallPeers: false`，真实 home 上 peer 本来就不在 profile 里；从 profile 向上 `createRequire` 既会在真 home 误报 17 个缺件，也会在仓库内被仓库 `node_modules` 假绿。
- **工作区就绪看种子判据，不看“文件在场”。** 关键种子（AGENTS/NODES/模板）的 `missing/deleted/untracked/special/unreadable` 阻断；`modified/stale/orphan/sidecar/版本漂移` 只警告；方法库缺席显式列出。首装发现工作区已有别人的关键种子时 `scaffold` 直接 exit 1，`--force` 才覆盖，`--upgrade` 只生成 sidecar；合并/确认后用 `--adopt` 显式接受当前工作区，state 记 `adopted` + 当前哈希，之后 `--check` 只报 modified、`--upgrade` 仍只写 sidecar。状态文件只记录真正落地/已 current/已 adopt 的种子，不把 untracked 冒充 baseline。
- **工作区根与种子目标有硬边界。** 写模式拒绝 workspace = `$HOME` / `$DSH_HOME` / pack / profile，或它们的祖先/内部（`$DSH_HOME` 在 workspace 内只警告）；种子父目录经 symlink 指向工作区外时 exit 2，且预检所有会写的目标后才落盘（不半写）。`--force` 不绕过这些边界。
- **scaffold 参数严格化。** 未知 flag、缺值、值被下一个 flag 吞掉、非法 profile 名、`--check` 与 `--upgrade/--force` 冲突、`--host` 与 `--profile` 默认目录不一致都 exit 2；`--help` 打印用法。旧实现 `--chek` 静默按默认写盘、`--workspace --force` 会创建 `./--force` 目录。
- **团队层幂等，不静默改用户 pin。** 已在场且版本与安装锚一致时跳过 `dsh plugin add`，保留 `link:`/`file:` 来源；版本不一致默认只报告，`--refresh-team` 才更新。这样离线/受限 registry 重跑不会因重复解析失败，也不会把本地 link 改写成 registry 依赖。
- **DSH_HOME / 凭据 / sidecar / 版本边界的单源。** `scaffold` 与 `preflight` 用与 DSH 相同的 `~`、全空白规则解析 `DSH_HOME`；凭据按存储文件 `refs` 非空 > 环境变量 > 项目/工作区 `.env` > home `.env` 检查，空文件不再算已配置；已有 `.seed-new` 不覆盖，新种子写带版本副本；`engines.dsh` 改为 `<0.3.0-0` 显式排除 0.3 预发布；client 运行时 require 的 `dsh-client-ui-primitives` 补进 `dsh.client.inject`。
- **证据资产化。** 新增 `preflight-smoke`（fake anchor + 仓库外 home）、`real-home-smoke`（全局 dsh + 仓库外 home + 真 web boot graph）、scaffold 参数/守卫/sidecar 段、workspace-audit/workspace-guard/install-anchor/dsh-home/credentials-status/deploy-args 单测；CI 增 `deploy` keyless job（scaffold/preflight/pack smokes）。

## 输掉的方案

- **继续从 profile `createRequire` 解析 peer，或把 peer 装进 profile。** profile 的 `autoInstallPeers: false` 是 DSH 的安装语义；把 peer 装进 profile 会让运行解析与安装解析分叉，且真实 home 仍会误报。改用安装锚是唯一与宿主一致的判据。
- **工作区已有 AGENTS 只警告、继续绿色。** 角色会把别的项目的 AGENTS 当研究纪律；这是静默错误，比多一步显式确认危险。改为首装硬失败。
- **workspace = HOME/DSH_HOME 只警告。** DSH 会把 `$DSH_HOME/AGENTS.md` 当 user-global 指令注入所有会话；`~/AGENTS.md` 会被工作区发现链当上级指令。警告不足以阻止污染。
- **重复 `--upgrade` 覆盖 `.seed-new`。** 用户的合并工作会丢；改为保留原 sidecar + 写带版本副本。
- **用 profile app-boot / 兼容矩阵首项派生团队层版本。** 真用户 home 解析不到 app-boot，会退回 PATH CLI 或矩阵；与运行中的安装可能不一致。安装锚优先。
- **保留 `<0.3.0`。** vendor 的 semver 检查用 `includePrerelease: true`，`0.3.0-rc.1` 会被放行，与文档“0.2.x 范围”不符；`-0` 是显式边界。
- **把所有 `peerDependencies` 都当 Node 包检查。** 全局 rc.3 安装本体没有 `dsh-client-ui-primitives`，但 web shell 内置它、页面能正常加载；全量 require 会误报。

## 实际跑过的验证

- `pnpm verify`：47 个结构门禁全绿（含 `pack-workspace-fresh`、`dist-manual-version`、`port-exclusive`）。
- `pnpm test`：841 个 keyless 用例全绿；新增/扩展 `dsh-home`、`install-anchor`、`pack-rows`、`workspace-audit`、`workspace-guard`、`credentials-status`、`deploy-args`、`seed-core.nextSeedState`、`package-contract` client inject、`host-compat`/`version-range` 0.3 预发布。
- `scaffold-smoke`：ALL PASS（未知 flag/缺值/吞 flag、HOME/DSH_HOME 根守卫、父 symlink 越界、`--host` 不一致、sidecar 保护、state 诚实化、既有用户数据首装拒绝、`--adopt` 接受自定义手册后 `--upgrade` 不覆盖）。
- `preflight-smoke`：ALL PASS（fake anchor 齐全绿 / 缺行依赖红 / 无锚未验证 / base-only profile 红 / untracked AGENTS 红 / 不可读 AGENTS 不抛栈 / 空凭据红 / workspace `.env` 绿）。
- `real-home-smoke`：ALL PASS（仓库外 home + 全局 dsh rc.3 + tarball：init → install → scaffold/preflight 绿 → 真 web 页面 200 → boot graph 含本包；团队层 `link:` 未被改写、重跑幂等）。此前手工同形状现场：真 home 上旧 preflight 报 17 个 peer 缺件，而页面可正常加载——本 Note 的修复即把该假红消除。
- `engines.dsh`：`host-compat` 用 vendor 真实决策函数断言 `0.2.1-rc.2/rc.3/0.2.1` 放行，`0.2.0-rc.2/0.3.0/0.3.0-rc.1/0.3.0-beta.1` 拒绝。

## 残余与重议

- CI 的 `deploy` job 已加入 workflow，但本机不能执行 GitHub Actions；Linux 上的安装形状仍以 CI 首跑为准。
- Windows / DSH Desktop / 真实 npm registry / 活升级与卸载 / 共享 home 仍无证据；属未覆盖环境。
- `export-dist` 改为显式 `pnpm build` + `npm pack --ignore-scripts`，不再把构建押在 `prepack` 的脚本开关上；`prepack` 仍保留给 npm publish/release-smoke 的同一条 pack 路径。
