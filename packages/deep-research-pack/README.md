# deep-research-pack

Deep Research 插件包：**四角色 preset + 研究方法论技能 + 研究驾驶舱（Research Cockpit，
观察面 client 套件）+ 工作区种子**。

一次调研 = 一支四人研究团队（Lead 主编 / Scout 侦察 / Analyst 分析 / Critic 核查）在 DSH 的
Agent Teams 通道上协作，产出**证据可溯源**的研究报告（run bundle 落 `drt_<slug>/`）。

> **研究驾驶舱** = 观察面 client 套件的套件名（2026-09-28 定名）：右栏「研究状态」/「研究配置」
> 页签 + 交付那一刻出现的「终稿」页签 + 研究语义工具卡 + 活标题 + 挂起显性化（pending 自动展开
> 右栏）——静默自主期看仪表、HITL 挂起时接手、交付后读成品的地方；页签含**流程轨道**（◆立项确认 + 七步 + ◆交付审阅——两个 HITL 停靠点
> 常驻可见）+ 参与指引 + 决策诚实线 + rerun 三分图例（不代表已发生 rerun；证据扩张以 v2+ 文件版本为证）；折算谓词住 `src/lib/`（keyless 单测，
> 与 run-dashboard 投影共用）。
> 构成的当前事实正本 = [docs/design/40-research-cockpit.md](../../docs/design/40-research-cockpit.md)。

## 内容

| 位置 | 内容 | 随包发布 |
|---|---|---|
| `presets/<role>.patch.yml` | 四角色 preset（DSH 0.1.7 起的形态：一条 `@deepseek-ai/dsh-agent-preset` 行，config.plugins 内声明 persona/skills/工具行） | ✓ |
| `presets/<role>/skills/<n>/SKILL.md` | 研究方法论技能（各角色清单正本 = 盘上 `presets/<role>/skills/` 目录，bundle 自动发现——新增免改本行） | ✓ |
| `cordis.patch.yml` | bundle 行：preset roster（default: lead）+ 会话全文检索开关（`session-query-sqlite` `openAt: first-search`——FTS 惰性开，`:memory:` 每进程重建；检索工具行在 lead/critic preset）+ `tool-present` + 团队可视面 `ui-agent-team` + 本包 client 面 | ✓ |
| `workspace/` | **研究工作区种子**：研究手册（`AGENTS.md`：证据契约/目录约定/完成判据）+ `NODES.md`（节点 I/O 契约）+ `question-patterns.md`（判型库）+ `templates/run/` 六件模板 + `method-library.md`（独立空架子种子，不从正本同步）+ `.gitignore`（包内名 `.gitignore.example`——npm 不打包 `.gitignore` 文件，安装时由 scaffold 落地成本名；工作区纳入版本控制时拒收 run bundle/归档/方法库，留档加 `!路径`） | ✓ |
| `src/client/` → `lib/client.js` | **研究驾驶舱**（Research Cockpit——观察面 client 面，D18 单点例外；构成正本 = [design/40](../../docs/design/40-research-cockpit.md)）：右栏「研究状态」页签（流程轨道锚点/人性化活动流/活标题/HITL 横幅/参与指引/决策诚实线）+ 「研究配置」页签 + 「终稿」页签（接管 `drt_<slug>/final.md` 的文件地址，交付时自动开一次）+ 研究语义工具卡 + 挂起显性化 | ✓ 构建产物 |
| `src/lib/` → `lib/types/lib/` | 纯函数折算（清单正本 = [design/40](../../docs/design/40-research-cockpit.md)）——keyless 单测直接断言 | ✓ 构建产物 |
| `scripts/preflight.mjs` · `scripts/scaffold.mjs` | 部署前置检查 + 一键准备（见下） | ✓ |

角色职责与方法论：见各 `presets/<role>.patch.yml`（persona）与 `presets/<role>/skills/<n>/SKILL.md`（方法论正文）——都随本包发布。

## 部署（四步）

**前置**：DSH 版本必须是 `dsh-v0.2.1-rc.2`（`dsh.compatibility.dshReleases` 钉死）。

```sh
# ① 建 profile——自定义名默认只带 dsh-base（起不了 web，也就没有 GUI）；须先取 web 模板。
#    `web` = DSH 出厂模板（不读你本地同名 profile）。profile 已存在则**跳过本步**，改用不带该
#    flag 的 `dsh --profile research --dump-config`（带 `--from-default-profile` 会因"已存在"硬失败）。
dsh --profile research --from-default-profile web --dump-config

# ② 装包：本包 private（未发布 registry）——裸包名解析不到，必须给 tarball 的 file: 形态；
#    且**必须绝对路径**（`file:` 相对路径按 profile 目录解析，不是你的 cwd）。
#    出包 = `node scripts/dist/export-dist.mjs`（仓根执行）→ `_dist/` 的 tarball + 安装手册.md（用户视角正本）。
dsh plugin --profile research add file:/abs/path/to/dsh-deep-research-pack-<版本>.tgz

# ②b 验证形状（"装好了"的最小判据；下列各项缺任一 = 没装上）
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
# 若 DSH_HOME 有 research profile，preflight 优先用它；无 research 时仅在唯一 profile 可用时推断，
# 多个 profile 则不任意挑选，按本包位置解析，或用 --host <profile 目录> 明确指定。
# 研究就绪检查：DSH 版本 / 全部平台 peer 包 / 团队机制层 / 工作区手册+模板 / 构建产物 / 模型密钥
# 若 dsh --version 不可用，版本项标记为未验证并写入摘要，不阻断安装验收或冒充全绿。
# 仅验安装形状（无模型调用、无凭据也可验）：追加 --install-only；它不代表研究就绪。
```

## 研究怎么跑

1. **HITL1 立项（两段卡）**：对 Lead 说出研究问题 → 第一段三问（研究类型/深度篇幅/时间口径
   与语言）+ 按需采集业务决策简报 → 点选即定稿；Lead 按判型推荐**研究方法**（内置预设：
   事实核查/领域地图/主张核查/方案比较/时间线与信号——回答"怎样调查、核验、综合"，与类型/深度互不替代），
   落稿 question.md 的「研究方法（本次实际采用）」节；Lead 落稿 question.md + topics.md 后发
   第二段**计划确认卡**（quick_factual 豁免；含方法行，quick_factual 的方法自动采用并落格）——
   按计划开跑(Recommended)/ 修订计划（意见附加，含用自然语言调整方法）/ 放弃，
   拍板即开工（一轮制）。卡的硬格式细则（简报字段、≤200 字、推荐项置首）与方法预设、推荐
   映射、用户方法库（`method-library.md`，显式才写）的细则正本 = 研究手册 §交互纪律与
   Lead 的 research-brief skill——本页不复述防漂移；
2. **静默自主区**：Lead 拆 topic、派 Scout/Analyst/Critic（Agent Teams 通道），证据落
   `drt_<slug>/evidence/`（七字段 frontmatter：source_url / retrieved_at / quality / found_by /
   supports / source_tier / publisher）；Critic 对抗核查出 `review.md`（readiness PASS 是交付前置）；
3. **HITL2 审阅**：结构化选项卡（按现稿定稿(Recommended)/ 补研究 / 修订表述）→ 拍板后交付
   `final.md`（每条关键结论附 `[来源: evidence/xx.md]`；报告首屏 = 决策摘要：建议与适用条件 /
   备选取舍 / 关键依据 / 最强反证 / 目前不能判断 / 下一步——快速事实型缩略为答案+口径+依据+限制）；
4. **观察面**：DSH Web GUI 右栏「研究状态」页签看实时动态（流程轨道 = ◆立项确认 + 立项→
   组队→侦察→挖掘→综合→审查 + ◆交付审阅 + 交付，↻ rerun 回路自交付审阅可见，人性化活动流，
   HITL 挂起横幅点名锚点与参与方式，活标题「研究状态 · ⏳ 等你拍板」，交付节点显示 `final/` 中的最高有效版本号（vN）；仅 v2+ 文件是证据扩张版本记录。）；
   右栏「研究配置」页签（D25 管理中继面）四区——**本次研究**（这次用的是哪条打法 ＋ 一键换，读
   question.md 研究方法节）／**内置打法**（一句话 ＋ 什么时候用它 ＋ 标本位）／**我的偏好库**／
   **底线条**（六条共同底线 ＋ 两个定制入口：让 Lead 帮我起草、从本次 run 沉淀）；操作按钮生成
   管理指令交当前会话 Lead 执行，并就地回执三态（已发送／Lead 已回话／已落盘对账——回读库文件
   对出改了哪一句）；**面板不直写文件**；
5. **审计**（本仓开发面）：`node scripts/run-gates/evidence-audit.mjs <bundle>` 对会话日志机械对账——
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

## 运行期韧性（provider 重试策略）

本包在 bundle 层按 id 替换 base 的 `llm-deepseek` 行，把上游流畸形码 `MALFORMED_RESPONSE` 并入
**有界**重试：`retryPolicy.mode: normal`、`maxRetries: 5`、`retryableCodes` = 出厂五项 +
`MALFORMED_RESPONSE`（退避沿用出厂默认）。理由是研究 run 的**停摆代价**：一次畸形流事件会当场终结
回合，可能让一个 wave 的产出全废（实测分母与恢复程序 = `_backlog/_archived/fixed_bugs/BUG-022-provider-stream-malformed-turn-kill.md`；
决定理由与"未运行项" = `notes/implemented/2026-10-11-provider-malformed-response-retry.md`）。

这**不是**对上游缺陷的修复（事件顺序违约发生在 vendor 只读层），只是把"一次畸形 = 一次停摆"降为
"一次畸形 = 最多六次尝试"。上层设置（`settings` 的 `llm-deepseek:` 段）仍可覆盖本策略。

## 已知限制与延后工作

- **研究方法配置首版边界**：方法 = 调查路径指导，不新增强制预算/来源数硬门，readiness 不自动验证方法承诺之外的新合同；用户方法库 `method-library.md` 是**工作区本地用户数据**（同工作区的会话都看得到，换工作区不带；Lead 显式维护，无版本史、无跨设备同步）；高承诺学术模式（系统综述类）不在预设；Settings 管理页不做（需显式重议 D7/D18 架构边界，见 [_backlog 长期管理卡](../../_backlog/_archived/settled_issues/2026-10-12-research-method-profile-management.md)）；方法库的增长纪律（命中计数／休眠）与库规模能力（分组／搜索／导入导出／跨工作区）、交付工件的表格档、领域包升格为字段——四项延后，重议条件登记在 [_backlog/triggers.md](../../_backlog/triggers.md)；

- **会话必须建在**研究工作区里**才能看到渐进面**：页签读的是会话工作区根（`workspaceFiles`），
  run bundle 在工作区内才可见——故需先把研究工作区注册进 DSH（`workspace/create`），再用
  `workspaceId` 形态建会话（`dev/run-kickoff.mjs` 已默认此形态）；建在别处的会话只显示活动流；
- **队员动态折叠区（检索/抓取/出错粒度）**：lead 活动流照旧；队员动作经 agentTeam 投影发现
  队员会话 + 多路 follow，折进每人折叠区（默认折叠，🔍/🌐/⚠️ 计数徽标；定夺与证据 =
  [member-activity-stream 卡](../../_backlog/_archived/settled_issues/2026-10-09-member-activity-stream.md)）。
  文件读写级动作不入流（噪音定夺）；任务粒度看 `ui-agent-team` 任务板——两面板分工不重复；
  有团队正例首验 = 下一场真实 run；
- **`workspace/` 种子是快照**：由 `dev/sync-pack-workspace.mjs` 从仓库正本同步（门禁
  `pack-workspace-fresh` 防漂移）；种子只铺新工作区，**不覆盖**已存在文件（`--force` 除外）；
- **品牌名与品牌标**已按 [ui-skin](../../notes/rejected/2026-09-24-ui-skin.md) 的重启条件窄复活落地（虎鲸 Orca，mark/name 两槽注入——[Note](../../notes/implemented/2026-10-13-orca-brand.md)）；**皮肤层**（配色/主题）与**专职 synthesizer 角色**的重议条件仍分别由 [ui-skin](../../notes/rejected/2026-09-24-ui-skin.md) 和 [synthesizer](../../notes/rejected/2026-09-24-synthesizer-role.md) 拥有；
- **工具卡 = 2 张**（spawn_teammate / web_search）；`team_task_*` 与其他协调类工具
  （wait_agent / list_agents / send_message）**不进对话流**（实测：harness 把协调类工具排除在对话渲染外）——团队任务的观察由 ui-agent-team 任务板与 To-dos
  折叠承担，无需卡片（4 卡方案的回退理由 = [marathon2 复盘](../../notes/archived/2026-09-25-marathon2-retrospective.md)，冻结层）；
- **版本兼容面窄**：只声明 `dsh-v0.2.1-rc.2`（pre-stable API，peer 版本号不精确钉死）。
