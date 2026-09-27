# 右栏观察面 UX 欠账修复（挂起信号显性化 + 状态页签会话绑定）——已交付

> 状态：implemented

2026-09-28 用户定调立项并当日交付：**右栏页签体系（可加可关可组合）是观察/信号面的唯一
正位**——左侧发起的视图落进固定 panel 不可组合，不是这些面的家；修法 = 顺着右栏机制增强，
不搬家。两条欠账（观察面走查记档的目验输入之二、三）全闭环。

## 决定

1. **状态页签会话绑定（欠账②）**：渐进面只显示**本会话自己的** run bundle——
   - `src/lib/bundle-bind.ts`（纯函数 + 8 条 keyless 断言）：journal `tool/call` 参数路径里的
     `drt_<slug>/` 识别绑定（只认工具调用不扫用户消息——问句顺带提及 ≠ 真在动手；截断 JSON
     fail-soft；多命中取最新）；slug 不含 `drt_` 前缀而目录名含——两侧拼回（实施期自踩实录：
     首版漏拼前缀，冒烟的磁盘真值断言当场咬住）；
   - `ResearchStatusTab`：绑定 bundle 驱动渐进面，**位置=状态两个位置都认**（根=在飞 /
     archive/=已交付）；未绑定（journal 已到但无 bundle 动作）→ 如实提示行
     "本会话未绑定 run bundle"，**不再显示别家数据**；
2. **挂起信号右栏内显性化（欠账①）**：挂起迁移（false→true）时页签体调用注入的
   `revealStatusTab`（= `sidebarRight.openTab('research-status')`）——**落定时右栏同步骤自动
   展开**（vendor sidebar-right 契约源码注释明载）；页签 dock 在右栏折叠时**保持挂载**（dock
   不卸载），观察者常在——"轮到你"不再依赖用户先知道要展开右栏；用户仍可随时收右栏/关页签
   （可加可关，用户定调的原样保留）；
3. **验证面改造**（同 diff）：
   - client-load-smoke 重写渐进面断言：磁盘侧扫**绑定会话**（顶层 + 回合闭合过滤；自造探针
     bundle 退役）→ 浏览器断言与磁盘真值对账（证据计数/交付态/问题行），加**未绑定负样本**
     双向断言（提示行在场 + 零别家渐进面泄漏）；
   - client-hitl-smoke 加 ⑤ 段（fix① 完整闭环）：收起右栏 → hitl-answer 子进程答卡 → 回合
     闭合 → 二次触发挂起 → 断言右栏**自动展开** + 横幅在场；会话选择改**新鲜会话**（旧会话
     复用撞跨进程写锁——"active write handle" 连拒三跑实录）。

## 输掉的方案

- **挪左侧会话栏/主对话区**：用户定调否决——左侧视图落固定 panel 不可组合，弃；
- **对话头角落槽（conversation.session.header.corner）挂隐形观察者**：vendor 槽运行时实测
  single 槽按优先级**遮蔽渲染**（最低者胜）——注册即挤掉 vendor 的展开按钮或被遮蔽不挂载，
  不可行，弃（探针结论留档）；
- **会话挂载时自动 dock 页签**：openTab 必然带展开——每次切会话都弹右栏，打扰性超限，弃；
  never-opened 会话的挂起信号由 vendor 侧栏 Answer 徽标承担（如实边界）；
- **维持只记档不动机制**：走查时代的临时约束，用户点名要修，弃。

## 实际跑过的验证（2026-09-28）

- `tests/bundle-bind.test.mjs` 8/8（绑定/无绑定/恢复/转续/用户消息不构成绑定/截断 fail-soft/
  畸形 fail-soft/slug 形态边界）；
- `client-load-smoke` ALL PASS：绑定会话（「恢复 drt_dsh run 的研究状态」→ drt_dsh-release-watch，
  archive 位）四项磁盘认证全对（证据 24=磁盘 24 · 已交付 · 问题行逐字）+ 未绑定负样本双断言
  （快照回放冒烟会话：提示行在场 + 零泄漏）+ 活动流/噪音过滤原断言保持；
- `client-hitl-smoke` ALL PASS（真模型档）：活标题翻转 + 横幅（原有）+ ⑤ 段六步全绿——
  **⑤e 右栏自动展开**（挂起迁移 → revealStatusTab → openTab 同步骤展开，fix① 端到端闭环）
  + ⑤f 横幅在场；
- L0：`pnpm verify` 全绿 · `pnpm test` 83/83（+8）。

## 环境状态

- client-load-smoke / hitl-answer / watch-run 均为 `node --import tsx/esm` 形态（命令正本已同步）；
- client-hitl-smoke ⑤ 段答卡 = hitl-answer 子进程（代理模拟，如实标注）；
- fix① 的边界（如实）：本会话从未开过「研究状态」页签时无 dock 观察者——挂起信号由 vendor
  侧栏 Answer 徽标承担；开过一次即常在（跨收起/折叠，dock 不卸载）。
