# AGENTS.md — 本仓库的入口链

DSH Deep Research 插件：一个包（`packages/deep-research-pack`）提供四个研究角色 preset
（`Deep Research Lead / Scout / Analyst / Critic`）；协作主通道 = DSH 现成 Agent Teams。
方法论内核移植自 codex Deep Research harness（映射表 docs/design/30-methodology-mapping.md）。

## 入口链（唯一正本——其他文件一律指回本节，不再各自复述）

> **先分流**：先按 [00-index §先分流](docs/00-index.md) 选行，再读该行指向的文档；下面这条
> 1–5 步链**只在"改本仓"时适用**（用户说启动 / 跑研究 / 装插件 = "用它"，先看那节）。

按序读，不跳：

1. **本文件**——布局 + 命令速查 + 纪律 + `notes/` 地位 + 本链的定义；
2. **[docs/00-index.md](docs/00-index.md)**——文档地图 + 决策台账（D 号）+ 术语映射；
3. **[_backlog/queue.md](_backlog/queue.md) §队列 ▶**——全仓唯一"当前"条目；行内标注**可执行性**（"等人 / 可自主"）——标"等人"时正确动作是向用户取题，不是开工；队列空（`（队列空——待用户取题）` parked 标记）同此——取题，不是找活凑数；
4. 该条目在 **[notes/proposed/](notes/proposed/)** 的 RFC——条目全文（问题/方案/输掉的方案/验收）；
5. **[docs/guides/60-dev-loop.md](docs/guides/60-dev-loop.md)**——开工（§1/§2）与收尾（§4）程序；每步"读什么 → 应知道什么 → 卡住怎么办"的**契约表**与按条目类型的分支 = 该页 §1.1。

开工就绪最小集 = 上列 1–5。**其余一切按需，不强制通读**：验收怎么判 →
[docs/evaluation.md](docs/evaluation.md)；机制为什么这样 → `docs/design/10-40`；run 怎么操作 →
[guides/61](docs/guides/61-run-playbook.md)。

## 布局

```
CLAUDE.md -> AGENTS.md    symlink（编辑真文件 AGENTS.md，verify 门禁校验）
子树 AGENTS.md            docs/ · scripts/ · notes/ · packages/deep-research-pack/ · tests/ 各一份——只放该
                         子树的指令（根只放每轮常驻指令；上游 22 个子树 AGENTS.md 同构）
README.md                 人类门面（Start Here 链接 + 稳定原则摘要；命令正本 = guides/60 §2，不复制）
_backlog/                 规划面单入口（D20，roadmap.md 已退役）：queue.md = 纯队列索引（▶ 唯一"当前"
                          指针 + 搁置池，零判断材料）；plans/ 推敲卡（YYMMDD-slug，只载判断材料）、
                          bugs/ 缺陷卡、_done/ 归档（位置即状态）；推敲卡不是任务；手册 = _backlog/README.md
package.json / pnpm-workspace.yaml / pnpm-lock.yaml   根 workspace（scripts: verify/test；pnpm 只挂本仓包，vendor 入 workspace 随队列条目——见 pnpm-workspace.yaml 头注）
packages/deep-research-pack/   唯一自写包（配置为主 + 研究驾驶舱[Research Cockpit，观察面 client 套件，D18，构成正本 = docs/design/40-research-cockpit.md]）：presets/<role>.patch.yml（0.1.7 形态=一条 @deepseek-ai/dsh-agent-preset 行，config.plugins 内声明 persona/skills/工具行）+ presets/<role>/skills/<n>/SKILL.md、cordis.patch.yml（bundle 行）、workspace/（工作区种子：手册+模板，生成物）、scripts/{preflight,scaffold}.mjs（部署 bin）；交付与部署形态 = guides/62，合同 = 包 README
vendor/dsh/               pinned submodule（只读铁律——verify vendor-pin/vendor-clean 把守；机制权威正本，tag/commit 见 §DSH 源码表）
research-workspace/      运行场（角色会话 cwd）：AGENTS.md 研究手册、drt_<slug>/（run bundle）、
                         archive/（已交付 run 归档位）、drafts/、templates/run/
docs/                    00-index（地图+决策台账+术语映射）→ design/10-40 → discipline-map（纪律全量枚举）→ guides/60（开发环）+ guides/61（run 操作）+ guides/62（插件作者入口）+ evaluation.md（验收合同）
notes/                   **开发记忆与证据链**（核心流程数据，不是历史附件——见下节）；目录名自带时态，
                         总图 = notes/README.md（将来 proposed/ · 过去 implemented/archived/rejected/
                         postmortem/）：
                         intents.md（立项宪章，已冻结——新定调进 D 号依据）→ proposed/（在飞队列条目的 RFC）→ implemented/（不再指导未来工作者
                         冻结入 archived/）；
                         rejected/（否决与搁置——"决定不做"，带重启条件）；postmortem/（事故复盘）
.agents/skills/          开发技能（DSH 约定路径：project-agents 发现根）：任务匹配即加载的程序化工作记忆
                         （毕业条目 / 加角色 / 写门禁 / 跑 run / 改轨道）；与产品内 runtime skills（presets/*/skills/）分家
scripts/                 verify.mjs（L0）、preset-smoke.mjs（L1 真挂载，keyless 双通道）、client-load-smoke.mjs（观察面真浏览器）、client-hitl-smoke.mjs（活标题触发，真模型档）、evidence-audit.mjs（证据面机械审计）、release-smoke.mjs（L2 安装面）、l4-lite-smoke.mjs（L4-lite 真模型）、team-preflight-smoke.mjs（team 机制预检）、entry-chain-probe.mjs（入口链探针，真模型档）、run-dashboard.mjs（run 只读投影，boot-run 起）、snapshot-replay-smoke.mjs（keyless 回放冒烟）、lib/（roles 角色清单访问器[事实源=盘上 presets/] + env/playwright/vendor-artifacts 三个冒烟支撑模块）
tests/                   keyless 回归（node:test，无测试框架；layering 守卫禁真模型/网络/子进程；fixtures/ 测试夹具）
dev/                     vendor-build.sh（vendor 树构建：tsc host/client + typert 产物 + client bundle）、vendor-typert-emit.mjs（typert 产物生成器）、vendor-host-bundle.config.ts（逐包 host 半补建配置：tsdown -c 给缺 lib/index.js 的包补产物）、vendor-host-typert.config.ts（逐包 tsdown 备选配置，留档）、render-overlay.mjs（从 pack 渲染 research.overlay.yml）、sync-pack-workspace.mjs（把 research-workspace 正本同步进 pack 的 workspace/ 种子）、boot-run.sh（run 通道开跑：幂等装+boot web+仪表盘）、run-kickoff.mjs（run 会话驱动）、env.sh（双 home + dsh 机制基线 + pre-commit 钩子激活）、research.overlay.yml（源码域 overlay，**生成物**）、hooks/（pre-commit：verify+tests 红灯拦 commit）、harness-home/ 与 smoke-workspace/（gitignore 运行区）
```

接下来开发什么 = §入口链 第 3 步的 ▶ 条目；开工/收尾程序 = 第 5 步。

## `notes/`：开发记忆（常设指令）

**开工先查 notes，再改代码**：按条目名/机制名检索（只读命中的，不通读全树）；**只有承载持久决定
理由的变更**（代码/测试/现有文档说不清的"为什么选它、放弃了什么"）才需**同一变更**新增或更新
Note——机械与局部编辑（含本地 UI 呈现与交互改动）豁免。细则是子树指令，不在这里复述：

- **时态总图 = [notes/README.md](notes/README.md)**（将来 `proposed/` = 在飞队列条目的 RFC 全文 · 过去
  `implemented/` `archived/`（冻结） `rejected/`（否决与搁置，带重启条件） `postmortem/`；下一步仍只看 [_backlog/queue.md](_backlog/queue.md) ▶）；
- **写入触发 / 取代检查 / 格式与毕业 = [notes/AGENTS.md](notes/AGENTS.md)**；
- **任务流程**（毕业条目 / 加角色 / 写门禁 / 跑 run / 改轨道）= `.agents/skills/` 开发技能，按
  description 触发加载，不占常驻上下文。

原生定义（vendor 树内，本仓不复制）：`vendor/dsh/.agents/notes/README.md`（生命周期/分类/
格式骨架）、`vendor/dsh/.agents/notes/AGENTS.md`（取代检查常设指令）、
`vendor/dsh/.agents/notes/implemented/AGENTS.md`（维护规则）。本仓落地与差异见
[notes/README.md](notes/README.md)。

## 命令速查（全档正本 = [guides/60 §2](docs/guides/60-dev-loop.md)）

```sh
source dev/env.sh    # ⚠ 前置：双 home + 裸 dsh 拦截（DSH_HOME=dev/harness-home）；L1/L2 必须先 source，否则脚本自拒 exit 2（run 通道 dev/boot-run.sh 自 source，勿重复）
pnpm verify          # L0 结构门禁（keyless，收尾必跑）
pnpm test            # L0 keyless 回归（唯一登记的测试命令）
```

其余全档（L1 挂载 / L2 安装 / L4-lite / run 通道 / 观察面 / 部署 bin）与逐命令说明 = [guides/60 §2](docs/guides/60-dev-loop.md)；档位与密钥 = 下节。

## 密钥

档位词汇（全仓统一）：**keyless** = 无凭据可跑——preset-smoke
真挂载档与 release-smoke 会起真 DSH 环境，但无模型调用、不需要 key；**真模型档** = 需要
`DEEPSEEK_API_KEY` 与真模型调用（当前 = l4-lite-smoke、team-preflight-smoke、
entry-chain-probe 与 client-hitl-smoke；队列里的 L4 全量同档）。

L4-lite 真模型冒烟需要 `DEEPSEEK_API_KEY`：开发 home（`dev/harness-home/.credentials.yaml`）配一次
即可，永不提交密钥；web 搜索无需独立 key——base 的 `web-search-deepseek` 行 `apiKeyEnv: DEEPSEEK_API_KEY`，与 chat 同一把钥匙（实证：vendor base bundle cordis.patch.yml）。

## DSH 源码：机制权威在哪

| 实体 | 位置 | 角色 |
|---|---|---|
| ① 开发基线（唯一权威） | `vendor/dsh/`（本仓 pinned submodule，tag `dsh-v0.2.0-rc.2` @ `639ed01539`，只读铁律——verify vendor-pin/vendor-clean 把守） | 机制核对与验证会话一律走它（dev/env.sh 的 dsh 函数与 `pnpm dsh` 从此处源码起） |
| ② 日用全局安装 | npm 全局（`which dsh`） | 与本 repo 开发无关；版本随全局漂移，行为不作机制依据 |
| ③ 参考仓 | `/Users/bowhead/ai_dsh_company/`（插件工程范式）、`/Users/bowhead/ai_tool_deepresearch/`（方法论源头） | 只读参考；吸收落点登记在 00-index §外部研究材料 |

DSH 全局不变量（fail-loud / model-visible ⟺ logged / registrations are effects / plugins
not loop changes）= vendor 树根 AGENTS.md Conventions 节。

## 纪律（全量正本 = [discipline-map.md](docs/discipline-map.md)——vendor 逐源三态枚举）

> 全表 = [discipline-map](docs/discipline-map.md)（每行 = DSH 做法 → 本仓落点 → 照搬/带证据适配/
> 不适用+理由；随 vendor 换 tag 重校）——纪律的权威正本。速查关键词：fail-loud · model-visible ⟺ logged ·
> 完成定义 = 真检查 · no-key 证管道 / with-key 证 agent · verify the world · 真入口路径 ·
> 新门禁带反证 · docs = 当前合同 · 同 diff 带 Note · 窄证据切片 · 卫生铁律 · 工具态重定向。
>
> **证据匹配面**：改动的面 → 证据类型，执行正本 = [guides/60 §2 任务型路由表](docs/guides/60-dev-loop.md)；新契约测试与门禁同 diff 带反证（先看红再交付绿）。
>
> **研发宪章**（2026-09-27 用户定调）= [README §研发宪章](README.md)：循 DSH 而不发明 · 自主优先
> 并借鉴成熟 DSH 插件（采纳度为信号）· **审阅分层**——机械门禁/审计/判据探针/对抗自审自主做，
> 只在阶段边界请人（REVIEW 是最后手段，不是例行步骤）。

## 偏离登记簿

| D 号 | 偏离 | 约束证据 | 归宿 |
|---|---|---|---|
| （伴随） | node:test 而非 vitest；verify 用 regex 断言而非 YAML 解析 | **已重估维持**：测试栈零迁移收益（keyless tests 绿即证据——计数不写进文档，查 `pnpm test`），断言对象是自控文件 | 重估记录 = [vendor-submodule 毕业 Note](notes/implemented/2026-09-24-vendor-submodule.md)（2026-09-24） |

## 编辑这些指令

`CLAUDE.md` symlink `AGENTS.md`（编辑真文件）。根 AGENTS.md 只放**每轮都要在场的常驻指令**
（每条 1–3 行 + 链到 home）；子树专属指令放该子树的 `AGENTS.md`（`docs/` · `scripts/` ·
`notes/` · `packages/deep-research-pack/` · `tests/`）。入口链成员与行数上限分别由 `entry-chain` 与
`doc-budgets` 门禁把守；上限在 [scripts/doc-budgets.json](scripts/doc-budgets.json)，
超限处置序 = 下放 > 压缩 > 升顶（升顶须同变更登记理由——上限过低是预算 bug）。

## 术语速查

概念 → 官方载体 → 源码路径 = [00-index §术语映射](docs/00-index.md)；探索路由（vendor 树）= `docs/architecture.md` → `docs/capability-seams.md` → 具体 package README。
