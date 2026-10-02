# 推敲：mcp-client（外部 MCP server 通道）在研究通道的采纳

> 状态：推敲中｜毕业门判断 = 待用户拍板（外部服务与凭据属用户决策面，同 search-fallback-seam 定案性质）｜下一步 = 用户过目候选 A–D 后裁决；采纳则先联动修订 browser-use C2 再挂

## 背景 / 触发

2026-10-02 DSH 新语料反省发现：2026-09-30 插件货架盘点（[plugin-shelf-adoption](../../notes/implemented/2026-09-30-plugin-shelf-adoption.md)，11 项收口）**漏了 mcp-client**——它在语料里归"扩展机制与运营"组，不在研究相关的显眼八类；当时语料消化不全导致盘点盲区（本卡即该反省的收口产物之一）。缺口真实性侧：[browser-use 否决 Note](../../notes/rejected/2026-09-30-browser-use-adoption.md) 实证 15 场归档 run 中 13 场命中 SPA 证据失败，绕行对冲大半后残余硬缺口 = 无静态出口的消费端 SPA 定价页与 JS 榜单。mcp-client 是 DSH 接外部抓取/检索 server 的官方通道（每 server 一行，工具以 `mcp__<server>__<tool>` 注册进 `ctx.tools`）。

## 已知与未决（vendor `dsh-v0.2.0-rc.2` 源码核对，2026-10-02，深挖子代理报告 + 本仓交叉实证）

四个未知数全部落源码解决：

1. **作用域语义**：连接数 = cordis 行数，与 agent 数完全解耦（`mcp-client/src/index.ts:31-34,154`；不监听任何 agent 事件）。profile 层行 = host 单例一条连接、工具进 `ctx.tools` 全局层；preset 行 = 每个 preset **定义**一条连接（`agent-preset-registry/src/index.ts:102-118,226-266`），eager 于 host 加载（`agent-preset/src/index.ts:27-29`）。→ browser-use 的"每 agent 起 MCP 子进程"形态错配在 mcp-client 上不存在。
2. **工具可见性**：全局层工具对所有 agent 默认可见；`toolFilter` 是 subagent per-child 概念、**精确名列表无 glob**（`core/tools/src/index.ts:700-711`；`exclude: [mcp_*]` 通配写法在 restrict() 校验 fail-loud，`index.ts:1114-1118`）；server tools/list 漂移后新增工具默认可见。→ 按角色裁面工程成本高且脆。
3. **teammate 可见性（关键）**：`spawn_teammate` 无 preset/persona/toolFilter 参数（`tool-agent-team/src/index.ts:175-213`），子 agent 一律 `composeFrom` lead（`child-agent.ts:200-219` + registry `bindScopeParent` `273-284`）——**与本仓 m2 首场 run 实证一致**（teammates 挂 roster 默认 preset = lead，角色人格经 spawn prompt；[m2-run-mechanics Q2](../../notes/implemented/2026-09-24-m2-run-mechanics.md)）。→ MCP 工具要进 teammate 工具面：配 profile 层（或 lead preset 行）；配 scout preset 行对 teammate **无效**。
4. **部署/安全面**：stdio 形态 = host 级受信任进程、**无沙箱**（`transport.ts:16-20` 注释明示绕开 sandboxPolicy/approval）；子进程 env 经 `scrubbedParentEnv()`（`DEEPSEEK_API_KEY` 不隐式外传，传须显式 env/headers，可用 `!!js`）；`failOnStartupError` 默认 false（慢/挂 server 拖慢启动——采纳时建议 true，fail-loud 合本仓纪律）；出厂零默认行（`apps/cli/tests/profile-mcp.spec.ts:27` 断言为空），配置责任全在使用方。

**与既有定案的关系**：[search-fallback-seam](../../notes/implemented/2026-09-27-search-fallback-seam.md) 定案"换源留给用户拍板，本仓不擅动"——外部 server 选型 + 凭据同属用户拍板面，本卡只备事实与 recipe，不预设结论。**与 browser-use C2 的联动**：若采纳 mcp-client 接抓取 server，C2 的"`.md`/API/raw/存档四绕行全败"判据变五绕行——browser-use Note 的 C2 文本需同 diff 联动修订。

**待答问题**：哪家 server（Firecrawl 类抓取 / Context7 类检索 / 其他）能覆盖残余硬缺口且凭据与成本可接受——属用户决策，本仓不代选。**待跑实验**：采纳后单场 scoped pilot（挂 → 跑 → 拆，browser-use recipe 精神；profile 组合追加 mcp-client 行 + streamable-http config + `failOnStartupError: true`，走 `dev/boot-run.sh` 重建分支，版本与 pin 锁步）。**喂给谁**：browser-use C2 判据修订、plugin-shelf-adoption 台账增补行、（若采纳）boot-run/scaffold 部署面与 [design/10](../../docs/design/10-architecture.md) 工具面表。

## 候选与取舍

- **A 维持不挂**（现状零动作）：零成本；SPA 残余硬缺口继续等 browser-use C1（provider 晋级 stable）/C2/C3；
- **B profile 层挂 streamable-http 抓取 server**：lead + teammates + one-shot worker 全员可见——匹配"侦察与取证是任意角色都可能发生的行为"；成本 = 全会话 prompt 增 N 个工具定义（token 面）+ 信任一个 host 级无沙箱外部 server + 启动依赖（`failOnStartupError: true` 挂即红）；
- **C 角色裁面（只让 scout 抓）**：源码事实判死——preset 行对 teammate 无效（§3）+ deny 无 glob + tools/list 漂移失配（§2）；是工程理由不是偏好；
- **D stdio 本地 server**：多一个本地受信任子进程 + 部署面（node/npm 依赖进用户环境）；除非目标 server 无 HTTP 形态，劣于 B。

## 毕业门

四问：**该不该** = 用户拍板（外部服务 + 凭据，同 search-fallback-seam 性质）；**何时** = 与 browser-use C1/C2/C3 竞速，谁先满足用谁（两者是同一缺口的两条官方通道，不互斥但没必要双挂）；**次序** = 若采纳，先修订 browser-use C2 判据文本、再挂 profile 行、再跑 scoped pilot；**放弃** = A 恒有效（缺省）。缺的证据 = 用户对 server 选型与凭据的表态。
