# snapshots/ · 场景证据层

本层保存**经过选择、有真实消费者的场景证据**：一次录制（或采集）的完整上下文——会话流、场景声明、期望文件——放在一起，供开发验证与取证复核使用。它不是插件运行组件，不是任务清单，也不是开工前置；研究 run 的交付物住 `research-workspace/`，纯函数夹具住 [`tests/fixtures/`](../tests/fixtures/README.md)，普通运行产物住 `runtime/`。

## 场景声明

场景身份住场景目录的 `snapshot.json`，由 [replay 场景消费者](../scripts/lib/replay-scene.mjs) 读取并校验，[snapshot-replay-smoke](../scripts/smoke/snapshot-replay-smoke.mjs) 是它的执行入口：

| 字段 | 含义 |
|---|---|
| `version` / `sessionFormat` | 声明格式版本与回放的 session 事件版本；`sessionFormat` 钉住现有录制代，故意换代须新 `session.vN.jsonl` + 人审 |
| `scenario` / `profile` / `workspace` | 场景名、启动档、回放工作区（仓内相对路径） |
| `cases[]` | 逐个角色的 `id`/`preset`/`fixture`，可带 `renderExpected` 渲染金标准（只在录制流确实产生渲染面时声明——空渲染的转录声明它只会得到假红） |
| `cases[].source` | 录制身份：`codeAnchor`（录制时本仓 HEAD——模型可见输入与该 commit 一致）、`vendor`（录制时的 vendor pin）、`recordedAt`、`recording`（`live` = 真模型录制）。前两者须为 40 位 commit 或如实标记 `unknown-historical`（历史缺失不许猜填） |

角色集的事实源 = 盘上 [presets/](../packages/deep-research-pack/presets/)。声明列的 case 集必须与它精确一致：漏登记、串角色、缺件、路径越界或 symlink 都在加载期 fail-loud，不会静默缩小场景。判据集由 consumer 固定为**已登记的比对面**（persona、全部 `request/header`、工作区指令、skill 目录、运行时上下文），声明不能削减它来凑绿；`system/message` 与 `user/message` 两侧的注入种类只要出现未登记者，回放即报红——新面必须先进比对面再重录基线，不存在静默吸收。

## 证据边界

固定模型流的回放证明的是：这份转录下的真实装配、循环、日志与已声明效果。它**不**向模型发请求，因此**不**证明真实模型会遵守新写的 persona 或 skill，也推不出未录制行为。真实模型行为由独立真模型档证据承担（[密钥与档位](../AGENTS.md)）。

`ui.expected.md` 一类的期望文件只有在**独立编写**且被判据实际消费时才是 oracle；从回放渲染直接重写只是刷新金标准，必须人审，并且只许重写、不许放宽比对或加归一化凑绿。

## 维护

- 模型可见输入（persona、工具 schema、工作区手册、skill 目录）有意变更后，重录该场景（真模型档）并更新 `source` 身份；比对会先红，这是预期信号；
- 工具 schema 按**全等**比对（`request/header` 逐字），不保留"工具退役后旧场景照跑"的容忍——退役工具必须随重录基线更新，旧容忍已由此严格比对取代；
- 录制器不代写场景声明：新角色或重录后由人登记 case 与录制身份，漏登记即 fail-loud；
- 新分类只在出现持久消费者时建立（探针证据、浏览器视觉证据同此律），不为未来的可能性预建空目录。

## 已知限制与延后工作

- 目前只有 `replay/research-face` 一个场景族；探针与视觉证据的分类尚未建立。
- 场景不进入默认 `pnpm test` 与 pre-commit 链，靠 [开发环的任务型路由表](../docs/guides/60-dev-loop.md) 与重录程序驱动。
- **场景发现硬编码**：`snapshot-replay-smoke` 只认 `research-face` 一个场景目录——往 `snapshots/replay/` 放新场景全仓不可见（company runnable 3→1 实测推翻的负例④同款失败模式）。**触发条件**：第二个场景族落地或首个场景降为永久证据时，把场景发现改为 glob `snapshots/replay/*/snapshot.json`，并引入资格三态（runnable/证据）+ 带判定日期的资格理由 + 声明↔盘面秒级结构门禁（company replay-scene-liveness 形态）——判定日期与 recordedAt 是两件事（录制时刻 ≠ 判据最近全绿时刻），场景数增长后缺它即过期不可见。
- **体积预算未立**：当前总量有界（单场景族、无按次累积来源）。**触发条件**：任何"每轮一份"的累积型证据类别（探针按次留档、轮末拷贝）入库时，立总量 + 唯一无界源分类子预算（company 64/16 MiB 形态）。
