# 节点 I/O 契约显式化（NODES.md + node-gate ②③）

> 状态：implemented

## 问题

- 八节点 I/O 交接约定已定稿（[推敲卡](../../_backlog/_done/_closed_plans/2026-09-28-node-io-schema.md)，2026-09-29 用户逐节点过目：文件即接口 / 在场即完成 / 模板即实例），但**无模型可见落点、无机检把守**——约定只对人有约束力，对角色不可见。
- 交接判据裸奔的当日实证（两场 run，2026-09-29）：HITL2 拍板行缺席两场（final 照样落盘——G8「双缺席」第二实例：cn-us-open-source 的 lead present 从未声明 + HITL2 从未被问，会话日志全库取证）；review readiness PASS 之后没有任何门拦住「不 present 就算完事」。
- evidence-audit 只覆盖 evidence→final 段；八节点交接中其余全靠「文件在场」纯散文约定——推敲卡第 7/8 行判据当天全靠人工核到才咬人。
- 用户裁决（2026-09-29）：此题分量够，**点名提前**——两阶段纪律下属第二阶段风味，裁量权在用户，队列行注明。

## 决定

- **落点 A2**：新建 `research-workspace/NODES.md` 住八节点 I/O 契约全表（输入清单 / 输出必备件 / 下游可开工判据 + 回边版本语义〔D17：扩张 +1 / polish 原位 / 另起 bundle〕+ 两点交互边界 + 输入侧规矩〔缺件上报不瞎猜；清单检查由脚本做，不加记账仪式〕）；手册目录约定加**一行指针**（119/120）。NODES.md 进 pack 种子（`dev/sync-pack-workspace.mjs` 清单补行——pack 自包含，部署方拿到的工区带契约）。
- **node-gate v1 小切口（②③）**：`scripts/node-gate.mjs`，keyless（纯 fs + zstd CLI，同 evidence-audit 通道；`gateBundle()` 可导入，tests/ 层纯 .jsonl 夹具直调）——
  - **门③（§Decisions 拍板行门，= rerun-loop-live 候选后续③）**：`final/` 版本记账在场 → `question.md` §Decisions 须含 ≥1 条匹配 `/HITL2/` 的拍板行；question.md 失踪 → fail-loud RED。
  - **门②（present 声明门，= 候选后续② 的审计层形态）**：final.md 当前版 + review readiness PASS → 会话日志须含指向本 bundle 的 `present` 工具调用；§Decisions 拍板行显式标注「操作侧」补齐（通道死亡恢复路径，如实记账）→ **PASS-RELAY** 放行带注。静默缺席才是红。
  - 红绿语义：任一门 RED → exit 1；N/A = 无对象（未到交付段）**显式标注**，不静默跳过（防空语料反面）。八节点表 = 门的语义正本，v1 只实现 ②③，其余节点行留 L0 扩展位按证据升格。

## 输掉的方案

- **A1 手册压缩加节**：注入保证最强，但手册 118/120 顶死，拓扑演进是常态时每次都要挤预算——不可持续（用户选 A2）。
- **C 隐式契约（2026-09-29 当日初裁）**：同日被用户以「太重要」翻案——散文判据不拦角色，G8 第二实例即反证。
- **全量六门一次到位**（readiness 解析 / leads 覆盖 / supports T# / gap 四态）：反证样例要造六个，成本先于收益；②③有当日实证直接背书，先关死 G8 形态，其余门留扩展位按证据升格。
- **数值质量门**：假牙齿（floor 教训，搁置池已有归宿）——只门机械可查事实，不发明打分。

## 验证

- **反证先行（tests/fixtures/node-gate/ 六形态，永久反证记录）**：缺拍板行 → 门③ RED（门②隔离 PASS）；缺 present 且无操作侧标注 → 门② RED（门③隔离 PASS）；合规形态双绿；操作侧补齐 → PASS-RELAY 放行；未到交付段 → 双 N/A 显式；question.md 失踪 → fail-loud RED。`node --test tests/node-gate.test.mjs` **7/7**。
- **真数据红证**：合规归档 bundle 拷贝抽掉 HITL2 拍板行 → **双 RED exit 1**（"RED AS EXPECTED"）——红在真实数据上成立，不在夹具上自证。
- **真实 bundle**：`drt_cn-us-open-model-ecosystem` 双 PASS（日志 present 调用实锤）；`drt_cn-us-open-source` 门③ PASS + 门② PASS-RELAY（操作侧补齐显式记账——恰为本次通道死收尾的实录）。报告落各 bundle `node-gate.md`。
- **L4-lite 真模型档**：`source dev/env.sh && node scripts/l4-lite-smoke.mjs` → **ALL PASS**（四角色挂载 + assistant 标记响应 + scout web_search 工具调用真实发生）——新鲜启动即载入新手册文本（含 NODES.md 指针）；当时无在飞通道，重启语义由新鲜启动得证（2026-09-29）。
- **L0**：`pnpm verify` 全绿（34 门禁；doc-budgets 119/120、pack-workspace-fresh 含 NODES.md 种子）；`pnpm test` **103/0**（含本条目 7 断言）。

## Consequences

- 观察面红灯位 / watch-run ask-absent 偏差旗（候选②本体）**不在本条目范围**——门已落地，旗按证据另立。
- 门③ v1 口径 = 「final/ 非空 → ≥1 条 HITL2 行」；v2+ 逐版本匹配（拍板行日期 ≥ vN 落盘日）按证据收紧，不预发口径。
- NODES.md 成为拓扑演进的落点正本：加节点/调节点 = 改表 + 同步 cockpit 渲染与步序正本（程序住 pipeline-polish 卡第 7 面）。
- 其余节点门的升格路径：任一节点判据在实际 run 里出现"上游没给齐、下游瞎猜"实证 → 升 L0 扩展位（node-io-schema 卡反证门预约的机制）。
