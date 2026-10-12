# triggers.md · 活触发条件索引

> 这是可选的短索引，不是计划池、授权来源或额外检查门。只登记工作中自然可见、容易遗漏且一旦出现会改变既有决定的具体观察；触发条件的完整理由仍留在其 owner 卡片或 Note。
>
> 收割、走查或阶段收口时，按需扫本表。触发后先依据原记录重开判断，再更新或移除本行；不得把“以后”“用户点名”等泛化愿望写成触发器。空表是合法状态。

| 对象 | 当前决定 | 具体观察（出现位置） | owner |
|---|---|---|---|
| Cockpit 与 Dashboard 合并 | 暂不合并；当前互跳足够，产品级整合证据不足 | 任一场 run 记录到“必须在 Web 外查看进度”这一具体观察，或用户明确要求产品级整合；run 证据写入对应交付记录 | [settled issue](./_archived/settled_issues/2026-10-07-cockpit-dashboard-merge.md) |
| 外部参考仓钉版漂移 | 00-index §外部研究材料的钉版 = 复核时点 HEAD；比对不一致 = 「上游已前进、结论待复核」态 | 升 pin 或引用外部材料复核时，`git -C <参考仓> log -1 --format=%h` 与 00-index 钉版比对不一致 | [00-index §外部研究材料](../docs/00-index.md) + [discipline-map §重审触发路径](../docs/discipline-map.md) |
| egress B/C 态现场补证 | 两态自适应 boot 已实施（直连态实测绿）；B/C 态端到端按 blocked 登记，未实证 | boot-run 模式行打印 `tun` 或 `offline`（= `node dev/egress-probe.mjs` 非 direct）的日子 | [egress-mode-probe 卡](./_archived/settled_issues/2026-10-10-egress-mode-probe.md) 验收 #4 reading protocol |
| 文档承诺的动作缺工具 | 遇到即按同一形状补工具（已落一件：续跑唤醒 = `run-kickoff --session`，自带送达对账）；判据 = 该动作能被仓库里的命令复跑，而不是只能当场写脚本 | 手册/指南里出现「发一句即…」「点一下即…」「按…即…」式承诺动作，而 `scripts/`、`dev/` 下搜不到对应命令入口 | [settled issue](./_archived/settled_issues/2026-10-11-recovery-action-instrument-gap.md) |
| 上游流畸形复现（直连路径） | BUG-023 根因已收口 = fetch 出口代理撕裂 LLM SSE 流（出口路径必死、直连同刻正常——修复 = boot-run `no_proxy=api.deepseek.com`，LLM 流永远直连）；有界重试保持原样 | 若**直连路径**再现 `event precedes message_start`：从会话日志统计失败密度与分布，再评估重试策略升级（那才是上游/模型面问题） | [BUG-023 已修卡](./_archived/fixed_bugs/BUG-023-provider-malformed-storm-exhausts-retry.md) |
