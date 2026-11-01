# ai_dsh_deep_research

DSH 插件项目，也是 **Deep Research 产品**：一个包（`packages/deep-research-pack`）提供四个研究角色
preset（`Deep Research Lead / Scout / Analyst / Critic`）+ 方法编辑 preset（`Method Editor`，D37），
协作走 DSH 现成 Agent Teams 通道。产品形态 = **DSH 插件（bundle）+ 可选启动器**（D38/D39）：
插件内容在包内，run bundle / 方法库 / 归档落在用户工作区。

设计来源：方法论内核出自 codex Deep Research harness 考古（[考古报告](notes/implemented/2026-09-24-deep-research-harness-analysis.md)），
插件工程范式参考作者本地 `ai_dsh_company`（不随仓；[解剖报告](notes/implemented/2026-09-24-dsh-plugin-repo-anatomy.md)）。

## 用它

```sh
dsh plugin --profile web add dsh-deep-research-pack
"${DSH_HOME:-$HOME/.dsh}/profiles/web/node_modules/.bin/dsh-deep-research-scaffold" \
  --install-only --workspace "$HOME/research" --profile web
DEEP_RESEARCH_WORKSPACE="$HOME/research" dsh --profile web
```

三条命令 = DSH 原生插件安装 + 工作区初始化 + 启动；**不需要全局安装**。第二步铺种子与团队
机制层，第三步由 Host 登记工作区；Web 首屏是 **Deep Research Lead**
会话 + 起步卡（当前工作区 / 三步起步 / 凭据提示）。产物 = `<workspace>/drt_<slug>/`；方法库与
归档也在工作区。专用 `deep-research` profile、一条命令启动器（`dsh-deep-research`）、项目模式与
`--check`/`--home` = 手册；包合同与数据卡 = [pack README](packages/deep-research-pack/README.md)。
用户视角完整手册 = [`_dist/安装手册.md`](_dist/安装手册.md)。

## 首屏会看到

Orca 品牌 + 产品化工作区标题（`Deep Research — <目录名>`）+ 起步卡：直接问一个研究问题 →
Lead 先确认类型/深度/口径并给计划 → 右栏「研究状态」看进度；交付后右栏「终稿」读读者版。
有 `drt_*` 或用户消息后起步卡收起。

## 改它

- 开工入口链（唯一正本，4 步）=[`AGENTS.md`](AGENTS.md) §入口链；文档地图 = [`docs/00-index.md`](docs/00-index.md)。
- 开发通道：`source dev/env.sh` + `node dev/run-driver.mjs up`（仓内 `research` profile +
  `research-workspace/`，不是产品用户路径；操作 = [`docs/guides/61-run-playbook.md`](docs/guides/61-run-playbook.md)）。
- 改完怎么验：选层地图 = [`docs/project-map.md`](docs/project-map.md)；命令正本 =
  [`docs/guides/60-dev-loop.md`](docs/guides/60-dev-loop.md) §2；判据 = [`docs/evaluation.md`](docs/evaluation.md)。
- 产品运行形态/数据归属 = [`docs/guides/65-run-forms.md`](docs/guides/65-run-forms.md)；插件作者入口 =
  [`docs/guides/62-plugin-authoring.md`](docs/guides/62-plugin-authoring.md)。

## 研发宪章（2026-09-27 用户定调）

1. **循 DSH 而不发明**：机制权威 = `vendor/dsh`（钉 tag），纪律全表 = `docs/discipline-map.md`（逐源三态）；
   优先用 DSH 现成载体，自建机制须有"载体不可用"证据。
2. **自主优先，借鉴成熟**：问题先探成熟 DSH 插件的解法（采纳度 = 下载量 / 影响力为信号；参考作者本地
   `ai_dsh_company`，不随仓），能自主解决的静默解决、不外抛。
3. **审阅分层**：机械门禁 / 溯源审计 / 判据探针 / 对抗自审（critic 式）全部自主做；只有不可代理的
   判断（真人体验、方向取舍）才在阶段边界请人——不设额外打断点。

## Rules In One Screen

- 配置为主的 pack（preset / skill / bundle 行 / 产品 launcher / 工作区注册）+ 观察面 client 面（D18）+
  抓取回退 provider（D31）；Node 版本区间与 vendor 对齐（正本 = package.json engines，门禁对账）；
  测试用 `node:test` + `node:assert`（无测试框架）。
- 评估五面（L0 结构 / L1 挂载 / L2 安装 / L3 领域 / L4 交付）不互抵，定义见 `docs/evaluation.md`；
  产品面增量证据 = `product-smoke` / `product-boot-smoke`（同页 L2 登记）。
- 迭代单位 = 垂直轮（最薄全路径 → 逐轮加宽）；多步工作用会话内计划与 todo 表达顺序。
- License = [MIT](LICENSE)；贡献者环境与工作流 = [CONTRIBUTING.md](CONTRIBUTING.md)。
