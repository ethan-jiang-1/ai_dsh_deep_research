---
topic: plugin-as-product
intent: 给出产品形态的候选架构、取舍与推荐落地形状，供父卡拍板
---

# 方案与取舍：launcher + 产品 profile + 用户工作区

## 0. 一句话方案

> 当前计划的正本 = [父卡](../../settled_issues/2026-11-01-plugin-as-product.md)；本文记录方案取舍与理由，父卡拍板后以父卡为准，本文不单独演进。

包仍然是一个 bundle；包内新增一个**启动器**（安装/装配包装器）和一个**工作区注册 Host 插件**。启动器负责把产品 profile 装配出来（web 模板 → 本包 → 团队层），把用户选定的工作区铺好种子，然后调用 `dsh --profile`；Host 插件在 boot 时把工作区登记进 `workspaceRegistry`，Web Client 首屏在该工作区创建 blank Lead Session。运行时仍是 DSH，run bundle 落在用户工作区。

```text
$ dsh-deep-research --workspace ~/projects/acme/research
  │
  ├─ ① 解析工作区（flag → env → 已保存 → 询问；见 §3）
  ├─ ② 装配产品 profile（首次：web 模板 → pack → 团队层；见 §4）
  ├─ ③ 铺工作区种子 + 安装验收（scaffold --install-only；见 §5）
  ├─ ④ spawn `dsh --profile research`（cwd = 工作区，env DEEP_RESEARCH_WORKSPACE = 工作区）
  │      ├─ Host 插件 workspaceRegistry.create(工作区)（async apply，boot ready 前完成）
  │      ├─ Web Client 首屏选中工作区 → 创建 blank Session（default preset = lead）
  │      └─ Session header.cwd = 工作区 → sandbox 根 / 手册注入 / 驾驶舱读取面一致
  └─ ⑤ 产物：<工作区>/drt_<slug>/…（run bundle，不另建 artifact root）
```

## 1. 三条不变量

1. **运行时无第二进程**：启动器只做装配与 spawn，不在 DSH 之外维护会话/工具/模型循环；不新增 application bin，不直接调 `runProfile`。
2. **一个事实一个家**：插件内容在包内；工作区数据在工作区；DSH 状态在 `$DSH_HOME`；启动器设置只在产品 profile 目录的一个小文件。
3. **工作区根 = Session header.cwd**：不引入"artifact root ≠ workspace root"的第二概念；run bundle、方法库、种子、回执全部相对工作区根。需要项目子目录时，工作区根就是那个子目录。

## 2. 产品 profile 的装配

**推荐：CLI 装配，启动器封装**（唯一受支持路径，见[机制核验](2026-11-01-dsh-mechanics.md) §1）。

```text
ensureProfile(profile, packDir):
  if ~$DSH_HOME/profiles/<profile>/package.json:
     dsh --profile <profile> --from-default-profile web --dump-config
  read manifest
  if bundles lacks @deepseek-ai/dsh-web-app:  fail（不是 Web profile；换名或重建）
  if bundles lacks dsh-deep-research-pack or installed version != packDir.version:
     dsh plugin --profile <profile> add file:<packDir>
  if bundles lacks team-layer or version != running DSH version:
     dsh plugin --profile <profile> add @deepseek-ai/dsh-experimental-agent-team-profile@<version>
  read back: bundles order, installed versions, effective dump
```

要点：

- **不手写 profile 目录**：手写 `package.json` 能通过 `existsSync`，但没有锁、没有 pnpm workspace/node_modules 契约；属于代码巧合。
- **不重置已有 profile**：`--from-default-profile` 会删除原 dependencies 与用户 patch；只在 profile 不存在时调用。已有 profile 只补缺 bundle。
- **profile 名默认 `deep-research`**（产品身份清楚；与开发镜像 `research` 分开，避免 launcher 误改开发 profile；`--profile research` 兼容旧用户）。若目标名是 shipped 名（`web` 等）或已有 profile 不是 Web-backed，拒绝并给补救；不静默改用户组合。
- **bundle 顺序**：web 模板（base→web-app）→ pack → team layer。分两次 `plugin add`，顺序可预期；`reconcile` 只追加新依赖对应的 bundle，不会修复半装，启动器必须读回并 fail-loud/重装。
- **团队层**：N2 experimental，版本必须匹配运行中的 DSH；复用 `scaffold` 的版本派生逻辑，不装未钉版最新层。团队层在 profile 的 dependencies/bundles 里，卸载 pack 不会自动删；卸载说明要单列。
- **升级**：启动器比较自身包版本与 profile 安装副本版本；不同则先 `dsh plugin add file:<packDir>`（运行前，无 live 进程），再按需 `scaffold --check/--upgrade`。不静默覆盖用户改过的种子。

## 3. 工作区解析与模式

### 3.1 解析顺序（推荐）

1. `--workspace <dir>`（启动器自己的 flag；不会传给 dsh）。
2. `DEEP_RESEARCH_WORKSPACE` 环境变量（脚本/桌面快捷方式）。
3. 产品设置里保存的上次工作区（`$DSH_HOME/profiles/<p>/deep-research.launcher.json`）。
4. 启动时询问（TTY），把当前目录作为建议默认值展示，但不自动接受；答复写入产品设置。
5. 无 TTY 且以上都没有：fail-loud，打印三种指定方式；绝不静默落到 Documents 默认目录。

不把"当前目录"直接当默认值，是为了避免 `cd ~ && dsh-deep-research` 把 HOME 当工作区，也避免 `cd 某个代码仓 && dsh-deep-research` 在用户没确认时污染项目。用户可以用 `--workspace .` 显式表达。

### 3.2 工作区模式（按目标目录内容判定）

| 模式 | 判定 | 行为 |
|---|---|---|
| **已有研究工作区** | 含 `.dsh-research-seed.json`，或 `AGENTS.md` + `NODES.md` 同时在场 | 直接用；启动器跑 `scaffold --check`，stale 时提示 `--upgrade`，不自动覆盖 |
| **空/新目录** | 不存在或空目录 | 直接用；`scaffold` 铺种子 |
| **项目目录（无研究契约）** | 非空，且没有研究契约文件 | 默认用 `<dir>/research` 作为研究工作区；不碰项目文件；打印一行说明。`--in-place` 显式要求用 `<dir>` 本身；`--root <dir>` 显式指定研究根 |
| **危险目录** | HOME / DSH_HOME / pack / profile 本身、祖先或内部 | 拒绝并给补救；复用 `workspace-guard.mjs` 的判据 |

项目目录模式的意义：用户说"在我的项目里做研究"时，产品不把 18KB 手册和 `drt_*` 铺到项目根，而是放进 `<project>/research/`。Session cwd = `<project>/research`，sandbox 根 = 该子目录；项目文件可读（读取不受写入 fence 限制），但研究写入留在子目录。若用户就是要 agent 在项目根读写，用 `--in-place`，并接受手册/种子写在项目根。

### 3.3 工作区注册（Host 插件）

新增一个 Host 插件（建议独立 row `research-workspace-boot`，不要塞进现有空壳 `src/index.ts`）：

```ts
export const inject = ['workspaceRegistry']
export async function apply(ctx) {
  const raw = process.env.DEEP_RESEARCH_WORKSPACE
  if (!raw) return                      // 手动装进已有 profile 的旧用法不受影响
  const path = resolve(raw)
  await statDirectory(path)             // 必须是已存在目录
  const ws = await ctx.workspaceRegistry.create(path)   // 按 canonical path 幂等
  ctx.logger.info(`deep-research workspace: ${ws.path}`)
}
```

- `apply` 返回 Promise，app-boot 等到注册完成才 commit ready；避免 webserver 已监听、workspace 未登记的窗口。
- 不创建 Session：Web Client 的 `restoreSelection` 会选 recent workspace 并 `connectWorkspace`，创建/复用 blank Session；默认 preset 由 bundle 的 `agent-preset-registry.default: lead` 决定。
- 失败时 log error（不静默回退 Documents）；启动器在 spawn 前已经验证目录，故这是防御性检查。
- 不加 storage domain、不写浏览器存储、不新增 session event（保持 `data-plane-invariants` 承诺）。

### 3.4 产品设置文件

- 位置：`$DSH_HOME/profiles/<profile>/deep-research.launcher.json`。
- 内容：`{ "schemaVersion": 1, "workspace": "<absolute>", "updatedAt": "<ISO>" }`；不含秘密。
- owner：启动器。写：原子 temp+rename；读：缺失/损坏时回退到询问，不崩。
- 生命周期：随 profile 删除；不随工作区走；不进 patch 链；不参与 DSH Settings。
- 例外说明：这是**部署工具**的状态，不是运行时插件账本；pack README 的"插件代码对 `$DSH_HOME` 零写入"要改写为"运行时插件代码零写入；启动器只写这一份产品设置文件"。

## 4. 种子与运行内容

- `scaffold --workspace <w> --profile <p> --install-only` 复用现有种子引擎：手册/NODES/判型库/模板/`.gitignore`、`method-library.md`（只在缺席时创建）、`.dsh-research-seed.json`、锁/临时件。
- 种子是**部署副本**：落地后归工作区/用户，可编辑；包内 `workspace/` 是只读源。两者由 `pack-workspace-fresh` 保持同步。产品化不改变这个所有权，只把"何时铺"从用户手动步骤变成启动器 ensure。
- 运行期内容（run bundle、archive、_abandoned、method-library）全部在工作区；不引入第二个 artifact root。
- 启动器首次/升级时跑 `scaffold`；日常启动只做 `--check`（或读 `.dsh-research-seed.json` 版本 + 契约文件在场）以省时间。stale 时打印 `scaffold --upgrade`，不自动覆盖用户改过的文件。
- 随包文本 de-repo：`dev/sync-pack-workspace.mjs`、`schema-scan`、`node-gate`、`run-accept` 等开发仓命令要么删除，要么明确标"开发仓才有；安装态按 `no machine audit (install-only)` 降级"。

## 5. 打包与分发

### 选项 A（推荐）：单包 + bin + optional peers

- 在现有 `dsh-deep-research-pack` 加 `bin: { "dsh-deep-research": "./scripts/launch.mjs" }`，`files` 加 `scripts/**`（已有）与启动器 lib。
- 全局安装（`npm i -g dsh-deep-research-pack` 或 tarball）只用于拿 launcher；启动器把包复制安装进产品 profile。
- **optional peers 是必需条件，不是可选项**：2026-11-01 spike 证明，不加 optional 时 `npm install` 直接 ERESOLVE（registry 的 rc.5 peers 与包的 rc.2 ranges 混合）；加上 `peerDependenciesMeta.*.optional: true` 后只安装本包 1 个依赖，bins 正常链接。profile 内的 `dsh plugin add` 用 pnpm `autoInstallPeers: false`，peer 仍从 DSH 安装锚解析，不受影响。`package-contract` 要钉住所有 peer optional + 理由。
- 仍待补测：真实 `npm i -g` 的全局 bin（不是本地 `.bin`）与 launcher 运行；若失败，再评估选项 B。
- 不新增 `dependencies`、不新增 install/postinstall/prepare 钩子（`package-contract` 硬约束）。

### 选项 B（备选）：独立 launcher 包

- 新增一个无 DSH peer 的极小包（bin + 一个 dependency 指向 pack）。
- 更干净地避免 peer 安装，但违反 D1"自写包 = 1 个"，要新 D 号；发布/版本/锁步都多一轴。A 的 optional peers 已验证可行，B 只在全局 bin 链接仍有问题时采用。

### 选项 C（不采纳）：手写 profile 目录 / 自有 app bin

- 手写 profile：代码巧合、无锁、无 pnpm 契约。
- 自有 app bin 调 `runProfile`：Desktop 专用模式，超出第三方合同，`verify-application-entrypoints` 也会拒绝。

## 6. 数据归属表（产品版）

| 事实 | owner | 位置 | 卸载后 | 可移植 |
|---|---|---|---|---|
| 角色/preset/skill/launcher/scaffold/preflight/seed 源 | 包 | profile `node_modules/dsh-deep-research-pack/` | 删 | 随包 |
| 产品 profile（composition + 团队层依赖） | 启动器创建 / DSH 拥有格式 | `$DSH_HOME/profiles/<p>/` | 保留或显式删 profile | 随 profile（重装重建） |
| 启动器设置（上次工作区） | 启动器 | `$DSH_HOME/profiles/<p>/deep-research.launcher.json` | 随 profile 删 | 随 profile |
| 工作区种子（手册/NODES/模板/.gitignore） | 落地后用户 | `<workspace>/…` | 保留 | 随工作区 |
| 方法库 | 用户 | `<workspace>/method-library.md` | 保留 | 随工作区 |
| run bundle / archive / _abandoned | 用户 | `<workspace>/drt_<slug>/…` | 保留 | 随 bundle |
| 种子状态账本 | 插件 | `<workspace>/.dsh-research-seed.json` | 保留 | 随工作区 |
| Workspace registration | DSH | `$DSH_HOME/storages/workspace.json` | 不自动删 | 仅本机 |
| Session 历史 | DSH | `$DSH_HOME/sessions/` | 不自动删 | 仅本机 |
| 凭据 | DSH/provider | `$DSH_HOME/.credentials.yaml` / env | 不自动删 | 仅本机（不导出） |
| 浏览器侧栏布局 | vendor/browser | localStorage | 清站点数据 | 仅本机 |

## 6.5 首屏体验与共享 home

产品不是"起一个空白会话"。首屏至少要让用户知道：

- 这是 Deep Research（品牌/标题）；
- 当前工作区是哪个（vendor 的 `conversation.hero.workspace` 会显示 Workspace 标题；Host 可用 `create(path, title)` 给产品化标题）；
- 从哪开始（问一个研究问题；Lead 会先问三问，不是马上开跑）；
- 右栏「研究状态」是过程观察面，「终稿」是交付面；
- 凭据是否就绪（没有 key 也能用账号登录；不硬拦）。

实现优先用现有 client slot（`conversation.hero.brand.mark` 已有 Orca、`conversation.hero.workspace` 是 vendor picker、`conversation.input.dock` 可放全宽起步卡、`conversation.hero.options` 可放紧凑提示），不新增模型可见事实、不做皮肤。起步卡只在工作区还没有 `drt_*` 时显示（client 已能读 `remote.workspaceFiles`），不需要 localStorage/新账本。

**共享 home**：默认用用户 `$DSH_HOME`（凭据/会话连续）；Web UI 会列出该 home 下所有 Workspace/Session，不只是产品的。这是 DSH 的语义，不能假装 profile 隔离。需要干净产品环境时用 `--home <dir>`（P1）；不在默认路径上偷偷建私有 home。

**已保存 Session**：浏览器有 saved selection 时，Client 会优先恢复它，可能打开在另一个 Workspace。P0 必须给出可见的工作区指示/一键切换；自动选中 launch workspace 是 P1，不能把"新 home 首装"的保证说成"任何情况都自动选中"。

## 7. 与既有合同的关系

- **D17/D28 不变**：harness 只读、run bundle 是变量容器；只是 run bundle 的根从"仓内固定目录"泛化为"用户选择的工作区"。
- **D18 不变**：驾驶舱仍是观察面 client 有界例外；新增 Host 工作区注册是产品启动面，不是第二处 UI 套件。
- **D21 需改**：意图分流第 1 行从"run-driver"改为"产品启动器"，开发通道单独一行；这是产品化最直接的用户可见变化。
- **D7 不变**：包仍是配置为主；launcher/workspace-boot 是部署与启动面，不是研究循环。需要在 D38 里明确这不算"自写研究引擎"。
- **guides/62 的 "Nothing is both"**：包仍是 bundle；launcher 在运行期装配 profile，不把 profile 写进包 manifest。文档要写清"装配器 ≠ 第二种 manifest"。

## 8. 需要拍板的分叉

| 分叉 | 推荐 | 备选 | 影响 |
|---|---|---|---|
| 产品 profile 默认名 | `deep-research`（产品身份、避开 dev 镜像） | `research`（连续、少改；但 launcher 可能误碰开发 profile） | 文档量、老用户迁移 |
| home 策略 | 共享 `$DSH_HOME`（凭据/会话连续） | `--home` 产品私有 home（干净但需另配凭据） | 首屏是否混入其他 DSH 会话 |
| 首启工作区 UX | flag/env/已保存 + TTY 询问 | 也在 Web 内做 onboarding（P1） | 首版工作量与双击启动体验 |
| 首屏体验 | P0 做起步卡 + 工作区指示 | 只靠 DSH 默认空白会话 | 用户是否知道从哪开始 |
| 项目目录默认 | `<project>/research` 子目录 | 只用专用工作区；`--in-place` 才碰项目根 | 是否真正"在用户项目里"；sandbox 边界 |
| 打包 | 单包 + optional peers（spike 已验证） | 独立 launcher 包 | D1、发布轴、全局安装体验 |
| 实施范围 | 四张子卡按序 | 只做启动器 + 首屏 + 文档，dev 对齐延后 | 首次可用时间 vs 仓库一致性 |
