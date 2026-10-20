---
status: 已修
severity: P2
opened: 2026-10-15
---

# BUG-029：evidence-audit 的溯源语料漏两类真实取证路径（编码/协议相对形态 · 非 web 工具的抓取）——CRITICAL「伪造链接」档假红率 3/5

> 状态：已修 — 用户 2026-10-16 拍板类别②取 (a)「纳入浏览器/MCP 取回」并按推荐次序批准开工（BUG-029 → readiness → 处置）；修复进树、修复判据五条全绿（契约 16/16 · 全量 52 场 CRITICAL 79→73 且按 URL 身份新增 0 · nvidia 场 exit 1→0、门A RED→PASS），去向 = [evidence-audit 语料与形态 Note](../../../notes/implemented/2026-10-15-evidence-audit-url-forms-and-corpus.md)｜发现：2026-10-15（复核 BUG-024 收卡盘点牵出的两场审计 CRITICAL 时实证）

## 症状

`evidence-audit` 对证据声称的 `source_url` 报 **CRITICAL「伪造链接/未溯源——域名与 URL 都未出现在任何 web 工具事件里」**，但该 URL 实际**出现在本 run 自己的 web 工具事件里**——只是以审计抽取器不认识的形态出现。后果：正确的 MAJOR 档（"见过但没抓过"）被升级成 CRITICAL（"伪造"），CRITICAL 又直接打红 node-gate **门A**，把一场真实交付判成不可交付；且"伪造"标签会误导处置（弃用/重研究 vs 补一次抓取）。

## 实证（2026-10-15，`drt_nvidia-dc-gpu-share`）

- 审计报告行：`- **companieshistory-idc-81pct-claim.md** [伪造链接/未溯源] 域名与 URL 都未出现在任何 web 工具事件里：https://www.companieshistory.com/ai-market-share-by-company/`
- 目标 URL 在该 bundle **自己的 lead 会话**（`baffd6ea…` / `0772247d…`，写 `drt_nvidia-dc-gpu-share/question.md`）的 **`web_fetch` 结果**里出现 7 次，形态只有三种：
  1. `//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.companieshistory.com%2Fai%2Dmarket%2Dshare%2Dby%2Dcompany%2F&r…`（**百分号编码**的重定向参数）
  2. `…ip3/www.companieshistory.com.ico)`（favicon，**无 scheme**）
  3. markdown 链接**文本**为裸域名（`www.companieshistory.com/ai-market-share-by-company/`），href 为**协议相对**（`//duckduckgo.com/l/?uddg=…`）——两者都不是 `http(s)://` 字面形态（示例故意不写链接语法，避免触发 md-links 门禁——本轮实测教训）
- 抽取器形态：`URL_RE = /https?:\/\/[^\s>)）』」"'\]，。；`（\\]+/g`——**要求字面 `http(s)://`、不解 `%XX`、不认 `//host/…`**。
- 官方语料构建器实测（`buildCorpus(sessionsRoot, slug, readLog)`）：`drt_nvidia-dc-gpu-share` 语料窗 54/1763 文件、web 事件 471、**webUrls 2696 条**、fetchedOk 146、fetchFailed 29 —— **含 `companieshistory` 的条数 = 0**；而原始 payload 字符串命中 7 条（即上文三形态）。
- 该 bundle 的 MAJOR 列表本就写着 `source_url 真抓过 14（未抓 3）`——即审计**自己**已在 MAJOR 档记录了"未抓过"，CRITICAL 属同事实的重复且升格误判。

## 影响面（全仓复核，2026-10-15）

全仓 `伪造链接/未溯源` CRITICAL 共 **5 条 / 4 场**，逐条复核：

| bundle | 条数 | 复核结论 | 证据 |
|---|---|---|---|
| `drt_nvidia-dc-gpu-share`（在飞） | 1 | **假红（类别①：抽取形态）** | 该 URL 在本 run 自己的 `web_fetch` 结果里出现 7 次，仅以 %XX 编码/协议相对/裸域名形态；容错解码后抽出 9 条命中 |
| `drt_cn-llm-pricing-2026-10`（归档） | 2 | **假红（类别②：非 web 工具取证）** | 该域名出现在本 run **语料窗内**会话的浏览器 MCP 工具结果里（`mcp__playwright__browser_run_code_unsafe`，3 call + 4 result；原文为页面 HTML：`<title>千问AI平台</title>` 与 `scripts:["//q.alyasset.com/npm.combo/…"]`）——**边界（2026-10-15 自查修正）**：日志证明的是"该域名出现在**浏览器取回的内容**里（作为页面脚本源）"，**未**证明"浏览器单独抓取过该 URL"；`isWeb` 只认 `web_fetch`/`web_search`，故审计既看不到该域名、也无法按"内容引用 vs 主动抓取"分级——这正是类别②要拍板的契约点 |
| `drt_ai-coding-security`（在飞） | 1 | 成立 | 该域名仅出现在**别场** mcp-* 会话的 web_search 结果里；跨 run 语料窗设计上不予作证（有意行为） |
| `drt_geometry-coaching`（归档） | 1 | 成立（另一类问题） | 证据里的 `source_url` 本身就是 `https://…` 占位串——证据质量缺陷，非抽取缺陷 |

→ **CRITICAL 档假红率 3/5（60%）**：一个专职"防伪造"的档位把真实交付标成伪造，并因此打红门A。

**类别②的契约问题（需一并拍板）**：本仓已采纳 MCP Playwright（[2026-10-02 采纳 Note](../../../notes/implemented/2026-10-02-mcp-playwright-adoption.md)），浏览器抓取是**真实的取回路径**。修法有两条取向：**(a)** 把浏览器/MCP 类抓取纳入溯源语料（推荐——与"是否真取回"的判据目的同向）；**(b)** 明确排除并在报告里如实标注"经非 web 工具取回，本工具不核验"，避免误标伪造。无论取哪条，都不得让"确实取回过"被标成"伪造"。

## 对照（同批另一场，**不是**本缺陷）

`drt_ai-coding-security` 的 `open-vsx.org` CRITICAL：全量日志里该域名仅 1 次命中，落在**别场**（`drt_mcp-security-landscape`/`drt_mcp-hosts-governance`/`drt_mcp-server-ecosystem`）的 `web_search` 结果里。`buildCorpus` 的**语料窗**（只认提及本 bundle slug 的会话）是**有意设计**（"跨 run 会话里的 URL 不得为本 run 作证"，防污染实证），故该场"本 run 未取证"的判定**成立**；仅报告措辞"任何 web 工具事件"应限定为"本 run 的任何 web 工具事件"。

## 修法可行性预验证（scratch，未改仓；2026-10-15）

对 `baffd6ea…` 会话（nvidia 场，本 run 自己的 lead 会话）的 8 条含域名 tool/result payload：

| 抽取方式 | 命中该域名 |
|---|---|
| 现行 `URL_RE` 原样 | **0** |
| **容错逐 `%XX` 解码副本**后再抽取 | **9**（含 `https://www.companieshistory.com/ai-market-share-by-company/&rut=…`） |
| 负例（凭空域名 `not-in-log.invalid`） | 0 ✓（不造 URL） |

**坑（本轮自己踩到并记录）**：先试的"整串 `decodeURIComponent(payload)`"在真实 HTML payload 上**抛错**（存在孤立 `%`），被 try/catch 吞掉后**静默退化为原串 → 0 命中**——修法必须是**逐 `%XX` 序列容错解码**，不能整串解码。

## 根因（已实测确认）

URL 抽取只认字面 `http(s)://` 形态，未处理三类真实存在的引用形态：**%XX 百分号编码**（搜索引擎重定向参数 `uddg=`）、**协议相对 `//host/…`**、**无 scheme 的裸域名/链接文本**。搜索列表页（本仓 `web_fetch` 的常见目标——DuckDuckGo/Bing HTML）恰好只用这些形态承载目标 URL。

## 修复判据（拍板后按此验收）

1. **抽取器扩形态**（`scripts/lib/evidence-audit-core.mjs` 的 `URL_RE`/`urlsOf`）：对 payload 做**逐 `%XX` 容错解码**副本再抽取（**不得整串 decodeURIComponent**——真实 payload 会抛错并静默失效，见 §修法可行性预验证）；识别**协议相对 `//host/…`** 与**裸域名/链接文本**（后者只用于"域名级出现"判定，不冒充 URL 级命中）。
2. **档位分离不被抹平**：仍须保留"**见过但未抓过**"= MAJOR 档（`fetchedOk` 不含它），只有"本 run 语料窗内域名与 URL 都不出现"才 CRITICAL——即本修法**不得**把 MAJOR 洗成通过。
3. **真实数据红→绿**：`drt_nvidia-dc-gpu-share` 复跑后该条从 CRITICAL 降为 MAJOR（本 run 未直接抓取该页）；`drt_cn-llm-pricing-2026-10` 两条按拍板取向处理（(a) 纳入浏览器 MCP 取证 → 降为通过/MAJOR；(b) 如实标注"经非 web 工具取回，不核验"）；`drt_ai-coding-security` 与 `drt_geometry-coaching` 维持（前者措辞限定"本 run"，后者属证据质量问题）。
4. **反证**：注入"确实从没出现过的 URL"用例仍判 CRITICAL；注入"出现在搜索结果里但未抓过"用例判 MAJOR（两条负例钉住档位边界）。
5. L0 全绿 + 37 场归档 bundle 复跑对账（记录档位迁移清单）。

## 参考

- 触发场景卡：[未闭合 bundle 处置](../settled_issues/2026-10-15-unclosed-bundles-disposition.md)（本卡结论直接改其 A 类前两场的定性）；
- 审计契约三条断言 = `scripts/run-gates/evidence-audit.mjs` 头注；
- 相邻失败类：BUG-027/028 族"机械面自身可信度"。

## 修复关联

2026-10-16 落地（用户拍板：类别②取 (a)「纳入浏览器/MCP 取回」，并按推荐次序批准开工）：

- **判据核** = `scripts/lib/evidence-audit-core.mjs`：`urlsOf` 加"逐 `%XX` 序列容错解码副本 + 协议相对 `//host` 归一"，
  新增 `hostsOf` 裸域名（只喂域名级判定）；`buildCorpus` 把 **MCP 工具结果**纳入语料（调用参数不入——自证面）；
  `fetchedOk` 仍只认 `web_fetch`（档位不升格）；CRITICAL / 仅域名 / `source_url 未抓取` 措辞按证据强度改写并限定"本 run"；
- **驱动壳头注**（三条断言）同 diff 同步；**契约测试** `tests/run/evidence-audit.test.mjs` 新增三条 + 负例留证块；
- **决定记录** = [evidence-audit 语料与形态 Note](../../../notes/implemented/2026-10-15-evidence-audit-url-forms-and-corpus.md)
  （决定 / 输掉的方案 / 全量对账 / 环境状态）；
- **修复判据逐条**：①形态扩宽 ✓（正例四形态）②档位分离不被抹平 ✓（负例两条 + 全量 `source_url 未抓取` 72→72）
  ③真实数据红→绿 ✓（nvidia 1→0 且门A RED→PASS、cn-llm-pricing 4→0、ai-coding-security 维持且措辞限定"本 run"、
  geometry-coaching 维持）④反证 ✓（两路注入各看红；"确实从没出现过"用例仍判 CRITICAL）⑤L0 全绿 + 对账 ✓
  （52 场 = 活跃 14 + 归档 38：CRITICAL 79→73，按 URL 身份新增 0；原判据写"37 场归档"，实际归档 38 场一并扫）；
- **下游**：A 类前两场定性已随本修复更新（见触发场景卡）。
