---
status: 推敲中
opened: 2026-10-19
---

# 推敲：右栏加「终稿」页签——交付前空、交付后渲染 final.md，全程不泄漏中间过程

> 立卡：2026-10-19 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 结论倾向：现在做（渲染层与交付信号都现成，剩下是取舍与一次真机确认）｜ 可关闭：否

**问题与期望结果：** 研究跑完，用户最想先看的是那份终稿（`drt_<slug>/final.md`）。现在它只出现在
会话流里（Lead 的 closing prose + `present` 卡片），要开就得去 Files 页签按路径翻。用户原话：
「panel 里头可以放个 final……研究完了之后，这个 B 斗最后的 final 的 MD 可以呈现出来，开始什么
东西都没有，中间过程也没有，直到 final 出来了」。期望：右栏多一个「终稿」位，**交付前是空态**
（明说"还没到交付"），**交付后整篇渲染**，且**全程不把中间过程（question/topics/evidence/
drafts）漏进来**。

**当前情况（本轮核实）：**

- **渲染层现成**：`@deepseek-ai/dsh-client-ui-sidebar-documentpreview` 已在 `web-app` bundle 里
  （research profile `--dump-config` 命中 2 次），它注册 kind `text`、band `fallback`，Markdown
  是它的一等渲染器（分页 / 渲染器选择 / 自动刷新 / wrap 都在）。
- **交付信号现成**：`present` 工具（`@deepseek-ai/dsh-tool-present`，已在 lead preset 与 bundle
  层挂载）把终稿路径**记进 Session**——`present` 声明过的文件归属于调用它的 Session，
  记录绝对路径与可选描述，**不复制内容**。这是"交付过"的机器可读真值。
- **文件读面现成**：我们的 client 已经注入 `remote.workspaceFiles`（`listDir` / `readFile`），
  research-status / research-config 两个页签已在用。
- **不变量现成**：NODES.md 的节点 I/O 契约里 `final.md` 的产出点唯一（交付段），所以"有没有
  final.md"本身就是交付信号；`present` 声明只是把它变成 Session 可查的强信号。

**未决问题（真正的设计选择，不是一个答案）：**

1. **"空"的判据用哪个？** 三个候选：
   - (a) 文件不存在 → 空态。简单，但 run 早期可能已有旧 `final.md`（rerun/续跑）。
   - (b) 本 Session 有 `present` 声明 → 非空。最准，但 `present` 是**轮次**级信号，
     跨会话打开同一个 run 时会丢。
   - (c) `final/` 版本目录有条目 → 非空（v1.md/v2.md 是版本记账）。
   倾向：**(a) ∧ (b) 取或**——有 present 声明就显示；没有但 run 根有 final.md 也显示（ride-along
   场景：用户从侧栏点开一个已完成的老 run）。**这需要一次真机确认 `present` 记录在 client 侧
   怎么取**（未查证：`remote.session` 有没有暴露 deliveries 的读面）。
2. **页签还是页签里的区块？** 现有三页签是「研究状态 / 研究配置 / 文件 / 终端」，都是**工具面**。
   「终稿」是**结果面**，语义不同。候选：①独立第四页签（最直白，用户说的就是"panel 里头放个
   final"）；②塞进「研究状态」作为末尾区块（少一个页签，但违反"交付前什么都不显示"——研究会
   一直占着那一块）；③复用 documentpreview 的 fallback，直接让 `present` 卡片点开就走它
   （零新代码，但"观感上"不像专位）。倾向 ①。
3. **"中间过程不泄漏"怎么机械保证？** 页签体只能读 **一个固定路径** `drt_<slug>/final.md`，
   不接受任意路径参数；且必须**只读**（无删除、无编辑、无"打开所在目录"）。这条要写成门禁式
   约束而不是口头承诺。
4. **绑定哪个 run？** 会话绑定哪个 `drt_` 是既有机制（研究状态/配置已在用同一套定位）。若会话
   没绑定 run → 空态且说明"本会话还没有研究 run"。
5. **交付后版本变化**：rerun 出 v2，页签要不要跟？documentpreview 自带自动刷新与 rollback 语义
   （"Reloads and loading-mode changes retire older requests"）——倾向**跟**，且以 run 根
   `final.md`（当前版）为唯一内容源，版本细节留给 `final/` 目录。

**下一步：**

1. **先查清第 1 条和第 4 条的事实**（`present` 记录的 client 读面；会话→run 绑定 API），
   这是唯一的硬阻塞——其余都是取舍。
2. 查清后把取舍定稿（倾向已写），选做 POC：只做页签骨架 + 空态 + 读 `final.md` 渲染，
   不碰版本与 rerun。
3. 讨论：这张卡是**纯 client 面改动**（不触及 pack 公共行为的话可以自授权落地）；若需要动
   preset 让 Lead 在交付时额外发信号，则触及 pack 公共行为 → 转 `等人拍板`。

**与其它卡的关系：**

- 与 [BUG-042](../_archived/fixed_bugs/BUG-042-method-library-seed-absent-no-pointer.md) 独立，都属"观察面宣称
  存在而实际不可用"这一类，但 final 页签是**新增**、BUG-042 是**既有功能失效**（该卡已于 2026-10-19 修复归档）。
- 与「研究配置」显式化那轮（已归档 `2026-10-18-research-config-panel-explicitness`）同一观察面，
  复用其空态与回执样式语言。
