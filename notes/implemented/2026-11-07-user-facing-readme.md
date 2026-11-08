> 状态：implemented

# 使用者面向的 README 与安装手册

> 来源：[README/安装手册使用者面向卡](../../_backlog/_archived/settled_issues/2026-11-07-user-facing-readme-and-install-guide.md)（2026-11-07 用户授权落地）。
> 当前合同 = [README](../../README.md)、[product-manual](../../scripts/dist/product-manual.md)（生成 [_dist/安装手册.md](../../_dist/安装手册.md)）、[CONTRIBUTING](../../CONTRIBUTING.md)；决定 = [D38](../../docs/decisions.md#d38) / [D41](../../docs/decisions.md#d41)。

## 决定

- **读者三分，不新开文件**：使用者读 README 与安装手册；贡献者读 CONTRIBUTING；Agent 读 AGENTS；机制与决策读 `docs/`。README 的开发者内容收成「更多」里一行路由——CONTRIBUTING 已承载开发前置/验证/通道，再开 `DEVELOPMENT.md` 会成为第三个开发入口（触发新建的条件：CONTRIBUTING 超过约 180 行，或需要面向外部贡献者的架构讲解）。
- **README = 产品页（73 行）**：一句话结果 → 4 条「你会得到」→ 3 步 quickstart + 装好的标志 → 第一次研究走查 → 产物目录 → 4 条 FAQ → 一行开发者路由。首屏不出现 `bundle`/`preset`/`roster`/`patch`/`launcher`/D 号等内部词；`profile` 只作命令参数出现并跟一句人话。
- **手册 = D41 十一段骨架，用户路径优先落在内容层**：§三 压成运行时/方式两张短表并给出「现在装 → §四 C」显式跳转；§四 开头即 profile 命令；§六 先给界面可见变化、`--dump-config` 作机器核对；§七 只留工作区/凭据/回退开关三项，patch 层与 `--dump-config` 细节进附录 A；HITL、quick_factual、时间口径语言等内部词改为用户话术。
- **安装 owner 口径**：完整安装合同 = [product-manual](../../scripts/dist/product-manual.md)（生成 `_dist/安装手册.md`）；README 只承担最短路径，命令由 [readme-manual-commands](../../tests/contracts/readme-manual-commands.test.mjs) 对账。`docs/00-index.md` 与 `docs/guides/65-run-forms.md` 同 diff 改口径。
- **防漂移**：新增契约测试——README 代码块里的每条 `dsh` 行必须逐字出现在 `_dist/安装手册.md`；防空下限 = 3 条；比对对象是用户实际拿到的那份生成物（源模板含 `{{tarballName}}` 占位，不可直接比）。[run-driver-contract](../../tests/run/run-driver-contract.test.mjs) 的「开发首动作 = run-driver」断言随内容迁到 CONTRIBUTING。
- **pack README 二期**：303 行双语同构 + 数据卡 + 发布合同，本轮不动；触发 = npm 发布或下一轮文档收口。

## 输掉的方案

- **README 只做导航（现状加强版）**：用户仍要跳一次，GitHub 首屏仍是内部工程。
- **新建 `docs/user-guide.md` 让 README 指过去**：多一跳，首屏第一眼仍是开发页。
- **同轮全站双语**：维护翻倍，且当前没有英文读者证据；根 README/手册先中文。
- **只改文案不改结构**：手册 §三/§四 的选择矩阵仍在第一条命令之前，结构问题不解决。
- **把手册 A/B/D 挪进附录、tarball 段排第一**：这是 issue 原计划，但与 [D41](../../docs/decisions.md#d41)「安装手册 = 十一段骨架」及 `readme-shape` 门禁的顺序断言冲突；改 D 号属于阶段边界，本轮不擅动，改为十一段内做用户路径优先 + 显式跳转。触发重议 = 用户拍板改 D41 + 门禁。

## 实际跑过的验证

- **机械层**（2026-11-07）：`pnpm verify` 全绿（含 `readme-shape`、`dist-manual-fresh`、`dist-manual-version`、`backlog-liveness`、`md-links`、`doc-budgets`）；`pnpm test` 1045/1045。
- **安装命令**：`node scripts/smoke/install-shape-smoke.mjs` ALL PASS——① profile 初始化（web 模板）② `dsh plugin add` 本包 + 团队层（roster 三态正确）③ 真启动出 token URL、无 `did not activate`。新增的 `$DSH_VER` 团队层派生与 smoke 的 `dsh --version` 派生同源。
- **新契约反证**：[readme-manual-commands](../../tests/contracts/readme-manual-commands.test.mjs) 首跑红（README 0 条 `dsh` 命令，触发防空断言）→ 重写 README 后绿；不是先绿后补。
- **冷读探针**（无上下文读者只看 README，七问）：第一遍评分 2/5——七问全对，但缺口 = tgz 来源、DSH 前置未点明、「已有 profile」无法自查、「重启」无命令、登录无指引、术语（时间口径语言/slug/DSH_HOME/Web 面/首屏）。按缺口改完后第二遍 **3/5、七问全对**；剩余 = tgz 分发地址、UI 点击细节、DSH 先验知识（前两类归分发/手册）。
- **截图**：[首屏](../../docs/assets/readme-first-screen.png) + [Plugins 页](../../docs/assets/readme-plugins.png) 均从真实 3083 通道抓取，无 token；首屏含右栏研究状态/配置/图谱入口。
- **审查**：语义自审（`reviewing-a-delivery`）通过，无 blocker——意图对齐（七问可答）、合同同步（owner 口径 3 处 + evaluation 台账登记）、断言反证（新测试红在先）、生成物链（`_dist` 由源重导出）。残余风险：手册 A/B/C/D 顺序受 D41 约束、pack README 二期、绑定态驾驶舱截图需在飞 run。
