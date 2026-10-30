# 0.2.0 插件货架适配（deep-research pack 对 DSH 出厂插件的分层采纳）

> 状态：implemented

归宿：用户直派（2026-09-30：「我们要充分利用它们……合适我们场景的插件」，语料 =
`/Users/bowhead/deepseek-harness/_digested/plugin-inventory/`——基线与本仓 pin 同为
`dsh-v0.2.0-rc.2` @ `639ed01539`，可直接采信）。两轮呈批裁决：①timed ask-user 采纳、
600s（修正语义下重批——超时 pending 不落定）；②分层按序推进 + auto-review / workflow /
browser-use 三项调研提前。

## 决定

**对 DSH 0.2.0 出厂插件货架（316 包 / 92 服务 / 30 工具包）逐项收口，采纳三项、其余八项
全部带理由与归宿记档——零「待定」离场。** 逐项收口表：

| # | 候选 | 收口 | 依据与归宿 |
|---|---|---|---|
| 1 | session-query 全文检索 + tool-session-query 五工具 | **采纳** | bundle replace `openAt: first-search`（`:memory:` 每进程重建，持久化索引属 launcher 面——boot-context slot 语义）；lead/critic 挂五工具行（`session_search / session_event_search / session_trace / session_event_trace / session_event_read`）；critic 交叉核查、lead 跨 run 找历史证据的直接供给 |
| 2 | timed ask-user（0.2.0 新增） | **采纳（600s）** | lead 的 ask-user 行 `mode: timed + timeout: 600`；超时返回 pending——问题保持可答（后答经 `answer_to_pending_question` 唤醒）、pending 通知明示"这不是许可"；**配套 hitl-fold v5 谓词**（旧尾窗谓词漏报 timed 可答挂起 → 末位 ask 状态机，watch-run / 驾驶舱横幅 / 锚点问数三消费面共用） |
| 3 | compaction / spill 调优 | **不调（维持出厂缺省）** | 九场 run 零上下文压力实证；值级条款——无断言面的数值改动只有不可证成本。重启条件：run 实证撞上下文压力（裁剪致证据断链且 evidence-audit 抓到） |
| 4 | tool-goal（三工具） | **采纳（仅 lead）** | goal-round-driver 随 base 在位 = 中断韧性 + GoalBar 观察面免费；persona「run 目标态」行钉用法：HITL1 拍板后 create_goal、**任何 ask 挂起前 pause / 答后 resume**（结构性护栏：driver 只认 goal 状态不认挂起 ask——`goal-round-driver/src:165/:269` 硬门 phase=active 且 armed 才续轮，不 pause 会空转烧模型调用）、真交付 complete；goal 与 drt_ bundle 互为镜像、冲突以 bundle 文件事实为准 |
| 5 | tool-jobs（三工具） | **不采纳** | 组合里无 job 产出者（唯一产出者 = workflow 的 `run_in_background`，已否决；subagent 钉 one-shot 前台、teammates 走 agent 工具面）——挂了就是死重。重启条件：后台式异步工作进入方法论 |
| 6 | auto-review（OPTIONAL_BUNDLES） | **否决** | 它是 Auto 权限 preset 的 LLM 授权门：零 config 面、固定安全策略（`src/index.ts:40-61` 硬编码）、激活即 danger-full-access 沙箱（比现行 workspace-write 宽 = 安全倒退）、每工具调用多一次 LLM 请求；判定轴是"调用危险吗"装不下"证据链在场吗"。evidence-audit.mjs 已是候选用途的确定性正解 |
| 7 | workflow（tool-workflow） | **否决** | [rejected Note](../rejected/2026-09-30-workflow-adoption.md)（内核错位 / 载体倒转 D3/D16 / HITL 停点结构性无落点；带重启条件） |
| 8 | browser-use（experimental 三 provider） | **搁置进池** | [rejected Note](../rejected/2026-09-30-browser-use-adoption.md)（缺口真实——15 场 run 中 13 场命中 SPA 证据失败，但 experimental 零出厂采纳信号 + 团队形态错配；重启判据 C1/C2/C3 + 采纳 recipe 在档） |
| 9 | office-to-pdf | **搁置** | 交付形态 = markdown + present 声明；PDF/Office 交付无需求且引入 LibreOffice 部署依赖。重启条件：用户点名 PDF/Office 交付形态 |
| 10 | schedule-bundle | **搁置** | run 节奏由 HITL 与人驱动，定时看护无需求。重启条件：run 实证需要定时检查点 |
| 11 | web-search-exa / perplexity 换源 | **引既有定案不重开** | [search-fallback-seam Note](2026-09-27-search-fallback-seam.md)：换源留给用户拍板，本仓不擅动 |

**2026-10-02 补盲（DSH 新语料反省）**：上表漏了 **mcp-client**（外部 MCP server 通道）——
它归在语料"扩展机制与运营"组，不在研究相关显眼八类；当时语料消化不全是盲区根因。四个机制
未知数（profile 层作用域 / 工具可见性 / teammate 可见性 / 部署安全面）已由 vendor 源码深挖
落定（关键事实：连接数 = 行数与 agent 数解耦；spawn_teammate 子一律继承 lead preset——与
本仓 m2 首场 run 实证一致），现状进推敲卡
[_backlog/_archived/settled_issues/2026-10-02-mcp-client-adoption.md](../../_backlog/_archived/settled_issues/2026-10-02-mcp-client-adoption.md)
（已毕业：2026-10-02 拍板采纳本地 Playwright MCP——D22 交付约束，实施 =
[mcp-playwright 采纳 Note](2026-10-02-mcp-playwright-adoption.md)）；采纳则联动修订 #8 的 C2 判据。

**连带修复（升 pin 遗留回归，020rc2 Note 已补勘误）**：`vendor-build.sh` 顺序缺陷——tsdown
client 先于 host 半补建，client bundle 把 `typert-protocol` / `util-workspace-path` 静默外置成
require → Web boot 17 包 failed（"missed the module table"）。顺序铁律修正（半补建前移）+
guides/60 换 pin 必跑面补 client-load-smoke（当天漏网面）+ `render-overlay` 治掉 registry
replace 的硬编码第二份（replace 块统一从 pack 直读）。

**snapshot fixture 换代 v4**（基线债一并清偿）：e6e51bc 的 persona 变更欠了 B 层基线债（未重
录），本条目的工具面变更叠加其上——换代重录至 v4（request/header 30 工具：22 基线 +
session-query 五件 + goal 三件；ask schema 含 timed `timeout` 参数；persona 含「run 目标态」行），
后续模型可见面变更重新获得 keyless 秒级回归信号。

## 实际跑过的验证（2026-09-30，全部实跑）

| 面 | 结果 |
|---|---|
| L0 | verify 全绿（30 门禁：row-deps 咬新 peerDeps ×3、overlay-fresh、pack-bundle-compat、pin-agreement 同步绿）+ tests 116/0（hitl-fold +4 timed 形态矩阵，两处旧断言按"行为变了同 diff 改断言"翻新） |
| L1 源码域真挂载 | preset-smoke ALL PASS ×3（session-query / timed / tool-goal 各一轮） |
| snapshot-replay | ALL PASS（A 回放 + B1 persona + B2 工具 schema + C5 金标准逐代重写人审——diff 全部为有意变更镜像） |
| L2 安装域 | release-smoke ALL PASS ×3 |
| L4-lite 真模型 | ALL PASS ×3（四角色响应 + scout 真调 web_search） |
| 观察面真浏览器 | client-load-smoke ALL PASS（升 pin 回归修复后）+ run 通道 boot 浏览器探针 0 failed / 0 console 错误 |
| fixture 录制 | 真模型 lead 会话 ×3 代（v2/v3/v4，同款探针提示词，36 事件/代） |
| 入口链探针 | 毕业时跑（队列回 parked，四问对真值） |

## 输掉的方案

- **全面采纳（把 base/web 暴露的工具行都塞进 preset）**：否决——preset scoping 是有意设计
  （scout 无 ask-user、critic 无 subagent 皆然）；工具面膨胀稀释模型注意力，「充分利用」≠
  「全挂」。判据 = 每个工具行都要有方法论角色，不是"货架上有"。
- **自写 provider / 胶水插件补缺口**：既有定案（search-fallback-seam：pack 层不可行且破坏
  "配置为主 + 例外"形态）。**2026-10-27 更新**：D31 的抓取回退 provider 是第二处有界例外——
  “不自写 provider”现仅对 **search** 成立；session-query 仍用现成包。
- **timed ask-user 初版呈批方案（超时按推荐项自动落定）**：源码核实后撤回——0.2.0 的真实
  语义是 pending 不落定（问题保持可答 + "这不是许可"）；按错误描述落地会静默替用户拍板，
  违反 HITL 语义。修正语义重新呈批后采纳。
- **tool-goal 不带 pause/resume 护栏**：goal-round-driver 只认 goal 状态不认挂起的 ask——
  HITL 等人期间 goal 轮会空转烧模型调用；persona 钉"ask 挂起前 pause、答后 resume"后才可
  采纳。
- **compaction/spill 调值**：值级不可证（无断言面）+ 零压力实证——改了只有成本没有证据
  收益。
- **观察面新页签全量接入研究驾驶舱**：驾驶舱最小面设计（D18 正本 = design/40）；非研究
  语义的页签（ui-jobs / ui-workflow-run 等）随对应工具采纳与否走，不单独接。

## 环境状态

- 采纳后 lead 工具面 = 30 工具（基线 22 + session-query 5 + goal 3）；critic = 27（+
  session-query 5）；scout/analyst 不变（22）；
- snapshot fixture = `session.v4.jsonl`（新一代录制流程已跑通三遍：探针提示词 → 真模型
  会话 → 日志直接入 fixture——后续模型可见面变更照此换代）；
- run 通道（3083）跑在含全部采纳的 research profile 上（boot-run 重建 ×3）；
- 残留观察点：goal pause/resume 护栏是 persona 纪律非机械门禁——首场真 run 实证 lead 的
  goal 行为（是否照 persona 暂停、HITL 期间是否零空转）后回填；timed 600s 的窗口长度同
  样待真 run 体感校准（值级不可证，显式记档）。
