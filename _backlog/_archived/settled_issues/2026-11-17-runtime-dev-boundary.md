---
status: 已结
opened: 2026-11-17
---

# 推敲：运行时/发布物 vs 开发时刻边界（2026-11-17 第二轮）

> 立卡：2026-11-17 ｜ 状态：已结（第一轮已跑；10 张卡 219–228） ｜ 类型：Task ｜ 结论：四层判据全部有判定；10 张卡 219–228 全部修复归档；发布面自足 = keyless 源侧 + nightly tarball 双载体；去向 = 批 Note ｜ 审查：agent — 红证回放 + 全量 verify/test/pack.e2e ｜ 可关闭：是（2026-11-17）
>
> **一句话**：发布出去的包（tarball / 安装后插件 / 模型可见 skill / 用户 README / 类型声明 / runtime 脚本）
> **不应携带或依赖开发时刻的仓内脚本、测试、环境设置与验证基础设施**；本轮按四层审计，10 张卡。
>
> 方法与前一轮 = [2026-11-17 命名空间搬家卡](2026-11-17-exploratory-namespace-move.md)（E1–E6、四态、证据落点）。

**问题与期望结果：** 用户指出「不少脚本/代码发布到运行时的不应该那么多；运行时代码/脚本不应依赖
开发时刻的脚本（测试、设置环境、未来测试/验证）」。这不是搬家路径问题，而是**发布边界**问题：
仓库里存在 ≠ 包里可解析；仓内门禁（`doc-paths`/`call-surface`）只验开发仓存在性，`pack.e2e` 只验必需件在场。
期望 = 把「发布物自足」变成可证伪的判据，找出实例并落卡；不改产品代码。

**当前情况：**

- tarball = `_dist/dsh-deep-research-pack-0.3.6.tgz`，**186 条目**；顶层只有 `content/`（22）、`lib/`（119）、
  `presets/`（20）、`scripts/`（7）、`workers/`（2）、locale（8）、README/LICENSE/icon/package.json；
  **没有** `checks/`、`tests/`、`tools/`、`docs/`、`_backlog/`、`runtime/`（发布物本身不夹带开发根）。
- 但发布物**文本/类型/清单**里有开发面引用：`lib/types` 111 个 `.d.ts`（exports 只 7 个）、README 用户段
  的 `node checks/smoke/…`、3 个 lead skill 的 `checks/`/`docs/`/`research-workspace/`、`lib/client.js` /
  `.d.ts` / `scripts/lib` / `cordis.patch.yml` / `presets/*.patch.yml` 的注释。
- 基线：`pnpm verify` / `pnpm test` 绿；`gates.e2e` 142 案例绿；`preset.e2e` 真挂载、`lifecycle.entry`、
  `pack.e2e`（186 条目）、`handoff/pack/run-accept/loader` 全绿；`cold-start` 在 `source tools/env.sh` 后 GREEN。

**未决问题：**

- 修法顺序：先定「公开类型面 = exports.types」收 `files`（219/228），还是先加发布物零 dev 引用守卫（227）？
  两者建议同一次评审。
- 用户 README 的维护者折叠段（`pnpm build`/`npm pack`）是否保留：属显式维护者语境，不在本批主症状。
- 3 个 skill 的修法：删路径 vs 内联状态合同/运行期变量；需要决定模型可见文本的自足载体规则。
- 发布物注释清理（224–226）是否用「改源注释」还是「构建剥离」；影响 sourcemap/公开类型文档。

**下一步：** 10 张卡全部 `修复就绪`（用户 2026-11-17 放行其余 7 张并拍板 5 个边界选择），按 §批修复 的
P1–P5 顺序推进；219/228（发布清单）、227（守卫）同批评审；220–223（用户/模型
可见文本）可先改；224–226（注释）为 P2 机械清理。本轮不改产品代码。

## 判据：四层

| 层 | 判据 | 本轮卡 |
|---|---|---|
| L1 发布清单/类型面 | tarball 集合 = 允许集；类型文件集合 = `exports.types` | 219 / 228 |
| L2 模型可见文本 | `presets/**/skills/**`、`content/**` 只依赖随包载体/运行期变量 | 221 / 222 / 223 |
| L3 构建与运行时文本 | `lib/**`、`scripts/**`、`cordis.patch.yml`、`presets/*.patch.yml` 零 dev 路径 | 224 / 225 / 226 |
| L4 用户文档 | 用户可见段命令必须在用户包装内可执行 | 220 |
| 门 | 发布物解包树上的「零 dev 引用」机械判据 | 227 |

**不变量**（本轮的判据来源）：发布物自足（shipped self-contained）；开发面引用 ≠ 运行期依赖；
模型可见文本必须自足或指向随包载体；发布清单与公开合同（exports/必需资产）双向相等。

## 执行记录（2026-11-17，keyless，0 模型）

| 卡 | 严重级 | 状态 | 一句话 |
|---|---|---|---|
| [219](../fixed_bugs/BUG-219-pack-types-unexported-dts-overshipped.md) | P2 | 修复就绪 | tarball 111 个 `.d.ts` 只有 7 个 exports 类型入口 |
| [220](../fixed_bugs/BUG-220-pack-readme-user-section-dev-smokes.md) | P2 | 修复就绪 | README 用户段让用户跑 `node checks/smoke/…`（不随包） |
| [221](../fixed_bugs/BUG-221-runtime-skill-references-dev-check-file.md) | P2 | 修复就绪 | `research-brief` 引用 `checks/lib/shared/plan-card.mjs` |
| [222](../fixed_bugs/BUG-222-runtime-skill-references-dev-design-doc.md) | P2 | 修复就绪 | `nodes-contract` 把 `docs/design/50…` 当状态合同正本 |
| [223](../fixed_bugs/BUG-223-runtime-skill-hardcodes-dev-workspace.md) | P2 | 修复就绪 | `question-patterns` 硬编码 `research-workspace/` |
| [224](../fixed_bugs/BUG-224-pack-client-bundle-dev-path-comments.md) | P2 | 修复就绪 | `lib/client.js` 12+ 条 dev 路径注释随发布 |
| [225](../fixed_bugs/BUG-225-pack-dts-dev-path-comments.md) | P2 | 修复就绪 | 10 个 `.d.ts` 带 `tests/`/`checks/`/`_backlog` 注释 |
| [226](../fixed_bugs/BUG-226-runtime-scripts-config-dev-path-comments.md) | P2 | 修复就绪 | `scripts/lib` + `cordis/presets` 注释带 dev 路径 |
| [227](../fixed_bugs/BUG-227-pack-boundary-no-shipped-dev-ref-gate.md) | P2 | 修复就绪 | 发布面没有「零 dev 引用」守卫（仓内绿 ≠ 发布绿） |
| [228](../fixed_bugs/BUG-228-pack-files-broad-allowlist-no-set-assertion.md) | P2 | 修复就绪 | `files` 广白名单 + `pack.e2e` 只验在场，无集合对账 |

## 批修复（2026-11-17 用户放行；批 Note 待收口）

用户 2026-11-17 放行全部 7 张 `等人拍板` 卡，并拍板 5 个边界选择；10 张卡同批修完再写一篇批 Note，
每卡仍有自己的 `fix-evidence`。

| 决定 | 选定 | 卡 |
|---|---|---|
| 公开类型面 | 收窄到 `exports.types` 的 7 个入口；104 个内部 `.d.ts` 不进包（入口可达闭包 = 7，已验证） | 219 |
| 注释修法 | 改源注释为行为/契约描述（不用构建剥离；源码即发布文本） | 224/225 |
| README 分段 | 用户段零 dev 命令；维护者折叠段保留 `pnpm build`/`npm pack` | 220 |
| 状态合同载体 | 指向随包 `content/generic/state-and-recovery.md` 并补足 | 222 |
| 发布清单 | `files` 显式允许集 + 集合断言（不再「目录全带 + 负模式」） | 228 |

**实施顺序**（先建立发布面 oracle，再修实例；清单/类型面与文本守卫同一次评审）：

1. **P1 发布面模块 + keyless 扫描**：新建 `checks/lib/repo/shipped-surface.mjs`（dev 引用词表 +
   运行期白名单 + 类型入口集合）与 `tests/checks/shipped-text.test.mjs`（扫随包源码文本 + `files`/`exports`
   集合不动量）；当前树**先红**。修 README 用户段、3 个运行时 skill、runtime 脚本/组合/content 注释。
2. **P2 清单与类型面**：`files` 改显式允许集；`pack.e2e` 加「`lib/types/**/*.d.ts` 集合 = `exports.types`」
   与「顶层条目集合 = 允许集」断言。
3. **P3 构建产物文本**：清 `src/**` 注释里的 dev 路径 → `pnpm build` → `lib/client.js` / `.d.ts` 零 dev 路径。
4. **P4 发布面守卫**：`pack.e2e` 在 `npm pack` 清单上扫随包文本（含构建产物）+ 防空/负控；
   evaluation / checks/README / registry 登记。
5. **P5**：批 Note、十卡归档、issue 收口、全量 verify/test/typecheck/pack.e2e 绿 + 语义自审。

**收口（2026-11-17）**：10 张卡全部 `已修` 并归档到 [fixed 池](../fixed_bugs/README.md)；批 Note =
[2026-11-17-shipped-boundary-self-contained](../../../notes/implemented/2026-11-17-shipped-boundary-self-contained.md)。
发布面判据 = `checks/lib/repo/shipped-surface.mjs`（文本 + 集合两 oracle），消费方 =
`tests/checks/shipped-surface.test.mjs`（keyless）+ `checks/smoke/pack.e2e.mjs`（真 tarball）+ `readme-shape`。
tarball 186 → 82 条目，`lib/types` 111 → 7 个公开入口；随包文本与构建产物零 dev 引用。
`pnpm verify` / `pnpm test` / `pack.e2e` 全绿；每卡红证回放记录在卡内 `fix-evidence`。

## 基线与负对照

- `pnpm verify` / `pnpm test` 绿；`gates.e2e` 142 案例绿；`pack.e2e` 186 条目 ALL PASS；`lifecycle.entry` /
  `preset.e2e`（真挂载）/ `handoff` / `run-accept` / loader 绿；`cold-start` 需 `source tools/env.sh`。
- 发布物本身**不夹带** dev 根（`tar -tzf | grep -E 'package/(checks|tests|tools|docs|_backlog|runtime|vendor)/'` = 0）；
  问题集中在「随包文本/类型/清单引用 dev」与「清单过宽」。
- 负对照：仓内 `doc-paths` / `call-surface` 对同一路径绿（存在性 oracle 是开发仓），证明发布面盲区。
- `scripts/` 7 件均由 doctor 的 import 树消费（`profile-read` → `version-range`），不是无用脚本；
  `workers/` 2 件是 worker preset 行；`content/` 无 dev 引用；`product-manual.md` / `_dist/安装手册.md`
  无 dev 命令（`pnpm` 是 DSH 安装前置语境）。

## 覆盖地图

| 面 | 状态 | 判定 |
|---|---|---|
| tarball 集合/类型 | 已探 → 卡 | 219 / 228 |
| 用户 README | 已探 → 卡 | 220 |
| 模型可见 skills | 已探 → 卡 | 221 / 222 / 223 |
| client bundle 注释 | 已探 → 卡 | 224 |
| 类型声明注释 | 已探 → 卡 | 225 |
| runtime 脚本/组合注释 | 已探 → 卡 | 226 |
| 发布面守卫 | 已探 → 卡 | 227 |
| tarball 是否夹带 dev 根 | 已关闭 | 0 条 |
| `scripts/` 是否过发 | 已关闭 | 7/7 由 doctor 消费 |
| `content/` 模型可见命令 | 已关闭 | 0 条 dev 命令；`drt_`/`research_pack_root` 为运行期约定 |
| 安装手册/产品手册 | 已关闭 | 无 dev 命令 |
| 安装后插件（dev home） | 未跑 | 本批以 tarball 为准；`lifecycle.entry` 覆盖真安装 |

## 验收标准

1. 219–228 全部有复现/证据/修法方向；四层各有判定；未跑项写明原因。
2. 发布面守卫（227）与清单对账（228）有可执行判据；实例卡（219–226）可逐条修。
3. `pnpm verify` / `pnpm test` 绿；本轮不改产品代码。

## 关闭条件

- 10 张卡有去向（修复就绪/等人拍板）；219/228/227 的评审结论落定；
- 发布物扫文本与扫集合两条判据至少一条落地（或显式不做）；
- 覆盖地图更新；审查记录写作 `审查：agent｜用户｜跳过 — 理由`。

## 范围与排除

**范围**：`_dist` tarball、`packages/deep-research-pack/{package.json,files,exports,README*,lib,scripts,presets,content,workers,cordis.patch.yml}`、
安装/发布入口（`pack.e2e`/`lifecycle`/`release`/`cold-start`）。
**排除**：改产品代码/发布配置；真 run/真模型；把「维护者折叠段」当用户指令；改写 runtime skill 的方法论内容
（只改 dev 引用与载体）。

## 判据形状

不适用（本卡不改产品判据；四层判据 = 上文表；守卫落地 = BUG-227/228 的修复判据）。
