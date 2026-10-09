# browser-use 实验插件族的采纳（搁置进池）

> 状态：rejected

归宿：本 Note 拥有否决理由、重启条件与采纳 recipe；采纳目录扫描见 [plugin-shelf-adoption](../implemented/2026-09-30-plugin-shelf-adoption.md)；调研全文 = 评估子代理报告
（2026-09-30，vendor `dsh-v0.2.0-rc.2` 源码 + 15 场归档 run 的 grep 实证），本 Note 存蒸馏
结论、重启判据与采纳 recipe。

## 决定

**搁置不采纳（browser-use 三 provider 全家）**。缺口真实且高频，但搁置理由在成熟度与团队
形态侧，不在缺口真实性侧：

1. **缺口实证（真）**：15 场归档 run 中 13 场命中 JS 渲染/SPA 证据失败。代表案例：智谱
   消费端价位 4 条官方路径全 SPA → 交付格"不可判定"（drt_cn-dr-products/
   evidence/t5-zhipu-qwen-firstparty-gap.md）；OSWorld 2.x 逐模型榜跨两场 run 未取回
   （drt_computer-use-benchmarks + drt_cn-agentic-parity，后者明写"下一轮需浏览器渲染
   通道"）；ScreenSpot-Pro 分数字段、qwen.ai 全站、bigmodel.cn/z.ai 定价页、xbench 等。
   失败可分解：JS 渲染（browser-use 可解）/ PDF 不可解析（不可解，约占日志一半）/ 403
   反爬（不确定）。绕行已自愈大半（.md 直出 / 官方 API / raw / Wayback）——残余硬缺口 =
   无静态出口的消费端 SPA 定价页与 JS 榜单。
2. **成熟度信号为零**：三个实现（playwright-mcp / chrome-devtools-mcp / stagehand-native）
   全在 experimental（合同随时变、无支持承诺）；dsh 出厂 OPTIONAL_BUNDLES 不含 browser-use
   全族——按研发宪章"采纳度为信号"，这是零信号包。
3. **团队形态错配**：`mountSessionMcp` 在**每个** agent/created 起 MCP 子进程并 awaited
   （browser-use-runtime/src/mcp.ts）——团队 4 角色 + 每个一次性 worker 都付 spawn 延迟与
   子进程；~20+ 工具定义进所有会话 prompt（token 成本）。
4. **stagehand 直接排除**：需独立原生模型 key（仅 OpenAI/Anthropic/Google/Groq/Cerebras
   目录内模型，DeepSeek 端点与 baseURL 覆盖不支持）。
5. **无须破只读铁律也无须新增外部依赖**：挂载落点在 profile 层 plugin add（boot-run.sh 的
   agent-team-profile 先例）；playwright-mcp 无 key；Chromium 可复用本仓
   scripts/lib/playwright.mjs 的 ms-playwright 缓存。

## 输掉的方案

- **现在采纳（profile 层挂 playwright-mcp）**：否决——experimental 合同税 + 团队形态
  成本，在缺口已被绕行策略对冲大半的现状下不划算；
- **preset 行挂载**：否决——三个 provider README 均要求 profile composition；preset
  子插件逐 agent 挂载属未测用法（违反"循 DSH 而不发明"）。

## 重启判据（2026-10-02 修订：C2 四绕行 → 五绕行——mcp-playwright 通道已采纳进研究通道）

- **C1（stable Provider 出现，机械可测）**：vendor pin bump 后
  `ls vendor/dsh/packages/experimental | grep browser-use` 为空（晋级去 experimental 前缀）
  或 dsh 安装镜像可选 bundle 清单出现 browser-use；
- **C2（选题驱动 pilot）**：新 run 的 leads 阶段 ≥2 条 A/B 级线索官方页实测 SPA 壳且
  `.md`/API/raw/存档/**mcp-playwright 通道**五绕行全失败 → 允许单场 scoped pilot（按 recipe
  挂、跑完即拆）；建议在 leads-gaps.md 立标签 `js-render-blocked-no-workaround` 使判据可 tally；
- **C3（累计阈值）**：该标签累计 ≥4 例（历史已 3 例）→ 升级为常设评估。

通道分工（与 [mcp-playwright 采纳 Note](../implemented/2026-10-02-mcp-playwright-adoption.md)）：
mcp-playwright 覆盖**单发渲染抓取**（先挂、零账号）；browser-use 留给**多步交互浏览**——C1/C2/C3
继续在池，pilot 触发时先试 mcp 通道再升 browser-use。

## 采纳 recipe（触发时照抄）

profile 组合追加两行（seam 在前）：`@deepseek-ai/dsh-browser-use` +
`@deepseek-ai/dsh-experimental-browser-use-playwright-mcp`（config：mode: launch、
headless: true、executablePath 指向本仓 ms-playwright Chromium）；安装走
`dev/boot-run.sh` 重建分支追加 `dsh plugin add`（版本与 pin 锁步）；外部依赖净增为零；
每次 pin bump 重验工具目录与 config 字段。
