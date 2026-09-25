# AGENTS.md — 本仓库的入口链

DSH Deep Research 插件：一个包（`packages/deep-research-pack`）提供四个研究角色 preset
（`Deep Research Lead / Scout / Analyst / Critic`）；协作主通道 = DSH 现成 Agent Teams。
方法论内核移植自 codex Deep Research harness（映射表 docs/design/30-methodology-mapping.md）。

## 入口链（唯一正本——其他文件一律指回本节，不再各自复述）

按序读，不跳：

1. **本文件**——布局 + 命令表 + 纪律 + `notes/` 地位 + 本链的定义；
2. **[docs/00-index.md](docs/00-index.md)**——文档地图 + 决策台账（D 号）+ 术语映射；
3. **[roadmap.md](roadmap.md) §队列 ▶**——全仓唯一"当前"条目；
4. 该条目在 **[notes/proposed/](notes/proposed/)** 的 RFC——条目全文（问题/方案/输掉的方案/验收）；
5. **[docs/guides/60-dev-loop.md](docs/guides/60-dev-loop.md)**——开工（§0/§1）与收尾（§4）程序。

开工就绪最小集 = 上列 1–5。**其余一切按需，不强制通读**：验收怎么判 →
[docs/evaluation.md](docs/evaluation.md)；机制为什么这样 → `docs/design/10-30`；run 怎么操作 →
[guides/61](docs/guides/61-run-playbook.md)。

## 布局

```
CLAUDE.md -> AGENTS.md    symlink（编辑真文件 AGENTS.md，verify 门禁校验）
子树 AGENTS.md            docs/ · scripts/ · notes/ · packages/deep-research-pack/ · tests/ 各一份——只放该
                         子树的指令（根只放每轮常驻指令；上游 22 个子树 AGENTS.md 同构）
README.md                 人类门面（Start Here 链接 + 稳定原则摘要；命令/纪律/布局正本 = AGENTS.md，不复制）
roadmap.md                队列 + 搁置池（纯队列：条目完成即离队；▶ = 全仓唯一"当前"指针）
package.json / pnpm-workspace.yaml / pnpm-lock.yaml   根 workspace（scripts: verify/test；pnpm 只挂本仓包，vendor 入 workspace 随队列条目——见 pnpm-workspace.yaml 头注）
packages/deep-research-pack/   唯一自写包（纯配置）：presets/<role>.patch.yml（0.1.7 形态=一条 @deepseek-ai/dsh-agent-preset 行，config.plugins 内声明 persona/skills/工具行）+ presets/<role>/skills/<n>/SKILL.md、cordis.patch.yml（bundle 行）；新增角色步骤见包 README
vendor/dsh/               pinned submodule（tag `dsh-v0.1.7-rc.2` @ `477b4f4205`，只读铁律——verify vendor-pin/vendor-clean 把守；机制权威正本，D10 已销账）
research-workspace/      运行场（角色会话 cwd）：AGENTS.md 研究手册、drt_<slug>/（run bundle）、templates/run/
docs/                    00-index（地图+决策台账+术语映射）→ design/10-30 → discipline-map（纪律全量枚举）→ guides/60（开发环）+ guides/61（run 操作）+ guides/62（插件作者入口）+ evaluation.md（验收合同）
notes/                   **开发记忆与证据链**（核心流程数据，不是历史附件——见下节）；目录名自带时态，
                         总图 = notes/README.md（将来 proposed/ · 过去 implemented/rejected/postmortem/research/）：
                         intents.md → proposed/（RFC，一文件一条目）→ implemented/；
                         rejected/（否决理由，防复犯）；postmortem/（事故复盘）；research/（调研报告，带状态表）
.agents/skills/          开发技能（DSH 约定路径：project-agents 发现根）：任务匹配即加载的程序化工作记忆
                         （毕业条目 / 加角色 / 写门禁 / 跑 run）；与产品内 runtime skills（presets/*/skills/）分家
scripts/                 verify.mjs（L0）、preset-smoke.mjs（L1 真挂载，keyless 双通道）、release-smoke.mjs（L2 安装面）、l4-lite-smoke.mjs（L4-lite 真模型）、team-preflight-smoke.mjs（team 机制预检）、entry-chain-probe.mjs（入口链探针，真模型档）、run-dashboard.mjs（run 只读投影，boot-run 起）、lib/roles.mjs（角色清单访问器，事实源=盘上 presets/）
tests/                   keyless 回归（node:test，零依赖；layering 守卫禁真模型/网络/子进程；fixtures/ 测试夹具）
dev/                     vendor-build.sh（vendor 树构建：tsc host/client + typert 产物 + client bundle）、vendor-typert-emit.mjs（typert 产物生成器）、vendor-host-typert.config.ts（逐包 tsdown 配置）、render-overlay.mjs（从 pack 渲染 research.overlay.yml）、boot-run.sh（run 通道开跑：幂等装+boot web+仪表盘）、run-kickoff.mjs（run 会话驱动）、env.sh（双 home + dsh 机制基线 + pre-commit 钩子激活）、research.overlay.yml（源码域 overlay，**生成物**）、hooks/（pre-commit：verify+tests 红灯拦 commit）、harness-home/ 与 smoke-workspace/（gitignore 运行区）
```

接下来开发什么 = §入口链 第 3 步的 ▶ 条目；开工/收尾程序 = 第 5 步。

## `notes/`：开发记忆（常设指令）

**开工先查 notes，再改代码**：按条目名/机制名检索（只读命中的，不通读全树）；**只有承载持久决定
理由的变更**（代码/测试/现有文档说不清的"为什么选它、放弃了什么"）才需**同一变更**新增或更新
Note——机械与局部编辑（含本地 UI 呈现与交互改动）豁免。细则是子树指令，不在这里复述：

- **时态总图 = [notes/README.md](notes/README.md)**（将来 `proposed/` = 队列+搁置条目的 RFC 全文、搁置带复活条件 · 过去
  `implemented/` `rejected/` `postmortem/` `research/`；下一步仍只看 roadmap ▶）；
- **写入触发 / 取代检查 / 格式与毕业 = [notes/AGENTS.md](notes/AGENTS.md)**；
- **任务流程**（毕业条目 / 加角色 / 写门禁 / 跑 run）= `.agents/skills/` 开发技能，按
  description 触发加载，不占常驻上下文。

原生定义（vendor 树内，本仓不复制）：`vendor/dsh/.agents/notes/README.md`（生命周期/分类/
格式骨架）、`vendor/dsh/.agents/notes/AGENTS.md`（取代检查常设指令）、
`vendor/dsh/.agents/notes/implemented/AGENTS.md`（维护规则）。本仓落地与差异见
[notes/README.md](notes/README.md)。

## 命令表

```sh
bash dev/vendor-build.sh              # vendor 树构建（换 pin 后必做：--clean 清陈旧产物；tsc host/client + typert 产物 + client bundle——0.1.7 起启动依赖构建产物）
node scripts/verify.mjs               # L0 结构门禁（keyless，收尾必跑）
node --test tests/*.test.mjs          # L0 keyless 回归（也可 pnpm test）
source dev/env.sh                     # ⚠ 双 home + 裸 dsh 拦截（DSH_HOME=dev/harness-home）；下列 L1/L2 必须先 source，否则脚本自拒 exit 2
node scripts/preset-smoke.mjs         # L1 预检（keyless）；DSH_SMOKE_REAL=1 真挂载档（keyless：roster+逐角色建会话+skills 隔离；--profile <p> --no-patch 切安装域通道）
node scripts/release-smoke.mjs        # L2 真实安装形状（keyless：pack→干净 profile→plugin add→安装域冒烟；起真 DSH 环境，无模型调用）
node scripts/l4-lite-smoke.mjs        # L4-lite 真模型冒烟（真模型档，需凭据：四角色响应 + scout web_search 调用）
node scripts/team-preflight-smoke.mjs # team 机制预检（真模型档，需凭据：spawn_teammate 组队 + 成员组合画像 + company D18 one-shot worker 探针）
bash dev/boot-run.sh                  # run 通道开跑（幂等：组合校验/漂移检测/补装 → boot web 3081 → 仪表盘）；用法 = guides/61
node scripts/run-dashboard.mjs --latest --out <html>   # run 只读投影（多场扫描 + 步骤条 + HITL 等待横幅；--watch 持续再生成）
node dev/run-kickoff.mjs --port 3081 --token <横幅 token> --prompt-file <file>        # run 会话驱动（建会话+发 kickoff）
pnpm dsh <args…>                      # 机制基线 CLI（vendor/dsh 钉 tag 源码；等价 dev/env.sh 的 dsh 函数）
node scripts/entry-chain-probe.mjs    # 入口链探针（真模型档：时不变四问，答案对 ▶ 真值软断言，留档人工复核）
```

档位词汇（keyless / 真模型档）与密钥定义 = §密钥。脚本头注各带设计依据与 RFC 出处。

## 密钥

档位词汇（全仓统一；替代曾用而未定义的"认证档"）：**keyless** = 无凭据可跑——preset-smoke
真挂载档与 release-smoke 会起真 DSH 环境，但无模型调用、不需要 key；**真模型档** = 需要
`DEEPSEEK_API_KEY` 与真模型调用（当前 = l4-lite-smoke、team-preflight-smoke 与
entry-chain-probe；队列里的 L4 全量同档）。

L4-lite 真模型冒烟（`scripts/l4-lite-smoke.mjs`）需要 `DEEPSEEK_API_KEY`：开发 home
（`dev/harness-home/.credentials.yaml`）配一次即可；永不提交密钥。L1/L2 的冒烟
（preset-smoke 真挂载档、release-smoke）**keyless**——组合与冷读，无模型调用。
web 搜索无需独立 key——base 的 `web-search-deepseek` 行 `apiKeyEnv: DEEPSEEK_API_KEY`，
与 chat 同一把钥匙（实证：vendor base bundle cordis.patch.yml）。

## DSH 源码：机制权威在哪

| 实体 | 位置 | 角色 |
|---|---|---|
| ① 开发基线（唯一权威） | `vendor/dsh/`（本仓 pinned submodule，tag `dsh-v0.1.7-rc.2` @ `477b4f4205`，只读铁律——verify vendor-pin/vendor-clean 把守；D10 已销账） | 机制核对与验证会话一律走它（dev/env.sh 的 dsh 函数与 `pnpm dsh` 从此处源码起） |
| ② 日用全局安装 | npm 全局（`which dsh`） | 与本 repo 开发无关；版本随全局漂移，行为不作机制依据 |
| ③ 参考仓 | `/Users/bowhead/ai_dsh_company/`（插件工程范式）、`/Users/bowhead/ai_tool_deepresearch/`（方法论源头） | 只读参考；吸收落点登记在 00-index §外部研究材料 |

DSH 全局不变量（fail-loud / model-visible ⟺ logged / registrations are effects / plugins
not loop changes）= vendor 树根 AGENTS.md Conventions 节。

## 纪律（全量正本 = [discipline-map.md](docs/discipline-map.md)——vendor 逐源三态枚举）

> 首版枚举子集表已由「dsh-discipline 全量枚举」条目（2026-09-24 毕业）替换：全表见
> [discipline-map](docs/discipline-map.md)（每行 = DSH 做法 → 本仓落点 → 照搬/带证据适配/
> 不适用+理由；随 vendor 换 tag 重校）。速查关键词：fail-loud · model-visible ⟺ logged ·
> 完成定义 = 真检查 · no-key 证管道 / with-key 证 agent · verify the world · 真入口路径 ·
> 新门禁带反证 · docs = 当前合同 · 同 diff 带 Note · 窄证据切片 · 卫生铁律 · 工具态重定向。

## 偏离登记簿

| D 号 | 偏离 | 约束证据 | 归宿 |
|---|---|---|---|
| （伴随） | node:test 而非 vitest；verify 用 regex 断言而非 YAML 解析 | ~~首版零 npm 依赖原则~~（vendor 落地后已引入 tsx/构建链）——**已重估维持**：测试栈零迁移收益（23 tests 绿即证据），断言对象是自控文件 | 重估记录 = [vendor-submodule 毕业 Note](notes/implemented/2026-09-24-vendor-submodule.md)（2026-09-24）；D10 已随同条目销账 |

## 编辑这些指令

`CLAUDE.md` symlink `AGENTS.md`（编辑真文件）。根 AGENTS.md 只放**每轮都要在场的常驻指令**
（每条 1–3 行 + 链到 home）；子树专属指令放该子树的 `AGENTS.md`（`docs/` · `scripts/` ·
`notes/` · `packages/deep-research-pack/` · `tests/`）。入口链成员与行数上限分别由 `entry-chain` 与
`doc-budgets` 门禁把守；上限在 [scripts/doc-budgets.json](scripts/doc-budgets.json)，
超限处置序 = 下放 > 压缩 > 升顶（升顶须同变更登记理由——上限过低是预算 bug）。

## 术语速查

概念 → 官方载体 → 源码路径：[00-index §术语映射](docs/00-index.md)。探索路由（vendor 树）：
`docs/architecture.md` → `docs/capability-seams.md` → 具体 package README。
