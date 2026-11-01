---
topic: plugin-as-product-v2
intent: 指认 D38/D39 落地后产品形态的五处错位，说明每处的机制后果与证据
---

# 诊断：上一轮歪在哪

## 一句话

上一轮把"分发容易"当成了"产品形态"：为了让用户少一个安装步骤，把产品降格成**装进用户已有 `web` profile 的 bundle**；产品自己的 profile、启动期工作区与内容/产物边界因此全部让位。方向（父卡的问题原文）是对的，错在落地时的默认选择。

## 五处错位

### 1. 产品入口被换成通用 web profile

D39 把 `dsh plugin --profile web add` + `dsh --profile web` 定为默认，把专用 `deep-research` profile 降为"隔离选项"。

- 证据：`docs/decisions.md:56`（D39）；`README.md:14-18`；`docs/00-index.md:11-14`；`docs/guides/65-run-forms.md:18`；`_dist/安装手册.md:200`。
- 代码并未跟着走：`packages/deep-research-pack/scripts/launch.mjs:61` 仍默认 `deep-research`（`scripts/lib/launcher/args.mjs:98` 的 help 同）。同一仓因此有两套"主叙事"（`docs/project-map.md:9-10` 与 `packages/deep-research-pack/README.md:5-7` 仍把 launcher 当产品路径）。
- 后果：产品不再是用户启动的东西，而是用户 DSH Web 里多出来的一个页签；首屏、侧栏、工作区都归 `web` profile，产品无法回答"我是谁、我在哪个项目"。

### 2. 工作区从启动问题变成前置命令

工作区本该是产品的第一个问题。实际链路是：

```text
dsh plugin --profile web add …                              # ① 装
dsh-deep-research-scaffold --install-only --workspace <ws>   # ② 单独一条 CLI 铺工作区
DEEP_RESEARCH_WORKSPACE=<ws> dsh --profile web               # ③ 用 env 把路径塞进 Host
```

- `packages/deep-research-pack/scripts/scaffold.mjs:36` 的 `--profile` 默认还是开发镜像 `research`，与产品 profile `deep-research` 不一致（`docs/terms.md:21`、`docs/guides/62-plugin-authoring.md:22` 写的是后者）。
- Host 侧 `packages/deep-research-pack/src/workspace-boot/index.ts:28-30` 在 env 缺席时**零行为**；产品自己不知道工作区。
- 文档把"不设也能启动"写成可接受（`README.md:113`、pack README:113-114、`_dist/安装手册.md:45-47`），实际是 no-op：既不询问、也不登记，用户落到 DSH 的 Documents 默认工作区或上次保存的会话。
- 后果：工作区不是产品在启动时解决的，而是用户启动前必须先知道的一个隐式前置；忘掉就错项目。

### 3. 插件内容被复制进工作区

`packages/deep-research-pack/workspace/` 随包发布，同时又被 scaffold 复制、逐文件哈希、版本化、审计进用户工作区：

- 62.3 KB 种子：`AGENTS.md` 18.5 KB、`question-patterns.md` 16.0 KB、`NODES.md` 10.8 KB、8 件 run 模板、`method-library.md`、`.gitignore`；加 `seed.json`（12 个 sha256 + 每文件 policy）。
- 为让两份拷贝不漂移，仓里有一个生成器 `dev/sync-pack-workspace.mjs` 和一个门禁 `pack-workspace-fresh`（`scripts/verify/gates/e-workspace.mjs:161-170`）——门禁本身就是"内容在两边"的自证。
- 升级因此长出 sidecar / `--adopt` / `--force` / `--clean` 一整套；`scaffold` 有四种模式，`preflight` 有 13 行种子审计（`scripts/preflight.mjs:203-301`）。

这直接违反"插件内容全部在插件内"：用户项目里多出的 `AGENTS.md`/`NODES.md`/`templates/` 不是用户写的东西，却要用户承担版本与合并责任。

### 4. 首屏是补丁，不是产品

- `StartCard` 解释的是一套本不该存在的 setup 仪式（工作区、三步起步、凭据提示），而不是"我在哪个项目、现在能问什么"。
- saved session 可能把用户打开在另一个工作区（D38 未验证项）；产品的应答是"首屏显示当前工作区 + 用 picker 换"，等于把错误状态留给用户自己发现。
- FAQ 26 更新后补得更硬：DSH 原生首启只有 token 门，**没有欢迎页/向导**，`settings.onboarding` 只是设置面板里一次一个的 step（`10-foundations/16-startup-resolution.md` §首启不是安装；`30-external/37-lifecycle-stages.md` §④）。所以"第一次看到什么"必须由产品 bundle/client 自己回答——上一轮把它压在 launcher + StartCard 文本上，产品一换入口就不成立。

### 5. 文档与分发把错的产品写成主路径

- 根 README、`_dist/安装手册.md`、`CONTRIBUTING.md`、`docs/00-index.md`、`guides/65` 全部以 `--profile web` 三条命令开篇。
- `_dist/安装手册.md` 是生成物（模板 = `scripts/dist/product-manual.md`），所以修文档必须先修生成器，再重导出；只改 `_dist` 会被 `dist-manual-version` 门禁咬。
- 后果：即使代码改对，用户拿到的说明书仍把他导向错的产品形态。

## 为什么当时会歪

D39 的输入是用户一句"最好是利用 DSH 插件的安装/启动，这样分发容易"。这句话约束的是**分发**；落地时被读成了**产品形态**：把 bundle 放进 DSH 自带的 `web` profile，看起来"零额外安装"。但 DSH 原生安装同样支持 `dsh plugin --profile deep-research add`——"用 DSH 的安装/启动"不等于"用 DSH 的 web profile"。分发容易与产品有自己的 profile 并不冲突；冲突的是"新 profile 需要一步 `--from-default-profile web`"，而这一步恰好是薄 bootstrap 的合法工作范围（FAQ 26 `50-launch/40-profile-integration.md` §启动入口：外层最多一个薄 bootstrap）。

## 一句话根因

把"少一个安装步骤"优化成了"少一个产品"。

## 上一轮不是全错

- 父卡的问题原文（`_backlog/_archived/settled_issues/2026-11-01-plugin-as-product.md` 开篇）与目标形态一致：独立 profile、启动期工作区、内容在包、产物在工作区。
- 已证实的机制全部可复用：Host 注册工作区、首屏 blank Lead 会话、`header.cwd` = 工作区、optional peers 打包、`product-boot-smoke` 的断言骨架（`scripts/smoke/product-boot-smoke.mjs:163-173`）。
- 真正要做的是把**默认选择**翻回来，并把"内容/产物"从口号落成机制；不是推翻重做。
