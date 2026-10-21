---
topic: DeepSeek Search / Fetch API 与 DSH provider
intent: 为宽搜/深搜的搜索底座选型提供官方 API、DSH provider、切换方式、限制与成本的同 pin 证据。
---

# DeepSeek Search / Fetch API + DSH provider（2026-10-21）

> 服务 = [_backlog/issues/2026-10-21-dynamic-research-dag.md](../../issues/2026-10-21-dynamic-research-dag.md)。
> 方法 = 读 DeepSeek 官方 API 文档 + 本仓 `vendor/dsh` 的 `web-deepseek-api` provider 源码/README +
> base bundle 行；**未发真实请求**，成本/限流以官方文档为准，行为以 provider README 为准。

## 0. 一句话结论

- **DeepSeek 已公开 Search / Fetch API**：`POST https://api.deepseek.com/v1/tools/search` 与
  `/v1/tools/fetch`，Bearer 鉴权，和 Chat API 同一把 `DEEPSEEK_API_KEY`。
- **DSH 已经有官方 provider**：`@deepseek-ai/dsh-web-deepseek-api` 注册 `deepseek-search-api` 与
  `deepseek-fetch-api`；base bundle 已挂，只是默认选择仍是 Messages 搜索 + 本地 HTTP fetch。
- **不需要装新东西**：改 `web.searchProvider` / `web.fetchProvider`（或打开 Web search 设置里的
  “Use the new Web Search API”）即可；仍是 DSH 原生 provider。
- **建议先 search API + 本地 HTTP fetch**：Search API 直接、便宜、支持 query 操作符；Fetch API
  返回 Markdown，但“逐字摘录/表格”保真度需要先实测，再决定是否替换本地 fetch。
- **成本**：每 1,000 次成功请求 $0.75（Search / Fetch 同价）；通过 DSH / Claude Code / Codex 的
  server-side tool calls 目前免费，**2026-11-01 00:00（北京时间）开始计费**。QPS：Search 100、
  Fetch 25（按账号，另加 Fetch 的 per-domain 限流）。

## 1. 官方 API（DeepSeek Docs）

来源：[Search & Fetch guide](https://api-docs.deepseek.com/guides/search/)、
[Search API reference](https://api-docs.deepseek.com/api/search)、
[Fetch API reference](https://api-docs.deepseek.com/api/fetch)。

### Search

请求字段：`query`（1–128 字符）、`count`（1–50，默认 10）、`ori_question`（触发搜索的用户原问，
≤128 字符）、`localization`（可选 IP）、`need_content`（默认 false；true 时返回 `content`）。

响应每条：`rerank_score`（0–3，≥1.5 高质量）、`title`、`url`、`snippet`（约 100–200 字）、
`summary`（约 600–800 字，给模型读）、`content`（`need_content`）、`site_name`、`site_icon`、
`date`、`authority`（0–4，≥3 高权威；-1 未知）。

**Query 操作符**（原样传给搜索引擎，对本仓宽搜价值很高）：

- `site:` / `-site:`（多站用空格 + `OR`）
- `-term` / `-"exact phrase"` / `"exact phrase"`
- `lang:zh,en`
- `after:2025` / `after:2025-01-01` / `before:2026` / `before:2026-06-01`

### Fetch

请求 `url`（≤8192 字符，HTTP/HTTPS，不能带用户名/密码）；响应 `{ title, content }`，`content` 是
页面 Markdown。目标站不可用/被安全策略拒绝/无可提取内容 → 4xx/5xx；Fetch 是只读。

### 错误 / 计费 / 限流

- 400 请求错；401 key 错；402 余额不足；403 Fetch 安全策略拒绝；404 取不到可用内容；408 读体超时；
  413 体太大；429 QPS 超限；500/504 服务/下游错误。408/429/5xx 可等待重试；402 先充值；其他 4xx
  不改请求不要重试。
- 按**成功请求**计费，不按 token/结果数；Search 必须非空 `results`、Fetch 必须返回内容才计费；
  失败/空结果/超时不计费。
- QPS：Search 100、Fetch 25；账号级，另加 Fetch per-domain 限流。
- 当前免费窗口：通过 DeepSeek Harness / Claude Code / Codex 的 server-side tool calls 免费，
  2026-11-01 00:00 Beijing 起按上表计费。

## 1.5 实测（2026-10-21，直接 API 探针）

用开发 home 的 `DEEPSEEK_API_KEY` 直接 POST 官方端点（不打印密钥；不是 DSH provider 集成测试）：

- **Search** `query="DeepSeek V4 release"`, `count=3`, `need_content=true`：HTTP 200，**1.5s**，
  18.5KB；结果含 `title/summary/snippet/content/date/authority/rerank_score`；第一条
  `snippet=287`、`summary=2064`、`content=2243` 字，`authority=3`、`rerank≈2.73`。
- **Search** 同 query、`need_content=false`：200，9.9KB；`summary` 仍为 2064 字，`content=0`。
  → **DSH provider 只映射 snippet，summary 被丢掉**。
- **Query 操作符**：`site:github.com` 返回 GitHub 页；`lang:zh` 返回中文页；
  `after:2026-06-01 before:2026-10-01` 正常返回。操作符原样转发，Scout 可用。
- **Fetch** `https://api-docs.deepseek.com/guides/search/`：200，**1.1s**，10.3KB；返回
  `title + content`（Markdown）。
- **Fetch 保真问题**：`https://api-docs.deepseek.com/quick_start/pricing` 返回 4,055 字，其中
  **387 个反斜杠**；正文是 `Search \/ Fetch`、`https\:\/\/…`、`\#`、`\,`、`\-` 这类转义
  Markdown。**这不是原始页面文本**；直接拿它做“逐字摘录”会引入转义符。表格页 `|` 还在，但
  转义/空白已被 Markdown 序列化改写。→ 结论：**Search API 可用；Fetch API 先别替换
  `web-fetch-http`**，除非先做转义归一/对照原页面，并接受它不是原始文本。
- **DSH provider 实测（不只是官方 API）**：直接实例化 `vendor/dsh/packages/web/web-deepseek-api/lib`
  的 `DeepSeekSearchApiProvider`——`id=deepseek-search-api`、`available=true`、**1.7s / 3 条**，
  返回字段 `url/title/snippet/publishedAt`（summary 被 provider 丢掉）；`DeepSeekFetchApiProvider`
  对同一价格页 **0.9s / 3,250 字 / 226 个反斜杠**，`statusCode=200`、`url=请求 URL`。provider
  映射与源码一致，Fetch 的保真问题在 provider 层同样存在。

## 2. DSH provider（本仓已可用）

- 包：`vendor/dsh/packages/web/web-deepseek-api/`；provider id = `deepseek-search-api` /
  `deepseek-fetch-api`；同一 `DEEPSEEK_API_KEY`。
- base bundle 行（`packages/bundle/base/cordis.patch.yml:467-481`）：
  ```yaml
  - id: web
    config:
      searchProvider: deepseek-official   # 默认：Messages 搜索
      fetchProvider: http                 # 默认：本地 HTTP fetch
  - id: web-deepseek-api
    config:
      apiKeyEnv: DEEPSEEK_API_KEY
  ```
- 切换方式：
  1. **UI（最简）**：Plugins > Built-in plugin settings > Web search > “Use the new Web Search API”
     → 一次选中 `deepseek-search-api` + `deepseek-fetch-api`；这是全有/全无。
  2. **配置（可混合）**：在 profile / pack 的 patch 层写
     ```yaml
     - id: web
       config:
         searchProvider: deepseek-search-api
         fetchProvider: http        # 或 deepseek-fetch-api
     ```
     `web-deepseek-api` 行已有，无需新增；`- id: web` 是**替换 base 已有行 config**，不是新增行。
- 认证：API key 用 `Authorization: Bearer`；DeepSeek 账号路由可用 `x-dsh-auth-token`；provider
  每次操作解析凭据，不需要重启。
- 工具面：`web_search` / `web_fetch` 仍由 `tool-web` 提供，四个 preset 已经挂着；切 provider
  不需要改 preset/工具 schema。
- **provider 当前限制（重要）**：
  - Search 固定 `need_content: false`，只消费 `snippet`；**不消费** `summary` / `content` /
    `site_name` / `site_icon` / `authority` / `rerank_score`。
  - 不暴露 `localization`；`ori_question` 由 provider 自动带最新人类 prompt（≤128 字符）。
  - Fetch 返回请求 URL + HTTP 200，**不暴露目标站状态码/最终重定向 URL**；provider 丢弃 API 返回的
    `title`；页面内容是 Markdown。
  - 无自动重试/fallback；429/5xx 由调用方/模型决定是否重试。
  - 这些是 provider 的取舍，不是官方 API 的上限；要 `summary`/`authority`/`content` 需要扩展
    provider（小代码）或直接调用 API。

## 3. 对本仓宽搜/深搜的影响

**宽搜（Scout）**

- Search API 的 query 操作符直接提升“覆盖谱系”：`site:` 限定官方域、`lang:` 覆盖中英、`after:`
  控时效、`-site:` 排除内容农场、`"exact phrase"` 锁定原句。
- 一次搜索只花一次直接请求，不再是一个完整模型轮次；同样预算下可以多跑几组 query 家族/检索器，
  这正是宽搜“加深”的方式。
- 但 provider 只给 snippet（100–200 字），不给 summary/content；Scout 仍然要 `web_fetch` 抓全文
  才能做 A–D 质量判。snippet 足够“发现”，不够“取证”。
- `authority`/`rerank_score` 不暴露 → Scout 的 A–D 仍靠人工/模型判断；未来可扩展 provider 把
  `authority` 映射进结果，但这是增强，不是前置。

**深搜（Analyst）**

- Search API 只负责发现；证据仍要 `web_fetch` 逐页取回。当前本地 `web-fetch-http` 给原始文本，
  对“逐字摘录/表格按单元格”最稳。
- 若把 `fetchProvider` 换成 `deepseek-fetch-api`：返回 Markdown，文本引用通常可用，但**表格/空白/
  转义可能被转换**；本仓 evidence 契约要求逐字、表格按单元格，必须先拿 5–10 个含表格的页面做
  A/B，对比 Markdown 与原始 HTML/文本的差异，再决定是否全面切换。
- Fetch API 不暴露目标状态码/最终 URL；`source_url` 仍是请求 URL，重定向页的“最终地址”不可见。
  对本仓 `source_url` 契约是潜在风险，需在实测里确认。

## 4. 建议路径（不引新依赖）

1. **先只切 Search**：在 research profile 的 `cordis.patch.yml` 写 `- id: web` 覆盖
   （`searchProvider: deepseek-search-api` + `fetchProvider: http`）；**不要用 UI 开关**——它把
   search+fetch 成对切。A/B 一 query（10 vs 10）：Messages 5.9s / 10 条 / 无 snippet+date；
   Search API 1.55s / 10 条 / 有 snippet+date；URL 重叠 2 条。不是质量结论，pack 默认前跑
   5–10 query。
2. **再测 Fetch**：已做 1 个价格页探针（4,055 字里 387 个反斜杠）；还需 5–10 个页面（含表格/
   中文/重定向），比较 `deepseek-fetch-api` 的 Markdown 与 `web-fetch-http` 的文本，重点看逐字
   摘录与表格单元格。**在归一/对照通过前，不要替换 `web-fetch-http`。**
3. **决定默认**：Search API 实测可直接用（延迟/字段/操作符都成立）；先 profile 覆盖，pack 默认
   等 5–10 query A/B 通过后再定。Fetch 保持本地，等保真测试通过再决定是否两个都切。
4. **不急着扩展 provider**：官方 API 的 `summary`（实测 2,064 字）被 DSH provider 丢掉；
   `authority`/`rerank_score` 也没映射。这些是增强项；等真实 run 证明“snippet 不够用”再加，
   避免又造一层。

## 5. 证据与限制

- 官方文档：上列三条 URL；端点、字段、操作符、计费、QPS 均以文档为准。
- DSH provider：`vendor/dsh/packages/web/web-deepseek-api/README.md`、`src/index.ts`；
  base bundle 行 `packages/bundle/base/cordis.patch.yml:467-481`；设置页
  `packages/client/ui-settings-web-search/README.md`、`src/client/web-search-card-controller.ts`。
- **已实测（直接 API + DSH provider）**：Search 1.5–1.7s / Fetch 0.9–1.1s；`site:`/`lang:`/
  `after:`/`before:` 可用；Fetch Markdown 有明显反斜杠转义（价格页 226–387 个）。**未做**
  Messages 搜索 A/B、5–10 页 Fetch 全量对照；429 行为、免费窗口的实际计费口径仍要在真实 run
  里验证。
- **成本提醒**：2026-11-01 起按成功请求计费；宽搜加深会增加请求数，但每次比 Messages 搜索便宜
  （无辅助模型 token）；仍要在 plan 的 budget 里记搜索/抓取次数。
