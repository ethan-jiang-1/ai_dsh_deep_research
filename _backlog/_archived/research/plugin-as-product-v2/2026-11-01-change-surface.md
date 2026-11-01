---
topic: plugin-as-product-v2
intent: 盘点目标形态的全仓改动面（代码、开发仓、测试、文档、分发）并给出 S0–S4 落地分片
---

# 改动面与分片

## 0. 总量

| 组 | 文件数（约） | 风险 |
|---|---|---|
| 包代码 / 启动面 | 10 | 高（行为与合同） |
| 包内容（种子 → 包内 content） | 18 | 高（模型可见） |
| 开发仓脚本 / 生成器 / 门禁 | 16 | 高（门禁与冒烟） |
| 测试 | 17 | 高（大量按路径断言） |
| 文档（含 `_dist` 生成） | 20 | 中（同一叙事） |
| 研究 / 决策记录 | 6 | 低 |
| **合计** | **≈ 58** | |

两个结构性依赖：

1. **测试按路径读种子**：`tests/pack/presets.test.mjs:186-236`、`tests/contracts/{run-bundle-charter,rerun-triage-contract,evaluation-contract,data-plane-invariants,navigability-contract}.test.mjs`、`scripts/lib/gates-cases.mjs:582,597-613` 都直接读 `packages/deep-research-pack/workspace/...`。内容搬家必须同 diff 改这些断言。
2. **`docs-consistency` 要求根 `AGENTS.md` §布局逐项点名 pack 的 `workspace/` 目录**（`tests/contracts/docs-consistency.test.mjs:36-64`）；目录改名/消失必须同 diff 改 AGENTS，否则红。
3. **根 `README.md` 正好顶在 60 行预算**（`scripts/doc-budgets.json`）；产品叙事翻转需要先压缩，或按处置序升顶并同变更登记理由。

## 1. 包代码 / 启动面

**删除**：`scripts/launch.mjs`、`scripts/lib/launcher/{args,settings,profile,profile-plan,workspace}.mjs`、`scripts/scaffold.mjs`。产品不再有 launcher/scaffold；安装与启动全部走 DSH 命令。

| 文件 | 改什么 |
|---|---|
| `scripts/preflight.mjs` → `scripts/doctor.mjs` | 只读 doctor：profile roster 三状态、团队层版本、凭据、工作区可写、产品设置可读；不安装、不启动、不写 profile；bin 改 `dsh-deep-research-doctor` |
| `src/lib/product-settings.ts`（新） | 设置 schema 2、路径解析（`$DSH_HOME` 或 `~/.dsh`）、原子写、坏文件备份、目录校验；Host 服务与 doctor、测试共用（构建后 `lib/product-settings.js`） |
| `src/workspace-boot/index.ts` → `src/startup/index.ts` | 读设置（env 覆盖）→ 校验 → `workspaceRegistry.create` → best-effort Lead 会话；不新增 Remote；失败只 log |
| `src/client/startup/`（新） | client 启动控制器：`get` → `session.create` → `uiWorkspace.openSession`；无工作区 `shell.overlay` onboarding（`directoryPicker` + 手动路径）；`set` 持久化；错工作区横幅 |
| `src/content/index.ts`（新） | Host 行：`content/manual.md` → `ctx.systemPrompt.context()`；注册 `research_pack_root` 变量；固定 order 205；`interpolate: true` |
| `package.json` | bins 只留 `dsh-deep-research-doctor`；删 `dsh-deep-research` / `dsh-deep-research-scaffold`；files `content/**` 替代 `workspace/**`；exports `./startup`、`./content`、`./doctor`；peers 按实际 import |
| `cordis.patch.yml` | 删 `research-workspace-boot`；insert `research-startup` + `research-manual` + client startup 行；其余不动 |
| `scripts/dist/export-dist.mjs` | must-list 改 content；删 seed 校验；模板数从 content 数；doctor 随包 |
| `scripts/verify/gates/*` | 删 workspace 合同/种子新鲜度；加 content-shape / no-installer / install-doc-shape |
| `dev/*` | 删 sync-pack-workspace；overlay 重渲染；boot-run/run-driver 不再依赖 launcher；dev 设置写 home 级 |

## 2. 包内容（种子 → content）

| 现在 | 目标 |
|---|---|
| `workspace/AGENTS.md` | `content/manual.md`（改：注入渠道、`{{research_pack_root}}` 模板路径、项目指令优先、无种子声明） |
| `workspace/NODES.md` | `presets/lead/skills/nodes-contract/SKILL.md`（frontmatter + 正文；按需加载） |
| `workspace/question-patterns.md` | `presets/lead/skills/question-patterns/SKILL.md` |
| `workspace/templates/run/*` | `content/templates/run/*`（路径由 `{{research_pack_root}}` 解析） |
| `workspace/method-library.md` | 删（首次保存由 `method_library_upsert` 创建） |
| `workspace/.gitignore.example` | 删（产品不再写 `.gitignore`） |
| `workspace/seed.json` | 删 |
| `presets/lead/skills/research-brief/SKILL.md:12`、`research-planning/SKILL.md:54` | 改指 `question-patterns` / `nodes-contract` skill，不再读 cwd 文件 |
| `presets/*/persona`（含 `lead.patch.yml:22` 的"会话 cwd 根的 method-library.md"） | 改指产品设置的工作区与包内手册渠道；文案同 diff |

## 3. 开发仓

| 文件 | 改什么 |
|---|---|
| `dev/sync-pack-workspace.mjs` | 删（无种子） |
| `research-workspace/AGENTS.md`、`NODES.md`、`question-patterns.md`、`templates/`、`.gitignore` | 删/移出；dev 实例只留 run 产物与方法库 |
| `dev/render-overlay.mjs` / `dev/research.overlay.yml` | 跟随 `cordis.patch.yml` 重渲染（生成物） |
| `dev/boot-run.sh` | 不再导出 `DEEP_RESEARCH_WORKSPACE` 给 Host（改为写 dev 设置或保留 env 作为覆盖）；工作区缺失时的行为 |
| `dev/run-driver.mjs` / `run-kickoff.mjs` / `hitl-answer.mjs` | 会话创建/工作区解析按新合同（`agents.create` 或 `sessionController`）；`projectKey` 用法不变 |
| `scripts/verify/gates/e-workspace.mjs` | 删 `workspace-contract` / `handbook-budget` / `pack-workspace-fresh` / `.gitignore` parity；保留 `dist-manual-version`（改判据） |
| `scripts/verify/gates/f-repo.mjs:68` | `LIVE_WORKSPACE` 名单随目录消失调整 |
| `scripts/lib/gates-cases.mjs:582,597-613` | 删"删 NODES.md 看红"的用例 |
| `scripts/dist/export-dist.mjs` | must-list 改 `content/**`；删 seed 校验；模板数量改从 `content/templates` 数 |
| `scripts/dist/product-manual.md` | 整篇重写（见 S3） |
| `scripts/smoke/product-smoke.mjs` / `product-boot-smoke.mjs` | 重写断言（见验收计划） |
| `scripts/smoke/scaffold-smoke.mjs` | 删 |
| `scripts/smoke/preflight-smoke.mjs` | 改到 doctor 面 |
| `scripts/smoke/{release-smoke,upgrade-smoke,profile-matrix-smoke,interrupt-smoke,data-smoke,user-env-smoke,real-home-smoke}` | 删种子/升级/sidecar 段，改 profile 与工作区断言 |
| `scripts/smoke/snapshot-replay-smoke.mjs` + `snapshots/replay/research-face/snapshot.json` | B 层重录（手册从 user message 变 runtime context） |

## 4. 测试

| 文件 | 处理 |
|---|---|
| `tests/pack/workspace-boot.test.mjs` | 重写为 `startup`：无设置零行为、设置 → 注册 + 建会话、env 覆盖、目录缺失、registry 缺席、sessionId 复用 |
| `tests/pack/launcher-*.test.mjs` | 删（无 launcher）；设置 schema/路径测试迁到 `tests/pack/product-settings.test.mjs` |
| `tests/pack/package-contract.test.mjs` | bins/exports/files/peers 改形状；`lib/startup.js`、`lib/content.js` |
| `tests/pack/deploy-bin.test.mjs` | 删 scaffold/launcher 断言；改 doctor |
| `tests/pack/presets.test.mjs:186-236` | 改读 `content/manual.md` 与 `content/templates` |
| `tests/pack/{seed-core,workspace-audit,workspace-guard}.test.mjs` | 删（语义随种子退役） |
| `tests/run/run-driver-contract.test.mjs:119-133` | 产品首动作改为 `dsh-deep-research` / `--profile deep-research` |
| `tests/contracts/{run-bundle-charter,rerun-triage-contract,evaluation-contract,data-plane-invariants,navigability-contract}.test.mjs` | 改路径与手册渠道；删"两份手册副本"断言 |
| `tests/contracts/docs-consistency.test.mjs:36-64` | §布局改为 `content/` |
| 新 `tests/pack/content-injection.test.mjs` | 手册文本在场、`research_pack_root` 变量、无 seed 文件、模板路径可解析 |
| 新 `tests/pack/startup-settings.test.mjs` | 设置 schema 2、原子写、坏文件回退、last-wins |

## 5. 文档

| 文件 | 改什么 |
|---|---|
| `README.md` | 产品门面：一条命令 + 产物在哪 + "改它"三段；先压缩，必要时按 `doc-budgets` 升顶并登记 |
| `AGENTS.md` | §布局：`workspace/` → `content/`；startup/content 行；安装 = DSH 两步 |
| `CONTRIBUTING.md` | 安装/启动改自有 profile；删 D39 句 |
| `docs/00-index.md` | §先分流第一段与产品行；产品首动作 = DSH 两步安装 + `dsh --profile deep-research` |
| `docs/decisions.md` | 新增 D40（取代 D39、修订 D38 的种子/入口子句）；D35 标注退役 |
| `docs/project-map.md` | 产品入口、smoke 名字、工作区解析 |
| `docs/terms.md` | product profile / DSH 安装 / 产品设置 / content 术语；删 launcher 词条 |
| `docs/guides/60-dev-loop.md` | L2 产品装配/首启命令 |
| `docs/guides/62-plugin-authoring.md` | 交付拓扑表（bundle / profile / 内容注入 / 启动行）；删种子段落 |
| `docs/guides/64-release-versioning.md` | 发布步骤里的 export-dist 清单 |
| `docs/guides/65-run-forms.md` | M1/M2/M3 重写；P/H/W 归属；安装/升级/卸载 |
| `docs/design/{10,40,50}.md` | 产品工作区、StartCard/onboarding、状态归属 |
| `docs/evaluation.md` | L2/L3 判据与门禁台账删增 |
| `packages/deep-research-pack/README.md` | §部署/§Data/§Uninstall/§Compatibility/§已知限制 重写 |
| `packages/deep-research-pack/AGENTS.md` | 子树布局与 smoke 义务 |
| `scripts/dist/product-manual.md` | 整篇重写（生成器模板） |
| `_dist/安装手册.md` | 重导出（不手改） |

## 6. 分片 S0–S4

按 FAQ 26 `37-lifecycle-stages.md` 的四阶段看：**① 装** = S3 的 DSH 两步安装 + S1 的包内容面；**② 起** = S2 的纯 `dsh --profile`；**③ 配** = S1 的 bundle 默认值 + S2 的产品设置；**④ 首启** = S2 的 client onboarding。没有 launcher 这一步。

### S0 决定与记录（无代码）

- 用户对决策卡四个分叉作答 → 新增 D40（产品形态、内容边界、入口）；D39 标注被取代；D35 标注退役。
- 本目录材料转正为 D40 依据；决策卡转 `已结` 或保持跟踪。
- 退出判据：D40 与 backlog 同 diff；`pnpm verify` 绿。

### S1 内容进包

- 手册 → `content/manual.md` + Host 内容注入行；NODES / question-patterns → Lead skills；模板 → `content/templates/run/`。
- 删 `workspace/`、`seed.json`、`scaffold`、`sync-pack-workspace`、`pack-workspace-fresh`、`.gitignore` 写入、种子相关 preflight/tests/gates。
- 工作区足迹收敛为 `drt_*` / `archive` / `_abandoned` / `method-library.md`。
- dev 实例与 overlay 同步。
- 退出判据：L0 全绿；snapshot B 层重录显示手册以 runtime context 进入请求；`l4-lite-smoke` 真模型档证明 Lead 按手册产出；空工作区启动后无产品内容文件。

### S2 启动期工作区

- Host 启动行：读设置（env 覆盖）→ 注册工作区；产品 remote `get/set`（先做 Typert spike，见机制事实 §未验证项）。
- Client 启动控制器：`get` → `session.create` → `openSession`；无工作区时 `shell.overlay` onboarding（唯一的询问面）。
- 产品设置：`src/lib/product-settings.ts` + client `set`；env 只覆盖本次。
- 删 launcher/scaffold 与 env-only 路径。
- 退出判据：`dsh --profile deep-research`（无 launcher、无 env）在已保存工作区时首屏落到该工作区；无保存时首屏给出目录选择；`product-boot-smoke` 绿。

### S3 入口与文档翻正

- 安装 = DSH 两步（profile init + plugin add）+ 启动；删 launcher/scaffold bin；`web` 路径降为互操作一行；只留只读 doctor。
- 根 README / AGENTS / 00-index / guides 60/62/64/65 / design 10/40/50 / terms / project-map / pack README / CONTRIBUTING 同叙事。
- `_dist/安装手册.md` 由新模板重导出；`dist-manual-version` 绿。
- 版本 0.3.0（破坏性；无迁移，文档写清"旧装法 remove 后按新法装"）。
- 退出判据：`rg "dsh plugin --profile web add dsh-deep-research-pack"` 只剩互操作段落；`pnpm verify` 绿。

### S4 硬化与发布面

- `product-smoke` / `product-boot-smoke` / `release-smoke` / `data-smoke` / `upgrade-smoke` 重写并通过；真启动无 `did not activate`；`npm pack --dry-run` 覆盖 README 提到的每个脚本/资源。
- FAQ 37 八条发布前判据逐条对账（含 CLI 标"仅 dsh web"、无 `--profile desktop`、首屏不依赖 `welcome-notice`）。
- 退出判据：决策卡 `## 验收标准` 全绿；真实一次 run（真模型）交付证据；`notes/implemented/` Note 与 D40 互链。

## 7. 回滚

- S1 是模型可见面，回滚 = 恢复 `workspace/` 与注入行（单 commit 可 revert）。
- S3 文档翻正可单独 revert，不影响运行。
- 若 S1 的真模型证据证明注入不可靠 → 走目标形态 §7 方案 B（隐藏目录种子），S2/S3 不受影响。
