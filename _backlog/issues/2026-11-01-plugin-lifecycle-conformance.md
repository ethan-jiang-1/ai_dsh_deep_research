---
status: 等人拍板
opened: 2026-11-01
---

# 推敲：插件生命周期合规——让交付件真正走通 DSH 的打包/发布/安装/初始化/卸载

> 立卡：2026-11-01 ｜ 状态：等人拍板（技术面已交付，待公网发布凭据与业务验收） ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否

**问题与期望结果：** 前一轮（D38–D40）把产品形态改回了"自有 `deep-research` profile + 一个 bundle"，
安装面已经真跑通；但 `_dist/` 看着仍不像一件能交出去的 DSH 插件产品。逐段对账后确认：**差距不在代码，
在"包清单 / 发布身份 / 显示元数据 / 文档取向"四件事**——其中"发布身份"是零：本包从未上 npm，
手册头号安装命令今天必然 404。期望结果 = 一个社区用户能在 DSH 的 Plugins 页（或市场的 Discover 页）
看到一份说得清的条目、一键装上、按下手册能启动/验证/升级/卸载，并且我们对外只用了 DSH 原生的
打包、发布、安装与发现通道。

**当前情况：**

- 十段对账已完成：判据 = [合同摘录](../research/plugin-lifecycle/2026-11-01-dsh-lifecycle-contract.md)，
  结论 = [合规矩阵](../research/plugin-lifecycle/2026-11-01-conformance-matrix.md)；
  六面隔离实验（装/dump/真启动/卸载/更新/registry 404/市场索引校验）见
  [实验记录](../research/plugin-lifecycle/2026-11-01-experiments.md)。
- 合规的段：初始化（只用 shipped 模板、无自建首启标记）、启动（自有 named profile、无 launcher、
  不抢 `web-startup`）、更新（over 安装换版本已 T）、卸载（只回收包与 patch 层，数据留下并文档化）。
- 不通的段：**发布**（npm 404，T）；**安装文档**的入口叙事与 DSH 的安装入口约定相反（CLI 优先 vs Plugins 页优先）；
  **显示元数据**缺失（无 locale/icon，子路径行裸奔，C）；**插件 README** 不合 DSH 的形（无
  frontmatter `description`/`kind`，首屏是架构大表而非七问）。
- 自造字段：`dsh.compatibility.dshReleases` 全 vendor 无消费者（C），只有我们自己的导出脚本兜底读它。
- 团队层：`@deepseek-ai/dsh-experimental-agent-team-profile` **随 dsh 安装提供**且在 `OPTIONAL_BUNDLES`
  里（C `profile.ts:225`；T 全局安装内可见），原生开启是 Plugins 页开关；其 npm `latest` 是
  `0.1.5-alpha.2`、`next` 才是 `0.2.1-rc.5`——手册的 `<与 dsh --version 同版本>` 占位符有踩雷面。
- 市场通道可用：格式 1 索引经 vendor 校验器验证通过（T），`marketInstallTarget` 产出
  `dsh-deep-research-pack@0.3.0`；但 git 源对我们不可行（`lib/` gitignored + `workspace:*` devDeps +
  只有 `prepack`），所以条目只能等 npm 发布后指向 registry。

**未决问题（需要用户拍板）：**

1. **包名与 scope**：继续用无 scope 的 `dsh-deep-research-pack`（npm 现为空位，但易与他人的命名
   冲突），还是 `@<org>/dsh-deep-research-pack`？这决定发布后不可改的身份。
2. **npm 发布权与凭据**：谁持有 npm 账号/2FA/token；发布是人工一步还是接 CI（trusted publishing）。
3. **市场索引托管位置**：GitHub raw（`_dist/market.json` 随 tag 走）、GitHub Pages，还是独立站点。
   索引 URL 会进用户的 Discover 列表，改动成本高。
4. **产品设置的真值层**：保留自有 `$DSH_HOME/deep-research/settings.json`（补版本/迁移/幂等），
   还是把可变量提升为本包 `Config` 的 `.volatile()` 字段、让设置页接管。
5. **`dsh-deep-research-doctor` 的 bin 保留与否**：保留会在用户 profile 的 `node_modules/.bin` 落一个
   命令（T 已证）；去掉则诊断变成 `node <包内路径>`。

**下一步：** P0（包清单合同）不依赖任何外部决定，可先做；P1 起需要 ①—⑤ 的答复。落地顺序按下面
"方案与取舍"的 P0 → P4，每片按 `## 验收标准` 退出。

## 已知与未决

**已知（证据在场）**

- 安装/组合/启动/更新/卸载的机械通路全部为绿（T，rc.2 与 rc.5 双运行时）。
- 市场索引格式 1 可用（T）；DSH 自家"可上架"门槛明写需要 `icon` 与 `./locale/*.json`
  （C：`vendor/dsh/packages/boot/app-boot/src/profile.ts:215-222` 注释）——这正是我们缺的。
- `engines.dsh` 存在时 `peerDependencies` 被运行时完全忽略（C：`plugin-compatibility.ts:59`），
  所以 30 条 peer 是文档而非门禁。
- README 生成器 `scripts/dist/export-dist.mjs` 已把版本/日期/sha256/条目数注入手册，手册与 tarball
  不会漂移（门禁 `dist-manual-version`）。

**未决（技术，不是方向）**

- 浏览器侧 `listBundles.meta` 的真实渲染未截图（本机无 Playwright 可用）；补 icon/locale 后必须真
  Web 复核一次，不能只靠源码判读。
- 市场索引的 `publishTimestamp` 取值口径（npm packument 的 time 字段 vs 本地打包时间）需定一条。
- 团队层以"可选 bundle 开关"开启时，`dsh.profile.bundles` 的写入形态（CLI 无原生开关命令）需查
  Plugins 页实际写什么——CLI 侧只有 `dsh plugin add`。

## 方案与取舍

分五片，**先合同后发布**：P0 把包清单改成"能被 DSH 与市场正确读"的形状；P1 造发布物；P2 改文档
取向；P3 补配置/设置的短板；P4 上机械门禁。每片都能独立验证，不做大爆炸。

### P0 · 包清单合同（不依赖外部决定，先做）

| 项 | 动作 | 对应缺口 |
|---|---|---|
| 删自造字段 | 移除 `dsh.compatibility`；`export-dist.mjs` 的兜底分支一并删；`engines.dsh` 成为唯一版本合同的载体 | G1 |
| `files` 收敛 | 排除 `lib/**/*.js.map`（保留 `.d.ts`，符合 DSH 自家约定） | G2 |
| 显示文本 | 新增 `locale/en.json` + `locale/zh.json`（`meta.title`/`meta.description`），`exports` 加 `./locale/*.json`，`files` 纳入 | G11 |
| 图标 | 新增 `icon.svg`（≤256 KiB，自包含），清单加 `"icon": "./icon.svg"` | G11 |
| 子路径行显示 | 为 `/content`、`/startup`、`/fetch-fallback` 各导出 `<subpath>/locale/*.json` 与 `<subpath>/icon`（子路径不读 package.json，只能在子路径上导出） | G12 |
| doctor bin | 按用户答复：保留则文档写清 `.bin` 副作用；去掉则改文档为 `node …/scripts/doctor.mjs` | G3 |
| 包名/scope | 按答复落地（P0 的最后一步，因为会改 lockfile 与全仓引用） | ① |

**取舍**：不接受"为了让卡片好看而在 Host 侧自造标题"——DSH 的显示元数据只认 locale/icon 导出；
也**不引入第二套清单文件**（如 `plugin.json`），`package.json` 是唯一身份。

### P1 · 发布物与市场条目

| 项 | 动作 |
|---|---|
| npm 发布 | 按 `guides/64` 走一遍真实发布（tag → `npm publish` → `npm view` 复核）；此后 `_dist` 手册的头号命令才成立 |
| 市场索引生成器 | 新增 `scripts/dist/market.mjs`：读 pack `package.json` + (`npm view --json` 或本地打包事实) 生成 format 1 JSON，**用 `@deepseek-ai/dsh-plugin-market-index` 校验后才写盘**；输出 `_dist/market.json` |
| 索引内容 | `title`/`description` 双语、`icon`（相对路径或 data URI）、`author`、`repository{directory}`、`metadata.category`/`keywords`、`dist-tags`、`versions[]`（含 `publishTimestamp` 与从 pack 原样复制的 `engines.dsh`） |
| 托管 | 按答复：随 tag 提交到仓库（raw URL）或 Pages；手册写"Discover → 添加索引 URL"一句 |
| 发布顺序 | 扩展 `guides/64`：市场条目必须在 npm 发布之后生成（否则 `versions[]` 与 registry 不一致） |

**取舍**：不建私有市场服务、不写自定义索引协议——格式 1 + 静态文件是 DSH 唯一入口；也不在索引里
放 tarball 直链（格式不支持，且会绕开 registry 的版本语义）。

### P2 · 安装/初始化/更新/卸载文档取向

| 项 | 动作 |
|---|---|
| 入口叙事 | 手册与包 README 的首选安装句改成 **Plugins 页**（web 与 Desktop 同一句）；CLI 明确标"仅 `dsh web` 的自动化" |
| 团队层 | 首选写 **Plugins 页开关**（它是 shipped optional bundle）；CLI 备选给 exact 版本，并警告不要用 `@latest` |
| 首启 | 保留"建 profile 只用 `--from-default-profile web`"的破坏性提示；补一句"已有 profile 不要重复" |
| 验证 | 统一给 `--dump-config` 要找的 entry id 清单（`preset-lead` / `research-*`），以及界面上可见的变化 |
| 升级/回滚 | 补"bundle 成员变化要重启"与"没有命令级回滚，回退 = 重装旧版"的显式句子（现手册已接近，需对齐措辞） |
| 卸载 | 已是合规范本，仅补"`$DSH_HOME/deep-research/` 随 profile 删"的因果 |
| 插件 README | 加 frontmatter `description`/`kind`；首屏改成七问骨架（装什么/装到哪 → 安装 → 验证 → 配置 → 升级 → 卸载与数据 → 排障），架构大表下移（合规矩阵缺口 G10） |

### P3 · 配置与设置（补齐"设置页里没有本包"）

| 项 | 动作 |
|---|---|
| `Config` schema | `research-fetch-fallback` 已有 `Config`（无 volatile）；给它补 `.volatile()`（候选：回退开关、超时），并给 `research-startup` 定义 `Config`（候选：默认工作区）——只把**该进设置页**的字段标 volatile |
| 真值层 | 按⑤/④答复二选一：自有 settings 文件（补 `version` 字段 + 迁移规则 + 幂等）或迁到 profile patch 层；两套真值不允许并存 |
| 优先级 | 把"`DEEP_RESEARCH_WORKSPACE` > 产品设置 > 浏览器提示键"写成一张可测的表，并加一条单测 |

### P4 · 门禁与证据（防回归）

| 门禁 | 判据 | 反证 |
|---|---|---|
| `pack-manifest` | `engines.dsh` 在场；无 `dsh.*` 未定义键；`files` 不含 `.map`；`locale/*.json` 可解析且含 `meta.title`；`icon` 在包内且 ≤256 KiB | 临时注入 `dsh.compatibility` / 删 icon → 必须红 |
| `market-index` | L0 判结构与一致性（format 1、name/version/dist-tags、`engines.dsh` = 包清单、source=npm、图标 ≤32 KiB）；真 `parseMarketIndex` 归 `lifecycle-smoke`（L0 是零依赖层） | 改版本不改索引 → 必须红 |
| `readme-shape` | 包 README 有 `description`/`kind` 前置字段且七问小节在场 | 删一节 → 必须红 |
| `lifecycle-smoke` | 全新 `DSH_HOME`：`--from-default-profile web` → `plugin add <tgz>` → `--dump-config` 含本包 11 个 `- id:` 行且 stderr 空 → 真启动打印 token URL 且无 `did not activate` → `remove` 后 roster 回两项 | 删任一 insert 行 → 启动/dump 必须红 |

**整体取舍**

- **输掉**：继续以 CLI registry 命令作为手册头号入口（与 DSH 安装入口约定相反）；保留自造 `dsh.compatibility`；
  再造一份插件清单/自定义市场协议；把 tarball 直链塞进市场；在 Host 侧自造显示标题。
- **保留**：自有 named profile、无 launcher、不替换 `web-startup`、内容与产物分家、只读 doctor。
- **顺序理由**：显示元数据与清单字段决定"市场能不能读你"；发布决定"能不能装"；文档决定"用户会不会
  装错面"。三者顺序固定，先做后面两件等于把 404 和裸卡片一起发出去。

## 验收标准

1. **可安装身份**：在干净 `DSH_HOME` 上 `dsh plugin --profile deep-research add dsh-deep-research-pack@<ver>`
   成功（registry 解析，无 404）；roster 为 base + web-app + 本包（+ 团队层）；`--dump-config` 出现
   `preset-lead` / `research-content` / `research-startup` / `research-client` / `research-fetch-fallback`
   且 stderr 无 `patch: entry … not found`。
2. **显示面**：Plugins 页（真 Web）里本包卡片有中英标题、描述与图标；三个子路径行不再是裸 specifier；
   证据 = 浏览器截图或 `listBundles` 返回体（二者之一在场）。
3. **市场面**：`_dist/market.json` 通过 `parseMarketIndex`；在本地 http 起一个静态服务，把该 URL 加进
   Discover 后能看到条目、语言切换正确；`marketInstallTarget` 产出的 spec 与实际发布版本一致。
4. **文档面**：手册与包 README 的安装首句都是 Plugins 页；CLI 一节显式标注"仅 `dsh web`"；团队层
   给出 Plugins 页开关路径；七问骨架在包 README 首屏；`_dist/安装手册.md` 由生成器重导出。
5. **配置面**：至少一个产品设置在 Settings 页可改（`.volatile()` 生效），且与自有设置/环境变量的
   优先级有机械判据（单测）。
6. **卸载面**：`remove` 后工作区产物与 `$DSH_HOME/deep-research/` 按文档保留；手册 §七 与实际一致（T 复核）。
7. **门禁面**：P4 四条门禁全绿，且每条都有一条"注入即红"的反证记录（先红后绿）。
8. **叙事一致**：根 README、AGENTS、`docs/guides/62`、pack README、`_dist/安装手册.md` 对安装入口与
   身份的描述同一。

## 关闭条件

验收标准 1–8 有证据在场；P0/P1 的落盘项各自带 Note 或并入本卡去向；①②③④⑤ 五个拍板项有明确答复且
已反映到树上。


## 决定（2026-11-01，技术面自主推进）

①—⑤ 五个拍板项按"做对最重要、不做兼容"的原则定下；可逆项标了重议条件。

1. **包名**：保持无 scope 的 `dsh-deep-research-pack`（npm 现为空位；改名会牵动全仓引用与已导出产物）。重议条件 = 公网发布前发现被占。
2. **npm 发布**：人工一步（[guides/64](../../docs/guides/64-release-versioning.md) 的顺序），不接 CI trusted publishing（仓里没有发布工作流；引入是另一项决定）。机制已用本地 registry 端到端证透。
3. **市场索引托管**：`_dist/market.json` 随 tag 提交，索引 URL = GitHub raw（单一来源在 [market.mjs](../../scripts/dist/market.mjs) 的 `INDEX_URL`）。
4. **产品设置真值层**：保留自有 `$DSH_HOME/deep-research/settings.json`（补优先级判据），不迁 profile patch；设置页的可编辑项 = `research-fetch-fallback.enabled`（`.volatile()`）。重议条件 = 需要跨 profile 共享同一工作区时。
5. **doctor bin**：保留 `dsh-deep-research-doctor`，安装后落在 profile 的 `node_modules/.bin`；手册写明这是有意副作用。

## 验证进展（2026-11-01）

| 验收 | 证据 |
|---|---|
| 1 可安装身份 | 本地 registry（Verdaccio）上 `npm publish` 0.3.0 → 市场条目算出的 `dsh-deep-research-pack@0.3.0` 在全新 scratch home 安装成功、roster 三项；`lifecycle-smoke` 的 tarball 安装路径同样绿。**公网 npm 尚未发布**（缺账号/2FA），发布前 registry 解析仍 404。 |
| 2 显示面 | 运行期 `readPluginMeta` 读出四个 specifier 的 `{en, zh}` 标题/描述与 SVG 图标 data URI（`lifecycle-smoke` ⑤ 常驻断言）。浏览器截图未取。 |
| 3 市场面 | `parseMarketIndex` 通过；静态服务 + `pluginMarket.search` 返回条目（含 `install.spec`、`compatibility.compatible: true`）；`marketInstallTarget` spec 与实际安装版本一致。 |
| 4 文档面 | 手册十节、Plugins 页先于 CLI 且标"仅 `dsh web`"、团队层 = Plugins 页开关 + exact 版本警告；README 七问首屏 + `description`/`kind`；`_dist/安装手册.md` 由 `export-dist` 重导出。`readme-shape` 门禁常驻。 |
| 5 配置面 | `fetch-fallback` 的 `enabled` 标 `.volatile()`；`config-volatile` 测试直接调 DSH 的 `volatileForm`（删 `.volatile()` 即红，红录已跑）；`startup` 新增 env > 设置文件优先级用例。 |
| 6 卸载面 | `lifecycle-smoke` ⑥：remove 后 dependency 清空、roster 回落、profile 保留；`data-smoke` ALL PASS（工作区产物与会话日志保留）。 |
| 7 机械门禁 | `pack-manifest` / `market-index` / `readme-shape` 全绿；三条 `gates-smoke` 注入案例点名红后还原绿；`lifecycle-smoke` ALL PASS。 |
| 8 叙事一致 | 根 README、guides/62、guides/65、project-map、00-index、pack README、`_dist/安装手册.md` 均改为 Plugins 页优先、CLI 标 `dsh web`。 |

附带绿：`pnpm verify`、`pnpm test`（965）、`pnpm typecheck`、`pack-smoke`、`doctor-smoke`、`data-smoke`、`install-shape-smoke`（真团队层）、`release-smoke --install-only`。

## 去向

`implemented` → [插件生命周期合规 Note](../../notes/implemented/2026-11-01-plugin-lifecycle-conformance.md)。

**待人拍板的两件**：① 公网 npm 发布（账号/2FA；命令与顺序已在 guides/64）；② 业务验收（真机首启手感、Plugins/Discover 页观感）。
