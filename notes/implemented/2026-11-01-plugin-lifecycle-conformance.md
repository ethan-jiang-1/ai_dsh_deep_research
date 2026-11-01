# 插件生命周期合规：只写 DSH 读的东西，发布物带显示面与市场条目

> 状态：implemented

> 来源：[插件生命周期合规卡](../../_backlog/_archived/settled_issues/2026-11-01-plugin-lifecycle-conformance.md)、[合规矩阵](../../_backlog/_archived/research/plugin-lifecycle/2026-11-01-conformance-matrix.md)、[实验记录](../../_backlog/_archived/research/plugin-lifecycle/2026-11-01-experiments.md)、[合同摘录](../../_backlog/_archived/research/plugin-lifecycle/2026-11-01-dsh-lifecycle-contract.md)。
> 当前合同 = [pack README](../../packages/deep-research-pack/README.md)、[安装手册](../../_dist/安装手册.md)、[guides/64](../../docs/guides/64-release-versioning.md)。

## 决定

- **版本合同只有一个字段**：`engines.dsh`。删掉 `dsh.compatibility.dshReleases`（DSH 全仓无消费者，只被我们自己的导出脚本读）；门禁与测试改判 `engines.dsh` 覆盖当前 vendor tag，并新增 `pack-manifest` 拦任何 DSH 不读的 `dsh.*` 键。已测基线（rc.2/rc.3）留在测试里，不写进清单。
- **显示面按 DSH 的读法提供**：包根 `locale/{en,zh}.json` + `icon.svg`；三个子路径行（`/content` `/startup` `/fetch-fallback`）各自导出 `<subpath>/locale/*.json` 与 `<subpath>/icon`——子路径插件不读 `package.json`，只能在自己的 specifier 上导出。文案单一来源：Plugins 页与市场条目都从 locale 取，不在脚本里另写字面量。
- **发布物 = tarball + 手册 + 市场索引**：新增 `scripts/dist/market.mjs` 生成 `_dist/market.json`（format 1），产物先过 DSH 的 `parseMarketIndex` 再落盘；`export-dist` 一次导出三件。索引 `source` 只允许 npm——本仓 `lib/` 不入 git 且 devDeps 是 `workspace:*`，git 源装不出构建产物。`publishTimestamp` = 该包目录最后一次提交时间（秒），`SOURCE_DATE_EPOCH` 可覆盖；只用于展示排序，不参与安装判定。
- **docs 取向改回 DSH 的默认入口**：装包入口 = Plugins 页，CLI 标注"仅 `dsh web`"；产品 profile 的 CLI 引导作为前置步骤显式在场（DSH 没有 UI 建自定义 profile）；团队机制层写成"随 DSH 安装提供的可选 bundle，在 Plugins 页打开"，CLI 只给 exact 版本并警告 `@latest` 不是当前版本线。插件 README 加 `description`/`kind` 前置字段与七问首屏。
- **配置层补一个真开关**：`research-fetch-fallback` 的 `enabled` 标 `.volatile()`（每次调用现取，Settings 页可见、改后即时生效）；其余字段需要重建 provider 闭包，保持普通配置。工作区优先级补机械判据（env > 设置文件，且 env 来源不回写设置）。
- **保留 `dsh-deep-research-doctor` 的 bin**：它是只读诊断，安装后在 profile 的 `node_modules/.bin` 落一个命令——这是有意的、已在手册写明；不引入 launcher/scaffold。

## 输掉的方案

- **保留 `dsh.compatibility` 并在 README 里解释它是"兼容矩阵镜像"**：解释不能让它被读；多一个自造字段就多一处与 `engines.dsh` 打架的真相。删掉，基线搬进测试。
- **丢掉 `bin` 用 `node …/doctor.mjs`**：少一个副作用，但用户/排障脚本要记长路径；doctor 是只读入口，保留更实用，代价（`.bin` 一行）写进手册。
- **让市场条目指向 git+commit**：格式允许，但本包 git 树没有 `lib/`，装完无法构建；等于发布一个装不上的条目。
- **把 `parseMarketIndex` 放进 L0 门禁**：L0 是零依赖层（fixture 无 `node_modules`），import workspace 校验器会让门禁在副本里加载失败；改为 L0 判结构 + 与包清单一致，真校验归 `lifecycle-smoke`。
- **把工作区设置迁到 profile patch（`Config.volatile`）**：要迁移旧 `settings.json` + 处理多 profile 共享语义，收益不抵风险；保留自有 store，补优先级与迁移边界。
- **在 Host 侧自造显示标题**：DSH 的显示面只认 locale/icon 导出，自造等于再发明一套。

## 实际跑过的验证

- **显示面（T）**：探针 bundle 在 scratch profile 里调 DSH 的 `readPluginMeta`，四个 specifier 都拿到 `{en, zh}` 标题/描述与 `data:image/svg+xml` 图标，无 error。
- **市场（T）**：`parseMarketIndex` 通过；静态服务 + `pluginMarket.search` 返回条目（title/描述/图标/defaultVersion/`install.spec`/`compatibility.compatible: true`），`entry` 命中。
- **registry 端到端（T）**：本地 Verdaccio 上 `npm publish` 0.3.0 → `npm view` 读到 `engines.dsh` → 市场条目算出的 `dsh-deep-research-pack@0.3.0` 在全新 scratch home 安装成功、roster 三项。
- **L0 门禁**：`pack-manifest` / `market-index` / `readme-shape` 全绿；注入案例在 `gates-smoke` 点名红后还原绿（`pack-manifest-invented-key` / `market-index-version-drift` / `readme-shape-no-frontmatter` / `readme-shape-no-profile-bootstrap` / `readme-shape-profile-after-plugins`）。
- **文档合同测试**：`tests/run/run-driver-contract.test.mjs` 增加「产品行含 Plugins 页」断言；临时去掉 00-index 的 Plugins 页 → 红（`00-index 产品行没有把 Plugins 页写成装包入口`），还原 → 绿。
- **契约测试**：`config-volatile`（删 `.volatile()` 即红，红录已跑）、`startup` 优先级新增用例；`presets` 改为判 `dsh.*` 白名单与 `engines.dsh` 基线覆盖。
- **团队层开关（C）**：`setBundleEnabled` → `selectBundle` 只写 `dsh.profile.bundles`（启用追加、停用移除，保留顺序与已装依赖），`saveManifest` 原子写；CLI 没有等价开关命令。
- **L2**：`lifecycle-smoke` ALL PASS（索引校验、tarball 无 sourcemap、11 行 dump、真启动无降级、四行显示面、remove 后 roster 回落）。

## 残余风险

- **公网 npm 发布尚未发生**：机制已在本地 registry 证透，公开包名 `dsh-deep-research-pack` 仍为空位；发布需账号/2FA（命令与顺序 = [guides/64](../../docs/guides/64-release-versioning.md)）。发布前 `_dist/market.json` 指向的版本在公网不存在。
- **浏览器截图未取**：Plugins 页/发现页的视觉呈现按 `readPluginMeta` 与市场服务的返回值判读（T 到数据层，未到像素层）。
- **团队层的 npm `latest` 不是当前版本线**：文档已改；若用户绕过文档用 `@latest`，仍会装到旧 alpha。
