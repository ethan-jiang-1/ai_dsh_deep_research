# 抓取回退 provider：本地失败 → DeepSeek Fetch API（D31）

> 状态：implemented

> 来源：用户 2026-10-27 指令（"本地 fetch 失败的话，就用 DeepSeek fetch……尽量内化固化到
> 插件里"）+ [价值抽样](../../_backlog/_archived/research/retrieval-backend/2026-10-27-provider-audit.md) §9。
> **部分取代** [search-fallback 结论](./2026-09-27-search-fallback-seam.md)：该文"pack 层做不了
> 回退"对 **search** 仍成立；fetch 侧改由本包自己的 provider 实现，不依赖 seam 的选择语义。

## 决定

- 新增 host 侧插件 `src/fetch-fallback/` → 构建产物 `lib/fetch-fallback.js`，注册 fetch
  provider `deepseek-fallback-fetch`；bundle 行 `research-fetch-fallback` 携带 config；
  `web.fetchProvider` 钉它。三层拆分：纯判据 `policy.ts`、两腿编排 `orchestrate.ts`（依赖注入）、
  凭据解析 `credentials.ts`——三者都 keyless 可测；vendor 接线只在 `index.ts`。
- **两腿与预算**：本地 `HttpFetchProvider`（默认 10s）→ 可回退失败时 `DeepSeekFetchApiProvider`
  （用剩余时间；总预算默认 28s）；preset `fetchTimeoutMs: 45000` 兜住工具调用预算。
- **回退条件**：`WEB_FETCH_TIMEOUT` / `WEB_FETCH_TOO_LARGE` / `WEB_UNSUPPORTED_CONTENT_TYPE` /
  `WEB_REDIRECT_BLOCKED` / `WEB_PROVIDER_ERROR`，以及配置的 5xx（默认 500/502/503/504）。
  **绝不**回退 `WEB_BLOCKED_URL` / `WEB_INVALID_URL`（内网 / 非法 URL 不外送）与 `WEB_ABORTED`
  （用户取消不重发）；4xx 不救。
- **回退成功的形态**：正文前加一行 `> 回退：本地抓取失败（…），以下内容经 DeepSeek Fetch API
  取得。`；状态码恒 200、最终 URL 不可见——模型必须能分辨内容不是本地取的。
- **凭据**：每次尝试解析 `apiKeyEnv`（默认 `DEEPSEEK_API_KEY`）：credentials 服务优先，取不到
  则启动环境变量；两者都没有 → **不回退**，抛原错并标 `fallback unavailable`。账号登录 token
  本轮不覆盖（vendor 的 account 解析未从包入口导出；见输掉的方案）。
- **分发**：包不内置、不转发任何凭据；一个 key 同时覆盖 chat / Search API / fetch 回退；配置面
  = Models 页（credentials）→ 启动环境变量 → `.credentials.yaml`（用户本机）。用户合同 =
  [README §账号与凭据](../../packages/deep-research-pack/README.md)。
- **为什么是 provider 而不是配置**：`ctx.web` 是单 provider 语义，vendor 明文
  "No automatic retry or provider fallback occurs"；配置只能二选一，改 vendor 的选择语义又
  触只读铁律。注册一个自己的 provider 是唯一在包内完成的路径（D7 第二处有界例外）。

## 输掉的方案

- **config-only**：seam 没有 fallback 字段；两个 provider 只能选一个，选谁都是全有/全无。
- **UI 开关（Use the new Web Search API）**：成对切 search + fetch，且只切到"全 API"，没有
  "本地优先、失败才 API"。
- **在 tool 层包一个 `web_fetch`**：模型面 schema、渲染、超时策略全归 vendor 的 `tool-web`，
  自建工具要抄一遍契约且与 vendor 双份维护；provider 层只实现取回策略，面最小。
- **改 vendor 加 fallback**：只读铁律，且是 DSH 全局用户的语义变更，应由上游决定。
- **回退 4xx**：实测 403/404 换 API 仍 404（知乎 403 → API 404），白花一次请求与 5–15s。
- **回退 `WEB_BLOCKED_URL`**：会把内网 / 非法 URL 送给第三方——安全边界，不谈判。
- **本轮支持账号登录 token**：需要复刻 vendor 未导出的 account 解析与 session route 判定；
  收益只覆盖"无 key 但有账号登录"的 GUI 用户。等出现该类用户的真实需求再做。
- **用 DeepSeek Fetch API 作唯一抓取**：转义内容 + 7/7 主流站点 404 + 5–15s（D30 audit）。

## 实际跑过的验证

- 构建：`pnpm --dir packages/deep-research-pack build` → `lib/fetch-fallback.js`（约 11 kB）。
- 组合：`dsh --profile web --patch dev/research.overlay.yml --dump-config` →
  `fetchProvider: deepseek-fallback-fetch`，`research-fetch-fallback` 行与 config 在位。
- **live headless（真模型回合）**：`web_fetch http://github.com/deepseek-ai/deepseek-harness`
  → 本地 `WEB_REDIRECT_BLOCKED` → API 回退成功，正文首行 = `> 回退：本地抓取失败
  （WEB_REDIRECT_BLOCKED: …）…`；墙钟 5.9s（含模型回合）。
- **安全反证**：`web_fetch http://127.0.0.1:8080/` → 原错 `WEB_BLOCKED_URL` 直出、无回退标记
  ——内网 URL 未外送。
- **价值抽样（11 URL，本地 vs API）**：2 例被回退救回（`http://github.com/…` 跨源重定向、
  `http://arxiv.org/…` 传输错误），8 例两腿都失败（wikipedia/BBC/Medium/X/NYTimes/知乎/PDF），
  1 例两腿都成功（163）。回退不是万能，但失败时不再直接放弃。
- 测试资产：`tests/pack/fetch-fallback.test.mjs`（判据常量）、`fetch-fallback-orchestration.test.mjs`
  （假腿覆盖回退/安全拒绝/取消/无凭据/两腿失败/状态码/预算/开关 14 例 + YAML id 与预算对账）、
  `fetch-fallback-credentials.test.mjs`（服务优先/环境兜底/都没有）、`presets.test.mjs`（行与
  `fetchTimeoutMs`）。反证：删 orchestrate 的 `fallbackForError` 守卫 → 安全拒绝测红；还原 → 绿。
  L1 preset-smoke 真挂载全绿（插件在真实 profile 里加载、四角色建会话）；L2 安装域 ALL PASS。
- 未跑：账号登录用户的回退（不支持）、429/402 压测、真实 run 全流程（下一次 L4）。

## 环境状态 / 残余

- 账号 token 不覆盖；4xx 不救；回退正文带标记、状态码恒 200、最终 URL 不可见。
- 两腿预算固定 28s（config 可调）；慢站回退会占满预算，工具层 45s 兜底。
- 回退请求计入 Search/Fetch 计费（$0.75 / 1,000 次成功请求，2026-11-01 起）。
