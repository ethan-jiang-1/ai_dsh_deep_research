# RFC：vendor 升 pin 重校（`dsh-v0.1.5-rc.2` → `dsh-v0.1.7-rc.2`）

> 状态：proposed

归宿：roadmap §队列「升 pin 重校」（触发型 → 本次触发，升为 ▶）；依据 =
[discipline-map §重审触发路径](../../docs/discipline-map.md) + 用户指令（DSH 上游有最新 RC，
同步并确认既有工作无重大问题）。

## 目标 pin

| | 旧 | 新 |
|---|---|---|
| tag | `dsh-v0.1.5-rc.2` | **`dsh-v0.1.7-rc.2`**（上游 `ls-remote` 确认的最新 RC） |
| commit | `fb2c4b9e698e30edb738bca4cf0618587db7d203` | **`477b4f420553e8a52c2fbccc464d7561b239c443`** |
| 跨度 | 0.1.6-alpha.1/2 · 0.1.7-alpha.1/2 · 0.1.7-rc.1 · 0.1.7-rc.2 共六个 RC | — |

## 门禁已自动指出的迁移面（换 pin 即红——这正是重审触发器的用途）

- `vendor-pin`：PIN 常量与 tag 字样须更新（机械）；
- `align-ledger`：① `packages/preset/agent-presets/README.md` **已从上游删除**（源移位/消失）；
  ② 四个新结构面未登记：`.agents/skills/{agent-experience,dsh-client-ui-ux}/SKILL.md`、
  `docs/ui-radius.md`、`docs/cookbook/reviewing-persistence-type-changes.md`。

## 主要迁移（0.1.7 的 preset 重设计）

上游把 `@deepseek-ai/dsh-agent-presets` **整包删除**（`git ls-tree` 确认），改为：

- `@deepseek-ai/dsh-agent-preset`：**一个 preset = 一条 patch 行**，preset 的子插件在行内
  `config.plugins` 声明（不再有 `presets/<id>/agent.cordis.yml` 这种目录形态）；
- `@deepseek-ai/dsh-agent-preset-registry`：preset 注册与选择；
- 出厂 preset 由 bundle 携带：`packages/bundle/web-app/presets/{standard,ptc,minimal,cordis}.patch.yml`。

因此本仓要改的（**影响面**）：

1. `packages/deep-research-pack/`：四个角色从「`presets/<role>/{preset.yml,agent.cordis.yml,skills/}`」
   改成 0.1.7 的 preset 行形态；`cordis.patch.yml` 的 `agent-presets` bundle 行换成
   `agent-preset` / registry 行；`peerDependencies` 换成新包名与 `^0.1.7-rc.2`；
   `dsh.compatibility.dshReleases` → `["dsh-v0.1.7-rc.2"]`；
2. `dev/research.overlay.yml`（源码域 overlay）与 `dev/harness-home/profiles/research`（镜像）同步；
3. 脚本面：`scripts/lib/roles.mjs`（事实源 = 盘上 presets/ 的访问器）、`preset-smoke.mjs`
   （roster/结构断言）、`l4-lite-smoke.mjs` / `team-preflight-smoke.mjs` / `entry-chain-probe.mjs`
   （`session/create` 的 `agentPreset` 取值）、`release-smoke.mjs`（干净 profile 安装形状）；
4. 门禁面：`preset-structure`（断言 preset.yml 三字段 + agent.cordis.yml + ≥1 SKILL.md）、
   `role-list-sync`（角色清单事实源）、`pack-bundle-compat`（patch 指向）；
5. 测试面：`tests/presets.test.mjs`、`tests/evaluation-contract.test.mjs`；
6. 文档面：`docs/guides/62-plugin-authoring.md`（插件作者入口的 preset 形态）、`design/10`、
   `design/20`（角色）、`00-index` 术语映射、`discipline-map` 源 1–9、`alignment-ledger` 的
   preset 相关条目、`research-workspace/AGENTS.md`（若引用 preset 路径）。

## 阶段划分（每阶段 pre-commit 绿）

1. **阶段一（机械 + 台账）**：新 pin 就位；全仓旧 tag/commit 字样更新；台账移位源改指 + 新源登记；
   门禁绿。**L1/L2/真模型档在本阶段预期红**（preset 形态未迁移）——如实记档，不粉饰；
2. **阶段二（preset 形态迁移）**：pack 改 0.1.7 形态 + overlay/镜像 + 脚本 + 门禁 + 测试，
   直到 L1（`preset-smoke` 真挂载）与 L2（`release-smoke`）绿；
3. **阶段三（重审 + 结项）**：按 `discipline-map §重审触发路径` 逐条重读 vendor 源并改写受影响
   结论（三态表 / 术语映射 / guides 引用 / 台账），真模型档三脚本绿（l4-lite / team-preflight /
   entry-chain-probe），出「升 pin 复核结论」（发现、修复、仍存偏离与风险），条目毕业。

## 验收判据

- 门禁：`vendor-pin` / `align-ledger` / `repo-conventions` / `vendor-links` / `row-deps` /
  `preset-structure` / `role-list-sync` / `pack-bundle-compat` 全绿；
- 证据链：23 门禁 + tests + L1 + L2 + 真模型档三脚本全绿（新 pin 上实跑）；
- 全仓 grep 旧 tag/commit 零残留（历史记录中的"当时 pin"字样除外，须显式标注）；
- 复核结论记录在案并交用户验收。

## 输掉的方案

- **只换 commit、不动引用与台账**：门禁会红且台账失去"换 pin 即触发"的意义——触发器本来
  就是为了逼出这份工作；
- **跨版本一次跳完不留阶段记录**：0.1.6→0.1.7 有删除与重设计（preset 包、inspect 工具面），
  没有阶段绿点就无法区分"迁移没做完"与"新机制本来如此"；
- **把 vendor 就地改回兼容**：违反只读铁律（vendor-clean 门禁），且升 pin 的下一轮会再撞。

## 阶段一实录（2026-09-25，机械 + 台账）

- **新 pin 就位**：`git -C vendor/dsh checkout --detach dsh-v0.1.7-rc.2` → HEAD
  `477b4f420553e8a52c2fbccc464d7561b239c443`；`vendor/dsh status --porcelain` 空
  （`vendor-clean` 绿）；`git diff --submodule=short` 显示 gitlink `fb2c4b9e` → `477b4f4205`。
  tag 经 GitHub `ls-remote` 确认是最新 RC（本机镜像只到 `dsh-v0.1.7-rc.1`）。
- **引用更新**：13 个文件里的旧 tag/commit 字样全部换新（AGENTS / verify.mjs / release-smoke /
  tests/presets.test.mjs / design-10 / discipline-map / evaluation / alignment-ledger /
  notes-README / vendor-submodule Note / absorption Note / anatomy 报告 / pack package.json）；
  历史性记录（research 报告）加"（当时 pin）"标注，不冒充现行值。
- **台账收口**：移位源改指 `packages/preset/agent-presets/README.md` →
  `packages/preset/agent-preset/README.md`（附 0.1.7 重设计注记）；新登记四个结构面
  （`.agents/skills/agent-experience`、`.agents/skills/dsh-client-ui-ux`、`docs/ui-radius.md`、
  `docs/cookbook/reviewing-persistence-type-changes.md`）→ **101 源**。
- **门禁**：全绿（含 `vendor-pin` / `align-ledger` / `repo-conventions` / `vendor-links`）；
  `node --test tests/*.test.mjs` 23 pass。
- **预期红（如实记档，不粉饰）**：`DSH_SMOKE_REAL=1 node scripts/preset-smoke.mjs` →
  `ERR_MODULE_NOT_FOUND`——overlay 仍引用 0.1.7 已删除的 `@deepseek-ai/dsh-agent-presets`；
  dump 档（pack 自检）仍绿。L2 与真模型档未跑（同因）。按 RFC §阶段划分，这属于阶段二的入口条件。

## 用户加码（2026-09-25）：主线必须用最新 RC

同步后**主线整体切到 `dsh-v0.1.7-rc.2`**，不允许"pin 换了但主线还跑旧 RC"的双轨：

- run 通道（`dev/boot-run.sh` → web 3081）与其 **profile 镜像**（`dev/harness-home/profiles/research/`）
  必须装到新 RC（含 agent-team-profile 层随新树的可用版本）；
- 兼容矩阵（`dsh.compatibility.dshReleases`）与 peerDependencies 已指新 RC（阶段一完成）；
- 判据收紧：阶段二的完成条件 = **L1（preset-smoke 真挂载，源码域）与 L2（release-smoke，
  安装域）在新 RC 上绿**；阶段三 = **真模型档三脚本在新 RC 上绿**（含 run 通道一次真实交互）。
  旧 RC 只作为"回退记录"存在于 git 历史，不留在任何运行路径里。

## 阶段二进行中（2026-09-25）：preset 形态迁移

**已完成**：

- pack 改为 0.1.7 形态：四个角色 = `presets/<role>.patch.yml`（一条
  `@deepseek-ai/dsh-agent-preset` 行，`config.plugins` 内声明 persona/skills/工具行/手册注入），
  旧的 `presets/<role>/{preset.yml,agent.cordis.yml}` 删除；技能仍在 `presets/<role>/skills/`，
  `customSkillDirs` 的 `!!js` 路径改为 `new URL('<role>/skills/', baseUrl)`；
- `cordis.patch.yml`：替换行由旧 `agent-presets`（roots）改为 `agent-preset-registry`
  （`default: lead`）；`package.json` 的 `dsh.bundle.patch` 改为**文件数组**
  （`cordis.patch.yml` + 四个 preset patch）、peerDependencies 按 pack 实际引用重算（14 个，`^0.1.7-rc.2`）；
- **overlay 改为生成物**：新增 `dev/render-overlay.mjs`（从 pack 渲染 `dev/research.overlay.yml`）
  + 门禁 `overlay-fresh`（改 pack 不重渲染即红，带红证）——0.1.7 下 overlay 必须携带 preset 行，
  两处手写必然漂移；这是本仓首个 tracked 生成物（登记进 discipline-map 源 7）；
- 门禁迁移：`preset-structure`（新形态断言）、`pack-bundle-compat`（数组 + 必须携带 preset patch）、
  `row-deps`、`role-list-sync`（角色 = `presets/*.patch.yml`）——全绿；
- 脚本/测试/文档：`lib/roles.mjs`、`preset-smoke`、`release-smoke`、`team-preflight`、
  `boot-run.sh`（镜像检测按 patch 文件）、`tests/presets.test.mjs`、`tests/evaluation-contract.test.mjs`、
  pack README/AGENTS、guides/62、design/20、00-index 术语映射、`adding-a-research-role` 技能、
  evaluation 台账行。

**遇到的坑（记录在案）**：换 pin 后 vendor 树的 **gitignored 构建产物是 0.1.5 的陈旧物**——
`pnpm run build` 报 `[MISSING_EXPORT] "SettingsProvider" is not exported by ../settings/src/index.ts`
（旧 `lib/types/index.js` 引用已删除的导出）；vendor 自带的 `pnpm run clean` 也被旧残留绊倒
（`expected TypeScript outDir to end in /types: lib/desktop-keyboard-test-types`）。处置 =
手工删 `packages|apps|vendor` 下（非 node_modules）**327 个陈旧 `lib/` 目录** + 删除已删包的
残留 `packages/preset/agent-presets/`，`vendor-clean` 仍绿——**升 pin 的固定动作应加上
"清陈旧构建产物"这一步**（重审清单已补）。

**坑 2（同批）**：清掉 `lib/` 后 `pnpm run build` 仍红——`[@deepseek-ai/dsh-root] Cannot find entry:
["lib/types/{index,invariant,startup}.js"]`。根因是 **280 个陈旧 `*.tsbuildinfo`**：`tsc -b` 认为
"已最新"而跳过 emit，tsdown 便找不到入口。处置 = 一并删除（gitignored 构建状态），
vendor 树仍干净。**升 pin 固定动作补两条：删 `lib/` + 删 `*.tsbuildinfo`**（或跑 vendor 的
`pnpm run clean`——但它在旧残留上会自己失败，所以手工清扫是可靠路径）。

## 阶段二状态（本轮结束点，2026-09-25）

**已通**：模块解析（新包在宿主根已 link）；pack 新形态 + overlay 生成 + 门禁/tests/文档全绿。

**当前卡点（两条，均已定位）**：

1. **vendor `pnpm run build` 仍红**：清 `lib/` 与 `*.tsbuildinfo` 后，卡在
   `[@deepseek-ai/dsh-root] Cannot find entry: ["lib/types/{index,invariant,startup}.js"]`
   ——`tsc -b tsconfig.host.json` 没有产出根包的 `lib/types`。**这不是我们引入的**：语料自身的
   维护页记过同类环境阻断（`doc-typecheck` 缺同一组构建入口）。待查：根包 tsc 目标与 tsdown
   入口的先后关系（`build:lib:host` 的 `&&` 链），以及是否需要先跑 `gen:*`。
   **运行面不完全依赖它**：本仓启动走 tsx 源码（`node --import tsx/esm apps/cli/src/bin.ts`）。
2. **dev home 的 `web` profile 是 0.1.5 时代装的**：L1 真挂载现在报插件装载诊断
   （`Plugin client-hmr — Missing services: clientModules`），说明 profile 的组成/依赖仍指向旧
   RC。处置候选：① 用 `release-smoke`（L2 从零建干净 profile）作为新 RC 的首个绿点；
   ② 重建 dev home 的 `web` profile（0.1.7 模板）后再跑 L1；③ `boot-run.sh` 重建 `research`
   profile 同理。

**下一轮入口**：先跑 L2（`node scripts/release-smoke.mjs`，它自带干净 profile 构建）拿到新 RC
的第一个端到端绿点 → 再按需重建 dev home profile 使 L1 真挂载绿 → 之后 L4 真模型三脚本 →
阶段三逐条重审 + 复核结论。

## 构建卡点精确定位（本轮结论，2026-09-25）

**为什么必须构建**：0.1.7 新增 `typert-loader` 贡献者机制——启动时它 import 每个贡献包的
`./typert` 子路径（`lib/typert.host.js`）。实测诊断（`dev/harness-home/logs/startup-*.log`）：
`typert-loader: 21 typert contributor(s) failed to register … Cannot find module …/lib/typert.host.js`
→ **主线在 0.1.7 必须有 host 面构建产物**（源码启动不再自足）；`lib/typert.host.js` 由
`tsdown` + `typertPlugin` 在 host 遍生成。

**卡在哪**：vendor 自己的 `pnpm run build:lib:host` = `tsc -b tsconfig.host.json`（✅ 逐包产出
`lib/types/**`）+ `tsdown --env.DSH_BUILD_FACE host`（❌）。tsdown 报
`[@deepseek-ai/dsh-root] Cannot find entry: ["lib/types/{index,invariant,startup}.js"]`：
根 `tsdown.config.ts` 的 entry glob 是**逐单元**应用的（各包用自己 tsc 产出的 `lib/types/*` 当入口），
而 **root 包没有 src、也就没有 `lib/types/*`** → 根单元必红。这不是我们引入的：语料维护页记过
同类（`doc-typecheck` 缺同一组入口）；vendor 自带 `pnpm run clean` 在旧残留上也会自我失败。

**已试**：`tsdown -F '/^(?!@deepseek-ai\/dsh-root$)/'` → `No valid configuration found`
（`-F` 是正向 name/cwd 过滤，不支持负向排除）。

**下一轮可选路径（按代价排序）**：

1. 摸清 `-F` 语义（正向逐名过滤出需要的包）→ 用我们自己的封装脚本跑 host 构建
   （不改 vendor：命令与配置都在本仓，产物落 vendor 的 gitignored `lib/`）；
2. 本仓写一份 host 构建配置（`entry` 不设/按包 exports 派生 + `typertPlugin` 用绝对路径 import），
   以 `tsdown -c <本仓配置>` 覆盖 root 单元行为；
3. 只对 21 个 typert 贡献包逐个跑 typert 生成（最窄，但要自己驱动插件）。

**旁证/记账**：`tsc -b tsconfig.host.json` 与 `tsc -b tsconfig.client.json` 都跑得通；
本轮也已把「清陈旧 `lib/` + 清 `*.tsbuildinfo`」写进升 pin 固定动作。
