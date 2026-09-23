# RFC · web-tool-rows 实证（队列 ▶ 条目 1）

> status: proposed
> 条目：roadmap §队列 #1（feature，M1 收口件）；开放问题 Q1（00-index 待定表）随本条目闭。

## 问题

bundle 层与 preset 层的 web 工具三行（`tool-web` / `web-search` / `web-fetch`）目前是按
vendor 包名与 company 语法教义**推断**写的，行 id、provider config、以及搜索 provider
（`dsh-web-search-deepseek`）是否需要独立 API key 均未实证。按 company R1 血泪（行校验
发生在挂载时、UI 吞错），未实证的行 = 挂载时才炸的地雷；这是 M1 的 L1 面（preset-smoke
真跑）的前置。

## 方案

1. 读 vendor shipped 组合的权威样本：`/Users/bowhead/ai_dsh_company/vendor/dsh/packages/bundle/web-app/cordis.patch.yml`
   （以及 headless bundle 的对应文件），抄 web 三行的**确切 id/config 形状**；
2. 读 `packages/web/tool-web`、`packages/web/web-search-deepseek`、`packages/web/web-fetch-http`
   的 README，确认 config 键与凭据要求（是否吃 DEEPSEEK_API_KEY、是否要独立 key）；
3. 对照修正 `cordis.patch.yml` 与四个 `agent.cordis.yml` 的行；
4. 跑真挂载验证（与队列「preset-smoke 真跑」衔接）：四角色会话里 web 工具在场可调。

## 输掉的方案

- **凭 memory 抄行就跑**：正是 company R1 的失败模式（工具行不连 config 抄 = 挂载炸且
  UI 吞错），不做；
- **先写完整 preset-smoke 再核行**：顺序倒置——行没实证前冒烟只会在挂载面炸出同一颗雷，
  先排雷再冒烟。

## 验收判据

- web 三行与 vendor shipped 样本逐字段一致（或差异附理由注释）；
- provider 凭据要求有明确结论写进 AGENTS.md §密钥（若需独立 key）；
- preset-smoke 真跑时 web 工具在四角色会话在场（与队列 #3 共同验收）；
- Q1 在 00-index 待定表销账（归宿落实后移除该行）。
