---
status: 已修
severity: P1
opened: 2026-10-08
---

# BUG-018：snapshot-replay B 层广告覆盖 skill 与工具行，实际对三处 `user/message` 注入全不覆盖

> 严重级别：P1（重要）｜发现：2026-10-08｜状态：已修 2026-10-09：B 层改为逐条判据
> （persona / 全部 `request/header` / 三处 `user/message` 注入），并新增"基线外注入种类即红"的
> 覆盖面自守；四角色真模型重录后回放全绿。判决与实施 = [snapshots 采纳 Note](../../../notes/implemented/2026-10-09-snapshots-adoption.md)。

## 症状

`scripts/smoke/snapshot-replay-smoke.mjs` 头注（第 13-15 行）声明 B 层的职责：

> B 组装请求 diff：回放会话持久化日志的 `system/message`（persona 全文）与
> `request/header`（config + 工具 schema）对录制 fixture 逐字比对——**persona/skill/
> 工具行等模型可见文本变化在此红**

**两处与实际不符**：

1. **"skill"** ——skill **正文**不进 `system/message`，改它 B 层**不会红**
   （实测：6 个 runtime SKILL.md 的正文长行在 `system/message` 中命中 **0** 条）。
   真正进上下文的是 skill **description**（经 `skill-catalog` 注入），B 层也不比；
2. **未提三处 `user/message` 注入** ——其中最重的是**工作区手册全文**
   （`research-workspace/AGENTS.md`），B 层**结构上不可能**看到它。

**实测复现（本轮已跑）**：向 `research-workspace/AGENTS.md` 追加一行探针文本
`<!-- … PROBE-INJECT-9271 -->`，`source dev/env.sh` 后跑

```sh
node scripts/smoke/snapshot-replay-smoke.mjs --scenario lead
```

→ **ALL PASS**，其中 `B1 组装请求 · persona 全文一致（system/message）（9888 字）` **仍绿**。
即：**改了模型可见的注入面，B 层毫无反应。**（实验后已还原，`git status -- research-workspace/` = 0。）

**已在真实变更上发生 2 例漏更新**（均完整通过 CI）：

| commit | 改了什么 | 夹具更新 |
|---|---|---|
| `b6c6e8f` | 手册 NODES.md 行加 `+ 门A`（node-gate 门全集列举） | **0** |
| `762eb6c` | 手册里 `scripts/run-dashboard.mjs` → `scripts/run-ops/…`、`scripts/evidence-audit.mjs` → `scripts/run-gates/…` | **0** |

`b6c6e8f` 改的正是**模型据以判断"门在哪"的提法**，属非平凡模型可见变化。

## 根因（假设）

**契约层**：B 层的比对对象由 `systemTextOf` 单点定义，而该函数只收一种事件类型——

```js
// scripts/smoke/snapshot-replay-smoke.mjs:80
const systemTextOf = (events) => events.filter((j) => j.type === 'system/message')
```

而三处注入都是 `user/message`（夹具事件 [10] `agent-instructions` 5771 字 /
[12] `skill-catalog` 935 字 / [11] `runtime-context` 495 字）。
B2 只比 `request/header` 的 tools；C 层只比渲染面 → **A/B/C 三层全不覆盖**。
头注的"模型可见文本变化在此红"是**声明的覆盖强于实际的覆盖**。

**次因**：`userTexts` 的 filter（:108-110）`.filter((t) => !t.startsWith('<system-reminder>'))`
使注入面在 A 层折算路径上也消失。**注意**：该 filter 本意是取真实用户 prompt
（`userTexts[0]` → `session/prompt`），**不是 B 层机制**——不要误读为"B 层主动排除"。
真正原因始终是 `systemTextOf` 的类型 filter。

## 复现

见 §症状 的探针实验（三条命令）。**对照**：改 `lead.patch.yml` 的 persona 段会真红
（`336d8f9` 的 commit body 实录"B1 先红（persona 有意变更被捕获）→ 重录"），
即探针实验的阴性结果不是"smoke 坏了"，而是**该面确实不在比对范围内**。

## 牵出的失败类

**"声明的覆盖 > 实际的覆盖"**——本仓已多次实证的同型失败的**第四个实例**：

1. `docs/discipline-map.md` 的 `na` 行可静默腐烂（10 条理由被证伪而无人知）；
2. `docs/design/30-methodology-mapping.md` 内容行可被替换为 `| x | y |` 而 verify 仍全绿；
3. `notes/archived/README.md` 进门条件 2 无任何机械面（`archived` 在 verify.mjs 中
   **仅 2 处注释**，行 900/981）；
4. **本条**——smoke 头注宣称的覆盖面比 `systemTextOf` 实际比对的面更宽。

**横切排查建议**：凡有"头注/文档声明某层钉什么"的地方，应有一处能证明
"声明面 ⊆ 实际比对面"。此失败类值得单独盘点（是否立门禁另议——
本仓已知"纯文档义务会静默失效"，故倾向**让声明与机制同源**而非再加一层义务）。

## 修复关联

**未修**（本条只登记，不在记录义务标定的范围内改 smoke——标定 RFC 判据 5/6 明写
"不新增或修改任何门禁"，`git diff --stat scripts/verify/` 为空即证）。

候选修法（须先标定，勿直接实施）：

1. **窄**：B 层增比 `user/message` 的 `agent-instructions` 注入文本，或钉其
   `source.changes[].digest`（fixture 已带该字段）；
2. **宽**：形状 B —— 把 keyless smoke 接进 pre-commit/CI（它是 keyless 的），
   **但前置必须先修本条**，否则接进去后这 2 例漏判照样绿；
3. **同时修头注**：把"skill"删掉或改为"skill description"，并明写注入面的覆盖状况
   ——无论选哪种修法，**声明面必须与实际比对面一致**。

标定材料（逐次判定 / 真阳假阳 / 9 类候选面表 / 两轮对抗自审记录）=
[模型可见面标定](../research/recorded-session-obligation/2026-10-08-model-visible-calibration.md)；
判决与依据 = [recorded-session-obligation 条目](../../../notes/implemented/2026-10-08-recorded-session-obligation.md)。
