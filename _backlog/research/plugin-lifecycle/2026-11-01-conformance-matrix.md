---
topic: plugin-lifecycle-conformance
intent: 把 DSH 插件生命周期的十段逐段对到我们的包与交付件上（判据全部取自本仓 vendor/dsh），标出合规/偏差/缺失与证据等级，供决策卡派生方案
---

# 十段生命周期对账：`dsh-deep-research-pack` vs DSH 合同

判据来源 = [DSH 插件生命周期合同（本仓 vendor 摘录）](2026-11-01-dsh-lifecycle-contract.md)；
机制核对 = `vendor/dsh`（pin `687f282e86` / `0.2.1-rc.2`），另用全局 `dsh` `0.2.1-rc.5` 做用户面验证。
证据等级：**C** = 源码/文档判读，**T** = 隔离 home 实跑（见 [实验记录](2026-11-01-experiments.md)）。

## 总览

| # | 阶段 | 结论 | 证据 | 缺口编号 |
|---|---|---|---|---|
| 1 | 打包 | 基本合规，两处偏差 + 一处自造字段 | C/T | G1 G2 G3 |
| 2 | 发布 | **未执行**：从未上 npm | T | G4 |
| 3 | 安装 | tarball 路径通；文档头号路径 404；入口叙事与 DSH 安装入口约定相反 | T/C | G5 G6 |
| 4 | 初始化（profile） | 合规：只用 shipped 模板，无自建首启标记 | C/T | — |
| 5 | 特殊初始化（一次性/迁移） | 产品自有一份设置文件，迁移策略未写 | C | G7 |
| 6 | 配置 | bundle patch 用法正确；仅一处 `Config` 且无 `.volatile()`，设置页无项可配 | C | G8 |
| 7 | 启动 | 合规：自有 named profile，无 launcher，不抢 `web-startup` | T/C | G9 |
| 8 | 更新 | 机制通（over 安装换版本）；重启纪律写在手册 | T | — |
| 9 | 卸载 | 合规：只回收包与 patch 层，数据留下并已文档化 | T | — |
| 10 | 文档 | 手册十段齐；插件 README 不合 DSH 形；无显示元数据 | C/T | G10 G11 G12 |
| ★ | 市场/发现 | 格式可用，我们没有索引与本地化条目 | T/C | G13 |

一句话：**安装面是通的，发布面是空的，显示面是裸的，文档面是作者视角的。**
`_dist/` 之所以"看着还差不少"，因为它是三件事的投影：包清单（打包合同）、npm 上的存在（发布）、
市场/Plugins 页读到的东西（显示元数据）；后两件今天都不存在。

## 1 · 打包

**DSH 合同**（C）：只有 `dsh.bundle.patch`（一个文件或有序列表）让包成为可安装并自动启用的 bundle
（`vendor/dsh/packages/boot/app-boot/src/profile.ts:59`）；兼容性只看 `engines.dsh`（有它时
`peerDependencies` 被完全忽略——`plugin-compatibility.ts:59`）；`files` 不发布 src / JS maps /
declaration maps（`docs/cookbook/adding-a-package.md` §1）；`bin` 只给 CLI 应用包。

**我们的现状**

| 项 | 状态 |
|---|---|
| `dsh.bundle.patch` 六文件有序数组 | ✅ T：五个 patch 层全部并入，无 `entry not found` |
| `engines.dsh: ">=0.2.1-rc.2 <0.3.0-0"` | ✅ T：rc.2 与 rc.5 都接受 |
| `dsh.compatibility.dshReleases` | ❌ **自造字段**：全 vendor 无消费者（grep 证据），只被我们自己的 `export-dist.mjs` 当兜底 |
| `files` 含 `lib/*.js.map` 7 份 | ⚠️ 违反 DSH cookbook 的"不发布 JS maps" |
| `bin.dsh-deep-research-doctor` | ⚠️ T：安装后在用户 profile 落 `node_modules/.bin/dsh-deep-research-doctor` |
| `peerDependencies` 30 条 + 全 optional | ⚠️ 有 `engines.dsh` 时**运行时完全不看**；只在 pnpm 层产生噪声/文档价值 |
| tarball 内容完整性 | ✅ 5 preset + 13 SKILL.md + 手册 + 8 模板 + lib + README/LICENSE |

**缺口**：G1 自造 `dsh.compatibility`；G2 JS maps 进包；G3 `bin` 的 profile 副作用未声明。

## 2 · 发布

**DSH 合同**（C）：三种产物形态 = registry / tarball / git；准入看 `engines.dsh` 或 DSH peers；
git 源安装会跑 `prepare`，pnpm ≥10 默认阻止直到允许（`vendor/dsh/apps/cli/reference/README.md:105`）。
**没有 npm 包 = 没有可被安装的身份。**

**我们的现状**（T）

- `npm view dsh-deep-research-pack version` → **E404**；`dsh plugin add dsh-deep-research-pack@0.3.0`
  → `ERR_PNPM_RESOLVING_NPM_RESOLVER_NETWORK_ERROR`（404）。
- `guides/64-release-versioning.md` §8 已写 `npm publish` 步骤——**流程存在但从未执行**。
- git 形态对我们不可行（T/C）：`lib/` 被 ignore、devDeps 是 `workspace:*`、只有 `prepack` 没有
  `prepare` → git 安装拿不到构建产物。
- `_dist/` 只有 tarball + 手册；没有校验和清单、没有 release notes、没有市场索引。

**缺口**：G4 从未发布 → 所有 registry 文档路径失效。

## 3 · 安装

**DSH 合同**（C）：**默认入口 = 应用内 Plugins 页**（`packages/boot/plugin-manager/README.md:31`；CLI
`dsh plugin --profile` 面绑定、面向 GUI 时只作 web 自动化；自定义 profile 名首次只初始化 base，
Web 产品必须先 `--from-default-profile web`；"装成功"三态 = pnpm 成功 / dependency 写入 /
`dsh.profile.bundles` 含本包。

**我们的现状**

- ✅ T：`--from-default-profile web` → `plugin add <tgz>` → roster 三项、本包贡献 11 行、真启动无告警。
- ⚠️ `_dist/安装手册.md` §二 与包 README 的**头号命令是 CLI registry spec**，Plugins 页只在
  §二 的更新条目里被顺带提到——与 DSH 的安装入口约定相反（`apps/cli/README.md:18-20`）；Desktop 用户
  会照着手册敲 CLI，装进 `profiles/deep-research` 而不是他们实际在用的面。
- ⚠️ 团队层：手册要求 `dsh plugin add @deepseek-ai/dsh-experimental-agent-team-profile@<与 dsh
  --version 同版本>`。该包**随 dsh 安装提供**且在 `OPTIONAL_BUNDLES` 里（C：
  `profile.ts:225`；T：全局安装内可见其目录与 README），原生开启方式是 Plugins 页开关；
  npm 的 `latest` 是 `0.1.5-alpha.2`，`next` 才是 `0.2.1-rc.5`——占位符写法有踩雷面。
- ✅ 正确的 `insert:` 用法（T：插入行全部出现，无 `entry not found`）。

**缺口**：G5 文档入口叙事与 DSH 相反；G6 团队层的原生开启方式未写。

## 4 · 初始化（profile）

**DSH 合同**（C）：`initProfile` 已存在文件一律不覆盖（`profile.ts:280`）；profile 首建由
`--from-default-profile`/`dsh plugin` 负责（`vendor/dsh/apps/cli/README.md:20`）。推论：既然初始化是幂等的
且不覆盖既有文件（`profile.ts:255-262`），插件再自建一套"首启"标记就会有两套状态——本包不建。

**我们的现状**：✅ 完全走 shipped 模板（T：四个 profile 文件由 DSH 生成）；无 seed、无 scaffold、
不覆盖（D40 的"内容与产物分家"已落地）。产品启动行的"首次"是**读设置**，不是写标记。

**缺口**：无。

## 5 · 特殊初始化（一次性动作与迁移）

**DSH 合同**（C）：`vendor/dsh/packages/boot/app-boot` 里没有插件级迁移入口（只有 profile 初始化与
profile 的 `compatibility.json`）；因此一次性动作只能由产品自己保证幂等。

**我们的现状**：⚠️ 产品自有一份 `$DSH_HOME/deep-research/settings.json`（工作区/上次会话），由首屏
onboarding 写入；手册 §五 已列出归属与卸载行为，但**没有版本号、没有迁移策略、没有并发写说明**。
DSH 的边界是：设置表单只写 active profile 的 patch（`vendor/dsh/packages/settings/README.md:12`），
产品另建 store 就得自己交代迁移与真值——我们选了后者，但只写了一半。

**缺口**：G7 自有设置 store 缺迁移/版本/幂等合同。

## 6 · 配置

**DSH 合同**（C）：`Config` schema + 五层 patch；patch 对 `config` 是**整份替换**；只有
`.volatile()` 字段才进设置表单（`vendor/dsh/packages/settings/README.md:12`、
`vendor/dsh/packages/boot/cmdline/README.md:134`）。

**我们的现状**

- ✅ bundle patch 的整份替换纪律执行正确（`web` 行同时重述 search/fetch 两字段；
  `llm-deepseek` 行重述完整 retryPolicy），注释里写明了理由。
- ⚠️ 只有 `research-fetch-fallback` 有 `Config` schema（`enabled` / `apiKeyEnv` / `baseURL` / `localTimeoutMs` / `totalBudgetMs` /
  `fallbackOnStatus`，`src/fetch-fallback/index.ts:42-68`），且**没有 `.volatile()` 字段**；`research-startup` / `research-content`
  无 `Config`。结果是 Settings 页里本包**没有可编辑项**：工作区、回退开关、超时都只能改文件或用 env。
- ⚠️ 工作区选择存在自有 settings 文件 + 浏览器 localStorage 提示键 + `DEEP_RESEARCH_WORKSPACE`
  env 三个入口，优先级只有散文描述（手册 §三/§五），没有机械判据。

**缺口**：G8 无 `.volatile()` → 设置页空；G8b 三入口优先级未机械化。

## 7 · 启动

**DSH 合同**（C）：唯一受支持启动 = named profile；不新增 launcher；产品 flag 只能靠替换
`web-startup`（代价是重实现全部 web flags，`packages/boot/app-boot/README.md`、`packages/boot/cmdline/README.md`）。

**我们的现状**：✅ 自有 `deep-research` profile；✅ 无 launcher/scaffold bin；✅ **不替换
`web-startup`**，产品参数走 env + settings；
✅ T：`--no-open --port 0` 干净起，打印 token URL；Host 只登记 workspace + best-effort 建会话，
选中归 client（Host 只创建/attach，不改变客户端当前选择）。

**缺口**：G9（观察项）——不替换 `web-startup` 意味着不能加产品 flag，这是自觉的取舍；但手册 §八
用了 `dsh --profile deep-research -- --port <free>`，`--` 语义需与 `apps/cli/README.md:24-32` 对齐核一遍。

## 8 · 更新

**DSH 合同**（C）：卸载再安装；bundle membership 变化要重启；**没有命令级回滚**。

**我们的现状**：✅ T：0.3.1 tarball over 0.3.0 → dependency 换、版本换、roster 不变；手册 §六
写明"停 profile → 重装 → 启动"、"回滚 = 装回旧版"、"不要手写 manifest"。

**缺口**：无（可补一条 T：`dsh plugin add` 新版后实际重启的差异表现）。

## 9 · 卸载

**DSH 合同**（C）：只回收包与 patch 层；数据一律留下。

**我们的现状**：✅ T：`remove` 后 dependencies 清空、roster 回两项、profile 目录保留；手册 §七
列出保留项（`method-library.md`、`drt_*`、`archive/`、`_abandoned/`）与需显式删的两处
（`profiles/deep-research`、`$DSH_HOME/deep-research`）。

**缺口**：无。

## 10 · 文档与显示元数据

**DSH 合同**（C）

- 插件 README：前置字段 `description`/`kind` + 固定小节，回答"装什么/装到哪、安装、验证、配置、
  升级、卸载与数据、排障"七问（`docs/cookbook/adding-a-package.md` §4）。
- 宿主读的字段：`description`、locale `meta.title/description`、`icon`；子路径插件读不到
  `package.json`，要显示就得在子路径上导出（`vendor/dsh/packages/boot/app-boot/src/package-meta.ts:175`）。
- DSH 自家"可上架"的门槛（`profile.ts:215-222` 注释）明写：declares `dsh.bundle.patch`、**an `icon`**、
  **`./locale/*.json` display metadata**。

**我们的现状**

| 项 | 状态 |
|---|---|
| `_dist/安装手册.md` 十段骨架 | ✅ 十节齐，含版本/sha256/数据归属/故障/已知限制 |
| 包 README 前置字段 `description`/`kind` | ❌ 无 frontmatter；开场即"内容"大表 |
| README 七问顺序 | ❌ 部署/Data/Uninstall 分散在中后段，首屏是架构 |
| `locale/en.json` + `locale/zh.json` | ❌ 无 |
| `icon`（svg） | ❌ 无 |
| 子路径行的显示（`/content` `/startup` `/fetch-fallback`） | ❌ 显示为完整 specifier，无描述无图标（C） |
| 包根卡片 | ⚠️ 显示包名 + 约 380 字符英文 description（C） |

**缺口**：G10 README 不合 DSH 形；G11 无 locale/icon；G12 子路径行裸奔。

## ★ · 市场/发现（发布的下游）

**DSH 合同**（C）：格式 1 的静态 JSON 索引；`name`/`versions[].version`/`publishTimestamp`/
`source`/`engines.dsh` 必填；npm 或 git+commit 两种源；校验器 =
`@deepseek-ai/dsh-plugin-market-index`；发现页是实验性可选 bundle，索引 URL 属于用户数据。

**我们的现状**：T 用 vendor 校验器验证了一份最小条目 —— **格式通过**，`marketInstallTarget`
给出 `dsh-deep-research-pack@0.3.0`；但**没有生成器、没有索引文件、没有托管位置、没有条目文案**。
git 源不可行（见 §2），所以条目必须等 npm 发布。

**缺口**：G13 无市场索引与生成器。

## 自造物清单（"不要乱发明"的落点）

| 自造项 | 谁读它 | 处置倾向 |
|---|---|---|
| `dsh.compatibility.dshReleases` | 只有我们自己的 `export-dist.mjs` | 删（`engines.dsh` 是唯一合同） |
| `bin` 在 bundle 里 | pnpm 把它放进 profile 的 `.bin` | 保留但文档化，或收成 `node …/doctor.mjs` |
| 产品自有 settings 文件 | 我们的 startup/client | 保留（DSH 不管产品自建数据），但补齐版本/迁移/幂等 |
| `research_pack_root` 变量 + runtime context 注入 | 我们自己的 content 行 | 不属生命周期合同，不动 |

## 证据缺口（本轮没证到的）

- 浏览器侧显示元数据：本机无 Playwright 可用，`listBundles.meta` 的实际渲染未截图证；结论按
  `package-meta.ts` 判读记 C。
- Desktop 面：本机无 Desktop，相关结论只到 C（源码判读）。
- 从市场索引**安装**的端到端（需要 registry 上有包）——发布后才可跑。
- `dsh plugin add` 之后运行中的 profile 若未重启的行为差异（预期：仍是旧 membership）。
