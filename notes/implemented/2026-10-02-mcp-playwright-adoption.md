# mcp-client 通道采纳：本地 Playwright MCP（scoped pilot）

> 状态：implemented

归宿：用户直派（mcp-client 推敲卡
[261002](../../_backlog/_done/_closed_plans/261002-mcp-client-adoption.md)
两轮呈批毕业——2026-10-02：Firecrawl 价格问询后拍板本地 Playwright MCP）。机制四未知数源码结论
与候选对比材料 = 毕业卡全文（内容不重写，本 Note 只存决定、淘汰理由与验证）。

## 决定

**采纳 `@deepseek-ai/dsh-mcp-client` + 本地 `@playwright/mcp`（stdio）作为研究通道的 SPA 证据
兜底通道，形态 = scoped pilot**：`MCP_PLAYWRIGHT=1 bash dev/boot-run.sh` 挂（标记块幂等写进
research profile 的 cordis.patch.yml，见 [boot-run.sh](../../dev/boot-run.sh) ①½）；缺省不挂，
拆 = 不带 env 重跑。**常驻与否按 pilot 实测定**（token 面：~23 工具进全部角色会话 prompt；覆盖
力：残余硬缺口 = 无静态出口的消费端 SPA 定价页与 JS 榜单，15 场归档 run 中 13 场命中）。

**裁决理由 = D22 对外交付约束**（本 Note 同日入台账）：pack 要交出去给人用——用户侧外部账号 /
API key / 付费订阅一律不过关。本地 Playwright MCP 的 setup 面 = "机器有 Node"（npx 自动拉起）；
Firecrawl remote 被交付形态否决（账号 + key + 按量订阅），价格数字本会话不可核实（web_fetch 全
环境不可用）只是次因。机制四问源码结论支持采纳：连接数 = 行数与 agent 数解耦（无 browser-use
的每 agent 子进程错配）、stdio = host 级受信任进程（信任面已知）、`failOnStartupError: true` =
server 起不来 boot 红（fail-loud 合纪律）、工具经全局层全员可见（lead + teammates + one-shot
worker 都能抓，恰好匹配"侦察取证是任意角色行为"）。

pilot 预案：带 env 起通道 → 选一个已知 SPA 缺口目标（历史实证：bigmodel.cn/z.ai 定价页、
OSWorld 2.x 榜）→ scout 通道抓取实测 → 记录 token 面（工具 schema 逐角色 prompt 增量）与
覆盖结论 → 按结果定常驻（常驻则钉 `@playwright/mcp` 版本、按需加 headless 参数、评估
PLAYWRIGHT_BROWSERS_PATH 指向本仓 ms-playwright 缓存）或拆。

## 输掉的方案

- **Firecrawl remote MCP**（能力最对口：单发渲染抓取 + markdown 输出 + 工具面小）：被 D22 交付
  约束否决——账号 + API key + 按量订阅（免费档历史为一次性 ~500 credit，记忆数字未核实）；
- **角色裁面（只让 scout 抓）**：源码判死——preset 行对 teammate 无效（spawn_teammate 子一律
  composeFrom lead）+ toolFilter 精确名无 glob + tools/list 漂移失配；
- **暂不采纳**：缺口真实（13/15 run），且 DSH 侧机制已全部核实就绪，无理由搁置。

## 实际跑过的验证（2026-10-02）

| 面 | 结果 |
|---|---|
| 写入/拆除开关 | `MCP_PLAYWRIGHT=1` 追加标记块、缺省删除——幂等两向实测绿 |
| 组合面 | `dsh --profile research --dump-config` 扁平树含 `mcp-playwright` 行（挂态）/不含（拆态） |
| 真挂载 | 见本 Note 尾部 pilot 记录（首场 pilot 后回填） |
| L0 | verify 全绿 + tests 全过（本变更不动 pack 发布集——mcp 行在 profile 层，pack/overlay 零变化） |

## Pilot 阶段记录（2026-10-02 首场进行中——环境踩坑与真发现）

- **boot 路径两 bug 被 fail-loud 抓到并当轮修复**：①全新 profile 的 patch 以 `[]` 闭数组占位，
  向其后追加 mcp 块 = 非法 YAML（parsePatchList 当场红）——修法 = 追加前摘占位行、拆后无内容
  补回占位；②崩溃循环把仓内 npx 缓存跑坏（`ENOTEMPTY` 半安装残留）——`failOnStartupError: true`
  让条目拒绝激活并大声警告（app-boot 政策允许 optional 条目失败不拦 boot——**起通道后必须查
  日志"did not activate"缺席才算挂载成功**），清缓存重 boot 即愈。
- **真挂载 + 真使用证据**：25 个 `mcp__playwright__*` 工具全进 lead request/header（58 工具 vs
  基线 30——token 面 +25 工具 schema）；lead 真实调用 `browser_navigate` ×3（行为证据，非纸面）。
- **阻断项（操作层，非产品缺陷）**：通道被会话内代理后台起 → 继承会话执行沙箱——`web_fetch`
  全域名撞"resolves to a non-public IP"墙、playwright 浏览器 `EPERM` 建不了
  `~/Library/Caches/ms-playwright-mcp`。教训入 guides/61 §0：**boot 这个动作归用户终端**；代理
  驱动已起通道没问题（kickoff / hitl-answer 走 localhost API 全通）。
- **timed 600s 语义实测通过**：sibling 预检 ask 超时 → pending → lead 自主判断继续 → 问题保持
  可补答（历史卡片的 Answer 按钮在）——与 0.2.0 文档语义逐条吻合。
- **goal 护栏观察（残留观察点 1，部分合规）**：lead 在阻断中途确认前**没有**先 update_goal
  pause（persona 偏差），但该 ask 自带 `timeout: -1`（回合不关闭 = goal 轮驱动器不会空转烧
  调用——风险被这个选择绕开）；答案落地后正确 pause 挂起（update_goal action=pause 实锤）。
  完整合规判定待干净通道的首场完整 run。
- **run 现状**：goal paused、turn 干净收尾、bundle 未建——挂起待用户终端起干净通道
  （`MCP_PLAYWRIGHT=1 bash dev/boot-run.sh`），恢复 = 向该会话发恢复消息让 lead resume goal。

## Pilot 终版结论（2026-10-03 交付，run = drt_cn-llm-pricing-2026-10）

**覆盖力（决定性）**：历史头号缺口被渲染通道关闭——智谱 GLM Coding Plan 三档价目（Lite ¥118/月起 ×
包月/包季/包年，`bigmodel.cn/glm-coding`）经 DOM 渲染完整取证（ev-glm-coding-plan-prices-rendered.md，
A 级）——该页在 drt_cn-dr-products 判"不可判定"、本次 run 故障期判"JS 壳页不可取证"，**渲染一通价目
即得**。千问平台 API 价目页渲染取证（A 级）。DeepSeek 消费端渲染后判"仅登录墙"——缺口边界钉清：
**在登录层不在渲染层**。team 手法实证：共享 tab 被占时 `page.context().newPage()` 独立页取完即关；
渲染等待 6000–8000ms 记进口径（价目为前端异步注入）。

**Token 面**：+25 工具 schema 进全角色请求（58 vs 30 基线）；实测影响可承受——run 中段 24% 上下文、
9M tokens/98% cache hit（工具 schema 属可缓存前缀，边际成本被 KV 命中摊薄）。

**Recommendation → 已拍板：常驻（2026-10-03 用户定调「默认开」）**——boot-run 默认挂载
（`MCP_PLAYWRIGHT=0` 显式拆）、版本钉 `@playwright/mcp@0.0.83`。依据：覆盖力决定性、token
成本可承受、零账号
（D22 合规）、浏览器渲染不可替代（web_fetch 只回壳页）。已知 trade-off 随行：`--proxy-server
direct://` 修复 Chromium 渲染但**打断 playwright 服务器进程的 `page.request.get` 子通道**（Node 侧
把 "direct" 当代理主机名解析，`ENOTFOUND direct`——critic 独立复测钉死因果）；该子通道的原职能由
`web_fetch` 覆盖，净损失≈0。更优参数组合（两通道兼得）留作已知限制，重估条件 = 出现需要服务器进程
请求通道的 run 实证。

**browser-use C3 tally**：本场 run **零新增** `js-render-blocked-no-workaround` 案例（渲染通道把
智谱案例从"不可得"变"可得"）——browser-use 常设评估的必要性进一步下降，C1/C2/C3 判据维持。

**goal 护栏终判（残留观察点 1 关闭）**：第二次 HITL2 全程合规——挂起前 `update_goal pause`、答后
`resume`、present 后 `complete`（persona 护栏逐条命中；首轮 blocker ask 未先 pause 但自选
`timeout: -1` 无空转风险——已记上文）。

## 已知限制与延后工作

- `@playwright/mcp@latest` 未钉版本（pilot 可接受；常驻时钉版本进标记块）；
- headless 未配（缺省 headed——pilot 实测桌面窗口影响后按需加参数）；
- 浏览器二进制依赖 ms-playwright 缓存版本匹配（本仓已有 chromium-1228/1243；npx 拉的最新版
  若不匹配，`npx playwright install chromium` 一次性补齐——仍零账号）；
- 交付面（scaffold 面向最终用户挂该通道）等 pilot 证明价值后再议（D16 同构：组合归 profile 层）。
