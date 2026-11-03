# 65 · 运行形态合同：DSH 原生安装、custom profile、工作区与移交

> 层：指南（当前合同）。回答“这个 bundle 以什么形态运行、六轴谁定、数据归谁、怎么装/升级/移交、
> 用什么证据证明”。
> 用户安装步骤 = [`_dist/安装手册.md`](../../_dist/安装手册.md)；包合同 = [pack README](../../packages/deep-research-pack/README.md)；
> 开发操作 = [guides/60](60-dev-loop.md)；入库/跨环境 = [guides/63](63-git-boundary.md)；版本与发布 = [guides/64](64-release-versioning.md)。
>
> **编号消歧**：本文 M1/M2/M3 = 运行形态（安装 / 独立开发 / 移交），不是 [evaluation §3](../evaluation.md) 的里程碑 M1/M2/M3+；跨文档引用写「运行形态 M1」。
> **术语来源**：`六轴` 借用 `deepseek-harness/_faq_on_digested/26_harness-release` 的检查表装置（该语料明说
> 不是对象模型，vendor 无此词）；本仓只用它做 owner 检查，不冒充 DSH API，也不自称“Harness 发行版”
> （runtime/app surface/lifecycle 的提供者是 DSH/用户，不是本包）。决定 = [D41](../decisions.md#d41)。

## 1. 运行形态

| 形态 | 谁在用 | 入口 | 边界 |
|---|---|---|---|
| **M1 安装形态** | 外部用户 | ① custom profile 首次由 CLI 引导（仅首次、破坏性）② `dsh --profile deep-research` 启动 ③ 应用内 Plugins 页装包 + 团队层开关；CLI 装包仅 Web 自动化/离线；首屏选项目目录 | 用户自己的 `DSH_HOME` + 自选工作区；包内容在包内，产物在工作区；**没有 launcher / scaffold / 自定义安装器** |
| **M1 互操作** | 已有 DSH Web/Desktop 的用户 | 把同一个 bundle 装进现有 profile（Plugins 页或显式 CLI） | bundle 自足，首屏照样问工作区；但没有 `deep-research` 的 profile 身份；Desktop 装进 `desktop` = 互操作 |
| **M2 独立开发形态** | 贡献者 / 本地验证 | 本仓 + `bash dev/bootstrap.sh` + `node dev/run-driver.mjs up --bootstrap` | 默认仓内 `runtime/harness-home` + `research-workspace/`；可用 `DSH_DEV_HOME` 指到仓外 |
| **M3 移交形态** | 交给另一人或另一台机器 | `scripts/dist/export-handoff.mjs`（源码）或 `export-dist.mjs`（插件） | 不是复制工作树；运行态/凭据/run 数据不随包 |

**决定：M1 安装形态为主。** 安装与启动全部是 DSH 命令；本包只多一个 custom profile 名
（`deep-research`）。自定义 profile 的建立只能用 CLI（DSH 没有 UI 建自定义 profile；CLI 对未知名
profile 只初始化 `dsh-base`——`--from-default-profile web` 是文档给的路径）。装包入口 = 应用内
Plugins 页；CLI 装包只作 Web 自动化/离线。本包不发明安装器。**安装步骤的 owner = [`scripts/dist/product-manual.md`](../../scripts/dist/product-manual.md)（生成 `_dist/安装手册.md`）**；
本页只写合同，不复制命令。

## 2. 六轴 owner

| 轴 | 本仓的决定 | 提供者 | 读回方式 |
|---|---|---|---|
| **运行时** | 用户自带 `dsh`（npm 全局或官方 Desktop）；本包只声明 `engines.dsh`，不提供/不升级/不签名运行时 | 用户 / DSH | `dsh --version`；安装前版本门（registry/path 预检；git/tarball 可装后判定并修复；boot 再检） |
| **profile** | 用户自建 custom profile `deep-research`；本包不发布 profile 目录；`desktop` 是 application-owned，`web` 等是 shipped template | 用户（本包给名字/步骤） | `$DSH_HOME/profiles/deep-research/package.json` 的 `dsh.profile.bundles` |
| **patch 层** | 包内 bundle patch 给默认值；profile/home/CLI 可覆盖；对目标 row 的 `config` 是整份替换 | 本包 + 用户 | `dsh --profile deep-research --dump-config`；`skippedBundles` |
| **app surface** | **Web**（本包 client 插件只注册 Web）；Desktop 仅互操作；headless/SDK/ACP 不在支持范围 | DSH | `dsh web:` URL / Desktop Plugins 页 |
| **Harness home 与数据** | `$DSH_HOME/deep-research/settings.json` + 用户工作区；sessions/credentials/Workspace registry 归 DSH | 本包 / 用户 / DSH | [pack README §Data](../../packages/deep-research-pack/README.md#data) 逐行 |
| **生命周期** | Plugins 页默认；CLI 面绑定；membership 变更重启；config-only 可 HMR；无命令级回滚；卸载只回收包与 patch 层 | DSH + 本包文档 | 三态 + `remove` + dump |

**完整** = 六轴都有明确 owner，没有一格写“默认应该有”。**可控** = 改任一条不用 fork DSH。
本仓六轴都有决定，但运行时、app surface、生命周期由 DSH/用户提供——这是“bundle + custom profile
的安装形态”，不是随包 runtime 的发行版。

## 3. profile 归属与配置层

| 归属 | 例子 | 谁来定 | 用户能改 | 本仓 |
|---|---|---|---|---|
| shipped template | `web`、`headless` | DSH | 可整体重置 | 仅作 profile 初始化模板 |
| custom profile | `deep-research` | 用户（本包给名字/步骤） | 可覆盖 patch、增删 bundle | **本仓的 M1 主路径** |
| application-owned | `desktop` | 官方 Desktop | 不经 CLI profile lookup | 不占用；只作互操作 |

**配置层从低到高**：Config schema 默认值 → bundle patch（本包默认值）→ profile patch（用户/设置页）
→ home patch（`$DSH_HOME/cordis.patch.yml`）→ CLI `--patch` → app args/env/credentials → 客户端状态。
后层赢；patch 对目标 row 的 `config` 是**整份替换**，不是字段合并。只写 `port` 会丢 `host` 等必填
字段；要改一项时要么写全，要么只覆盖非必填字段。row 保留 `!!js` 表达式时，`--port` 等 app 参数
才能压过 config；用户 patch 换成字面值后参数会被静默忽略。

**设置归谁**：默认值在 bundle patch；Settings UI 写 profile patch（只有 `.volatile()` 字段可见）；
机器级偏好在 home patch；本次诊断用 `--patch`。本包的 deep-research 设置文件
（`$DSH_HOME/deep-research/settings.json`）只放工作区/上次会话，不是 DSH 全局设置，也不是第二套
DSH Config。凭据走 env/credentials，不进 profile patch。

## 4. Harness home 与数据

每份持久事实按 [pack README §Data](../../packages/deep-research-pack/README.md#data) 的十字段记录：
`Fact / Owner / Authority / Source / Mechanism-path / Scope-key / Readers / Writers / Rebuildability /
Retention-deletion`。这些属性互不替代；不要给整份交付套一个标签。

**P/H/W 只是导航，不是 owner 模型**：P = 随包只读层，H = DSH home 状态，W = 用户工作区。真正的
owner/authority 以数据卡逐行为准；P/H/W 不能回答“谁写、能否重建、卸载留什么”。

**目录身份**：`header.cwd` 是 Session 的初始目录，也是 sandbox policy 的默认 workspace root；
`working_directory` 只改后续相对操作目录，不改 `header.cwd`、Workspace membership 或 sandbox
writable roots。`WorkspaceId` 是 DSH Workspace registration ID，不是路径、项目身份或权限 token；
只需起始目录时传绝对 `cwd`，要加入侧栏分组才传 `workspaceId`（二者不能同时传）。

**profile 不是隔离边界**：同一 `$DSH_HOME` 的 profile 共享 Session、Workspace registry、凭据与
其他 home 数据；要干净环境用独立 `DSH_HOME`。

## 5. 安装、升级、卸载

- **默认入口** = 应用内 Plugins 页（Web/Desktop 同一 UI；Desktop 管理 `desktop` profile，
  是互操作）。CLI `dsh plugin --profile` 面绑定：npm/source `dsh` 不能管理 `desktop`；Desktop
  自带 carrier 可以，但第三方文档不把它当用户路径。headless/SDK/ACP 没有 Plugins 页，用显式
  profile 走 CLI。
- **首次 profile**：`--from-default-profile` 只用于全新 profile/救援，是破坏性替换；已有 profile
  不要重复。CLI 对未知名 profile 只初始化 base。
- **装成功三态**：pnpm exit 0 → dependency 写入 → 进 `dsh.profile.bundles`；只有第三态让功能存在。
  无 `dsh.bundle.patch` 的包 CLI exit 0 但 roster 不变（warning），应用内以 `not-bundle` 失败并回滚。
- **重启**：bundle membership 变更必须重启；只改 profile/home patch 在 HMR 开启时可能即时生效。
- **回滚**：没有命令级回滚；回退 = 重装旧 exact 版本，旧包必须满足运行中 DSH 的 `engines.dsh`。
- **卸载**：只移除包与 patch 层；工作区、方法库、deep-research 设置文件、Session、凭据、
  Workspace registration 都保留；显式删 profile/设置目录才清。
- 命令、前置与故障排查 = [`scripts/dist/product-manual.md`](../../scripts/dist/product-manual.md)（源；生成 `_dist/安装手册.md`）。

## 6. 工作区

**解析顺序**（每次启动）：`DEEP_RESEARCH_WORKSPACE`（本次覆盖）→ `$DSH_HOME/deep-research/settings.json`
→ 首屏 onboarding 询问。

- 没有 CLI 询问、没有 launcher；询问是首启的一部分。
- GUI 记住上次选择用浏览器 localStorage 提示键（设备级）；权威仍是 DSH Workspace registry。
- 选 `<dir>` 就是 `<dir>`；像项目时首屏建议 `<dir>/research`，不静默改写。
- 危险目录（HOME / DSH_HOME / 安装树及其祖先）拒绝；不写 `.gitignore`（git 仓库缺忽略规则时只提示）。
- 工作区产物：`drt_<slug>/`、`archive/`、`_abandoned/`、`method-library.md`。
- 一 Host 一用户；run bundle 继承工作区权限。一个工作区一条 pack 版本线。

## 7. 独立环境与多实例

```sh
bash dev/bootstrap.sh --check          # 预检（不安装/不构建；仍会确保隔离 home 与 hooks 配置）
bash dev/bootstrap.sh                  # 缺件时执行 submodule/install/vendor 构建（幂等）
node dev/run-driver.mjs up --bootstrap # 准备 + 起通道 + 浏览器面验证
```

多实例用这些变量区分（默认值 = 单实例）：

| 变量 | 默认 | 作用 |
|---|---|---|
| `DSH_DEV_HOME` | `runtime/harness-home` | 隔离 DSH home（可指仓外） |
| `DSH_RUN_PROFILE` | `deep-research` | profile 名（与用户主路径同名；多实例用 `DSH_RUN_STATE_DIR` 隔离） |
| `DSH_RUN_PORT` | `3083` | web 端口 |
| `DSH_RUN_STATE_DIR` | `runtime/smoke-workspace` | web.log/仪表盘/run-pack/npm-cache 的实例状态根 |
| `DSH_RUN_WORKSPACE` | `research-workspace` | 研究会话 cwd（角色手册从这里注入；多实例请各自指定） |

不同 `DSH_RUN_STATE_DIR` 的实例允许并行；同一 workspace 不支持两个实例共用（无跨进程锁）。

## 8. 移交

- **源码移交**：`node scripts/dist/export-handoff.mjs` → `_dist/ai_dsh_deep_research-src-<version>-<head>.tar.gz`；
  只含 tracked 源与 `.gitmodules`，对方 `tar xzf` → `git submodule update --init` → `pnpm install`。
- **插件移交**：`node scripts/dist/export-dist.mjs` → tarball + 安装手册 + 市场索引（含 sha256、
  升级/回滚、离线矩阵）。
- **研究数据移交**：run bundle 单独拷贝/归档；移交前跑 `node scripts/run-gates/path-hygiene.mjs <bundle>`。
- **不做**：`cp -r` 工作树、把 `runtime/` 或 `research-workspace/drt_*` 打进源码包、把凭据/会话随包发送。

## 9. 证据

证据档位、命令与选择规则 = [guides/60 §2](60-dev-loop.md)（唯一 owner，本页不复述）。本合同的增量证据：

- `install-shape-smoke`：原样执行手册的 CLI 装包分支（profile init → plugin add → 真启动）；断言
  roster 三状态、无 `did not activate`、首屏可达。
- `product-boot-smoke`：纯 `dsh --profile deep-research` + 真 Web + 浏览器；工作区会话、首屏、目录按钮。
- `release-smoke`：tarball → 干净 profile → 真启动。
- `lifecycle-smoke`：market 索引 → tarball → dump → 真启动 → `readPluginMeta` → remove 回落。
- `data-smoke`：`$DSH_HOME` 只写 deep-research 设置文件；无 storage domain / 新 session event。
- `content-shape`（L0）：手册/模板随包、包内无种子。
- `snapshot-replay` B 层 + `l4-lite`（真模型）：手册以 runtime context 进请求、Lead 仍按手册工作。

## 10. 已知限制与延后工作

- 浏览器提示键是设备/源级的：换浏览器或清站点数据后需要重选项目目录；权威 Workspace 仍在 DSH registry。
- Host 建会话是 best-effort（webserver 无 readiness gate）；client 用首选 blank / onboarding 兜底。
- `pickDirectory` 只覆盖 native chooser；browse-only 部署的目录浏览入口未做专门 UI（报错可见，不假装成功）。
- 团队机制层是 N2 experimental：上游可能改 API 或撤能力；版本必须与运行中的 DSH 一致。
- 不承诺 Desktop / Windows 的完整路径；正式 npm 发布前 tarball 是主分发形态。
- 共享 `$DSH_HOME` 时 Web UI 会显示该 home 下其他 Workspace/Session；需要干净环境用 `DSH_HOME=<dir>`。

> 决定理由、技术决定与历史 = [D40](../decisions.md#d40)（技术决定）与 [D41](../decisions.md#d41)（术语/交付模型收口）。
