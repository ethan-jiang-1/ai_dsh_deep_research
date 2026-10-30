# 搜索降级在 pack 层不可行：web seam 是单 provider 语义（vendor 设计如此）

> 状态：implemented

> 2026-10-27 更新：**fetch** 侧已由本包自己的 provider 实现（本地失败 → DeepSeek Fetch API；
> [D31 Note](./2026-10-27-fetch-fallback-provider.md)）。本文对 **search** 的结论不变：seam 仍是
> 单 provider 语义、无隐藏优先级链；搜索不做降级链。

来源：两场 run（第五/七）命中 web_search 上游间歇故障（scout 4 调 0 成、lead 3 调 1 成），agent
降级为直接 `web_fetch` 打已知域名并显式披露盲区——run 仍完成。用户宪章第 2 条"借鉴成熟 DSH 插件"
的第一个实战对象即生态里做多引擎路由的 `dsh-web-search-pro`（70★）。本 Note 记录 seam 探查结论：
**pack 层做不了搜索降级链，这是 vendor 的有意设计**；替代路径有两条（换 provider / 靠 agent 韧性）。

## 决定

**不在 pack 层实现搜索降级/多引擎回退。** seam 事实（vendor `dsh-v0.1.7-rc.2`）：

1. **web 服务是单 provider 语义**：`ctx.web` 的 `WebRuntimeConfig` 只收 `searchProvider` /
   `fetchProvider` 两个字符串；选择语义写在源码注释里——配置的 provider 注册且 `available()`
   → 用它；不可用 → 结构化错误 `WEB_PROVIDER_CONFIGURED_UNAVAILABLE`（**不自动换**）；未配置且
   多个可用 → `WEB_PROVIDER_AMBIGUOUS`（也不许静默挑一个）。源码明说："Operational overrides
   … must feed these same fields **rather than introduce a hidden priority chain**"——
   隐藏优先级链是 vendor 明文拒绝的设计（fail-loud、无顺序依赖）。
2. **available() 判的是"可用性"不是"健康度"**：provider 有凭据即 available（deepseek 端点
   返回垃圾正文时依然 available）——所以"配置两个 provider 让坏的自动让位"在这套语义下
   无从发生；坏端点只会以执行期错误浮出，由 **agent 自己降级**（这正是我们观察到并认可的形态）。
3. **vendor 现成三个搜索 provider**：`web-search-deepseek`（现用）/ `web-search-exa` /
   `web-search-perplexity`（后两个 vendor 自带，`apiKeyEnv` 缺省回落 `$EXA_API_KEY` /
   `$PERPLEXITY_API_KEY`，空即 unavailable）。
4. pack 是"配置为主"（当前例外 = D18 观察面 client + D31 抓取回退 provider；本文写于 D31 前，
   当时只记 D18）：**写一个自定义 provider 插件（TS 代码）会破坏 pack 形态**——该形式论证已被
   D31 的有界例外部分推翻；**search 侧结论不变**：不做多引擎回退，seam 仍是单 provider 语义。

## 输掉的方案

- **pack 内实现多引擎回退 provider**：否决——需要 pack 携带可执行 TS 代码，破坏"配置为主 +
  D18 例外（当时唯一；D31 后为两处）"的包形态；且 vendor 明文拒绝隐藏优先级链，绕过它等于在别人体系里埋暗行为。
- **改 vendor 的选择语义加 fallback**：否决——只读铁律；且那是对 DSH 全局用户的语义变更，
  不是本仓该做的决定（应上游提）。
- **直接把 `searchProvider` 换成 exa/perplexity**：**留给用户**的可选路径——vendor 自带插件 +
  一个 API key 即可换源；但那是"换引擎"不是"降级"（失去 DeepSeek 集成），且引入新凭据依赖，
  须用户拍板，本仓不擅自换。

## 验证

- vendor 源码核对：`packages/web/web/src/index.ts`（WebRuntimeConfig + 选择语义注释）、
  `packages/bundle/base/cordis.patch.yml` L473–489（web 服务与三 provider 行）、
  `packages/web/web-search-{exa,perplexity}/src/index.ts`（apiKeyEnv 回落与空 → unavailable）。
- 实跑证据：第五/七场 run 的 scout/lead 会话日志（web_search 失败形态 = 执行期结构化错误；
  agent 降级 = 直接 web_fetch + 显式披露，两场 run 均带残完成）。

## 环境状态

- 两场故障为上游 DeepSeek 检索端点间歇性返回非 JSON 正文（时间窗内 agent 重试 5+ 次全败），
  非仓内缺陷；l4-lite 冒烟在邻近时间窗内 web_search 通过。
- 若用户未来想换引擎：注册行 + `$EXA_API_KEY`（或 `$PERPLEXITY_API_KEY`）即可，属运营动作。
