# RFC：M2 run 可视化——观察面与只读仪表盘（"做整个搜索"看得见）

> 状态：**approved（2026-09-24 用户批准；同日实施落地——实施记录见文末）** · 2026-09-24 ·
> 归宿：roadmap ▶「首个完整研究 run」
> 起因：用户定案——"肯定要视觉化做整个搜索"，且必须在 run 前想清楚（事前设计，
> 不在 run 中途发明）。

## 依赖与落地次序

第 ③ 件（落地序见 roadmap 队列行）：前置 = ① m2-plan-shape（仪表盘解析的文件形状
由模板定义）；与 ② 无依赖；④ run-mechanics 的 run 依赖本件（run 期间要有观察面）。

## 问题

两点交互 + 静默自律 ⟹ run 期间（可能很长）用户没有任何进度可见性——不允许角色
汇报（汇报即破坏纪律），也不该让用户干等 final。**可见性必须住文件投影**：run 的
状态本来就在 `drt_<slug>/` 的文件契约里（topics / evidence frontmatter / leads
分级 / findings gap / review / journal），缺的只是"看"的渲染。

## 原则（先于实现定死）

1. **投影不是真相**：仪表盘只读解析 run 文件，不写 run 目录、不缓存派生状态——
   `drt_<slug>/` 仍是唯一 runtime truth（一处事实一个家）；
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
- 用法：`node scripts/run-dashboard.mjs research-workspace/drt_<slug> [--out <html>]`
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

## 开放问题（已定，2026-09-24 用户拍板）

1. 自动刷新间隔：**5s**；
2. "开跑就绪"一键脚本：**并入 boot-run**（boot web + 仪表盘一起起，不另立命令）；
3. 角色会话 deep-link：**先不做**——M2 观察期看价值再定（需确认 GUI 会话 URL 形状）。

## 实施记录（2026-09-24）

- `scripts/run-dashboard.mjs`：可 import 纯解析函数（splitFrontmatter / parseQuestion /
  parseTopics / parseEvidenceDir / parseLeads / parseFindings / parseReview / tailJournal /
  topicEvidenceMatrix / gapStats / buildModel——全部对畸形输入 fail-soft 永不 throw）+
  renderHtml 渲染薄壳 + CLI（`<runDir>` 或 `--latest [--root]`，`--out` / `--watch` /
  `--interval`；meta refresh 5s）；
- 实施中抓到并修一个 CLI bug：flag 不在场时 `splice(indexOf(...), 1)` 变 `splice(-1, 1)`
  倒删末参（两个症状同根：一次性模式丢 runDir、--latest 模式误报用法错误）——改 take()
  守卫后两模式冒烟通过；
- `tests/run-dashboard.test.mjs`（8 断言）+ fixture run 目录 = 契约形状实例（A/D 级证据各一、
  findings 两条含 contradicted、leads 含已排除行、review readiness: PASS）；
- **红绿反证**：sed 注入 fixture 的 evidence quality A→B → 矩阵分布 + 渲染壳两断言红 →
  还原 → 8/8 绿（2026-09-24，方法 = 改 fixture 数字，非改断言）；
- boot-run.sh 并入一键就绪：`--latest --watch --interval 5` 后台再生成 →
  `dev/smoke-workspace/dashboard.html`（gitignored 运行区）+ EXIT/INT/TERM trap 清理；
  STEPS 更新为"进度看四处"（仪表盘列 ①）；
- 跑过的检查：L0 verify 9 门 + 18 tests 绿；CLI 冒烟（fixture 一次性渲染含矩阵/readiness；
  空 runs/ 显示"未开始"×6 处 = fail-soft 实证）；
- run 内判据（用户开仪表盘能答"现在到哪了"，无需询问角色）由 ④ run 使用核销，未核销。
- **boot-run 端到端实证**（补记）：真跑 `bash dev/boot-run.sh` 20 秒——web 起 3081
  （token 打印）、dashboard.html 每 5s 再生成、退出无残留进程；顺手抓到并修掉
  `--latest` 的一个瑕疵（把 runs/ 的 `.gitkeep` 文件当选 run 目录——改 statSync
  isDirectory() 过滤，修后空 runs/ 正确显示"未开始"）；修后全量门禁复跑绿。

<!-- grandfather: note-format 门禁生效（2026-09-24）前的 RFC 形态——含完整实施记录，内容有效不追改，新篇一律按 guides/60 §4 骨架 -->
