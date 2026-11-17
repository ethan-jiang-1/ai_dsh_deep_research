---
status: 推敲中
opened: 2026-11-17
---

# 推敲：运行时依赖与安装边界（2026-11-17 第三轮）

> 立卡：2026-11-17 ｜ 状态：推敲中（第一轮已跑；10 张卡 229–238） ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> **一句话**：第二轮把「发布文本/集合」收干净了；这一轮追**依赖与安装现场**——运行时 require 的包是否在 peers、
> 安装测试是否真在干净室、dev home 镜像是否等于当前源、发布 metadata 是否可解析。10 张卡，全部只报不修。
>
> 前两轮 = [命名空间搬家](../_archived/settled_issues/2026-11-17-exploratory-namespace-move.md) ·
> [运行时/开发边界](../_archived/settled_issues/2026-11-17-runtime-dev-boundary.md)（219–228 已由 `f3829bea` 修完归档）。

**问题与期望结果：** 第二轮解决了「发布文本引用 dev」与「发布集合 = 公开合同」，但没有回答：
- `lib/client.js` 在运行时 `require` 的 React / DSH 包，是否都在 `peerDependencies`？
- 公开 `.d.ts` 引用的包是否可解析？（本轮复核后：本轮修复已把发布类型收窄到 7 个入口，7 个入口只 import `cordis`，此前的 d.ts 缺 peer 已被 `f3829bea` 关闭，不另开卡。）
- cold-start / release / lifecycle 的「安装测试」是否真在**干净室**（仓外 home + 钉版 DSH + 无仓内 node_modules）？
- dev home 的 profile 镜像是否等于当前源？tarball metadata 是否可被标准包管理器解析？
- peer 范围与 `engines.dsh` 是否是同一个可安装版本集？

**当前情况：**

- `lib/client.js` 运行时 require = `@deepseek-ai/dsh-client-ui-primitives`、`react`、`react-dom`、`react/jsx-runtime`；
  前两者（React 三 specifier）**不在** `peerDependencies`。
- `_dist` tarball 82 条目、7 个公开 `.d.ts`、14 条 `workspace:*` devDependencies；`pack.e2e` 绿。
- `cold-start` 在仓内 `runtime/smoke-workspace` 跑，`run-driver` 用 `vendor/dsh`；`release.entry` 只许仓内 dev home；
  `lifecycle.entry` 用 PATH 上的全局 `dsh`/`pnpm`。
- dev home：`deep-research` 0.3.6（client.js 05:25 vs 当前 17:53）、`research` 0.3.1（11-10）、`wave-pilot` 0.3.0（11-05）。
- peer 范围 `^0.2.1-rc.2`（= `<0.3.0`）宽于 `engines.dsh <=0.2.1-rc.5`。
- 基线：`pnpm verify` / `pnpm test` 绿；`pack.e2e` 82 条目绿；`preset.e2e`/`lifecycle` 等装配绿（但见 233–235 的边界）。

**未决问题：**

- React 的处置：加 peer（宿主保证）还是打进 bundle（体积换独立）？不能两边都不声明。
- 干净室矩阵的统一定义：home（仓内/仓外）× DSH（vendor 钉版/全局/发布）× pack（源码/tarball）；233–235 各缺一半。
- dev home 的 `research`/`wave-pilot`：删除、重建，还是统一纳入漂移门？
- peer 范围是否改成与 engines 同闭区间；`cordis`/`schemastery`/`sqlite` 等非 tag 包需分组。
- `workspace:*` devDependencies：发布前改写/剥离（pnpm publish）还是 prepack 生成发布 manifest。

**下一步：** 10 张卡待用户/修复 agent 处置；229/232/236/238 触 pack 公共行为/门禁，230 触门禁，233/234/235/231 为测试边界（修复就绪），237 为运行态清理（修复就绪）。本轮不改产品代码。

## 判据：四层

| 层 | 判据 | 卡 |
|---|---|---|
| L1 运行时依赖 | `lib/*.js` 的每个非相对 require ⊆ peerDependencies（或显式打包） | 229 / 232 |
| L2 类型面 | 公开 `exports.types` 的可达闭包 external import ⊆ peers | （f3829bea 已收窄到 7 入口；本轮复核关闭） |
| L3 安装干净室 | 仓外 home + 钉版 DSH + 无仓内 node_modules 祖先 | 233 / 234 / 235 |
| L4 运行态/metadata | profile 镜像 = 当前源；tarball manifest 无 `workspace:*`；peer 范围 ⊆ engines | 236 / 237 / 238 |
| 守卫自身 | `shipped-surface` 的路径形态与源侧扫描集 ≡ 发布文本集 | 230 / 231 |

## 执行记录（2026-11-17，keyless，0 模型）

| 卡 | 层 | 严重级 | 状态 | 一句话 |
|---|---|---|---|---|
| [229](../bugs/BUG-229-client-bundle-react-peer-missing.md) | L1 | P2 | 等人拍板 | `lib/client.js` require React/react-dom/jsx，peer 没声明 |
| [230](../bugs/BUG-230-shipped-surface-devref-lookbehind-bypass.md) | 守卫 | P2 | 等人拍板 | `devRefsOf` 漏 `./checks`、`../tests`、裸根、`./research-workspace` |
| [231](../bugs/BUG-231-shipped-surface-source-scan-gaps.md) | 守卫 | P2 | 修复就绪 | 源侧扫描漏 `content/**/*.js` 与 `locale*`——push 绿、nightly 红 |
| [232](../bugs/BUG-232-row-deps-scope-no-lib-types.md) | L1 | P2 | 等人拍板 | `row-deps` 只查 YAML 行；`pack.e2e` client inject 只查 `@deepseek-ai`，不查 React/类型 |
| [233](../bugs/BUG-233-cold-start-inside-repo-not-clean-room.md) | L3 | P2 | 修复就绪 | cold-start 的 TEMP 在仓内、走 vendor，缺 peer 由 repo node_modules 补 |
| [234](../bugs/BUG-234-release-entry-pins-dev-dsh-home.md) | L3 | P2 | 修复就绪 | release.entry 只许 `runtime/harness-home`，不是干净用户现场 |
| [235](../bugs/BUG-235-lifecycle-uses-global-dsh.md) | L3 | P2 | 修复就绪 | lifecycle 用 PATH 全局 `dsh`/`pnpm`，peer 缺口由全局兜底 |
| [236](../bugs/BUG-236-tarball-workspace-dev-dependencies.md) | L4 | P2 | 等人拍板 | 发布 tarball 带 14 条 `workspace:*` devDependencies |
| [237](../bugs/BUG-237-stale-dev-home-profiles.md) | L4 | P2 | 修复就绪 | `research`/`wave-pilot` 镜像停在 0.3.1/0.3.0；直起跳过漂移检测 |
| [238](../bugs/BUG-238-peer-range-wider-than-engines.md) | L4 | P2 | 等人拍板 | peer `^0.2.1-rc.2` 宽于 engines `<=0.2.1-rc.5` |

**复核已关闭（不另开卡）**：第二轮 219–228 由 `f3829bea` 修复归档；公开类型收窄到 7 个入口，7 个入口只 import
`cordis`（peer），所以此前「d.ts 缺 client-ui / experimental peer」在**发布面**已不可达（`lib/types` 内部树仍在盘上，
但不随包；不构成消费者缺陷）。

## 基线与负对照

- `pnpm verify` / `pnpm test` 绿；`pack.e2e` 82 条目绿；`gates.e2e` 157 绿（fix commit 记录）。
- `lib/client.js` require 面：4 个非相对 specifier；React 三连缺 peer（229）。
- `shipped-surface` 纯函数负控：`./checks/x`、`checks/`、`../tests/y`、`./research-workspace/x` 均为 `[]`（230）；
  源侧 `shippedSources` 的 content 只收 `.md|json`，`content/waves/lens-fanout.js` 与 `locale*` 不在扫描集（231）。
- 安装面：`cold-start` 的 `TEMP` 在仓内；`release` 拒绝非 dev home；`lifecycle` 用全局 `dsh`（233–235）。
- dev home：三个 profile 的版本/时间见 237；默认 profile 的 `lib/client.js` 也落后当前构建（boot-run 会红）。
- tarball：82 条目、7 types、14 条 `workspace:*`（236）；peer 范围 vs engines（238）。

## 覆盖地图

| 面 | 状态 | 判定 |
|---|---|---|
| client 运行时 require → peers | 已探 → 卡 | 229 / 232 |
| 公开类型面 peers | 已关闭（复核） | f3829bea 收窄到 7 入口；仅 `cordis` peer |
| 发布文本守卫 | 已探 → 卡 | 230 / 231 |
| cold-start 干净室 | 已探 → 卡 | 233 |
| release 干净室 | 已探 → 卡 | 234 |
| lifecycle 干净室 | 已探 → 卡 | 235 |
| tarball metadata | 已探 → 卡 | 236 |
| dev home 镜像 | 已探 → 卡 | 237 |
| peer vs engines | 已探 → 卡 | 238 |
| `workers/` 消费 | 已关闭 | `package.json` dsh 引用 `./workers/*.patch.yml` |
| `content`/`locale` 当前 dev 引用 | 已关闭 | 本轮 grep 0 条（但源侧扫描集窄，见 231） |
| `scripts/` 依赖闭包 | 已关闭 | doctor 的 import 树消费 7/7 |
| 安装手册/README 用户段 | 已关闭（上轮修） | 无 dev 命令；维护者折叠段例外 |

## 验收标准

1. 229–238 全部有复现/证据/修法方向；L1–L4 与守卫自身各有判定；未跑项写明原因。
2. 清洁室测试与 peer/范围守卫有可执行判据；实例卡可逐条修。
3. `pnpm verify` / `pnpm test` 绿；本轮不改产品代码。

## 关闭条件

- 10 张卡有去向（修复就绪/等人拍板）；229/232/236/238 的 pack 决策落定；
- 233–235 的干净室矩阵至少一条落地；230/231 的守卫修正落地；
- 覆盖地图更新；审查记录写作 `审查：agent｜用户｜跳过 — 理由`。

## 范围与排除

**范围**：`packages/deep-research-pack/{lib,package.json,src,scripts}`、`_dist` tarball、`checks/lib/repo/shipped-surface.mjs`、
`checks/smoke/{pack,lifecycle,release,cold-start}`、`tools/channel/{boot-run,run-driver}`、`runtime/harness-home/profiles/*`。
**排除**：改产品代码/发布配置；真 run/真模型；重跑 219–228 已闭面；把维护者折叠段当用户指令。

## 判据形状

不适用（本卡不改产品判据；L1–L4 判据 = 上文表；守卫落地 = 229/230/231/232/236/238 的修复判据）。
