# evidence-audit：溯源语料扩到取回路径、URL 抽取扩到真实承载形态

> 状态：implemented

## 决定

`evidence-audit` 的两面各放宽一格——**放宽的是"读得出"，不是"放得过"**（三档判据与阈值零变化）：

1. **抽取形态**（[evidence-audit-core](../../scripts/lib/evidence-audit-core.mjs) 的 `urlsOf`）：对 payload 取
   **原串 + 逐 `%XX` 序列容错解码副本**各扫一遍；URL 正则之外补两条——协议相对 `//host/…`（归一成
   `https://…`；前视排除 `:` 与 `/`，否则会从 `http(s)://` 里重复切一份）与裸域名/链接文本（`hostsOf`）。
   **裸域名只喂"域名级出现过"判定**（`hosts` 集），不产生 URL 级命中："域名见过" ≠ "该 URL 取回过"。
2. **取证路径**（`buildCorpus`）：语料从"`web_fetch`/`web_search` 的 call + result"扩到 **+ MCP 工具结果**
   （类别②取 (a)：本仓已采纳本地 Playwright MCP，浏览器取回是真实取证路径）。**MCP 调用参数不进语料**：
   web 工具的调用参数**就是取回目标**（`url`/`query`），MCP 的参数是 agent 自撰的代码/文本——把"脚本里写过
   一个 URL"算作取证就是自证，而自证的审计等于不存在。裸域名同理只从结果里抽。
3. **抓取强度不升格**：`fetchedOk` 仍只认 `web_fetch` 的 `Fetched …` 成功形态；MCP 内容里出现某 URL
   不升级成"该 URL 被抓过"。`source_url 未抓取`（MAJOR）的措辞按证据强度分四档如实写——
   抓取失败 / 取回语料里出现过未抓 / 仅域名出现过 / 本 run 从未出现过。
4. **措辞限定"本 run"**：CRITICAL 与"仅域名"档文案写明"本 run 语料窗内"。跨 run 语料窗是**有意设计**
   （窗外会话不得作证），说"任何 web 工具事件"会把"别的 run 搜到过"读成"哪儿都没有"。

## 输掉的方案

- **整串 `decodeURIComponent(payload)`**：真实 HTML payload 含孤立 `%`，抛错被 try/catch 吞掉后**静默退化**
  成原串 → 0 命中（本轮先踩到的坑，见缺陷卡 §修法可行性预验证）。逐序列解码把坏序列隔离在原样、好序列照常解出。
- **MCP 调用参数一并入语料**（与 web 工具"对称"）：扩大自证面——agent 只在脚本里写一个 URL 就能让它"可溯源"。
- **MCP 取回计入 `fetchedOk`**：把"浏览器内容里引用过"升格成"抓取过"，抹平 MAJOR 与通过之间的档位差。
- **裸域名算 URL 级命中**：链接文本里提过域名即过审，等于把"域名级"这一档取消。
- **取向 (b)：明确排除非 web 工具、报告如实标注"本工具不核验"**：假"伪造"标签能消，但真取回仍进不了
  任何档位——与该档位"防伪造"的判据目的反向（用户 2026-10-16 拍板取 (a)）。

## 实际跑过的验证

- **契约测试先红后绿**：[tests/run/evidence-audit.test.mjs](../../tests/run/evidence-audit.test.mjs) 新增三条
  （形态正例四形态 / 档位边界负例 / 措辞限定），实现前 3 条红 → 实现后 **16/16 绿**。
- **两路注入反证**（各自还原 → 绿，留证块在测试文件头）：①`urlsOf` 去容错解码副本 → 两条新测试红；
  ②`isMcpTool` 恒 false（MCP 结果不进语料）→ 两条新测试红（`ev-mcp` 判"域名与 URL 都未出现"）。
- **全量真数据对账**（52 场 = 活跃 14 + 归档 38，只读扫描，同码序 before/after）：
  **CRITICAL 79 → 73**（−6：`drt_nvidia-dc-gpu-share` 1、`drt_cn-llm-pricing-2026-10` 4、`drt_cn-us-cpu-gap` 1），
  **按 URL 身份比对新增 CRITICAL = 0**；URL 级命中 5010/5305 → **5130/5379**；
  `MAJOR 仅域名可溯源` 226 → 186；**`MAJOR source_url 未抓取` 72 → 72**（无洗白、无升格）；
  19 场有迁移、33 场逐字不变。
- **真入口复跑**（`scripts/run-gates/evidence-audit.mjs`）：nvidia 场 CRITICAL 1 → 0、exit 1 → 0，
  `node-gate` **门A RED → PASS**（原假红正是它打红的）；`drt_ai-coding-security` 维持 1 条 CRITICAL
  （判定成立，措辞已限定"本 run"）；`drt_geometry-coaching` 维持 1 条（占位串 `https://…`，属证据质量问题）。
- **L0**：`pnpm verify` 全绿、`pnpm test` 464/464 绿。

## 环境状态

只动 keyless 审计面（判据核 + 驱动壳头注 + 契约测试 + 本 Note）：无 pack 公共行为改动、无门禁阈值变化、
不新增凭据面；未跑真模型档（不需要）。

## 关联

- 缺陷卡 = [BUG-029](../../_backlog/_archived/fixed_bugs/BUG-029-evidence-audit-url-extraction-encoded-forms.md)；
- 下游处置卡 = [未归档 bundle 处置](../../_backlog/_archived/settled_issues/2026-10-15-unclosed-bundles-disposition.md)
  （A 类前两场的定性随本修复更新）。
