# 2026 年 DSH 插件化架构如何在零改内核前提下构建垂直深度研究工作台

> 版本：v1（审计正本）｜ 截至：2026-11-28 ｜ 审阅状态：Critic 终局 PASS（Critical=0 / Major=0）｜ 关联主张：`claims.json` × `verdicts.json`

## 执行摘要

截至 2026 年 11 月，DeepSeek Harness（DSH）的声明式 bundle 组合层与双半（Host / Client）扩展点已经能够支撑在不修改宿主内核的前提下构建完整的垂直深度研究工作台 [来源: evidence/e1-cordis-plugin-seam.md]。在前端交互层面，将跨会话状态收敛至 Host 增量投影（`sessionProjections`），配合全屏三栏精读台、150ms 行内证据悬停溯源与独立 Critic 核查账本，能够同时实现低摩擦阅读体验与高可信度审计闭环 [来源: evidence/e2-session-projection-wire.md] [来源: evidence/e5-composability-profile.md]。

## 一、零改内核的插件组合机制

### 1.1 出厂面声明式白名单裁剪

垂直工作台的首要界面挑战在于屏蔽通用编程壳的认知噪音。DSH 允许外部 bundle 通过 `cordis.patch.yml` 的后置补丁层按插件 `id` 声明 `disabled: true`，在不修改宿主代码的前提下关闭 `ui-trajectory` 与 `ui-sidebar-terminal`，并保留对话、文件树与扩展槽位 [来源: evidence/e1-cordis-plugin-seam.md]。相比之下，在浏览器侧使用全局 `:has(...)` CSS 选择器强行隐藏宿主输入框属于高脆性反模式：一旦宿主调整 DOM 层级就会成片失效，应统一由原生 `main` 全局面板或 `shell.overlay` portal 承接 [来源: evidence/e3-adversarial-dom-hacks.md]。

### 1.2 多角色预设与隔离执行域

多 Agent 研究团队在单包内通过 `presets/*.patch.yml` 声明 Lead、Scout、Analyst、Critic 与 Method Editor 五类角色预设，并利用 `isolate` 隔离域挂载 `research-worker` 与 `research-wave` 两个非角色执行 profile，实现工具面与上下文的硬隔离 [来源: evidence/e1-cordis-plugin-seam.md]。

## 二、全域状态投影与零 N+1 观测

### 2.1 Host `sessionProjections` 确定性折叠

传统前端轮询或在侧栏为每个会话单独建立 `remote.session.follow` 订阅会造成严重的 N+1 WebSocket 连接风暴 [来源: evidence/e3-adversarial-dom-hacks.md]。DSH 的 `sessionProjections` 允许插件在 Host 半注册纯增量状态机，从已提交的会话日志确定性折算出 `ResearchRunProjection`（`slug / phase / hitlKind / deliveredPath`），冷启动经会话列表元数据直出，热态通过单条推送增量刷新 [来源: evidence/e2-session-projection-wire.md]。

### 2.2 会话归属反查与只读归档诚实边界

借助 `researchRun` 投影与工作区 `cwd` 精确匹配，全局研究工作台在打开已交付报告前能够先切换至所属会话再展开终稿页签，杜绝「A 题会话错开 B 题报告」的跨会话串台；对于仅剩磁盘目录、本地无对应会话日志的历史归档，系统显性标注只读归档状态，不伪造会话归属 [来源: evidence/e2-session-projection-wire.md]。

## 三、人机精读体验与独立核查闭环

### 3.1 独立 Critic 角色与四态核查矩阵

为压低单模型写作与自审带来的自我确认偏差，研究工作台将报告主张（`claims.json`）与独立 Critic 核查判定（`verdicts.json`）严格拆盘，缺失判定的主张强制渲染为 `UNVERIFIED` 而非静默忽略 [来源: evidence/e5-composability-profile.md]。本次核查中，C1–C4 获得完全支持，C5 标注为部分支持（超百卡内存开销边界待实测），C6 保留为未核查提醒项 [来源: evidence/e4-eval-latency-quant.md]。

### 3.2 全屏三栏精读与悬停溯源效率

并行工件扫描与 150ms 行内引用悬停预览将单份长报告复核过程中的切屏与来回跳转次数降低约 70% [来源: evidence/e4-eval-latency-quant.md]。同时需诚实标明当前边界：超百张证据卡规模下的浏览器端长期内存占用与第三方 `schedule-bundle` 跨时区定时追踪稳定性尚缺公开压测数据，未纳入本次已证实结论 [来源: evidence/e4-eval-latency-quant.md]。

## 四、profile 层生态可组合性

保持核心研究包零外部服务依赖后，用户无需修改研究包一行源码，即可在自己的 `deep-research` profile 层按需叠加 `schedule-bundle`、`browser-use` 或 `office-to-pdf` 等官方或社区插件，体现 DSH 的松耦合组合能力 [来源: evidence/e1-cordis-plugin-seam.md] [来源: evidence/e5-composability-profile.md]。

## 下一版优先项

- 补充超百张证据卡工作区在浏览器端的内存与加载延迟实测基准，收口 C5 边界
- 在真实 profile 中验证叠加 `schedule-bundle` 执行跨时区周期研究追踪的稳定性，核实 C6
- 对比 `workflow-ptc` 批量扇出与纯 Agent Teams 对话协作在中大型课题上的 Token 成本曲线
