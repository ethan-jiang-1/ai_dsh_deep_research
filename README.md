# ai_dsh_deep_research

DSH 插件项目：一个 **bundle**（`packages/deep-research-pack`）+ 用户自建的 **custom profile**
`deep-research`。包提供四个研究角色 preset（`Lead / Scout / Analyst / Critic`）+ 方法编辑 preset
（`Method Editor`，D37）+ 研究驾驶舱 + 方法论技能；协作走 DSH Agent Teams。包内容（手册/模板/技能/
驾驶舱）全在包内，run bundle、方法库与归档落在用户指定的工作区。交付模型 = [D41](docs/decisions.md#d41)；
技术决定 = [D40](docs/decisions.md#d40)。

## 用它

安装步骤的唯一 owner = [`_dist/安装手册.md`](_dist/安装手册.md)：首次用 CLI 建 custom profile
（仅首次、破坏性），启动后在 **Plugins 页**装包，团队机制层同页打开（DSH 随安装提供、默认关闭的
可选 bundle）；CLI 装包仅 Web 自动化/离线。首屏会问「项目目录」；研究产物写
`<项目>/drt_<slug>/`，方法库 = `<项目>/method-library.md`。没有 launcher，也没有自定义安装器；
诊断用安装副本里的 `dsh-deep-research-doctor`。数据归属与 `DEEP_RESEARCH_WORKSPACE` 的优先级 =
[guides/65](docs/guides/65-run-forms.md)。

## 首屏会看到

Orca 品牌 + 工作区标题（`Deep Research — <目录名>`）+ 起步卡：直接问一个研究问题 →
Lead 先确认类型/深度/口径并给计划 → 右栏「研究状态」看进度；交付后右栏「终稿」读读者版。
没选项目时起步卡给「选择项目目录」；有 `drt_*` 或用户消息后起步卡收起。

## 改它

- 开工入口链（唯一正本，4 步）=[`AGENTS.md`](AGENTS.md) §入口链；文档地图 = [`docs/00-index.md`](docs/00-index.md)。
- 开发通道：`node dev/run-driver.mjs up`（boot-run 自 source env；L1/L2 与部分 run-ops 需先 `source dev/env.sh`，fresh clone 首次跑 L0 也先 source 一次以激活 hooks；口径 = guides/60 §2）（仓内 `deep-research` profile +
  `research-workspace/`，不是用户安装路径；操作 = [`docs/guides/61-run-playbook.md`](docs/guides/61-run-playbook.md)）。
- 改完怎么验：选层地图 = [`docs/project-map.md`](docs/project-map.md)；命令正本 =
  [`docs/guides/60-dev-loop.md`](docs/guides/60-dev-loop.md) §2；判据 = [`docs/evaluation.md`](docs/evaluation.md)。
- 运行形态/数据归属 = [`docs/guides/65-run-forms.md`](docs/guides/65-run-forms.md)；插件作者入口 =
  [`docs/guides/62-plugin-authoring.md`](docs/guides/62-plugin-authoring.md)。

## 研发宪章（2026-09-27 用户定调）

1. **循 DSH 而不发明**：机制权威 = `vendor/dsh`（钉 tag），纪律全表 = `docs/discipline-map.md`（逐源三态）；
   优先用 DSH 现成载体，自建机制须有"载体不可用"证据。
2. **自主优先，借鉴成熟**：问题先探成熟 DSH 插件的解法（采纳度 = 下载量 / 影响力为信号；参考作者本地
   `ai_dsh_company`，不随仓），能自主解决的静默解决、不外抛。
3. **审阅分层**：机械门禁 / 溯源审计 / 判据探针 / 对抗自审（critic 式）全部自主做；只有不可代理的
   判断（真人体验、方向取舍）才在阶段边界请人——不设额外打断点。

## Rules In One Screen

- 配置为主的 pack（preset / skill / bundle 行 / content 注入 / 启动行 / 只读 doctor）+ 观察面 client 面（D18）+
  抓取回退 provider（D31）；Node 版本区间与 vendor 对齐（正本 = package.json engines，门禁对账）；
  测试用 `node:test` + `node:assert`（无测试框架）。
- 评估五面（L0 结构 / L1 挂载 / L2 安装 / L3 领域 / L4 交付）不互抵，定义见 `docs/evaluation.md`；
  安装/首启面增量证据 = `install-shape-smoke` / `product-boot-smoke`（同页 L2 登记）。
- 迭代单位 = 垂直轮（最薄全路径 → 逐轮加宽）；多步工作用会话内计划与 todo 表达顺序。
- License = [MIT](LICENSE)；贡献者环境与工作流 = [CONTRIBUTING.md](CONTRIBUTING.md)。
