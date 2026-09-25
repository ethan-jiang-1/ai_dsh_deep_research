# RFC：观察面 GUI 化（client-face-bootstrapping + run-status-tab）

> 状态：proposed

归宿：roadmap §队列 ▶「观察面 GUI 化」（feature，M3）；材料 =
[ui-observability-surfaces 琢磨稿](../research/2026-09-24-ui-observability-surfaces.md)
（机制全景/选项推敲/2026-09-24 用户拍板均在彼处，本 RFC 只折算执行计划）。

## 问题

run 期间的研究观察分散四处（官方团队面板 / 各会话流 / GUI 外的 HTML 仪表盘），"底下在干
什么、现在轮不轮到我说话"在 GUI 内**看不见**。D 路（debug-dashboard-plus）已交付并在 run
中实证可用，但它在浏览器另开一页；GUI 内一屏看全研究语义状态（journal → 矩阵 → review）
仍缺——这是 M3 的核心缺口。

## 方案（两段三步，company 生长序）

**第一段 client-face-bootstrapping（构建链地基）**

1. **D7 修订**：限定形状——"观察面用途 + 构建产物只此一件"，不是整体放开 client 面
   （教义演进留痕：用户明确需求 + 机制完备性考古 + company 同款生长序先例）；
2. **双半 tsdown 构建链**：host 半（esm/node）+ client 半（cjs/browser，必须包
   `window.__ModuleLoader__.load({id, factory})` 外壳）；外置规则照抄 company 47 行
   `tsdown.config.ts`（`react` / `react/jsx-runtime` / `@deepseek-ai/dsh-client-*` /
   `@deepseek-ai/dsh-api-*` 留 require，其余内联）；三件套对齐
   （`exports["./client"]` ↔ `dsh.client` ↔ cordis.patch.yml insert 行）；
3. **完成定义 = client-load-smoke**（真浏览器加载，apply 抛错 = 砖全 app，必须真检）+
   **keyless key 守卫**（keyed slot 的 key 拼错不报错永不渲染——company 坑 1，key 集中
   常量 + keyless 测试钉死）。

**第二段 run-status-tab（右栏「研究状态」页签）**

4. **B-min**：一个 journal 流页签验通全链（数据 = `remote.session.follow` 快照+实时）；
5. **B-full**：顶部流程步骤条（run 文件推导，复用 `run-dashboard.mjs` 纯折算函数抽到共享
   lib）+ 活标题键 `sidebar.right.pane.tab.title`（HITL 挂起时"研究状态 · ⏳ 等你拍板"；
   检测 = follow 事件流找 open 的 ask_user_question）+ 矩阵 / gap 四态 / review readiness
   渐进呈现（数据 = `remote.workspaceFiles` 读 run 文件 + `remote.agentTeams.view` 任务板）；
6. **C 工具卡（随 B 议）**：`tool.call.toolview` 给 spawn_teammate / team_task_* /
   web_search / present 渲染研究语义卡片（纯函数展示模型 + 薄渲染，keyless 可测）。

数据/展示分层纪律：折算进 `src/lib/` 纯函数 → keyless 单测进 `pnpm test`；组件薄渲染。
5s 轮询是平台通行节奏（团队态无推送流，官方如此）。

## 输掉的方案

- **整体放开 D7**（不限观察面用途）：否决——教义演进留最小口子，皮肤/品牌面仍在搁置池；
- **host `@Remote` 读模型起步**（浏览器零轮询）：押后——起步走 `remote.workspaceFiles`
  零 host 面改动，host 半暴露折算结果作为后续优化（琢磨稿开放问题 3 的拍板）；
- **直接上矩阵全量**（跳过 B-min）：否决——小笔验链，构建链是本仓第一段构建代码，
  先证通再加宽（company 生长序）；
- **D 路再加宽代替 B**：已否定——D 已交付且实证可用，但 GUI 内可见性是独立需求。

## 验收

- L0：keyless key 守卫 + 折算函数单测绿（新门禁/测试各带红证）；
- L1：client-load-smoke 真浏览器加载绿（apply 无抛错、页签真渲染、活标题真变化）；
- L3/L4：一场真实 run 里页签可用——journal 流可见、HITL1/HITL2 挂起时活标题/横幅醒目、
  矩阵与 review 状态与 run bundle 文件一致（可结合「研究类型覆盖」条目的下一场 run）；
- D7 修订登记进 docs/00-index 决策台账（新 D 号），构建链文档落 guides/62。
