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
