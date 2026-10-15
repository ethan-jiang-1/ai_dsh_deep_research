---
status: 等人拍板
severity: P2
opened: 2026-10-15
---

# BUG-029：evidence-audit 的 URL 抽取漏百分号编码与协议相对形态——搜索列表里见过的 URL 被误判为「伪造链接」CRITICAL

> 状态：等人拍板（根因已实测确认 + 修法选定 + 修复判据写就；**修复触及 run 机械门判据 → 不自授权**，按缺陷通道转此态）｜发现：2026-10-15（复核 BUG-024 收卡盘点牵出的两场审计 CRITICAL 时实证）

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
3. **真实数据红→绿**：`drt_nvidia-dc-gpu-share` 复跑后该条从 CRITICAL 降为 MAJOR（"未抓过"），门A 复判随之变化；`drt_ai-coding-security` 的 open-vsx 条**维持** CRITICAL（本 run 未取证），措辞改为"本 run 的 web 工具事件"。
4. **反证**：注入"确实从没出现过的 URL"用例仍判 CRITICAL；注入"出现在搜索结果里但未抓过"用例判 MAJOR（两条负例钉住档位边界）。
5. L0 全绿 + 37 场归档 bundle 复跑对账（记录档位迁移清单）。

## 参考

- 触发场景卡：[未闭合 bundle 处置](../issues/2026-10-15-unclosed-bundles-disposition.md)（本卡结论直接改其 A 类前两场的定性）；
- 审计契约三条断言 = `scripts/run-gates/evidence-audit.mjs` 头注；
- 相邻失败类：BUG-027/028 族"机械面自身可信度"。
