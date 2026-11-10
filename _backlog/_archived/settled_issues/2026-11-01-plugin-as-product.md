---
status: 已结
opened: 2026-11-01
---

# 推敲：插件即产品——独立启动 profile、用户工作区与 run bundle 归属

> 立卡：2026-11-01 ｜ 状态：已结（2026-11-01，用户授权归档） ｜ 类型：Task ｜ 结论倾向：现在做——Q1/Q2/Q3/Q4/Q5/Q6/Q7/Q8 已按推荐拍板，按落地计划 S0–S4 推进 ｜ 可关闭：是

**关闭结论（2026-11-01）：** S0–S4 技术面全部交付：D38/Note、launcher/产品 profile/工作区注册、首屏起步卡、产品文档/`_dist`、dev 根解析/projectKey、产品 smokes 与 release-smoke 全绿；版本 0.2.0。P1（saved-session 自动切换、项目模式深化、产品内 onboarding）与未验证项登记在 Note §残余边界 + triggers。 去向：implemented — [插件即产品 Note](../../../notes/archived/2026-11-01-plugin-as-product.md)。

## 拍板结论（2026-11-01，用户授权静默自主执行）

用户明确："有问题按推荐；有好计划就 setup goal 推进；尾巴补测试计划；静默自主执行、不问、克服障碍。" 据此：

| # | 决定 | 理由 |
|---|---|---|
| Q1 | 产品 profile 默认 **`deep-research`**；dev 镜像仍 `research`；`--profile` 可覆盖 | 产品身份清楚，避免 launcher 误碰开发镜像；老用户可用 `--profile research` |
| Q2 | P0 = `--workspace` / `DEEP_RESEARCH_WORKSPACE` / profile 设置 / TTY 询问；P1 再做 Web 内 onboarding/自动切换 | 终端 prompt 足以覆盖首启；不把 P0 扩成完整 onboarding |
| Q3 | 非空项目目录默认 **`<project>/research`**；`--in-place` 才用项目根；危险目录拒绝；已有 `.gitignore` 不静默改 | 不污染项目根；sandbox 边界写进文档 |
| Q4 | **单包 + `dsh-deep-research` bin + 所有 peer optional**；不新增 launcher 包 | spike 证实 optional peers 可行；不违反 D1 |
| Q5 | **共享 `$DSH_HOME` 默认**；`--home` 可选隔离 | 凭据/会话连续；不假装 profile 隔离；共享可见性写清 |
| Q6 | P0 做**起步卡 + 工作区指示 + 凭据提示**；不承诺 saved-session 自动切回 | 首屏是产品的一部分；saved-session 抢首屏已证实 |
| Q7 | 种子 = **部署副本**（落地归用户）；包内 `workspace/` 是只读源 | agent-instructions 只能从 cwd 链注入；不另做 loader |
| Q8 | 按[落地计划](../research/plugin-as-product/2026-11-01-landing-plan.md) S0–S4 执行；四张子卡 | 薄垂直切片，每片有可运行增量与证据 |

## 初衷（判断标准，不是背景装饰）

我们不是要把插件包成安装器；初衷是**让 Deep Research 这支研究团队成为用户可直接使用的产品**：

- 用户不需要懂 DSH profile/bundle/patch/team layer；一条命令进入产品。
- 启动时知道或询问工作区；插件的全部能力施加到用户手上的那个目录。
- 插件内容（角色、方法论 skill、驾驶舱、抓取、种子、部署脚本）留在插件里，不要求用户拿仓库 checkout。
- 生产现场（run bundle、方法库、归档、交付回执）留在用户工作区；用户能打开、能带走、能备份。
- 首屏要像产品：知道从哪开始、当前工作区是哪个、研究过程中看哪里、交付在哪里。

后文的机制与卡片都服从这五条；如果某个设计只让装配更漂亮、却没让用户更容易开始一场研究，它就不该进 P0。

**问题与期望结果：** 今天用户要跑本插件，必须先自己建 `research` profile、`dsh plugin add` 装包、手工 `scaffold` 铺工作区，再 `cd` 到某个研究目录起 `dsh`。仓库里同时存在"开发通道 `run-driver up`"与"用户手动 `dsh --profile research`"两套启动叙事，工作区默认写死 `research-workspace/`，随包文本还引用仓内 `dev/`、`scripts/`；首屏是一个空白 Lead 会话，用户不知道这是研究产品、该直接问问题、还是该先配置什么。期望：插件以**自己的产品 profile** 启动——一条产品命令，启动时知道或询问用户工作区；插件的全部内容留在插件内；生产状态与最终产物（run bundle）落在用户指定的工作区；首屏告诉用户这是什么、从哪开始、当前工作区；README、`_dist` 安装手册与仓库文档统一讲这一套。

**当前情况（事实，详见研究材料）：**

- **DSH 不允许第三方随包发 profile 模板。** `PROFILE_TEMPLATES` 是硬编码表（`packages/boot/app-boot/src/profile.ts:179-195`）；`--from-default-profile` 只认五个 shipped 名；非 shipped 名不会自动建 profile。唯一受支持路径 = `dsh --profile <p> --from-default-profile web` + `dsh plugin --profile <p> add <pack>` + `add <team-layer>`。详见[机制核验](../research/plugin-as-product/2026-11-01-dsh-mechanics.md)。
- **Web app 拒绝未知参数。** `--workspace` 不能传给 `dsh`（`packages/bundle/web-app/src/startup.ts:59-81`；实测 unknown option）。工作区必须经环境变量/产品设置交给 Host 插件。
- **Host 插件可以在 boot 时预登记工作区。** `ctx.workspaceRegistry.create(path)` 按 canonical path 幂等；Web Client 首屏会选 recent workspace 并创建 blank Session（`packages/client/ui-workspace/src/client/navigation.ts:461-472`）。Session `header.cwd` = 工作区，sandbox 根、手册注入、驾驶舱读取面随之对齐。**2026-11-01 真机 spike 已证**：Host 注册先于 Web URL，首屏 blank Session `cwd` = 工作区、`agentPreset` = `lead`（全新 home + pack）；证据 = [复核](../research/plugin-as-product/2026-11-01-review-findings.md) §2.4。
- **Pack 运行时已经与根解耦。** `run-context.ts` 只用相对路径；驾驶舱读 `remote.workspaceFiles`（根 = `header.cwd`）；方法库 = `join(session.header.cwd,'method-library.md')`。缺的不是 pack 代码，而是启动、绑定与首屏。
- **Dev 工具仍写死仓内工作区。** `dev/boot-run.sh:26` 的 `WORKSPACE` 只 echo 不使用；`dev/run-kickoff.mjs:184`、`dev/hitl-answer.mjs` 四处写死；`scripts/lib/session-log.mjs:38-49` 用 `research-workspace` substring 找会话组——工作区叫别的名字时 run-ops 全断。详见[现状盘点](../research/plugin-as-product/2026-11-01-repo-gaps.md)。
- **文档互相矛盾。** `docs/00-index.md:11-17` 的"插件自身没有进程 / 别直接 dsh"、`docs/guides/62-plugin-authoring.md:26` 的 "Nothing is both"、`docs/guides/65-run-forms.md:13` 的 M1、根 `README.md:11` 的 run-driver 入口、`_dist/安装手册.md` 的五步手动安装，分别在不同作用域成立，但没有任何一页把作用域写清。
- **打包的关已过。** 2026-11-01 spike：不加 optional peers 时 `npm install` 直接 ERESOLVE（registry rc.5 与包 rc.2 ranges 混合）；加了 `peerDependenciesMeta.*.optional: true` 后只装本包 1 个依赖、bins 正常。记录 = [复核](../research/plugin-as-product/2026-11-01-review-findings.md) §2。

**未决问题（需要用户拍板）：**

1. **产品 profile 默认名**：推荐 `deep-research`（产品身份清楚；与开发镜像 `research` 分开，避免 launcher 误改开发 profile）；备选 `research`（连续、少改，但两者会共名）。
2. **首启工作区 UX**：推荐 P0 = `--workspace` / `DEEP_RESEARCH_WORKSPACE` / 已保存设置 / TTY 询问（当前目录作建议默认、不自动接受）；P1 再加 Web 内 onboarding/自动切换。若要求"双击即用、无终端"，P0 范围要扩。
3. **项目目录默认**：推荐非空项目目录默认用 `<project>/research` 子目录（不碰项目文件；agent 可读项目、写入留在子目录）；`--in-place` 才用项目根。若要求 agent 直接读写项目根，必须接受手册/种子落在项目根。
4. **打包**：推荐单包 + `dsh-deep-research` bin + 所有 peer optional（spike 已验证）；备选独立 launcher 包（违反 D1，需新 D 号）。
5. **home 策略**：推荐共享用户 `$DSH_HOME`（凭据/会话连续；但 Web UI 会列出这个 home 下所有会话/工作区）；备选 `--home` 产品私有 home（干净但需另配凭据）。
6. **首屏体验**：推荐 P0 做起步卡 + 工作区指示（品牌已有 Orca；工作区由 vendor picker 显示；起步卡用现有 client slot）；P1 再做完整 onboarding/自动工作区切换。
7. **种子副本**：推荐工作区里的手册/模板是"部署副本、落地归用户"（DSH agent-instructions 只能从 cwd 链注入；包内 `workspace/` 是只读源）。若要求手册也只读、不落工作区，需要另做 instruction loader/persona 注入，属另一方案。
8. **实施范围/顺序**：推荐四张子卡按"运行时 → 首屏 → 文档分发 → 仓库对齐证据"推进；也可先做运行时 + 首屏 + 文档，dev 对齐延后。

**下一步：** S0–S4 技术面已交付（证据见 §落地记录）；剩用户首启业务验收与 P1（saved-session 自动切换、项目模式深化、产品内 onboarding）。技术证据归 agent，业务验收归用户；P1 按需另开卡/触发器。

## 已知与未决

### 已知

- 产品形态的 DSH 机制、当前仓库缺口、验收设计、方案取舍与复核已落在本课题的六份研究材料中；结论以 `vendor/dsh` 当前 pin 的源码为准。
- 现有 `guides/65` 已把 M1 定义为"用户自己的 home + 自选工作区"，但与"插件自带启动 profile"还差一个启动器、一个 Host 注册面与一个首屏；本卡是这条线的延伸，不是推翻。
- 现有 pack 的 `scaffold`/`preflight`/种子引擎/工作区守卫/安装锚可以复用；不需要重写部署引擎。
- 现有 `present`/run bundle/回执相对路径合同支持"产物在用户工作区"，不需要新的 artifact store。
- 打包：optional peers 的必要性已由 spike 证实；单包分发方向可行。
- 产品核心链路：Host 注册 → Web 首屏 blank Lead Session（cwd = 工作区）已由真机 spike 证实（[复核](../research/plugin-as-product/2026-11-01-review-findings.md) §2.4）；剩余是把它封装成 launcher/产品 bundle 并用 smoke 固化。

### 未决

- 真实 `npm i -g` 的 **launcher** bin（preflight/scaffold bin 已验证；launcher 加 bin 后补测 `--help`/`--check`）。
- 浏览器已有 saved Session 时，**已证实会打开 saved 的工作区**（spike §2.6：启动 `ws`，saved 在 `ws2` → 打开 `ws2`）；P0 只保证新 home 首装 + 可见工作区指示/切换，自动切换是 P1。
- 项目子目录模式下，用户是否接受"agent 可读项目、但写入留在子目录"的 sandbox 边界。
- 共享 home 下其他 DSH 会话/工作区的可见性是否可接受；`--home` 是 escape hatch。
- README/AGENTS 的预算：产品门面需要更多行时，先下放/压缩，必要时按 `doc-budgets` 规则升顶并登记理由（建议 README 31→45、AGENTS 140→145）。

## 方案与取舍（摘要；完整版 = [方案与取舍](../research/plugin-as-product/2026-11-01-architecture-options.md)）

**推荐形态：** 包仍是 bundle；包内新增启动器（bin `dsh-deep-research`）与 Host 工作区注册插件。启动器装配产品 profile（web 模板 → pack → team layer）、解析/铺工作区、spawn `dsh --profile`；Host 在 boot 时登记工作区，Web 首屏创建 Lead Session；首屏用现有 client slot 显示产品名/工作区/起步指引；run bundle 相对工作区根。

| 方案 | 结论 | 理由 |
|---|---|---|
| CLI 装配 + 启动器包装 | 采纳 | 唯一受支持的 profile 装配路径；启动器不新增应用进程 |
| 包内放 profile 模板 | 不采纳 | DSH 无第三方模板扩展点；手写 profile 是代码巧合 |
| 自有 app bin 调 `runProfile` | 不采纳 | Desktop 专用模式；超出第三方合同与入口 allowlist |
| 给 dsh 传 `--workspace` | 不采纳 | Web app 拒绝未知参数；替换 web-startup row 太脆 |
| 工作区只登记不进 cwd | 不采纳 | registration 不授予文件面；run bundle/手册/sandbox 都要 header.cwd |
| 强制产品私有 home | 不采纳为默认 | profile 不是隔离边界；分裂凭据/会话；`--home` 作可选 escape hatch |
| 工作区手册只读注入 | 不采纳为 P0 | `agent-instructions` 只从 cwd 链发现；另做 loader 属另一方案 |
| 单包 + optional peers | 采纳 | spike 证实全局安装不拉 DSH peers；不违反 D1 |
| 独立 launcher 包 | 备选 | 更干净但违反 D1；只在全局 bin 仍有问题时采用 |

**目标数据归属：**

| 层 | 内容 | 位置 | owner |
|---|---|---|---|
| P | presets/skills/launcher/scaffold/preflight/seed 源/驾驶舱/fetch provider | profile `node_modules/dsh-deep-research-pack/` | 包（只读） |
| H | 产品 profile + 团队层依赖 | `$DSH_HOME/profiles/<p>/` | 启动器装配；DSH 拥有格式 |
| H | 启动器设置（上次工作区） | `$DSH_HOME/profiles/<p>/deep-research.launcher.json` | 启动器；无秘密、可删 |
| W | 种子（部署副本）、方法库、`drt_*`、archive、_abandoned | `<workspace>/…` | 用户 |
| W | git 跟踪规则（`.gitignore`） | `<workspace>/.gitignore` | 用户；产品不静默改，只给建议 |
| H | Workspace registration / sessions / credentials | `$DSH_HOME/` | DSH |

## 实施切片

### 子卡 A：[产品启动运行时](./2026-11-01-product-launch-runtime.md)

- 启动器 `scripts/launch.mjs` + `scripts/lib/launcher/*`：参数解析、工作区解析、profile 装配、scaffold ensure、spawn `dsh`、透传 Web flags、信号转发、首装进度/失败补救。
- Host 插件 `src/workspace-boot/index.ts` + `cordis.patch.yml` 行 `research-workspace-boot` + `@deepseek-ai/dsh-workspace` peer；`create(path, title)` 给产品化标题。
- 产品设置文件读写（原子、损坏回退、无秘密、profile 目录内）。
- `package.json`：`bin`、`files`、所有 peer optional（必需，非可选）；`export-dist` inventory。
- 首次启动/幂等/半装/危险目录/项目子目录/`--in-place`/已有 `.gitignore` 的行为；saved-session 的可见提示。
- 验收：launcher 单测（fake dsh）+ `product-smoke`（L2 真装）+ `workspace-boot` 单测 + `package-contract`。

### 子卡 B：[产品文档与分发](./2026-11-01-product-docs-and-dist.md)

- 根 `README.md`：产品门面（一条命令、工作区、产物、数据归属、首屏说明），开发入口下放。
- pack `README.md`：产品安装/启动/首屏/数据卡/卸载；10 列数据卡加启动器设置行；随包文本 de-repo（具体清单见子卡 B）。
- `docs/00-index.md` §先分流：产品行 vs 开发行；修正"别直接 dsh"的作用域。
- `docs/guides/65`：新增产品形态 M1-product / M1-manual / M2 / M3；P/H/W 表更新。
- `docs/guides/62`：裁定 "Nothing is both"（包仍是 bundle，launcher 是运行期装配器）。
- `docs/guides/61`：声明只服务开发通道；产品 run 指向 pack README。
- `docs/project-map.md`、`docs/design/10`、`docs/design/50`、`docs/terms.md`（artifacts = run bundle 别名）、`docs/decisions.md`（D38）、`notes/implemented/`、根 `AGENTS.md`、pack `AGENTS.md`、`CONTRIBUTING.md`。
- `_dist/安装手册.md` 只能改 `scripts/dist/export-dist.mjs` 模板后重导出；版本 bump 后重跑。
- 种子手册标题/工作区说明去仓名（`research-workspace` → 研究工作区）；`pack-workspace-fresh` 同步。
- 验收：`pnpm verify`（doc-budgets/md-links/md-anchors/entry-chain/backlog-liveness）+ `_dist` 重导出 + `dist-manual-version`。

### 子卡 C：[仓库对齐与证据](./2026-11-01-repo-alignment-and-evidence.md)

- `scripts/lib/workspace-root.mjs`：dev 工具统一根解析（arg → `DSH_RUN_WORKSPACE` → 仓内默认）；`dev/boot-run.sh` 真正使用根；`run-kickoff:184`、`hitl-answer`、run-ops/run-gates 改用解析器。
- `session-log`：从会话 header cwd 解析会话组，保留 substring 作为 legacy；加任意工作区名测试。
- 测试迁移：手册/模板读取改 pack 种子；`hitl1-intake-samples` 移 fixture；`replay-scene` 允许外部工作区；`run-driver-contract` 不再钉唯一启动。
- 新增 `product-smoke`（L2，真装前置 exit 2）与 `product-boot-smoke`（真 Web + 浏览器，无模型）；登记 `smoke-contract`、`evaluation`、`context.mjs`。
- 首屏/saved-session/项目 `.gitignore` 的浏览器断言。
- 版本 bump（0.1.3 → 至少 0.2.0）+ root 镜像 + `release-check` + `_dist` 重导出。
- 验收：`pnpm verify`、`pnpm test`、`product-smoke`、`product-boot-smoke`、`release-smoke`（安装域）。

### 子卡 D：[产品首屏体验](./2026-11-01-product-first-run-ux.md)

- 首屏：产品名/品牌（已有 Orca）、当前工作区、起步指引（问一个研究问题；Lead 先问三问）、凭据提示、右栏「研究状态」/「终稿」入口说明。
- 用现有 client slot（`conversation.hero.brand.mark` / `conversation.hero.workspace` / `conversation.input.dock` / `conversation.hero.options`），不新增模型可见事实、不做皮肤、不新增 localStorage/账本。
- 起步卡只在工作区还没有 `drt_*` 时显示（client 已能读 `remote.workspaceFiles`）；已有 run 时收起。
- saved-session/多工作区的可见指示与一键切换；不承诺自动选中。
- 验收：真浏览器 smoke 断言品牌、工作区、起步文案、Lead preset、composer 可用、无空白困惑；工作区不匹配时有可见提示。

### 落地顺序

完整依赖图、每切片结束判据、第一刀与回退 = [落地计划](../research/plugin-as-product/2026-11-01-landing-plan.md)。摘要：

| 切片 | 内容 | 卡片 | 结束判据 |
|---|---|---|---|
| **S0 决定** | D38 + Note + 拍板 | 父卡 | Q1/Q2/Q5/Q6/Q7 有答案；D38/Note 落盘 |
| **S1 骨架** | launcher + Host + 装配 + 打包；dev 根解析/projectKey 并行 | A + C1 | 一条命令起 Web；profile/workspace/session 断言；`product-smoke` 基础绿 |
| **S2 产品可用** | 首屏起步卡 + 工作区指示 + 凭据提示；浏览器 smoke | D + C2 | 首屏 Orca/工作区/三步/Lead/composer；saved-session 有指示 |
| **S3 文档分发** | README/pack README/_dist/00-index/61/62/65/terms/D38 | B | `pnpm verify` 绿；`_dist` 一致；产品/开发作用域可辨 |
| **S4 硬化验收** | 升级/半装/`.gitignore`/`--home`/项目模式；版本 bump；用户首启 | A/C/D/B | `release-smoke`/`product-smoke`/`product-boot-smoke` 绿；用户首启通过 |

## 落地记录（2026-11-01，S0–S4 技术面）

- **D38 + Note 已落**：[decisions D38](../../../docs/decisions.md#d38)、[Note](../../../notes/archived/2026-11-01-plugin-as-product.md)。
- **S1 骨架**：`scripts/launch.mjs` + `scripts/lib/launcher/*` + `src/workspace-boot/` + profile 装配/设置/种子/守卫；fake-dsh 单测与 `product-smoke` 绿。
- **S2 首屏**：`StartCard.tsx` + `start-card.ts` 判据 + dock 注册；`product-boot-smoke` 绿（Orca/工作区标题/起步卡/Lead/cwd = 工作区）。
- **S3 文档/分发**：README/pack README/00-index/61/62/65/project-map/design/terms/AGENTS/CONTRIBUTING；`_dist/安装手册.md` 由 `product-manual.md` 生成；版本 0.2.0。
- **S4 硬化/证据**：`pnpm verify` 全绿、`pnpm test` 1046 pass、`pnpm typecheck` 绿、`release-smoke` ALL PASS、真实 `npm i -g` launcher bin 正常。
- **残留（不在本次技术面关闭）**：saved-session 自动切回启动工作区（P1）、项目子目录 sandbox 的用户接受度、共享 home 可见性、团队层离线、Windows/Desktop/正式 npm 发布。首启手感/文案由用户业务验收；技术证据归 agent。

## 验收标准

本卡是决策/实施父卡，关闭前至少满足：

1. **一条产品命令可用**：在干净 `DSH_HOME` + 空工作区执行产品命令，自动得到 web+pack+团队层 profile、铺好种子、启动 Web；无需用户先建 profile 或手动 `plugin add`/`scaffold`。
2. **工作区可指定/可询问**：`--workspace`、`DEEP_RESEARCH_WORKSPACE`、已保存设置、TTY 询问四条路径有测试；危险目录拒绝；项目目录默认子目录或 `--in-place` 的行为有测试；已有 `.gitignore` 不被静默改写。
3. **绑定正确**：Web 首屏的 blank Session `header.cwd` = 用户工作区；`workspaceRegistry` 有对应登记；run bundle 落在工作区；驾驶舱能读到。
4. **首屏可用**：用户能看到产品名/品牌、当前工作区、起步指引（问一个研究问题；Lead 先问三问）、凭据提示、右栏观察/交付入口；不是空白会话；saved-session 打开在别的工作区时有可见提示/切换。
5. **自包含**：安装态文本/脚本不引用仓内 `dev/`、`scripts/`；`_dist` tarball 含 launcher 与 Host 插件；`_dist/安装手册.md` 与 tarball 版本一致。
6. **幂等与升级**：重复启动不重复安装；包版本变化更新 profile 副本；用户改过的种子不被静默覆盖；半装/损坏 profile fail-loud 有补救。
7. **数据归属写清**：pack README 10 列数据卡含启动器设置行；卸载说明列出 profile/团队层/工作区/会话/凭据/浏览器各自保留什么；共享 home 的可见性写明；种子是部署副本、包内是源。
8. **仓库对齐**：dev 工具支持任意 `DSH_RUN_WORKSPACE`；会话组用 `projectKey(cwd)` 计算、不再依赖 `research-workspace` substring（legacy 兜底）；测试读 pack 种子；`pnpm verify`/`pnpm test` 绿；`product-smoke`/`product-boot-smoke` 绿。
9. **文档一致**：README/pack README/`_dist`/00-index/61/62/65/project-map/terms 不再互相矛盾；"产品"与"开发"两个作用域在每页首段可辨；artifacts/run bundle 术语有别名。
10. **决策记录**：D38（产品形态）与 Note 记录理由、输掉的方案、未验证项；子卡与研究工作区互链。

## 关闭条件

- 子卡 A/B/C/D 全部交付，且第 1–10 条验收有证据（命令输出、smoke 日志、dump 片段、浏览器截图/断言）。
- 业务验收（首启手感、工作区选择文案、首屏信息密度、是否接受项目子目录默认、共享 home 是否可接受）由用户确认；技术证据归 agent。
- 未验证项（Host 首屏会话 spike、真实 `-g` bin、saved Session 切换、Windows、Desktop、真实 npm 发布）按 [triggers.md](../../triggers.md) 或卡内残余登记，不冒充已证。
- 关档前按 [结论去向](../../methods/issue-to-note.md) 记 `去向：implemented — <Note>`，并把本课题研究目录随最后一个活跃消费者迁档。
