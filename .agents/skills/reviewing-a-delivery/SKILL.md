---
name: reviewing-a-delivery
description: Use when preparing delivery, when a cross-surface diff (pack, docs, scripts, notes 中的多面) needs adversarial review, or when the user asks for a review — the semantic self-review layer between mechanical gates and user acceptance, re-reading the live diff against intent, current docs, and evidence selection.
---

# 交付前对抗自审（语义自审层）

本技能是 **guidance，不是 checklist**：按实际 diff 与风险选择检查深度；相关技能：
[`.agents/skills/writing-a-gate`](../writing-a-gate/SKILL.md)。

## 这一层补的是什么

交付判断四角色（判据正本 = [evaluation §完成判断四分离](../../../docs/evaluation.md)）各
证明不同的东西：**机械检查**（门禁/契约测试——只证明它执行的断言通过）、**语义自审**
（本技能——意图-实现-文档-证据是否说的是同一件事）、**用户批准**（Plan 呈批/验收——
产品取舍归它）、**显式交互**（HITL 等）。本技能承担其中 agent 可自主完成的角色——收尾
绕过它，质量把关就全部压给用户。

## 触发

- 条目收尾前（[guides/60 §0](../../../docs/guides/60-dev-loop.md) 反馈门③，位于 §4 收尾之前；毕业复查时）；
- 用户点名 review / 对质量有疑问时；
- 改动跨面（同时触及 pack、docs、scripts、notes 中多面）时必做。

## 从什么开始

重读**当前**工作树与 diff（`git status` + `git diff`），条目 RFC 的验收判据，受影响面的 owner
文档。不沿用旧 head 或上一轮会话的结论——review 的对象是现在这个 diff。

## 阻塞判据（任何一条答不上 = 未完成，不许收尾）

1. **意图对齐**：实现回答的是 RFC §问题吗？每条验收判据都能指出对应的实际证据（命令 +
   结果），还是只靠"应该没问题"？
2. **docs 同 diff**：改过的语义面，对应合同文档已同步（一个事实一个家）；没有第二份手写
   副本漂移；生成物（overlay / 工作区种子）是重生成而非手改。
3. **断言有效性**：新断言/新门禁在目标回归上真会失败吗（反证跑过吗）？**证据选型**对吗
   ——测试场景是否抓住本次改动的面，还是只是跑过而已（任务型路由表是正本）？
4. **完成判断四分离**：挂载（L1）、行为证据、安装形态（L2）、交付批准四件事分别观察了吗？
   未跑项与通过项分列了吗（"未跑" ≠ "通过"）？值级改动显式写"值级不可证"了吗？
5. **记录判据**：Note 触发判对了吗（只有持久决定理由才写）？毕业时正文改写了吗（计划体
   删干净了吗）？门禁两处同步了吗（gates 数组 + evaluation 台账）？

## 高风险语义扫描（按 diff 涉及面选查）

判据正本 = DSH SDLC 参考卷 `06 §4`（11 条高风险语义检查）。**逐条给出本仓判据句 + 实例
——条款名不给判据，读者无法判"何时适用"**。按 diff 实际涉及面选查，不必条条都查
（本技能是 guidance 不是 checklist）；但**涉及该面却跳过**要在报告里写明没查。

**接口与并发（1–2）**

1. **error / cancellation / ownership / disposal**：接口的失败与取消路径，以及"谁负责释放"。
   本仓实例：子进程（playwright、`dsh` 挂载）、临时目录、端口、浏览器上下文——
   `scripts/AGENTS.md` §释放到静默 是它的机械侧（kill 后 await 退出码；孤儿进程 = 脚本缺陷）。
   查：新起的资源有没有对应的释放点，释放点是否在**失败路径上也走到**（早退/throw 绕过）。
2. **race / reentry / detach / quiescent disposal**：async setup、callback、teardown 的交叠。
   本仓实例：`watch-run` 盯场与 run 本体对同一 bundle 的读写交叠；`run-dashboard` 只读投影
   与落盘之间的快照时刻；smoke 脚本的 retry 与"等显式状态"（`scripts/AGENTS.md`）就是为
   消解这类交叠而立的纪律。查：并发写同一 session log / bundle 时有无丢失更新；
   detach 的异步任务在进程退出前是否被 await。

**边界与授权（3–4）**

3. **consumer-specific 泄漏 / 多余 public API**：单一内部使用者的行为泄漏进通用服务，
   或反过来为单个内部 consumer 造出多余 public 面。本仓实例：`src/lib/` 折算纯函数是
   client 与脚本共用面——只被一方使用的逻辑不该留在这里；preset patch 行不该长出仅
   一个角色用的字段。
4. **default / option / compatibility path / defensive copy 是否有当前 consumer 或明确决定**：
   没有使用者的兼容分支是负债。本仓实例：`grandfather` 注释、`reReviewOn` 声明、
   grandfathered 存量条目——**每个都须能指出"谁还需要它"或"哪条决定保留了它"**；
   参考卷口径同源（无 consumer 的 option 应删，除非有明确决定）。

**模型可见面与拒绝路径（5–6）**

5. **模型实际看到的 prompt / tool schema / result / diagnostic / transcript**：
   金标准只许重写不许放宽；run 通道缓存重启了吗。本仓实例：`presets/<role>.patch.yml` 的
   persona/skills/工具行、`src/lib/` 中进入 model 上下文的部分、`cordis.patch.yml` 声明行；
   机械侧 = `snapshot-replay-smoke`（四角色组装面录制语料）。
6. **denial 在直接与替代调用路径都到达最终 operation**：拒绝不能只堵一条路。
   本仓实例：工具权限/密钥检查若只在一条调用链上做，另一条（如 client 侧直调、
   mcp 通道）就绕过了。查：新增的拒绝/守卫是否有第二个入口未覆盖；
   机械侧近亲 = `client-keys` 的 `RESEARCH_TOOL_KEYS` 族收口。

**状态与计量（7–8）**

7. **derived state / cache / UI echo / replay 来自 authoritative success point**：
   派生值不能各自推导同一事实。本仓实例：`docs/` 的"D 号台账"与 `notes/` 的 Note
   是**不同事实**（决定史 vs 当前合同）；`dev/research.overlay.yml` 是**生成物**
   （源 = pack patch 行，手改即漂移，由 `overlay-fresh` 咬）；`client` 观察面显示的
   run 状态必须来自 `runStateOf` 单点而非各自重算。
   查：新增的缓存/回显/replay 面，其值是否取自唯一的权威成功点。
8. **byte/size limit 覆盖 wrapper 与 metadata 后的最终结果**：上限按**字节**不按字符，
   且要算上包装层与元数据。本仓实例（CJK 语境高发）：`doc-budgets` 用**行数**而非词数
   ——正因 "CJK 词数不可靠"（`scripts/doc-budgets.json` §_note）；反过来，
   凡是按字符数设限的地方，CJK 下字节数会超。
   查：新增/改动的上限断言是否覆盖了 wrapper 与 metadata 之后的结果。

**入口与证据（9–11）**

9. **shipped entry path**：Loader / bin / worker / subprocess / built artifact 走的是
   真入口路径。本仓实例：L2 安装验收 = `npm pack → 干净 profile → plugin add → 真会话`
   （`docs/evaluation.md:14`）；`gates-smoke` 用**真实 verify 入口**注入而非单测门禁函数；
   `client-load-smoke` 经真 DSH web 装载。查：新证据是否走真入口，还是走了测试专用旁路。
10. **assertion 在目标 regression 上真会失败 + negative control 经真实 runner 被拒**：
    正本 = [`.agents/skills/writing-a-gate`](../writing-a-gate/SKILL.md)（先想红再写绿）。
    本仓实例：`gates-smoke` 的零注入对照组 + 注入组双轨；新门禁必须同 diff 带反证；
    改断言迁就实现不是修法（`guides/60 §0` 硬边界②）。
11. **proposed Note 被实现时同 diff 移动并改写为 present-tense shipped reality**：
    计划体不许留在 implemented。本仓实例：交付后的 RFC 迁 `implemented/` + **正文
    改写**（删未来时态）；机械侧 = `note-graduation-rewrite` +
    `note-status` + `proposed-pointer-live`。查：本次实现的条目，其 RFC 是否同 diff 移动
    并改写（只改路径不改正文 = 未来计划伪装成当前事实）。

**本仓特有的三条（参考卷无直接对应，保留）**

- **生成物链**：pack 源 → overlay → 安装镜像 → 工作区种子，链条上每一环同步了吗
  （生成物是重生成而非手改；机械侧 = `overlay-fresh` / `pack-workspace-fresh`）；
- **旧 Note 一致性**：本次决定是否让同机制旧 Note 的现在时结论变假？被取代者是否同 diff 加了
  `> 历史注记` 与互链（规则 = [notes/README §主动清理](../../../notes/README.md)）？
  只改新篇不改旧篇 = 旧结论继续打架。
- **live 文档**：计数、时变状态、变更叙事有没有混进"只写 now"的层
  （机械侧 = `count-free` / `doc-now-only`；本轮实证：`discipline-map` 写错 fixtures
  组数、`evaluation.md` 声称未跑过的形态数——**计数是陈旧的高发处**）。

## 产出与边界

- Findings 分 **blocker / suggestion** 两档；blocker 全消或如实上报（含未跑项）才能进收尾；
- 报告只列**实际查过的**面，没查的面写明没查；
- 执行顺序：机械层先跑（`pnpm verify` / `pnpm test`），本层做语义判断，产品取舍交还用户
  呈批——语义判断不可机械化，这是本层以技能而非门禁存在的理由。
