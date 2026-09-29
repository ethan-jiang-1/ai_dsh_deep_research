# RFC：节点 I/O 契约显式化（NODES.md + node-gate ②③ 小切口）

> 状态：proposed

## 问题

- 八节点 I/O 交接约定已定稿（[推敲卡](../../_backlog/_done/_closed_plans/260928-node-io-schema.md)，2026-09-29 用户逐节点过目：文件即接口 / 在场即完成 / 模板即实例），但**无模型可见落点、无机检把守**——约定只对人有约束力，对角色不可见。
- 交接判据裸奔的当日实证（两场 run，2026-09-29）：① HITL2 拍板行缺席两场（`question.md` §Decisions 无行，final 照样落盘——G8「双缺席」第二实例：cn-us-open-source 的 lead present 从未声明 + HITL2 从未被问，会话日志全库取证）；② review readiness PASS 之后，没有任何门拦住「不 present 就算完事」。
- evidence-audit 只覆盖 evidence→final 段；八节点交接中其余全靠「文件在场」纯散文约定——推敲卡第 7/8 行判据当天全靠人工核到才咬人。
- 用户裁决（2026-09-29）：此题分量够，**点名提前**——两阶段纪律下属第二阶段风味，裁量权在用户，队列行注明。

## 方案

**落点 A2（用户三选一选定）**：新建 `research-workspace/NODES.md` 住八节点 I/O 契约全表（输入清单 / 输出必备件 / 下游可开工判据，即定稿表 + 回边版本语义 + 两点交互边界）；手册（research-workspace/AGENTS.md）只加**一行指针**（118/120 → 119/120，doc-budgets 仍绿）。NODES.md 可随拓扑生长，不挤手册预算。

**node-gate v1（小切口，用户选定 ②+③）**——`scripts/node-gate.mjs`，keyless（纯 fs + zstd CLI，同 evidence-audit 通道）：

- **门③（§Decisions 拍板行门，= rerun-loop-live 候选后续③）**：`final/` 版本记账在场（目录非空）→ `question.md` §Decisions 必须含 ≥1 条匹配 `HITL2` 的拍板行。v2+ 的逐版本匹配（拍板行日期 ≥ vN 落盘日）留 v2 按证据收紧，v1 不发明口径。
- **门②（present 声明门，= 候选后续② 的审计层形态）**：`final.md` 当前版在场 + `review.md` readiness PASS → 会话日志（zstd 多帧全解，复用 evidence-audit 的切段逐帧机制）必须含指向本 bundle 的 `present` 工具调用。
- 八节点表 = 门的**语义正本**（NODES.md 表即配置说明）；v1 只实现 ②③ 两门，其余节点行留 L0 扩展位按证据逐个升格。

**写门纪律（writing-a-gate）**：反证先行——先造红证据（tests/fixtures 反证 bundle：缺 §Decisions 行 / 缺 present 日志各一），门必须红；现有合规归档 bundle（model-ecosystem）必须绿；`auditBundle()` 同款可导入纯函数形态（tests/ 层禁子进程）。

## 输掉的方案

- **A1 手册压缩加节**：注入保证最强，但手册 118/120 顶死，拓扑演进是常态时每次都要挤预算——不可持续（用户选 A2）。
- **C 隐式契约（2026-09-29 当日初裁）**：同日被用户以「太重要」翻案——散文判据不拦角色，G8 第二实例即反证。
- **全量六门一次到位**（readiness 解析 / leads 覆盖 / supports T# / gap 四态）：反证样例要造六个，成本先于收益；②③ 有当日实证直接背书，先关死 G8 形态。
- **数值质量门**：假牙齿（floor 教训，搁置池已有归宿）——本 RFC 只门机械可查事实，不发明打分。

## 验收

1. node-gate keyless 入 verify 家族：合规归档 bundle 绿 + 反证 fixtures 红（先红后绿），单测进 tests/（纯函数直调）。
2. `NODES.md` 落 research-workspace/（八节点契约全表 + 回边版本语义 + 两点交互边界）+ 手册指针 +1 行（doc-budgets 仍绿）。
3. 手册改动 = 模型可见面 → **L4-lite 真模型档**收尾 + 通道重启生效（guides/60 任务型路由）。
4. `pnpm verify` 全绿；实施毕同 diff 收尾——RFC 毕业迁 implemented/ + 队列行删。
5. 范围外（记后续）：观察面红灯位 / watch-run ask-absent 旗（候选②本体）——门落地后按证据另立。
