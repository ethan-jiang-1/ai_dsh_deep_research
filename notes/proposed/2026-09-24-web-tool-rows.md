# RFC · web-tool-rows 实证（队列 ▶ 条目 1）

> status: proposed（研究部分已闭环 2026-09-24，见 §实证结果；剩余验收 = 真挂载，随队列
> 「preset-smoke 真跑」共同判定——该条目为本 RFC 的 unblocker）
> 条目：roadmap §队列 #1（feature，M1 收口件）；开放问题 Q1 已随本条目研究闭环 → D9。

## 问题

bundle 层与 preset 层的 web 工具行（`tool-web` / `web-search` / `web-fetch`）最初是按
vendor 包名与 company 语法教义**推断**写的，行 id、provider config、搜索 provider 是否需
要独立 API key 均未实证。按 company R1 血泪（行校验发生在挂载时、UI 吞错），未实证的行 =
挂载时才炸的地雷；这是 M1 的 L1 面（preset-smoke 真跑）的前置。

## 实证结果（2026-09-24，依据 vendor base bundle `packages/bundle/base/cordis.patch.yml` 436–454 行 + web-app surface 注释）

1. **四行全是 dsh-base 出厂行**：`web`（seam：`searchProvider: deepseek-official` +
   `fetchProvider: http`）、`web-search-deepseek`（`apiKeyEnv: DEEPSEEK_API_KEY`）、
   `web-fetch-http`、`tool-web`（`config: { fetch: true, searchTimeoutMs: 60000 }`）；
2. **分层**：providers 与 seam 是 **host 面**行（web-app surface 不禁用它们）；模型面
   `tool-web` 行被 web-app surface **禁用并移到 preset 背后**（"the agent plane moves
   behind agent presets"）——与 tool-fs/tool-skill/tool-todo 同一模式；
3. **密钥**：DeepSeek 搜索吃 `apiKeyEnv: DEEPSEEK_API_KEY`——与 chat 同一把钥匙，**无需
   独立搜索 key**（Messages 端点与 chat-completions 分离，但凭据同源）；
4. **修正**（已落盘）：preset 只声明 `tool-web`（config 照抄 base）；bundle 不 insert
   任何 web 行（与 surface 的 preset-scoping 打架）；`web-search-deepseek` /
   `web-fetch-http` 从 peerDependencies 移除（不再是本包行）；`dev/research.overlay.yml`
   的 web 行保留为 headless 实验参考（headless surface 下 tool-web 为进程级行，overlay
   场景按需核对）。

## 输掉的方案

- **凭 memory 抄行就跑**：company R1 的失败模式（工具行不连 config 抄 = 挂载炸且 UI 吞错）；
- **bundle 层 insert web 三行**（本 RFC 初稿的方案）：实证后放弃——四行是 base 出厂行，
  insert 与 web-app surface 的 preset-scoping 设计冲突；
- **preset 声明 provider 行**（初稿的"自包含"推论）：实证后放弃——providers 属 host 面，
  preset 只拥有模型面工具行（同 tool-fs vs fs-local 模式）。

## 验收判据

- ~~web 三行与 vendor shipped 样本逐字段一致~~ ✓ 已满足（preset `tool-web` 行与 base 逐字段一致；bundle 不声明）；
- ~~provider 凭据要求有明确结论~~ ✓ 已满足（同 `DEEPSEEK_API_KEY`，已写进 AGENTS.md §密钥）；
- preset-smoke 真跑时 web 工具在四角色会话在场（与队列「preset-smoke 真跑」共同验收）——**剩余唯一验收**；
- Q1 在 00-index 待定表销账 ✓ 已满足（销账注已加，答案进 D9）。
