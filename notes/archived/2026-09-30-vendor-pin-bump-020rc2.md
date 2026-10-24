# vendor 升 pin 重校（`dsh-v0.1.7-rc.2` → `dsh-v0.2.0-rc.2`）

> 状态：implemented
> 归档：2026-10-24

归宿：用户直派（2026-09-30：「我们本身也要升级到 dsh-v0.2.0-rc.2 的依赖，vendor/dsh 这里」）；
程序与影响面判据 = [guides/60 §2 任务型路由表「换 vendor pin」行](../../docs/guides/60-dev-loop.md)；
上一轮升 pin 的程序正本 = [vendor-pin-bump-017rc2 Note](2026-09-25-vendor-pin-bump-017rc2.md)
（本轮与它互为部分承接：固定动作清单由那轮建立，本轮补两条并全档复跑）。

## 决定

**vendor pin 换到上游最新 RC `dsh-v0.2.0-rc.2` @ `639ed015397290b3745d163aafe02ffee4aa3f84`**，
主线（research profile + run 通道）随之整体切新 RC（不许双轨——上轮用户加码沿用）；按
[discipline-map §重审触发路径](../../docs/discipline-map.md) 逐条重审，复核结论见下节。

## 目标 pin

| | 旧 | 新 |
|---|---|---|
| tag | `dsh-v0.1.7-rc.2` | **`dsh-v0.2.0-rc.2`**（上游最新 RC，本机镜像 fetch 确认） |
| commit | `477b4f420553e8a52c2fbccc464d7561b239c443` | **`639ed015397290b3745d163aafe02ffee4aa3f84`** |
| 跨度 | 448 个 commit | — |

## 迁移面（与 0.1.5→0.1.7 相反：机械面小、纪律面零破坏）

**包零删除**（4 个新增：client-product-analytics、client-ui-settings-session-log、
experimental-schedule-bundle、otel）；preset 行形态、`agent-preset`/`agent-preset-registry` 包名、
pack 的 15 个 peerDeps 目标包全部原样存在——**0.1.7 形态迁移这轮完全不需要**。engines.node 不变。
上游 web-app bundle 把 `schedule`/`time-context` 行摘出默认组合、新增 product telemetry 行，
本仓 pack/overlay 对这些行零引用（grep 实证），无涟漪。

机械改动：pin 就位；13 处现行 tag/commit 字样换新（verify.mjs PIN、release-smoke、export-dist、
presets.test、AGENTS §DSH 源码表、evaluation §L0、discipline-map 源头行、design/40、pack
package.json + README、alignment-ledger `_note`、lockfile specifiers ×15、boot-run 注释、
00-index 一处版本限定语）；`_dist/安装手册.md` 重导出；overlay 重渲染（内容不变）。

## 升 pin 固定动作本轮新增四条（坑实录）

1. **vendor 内部 `node_modules` 随新 pin 刷新**：`vendor/dsh` 内部有一份独立安装（0.1.7 树时代，
   vendor root devDeps 如 vitest 不在 root workspace 成员覆盖内）。0.2.0 下 playwright/vitest 的
   双版本分裂（root 1.63.0/4.1.11 vs vendor 内部 1.61.1/4.1.8）先在 benchmarks 撞 TS2345。
   处置：① root lockfile 对齐上游解析（apps/web playwright→1.61.1、三个 vitest importer→4.1.8、
   inspector playwright→1.61.1，`pnpm --filter … update` 实证）；② `cd vendor/dsh &&
   pnpm install --frozen-lockfile` 刷新内部安装。此步进固定动作清单（`--clean` 只清 `lib/` 与
   `*.tsbuildinfo`，不清 node_modules）。注意 vendor 内部 install 的 root postinstall
   （lefthook `extensions.worktreeConfig`）在 submodule 里会失败——首次全量装用
   `--frozen-lockfile` 已够，前端壳构建不走 vendor 内部脚本（从本仓 root workspace 跑，
   vite = root 管理的 6.4.3；vendor 内部那份 vite 8 与其 worker 插件不配套）。
2. **typert emit 过滤器改按面严格**：0.2.0 里 `@deepseek-ai/dsh-api-session-controller` 的 client
   源新注册 typert 但 manifest 未声明 `./client/typert`（上游 `files` 也只认 host 面），面无关
   过滤把它送进 client 面生成即撞 `must export ./client/typert` 校验错。
   [vendor-typert-emit.mjs](../../dev/vendor-typert-emit.mjs) 过滤器改为：host 认 `./typert`/`./remote`、
   client 只认 `./client/typert`——与 typert-loader 运行时实际 import 面一致（0.2.0 全树无包声明
   `./client/typert`，client 面 0 件即正确状态）。
3. **（脚本容错面）聚合 client typecheck 红 ≠ 叶发射失败**：0.2.0 的 `tsconfig.client.json`
   聚合是 `noEmit` 纯 typecheck，其 tests 夹具红 TS2883（`@vitest/spy` Procedure 不可命名——tests
   靠上游单层安装的 hoist 解析 vitest，本仓双层安装下 `@vitest/spy` 不在测试文件解析路径上，
   类型不可命名）；而 vendor-build 真正需要的**叶项目 lib/types 发射**先于聚合程序完成。
   [vendor-build.sh](../../dev/vendor-build.sh) ④ 步改为：tsc 红时验金丝雀叶产物
   （`packages/client/ui-sidebar-right/lib/types/index.d.ts`），缺失即真失败中止；齐全则显式
   打印该偏差继续。上游 CI 同命令通过、本仓红 = 双层安装环境的已知偏差，非本仓机制退化。
   根治方向（合并为单层安装 + root 公共 hoist）登记为已知限制，见下文。
4. **host 半补建扫描补 `vendor` 前缀**：`--clean` 会清掉 vendored cordis 全家
   （`vendor/cordis`、`cosmokit`、`schemastery`）的 `lib/`，而 ⑦ 的缺件扫描只扫
   `packages apps`——前端壳构建随即红在 `Failed to resolve entry for package
   "@deepseek-ai/cordis"`。[vendor-build.sh](../../dev/vendor-build.sh) ⑦ 扫描改为
   `packages apps vendor` 三前缀，cordis 全家经本仓 host 半补建配置逐包补齐。

## 输掉的方案

- **只换 commit、不刷新安装面**：root lockfile 的旧解析（playwright 1.63.0 / vitest 4.1.11）与
  vendor 内部旧安装（1.61.1 / 4.1.8）并存会让 benchmarks 的 tsc client 遍撞双版本 TS2345——
  门禁红就是重审触发器，不能粉饰；
- **为聚合 typecheck 红去改 vendor（改 tsconfig / 补 manifest 声明）**：违反只读铁律
  （vendor-clean 门禁），且 TS2883 的根因在双层安装环境而非 vendor 内容——升 pin 下一轮会再撞；
- **跳过 0.2.0 直接等 0.2.0 正式版**：本仓的机制权威正本 = 上游最新 RC（上轮用户定调主线必须
  用最新 RC），滞后会让 discipline-map 的重审基线失真。

## 升 pin 复核结论（2026-09-30，本节 = 该轮重审正本）

按 §重审触发路径 逐条重读 vendor 源，**实质命中一处，登记一处，其余无命中**：

| 源 | 0.1.7 → 0.2.0 变化 | 本仓处置 |
|---|---|---|
| 根 `AGENTS.md` · `.agents/skills/dsh-create-upgrade-guide/SKILL.md` | 新增 Conventions：对外可感知破坏面在其引入的变更内即写 `docs/upgrade-guide/v<version>/`（新技能承载） | discipline-map 源 1 增行（不适用——pack private 无下游消费者，破坏面结论由升 pin Note 承载）+ alignment-ledger 登记该技能（na） |
| `.agents/notes/README.md` · `archived/AGENTS.md` | 归档冻结规则的 seal-transition 例外措辞细化（Figma 链接移除的三个精确旧→新例外） | 本仓 archived/ 纪律原文未变；无命中 |
| `docs/AGENTS.md` | 预算数字微调（root AGENTS ≤1960） | 本仓预算自持；无命中 |
| `packages/README.md` | 新增 `telemetry/` 组 | 本仓不引用 vendor 包分组；无命中 |
| `scripts/run-gates.ts` | 新增 `ci-unit` 聚合、coverage 参数收敛 | 本仓门禁集自持（evaluation §L0）；无命中 |
| `docs/architecture.md` | Desktop runtime 措辞 + failed-step tool-results 一行 | 本仓未引用这两节结论；无命中 |
| `.agents/skills/**` | 新增 `dsh-create-upgrade-guide` 一个，其余不动 | 台账登记（上表）；本仓技能清单不变 |
| `vendor/README.md` · `snapshots/AGENTS.md` · `docs/testing.md` · `scripts/AGENTS.md` · `packages/AGENTS.md` · `.github/AGENTS.md` | 无变化 | 无命中 |

## 实际跑过的验证（全部在新 pin 上实跑）

| 面 | 结果 |
|---|---|
| L0 门禁 | 全绿（30 门禁；`vendor-pin` 钉 `639ed01539`、`align-ledger` 102 条源面、`repo-conventions`/`pin-agreement` 对新树一致） |
| L0 tests | 112 pass / 0 fail |
| L1 源码域真挂载 | `preset-smoke: ALL PASS`（roster + 四角色 session/create + skills 硬隔离） |
| L2 安装域 | `release-smoke: ALL PASS`（pack → 干净 profile → plugin add → 四角色真挂载） |
| L4-lite 真模型 | `l4-lite-smoke: ALL PASS`（四角色 assistant 响应 + scout 真调 web_search） |
| team 机制预检 | 首跑 6 红（research profile 团队层仍 0.1.7 → `boot-run.sh` 重建到 0.2.0-rc.2 后剩 1 红）；修冒烟成员发现后 `ALL PASS`（spawn_teammate ×2 + list_agents + one-shot + 两成员标记） |
| run 通道（主线） | `dev/boot-run.sh` 漂移检测红（预期）→ 按 its 处方删旧 profile 重建，组合校验绿、层 = `@deepseek-ai/dsh-experimental-agent-team-profile@0.2.0-rc.2` |
| 入口链探针 | `entry-chain-probe: ALL PASS`（首跑 180s 超时 = 模型五文件阅读未完，重试即过——无机制红） |

**勘误（同日，plugin-shelf-adoption 轮发现）**：上表的 run 通道/boot 只证了宿主侧；**浏览器观察面
当时实坏未被发现**——Web boot 17 个 client 包 failed / 60 entries did not activate，根因 =
`vendor-build.sh` 固化顺序把 tsdown client（bundle 生成）放在 host 半补建**之前**，client bundle
构建时 `dsh-typert-protocol` / `dsh-util-workspace-path` 等"纯折"依赖缺 `lib/index.js` 被静默
外置成 require，浏览器模块表答不出（报错自述 "build-time externals drift"）。漏网原因 =
换 pin 必跑面（L0+L1+L2+L4-lite）不含 client-load-smoke。处置：⑤ host 半补建移到 ⑥ tsdown
client 之前（顺序铁律入脚本注释）、guides/60 路由表补 client-load-smoke 进换 pin 必跑面、
重跑 tsdown client 后浏览器探针 0 failed / 0 console 错误、client-load-smoke 横幅断言转绿。
（0.1.7 轮未踩此坑是调试时序凑巧，非顺序正确。）

**冒烟侧修正（team-preflight 成员发现，0.2.0 日志格式实证）**：lead 日志的
`Background subagent <uuid>` 行在 0.2.0 是**完成通知**（只落先完成者，后完成者被收场截断），
当成员全集会在单成员场景假红（scout 机制实绿但 id 提取缺席——直接读成员会话日志证实其标记在）。
[team-preflight-smoke.mjs](../../scripts/smoke/team-preflight-smoke.mjs) 成员发现改为**按 spawn prompt
标记内容扫描近窗会话**（窗口 60min）——与 2026-09-25 的顺序免疫修正是同一哲学；lead 日志提取
检查随之退役。

## 已知限制与延后工作

- **双层安装的类型可命名性偏差**：本仓 root workspace 与 vendor 内部安装并存，聚合 client
  typecheck 的 tests 夹具红 TS2883（vendor-build ④ 步金丝雀守门）。根治 = 合并为单层安装
  （vendor root 的 devDeps 入 root、root 公共 hoist `@vitest/spy`、vendor-build 改用 root 二进制）
  ——动作大、收益是去掉一处脚本容错，待下次升 pin 或 vendor-build 痛点再现时立项。
- `team-preflight` lead 末标记对模型服从度敏感（上轮存档的历史脆点，非本仓机制）。
