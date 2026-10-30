# 门禁提速、凭据前置与冷启动复测（已落地）

> 状态：implemented
>
> 首提 2026-10-23 ｜ 相关 [run context Note](./2026-10-23-run-context.md) ·
> [registry 否决](../rejected/2026-10-23-gate-registry.md) ｜
> 合同 [evaluation §L0](../../docs/evaluation.md) · [design/40](../../docs/design/40-research-cockpit.md) ·
> [design/50](../../docs/design/50-agent-loop-and-state.md) ｜
> 门禁 [verify.mjs](../../scripts/verify/verify.mjs) · [gates-smoke](../../scripts/smoke/gates-smoke.mjs)

## 决定

- **verify 只扫该扫的面**：`role-list-sync` 走 `walkMany(scripts/tests/dev)`；`align-ledger` 的
  `globAbsent` 用惰性全树。一次 verify 不再在 import 时扫 11.9 万文件（含 7 千运行区文件）。
  暖跑中位 **1.42s**（改前 3.5s），`gates-smoke` 78 案例 2m28s 内。
- **`node-gate-core` 只导出 `gateBundle`**：删掉 25 个 re-export；测试直接 import
  `node-gate-contracts` / `node-gate-run-gates`。门面不再制造“兼容面 = 第二套 API”。
- **两个默认 `readLog` 不合并，改为显式命名**：`emptyOnUnreadableLogReader`（空语料继续）与
  `skipUnreadableLogReader`（跳过文件）保留各自失败契约；真实壳都注入 zstd reader，默认只服务
  测试。强行合一 = 改失败语义且无实害证据。
- **凭据前置收成一个 helper**：`scripts/lib/env.mjs` 的 `credentialsPresent` /
  `requireCredentials`；8 个真模型档脚本 + `dev/record-role-fixture` 共用，缺席统一 exit 2。
  home 由调用方从 `DSH_HOME` 解析（先 source dev/env.sh）；`smoke-contract` 的 closed set
  检测器认 `requireCredentials(` 调用，名单不变。
- **run-context 单源机械化**：verify 门禁 `run-context-single-source`——`src/client` 的 tracked
  `.ts/.tsx` 非注释行出现 `_abandoned` 候选链即红；`src/lib/final-target.ts` 的终稿地址校验是
  另一件事，不在词法门禁范围。`finalCandidates` 删除，三位置发现只剩 `run-context`。
- **冷启动文档修复**：根 AGENTS 命令速查加 `run-driver up` 与“搜索先限定
  packages/tests/scripts/docs”提示；guides/61 补 `url`/`probe`、HITL1 两段卡跑两次、HITL2
  前置门；`dev/hitl-answer.mjs` 头注同步；design/40 修正图谱页签 §2/§4 布局矛盾并加单源门禁
  指针；design/50 补“证据时间只能取 journal write/edit；写者通常是队员；页签合并 lead+member”。
- **P3 门禁 registry 停在定向扫描**：测量与复活条件见
  [rejected Note](../rejected/2026-10-23-gate-registry.md)——43 条门禁/1712 行安全网的大爆炸重构风险
  不对称，真正的全树成本已在 P2 消掉。

## 输掉的方案

- **把两个 `readLog` 哨兵合成一个结果类型**：默认 reader 只服务测试，真实壳覆盖；合并会改
  “空语料继续”与“跳过文件”的失败方向，且没有实害证据。改名已消除误读。
- **全量门禁 registry / 半吊子 `--gate`**：见 [rejected Note](../rejected/2026-10-23-gate-registry.md)。
  半吊子 `--gate` 仍需给 43 个匿名块逐个加条件，收益不抵。
- **把 `run-context-single-source` 扩到 `src/lib`**：`final-target` 的地址正则合法含有
  `_abandoned`，扩围需要 allowlist；当前漂移面是页签，client 范围足够。
- **把图谱版本轨移进 header**：复测确认前提已过时——版本轨已是正文首行（`710245f` 起）；把
  §2/§4 改成与代码一致，不做无位置断言的纯 UI 搬移。
- **给终稿页签补组件级测试**：本仓没有 React 渲染测试栈；终端页行为由 keyless 纯核用例 +
  `client-load-smoke` 真浏览器覆盖，新增测试栈是另一笔投入。

## 实际跑过的验证

- `pnpm verify` **44 门禁全绿**（含新 `run-context-single-source`）；`pnpm test` **745 pass /
  0 fail**；`pnpm typecheck` 通过；pack 双半 `pnpm build` 通过。
- `gates-smoke` **78 案例全绿**（零注入对照 + 客户端候选链注入点名红）。
- `client-load-smoke` 真浏览器 **ALL PASS**（状态/配置/图谱/终稿；证据计数 160/160、终稿 v2
  版本账与静默条）。
- `release-smoke --install-only` **ALL PASS**（真实安装形状；安装域 preset-smoke 全角色真挂载
  绿、端口无残留）。
- 红证：`review.md` EOF 策略移除 → 1448 行读成 40 行红；空文件切分红；浏览器错误分类红；
  `bindingTrust` pending 分支红；客户端候选链注入 → `run-context-single-source` 点名红；
  `credentialsPresent` 恒 false → 用例红；子进程缺凭据 exit=2。

## 冷启动复测（5 任务，只读）

| 任务 | 基线（首正确/错路/反问/自评） | 复测 | 结论 |
|---|---|---|---|
| 长 review bug | 1.0 min / 2 / 0 / 5 | 1.5 min / 1 / 0 / 5 | 已修复；agent 自行确认，未改代码 |
| 证据时间 feature | 1.0 / 3 / 0 / 3 | 0.2 / 4 / 0 / 4 | design/50 命中；仍探索 vendor mtime |
| 三位置门禁 | 0.2 / 0 / 0 / 4 | 1.0 / 1 / 0 / 5 | 已由 `run-context-single-source` 执行 |
| 图谱版本轨 | 0.1 / 1 / 0 / 3 | 0.1 / 1 / 0 / 4 | 前提过时；§2/§4 矛盾已修 |
| run 通道 + HITL | 0.1 / 0 / 1 / 4 | 1.5 / 2 / 1 / 4 | 命令已可发现；hitl 头注已补 |

五个任务都在 0.1–1.5 分钟内找到 owner 文档；两个“已修复/已执行”任务的耗时用于核实而非找路。
剩余摩擦（非阻塞）：同一命令在 root/guides/60/guides/61/dev README/脚本头多处；`source dev/env.sh`
的条件因脚本而异；旁路 grep 仍可能撞 `packages/*/lib/` 生成物（根 AGENTS 已加提示）；终稿静音条
无组件测试。

## 边界

- **未跑 L4**（真模型完整研究 run）：本次改动是观察面读面/门禁/文档；L4 成本高且不证明这些面。
- **未跑源码域 L1 preset-smoke**：preset/bundle 未改；安装域 preset-smoke 已由 release-smoke 覆盖。
- 复测是只读任务，不是完整实现；执行质量仍由 keyless 用例 + `client-load-smoke` /
  `release-smoke` 证。
