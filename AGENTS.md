# AGENTS.md — 本仓库的入口链

DSH Deep Research 插件：一个包（`packages/deep-research-pack`）提供四个研究角色 preset
（`Deep Research Lead / Scout / Analyst / Critic`）；协作主通道 = DSH 现成 Agent Teams。
方法论内核移植自 codex Deep Research harness（映射表 docs/design/30-methodology-mapping.md）。

## 布局

```
CLAUDE.md -> AGENTS.md    symlink（编辑真文件 AGENTS.md，verify 门禁校验）
packages/deep-research-pack/   唯一自写包（纯配置）：presets/<role>/（persona+skills）、cordis.patch.yml（bundle 行）
research-workspace/      运行场（角色会话 cwd）：AGENTS.md 研究手册、runs/<slug>/、templates/run/
docs/                    00-index（地图+决策台账+术语映射）→ design/10-30 → plans/roadmap（纯队列）→ guides/60 + evaluation.md（验收合同）
notes/                   决策记录：intents.md → proposed/（RFC，一文件一条目）→ implemented/；research/（考古报告）；postmortem/
scripts/                 verify.mjs（L0）、preset-smoke.mjs（L1 真挂载，keyless 双通道）、release-smoke.mjs（L2 安装面）、l4-lite-smoke.mjs（L4-lite 真模型）
tests/                   keyless 回归（node:test，零依赖；layering 守卫禁真模型/网络/子进程）
dev/                     env.sh（双 home + dsh 机制基线）、research.overlay.yml、harness-home/（gitignore 运行残留）
```

接下来开发什么 = [roadmap §队列](docs/plans/roadmap.md) 的 ▶ 条目（全仓唯一"当前"指针）；
开工/收尾程序 = [guides/60](docs/guides/60-dev-loop.md) §0/§4。

## 命令表

```sh
node scripts/verify.mjs               # L0 结构门禁（keyless，收尾必跑）
node --test tests/*.test.mjs        # L0 keyless 回归（也可 pnpm test）
source dev/env.sh                     # 双 home + 裸 dsh 拦截（DSH_HOME=dev/harness-home）
node scripts/preset-smoke.mjs         # L1 预检（keyless）；DSH_SMOKE_REAL=1 真挂载档（keyless：roster+逐角色建会话+skills 隔离；--profile <p> --no-patch 切安装域通道）
node scripts/release-smoke.mjs        # L2 真实安装形状（认证档：pack→干净 profile→plugin add→安装域冒烟）
node scripts/l4-lite-smoke.mjs        # L4-lite 真模型冒烟（认证档，需凭据：四角色响应 + scout web_search 调用）
```

## 密钥

L4-lite 真模型冒烟（`scripts/l4-lite-smoke.mjs`）需要 `DEEPSEEK_API_KEY`：开发 home
（`dev/harness-home/.credentials.yaml`）配一次即可；永不提交密钥。L1/L2 的冒烟
（preset-smoke 真挂载档、release-smoke）**keyless**——组合与冷读，无模型调用。
web 搜索无需独立 key——base 的 `web-search-deepseek` 行 `apiKeyEnv: DEEPSEEK_API_KEY`，
与 chat 同一把钥匙（实证：vendor base bundle cordis.patch.yml）。

## DSH 源码：机制权威在哪

| 实体 | 位置 | 角色 |
|---|---|---|
| ① 开发基线（唯一权威） | `/Users/bowhead/ai_dsh_company/vendor/dsh/`（钉住 tag `dsh-v0.1.5-rc.2`，**只读借用**——D10 偏离：本仓 submodule 延后至队列「vendor-submodule-and-pnpm-dsh」） | 机制核对与验证会话一律走它（dev/env.sh 的 dsh 指向此处源码） |
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
| D10 | 无 vendor submodule（company 范式是钉 SHA submodule + workspace 五件套） | 首版纯配置包零构建，无源码级机制需求；同 tag checkout 已存在（company 仓，只读借用） | 队列「vendor-submodule-and-pnpm-dsh」；verify 的 vendor-pin 门禁随其启用 |
| （伴随） | node:test 而非 vitest；verify 用 regex 断言而非 YAML 解析 | 首版零 npm 依赖原则；断言对象是自控文件 | 随队列「vendor-submodule-and-pnpm-dsh」重估 |

## 术语速查

概念 → 官方载体 → 源码路径：[00-index §术语映射](docs/00-index.md)。探索路由（vendor 树）：
`docs/architecture.md` → `docs/capability-seams.md` → 具体 package README。
