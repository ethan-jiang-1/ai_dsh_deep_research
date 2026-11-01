---
status: 推敲中
opened: 2026-11-01
---

# 推敲：产品启动运行时——launcher、产品 profile 与工作区注册

> 立卡：2026-11-01 ｜ 状态：推敲中（用户 2026-11-01 授权静默自主执行） ｜ 类型：Task ｜ 结论倾向：现在做——运行时 MVP 方案已选定，待父卡确认 profile 名/工作区 UX/home ｜ 可关闭：否
>
> 落地位置：**S1（A1 骨架）+ S4（硬化）**；依赖/顺序见[落地计划](../research/plugin-as-product/2026-11-01-landing-plan.md)。
> 落地记录（2026-11-01）：launcher/`scripts/lib/launcher/*`/`src/workspace-boot/`/设置/optional peers/打包 + fake-dsh 单测 + `product-smoke` 已交付；证据 = 父卡 §落地记录 + [Note](../../notes/implemented/2026-11-01-plugin-as-product.md)。

**问题与期望结果：** 本包今天只有 `preflight` 与 `scaffold` 两个部署 bin；用户必须自己建 profile、装包、铺工作区，再手动 `cd` 起 `dsh`。期望：包内新增一个产品启动器与一个 Host 工作区注册插件，使用户用一条命令进入产品 profile，并让 Web 首屏的 Lead Session 建在用户指定工作区；启动器自身要能处理首次安装的耗时、失败与版本前置，而不是把 pnpm/host 错误直接甩给用户。

**当前情况：**

- DSH 无第三方 profile 模板；唯一受支持装配 = `--from-default-profile web` + `dsh plugin add`（见[机制核验](../research/plugin-as-product/2026-11-01-dsh-mechanics.md)）。
- Web app 拒绝未知参数；工作区必须经环境变量交给 Host，不能走 `--workspace` 命令行。
- `scaffold.mjs:569-609` 已有团队层 ensure 与版本派生；`preflight.mjs` 已有 profile/工作区检查；`workspace-guard.mjs` 已有危险目录判据；`install-anchor.mjs` 已有运行中 DSH 定位。全部复用。
- `src/index.ts` 是零行为 Host 空壳；本卡新增独立 row，不改变空壳职责。
- 打包 spike（2026-11-01）：不加 optional peers 时全局安装 ERESOLVE；加了之后只装本包 1 个依赖、bins 正常。**optional peers 是必需条件**，不是可选项。
- 未决：profile 默认名（父卡 Q1，推荐 `deep-research`）、工作区 UX（Q2）、项目目录默认（Q3）、home 策略（Q5）、种子副本（Q7）。

**下一步：** 父卡拍板后，先补真实 `npm i -g` 的 launcher bin spike（Host/Web 已证），再按 §范围 落地。若 Q4 选独立 launcher 包，先由父卡立新 D 号。

## 范围

**做：**

1. `packages/deep-research-pack/scripts/launch.mjs`（bin `dsh-deep-research`）与 `scripts/lib/launcher/*`：
   - 自己的 flag：`--workspace`、`--profile`（默认 `deep-research`）、`--home`（可选，隔离产品 home）、`--check`、`--no-seed`、`--in-place`、`--root`、`--gitignore-append`、`--help`、`--version`；其余 flag 透传给 `dsh`（`--port`/`--no-open`/`--host` 等）。
   - 工作区解析：flag → `DEEP_RESEARCH_WORKSPACE` → profile 设置文件 → TTY 询问；非 TTY 无值 fail-loud。
   - 工作区模式：已有研究契约直接使用；空目录铺种子；非空项目无契约默认 `<dir>/research`；危险目录拒绝；已有 `.gitignore` 不静默改，打印建议规则，`--gitignore-append` 才在用户确认后追加（或只打印不写，按父卡 Q3 的最终 UX）。
   - profile 装配：不存在则 `--from-default-profile web`；已有则只补缺；Web-backed 检查；pack/team layer 版本读回；半装 fail-loud/重装。
   - 前置检查：`dsh --version` 满足 `engines.dsh`；`pnpm` 在场（团队层安装需要）；`dsh` 能在 PATH 或安装锚解析；失败给补救，不进入半装。
   - 首装进度：打印清晰阶段（装配 profile / 安装 pack / 安装团队层 / 铺种子 / 起 Web），失败时给可复跑命令；不把 pnpm 长输出直接淹没用户（保留日志路径）。
   - `scaffold --workspace <w> --profile <p> --install-only` ensure；日常启动只做 `--check`。
   - spawn `dsh --profile <p>`，cwd = 工作区，env `DEEP_RESEARCH_WORKSPACE` = 工作区；信号转发；透传退出码；启动前打印产品名、profile、工作区与 URL 提示。
   - `--home`：设置子进程 `DSH_HOME` 与 launcher 的 profile/设置路径；默认不改变用户 `$DSH_HOME`。
2. `packages/deep-research-pack/src/workspace-boot/index.ts` + `cordis.patch.yml` 行 `research-workspace-boot`：
   - `inject: ['workspaceRegistry']`；async `apply`；env 缺席零行为；env 在场 `create(abs, title)`；失败 log 清楚。
   - 工作区标题建议 `Deep Research — <basename>`（或产品设置里的 displayName）；已有 registration 不改标题。
3. `package.json`：`bin`、`files`（launcher/workspace-boot 构建产物）、`peerDependencies` 加 `@deepseek-ai/dsh-workspace`；**所有 peer 加 `peerDependenciesMeta.*.optional: true`**（全局 launcher 分发必需；profile 安装仍从安装锚解析）。
4. 产品设置文件 `$DSH_HOME/profiles/<p>/deep-research.launcher.json`：原子读写、损坏回退、无秘密、路径守卫（只写 profile 目录内）。
5. `scripts/dist/export-dist.mjs` inventory 加 launcher/workspace-boot；`tests/pack/package-contract` 扩断言（bin/files/optional peers/无 install hooks）。
6. Spike 状态：
   - **Host boot 注册 + Web 首屏已证**（2026-11-01）：Host 注册先于 Web URL；全新 home + pack 的首个 blank Session `cwd` = 工作区、`agentPreset` = `lead`；证据 = [复核](../research/plugin-as-product/2026-11-01-review-findings.md) §2.4、[运行时规格](../research/plugin-as-product/2026-11-01-runtime-implementation-spec.md) §6.1。
   - **真实 `npm i -g`**：optional peers 下只装 1 个包、preflight/scaffold bin 已链接；launcher bin 加完后补测 `--help`/`--check`。若失败，回父卡 Q4 评估独立 launcher 包。

**不做：**

- 不做 Web 内完整 onboarding/自动工作区切换（P1；首屏卡片归子卡 D）。
- 不替换 `web-startup` row；不给 dsh 传 `--workspace`。
- 不直接调 `runProfile`；不新增应用 bin。
- 不改研究角色/preset/驾驶舱内容。
- 不默认强制产品私有 home；共享 `$DSH_HOME` 是默认，`--home` 是 escape hatch。
- 不做产品自己的安装钩子（preinstall/postinstall/prepare）；装配只在 launcher 显式调用时发生。

## 方案与取舍

| 决策 | 选择 | 理由 |
|---|---|---|
| profile 装配 | CLI 三步，封装在 launcher | 唯一受支持；不手写 profile |
| 工作区传参 | 环境变量 `DEEP_RESEARCH_WORKSPACE` | Web app 拒绝未知参数；不改 host row |
| 注册时机 | Host async apply，boot ready 前 | 避开 webserver 已监听/注册未完成窗口 |
| Session 创建 | 交给 Web Client（blank Lead） | 复用 `recentWorkspace` + registry default；不越权建会话 |
| 设置存储 | profile 目录小文件 | profile-local；不写 patch；不新增 storage domain |
| 包形态 | 单包 + bin + 全部 peer optional | spike 证实；不违反 D1；profile 安装不受影响 |
| 项目目录 | 默认 `<dir>/research` | 不污染项目根；`--in-place` 显式覆盖；sandbox 边界写入文档 |
| 首屏工作区 | P0 可见指示/一键切换；P1 自动选中 | saved Session 可能抢首屏，不能假装自动 |
| home | 共享 `$DSH_HOME` 默认；`--home` 可选 | 凭据/会话连续；不假装 profile 隔离 |

## 验收标准

1. 干净 `DSH_HOME` + 空工作区：`dsh-deep-research --workspace <tmp>` 自动建立 web+pack+team profile、铺种子、起 Web；首屏 blank Session 的 `header.cwd` = 工作区，`workspaceRegistry` 有登记（spike + product-boot-smoke 证明）。
2. 重复执行：不重复安装、不重写用户文件、exit 0。
3. 危险目录（HOME/DSH_HOME/pack/profile 及其祖先/内部）：非零、消息可读、给补救。
4. 非空项目目录：默认 `<dir>/research` 并打印说明；`--in-place` 用项目根；两者都有测试；已有 `.gitignore` 不被静默改写，建议规则可见。
5. 半装 profile（dependency 在、bundle 不在；或版本旧）：读回并重装/报错，不 exit 0 假绿。
6. 版本/pnpm 前置：`dsh --version` 不满足 `engines.dsh` 或 pnpm 缺席时，在安装前 fail-loud，给补救；不产生半装。
7. `--check` 不安装、不起 web；`--help` 可用；未知 flag 不误转发给 dsh；`--home` 的 profile/设置/子进程环境一致。
8. `workspace-boot` 单测：env 缺席零调用；env 在场调用一次 `create(abs,title)`；失败不崩、log 可读；async apply 等待注册完成。
9. `package-contract`：files/bin/所有 peer optional/无 install hooks；`export-dist` tarball 含 launcher 与 workspace-boot；真实 `npm i -g` bin 可用。
10. `product-smoke`（L2，真装前置，缺前置 exit 2）绿；`workspace-boot` 单测绿；`pnpm verify`/`pnpm test` 绿。
11. 文档同 diff：pack README §部署/数据卡、`_dist` 生成器、README 产品门面（与子卡 B 协同，不重复改）。

## 依赖与风险

- 依赖父卡 Q1/Q2/Q3/Q5 拍板；依赖子卡 C 的 `product-smoke` 接口（可先定接口再并行）；依赖子卡 D 的首屏卡片（launcher 只负责起 Web，首屏归 D）。
- 风险：Host 注册与 webserver 竞态已由 spike 证实（注册先于 URL；async apply + appReady）；saved Session 抢首屏（P0 可见提示，不假装自动）；真实 launcher `-g` bin 待补；项目子目录 sandbox 边界需用户接受；团队层离线/registry 不可用。
- 本卡不授予实施授权；父卡拍板后开工。
