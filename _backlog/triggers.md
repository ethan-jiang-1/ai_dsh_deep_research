# triggers.md · 活触发条件索引

> 这是可选的短索引，不是计划池、授权来源或额外检查门。只登记工作中自然可见、容易遗漏且一旦出现会改变既有决定的具体观察；触发条件的完整理由仍留在其 owner 卡片或 Note。
>
> 收割、走查或阶段收口时，按需扫本表。触发后先依据原记录重开判断，再更新或移除本行；不得把“以后”“用户点名”等泛化愿望写成触发器。空表是合法状态。

| 对象 | 当前决定 | 具体观察（出现位置） | owner |
|---|---|---|---|
| Cockpit 与 Dashboard 合并 | 暂不合并；当前互跳足够，产品级整合证据不足 | 任一场 run 记录到“必须在 Web 外查看进度”这一具体观察，或用户明确要求产品级整合；run 证据写入对应交付记录 | [settled issue](./_archived/settled_issues/2026-10-07-cockpit-dashboard-merge.md) |
| 外部参考仓钉版漂移 | 00-index §外部研究材料的钉版 = 复核时点 HEAD；比对不一致 = 「上游已前进、结论待复核」态 | 升 pin 或引用外部材料复核时，`git -C <参考仓> log -1 --format=%h` 与 00-index 钉版比对不一致 | [00-index §外部研究材料](../docs/00-index.md) + [discipline-map §重审触发路径](../docs/discipline-map.md) |
| 文档承诺的动作缺工具 | 遇到即按同一形状补工具（已落一件：续跑唤醒 = `run-kickoff --session`，自带送达对账）；判据 = 该动作能被仓库里的命令复跑，而不是只能当场写脚本 | 手册/指南里出现「发一句即…」「点一下即…」「按…即…」式承诺动作，而 `scripts/`、`dev/` 下搜不到对应命令入口 | [settled issue](./_archived/settled_issues/2026-10-11-recovery-action-instrument-gap.md) |
| 上游流畸形复现（直连路径） | 直连路径已实证复发（2026-10-13 根因 = 边缘对长命复用连接的相位性故障，[postmortem](../notes/postmortem/2026-10-13-llm-stream-malformed-storm.md)）；**已落地 socket 隔离**（`dev/llm-socket-isolation.cjs`：LLM 流每请求一次性连接、永不复用——重试升级无益、专池复用无样本，均不采纳） | 若隔离下再现 `event precedes message_start` 风暴：先重启通道，再核隔离预载在场（web.log 检索 `llm-socket-isolation`），然后挂取证工具抓字节——勿以错误字符串推断归因 | [postmortem](../notes/postmortem/2026-10-13-llm-stream-malformed-storm.md) |
| 网络零干预边界 | 本仓不探测网络形态、不设代理 env、不起代理进程、不给浏览器传代理参数（2026-10-13 全拆） | TUN/fake-IP 态再现 `web_fetch` 全域被 SSRF 拒（按环境问题处理：换网络/等直连）；或有人提议恢复出口代理/自旋代理——重议先读重启条件，不得擅自回补 | [网络零干预 Note](../notes/rejected/2026-10-13-network-vanilla-restore.md) |
