---
status: 推敲中
opened: 2026-11-18
---

# 推敲：搬家残差 II——tests/checks owner 六分 + 原命名空间残余（2026-11-18）

> 立卡：2026-11-18 ｜ 状态：推敲中（两条线第一轮已跑；10 张卡 240–249） ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> **一句话**：先审计最近的 `tests/checks` 按 owner 六分（95b29c68，61 文件），再回到原命名空间搬家面
> （发布文本/依赖/安装/守卫）继续挖；10 张卡，只报不修。
>
> 前序 = [命名空间搬家](../_archived/settled_issues/2026-11-17-exploratory-namespace-move.md) ·
> [运行时/开发边界](../_archived/settled_issues/2026-11-17-runtime-dev-boundary.md) ·
> [运行时依赖/安装](../_archived/settled_issues/2026-11-17-runtime-deps-install-boundary.md)
> （219–239 已由 `f3829bea` / `83acbb7c` 修复归档）。

**问题与期望结果：** 最近一次搬家把 `tests/checks` 从平铺拆成六个 owner 目录（`analyze/channel/harness/repo/shared/test-infra`），
并伴随 `test:checks` glob、owner 镜像规则、`test-path-redirects` 61 条账本、`asset-ledger`/`test-index` 重生成。
本轮要回答：

- 新落点是否被**发现面**（glob）与**规则面**（owner/镜像/placement）同时覆盖，还是有「测试没跑/藏错目录」的静默缝？
- 回到原命名空间：发布文本（`lib/client.js` 的 `src/` 注释）、发布面守卫（`shipped-surface` 词表）、
  依赖闭包（`pack-deps`）、干净室（`clean-room`）、profile 守卫（`run-driver`/`boot-run`）还有哪些残余？
- 上一批 240 的修复（229–239）是否留下新的空转判据/旁路？

**当前情况：**

- `tests/checks` 61 文件、六个 owner、全部一层深；`test:checks` glob `tests/checks/*/*.test.mjs`；`pnpm test:checks` 251 例绿。
- `test-owner-mirror` 已扩到 checks 车道（单 owner → 该 owner；2+ → shared；无 lib → repo）；`test-placement` 有 `CHECK_OWNERS`。
- 61 条 `test-path-redirects` 追加；`asset-ledger`/`test-index` 重生成；`guard-red-record` 递归扫描。
- 238 个 peer 修复后：React 已入 peers，DSH-tag peer 范围 = engines；tarball 86 条目、零 `workspace:*`。
- 新增 `clean-room`（冷启动/发布/生命周期）、`pack-deps`、`publish-manifest`、`profile-guard`；
  `shipped-surface` 词表已扩（`./`、裸根、`../`）。
- 仍观察到：`lib/client.js` 10 条 `src/`/`packages/` 注释；`clean-room.moduleLeakOf` 从 home 根解析；
  `run-driver` 守卫只看 `DEFAULT_PROFILE`；`boot-run` 无守卫；`shipped-surface` 词表无 `src`/`packages`；
  `pack-deps` 跳过 host peer、未抽 `import()`；`test-owner-mirror` 只看直接 import；tarball 仍带 dev `scripts`。

**未决问题：**

- tests/checks 是否需要一个「间接 owner（helper）」规则，还是禁止 helper 跨 owner 引 lib（240–249 中 248）？
- `clean-room` 的探测集是否从 peers 全量派生（241），解析基改 profile/installed（240）后，三入口是否共用？
- profile 守卫的归属：`run-driver` 参数解析、`boot-run` 直起、还是统一到 `boot-run` 一层（242/243）？
- `src`/`packages` 是否入 `shipped-surface` 的 dev-root 闭集；`AGENTS.md` 这类无斜杠开发件是否需要单独判（244/245）？
- 发布 manifest 的 `scripts` 是删除还是白名单（249）；host peer 的合法集如何显式登记（246）。

**下一步：** 10 张卡待用户/修复 agent 处置；244/245、246、249 触 pack/门禁，等拍板；240–243/247/248 可修。
本轮不改产品代码。

## 判据：两条线

| 线 | 判据 | 卡 |
|---|---|---|
| A 最近搬家（tests/checks） | 发现面 = placement ≤ glob；owner = 直接+间接依赖；账本/索引/ledger 集合一致 | 248（owner 间接）；其余复核关闭 |
| B 原命名空间残余 | 发布文本零 dev 源引用；发布守卫词表 = 源码根闭集；依赖闭包 = require ∪ import ∪ import()；干净室按安装位置解析；profile 守卫覆盖所有入口 | 240–247 / 249 |

## 执行记录（2026-11-18，keyless，0 模型）

| 卡 | 线 | 严重级 | 状态 | 一句话 |
|---|---|---|---|---|
| [240](../bugs/BUG-240-clean-room-module-leak-base-home-root.md) | B | P2 | 修复就绪 | clean-room 从 home 根解析，profile 内仓内泄漏看不见 |
| [241](../bugs/BUG-241-clean-room-leak-names-hardcoded.md) | B | P2 | 修复就绪 | 干净室只探测 3 个包名，新增 peer 不覆盖 |
| [242](../bugs/BUG-242-run-driver-profile-flag-bypasses-guard.md) | B | P2 | 修复就绪 | run-driver 守卫只看 env/default，不看 `--profile` |
| [243](../bugs/BUG-243-boot-run-direct-profile-guard-bypass.md) | B | P2 | 修复就绪 | `boot-run.sh` 直起不守卫，`DSH_RUN_PROFILE=research` 绕过 |
| [244](../bugs/BUG-244-pack-client-bundle-src-path-comments.md) | B | P2 | 修复就绪 | 发布 client bundle 10 条 `src/`/`packages/` 注释 |
| [245](../bugs/BUG-245-shipped-surface-misses-src-packages-roots.md) | B | P2 | 等人拍板 | `shipped-surface` 词表无 `src/`/`packages/` |
| [246](../bugs/BUG-246-pack-deps-host-row-prefix-skips-dead-peers.md) | B | P2 | 等人拍板 | `pack-deps` 跳过所有 `dsh-*` host peer，死 peer 不可见 |
| [247](../bugs/BUG-247-pack-deps-dynamic-import-blind.md) | B | P2 | 修复就绪 | `pack-deps` 只抽 `require`，不抽动态 `import()` |
| [248](../bugs/BUG-248-test-owner-mirror-helper-indirection.md) | A | P2 | 修复就绪 | owner 规则只看直接 import；helper 可隐藏单 owner 依赖 |
| [249](../bugs/BUG-249-tarball-dev-scripts-in-published-manifest.md) | B | P2 | 等人拍板 | tarball `package.json` 仍带 `build`/`prepack: pnpm build` |

**A 线复核（已关闭，不另开卡）**：

- `test:checks` glob（`tests/checks/*/*.test.mjs`）与 61 文件一层深一致；`test-placement` 禁止更深/未知 owner。
- `test-owner-mirror` 已扩 checks 车道；直接 import 的 61 文件 owner 全对（`evaluation-contract` 是动态
  `import('checks/lib/analyze/run-dashboard-core.mjs')`，规则已覆盖动态 import）。
- 61 条 `test-path-redirects` 与 61 次 rename 对齐；`asset-ledger`/`test-index` 重生成绿；`guard-red-record` 递归。
- 旧平铺路径在 live 文件中的残留 = 0（仅账本 `from` 条目）；`md-links` 经账本解析。

## 基线与负对照

- `pnpm verify` / `pnpm test` 绿；`pnpm test:checks` 251 例；`pack.e2e` 86 条目绿（fix 记录）。
- tests/checks：61 文件、六 owner、一层；`test-path-redirects` 61 条；`test-index` 一致。
- 干净室：`cold-start` 3.4s GREEN（仓外 home + 钉版 DSH + tarball）；`moduleLeakOf` 从 home 根解析的
  临时 symlink 实验证明 profile 泄漏不可见（240）。
- `devRefsOf('src/…')`/`devRefsOf('packages/…')` 均 `[]`（245）；`lib/client.js` 10 条（244）。
- `run-driver` 211 vs 270（242）；`boot-run` 21 无守卫（243）；`pack-deps` host 前缀（246）/无 `import(`（247）。
- `tests/checks` 无 `-helpers`（248 的缺口是规则而非实例）。

## 覆盖地图

| 面 | 状态 | 判定 |
|---|---|---|
| tests/checks 发现面/owner | 已探（1 卡） | 248；其余 240 的 A 线复核关闭 |
| tests/checks 账本/索引/ledger | 已关闭 | 61/61；重生成绿 |
| 发布文本 src/packages | 已探（2 卡） | 244 / 245 |
| 干净室解析基/名单 | 已探（2 卡） | 240 / 241 |
| profile 守卫 | 已探（2 卡） | 242 / 243 |
| pack-deps 闭包 | 已探（2 卡） | 246 / 247 |
| 发布 manifest scripts | 已探（1 卡） | 249 |

## 验收标准

1. 240–249 全部有复现/证据/修法；A 线（tests/checks）有明确判定；未跑项写明原因。
2. 清洁室/依赖闭包/守卫的判据可执行；实例卡可逐条修。
3. `pnpm verify` / `pnpm test` 绿；本轮不改产品代码。

## 关闭条件

- 10 张卡有去向（修复就绪/等人拍板）；A 线 owner 间接规则与 B 线 pack/守卫决策落定；
- 覆盖地图更新；审查记录 `审查：agent｜用户｜跳过 — 理由`。

## 范围与排除

**范围**：`tests/checks/**`、`checks/lib/{repo,harness,channel,test-infra}`、`checks/smoke/{cold-start,release,lifecycle,pack}`、
`tools/channel/{run-driver,boot-run}`、`packages/deep-research-pack/{lib,package.json}`、`_dist` tarball。
**排除**：改产品代码/发布配置；真 run/真模型；重跑 219–239 已闭面；把维护者折叠段当用户指令。

## 判据形状

不适用（本卡不改产品判据；A/B 判据 = 上表；守卫落地 = 各卡修复判据）。
