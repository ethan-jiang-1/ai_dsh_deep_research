# 检索底座翻默认：DeepSeek Search API + 本地 http fetch（D30）

> 状态：implemented

> 来源：用户 2026-10-27 指令（"DeepSeek 提供了 search / fetch API……确保我们充分利用"）+
> [provider audit](../../_backlog/research/retrieval-backend/2026-10-27-provider-audit.md)。
> **部分取代** [A0 Note](./2026-10-21-dynamic-research-dag-a0.md) 的「pack 默认搜索延后」条款；
> 该 Note 的其余决定（research-planning / 研究图谱 / fetch 不切）不变。

## 决定

- pack 的 `cordis.patch.yml` 加一条 `- id: web` **替换行**：`searchProvider: deepseek-search-api` +
  `fetchProvider: http`。不带 `name`（按 id 定向，避免新增 peerDependency，同 `llm-deepseek` 行
  形态）；**两字段必须同时重述**——Loader 的 replace 行 config 整体替换、不深合并，只写
  `searchProvider` 会让 fetch 面对 `http` + `deepseek-fetch-api` 两个可用 provider →
  `WEB_PROVIDER_AMBIGUOUS`。
- **search 换 API**，按证据强度排：
  1. **信息量**：真实会话语料里 Messages 默认路径（10-21 前）9,270 行只有 1.7% 带 snippet、0.4% 带日期；
     Search API 试验窗 1,080 行是 98.5% / 67.0%。Scout skill 的"标题 + 摘要 + 出处三看"此前没有摘要
     可看，只能靠标题猜或先 fetch。
  2. **成本/延迟**：Messages 每 query 一个模型回合（实测 2,156–10,692 input + 570–807 output
     tokens；前序 5-query 均值 6,004ms），Search API 一次直连（0.99s、0 token）。
  3. **确定性/错误面**：Messages 依赖模型产出 `web_search_tool_result` 块（本仓曾整场失败）；
     API 是结构化端点，错误码可读、可路由。
  4. **算子可证**：`site:` 两侧都生效，但 `after:` 只有 API 能自证（结果带发布日期）。
- **fetch 不单独切，改作回退**：Fetch API 在真实证据 URL 上 9/12 成功但 5–15s、89–547 处反斜杠
  转义/页，对 wikipedia / BBC / NYTimes / Medium / X / 知乎 / GitHub Pages 返回 404；本地 `http`
  同类 HTML 页 0.5–2.2s、真实状态码、markdown 干净。逐字摘录与表格单元格契约下 API 不可用。
  **后续**：本地失败时的 API 回退由 [D31 Note](./2026-10-27-fetch-fallback-provider.md) 落地
  （`deepseek-fallback-fetch` provider）。
- **角色面**：scout skill 补"查询算子"表 + "摘要 + 发布日期"去留判；analyst skill 补"定向补搜
  用算子"与 `retrieved_at` 的搜索结果日期校准信号。研究手册不动——注入载荷受字节/行预算约束，
  算子属角色方法论，放 skill 更合适。
- **记录**：D30；机械把守 = `tests/pack/presets.test.mjs` 的替换行断言。

## 输掉的方案

- **保持 `deepseek-official` 默认**：字段、延迟、成本三项都输，且 scout 方法论落不了地。A0 当时
  留的三条缺口（质量未评、query 品牌偏置、工具级未验）本轮补到"可判"：工具级已实证；5 个非品牌
  query 盲评显示质量差异不显著（不是 Search API 更好，而是不再有理由以质量为名保留 Messages）。
- **UI 开关（Use the new Web Search API）**：成对切 search + fetch，会把 fetch 拖到转义/404 的
  路径上；配置行可混合，且开关 off 时回落到部署默认（本组合）。
- **fetch 也切 `deepseek-fetch-api`**：见上——转义内容不是原始文本，服务端可达性还更差。
- **双跑两个 provider**：`ctx.web` 是单 provider 语义，vendor 明文拒绝隐藏优先级链；写路由
  provider 破坏 pack 的配置形态（D7），且等于在别人体系里埋暗行为。
- **扩 provider 拿 `summary` / `need_content` / `authority`**：本轮收益不匹配；先按 snippet +
  date 跑真实 run，证明"摘要不够"再议（重议条件登记在 D30）。
- **改研究手册**：注入载荷预算（18,944B / 200 行）下，算子条目会挤掉既有契约；放 skill。

## 实际跑过的验证

- `node dev/render-overlay.mjs` 重渲染（345 行）；`dsh --profile web --patch dev/research.overlay.yml
  --dump-config` → `- id: web` 下两行新值，`^- id: web$` 计数 = 1（替换不是新增），base 行名保留。
- `node --test tests/pack/presets.test.mjs` → 17/17 绿。新断言先对 HEAD 的 bundle 跑出红
  （pre-change `false` / working tree `true`）；删 `fetchProvider` 或改回 `deepseek-official`
  同样红（判别力，不是恒真）。
- headless 真模型回合 A/B（同 prompt，只差 patch）：默认 3 条来源 = 标题 + URL；加 patch =
  标题 + URL + 摘要 + `(2026-10-18T16:00:00+00:00)`。证明工具链落到新 provider，不只是
  composition 层。墙钟 8.6s → 7.9s（含模型回合，不作延迟结论）。
- 会话语料回扫（1,995 个压缩会话 / 294 个含检索结果）：试验窗 27 会话 1,080 行（98.5% snippet /
  67.0% date）vs 10-21 前 233 会话 9,270 行（1.7% / 0.4%）；试验前只有 3 个会话出现过日期。
- 5 个非品牌 query 盲评（40 条/侧，去 snippet/日期、随机 A/B）：Messages 1.175 vs API 1.050，
  2 分项 10 vs 6——差异不显著，记为已知代价。
- Fetch 三组抽样（12 条真实证据 / 7 个主流站点 / 10 个中文站首页）：真实证据 9/12 成功但
  4.9–14.9s、89–547 转义/页；主流站点 7/7 404；中文首页 9/10 但多为导航壳。详见 audit §4。

## 环境状态 / 残余

- 质量盲评样本小（单评分者、单次采样）；更大样本若持续显示 Search API 排序更差，按 D30 重议。
- `summary` / `need_content` / `authority` / `rerank_score` 仍被 vendor provider 丢弃；换 pin 时
  复核是否新增开关（`need_content: true` 实测可一次拿 8 页全文，5,892–6,278 字/页）。
- 单 provider seam 的互补性损失（每 query 1–5 条 Messages-only 结果，含少量高分来源）无法在本层
  消除；出现"覆盖面被质疑"的真实 run 再议。
- 日期是 UTC RFC 3339，写进证据卡是否按本地时区归一未定（现状：原样展示）。
