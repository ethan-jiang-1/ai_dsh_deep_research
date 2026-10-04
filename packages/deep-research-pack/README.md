# deep-research-pack

Deep Research 插件包：**四角色 preset + 研究方法论技能 + 研究驾驶舱（Research Cockpit，
观察面 client 套件）+ 工作区种子**。

一次调研 = 一支四人研究团队（Lead 主编 / Scout 侦察 / Analyst 分析 / Critic 核查）在 DSH 的
Agent Teams 通道上协作，产出**证据可溯源**的研究报告（run bundle 落 `drt_<slug>/`）。

> **研究驾驶舱** = 观察面 client 套件的套件名（2026-09-28 定名）：右栏「研究状态」页签 +
> 研究语义工具卡 + 活标题 + 挂起显性化（pending 自动展开右栏）——静默自主期看仪表、HITL
> 挂起时接手的地方；页签含**流程轨道**（◆立项确认 + 七步 + ◆交付审阅——两个 HITL 停靠点
> 常驻可见）+ 参与指引 + 决策诚实线 + rerun 三分提示；折算谓词住 `src/lib/`（keyless 单测，
> 与 run-dashboard 投影共用）。
> 构成的当前事实正本 = [docs/design/40-research-cockpit.md](../../docs/design/40-research-cockpit.md)。

## 内容

| 位置 | 内容 | 随包发布 |
|---|---|---|
| `presets/<role>.patch.yml` | 四角色 preset（0.1.7 形态：一条 `@deepseek-ai/dsh-agent-preset` 行，config.plugins 内声明 persona/skills/工具行） | ✓ |
| `presets/<role>/skills/<n>/SKILL.md` | 六个研究方法论技能（research-brief / team-assembly / lead-mapping / evidence-extraction / synthesis / adversarial-review） | ✓ |
| `cordis.patch.yml` | bundle 行：preset roster（default: lead）+ 会话全文检索开关（`session-query-sqlite` `openAt: first-search`——FTS 惰性开，`:memory:` 每进程重建；检索工具行在 lead/critic preset）+ `tool-present` + 团队可视面 `ui-agent-team` + 本包 client 面 | ✓ |
| `workspace/` | **研究工作区种子**：研究手册（`AGENTS.md`：证据契约/目录约定/完成判据）+ `templates/run/` 六件模板 | ✓ |
| `src/client/` → `lib/client.js` | **研究驾驶舱**（Research Cockpit——观察面 client 面，D18 单点例外；构成正本 = [design/40](../../docs/design/40-research-cockpit.md)）：右栏「研究状态」页签（流程轨道锚点/人性化活动流/活标题/HITL 横幅/参与指引/决策诚实线）+ 研究语义工具卡 + 挂起显性化 | ✓ 构建产物 |
| `src/lib/` → `lib/types/lib/` | 纯函数折算（activity-fold / hitl-fold / run-fold / bundle-bind / tool-card——五件，清单正本 = [design/40](../../docs/design/40-research-cockpit.md)）——keyless 单测直接断言 | ✓ 构建产物 |
| `scripts/preflight.mjs` · `scripts/scaffold.mjs` | 部署前置检查 + 一键准备（见下） | ✓ |

角色职责与方法论：见各 `presets/<role>.patch.yml`（persona）与 `presets/<role>/skills/<n>/SKILL.md`（方法论正文）——都随本包发布。

## 部署（四步）

**前置**：DSH 版本必须是 `dsh-v0.2.0-rc.2`（`dsh.compatibility.dshReleases` 钉死）。

```sh
# ① 建 profile——自定义名默认只带 dsh-base（起不了 web，也就没有 GUI）；须先取 web 模板。
#    `web` = DSH 出厂模板（不读你本地同名 profile）。profile 已存在则**跳过本步**，改用不带该
#    flag 的 `dsh --profile research --dump-config`（带 `--from-default-profile` 会因"已存在"硬失败）。
dsh --profile research --from-default-profile web --dump-config

# ② 装包：本包 private（未发布 registry）——裸包名解析不到，必须给 tarball 的 file: 形态；
#    且**必须绝对路径**（`file:` 相对路径按 profile 目录解析，不是你的 cwd）。
#    出包 = `node scripts/export-dist.mjs`（仓根执行）→ `_dist/` 的 tarball + 安装手册.md（用户视角正本）。
dsh plugin --profile research add file:/abs/path/to/dsh-deep-research-pack-0.1.0.tgz

# ②b 验证形状（"装好了"的最小判据；下四项缺任一 = 没装上）
dsh --profile research --dump-config   # 应见 preset-lead/scout/analyst/critic + tool-present + ui-agent-team + research-client + session-query-sqlite（openAt: first-search）

# ③ 一键准备：铺工作区种子 + 确保团队机制层在场 + 跑前置检查
#    ⚠ tarball 装法**不生成 PATH bin**——用安装副本里的脚本全路径（不是 `dsh-deep-research-scaffold`）：
node ~/.dsh/profiles/research/node_modules/dsh-deep-research-pack/scripts/scaffold.mjs \
  --workspace ~/research-workspace --profile research
#    它用 PATH 上的 `dsh`；写哪个 home 由 `DSH_HOME` 决定（未设时默认 ~/.dsh）——日用安装别先 source dev/env.sh；
#    手工等价 = 三件全做（scaffold 内部就是这三件）：cp -r <pack>/workspace/. ~/research-workspace/
#             + dsh plugin --profile research add @deepseek-ai/dsh-experimental-agent-team-profile
#             + 全路径 preflight.mjs --workspace ~/research-workspace

# ④ 起研究会话（cwd = 工作区，手册从这里注入；本步拉起该 profile 的 web 并打印带 token 的 URL）
cd ~/research-workspace && dsh --profile research
```

**为什么需要 ③**：研究纪律靠**会话 cwd 的 `AGENTS.md`**（DSH 的 agent-instructions 从 cwd
向上发现并注入每个角色）；团队机制（`spawn_teammate` / `team_task_*`）**不在本包声明**
（组合与实战 config 归 vendor 的 `agent-team-profile` 层——D16；作者面规则正本 =
[guides/62 参与方表](../../docs/guides/62-plugin-authoring.md)）。
缺任一 → 角色没有纪律、或没有团队通道。

**前置检查**（随时可跑，fail-loud + 给补救命令）：

```sh
node ~/.dsh/profiles/research/node_modules/dsh-deep-research-pack/scripts/preflight.mjs \
  --workspace ~/research-workspace
# 检查：DSH 版本 / 全部平台 peer 包（清单 = pack package.json peerDependencies） / 团队机制层 / 工作区手册+模板 / 构建产物 / 模型密钥
```

## 研究怎么跑

1. **HITL1 立项**：对 Lead 说出研究问题 → 一张结构化选项卡三问（研究类型/深度篇幅/时间口径
   与语言，推荐项置首带 (Recommended)）→ 你点选即定稿；
2. **静默自主区**：Lead 拆 topic、派 Scout/Analyst/Critic（Agent Teams 通道），证据落
   `drt_<slug>/evidence/`（七字段 frontmatter：source_url / retrieved_at / quality / found_by /
   supports / source_tier / publisher）；Critic 对抗核查出 `review.md`（readiness PASS 是交付前置）；
3. **HITL2 审阅**：结构化选项卡（按现稿定稿(Recommended) / 补研究 / 修订表述）→ 拍板后交付
   `final.md`（每条关键结论附 `[来源: evidence/xx.md]`）；
4. **观察面**：DSH Web GUI 右栏「研究状态」页签看实时动态（流程轨道 = ◆立项确认 + 立项→
   组队→侦察→挖掘→综合→审查 + ◆交付审阅 + 交付，↻ rerun 回路自交付审阅可见，人性化活动流，
   HITL 挂起横幅点名锚点与参与方式，活标题「研究状态 · ⏳ 等你拍板」，交付节点带 final/ 版本）；
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

- **会话必须建在**研究工作区里**才能看到渐进面**：页签读的是会话工作区根（`workspaceFiles`），
  run bundle 在工作区内才可见——故需先把研究工作区注册进 DSH（`workspace/create`），再用
  `workspaceId` 形态建会话（`dev/run-kickoff.mjs` 已默认此形态）；建在别处的会话只显示活动流；
- **页签活动流只 follow lead 会话**：队员（scout/analyst/critic）的检索与取证动作在各自会话，
  不进 lead journal——`wait_agent` 的"队员作业中"行缓解全静，团队任务细节看 `ui-agent-team`
  任务板（队员流接入需新数据通道，是后续候选）；
- **`workspace/` 种子是快照**：由 `dev/sync-pack-workspace.mjs` 从仓库正本同步（门禁
  `pack-workspace-fresh` 防漂移）；种子只铺新工作区，**不覆盖**已存在文件（`--force` 除外）；
- **皮肤/品牌层**（ui-skin）与**专职 synthesizer 角色**（多场 run 重估：lead 独任综合
  无过载）仍在搁置池，复活条件见 `_backlog/queue.md` 搁置池；
- **工具卡 = 2 张**（spawn_teammate / web_search）；`team_task_*` 与其他协调类工具
  （wait_agent / list_agents / send_message）**不进对话流**（2026-09-27 实测：流里 0 出现，
  harness 把协调类工具排除在对话渲染外）——团队任务的观察由 ui-agent-team 任务板与 To-dos
  折叠承担，无需卡片（4 卡方案的回退理由 = [marathon2 复盘](../../notes/archived/2026-09-25-marathon2-retrospective.md)，冻结层）；
- **版本兼容面窄**：只声明 `dsh-v0.2.0-rc.2`（pre-stable API，peer 版本号不精确钉死）。
