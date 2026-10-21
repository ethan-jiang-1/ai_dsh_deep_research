---
topic: 搜索 provider A/B：Messages 搜索（deepseek-official）vs DeepSeek Search API（deepseek-search-api），5 query
intent: 用同 pin 的 provider 级实测判定 search-only 配置是否成立、pack 默认是否已有足够证据、还缺什么。
---

# 搜索 provider A/B：Messages vs Search API（2026-10-21）

> 服务 = [_backlog/issues/2026-10-21-dynamic-research-dag.md](../../issues/2026-10-21-dynamic-research-dag.md)
> （搜索 provider 卡的 F5 验证面）。
> 方法 = **直接实例化 vendor 构建产物的两个 provider**（不经 `ctx.web`、不发 DSH 模型回合），
> 5 条固定 query 各跑一遍；key 从开发 home 的 `.credentials.yaml` 经 Ruby 读入环境变量，**全程未打印**。
> 配置面 = `runtime/harness-home/profiles/research/cordis.patch.yml` 的 `- id: web` 覆盖，
> 已用 Ruby YAML 解析 + `dsh --profile research --dump-config`（真 loader）双证。

## 0. 一句话结论

- **search-only 走配置成立（composition 级）**：`- id: web` 替换 base 行 config，dump-config 显示
  `searchProvider: deepseek-search-api` + `fetchProvider: http`，且 `web` 行仍只有一条；
  不需要 UI 开关（那是 search+fetch 成对切，F1）。
- **5 query A/B 的机械项全过**：延迟均值 **6,004ms → 986ms（6.1×）**；条数 10 vs 10；
  snippet **0/50 → 50/50**、publishedAt **0/50 → 50/50**；失败 **0**。
- **但 pack 默认现在仍不翻**：缺三件证据——相关性/权威性质量未评、query 集全是 DeepSeek 品牌词
  （域偏置）、工具级路径（`web_search` → provider → service 截断/ori_question/错误面）未验。
  pack 默认是持久公共行为，按 F5 要 A/B **加用户点头**；本次只把 trial 放在 profile 层。
- 两源**互补而非替代**：URL 重叠 4–7（均 5.2），并集 13–16；翻默认会丢掉每 query 约 4.8 条
  Messages-only 结果。

## 1. 方法

### 1.1 配置（唯一改动面）

`runtime/harness-home/profiles/research/cordis.patch.yml:33`（本块 L24–38；MCP/UI 块 L5–22 原文保留）：

```yaml
- id: web
  config:
    searchProvider: deepseek-search-api
    fetchProvider: http
```

- 只替换 base `- id: web` 行（`vendor/dsh/packages/bundle/base/cordis.patch.yml` 的
  `searchProvider: deepseek-official` / `fetchProvider: http`），**不新增行**、不带 `name`
  （id 定向，同 pack `llm-deepseek` 行形态）。
- `web-deepseek-api` 行（base，`apiKeyEnv: DEEPSEEK_API_KEY`）未动；无需装包。
- **未**改 `packages/deep-research-pack/cordis.patch.yml`（pack 默认延后）。

### 1.2 provider 直调参数

| provider | 构造 options | 调用 |
|---|---|---|
| `DeepSeekSearchProvider`（`web-search-deepseek/lib/index.js`） | `{apiKey, baseURL:'https://api.deepseek.com/anthropic/v1', model:'deepseek-v4-flash', apiVersion:'2023-06-01', maxTokens:2048, maxUses:3}` | `search({query, maxResults:10})` |
| `DeepSeekSearchApiProvider`（`web-deepseek-api/lib/index.js`） | `{apiKey, baseURL:'https://api.deepseek.com/v1/tools', count:10}` | `search({query, maxResults:10})` |

两者 `available()` 均返回 `true`；`id` 分别为 `deepseek-official` / `deepseek-search-api`。

### 1.3 query 集

`DeepSeek V4 release` · `DeepSeek site:github.com` · `DeepSeek lang:zh` ·
`DeepSeek after:2026-06-01` · `国产 AI 芯片 推理 部署`

### 1.4 记录口径

每条 query 的每个 provider 记：延迟（`performance.now()` 包住 `search()`）、条数、
snippet/publishedAt 可用条数与 snippet 总字数、错误（code + message 前 400 字）。
URL 重叠 = 两 provider 结果的**完整 URL 字符串**交集；另按 `host+pathname` 归一再算一次作对照。

### 1.5 限制（读结论前先读这段）

- **provider 级，不是 service 级**：直接调 `search()` 绕过了 `ctx.web` 的 provider 选择与
  `maxResults` 截断（两个 provider 返回的 `truncated` 都是 `false`，源数本来就是 10，未观察截断）。
- **无 Session**：未触发 `ori_question`（Search API 的 provider 在 wired 路径会带最新人类 prompt）；
  也未经 `web_search` 工具的错误包装。
- **无模型回合**：`maxUses`/`maxTokens` 只影响 Messages 辅助请求；本次每个 query 的源数恰 10，
  但**无法从 provider 输出判断实际触发了几次 native search**（`maxUses:3` 只是上限）。
- **单次采样**：每格只跑一次，延迟方差可见（同 query `after:2026-06-01` 两次 854ms / 2,012ms）。
- **质量未评**：只记字段可用率与 URL 重叠，没有相关性/权威性打分；provider 丢 `summary`
  （vendor README 记 1,000–2,300 字）与 `authority`/`rerank_score`，本次未量化损失。
- **免费窗口**：官方 server-side tool call 免费到 2026-11-01 00:00（北京）；本次未测成本与 429。

## 2. 结果

### 2.1 延迟 / 条数 / 重叠 / 失败（`runtime/smoke-workspace/search-provider-ab/ab-2026-10-21T01-58-06-658Z.json`）

| # | query | Messages 延迟 | Search API 延迟 | 条数（M / S） | URL 重叠 | 并集 | 错误 |
|---|---|---|---|---|---|---|---|
| 1 | DeepSeek V4 release | **8,762ms** | **843ms** | 10 / 10 | 4 | 16 | 0 |
| 2 | DeepSeek site:github.com | 6,713ms | 1,251ms | 10 / 10 | 6 | 14 | 0 |
| 3 | DeepSeek lang:zh | 4,544ms | 1,002ms | 10 / 10 | 7 | 13 | 0 |
| 4 | DeepSeek after:2026-06-01 | 4,264ms | 854ms | 10 / 10 | 4 | 16 | 0 |
| 5 | 国产 AI 芯片 推理 部署 | 5,739ms | 980ms | 10 / 10 | 5 | 15 | 0 |
| — | **均值 / 合计** | **6,004ms** | **986ms** | 10 / 10 | **5.2**（合 26） | 14.8 | **0** |

- 延迟比：单 query **4.5×（#3）到 10.4×（#1）**，均值 **6.1×**。
- 重叠按 `host+pathname` 归一再算：**仍是 26**（逐 query 4/6/7/4/5 不变）——本次的重叠差异
  不是 `utm_*`/`#1` 之类参数噪声，是真正不同的页面。结果 URL 普遍带 tracking 参数/锚点，
  真 run 去重时应归一。
- **逐 query** 的 snippet/publishedAt 可用条数：Messages 每个 query 都是 `0/10` + `0/10`；
  Search API 每个 query 都是 `10/10` + `10/10`（§2.2 是 5 query 合计）。Search API 每 query 的
  snippet 总字数依次 2,149 / 2,576 / 1,518 / 3,007 / 1,416。
- 每个 query 两侧都恰好 10 条、`truncated` 均为 `false`：Messages 的 native search 每次恰返回 10 条，
  与 F5 记的「Messages provider 不传 `maxResults`、由 service 截断」一致（本次没触及截断）。

### 2.2 字段可用率（5 query × 10 条 = 50 条/列）

| provider | title | snippet | publishedAt | snippet 总字数 | publishedAt 形态 |
|---|---|---|---|---|---|
| `deepseek-official` | 50/50 | **0/50** | **0/50** | 0 | — |
| `deepseek-search-api` | 50/50 | **50/50** | **50/50** | 10,666（**均 213 字/条**） | ISO 8601，如 `2026-10-16T16:00:00+00:00` |

- Messages 的 0 snippet / 0 date 是 provider 映射取舍，不是「搜索源没有摘要」：它只用
  `cited_text` 生成 snippet、只用 `page_age` 生成 publishedAt，而 Anthropic 兼容端点的
  text block 不带 `citations`（见 `web-search-deepseek/README.md` Known Limitations）。
- Search API 的 snippet 是可直接用的中文/英文摘录（例：`距离上一次模型发布仅一个多月，DeepSeek又迭代新模型了…`），
  平均 213 字略高于官方「约 100–200 字」；**够发现，不够取证**（A–D 质量判仍要 `web_fetch`）。

### 2.3 query 操作符（5 条 query 里的 3 条带操作符）

| query | 判据 | Messages | Search API |
|---|---|---|---|
| `DeepSeek site:github.com` | 结果 host 必须 = `github.com` | **10/10** | **10/10** |
| `DeepSeek lang:zh` | 中文域/中文结果（启发式域名表） | 7/10 | 7/10 |
| `DeepSeek after:2026-06-01` | 发布日期 ≥ 2026-06-01 | 无 date 字段，**无法自证** | 10/10 有 date，取值 2026-10-16…19 |

- query 串在两侧的走法不同：Messages 把 query 放进辅助请求文本、由 DeepSeek 侧原生搜索消费；
  Search API 原样放进 `query` 字段。实测 `site:` 两侧都 10/10 生效 → 操作符在两侧都到达了搜索后端。
- `lang:zh` 的 7/10 是域名启发式：两侧未命中的都是 `deepseek.com` 与 eastday/donews
  （后两者实为中文站，启发式漏判）→ 只能说两侧都返回了中文结果占多数的集合，不能据此判优劣。
- `after:` 对 Messages 侧**不可验证**：它不返回日期——这是「翻默认」时对时效判据的实质差异。

## 3. 结论

### 3.1 search-only via config：成立（composition 级）

证据链：

1. `ruby -ryaml YAML.safe_load(...)` → 顶层 Array，3 项（mcp `insert` / `ui-settings-general` / `web`），
   `web.config` 精确等于 `{searchProvider: deepseek-search-api, fetchProvider: http}`。
2. `dsh --profile research --dump-config` →
   `# == @deepseek-ai/dsh-base, patched by …/profiles/research/cordis.patch.yml` + 上述两行 config；
   dump 里 `searchProvider|fetchProvider` 只出现这一次，`^- id: web$` 计数 = 1（**替换不是新增**）。
3. `web-deepseek-api` 行仍在（`apiKeyEnv: DEEPSEEK_API_KEY`），`web-fetch-http` / `tool-web` 未动
   → fetch 仍走本地 HTTP，正是 F1 要的混合组合，UI 开关做不到。

**未证**：真实模型回合里 `web_search` 工具落到新 provider（工具级 + 错误面）。本次按要求不跑模型回合；
这条留给一次小 run / L4。

### 3.2 pack 默认：现在不翻（机械门槛已过，证据面不够）

- 已过（F5 要求的机械项）：延迟、条数、URL 重叠、snippet/date 可用率、失败率——5/5 query
  全部 `ok`，Search API 在延迟与字段上**严格占优**；`site:` 两侧都 10/10 生效，
  `lang:zh`/`after:` 见 §2.3（后者的时效只有 Search API 能自证）。
- 不够（三条缺口）：
  1. **质量未评**：没做相关性/权威性判分；provider 丢 `summary`/`authority`/`rerank_score`，
     遮挡了「哪条更该进证据」的信号。延迟快 ≠ 覆盖好。
  2. **query 集域偏置**：5 条里 4 条是 `DeepSeek` 品牌词，第 5 条是国产芯片通用题，
     都不能外推到真实研究问题；品牌词的官方文档天然排前，会高估 Search API 的「一手性」。
  3. **工具级未验**：`web_search` → service（`maxResults` 截断、`ori_question`、错误包装）→ 模型
     这条链没走；429/402/5xx 一个都没触发，可读错误面未知。
- 且 pack 默认是**持久公共行为**：按 F5 与实施顺序，要 A/B **加用户点头**；本工作流只负责 trial。
- 因此：**profile 覆盖保留**，pack 默认维持 `deepseek-official` + `http`，等一次真实 run 的
  web_search 证据（并在 run 后重跑本 A/B 的 query 集换成非品牌词）。

### 3.3 仍不确定

- **可引用性差值**（0/50 vs 50/50 snippet）在模型侧到底值多少 token/轮次：需一次 run 的
  工具结果对比，本次只有 provider 字段。
- **互补性的代价**：并集 13–16、重叠均 5.2 → 翻默认会失去每 query 平均 4.8 条（最少 3 条）
  Messages-only 结果。要不要「双跑」（两个 provider 都挂、按需选）是覆盖策略问题，不是本次能定的。
- **延迟方差与限流**：Search API 854–2,012ms；QPS 100/25 未压测，429 行为未知。
- **日期语义**：`2026-10-16T16:00:00+00:00` = 北京 10-17 00:00；写进证据卡的 `publishedAt`
  要不要按本地时区归一，属展示/契约问题，未定。
- **成本**：免费窗口到 2026-11-01；之后按成功请求计费，宽搜加深的请求数还没进 plan budget 的
  实测口径。

## 4. 复现

```sh
# key 只进环境变量，不打印、不进日志
export DEEPSEEK_API_KEY="$(ruby -ryaml -e \
  'print YAML.load_file("runtime/harness-home/.credentials.yaml").dig("refs","DEEPSEEK_API_KEY")' 2>/dev/null)"
node runtime/smoke-workspace/search-provider-ab/ab.mjs

# 配置：YAML 解析 + 真 loader 组合
ruby -ryaml -e 'p YAML.safe_load(File.read("runtime/harness-home/profiles/research/cordis.patch.yml"), aliases: true).map(&:keys)'
source dev/env.sh && dsh --profile research --dump-config | grep -A4 '^- id: web$'
```

原始数据（runtime gitignored）：`runtime/smoke-workspace/search-provider-ab/ab-2026-10-21T01-58-06-658Z.json`；
脚本 `runtime/smoke-workspace/search-provider-ab/ab.mjs`；补充探针（`after:` 的 date 取值）为
cwd=仓库根的一次性 `node --input-type=module -e`，未落文件。

## 5. 证据与限制

- provider 源码/合同：`vendor/dsh/packages/web/web-search-deepseek/{README.md,src/provider.ts}`、
  `vendor/dsh/packages/web/web-deepseek-api/{README.md,src/search.ts}`；base 行
  `vendor/dsh/packages/bundle/base/cordis.patch.yml`（`- id: web` / `web-deepseek-api`）。
- 前序证据：[DeepSeek Search/Fetch API + provider](./2026-10-21-deepseek-search-fetch-api.md)（API 面、Fetch 保真问题）、
  [A0 组合 review](./2026-10-21-combination-review.md) F1/F5（UI 成对切、一 query 不算结论）。
- 本次实测：5 query × 2 provider = 10 次调用，**0 错误**；Messages 4,264–8,762ms、
  Search API 843–1,251ms（+1 次 2,012ms 重探）。**未做**：相关性判分、工具级链路、
  429/402/5xx、成本口径、非品牌词 query、Fetch A/B。
- 配置实证：YAML 解析通过；`dsh --profile research --dump-config` exit 0，`web` 行被 patch 层替换；
  MCP/UI 块原文保留（`boot-run.sh` 只重写 `mcp-playwright-block` 标记区，本块不受影响）。
