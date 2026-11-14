# AGENTS.md — 本仓库的入口链

DSH Deep Research 插件：一个包（`packages/deep-research-pack`）提供四个研究角色 preset
（`Deep Research Lead / Scout / Analyst / Critic`）+ 一个方法编辑 preset（`Method Editor`，D37）；协作主通道 = DSH 现成 Agent Teams。
方法论内核移植自 codex Deep Research harness（映射表 docs/design/30-methodology-mapping.md）。

## 入口链（唯一正本——其他文件一律指回本节，不再各自复述）

> **先分流**：先按 [00-index §先分流](docs/00-index.md) 选行，再读该行指向的文档——"用它"
> 类任务（启动 / 跑研究 / 装插件）到这一步即可开工；下面这条 1–4 步链只在"改本仓"时适用。

按序读，不跳：

1. **本文件**——布局 + 命令速查 + 纪律 + `notes/` 地位 + 本链的定义；
2. **[docs/00-index.md](docs/00-index.md)**——文档地图（术语对照 = [terms.md](docs/terms.md)；D 号台账 = [decisions.md](docs/decisions.md)，按需跳）；
3. 按本轮授权进入工作：用户直派按请求范围执行；需澄清、查证或记录的问题按 [意图载体总图](docs/design/60-intent-carriers.md) 路由到 `_backlog/issues/`、`bugs/`、`research/`、`methods/` 或 `triggers.md`（可观察重议条件）。Backlog 不是实施前置门；**改 `presets/` 或 `content/` 时，Agent 的组织约定 = [design/70](docs/design/70-content-organization.md)（新内容放哪 / 怎么长 / 何时动结构）**；
4. **[docs/guides/60-dev-loop.md](docs/guides/60-dev-loop.md)**——按改动面选择验收与收尾。仅当持久决定需要显式评审时，才为该项建立 [notes/proposed/](notes/proposed/) RFC。

开工就绪最小集 = 上列 1–3；改仓任务的验收/收尾按第 4 步。仓库全局如何运行、调试、交互和分层验收 → [docs/project-map.md](docs/project-map.md)；验收怎么判 → [docs/evaluation.md](docs/evaluation.md)；意图载体边界 → [docs/design/60-intent-carriers.md](docs/design/60-intent-carriers.md)；run 怎么操作 → [guides/61](docs/guides/61-run-playbook.md)。

## 工作流：从 `_backlog` 到交付（一条线）

`_backlog` 卡/研究题（研究）→ 定性（`待落地`/`修复就绪`/`已定性`）→ 落地（授权后 guides/60；研究题 =
结论转卡/Note）→ 审查/验收（按重要性；机械不跳）→ 归档（卡与去向载体同变更）。直接授权的工作不建卡
也按此走，不因 backlog 停等。

- `status` = 阶段唯一家；状态/守卫 = [_backlog/AGENTS.md](_backlog/AGENTS.md)：`待落地` 不是授权；
  `修复就绪` = P1/P2 修复授权（P0/触面 → `等人拍板`）。
- `待落地` 只选去向（`proposed` RFC / `implemented` Note），不写 implemented Note；收件/写入时机 =
  [notes/AGENTS.md](notes/AGENTS.md)；落地 = [guides/60](docs/guides/60-dev-loop.md)。
- 审查/验收：机械不跳；语义自审按风险；用户按重要性出场；`审查：跳过` 不写成 verified。
- 归档：卡与去向载体同变更（Note / RFC / triggers / none）；延后项落 [triggers](_backlog/triggers.md)。
- **修复证据**：bug 翻 `修复落地/已修` 必须写「改动 + 红证 + 绿证」（红证可重放或改动含测试/门禁资产）并与代码/测试同变更；只改状态/移动卡 = 假修（机械面 = `staged-change-pairing`；规则 = [_backlog/AGENTS.md](_backlog/AGENTS.md)）。

## 布局

```
CLAUDE.md→AGENTS.md、.claude/skills→.agents/skills    两条 symlink（编辑真文件；后者让 Claude 系
                         harness 发现同一批开发技能——verify 门禁 claude-symlink 校验）
子树 AGENTS.md            docs/ · scripts/ · notes/ · packages/deep-research-pack/ · tests/ · _backlog 各一份——只放该
                         子树的指令（根只放每轮常驻指令；vendor 树内多份同构，份数以盘上为准）
README.md                 人类门面（使用者：结果 / 安装 / 第一次研究；开发者一行路由；完整安装合同 = _dist/安装手册.md）
_backlog/                 问题澄清与证据区：issues/、bugs/、research/、methods/、triggers.md、_archived/（另有
                          _done/ 改名兼容指针，见 _backlog/README 载体导航）；
                          手册 = _backlog/README.md、子树门牌 = _backlog/AGENTS.md（状态机/下一步/守卫）
package.json / pnpm-workspace.yaml / pnpm-lock.yaml   根 workspace（scripts: verify/test；pnpm 只挂本仓包，vendor 入 workspace 按实际构建需求——见 pnpm-workspace.yaml 头注）
packages/deep-research-pack/   唯一自写包（配置为主 + 启动行/内容注入（D40）+ 研究驾驶舱[Research Cockpit，观察面 client 套件，[D18](docs/decisions.md#d18)，构成正本 = docs/design/40-research-cockpit.md]）：presets/<role>.patch.yml（单行形态=一条 @deepseek-ai/dsh-agent-preset 行，config.plugins 内声明 persona/时钟/skills/工具行）+ presets/<role>/skills/<n>/SKILL.md、content/（研究手册 + run 模板 + lens 目录；src/content 以 runtime context 注入）、cordis.patch.yml（bundle 行）、scripts/doctor.mjs（只读 doctor）、src/{content,startup}/、src/client/ 与 src/lib/（驾驶舱 client 半与折算纯函数，构建产物 lib/）；交付与部署形态 = guides/62，合同 = 包 README
vendor/dsh/               pinned submodule（只读铁律——verify vendor-pin/vendor-clean 把守；机制权威正本，tag/commit 见 §DSH 源码表）
research-workspace/      dev 工作区实例（角色会话 cwd；用户工作区 = 任意目录）：method-library.md（本工作区
                         方法库）、drt_<slug>/（run bundle）、archive/（已交付归档）、_abandoned/
                         （停放位）、drafts/（开发侧草稿，非 run 产物）
docs/                    00-index（地图；术语 = terms.md；D 号台账 = decisions.md）→ design/10-70 → discipline-map（纪律全量枚举）→ guides/60（开发环）+ guides/61（run 操作）+ guides/62（插件作者入口）+ guides/65（运行形态合同）+ guides/66（探针）+ evaluation.md（验收合同）
notes/                   开发记忆与证据链（见下节）：proposed/（需评审 RFC）→ implemented/（活的决定）；
                         不再指导未来 → archived/ 冻结；rejected/（否决 + 重启条件）；事故复盘在 archived/；
                         立项来历 = notes/README §立项来历（用户定调只进 decisions.md D 号依据列）
.agents/skills/          开发技能（DSH 约定路径：project-agents 发现根）：任务匹配即加载的程序化工作记忆
                         （换 pin / 加角色 / 写门禁 / 跑 run / 改轨道 / 交付自审 / 复现间歇缺陷）；与随包 runtime skills（presets/*/skills/）分家
probes/                  调试第一入口：真实边界单点探针（behavior/browser/stream 三域；真模型/已起 GUI/仪器）；指南 = docs/guides/66，索引 = probes/INDEX.generated.md（生成物）
scripts/                 职责分组：verify/（L0 门禁）、smoke/（*.e2e.mjs 真进程 / *.entry.mjs 真入口 / *.support.mjs 支援）、test/（车道 runner）、run-gates/、run-ops/、dist/ + lib/——逐件职责与档位 = scripts/README.md
tests/                   keyless 回归（node:test；*.spec.mjs = 进程内 spec，checks/*.test.mjs = 门禁自身；layering 守卫五件套——规则见 tests/AGENTS.md）
snapshots/               场景证据层：整组录制资产 + 场景声明 snapshot.json（消费 = snapshot-replay.entry
                         经 scripts/lib/replay-scene.mjs）；分类与证据边界 = snapshots/README.md
dev/                     源码驱动与 run 通道：env.sh（双 home + 裸 dsh 拦截 + pre-commit 挂载）、vendor-build.sh（vendor 树构建）、render-overlay（tracked 生成物生成器：overlay）、boot-run.sh（run 通道开跑，自 source env.sh）/ run-driver.mjs（通道驱动与呈交，内部调 boot-run）、run-kickoff / hitl-answer（会话驱动与 HITL 代答）、record-role-fixture（fixture 录制）、research.overlay.yml（**生成物**，勿手改）、hooks/（pre-commit 红灯拦 commit）——逐件职责 = dev/README.md
runtime/                 运行态区（gitignored）：harness-home/（开发 DSH home：会话/凭据/插件安装）+
                         smoke-workspace/（冒烟与 boot 运行产物）——dev/ 只住源码驱动，跑出来的东西住这里
_dist/                   对外交付件：安装手册.md（tracked 生成物，生成器 = scripts/dist/export-dist.mjs）
                         + 打包 tgz（gitignore）
（布局 = 骨架图，非全量清单——scripts/dev 全档工具与逐命令说明 = guides/60 §2；
  _backlog 细构[问题、方法、调研与归档] = _backlog/README.md）
```

入库边界（哪些进 git / 跨环境）= [guides/63](docs/guides/63-git-boundary.md)；新文件先按该页三问分类；发布版本/tag 顺序 = [guides/64](docs/guides/64-release-versioning.md)。

本轮工作以用户请求和已有授权为准；开工/收尾程序 = 第 4 步。

## `notes/`：开发记忆（常设指令）

**开工先查 notes，再改代码**（按条目名/机制名检索，只读命中的）；只有承载持久决定理由的变更才需
**同一变更**写 Note——机械与局部编辑豁免。时态总图 = [notes/README.md](notes/README.md)（proposed →
implemented/archived/rejected；事故复盘在 archived/）；写入触发/取代检查/格式/毕业 = [notes/AGENTS.md](notes/AGENTS.md)；
任务流程 = `.agents/skills/`（按 description 加载，不占常驻上下文）。原生定义在 `vendor/dsh/.agents/notes/`；本仓差异见 notes/README。

## 命令速查（全档正本 = [guides/60 §2](docs/guides/60-dev-loop.md)；run 通道 = [guides/61](docs/guides/61-run-playbook.md)）

```sh
source dev/env.sh    # ⚠ fresh clone 首次（激活 hooks）与 L1/L2、部分 run-ops 需先 source；run 通道 dev/boot-run.sh 自 source，勿重复。作用：双 home（DSH_HOME=runtime/harness-home）+ pre-commit + 裸 dsh 拦截；未 source 的脚本自拒 exit 2；口径 = guides/60 §2
pnpm verify          # L0 结构门禁（keyless，收尾必跑）
pnpm test            # L0 keyless 聚合（spec + checks；分车道 = test:spec / test:checks / test:e2e / test:entry；vendor = test:vendor）
node dev/run-driver.mjs up   # 研究 run 通道（起/复用 + 验浏览器面 + 呈交 URL；操作 = guides/61 §0）
                             # 启动次序固定 = profile → plugin add(roster) → dsh --profile → 工作区/会话；别手起 dsh、别自创启动路径
```

搜索先限定 `packages/`、`tests/`、`scripts/`、`docs/`；`vendor/`、`runtime/`、`packages/*/lib/` 是生成物/运行区，别全仓 grep。

其余全档（L1 挂载 / L2 安装 / L4-lite / run 通道 / 观察面 / 部署 bin）与逐命令说明 = [guides/60 §2](docs/guides/60-dev-loop.md)；档位与密钥 = 下节。

## 密钥

档位词汇：**keyless** = 无凭据可跑；preset.e2e 真挂载档无模型调用、不需要 key。
release.entry 无模型调用，安装验收使用 `--install-only` 跳过模型就绪检查；默认 preflight 仍检查凭据在场；
**真模型档** = 需凭据并调用模型；`scripts/` 入口 closed set 正本 = [smoke-contract](tests/checks/smoke-contract.test.mjs)（成员清单 = 该测试的 REAL_MODEL；本行不复制名单）。`dev/record-role-fixture.mjs` 是单独录制工具，完整研究 run 属 L4，均不在该脚本闭集中；档位与验收面见[项目地图](docs/project-map.md)。CDP `--ask` 按当前会话档处理（模式表 = [项目地图](docs/project-map.md)）。

L4-lite 真模型冒烟需要 `DEEPSEEK_API_KEY`：开发 home（`runtime/harness-home/.credentials.yaml`）配一次
即可，永不提交密钥；web 搜索无需独立 key——base 的 `web-search-deepseek` 行 `apiKeyEnv: DEEPSEEK_API_KEY`，与 chat 同一把钥匙（实证：vendor `packages/bundle/base/cordis.patch.yml` 的 web-search-deepseek 行）。

## DSH 源码：机制权威在哪

| 实体 | 位置 | 角色 |
|---|---|---|
| ① 开发基线（唯一权威） | `vendor/dsh/`（本仓 pinned submodule，tag `dsh-v0.2.1-rc.5` @ `b830ec950f`，只读铁律——verify vendor-pin/vendor-clean 把守） | 机制核对与验证会话一律走它（dev/env.sh 的 dsh 函数与 `pnpm dsh` 从此处源码起） |
| ② 日用全局安装 | npm 全局（`which dsh`） | 与本 repo 开发无关；版本随全局漂移，行为不作机制依据 |
| ③ 参考仓（作者本地，不随仓） | `ai_dsh_company`（插件工程范式）、`ai_tool_deepresearch`（方法论源头） | 只读参考；公开贡献者不需要它们；吸收落点登记在 docs/external-materials.md |

DSH 全局不变量（fail-loud / model-visible ⟺ logged / registrations are effects / plugins
not loop changes）= vendor 树根 AGENTS.md Conventions 节。

## 纪律（全量正本 = [discipline-map.md](docs/discipline-map.md)——vendor 逐源三态枚举）

> 全表 = [discipline-map](docs/discipline-map.md)（每行 = DSH 做法 → 本仓落点 → 照搬/带证据适配/
> 不适用+理由；随 vendor 换 tag 重校）——纪律的权威正本。速查关键词：fail-loud · model-visible ⟺ logged ·
> 完成定义 = 真检查 · no-key 证管道 / with-key 证 agent · verify the world · 真入口路径 ·
> 新门禁带反证 · docs = 当前合同 · 同 diff 带 Note · 窄证据切片 · 卫生铁律 · 工具态重定向。
>
> **证据匹配面**：改动的面 → 证据类型，执行正本 = [guides/60 §2 任务型路由表](docs/guides/60-dev-loop.md)；新契约测试与门禁同 diff 带反证（先看红再交付绿）。单点机制/行为（含模型不按纪律）可疑 → 先看 [probes/](probes/README.md)（指南 = guides/66），别先跑整链。
> **命名即车道**（[D53](docs/decisions.md#d53)）：测试文件名 = 证据车道——`.spec.mjs` 进程内 / `.e2e.mjs` 真进程 / `.entry.mjs` 真入口 / `tests/checks/*.test.mjs` 门禁；错后缀或错 lane = 红。规则 = [tests/AGENTS](tests/AGENTS.md)。
>
> **研发宪章**（2026-09-27 用户定调）= [CONTRIBUTING §Development charter](CONTRIBUTING.md#development-charter)：循 DSH 而不发明 · 自主优先并借鉴成熟 DSH 插件（采纳度为信号）· **审阅分层**——机械门禁/审计/判据探针/对抗自审自主做，只在阶段边界请人（REVIEW 是最后手段，不是例行步骤）。

## 编辑这些指令

`CLAUDE.md` symlink `AGENTS.md`（编辑真文件）。根 AGENTS.md 只放**每轮都要在场的常驻指令**
（每条 1–3 行 + 链到 home）；子树专属指令放该子树的 `AGENTS.md`（`docs/` · `scripts/` ·
`notes/` · `packages/deep-research-pack/` · `tests/` · `_backlog`）。入口链成员与行数上限分别由 `entry-chain` 与
`doc-budgets` 门禁把守；上限在 [scripts/doc-budgets.json](scripts/doc-budgets.json)，
超限处置序 = 下放 > 压缩 > 升顶（升顶须同变更登记理由——上限过低是预算 bug）。

## 术语速查

概念 → 官方载体 → 源码路径 = [terms.md](docs/terms.md)；探索路由（vendor 树）=
`vendor/dsh/docs/architecture.md` → `vendor/dsh/docs/capability-seams.md` → 具体 package README。
