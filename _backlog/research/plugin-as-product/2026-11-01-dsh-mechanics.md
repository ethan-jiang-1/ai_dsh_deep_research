---
topic: plugin-as-product
intent: 记录 vendor/dsh 源码核验到的 profile 装配、workspace 注册、Web 参数与 session cwd 机制，区分合同与代码巧合
---

# DSH 机制核验：产品 profile 能做什么、不能做什么

核验基线：`vendor/dsh/`（pin `687f282e86`，包版本 `0.2.1-rc.2`）。FAQ 26 的问答基线是 `0.2.1-rc.3`；本文涉及的 profile、workspace、Web 参数与 session 机制已逐条对照当前源码。标 **合同** = 文档/类型/测试明示；标 **实现** = 当前代码如此但无兼容承诺。

## 1. 第三方不能随包发 profile 模板（合同）

- shipped template 是代码里的硬编码表：`packages/boot/app-boot/src/profile.ts:179-195` 只有 `web` / `headless` / `acp` / `sdk` / `sdk-minimal` 五项。
- `--from-default-profile` 只接受这五个名字；未知名字抛错并列出合法值：`apps/cli/src/profile-boot.ts:114-130`。
- 对非 shipped 名字直接 `dsh --profile <new>` 不会自动建 profile：`loadProfile` 抛 `profile "<n>" does not exist; create it with 'dsh plugin --profile <n> add <package>'`（`packages/boot/app-boot/src/profile.ts:789-805`）。
- `dsh plugin --profile <n> add` 在 profile 不存在时会用 `DEFAULT_PROFILE_BUNDLES = ['@deepseek-ai/dsh-base']` 初始化（`packages/boot/app-boot/src/profile.ts:213`；`packages/boot/plugin-manager/src/operations.ts:544-556`）。base-only profile 起不了 Web。

**结论**：产品不能靠"包里放一个 profile 目录"让 DSH 自动识别。唯一受支持的装配路径是：

```sh
dsh --profile <product> --from-default-profile web --dump-config   # 首次，创建 web 模板 profile
dsh plugin --profile <product> add <pack-spec>                     # 装产品 bundle
dsh plugin --profile <product> add <team-layer-spec>               # 装团队机制层
```

启动器可以封装这三步，但必须调用 CLI，不能手写 profile 目录。手写 `package.json` 在实现上能通过 `existsSync(dir/package.json)`（`profile.ts:794`），但没有锁、没有 `pnpm-workspace.yaml`/`node_modules` 契约，属于代码巧合，不采纳。

## 2. `dsh plugin add` 怎么写 profile（合同 + 实现）

- `runPluginCommand` 在 profile 目录加文件锁、必要时 `initProfile`，再 `pnpm add`（`packages/boot/plugin-manager/src/operations.ts:544-556`）。
- 成功后的 `reconcile()` 重读 manifest，把**本次新加的依赖**中声明 `dsh.bundle` 的包追加到 `dsh.profile.bundles` 末尾（`operations.ts:88-113`）；没有 `dsh.bundle` 的依赖只作为普通 dependency 并给 warning；被移除的依赖从 bundle list 删除。
- `initProfile` 写 `name: dsh-profile-<n>`、`private: true`、空 dependencies、空 `cordis.patch.yml`、`pnpm-workspace.yaml`，不覆盖已有文件（`packages/boot/app-boot/src/profile.ts:262-281`）。
- bundle 名解析：安装锚优先，其次 profile（`profile.ts:714-725`）；import 解析 profile `node_modules` 优先，再走 `<profilesDir>/node_modules` 拦截层（`profile.ts:16-20`、`profile-resolution/resolver.ts:218-225`）。

**对本项目**：启动器按 pack → team layer 的顺序分两次 `add`，保证 bundle list 顺序可预期。若 profile 已有依赖但 bundle list 缺项（半装），`reconcile` 不会补；启动器必须读回 `dsh.profile.bundles` 并 fail-loud/重装，不能把 `add` 的 exit 0 当"已挂载"。

## 3. 产品启动器在 DSH 体系里算什么（合同边界）

- `docs/architecture.md` 的 application launch 一节：自定义插件组合仍是 profile + 有序 patch 文件，不是另一个可执行文件或内联应用树。
- `packages/boot/app-boot/README.md:32`：产品功能属于 profile bundle，不应新增 application bin。
- `verify-application-entrypoints` 只 allowlist `apps/cli`（`scripts/verify-application-entrypoints.ts:26-30`）。
- 唯一的"产品自有 profile"先例是 Desktop：`loadProfileDirectory(dir, installAnchor)` + `runProfile({resolvedProfile})`（`apps/desktop-host/src/index.ts:7-33`），是仓内 Electron carrier，不是第三方模式。

**对本项目**：启动器是**安装/装配包装器**，不是第二个应用：它只调用 `dsh`，运行时仍是 `dsh --profile`。不直接调 `runProfile`，不做自有 app bin，不改 DSH 入口 allowlist。

## 4. Web app 拒绝未知参数（实现，已验证）

- Web 的 flag family 只有 `--host` / `--no-open` / `--port` / `--public-url` / `--trusted-host` / `--tls-*`：`packages/bundle/web-app/src/startup.ts:59-81`。
- commander 默认拒绝未知 option；`parseCmdline` 捕获 `CommanderError` 后 exit（`packages/boot/cmdline/src/index.ts` 的解析路径）。实测 `--workspace /x` → `error: unknown option '--workspace'`。
- 可用替代：(a) 环境变量；(b) 按 id 替换 `web-startup` row 提供超集 parser；(c) 产品自己的 client onboarding。

**对本项目**：不要给 `dsh --profile <p>` 传 `--workspace`。启动器解析自己的 `--workspace` 后，用环境变量 `DEEP_RESEARCH_WORKSPACE` 把绝对路径交给 Host 插件；不替换 Web startup row（脆、跨版本易碎）。

## 5. Host 插件可以在 boot 时预登记工作区（合同 + 实现）

- `ctx.workspaceRegistry.create(path)` 要求目录已存在，realpath 规范化，按 canonical path 幂等（`packages/workspace/workspace/src/index.ts:231-243`）。
- 服务注入 `storageDomain` + `sessionPersistence`（`index.ts:176`）。
- Web Client 启动选择：若没有 saved selection，`recentWorkspace(items, sessions)` 选最近活跃/最新的 workspace，然后 `connectWorkspace(target)` 创建或复用 blank Session（`packages/client/ui-workspace/src/client/navigation.ts:461-472`、`553-572`）。
- 只有 Workspace 与 Session 列表都为空时才调 `workspace.initializeDefault`（`navigation.ts:462-466`）；Host 侧 eligibility 还要求 registry 空、无 archived id、无 live session、无 stored header（`workspace/src/index.ts:258-275`）。
- `initializeDefault` 的目录是 `<Documents>/deepseek-harness/default-workspace`；`documentsDirectory` 可覆盖（`packages/api/workspace-controller/src/default-directory.ts:77`、`default-workspace.ts:16`、`workspace-controller/src/index.ts:37-42`）。

**结论**：启动器不需要自己创建 Session。Host 插件在 boot 时 `workspaceRegistry.create(workspace)`，Web Client 首屏会选中它并创建 blank Session；Session 的默认 preset 由 bundle 的 `agent-preset-registry.config.default: lead` 决定（本包 `cordis.patch.yml` 已设）。Host 插件应返回 Promise，让 app-boot 等到注册完成再 commit ready，避开 webserver 已监听但注册未完成的窗口。

**风险**：若浏览器已有 saved Session，Client 会优先恢复该 Session（可能属于另一个 workspace）。首装/新 home 不受影响；多工作区切换需要 P1 的 client onboarding/notice。不能靠 Host 插件清浏览器 localStorage。

## 6. Session cwd 决定 sandbox 根与研究手册注入

- `SessionCommandController` 的默认 workspace 是 `process.cwd()`（`packages/api/session-controller/src/index.ts:163`）；Web 建会话时若给 `workspaceId`，Host 从 registration 取 canonical path 并 attach，`header.cwd` = 该路径。
- `workspace-write` 的 root = Session `header.cwd`，无 cwd 时用配置 fallback（`packages/sandbox/sandbox-policy`；FAQ 17 §模型工具）。
- `agent-instructions` 从会话 cwd 向上发现 `AGENTS.md`/`CLAUDE.md`，byte budget 内 broad-to-specific 注入（`packages/context/agent-instructions/README.md`）。它只认 cwd 链，不能从包内指定一个绝对路径作为手册文件。

**对本项目**：Session 必须建在工作区里（`workspaceId` 形态），否则驾驶舱读不到 run bundle、研究手册不注入、sandbox 根也不在工作区。`run-kickoff` 的既有实测（`dev/run-kickoff.mjs:128-138`）就是这条路径。

## 7. 包如何被解析：skill 路径与 patch baseUrl

- 各 preset 的 `skill-filesystem` 用 `createRequire(baseUrl).resolve('dsh-deep-research-pack/package.json')` 定位包内 `presets/<role>/skills`（`packages/deep-research-pack/presets/lead.patch.yml:44-47`，其余角色同构）。
- 这意味着包必须能从 patch 文件所在 profile 的 node_modules 链解析到；把 patch 文件复制到任意目录再用 `--patch` 挂载会解析失败。
- 发布形状：peerDependencies only、无 `dependencies`、无 install hooks（`tests/pack/package-contract.test.mjs:41-46`）。

**对本项目**：pack 必须安装进产品 profile（复制安装），不能靠 `--patch` 从仓内源码目录指向；启动器的 `file:<pack-dir>` 安装正好满足。若要做全局 launcher，需要单独处理 peer 安装（见[方案取舍](2026-11-01-architecture-options.md) §打包）。

## 8. 其他约束

- **profile 不是数据隔离**：同一 `$DSH_HOME` 下 Session、Workspace registry、凭据共享；不要承诺产品私有的 home。
- **patch 整对象替换**：启动器不要写 profile patch 去存工作区；产品设置放独立文件。
- **CLI 更新语义**：`dsh plugin` 改磁盘 composition；当前进程不会重组；启动器在 boot 前安装，天然避开"运行中替换 node_modules"。
- **首次启动 URL/token**：Web 启动横幅打印带 token 的 URL；启动器不解析 token，交给 `dsh` 正常输出/开浏览器。
- **会话组编码**：Session 持久化的项目目录 = `projectKey(cwd)`（`packages/session/session-persistence-jsonl/src/format.ts:207-245`）；不是任意 substring。dev 工具用同形实现，别扫 header。

## 9. 真机 spike（2026-11-01）

临时 home + 临时 Web profile + 临时 `file://` Host 插件（`inject: ['workspaceRegistry']`，`apply` 里 `create(env)`）+ 真 Web：

```text
SPIKE_ENV /tmp/dsh-product-boot/ws
SPIKE_REGISTERED /private/tmp/dsh-product-boot/ws 0d7e22fe-...
dsh web: http://127.0.0.1:3211/?token=...
```

- `workspace.json`：workspace path = `/private/tmp/dsh-product-boot/ws`，`sessionIds` 非空。
- Session header：`{"cwd":"/private/tmp/dsh-product-boot/ws","agentPreset":"lead"}`。
- 浏览器首屏：`Orca | 工作区 ws | Deep Research Lead | [composer]`，`pageerror` 为空。
- 先装 pack 前创建的旧 session 保留 `agentPreset: standard`（header 不可变）；全新 home + pack 的首个 session 才是 `lead`。

结论：Host boot 注册 → Web Client 首屏 blank Lead Session（cwd = 工作区）全链成立；竞态窗口由 async apply + appReady 规避，spike 未观察到 URL 先于注册。

## 10. 未知与待实测

- 真实 `npm i -g` 的 **launcher** bin（preflight/scaffold bin 已验证；launcher 加 bin 后补测 `--help`/`--check`）。
- 浏览器已有 saved Session 时，新工作区是否仍能被首屏选中（P0 只保证新 home + 可见工作区指示；P1 自动切换）。
- 团队层离线/registry 不可用；launcher 的补救文案。
- Windows / Desktop / 正式 npm 发布不在 P0。
