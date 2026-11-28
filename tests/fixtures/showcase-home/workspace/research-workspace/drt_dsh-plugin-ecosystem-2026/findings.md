# 综合发现（findings.md）

1. **声明式组合优先于硬分叉内核**：通过 `cordis.patch.yml` 的 `disabled: true` 裁剪与 `isolate` 隔离域，可在零改宿主源码前提下同时支持 5 个角色 preset 与 2 个无角色 worker profile。
2. **Host 投影根治 N+1 订阅与跨会话串台**：将 `researchRun` 折叠前置到 Host `sessionProjections` 后，左栏会话状态点与 Hub 反查均直接消费单源快照，不再按行开 WebSocket `follow`。
3. **Critic 独立主张核查显著压低未证实结论漏网**：将终稿拆解为 `claims.json` 并由无写作偏见的 Critic 产出 `verdicts.json`，再经终稿页风险筛选与 150ms 悬停溯源直连原始证据卡。
