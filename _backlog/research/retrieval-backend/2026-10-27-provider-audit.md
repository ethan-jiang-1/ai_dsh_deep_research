---
topic: DeepSeek 检索底座（Search API + 本地 fetch）的落地证据
intent: 为 D30（pack 默认翻到 deepseek-search-api + http）补齐工具级 A/B、真实语料自然实验、非品牌 query 盲评与 Fetch 抽样，并登记未关闭的缺口。
---

# 检索底座落地证据（2026-10-27）

> 消费者：[D30](../../../docs/decisions.md) / [D31](../../../docs/decisions.md) + pack 默认（[cordis.patch.yml](../../../packages/deep-research-pack/cordis.patch.yml)）。
> 前序（同 pin 的 API/provider 面与 5-query A/B）：[DeepSeek Search/Fetch API + DSH provider](../dynamic-research-dag/2026-10-21-deepseek-search-fetch-api.md)、
> [搜索 provider A/B](../dynamic-research-dag/2026-10-21-search-provider-ab.md)。
> 方法：开发 home 的 `DEEPSEEK_API_KEY` 直调官方端点（key 只进环境变量，不打印、不落盘）+ 真
> loader `--dump-config` + headless 真模型工具回合 + 本机会话库回扫。**未**做 429/402 压测。

## 0. 结论

- **Search API 是默认**：模型面每结果的信息量从「标题 + URL」变成「标题 + URL + snippet +
  发布日期」——真实会话语料里 Messages 默认路径（10-21 前）9,270 行只有 1.7% 带 snippet、0.4% 带日期
  （含标题内日期误命中）；Search API 试验窗 1,080 行是 98.5% / 67.0%。
- **质量不因此变好**：5 个非品牌 query × 8 条的盲评，Messages 略高但差异不显著（1.175 vs
  1.050，n=40；2 分项 10 vs 6）。Search API 的收益在**字段、延迟、成本、确定性**，不在排序质量。
- **Fetch 不单独切、改作回退**：DeepSeek Fetch API 在真实证据 URL 上 9/12 成功但 5–15s、内容带反斜杠转义
  （89–547 处/页），对 wikipedia / BBC / NYTimes / Medium / X / 知乎 / GitHub Pages 返回 404；
  本地 `http` 同类页 0.5–2.2s、真实状态码、markdown 干净。
- **剩余代价**：单 provider seam 下不能双跑；翻默认会丢掉每 query 约 1–5 条 Messages-only
  结果（本批 5 query：1/4/5/2/1），其中包含少数高分来源（q2 的 FPF、q5 的证券时报）。

## 1. 工具级 A/B（真模型回合，2026-10-27）

同一 prompt、同一 headless app（`--profile headless`），只差一条 `- id: web` patch：

| 运行 | 配置 | 工具结果形态（前 3 条来源） | 墙钟 |
|---|---|---|---|
| 对照 | base 默认（`deepseek-official` + `http`） | `- 标题链接`，无 snippet、无日期 | 8.6s |
| 试验 | `searchProvider: deepseek-search-api` + `http` | `- 标题链接 — 摘要 (2026-10-18T16:00:00+00:00)` | 7.9s |

墙钟含模型回合，不是搜索延迟；延迟见前序 5-query A/B（均值 6,004ms → 986ms）。试验运行的日期
是 Search API 的 `publishedAt` 原样，证明工具链（`web_search` → `ctx.web` → provider）真的落到
新 provider，不只是 composition 层。

## 2. 真实会话语料（自然实验）

本机 `runtime/harness-home/sessions`（1,995 个压缩会话；294 个含 `web_search` 结果），按会话
创建日（Asia/Shanghai）分桶：

| 桶 | 会话 | 来源行 | 带 snippet（` — `） | 带日期 |
|---|---|---|---|---|
| 2026-10-21 前（Messages 默认） | 233 | 9,270 | 159（1.7%） | 33（0.4%，含标题内日期误命中） |
| 2026-10-21/22（research profile 试验窗） | 27 | 1,080 | 1,064（98.5%） | 724（67.0%） |
| 10-23 之后（混合：默认 + 本次验证 + 回放） | 34 | 817 | 110（13.5%） | 69（8.4%） |

试验窗 27 个会话里 25 个带日期；10-21 前的 233 个会话只有 3 个出现过日期（33 行）。10-23 之后的
混合桶不作对照。这解释了为什么 Scout skill 写的「标题 + 摘要 + 出处三看」在真实 run 里做不出来
——摘要几乎不存在。

> 分桶口径的已知噪声：10-21 前有 3 个会话出现过日期（含 1 行标题里的版本日期误命中），来源
> 无法从会话文件反查 provider；不改变量级。

## 3. 质量盲评（5 个非品牌 query）

query：`MCP 服务器 安全扫描 误报率 研究` / `EU AI Act general-purpose AI obligations timeline` /
`磷酸铁锂 电池 能量密度 2026 量产` / `PostgreSQL 18 release features` / `创新药 license-out 交易 2026 中国`；
每 query 各取 8 条，去掉 snippet/日期后按 title+URL 盲评（2 = 直接相关且权威；1 = 相关但弱；
0 = 离题/列表页/内容农场/重复镜像），A/B 顺序随机、评分者不知道 provider。

| query | Search API 总分 / 2 分项 | Messages 总分 / 2 分项 |
|---|---|---|
| q1 MCP 安全扫描 | 6 / 0 | 8 / 1 |
| q2 EU AI Act | 9 / 1 | 11 / 3 |
| q3 LFP 电池 | 6 / 0 | 6 / 0 |
| q4 PostgreSQL 18 | 11 / 3 | 11 / 3 |
| q5 license-out | 10 / 2 | 11 / 3 |
| **合计（n=40）** | **42（均值 1.050）/ 6** | **47（均值 1.175）/ 10** |

- 差异方向对 Messages 有利，但样本小（40/侧、单次采样）、评分者单一，**不构成显著差异**；不能
  据此说 Messages 排序更好，也不能说 Search API 更差。
- 具体丢失项：q2 的 FPF 时间线与 Baker McKenzie GPAI 说明、q5 的证券时报——都是 2 分来源。
- 真正差距在**可判性**：Messages 的 8 条里本轮 0 条带 snippet，Scout 只能靠标题猜；Search API
  的 8 条全部带摘要与日期，30 秒去留判可执行。

## 4. Fetch API 抽样（真实证据 URL）

从一场已完成 run 的 `web_search` 结果里取 11 条真实证据 URL（OWASP / invariantlabs / simonwillison /
pluto.security / GitHub / PDF），外加 10 个常见站点：

| 样本 | 成功 | 延迟 | 内容 |
|---|---|---|---|
| 12 条真实证据 URL（OWASP / invariantlabs / simonwillison / pluto / zenodo / eprints / GitHub） | 9/12 | 4.9–14.9s | 3,616–26,297 字；转义符号 89–547 处/页 |
| 7 个主流站点（en/zh wikipedia、BBC、NYTimes、Medium、X、知乎） | 0/7 | 0.2–0.6s 即 404 | — |
| 10 个中文站首页（ithome / sohu / csdn / juejin / weixin / qq / 163 / caixin / yicai / chinanews） | 9/10（yicai 504） | 0.3–29s | 101–5,562 字；多个只有导航壳 |
| 3 个 PDF（eprints / zenodo ×2，含在 12 条内） | 0/3 | — | 404 |

对照本地 `web-fetch-http`（同机）：同类 HTML 页 0.5–2.2s（arxiv / GitHub / GitHub Pages / 36kr），返回
`html` + 真实状态码；wikipedia 在本机网络不可达（DNS 解析到非公网地址，provider 正确拒绝）。结论：
**Fetch API 的内容不是原始文本**（`\#`、`\-`、`\/` 这类转义），且多为服务端可达性所限的 404；
逐字摘录与表格单元格契约下不可用。

## 5. 成本与限流

- Search / Fetch 均按成功请求计费：$0.75 / 1,000 次（失败、空结果不计费）；**2026-11-01
  00:00（北京）起**，server-side tool call 也开始计费。
- Messages 搜索每 query 一个模型回合：本轮实测 2,156–10,692 input tokens、570–807 output
  tokens（另 1 次 server-side web_search 请求）；Search API 0 token。
- QPS：Search 100、Fetch 25（账号级，Fetch 另有 per-domain 限流）。本批 5 query 并发未触发 429。

## 6. 决定与未关闭缺口

**决定**（D30/D31）：搜索 = `deepseek-search-api`（base 出厂 provider，本包只加选择行）；
fetch = 本包回退 provider `deepseek-fallback-fetch`（本地 `web-fetch-http` 为主，取不到才打
Fetch API；见 §9）。

未关闭（显式登记，不装作已解决）：

1. **排序质量未胜**：本轮盲评 Messages 略高；若后续更大样本的盲评持续显示 Search API 明显更差，
   按 D30 的重议条件回看（届时优先考虑 vendor 是否提供多 provider/路由 seam）。
2. **`summary` / `need_content` / `authority` / `rerank_score` 未用**：vendor provider 只映射
   `snippet`；`need_content: true` 可一次拿 8 页全文（实测 5,892–6,278 字/页），但 DSH 没有开关。
   换 pin 时复核。
3. **互补性损失**：单 provider seam 不能双跑；每 query 丢 1–5 条 Messages-only 结果。
4. **429/402/5xx 错误面**：未压测；工具级错误文案沿用 vendor provider 的结构化错误。
5. **日期时区**：`date` 是 UTC RFC 3339；写进证据卡是否按本地时区归一未定（现状：原样展示）。
6. **Fetch 工具级 A/B**：本轮是 provider 抽样，不是同一 run 的文本对照；结论足够支撑“不单独切、
   只作回退”，不足以支撑“Fetch API 永远不能用”。
7. **回退的账号面**：只解析 `apiKeyEnv`；DeepSeek 账号登录（无 key）不触发回退。
8. **回退的 4xx 面**：不救 4xx；若真实 run 证明 403/空壳页常可被 API 救回，再按数据调
   `fallbackOnStatus`。

## 7. 复现

```sh
export DEEPSEEK_API_KEY="$(ruby -ryaml -e \
  'print YAML.load_file("runtime/harness-home/.credentials.yaml").dig("refs","DEEPSEEK_API_KEY")' 2>/dev/null)"

# 组合面：替换行确实生效（不是在 profile 里另加一行）
source dev/env.sh
dsh --profile web --patch "$PWD/dev/research.overlay.yml" --dump-config | grep -A3 '^- id: web$'

# 工具面：同 prompt 两次，只差 patch
printf '%s\n' '- id: web' '  config:' '    searchProvider: deepseek-search-api' '    fetchProvider: http' > /tmp/web.yml
dsh --profile headless --patch /tmp/web.yml "Call web_search once with the query 'DeepSeek 搜索 API 定价 每千次请求'. Then reply with the first three source lines exactly as the tool returned them, including any parenthesized date. No other text."
dsh --profile headless "Call web_search once with the query 'DeepSeek 搜索 API 定价 每千次请求'. Then reply with the first three source lines exactly as the tool returned them, including any parenthesized date. No other text."
```

盲评原始数据（runtime gitignored）：`runtime/smoke-workspace/quality-ab/{raw,blind,map}.json`；
会话语料统计为一次性 `zstd -dc | grep` 脚本，未落盘。

## 8. 证据与限制

- 官方文档：[Search & Fetch guide](https://api-docs.deepseek.com/guides/search/)、
  [Search API reference](https://api-docs.deepseek.com/api/search)。
- vendor：`packages/web/web-deepseek-api/{README.md,src/{search,fetch}.ts}`（`need_content: false`
  硬编码、`snippet` 单字段映射、fetch 丢弃 `title` 与目标状态码）、
  `packages/web/web-search-deepseek/src/provider.ts`（`cited_text` / `page_age` 映射）。
- 本批实测：Search 5 query 并行 + 盲评 40 条/侧；Fetch 21 个 URL；headless 2 个真模型回合；
  1,995 个会话文件回扫。**未做**：相关性盲评的重复采样/多评分者、429 压测、Fetch 表格页的
  逐单元格对照、真实 run 全流程（下一次 L4）。

## 9. 回退价值抽样（D31）

问题：本地 `web-fetch-http` 失败时，DeepSeek Fetch API 能救回多少？11 个 URL，两条腿各跑一次
（本地超时 15s；API 单次；未加回退编排，只测"谁会成功"）：

| URL | 本地 | API | 判定 |
|---|---|---|---|
| `http://github.com/deepseek-ai/deepseek-harness` | `WEB_REDIRECT_BLOCKED`（http→https 跨源） | 200，8,485 字 | **回退救回** |
| `http://arxiv.org/abs/1706.03762` | `WEB_PROVIDER_ERROR`（10.5s） | 200，3,415 字 | **回退救回** |
| `http://www.36kr.com/p/4032549827876480` | `WEB_REDIRECT_BLOCKED` | 404 | 两腿都失败 |
| `https://en.wikipedia.org/wiki/DeepSeek` | `WEB_BLOCKED_URL`（DNS 非公网） | 404 | 不回退（安全边界）+ 失败 |
| `https://www.bbc.com/news` | `WEB_PROVIDER_ERROR`（10.3s） | 404 | 两腿都失败 |
| `https://medium.com/@deepseek` | `WEB_PROVIDER_ERROR`（10.6s） | 404 | 两腿都失败 |
| `https://x.com/deepseek_ai` | `WEB_PROVIDER_ERROR`（10.1s） | 404 | 两腿都失败 |
| `https://zhuanlan.zhihu.com/p/123456789` | 200 → 403 | 404 | 两腿都失败（4xx 不救） |
| `https://www.nytimes.com/` | `WEB_PROVIDER_ERROR`（10.5s） | 404 | 两腿都失败 |
| `https://arxiv.org/pdf/1706.03762` | `WEB_UNSUPPORTED_CONTENT_TYPE` | 404 | 两腿都失败 |
| `https://www.163.com/` | 200，4.7s | 200，101 字 | 两腿都成功 |

**读法**：回退不是万能——救回的是"本地传输/重定向失败、但服务端可达"的两例；对主流站点
（API 也 404）与 PDF（两边都不支持）无收益；对安全策略拒绝（wikipedia 的 DNS 判定）**不该**
尝试。所以 D31 的边界是"本地取不到页面才试一次、安全拒绝不试"，而不是把 API 当第二引擎常驻。
