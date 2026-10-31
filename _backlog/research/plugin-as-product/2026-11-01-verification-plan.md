---
topic: plugin-as-product
intent: 设计产品形态的验收矩阵、证据档位与现有测试迁移，保证不是只改文档
---

# 验证计划：产品启动、首启工作区与仓库对齐怎么证

证据档位与命令正本 = [guides/60 §2](../../../docs/guides/60-dev-loop.md)；验收合同 = [evaluation.md](../../../docs/evaluation.md)。本文只给本产品形态的增量证据设计。

## 1. 要证明的六件事

1. **装配**：一次启动能从零得到 web+pack+团队层的产品 profile，且不重置已有用户 profile/patch。
2. **工作区**：启动器解析/询问工作区，拒绝危险目录，铺种子，并把绝对路径传给 Host。
3. **绑定**：Host 插件在 boot 时登记工作区；Web 首屏创建 blank Lead Session，`header.cwd` = 工作区。
4. **产物**：run bundle 相对工作区根；驾驶舱读得到；不写 `$DSH_HOME` 的 run 数据。
5. **幂等/升级**：重复启动不重复安装；包版本变化时更新 profile 副本；用户改过的种子不被静默覆盖。
6. **自包含**：安装态文本/脚本不依赖仓内 `dev/`、`scripts/`；`_dist` tarball 含 launcher 与 Host 插件。

## 2. 新增证据

### 2.1 `product-smoke`（L2，真装前置，先做）

分两层，避免把"需要网络/安装"的 smoke 报成 keyless 绿：

- **launcher 逻辑单测**（无网络）：fake `dsh` 记录命令序列；覆盖参数/工作区模式/profile 装配顺序/半装读回/设置读写/`--home`/危险目录/项目 `.gitignore` 行为。
- **`scripts/smoke/product-smoke.mjs`**（L2）：真实 `dsh` + pnpm；若缺团队层 registry/缓存或 pnpm，**exit 2**，不报绿。

在临时目录跑：

```text
TMP/
  home/                    DSH_HOME（空）
  bin/dsh                  指向 vendor/dsh 源码 CLI 的 shim（PATH 首位）
  workspace/               空工作区
```

步骤：

1. `PATH=<TMP>/bin:$PATH DSH_HOME=<TMP>/home node <pack>/scripts/launch.mjs --workspace <TMP>/workspace --profile product-smoke --check`（或 `--dry-run` 形态）→ 期望：profile 从 web 模板建立、pack/团队层进 bundles、种子落地、settings 写入。
2. 断言 profile manifest：`dsh.profile.bundles` 顺序 = base、web-app、pack、team；pack 安装副本版本 = pack 源版本；`cordis.patch.yml` 未被改写。
3. 断言工作区：`AGENTS.md`/`NODES.md`/`question-patterns.md`/`templates/run/`/`.gitignore`/`.dsh-research-seed.json` 在场；`method-library.md` 只在缺席时创建。
4. 再跑一次：无新增安装、无重写、exit 0（幂等）。
5. 负例：`--workspace $HOME` / `--workspace <pack>` / `--workspace <profile>` → 非零 + 可读补救；工作区已有别人的 `AGENTS.md` → 默认转 `<ws>/research` 或拒绝，不静默覆盖。
6. 半装负例：手工从 `dsh.profile.bundles` 移除 pack 但保留 dependency → 启动器读回并重装/报错，不能 exit 0 假绿。
7. 包目录零写入：启动前后对 `packages/deep-research-pack/{presets,workspace,scripts,cordis.patch.yml}` 做哈希/`stat` 对比，必须不变（`lib/` 是构建产物，允许构建时变化；smoke 不构建）。
8. `--help` / `--check` 不安装、不起 web。

### 2.2 `product-boot-smoke`（L2/L4-lite，keyless，第二步）

复用 `product-smoke` 的临时 home/workspace，真正启动 Web：

1. `launch.mjs --workspace <ws> --profile product-smoke --port <free> --no-open`；另跑一次无 saved-session 的干净浏览器上下文。
2. 从 stdout 解析 `dsh web:` URL；用 token 换 cookie。
3. 调 `workspace/list` 或 `/api/workspace/...` 断言 `<ws>` 已登记（canonical path 匹配）。
4. 调 `session/list` 断言存在 blank Session，`header.cwd == <ws>`，`agentPreset == lead`（或 registry default）。
5. 浏览器断言首屏：Orca 品牌、工作区路径/标题、起步三步（问问题/Lead 三问/右栏观察）、凭据提示、Lead preset、composer 可输入；不是空白困惑页。
6. 断言没有在 `<Documents>/deepseek-harness/default-workspace` 创建目录（临时 HOME 下检查）。
7. saved-session 用例：先在另一个 workspace 建 session，再启动到 `<ws>`；记录首屏实际选中项，断言有可见工作区指示/切换（P0 不要求自动切换）。
8. 停进程、回收端口、清理临时根。

这一步证明的是"装配 + 注册 + 绑定"的端到端，不需要模型调用。**2026-11-01 已用临时 profile + 临时 Host row + 真 Web 跑通**：`workspace.json` 含工作区，session header `cwd` = 工作区、`agentPreset` = `lead`，首屏 `Orca | 工作区 ws | Deep Research Lead`（[复核](2026-11-01-review-findings.md) §2.4）。`product-boot-smoke` 把这个临时 spike 固化成脚本；URL/token 解析复用 `client-load-smoke` 的工具。

### 2.3 单元/契约测试

| 测试 | 断言 |
|---|---|
| `tests/pack/launcher-args.test.mjs` | flag 解析、`--help`、未知 flag、`--workspace` 不转发给 dsh、`--profile` 覆盖、`--check` 不写盘 |
| `tests/pack/launcher-workspace.test.mjs` | 解析顺序（flag → env → settings → prompt）、危险目录拒绝、项目目录子目录模式、`--in-place`、`--root`、相对路径按 cwd 解析 |
| `tests/pack/launcher-project.test.mjs` | 非空项目默认 `<project>/research`、`--in-place`、已有 `.gitignore` 不静默改写、建议规则/`--gitignore-append` |
| `tests/pack/launcher-profile.test.mjs` | fake `dsh` 的命令序列（web 模板 → pack → team layer）、半装读回、版本/pnpm 前置 fail-loud、`--home` 环境 |
| `tests/pack/launcher-settings.test.mjs` | settings 读写原子性、损坏回退、不含秘密、profile 重置后缺失、路径守卫 |
| `tests/pack/workspace-boot.test.mjs` | env 缺席时零行为；env 在场调用 `workspaceRegistry.create(abs,title)`；非目录/失败不崩、log 可读；async apply 等注册完成 |
| `tests/pack/package-contract.test.mjs` | `files` 含 launcher + workspace-boot 产物；`bin` 含 `dsh-deep-research`；无 install hooks；**所有 peer optional**（含理由注释） |
| `tests/pack/data-plane-invariants.test.mjs` | 10 列数据卡新增启动器设置行；运行时零 home 写入的措辞与启动器例外分开 |
| `tests/run/run-driver-contract.test.mjs` | 允许产品 launcher 存在；dev 通道仍须经漂移门；不再把 boot-run 钉成"唯一合法启动" |
| 首屏（浏览器 smoke，非单测） | 品牌/工作区/起步三步/凭据提示/Lead preset/composer；有 `drt_*` 时收起；saved-session 不匹配有提示 |

### 2.4 既有测试迁移

| 现状 | 迁移 |
|---|---|
| `docs-consistency` 枚举 `research-workspace/` 根实体 | 改为枚举 pack `workspace/seed.json`（随包权威）；仓内目录只作 dev 断言，或保留但允许产品新增文件 |
| 多处从 `ROOT/research-workspace` 读手册/模板 | 改读 `packages/deep-research-pack/workspace/`（`pack-workspace-fresh` 已保证两份一致）；dev 专用测试才读仓内 |
| `data-plane-invariants` 同时断言两份手册 | 保留双份断言（同步门仍需要），但新增产品设置行的形状 |
| `hitl1-intake-samples` 读 `research-workspace/drafts/` | 移到 `tests/fixtures/`；该文件不是随包种子 |
| `replay-scene` 场景声明写死 `profile: research` / `workspace: research-workspace` | 允许外部/绝对工作区；dev 场景保留 repo 相对路径，新增临时工作区用例 |
| `session-log` 的 `findGroup` substring 测试 | 新增 `projectKey(cwd)` 单测（vendor `format.ts:207-245` 同形；spike 路径 `/private/tmp/dsh-product-boot/ws` → `--private-tmp-dsh-product-boot-ws--`）；保留旧 substring 作为 legacy 用例 |
| `run-dashboard` fixture 的 `--x-research-workspace--` | 新增任意路径组（如 `--data-acme-research--`），证明不依赖 substring |

## 3. 门禁与生成物

- **`package-contract`**：launcher 文件/ bin / **所有 peer optional**（spike 证实全局安装不拉 DSH peers）；禁止 install hooks / dependencies。
- **`row-deps`**：新 Host row 引用的 `@deepseek-ai/dsh-workspace` 进 `peerDependencies`。
- **`data-plane-invariants`**：数据卡 10 列与新增行；运行时零 home 写入措辞。
- **`dist-manual-version` + `export-dist` inventory**：`must` 列表加 `package/scripts/launch.mjs`、workspace-boot 构建产物；tarball 实际含 launcher。
- **`release-version`**：root/pack 版本镜像；产品化按 semver 至少 minor。
- **`doc-budgets`**：README/AGENTS 若需扩容，按处置序先下放/压缩，升顶同变更登记理由。
- **`md-links` / `md-anchors`**：新增文档相对链接必须可解析且目标 tracked；pack README 继续用 GitHub 绝对链接指向仓内 docs。
- **`workspace-contract` / `handbook-budget` / `pack-workspace-fresh`**：种子标题/内容改动同 diff 同步；手册字节不超 22,528-1024。
- **`backlog-liveness`**：本课题题名页/材料/issue 卡结构；`pnpm verify` 会查。
- **`evaluation` / `gate-ledger-sync`**：新增 smoke/门禁登记到 evaluation §L0/L2 与 `scripts/verify/context.mjs`。
- **`smoke-contract`**：新 smoke 加入闭集；不得把真模型工具误加入 keyless 集。

## 4. 证据矩阵（按子卡）

| 子卡 | 最小证据 | 说明 |
|---|---|---|
| 产品启动运行时 | launcher 单测（fake dsh）+ `workspace-boot` 单测 + `product-smoke`（L2）+ `package-contract` | keyless 逻辑 + 真装装配；证明 profile/幂等/守卫/注册 |
| 产品首屏体验 | `product-boot-smoke` 浏览器断言 + `client-load-smoke` 复用 + 中英文案 | 真浏览器；证明首屏不是空白困惑页 |
| 产品文档与分发 | `pnpm verify`（doc-budgets/md-links/entry-chain/backlog-liveness）+ `_dist` 重导出 + `dist-manual-version` | 文档与 tarball 一致 |
| 仓库对齐与证据 | `product-smoke` + `product-boot-smoke` + 迁移后的 `pnpm test` + `release-smoke`（安装域） | 证明产品面与开发面都绿 |
| 决策卡 | 上述证据汇总 + 用户首启体验 | 业务验收归用户 |

## 5. 红先绿后

新门禁/新契约测试按仓库纪律先看红：

- 先写 launcher 单测（fake dsh 的期望命令序列），再实现启动器；
- 先写 `workspace-boot` 单测（env 未设时零调用），再实现 Host；
- 先写 `package-contract` 的 launcher/bin/optional peers 断言，再加文件；
- Host boot + Web 首屏 spike 已跑通（2026-11-01）；先把它固化成 `product-boot-smoke`，再扩展首屏/多工作区断言；
- 先写 `dist-manual-version`/inventory 的 launcher 断言，再改生成器；
- 每道新门禁在 `gates-smoke` 有注入案例（若适用），否则在 `tests/` 有反证。

## 6. 不证明什么

- `product-smoke`/`product-boot-smoke` 不调用模型，不证明研究报告质量；L3/L4 仍由真实 run 与用户验收承担。
- 首屏 smoke 证明"信息在那里、可读、可开始"，不证明真实用户的信息密度手感；后者由用户首启验收。
- 不证明 Windows；不证明 npm 官方 registry 发布；不证明 Desktop。
- 不证明"多工作区自动切换"；P0 只保证新 home 首装 + 可见工作区指示，自动切换是 P1。
- 不证明团队层在离线/无 registry 环境可用；沿用现有离线矩阵与 N2 披露。
- 不证明项目子目录的 sandbox 边界符合用户预期；这是用户拍板的 UX/边界决定。
