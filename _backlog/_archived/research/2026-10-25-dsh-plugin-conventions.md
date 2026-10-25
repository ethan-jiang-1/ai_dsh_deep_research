---
topic: DSH 插件打包、profile 与兼容声明惯例
intent: 为运行形态合同与分发合同提供 DSH 官方 bundle/profile/workspace/兼容声明的机制依据，区分官方惯例与本仓自造约定
---

# DSH 插件惯例：bundle、profile、workspace 与兼容声明

> 消费者：[运行形态合同](../settled_issues/2026-10-25-run-form-contract.md)（Q1 独立启动读法）、[分发合同](../settled_issues/2026-10-25-distribution-contract.md)（兼容/安装/升级）。
> 材料性质：只读事实与推断；不构成产品决定。盘上依据以 `vendor/dsh` 当前 pin 为准。

## 问题

本仓需要同时支持三种形态：安装进用户 profile、在本仓独立环境里跑、把目录/产物交给别人。为了不发明与 DSH 冲突的“第四种运行时”，先确认 DSH 官方怎么定义 bundle、profile、workspace、安装与兼容性。

## 1. bundle 是分发单位，不是应用

官方 bundle 的形态（抽样：`vendor/dsh/packages/experimental/agent-team-profile/package.json`、`.../ralph-bundle/package.json`、`vendor/dsh/packages/bundle/web-app/package.json`）：

- `dsh.bundle.patch` 指向一个或多个 `cordis.patch.yml`；
- `files` 只带 `lib/index.js`、`lib/types/**/*.d.ts`、`cordis.patch.yml`、locale/icon 等运行所需；
- 不含 workspace、不含 sessions/credentials、不含部署脚本；
- 安装由 `dsh plugin add` 完成，profile 把包列入 `dsh.profile.bundles`。

`vendor/dsh/docs/user/develop/basic/publish.md` 的原话：bundle 是作者编写与分发的单位，profile 是用户 `dsh --profile <name>` 启动的环境；“Nothing is both”。

**对本仓的含义：** pack 的 `presets/`、`skills/`、`cordis.patch.yml`、`lib/` 是标准 bundle 面；`workspace/` 种子与 `scripts/{preflight,scaffold}.mjs` 是本仓额外的部署面，不是 DSH bundle 的必需组成。它们可以存在，但不能被误认为“官方插件都会有”。

## 2. profile + DSH_HOME 才是独立环境

`publish.md` 与 `vendor/dsh/docs/user/guide/python-sdk.md` 一致：

- profile = `$DSH_HOME/profiles/<name>` 下的目录，manifest 声明 `dsh.profile.bundles`；
- `DSH_HOME` 是 home 边界；profile 的 patch、home 级 patch、安装的包都在这个边界内；
- `dsh --profile <name> --from-default-profile <template>` 可以初始化/重置 profile；
- `dsh plugin --profile <name> add ./hello-plugin` 支持目录 checkout；第一次使用会初始化 profile，pnpm 链接 checkout，DSH 把 bundle 追加进 `bundles`。

`publish.md` 还说明：目录安装只是链接，**不会替你构建**；git 安装才谈 `prepare` 脚本与 pnpm 的 `allowBuilds`。因此“pack 目录直接装”成立的前提是 `lib/` 已构建。

**对本仓的含义：** “独立启动”在 DSH 里等于“独立 `DSH_HOME` + profile + workspace”，不是“插件目录变成进程”。A 读法（独立环境）是原生路径；B 读法（pack 目录自安装）是目录安装的打包属性，需要先构建；C 读法（整目录复制）不是 DSH 概念。

## 3. 兼容性：`engines.dsh` 优先，否则 peer 范围

`vendor/dsh/docs/user/develop/basic/publish.md` §Declare DSH compatibility 与 `vendor/dsh/packages/boot/app-boot/src/plugin-compatibility.ts` 一致：

- bundle 可以用 `engines.dsh` 声明支持的 DSH SemVer 范围；
- 安装与 profile 启动会拒绝不满足范围的 bundle；
- 没有 `engines.dsh` 时，宿主检查 `@deepseek-ai/dsh` 与 `@deepseek-ai/dsh-*` 的 `peerDependencies` 范围；
- `engines.dsh` 存在时，peer 范围不参与该判断；
- 官方 bundle 抽样中没有 `dsh.compatibility`；vendor 树 package.json 扫描也未出现该字段（抽样命令见下）。

**对本仓的含义：** `dsh.compatibility.dshReleases` 是本仓自造的人读约定，不是宿主字段。真正的宿主门当前是 peer 范围 `^0.2.1-rc.2`，比“只声明 rc.2”宽。要“钉死一个 tag”，应在 `engines.dsh` 写与声明一致的范围，或把 peer 收窄；两者选一个作为单一权威，另一个只能做镜像并加门禁。

## 4. workspace 与数据：DSH 不替插件管用户工作区

- agent-instructions 从会话 cwd 向上发现 `AGENTS.md` 并注入（本仓 [guides/62](../../../docs/guides/62-plugin-authoring.md) 与 [research-workspace/AGENTS.md](../../../research-workspace/AGENTS.md) 已按此设计）。
- sessions、credentials、profiles 在 `$DSH_HOME` 下；workspace 文件由用户/会话 cwd 决定。
- 官方 bundle 不携带 workspace 种子；它们把行为放在 presets/skills/配置里。需要“会话 cwd 的纪律”时，由部署面铺种子（本仓的 `workspace/` + `scaffold`）。

**对本仓的含义：** 种子是合理的部署选择，但它把“agent 行为的一部分”复制进了用户数据目录；插件升级不会自动更新它。这不是 DSH 提供的机制，必须由本仓定义所有权、版本与迁移（见 [工作区所有权与升级](../settled_issues/2026-10-25-workspace-ownership-and-upgrade.md)）。

## 5. 对本仓三条读法的结论

| 读法 | DSH 对应物 | 判断 |
|---|---|---|
| A 独立环境（隔离 home + profile + workspace） | 原生 profile 模式 | 推荐为主；需要 bootstrap、数据根参数、多实例与冷启动证据 |
| B pack 目录自安装 | `dsh plugin add file:<目录>` | 可作为“目录也能装”的门槛；要求先构建，不构成第二套运行时 |
| C 整目录复制 | 无 | 不做；会带凭据/会话/run 数据；改为 handoff 产物 |

## 未证明 / 边界

- 本材料只证明 DSH 的声明与代码路径，不证明本仓的 pack 在目标机器上真的满足这些范围；后者由 L2/冷启动 smoke 证明。
- 官方 bundle 抽样不代表所有第三方插件；但“bundle 不含 workspace/state”与“profile 是环境”是文档级合同。
- `dsh.compatibility` 在 vendor 树中未出现，不等于未来不会出现；当前 pin 下它不是宿主字段。
- 目录安装的构建行为来自文档与 pnpm 语义；真实 `file:<目录>` 安装仍需一条 smoke 证明（见 [独立环境冷启动与多实例](../settled_issues/2026-10-25-standalone-cold-start.md)）。

## 复核命令

```sh
# 官方 bundle 形状与版本
sed -n '1,90p' vendor/dsh/packages/experimental/agent-team-profile/package.json
sed -n '1,90p' vendor/dsh/packages/experimental/ralph-bundle/package.json
sed -n '1,110p' vendor/dsh/packages/bundle/web-app/package.json

# profile / 目录安装 / 兼容声明
sed -n '1,140p' vendor/dsh/docs/user/develop/basic/publish.md

# 宿主兼容判断
sed -n '1,180p' vendor/dsh/packages/boot/app-boot/src/plugin-compatibility.ts

# 官方包是否使用 dsh.compatibility
grep -rl '"compatibility"' vendor/dsh --include=package.json | grep -v node_modules
```
