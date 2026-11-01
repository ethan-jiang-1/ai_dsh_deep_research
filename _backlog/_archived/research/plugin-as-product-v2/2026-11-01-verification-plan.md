---
topic: plugin-as-product-v2
intent: 给出目标形态的验收矩阵——每片退出判据、证据档位、新门禁与反证、发布前检查
---

# 验收计划

## 0. 三条硬规则

1. **真启动才算装成**：`--dump-config` 有 row 不等于能跑；每次形状变更必须在干净 profile 上真启动一次，stderr 无 `did not activate` / `skipping profile bundle`（FAQ 26 `37-lifecycle-stages.md` 发布前判据 3）。
2. **新门禁先看红**：任何新增/加宽的门禁与契约测试，同 diff 记录"注入回归 → 红 → 还原 → 绿"（writing-a-gate 技能）。
3. **档位诚实**：keyless 证管道，with-key 证 agent；需要 registry / Playwright / 真模型的冒烟缺前置时 exit 2，不得记绿。

## 1. 面与证据

| 面 | 证据 | 判据 |
|---|---|---|
| L0 结构 | `pnpm verify` + `pnpm test` | 包形状、行依赖、preset 结构、文档链接、backlog 结构、无种子残留 |
| L1 挂载 | `preset-smoke`（真 profile、真挂载、keyless） | 五 preset 仍在 roster；skills 隔离；`content` 行注册后手册进组装请求（keyless 断言注册 + 文本） |
| L2 安装/首启 | `install-shape-smoke` / `release-smoke` / `product-boot-smoke` | 手册三步原样执行 → 真启动 → 工作区会话 → 浏览器首屏 |
| L3 领域 | `l4-lite-smoke`（真模型） | Lead 按注入的手册工作：HITL1 三问、bundle 落盘、模板结构、证据 frontmatter |
| L4 交付 | 一次真实 run + `run-accept` | 交付链、`present` 相对路径、回执三态 |

## 2. 每片退出判据

### S0

- D40 与决策卡、研究题名页互链；`pnpm verify` 绿。
- 四个分叉的用户答复记录在决策卡 `## 决定` 或 `## 方案与取舍`。

### S1 内容进包

新增/改写：

- `tests/pack/content-injection.test.mjs`（keyless）
  - `content/manual.md` 在场、非空、含 `{{research_pack_root}}`；
  - 注入行注册 `context` 与 `variable`，dispose 后撤销（用假 ctx 计数）；
  - 包内**不存在** `workspace/AGENTS.md`、`NODES.md`、`question-patterns.md`、`seed.json`；
  - 模板 8 件在 `content/templates/run/`，文件名与手册表一致。
- `tests/pack/presets.test.mjs` 改读新路径；Lead 的 skills 列表含 `nodes-contract` / `question-patterns`。
- `scripts/verify/gates/e-workspace.mjs`：删 `workspace-contract` / `handbook-budget` / `pack-workspace-fresh`；新增 `no-seed-in-package`（反证 = 放一个 `workspace/seed.json` 看红）。
- `snapshots/replay/research-face/snapshot.json` B 层重录：请求 diff 里出现 `research:manual` runtime context，且不再出现 `Instructions from: AGENTS.md`（产品手册那一段；用户项目的 AGENTS.md 仍可出现）。

退出：

- `pnpm verify` + `pnpm test` 绿；
- `snapshot-replay-smoke` 绿且 diff 证明了渠道变化；
- `l4-lite-smoke`（真模型档）绿：Lead 的首轮仍按手册产出 question/topics/plan；
- 手工：空目录启动 → `ls -A` 只有 `drt_*` / `archive` / `_abandoned` / `method-library.md`（若还没跑过 run，则只有用户自己的文件，一个都不多）。

### S2 启动期工作区

改写：

- `tests/pack/startup-settings.test.mjs`：schema 2、原子写、坏文件回退、`workspace` + `sessionId` last-wins。
- `tests/pack/startup.test.mjs`：无设置零行为；有设置 → 只 `workspaceRegistry.create`（不建会话）；env 覆盖只作用于本次；目录缺失不创建；registry 缺席只 warn。
- `tests/pack/product-startup.test.mjs`（新）：`readCurrentSessionId` / `pickProductWorkspace` / `needsProductSwitch` 纯谓词。
- `scripts/smoke/product-boot-smoke.mjs`：
  - 断言产品 profile = `deep-research`，bundle roster 含 base/web-app/pack/team；
  - 断言设置文件在场且 `workspace` = 沙箱工作区；
  - 断言 `workspace.json` 有该路径；**页面加载后** session header `cwd` = 工作区、`agentPreset` = `lead`（不假设服务端在任何 HTTP 之前建好会话）；
  - 断言工作区里无产品内容文件（capability scan）；
  - **新增**：不传 env、无 launcher，直接 `dsh --profile deep-research` 也能落到同一工作区。
- `scripts/smoke/install-shape-smoke.mjs`（新）：原样执行手册三步（profile init → plugin add → 真启动）；断言 roster 三状态、无 `did not activate`、首屏可达。
- `tests/run/run-driver-contract.test.mjs:119-133`：README/00-index/project-map 的首动作 = 产品 entry。

退出：

- `product-boot-smoke` 绿（含原生启动分支）；
- 浏览器断言：首屏有产品名 + 当前工作区；未设置时有目录选择入口；当前会话错工作区时有横幅（用预置 session 复现）；
- `data-smoke` 绿：插件代码对 `$DSH_HOME` 只写产品设置文件；无 storage domain、无新 session event。

### S3 文档与分发

- `pnpm verify`：`md-links` / `md-anchors` / `doc-budgets` / `dist-manual-version` 绿。
- `tests/run/run-driver-contract.test.mjs`、`tests/contracts/docs-consistency.test.mjs` 改后绿。
- 一次 `node scripts/dist/export-dist.mjs`：tarball inventory 无 `workspace/`、有 `content/`；手册指名新 tarball 与版本。
- 人工：按 `_dist/安装手册.md` 从零走一遍（真实 home + 真实 dsh），记录命令与耗时。

### S4 硬化

- `release-smoke`：干净 profile + tarball → 真启动 → 首屏；无 `did not activate`。
- `upgrade-smoke`：0.2.0 → 0.3.0 的路径写清"旧装法 remove 后按新法装"；不承诺种子迁移。
- `data-smoke` / `user-env-smoke` / `profile-matrix-smoke`：工作区数据不因装/卸消失；别的 bundle 不受影响。
- `npm pack --dry-run`：README 提到的每个脚本/资源都在包里。
- 真模型一次完整 run：HITL1 → 组队 → 证据 → review PASS → HITL2 → `final/vN` + present → `run-accept`；产物只落在工作区。

## 3. 新增 / 加宽的门禁与反证

| 门禁 | 断言 | 反证（先红） |
|---|---|---|
| `no-seed-in-package` | 包内不存在 `workspace/` 与 `seed.json`；`files` 含 `content/**` | 临时放回 `workspace/AGENTS.md` → 红 |
| `content-injection-shape` | 包声明 `./content` export；注入行在 bundle patch 中 insert；手册文本在场 | 删注入行 → 红 |
| `startup-settings-schema` | 设置 schema 2；未知版本 fail loud；无秘密字段 | 写 schema 999 → 红 |
| `workspace-footprint`（冒烟断言，不是门禁） | 空工作区启动后没有产品内容文件 | 启动前塞一个 `AGENTS.md` → 冒烟失败 |
| `dist-manual-version` | 手册版本 = 包版本；手册提到的 tarball 存在 | 改版本不重导出 → 红 |

门禁台账（`docs/evaluation.md` §L0）与 `scripts/verify/gates/` 同 diff；`gates-smoke` 的 case 表跟改。

## 4. 生命周期四阶段的证据对账（FAQ 26 / 37）

| 阶段 | 本产品的证据 | 通过判据 |
|---|---|---|
| ① 装 | `install-shape-smoke` + `release-smoke` | 手册三步原样可跑；pnpm exit 0、dependency 写入、`dsh.profile.bundles` 含包（第三状态）；`--dump-config` 有本包 row |
| ② 起 | `product-boot-smoke`（真 Web + 浏览器）；stderr 扫描 | 真启动无 `did not activate` / `skipping profile bundle`；装后重启才生效的行为写进文档 |
| ③ 配 | `tests/pack/startup-settings.test.mjs`；`data-smoke` | 默认值只在 bundle patch；产品设置文件不含秘密、不写 patch/storage domain；不使用 home 供货 |
| ④ 首启 | `product-boot-smoke` + 浏览器断言 | token URL 可进；首屏有产品名与工作区；未设置时给目录选择；不依赖 `welcome-notice` |

## 5. FAQ 26 / 37 发布前判据对账

| # | 判据 | 本产品的答案 |
|---|---|---|
| 1 | 包声明 `dsh.bundle.patch`；装完进 roster；dump 有自己的 row | 是；bootstrap 读回 roster 三状态 |
| 2 | GUI 安装说明一句话；CLI 标"仅 `dsh web`"；无 `--profile desktop` | 主路径是自有 profile 的 bootstrap；应用内装作为产品内更新/互操作，不写 `desktop` |
| 3 | 真启动无 `did not activate` | product-boot-smoke + release-smoke |
| 4 | 默认值在 bundle patch；home 不供货 | 产品默认在 bundle；不使用 home 供货 |
| 5 | 首启可推迟；不依赖 `welcome-notice`；Desktop 有替代 | 首屏由 client 行回答；不承诺 Desktop |
| 6 | `npm pack --dry-run` 覆盖 README 提到的脚本/资源 | S4 检查 |
| 7 | 版本门两处都写 | `engines.dsh` + `dsh.compatibility.dshReleases` |
| 8 | 升级先升版本再打包 | guides/64 + release-check |

## 6. 已知的验收缺口（不冒充已证）

- `uiWorkspace.openSession` 的确定性选中：本仓尚未跑过 client 插件调用；P1。
- GUI onboarding 持久化工作区：需要产品 remote；P1。
- Desktop / Windows 真机；正式 npm registry。
- 18.5 KB 手册注入后的模型行为只在 l4-lite 与一次真实 run 取样，不做统计保证。
