# 50 · Agent Loop 与状态模型（当前事实正本）

> 类型：reference——agent 一找就到的单一入口（体裁沿 [design/40](./40-research-cockpit.md)）。
> 本页拥有：Agent Loop 的**组成总览**与**四类运行状态的合同**（canonical 性质、writer/reader、
> 恢复优先级、交付判定）。节点级 I/O 与回边语义归 [NODES.md](../../research-workspace/NODES.md)；
> 人的操作步骤归 [Run 指南](../guides/61-run-playbook.md)；总览地图归 [project-map](../project-map.md)。

## Agent Loop：谁在驱动一次研究

没有独立的仓级 JS 状态机——一次研究由四个部件组合驱动：

| 部件 | 提供什么 | 正本位置 |
|---|---|---|
| Lead preset（persona + 工具行） | 主编人格、组队与工具授权 | `presets/lead.patch.yml` |
| 角色 skills（方法论动作程序） | 每角色"怎么做" | `presets/<role>/skills/<n>/SKILL.md` |
| Agent Teams（spawn + 任务板，D3/D16） | 协作主通道 | vendor `agent-team` 层 |
| 研究工作区文件契约 | 节点 I/O、证据格式、owner 表 | [NODES.md](../../research-workspace/NODES.md) + [研究手册](../../research-workspace/AGENTS.md) |

驱动链（节点细节以 NODES.md 为准）：立项/HITL1 → 组队派工 → 侦察 → 挖掘 → 综合 → 审查 → HITL2 → 拍板记账 + present。GUI 与 [run-kickoff](../../dev/run-kickoff.mjs) 是两个可选的建会话入口；[hitl-answer](../../dev/hitl-answer.mjs) 与 [cdp-probe](../../scripts/cdp-probe.mjs) 是开发/运维驱动或探针，不与产品交互面混称。

## 四类运行状态（canonical 合同）

| 状态 | canonical 性质 | writer | reader |
|---|---|---|---|
| run bundle（`research-workspace/drt_<slug>/`） | **研究事实正本**——恢复本次研究所需的全部变量（D17；在飞住工作区根，交付后归 `research-workspace/archive/<slug>/`） | 各角色按手册 owner 表写自己的文件 | 全角色、审计、仪表盘 |
| DSH session log（`dev/harness-home/sessions/…`） | **执行事件正本**——模型/工具/HITL/present 事件流 | DSH 宿主 | watch-run、仪表盘、evidence-audit |
| goal / 任务板 | 执行辅助——与 bundle 互为镜像，冲突以 bundle 文件事实为准 | DSH 宿主（goal 由 lead 钉住/暂停） | 人、仪表盘 |
| dashboard / 研究驾驶舱 | **派生观察**——fail-soft 只读投影，不是交付绿灯 | 各自生成器（run-dashboard / cockpit） | 人 |

## 恢复优先级

断点续跑只认 run bundle 的文件事实：重跑 [boot-run](../../dev/boot-run.sh) → 新开 lead 会话 → "继续 <slug>"——lead 只凭 bundle 重建上下文，不依赖聊天记忆。session log 佐证执行事件，但不充当研究事实；观察面与任务板不参与恢复判定（操作步骤 = [Run 指南 §5](../guides/61-run-playbook.md)）。

## 交付判定

"研究完成"的唯一依据 = 文件事实链：run 根 `final.md` 当前版 + lead 的 present 声明 + review.md readiness PASS + audit CRITICAL=0。判据正本 = [研究手册 §完成判据](../../research-workspace/AGENTS.md) 与 NODES.md 交付行；机械把守 = node-gate（门②③④）。口头宣告、观察面显示、任务板状态都不是交付依据。
