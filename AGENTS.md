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
README.md                 人类门面（Start Here 链接 + 稳定原则摘要；命令/纪律/布局正本 = AGENTS.md，不复制）
roadmap.md                队列 + 搁置池（纯队列：条目完成即离队；▶ = 全仓唯一"当前"指针）
package.json / pnpm-workspace.yaml / pnpm-lock.yaml   根 workspace（scripts: verify/test；pnpm 只挂本仓包，vendor 入 workspace 随队列条目——见 pnpm-workspace.yaml 头注）
packages/deep-research-pack/   唯一自写包（纯配置）：presets/<role>/（preset.yml + agent.cordis.yml[persona 行/skills/工具行] + skills/<n>/SKILL.md）、cordis.patch.yml（bundle 行）；新增角色步骤见包 README
vendor/dsh/               pinned submodule（tag `dsh-v0.1.5-rc.2` @ `fb2c4b9e`，只读铁律——verify vendor-pin/vendor-clean 把守；机制权威正本，D10 已销账）
research-workspace/      运行场（角色会话 cwd）：AGENTS.md 研究手册、drt_<slug>/（run bundle）、templates/run/
docs/                    00-index（地图+决策台账+术语映射）→ design/10-30 → guides/60（开发环）+ guides/61（run 操作指南）+ evaluation.md（验收合同）
notes/                   **开发记忆与证据链**（核心流程数据，不是历史附件——见下节）：
                         intents.md → proposed/（RFC，一文件一条目）→ implemented/；
                         rejected/（否决理由，防复犯）；postmortem/（事故复盘）；research/（考古报告）
scripts/                 verify.mjs（L0）、preset-smoke.mjs（L1 真挂载，keyless 双通道）、release-smoke.mjs（L2 安装面）、l4-lite-smoke.mjs（L4-lite 真模型）、team-preflight-smoke.mjs（team 机制预检）、run-dashboard.mjs（run 只读投影，boot-run 起）、lib/roles.mjs（角色清单访问器，事实源=盘上 presets/）
tests/                   keyless 回归（node:test，零依赖；layering 守卫禁真模型/网络/子进程；fixtures/ 测试夹具）
dev/                     boot-run.sh（run 通道开跑：幂等装+boot web+仪表盘）、run-kickoff.mjs（run 会话驱动：建会话+发 kickoff prompt）、env.sh（双 home + dsh 机制基线 + pre-commit 钩子激活）、research.overlay.yml（源码域 overlay，镜像 bundle 行）、hooks/（pre-commit：verify+tests 红灯拦 commit）、harness-home/ 与 smoke-workspace/（gitignore 运行区）
```

接下来开发什么 = §入口链 第 3 步的 ▶ 条目；开工/收尾程序 = 第 5 步。

## `notes/`：DSH 开发流程的核心数据，不是历史附件

**开工先查 notes，再改代码。** 这不是礼貌建议——`notes/` 是 DSH 开发记忆的主体（vendor
`.agents/notes/` 同构）：代码承载实现、`docs/` 承载当前合同、**`notes/` 承载"为什么这样做 /
放弃了什么 / 实现后要维持哪些事实 / 跑了什么验证"**。跳过它的代价是重复已否决的方案、踩已
记录过的坑——这些事实不在代码里，也不在 docs 里。

- **读取触发（开工即做）**：按条目名或机制名检索 `notes/proposed/`、`notes/implemented/`、
  `notes/postmortem/`、`notes/rejected/`（否决防复犯）、`notes/research/`（机制考古报告），
  **只读命中的**，不通读全树。拿到决定、输掉的方案、边界与未核销清单再动手；
- **写入触发（同 diff，非事后补）**：非平凡变更必须在**同一变更**里新增或更新 Note——纯机械
  编辑与局部错字除外。收尾格式（决定/输掉的方案/实际跑过的验证/环境状态）= guides/60 §4；
- **`proposed/` = 队列条目的 RFC 全文**（一文件一条目），进门须在 roadmap 有条目（verify
  门禁 `proposal-scheduled` 机械强制）；条目收尾时毕业到 `implemented/`，队列行删除；
- **`implemented/` 是活的决策记忆，不是冻结档案**：路径/名称/默认值随实现同 diff 维护；
  想逆转某决定 → 写新 Note 并互链，**不改写旧 Note 成相反结论**；
- **取代检查（每新增一篇 Note 触发；DSH SDLC reference 01 吸纳）**：搜活动树同决定/同
  机制——已有 owner → 更新它不建重复；部分取代 → 双方互链；完整取代 → 新 Note 吸收旧
  Note 全部独有内容后才可删旧；已交付决定直接进 implemented/，不必从 proposed/ 起步；
- **`rejected/` = 否决理由**：保留的唯一条件是"它仍能阻止一个诱人的重犯"（含用户已拍板否决
  的方向）；`postmortem/` = 事故复盘（事故叙事的唯一合法层）；
- **RFC 状态行住在 RFC 自己的头部**（proposed / approved / superseded），不进 roadmap；
  落地次序进队列行——细则见 [notes/proposed/README.md](notes/proposed/README.md)。

原生定义（vendor 树内，本仓不复制）：`vendor/dsh/.agents/notes/README.md`（生命周期/分类/
格式骨架）、`vendor/dsh/.agents/notes/implemented/AGENTS.md`（维护规则）、
`vendor/dsh/.agents/notes/archived/AGENTS.md`（冻结语义）。本仓落地与差异见
[notes/README.md](notes/README.md)。

## 命令表

```sh
node scripts/verify.mjs               # L0 结构门禁（keyless，收尾必跑）
node --test tests/*.test.mjs          # L0 keyless 回归（也可 pnpm test）
source dev/env.sh                     # ⚠ 双 home + 裸 dsh 拦截（DSH_HOME=dev/harness-home）；下列 L1/L2 必须先 source，否则脚本自拒 exit 2
node scripts/preset-smoke.mjs         # L1 预检（keyless）；DSH_SMOKE_REAL=1 真挂载档（keyless：roster+逐角色建会话+skills 隔离；--profile <p> --no-patch 切安装域通道）
node scripts/release-smoke.mjs        # L2 真实安装形状（keyless：pack→干净 profile→plugin add→安装域冒烟；起真 DSH 环境，无模型调用）
node scripts/l4-lite-smoke.mjs        # L4-lite 真模型冒烟（真模型档，需凭据：四角色响应 + scout web_search 调用）
node scripts/team-preflight-smoke.mjs # team 机制预检（真模型档，需凭据：spawn_teammate 组队 + 成员组合画像 + company D18 one-shot worker 探针）
bash dev/boot-run.sh                  # run 通道开跑（幂等：组合校验/补装 → boot web 3081 → 仪表盘）；用法 = guides/61
node scripts/run-dashboard.mjs --latest --out <html>   # run 只读投影（多场扫描 + 步骤条 + HITL 等待横幅；--watch 持续再生成）
node dev/run-kickoff.mjs --port 3081 --token <横幅 token> --prompt-file <file>        # run 会话驱动（建会话+发 kickoff）
```

档位词汇（keyless / 真模型档）与密钥定义 = §密钥。脚本头注各带设计依据与 RFC 出处。

## 密钥

档位词汇（全仓统一；替代曾用而未定义的"认证档"）：**keyless** = 无凭据可跑——preset-smoke
真挂载档与 release-smoke 会起真 DSH 环境，但无模型调用、不需要 key；**真模型档** = 需要
`DEEPSEEK_API_KEY` 与真模型调用（当前 = l4-lite-smoke 与 team-preflight-smoke；队列里的
L4 全量与探针脚本化同档）。

L4-lite 真模型冒烟（`scripts/l4-lite-smoke.mjs`）需要 `DEEPSEEK_API_KEY`：开发 home
（`dev/harness-home/.credentials.yaml`）配一次即可；永不提交密钥。L1/L2 的冒烟
（preset-smoke 真挂载档、release-smoke）**keyless**——组合与冷读，无模型调用。
web 搜索无需独立 key——base 的 `web-search-deepseek` 行 `apiKeyEnv: DEEPSEEK_API_KEY`，
与 chat 同一把钥匙（实证：vendor base bundle cordis.patch.yml）。

## DSH 源码：机制权威在哪

| 实体 | 位置 | 角色 |
|---|---|---|
| ① 开发基线（唯一权威） | `vendor/dsh/`（本仓 pinned submodule，tag `dsh-v0.1.5-rc.2` @ `fb2c4b9e`，只读铁律——verify vendor-pin/vendor-clean 把守；D10 已销账） | 机制核对与验证会话一律走它（dev/env.sh 的 dsh 函数与 `pnpm dsh` 从此处源码起） |
| ② 日用全局安装 | npm 全局（`which dsh`） | 与本 repo 开发无关；版本随全局漂移，行为不作机制依据 |
| ③ 参考仓 | `/Users/bowhead/ai_dsh_company/`（插件工程范式）、`/Users/bowhead/ai_tool_deepresearch/`（方法论源头） | 只读参考；吸收落点登记在 00-index §外部研究材料 |

DSH 全局不变量（fail-loud / model-visible ⟺ logged / registrations are effects / plugins
not loop changes）= vendor 树根 AGENTS.md Conventions 节。

## 纪律（默认严格照做，偏离必须登记 D 号 + 约束证据）

> ⚠ 本表是**首版枚举子集**（来源：亲读的 vendor `docs/testing.md`、company AGENTS.md
> 纪律表、company inround-task-surface 研究）。全量逐源枚举 = 队列条目「dsh-discipline
> 全量枚举」（vendor submodule 落地后执行，替换本表）。**你无法继承你从没清点过的东西。**

| 纪律 | 权威出处 | 本仓落点 |
|---|---|---|
| 过程反馈双门：Plan Mode 呈批（计划归 exit_plan_mode）+ 实施期 todo_write（开工列全、完成即勾、steer 即重排）；不发明 tasks.md（"second durable home" 否决） | vendor base bundle plan 指引 + todo 工具描述；company inround 研究 §一 | guides/60 §0 |
| 完成定义 = 该面最小"真检查"通过；发现权在代理一侧 | vendor docs/testing.md；company D15 | evaluation.md（五面合同） |
| no-key 证管道，with-key 证 agent；真模型/真浏览器不进 keyless 回归 | vendor docs/testing.md | tests/layering.test.mjs 守卫 |
| verify the world, not the self-report（断言重读文件，不信自述） | vendor docs/testing.md | evaluation.md L4 判据 + 手册完成判据 |
| 真入口路径 = 发布产物（pack → 干净 profile → plugin add → 会话） | vendor docs/testing.md + company release.md | `scripts/release-smoke.mjs`（L2 面） |
| 每条新门禁带反证（红→还原→绿） | vendor docs/testing.md "A guard only guards…" | guides/60 §6 |
| docs = 当前合同（一处事实一个家，只写 now；status rots——队列不积累历史，入口文件只收常设指令） | vendor docs/AGENTS.md tier 表；company inround 研究 §二/§十一 | 00-index 组织原则；roadmap 纯队列 |
| 非平凡变更同 diff 带 Note（决定/输掉的方案/跑过的验证） | vendor .agents/notes/README.md | notes/ intents → implemented |
| 窄证据切片；只报告实际跑过的检查 | vendor 根 AGENTS.md | guides/60 §1 |
| 卫生铁律：打扫 = 净减少 + 信噪比提高；处置序 = 删 > 并 > 修 > 记 | company D23 同款 | guides/60 §4 |
| 工具态与越界写入：repo 内自由区；工具状态先重定向进仓库 gitignored 区再使用；越界先问人 | company §11（本仓原生沿袭） | dev/env.sh 双 home |

## 偏离登记簿

| D 号 | 偏离 | 约束证据 | 归宿 |
|---|---|---|---|
| （伴随） | node:test 而非 vitest；verify 用 regex 断言而非 YAML 解析 | ~~首版零 npm 依赖原则~~（vendor 落地后已引入 tsx/构建链）——**已重估维持**：测试栈零迁移收益（23 tests 绿即证据），断言对象是自控文件 | 重估记录 = [vendor-submodule 毕业 Note](notes/implemented/2026-09-24-vendor-submodule.md)（2026-09-24）；D10 已随同条目销账 |

## 术语速查

概念 → 官方载体 → 源码路径：[00-index §术语映射](docs/00-index.md)。探索路由（vendor 树）：
`docs/architecture.md` → `docs/capability-seams.md` → 具体 package README。
