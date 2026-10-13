# 拆除：网络附近的所有自定义操作——恢复原生 DSH 缺省网络行为

> 状态：rejected —— 2026-10-13 用户裁定：网络附近所有操作回缺省状态，插件网络完全继承自然网络，仓内不留自己的任何网络处理

## 决定（否决）

本仓**不做任何网络干预**：不探测网络形态、不设任何代理 env（`http_proxy`/`https_proxy`/`no_proxy`）、
不起任何代理进程、不给 MCP Playwright 传任何代理参数。网络行为 = 原生 DSH 缺省（vendor
`util/http-proxy` 按用户环境变量决定代理路由，SSRF 守卫按 vendor 设计工作）——插件完全继承环境
的自然网络。

随本决定拆除（同 diff 删除）：

- egress 三态探针：`dev/egress-probe.mjs` + `scripts/lib/egress.mjs`（boot-run 判定分支）
- 自旋本地转发代理：`dev/egress-proxy.mjs` + `scripts/lib/egress-proxy.mjs`（缺省端口 14200）+
  `scripts/smoke/egress-proxy-smoke.mjs`（boot-run TUN 出口分支 + `DSH_EGRESS_OUTLET` 覆盖）
- `tests/egress-probe.test.mjs`（探针契约测试）
- MCP Playwright 启动参数 `--proxy-server direct:// --proxy-bypass *`（浏览器网络改为继承环境）
- 运行态残留：research profile patch 里的 proxy 参数、`runtime/smoke-workspace/forward-proxy.mjs`
  （10-07 排障一次性脚本）
- 文档与触发器同步清空（guides 60/61、dev/scripts README、project-map、根 AGENTS 布局行、
  triggers.md 撤行）；`stream-diagnostics` 去掉 egress 行报告

保留（非网络干预，不动）：MCP Playwright 通道本体（D22 常驻决定，见
[采纳 Note](../implemented/2026-10-02-mcp-playwright-adoption.md)）；profile `.npmrc` 的
store/cache 钉定与 `npm_config_cache`（磁盘卫生，不改网络路由）。

## 为什么（否决依据）

- **两态自适应全线翻车**：TUN 态出口代理撕裂 LLM SSE 流（`event precedes message_start`
  风暴，[BUG-023](../../_backlog/_archived/fixed_bugs/BUG-023-provider-malformed-storm-exhausts-retry.md)：
  两场真实 run 12/12、16/16 attempt 全灭）；`no_proxy=api.deepseek.com` 收口后又陷入
  「检测 → 重启 → 续跑」循环（[channel-restart 撤回 Note](2026-10-12-channel-restart-selfheal.md)
  同夜撤回）。用户定调（2026-10-13）：这块历史上把我们搞死了，没修好，不再尝试。
- **静态假设没有出路**：写死代理毒害直连态，不写代理 TUN 态全红；自适应判定 = 在两种错误之间
  自动切换（[egress-mode-probe 卡](../../_backlog/_archived/settled_issues/2026-10-10-egress-mode-probe.md)
  的两态实证）。
- **收益撑不起复杂度**：出口只为 TUN 态 `web_fetch` 取证服务；取证失败如实失败（证据契约在
  run 内显性化）比用不稳定机制硬撑更便宜。

## 输掉的方案（都真试过）

- 三态探针 + 自旋 CONNECT 代理 + `DSH_EGRESS_OUTLET` 用户口覆盖（2026-10-10 实施 → 本卡拆除）
- `no_proxy=api.deepseek.com` 最小手术（2026-10-12；教训保留在
  [LLM 流直连 Note](../implemented/2026-10-12-llm-stream-direct-no-proxy.md)）
- Playwright `--proxy-server direct://`（以 `page.request.get` 子通道 ENOTFOUND 为代价，随零干预一并去除）

## 实际跑过的验证

- `node scripts/smoke/gates-smoke.mjs` / `pnpm verify` / `pnpm test` / `DSH_RUN_PORT=<空闲口> bash
  dev/boot-run.sh --drift-check` 全绿（同 diff 实跑；门禁面无增删——port-exclusive 认领随文件删除自然退场）
- 残留实测清零：活面（dev/scripts/tests/packages/docs/根 AGENTS）`egress|proxy` 检索仅剩历史层
  （notes/、`_backlog/_archived/`）与 triggers 的防复犯行；`lsof -iTCP:14200` 无监听；research
  profile patch 无 proxy 参数

## 重启条件

只有**用户主动要求**恢复某种网络处理时才重开；任何提议必须先过
[channel-restart 撤回 Note](2026-10-12-channel-restart-selfheal.md) 的四条硬要求（用户在环外 /
请求级处理 / 有界静默 / 不牺牲邻居）+ 本卡「为什么」三条否决依据。TUN/fake-IP 态再现
`web_fetch` 全域被 SSRF 拒 **不是**重启条件——那是环境形态问题，按环境处理（换网络或等直连）。
