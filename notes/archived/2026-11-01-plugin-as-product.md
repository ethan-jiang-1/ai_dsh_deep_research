# 插件即产品：独立启动 profile、用户工作区与 run bundle 归属

> 状态：implemented
> 归档：2026-11-10

> 历史注记：D38/D39 的 launcher 与“可选启动器”已由 [D40](../../docs/decisions.md#d40) 删除（入口翻回专用 custom profile）；本页含 launcher/部署 bin 的段落按 D40 后的合同读，现行 = [D40](../../docs/decisions.md#d40) + [guides/65](../../docs/guides/65-run-forms.md)。

> 来源：[插件即产品决策卡](../../_backlog/_archived/settled_issues/2026-11-01-plugin-as-product.md)、[落地计划](../../_backlog/_archived/research/plugin-as-product/2026-11-01-landing-plan.md)。
> 当前合同 = [guides/65](../../docs/guides/65-run-forms.md)、[pack README](../../packages/deep-research-pack/README.md)、[`_dist/安装手册.md`](../../_dist/安装手册.md)；决策 = [D38](../../docs/decisions.md#d38)、[D39](../../docs/decisions.md#d39)。

## 决定

- **产品形态 = DSH 插件（bundle）+ 可选启动器 + Host 工作区注册（D38/D39）。** 包仍是 bundle；
  主分发 = `dsh plugin --profile web add`（或专用 profile）→ 安装副本 scaffold 铺种子/团队层 →
  `DEEP_RESEARCH_WORKSPACE=<ws> dsh --profile web`；不要求全局安装。`dsh-deep-research` 是把这些步骤
  包成一条命令的可选便利，只调用 `dsh --profile`；不新增应用进程/应用 bin，不手写 profile，不直接调 `runProfile`。
- **产品 profile 默认 `deep-research`**；dev 镜像仍是 `research`（`--profile` 可覆盖）。默认共享用户
  `$DSH_HOME`；`--home` 是干净环境/试用的 escape hatch。
- **工作区解析** = `--workspace` → `DEEP_RESEARCH_WORKSPACE` → profile 设置 → TTY 询问；非 TTY 无值 fail-loud。
  已有研究契约/空目录直接用；非空项目默认 `<project>/research`；`--in-place` 用项目根；危险目录拒绝；
  已有 `.gitignore` 不静默改，`--gitignore-append` 才追加带标记块。
- **产物归属**：run bundle/方法库/归档/种子部署副本在用户工作区；包内 `workspace/` 是只读种子源；
  启动器设置只在 `$DSH_HOME/profiles/<p>/deep-research.launcher.json`（无秘密、可删，不写 patch/storage domain/
  localStorage）。Host 插件在 boot 时 async `workspaceRegistry.create(path, title)`，Web 首屏创建 blank Lead
  Session，`header.cwd` = 工作区。
- **首屏**：`conversation.input.dock` 起步卡（品牌/当前工作区/三步/凭据/换工作区），工作区有 `drt_*` 或
  会话有用户消息时收起；纯 client 渲染，不新增模型可见文本。
- **分发（D39）**：DSH 原生 `dsh plugin add` 为主；单包 + 所有 peer `optional`（launcher 全局安装不拉
  DSH peers；profile 安装仍从安装锚解析）；无 install hooks。`dsh-deep-research` bin 只作可选便利。
  `_dist/安装手册.md` 由 `scripts/dist/export-dist.mjs` 从 `scripts/dist/product-manual.md` 生成。

## 输掉的方案

- **包内放 profile 模板 / 手写 profile 目录**：DSH 无第三方 profile 模板扩展点；手写 `package.json` 能通过
  `existsSync` 但没有锁、没有 pnpm workspace/node_modules 契约，属代码巧合。
- **自有 app bin 调 `runProfile`**：Desktop 专用模式，超出第三方 DSH 合同与 `verify-application-entrypoints`
  allowlist。
- **把 `--workspace` 传给 `dsh`**：Web app 拒绝未知参数；替换 `web-startup` row 太脆。
- **默认产品私有 home**：分裂凭据/会话；profile 不是隔离边界。共享 home + `--home` 可选。
- **工作区手册只读注入**：`agent-instructions` 只从 cwd 链发现文件；另做 loader 属另一方案。种子是部署副本。
- **独立 launcher 包**：更干净但违反 D1；单包 + optional peers 已被 spike 证实可行。

## 实际跑过的验证

- **打包 spike**：不加 optional peers 时 `npm install --dry-run` 直接 `ERESOLVE`（registry rc.5 与包 rc.2 ranges
  混合）；加 `peerDependenciesMeta.optional` 后只装 1 个包；真实 `npm i -g --prefix` 下 preflight/scaffold bins
  正常链接；launcher bin 见下条。
- **Host boot + Web 首屏 spike**：临时 home/profile + 临时 `file://` Host 插件 + 真 Web；`SPIKE_REGISTERED`
  先于 `dsh web:`；全新 home + pack 的 blank Session `cwd` = 工作区、`agentPreset` = `lead`；浏览器
  `Orca | 工作区 ws | Deep Research Lead`，`pageerror` 为空。
- **完整装配 prototype**：`--from-default-profile web` → `plugin add file:<pack>` → `plugin add team@0.2.1-rc.2`
  → `scaffold --install-only` → Web；bundle list 顺序正确，种子全绿，首屏 Lead。
- **saved-session spike**：启动 `ws`、saved session 在 `ws2` → 打开 `ws2`；证实不能承诺自动切回启动工作区，
  首屏只做可见工作区指示/切换。
- **`node scripts/smoke/product-smoke.mjs` GREEN**：真 `dsh`/pnpm + 干净 home/workspace；profile 顺序、
  安装副本版本、种子、设置、幂等、危险目录、项目模式、`.gitignore`、包目录零写入、半装 fail-loud。
- **`node scripts/smoke/product-boot-smoke.mjs` GREEN**：真 launcher + Web + 浏览器；Orca/工作区标题/
  起步卡三步/Lead preset/composer；`workspace.json` 登记、blank Session `cwd` = 工作区、`agentPreset` = `lead`。
- **真实 `npm i -g` launcher bin**：`_dist/dsh-deep-research-pack-0.2.0.tgz` 全局安装只装 1 个包；`bin/dsh-deep-research -> scripts/launch.mjs`，`--help`/`--version` 正常。
- **`node scripts/smoke/release-smoke.mjs` ALL PASS**：tarball → 干净 profile → plugin add → preset-smoke
  安装域 5 角色真挂载 → remove 无痕 → 团队层保留 → 端口释放。
- **原生 web-profile 安装/启动 spike（2026-11-01）**：干净 home 下 `dsh plugin --profile web add file:<tarball>` → 安装副本 scaffold → `DEEP_RESEARCH_WORKSPACE=<ws> dsh --profile web`；bundle 顺序正确、种子落地、workspace 登记、浏览器首屏 Orca/工作区/Deep Research Lead/起步卡，pageerror 为空。
- **`pnpm verify` 全绿；`pnpm test` 1046 pass / 0 fail；`pnpm typecheck` 绿；`pnpm release:check` OK version=0.2.0。**
- **`node scripts/dist/export-dist.mjs` 全绿**：135 条目、preset 5/5、skill 11、模板 8、seed v0.2.0；
  `_dist/安装手册.md` 为安装/启动手册（DSH 原生安装/启动 + 隔离 profile + 可选 launcher + 数据/升级/卸载/离线）。

## 残余边界

- 真实 `npm i -g` 的 launcher bin 已验证：optional peers 下只装 1 个包，`dsh-deep-research --help`/`--version` 正常（2026-11-01 spike）。
- saved Session 自动切回启动工作区是 P1；P0 只保证新 home + 可见工作区指示/切换。
- 项目子目录的 sandbox 边界（agent 可读项目、写入留子目录）需用户接受；`--in-place` 才写项目根。
- 共享 `$DSH_HOME` 会显示其他 Workspace/Session；`--home` 隔离。团队层是 N2 experimental，离线需预置/缓存。
- Windows/Desktop/正式 npm 发布未承诺。
