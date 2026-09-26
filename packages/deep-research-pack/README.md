# deep-research-pack

Deep Research 插件包：**四角色 preset + 研究方法论技能 + 观察面 client 面 + 工作区种子**。

一次调研 = 一支四人研究团队（Lead 主编 / Scout 侦察 / Analyst 分析 / Critic 核查）在 DSH 的
Agent Teams 通道上协作，产出**证据可溯源**的研究报告（run bundle 落 `drt_<slug>/`）。

## 内容

| 位置 | 内容 | 随包发布 |
|---|---|---|
| `presets/<role>.patch.yml` | 四角色 preset（0.1.7 形态：一条 `@deepseek-ai/dsh-agent-preset` 行，config.plugins 内声明 persona/skills/工具行） | ✓ |
| `presets/<role>/skills/<n>/SKILL.md` | 六个研究方法论技能（research-brief / team-assembly / lead-mapping / evidence-extraction / synthesis / adversarial-review） | ✓ |
| `cordis.patch.yml` | bundle 行：preset roster（default: lead）+ `tool-present` + 团队可视面 `ui-agent-team` + 本包 client 面 | ✓ |
| `workspace/` | **研究工作区种子**：研究手册（`AGENTS.md`：证据契约/目录约定/完成判据）+ `templates/run/` 六件模板 | ✓ |
| `src/client/` → `lib/client.js` | 观察面 client 面（D18 单点例外）：右栏「研究状态」页签（人性化活动流/活标题/HITL 横幅）+ 研究语义工具卡 | ✓ 构建产物 |
| `src/lib/` → `lib/types/lib/` | 纯函数折算（activity-fold / hitl-fold / run-fold / tool-card）——keyless 单测直接断言 | ✓ 构建产物 |
| `scripts/preflight.mjs` · `scripts/scaffold.mjs` | 部署前置检查 + 一键准备（见下） | ✓ |

角色职责表与方法论映射：`docs/design/20-roles.md`、`docs/design/30-methodology-mapping.md`。

## 部署（三步）

**前置**：DSH 版本必须是 `dsh-v0.1.7-rc.2`（`dsh.compatibility.dshReleases` 钉死）。

```sh
# ① 装包进 profile（tarball 或 npm 名；dsh plugin add 自动 reconcile dsh.profile.bundles）
dsh plugin --profile research add dsh-deep-research-pack

# ② 一键准备：铺工作区种子 + 确保团队机制层在场 + 跑前置检查
dsh-deep-research-scaffold --workspace ~/research-workspace --profile research
#   等价手工：cp -r <pack>/workspace/. ~/research-workspace/
#             dsh plugin --profile research add @deepseek-ai/dsh-experimental-agent-team-profile

# ③ 起研究会话（cwd = 工作区，手册从这里注入）
cd ~/research-workspace && dsh --profile research
```

**为什么需要 ②**：研究纪律靠**会话 cwd 的 `AGENTS.md`**（DSH 的 agent-instructions 从 cwd
向上发现并注入每个角色）；团队机制（`spawn_teammate` / `team_task_*`）**不在本包声明**
（组合与实战 config 归 vendor 的 `agent-team-profile` 层——RFC m2-p1-run-channel A 定案）。
缺任一 → 角色没有纪律、或没有团队通道。

**前置检查**（随时可跑，fail-loud + 给补救命令）：

```sh
dsh-deep-research-preflight --workspace ~/research-workspace
# 检查：DSH 版本 / 14 个平台 peer 包 / 团队机制层 / 工作区手册+模板 / 构建产物 / 模型密钥
```

## 研究怎么跑

1. **HITL1 立项**：对 Lead 说出研究问题 → 一张结构化选项卡三问（研究类型/深度篇幅/时间口径
   与语言，推荐项置首带 (Recommended)）→ 你点选即定稿；
2. **静默自主区**：Lead 拆 topic、派 Scout/Analyst/Critic（Agent Teams 通道），证据落
   `drt_<slug>/evidence/`（七字段 frontmatter：source_url / retrieved_at / quality / found_by /
   supports / source_tier / publisher）；Critic 对抗核查出 `review.md`（readiness PASS 是交付前置）；
3. **HITL2 审阅**：结构化选项卡（按现稿定稿(Recommended) / 补研究 / 修订表述）→ 拍板后交付
   `final.md`（每条关键结论附 `[来源: evidence/xx.md]`）；
4. **观察面**：DSH Web GUI 右栏「研究状态」页签看实时动态（人性化活动流 + HITL 挂起横幅 +
   活标题「研究状态 · ⏳ 等你拍板」）；
5. **审计**（本仓开发面）：`node scripts/evidence-audit.mjs <bundle>` 对会话日志机械对账——
   URL 是否真被抓取过、摘录是否可回溯、final 溯源链是否完整 → `audit.md`。

## 新增一个研究角色

**第 0 步（先于一切代码）**：增删角色 = 推翻 D2（角色 = 4 个，见 docs/00-index.md 台账）——
先在台账登记新 D 号，再动手。tests 的数量哨兵（tests/presets.test.mjs）会机械拦住没登记的增删。

1. `presets/<role>.patch.yml`：一条 `@deepseek-ai/dsh-agent-preset` 行，`config` 带
   id/name/description/order + plugins（自包含组合：persona 行 + skills roots + 工具行 +
   agent-instructions 行）+ `skills/<n>/SKILL.md`（frontmatter `name` = 目录名）；
2. 结构门禁：verify 门禁 preset-structure + row-deps（行引用的 `@deepseek-ai/*` 全进 peerDependencies）；
3. roster 装载：`package.json` 的 `dsh.bundle.patch` 数组列出 `cordis.patch.yml` 与每个
   `presets/*.patch.yml`；
4. 消费点**无需逐个改**：角色清单事实源 = 盘上 `presets/` 目录——`preset-smoke` /
   `release-smoke` / `team-preflight-smoke` / `boot-run.sh` / `tests` 全部目录枚举。唯二要补的：
   `l4-lite-smoke` 的 `PROMPTS` 加该角色的标记 prompt；新脚本用 `scripts/lib/roles.mjs` 枚举；
5. 完成定义 = preset-smoke 真挂载绿（L1 面，keyless）。

## 新增一个 skill

1. 建 `presets/<role>/skills/<n>/SKILL.md`——frontmatter `name:` 必须**逐字等于目录名**
   （门禁 preset-structure 强制）；
2. preset 行的 plugins **不用改**：`customSkillDirs` 指向 `presets/<role>/skills/` 且
   `includeDefaultRoots: false`，自动发现。

## 已知限制与延后工作

- **研究状态页签的 bundle 渐进面（步骤条/证据计数/交付状态）尚未接通**：组件与纯函数折算
  已就位（`run-fold.ts`），但 `remote.workspaceFiles` 的 list 路径形态未解（实测 5 种路径
  全失败）——数据面接通前，页签只显示活动流与 HITL 横幅；
- **`workspace/` 种子是快照**：由 `dev/sync-pack-workspace.mjs` 从仓库正本同步（门禁
  `pack-workspace-fresh` 防漂移）；种子只铺新工作区，**不覆盖**已存在文件（`--force` 除外）；
- **皮肤/品牌层**（ui-skin）与**专职 synthesizer 角色**（Q4 已销账：单场实测 Lead 独任综合
  无过载）仍在搁置池，复活条件见 roadmap；
- **工具卡只做了 2 张**（spawn_teammate / web_search）；`team_task_*` 卡留后续；
- **版本兼容面窄**：只声明 `dsh-v0.1.7-rc.2`（pre-stable API，peer 版本号不精确钉死）。
