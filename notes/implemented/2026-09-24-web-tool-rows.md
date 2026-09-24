# web-tool-rows 实证（毕业自 proposed/，2026-09-24）

> 原 RFC：`notes/proposed/2026-09-24-web-tool-rows.md`（已离场）。条目"web-tool-rows 实证" +
> "preset-smoke 真跑"已闭环，毕业归档；历史全貌见 git。

## 结论（研究 + 实证全闭环）

1. **行组合（已落盘并实证挂载）**：模型面 `tool-web` 行随 preset（config 照抄 base：
   `fetch: true` + `searchTimeoutMs: 60000`）；providers（`web` seam /
   `web-search-deepseek` / `web-fetch-http`）是 dsh-base host 面出厂行，不进本包 bundle
   也不随 preset——依据 vendor base bundle cordis.patch.yml 436–454 行 + web-app surface
   对 tool-web 的 preset-scoping 注释；
2. **密钥**：`web-search-deepseek` 的 `apiKeyEnv: DEEPSEEK_API_KEY` 与 chat 同一把钥匙，
   无需独立搜索 key（已写进 AGENTS.md §密钥）；
3. **挂载实证**：preset-smoke 真会话档全绿（源码域 overlay 通道 + 安装域 plugin-add 通道
   双通道）——四角色 session/create 真挂载（tool-web 行 config 校验通过）+ skills 硬隔离断言；
4. **反证**：坏 preset（tool-todo 缺必填 `allowParallelInProgress`）在 session/create 处
   精确炸红（`agent-preset/invalid`，指名行与字段）——冒烟判别力实证，与 company R1 血泪
   逐字吻合。

## 残留（并入后续条目）

- web 工具的**功能级**证明（真实 web_search 调用发生）随队列「L4-lite 真模型冒烟」/
  「首个完整研究 run」闭合——挂载级证明已尽 keyless 之极限（session/create 即行校验面）。

## 输掉的方案（择要）

- bundle 层 insert web 三行（初稿）：四行是 base 出厂行，insert 与 web-app surface 的
  preset-scoping 设计打架；
- preset 声明 provider 行（初稿的"自包含"推论）：providers 属 host 面（同 tool-fs vs
  fs-local 模式）。

<!-- grandfather: note-format 门禁生效（2026-09-24）前的遗留形态——内容有效不追改，新篇一律按 guides/60 §4 骨架 -->
