---
topic: plugin-lifecycle-experiments
intent: 在隔离 DSH home 上实跑打包/安装/启动/卸载/更新/registry/市场索引六面，留下可复现的命令与读数，作为生命周期对账的 T 级证据
---

# 插件生命周期隔离实验（2026-11-01，macOS，scratch DSH_HOME）

两套运行时并行使用，理由不同：

- **机制权威** = `vendor/dsh`（pin `687f282e86` / `0.2.1-rc.2`），经 `node --import tsx/esm vendor/dsh/apps/cli/src/bin.ts` 调用；
- **用户面** = 全局 `dsh` `0.2.1-rc.5`（npm 安装，PATH 上真实命令）。

全部实验使用 `DSH_HOME=$(mktemp -d)`，不碰 `runtime/harness-home` 与用户 `~/.dsh`。被测产物 = `_dist/dsh-deep-research-pack-0.3.0.tgz`（本仓导出件本体，未重打包）。

## 1. 安装：tarball 进全新 profile（T）

```sh
EXP=$(mktemp -d); export DSH_HOME=$EXP/home
node --import tsx/esm vendor/dsh/apps/cli/src/bin.ts --profile drt-prod \
  --from-default-profile web --dump-default-config        # ① 首次建 profile
node --import tsx/esm vendor/dsh/apps/cli/src/bin.ts plugin --profile drt-prod \
  add /Users/bowhead/ai_dsh_deep_research/_dist/dsh-deep-research-pack-0.3.0.tgz   # ② 装
```

读数：

- `--from-default-profile web` 初始化 `profiles/drt-prod/{package.json,cordis.patch.yml,cordis.yml,pnpm-workspace.yaml}`。
- `plugin add` exit 0；dependency 写成 `file:…/dsh-deep-research-pack-0.3.0.tgz`；
  `dsh.profile.bundles = ["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app","dsh-deep-research-pack"]`。
- 无 peer 警告（profile 的 `pnpm-workspace.yaml` = `nodeLinker: hoisted` + `autoInstallPeers: false`，
  见 `vendor/dsh/packages/boot/app-boot/src/profile.ts:258`）。

## 2. 组合：dump-config 的五个 patch 层与本包 11 行（T）

```sh
DSH_HOME=$EXP/home node --import tsx/esm vendor/dsh/apps/cli/src/bin.ts --profile drt-prod --dump-config
```

读数：exit 0、stderr 空（**没有** `patch: entry "…" not found`）。层注释显示五个 patch 文件全部并入：

```
# == @deepseek-ai/dsh-base, patched by dsh-deep-research-pack     ← session-query-sqlite / web / llm-deepseek
# == @deepseek-ai/dsh-web-app, patched by dsh-deep-research-pack  ← agent-preset-registry default: lead
# == dsh-deep-research-pack                                       ← insert 段：research-* / preset-*
```

插入行 11 条：`research-fetch-fallback`、`research-content`、`research-client`、`research-startup`、
`tool-present`、`ui-agent-team`、`preset-{lead,scout,analyst,critic,method-editor}`。说明 bundle patch 的 `insert:` 写法与多文件
`dsh.bundle.patch` 数组都被 DSH 正确消费。

## 3. 启动：真起 Web，无降级告警（T）

```sh
DSH_HOME=$EXP/home node --import tsx/esm vendor/dsh/apps/cli/src/bin.ts \
  --profile drt-prod --no-open --port 0    # 30s 后 kill
```

读数：唯一输出 `dsh web: http://127.0.0.1:51750/?token=…`；日志内**零** `did not activate` / `ERR_MODULE_NOT_FOUND` /
`warning`。即：即使**不装团队层**，本包的 Host 行（content / startup / fetch-fallback / client）也能
解析并挂载——`@deepseek-ai/dsh-*` 的运行时解析不依赖 profile 里再装一份 peer。

## 4. 卸载：roster 回退，数据按 DSH 语义留下（T）

```sh
… plugin --profile drt-prod remove dsh-deep-research-pack
```

读数：dependencies 清空；`dsh.profile.bundles` 回到 `[base, web-app]`；profile 目录保留。
`$DSH_HOME` 残留只有 DSH 自己的 `storages/workspace.json`、`.credentials.yaml`、`profiles/`——
**没有**本包的写入（本次启动未配置工作区，startup 行没有落地产品设置）。

## 5. 更新：over 安装换版本（T，全局 rc.5）

把工作树复制到 `/tmp/pack031`、只改 `version: 0.3.1`、`npm pack --ignore-scripts` 得 0.3.1 tarball，然后：

```sh
dsh plugin --profile drt2 add /tmp/pack031/dsh-deep-research-pack-0.3.1.tgz
```

读数：dependency 从 `file:…0.3.0.tgz` 换成 `file:…0.3.1.tgz`，node_modules 内版本 0.3.1，
roster 不变（仍是三项）。CLI **不打印**"需要重启"——因为 `dsh plugin` 是独立进程，重启是用户的动作；
手册必须自己写清（vendor：`plugin-manager/README.md` — without HMR, activation waits for restart）。

`dsh plugin --profile drt2 list` 只给 pnpm 依赖清单（一行 `dsh-deep-research-pack@0.3.1`），
**不展示 bundle 行/显示元数据**——管理面信息只在应用内 Plugins 页。

## 6. 显示元数据：`.bin` 副作用与卡片读数（T + C）

全局 rc.5 安装后，profile 内出现可执行文件：

```
$DSH_HOME/profiles/drt2/node_modules/.bin/dsh-deep-research-doctor
```

即 `package.json` 的 `bin` 会在**用户 profile 里**落一个命令。DSH 自己的约定是 `bin` 仅用于
CLI 应用包（`vendor/dsh/docs/cookbook/adding-a-package.md` §1）。

显示文本规则（C，源码判读 `vendor/dsh/packages/boot/app-boot/src/package-meta.ts:175`）：

| 行的 specifier | 标题来源 | 描述来源 | 图标来源 |
|---|---|---|---|
| `dsh-deep-research-pack`（包根） | `<pkg>/locale/en.json` → 缺则 `package.json.name` | 同上 → 缺则 `package.json.description` | 清单 `icon` 或 `<pkg>/icon` |
| `dsh-deep-research-pack/content`（子路径） | `<specifier>/locale/en.json` → 缺则**完整 specifier** | 无从回退（子路径不读 package.json） | 仅 `<specifier>/icon` |

我们两者都没有：包根显示 `dsh-deep-research-pack` + 一段约 380 字符的英文 description；
三个子路径行显示 `dsh-deep-research-pack/content|startup|fetch-fallback`，无描述无图标。
本机无 Playwright/浏览器实测，故此项记为 C，不作为 T。

## 7. registry 路径：今天装不上（T）

```sh
dsh plugin --profile t404 add dsh-deep-research-pack@0.3.0
npm view dsh-deep-research-pack version     # E404
```

读数：

```
× adding a new package
╰─▶ Failed to fetch metadata from https://registry.npmjs.org/dsh-deep-research-pack:
    HTTP status client error (404 Not Found)
dsh: plugin command failed; diagnostics: …/profiles/t404/.plugin-manager/logs/operation-sikGyA/pnpm.log
```

**本包从未发布到 npm。** 而 `_dist/安装手册.md` §二 的第一条命令就是 registry spec，包 README 同一句
——两份文档的头号安装路径今天必然失败。离线 tarball 那条（写在注释里）是唯一可用路径。

顺带对账团队层：

```
npm view @deepseek-ai/dsh-experimental-agent-team-profile versions dist-tags
  latest = 0.1.5-alpha.2      ← 不是 rc 线
  next   = 0.2.1-rc.5
```

全局 dsh 安装**自带**该包（`node_modules/@deepseek-ai/dsh-experimental-agent-team-profile`），其 README 写明
"本包随 dsh 安装提供，默认关闭，可在插件页开启或添加到已初始化的 profile"，且它在
`OPTIONAL_BUNDLES` 名单里（`vendor/dsh/packages/boot/app-boot/src/profile.ts:225`）。结论：
团队层是**随安装提供的可选 bundle**，原生开启方式是 Plugins 页开关；手册里 `@<与 dsh --version 同版本>`
的 exact 版本可解析，但 `@latest` 会落到 0.1.5-alpha.2——占位符写法有踩雷面。

## 8. 市场索引：格式可用，我们没发（T）

用 vendor 的 `@deepseek-ai/dsh-plugin-market-index` 校验器（`packages/util/plugin-market-index/lib/index.js`）
校验一份最小条目（我们的包名/版本/engines/npm 源/localized 标题）：

```
VALID: plugins= 1 version= 0.3.0
marketInstallTarget → {"spec":"dsh-deep-research-pack@0.3.0"}
```

格式 1 的硬要求（`vendor/dsh/.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.zh.md`）：
`name` / `versions[].version` / `publishTimestamp` / `source`（npm 或 git+commit）/ `engines.dsh`；
标题、描述、图标、作者、仓库、分类都是可选展示位。

git 源对我们是死路：`packages/deep-research-pack/lib/` 被 `.gitignore:80` 忽略，且 devDependencies 是
`workspace:*`，`package.json` 只有 `prepack`（无 `prepare`）——git 安装拿不到构建产物，也无法在
用户机器上重建。所以市场条目只能指向 npm 的 `name@version`。

## 9. tarball 卫生（T）

131 条目；组成 = `presets/*.patch.yml` 5 份 + 13 个 `SKILL.md` + `content/manual.md` + 8 个 run 模板 +
`lib/*.js` 6 个 + `lib/types/**/*.d.ts` 78 份 + `lib/*.js.map` 7 份 + `README/LICENSE/package.json/scripts`。

- `.d.ts` 符合 DSH 自家包约定（`files` 含 `lib/types/**/*.d.ts`）；
- `.js.map` **不符合**：DSH cookbook 明写 "Do not publish src, declaration maps, JS maps"；
- `bin` 见 §6。

## 复现要点

- 所有命令都显式给 `DSH_HOME`；不要把 `dev/env.sh` 的 home 混进来。
- `dsh plugin` 需要 PATH 上有 pnpm（本机 v12.5.1）。
- registry 检查用的是有网络的 npm；离线环境这一节不可复现，结论以日志为准。
- 实验脚本未入库（一次性）；可复现的是上面的命令序列，不是脚本。

## 10. 显示元数据：运行期真读（T，2026-11-01 补充）

做法：写一个临时探针 bundle（`@tmp/meta-probe`，只读不写），装进 scratch profile，在 `apply` 里
用 DSH 自己的 `readPluginMeta` 读本包四个 specifier 的显示面，结果落 `/tmp/meta-probe/out.json`：

| specifier | 标题（zh） | 描述（zh） | 图标 |
|---|---|---|---|
| `dsh-deep-research-pack` | 深度研究 | 四个研究角色 + 研究驾驶舱… | data:image/svg+xml, 777B |
| `…/content` | 研究手册 | 方法论说明与 run 模板… | 同 |
| `…/startup` | 研究启动 | 产品 profile 启动时登记… | 同 |
| `…/fetch-fallback` | 抓取回退 | 先本地抓取页面… | 同 |

四条都同时带 `en` 与 `zh`；无 error 字段。即：加 `locale/` + `icon.svg` 后，Plugins 页与市场看到的
就是这四组文案——不再是包名与裸 specifier。

## 11. 市场发现面：DSH 的市场服务真读到条目（T）

做法：`_dist/` 用 `python3 -m http.server 8099` 起静态服务；scratch profile 的 `plugin-market` 行
配置 `indexes: [http://127.0.0.1:8099/market.json]`；探针 bundle `inject: ['pluginMarket']` 调
`search` 与 `entry`。读数：

```
search: total = 1
  entries[0] = { name: dsh-deep-research-pack, title: {en: Deep Research, zh: 深度研究},
                 description: {en: …, zh: …}, icon: data:image/svg+xml;base64,…,
                 defaultVersion: 0.3.0,
                 versions[0]: { install: {spec: "dsh-deep-research-pack@0.3.0"},
                                compatibility: {compatible: true} } }
entry("dsh-deep-research-pack") → 同名条目
```

说明：索引格式、读取、本地化、安装 spec、兼容性判定全部由 DSH 自己的代码给出，我们只提供静态 JSON。

## 12. registry 端到端（T）：本地 npm registry 上发布 → 装

DSH 的 market 安装走 `name@version`，所以"没上 npm"是硬阻断。用本地 Verdaccio（127.0.0.1:4873，
匿名可读、测试账号可发）验证机制而非公网发布：

```sh
npm publish ./_dist/dsh-deep-research-pack-0.3.0.tgz --registry http://127.0.0.1:4873
# + dsh-deep-research-pack@0.3.0
npm view dsh-deep-research-pack version engines.dsh --registry http://127.0.0.1:4873
# version = '0.3.0'；engines.dsh = '>=0.2.1-rc.2 <0.3.0-0'
```

然后把市场条目算出的 spec 原样交给 DSH 安装（全新 scratch home）：

```
dsh plugin --profile reg add dsh-deep-research-pack@0.3.0   # .npmrc 指向本地 registry
→ + dsh-deep-research-pack 0.3.0
→ dsh.profile.bundles = [base, web-app, dsh-deep-research-pack]
```

结论：**发布物、市场条目、安装 spec 三者已经在协议层对齐**；剩下的一步是"发到公网 npm"，
需要用户账号/2FA，属人工动作（命令与顺序 = `guides/64`）。
