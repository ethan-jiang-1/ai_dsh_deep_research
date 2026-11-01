---
topic: plugin-as-product-v2
intent: 给出可直接执行的实施计划：四条不变量、DSH 原生安装、S0–S4 的逐文件改动、验收证据、风险与回滚
---

# 实施计划（已按用户授权修订）

**用户授权（2026-11-01）**：review 项自行决定；做对最重要；不做兼容；**安装必须尊重 DSH**。

由最后一条推出的结构决定：**不保留 launcher / scaffold 作为产品入口**。安装 = DSH 自己的命令（应用内 Plugins 页或 `dsh plugin`），启动 = `dsh --profile deep-research`，首启 = bundle 的 client onboarding。产品 = 一个 bundle + 一个 profile，不是第二个可执行文件。

## 0. 四条不变量（一切改动围绕它们）

| # | 不变量 | 机械检验 |
|---|---|---|
| I1 | **产品有自己的 profile**：`deep-research`，不是寄居 `web` | `tests/contracts/product-invariants.test.mjs`：文档首动作、安装命令、无 launcher bin |
| I2 | **启动时解决工作区**：不传 env、无 launcher 也能落到已保存工作区；无保存时首屏询问 | `product-boot-smoke`：纯 `dsh --profile deep-research` 启动 + 浏览器断言 |
| I3 | **包内容不落进工作区**：工作区只有产物 + 用户文件 | `product-boot-smoke` 工作区足迹 + `content-shape` 门禁 |
| I4 | **内容从包里进模型**：手册 runtime context、NODES/判型库 skills、模板来自包 | `snapshot-replay` B 层 + `content-injection` 测试 + `l4-lite` 真模型 |

**S0 第一步就在 HEAD 上写 I1–I4 并跑红**，把"当前树违反目标"固化成证据；实施后转绿。

## 1. 目标安装/启动形态（DSH 原生，无自定义安装器）

```sh
# ① 建产品 profile（仅首次；DSH 的 web 模板；破坏性，只对全新 profile 用）
dsh --profile deep-research --from-default-profile web --dump-default-config

# ② 装 bundle + 团队层（DSH 原生；也可在应用内 Plugins 页装）
dsh plugin --profile deep-research add dsh-deep-research-pack@0.3.0 \
  @deepseek-ai/dsh-experimental-agent-team-profile@<与 DSH 同版本>

# ③ 启动（DSH 原生）
dsh --profile deep-research
```

- 首次打开：token URL → 产品首屏 onboarding 问工作区；选完写入产品设置，下次直接进。
- 脚本/CI：`DEEP_RESEARCH_WORKSPACE=<dir> dsh --profile deep-research`。
- 更新：产品内 Plugins 页（默认，跨面）或 `dsh plugin --profile deep-research add <new>`；重启 profile。
- 互操作：装进现有 `web` profile 也能用（bundle 自足，首屏照样问工作区），但文档只留一行，不是产品形态。
- **没有** `dsh-deep-research`、`dsh-deep-research-scaffold`；只保留只读 doctor（可选）。

## 2. S0：决定、记录、红基线（不改产品代码）

1. 新增 D40：产品形态、安装/启动、profile、工作区、内容/产物、新产品面（D7 第三处有界例外）；**点名取代** D39 的默认 profile 句、**修订** D38 的 launcher/种子句；D35 随种子退役。
2. 新增 `notes/implemented/2026-11-01-plugin-as-product-v2.md`（骨架；S4 补证据）。
3. 新增 `tests/contracts/product-invariants.test.mjs`：
   - I1：文档首动作含 `--profile deep-research`；`package.json` 无 `dsh-deep-research` bin；`cordis.patch.yml` 有 startup/content 行。
   - I2：`cordis.patch.yml`/`src/startup` 读产品设置（静态断言 + 单元测试）。
   - I3：包内无 `workspace/`、无 `seed.json`；`files` 含 `content/**`。
   - I4：`content/manual.md` 在场；`src/content` 注册 `context` 与 `variable`。
   在 HEAD 上跑红，输出记到决策卡。
4. `docs/evaluation.md` §L0 登记新门禁（先登记、后实现）。

**出口**：红基线至少三条失败，分别对应 I1/I3/I4；`pnpm verify` 仍绿。

## 3. S1：内容进包（删种子、建 content）

### 3.1 包布局

```text
packages/deep-research-pack/
  content/
    manual.md                       ← 原 workspace/AGENTS.md（只改注入渠道与路径）
    templates/run/*.md              ← 8 件
  src/content/index.ts              ← Host 行：手册 runtime context + research_pack_root 变量
  presets/lead/skills/nodes-contract/SKILL.md
  presets/lead/skills/question-patterns/SKILL.md
```

删除整个 `workspace/`（含 `seed.json`、`.gitignore.example`、`method-library.md`）。

### 3.2 注入行（`src/content/index.ts`）

```ts
export const name = 'deep-research-content'
export const inject = ['systemPrompt']
const PACK_ROOT = ...
const MANUAL = readFileSync(join(PACK_ROOT, 'content/manual.md'), 'utf8')

export function apply(ctx) {
  ctx.systemPrompt.variable('research_pack_root', () => PACK_ROOT)
  ctx.systemPrompt.context({
    name: 'research:manual',
    order: 205,      // 外部贡献用固定数值；不能走 first-party 的 getContextOrder
    text: MANUAL,    // 默认插值 {{research_pack_root}}
  })
}
```

- 只 `context`，不 `section`；`name` 唯一；手册只允许 `{{research_pack_root}}` 一个变量（CI 断言）。
- `cordis.patch.yml` 的 `insert:` 加行；`package.json` `files` 加 `content/**`、exports 加 `./content`。

### 3.3 手册改写（只改渠道与路径）

1. 开头："本手册由产品以 runtime context 注入；用户项目 `AGENTS.md` 仍由 DSH 注入，冲突时项目指令优先。"
2. 模板路径 → `{{research_pack_root}}/content/templates/run/`。
3. 删种子/部署副本/`--upgrade` 语言；目录约定只列 `drt_*` / `archive/` / `_abandoned/` / `method-library.md`。
4. NODES / 判型库引用改成"加载对应 skill"。
5. 保留 D17/D28 分层铁律、run.md 状态头、五问读序、交付口径、日期契约。

### 3.4 skills / persona

- `nodes-contract` / `question-patterns` 两个 Lead skill（frontmatter `name` = 目录名）。
- `research-brief` / `research-planning` 改引用；persona 的"cwd 根 AGENTS.md"改"产品注入的研究手册"。
- 模型可见面变更同 diff 跑 `l4-lite`。

### 3.5 开发仓

- 删 `dev/sync-pack-workspace.mjs`；`research-workspace/` 的五个种子 `git rm`。
- 重渲染 `dev/research.overlay.yml`。
- `dev/boot-run.sh`：dev 设置写 `$DSH_HOME/deep-research/settings.json`（或 env 覆盖）。
- `e-workspace` 门禁删 `workspace-contract` / `handbook-budget` / `pack-workspace-fresh` / `.gitignore` parity；新增 `content-shape`（反证 = 放回 `workspace/seed.json`）。
- `gates-cases.mjs` 换用例；`export-dist.mjs` must-list 改 content；`preflight` 删种子审计。

### 3.6 测试

- 新增 `tests/pack/content-injection.test.mjs`。
- 改 `presets.test.mjs`、五个 contracts、`docs-consistency.test.mjs`。
- 删 `seed-core` / `workspace-audit` / `workspace-guard` 测试。

### 3.7 出口

- `pnpm verify` + `pnpm test` 绿；`rg "workspace/(AGENTS|NODES|question-patterns|templates|seed)"` 为 0。
- `snapshot-replay` 重录：出现 `research:manual`，不再出现产品手册的 `Instructions from: AGENTS.md`。
- `l4-lite`：Lead 仍发 HITL1 三问、落 `question.md`/`topics.md`/`plan.md`。
- 手工：空目录启动后无产品内容文件。

### 3.8 风险/回滚

- 18.5 KB context 被截断或模型不按手册 → 降级 B（`<workspace>/.deep-research/` 隐藏目录 + 产品私有 instruction 候选名），不退回 D39。
- S1 单 commit，revert 即恢复种子。

## 4. S2：启动期工作区（bundle 自足）

### 4.1 产品设置（home 级）

```text
$DSH_HOME/deep-research/settings.json
{ "schemaVersion": 2, "workspace": "/abs/dir", "sessionId": "session-…", "updatedAt": "ISO" }
```

- **home 级而不是 profile 级**：Host 行拿不到当前 profile 名；FAQ 26 允许 `$DSH_HOME/<plugin>/` 约定；一个 home 一份状态；`--home` 隔离；删目录即重置。多 profile 共享——文档写明。
- 逻辑住 `src/lib/product-settings.ts`（TS，构建后 `lib/product-settings.js`）；Host 服务、doctor、测试共用；原子写、last-wins、无秘密、坏文件先备份 `.corrupt`。
- 不是 DSH Settings：Settings UI 不暴露工作区。

### 4.2 Host 启动行（`src/startup/index.ts`）

1. 读设置（`DEEP_RESEARCH_WORKSPACE` 只覆盖本次）；无 → 只 log。
2. `stat`：不存在/非目录 → log error，不创建。
3. `workspaceRegistry.create(path, "Deep Research — <basename>")`（同路径幂等）。
4. 提供 `researchSetup` 服务；失败只影响产品行，不抛。

**不建会话**：`webserver` 在挂载期 listen，Host 建会话不能保证早于首个请求（机制事实 §13–14）。会话归 client。

### 4.3 `researchSetup` remote（D7 第三处有界例外）

- `get()` → `{schemaVersion, workspace, sessionId, ready, reason?}`
- `set({workspace?, sessionId?})` → 绝对路径/存在/目录/非危险目录校验 → 原子写
- 只读写设置文件；不写 DSH patch、不声明 storage domain、不新增 session event。
- **S2.0 spike 闸**：临时 profile 里最小第三方服务 + `@Remote('ping')`，client 用 `ctx.remote.researchSetup.ping()` 调到；验证 owner 访问策略。失败 → fallback：Host best-effort 建会话 + client 听 `api-session/added`；GUI 选择不持久化（文档写清）。
- 通过后补 `tests/pack/setup-remote.test.mjs`。

### 4.4 Client 启动控制器（`src/client/startup/`）

1. `get()`。
2. 有 workspace → `session.create({sessionId: 上次的, cwd, agentPreset:'lead'})`（blank/同目录/未归档复用）→ `uiWorkspace.openSession` → `set({sessionId})`。
3. 无 workspace → `shell.overlay` onboarding：`remote.directoryPicker.pick()`，失败退 `list()`，再失败手动路径；像项目时默认建议 `<path>/research`；`set` → 建会话 → 选中。
4. 当前会话 cwd ≠ 工作区 → 横幅 + 一键切换；自动切 P1。
5. 幂等、失败可重试、不建第二个会话。

### 4.5 出口

- `dsh --profile deep-research`（无 launcher、无 env）在已保存工作区时：页面加载后 session cwd = 工作区、preset = lead、被选中。
- 无保存：onboarding 可选并记住；刷新直接进。
- `DEEP_RESEARCH_WORKSPACE=X dsh --profile deep-research`：本次在 X。
- 工作区足迹只有产物；`data-smoke` 证明 `$DSH_HOME` 只多 `deep-research/settings.json`。

### 4.6 风险/回滚

- remote/picker 不可用 → fallback；S1 不受影响。
- S2 三件（settings lib / host row / client controller）可分别 revert。

## 5. S3：安装与文档（DSH 原生）

### 5.1 安装形状

- 首次安装 = DSH 两步（profile init + `dsh plugin add`）+ 启动；**没有自定义安装器**。
- 更新 = 产品内 Plugins 页（默认）或 CLI；重启 profile。
- 互操作 = 装进 `web` profile 一行。
- 版本 `0.3.0`（破坏性、不迁移旧种子）。

### 5.2 包内 bin

- 删 `dsh-deep-research`、`dsh-deep-research-scaffold`。
- 保留/新增只读 `dsh-deep-research-doctor`：检查 profile roster（三状态）、团队层、凭据、工作区可写；**不安装、不启动、不写 profile**。

### 5.3 文档逐件

| 文件 | 改法 |
|---|---|
| `README.md` | 产品门面：三步安装 + 启动 + 首屏 + 产物位置；删 launcher/专用 profile "可选"叙事；预算 60→72 并登记理由 |
| `AGENTS.md` | §布局 `content/`；pack 行；命令速查加 DSH 安装/启动 |
| `CONTRIBUTING.md` | 安装/启动改 DSH 两步 |
| `docs/00-index.md` | 产品行首动作 = `dsh --profile deep-research --from-default-profile web`；删"launcher 可选" |
| `docs/decisions.md` | D40；D39 标被取代；D38 标 launcher/种子被修订；D35 退役 |
| `docs/project-map.md` | 产品入口、doctor、两个产品 smoke |
| `docs/terms.md` | product profile / 产品设置 / content / 启动行；删 launcher 词条 |
| `guides/60/62/64/65` | L2 命令、交付拓扑、发布、运行形态重写 |
| `design/10/40/50` | 产品工作区、onboarding、状态归属 |
| `evaluation.md` | L2/L3 判据；门禁台账 |
| pack README | §部署（DSH 两步 + 互操作）、§Data、§Uninstall、§Compatibility、§已知限制 |
| pack AGENTS | 子树布局、smoke 义务 |
| `scripts/dist/product-manual.md` | 十段重写（见 §5.4） |
| `_dist/安装手册.md` | 重导出，不手改 |

### 5.4 `_dist` 手册骨架

1. 这是什么（bundle + 产品 profile + 工作区）；2. 前置（DSH/Node/pnpm/凭据）；3. 装（两步 DSH；应用内 Plugins 页更新）；4. 首启（token URL → 选项目 → 首屏）；5. 工作区里有什么；6. 数据归属；7. 升级/回滚；8. 卸载；9. 离线/故障；10. 已知限制。

### 5.5 出口

- `pnpm verify` 全绿（含 `doc-budgets` / `dist-manual-version`）。
- `rg "dsh-deep-research\\b"` 只剩 doctor；`rg "scaffold"` 产品面为 0。
- 按 `_dist` 手册从零走一遍（真实 home + 真实 dsh），记录命令与首屏截图。

## 6. S4：硬化、证据、发布

### 6.1 冒烟矩阵

| 冒烟 | 职责 |
|---|---|
| `install-shape-smoke`（新） | 原样执行手册三步：profile init → plugin add（pack + team）→ 真启动；断言 roster 三状态、无 `did not activate`、首屏可达 |
| `product-boot-smoke` | 纯 `dsh --profile deep-research`：首屏 onboarding、会话 cwd、工作区足迹、错工作区横幅 |
| `release-smoke` | tarball → 干净 profile → 真启动 |
| `data-smoke` | `$DSH_HOME` 只写产品设置；无 storage domain/新事件 |
| `upgrade-smoke` | 0.2→0.3：旧装法明确不兼容；新装法可用 |
| `preflight-smoke` | doctor 面 |
| `scaffold-smoke` / `interrupt-smoke` | 删 |
| `snapshot-replay-smoke` | B 层重录 |
| `l4-lite-smoke` | 真模型首轮行为 |

### 6.2 新门禁

- `content-shape`：content/manual + 8 模板、无 `workspace/`、`files` 含 content。反证：放回 seed。
- `no-installer`：包内无 launcher/scaffold bin、无 `sync-pack-workspace`、无 seed 引用。反证：加回 bin。
- `install-doc-shape`：文档首动作 = DSH 两步；无 `--profile desktop`；CLI 标"仅 `dsh web`"。反证：改回首动作。
- `product-invariants`（测试）：I1–I4。

### 6.3 发布前（FAQ 37 八条）

1. 包声明 `dsh.bundle.patch`；装完进 roster；dump 有 row。
2. GUI 安装说明一句话；CLI 标"仅 `dsh web`"；无 `--profile desktop`。
3. 真启动无 `did not activate`。
4. 默认值在 bundle patch；home 不供货。
5. 首启可推迟；不依赖 `welcome-notice`；Desktop 不承诺。
6. `npm pack --dry-run` 覆盖 README 提到的脚本/资源。
7. `engines.dsh` + `dsh.compatibility.dshReleases`。
8. 先升版本再打包。

### 6.4 真模型证据

- `l4-lite` 五角色。
- 一次完整 run：HITL1 → 组队 → 证据 → review PASS → HITL2 → `final/vN` + `readable-vN` + present → `run-accept`。产物只在工作区。

## 7. 总验收（Definition of Done）

1. 手册两步安装 + `dsh --profile deep-research` 启动成功；roster = base + web-app + pack + team。
2. 已保存工作区时，纯原生启动页面加载后落在该工作区（cwd/preset/选中）。
3. 无保存时首屏 onboarding 可完成并记住。
4. 空工作区无产品内容文件。
5. 手册/NODES/判型库/模板全部来自包；snapshot + 真模型证明。
6. `pnpm verify` + `pnpm test` + 冒烟矩阵绿；真启动无 `did not activate`。
7. 根 README/AGENTS/00-index/guides/pack README/`_dist` 同一叙事；`_dist` 重导出。
8. 卸载后工作区产物保留；`$DSH_HOME` 只多 `deep-research/settings.json`。
9. D40 + Note 互链；决策卡关闭。
10. 不变量测试在 HEAD 上红、交付树上绿。

## 8. 风险表

| 风险 | 触发 | 处置 |
|---|---|---|
| 18.5 KB context 被截断/模型不按手册 | l4-lite 或真实 run | 降级 B（隐藏目录），不退回 D39 |
| `researchSetup` remote 不可行 | S2.0 spike | fallback：Host best-effort 会话 + `api-session/added`；GUI 不持久化 |
| client 目录选择器不可用 | onboarding 冒烟 | 手动路径输入 + `workspace.create` |
| 安装两步对用户太长 | 文档评审 | 接受：DSH 没有"一步建 web-backed custom profile"；不发明安装器 |
| 文档预算/一致性 | 门禁红 | 先压缩；README 升顶登记；AGENTS 同 diff |
| 测试按路径断言 | S1/S2 | 同 diff 改，不先删后补 |

## 9. 回滚

- S1 单 commit；S2 三件可分别 revert；S3 纯文档/生成物。
- 任何一片 revert 后 `product-invariants` 会红——这是设计意图。

## 10. 已定的四个分叉（用户授权自行决定）

1. **内容边界 = A**：无种子；手册 runtime context、NODES/判型库 skills、模板包内。B（隐藏目录）只作被真模型证据证伪时的降级。
2. **项目目录 = 询问 + 推荐**：像项目时默认建议 `<dir>/research`，可一键改；不静默改写。
3. **互操作 = 保留一行**：装进 `web` profile 可用，但不是产品形态。
4. **新产品面 = 接受**：Host 启动行 + `researchSetup` remote + client 启动控制器，作为 D7 第三处有界例外。

**外加（由"安装尊重 DSH"推出）**：不保留 launcher/scaffold；安装只用 DSH 命令；只保留只读 doctor。
