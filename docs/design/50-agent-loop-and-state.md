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

驱动链（节点细节以 NODES.md 为准）：立项/HITL1 → 组队派工 → 侦察 → 挖掘 → 综合 → 审查 → 读者版派生（review PASS 后、HITL2 前）→ HITL2 → 拍板记账 + 复制 vN/readable-vN + present。GUI 与 [run-kickoff](../../dev/run-kickoff.mjs) 是两个可选的建会话入口；[hitl-answer](../../dev/hitl-answer.mjs) 与 [cdp-probe](../../scripts/probe/cdp-probe.mjs) 是开发/运维驱动或探针，不与产品交互面混称。

## 四类运行状态（canonical 合同）

| 状态 | canonical 性质 | writer | reader |
|---|---|---|---|
| run bundle（`research-workspace/drt_<slug>/`） | **研究事实正本**——恢复本次研究所需的全部变量（D17/D28；位置=操作桶，状态从内容读；根 / `archive/drt_<slug>/` / `_abandoned/` 只用于发现）；`plan.md` 是 Lead 的执行图过程件（不是交付门），Team 板是当前会话的执行镜像 | 各角色按手册 owner 表写自己的文件 | 全角色、审计、仪表盘 |
| DSH session log（`runtime/harness-home/sessions/…`） | **执行事件正本**——模型/工具/HITL/present 事件流 | DSH 宿主 | watch-run、仪表盘、evidence-audit |
| goal / 任务板 | 执行辅助——与 bundle 互为镜像，冲突以 bundle 文件事实为准 | DSH 宿主（goal 由 lead 钉住/暂停） | 人、仪表盘 |
| 仪表盘 / 研究驾驶舱（观察面） | **派生观察**——fail-soft 只读投影，不是交付绿灯 | run-dashboard 脚本投影 / 驾驶舱 client 套件渲染 | 人 |

**观察通道的时间事实**：`remote.workspaceFiles` 只暴露目录项与文本页，不暴露文件 mtime；观察面
任何"最近一条证据的时间"只能取 journal 工具调用事件时间，并显式标注"未知（观察窗口内无写入）"，
不得用盘上 mtime 冒充。证据时间可折自 journal 的 write/edit 调用（不进入活动流——活动流仍只显示
检索/抓取/成员/交付）；写者通常是队员会话，页签需合并 lead + member 流。需要真 mtime 时必须先扩
vendor `WorkspaceFileStat` 并升 pin，属上游改动。

**安装侧状态不在四类内**：工作区种子账本（`.dsh-research-seed.json`）、scaffold 锁/sidecar、team 层依赖
属于安装/升级面，不是研究状态；合同 = pack README §Data/§Compatibility + [guides/65 §3](../guides/65-run-forms.md)。
角色与审计不得把它们当研究事实读写。

## 恢复优先级

断点续跑只认 run bundle 的文件事实：重跑 [run-driver](../../dev/run-driver.mjs)（内部调 boot-run）→ 新开 lead 会话 → "继续 <slug>"——lead 只凭 bundle 重建上下文，不依赖聊天记忆。session log 佐证执行事件，但不充当研究事实；观察面与任务板不参与恢复判定（操作步骤 = [Run 指南 §5](../guides/61-run-playbook.md)）。

## 交付判定

"研究完成"的唯一依据 = 文件事实链，**判据逐字正本 = [研究手册 §完成判据](../../research-workspace/AGENTS.md) 与 [NODES 交付行](../../research-workspace/NODES.md)**——本页不复述件数与清单（缺件以那两处为准）。机械把守 = node-gate（门②③④ + 门A 交付完整性 + 门C 读者版合同）+ `run-accept` 回执。口头宣告、观察面显示、任务板状态都不是交付依据。
