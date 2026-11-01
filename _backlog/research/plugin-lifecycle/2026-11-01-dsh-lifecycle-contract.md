---
topic: plugin-lifecycle-conformance
intent: 从本仓 vendor/dsh 逐条取出插件生命周期合同（打包/发布/安装/初始化/配置/启动/更新/卸载/文档/市场），每条带可核对的文件与位置，作为对账与门禁的本地判据
---

# DSH 插件生命周期合同（本仓 vendor 摘录）

**本页所有断言都能在本仓内核实**：出处是 `vendor/dsh`（pin `687f282e86` / `0.2.1-rc.2`，只读铁律）
与 `packages/deep-research-pack/` 自身。没有仓外依赖，也不转述仓外材料。

判据 → 对账：逐段核验见 [合规矩阵](2026-11-01-conformance-matrix.md)；实跑读数见
[实验记录](2026-11-01-experiments.md)。

## 1 · 打包：一个包 + 一层 patch

| 合同 | 出处（本仓） |
|---|---|
| `dsh.bundle.patch` 是字符串或路径列表；其他形状报错 | `vendor/dsh/packages/boot/app-boot/src/profile.ts:54-61` |
| 没有 `dsh.bundle.patch` 的包只是普通依赖，安装时 stderr 警告、不进 roster | `vendor/dsh/packages/boot/plugin-manager/src/operations.ts:101-102` |
| 发布物不该带 src、JS maps、declaration maps；`bin` 属 CLI 应用包 | `vendor/dsh/docs/cookbook/adding-a-package.md` §1 |
| 显示元数据：locale 目录、`icon` 字段或 `./icon` 导出、子路径插件只认自己的导出面 | `vendor/dsh/docs/cookbook/adding-a-package.md` §5 |
| DSH 自家可选 bundle 的准入三条 = `dsh.bundle.patch` + `icon` + `./locale/*.json` | `vendor/dsh/packages/boot/app-boot/src/profile.ts:215-222` 注释 |

## 2 · 版本与准入：只认 `engines.dsh`（或 DSH peers）

| 合同 | 出处 |
|---|---|
| 有 `engines.dsh` 时它**独自**决定兼容性，`peerDependencies` 被完全忽略 | `vendor/dsh/packages/boot/app-boot/src/plugin-compatibility.ts:55-64` |
| 没有 `engines.dsh` 时才逐个检查 `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*` peer | 同上 `:65-79` |
| 安装前拒绝并说明"什么都没装"；不匹配可用 exact package + exact runtime 的 exemption 显式接受风险 | `vendor/dsh/packages/boot/plugin-manager/README.md#version-compatibility-and-exemptions`；`vendor/dsh/apps/cli/README.md:39` |
| exemption 记在 profile 的 `compatibility.json`，不继承、不覆盖其他版本 | 同上 |

推论（对本仓）：`package.json` 里任何非 `engines`/非 DSH 约定的版本字段都不会被读。

## 3 · 发布形态：registry / tarball / git

| 合同 | 出处 |
|---|---|
| CLI 的包操作是把参数转发给 profile 目录里的 pnpm（`add`/`remove`/`update`…），**因此没有命令级回滚** | `vendor/dsh/apps/cli/README.md:18`；`vendor/dsh/packages/boot/plugin-manager/README.md` |
| 本地 path / tarball / git 都被 pnpm 规范接受，bundle 校验在安装后做 | `vendor/dsh/packages/boot/plugin-manager/README.md`（version compatibility 段） |
| git 源要先跑构建（`prepare`），pnpm ≥10 需允许 build scripts | 同页 + `vendor/dsh/packages/boot/plugin-manager/README.md`（pendingBuilds） |
| 安装写 profile 的 `package.json` 依赖与 `dsh.profile.bundles` 两项；失败会恢复 manifest 与 lockfile | 同页（failure behavior） |

## 4 · 安装入口

| 合同 | 出处 |
|---|---|
| 应用内 Plugins 页管理**当前 profile**：开关 bundle、开关单行、安装/移除外部 bundle | `vendor/dsh/packages/boot/plugin-manager/README.md`（Use this package） |
| `dsh plugin --profile <name> …` 是 CLI 面，向 profile 转发 pnpm；`desktop` 名字被 Electron 独占，CLI 拒绝管理 | `vendor/dsh/apps/cli/README.md:18-20` |
| shipped profile（web/headless/sdk/sdk-minimal/acp）首用自动初始化；自定义名要么 `--from-default-profile`，要么由 `dsh plugin` 初始化成 base-backed | `vendor/dsh/apps/cli/README.md:20` |
| 组合顺序：各 bundle patch（按 roster 顺序）→ profile patch → home patch → `--patch` | `vendor/dsh/apps/cli/README.md:41-45` |
| bundle 先从 dsh 安装解析，再从 profile `node_modules` 解析 | `vendor/dsh/apps/cli/README.md:46` |

## 5 · 初始化与"首启"

| 合同 | 出处 |
|---|---|
| `initProfile` 只补齐缺失文件，**既有文件一律不动** | `vendor/dsh/packages/boot/app-boot/src/profile.ts:255-262`（注释 "Existing files are never touched"） |
| profile 的 pnpm 设置固定为 `nodeLinker: hoisted` + `autoInstallPeers: false`：让 out-of-tree 插件缺失的 peer 走运行时解析，并与安装共享同一个 cordis 实例 | `vendor/dsh/packages/boot/app-boot/src/profile.ts:248-259` |
| 没有插件级迁移钩子；一次性动作由产品自己幂等（vendor 侧只有 profile 初始化与 `compatibility.json`） | 全仓 `app-boot` 无迁移入口（`grep -r "migrat" vendor/dsh/packages/boot`） |

## 6 · 配置层

| 合同 | 出处 |
|---|---|
| patch 对目标 row 的 `config` 是**整份替换**，不深合并 | `vendor/dsh/packages/boot/app-boot/README.md`（profiles 段）；实测见实验 §2 |
| 新增行必须 `insert:`，裸 `- id` 是 override target；目标缺失只报 `entry "…" not found` | `vendor/dsh/packages/boot/app-boot/src/profile.ts`（patch 组合）+ 实验 §2 |
| 设置表单只展示 active profile 中唯一寻址 entry 的 `.volatile()` 字段，并写回该 profile 的 patch | `vendor/dsh/packages/settings/README.md:12` |
| 只有保留 `!!js` 表达式的 row 才让 app 参数压过 config | `vendor/dsh/packages/boot/cmdline/README.md:58-66,134`；实测见实验 §2 |

## 7 · 启动面

| 合同 | 出处 |
|---|---|
| 受支持启动只有 `dsh <name>` / `dsh --profile <name>`；`web`/`headless`/`sdk`/`sdk-minimal`/`acp` 是 shipped profile | `vendor/dsh/apps/cli/README.md:20-24` |
| launcher 只解析自己的 flag，遇到不认识的首个 token 就把其后全部交给 app | `vendor/dsh/apps/cli/README.md:24-32` |
| web 的 app args 归 shipped `web-startup`；产品要加 flag 必须替换该 provider 并自行实现全部 web flags | `vendor/dsh/packages/boot/app-boot/README.md`（web-startup 段） |
| required 条目失败 → 拒绝启动并写诊断；optional 失败 → 警告继续；bundle 加载失败 → skip 并报告 | `vendor/dsh/packages/boot/app-boot/README.zh.md:96`、`README.md:113` |
| bundle membership 变化在有 HMR 时也会经历重组，但**没有事务性回滚** | `vendor/dsh/packages/boot/app-boot/README.md:113` |

## 8 · 更新 / 卸载

| 合同 | 出处 |
|---|---|
| 更新 = 移除再安装（pnpm 语义）；`update-available` 只是状态展示，不是升级动作 | `vendor/dsh/packages/boot/plugin-manager/README.md`（discover 段） |
| 运行中的 profile 换 bundle 需要重启；无 HMR 时安装新包只发布解析、激活等重启 | 同页（Understand the implementation） |
| 移除只回收依赖与 roster 项；用户数据、Session、Workspace 不归它管 | 同页（removal） |

## 9 · 文档与宿主读取面

| 合同 | 出处 |
|---|---|
| `listBundles` 携带 bundle 与其行的显示 `meta`；`description` = 包的 `package.json.description`；元数据诊断不阻塞管理 | `vendor/dsh/packages/boot/plugin-manager/README.md` |
| 显示文本解析：包根读 `<pkg>/locale/en.json` → `package.json.name`/`description`；子路径**不读** `package.json`；图标来自清单 `icon` 或 `<specifier>/icon` | `vendor/dsh/packages/boot/app-boot/src/package-meta.ts:175-200` |
| 图标限制：SVG/PNG/JPEG/WebP，≤256 KiB，必须在包内 | 同上 `:30-70` |
| 包 README 的形（`description`/`kind` 前置字段与固定小节）由文档生成器消费 | `vendor/dsh/docs/cookbook/adding-a-package.md` §4 |

## 10 · 市场（发现）

| 合同 | 出处 |
|---|---|
| 市场索引是静态 JSON，format 1；校验器 = `@deepseek-ai/dsh-plugin-market-index` 的 `parseMarketIndex` | `vendor/dsh/packages/util/plugin-market-index/README.md` |
| 必填：`name`、`versions[].version`、`publishTimestamp`、`source`（npm 或 git+commit）、`engines.dsh`；标题/描述/图标/作者/仓库/分类为可选展示位 | `vendor/dsh/.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.zh.md` |
| 安装参数由 `marketInstallTarget` 生成（npm → `name@version`；git → 带 commit 的 `git+https`） | `vendor/dsh/packages/util/plugin-market-index/README.md` |
| 发现页/`plugin_market` 工具是实验性可选 bundle，索引 URL 属用户数据 | `vendor/dsh/.agents/notes/implemented/feature/2026-10-02-plugin-market-discover.zh.md` |
| 版本兼容性由 profile 的豁免与 `engines.dsh` 计算，随条目返回 | `vendor/dsh/packages/boot/plugin-market/src/index.ts:324` |

## 本仓据此可判定的红线（供门禁使用）

1. 包必须有 `engines.dsh`；除 DSH 约定字段外不新增 `dsh.*` 键。
2. `files` 不含 `src/`、`*.js.map`、declaration map；`bin` 只允许有意的只读工具并文档化。
3. 要让 Plugins 页/市场显示中文标题与图标，必须导出 locale 与 icon；子路径行各自导出。
4. 安装叙事以 Plugins 页为首选；CLI 明示面绑定。
5. 更新只有"卸载再安装"；文档不得承诺命令级回滚。
6. 市场条目只能指向 registry 或 git+commit；本仓 `lib/` 不在 git 里，故只能走 registry。
