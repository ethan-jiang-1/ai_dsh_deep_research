---
description: "面向 DSH 的 Deep Research 组合包：五个 preset、一个研究驾驶舱，以及可溯源的研究报告。"
kind: "package-bundle"
---

# dsh-deep-research-pack

[English](README.md) | 中文

## 摘要

本组合包为 DSH profile 增加深度研究（Deep Research）能力：五个 agent preset（Lead、Scout、
Analyst、Critic、Method Editor）、方法论 skill、Web 研究驾驶舱、一个抓取回退 provider、注入式研究内容，
以及用于登记一个工作区并打开首个 Lead 会话的启动行。它是组合包，不是 profile，也不是应用：它装进用户
自建的 custom profile（例如 `deep-research`），用户用 `dsh --profile` 启动该 profile。研究成果留在
用户的工作区；本包自身不携带运行时、启动器或安装器。

## 目录

- [使用本包](#使用本包)
  - [安装到 profile](#安装到-profile)
  - [开始一次研究](#开始一次研究)
  - [验证](#验证)
  - [配置](#配置)
  - [升级与回退](#升级与回退)
  - [卸载与数据](#卸载与数据)
  - [兼容性](#兼容性)
- [数据](#数据)
- [理解实现](#理解实现)
- [延伸阅读](#延伸阅读)
- [模型体验](#模型体验)
- [已知限制与延后工作](#已知限制与延后工作)
- [开发注记](#开发注记)
- [许可证](#许可证)

## 使用本包

### 安装到 profile

**1. 它是什么、装到哪里。** 一个**组合包**：`package.json` 在 `dsh.bundle.patch` 下声明六个
patch 文件。它装进名为 `deep-research` 的 **custom profile**；profile 是用户自己的具名组装，不是本包
发布的东西。安装后，该 profile 的 `dsh.profile.bundles` 含有 `dsh-deep-research-pack`，该组合包插入
`preset-{lead,scout,analyst,critic,method-editor}`、`research-content`、`research-client`、
`research-startup`、`research-fetch-fallback`、`tool-present` 与 `ui-agent-team`。

**2. 怎么装（默认）。** 启动该 profile，然后使用 **Plugins** 页：

```sh
dsh --profile deep-research
```

Plugins 页是 Web 与 Desktop 的跨 surface 安装入口。在 Desktop 上它管理应用自有的 `desktop`
profile；那是一种互操作形态，不是 `deep-research` custom profile。本包是针对 Web surface 开发和验证的。

**3. 先创建 custom profile（仅当它不存在时）。** DSH 没有创建 custom profile 的 UI；CLI 是文档化的
路径。`--from-default-profile` 是**破坏性替换**，不是升级：

```sh
dsh --profile deep-research --from-default-profile web --dump-default-config
```

不要在已存在的 profile 上执行它：它会替换依赖与用户 patch。已存在的 profile 从 Plugins 页安装该
组合包。

**4. CLI 安装（仅限 Web 自动化或离线）。** `dsh plugin --profile` 转发给 pnpm；它不是 GUI 用户的
默认入口。npm/源码版 `dsh` 拒绝 `desktop` profile；Desktop 应用自有的载体可以管理它，但第三方说明应
停留在显式的非 `desktop` profile 上：

```sh
dsh plugin --profile deep-research add dsh-deep-research-pack@<version>
dsh plugin --profile deep-research add @deepseek-ai/dsh-experimental-agent-team-profile@<exact dsh --version>
```

对 headless、SDK 与 ACP profile 没有 Plugins 页；用同样的 `dsh plugin --profile` 形式并写明该
profile。离线时，把包 spec 换成 `file:/path/to/dsh-deep-research-pack-<version>.tgz`。

**5. 团队层。** Agent Teams 组合是一个独立、官方的 experimental 组合包。不要用 `@latest`：它的
`latest` 不跟踪正在运行的 DSH 版本。安装 `dsh --version` 打印出的确切版本，或在同一个 Plugins 页
启用它。

**6. “已安装”意味着什么。** 有三个相互独立的状态：pnpm 退出码 0、依赖已写入、包出现在
`dsh.profile.bundles` 中。只有第三个状态才会激活该层。没有 `dsh.bundle.patch` 的包只是一个依赖：
CLI 退出码 0 并给出警告，而应用内路径以 `not-bundle` 失败。成员关系变更后，重启该 profile。

**7. 运行时与版本。** 本包不随附 DSH。请使用来自 npm 或官方 Desktop 的 DSH；组合包声明
`engines.dsh`，由 host 检查。registry/路径 spec 在安装前就因不兼容被拒绝；git/tarball spec 可在
安装后判定并修复，且每次启动都会重新检查所有组合包。不要依赖版本豁免。

### 开始一次研究

在工作区中打开一个会话，提出一个研究问题。Lead 跑 HITL1（类型、深度、语言、可选的业务简报），提出
方法与计划，然后带领 Scout、Analyst 与 Critic 走完整个 run。HITL2 是交付前的终局审阅。完整操作手册是
[`_dist/安装手册.md`](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/_dist/%E5%AE%89%E8%A3%85%E6%89%8B%E5%86%8C.md)，
开发侧的 run 操作手册是
[`docs/guides/61-run-playbook.md`](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/guides/61-run-playbook.md)。

### 验证

```sh
dsh --profile deep-research --dump-config
dsh --profile deep-research --no-open --port 0
```

`--dump-config` 必须显示上面列出的行 id，且 stderr 不得含有
`patch: entry "…" not found`。真实启动必须打印一个 `dsh web:` token URL，且不含
`did not activate` 或 `ERR_MODULE_NOT_FOUND`。在 UI 中，本包以“深度研究”出现并带图标；
右侧栏新增研究状态、配置、图谱与终局报告页签；主界面新增方法库页签。

### 配置

- **默认值**位于组合包 patch 中，随包发布。
- **用户覆盖**位于 profile patch 中；机器级偏好位于 `$DSH_HOME/cordis.patch.yml`；一次性诊断可用
  `--patch`。
- **整条替换**：一个 patch 会替换某行的整个 `config`；只重述一个字段会丢掉必填字段，并可能让某个
  必需插件在启动时失败。
- **设置页**：只有 `research-fetch-fallback.enabled` 标了 `.volatile()`，所以它是 Settings UI 暴露
  的唯一字段，且立即生效。超时与其他字段需要 profile patch 或 `--patch`。
- **工作区与上次会话**位于 `$DSH_HOME/deep-research/settings.json`，这是包自有的 home 文件，不是
  DSH 全局设置。解析顺序：`DEEP_RESEARCH_WORKSPACE` → 该文件 → 首屏选择器。
- **凭据**来自 DSH：Models 页、凭据服务、环境变量，或 `$DSH_HOME/.credentials.yaml`。本包从不打包
  或转发 key。搜索使用 `DEEPSEEK_API_KEY`；抓取回退解析同一个 ref，缺失时报告
  `fallback unavailable`。

### 升级与回退

从 Plugins 页更新本包，或用 `dsh plugin --profile deep-research add
dsh-deep-research-pack@<new>`，然后在组合包成员关系变化时**重启该 profile**。仅配置的修改在启用 HMR
时可以热重载。DSH 没有命令级回退：回退就是重装旧的确切版本，且旧包必须满足正在运行的 DSH 的
`engines.dsh`。工作区数据不会回退。

### 卸载与数据

```sh
dsh plugin --profile deep-research remove dsh-deep-research-pack
dsh plugin --profile deep-research remove @deepseek-ai/dsh-experimental-agent-team-profile
```

卸载会删除本包及其 patch 层。它不会删除工作区、方法库、profile、`$DSH_HOME/deep-research/settings.json`、
会话日志、凭据或 Workspace 登记。只有当你确实想删掉它们时，才显式删除 profile 与设置目录。逐条事实表
见 [数据](#数据)。

### 兼容性

| 项 | 值 |
|---|---|
| `engines.dsh` | `>=0.2.1-rc.2 <0.3.0-0`（host 权威；没有第二个兼容字段） |
| 已测基线 | `0.2.1-rc.2`（开发 pin，data plane + client）+ `0.2.1-rc.3`（安装形状 + client 挂载） |
| Node | `^22.19.0 || >=24.0.0` |
| Surface | Web；Desktop 仅互操作；headless/SDK/ACP 不受本包支持 |

依赖档位：`remote.workspaceFiles` 与 `session.follow` 是 N0 core；`tool-present`、
`session-query-sqlite` 与 `ctx.credentials` 是 N1 原生插件；Agent Teams 各包是 N2 experimental
（`@deepseek-ai/dsh-experimental-agent-team-profile`，client peer `@deepseek-ai/dsh-experimental-client-ui-agent-team`），
可能变化或消失；本包没有 E1 社区依赖。组合包不会把团队包写进 `dependencies`。

## 数据

一条事实一行。归属、权威、来源、读者与写者是彼此独立的角色；不要把它们合并成一个标签。

| 事实 | 归属 | 权威 | 来源 | 机制/路径 | 范围/键 | 读者 | 写者 | 可重建性 | 保留/删除 |
|---|---|---|---|---|---|---|---|---|---|
| preset、skill、手册、模板、启动行 | 本包 | 包版本 | 包构建 | 安装副本 `node_modules/dsh-deep-research-pack/` | profile 安装 | 模型（注入）、用户 | 运行时无写者 | 重装 | 随包删除 |
| `deep-research` profile 组合 + 团队层 | 用户 / DSH | profile manifest | profile 初始化 + plugin add | `$DSH_HOME/profiles/deep-research/` | profile | DSH、用户 | DSH、插件命令 | 重建 profile | 用户删除；卸载本包会保留 |
| Deep Research 设置（工作区、上次会话） | 本包 / 用户 | 文件 | 启动行、用户 | `$DSH_HOME/deep-research/settings.json` | home | 启动行、doctor、用户 | 启动行、用户 | 重选工作区 | 删除目录；卸载本包会保留 |
| 浏览器工作区提示 | 浏览器 | DSH Workspace registry | client | `localStorage['dsh.deep-research.workspaceId.v1']` | 设备/源 | client | client | 重选工作区 | 清除站点数据 |
| 方法库 | 用户 | 文件 | 用户、Lead、Method Editor | `<workspace>/method-library.md` | 工作区 | 用户、模型 | 用户、Lead、Method Editor 工具 | 否（用户数据） | 用户删除；卸载本包会保留 |
| run bundle | 用户 | 文件 + journal | 角色 | `<workspace>/drt_<slug>/`, `archive/`, `_abandoned/` | 工作区 + slug | 模型、用户 | 角色、ops | 否 | 用户删除；无自动 GC |
| run 状态头 | run | 事实 + journal | 角色 | `<bundle>/run.md` | run | 模型、ops | 角色、ops | 派生 | 随 run bundle 走 |
| 交付与审计回执 | run / ops | 文件 + 会话日志 | `present`、ops | `delivered.json`, `manifest.json`, `acceptance.md`, `audit.md`, `node-gate.md` | run | 用户、ops | ops | ops 重跑 | 随 run bundle 走；审计需要本地会话 |
| 会话日志 | DSH | DSH 会话日志 | 会话 | `$DSH_HOME/sessions/` | 会话 | 模型、用户 | DSH | 否 | DSH 管理；卸载本包会保留 |
| 凭据 | DSH / provider | provider | 用户 | `$DSH_HOME/.credentials.yaml`、环境变量 | home | provider、按引用取用的插件 | 用户、DSH | 重新录入 | DSH 管理；永不导出 |
| Agent Teams 层 | vendor experimental | 已安装的包 | Plugins 页 / CLI | profile 依赖 + 组合包行 | profile | 用户、插件 | 用户、DSH | 重装 | 用户卸载；卸载本包会保留 |
| 侧栏布局 | vendor / 浏览器 | 浏览器 | client | `localStorage['dsh.sidebar-right.v1.<sessionId>']` | 设备 | client | client | 重置 | 清除站点数据 |

**秘密与可迁移性。** 秘密只存在于 DSH 凭据中；本包既不存也不转发任何秘密。run bundle 与方法库随
工作区走；交付回执随 run bundle 走；`audit.md`、`node-gate.md` 与会话派生的证据需要原始的
`$DSH_HOME/sessions`，不会随行。共享的 `$DSH_HOME` 会看到其他工作区与会话；要干净环境请用独立的
`DSH_HOME`。

## 理解实现

<details>
<summary>实现内幕 —— 点击展开</summary>

`cordis.patch.yml` 是组合包层。它插入 preset 名册（默认 `lead`）、检索基座（`- id: web` 同时替换
搜索与抓取选择）、`research-fetch-fallback`、`session-query-sqlite`（`openAt: first-search`，
`path: ':memory:'`）、`tool-present`、`ui-agent-team`，以及本包的内容、启动与 client 行。
`presets/<role>.patch.yml` 是每个角色一条 `@deepseek-ai/dsh-agent-preset` 行；
`presets/<role>/skills/` 存放该角色的方法论 skill。`content/` 以 runtime context 注入，不写入工作区。

| 路径 | 角色 |
|---|---|
| `cordis.patch.yml` | Host 侧的组合包行与默认 preset |
| `presets/*.patch.yml` | 五条 preset 行 |
| `presets/*/skills/` | 按角色硬隔离的方法论 skill |
| `content/manual.md`, `content/templates/run/` | 注入的手册与 run 模板 |
| `src/content/`, `src/startup/`, `src/client/`, `src/fetch-fallback/` | 注入内容、启动行、驾驶舱与抓取 provider 的源码 |
| `scripts/doctor.mjs` | 只读 `dsh-deep-research-doctor` |

</details>

## 延伸阅读

- [安装与使用手册](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/_dist/%E5%AE%89%E8%A3%85%E6%89%8B%E5%86%8C.md)
- [运行形态合同](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/guides/65-run-forms.md)
- [插件作者入口](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/guides/62-plugin-authoring.md)
- [研究驾驶舱设计](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/design/40-research-cockpit.md)
- [发布与版本](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/guides/64-release-versioning.md)

## 模型体验

### Method Editor 的方法库操作

#### 模型看到什么

只有 Method Editor Agent 能看到 `method_library_upsert`、`method_library_set_default` 与
`method_library_remove`。每个显式的页面操作都是一条以 `【方法库操作】` 开头的持久用户消息；它携带
一个 `operationId`、动作与目标名，保存操作还带条目的 SHA-256。保存工具还会收到 `operationHash` 与
`defaultAction`；默认与删除工具只收到该操作特有的 action/name。成功的响应给出简短的文本结果，而
`presentationMeta` 携带给 client 的结构化操作数据。默认标记不属于 `method-draft`；只有显式的页面
操作才能改变它。

#### Token 影响

一个确定性的 Method Editor Loader 场景，用 DSH 的固定密度估计器把真实的首次请求计价为其模型可见
消息与工具 schema 之和。它把该请求与相同的消息加早先的 upsert/remove schema 做对比；当前 fixture
测得 6,778 个首轮输入 token，其中 schema 变化为 +246。这是比较性估计，不是特定 provider 的分词或
计费；每个保存请求还包含其完整的方法条目与命令标记。

#### KV 缓存影响

工具 schema 在同一条 Method Editor 请求序列内保持稳定；新选中的 Agent 在请求头中收到它组合出的
schema。逐操作的命令文本与方法条目作为用户内容追加，因此不会替换前面的对话前缀。本组合包的其他行是
组合载体；其模型可见行为由被插入的行包各自拥有。

## 已知限制与延后工作

- **首屏工作区**：默认值为共享的 `$DSH_HOME`；带已保存会话的浏览器可能打开上一个工作区。client 使用
  `dsh.sessions.current` 与工作区提示键切回；确定性选择已延后。
- **工作区选择器**：首屏的“选择项目目录”使用原生选择器；仅有浏览能力的部署没有专用目录浏览器，会
  如实报错，而不是假装成功。
- **Host 侧会话创建是尽力而为**：webserver 在就绪门存在之前就已开始监听；client 回退到空白会话或
  onboarding。
- **方法库范围**：它是工作区本地的用户数据；不跟随其他工作区，也没有版本历史或跨设备同步。它只通过
  Method Editor 的 Host 工具或 Lead 的显式工作区编辑写入。
- **Agent Teams**：团队包是 N2 experimental；API 可能变化或消失，且版本必须与正在运行的 DSH 匹配。
- **抓取回退**：它只救援本地失败（超时、跨源重定向、不支持的内容类型、传输错误、5xx）；不救援 4xx、
  被阻断的 URL、非法 URL 或用户取消。API 回退文本携带来源标记，并隐藏最终 URL。
- **凭据**：回退只读取 API-key ref；DeepSeek 账号会话可以驱动 chat 与搜索，但不能驱动回退。
- **平台**：macOS 是已测基线；Linux 通过 npm 预期可用；Windows 与完整 Desktop 路径不在承诺范围内。

## 开发注记

<details>
<summary>维护者的工作上下文 —— 点击展开</summary>

以下是仓内文档，不是本包说明：[插件作者入口](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/guides/62-plugin-authoring.md)、
[新增一个研究角色](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/.agents/skills/adding-a-research-role/SKILL.md)、
[发布与版本](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/guides/64-release-versioning.md)。
上面的安装步骤才是已验证的路径；包内容由 `pnpm build` 与 `npm pack` 生成。

</details>

## 许可证

MIT —— 见 [LICENSE](LICENSE)。
