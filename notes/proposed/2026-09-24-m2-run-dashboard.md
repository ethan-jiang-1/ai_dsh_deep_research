# RFC：M2 run 可视化——观察面与只读仪表盘（"做整个搜索"看得见）

> 状态：**proposed（待用户打磨）** · 2026-09-24 · 归宿：roadmap ▶「首个完整研究 run」
> 起因：用户定案——"肯定要视觉化做整个搜索"，且必须在 run 前想清楚（事前设计，
> 不在 run 中途发明）。

## 依赖与落地次序

第 ③ 件（落地序见 roadmap 队列行）：前置 = ① m2-plan-shape（仪表盘解析的文件形状
由模板定义）；与 ② 无依赖；④ run-mechanics 的 run 依赖本件（run 期间要有观察面）。

## 问题

两点交互 + 静默自律 ⟹ run 期间（可能很长）用户没有任何进度可见性——不允许角色
汇报（汇报即破坏纪律），也不该让用户干等 final。**可见性必须住文件投影**：run 的
状态本来就在 `runs/<slug>/` 的文件契约里（topics / evidence frontmatter / leads
分级 / findings gap / review / journal），缺的只是"看"的渲染。

## 原则（先于实现定死）

1. **投影不是真相**：仪表盘只读解析 run 文件，不写 run 目录、不缓存派生状态——
   `runs/<slug>/` 仍是唯一 runtime truth（一处事实一个家）；
2. **被动观察**：可视化不构成第三个交互点——不从观察面向角色发指令、不因观察
   打断静默自主；
3. **keyless**：纯 fs 解析，无模型/网络/子进程（tests/layering 同款纪律）；
4. **fail-soft**：观察面与门禁失败语义不同——verify 对合同 fail-loud，仪表盘对
   缺失/畸形文件显示"未开始 / 无法解析"并继续渲染其余部分（看不全好过看不了）。

## 方案（两层观察面）

**L0 现成面（零成本，P1 操作指南写明"看哪里"）**：
- dsh web GUI 各角色会话的实时消息流（scout 的 web_search 调用、analyst 的抓取
  逐条可见）；
- `ui-agent-team` 任务板（谁领了什么活、起止状态——bundle 已带此行）；
- deliverables 面板（final.md 经 present 声明后出现）。

**L1 仪表盘（本件交付）：`scripts/run-dashboard.mjs`**
- 用法：`node scripts/run-dashboard.mjs research-workspace/runs/<slug> [--out <html>]`
  → 单页自包含 HTML（内联样式 + `<meta refresh>` 5s 自动刷新），浏览器打开即看；
- 渲染区块（全部从文件契约解析，零发明）：
  1. run 头部：slug、问题定稿一句话、研究类型/深度（HITL1 快照）、Decisions 条数；
  2. **topic × evidence 矩阵**：topics.md 的 T# × evidence frontmatter
     `supports`/`quality` 扫描 → 每 topic 证据数、A–D 分布、覆盖度；
  3. leads 概览：方向数、建议挖深 vs 已排除、分级分布；
  4. findings：gap 四态统计（supported / needs_search / contradicted /
     insufficient）+ 逐条列表（带证据链接）；
  5. review：readiness PASS/FAIL、CRITICAL/MAJOR/MINOR 计数；
  6. journal 尾部 ~15 条（各角色进展 feed）；
  7. 文件统计：evidence/drafts 计数、最后修改时间。

## 输掉的方案

- **client 插件皮肤（品牌化 slots）**：搁置池维持（核心研究流未稳，company 到 R5
  才做皮肤；复活条件不变 = run 通过 + demo 需求）——本仪表盘是它的**需求发现
  原型**：M2 观察期看清"用户真正想看什么"，将来皮肤一次做对；
- **让角色汇报进度**：违反静默自律（两点交互是纪律不是缺陷）；可见性走文件投影；
- **WebSocket/长连接实时推送**：过度工程——文件 + meta refresh 拉取对分钟级研究
  节奏足够（M3 实测嫌慢再说）。

## 验收判据

- `scripts/run-dashboard.mjs` + 可 import 的纯解析函数落地（渲染薄壳在上）；
- tests/ 增 keyless 回归：fixture run 目录（A/D 级证据各一、findings 两条含一条
  contradicted、leads 含已排除行、review readiness: PASS）→ 断言矩阵计数与分级
  统计精确；红绿反证 = 改 fixture 数字看断言红；
- M2 run 期间实际使用：用户开仪表盘能回答"现在到哪了"（矩阵 + journal），无需
  询问任何角色——静默自律与可见性同时成立。

## 开放问题（请用户定）

1. 自动刷新间隔（建议 5s 起步）；
2. 要不要"开跑就绪"一键脚本把 boot web + 仪表盘一起起（可并入 P1 的就绪命令）；
3. 仪表盘要不要放各角色会话的 deep-link（跳 web GUI 对应会话）——需确认 GUI 会话
   URL 形状，M2 观察期看价值再定。
