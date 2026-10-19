# 推敲：mcp-client（外部 MCP server 通道）在研究通道的采纳

> 状态：已毕业（批准）｜毕业门判断 = 已拍板（2026-10-02 两轮呈批：Firecrawl 价格问询后选**本地 Playwright MCP**——D22 对外交付约束：用户侧外部账号/凭据/订阅一律不过关）｜下一步 = 实施与 pilot 记录住 [mcp-playwright 采纳 Note](../../../notes/implemented/2026-10-02-mcp-playwright-adoption.md)（本卡内容不重写，只存推敲过程与机制材料）

## 背景 / 触发

2026-10-02 DSH 新语料反省发现：2026-09-30 插件货架盘点（[plugin-shelf-adoption](../../../notes/implemented/2026-09-30-plugin-shelf-adoption.md)，11 项收口）**漏了 mcp-client**——它在语料里归"扩展机制与运营"组，不在研究相关的显眼八类；当时语料消化不全导致盘点盲区（本卡即该反省的收口产物之一）。缺口真实性侧：[browser-use 否决 Note](../../../notes/rejected/2026-09-30-browser-use-adoption.md) 实证 15 场归档 run 中 13 场命中 SPA 证据失败，绕行对冲大半后残余硬缺口 = 无静态出口的消费端 SPA 定价页与 JS 榜单。mcp-client 是 DSH 接外部抓取/检索 server 的官方通道（每 server 一行，工具以 `mcp__<server>__<tool>` 注册进 `ctx.tools`）。

## 已知与未决（vendor 当轮 pin 源码核对，2026-10-02；当轮 tag 属外部材料口径，深挖子代理报告 + 本仓交叉实证）

四个未知数全部落源码解决：

1. **作用域语义**：连接数 = cordis 行数，与 agent 数完全解耦（`mcp-client/src/index.ts:31-34,154`；不监听任何 agent 事件）。profile 层行 = host 单例一条连接、工具进 `ctx.tools` 全局层；preset 行 = 每个 preset **定义**一条连接（`agent-preset-registry/src/index.ts:102-118,226-266`），eager 于 host 加载（`agent-preset/src/index.ts:27-29`）。→ browser-use 的"每 agent 起 MCP 子进程"形态错配在 mcp-client 上不存在。
2. **工具可见性**：全局层工具对所有 agent 默认可见；`toolFilter` 是 subagent per-child 概念、**精确名列表无 glob**（`core/tools/src/index.ts:700-711`；`exclude: [mcp_*]` 通配写法在 restrict() 校验 fail-loud，`index.ts:1114-1118`）；server tools/list 漂移后新增工具默认可见。→ 按角色裁面工程成本高且脆。
3. **teammate 可见性（关键）**：`spawn_teammate` 无 preset/persona/toolFilter 参数（`tool-agent-team/src/index.ts:175-213`），子 agent 一律 `composeFrom` lead（`child-agent.ts:200-219` + registry `bindScopeParent` `273-284`）——**与本仓 m2 首场 run 实证一致**（teammates 挂 roster 默认 preset = lead，角色人格经 spawn prompt；[m2-run-mechanics Q2](../../../notes/implemented/2026-09-24-m2-run-mechanics.md)）。→ MCP 工具要进 teammate 工具面：配 profile 层（或 lead preset 行）；配 scout preset 行对 teammate **无效**。
4. **部署/安全面**：stdio 形态 = host 级受信任进程、**无沙箱**（`transport.ts:16-20` 注释明示绕开 sandboxPolicy/approval）；子进程 env 经 `scrubbedParentEnv()`（`DEEPSEEK_API_KEY` 不隐式外传，传须显式 env/headers，可用 `!!js`）；`failOnStartupError` 默认 false（慢/挂 server 拖慢启动——采纳时建议 true，fail-loud 合本仓纪律）；出厂零默认行（`apps/cli/tests/profile-mcp.spec.ts:27` 断言为空），配置责任全在使用方。

**与既有定案的关系**：[search-fallback-seam](../../../notes/implemented/2026-09-27-search-fallback-seam.md) 定案"换源留给用户拍板，本仓不擅动"——外部 server 选型 + 凭据同属用户拍板面，本卡只备事实与 recipe，不预设结论。**与 browser-use C2 的联动**：若采纳 mcp-client 接抓取 server，C2 的"`.md`/API/raw/存档四绕行全败"判据变五绕行——browser-use Note 的 C2 文本需同 diff 联动修订。

**待答问题**：哪家 server（Firecrawl 类抓取 / Context7 类检索 / 其他）能覆盖残余硬缺口且凭据与成本可接受——属用户决策，本仓不代选。**待跑实验**：采纳后单场 scoped pilot（挂 → 跑 → 拆，browser-use recipe 精神；profile 组合追加 mcp-client 行 + streamable-http config + `failOnStartupError: true`，走 `dev/boot-run.sh` 重建分支，版本与 pin 锁步）。**喂给谁**：browser-use C2 判据修订、plugin-shelf-adoption 台账增补行、（若采纳）boot-run/scaffold 部署面与 [design/10](../../../docs/design/10-architecture.md) 工具面表。

## 调研材料（2026-10-02；⚠ 会话通道限制：web_fetch 全环境不可用——DNS 一律解析到非公开 IP，搜索只回链接不回内容，深挖子代理因此卡死被中断；以下事实 = 搜索快照标题可证部分 + 明示的未核实项，价格/端点等最终数字**留待拍板前人工点开来源 URL 确认**）

| 候选 | 已证（搜索快照） | 未核实（需人工确认） | 对缺口的初步判断 |
|---|---|---|---|
| **Firecrawl 官方 MCP**（[GitHub 仓](https://github.com/firecrawl/firecrawl-mcp-server) · [docs](https://docs.firecrawl.dev/mcp-server/keyless)） | 官方 server 存在，定位"web scraping and search to any LLM clients"；docs 有 **keyless** 变体页（免 key 试用形态）；[定价页](https://www.firecrawl.dev/pricing) 存在（多档"Flexible pricing"） | remote 端点确切 URL、Bearer 头形态、免费额度数字、付费单价、确切工具名/数（仓库描述示 scrape/search 为主，量级小） | **最对口**：单发渲染抓取 + markdown 输出正是其产品定位；工具面小（对全会话 token 友好）；streamable-http 形态（少一个本地受信任进程） |
| **Microsoft Playwright MCP**（[capabilities](https://playwright.dev/mcp/capabilities)） | 本地 stdio（npx）形态；第三方页标题称"**All 23 Core Tools**"、$0；另有 Azure Playwright Workspaces **remote MCP**（[learn.microsoft.com](https://learn.microsoft.com/en-us/azure/app-testing/playwright-workspaces/how-to-playwright-workspaces-remote-mcp)） | 23 工具的完整清单；remote 版的凭据/价格 | 覆盖最全（真实浏览器）但 **~23 工具进全会话 prompt = token 面大**，违背"工具面越小越好"约束；本地形态 = 候选 D（stdio 劣势）；remote 版引入 Azure 依赖 |
| Context7（upstash） | 文档检索定位（非 SPA 抓取） | — | 定位不符缺口，排除 |
| Browserbase / Stagehand / 其他 | 搜索未见强相关结果 | — | 未检出更优候选（快照层面） |

**推荐排序（材料现状下）**：Firecrawl remote > 本地 Playwright MCP（$0 兜底）> 其余。关键权衡：Firecrawl 的付费成本 vs Playwright 的 23 工具 token 面——前者按量付费（低频研究 run 大概率便宜），后者零现金成本但每场 run 全角色 prompt 膨胀。

## 候选与取舍

- **A 维持不挂**（现状零动作）：零成本；SPA 残余硬缺口继续等 browser-use C1（provider 晋级 stable）/C2/C3；
- **B profile 层挂 streamable-http 抓取 server**：lead + teammates + one-shot worker 全员可见——匹配"侦察与取证是任意角色都可能发生的行为"；成本 = 全会话 prompt 增 N 个工具定义（token 面）+ 信任一个 host 级无沙箱外部 server + 启动依赖（`failOnStartupError: true` 挂即红）；
- **C 角色裁面（只让 scout 抓）**：源码事实判死——preset 行对 teammate 无效（§3）+ deny 无 glob + tools/list 漂移失配（§2）；是工程理由不是偏好；
- **D stdio 本地 server**：多一个本地受信任子进程 + 部署面（node/npm 依赖进用户环境）；除非目标 server 无 HTTP 形态，劣于 B。

## 毕业门

四问：**该不该** = 用户拍板（外部服务 + 凭据，同 search-fallback-seam 性质）；**何时** = 与 browser-use C1/C2/C3 竞速，谁先满足用谁（两者是同一缺口的两条官方通道，不互斥但没必要双挂）；**次序** = 若采纳，先修订 browser-use C2 判据文本、再挂 profile 行、再跑 scoped pilot；**放弃** = A 恒有效（缺省）。缺的证据 = 用户对 server 选型与凭据的表态。

## 采纳 recipe（预案——拍板即用；server 选型待调研材料定）

profile 层插一行（字段形状 = vendor `mcp-client/README.md` 最小配置样例 + config-catalog）：

```yaml
- insert:
    - id: mcp-fetch
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: fetch            # 工具名前缀 mcp__fetch__*
        transport: streamable-http   # 优先 HTTP：少一个本地受信任子进程（§安全面）
        url: <server endpoint>
        headers:
          Authorization: !!js '`Bearer ${process.env.MCP_FETCH_TOKEN}`'  # 凭据走 env，永不入仓
        failOnStartupError: true     # fail-loud：server 不可达 = boot 红，不静默缺工具
        toolCallTimeoutMs: 60000     # 按缺口页面实测再调
```

- **落点与版本**：mcp-client 随 CLI 发布（patch 层依赖，非独立 bundle 安装）。run 通道落点 =
  research profile 的 `cordis.patch.yml`（`dev/harness-home/profiles/research/`）insert 行——
  **必须写进 `dev/boot-run.sh` 重建分支**（重建每次 `rm -rf` 从 web 模板重来，手工加的行会被
  抹掉）+ `profile_ok` 幂等校验该行在场；现状漂移检测只对账 pack 发布集，行级对账随本行新增。
  个人安装面 = 用户自建 profile 的 `cordis.patch.yml` 同款行。pin 锁步自动覆盖版本；升 pin 重验
  config 字段（config-catalog）。凭据 env 缺席 + `failOnStartupError: true` = boot 红——
  run 通道挂载宜 **scoped pilot**（挂 → 跑 → 按结论拆或常驻），不默认常挂。
- **验证面**：boot-run 漂移检测 → boot 浏览器探针 0 failed → L1 preset-smoke（工具面 +N 断言）
  → snapshot fixture 换代（工具面变化）→ 单场 scoped pilot（挂 → 跑 → 按结论拆或留）。
- **token 面**：全会话工具定义 +N（lead + teammates + one-shot worker 全可见，§teammate）——
  N 实际值进调研对比材料，过大（>10）时重估注意力稀释 vs 检索收益。

## browser-use C2 判据联动修订文本（预案——采纳即同 diff 应用）

[browser-use Note](../../../notes/rejected/2026-09-30-browser-use-adoption.md) 的 C2 由
"`.md`/API/raw/存档四绕行全失败"改为"**五绕行全失败**（.md 直出 / 官方 API / raw / 存档 /
mcp 抓取通道）"；C1/C3 判据不变。另补关系声明：mcp 抓取通道与 browser-use 是同一缺口的两条
官方通道——mcp 通道覆盖**单发渲染抓取**（成本低、先挂），browser-use 留给**多步交互浏览**
（C1/C2/C3 继续在池；pilot 触发时先试 mcp 通道再升 browser-use）。
