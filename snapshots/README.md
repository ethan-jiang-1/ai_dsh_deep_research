# snapshots/ · 场景证据层

本层保存**经过选择、有真实消费者的场景证据**：一次录制（或采集）的完整上下文——会话流、场景声明、期望文件——放在一起，供开发验证与取证复核使用。它不是插件运行组件，不是任务清单，也不是开工前置；研究 run 的交付物住 `research-workspace/`，纯函数夹具住 [`tests/fixtures/`](../tests/fixtures/README.md)，普通运行产物住 `runtime/`。

## 场景声明

场景身份住场景目录的 `snapshot.json`，由 [replay 场景消费者](../scripts/lib/replay-scene.mjs) 读取并校验，[snapshot-replay.entry](../scripts/smoke/snapshot-replay.entry.mjs) 是它的执行入口：

| 字段 | 含义 |
|---|---|
| `version` / `sessionFormat` | 声明格式版本与回放的 session 事件版本；`sessionFormat` 钉住现有录制代，故意换代须新 `session.vN.jsonl` + 人审 |
| `mcp`（可选 bool） | 录制窗口的 profile 是否含 MCP 行。`false` = MCP_PLAYWRIGHT=0 形态（fixture 不得含 `list_mcp_resources`）；缺省/`true` = 按 BUG-019 要求 MCP 组在场 |
| `scenario` / `profile` / `workspace` | 场景名、启动档、回放工作区（仓内相对路径） |
| `cases[]` | 逐个角色的 `id`/`preset`/`fixture`，可带 `renderExpected` 渲染金标准（只在录制流确实产生渲染面时声明——空渲染的转录声明它只会得到假红） |
| `cases[].source` | 录制身份：`codeAnchor`（录制时本仓 HEAD——**被装配进请求的**模型可见输入（比对面五面 + 时钟序列）与该 commit 一致；录制后若改了**未被加载进请求**的文本，B 层基线仍有效，但须在该场 Note 记录，不能默默改锚点）、`vendor`（录制时的 vendor pin）、`recordedAt`、`recording`（`live` = 真模型录制）。前两者须为 40 位 commit 或如实标记 `unknown-historical`（历史缺失不许猜填） |

角色集的事实源 = 盘上 [presets/](../packages/deep-research-pack/presets/)，但**按场景所属角色面取子集**：`research-face` 对账研究角色（D2 四角色；方法编辑不属 run 生命周期，D37）。声明列的 case 集必须与该角色面精确一致：漏登记、串角色、缺件、路径越界或 symlink 都在加载期 fail-loud，不会静默缩小场景。判据集由 consumer 固定为**已登记的比对面**（persona、全部 `request/header`、工作区指令、skill 目录、运行时上下文、时钟注入序列；**工作区指令**只在用户项目有 `AGENTS.md` 时出现——D40 后产品手册走 runtime context，两侧都缺席的场景跳过该面而非判红），声明不能削减它来凑绿；`system/message` 与 `user/message` 两侧的注入种类只要出现未登记者，回放即报红——新面必须先进比对面再重录基线，不存在静默吸收。

**时钟面（`time-context`）比的是结构，不是正文。** 该注入的载荷是墙钟（ISO 时间 + 耗时 + 浏览器时区），
回放时物理上不可能逐字复现；判据因此定义为"在哪个 turn/step 注入"（`time-context:turn=N;step=M`），
正文差异不参与比较。这是把该面定义成**可复现的那一半**，不是给确定性面加归一化凑绿——persona、headers、
工作区指令、skill 目录、运行时上下文仍按逐字全等判。唯一的位置身份归一 = runtime-context 里的
**profile 安装根**（dev home vs CI temp home 指向同一份 pack 内容；包内 content 后缀仍逐字比较）。

## 证据边界

固定模型流的回放证明的是：这份转录下的真实装配、循环、日志与已声明效果。它**不**向模型发请求，因此**不**证明真实模型会遵守新写的 persona 或 skill，也推不出未录制行为。真实模型行为由独立真模型档证据承担（[密钥与档位](../AGENTS.md)）。

`ui.expected.md` 一类的期望文件只有在**独立编写**且被判据实际消费时才是 oracle；从回放渲染直接重写只是刷新金标准，必须人审，并且只许重写、不许放宽比对或加归一化凑绿。

## CI 车道

A/B 层（A 回放通路 + B 组装请求 diff）进 CI job `snapshot-replay`：fresh temp home → `boot-run --prepare-profile`
装当前 pack + 团队层 → `snapshot-replay.entry --read-only --layers a,b`。C 渲染层不在 CI（需 Chromium，
且对侧栏同名会话敏感），仍是本地/里程碑档。

## 维护

- 模型可见输入（persona、工具 schema、工作区手册、skill 目录）有意变更后，重录该场景（真模型档）并更新 `source` 身份；比对会先红，这是预期信号；
- 工具 schema 按**全等**比对（`request/header` 逐字），不保留"工具退役后旧场景照跑"的容忍——退役工具必须随重录基线更新，旧容忍已由此严格比对取代；
- 录制器不代写场景声明：新角色或重录后由人登记 case 与录制身份，漏登记即 fail-loud；
- 新分类只在出现持久消费者时建立（探针证据、浏览器视觉证据同此律），不为未来的可能性预建空目录。

## 已知限制与延后工作

- 目前只有 `replay/research-face` 一个场景族；探针与视觉证据的分类尚未建立。
- **角色面选择目前固定为研究角色**：`snapshot-replay.entry` 对所有发现的场景集都用
  `researchRoles()` 对账；新增非研究场景族（方法库 / 视觉面等）前，须先给场景声明角色面或让
  consumer 按场景选角色，否则会在加载期按研究角色报错。
- 场景不进入默认 `pnpm test` 与 pre-commit 链；A/B 由 CI `snapshot-replay` job 驱动，C 与重录由 [开发环的任务型路由表](../docs/guides/60-dev-loop.md) 驱动。
- **2026-11-13 W1-2 后 C UI 未复验**：四角色按当前 pack 重录后，temp home 的侧栏同名探针会话导致 C0 选中歧义；`ui.expected.md` 的卡片/活动行由 `cardTitleOf`/`foldActivityRows` 纯函数重算，C UI 重跑待后续（不在 CI）。
- **场景资格三态未立**：场景集发现已是发现式——`snapshots/replay/` 下含 `snapshot.json` 的全部目录都进冒烟（判据核 = [lib/replay-scene.discoverReplayFaces](../scripts/lib/replay-scene.mjs)；`snapshot-replay.entry --face <name>` 定向单集），新场景集落地即被发现；但 runnable（进冒烟）与证据（只留档不跑）尚无区分。**触发条件**：首个声明"不跑冒烟"的场景集或首个降为永久证据的场景集出现时，立资格三态 + 带判定日期的资格理由 + 声明↔盘面秒级结构门禁（company replay-scene-liveness 形态）——判定日期与 recordedAt 是两件事（录制时刻 ≠ 判据最近全绿时刻），场景数增长后缺它即过期不可见。
- **体积预算未立**：当前总量有界（单场景族、无按次累积来源）。**触发条件**：任何"每轮一份"的累积型证据类别（探针按次留档、轮末拷贝）入库时，立总量 + 唯一无界源分类子预算（company 64/16 MiB 形态）。
